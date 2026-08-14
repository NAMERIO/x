import type { MockAnnouncement } from './types';

export const mockAnnouncements: MockAnnouncement[] = [
  {
    id: 'announcement-1',
    title: 'Community gathering this Saturday',
    body: 'Doors open at 5:30 PM and the gathering begins at 6:00 PM. The welcome team can arrive at 5:00 PM.',
    author: 'Community team',
    date: 'Today at 8:40 AM',
    tag: 'Gathering',
    pinned: true,
  },
  {
    id: 'announcement-2',
    title: 'Volunteer schedule is ready',
    body: 'The schedule for the next two weekends is available. Please check your assigned time and reach out if you need a change.',
    author: 'Community team',
    date: 'Yesterday at 4:15 PM',
    tag: 'Volunteers',
  },
  {
    id: 'announcement-3',
    title: 'Monthly community update',
    body: 'Thank you to everyone who helped with last month’s events. A short recap and next steps will be shared this week.',
    author: 'Community team',
    date: 'August 11 at 10:00 AM',
    tag: 'Update',
  },
];
