import { Icon } from './Icon';
import { MemberRow } from './MemberRow';
import type { MockMember } from './types';

interface MemberPanelProps {
  members: MockMember[];
  open: boolean;
  onClose: () => void;
}

export function MemberPanel({ members, open, onClose }: MemberPanelProps) {
  const activeMembers = members.filter(
    (member) => member.presence !== 'offline',
  );
  const offlineMembers = members.filter(
    (member) => member.presence === 'offline',
  );

  return (
    <aside className={`member-panel${open ? ' is-open' : ''}`}>
      <div className="member-panel-mobile-header">
        <strong>Members</strong>
        <button type="button" aria-label="Close members" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <section>
        <h2>Online — {activeMembers.length}</h2>
        <div className="member-panel-list">
          {activeMembers.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      </section>
      <section>
        <h2>Offline — {offlineMembers.length}</h2>
        <div className="member-panel-list">
          {offlineMembers.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      </section>
    </aside>
  );
}
