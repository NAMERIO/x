import {
  AUTH_PROVIDERS,
  type AuthUser,
  type LoginRequest,
  type OAuthProvider,
  type RegisterRequest,
} from '@x/shared';
import { and, eq } from 'drizzle-orm';

import { database } from '../database/client.js';
import { authAccounts } from '../database/schema/index.js';
import {
  createUserWithAccount,
  findAccount,
  getAuthUser,
  normalizeEmail,
} from './accounts.js';
import {
  hashPassword,
  passwordNeedsRehash,
  performDummyPasswordCheck,
  verifyPassword,
} from './password.js';
import type { OAuthIdentity } from './oauth/types.js';
import { createSession, type CreatedSession } from './sessions.js';

export class AuthenticationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

interface AuthenticationResult {
  session: CreatedSession;
  user: AuthUser;
}

async function createAuthenticationResult(
  userId: string,
  accountId: string,
): Promise<AuthenticationResult> {
  const [session, user] = await Promise.all([
    createSession(userId, accountId),
    getAuthUser(userId, accountId),
  ]);

  if (!user) {
    throw new Error('Created authentication account has no user');
  }

  return { session, user };
}

export async function registerWithPassword(
  input: RegisterRequest,
): Promise<AuthenticationResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const account = await createUserWithAccount({
    provider: AUTH_PROVIDERS.PASSWORD,
    providerAccountId: email,
    email,
    emailVerifiedAt: null,
    passwordHash,
    displayName: input.displayName,
    avatarUrl: null,
  });

  if (!account.created) {
    throw new AuthenticationError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'An account with this email already exists',
    );
  }

  return createAuthenticationResult(account.userId, account.accountId);
}

export async function loginWithPassword(
  input: LoginRequest,
): Promise<AuthenticationResult> {
  const email = normalizeEmail(input.email);
  const account = await findAccount(AUTH_PROVIDERS.PASSWORD, email);

  if (!account?.passwordHash) {
    await performDummyPasswordCheck(input.password);
    throw new AuthenticationError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
  }

  const validPassword = await verifyPassword(
    account.passwordHash,
    input.password,
  );
  if (!validPassword) {
    throw new AuthenticationError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
  }

  if (passwordNeedsRehash(account.passwordHash)) {
    const passwordHash = await hashPassword(input.password);
    await database
      .update(authAccounts)
      .set({ passwordHash, updatedAt: new Date() })
      .where(
        and(
          eq(authAccounts.id, account.id),
          eq(authAccounts.provider, AUTH_PROVIDERS.PASSWORD),
        ),
      );
  }

  return createAuthenticationResult(account.userId, account.id);
}

export async function loginWithOAuth(
  provider: OAuthProvider,
  identity: OAuthIdentity,
): Promise<AuthenticationResult> {
  const existingAccount = await findAccount(
    provider,
    identity.providerAccountId,
  );

  if (existingAccount) {
    return createAuthenticationResult(
      existingAccount.userId,
      existingAccount.id,
    );
  }

  const account = await createUserWithAccount({
    provider,
    providerAccountId: identity.providerAccountId,
    email: identity.email,
    emailVerifiedAt: identity.emailVerifiedAt,
    passwordHash: null,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
  });

  return createAuthenticationResult(account.userId, account.accountId);
}
