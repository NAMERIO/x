import type { SVGProps } from 'react';

export type IconName =
  | 'announcement'
  | 'at'
  | 'bell'
  | 'calendar'
  | 'call'
  | 'chat'
  | 'check'
  | 'chevron'
  | 'close'
  | 'emoji'
  | 'gift'
  | 'hash'
  | 'headphones'
  | 'help'
  | 'inbox'
  | 'info'
  | 'members'
  | 'menu'
  | 'microphone'
  | 'more'
  | 'paperclip'
  | 'pin'
  | 'plus'
  | 'reply'
  | 'search'
  | 'send'
  | 'settings'
  | 'shield'
  | 'sidebar'
  | 'video';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, React.ReactNode> = {
  announcement: (
    <>
      <path d="M4 13h3l9 4V5L7 9H4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2Z" />
      <path d="m7 13 1.5 6h3L10 14" />
      <path d="M19 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  at: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8v5a2 2 0 0 0 4 0v-1a8 8 0 1 0-3 6" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  call: (
    <path d="M7.5 3.5 11 2.7l2 4.7-2.2 1.8a18 18 0 0 0 4 4l1.8-2.2 4.7 2-.8 3.5a3.5 3.5 0 0 1-3.4 2.8A12.4 12.4 0 0 1 4.7 6.9a3.5 3.5 0 0 1 2.8-3.4Z" />
  ),
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-.8L3 21l1.6-4.3A8.2 8.2 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.5 8.4 8.4 0 0 1 9 8.5Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  emoji: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M12 9v12M3 13h18M7.5 9C5 9 4 7.8 4 6.5S5 4 6.5 4C9 4 12 9 12 9M16.5 9C19 9 20 7.8 20 6.5S19 4 17.5 4C15 4 12 9 12 9" />
    </>
  ),
  hash: <path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16" />,
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14a2 2 0 0 1 2-2h2v8H6a2 2 0 0 1-2-2v-4ZM20 14a2 2 0 0 0-2-2h-2v8h2a2 2 0 0 0 2-2v-4Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-1 .6-1.5 1-1.5 2M12 17h.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 5h16l2 10v4H2v-4L4 5Z" />
      <path d="M2 15h5l2 2h6l2-2h5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4.5a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 5.7V21" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  microphone: (
    <>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4M9 22h6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  paperclip: (
    <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6" />
  ),
  pin: (
    <>
      <path d="m14 4 6 6-3 1-4 4-1 5-2-2-2-2 5-1 4-4 1-3-6-6-1 3Z" />
      <path d="m9 15-5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  reply: <path d="m9 17-5-5 5-5v3h3c5 0 8 2.5 8 7-1.8-2.3-4-3-8-3H9v3Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  send: <path d="m3 3 18 9-18 9 3-9-3-9Zm3 9h15" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: (
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-4" />
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
    </>
  ),
};

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
