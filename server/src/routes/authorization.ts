import {
  API_ROUTES,
  PERMISSIONS,
  adminMemberSchema,
  createRoleRequestSchema,
  membersResponseSchema,
  roleSchema,
  rolesResponseSchema,
  setMemberRolesRequestSchema,
  updateRoleRequestSchema,
  type AuthError,
} from '@x/shared';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  requireAnyPermission,
  requirePermission,
} from '../authorization/guards.js';
import {
  AuthorizationServiceError,
  createRole,
  deleteRole,
  listMembers,
  listRoles,
  setMemberRoles,
  updateRole,
} from '../authorization/service.js';

const idParamsSchema = z.object({ id: z.uuid() });

function sendAuthorizationError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  const body: AuthError = { error: { code, message } };
  return reply.code(statusCode).send(body);
}

async function handleServiceCall<T>(
  reply: FastifyReply,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AuthorizationServiceError) {
      sendAuthorizationError(
        reply,
        error.statusCode,
        error.code,
        error.message,
      );
      return undefined;
    }
    throw error;
  }
}

export const authorizationRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    API_ROUTES.authorization.roles,
    {
      preHandler: requireAnyPermission([
        PERMISSIONS.MANAGE_ROLES,
        PERMISSIONS.MANAGE_MEMBERS,
      ]),
    },
    async () => rolesResponseSchema.parse(await listRoles()),
  );

  app.post(
    API_ROUTES.authorization.roles,
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const input = createRoleRequestSchema.safeParse(request.body);
      if (!input.success) {
        return sendAuthorizationError(
          reply,
          400,
          'INVALID_ROLE',
          input.error.issues[0]?.message ?? 'Invalid role details',
        );
      }

      const actor = request.authorization;
      if (!actor) return;
      const role = await handleServiceCall(reply, () =>
        createRole(input.data, {
          id: actor.user.id,
          isOwner: actor.user.isOwner,
          permissions: actor.permissions,
        }),
      );
      if (!role) return;
      return reply.code(201).send(roleSchema.parse(role));
    },
  );

  app.patch<{ Params: { id: string } }>(
    `${API_ROUTES.authorization.roles}/:id`,
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const input = updateRoleRequestSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return sendAuthorizationError(
          reply,
          400,
          'INVALID_ROLE_UPDATE',
          input.error?.issues[0]?.message ?? 'Invalid role update',
        );
      }

      const role = await handleServiceCall(reply, () =>
        updateRole(params.data.id, input.data, {
          id: request.authorization!.user.id,
          isOwner: request.authorization!.user.isOwner,
          permissions: request.authorization!.permissions,
        }),
      );
      if (!role) return;
      return roleSchema.parse(role);
    },
  );

  app.delete<{ Params: { id: string } }>(
    `${API_ROUTES.authorization.roles}/:id`,
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        return sendAuthorizationError(
          reply,
          400,
          'INVALID_ROLE_ID',
          'Invalid role identifier',
        );
      }

      const deleted = await handleServiceCall(reply, async () => {
        const actor = request.authorization!;
        await deleteRole(params.data.id, {
          id: actor.user.id,
          isOwner: actor.user.isOwner,
          permissions: actor.permissions,
        });
        return true;
      });
      if (!deleted) return;
      return reply.code(204).send();
    },
  );

  app.get(
    API_ROUTES.authorization.members,
    { preHandler: requirePermission(PERMISSIONS.MANAGE_MEMBERS) },
    async () => membersResponseSchema.parse({ members: await listMembers() }),
  );

  app.put<{ Params: { id: string } }>(
    `${API_ROUTES.authorization.members}/:id/roles`,
    { preHandler: requirePermission(PERMISSIONS.MANAGE_MEMBERS) },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const input = setMemberRolesRequestSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return sendAuthorizationError(
          reply,
          400,
          'INVALID_ROLE_ASSIGNMENT',
          input.error?.issues[0]?.message ?? 'Invalid role assignment',
        );
      }

      const actor = request.authorization?.user;
      if (!actor) return;

      const member = await handleServiceCall(reply, () =>
        setMemberRoles(params.data.id, input.data.roleIds, {
          id: actor.id,
          isOwner: actor.isOwner,
          permissions: request.authorization!.permissions,
        }),
      );
      if (!member) return;
      return adminMemberSchema.parse(member);
    },
  );
};
