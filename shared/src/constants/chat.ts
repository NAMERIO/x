export const CHAT_SOCKET_EVENTS = {
  TYPING: 'chat:typing',
  PRESENCE_SNAPSHOT: 'chat:presence-snapshot',
  PRESENCE_CHANGED: 'chat:presence-changed',
  MESSAGE_CREATED: 'chat:message-created',
  MESSAGE_UPDATED: 'chat:message-updated',
  MESSAGE_DELETED: 'chat:message-deleted',
  REACTIONS_UPDATED: 'chat:reactions-updated',
} as const;

export const CHAT_MESSAGE_MAX_LENGTH = 4_000;
export const CHAT_HISTORY_DEFAULT_LIMIT = 50;
export const CHAT_HISTORY_MAX_LIMIT = 100;
