import {
  PERMISSION_VALUES,
  type AuthError,
  type AuthUser,
  type Permission,
} from '@x/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { clearSessionCookie, readSessionToken } from '../auth/cookies.js';
import { getSessionUser } from '../auth/sessions.js';
import { getEffectivePermissions } from './service.js';

export interface AuthorizationContext {
  user: AuthUser;
  permissions: Permission[];
}

declare module 'fastify' {
  interface FastifyRequest {
    authorization: AuthorizationContext | null;
  }
}

function sendAuthorizationError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  const body: AuthError = { error: { code, message } };
  return reply.code(statusCode).send(body);
}

async function resolveAuthorization(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthorizationContext | null> {
  if (request.authorization) return request.authorization;

  const token = readSessionToken(request);
  if (!token) {
    clearSessionCookie(reply);
    sendAuthorizationError(reply, 401, 'UNAUTHENTICATED', 'Not signed in');
    return null;
  }

  const user = await getSessionUser(token);
  if (!user) {
    clearSessionCookie(reply);
    sendAuthorizationError(reply, 401, 'UNAUTHENTICATED', 'Session expired');
    return null;
  }

  const context = {
    user,
    permissions: await getEffectivePermissions(user.id, user.isOwner),
  };
  request.authorization = context;
  return context;
}

export function hasRequiredPermission(
  user: Pick<AuthUser, 'isOwner'>,
  permissions: readonly Permission[],
  requiredPermission: Permission,
): boolean {
  return user.isOwner || permissions.includes(requiredPermission);
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await resolveAuthorization(request, reply);
}

export async function requireOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const context = await resolveAuthorization(request, reply);
  if (!context || reply.sent) return;

  if (!context.user.isOwner) {
    sendAuthorizationError(
      reply,
      403,
      'OWNER_REQUIRED',
      'Application ownership is required',
    );
  }
}

export function requirePermission(requiredPermission: Permission) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const context = await resolveAuthorization(request, reply);
    if (!context || reply.sent) return;

    if (
      !hasRequiredPermission(
        context.user,
        context.permissions,
        requiredPermission,
      )
    ) {
      sendAuthorizationError(
        reply,
        403,
        'INSUFFICIENT_PERMISSION',
        `The ${requiredPermission} permission is required`,
      );
    }
  };
}

export function requireAnyPermission(
  requiredPermissions: readonly Permission[],
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const context = await resolveAuthorization(request, reply);
    if (!context || reply.sent) return;

    if (
      !context.user.isOwner &&
      !requiredPermissions.some((permission) =>
        context.permissions.includes(permission),
      )
    ) {
      sendAuthorizationError(
        reply,
        403,
        'INSUFFICIENT_PERMISSION',
        `One of these permissions is required: ${requiredPermissions.join(', ')}`,
      );
    }
  };
}

export function ownerPermissions(): Permission[] {
  return [...PERMISSION_VALUES];
}
