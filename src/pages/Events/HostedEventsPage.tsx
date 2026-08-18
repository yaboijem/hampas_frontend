import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listHostedEvents } from '../../api/events';
import type { EventItem } from '../../api/types';
import { formatEventPlace, formatEventWhen } from '../../events/eventLabels';

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton-shimmer h-5 w-2/3 rounded" />
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
        </div>
        <div className="skeleton-shimmer h-9 w-24 rounded" />
      </div>
    </div>
  );
}

export default function HostedEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listHostedEvents()
      .then((res) => {
        if (!cancelled) setEvents(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hosted events.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Loading hosted events">
        <div className="skeleton-shimmer mb-2 h-8 w-48 rounded" />
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">Hosted events</h1>
        <p className="text-sm text-muted">Events you created</p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">You haven&apos;t hosted any events yet.</p>
          <Link
            to="/events/new"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
          >
            Create event
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const place = formatEventPlace(event.barangay, event.city);
            const when = formatEventWhen(event.starts_at);
            return (
              <li
                key={event.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      to={`/events/${event.id}`}
                      className="font-semibold text-navy hover:text-cobalt hover:underline"
                    >
                      {event.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {when}
                      {place ? ` · ${place}` : ''}
                    </p>
                    {event.visibility !== 'live' && (
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        {event.visibility === 'pending_review' ? 'Pending review' : 'Rejected'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-medium text-navy hover:border-cobalt"
                    >
                      View
                    </Link>
                    <Link
                      to={`/events/${event.id}/applications`}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-medium text-navy hover:border-cobalt"
                    >
                      Manage applications
                    </Link>
                    <Link
                      to={`/events/${event.id}/edit`}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-medium text-navy hover:border-cobalt"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
