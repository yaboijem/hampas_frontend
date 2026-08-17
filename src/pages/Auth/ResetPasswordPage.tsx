import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
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

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = passwordFormValid(password, confirmation) && email.includes('@');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(params.get('token') ?? '', email.trim(), password, confirmation);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={cardClass}>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your password was reset.{' '}
          <Link to="/login" className="font-semibold text-cobalt underline">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">
        Set new password
      </h1>
      <p className="mt-1 text-sm text-muted">Choose a strong password for your account.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
        <label htmlFor="reset-email" className="block">
          <span className={labelClass}>Email</span>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
        />
        <PasswordRules password={password} confirmation={confirmation} />
        <button type="submit" className={primaryBtn} disabled={!valid || submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
