import type { MockAnnouncement, MockMember, MockMessage } from './types';

export const mockMembers: MockMember[] = [
  {
    id: 'member-1',
    name: 'Maya Brooks',
    role: 'Community Lead',
    status: 'Planning the weekend gathering',
    presence: 'online',
    avatarColor: '#5579b8',
  },
  {
    id: 'member-2',
    name: 'Daniel Okafor',
    role: 'Moderator',
    status: 'Available',
    presence: 'online',
    avatarColor: '#7b6aa8',
  },
  {
    id: 'member-3',
    name: 'Naomi Carter',
    role: 'Member',
    status: 'Listening to worship music',
    presence: 'online',
    avatarColor: '#aa6a63',
  },
  {
    id: 'member-4',
    name: 'Elias Mensah',
    role: 'Member',
    status: 'Away for a little while',
    presence: 'idle',
    avatarColor: '#4c897b',
  },
  {
    id: 'member-5',
    name: 'Sarah Mitchell',
    role: 'Member',
    status: 'Offline',
    presence: 'offline',
    avatarColor: '#a17a4c',
  },
  {
    id: 'member-6',
    name: 'Jordan Lee',
    role: 'Member',
    status: 'Offline',
    presence: 'offline',
    avatarColor: '#607d9e',
  },
];

export const mockMessages: MockMessage[] = [
  {
    id: 'message-1',
    author: mockMembers[0]!,
    timestamp: 'Today at 9:12 AM',
    content:
      'Good morning, everyone! I added the details for Saturday’s community gathering to announcements.',
    reactions: [
      { emoji: '🙌', count: 8 },
      { emoji: '💙', count: 4 },
    ],
  },
  {
    id: 'message-2',
    author: mockMembers[1]!,
    timestamp: 'Today at 9:18 AM',
    content:
      'Thanks, Maya. I can help welcome people at the door. Let me know what time the team should arrive.',
    replyTo: 'Maya Brooks',
    reactions: [{ emoji: '✅', count: 3 }],
  },
  {
    id: 'message-3',
    author: mockMembers[2]!,
    timestamp: 'Today at 10:04 AM',
    content:
      'Does anyone have the reading list from last week? I’d love to catch up before our next discussion.',
  },
  {
    id: 'message-4',
    author: mockMembers[3]!,
    timestamp: 'Today at 10:11 AM',
    content: 'I have it! I’ll post it in here when I get home this afternoon.',
    replyTo: 'Naomi Carter',
    reactions: [{ emoji: '🙏', count: 2 }],
  },
  {
    id: 'message-5',
    author: mockMembers[0]!,
    timestamp: 'Today at 11:26 AM',
    content:
      'Quick reminder: this is our shared space, so feel free to introduce yourself and ask questions. Glad you’re here.',
    reactions: [
      { emoji: '👋', count: 6 },
      { emoji: '❤️', count: 5 },
    ],
  },
];

export const mockAnnouncements: MockAnnouncement[] = [
  {
    id: 'announcement-1',
    title: 'Community gathering this Saturday',
    body: 'Doors open at 5:30 PM and the gathering begins at 6:00 PM. The welcome team can arrive at 5:00 PM.',
    author: 'Maya Brooks',
    date: 'Today at 8:40 AM',
    tag: 'Gathering',
    pinned: true,
  },
  {
    id: 'announcement-2',
    title: 'Volunteer schedule is ready',
    body: 'The schedule for the next two weekends is available. Please check your assigned time and reach out if you need a change.',
    author: 'Daniel Okafor',
    date: 'Yesterday at 4:15 PM',
    tag: 'Volunteers',
  },
  {
    id: 'announcement-3',
    title: 'Monthly community update',
    body: 'Thank you to everyone who helped with last month’s events. A short recap and next steps will be shared this week.',
    author: 'Maya Brooks',
    date: 'August 11 at 10:00 AM',
    tag: 'Update',
  },
];
