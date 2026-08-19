import { isAxiosError } from 'axios';
import { useEffect, useId, useState } from 'react';
import {
  createAdminUser,
  getAdminUser,
  updateAdminUser,
} from '../../api/admin';
import type {
  AdminUserWritePayload,
  Gender,
  PlayerPosition,
  ProfileFieldset,
  Role,
  SkillLevel,
} from '../../api/types';
import { PLAYER_POSITIONS } from '../../api/types';
import PasswordField from '../../components/PasswordField';
import { showToast } from '../../lib/adminNotifications';
import { passwordMeetsRules } from '../../lib/passwordRules';

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'player', label: 'Player' },
  { value: 'coach', label: 'Coach' },
  { value: 'organizer', label: 'Organizer' },
];

const EIGHTEEN_YEARS_AGO = new Date();
EIGHTEEN_YEARS_AGO.setFullYear(EIGHTEEN_YEARS_AGO.getFullYear() - 18);
const MAX_BIRTH_DATE = EIGHTEEN_YEARS_AGO.toISOString().slice(0, 10);

type FormState = {
  name: string;
  email: string;
  password: string;
  birth_date: string;
  gender: Gender | '';
  is_admin: boolean;
  roles: Role[];
  player: { positions: PlayerPosition[]; skill_level: '' | Exclude<SkillLevel, 'all_levels'> };
  coach: { achievements: string; experiences: string; bootcamp_names: string };
  organizer: {
    managed_courts: string;
    contact_number: string;
    contact_email: string;
    facebook_url: string;
    instagram_url: string;
  };
};

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  birth_date: '',
  gender: '',
  is_admin: false,
  roles: ['player'],
  player: { positions: [], skill_level: '' },
  coach: { achievements: '', experiences: '', bootcamp_names: '' },
  organizer: {
    managed_courts: '',
    contact_number: '',
    contact_email: '',
    facebook_url: '',
    instagram_url: '',
  },
});

function courtsToString(v: string[] | string | undefined | null): string {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string') return v;
  return '';
}

