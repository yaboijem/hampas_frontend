import { useEffect, useId, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  changePassword,
  sendPasswordCode,
  updateMe,
  verifyPasswordCode,
} from '../../api/auth';
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
  Role,
  RoleRequest,
  SkillLevel,
} from '../../api/types';
import { PLAYER_POSITIONS } from '../../api/types';
import PasswordField from '../../components/PasswordField';
import PasswordRules from '../../components/PasswordRules';
import { SKILL_BADGE_CLASS, SKILL_LABEL } from '../../events/eventLabels';
import { passwordFormValid } from '../../lib/passwordRules';

const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  player: { label: 'Player', emoji: '🏐' },
  coach: { label: 'Coach', emoji: '📋' },
  organizer: { label: 'Organizer', emoji: '🏟️' },
};

const ELEVATED: ElevatedRole[] = ['coach', 'organizer'];
const SKILL_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;
type PlayerSkill = (typeof SKILL_OPTIONS)[number];

const SKILL_HINT: Record<PlayerSkill, string> = {
  beginner: 'Learning the game',
  intermediate: 'Comfortable in rallies',
  advanced: 'Competitive play',
};

const SKILL_SELECT_CLASS: Record<PlayerSkill, { idle: string; active: string }> = {
  beginner: {
    idle: 'border-emerald-200/80 bg-surface text-navy hover:border-emerald-400 hover:bg-emerald-50',
    active: 'border-emerald-600 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500/30',
  },
  intermediate: {
    idle: 'border-blue-200/80 bg-surface text-navy hover:border-blue-400 hover:bg-blue-50',
    active: 'border-blue-600 bg-blue-100 text-blue-900 ring-2 ring-blue-500/30',
  },
  advanced: {
    idle: 'border-border bg-surface text-navy hover:border-red-400 hover:bg-red-50',
    active: 'border-red-500 bg-slate-900 text-white ring-2 ring-red-500/40',
  },
};

const EMPTY: ProfileView = { roles: [], player: null, coach: null, organizer: null };

const EIGHTEEN_YEARS_AGO = new Date();
EIGHTEEN_YEARS_AGO.setFullYear(EIGHTEEN_YEARS_AGO.getFullYear() - 18);
const MAX_BIRTH_DATE = EIGHTEEN_YEARS_AGO.toISOString().slice(0, 10);

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const cardClass = 'rounded-[var(--radius-card)] border border-border bg-surface shadow-soft';
const primaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';
const secondaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy transition hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60';

type CardKey = 'account' | 'player' | 'coach' | 'organizer' | 'elevated';
type PasswordPhase = 'locked' | 'code_sent' | 'unlocked';

const PASSWORD_RESEND_COOLDOWN_MS = 15_000;

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (
      err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }
    ).response?.data;
    const first = data?.errors && Object.values(data.errors).flat()[0];
    if (first) return first;
    if (data?.message) return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function positionLabel(value: string) {
  return PLAYER_POSITIONS.find((p) => p.value === value)?.label ?? titleCase(value);
}

