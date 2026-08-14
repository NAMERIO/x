import type { AdminMember } from '@x/shared';

import { Avatar } from './Avatar';

interface MemberRowProps {
  member: AdminMember;
  currentUserId?: string;
  detailed?: boolean;
}

export function MemberRow({
  member,
  currentUserId,
  detailed = false,
}: MemberRowProps) {
  const roleNames =
    member.roles.map((role) => role.name).join(', ') || 'Member';
  const avatarColor =
    member.roles.find((role) => role.color)?.color ?? '#557d9f';

  return (
    <div className={`member-row${detailed ? ' is-detailed' : ''}`}>
      <Avatar
        name={member.displayName}
        imageUrl={member.avatarUrl ?? undefined}
        color={avatarColor}
        size={detailed ? 'medium' : 'small'}
        status={member.id === currentUserId ? 'online' : undefined}
      />
      <span className="member-row-copy">
        <strong>{member.displayName}</strong>
        <small>{detailed ? `@${member.username}` : roleNames}</small>
      </span>
      {detailed && <span className="member-role-label">{roleNames}</span>}
    </div>
  );
}
