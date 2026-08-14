export const API_PREFIX = '/api' as const;

export const API_ROUTES = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    providers: '/auth/providers',
    oauthGoogle: '/auth/oauth/google',
    oauthFacebook: '/auth/oauth/facebook',
  },
  authorization: {
    roles: '/authorization/roles',
    members: '/authorization/members',
  },
  members: {
    list: '/members',
  },
  chat: {
    messages: '/chat/messages',
    message: (messageId: string) => `/chat/messages/${messageId}`,
    reactions: (messageId: string) => `/chat/messages/${messageId}/reactions`,
  },
} as const;
