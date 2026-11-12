import { and, asc, desc, eq, gt, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from './db';
import { user as userTable } from './auth-schema';
import {
  callLogs,
  chatMembers,
  chats,
  communities,
  communityChats,
  communityMembers,
  messageReactions,
  messages,
  statusViews,
  statuses,
} from './schema';
import { initialsFor } from './format';
import type {
  AppState,
  AppUser,
  CallLog,
  Chat,
  Community,
  Contact,
  Message,
  ReplyTo,
  StatusGroup,
  StatusItem,
} from './types';

const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const SEED_VERSION = 3;

type UserRow = typeof userTable.$inferSelect;

export function relativeStatusTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatSeen(iso: string | null | undefined) {
  if (!iso) return undefined;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < ONLINE_WINDOW_MS) return 'online';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${Math.floor(hours / 24)}d ago`;
}

function toAppUser(row: UserRow): AppUser {
  const phone = `${row.countryCode ?? ''} ${row.phone ?? ''}`.trim();
  return {
    name: row.name,
    about: row.about ?? 'Hey there! I am using WhatsApp.',
    phone: phone || row.phoneFull || '',
    avatar: row.image ?? '',
  };
}

function toContact(row: UserRow): Contact {
  const fullPhone = `${row.countryCode ?? ''} ${row.phone ?? ''}`.trim();
  const online = row.lastActiveAt
    ? Date.now() - new Date(row.lastActiveAt).getTime() < ONLINE_WINDOW_MS
    : false;

  return {
    id: row.id,
    name: row.name,
    username: row.username ?? row.email.split('@')[0],
    phone: fullPhone || row.phoneFull || '',
    about: row.about ?? 'Hey there! I am using WhatsApp.',
    avatar: row.image ?? undefined,
    online,
    lastSeen: formatSeen(row.lastActiveAt?.toISOString()),
  };
}

export interface LoadedAppState {
  state: AppState;
  revision: string;
}

export async function loadAppState(userId: string): Promise<LoadedAppState> {
  const meRows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const me = meRows[0];
  if (!me) throw new Error('Account not found.');

  const myChats = await db
    .select({ chat: chats, member: chatMembers })
    .from(chatMembers)
    .innerJoin(chats, eq(chats.id, chatMembers.chatId))
    .where(eq(chatMembers.userId, userId));

  const chatIds = myChats.map((row) => row.chat.id);

  const memberRows = chatIds.length
    ? await db
        .select({ member: chatMembers, profile: userTable })
        .from(chatMembers)
        .innerJoin(userTable, eq(userTable.id, chatMembers.userId))
        .where(inArray(chatMembers.chatId, chatIds))
    : [];

  const messageRows = chatIds.length
    ? await db
        .select({ message: messages, profile: userTable })
        .from(messages)
        .innerJoin(userTable, eq(userTable.id, messages.senderId))
        .where(inArray(messages.chatId, chatIds))
        .orderBy(asc(messages.createdAt))
    : [];

  const messageIds = messageRows.map((row) => row.message.id);
  const reactionRows = messageIds.length
    ? await db
        .select()
        .from(messageReactions)
        .where(inArray(messageReactions.messageId, messageIds))
    : [];

  const now = new Date();
  const statusRows = await db
    .select({ status: statuses, profile: userTable })
    .from(statuses)
    .innerJoin(userTable, eq(userTable.id, statuses.userId))
    .where(gt(statuses.expiresAt, now))
    .orderBy(asc(statuses.createdAt));

  const statusIds = statusRows.map((row) => row.status.id);
  const viewRows = statusIds.length
    ? await db
        .select()
        .from(statusViews)
        .where(
          and(
            eq(statusViews.viewerId, userId),
            inArray(statusViews.statusId, statusIds),
          ),
        )
    : [];

  const callRows = await db
    .select()
    .from(callLogs)
    .where(eq(callLogs.ownerId, userId))
    .orderBy(desc(callLogs.at))
    .limit(150);

  const myCommunities = await db
    .select({ community: communities, member: communityMembers })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.userId, userId))
    .orderBy(desc(communities.updatedAt));

  const communityIds = myCommunities.map((row) => row.community.id);

  const communityMemberRows = communityIds.length
    ? await db
        .select()
        .from(communityMembers)
        .where(inArray(communityMembers.communityId, communityIds))
    : [];

  const communityChatRows = communityIds.length
    ? await db
        .select({ link: communityChats, chat: chats })
        .from(communityChats)
        .innerJoin(chats, eq(chats.id, communityChats.chatId))
        .where(inArray(communityChats.communityId, communityIds))
    : [];

  const contactRows = await db
    .select()
    .from(userTable)
    .where(
      and(
        ne(userTable.id, userId),
        or(isNull(userTable.status), eq(userTable.status, 'active')),
        or(isNull(userTable.banned), eq(userTable.banned, false)),
      ),
    )
    .orderBy(asc(userTable.name))
    .limit(500);

  const membersByChat = new Map<string, { member: typeof chatMembers.$inferSelect; profile: UserRow }[]>();
  memberRows.forEach((row) => {
    const list = membersByChat.get(row.member.chatId) ?? [];
    list.push(row);
    membersByChat.set(row.member.chatId, list);
  });

  const messagesByChat = new Map<string, typeof messageRows>();
  messageRows.forEach((row) => {
    const list = messagesByChat.get(row.message.chatId) ?? [];
    list.push(row);
    messagesByChat.set(row.message.chatId, list);
  });

  const reactionsByMessage = new Map<string, string[]>();
  reactionRows.forEach((row) => {
    const list = reactionsByMessage.get(row.messageId) ?? [];
    if (!list.includes(row.emoji)) list.push(row.emoji);
    reactionsByMessage.set(row.messageId, list);
  });

  const viewedStatusIds = new Set(viewRows.map((row) => row.statusId));
  const messageById = new Map(messageRows.map((row) => [row.message.id, row]));

  const resultMessages: Record<string, Message[]> = {};
  const resultChats: Chat[] = [];
  let latestTimestamp = new Date(me.updatedAt).getTime();

  myChats.forEach(({ chat, member }) => {
    const members = membersByChat.get(chat.id) ?? [];
    const peerRow =
      chat.kind === 'direct'
        ? members.find((row) => row.member.userId !== userId)
        : undefined;
    const peer = peerRow?.profile;

    if (chat.kind === 'direct' && !peer) return;

    const lastReadAt = member.lastReadAt ? new Date(member.lastReadAt).getTime() : 0;
    const otherReads = members
      .filter((row) => row.member.userId !== userId)
      .map((row) => (row.member.lastReadAt ? new Date(row.member.lastReadAt).getTime() : 0));
    const newestOtherRead = otherReads.length ? Math.max(...otherReads) : 0;

    const chatMessages = messagesByChat.get(chat.id) ?? [];
    const sliced = chatMessages.slice(-500);

    const mapped: Message[] = sliced.map(({ message, profile }) => {
      const mine = message.senderId === userId;
      const createdAt = new Date(message.createdAt).getTime();
      const replyRow = message.replyToId ? messageById.get(message.replyToId) : undefined;
      let replyTo: ReplyTo | undefined;

      if (replyRow) {
        replyTo = {
          id: replyRow.message.id,
          senderName:
            replyRow.message.senderId === userId ? 'You' : replyRow.profile.name,
          text: replyRow.message.text,
        };
      }

      const status: Message['status'] = mine
        ? newestOtherRead >= createdAt
          ? 'read'
          : Date.now() - createdAt > 2500
            ? 'delivered'
            : 'sent'
        : newestOtherRead >= createdAt || mine
          ? 'read'
          : 'delivered';

      return {
        id: message.id,
        chatId: message.chatId,
        senderId: mine ? 'me' : message.senderId,
        senderName: mine ? 'You' : profile.name,
        text: message.text,
        createdAt: new Date(message.createdAt).toISOString(),
        status,
        kind: message.kind,
        image: message.image ?? undefined,
        duration: message.duration ?? undefined,
        fileName: message.fileName ?? undefined,
        fileSize: message.fileSize ?? undefined,
        replyTo,
        reactions: reactionsByMessage.get(message.id),
      };
    });

    const lastMessage = mapped[mapped.length - 1];
    const lastMessageAt = lastMessage?.createdAt ?? new Date(chat.createdAt).toISOString();
    const unread = sliced.filter(
      ({ message }) =>
        message.senderId !== userId && new Date(message.createdAt).getTime() > lastReadAt,
    ).length;

    const name = chat.kind === 'direct' ? peer?.name ?? 'Unknown' : chat.title ?? 'Group';
    const avatar = chat.kind === 'direct' ? peer?.image ?? undefined : chat.avatar ?? undefined;

    resultChats.push({
      id: chat.id,
      name,
      avatar,
      initials: initialsFor(name),
      group: chat.kind === 'group',
      members: members.length,
      online: peer
        ? Date.now() - new Date(peer.lastActiveAt ?? peer.createdAt).getTime() < ONLINE_WINDOW_MS
        : undefined,
      lastSeen: formatSeen(peer?.lastActiveAt?.toISOString()),
      about: chat.kind === 'direct' ? peer?.about ?? undefined : chat.about ?? undefined,
      phone:
        chat.kind === 'direct'
          ? `${peer?.countryCode ?? ''} ${peer?.phone ?? ''}`.trim() || undefined
          : undefined,
      peerId: peer?.id,
      username: peer?.username ?? undefined,
      unread,
      pinned: member.pinned,
      muted: member.muted,
      archived: member.archived,
      favorite: member.favorite,
      lastMessageAt,
    });

    resultMessages[chat.id] = mapped;

    latestTimestamp = Math.max(
      latestTimestamp,
      new Date(chat.updatedAt).getTime(),
      lastMessage ? new Date(lastMessage.createdAt).getTime() : 0,
      lastReadAt,
    );
  });

  resultChats.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  const statusGroupsById = new Map<string, StatusGroup>();

  statusRows.forEach(({ status, profile }) => {
    const own = status.userId === userId;
    const groupId = own ? 'my-status' : `status-${status.userId}`;
    const item: StatusItem = {
      id: status.id,
      type: status.type,
      image: status.image ?? undefined,
      caption: status.caption ?? undefined,
      background: status.background ?? undefined,
      duration: status.duration,
    };

    const existing = statusGroupsById.get(groupId);
    if (existing) {
      existing.items.push(item);
      existing.viewed = own
        ? false
        : existing.items.every((entry) => viewedStatusIds.has(entry.id));
      return;
    }

    statusGroupsById.set(groupId, {
      id: groupId,
      name: own ? me.name : profile.name,
      avatar: (own ? me.image : profile.image) ?? undefined,
      time: relativeStatusTime(new Date(status.createdAt).toISOString()),
      viewed: own ? false : viewedStatusIds.has(status.id),
      items: [item],
    });
  });

  const resultStatuses = Array.from(statusGroupsById.values()).sort((a, b) => {
    if (a.id === 'my-status') return -1;
    if (b.id === 'my-status') return 1;
    return 0;
  });

  const resultCalls: CallLog[] = callRows.map((row) => ({
    id: row.id,
    contactId: row.peerId ?? 'unknown',
    name: row.name,
    avatar: row.avatar ?? undefined,
    direction: row.direction,
    type: row.type,
    at: new Date(row.at).toISOString(),
    duration: row.duration ?? undefined,
  }));

  const chatById = new Map(resultChats.map((chat) => [chat.id, chat]));

  const resultCommunities: Community[] = myCommunities.map(({ community }) => {
    const links = communityChatRows.filter((row) => row.link.communityId === community.id);
    const groups = links
      .map((row) => chatById.get(row.chat.id))
      .filter((chat): chat is Chat => Boolean(chat))
      .map((chat) => ({
        id: chat.id,
        name: chat.name,
        members: chat.members ?? 1,
        avatar: chat.avatar,
      }));

    return {
      id: community.id,
      name: community.name,
      avatar: community.avatar ?? undefined,
      description: community.description,
      members: communityMemberRows.filter((row) => row.communityId === community.id).length,
      unread: groups.reduce((total, group) => {
        const chat = chatById.get(group.id);
        return total + (chat?.unread ?? 0);
      }, 0),
      announcement: community.announcement,
      groups,
      accent: community.accent,
    };
  });

  const contacts = contactRows.map(toContact);

  const state: AppState = {
    version: SEED_VERSION,
    theme: 'light',
    chats: resultChats,
    messages: resultMessages,
    statuses: resultStatuses,
    calls: resultCalls,
    communities: resultCommunities,
    contacts,
    user: toAppUser(me),
  };

  const revisionParts = [
    latestTimestamp,
    me.updatedAt instanceof Date ? me.updatedAt.getTime() : 0,
    resultChats.length,
    messageRows.length,
    statusRows.length,
    callRows.length,
    resultCommunities.length,
    contacts.length,
    resultChats.reduce((total, chat) => total + chat.unread, 0),
    statusRows.reduce(
      (total, row) => total + new Date(row.status.createdAt).getTime(),
      0,
    ),
  ];

  return { state, revision: revisionParts.join(':') };
}
