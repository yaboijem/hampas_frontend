import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  approveApplication,
  deleteEventApplication,
  listEventApplications,
  rejectApplication,
  type EventApplicant,
} from '../../api/applications';
import { getEvent, setParticipantsVisibility } from '../../api/events';
import StatusBadge from '../../components/StatusBadge';
import { showToast } from '../../lib/adminNotifications';
import { requestEventDetailRefresh } from '../../events/eventDetailRefresh';
import { SKILL_LABEL } from '../../events/eventLabels';
import {
  EVENT_APPLICATIONS_REFRESH,
  eventIdFromApplicationsRefresh,
} from '../../notifications/eventApplicationsRefresh';
import type { ApplicationStatus, PlayerPosition, SkillLevel } from '../../api/types';
import { PLAYER_POSITIONS } from '../../api/types';

type Applicant = EventApplicant;

const STATUS_ORDER: ApplicationStatus[] = ['pending', 'approved', 'rejected'];

const ICON_BTN =
  'inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-transparent transition disabled:cursor-default disabled:opacity-60';

const APPROVE_ICON_BTN = `${ICON_BTN} text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300`;
const REJECT_ICON_BTN = `${ICON_BTN} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function sortApplicants(list: Applicant[]): Applicant[] {
  const rank: Record<ApplicationStatus, number> = { pending: 0, approved: 1, rejected: 2 };
  return [...list].sort((a, b) => rank[a.status] - rank[b.status] || a.id - b.id);
}

function positionLabel(value: string): string {
  return PLAYER_POSITIONS.find((p) => p.value === value)?.label ?? value.replaceAll('_', ' ');
}

function skillLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value in SKILL_LABEL) return SKILL_LABEL[value as SkillLevel];
  return value.replaceAll('_', ' ');
}

function ApplicantDetailModal({
  applicant,
  onClose,
}: {
  applicant: Applicant;
  onClose: () => void;
}) {
  const positions = (applicant.user.positions ?? []) as string[];
  const skill = skillLabel(applicant.user.skill_level ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="applicant-detail-title"
        className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Applicant</p>
            <h2
              id="applicant-detail-title"
              className="truncate font-display text-xl font-extrabold tracking-tight text-navy"
            >
              {applicant.user.name}
            </h2>
          </div>
          <StatusBadge status={applicant.status} />
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Position</dt>
            <dd className="mt-1.5 text-navy">
              {positions.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {positions.map((p) => (
                    <li
                      key={p}
                      className="rounded-full border border-border bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text"
                    >
                      {positionLabel(p as PlayerPosition | string)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted">Not set</span>
              )}
            </dd>
          </div>
          {skill ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Skill level</dt>
              <dd className="mt-1 font-medium text-navy">{skill}</dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:border-cobalt sm:w-auto"
        >
          Close
        </button>
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
  const [selected, setSelected] = useState<Applicant | null>(null);

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
        setApplicants(sortApplicants(data));
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
      setApplicants(sortApplicants(data));
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

  const groups = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      items: applicants.filter((a) => a.status === status),
    })).filter((g) => g.items.length > 0);
  }, [applicants]);

  const renderRow = (a: Applicant) => {
    const busy = busyId === a.id;
    const isPending = a.status === 'pending';
    const isApproved = a.status === 'approved';
    const isRejected = a.status === 'rejected';

    return (
      <li key={a.id} className="flex items-center gap-1.5 sm:gap-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelected(a)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelected(a);
            }
          }}
          aria-label={`View details for ${a.user.name}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-2.5 py-1.5 shadow-soft transition hover:border-cobalt/40 hover:bg-ice/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35 sm:gap-3 sm:px-3 sm:py-2"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">{a.user.name}</span>
          <StatusBadge status={a.status} />
          <div
            className="flex shrink-0 items-center gap-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Approve"
                  onClick={() => void decide(a.id, 'approved', a.user.name)}
                  className={APPROVE_ICON_BTN}
                >
                  <CheckIcon />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Reject"
                  onClick={() => void decide(a.id, 'rejected', a.user.name)}
                  className={REJECT_ICON_BTN}
                >
                  <CrossIcon />
                </button>
              </>
            )}
            {isApproved && (
              <button
                type="button"
                disabled={busy}
                aria-label="Change to Rejected"
                onClick={() => void decide(a.id, 'rejected', a.user.name)}
                className={REJECT_ICON_BTN}
              >
                <CrossIcon />
              </button>
            )}
            {isRejected && (
              <button
                type="button"
                disabled={busy}
                aria-label="Change to Approved"
                onClick={() => void decide(a.id, 'approved', a.user.name)}
                className={APPROVE_ICON_BTN}
              >
                <CheckIcon />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          aria-label={`Remove ${a.user.name}`}
          onClick={() => void remove(a.id, a.user.name)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-lg leading-none text-muted hover:bg-ice hover:text-navy disabled:opacity-60"
        >
          ×
        </button>
      </li>
    );
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
        <p
          role="note"
          aria-label="Action icon legend"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"
        >
          <span className="inline-flex items-center gap-1">
            <CheckIcon className="text-emerald-600 dark:text-emerald-400" />
            Approve
          </span>
          <span className="inline-flex items-center gap-1">
            <CrossIcon className="text-red-600 dark:text-red-400" />
            Reject
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-[18px] w-4 items-center justify-center text-sm leading-none" aria-hidden>
              ×
            </span>
            Remove
          </span>
        </p>
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
        <div className="space-y-0">
          {groups.map((group, index) => (
            <section key={group.status} aria-label={`${group.status} applications`}>
              {index > 0 ? (
                <div className="my-3 border-t border-border" role="separator" aria-hidden />
              ) : null}
              <ul className="space-y-1.5">{group.items.map(renderRow)}</ul>
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <ApplicantDetailModal applicant={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
