import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    mentionsEveryone: boolean('mentions_everyone').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_author_id_idx').on(table.authorId),
    index('messages_deleted_at_idx').on(table.deletedAt),
  ],
);

export const messageReplies = pgTable(
  'message_replies',
  {
    messageId: uuid('message_id')
      .primaryKey()
      .references(() => messages.id, { onDelete: 'cascade' }),
    parentMessageId: uuid('parent_message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
  },
  (table) => [index('message_replies_parent_idx').on(table.parentMessageId)],
);

export const messageReactions = pgTable(
  'message_reactions',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: varchar('emoji', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.messageId, table.userId, table.emoji],
      name: 'message_reactions_pkey',
    }),
    index('message_reactions_message_idx').on(table.messageId),
    index('message_reactions_user_idx').on(table.userId),
  ],
);

export const messageMentions = pgTable(
  'message_mentions',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.messageId, table.userId],
      name: 'message_mentions_pkey',
    }),
    index('message_mentions_user_idx').on(table.userId),
  ],
);

export type MessageRecord = typeof messages.$inferSelect;
