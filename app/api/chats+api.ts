import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../lib/db';
import { user as userTable } from '../../lib/auth-schema';
import { chatMembers, chats, messages } from '../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../lib/api';
import { createChatSchema, chatUpdateSchema } from '../../lib/validation';

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

async function getChat(chatId: string) {
  const rows = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = createChatSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid chat.');
    }

    const me = context.profile.id;

    if (parsed.data.kind === 'direct') {
      const peerId = parsed.data.userId;
      if (peerId === me) return badRequest('You cannot start a chat with yourself.');

      const peerRows = await db
        .select({ id: userTable.id, status: userTable.status })
        .from(userTable)
        .where(eq(userTable.id, peerId))
        .limit(1);
      const peer = peerRows[0];
      if (!peer) return badRequest('That account could not be found.');
      if (peer.status === 'suspended') return badRequest('That account is not available.');

      const directKey = [me, peerId].sort().join(':');
      const existing = await db
        .select({ id: chats.id })
        .from(chats)
        .where(and(eq(chats.kind, 'direct'), eq(chats.directKey, directKey)))
        .limit(1);

      if (existing[0]) return json({ chatId: existing[0].id, existing: true });

      const chatId = newId('chat');
      try {
        await db.insert(chats).values({
          id: chatId,
          kind: 'direct',
          directKey,
          createdBy: me,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch {
        const retry = await db
          .select({ id: chats.id })
          .from(chats)
          .where(and(eq(chats.kind, 'direct'), eq(chats.directKey, directKey)))
          .limit(1);
        if (retry[0]) return json({ chatId: retry[0].id, existing: true });
        throw new Error('Unable to create the conversation.');
      }

      await db.insert(chatMembers).values([
        { chatId, userId: me, role: 'admin', lastReadAt: new Date() },
        { chatId, userId: peerId, role: 'member' },
      ]);

      return json({ chatId }, 201);
    }

    const memberIds = Array.from(
      new Set(parsed.data.memberIds.filter((id) => id && id !== me)),
    );
    if (memberIds.length === 0) return badRequest('Add at least one member.');

    const validRows = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(inArray(userTable.id, memberIds));
    if (validRows.length !== memberIds.length) {
      return badRequest('One or more members could not be found.');
    }

    const chatId = newId('group');
    const now = new Date();
    await db.insert(chats).values({
      id: chatId,
      kind: 'group',
      title: parsed.data.name,
      avatar: parsed.data.avatar,
      about: 'Group chat',
      createdBy: me,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(chatMembers).values([
      { chatId, userId: me, role: 'admin', lastReadAt: now },
      ...memberIds.map((userId) => ({ chatId, userId, role: 'member' as const })),
    ]);

    await db.insert(messages).values({
      id: newId('msg'),
      chatId,
      senderId: me,
      text: `You created group “${parsed.data.name}”`,
      kind: 'text',
      createdAt: now,
    });

    return json({ chatId }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to create the chat.') }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = chatUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid update.');
    }

    const userId = context.profile.id;
    const data = parsed.data;
    const membership = await getMembership(userId, data.id);
    if (!membership) return forbidden('You are not part of this conversation.');

    const now = new Date();

    if (data.action === 'read') {
      await db
        .update(chatMembers)
        .set({ lastReadAt: now })
        .where(and(eq(chatMembers.chatId, data.id), eq(chatMembers.userId, userId)));
      await db.update(chats).set({ updatedAt: now }).where(eq(chats.id, data.id));
      return json({ ok: true });
    }

    if (data.action === 'flag') {
      const current = membership[data.flag];
      const value = data.value ?? !current;
      await db
        .update(chatMembers)
        .set({ [data.flag]: value })
        .where(and(eq(chatMembers.chatId, data.id), eq(chatMembers.userId, userId)));
      return json({ ok: true, [`${data.flag}`]: value });
    }

    const chat = await getChat(data.id);
    if (!chat) return badRequest('That conversation no longer exists.');
    if (chat.kind !== 'group') return badRequest('Only groups can be renamed.');

    await db
      .update(chats)
      .set({
        title: data.name,
        avatar: data.avatar ?? chat.avatar,
        updatedAt: now,
      })
      .where(eq(chats.id, data.id));

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the chat.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const body = (await request.json().catch(() => null)) as { id?: string } | null;
    const chatId = body?.id;
    if (!chatId) return badRequest('Choose a conversation to delete.');

    const userId = context.profile.id;
    const membership = await getMembership(userId, chatId);
    if (!membership) return forbidden('You are not part of this conversation.');

    const chat = await getChat(chatId);
    if (!chat) return json({ ok: true });

    if (chat.kind === 'group') {
      await db
        .delete(chatMembers)
        .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
      const remaining = await db
        .select({ userId: chatMembers.userId })
        .from(chatMembers)
        .where(eq(chatMembers.chatId, chatId))
        .limit(1);
      if (!remaining[0]) {
        await db.delete(chats).where(eq(chats.id, chatId));
      }
    } else {
      await db.delete(chats).where(eq(chats.id, chatId));
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to delete the chat.') }, 500);
  }
}
