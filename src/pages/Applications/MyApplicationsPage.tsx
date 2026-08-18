import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelApplication, myApplications } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus, EventItem } from '../../api/types';
import { formatEventWhen } from '../../events/eventLabels';
import { showToast } from '../../lib/adminNotifications';

interface Row {
  id: number;
  status: ApplicationStatus;
  event: EventItem;
}

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton-shimmer h-5 w-2/3 rounded" />
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
        </div>
        <div className="skeleton-shimmer h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    myApplications()
      .then(({ data }) => setRows(data))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const remove = async (eventId: number, applicationId: number) => {
    setError(null);
    setBusyId(applicationId);
    try {
      await cancelApplication(eventId);
      await load();
      showToast('Application removed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete application.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Loading applications">
        <div className="skeleton-shimmer mb-2 h-8 w-56 rounded" />
        <div className="skeleton-shimmer mb-4 h-4 w-40 rounded" />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">My Applications</h1>
        <p className="text-sm text-muted">Events you’ve applied to</p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">You have not applied to any events yet.</p>
          <Link
            to="/events"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            >
              <div className="min-w-0">
                <Link
                  to={`/events/${row.event.id}`}
                  className="font-semibold text-navy hover:text-cobalt hover:underline"
                >
                  {row.event.title}
                </Link>
                <p className="text-sm text-muted">{formatEventWhen(row.event.starts_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={row.status} />
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void remove(row.event.id, row.id)}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
