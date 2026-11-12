import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import type { Broadcast } from './types';

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    kind: text('kind').$type<'direct' | 'group'>().notNull(),
    title: text('title'),
    avatar: text('avatar'),
    about: text('about'),
    directKey: text('direct_key'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chats_updated_at_idx').on(table.updatedAt),
    uniqueIndex('chats_direct_key_idx').on(table.directKey),
  ],
);

export const chatMembers = pgTable(
  'chat_members',
  {
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<'member' | 'admin'>().notNull().default('member'),
    pinned: boolean('pinned').notNull().default(false),
    muted: boolean('muted').notNull().default(false),
    archived: boolean('archived').notNull().default(false),
    favorite: boolean('favorite').notNull().default(false),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.userId] }),
    index('chat_members_user_idx').on(table.userId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    text: text('text').notNull().default(''),
    kind: text('kind')
      .$type<'text' | 'image' | 'voice' | 'document' | 'location'>()
      .notNull()
      .default('text'),
    image: text('image'),
    duration: text('duration'),
    fileName: text('file_name'),
    fileSize: text('file_size'),
    replyToId: text('reply_to_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_chat_created_idx').on(table.chatId, table.createdAt)],
);

export const messageReactions = pgTable(
  'message_reactions',
  {
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
  },
  (table) => [primaryKey({ columns: [table.messageId, table.userId, table.emoji] })],
);

export const statuses = pgTable(
  'statuses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').$type<'image' | 'text'>().notNull(),
    image: text('image'),
    caption: text('caption'),
    background: text('background'),
    duration: integer('duration').notNull().default(5),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('statuses_expires_at_idx').on(table.expiresAt),
    index('statuses_user_idx').on(table.userId),
  ],
);

export const statusViews = pgTable(
  'status_views',
  {
    statusId: text('status_id')
      .notNull()
      .references(() => statuses.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.statusId, table.viewerId] })],
);

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  announcement: text('announcement').notNull().default(''),
  avatar: text('avatar'),
  accent: text('accent').notNull().default('#00a884'),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const communityMembers = pgTable(
  'community_members',
  {
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<'member' | 'admin'>().notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.communityId, table.userId] }),
    index('community_members_user_idx').on(table.userId),
  ],
);

export const communityChats = pgTable(
  'community_chats',
  {
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.communityId, table.chatId] })],
);

export const callLogs = pgTable(
  'call_logs',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    peerId: text('peer_id').references(() => user.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    avatar: text('avatar'),
    direction: text('direction').$type<'incoming' | 'outgoing' | 'missed'>().notNull(),
    type: text('type').$type<'voice' | 'video'>().notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    duration: text('duration'),
  },
  (table) => [index('call_logs_owner_at_idx').on(table.ownerId, table.at)],
);

export const pushTokens = pgTable(
  'push_tokens',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: text('platform').notNull().default('android'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.token] })],
);

export const broadcasts = pgTable(
  'broadcasts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    audience: text('audience').$type<Broadcast['audience']>().notNull(),
    sentBy: text('sent_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('broadcasts_created_at_idx').on(table.createdAt)],
);

export type ChatRow = typeof chats.$inferSelect;
export type ChatMemberRow = typeof chatMembers.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type StatusRow = typeof statuses.$inferSelect;
export type CommunityRow = typeof communities.$inferSelect;
export type CallLogRow = typeof callLogs.$inferSelect;
export type BroadcastRow = typeof broadcasts.$inferSelect;
export type BroadcastInsert = typeof broadcasts.$inferInsert;
