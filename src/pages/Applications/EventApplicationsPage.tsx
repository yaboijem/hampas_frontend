import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { approveApplication, listEventApplications, rejectApplication } from '../../api/applications';
import { getEvent, setParticipantsVisibility } from '../../api/events';
import StatusBadge from '../../components/StatusBadge';
import { showToast } from '../../lib/adminNotifications';
import type { ApplicationStatus } from '../../api/types';

interface Applicant {
  id: number;
  user: { id: number; name: string };
  status: ApplicationStatus;
}

const BTN_BASE =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition disabled:cursor-default disabled:opacity-60';

const APPROVE_ACTIVE = `${BTN_BASE} bg-cobalt text-white shadow-soft hover:bg-electric`;
const REJECT_ACTIVE = `${BTN_BASE} border border-border bg-surface text-navy hover:border-cobalt hover:bg-sky-tint`;
const FLIP_BTN = `${BTN_BASE} border border-border bg-surface text-navy hover:border-cobalt hover:bg-sky-tint`;

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
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
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showPublic, setShowPublic] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listEventApplications(eventId), getEvent(eventId)])
      .then(([{ data }, event]) => {
        if (cancelled) return;
        setApplicants(data);
        setShowPublic(event.show_participants_publicly === true);
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

  const decide = async (applicationId: number, status: 'approved' | 'rejected', name: string) => {
    setError(null);
    setBusyId(applicationId);
    try {
      if (status === 'approved') {
        await approveApplication(eventId, applicationId);
      } else {
        await rejectApplication(eventId, applicationId);
      }
      const { data } = await listEventApplications(eventId);
      setApplicants(data);
      showToast(status === 'approved' ? `${name} approved` : `${name} rejected`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update application.');
    } finally {
      setBusyId(null);
    }
  };

  const onToggleVisibility = async () => {
    const next = !showPublic;
    setVisibilityBusy(true);
    setError(null);
    try {
      const res = await setParticipantsVisibility(eventId, next);
      setShowPublic(res.show_participants_publicly);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update visibility.');
    } finally {
      setVisibilityBusy(false);
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

      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">Applications</h1>
          <p className="text-sm text-muted">Review who wants to join — you can change a decision anytime</p>
        </div>
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={showPublic}
            aria-label="Show approved players publicly"
            disabled={visibilityBusy}
            onClick={() => void onToggleVisibility()}
            className={[
              'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition',
              showPublic ? 'border-cobalt bg-cobalt' : 'border-border bg-ice',
              visibilityBusy ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span
              aria-hidden
              className={[
                'inline-block h-4 w-4 rounded-full bg-white shadow transition',
                showPublic ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
          <div className="min-w-0 text-sm">
            <p className="font-medium text-navy">Show approved players publicly</p>
            <p className="mt-0.5 text-xs text-muted">
              When on, anyone viewing the event can see approved names.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {applicants.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">No applications yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {applicants.map((a) => {
            const busy = busyId === a.id;
            const isPending = a.status === 'pending';
            const isApproved = a.status === 'approved';
            const isRejected = a.status === 'rejected';

            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 shadow-soft"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">{a.user.name}</span>
                <StatusBadge status={a.status} />
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(a.id, 'approved', a.user.name)}
                        className={APPROVE_ACTIVE}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(a.id, 'rejected', a.user.name)}
                        className={REJECT_ACTIVE}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide(a.id, 'rejected', a.user.name)}
                      className={FLIP_BTN}
                    >
                      Change to Rejected
                    </button>
                  )}
                  {isRejected && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide(a.id, 'approved', a.user.name)}
                      className={FLIP_BTN}
                    >
                      Change to Approved
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
