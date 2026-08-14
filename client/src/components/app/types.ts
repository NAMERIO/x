export type AppView =
  'chat' | 'announcements' | 'info' | 'calls' | 'members' | 'settings';

export type AppTheme = 'warm' | 'dark';

export interface MockAnnouncement {
  id: string;
  title: string;
  body: string;
  author: string;
  date: string;
  tag: string;
  pinned?: boolean;
}
