export type AppView =
  'chat' | 'announcements' | 'info' | 'calls' | 'members' | 'settings';

export type AppTheme = 'warm' | 'dark';

export type Presence = 'online' | 'idle' | 'offline';

export interface MockMember {
  id: string;
  name: string;
  role: string;
  status: string;
  presence: Presence;
  avatarColor: string;
}

export interface MockReaction {
  emoji: string;
  count: number;
}

export interface MockMessage {
  id: string;
  author: MockMember;
  timestamp: string;
  content: string;
  reactions?: MockReaction[];
  replyTo?: string;
}

export interface MockAnnouncement {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  tag: string;
  pinned?: boolean;
}
