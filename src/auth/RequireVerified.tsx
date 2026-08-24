import { Link } from 'react-router-dom';
import { useAuth, isEmailVerified } from './AuthContext';
import RequireAuth from './RequireAuth';

export default function RequireVerified({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <VerifiedGate>{children}</VerifiedGate>
    </RequireAuth>
  );
}

function VerifiedGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!isEmailVerified(user)) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-soft">
        <h1 className="font-display text-xl font-extrabold text-navy">Verify your email</h1>
        <p className="mt-2 text-sm text-muted">
          Confirm your email before using this feature. Check your inbox for the link we sent when
          you registered.
        </p>
        <Link
          to="/verify-email"
          className="mt-4 inline-flex rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white hover:bg-electric"
        >
          Open verification help
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