function asCourtList(value: string[] | string | undefined | null): string[] {
  if (Array.isArray(value)) return value.filter((c) => c.trim() !== '');
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(/[,;\n]+/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sky-tint px-2.5 py-0.5 text-xs font-semibold text-chip-text">
      {children}
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading profile">
      <div className="skeleton-shimmer h-6 w-32 rounded" />
      <div className="skeleton-shimmer h-14 w-full rounded-[var(--radius-card)]" />
      <div className="skeleton-shimmer h-14 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

function CollapsibleCard({
  id,
  title,
  emoji,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  emoji?: string;
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `${id}-panel`;
  return (
    <section className={cardClass} aria-labelledby={`${id}-title`}>
      <button
        type="button"
        id={`${id}-title`}
        className="flex w-full items-center gap-2 px-3 py-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="min-w-0 flex-1">
          <span className="font-display block text-base font-bold text-navy">
            {emoji ? (
              <span aria-hidden className="mr-1.5">
                {emoji}
              </span>
            ) : null}
            {title}
          </span>
          {!open && summary ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">{summary}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm font-semibold text-muted" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-border px-3 pb-3 pt-3">
          {children}
        </div>
      ) : null}
    </section>
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
  const [error, setError] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<CardKey | null>(null);
  const [editing, setEditing] = useState<Partial<Record<CardKey, boolean>>>({});
  const [savingRole, setSavingRole] = useState<Role | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [requesting, setRequesting] = useState<ElevatedRole | null>(null);
  const [account, setAccount] = useState<AccountForm>({
    name: '',
    email: '',
    birth_date: '',
    gender: '',
  });
  const [playerDraft, setPlayerDraft] = useState<{
    positions: PlayerPosition[];
    skill_level: SkillLevel | '';
  }>({ positions: [], skill_level: '' });
  const [coachDraft, setCoachDraft] = useState({ achievements: '', bootcamp_name: '' });
  const [courtsDraft, setCourtsDraft] = useState<string[]>(['']);
  const [contactDraft, setContactDraft] = useState({
    contact_number: '',
    contact_email: '',
    facebook_url: '',
    instagram_url: '',
  });
  const [passwordPhase, setPasswordPhase] = useState<PasswordPhase>('locked');
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const resendSecondsLeft = Math.max(0, Math.ceil((resendAt - nowMs) / 1000));
  const resendCoolingDown = resendSecondsLeft > 0;

  useEffect(() => {
    if (!resendCoolingDown) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [resendCoolingDown, resendAt]);

  const resetPasswordUi = (keepMessage?: string | null) => {
    setPasswordPhase('locked');
    setPasswordCode('');
    setNewPassword('');
    setConfirmPassword('');
    setSendingCode(false);
    setVerifyingCode(false);
    setSavingPassword(false);
    setPasswordError(null);
    setResendAt(0);
    setNowMs(Date.now());
    setPasswordMessage(keepMessage ?? null);
  };

  const syncDraftsFromProfile = (data: ProfileView, nextUser = user) => {
    const positions =
      data.player?.positions && data.player.positions.length > 0
        ? data.player.positions
        : data.player?.position
          ? [data.player.position as PlayerPosition]
          : [];
    setPlayerDraft({
      positions,
      skill_level: data.player?.skill_level ?? '',
    });
    setCoachDraft({
      achievements: data.coach?.achievements ?? '',
      bootcamp_name: data.coach?.bootcamp_name ?? '',
    });
    const courts = asCourtList(data.organizer?.managed_courts);
    setCourtsDraft(courts.length > 0 ? courts : ['']);
    setContactDraft({
      contact_number: data.organizer?.contact_number ?? '',
      contact_email: data.organizer?.contact_email ?? '',
      facebook_url: data.organizer?.facebook_url ?? '',
      instagram_url: data.organizer?.instagram_url ?? '',
    });
    if (nextUser) {
      setAccount({
        name: nextUser.name,
        email: nextUser.email,
        birth_date: nextUser.birth_date,
        gender: nextUser.gender,
      });
    }
  };

  useEffect(() => {
    if (!user || editing.account) return;
    setAccount({
      name: user.name,
      email: user.email,
      birth_date: user.birth_date,
      gender: user.gender,
    });
  }, [user, editing.account]);

  const load = async () => {
    try {
      const [data, reqs] = await Promise.all([getProfile(), listMyRoleRequests()]);
      setProfile(data);
      setRequests(reqs);
      syncDraftsFromProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const toggleCard = (key: CardKey) => {
    setOpenCard((cur) => {
      if (cur === key) {
        setEditing((e) => ({ ...e, [key]: false }));
        if (key === 'account') resetPasswordUi();
        return null;
      }
      if (cur) {
        setEditing((e) => ({ ...e, [cur]: false }));
        if (cur === 'account') resetPasswordUi();
      }
      return key;
    });
  };

  const startEdit = (key: CardKey) => {
    if (key === 'player') {
      const positions =
        profile.player?.positions && profile.player.positions.length > 0
          ? profile.player.positions
          : profile.player?.position
            ? [profile.player.position as PlayerPosition]
            : [];
      setPlayerDraft({
        positions,
        skill_level: profile.player?.skill_level ?? '',
      });
    }
    if (key === 'coach') {
      setCoachDraft({
        achievements: profile.coach?.achievements ?? '',
        bootcamp_name: profile.coach?.bootcamp_name ?? '',
      });
    }
    if (key === 'organizer') {
      const courts = asCourtList(profile.organizer?.managed_courts);
      setCourtsDraft(courts.length > 0 ? courts : ['']);
      setContactDraft({
        contact_number: profile.organizer?.contact_number ?? '',
        contact_email: profile.organizer?.contact_email ?? '',
        facebook_url: profile.organizer?.facebook_url ?? '',
        instagram_url: profile.organizer?.instagram_url ?? '',
      });
    }
    if (key === 'account' && user) {
      setAccount({
        name: user.name,
        email: user.email,
        birth_date: user.birth_date,
        gender: user.gender,
      });
      resetPasswordUi();
    }
    setEditing((e) => ({ ...e, [key]: true }));
  };

  const cancelEdit = (key: CardKey) => {
    setEditing((e) => ({ ...e, [key]: false }));
    if (key === 'account') resetPasswordUi();
    syncDraftsFromProfile(profile);
  };

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
      resetPasswordUi();
      setEditing((e) => ({ ...e, account: false }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save account.'));
    } finally {
      setSavingAccount(false);
    }
  };

  const passwordValid = passwordFormValid(newPassword, confirmPassword);

  const handleSendCode = async () => {
    setPasswordError(null);
    setPasswordMessage(null);
    setSendingCode(true);
    try {
      const { message } = await sendPasswordCode();
      setPasswordPhase('code_sent');
      setPasswordMessage(message);
      const nextResendAt = Date.now() + PASSWORD_RESEND_COOLDOWN_MS;
      setResendAt(nextResendAt);
      setNowMs(Date.now());
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Failed to send code.'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{4}$/.test(passwordCode)) {
      setPasswordError('Enter the 4-digit code.');
      return;
    }
    setPasswordError(null);
    setVerifyingCode(true);
    try {
      const { message } = await verifyPasswordCode(passwordCode);
      setPasswordPhase('unlocked');
      setPasswordMessage(message);
      setPasswordCode('');
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Invalid or expired code.'));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordValid) return;
    setPasswordError(null);
    setSavingPassword(true);
    try {
      const { message } = await changePassword(newPassword, confirmPassword);
      resetPasswordUi(message || 'Password updated.');
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const savePlayer = async () => {
    setError(null);
    setSavingRole('player');
    try {
      await updateRole('player', {
        positions: playerDraft.positions,
        ...(playerDraft.skill_level
          ? { skill_level: playerDraft.skill_level as SkillLevel }
          : {}),
      });
      await load();
      setEditing((e) => ({ ...e, player: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingRole(null);
    }
  };

  const saveCoach = async () => {
    setError(null);
    setSavingRole('coach');
    try {
      await updateRole('coach', {
        achievements: coachDraft.achievements,
        bootcamp_name: coachDraft.bootcamp_name,
      });
      await load();
      setEditing((e) => ({ ...e, coach: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingRole(null);
    }
  };

  const saveOrganizer = async () => {
    setError(null);
    setSavingRole('organizer');
    try {
      const managed_courts = courtsDraft.map((c) => c.trim()).filter(Boolean);
      await updateRole('organizer', {
        managed_courts,
        contact_number: contactDraft.contact_number.trim(),
        contact_email: contactDraft.contact_email.trim(),
        facebook_url: contactDraft.facebook_url.trim(),
        instagram_url: contactDraft.instagram_url.trim(),
      });
      await load();
      setEditing((e) => ({ ...e, organizer: false }));
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

  const togglePosition = (pos: PlayerPosition) => {
    setPlayerDraft((d) => ({
      ...d,
      positions: d.positions.includes(pos)
        ? d.positions.filter((p) => p !== pos)
        : [...d.positions, pos],
    }));
  };

  const viewPositions =
    profile.player?.positions && profile.player.positions.length > 0
      ? profile.player.positions
      : profile.player?.position
        ? [profile.player.position as PlayerPosition]
        : [];
  const viewSkill = profile.player?.skill_level;
  const viewCourts = asCourtList(profile.organizer?.managed_courts);

  const editActions = (
    key: CardKey,
    onSave: () => void,
    saving: boolean,
    saveLabel: string,
    saveDisabled = false,
  ) =>
    editing[key] ? (
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || saveDisabled}
          className={primaryBtn}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
        <button type="button" onClick={() => cancelEdit(key)} className={secondaryBtn} disabled={saving}>
          Cancel
        </button>
      </div>
    ) : (
      <div className="mt-3">
        <button type="button" onClick={() => startEdit(key)} className={secondaryBtn}>
          Edit
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          {user?.name ? `Hello! ${user.name} 👋` : 'Profile'}
        </h1>
        <p className="mt-0.5 text-sm text-muted">Tap a section and manage your account.</p>
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
            <CollapsibleCard
              id="account"
              title="Account"
              open={openCard === 'account'}
              onToggle={() => toggleCard('account')}
              summary={
                <>
                  <Chip>{user.name}</Chip>
                  <span className="truncate text-xs text-muted">{user.email}</span>
                </>
              }
            >
              {editing.account ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  <div className="mt-4 border-t border-border pt-3">
                    <p className={labelClass}>Password</p>
                    <p className="mt-1 text-xs text-muted">
                      Change password using a 4-digit code sent to {user.email}.
                    </p>
                    {passwordError ? (
                      <p className="mt-2 text-sm font-medium text-red-700" role="alert">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordMessage ? (
                      <p className="mt-2 text-sm font-medium text-emerald-800">{passwordMessage}</p>
                    ) : null}
                    {passwordPhase === 'locked' || passwordPhase === 'code_sent' ? (
                      <div className="mt-3 space-y-2">
                        {passwordPhase === 'code_sent' ? (
                          <label className="block" htmlFor="password-change-code">
                            <span className={labelClass}>4-digit code</span>
                            <input
                              id="password-change-code"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={4}
                              className={fieldClass}
                              value={passwordCode}
                              onChange={(e) =>
                                setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                            />
                          </label>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {passwordPhase === 'code_sent' ? (
                            <button
                              type="button"
                              className={primaryBtn}
                              disabled={verifyingCode || passwordCode.length !== 4}
                              onClick={() => void handleVerifyCode()}
                            >
                              {verifyingCode ? 'Verifying…' : 'Verify code'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={passwordPhase === 'locked' ? primaryBtn : secondaryBtn}
                            disabled={sendingCode || resendCoolingDown}
                            onClick={() => void handleSendCode()}
                            aria-live="polite"
                          >
                            {sendingCode
                              ? 'Sending…'
                              : resendCoolingDown
                                ? `Resend in ${resendSecondsLeft}s`
                                : passwordPhase === 'code_sent'
                                  ? 'Resend code'
                                  : 'Send code'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {passwordPhase === 'unlocked' ? (
                      <div className="mt-3 space-y-3">
                        <PasswordField
                          label="New password"
                          value={newPassword}
                          onChange={setNewPassword}
                          autoComplete="new-password"
                        />
                        <PasswordField
                          label="Confirm password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          autoComplete="new-password"
                        />
                        <PasswordRules password={newPassword} confirmation={confirmPassword} />
                        <button
                          type="button"
                          className={primaryBtn}
                          disabled={savingPassword || !passwordValid}
                          onClick={() => void handleChangePassword()}
                        >
                          {savingPassword ? 'Saving…' : 'Save password'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className={labelClass}>Name</dt>
                    <dd className="mt-0.5 text-navy">{user.name}</dd>
                  </div>
                  <div>
                    <dt className={labelClass}>Email</dt>
                    <dd className="mt-0.5 text-navy">{user.email}</dd>
                  </div>
                  <div>
                    <dt className={labelClass}>Birth date</dt>
                    <dd className="mt-0.5 text-navy">{user.birth_date}</dd>
                  </div>
                  <div>
                    <dt className={labelClass}>Gender</dt>
                    <dd className="mt-0.5 capitalize text-navy">{user.gender}</dd>
                  </div>
                </dl>
              )}
              {editActions('account', () => void saveAccount(), savingAccount, 'Save account', !accountValid)}
            </CollapsibleCard>
          ) : null}

          <CollapsibleCard
            id="player"
            title="Player details"
            emoji={ROLE_META.player.emoji}
            open={openCard === 'player'}
            onToggle={() => toggleCard('player')}
            summary={
              viewPositions.length === 0 && !viewSkill ? (
                <span className="text-xs text-muted">Not set</span>
              ) : (
                <>
                  {viewPositions.map((p) => (
                    <Chip key={p}>{positionLabel(p)}</Chip>
                  ))}
                  {viewSkill && viewSkill !== 'all_levels' ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SKILL_BADGE_CLASS[viewSkill]}`}
                    >
                      {SKILL_LABEL[viewSkill]}
                    </span>
                  ) : null}
                </>
              )
            }
          >
            {editing.player ? (
              <>
                <fieldset>
                  <legend className={labelClass}>Positions</legend>
                  <p className="mt-1 text-xs text-muted">Select all that apply.</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2" role="group" aria-label="Positions">
                    {PLAYER_POSITIONS.map((p) => {
                      const id = `player-pos-${p.value}`;
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
                            checked={playerDraft.positions.includes(p.value)}
                            onChange={() => togglePosition(p.value)}
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="mt-4">
                  <legend className={labelClass}>Skill level</legend>
                  <p className="mt-1 text-xs text-muted">Pick the level that best matches how you play.</p>
                  <div
                    className="mt-2 grid gap-2 sm:grid-cols-3"
                    role="radiogroup"
                    aria-label="Skill level"
                  >
                    {SKILL_OPTIONS.map((level) => {
                      const selected = playerDraft.skill_level === level;
                      const styles = SKILL_SELECT_CLASS[level];
                      return (
                        <button
                          key={level}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={SKILL_LABEL[level]}
                          onClick={() =>
                            setPlayerDraft((d) => ({
                              ...d,
                              skill_level: selected ? '' : level,
                            }))
                          }
                          className={[
                            'flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2.5 text-left transition',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40',
                            selected ? styles.active : styles.idle,
                          ].join(' ')}
                        >
                          <span className="text-sm font-semibold leading-tight">
                            {SKILL_LABEL[level]}
                          </span>
                          <span
                            className={[
                              'mt-0.5 text-[11px] leading-snug',
                              selected && level === 'advanced' ? 'text-white/80' : 'text-muted',
                            ].join(' ')}
                          >
                            {SKILL_HINT[level]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className={labelClass}>Positions</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {viewPositions.length === 0 ? (
                      <span className="text-sm text-muted">None selected</span>
                    ) : (
                      viewPositions.map((p) => <Chip key={p}>{positionLabel(p)}</Chip>)
                    )}
                  </div>
                </div>
                <div>
                  <p className={labelClass}>Skill level</p>
                  <div className="mt-1.5">
                    {viewSkill && viewSkill !== 'all_levels' ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SKILL_BADGE_CLASS[viewSkill]}`}
                      >
                        {SKILL_LABEL[viewSkill]}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">Not set</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {editActions('player', () => void savePlayer(), savingRole === 'player', 'Save player')}
          </CollapsibleCard>

          {profile.roles.includes('coach') ? (
            <CollapsibleCard
              id="coach"
              title="Coach details"
              emoji={ROLE_META.coach.emoji}
              open={openCard === 'coach'}
              onToggle={() => toggleCard('coach')}
              summary={
                profile.coach?.bootcamp_name || profile.coach?.achievements ? (
                  <>
                    {profile.coach?.bootcamp_name ? (
                      <Chip>{profile.coach.bootcamp_name}</Chip>
                    ) : null}
                    {profile.coach?.achievements ? (
                      <span className="line-clamp-1 text-xs text-muted">
                        {profile.coach.achievements}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-muted">Not set</span>
                )
              }
            >
              {editing.coach ? (
                <div className="space-y-3">
                  <label htmlFor="edit-coach-achievements" className="block">
                    <span className={labelClass}>Achievements</span>
                    <input
                      id="edit-coach-achievements"
                      className={fieldClass}
                      value={coachDraft.achievements}
                      onChange={(e) =>
                        setCoachDraft((d) => ({ ...d, achievements: e.target.value }))
                      }
                    />
                  </label>
                  <label htmlFor="edit-coach-bootcamp_name" className="block">
                    <span className={labelClass}>Bootcamp name</span>
                    <input
                      id="edit-coach-bootcamp_name"
                      className={fieldClass}
                      value={coachDraft.bootcamp_name}
                      onChange={(e) =>
                        setCoachDraft((d) => ({ ...d, bootcamp_name: e.target.value }))
                      }
                    />
                  </label>
                </div>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className={labelClass}>Achievements</dt>
                    <dd className="mt-0.5 text-navy">
                      {profile.coach?.achievements || (
                        <span className="text-muted">Not set</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className={labelClass}>Bootcamp name</dt>
                    <dd className="mt-0.5 text-navy">
                      {profile.coach?.bootcamp_name || (
                        <span className="text-muted">Not set</span>
                      )}
                    </dd>
                  </div>
                </dl>
              )}
              {editActions('coach', () => void saveCoach(), savingRole === 'coach', 'Save coach')}
            </CollapsibleCard>
          ) : null}

          {profile.roles.includes('organizer') ? (
            <CollapsibleCard
              id="organizer"
              title="Organizer details"
              emoji={ROLE_META.organizer.emoji}
              open={openCard === 'organizer'}
              onToggle={() => toggleCard('organizer')}
              summary={
                viewCourts.length === 0 ? (
                  <span className="text-xs text-muted">No courts</span>
                ) : (
                  viewCourts.map((c) => <Chip key={c}>{c}</Chip>)
                )
              }
            >
              {editing.organizer ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className={labelClass}>Managed courts</span>
                    {courtsDraft.map((court, index) => (
                      <div key={index} className="flex gap-2">
                        <label className="block min-w-0 flex-1" htmlFor={`managed-court-${index}`}>
                          <span className="sr-only">Managed courts {index + 1}</span>
                          <input
                            id={`managed-court-${index}`}
                            className={fieldClass}
                            value={court}
                            placeholder="Court name"
                            onChange={(e) =>
                              setCourtsDraft((list) =>
                                list.map((c, i) => (i === index ? e.target.value : c)),
                              )
                            }
                          />
                        </label>
                        {courtsDraft.length > 1 ? (
                          <button
                            type="button"
                            className={secondaryBtn}
                            aria-label={`Remove court ${index + 1}`}
                            onClick={() =>
                              setCourtsDraft((list) => list.filter((_, i) => i !== index))
                            }
                          >
                            −
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={secondaryBtn}
                      aria-label="Add managed court"
                      onClick={() => setCourtsDraft((list) => [...list, ''])}
                    >
                      +
                    </button>
                  </div>
                  <label className="block" htmlFor="org-contact-number">
                    <span className={labelClass}>Contact number</span>
                    <input
                      id="org-contact-number"
                      className={fieldClass}
                      type="text"
                      inputMode="tel"
                      value={contactDraft.contact_number}
                      placeholder="09XX XXX XXXX"
                      onChange={(e) =>
                        setContactDraft((d) => ({ ...d, contact_number: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block" htmlFor="org-contact-email">
                    <span className={labelClass}>Contact email</span>
                    <input
                      id="org-contact-email"
                      className={fieldClass}
                      type="email"
                      value={contactDraft.contact_email}
                      placeholder="organizer@example.com"
                      onChange={(e) =>
                        setContactDraft((d) => ({ ...d, contact_email: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block" htmlFor="org-facebook-url">
                    <span className={labelClass}>Facebook URL</span>
                    <input
                      id="org-facebook-url"
                      className={fieldClass}
                      type="url"
                      value={contactDraft.facebook_url}
                      placeholder="https://facebook.com/…"
                      onChange={(e) =>
                        setContactDraft((d) => ({ ...d, facebook_url: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block" htmlFor="org-instagram-url">
                    <span className={labelClass}>Instagram URL</span>
                    <input
                      id="org-instagram-url"
                      className={fieldClass}
                      type="url"
                      value={contactDraft.instagram_url}
                      placeholder="https://instagram.com/…"
                      onChange={(e) =>
                        setContactDraft((d) => ({ ...d, instagram_url: e.target.value }))
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className={labelClass}>Managed courts</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {viewCourts.length === 0 ? (
                        <span className="text-sm text-muted">None</span>
                      ) : (
                        viewCourts.map((c) => <Chip key={c}>{c}</Chip>)
                      )}
                    </div>
                  </div>
                  <div>
                    <p className={labelClass}>Contact number</p>
                    <p className="mt-1 text-sm text-navy">
                      {profile.organizer?.contact_number?.trim() || (
                        <span className="text-muted">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className={labelClass}>Contact email</p>
                    <p className="mt-1 text-sm text-navy">
                      {profile.organizer?.contact_email?.trim() || (
                        <span className="text-muted">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className={labelClass}>Facebook URL</p>
                    <p className="mt-1 break-all text-sm text-navy">
                      {profile.organizer?.facebook_url?.trim() || (
                        <span className="text-muted">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className={labelClass}>Instagram URL</p>
                    <p className="mt-1 break-all text-sm text-navy">
                      {profile.organizer?.instagram_url?.trim() || (
                        <span className="text-muted">Not set</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {editActions(
                'organizer',
                () => void saveOrganizer(),
                savingRole === 'organizer',
                'Save organizer',
              )}
            </CollapsibleCard>
          ) : null}

          <CollapsibleCard
            id="elevated"
            title="Elevated access"
            open={openCard === 'elevated'}
            onToggle={() => toggleCard('elevated')}
            summary={<span className="text-xs text-muted">Coach & organizer requests</span>}
          >
            <p className="text-sm text-muted">Coach and organizer require admin approval.</p>
            <ul className="mt-3 space-y-3">
              {ELEVATED.map((role) => {
                if (profile.roles.includes(role)) {
                  return (
                    <li key={role} className="text-sm text-muted">
                      {ROLE_META[role].emoji} {ROLE_META[role].label} granted — open that card
                      above.
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
          </CollapsibleCard>
        </>
      )}
    </div>
  );
}
