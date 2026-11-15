import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import {
  blocks,
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
  messageUpdateSchema,
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

    const memberRows = await memberIdsFor(data.chatId);
    const others = memberRows.filter((id) => id !== userId);
    if (others.length === 1) {
      const blockRows = await db
        .select({ blockerId: blocks.blockerId })
        .from(blocks)
        .where(
          or(
            and(eq(blocks.blockerId, userId), eq(blocks.blockedId, others[0])),
            and(eq(blocks.blockerId, others[0]), eq(blocks.blockedId, userId)),
          ),
        )
        .limit(1);
      if (blockRows[0]) {
        return forbidden(
          blockRows[0].blockerId === userId
            ? 'You blocked this contact. Unblock them to send messages.'
            : 'You can no longer send messages to this contact.',
        );
      }
    }

    let source: typeof messages.$inferSelect | undefined;
    if (data.forwardOf) {
      const sourceRows = await db
        .select()
        .from(messages)
        .where(eq(messages.id, data.forwardOf))
        .limit(1);
      source = sourceRows[0];
      if (!source) return badRequest('The message you forwarded no longer exists.');
      if (source.kind === 'call') return badRequest('Call records cannot be forwarded.');
      const sourceMembership = await getMembership(userId, source.chatId);
      if (!sourceMembership) return forbidden('You can only forward messages you can see.');
    }

    if (data.replyToId) {
      const replyRows = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.id, data.replyToId), eq(messages.chatId, data.chatId)))
        .limit(1);
      if (!replyRows[0]) return badRequest('The message you replied to no longer exists.');
    }

    const now = new Date();
    const media = data.image ?? data.video ?? source?.image ?? undefined;
    const message = {
      id: newId('msg'),
      chatId: data.chatId,
      senderId: userId,
      text: source ? data.text.trim() || source.text : data.text.trim(),
      kind: source ? source.kind : data.kind,
      image: media,
      duration: data.duration ?? source?.duration ?? undefined,
      fileName: data.fileName ?? source?.fileName ?? undefined,
      fileSize: data.fileSize ?? source?.fileSize ?? undefined,
      replyToId: data.replyToId,
      forwarded: Boolean(data.forwardOf),
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

    const recipients = memberRows.filter((id) => id !== userId);
    const preview =
      data.text.trim() ||
      (data.kind === 'image'
        ? '📷 Photo'
        : data.kind === 'video'
          ? '🎬 Video'
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

    const parsed = messageUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid message update.');

    const userId = context.profile.id;
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.id, parsed.data.id))
      .limit(1);
    const message = rows[0];
    if (!message) return badRequest('That message no longer exists.');

    const membership = await getMembership(userId, message.chatId);
    if (!membership) return forbidden('You are not part of this conversation.');

    if (parsed.data.action === 'edit') {
      if (message.senderId !== userId) {
        return forbidden('You can only edit your own messages.');
      }
      if (message.kind !== 'text' && !message.text) {
        return badRequest('Only text messages can be edited.');
      }

      const editedAt = new Date();
      await db
        .update(messages)
        .set({ text: parsed.data.text, editedAt })
        .where(eq(messages.id, message.id));
      await db
        .update(chats)
        .set({ updatedAt: editedAt })
        .where(eq(chats.id, message.chatId));
      return json({ ok: true, editedAt: editedAt.toISOString() });
    }

    const emoji = parsed.data.emoji;
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, parsed.data.id),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji),
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
            eq(messageReactions.emoji, emoji),
          ),
        );
      return json({ ok: true, active: false });
    }

    await db.insert(messageReactions).values({
      messageId: parsed.data.id,
      userId,
      emoji,
    });

    return json({ ok: true, active: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the message.') }, 500);
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
