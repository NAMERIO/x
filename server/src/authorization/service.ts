import {
  PERMISSION_DEFINITIONS,
  PERMISSION_VALUES,
  type AdminMember,
  type AuthorizationRole,
  type CreateRoleRequest,
  type Permission,
  type RolesResponse,
  type UpdateRoleRequest,
} from '@x/shared';
import { and, asc, count, eq, inArray, ne } from 'drizzle-orm';

import { OWNER_ROLE_NAME } from '../auth/constants.js';
import { database } from '../database/client.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../database/schema/index.js';

export class AuthorizationServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthorizationServiceError';
  }
}

export interface AuthorizationActor {
  id: string;
  isOwner: boolean;
  permissions: readonly Permission[];
}

export function canGrantPermissions(
  actor: Pick<AuthorizationActor, 'isOwner' | 'permissions'>,
  requestedPermissions: readonly Permission[],
): boolean {
  return (
    actor.isOwner ||
    requestedPermissions.every((permission) =>
      actor.permissions.includes(permission),
    )
  );
}

function assertCanGrantPermissions(
  actor: AuthorizationActor,
  requestedPermissions: readonly Permission[],
) {
  if (!canGrantPermissions(actor, requestedPermissions)) {
    throw new AuthorizationServiceError(
      403,
      'CANNOT_GRANT_PERMISSION',
      'You cannot grant or manage permissions that you do not have',
    );
  }
}

function isReservedRoleName(name: string): boolean {
  return ['owner', 'member'].includes(name.trim().toLowerCase());
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

async function getPermissionIds(permissionValues: Permission[]) {
  if (permissionValues.length === 0) return [];

  const records = await database
    .select({ id: permissions.id, identifier: permissions.identifier })
    .from(permissions)
    .where(inArray(permissions.identifier, permissionValues));

  if (records.length !== new Set(permissionValues).size) {
    throw new AuthorizationServiceError(
      400,
      'UNKNOWN_PERMISSION',
      'One or more permissions are not available',
    );
  }

  return records;
}

export async function getEffectivePermissions(
  userId: string,
  isOwner: boolean,
): Promise<Permission[]> {
  if (isOwner) return [...PERMISSION_VALUES];

  const records = await database
    .selectDistinct({ identifier: permissions.identifier })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  return records.map((record) => record.identifier);
}

export async function listRoles(): Promise<RolesResponse> {
  const [roleRecords, permissionLinks, memberCounts] = await Promise.all([
    database.select().from(roles).orderBy(asc(roles.name)),
    database
      .select({
        roleId: rolePermissions.roleId,
        identifier: permissions.identifier,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)),
    database
      .select({ roleId: userRoles.roleId, value: count() })
      .from(userRoles)
      .groupBy(userRoles.roleId),
  ]);

  const permissionsByRole = new Map<string, Permission[]>();
  for (const link of permissionLinks) {
    const rolePermissionValues = permissionsByRole.get(link.roleId) ?? [];
    rolePermissionValues.push(link.identifier);
    permissionsByRole.set(link.roleId, rolePermissionValues);
  }

  const countsByRole = new Map(
    memberCounts.map((record) => [record.roleId, Number(record.value)]),
  );

  const responseRoles: AuthorizationRole[] = roleRecords.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    color: role.color,
    isDefault: role.isDefault,
    isSystem: role.isSystem,
    permissions:
      role.name === OWNER_ROLE_NAME
        ? [...PERMISSION_VALUES]
        : (permissionsByRole.get(role.id) ?? []),
    memberCount: countsByRole.get(role.id) ?? 0,
  }));

  return {
    roles: responseRoles,
    permissions: PERMISSION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
  };
}

