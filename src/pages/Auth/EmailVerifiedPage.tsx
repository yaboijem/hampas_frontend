import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const cardClass =
  'mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6';
const primaryBtn =
  'inline-flex w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric';

export default function EmailVerifiedPage() {
  const [params] = useSearchParams();
  const ok = params.get('ok') === '1';
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (user) {
      void refreshUser().catch(() => undefined);
    }
  }, [user, refreshUser]);

  return (
    <div className={cardClass}>
      <h1 className="font-display text-2xl font-extrabold text-navy">
        {ok ? 'Email verified' : 'Verification'}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {ok
          ? 'Your email is confirmed. You can apply to events and create listings.'
          : 'If you followed a verification link, try logging in and opening verification help.'}
      </p>
      <Link to={user ? '/events' : '/login'} className={`${primaryBtn} mt-4`}>
        {user ? 'Continue to events' : 'Log in'}
      </Link>
    </div>
  );
}
