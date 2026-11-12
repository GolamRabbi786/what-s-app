import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import {
  chatMembers,
  chats,
  messageReactions,
  messages,
} from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { sendPush } from '../../lib/push';
import {
  messageDeleteSchema,
  reactionSchema,
  sendMessageSchema,
} from '../../lib/validation';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function getMembership(userId: string, chatId: string) {
  const rows = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function memberIdsFor(chatId: string) {
  const rows = await db
    .select({ userId: chatMembers.userId })
    .from(chatMembers)
    .where(eq(chatMembers.chatId, chatId));
  return rows.map((row) => row.userId);
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = sendMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid message.');
    }

    const userId = context.profile.id;
    const data = parsed.data;
    const membership = await getMembership(userId, data.chatId);
    if (!membership) return forbidden('You are not part of this conversation.');

    if (data.replyToId) {
      const replyRows = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, data.replyToId), eq(messages.chatId, data.chatId)))
        .limit(1);
      if (!replyRows[0]) return badRequest('The message you replied to no longer exists.');
    }

    const now = new Date();
    const message = {
      id: newId('msg'),
      chatId: data.chatId,
      senderId: userId,
      text: data.text.trim(),
      kind: data.kind,
      image: data.image,
      duration: data.duration,
      fileName: data.fileName,
      fileSize: data.fileSize,
      replyToId: data.replyToId,
      createdAt: now,
    };

    await db.insert(messages).values(message);
    await db
      .update(chats)
      .set({ updatedAt: now })
      .where(eq(chats.id, data.chatId));
    await db
      .update(chatMembers)
      .set({ lastReadAt: now })
      .where(
        and(eq(chatMembers.chatId, data.chatId), eq(chatMembers.userId, userId)),
      );

    const recipients = (await memberIdsFor(data.chatId)).filter((id) => id !== userId);
    const preview =
      data.text.trim() ||
      (data.kind === 'image'
        ? '📷 Photo'
        : data.kind === 'voice'
          ? '🎤 Voice message'
          : '📎 Attachment');

    void sendPush(recipients, context.profile.name, preview, {
      chatId: data.chatId,
      messageId: message.id,
    });

    return json(
      {
        message: {
          id: message.id,
          chatId: message.chatId,
          createdAt: now.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to send the message.') }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = reactionSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid reaction.');

    const userId = context.profile.id;
    const rows = await db
      .select({ chatId: messages.chatId })
      .from(messages)
      .where(eq(messages.id, parsed.data.id))
      .limit(1);
    const message = rows[0];
    if (!message) return badRequest('That message no longer exists.');

    const membership = await getMembership(userId, message.chatId);
    if (!membership) return forbidden('You are not part of this conversation.');

    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, parsed.data.id),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, parsed.data.emoji),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, parsed.data.id),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, parsed.data.emoji),
          ),
        );
      return json({ ok: true, active: false });
    }

    await db.insert(messageReactions).values({
      messageId: parsed.data.id,
      userId,
      emoji: parsed.data.emoji,
    });

    return json({ ok: true, active: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to react to the message.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = messageDeleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return badRequest('Choose a message to delete.');

    const userId = context.profile.id;

    if ('all' in parsed.data) {
      const membership = await getMembership(userId, parsed.data.chatId);
      if (!membership) return forbidden('You are not part of this conversation.');

      await db.delete(messages).where(eq(messages.chatId, parsed.data.chatId));
      await db
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, parsed.data.chatId));
      return json({ ok: true });
    }

    const rows = await db
      .select({ chatId: messages.chatId, senderId: messages.senderId })
      .from(messages)
      .where(eq(messages.id, parsed.data.id))
      .limit(1);
    const message = rows[0];
    if (!message) return json({ ok: true });
    if (message.senderId !== userId) return forbidden('You can only delete your own messages.');

    await db.delete(messages).where(eq(messages.id, parsed.data.id));
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, message.chatId));

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to delete the message.') }, 500);
  }
}