export async function createRole(
  input: CreateRoleRequest,
  actor: AuthorizationActor,
): Promise<AuthorizationRole> {
  if (isReservedRoleName(input.name)) {
    throw new AuthorizationServiceError(
      400,
      'RESERVED_ROLE_NAME',
      'That role name is reserved',
    );
  }

  assertCanGrantPermissions(actor, input.permissions);

  const permissionRecords = await getPermissionIds(input.permissions);

  try {
    const role = await database.transaction(async (transaction) => {
      const [createdRole] = await transaction
        .insert(roles)
        .values({
          name: input.name,
          description: input.description,
          color: input.color,
          isDefault: false,
          isSystem: false,
        })
        .returning();

      if (!createdRole) throw new Error('Failed to create role');

      if (permissionRecords.length > 0) {
        await transaction.insert(rolePermissions).values(
          permissionRecords.map((permission) => ({
            roleId: createdRole.id,
            permissionId: permission.id,
          })),
        );
      }

      return createdRole;
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      isDefault: role.isDefault,
      isSystem: role.isSystem,
      permissions: [...new Set(input.permissions)],
      memberCount: 0,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthorizationServiceError(
        409,
        'ROLE_NAME_EXISTS',
        'A role with that name already exists',
      );
    }
    throw error;
  }
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleRequest,
  actor: AuthorizationActor,
): Promise<AuthorizationRole> {
  const [existingRole] = await database
    .select()
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!existingRole) {
    throw new AuthorizationServiceError(
      404,
      'ROLE_NOT_FOUND',
      'Role not found',
    );
  }

  if (existingRole.name === OWNER_ROLE_NAME) {
    throw new AuthorizationServiceError(
      403,
      'OWNER_ROLE_IMMUTABLE',
      'The Owner role cannot be changed',
    );
  }

  if (
    input.name &&
    (existingRole.isSystem || isReservedRoleName(input.name)) &&
    input.name !== existingRole.name
  ) {
    throw new AuthorizationServiceError(
      400,
      'SYSTEM_ROLE_NAME_IMMUTABLE',
      'System role names cannot be changed',
    );
  }

  if (!actor.isOwner) {
    const existingPermissions = await database
      .select({ identifier: permissions.identifier })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    assertCanGrantPermissions(
      actor,
      existingPermissions.map((permission) => permission.identifier),
    );
    if (input.permissions) assertCanGrantPermissions(actor, input.permissions);
  }

  const permissionRecords = input.permissions
    ? await getPermissionIds(input.permissions)
    : null;

  try {
    await database.transaction(async (transaction) => {
      await transaction
        .update(roles)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.color !== undefined && { color: input.color }),
          updatedAt: new Date(),
        })
        .where(eq(roles.id, roleId));

      if (permissionRecords) {
        await transaction
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));

        if (permissionRecords.length > 0) {
          await transaction.insert(rolePermissions).values(
            permissionRecords.map((permission) => ({
              roleId,
              permissionId: permission.id,
            })),
          );
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthorizationServiceError(
        409,
        'ROLE_NAME_EXISTS',
        'A role with that name already exists',
      );
    }
    throw error;
  }

  const refreshed = await listRoles();
  const role = refreshed.roles.find((record) => record.id === roleId);
  if (!role) throw new Error('Updated role could not be loaded');
  return role;
}

export async function deleteRole(
  roleId: string,
  actor: AuthorizationActor,
): Promise<void> {
  const [role] = await database
    .select()
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!role) {
    throw new AuthorizationServiceError(
      404,
      'ROLE_NOT_FOUND',
      'Role not found',
    );
  }

  if (role.isSystem || role.name === OWNER_ROLE_NAME) {
    throw new AuthorizationServiceError(
      403,
      'SYSTEM_ROLE_IMMUTABLE',
      'System roles cannot be deleted',
    );
  }

  if (!actor.isOwner) {
    const rolePermissionValues = await database
      .select({ identifier: permissions.identifier })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    assertCanGrantPermissions(
      actor,
      rolePermissionValues.map((permission) => permission.identifier),
    );
  }

  await database.delete(roles).where(eq(roles.id, roleId));
}

