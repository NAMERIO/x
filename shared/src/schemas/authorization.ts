import { z } from 'zod';

import { PERMISSION_VALUES } from '../constants/permissions.js';

export const permissionSchema = z.enum(PERMISSION_VALUES);

export const roleColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hexadecimal color')
  .nullable();

export const roleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: roleColorSchema,
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  permissions: z.array(permissionSchema),
  memberCount: z.number().int().nonnegative(),
});

export const permissionDefinitionSchema = z.object({
  identifier: permissionSchema,
  category: z.string(),
  label: z.string(),
  description: z.string(),
});

export const rolesResponseSchema = z.object({
  roles: z.array(roleSchema),
  permissions: z.array(permissionDefinitionSchema),
});

export const adminMemberSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isOwner: z.boolean(),
  roles: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      color: roleColorSchema,
      isSystem: z.boolean(),
    }),
  ),
});

export const membersResponseSchema = z.object({
  members: z.array(adminMemberSchema),
});

export const createRoleRequestSchema = z.object({
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(500).nullable().default(null),
  color: roleColorSchema.default(null),
  permissions: z.array(permissionSchema).default([]),
});

export const updateRoleRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(64).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    color: roleColorSchema.optional(),
    permissions: z.array(permissionSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No changes supplied');

export const setMemberRolesRequestSchema = z.object({
  roleIds: z.array(z.uuid()),
});
