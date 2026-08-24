import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { resendVerificationEmail } from '../../api/auth';
import { useAuth, isEmailVerified } from '../../auth/AuthContext';

const cardClass =
  'mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6';
const primaryBtn =
  'inline-flex w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';

export default function VerifyEmailPage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const verified = isEmailVerified(user);

  const resend = async () => {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setMessage('Verification email sent. Check your inbox (and spam).');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        setError('Please wait a moment before requesting another email.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not send email.');
      }
    } finally {
      setSending(false);
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    setError(null);
    try {
      await refreshUser();
    } catch {
      setError('Could not refresh status. Try again.');
    } finally {
      setChecking(false);
    }
  };

  if (!user) {
    return (
      <div className={cardClass}>
        <h1 className="font-display text-2xl font-extrabold text-navy">Verify your email</h1>
        <p className="mt-2 text-sm text-muted">Log in to resend your verification link.</p>
        <Link to="/login" className={`${primaryBtn} mt-4`}>
          Log in
        </Link>
      </div>
    );
  }

  if (verified) {
    return (
      <div className={cardClass}>
        <h1 className="font-display text-2xl font-extrabold text-navy">Email verified</h1>
        <p className="mt-2 text-sm text-muted">You are all set. You can create events and apply.</p>
        <Link to="/events" className={`${primaryBtn} mt-4`}>
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <h1 className="font-display text-2xl font-extrabold text-navy">Check your email</h1>
      <p className="mt-2 text-sm text-muted">
        We sent a verification link to <strong className="text-navy">{user.email}</strong>. Open it
        to unlock applying, hosting, and reports.
      </p>
      {message ? (
        <p role="status" className="mt-3 rounded-[var(--radius-control)] border border-border bg-ice px-3 py-2 text-sm text-navy">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <button type="button" className={primaryBtn} disabled={sending} onClick={() => void resend()}>
          {sending ? 'Sending…' : 'Resend verification email'}
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-[var(--radius-control)] border border-border px-3 py-2.5 text-sm font-semibold text-navy hover:bg-ice disabled:opacity-60"
          disabled={checking}
          onClick={() => void checkStatus()}
        >
          {checking ? 'Checking…' : 'I already verified — refresh'}
        </button>
      </div>
    </div>
  );
}
