import type { Permission } from '@x/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

const databasePermissions = {
  MANAGE_APP: 'MANAGE_APP',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_MESSAGES: 'MANAGE_MESSAGES',
  MANAGE_ANNOUNCEMENTS: 'MANAGE_ANNOUNCEMENTS',
  MANAGE_CALLS: 'MANAGE_CALLS',
  CHANGE_BRANDING: 'CHANGE_BRANDING',
  SEND_MESSAGES: 'SEND_MESSAGES',
  MENTION_EVERYONE: 'MENTION_EVERYONE',
  JOIN_CALLS: 'JOIN_CALLS',
  START_CALLS: 'START_CALLS',
} as const satisfies { readonly [Identifier in Permission]: Identifier };

const databasePermissionValues = Object.values(databasePermissions) as [
  Permission,
  ...Permission[],
];

export const permissionIdentifier = pgEnum(
  'permission_identifier',
  databasePermissionValues,
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 64 }).notNull().unique('roles_name_unique'),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    isDefault: boolean('is_default').default(false).notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'roles_color_format_check',
      sql`${table.color} IS NULL OR ${table.color} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    uniqueIndex('roles_one_default_unique')
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
    index('roles_is_system_idx').on(table.isSystem),
  ],
);

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: permissionIdentifier('identifier')
    .notNull()
    .unique('permissions_identifier_unique'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roleId],
      name: 'user_roles_pkey',
    }),
    index('user_roles_role_id_idx').on(table.roleId),
    index('user_roles_assigned_by_idx').on(table.assignedBy),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.roleId, table.permissionId],
      name: 'role_permissions_pkey',
    }),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type PermissionRecord = typeof permissions.$inferSelect;
