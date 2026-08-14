import {
  CHAT_SOCKET_EVENTS,
  PERMISSIONS,
  chatTypingPayloadSchema,
  type AuthUser,
  type ChatClientToServerEvents,
  type ChatServerToClientEvents,
  type Permission,
} from '@x/shared';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

import { SESSION_COOKIE_NAME } from '../auth/cookies.js';
import { getSessionUser } from '../auth/sessions.js';
import { getEffectivePermissions } from '../authorization/service.js';
import { env } from '../config/env.js';
interface ChatSocketData {
  user: AuthUser;
  permissions: Permission[];
  lastTypingAt: number;
}

export type ChatIoServer = Server<
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  Record<string, never>,
  ChatSocketData
>;

declare module 'fastify' {
  interface FastifyInstance {
    chatIo: ChatIoServer;
  }
}

export function attachChatSocket(app: FastifyInstance): ChatIoServer {
  const io = new Server<
    ChatClientToServerEvents,
    ChatServerToClientEvents,
    Record<string, never>,
    ChatSocketData
  >(app.server, {
    path: '/socket.io',
    cors: {
      origin: new URL(env.APP_ORIGIN).origin,
      credentials: true,
    },
  });
  const connectionCountByUser = new Map<string, number>();

  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && origin !== new URL(env.APP_ORIGIN).origin) {
        next(new Error('INVALID_ORIGIN'));
        return;
      }

      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      const signedToken = app.parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
      if (!signedToken) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      const unsigned = app.unsignCookie(signedToken);
      if (!unsigned.valid) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      const user = await getSessionUser(unsigned.value);
      if (!user) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }

      socket.data.user = user;
      socket.data.permissions = await getEffectivePermissions(
        user.id,
        user.isOwner,
      );
      socket.data.lastTypingAt = 0;
      next();
    } catch {
      next(new Error('SOCKET_AUTHENTICATION_FAILED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const previousCount = connectionCountByUser.get(user.id) ?? 0;
    connectionCountByUser.set(user.id, previousCount + 1);

    socket.emit(CHAT_SOCKET_EVENTS.PRESENCE_SNAPSHOT, {
      onlineUserIds: [...connectionCountByUser.keys()],
    });
    if (previousCount === 0) {
      socket.broadcast.emit(CHAT_SOCKET_EVENTS.PRESENCE_CHANGED, {
        userId: user.id,
        status: 'online',
      });
    }

    socket.on(CHAT_SOCKET_EVENTS.TYPING, (payload) => {
      const parsed = chatTypingPayloadSchema.safeParse(payload);
      if (!parsed.success) return;
      if (
        !user.isOwner &&
        !socket.data.permissions.includes(PERMISSIONS.SEND_MESSAGES)
      ) {
        return;
      }

      const now = Date.now();
      if (parsed.data.isTyping && now - socket.data.lastTypingAt < 400) return;
      socket.data.lastTypingAt = now;
      socket.broadcast.emit(CHAT_SOCKET_EVENTS.TYPING, {
        ...parsed.data,
        userId: user.id,
        displayName: user.displayName,
      });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit(CHAT_SOCKET_EVENTS.TYPING, {
        userId: user.id,
        displayName: user.displayName,
        isTyping: false,
      });

      const remaining = (connectionCountByUser.get(user.id) ?? 1) - 1;
      if (remaining <= 0) {
        connectionCountByUser.delete(user.id);
        socket.broadcast.emit(CHAT_SOCKET_EVENTS.PRESENCE_CHANGED, {
          userId: user.id,
          status: 'offline',
        });
      } else {
        connectionCountByUser.set(user.id, remaining);
      }
    });
  });

  app.decorate('chatIo', io);
  app.addHook('onClose', async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });
  return io;
}
