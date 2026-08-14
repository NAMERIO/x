import type {
  AdminMember,
  AuthorizationRole,
  Permission,
  PermissionDefinition,
} from '@x/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  createRole,
  deleteRole,
  getAdminMembers,
  getRoles,
  setAdminMemberRoles,
  updateRole,
} from '../../lib/api';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

type AuthorizationView = 'roles' | 'members';

interface AuthorizationSettingsProps {
  view: AuthorizationView;
}

interface RoleDraft {
  name: string;
  description: string;
  color: string | null;
  permissions: Permission[];
}

const categoryLabels: Record<string, string> = {
  APPLICATION: 'Application',
  MODERATION: 'Members and moderation',
  COMMUNICATION: 'Community communication',
  CALLS: 'Calls',
};

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

function draftFromRole(role: AuthorizationRole): RoleDraft {
  return {
    name: role.name,
    description: role.description ?? '',
    color: role.color,
    permissions: [...role.permissions],
  };
}

export function AuthorizationSettings({ view }: AuthorizationSettingsProps) {
  const [roles, setRoles] = useState<AuthorizationRole[]>([]);
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | 'new'>('new');
  const [draft, setDraft] = useState<RoleDraft>({
    name: '',
    description: '',
    color: null,
    permissions: [],
  });
  const [memberDrafts, setMemberDrafts] = useState<Record<string, string[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [roleMembersOpen, setRoleMembersOpen] = useState(false);
  const [roleMemberDraft, setRoleMemberDraft] = useState<string[]>([]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const ownerRole = roles.find((role) => role.name === 'Owner');
  const isOwnerRole = selectedRole?.name === 'Owner';

  const loadData = useCallback(async () => {
    try {
      const roleResponse = await getRoles();
      setRoles(roleResponse.roles);
      setDefinitions(roleResponse.permissions);

      try {
        const memberResponse = await getAdminMembers();
        setMembers(memberResponse.members);
        setMemberDrafts(
          Object.fromEntries(
            memberResponse.members.map((member) => [
              member.id,
              member.roles
                .filter((role) => role.name !== 'Owner')
                .map((role) => role.id),
            ]),
          ),
        );
      } catch (caughtError) {
        if (view === 'members') throw caughtError;
      }

      setSelectedRoleId((current) => {
        if (current === 'new') return current;
        return roleResponse.roles.some((role) => role.id === current)
          ? current
          : (roleResponse.roles[0]?.id ?? 'new');
      });
    } catch (caughtError) {
      setError(messageFromError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    for (const definition of definitions) {
      const group = groups.get(definition.category) ?? [];
      group.push(definition);
      groups.set(definition.category, group);
    }
    return [...groups.entries()];
  }, [definitions]);

  function selectNewRole() {
    setSelectedRoleId('new');
    setDraft({ name: '', description: '', color: null, permissions: [] });
    setError(null);
    setNotice(null);
  }

  function togglePermission(permission: Permission) {
    if (isOwnerRole) return;
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((value) => value !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function saveRole() {
    setSaving('role');
    setError(null);
    setNotice(null);
    try {
      const input = {
        name: draft.name,
        description: draft.description.trim() || null,
        color: draft.color,
        permissions: draft.permissions,
      };
      const savedRole =
        selectedRoleId === 'new'
          ? await createRole(input)
          : await updateRole(selectedRoleId, input);
      const response = await getRoles();
      setRoles(response.roles);
      setDefinitions(response.permissions);
      setSelectedRoleId(savedRole.id);
      setNotice(
        selectedRoleId === 'new' ? 'Role created.' : 'Role changes saved.',
      );
    } catch (caughtError) {
      setError(messageFromError(caughtError));
    } finally {
      setSaving(null);
    }
  }

  async function removeSelectedRole() {
    if (!selectedRole || selectedRole.isSystem) return;
    if (!window.confirm(`Delete the ${selectedRole.name} role?`)) return;

    setSaving('role');
    setError(null);
    setNotice(null);
    try {
      await deleteRole(selectedRole.id);
      await loadData();
      selectNewRole();
      setNotice('Role deleted.');
    } catch (caughtError) {
      setError(messageFromError(caughtError));
    } finally {
      setSaving(null);
    }
  }

  function toggleMemberRole(memberId: string, roleId: string) {
    setMemberDrafts((current) => {
      const assigned = current[memberId] ?? [];
      return {
        ...current,
        [memberId]: assigned.includes(roleId)
          ? assigned.filter((id) => id !== roleId)
          : [...assigned, roleId],
      };
    });
  }

  function resetMemberDraft(member: AdminMember) {
    setMemberDrafts((current) => ({
      ...current,
      [member.id]: member.roles
        .filter((role) => role.name !== 'Owner')
        .map((role) => role.id),
    }));
  }

  function openMemberRoleMenu(member: AdminMember) {
    resetMemberDraft(member);
    setOpenMemberId(member.id);
  }

  function closeMemberRoleMenu(member: AdminMember) {
    resetMemberDraft(member);
    setOpenMemberId(null);
  }

  async function saveMember(member: AdminMember) {
    setSaving(member.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await setAdminMemberRoles(member.id, {
        roleIds: memberDrafts[member.id] ?? [],
      });
      setMembers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMemberDrafts((current) => ({
        ...current,
        [updated.id]: updated.roles
          .filter((role) => role.name !== 'Owner')
          .map((role) => role.id),
      }));
      setNotice(`Roles updated for ${member.displayName}.`);
      setOpenMemberId(null);
    } catch (caughtError) {
      await loadData();
      setError(messageFromError(caughtError));
    } finally {
      setSaving(null);
    }
  }

  function openRoleMembers() {
    if (!selectedRole || selectedRole.name === 'Owner') return;
    setRoleMemberDraft(
      members
        .filter((member) =>
          member.roles.some((role) => role.id === selectedRole.id),
        )
        .map((member) => member.id),
    );
    setRoleMembersOpen(true);
    setError(null);
    setNotice(null);
  }

  function toggleRoleMember(memberId: string) {
    setRoleMemberDraft((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  async function saveRoleMembers() {
    if (!selectedRole || selectedRole.name === 'Owner') return;
    setSaving('role-members');
    setError(null);
    setNotice(null);

    try {
      const updatedMembers = [...members];
      for (const member of members) {
        const currentlyAssigned = member.roles.some(
          (role) => role.id === selectedRole.id,
        );
        const shouldBeAssigned = roleMemberDraft.includes(member.id);
        if (currentlyAssigned === shouldBeAssigned) continue;

        const currentRoleIds = member.roles
          .filter((role) => role.name !== 'Owner')
          .map((role) => role.id);
        const roleIds = shouldBeAssigned
          ? [...new Set([...currentRoleIds, selectedRole.id])]
          : currentRoleIds.filter((roleId) => roleId !== selectedRole.id);
        const updated = await setAdminMemberRoles(member.id, { roleIds });
        const index = updatedMembers.findIndex(
          (item) => item.id === updated.id,
        );
        if (index >= 0) updatedMembers[index] = updated;
      }

      setMembers(updatedMembers);
      setMemberDrafts(
        Object.fromEntries(
          updatedMembers.map((member) => [
            member.id,
            member.roles
              .filter((role) => role.name !== 'Owner')
              .map((role) => role.id),
          ]),
        ),
      );
      const response = await getRoles();
      setRoles(response.roles);
      setRoleMembersOpen(false);
      setNotice(`Members updated for ${selectedRole.name}.`);
    } catch (caughtError) {
      await loadData();
      setError(messageFromError(caughtError));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="authorization-state">Loading access settings…</div>;
  }

  if (error && roles.length === 0) {
    return (
      <div className="authorization-state authorization-state-error">
        <Icon name="shield" size={22} />
        <strong>Access unavailable</strong>
        <span>{error}</span>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadData();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (view === 'members') {
    const assignableRoles = roles.filter((role) => role.name !== 'Owner');
    return (
      <div className="authorization-page">
        <p className="section-kicker">Administration</p>
        <div className="authorization-heading">
          <div>
            <h2>Member management</h2>
            <p>Review members and control their assigned roles.</p>
          </div>
          <span>{members.length} members</span>
        </div>
        {(error || notice) && (
          <p
            className={
              error ? 'authorization-alert is-error' : 'authorization-alert'
            }
          >
            {error ?? notice}
          </p>
        )}
        <div className="admin-member-list">
          {members.map((member) => {
            const assignedIds = memberDrafts[member.id] ?? [];
            return (
              <article
                className={`admin-member-row${openMemberId === member.id ? ' has-role-menu' : ''}`}
                key={member.id}
                onClick={() => openMemberRoleMenu(member)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMemberRoleMenu(member);
                }}
              >
                <div className="admin-member-identity">
                  <Avatar
                    name={member.displayName}
                    imageUrl={member.avatarUrl ?? undefined}
                    color="#557d9f"
                    size="medium"
                  />
                  <span>
                    <strong>{member.displayName}</strong>
                    <small>@{member.username}</small>
                  </span>
                  {member.isOwner && <em>Owner</em>}
                </div>
                <div className="member-role-summary">
                  {member.isOwner && ownerRole && (
                    <span className="role-option is-locked">
                      <i
                        style={{
                          backgroundColor: ownerRole.color ?? '#557d9f',
                        }}
                      />
                      Owner <Icon name="shield" size={13} />
                    </span>
                  )}
                  {assignableRoles
                    .filter((role) => assignedIds.includes(role.id))
                    .map((role) => (
                      <span className="role-option" key={role.id}>
                        <i
                          style={{ backgroundColor: role.color ?? '#879198' }}
                        />
                        {role.name}
                      </span>
                    ))}
                  {assignedIds.length === 0 && !member.isOwner && (
                    <small>No roles assigned</small>
                  )}
                </div>
                <button
                  className="authorization-secondary-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (openMemberId === member.id) {
                      closeMemberRoleMenu(member);
                    } else {
                      openMemberRoleMenu(member);
                    }
                  }}
                >
                  Manage roles
                </button>
                {openMemberId === member.id && (
                  <div
                    className="member-role-menu"
                    role="dialog"
                    aria-label={`Roles for ${member.displayName}`}
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <header>
                      <span>
                        <strong>Roles</strong>
                        <small>{member.displayName}</small>
                      </span>
                      <button
                        type="button"
                        aria-label="Close role menu"
                        onClick={() => closeMemberRoleMenu(member)}
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </header>
                    <div className="member-role-menu-list">
                      {member.isOwner && ownerRole && (
                        <label className="is-locked">
                          <input type="checkbox" checked disabled />
                          <i
                            style={{
                              backgroundColor: ownerRole.color ?? '#557d9f',
                            }}
                          />
                          <span>
                            <strong>Owner</strong>
                            <small>Permanent ownership</small>
                          </span>
                        </label>
                      )}
                      {assignableRoles.map((role) => (
                        <label key={role.id}>
                          <input
                            type="checkbox"
                            checked={assignedIds.includes(role.id)}
                            onChange={() =>
                              toggleMemberRole(member.id, role.id)
                            }
                          />
                          <i
                            style={{
                              backgroundColor: role.color ?? '#879198',
                            }}
                          />
                          <span>
                            <strong>{role.name}</strong>
                            <small>
                              {role.description ?? 'Community role'}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <footer>
                      <button
                        type="button"
                        onClick={() => closeMemberRoleMenu(member)}
                      >
                        Cancel
                      </button>
                      <button
                        className="is-primary"
                        type="button"
                        disabled={saving === member.id}
                        onClick={() => void saveMember(member)}
                      >
                        {saving === member.id ? 'Saving…' : 'Save roles'}
                      </button>
                    </footer>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="authorization-page">
      <p className="section-kicker">Administration</p>
      <div className="authorization-heading">
        <div>
          <h2>Roles & permissions</h2>
          <p>Create roles and decide what each role can do.</p>
        </div>
        <button
          className="compact-primary-button"
          type="button"
          onClick={selectNewRole}
        >
          <Icon name="plus" size={15} /> New role
        </button>
      </div>
      {(error || notice) && (
        <p
          className={
            error ? 'authorization-alert is-error' : 'authorization-alert'
          }
        >
          {error ?? notice}
        </p>
      )}
      <div className="role-management-layout">
        <aside className="role-list" aria-label="Roles">
          {roles.map((role) => (
            <button
              className={selectedRoleId === role.id ? 'is-selected' : ''}
              type="button"
              key={role.id}
              onClick={() => {
                setSelectedRoleId(role.id);
                setDraft(draftFromRole(role));
                setError(null);
                setNotice(null);
              }}
            >
              <i style={{ backgroundColor: role.color ?? '#879198' }} />
              <span>
                <strong>{role.name}</strong>
                <small>{role.memberCount} members</small>
              </span>
              {role.isSystem && <Icon name="shield" size={14} />}
            </button>
          ))}
        </aside>
        <div className="role-editor">
          <div className="role-fields">
            <label>
              Role name
              <input
                value={draft.name}
                maxLength={64}
                disabled={Boolean(selectedRole?.isSystem)}
                placeholder="Role name"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="role-color-field">
              Role color <small>Optional</small>
              <span>
                <input
                  type="color"
                  value={draft.color ?? '#557d9f'}
                  disabled={isOwnerRole}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  disabled={!draft.color || isOwnerRole}
                  onClick={() =>
                    setDraft((current) => ({ ...current, color: null }))
                  }
                >
                  Clear
                </button>
              </span>
            </label>
            <label className="role-description-field">
              Description <small>Optional</small>
              <textarea
                value={draft.description}
                maxLength={500}
                disabled={isOwnerRole}
                placeholder="What is this role for?"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          {isOwnerRole && (
            <p className="owner-role-note">
              <Icon name="shield" size={16} /> The Owner always has every
              permission. Ownership cannot be edited or removed here.
            </p>
          )}
          {selectedRole && !isOwnerRole && (
            <div className="role-member-access">
              <span>
                <strong>Role members</strong>
                <small>
                  {selectedRole.memberCount} members currently have this role.
                </small>
              </span>
              <button type="button" onClick={openRoleMembers}>
                <Icon name="members" size={15} /> Manage members
              </button>
            </div>
          )}
          <div className="permission-groups">
            {permissionGroups.map(([category, categoryPermissions]) => (
              <section key={category}>
                <h3>{categoryLabels[category] ?? category}</h3>
                {categoryPermissions.map((permission) => (
                  <label className="permission-row" key={permission.identifier}>
                    <span>
                      <strong>{permission.label}</strong>
                      <small>{permission.description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.permissions.includes(
                        permission.identifier,
                      )}
                      disabled={isOwnerRole}
                      onChange={() => togglePermission(permission.identifier)}
                    />
                  </label>
                ))}
              </section>
            ))}
          </div>
          <div className="role-editor-actions">
            {selectedRole && !selectedRole.isSystem && (
              <button
                className="authorization-danger-button"
                type="button"
                disabled={saving === 'role'}
                onClick={() => void removeSelectedRole()}
              >
                Delete role
              </button>
            )}
            <button
              className="compact-primary-button"
              type="button"
              disabled={
                saving === 'role' || isOwnerRole || draft.name.trim().length < 2
              }
              onClick={() => void saveRole()}
            >
              {saving === 'role'
                ? 'Saving…'
                : selectedRoleId === 'new'
                  ? 'Create role'
                  : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
      {roleMembersOpen && selectedRole && (
        <div
          className="role-members-backdrop"
          onMouseDown={() => setRoleMembersOpen(false)}
        >
          <section
            className="role-members-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-members-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <span>
                <small>Assign role</small>
                <strong id="role-members-title">{selectedRole.name}</strong>
              </span>
              <button
                type="button"
                aria-label="Close member assignment"
                onClick={() => setRoleMembersOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <p>
              Choose the members who should have this role. Their other roles
              will stay unchanged.
            </p>
            <div className="role-members-list">
              {members.map((member) => (
                <label key={member.id}>
                  <Avatar
                    name={member.displayName}
                    imageUrl={member.avatarUrl ?? undefined}
                    color="#557d9f"
                    size="small"
                  />
                  <span>
                    <strong>{member.displayName}</strong>
                    <small>@{member.username}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={roleMemberDraft.includes(member.id)}
                    onChange={() => toggleRoleMember(member.id)}
                  />
                </label>
              ))}
              {members.length === 0 && (
                <span className="role-members-empty">
                  Member management access is required to assign this role.
                </span>
              )}
            </div>
            <footer>
              <button type="button" onClick={() => setRoleMembersOpen(false)}>
                Cancel
              </button>
              <button
                className="is-primary"
                type="button"
                disabled={saving === 'role-members' || members.length === 0}
                onClick={() => void saveRoleMembers()}
              >
                {saving === 'role-members' ? 'Saving…' : 'Save assignments'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
