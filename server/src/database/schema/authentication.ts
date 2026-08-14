import type { AuthProvider, OAuthProvider } from '@x/shared';
import { sql } from 'drizzle-orm';
import {
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 })
      .$type<AuthProvider>()
      .notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    email: varchar('email', { length: 320 }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('auth_accounts_provider_account_unique').on(
      table.provider,
      table.providerAccountId,
    ),
    index('auth_accounts_user_id_idx').on(table.userId),
    index('auth_accounts_email_idx').on(table.email),
    check(
      'auth_accounts_password_hash_check',
      sql`(${table.provider} = 'password' AND ${table.passwordHash} IS NOT NULL) OR (${table.provider} <> 'password' AND ${table.passwordHash} IS NULL)`,
    ),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: char('token_hash', { length: 64 })
      .notNull()
      .unique('sessions_token_hash_unique'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authAccountId: uuid('auth_account_id').references(() => authAccounts.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_auth_account_id_idx').on(table.authAccountId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const oauthFlows = pgTable(
  'oauth_flows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stateHash: char('state_hash', { length: 64 })
      .notNull()
      .unique('oauth_flows_state_hash_unique'),
    provider: varchar('provider', { length: 32 })
      .$type<OAuthProvider>()
      .notNull(),
    codeVerifier: text('code_verifier'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('oauth_flows_expires_at_idx').on(table.expiresAt)],
);

export type AuthAccount = typeof authAccounts.$inferSelect;
export type NewAuthAccount = typeof authAccounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
