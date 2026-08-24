import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apply, cancelApplication } from '../api/applications';
import { isAxiosError } from 'axios';
import { isEmailVerified, useAuth } from '../auth/AuthContext';
import { showToast } from '../lib/adminNotifications';
import StatusBadge from './StatusBadge';
import type { ApplicationStatus } from '../api/types';

interface Props {
  eventId: number;
  isOwner: boolean;
  visibility: 'live' | 'pending_review' | 'rejected';
  myApplication: { id: number; status: ApplicationStatus } | null;
}

const STATUS_HELP: Record<ApplicationStatus, string> = {
  pending: 'Waiting for organizer approval.',
  approved: "You're in — see you on the court.",
  rejected: 'You cannot reapply to this event.',
};

const STATUS_CARD_CLASS: Record<ApplicationStatus, string> = {
  pending:
    'border-amber-500/30 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/40',
  approved: 'border-cobalt/25 bg-sky-tint dark:border-cobalt/30 dark:bg-sky-tint/25',
  rejected: 'border-border bg-ice',
};

export default function ApplyButton({ eventId, isOwner, visibility, myApplication }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState(myApplication);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApplication(myApplication);
  }, [myApplication]);

  if (isOwner || visibility !== 'live') return null;

  const handleApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!isEmailVerified(user)) {
      navigate('/verify-email');
      return;
    }
    setError(null);
    try {
      const { application: next } = await apply(eventId);
      setApplication(next);
      showToast('Application submitted.');
    } catch (err) {
      let msg = 'Apply failed.';
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        if (err.response?.status === 409) {
          msg = data?.message ?? 'Verify your email before applying.';
          navigate('/verify-email');
        } else if (data?.message) {
          msg = data.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelApplication(eventId);
      setApplication(null);
      showToast('Application cancelled.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cancel failed.';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  if (application) {
    const canWithdraw =
      application.status === 'pending' || application.status === 'approved';

    return (
      <div className="w-full space-y-2">
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div
          data-testid="application-status-card"
          className={[
            'flex w-full flex-col gap-2 rounded-[var(--radius-card)] border px-2.5 py-2 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-2.5',
            STATUS_CARD_CLASS[application.status],
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <StatusBadge status={application.status} />
            <p className="text-sm leading-snug text-navy">{STATUS_HELP[application.status]}</p>
          </div>
          {canWithdraw ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-navy shadow-soft transition hover:border-cobalt hover:bg-ice sm:w-auto"
            >
              {application.status === 'pending' ? 'Cancel application' : 'Leave event'}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleApply}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-electric"
      >
        Apply
      </button>
    </div>
  );
}
