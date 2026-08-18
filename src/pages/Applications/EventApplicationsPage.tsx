import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  approveApplication,
  deleteEventApplication,
  listEventApplications,
  rejectApplication,
} from '../../api/applications';
import { getEvent, setParticipantsVisibility } from '../../api/events';
import StatusBadge from '../../components/StatusBadge';
import { showToast } from '../../lib/adminNotifications';
import { requestEventDetailRefresh } from '../../events/eventDetailRefresh';
import {
  EVENT_APPLICATIONS_REFRESH,
  eventIdFromApplicationsRefresh,
} from '../../notifications/eventApplicationsRefresh';
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

  const load = useCallback(
    async (silent = false) => {
      if (!Number.isFinite(eventId) || eventId <= 0) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [{ data }, event] = await Promise.all([
          listEventApplications(eventId),
          getEvent(eventId),
        ]);
        setApplicants(data);
        setShowPublic(event.show_participants_publicly === true);
        if (silent) setError(null);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load applications.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const refresh = () => void load(true);
    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onNotify = (event: Event) => {
      const id = eventIdFromApplicationsRefresh(event);
      if (id === eventId) refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(EVENT_APPLICATIONS_REFRESH, onNotify);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(EVENT_APPLICATIONS_REFRESH, onNotify);
    };
  }, [eventId, load]);

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
      requestEventDetailRefresh(eventId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update application.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (applicationId: number, name: string) => {
    setError(null);
    setBusyId(applicationId);
    try {
      await deleteEventApplication(eventId, applicationId);
      setApplicants((prev) => prev.filter((a) => a.id !== applicationId));
      showToast(`${name} removed`);
      requestEventDetailRefresh(eventId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove application.';
      setError(msg);
      showToast(msg, 'error');
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
      showToast(
        res.show_participants_publicly
          ? 'Approved players are now public.'
          : 'Approved players are now private.',
      );
      requestEventDetailRefresh(eventId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update visibility.';
      setError(msg);
      showToast(msg, 'error');
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
              <li key={a.id} className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-3 shadow-soft sm:flex-row sm:items-center sm:gap-3 sm:py-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-navy sm:truncate sm:leading-normal">
                      {a.user.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1 pt-0.5 sm:pt-0">
                      <StatusBadge status={a.status} />
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Remove ${a.user.name}`}
                        onClick={() => void remove(a.id, a.user.name)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-xl leading-none text-muted hover:bg-ice hover:text-navy disabled:opacity-60 sm:hidden"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(a.id, 'approved', a.user.name)}
                          className={`${APPROVE_ACTIVE} flex-1 sm:flex-none`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(a.id, 'rejected', a.user.name)}
                          className={`${REJECT_ACTIVE} flex-1 sm:flex-none`}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {isApproved && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Change to Rejected"
                        onClick={() => void decide(a.id, 'rejected', a.user.name)}
                        className={`${FLIP_BTN} w-full sm:w-auto`}
                      >
                        <span className="sm:hidden">Reject</span>
                        <span className="hidden sm:inline">Change to Rejected</span>
                      </button>
                    )}
                    {isRejected && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Change to Approved"
                        onClick={() => void decide(a.id, 'approved', a.user.name)}
                        className={`${FLIP_BTN} w-full sm:w-auto`}
                      >
                        <span className="sm:hidden">Approve</span>
                        <span className="hidden sm:inline">Change to Approved</span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${a.user.name}`}
                  onClick={() => void remove(a.id, a.user.name)}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-xl leading-none text-muted hover:bg-ice hover:text-navy disabled:opacity-60 sm:inline-flex"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
