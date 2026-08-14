import { z } from 'zod';

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

export class OAuthProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthProviderError';
  }
}

export async function requestAccessToken(
  endpoint: string,
  parameters: URLSearchParams,
): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: parameters,
  });

  const result = tokenResponseSchema.safeParse(await response.json());
  if (!response.ok || !result.success) {
    throw new OAuthProviderError('OAuth token exchange failed');
  }

  return result.data.access_token;
}

export async function requestJson(
  endpoint: string,
  accessToken: string,
): Promise<unknown> {
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OAuthProviderError('OAuth profile request failed');
  }

  return response.json();
}
