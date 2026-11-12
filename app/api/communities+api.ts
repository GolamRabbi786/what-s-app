import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../lib/db';
import {
  chatMembers,
  chats,
  communities,
  communityChats,
  communityMembers,
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
import { communityCreateSchema, communityUpdateSchema } from '../../lib/validation';
import { STATUS_COLORS } from '../../lib/theme';

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function getMembership(communityId: string, userId: string) {
  const rows = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = communityCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid community.');
    }

    const me = context.profile.id;
    const now = new Date();
    const communityId = newId('community');
    const chatId = newId('group');
    const accent = STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)];

    await db.insert(communities).values({
      id: communityId,
      name: parsed.data.name,
      description: parsed.data.description,
      announcement: `Welcome to ${parsed.data.name}. Share updates with everyone here.`,
      accent,
      createdBy: me,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(communityMembers).values({
      communityId,
      userId: me,
      role: 'admin',
      joinedAt: now,
    });

    await db.insert(chats).values({
      id: chatId,
      kind: 'group',
      title: `${parsed.data.name} · Announcements`,
      about: `Announcements for ${parsed.data.name}`,
      createdBy: me,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(chatMembers).values({
      chatId,
      userId: me,
      role: 'admin',
      lastReadAt: now,
    });

    await db.insert(communityChats).values({ communityId, chatId });

    await db.insert(messages).values({
      id: newId('msg'),
      chatId,
      senderId: me,
      text: `You created “${parsed.data.name}”. This group is for announcements.`,
      kind: 'text',
      createdAt: now,
    });

    return json({ communityId, chatId }, 201);
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to create the community.') }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const parsed = communityUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest('Invalid community update.');

    const membership = await getMembership(parsed.data.id, context.profile.id);
    if (!membership) return forbidden('You are not part of this community.');
    if (membership.role !== 'admin') {
      return forbidden('Only community admins can make this change.');
    }

    if (parsed.data.action === 'announcement') {
      await db
        .update(communities)
        .set({ announcement: parsed.data.announcement, updatedAt: new Date() })
        .where(eq(communities.id, parsed.data.id));
      return json({ ok: true });
    }

    await db
      .update(communities)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(communities.id, parsed.data.id));

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to update the community.') }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') return forbidden('This account is suspended.');

    const body = (await request.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) return badRequest('Choose a community to delete.');

    const rows = await db
      .select({ createdBy: communities.createdBy })
      .from(communities)
      .where(eq(communities.id, body.id))
      .limit(1);
    const community = rows[0];
    if (!community) return json({ ok: true });
    if (community.createdBy !== context.profile.id) {
      return forbidden('Only the community owner can delete it.');
    }

    const linked = await db
      .select({ chatId: communityChats.chatId })
      .from(communityChats)
      .where(eq(communityChats.communityId, body.id));

    await db.delete(communities).where(eq(communities.id, body.id));

    const chatIds = linked.map((row) => row.chatId);
    if (chatIds.length > 0) {
      await db.delete(chats).where(inArray(chats.id, chatIds));
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to delete the community.') }, 500);
  }
}
