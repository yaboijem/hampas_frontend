import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import PasswordField from '../../components/PasswordField';

const cardClass =
  'mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6';
const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const primaryBtn =
  'inline-flex w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';

function loginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    const fieldError =
      data?.errors?.email?.[0] ?? data?.errors?.password?.[0] ?? data?.message;
    if (fieldError) return fieldError;
    if (err.response?.status === 422) return 'Invalid email or password.';
    if (err.response?.status === 429) return 'Too many attempts. Try again shortly.';
  }
  return err instanceof Error ? err.message : 'Login failed.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await login(email.trim().toLowerCase(), password);
      signIn(token, user);
      const fromState = location.state as
        | { from?: { pathname?: string; search?: string; hash?: string } }
        | null;
      const from = fromState?.from;
      const target = from?.pathname
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/events';
      navigate(target, { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cardClass}>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">Log in</h1>
      <p className="mt-1 text-sm text-muted">Find games across Pampanga.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
        <label htmlFor="login-email" className="block">
          <span className={labelClass}>Email</span>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <button type="submit" className={primaryBtn} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/forgot-password" className="font-semibold text-cobalt hover:underline">
          Forgot password?
        </Link>
        {' · '}
        <Link to="/register" className="font-semibold text-cobalt hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
