import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { updateMe } from '../../api/auth';
import {
  createRoleRequest,
  getProfile,
  listMyRoleRequests,
  updateRole,
  type ProfileView,
} from '../../api/profiles';
import type {
  ElevatedRole,
  Gender,
  PlayerPosition,
  ProfileFieldset,
  Role,
  RoleRequest,
} from '../../api/types';
import { PLAYER_POSITIONS } from '../../api/types';

const ROLE_FIELDS: Record<
  Exclude<Role, 'player'>,
  { key: keyof ProfileFieldset; label: string; type?: 'text' | 'select'; options?: string[] }[]
> = {
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

const ELEVATED: ElevatedRole[] = ['coach', 'organizer'];

const EMPTY: ProfileView = { roles: [], player: null, coach: null, organizer: null };

const EIGHTEEN_YEARS_AGO = new Date();
EIGHTEEN_YEARS_AGO.setFullYear(EIGHTEEN_YEARS_AGO.getFullYear() - 18);
const MAX_BIRTH_DATE = EIGHTEEN_YEARS_AGO.toISOString().slice(0, 10);

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const cardClass = 'rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft';
const primaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy transition hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60';

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProfileSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading profile">
      <div className="skeleton-shimmer h-6 w-32 rounded" />
      <div className="skeleton-shimmer h-28 w-full rounded-[var(--radius-card)]" />
      <div className="skeleton-shimmer h-32 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: { key: keyof ProfileFieldset; label: string; type?: 'text' | 'select'; options?: string[] };
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

type AccountForm = {
  name: string;
  email: string;
  birth_date: string;
  gender: Gender | '';
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const nameId = useId();
  const emailId = useId();
  const birthId = useId();
  const genderId = useId();
  const [profile, setProfile] = useState<ProfileView>(EMPTY);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Partial<Record<Role, ProfileFieldset>>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<Role | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [requesting, setRequesting] = useState<ElevatedRole | null>(null);
  const [account, setAccount] = useState<AccountForm>({
    name: '',
    email: '',
    birth_date: '',
    gender: '',
  });

  useEffect(() => {
    if (!user) return;
    setAccount((prev) => {
      if (
        prev.name === user.name &&
        prev.email === user.email &&
        prev.birth_date === user.birth_date &&
        prev.gender === user.gender
      ) {
        return prev;
      }
      return {
        name: user.name,
        email: user.email,
        birth_date: user.birth_date,
        gender: user.gender,
      };
    });
  }, [user]);

  const load = async () => {
    try {
      const [data, reqs] = await Promise.all([getProfile(), listMyRoleRequests()]);
      setProfile(data);
      setRequests(reqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const accountValid =
    account.name.trim() !== '' &&
    account.email.includes('@') &&
    account.birth_date !== '' &&
    account.birth_date <= MAX_BIRTH_DATE &&
    account.gender !== '';

  const saveAccount = async () => {
    if (!accountValid || account.gender === '') return;
    setError(null);
    setSavingAccount(true);
    try {
      const { user: next } = await updateMe({
        name: account.name.trim(),
        email: account.email.trim(),
        birth_date: account.birth_date,
        gender: account.gender,
      });
      updateUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account.');
    } finally {
      setSavingAccount(false);
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

  const requestRole = async (role: ElevatedRole) => {
    setError(null);
    setRequesting(role);
    try {
      const created = await createRoleRequest({ role });
      setRequests((rs) => [...rs, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request role.');
    } finally {
      setRequesting(null);
    }
  };

  const latestFor = (role: ElevatedRole): RoleRequest | undefined => {
    const mine = requests.filter((r) => r.role === role);
    return mine.sort((a, b) => b.id - a.id)[0];
  };

  const currentFields = (role: Role): ProfileFieldset =>
    ({
      player: profile.player,
      coach: profile.coach,
      organizer: profile.organizer,
    })[role] ?? {};

  const playerPositions = (): PlayerPosition[] => {
    const fromEdit = edits.player?.positions;
    if (fromEdit) return fromEdit;
    const raw = profile.player?.positions;
    if (raw && raw.length > 0) return raw;
    const legacy = profile.player?.position;
    if (legacy) return [legacy as PlayerPosition];
    return [];
  };

  const togglePosition = (pos: PlayerPosition) => {
    const current = playerPositions();
    const next = current.includes(pos) ? current.filter((p) => p !== pos) : [...current, pos];
    setEdits((ed) => ({
      ...ed,
      player: { ...ed.player, positions: next },
    }));
  };

  const savePlayer = async () => {
    setError(null);
    setSavingRole('player');
    try {
      const positions = playerPositions();
      const skill =
        (edits.player?.skill_level as string | undefined) ??
        profile.player?.skill_level ??
        undefined;
      await updateRole('player', {
        positions,
        ...(skill ? { skill_level: skill as ProfileFieldset['skill_level'] } : {}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingRole(null);
    }
  };

  const renderPlayerCard = () => {
    const skillValue =
      ((edits.player?.skill_level as string | undefined) ?? profile.player?.skill_level ?? '') ||
      '';
    return (
      <section className={cardClass}>
        <h2 className="font-display text-base font-bold capitalize text-navy">
          <span aria-hidden className="mr-1.5">
            {ROLE_META.player.emoji}
          </span>
          player details
        </h2>
        <fieldset className="mt-3">
          <legend className={labelClass}>Positions</legend>
          <p className="mt-1 text-xs text-muted">Select all that apply.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="group" aria-label="Positions">
            {PLAYER_POSITIONS.map((p) => {
              const id = `player-pos-${p.value}`;
              const checked = playerPositions().includes(p.value);
              return (
                <label
                  key={p.value}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy"
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-cobalt focus:ring-cobalt/30"
                    checked={checked}
                    onChange={() => togglePosition(p.value)}
                  />
                  <span>{p.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-3">
          <FieldControl
            field={{
              key: 'skill_level',
              label: 'Skill level',
              type: 'select',
              options: ['beginner', 'intermediate', 'advanced'],
            }}
            idPrefix="edit-player"
            value={skillValue}
            onChange={(next) =>
              setEdits((ed) => ({
                ...ed,
                player: { ...ed.player, skill_level: next as ProfileFieldset['skill_level'] },
              }))
            }
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void savePlayer()}
            disabled={savingRole === 'player'}
            className={primaryBtn}
          >
            {savingRole === 'player' ? 'Saving…' : 'Save player'}
          </button>
        </div>
      </section>
    );
  };

  const renderElevatedRoleCard = (role: Exclude<Role, 'player'>) => (
    <section key={role} className={cardClass}>
      <h2 className="font-display text-base font-bold capitalize text-navy">
        <span aria-hidden className="mr-1.5">
          {ROLE_META[role].emoji}
        </span>
        {role} details
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
      </div>
      <div className="mt-3">
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
  );

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          Profile
        </h1>
        <p className="mt-0.5 text-sm text-muted">Your account and player details.</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Your roles">
          {loading ? null : profile.roles.length === 0 ? (
            <span className="text-sm text-muted">No roles yet.</span>
          ) : (
            profile.roles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full bg-sky-tint px-2 py-0.5 text-xs font-semibold text-chip-text"
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
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
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
              <h2 className="font-display text-base font-bold text-navy">Account</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label htmlFor={nameId} className="block sm:col-span-2">
                  <span className={labelClass}>Name</span>
                  <input
                    id={nameId}
                    className={fieldClass}
                    value={account.name}
                    onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
                  />
                </label>
                <label htmlFor={emailId} className="block sm:col-span-2">
                  <span className={labelClass}>Email</span>
                  <input
                    id={emailId}
                    type="email"
                    className={fieldClass}
                    value={account.email}
                    onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
                  />
                </label>
                <label htmlFor={birthId} className="block">
                  <span className={labelClass}>Birth date</span>
                  <input
                    id={birthId}
                    type="date"
                    max={MAX_BIRTH_DATE}
                    className={fieldClass}
                    value={account.birth_date}
                    onChange={(e) => setAccount((a) => ({ ...a, birth_date: e.target.value }))}
                  />
                </label>
                <label htmlFor={genderId} className="block">
                  <span className={labelClass}>Gender</span>
                  <select
                    id={genderId}
                    className={fieldClass}
                    value={account.gender}
                    onChange={(e) =>
                      setAccount((a) => ({ ...a, gender: e.target.value as Gender | '' }))
                    }
                  >
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void saveAccount()}
                  disabled={savingAccount || !accountValid}
                  className={primaryBtn}
                >
                  {savingAccount ? 'Saving…' : 'Save account'}
                </button>
              </div>
            </section>
          ) : null}

          {renderPlayerCard()}

          <section className={cardClass} aria-label="Elevated roles">
            <h2 className="font-display text-base font-bold text-navy">Elevated access</h2>
            <p className="mt-1 text-sm text-muted">
              Coach and organizer require admin approval.
            </p>
            <ul className="mt-3 space-y-3">
              {ELEVATED.map((role) => {
                if (profile.roles.includes(role)) {
                  return (
                    <li key={role} className="text-sm text-muted">
                      {ROLE_META[role].emoji} {ROLE_META[role].label} granted — edit below.
                    </li>
                  );
                }
                const latest = latestFor(role);
                if (latest?.status === 'pending') {
                  return (
                    <li
                      key={role}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-ice px-3 py-2"
                    >
                      <span className="text-sm font-medium text-navy">
                        {ROLE_META[role].emoji} {ROLE_META[role].label}
                      </span>
                      <span className="rounded-full bg-sky-tint px-2 py-0.5 text-xs font-semibold text-chip-text">
                        Pending
                      </span>
                    </li>
                  );
                }
                if (latest?.status === 'rejected') {
                  return (
                    <li
                      key={role}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy">
                          {ROLE_META[role].emoji} {ROLE_META[role].label}
                        </p>
                        <p className="text-xs text-muted">Request was rejected.</p>
                      </div>
                      <button
                        type="button"
                        className={secondaryBtn}
                        disabled={requesting === role}
                        onClick={() => void requestRole(role)}
                      >
                        {requesting === role ? 'Requesting…' : 'Request again'}
                      </button>
                    </li>
                  );
                }
                return (
                  <li
                    key={role}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-navy">
                      {ROLE_META[role].emoji} {ROLE_META[role].label}
                    </span>
                    <button
                      type="button"
                      className={primaryBtn}
                      disabled={requesting === role}
                      onClick={() => void requestRole(role)}
                    >
                      {requesting === role
                        ? 'Requesting…'
                        : role === 'coach'
                          ? 'Request coach'
                          : 'Request organizer'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {ELEVATED.filter((r) => profile.roles.includes(r)).map((role) =>
            renderElevatedRoleCard(role),
          )}
        </>
      )}
    </div>
  );
}
