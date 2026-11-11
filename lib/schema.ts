import { jsonb, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import type { AppState, Broadcast } from './types';

export const appStates = pgTable('app_states', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<AppState>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export type AppStateRow = typeof appStates.$inferSelect;
export type AppStateInsert = typeof appStates.$inferInsert;
export type BroadcastRow = typeof broadcasts.$inferSelect;
export type BroadcastInsert = typeof broadcasts.$inferInsert;
