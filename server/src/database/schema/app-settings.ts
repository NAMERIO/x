import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const APP_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const appSettings = pgTable(
  'app_settings',
  {
    id: uuid('id').default(APP_SETTINGS_ID).primaryKey(),
    appName: varchar('app_name', { length: 100 }).default('X').notNull(),
    logoUrl: text('logo_url'),
    description: text('description').default('').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'app_settings_single_row_check',
      sql`${table.id} = '00000000-0000-0000-0000-000000000000'::uuid`,
    ),
  ],
);

export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;
