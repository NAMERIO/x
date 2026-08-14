import type { z } from 'zod';

import type {
  chatAuthorSchema,
  chatHistoryResponseSchema,
  chatMessageSchema,
  chatReactionSchema,
  editMessageRequestSchema,
  reactionRequestSchema,
  sendMessageRequestSchema,
} from '../schemas/chat.js';

export type ChatAuthor = z.infer<typeof chatAuthorSchema>;
export type ChatReaction = z.infer<typeof chatReactionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatHistoryResponse = z.infer<typeof chatHistoryResponseSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type EditMessageRequest = z.infer<typeof editMessageRequestSchema>;
export type ReactionRequest = z.infer<typeof reactionRequestSchema>;

export interface ChatTypingPayload {
  isTyping: boolean;
}

export interface ChatTypingEvent extends ChatTypingPayload {
  userId: string;
  displayName: string;
}

export interface ChatPresenceSnapshot {
  onlineUserIds: string[];
}

export interface ChatPresenceEvent {
  userId: string;
  status: 'online' | 'offline';
}

export interface ChatMessageDeletedEvent {
  messageId: string;
  deletedAt: string;
}

export interface ChatReactionsUpdatedEvent {
  messageId: string;
  reactions: ChatReaction[];
}

export interface ChatServerToClientEvents {
  'chat:message-created': (message: ChatMessage) => void;
  'chat:message-updated': (message: ChatMessage) => void;
  'chat:message-deleted': (event: ChatMessageDeletedEvent) => void;
  'chat:reactions-updated': (event: ChatReactionsUpdatedEvent) => void;
  'chat:typing': (event: ChatTypingEvent) => void;
  'chat:presence-snapshot': (event: ChatPresenceSnapshot) => void;
  'chat:presence-changed': (event: ChatPresenceEvent) => void;
}

export interface ChatClientToServerEvents {
  'chat:typing': (payload: ChatTypingPayload) => void;
}