function parseCourts(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
    if (typeof data?.message === 'string' && data.message) return data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

type Props = {
  mode: 'create' | 'edit';
  userId?: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function AdminUserFormModal({ mode, userId, onClose, onSaved }: Props) {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(mode === 'edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  useEffect(() => {
    if (mode !== 'edit' || userId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const detail = await getAdminUser(userId);
        if (cancelled) return;
        const player = detail.profiles.player;
        const coach = detail.profiles.coach;
        const organizer = detail.profiles.organizer;
        setForm({
          name: detail.name,
          email: detail.email,
          password: '',
          birth_date: detail.birth_date,
          gender: detail.gender,
          is_admin: detail.is_admin,
          roles: [...detail.roles],
          player: {
            positions: (player?.positions ?? []) as PlayerPosition[],
            skill_level:
              player?.skill_level && player.skill_level !== 'all_levels'
                ? (player.skill_level as FormState['player']['skill_level'])
                : '',
          },
          coach: {
            achievements: Array.isArray(coach?.achievements)
              ? coach.achievements.join(', ')
              : typeof coach?.achievements === 'string'
                ? coach.achievements
                : '',
            experiences: Array.isArray(coach?.experiences)
              ? coach.experiences.join(', ')
              : typeof coach?.experiences === 'string'
                ? coach.experiences
                : '',
            bootcamp_names: Array.isArray(coach?.bootcamp_names)
              ? coach.bootcamp_names.join(', ')
              : typeof coach?.bootcamp_names === 'string'
                ? coach.bootcamp_names
                : Array.isArray(coach?.bootcamp_name)
                  ? coach.bootcamp_name.join(', ')
                  : typeof coach?.bootcamp_name === 'string'
                    ? coach.bootcamp_name
                    : '',
          },
          organizer: {
            managed_courts: courtsToString(organizer?.managed_courts),
            contact_number: organizer?.contact_number ?? '',
            contact_email: organizer?.contact_email ?? '',
            facebook_url: organizer?.facebook_url ?? '',
            instagram_url: organizer?.instagram_url ?? '',
          },
        });
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load user.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, userId]);

  const toggleRole = (role: Role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  const togglePosition = (pos: PlayerPosition) => {
    setForm((f) => {
      const has = f.player.positions.includes(pos);
      return {
        ...f,
        player: {
          ...f.player,
          positions: has
            ? f.player.positions.filter((p) => p !== pos)
            : [...f.player.positions, pos],
        },
      };
    });
  };

  const buildPayload = (): AdminUserWritePayload => {
    const profiles: AdminUserWritePayload['profiles'] = {};
    if (form.roles.includes('player')) {
      const player: ProfileFieldset = {
        positions: form.player.positions,
      };
      if (form.player.skill_level) player.skill_level = form.player.skill_level;
      profiles.player = player;
    } else {
      profiles.player = null;
    }
    if (form.roles.includes('coach')) {
      const split = (raw: string) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      profiles.coach = {
        achievements: split(form.coach.achievements),
        experiences: split(form.coach.experiences),
        bootcamp_names: split(form.coach.bootcamp_names),
      };
    } else {
      profiles.coach = null;
    }
    if (form.roles.includes('organizer')) {
      profiles.organizer = {
        managed_courts: parseCourts(form.organizer.managed_courts),
        contact_number: form.organizer.contact_number || null,
        contact_email: form.organizer.contact_email || null,
        facebook_url: form.organizer.facebook_url || null,
        instagram_url: form.organizer.instagram_url || null,
      };
    } else {
      profiles.organizer = null;
    }

    const payload: AdminUserWritePayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      birth_date: form.birth_date,
      gender: form.gender as Gender,
      is_admin: form.is_admin,
      roles: form.roles,
      profiles,
    };
    if (form.password.trim()) {
      payload.password = form.password;
    }
    return payload;
  };

  const canSubmit =
    !loading &&
    !busy &&
    form.name.trim() !== '' &&
    form.email.includes('@') &&
    form.birth_date !== '' &&
    form.birth_date <= MAX_BIRTH_DATE &&
    form.gender !== '' &&
    (mode === 'edit'
      ? form.password === '' || passwordMeetsRules(form.password)
      : passwordMeetsRules(form.password));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (mode === 'create') {
        if (!payload.password) {
          setError('Password is required.');
          return;
        }
        await createAdminUser(payload);
        showToast('User created');
      } else if (userId != null) {
        await updateAdminUser(userId, payload);
        showToast('User updated');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, mode === 'create' ? 'Create failed.' : 'Update failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-safe-max-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-navy shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
            {mode === 'create' ? 'Create user' : 'Edit user'}
          </h2>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            {loading ? <p className="text-sm text-muted">Loading…</p> : null}
            {error ? (
              <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            {!loading ? (
              <>
                <label className="block">
                  <span className={labelClass}>Name</span>
                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Email</span>
                  <input
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </label>
                <div>
                  <PasswordField
                    label={mode === 'create' ? 'Password' : 'Password (optional)'}
                    value={form.password}
                    onChange={(password) => setForm((f) => ({ ...f, password }))}
                    autoComplete="new-password"
                  />
                  {mode === 'edit' ? (
                    <p className="mt-1 text-xs text-muted">Leave blank to keep current password.</p>
                  ) : null}
                </div>
                <label className="block">
                  <span className={labelClass}>Birth date</span>
                  <input
                    type="date"
                    className={fieldClass}
                    value={form.birth_date}
                    max={MAX_BIRTH_DATE}
                    onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Gender</span>
                  <select
                    className={fieldClass}
                    value={form.gender}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gender: e.target.value as Gender | '' }))
                    }
                    required
                  >
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-navy">
                  <input
                    type="checkbox"
                    checked={form.is_admin}
                    onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))}
                  />
                  Admin
                </label>

                <fieldset className="space-y-2">
                  <legend className={labelClass}>Roles</legend>
                  <div className="flex flex-wrap gap-3">
                    {ROLE_OPTIONS.map((r) => (
                      <label
                        key={r.value}
                        className="inline-flex items-center gap-2 text-sm font-medium text-navy"
                      >
                        <input
                          type="checkbox"
                          checked={form.roles.includes(r.value)}
                          onChange={() => toggleRole(r.value)}
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {form.roles.includes('player') ? (
                  <fieldset className="space-y-2 rounded-[var(--radius-control)] border border-border p-3">
                    <legend className="px-1 text-sm font-semibold text-navy">Player profile</legend>
                    <div className="flex flex-wrap gap-2">
                      {PLAYER_POSITIONS.map((p) => (
                        <label
                          key={p.value}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy"
                        >
                          <input
                            type="checkbox"
                            checked={form.player.positions.includes(p.value)}
                            onChange={() => togglePosition(p.value)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                    <label className="block">
                      <span className={labelClass}>Skill level</span>
                      <select
                        className={fieldClass}
                        value={form.player.skill_level}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            player: {
                              ...f.player,
                              skill_level: e.target.value as FormState['player']['skill_level'],
                            },
                          }))
                        }
                      >
                        <option value="">—</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </label>
                  </fieldset>
                ) : null}

                {form.roles.includes('coach') ? (
                  <fieldset className="space-y-2 rounded-[var(--radius-control)] border border-border p-3">
                    <legend className="px-1 text-sm font-semibold text-navy">Coach profile</legend>
                    <label className="block">
                      <span className={labelClass}>Achievements</span>
                      <input
                        className={fieldClass}
                        placeholder="Comma-separated"
                        value={form.coach.achievements}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            coach: { ...f.coach, achievements: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Experiences</span>
                      <input
                        className={fieldClass}
                        placeholder="Comma-separated"
                        value={form.coach.experiences}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            coach: { ...f.coach, experiences: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Bootcamp names</span>
                      <input
                        className={fieldClass}
                        placeholder="Comma-separated"
                        value={form.coach.bootcamp_names}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            coach: { ...f.coach, bootcamp_names: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </fieldset>
                ) : null}

                {form.roles.includes('organizer') ? (
                  <fieldset className="space-y-2 rounded-[var(--radius-control)] border border-border p-3">
                    <legend className="px-1 text-sm font-semibold text-navy">
                      Organizer profile
                    </legend>
                    <label className="block">
                      <span className={labelClass}>Managed courts</span>
                      <input
                        className={fieldClass}
                        placeholder="Comma-separated"
                        value={form.organizer.managed_courts}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organizer: { ...f.organizer, managed_courts: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Contact number</span>
                      <input
                        className={fieldClass}
                        value={form.organizer.contact_number}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organizer: { ...f.organizer, contact_number: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Contact email</span>
                      <input
                        type="email"
                        className={fieldClass}
                        value={form.organizer.contact_email}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organizer: { ...f.organizer, contact_email: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Facebook URL</span>
                      <input
                        className={fieldClass}
                        value={form.organizer.facebook_url}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organizer: { ...f.organizer, facebook_url: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Instagram URL</span>
                      <input
                        className={fieldClass}
                        value={form.organizer.instagram_url}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organizer: { ...f.organizer, instagram_url: e.target.value },
                          }))
                        }
                      />
                    </label>
                  </fieldset>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
