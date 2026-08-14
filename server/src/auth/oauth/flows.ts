import type { OAuthProvider } from '@x/shared';
import { and, eq, gt, lt } from 'drizzle-orm';

import { env } from '../../config/env.js';
import { database } from '../../database/client.js';
import { oauthFlows } from '../../database/schema/index.js';
import { createSecureToken, hashToken } from '../tokens.js';
import type { OAuthProviderAdapter } from './types.js';

export async function createOAuthFlow(
  provider: OAuthProviderAdapter,
): Promise<URL> {
  const state = createSecureToken();
  const codeVerifier = provider.usesPkce ? createSecureToken() : null;
  const expiresAt = new Date(
    Date.now() + env.OAUTH_FLOW_TTL_MINUTES * 60 * 1_000,
  );

  await database.transaction(async (transaction) => {
    await transaction
      .delete(oauthFlows)
      .where(lt(oauthFlows.expiresAt, new Date()));
    await transaction.insert(oauthFlows).values({
      stateHash: hashToken(state),
      provider: provider.id,
      codeVerifier,
      expiresAt,
    });
  });

  return provider.createAuthorizationUrl(state, codeVerifier);
}

export async function consumeOAuthFlow(
  provider: OAuthProvider,
  state: string,
): Promise<{ codeVerifier: string | null } | null> {
  const [flow] = await database
    .delete(oauthFlows)
    .where(
      and(
        eq(oauthFlows.provider, provider),
        eq(oauthFlows.stateHash, hashToken(state)),
        gt(oauthFlows.expiresAt, new Date()),
      ),
    )
    .returning({ codeVerifier: oauthFlows.codeVerifier });

  return flow ?? null;
}
