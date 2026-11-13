import { and, count, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { user } from '../../../lib/auth-schema';
import {
  callLogs,
  chatMembers,
  chats,
  communities,
  communityChats,
  communityMembers,
  messages,
  statuses,
} from '../../../lib/schema';
import {
  badRequest,
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  unauthorized,
} from '../../../lib/api';
import { adminContentActionSchema } from '../../../lib/validation';
import type {
  AdminCallSummary,
  AdminChatSummary,
  AdminCommunitySummary,
  AdminContent,
  AdminStatusGroup,
} from '../../../lib/types';

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function loadContent(): Promise<AdminContent> {
  const [chatRows, chatMemberRows, messageCountRows, statusRows, communityRows, communityMemberCounts, communityGroupCounts, callRows] =
    await Promise.all([
      db
        .select({
          id: chats.id,
          title: chats.title,
          kind: chats.kind,
          avatar: chats.avatar,
          createdBy: chats.createdBy,
          createdAt: chats.createdAt,
        })
        .from(chats)
        .orderBy(desc(chats.updatedAt))
        .limit(200),
      db
        .select({
          chatId: chatMembers.chatId,
          userId: chatMembers.userId,
          name: user.name,
        })
        .from(chatMembers)
        .innerJoin(user, eq(chatMembers.userId, user.id)),
      db
        .select({ chatId: messages.chatId, total: count() })
        .from(messages)
        .groupBy(messages.chatId),
      db
        .select({
          id: statuses.id,
          userId: statuses.userId,
          type: statuses.type,
          caption: statuses.caption,
          image: statuses.image,
          createdAt: statuses.createdAt,
          name: user.name,
          avatar: user.image,
        })
        .from(statuses)
        .innerJoin(user, eq(statuses.userId, user.id))
        .where(gt(statuses.expiresAt, new Date()))
        .orderBy(desc(statuses.createdAt))
        .limit(300),
      db
        .select({
          id: communities.id,
          name: communities.name,
          avatar: communities.avatar,
          description: communities.description,
          announcement: communities.announcement,
          createdAt: communities.createdAt,
        })
        .from(communities)
        .orderBy(desc(communities.createdAt))
        .limit(200),
      db
        .select({ communityId: communityMembers.communityId, total: count() })
        .from(communityMembers)
        .groupBy(communityMembers.communityId),
      db
        .select({ communityId: communityChats.communityId, total: count() })
        .from(communityChats)
        .groupBy(communityChats.communityId),
      db
        .select({
          id: callLogs.id,
          name: callLogs.name,
          direction: callLogs.direction,
          type: callLogs.type,
          at: callLogs.at,
          duration: callLogs.duration,
          owner: user.name,
        })
        .from(callLogs)
        .innerJoin(user, eq(callLogs.ownerId, user.id))
        .orderBy(desc(callLogs.at))
        .limit(200),
    ]);

  const directNames = new Map<string, string[]>();
  for (const member of chatMemberRows) {
    const list = directNames.get(member.chatId) ?? [];
    list.push(member.name);
    directNames.set(member.chatId, list);
  }

  const memberCounts = new Map<string, number>();
  for (const member of chatMemberRows) {
    memberCounts.set(member.chatId, (memberCounts.get(member.chatId) ?? 0) + 1);
  }

  const messageCounts = new Map<string, number>();
  for (const row of messageCountRows) {
    messageCounts.set(row.chatId, asNumber(row.total));
  }

  const chatSummaries: AdminChatSummary[] = chatRows.map((chat) => {
    const names = directNames.get(chat.id) ?? [];
    const fallback = names.length > 0 ? names.slice(0, 2).join(' ↔ ') : 'Direct chat';
    return {
      id: chat.id,
      name: chat.kind === 'group' ? chat.title || 'Untitled group' : fallback,
      kind: chat.kind,
      avatar: chat.avatar ?? undefined,
      members: memberCounts.get(chat.id) ?? 0,
      messages: messageCounts.get(chat.id) ?? 0,
      createdAt: chat.createdAt.toISOString(),
    };
  });

  const statusGroups = new Map<string, AdminStatusGroup>();
  for (const row of statusRows) {
    const group = statusGroups.get(row.userId) ?? {
      id: row.userId,
      name: row.name,
      avatar: row.avatar ?? undefined,
      items: [],
    };
    group.items.push({
      id: row.id,
      type: row.type,
      caption: row.caption ?? undefined,
      image: row.image ?? undefined,
      createdAt: row.createdAt.toISOString(),
    });
    statusGroups.set(row.userId, group);
  }

  const communityMemberMap = new Map<string, number>();
  for (const row of communityMemberCounts) {
    communityMemberMap.set(row.communityId, asNumber(row.total));
  }
  const communityGroupMap = new Map<string, number>();
  for (const row of communityGroupCounts) {
    communityGroupMap.set(row.communityId, asNumber(row.total));
  }

  const communitySummaries: AdminCommunitySummary[] = communityRows.map((row) => ({
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? undefined,
    description: row.description,
    announcement: row.announcement,
    members: communityMemberMap.get(row.id) ?? 0,
    groups: communityGroupMap.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
  }));

  const callSummaries: AdminCallSummary[] = callRows.map((row) => ({
    id: row.id,
    name: row.name,
    direction: row.direction,
    type: row.type,
    at: row.at.toISOString(),
    duration: row.duration ?? undefined,
    owner: row.owner,
  }));

  return {
    chats: chatSummaries,
    statusGroups: Array.from(statusGroups.values()),
    communities: communitySummaries,
    calls: callSummaries,
  };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    return json({ content: await loadContent() });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load platform content.') }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.role !== 'admin') return forbidden();

    const parsed = adminContentActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid moderation action.');
    }

    const body = parsed.data;
    if (body.action === 'clear_chat_messages') {
      await db.delete(messages).where(eq(messages.chatId, body.id));
    } else if (body.action === 'delete_chat') {
      await db.delete(chats).where(eq(chats.id, body.id));
    } else if (body.action === 'delete_status_user') {
      await db
        .delete(statuses)
        .where(and(eq(statuses.userId, body.id), gt(statuses.expiresAt, new Date())));
    } else if (body.action === 'delete_community') {
      await db.delete(communities).where(eq(communities.id, body.id));
    } else if (body.action === 'clear_calls') {
      await db.delete(callLogs);
    } else {
      await db
        .update(communities)
        .set({ announcement: body.value, updatedAt: new Date() })
        .where(eq(communities.id, body.id));
    }

    return json({ ok: true, content: await loadContent() });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to apply moderation action.') }, 500);
  }
}
