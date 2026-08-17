import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { approveApplication, listEventApplications, rejectApplication } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus } from '../../api/types';

interface Applicant {
  id: number;
  user: { id: number; name: string };
  status: ApplicationStatus;
}

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton-shimmer h-5 w-1/3 rounded" />
        <div className="skeleton-shimmer h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function EventApplicationsPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listEventApplications(eventId)
      .then(({ data }) => {
        if (!cancelled) setApplicants(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load applications.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const decide = async (applicationId: number, status: 'approved' | 'rejected') => {
    setError(null);
    try {
      if (status === 'approved') {
        await approveApplication(eventId, applicationId);
      } else {
        await rejectApplication(eventId, applicationId);
      }
      const { data } = await listEventApplications(eventId);
      setApplicants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update application.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Loading applications">
        <div className="skeleton-shimmer mb-2 h-8 w-48 rounded" />
        <div className="skeleton-shimmer mb-4 h-4 w-56 rounded" />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link
        to={`/events/${eventId}`}
        className="mb-1 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-sm font-semibold text-chip-text transition hover:bg-cobalt/15"
      >
        <span aria-hidden>←</span>
        Back to event
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">Applications</h1>
        <p className="text-sm text-muted">Review who wants to join</p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      {applicants.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">No applications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {applicants.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            >
              <span className="font-semibold text-navy">{a.user.name}</span>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={a.status} />
                {a.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => decide(a.id, 'approved')}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(a.id, 'rejected')}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
