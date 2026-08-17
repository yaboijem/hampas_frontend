import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import type { Gender } from '../../api/types';
import PasswordField from '../../components/PasswordField';
import PasswordRules from '../../components/PasswordRules';
import { passwordFormValid } from '../../lib/passwordRules';

const cardClass =
  'mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6';
const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const primaryBtn =
  'inline-flex w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';

const EIGHTEEN_YEARS_AGO = new Date();
EIGHTEEN_YEARS_AGO.setFullYear(EIGHTEEN_YEARS_AGO.getFullYear() - 18);
const MAX_BIRTH_DATE = EIGHTEEN_YEARS_AGO.toISOString().slice(0, 10);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    birth_date: '',
    gender: '' as Gender | '',
    privacy_policy_accepted: false,
    terms_accepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const isValid =
    form.name.trim() !== '' &&
    form.email.includes('@') &&
    passwordFormValid(form.password, form.password_confirmation) &&
    form.birth_date !== '' &&
    form.birth_date <= MAX_BIRTH_DATE &&
    form.gender !== '' &&
    form.privacy_policy_accepted &&
    form.terms_accepted;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        birth_date: form.birth_date,
        gender: form.gender as Gender,
        privacy_policy_accepted: form.privacy_policy_accepted,
        terms_accepted: form.terms_accepted,
      });
      signIn(token, user);
      navigate('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cardClass}>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">Join Hampas</h1>
      <p className="mt-1 text-sm text-muted">Create an account to apply and play.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
        <label htmlFor="register-name" className="block">
          <span className={labelClass}>Name</span>
          <input
            id="register-name"
            className={fieldClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoComplete="name"
          />
        </label>
        <label htmlFor="register-email" className="block">
          <span className={labelClass}>Email</span>
          <input
            id="register-email"
            type="email"
            className={fieldClass}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
          />
        </label>
        <PasswordField
          label="Password"
          value={form.password}
          onChange={(v) => set('password', v)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={form.password_confirmation}
          onChange={(v) => set('password_confirmation', v)}
          autoComplete="new-password"
        />
        <PasswordRules password={form.password} confirmation={form.password_confirmation} />
        <label htmlFor="register-birth" className="block">
          <span className={labelClass}>Date of birth</span>
          <input
            id="register-birth"
            type="date"
            max={MAX_BIRTH_DATE}
            className={fieldClass}
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
          />
        </label>
        {form.birth_date && form.birth_date > MAX_BIRTH_DATE ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            You must be at least 18 years old.
          </p>
        ) : null}
        <label htmlFor="register-gender" className="block">
          <span className={labelClass}>Gender</span>
          <select
            id="register-gender"
            className={fieldClass}
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Prefer not to say</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm text-navy">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border text-cobalt focus:ring-cobalt/30"
            checked={form.privacy_policy_accepted}
            onChange={(e) => set('privacy_policy_accepted', e.target.checked)}
          />
          <span>
            I accept the{' '}
            <Link to="/privacy" className="font-semibold text-cobalt hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-navy">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border text-cobalt focus:ring-cobalt/30"
            checked={form.terms_accepted}
            onChange={(e) => set('terms_accepted', e.target.checked)}
          />
          <span>
            I accept the{' '}
            <Link to="/terms" className="font-semibold text-cobalt hover:underline">
              Terms of Service
            </Link>
          </span>
        </label>
        <button type="submit" disabled={!isValid || submitting} className={primaryBtn}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-cobalt hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
