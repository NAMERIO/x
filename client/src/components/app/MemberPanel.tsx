import type { AdminMember } from '@x/shared';

import { Icon } from './Icon';
import { MemberRow } from './MemberRow';

interface MemberPanelProps {
  members: AdminMember[];
  onlineUserIds: readonly string[];
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
}

export function MemberPanel({
  members,
  onlineUserIds,
  loading,
  error,
  open,
  onClose,
}: MemberPanelProps) {
  return (
    <aside className={`member-panel${open ? ' is-open' : ''}`}>
      <div className="member-panel-mobile-header">
        <strong>Members</strong>
        <button type="button" aria-label="Close members" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <section>
        <h2>Community — {members.length}</h2>
        <div className="member-panel-list">
          {loading && <p className="member-panel-state">Loading members…</p>}
          {!loading && error && (
            <p className="member-panel-state is-error">{error}</p>
          )}
          {!loading && !error && members.length === 0 && (
            <p className="member-panel-state">No members yet.</p>
          )}
          {[...members]
            .sort(
              (left, right) =>
                Number(onlineUserIds.includes(right.id)) -
                Number(onlineUserIds.includes(left.id)),
            )
            .map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                online={onlineUserIds.includes(member.id)}
              />
            ))}
        </div>
      </section>
    </aside>
  );
}
