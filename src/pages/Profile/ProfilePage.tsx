import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { addRole, getProfile, updateRole, type ProfileView } from '../../api/profiles';
import type { ProfileFieldset, Role } from '../../api/types';

const ROLE_FIELDS: Record<
  Role,
  { key: keyof ProfileFieldset; label: string; type?: 'text' | 'select'; options?: string[] }[]
> = {
  player: [
    { key: 'position', label: 'Position' },
    {
      key: 'skill_level',
      label: 'Skill level',
      type: 'select',
      options: ['beginner', 'intermediate', 'advanced'],
    },
  ],
  coach: [
    { key: 'achievements', label: 'Achievements' },
    { key: 'bootcamp_name', label: 'Bootcamp name' },
  ],
  organizer: [{ key: 'managed_courts', label: 'Managed courts' }],
};

const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  player: { label: 'Player', emoji: '🏐' },
  coach: { label: 'Coach', emoji: '📋' },
  organizer: { label: 'Organizer', emoji: '🏟️' },
};

const ALL_ROLES: Role[] = ['player', 'coach', 'organizer'];

const EMPTY: ProfileView = { roles: [], player: null, coach: null, organizer: null };

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const cardClass =
  'rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft sm:p-5';
const primaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
      <div className="skeleton-shimmer h-8 w-40 rounded" />
      <div className="skeleton-shimmer h-24 w-full rounded-[var(--radius-card)]" />
      <div className="skeleton-shimmer h-40 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: (typeof ROLE_FIELDS)[Role][number];
  value: string;
  onChange: (next: string) => void;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{field.label}</span>
      {field.type === 'select' ? (
        <select
          id={id}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {titleCase(o)}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const addRoleSelectId = useId();
  const [profile, setProfile] = useState<ProfileView>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState<Role>('player');
  const [newFields, setNewFields] = useState<ProfileFieldset>({});
  const [edits, setEdits] = useState<Partial<Record<Role, ProfileFieldset>>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<Role | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const availableRoles = ALL_ROLES.filter((r) => !profile.roles.includes(r));
  const addRoleValue = availableRoles.includes(newRole) ? newRole : (availableRoles[0] ?? 'player');

  const add = async (role: Role = addRoleValue) => {
    setError(null);
    setAdding(true);
    try {
      await addRole(role, newFields);
      setNewFields({});
      setNewRole(role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add role.');
    } finally {
      setAdding(false);
    }
  };

  const save = async (role: Role) => {
    setError(null);
    setSavingRole(role);
    try {
      await updateRole(role, edits[role] ?? {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingRole(null);
    }
  };

  const currentFields = (role: Role): ProfileFieldset =>
    ({
      player: profile.player,
      coach: profile.coach,
      organizer: profile.organizer,
    })[role] ?? {};

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium tracking-wider text-muted">🏐 YOUR COURT ID</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage how you show up as a player, coach, or organizer.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Your roles">
          {loading ? null : profile.roles.length === 0 ? (
            <span className="text-sm text-muted">No roles yet.</span>
          ) : (
            profile.roles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-tint px-2.5 py-1 text-xs font-semibold text-chip-text"
              >
                <span aria-hidden>{ROLE_META[r].emoji}</span>
                {ROLE_META[r].label}
              </span>
            ))
          )}
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          {user ? (
            <section className={cardClass} aria-label="Account">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cobalt font-display text-sm font-bold text-white"
                  aria-hidden
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-navy">{user.name}</p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
              </div>
            </section>
          ) : null}

          {availableRoles.length > 0 ? (
            <section className={`${cardClass} border-dashed`}>
              <h2 className="font-display text-lg font-bold text-navy">Add a role</h2>
              <p className="mt-1 text-sm text-muted">
                Pick how you participate, then fill in the details.
              </p>
              <div className="mt-4 space-y-3">
                <label htmlFor={addRoleSelectId} className="block">
                  <span className={labelClass}>Role</span>
                  <select
                    id={addRoleSelectId}
                    aria-label="Add role"
                    className={fieldClass}
                    value={addRoleValue}
                    onChange={(e) => {
                      setNewRole(e.target.value as Role);
                      setNewFields({});
                    }}
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].emoji} {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                </label>
                {ROLE_FIELDS[addRoleValue].map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    idPrefix={`add-${addRoleValue}`}
                    value={(newFields[field.key] as string) ?? ''}
                    onChange={(next) => setNewFields((f) => ({ ...f, [field.key]: next }))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => void add(addRoleValue)}
                  disabled={adding}
                  className={primaryBtn}
                >
                  {adding ? 'Adding…' : 'Add role'}
                </button>
              </div>
            </section>
          ) : null}

          {profile.roles.map((role) => (
            <section key={role} className={cardClass}>
              <h2 className="font-display text-lg font-bold capitalize text-navy">
                <span aria-hidden className="mr-1.5">
                  {ROLE_META[role].emoji}
                </span>
                {role} details
              </h2>
              <div className="mt-4 space-y-3">
                {ROLE_FIELDS[role].map((field) => {
                  const value = (edits[role]?.[field.key] ?? currentFields(role)[field.key]) as
                    | string
                    | undefined;
                  return (
                    <FieldControl
                      key={field.key}
                      field={field}
                      idPrefix={`edit-${role}`}
                      value={value ?? ''}
                      onChange={(next) =>
                        setEdits((ed) => ({
                          ...ed,
                          [role]: { ...ed[role], [field.key]: next },
                        }))
                      }
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => void save(role)}
                  disabled={savingRole === role}
                  className={primaryBtn}
                >
                  {savingRole === role ? 'Saving…' : `Save ${role}`}
                </button>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
