export const PERMISSIONS = {
  MANAGE_APP: 'MANAGE_APP',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_MESSAGES: 'MANAGE_MESSAGES',
  MANAGE_ANNOUNCEMENTS: 'MANAGE_ANNOUNCEMENTS',
  MANAGE_CALLS: 'MANAGE_CALLS',
  CHANGE_BRANDING: 'CHANGE_BRANDING',
  SEND_MESSAGES: 'SEND_MESSAGES',
  MENTION_EVERYONE: 'MENTION_EVERYONE',
  JOIN_CALLS: 'JOIN_CALLS',
  START_CALLS: 'START_CALLS',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_VALUES = Object.values(PERMISSIONS) as [
  Permission,
  ...Permission[],
];

export const PERMISSION_CATEGORIES = {
  APPLICATION: 'APPLICATION',
  MODERATION: 'MODERATION',
  COMMUNICATION: 'COMMUNICATION',
  CALLS: 'CALLS',
} as const;

export type PermissionCategory =
  (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES];

export const PERMISSION_DEFINITIONS = [
  {
    identifier: PERMISSIONS.MANAGE_APP,
    category: PERMISSION_CATEGORIES.APPLICATION,
    label: 'Manage application',
    description: 'Manage application-wide administrative settings.',
  },
  {
    identifier: PERMISSIONS.CHANGE_BRANDING,
    category: PERMISSION_CATEGORIES.APPLICATION,
    label: 'Change branding',
    description: 'Change the application name, logo, and branding.',
  },
  {
    identifier: PERMISSIONS.MANAGE_MEMBERS,
    category: PERMISSION_CATEGORIES.MODERATION,
    label: 'Manage members',
    description: 'Manage community members and their role assignments.',
  },
  {
    identifier: PERMISSIONS.MANAGE_ROLES,
    category: PERMISSION_CATEGORIES.MODERATION,
    label: 'Manage roles',
    description: 'Create, edit, delete, and configure roles.',
  },
  {
    identifier: PERMISSIONS.MANAGE_MESSAGES,
    category: PERMISSION_CATEGORIES.MODERATION,
    label: 'Manage messages',
    description: 'Moderate messages created by community members.',
  },
  {
    identifier: PERMISSIONS.MANAGE_ANNOUNCEMENTS,
    category: PERMISSION_CATEGORIES.COMMUNICATION,
    label: 'Manage announcements',
    description: 'Create, edit, and remove announcements.',
  },
  {
    identifier: PERMISSIONS.SEND_MESSAGES,
    category: PERMISSION_CATEGORIES.COMMUNICATION,
    label: 'Send messages',
    description: 'Send messages in community conversations.',
  },
  {
    identifier: PERMISSIONS.MENTION_EVERYONE,
    category: PERMISSION_CATEGORIES.COMMUNICATION,
    label: 'Mention everyone',
    description: 'Notify every member in a conversation.',
  },
  {
    identifier: PERMISSIONS.MANAGE_CALLS,
    category: PERMISSION_CATEGORIES.CALLS,
    label: 'Manage calls',
    description: 'Moderate and manage community calls.',
  },
  {
    identifier: PERMISSIONS.JOIN_CALLS,
    category: PERMISSION_CATEGORIES.CALLS,
    label: 'Join calls',
    description: 'Join community voice and video calls.',
  },
  {
    identifier: PERMISSIONS.START_CALLS,
    category: PERMISSION_CATEGORIES.CALLS,
    label: 'Start calls',
    description: 'Start new community voice and video calls.',
  },
] as const satisfies readonly {
  identifier: Permission;
  category: PermissionCategory;
  label: string;
  description: string;
}[];
