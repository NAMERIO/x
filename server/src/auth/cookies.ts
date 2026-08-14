import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import type { CreatedSession } from './sessions.js';

export const SESSION_COOKIE_NAME =
  env.NODE_ENV === 'production' ? '__Host-x_session' : 'x_session';

const secureCookie = env.NODE_ENV === 'production';

export function setSessionCookie(
  reply: FastifyReply,
  session: CreatedSession,
): void {
  reply.setCookie(SESSION_COOKIE_NAME, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
    secure: secureCookie,
    signed: true,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: secureCookie,
  });
}

export function readSessionToken(request: FastifyRequest): string | null {
  const signedToken = request.cookies[SESSION_COOKIE_NAME];
  if (!signedToken) {
    return null;
  }

  const result = request.unsignCookie(signedToken);
  return result.valid ? result.value : null;
}
