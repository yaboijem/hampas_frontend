import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apply, cancelApplication } from '../api/applications';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from './StatusBadge';
import type { ApplicationStatus } from '../api/types';

interface Props {
  eventId: number;
  isOwner: boolean;
  visibility: 'live' | 'pending_review' | 'rejected';
  myApplication: { id: number; status: ApplicationStatus } | null;
}

export default function ApplyButton({ eventId, isOwner, visibility, myApplication }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState(myApplication);
  const [error, setError] = useState<string | null>(null);

  if (isOwner || visibility !== 'live') return null;

  const handleApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setError(null);
    try {
      const { application: next } = await apply(eventId);
      setApplication(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed.');
    }
  };

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelApplication(eventId);
      setApplication(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed.');
    }
  };

  if (application) {
    return (
      <div className="flex w-full flex-wrap items-center gap-3">
        <StatusBadge status={application.status} />
        {application.status === 'pending' && (
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-11 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-navy"
          >
            Cancel application
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleApply}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-electric sm:w-auto"
      >
        Apply
      </button>
    </div>
  );
}
