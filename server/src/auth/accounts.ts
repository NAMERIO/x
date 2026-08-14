import { PERMISSIONS, type AuthProvider, type AuthUser } from '@x/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { database } from '../database/client.js';
import {
  authAccounts,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../database/schema/index.js';
import {
  ACCOUNT_CREATION_LOCK_ID,
  MEMBER_ROLE_NAME,
  OWNER_ROLE_NAME,
} from './constants.js';
import { createSecureToken } from './tokens.js';

interface AccountIdentity {
  provider: AuthProvider;
  providerAccountId: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  displayName: string;
  avatarUrl: string | null;
}

interface AccountCreationResult {
  accountId: string;
  userId: string;
  created: boolean;
  isOwner: boolean;
}

function createUsernameBase(identity: AccountIdentity): string {
  const source = identity.email?.split('@')[0] ?? identity.displayName;
  const normalized = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 22);

  return normalized.length >= 2 ? normalized : 'member';
}

export async function findAccount(
  provider: AuthProvider,
  providerAccountId: string,
) {
  const [account] = await database
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);

  return account;
}

export async function createUserWithAccount(
  identity: AccountIdentity,
): Promise<AccountCreationResult> {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(${ACCOUNT_CREATION_LOCK_ID})`,
    );

    const [existingAccount] = await transaction
      .select({ id: authAccounts.id, userId: authAccounts.userId })
      .from(authAccounts)
      .where(
        and(
          eq(authAccounts.provider, identity.provider),
          eq(authAccounts.providerAccountId, identity.providerAccountId),
        ),
      )
      .limit(1);

    if (existingAccount) {
      const [ownerRole] = await transaction
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, existingAccount.userId),
            eq(roles.name, OWNER_ROLE_NAME),
          ),
        )
        .limit(1);

      return {
        accountId: existingAccount.id,
        userId: existingAccount.userId,
        created: false,
        isOwner: Boolean(ownerRole),
      };
    }

    const [existingUser] = await transaction
      .select({ id: users.id })
      .from(users)
      .limit(1);
    const isOwner = !existingUser;

    const usernameBase = createUsernameBase(identity);
    let username = usernameBase;

    for (;;) {
      const [usernameMatch] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!usernameMatch) {
        break;
      }

      username = `${usernameBase}_${createSecureToken().slice(0, 6)}`;
    }

    const [user] = await transaction
      .insert(users)
      .values({
        username,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      })
      .returning({ id: users.id });

    if (!user) {
      throw new Error('Failed to create user');
    }

    const [account] = await transaction
      .insert(authAccounts)
      .values({
        userId: user.id,
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        email: identity.email,
        emailVerifiedAt: identity.emailVerifiedAt,
        passwordHash: identity.passwordHash,
      })
      .returning({ id: authAccounts.id });

    if (!account) {
      throw new Error('Failed to create authentication account');
    }

    const roleName = isOwner ? OWNER_ROLE_NAME : MEMBER_ROLE_NAME;
    let [role] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!role) {
      [role] = await transaction
        .insert(roles)
        .values({
          name: roleName,
          description: isOwner
            ? 'Full application ownership'
            : 'Default community membership',
          isDefault: !isOwner,
          isSystem: true,
        })
        .returning({ id: roles.id });
    }

    if (!role) {
      throw new Error('Failed to create system role');
    }

    if (!isOwner) {
      const defaultPermissions = await transaction
        .select({ id: permissions.id })
        .from(permissions)
        .where(
          inArray(permissions.identifier, [
            PERMISSIONS.SEND_MESSAGES,
            PERMISSIONS.JOIN_CALLS,
            PERMISSIONS.START_CALLS,
          ]),
        );

      if (defaultPermissions.length > 0) {
        await transaction
          .insert(rolePermissions)
          .values(
            defaultPermissions.map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
          )
          .onConflictDoNothing();
      }
    }

    await transaction.insert(userRoles).values({
      userId: user.id,
      roleId: role.id,
    });

    return {
      accountId: account.id,
      userId: user.id,
      created: true,
      isOwner,
    };
  });
}

export async function getAuthUser(
  userId: string,
  authAccountId: string | null,
): Promise<AuthUser | null> {
  const [user] = await database
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const assignedRoles = await database
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  let email: string | null = null;
  if (authAccountId) {
    const [account] = await database
      .select({ email: authAccounts.email })
      .from(authAccounts)
      .where(
        and(
          eq(authAccounts.id, authAccountId),
          eq(authAccounts.userId, userId),
        ),
      )
      .limit(1);
    email = account?.email ?? null;
  }

  const roleNames = assignedRoles.map((role) => role.name);

  return {
    ...user,
    email,
    isOwner: roleNames.includes(OWNER_ROLE_NAME),
    roles: roleNames,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
