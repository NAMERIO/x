import {
  API_PREFIX,
  API_ROUTES,
  authErrorSchema,
  authProvidersResponseSchema,
  authResponseSchema,
  chatHistoryResponseSchema,
  chatMessageSchema,
  chatReactionSchema,
  membersResponseSchema,
  roleSchema,
  rolesResponseSchema,
  type AdminMember,
  type AuthorizationRole,
  type AuthProvidersResponse,
  type AuthUser,
  type CreateRoleRequest,
  type ChatHistoryResponse,
  type ChatMessage,
  type ChatReactionsUpdatedEvent,
  type EditMessageRequest,
  type LoginRequest,
  type MembersResponse,
  type RegisterRequest,
  type ReactionRequest,
  type RolesResponse,
  type SetMemberRolesRequest,
  type SendMessageRequest,
  type UpdateRoleRequest,
} from '@x/shared';

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? API_PREFIX
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = authErrorSchema.safeParse(await response.json());
    throw new ApiError(
      error.success ? error.data.error.code : 'REQUEST_FAILED',
      error.success ? error.data.error.message : 'Request failed',
      response.status,
    );
  }

  return response;
}

export async function register(input: RegisterRequest): Promise<AuthUser> {
  const response = await request(API_ROUTES.auth.register, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return authResponseSchema.parse(await response.json()).user;
}

export async function login(input: LoginRequest): Promise<AuthUser> {
  const response = await request(API_ROUTES.auth.login, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return authResponseSchema.parse(await response.json()).user;
}

export async function logout(): Promise<void> {
  await request(API_ROUTES.auth.logout, { method: 'POST' });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await request(API_ROUTES.auth.me);
    return authResponseSchema.parse(await response.json()).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function getAuthProviders(): Promise<AuthProvidersResponse> {
  const response = await request(API_ROUTES.auth.providers);
  return authProvidersResponseSchema.parse(await response.json());
}

export function getOAuthUrl(provider: 'google' | 'facebook'): string {
  const route =
    provider === 'google'
      ? API_ROUTES.auth.oauthGoogle
      : API_ROUTES.auth.oauthFacebook;
  return `${apiBaseUrl}${route}`;
}

export async function getRoles(): Promise<RolesResponse> {
  const response = await request(API_ROUTES.authorization.roles);
  return rolesResponseSchema.parse(await response.json());
}

export async function createRole(
  input: CreateRoleRequest,
): Promise<AuthorizationRole> {
  const response = await request(API_ROUTES.authorization.roles, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return roleSchema.parse(await response.json());
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleRequest,
): Promise<AuthorizationRole> {
  const response = await request(
    `${API_ROUTES.authorization.roles}/${roleId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return roleSchema.parse(await response.json());
}

export async function deleteRole(roleId: string): Promise<void> {
  await request(`${API_ROUTES.authorization.roles}/${roleId}`, {
    method: 'DELETE',
  });
}

export async function getAdminMembers(): Promise<MembersResponse> {
  const response = await request(API_ROUTES.authorization.members);
  return membersResponseSchema.parse(await response.json());
}

export async function getCommunityMembers(): Promise<MembersResponse> {
  const response = await request(API_ROUTES.members.list);
  return membersResponseSchema.parse(await response.json());
}

export async function getChatHistory(
  cursor?: string,
): Promise<ChatHistoryResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const response = await request(`${API_ROUTES.chat.messages}${query}`);
  return chatHistoryResponseSchema.parse(await response.json());
}

export async function sendChatMessage(
  input: SendMessageRequest,
): Promise<ChatMessage> {
  const response = await request(API_ROUTES.chat.messages, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return chatMessageSchema.parse(await response.json());
}

export async function editChatMessage(
  messageId: string,
  input: EditMessageRequest,
): Promise<ChatMessage> {
  const response = await request(API_ROUTES.chat.message(messageId), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return chatMessageSchema.parse(await response.json());
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  await request(API_ROUTES.chat.message(messageId), { method: 'DELETE' });
}

async function changeChatReaction(
  messageId: string,
  input: ReactionRequest,
  method: 'PUT' | 'DELETE',
): Promise<ChatReactionsUpdatedEvent> {
  const response = await request(API_ROUTES.chat.reactions(messageId), {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await response.json()) as Record<string, unknown>;
  return {
    messageId: String(body.messageId),
    reactions: chatReactionSchema.array().parse(body.reactions),
  };
}

export async function addChatReaction(
  messageId: string,
  input: ReactionRequest,
): Promise<ChatReactionsUpdatedEvent> {
  return changeChatReaction(messageId, input, 'PUT');
}

export async function removeChatReaction(
  messageId: string,
  input: ReactionRequest,
): Promise<ChatReactionsUpdatedEvent> {
  return changeChatReaction(messageId, input, 'DELETE');
}

export async function setAdminMemberRoles(
  memberId: string,
  input: SetMemberRolesRequest,
): Promise<AdminMember> {
  const response = await request(
    `${API_ROUTES.authorization.members}/${memberId}/roles`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return membersResponseSchema.shape.members.element.parse(
    await response.json(),
  );
}
