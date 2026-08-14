import type { z } from 'zod';

import type {
  adminMemberSchema,
  createRoleRequestSchema,
  membersResponseSchema,
  permissionDefinitionSchema,
  roleSchema,
  rolesResponseSchema,
  setMemberRolesRequestSchema,
  updateRoleRequestSchema,
} from '../schemas/authorization.js';

export type AuthorizationRole = z.infer<typeof roleSchema>;
export type PermissionDefinition = z.infer<typeof permissionDefinitionSchema>;
export type RolesResponse = z.infer<typeof rolesResponseSchema>;
export type AdminMember = z.infer<typeof adminMemberSchema>;
export type MembersResponse = z.infer<typeof membersResponseSchema>;
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;
export type SetMemberRolesRequest = z.infer<typeof setMemberRolesRequestSchema>;