export async function listMembers(): Promise<AdminMember[]> {
  const [memberRecords, assignments] = await Promise.all([
    database.select().from(users).orderBy(asc(users.displayName)),
    database
      .select({
        userId: userRoles.userId,
        id: roles.id,
        name: roles.name,
        color: roles.color,
        isSystem: roles.isSystem,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id)),
  ]);

  const rolesByUser = new Map<string, AdminMember['roles']>();
  for (const assignment of assignments) {
    const assignedRoles = rolesByUser.get(assignment.userId) ?? [];
    assignedRoles.push({
      id: assignment.id,
      name: assignment.name,
      color: assignment.color,
      isSystem: assignment.isSystem,
    });
    rolesByUser.set(assignment.userId, assignedRoles);
  }

  return memberRecords.map((member) => {
    const assignedRoles = rolesByUser.get(member.id) ?? [];
    return {
      id: member.id,
      username: member.username,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      isOwner: assignedRoles.some((role) => role.name === OWNER_ROLE_NAME),
      roles: assignedRoles,
    };
  });
}

export async function setMemberRoles(
  memberId: string,
  requestedRoleIds: string[],
  actor: AuthorizationActor,
): Promise<AdminMember> {
  const uniqueRoleIds = [...new Set(requestedRoleIds)];

  await database.transaction(async (transaction) => {
    const [member] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, memberId))
      .limit(1);

    if (!member) {
      throw new AuthorizationServiceError(
        404,
        'MEMBER_NOT_FOUND',
        'Member not found',
      );
    }

    const [ownerRole] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, OWNER_ROLE_NAME))
      .limit(1);

    if (!ownerRole) throw new Error('Owner role is missing');

    if (uniqueRoleIds.includes(ownerRole.id)) {
      throw new AuthorizationServiceError(
        403,
        'OWNER_ASSIGNMENT_FORBIDDEN',
        'Ownership cannot be assigned through role management',
      );
    }

    if (uniqueRoleIds.length > 0) {
      const assignableRoles = await transaction
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            inArray(roles.id, uniqueRoleIds),
            ne(roles.name, OWNER_ROLE_NAME),
          ),
        );

      if (assignableRoles.length !== uniqueRoleIds.length) {
        throw new AuthorizationServiceError(
          400,
          'INVALID_ROLE_ASSIGNMENT',
          'One or more roles cannot be assigned',
        );
      }

      if (!actor.isOwner) {
        const requestedPermissions = await transaction
          .selectDistinct({ identifier: permissions.identifier })
          .from(rolePermissions)
          .innerJoin(
            permissions,
            eq(rolePermissions.permissionId, permissions.id),
          )
          .where(inArray(rolePermissions.roleId, uniqueRoleIds));
        assertCanGrantPermissions(
          actor,
          requestedPermissions.map((permission) => permission.identifier),
        );
      }
    }

    if (!actor.isOwner) {
      const currentPermissions = await transaction
        .selectDistinct({ identifier: permissions.identifier })
        .from(userRoles)
        .innerJoin(
          rolePermissions,
          eq(userRoles.roleId, rolePermissions.roleId),
        )
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(
          and(
            eq(userRoles.userId, memberId),
            ne(userRoles.roleId, ownerRole.id),
          ),
        );
      assertCanGrantPermissions(
        actor,
        currentPermissions.map((permission) => permission.identifier),
      );
    }

    await transaction
      .delete(userRoles)
      .where(
        and(eq(userRoles.userId, memberId), ne(userRoles.roleId, ownerRole.id)),
      );

    if (uniqueRoleIds.length > 0) {
      await transaction.insert(userRoles).values(
        uniqueRoleIds.map((roleId) => ({
          userId: memberId,
          roleId,
          assignedBy: actor.id,
        })),
      );
    }
  });

  const members = await listMembers();
  const member = members.find((record) => record.id === memberId);
  if (!member) throw new Error('Updated member could not be loaded');
  return member;
}
