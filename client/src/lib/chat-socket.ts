import type {
  ChatClientToServerEvents,
  ChatServerToClientEvents,
} from '@x/shared';
import { io, type Socket } from 'socket.io-client';

export type ChatSocket = Socket<
  ChatServerToClientEvents,
  ChatClientToServerEvents
>;

export function createChatSocket(): ChatSocket {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL as
    string | undefined;
  const serverOrigin = configuredApiUrl?.startsWith('http')
    ? new URL(configuredApiUrl).origin
    : undefined;

  return io(serverOrigin, {
    autoConnect: false,
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
}
