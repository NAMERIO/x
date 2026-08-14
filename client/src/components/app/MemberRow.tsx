import { Avatar } from './Avatar';
import type { MockMember } from './types';

interface MemberRowProps {
  member: MockMember;
  detailed?: boolean;
}

export function MemberRow({ member, detailed = false }: MemberRowProps) {
  return (
    <div className={`member-row${detailed ? ' is-detailed' : ''}`}>
      <Avatar
        name={member.name}
        color={member.avatarColor}
        size={detailed ? 'medium' : 'small'}
        status={member.presence}
      />
      <span className="member-row-copy">
        <strong>{member.name}</strong>
        <small>{detailed ? member.status : member.role}</small>
      </span>
      {detailed && <span className="member-role-label">{member.role}</span>}
    </div>
  );
}
