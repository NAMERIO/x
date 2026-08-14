import type { AuthUser } from '@x/shared';
import { and, eq, gt, lt } from 'drizzle-orm';

import { env } from '../config/env.js';
import { database } from '../database/client.js';
import { sessions } from '../database/schema/index.js';
import { getAuthUser } from './accounts.js';
import { createSecureToken, hashToken } from './tokens.js';

export interface CreatedSession {
  expiresAt: Date;
  token: string;
}

export async function createSession(
  userId: string,
  authAccountId: string,
): Promise<CreatedSession> {
  const token = createSecureToken();
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );

  await database.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    authAccountId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token);
  const [session] = await database
    .select({
      userId: sessions.userId,
      authAccountId: sessions.authAccountId,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const refreshThreshold = new Date(Date.now() - 5 * 60 * 1_000);
  if (session.lastSeenAt < refreshThreshold) {
    await database
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          lt(sessions.lastSeenAt, refreshThreshold),
        ),
      );
  }

  return getAuthUser(session.userId, session.authAccountId);
}

export async function deleteSession(token: string): Promise<void> {
  await database
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)));
}
