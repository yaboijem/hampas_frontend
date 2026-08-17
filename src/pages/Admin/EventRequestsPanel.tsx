import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { approveEvent, listAdminEvents, rejectEvent } from '../../api/admin';
import { deleteEvent } from '../../api/events';
import type { EventItem, Visibility } from '../../api/types';
import {
  formatEventPlace,
  formatEventWhen,
  typeLabel,
} from '../../events/eventLabels';

const TABS: { id: Visibility; label: string; empty: string }[] = [
  { id: 'pending_review', label: 'Pending', empty: 'No pending events.' },
  { id: 'live', label: 'Live', empty: 'No live events.' },
  { id: 'rejected', label: 'Rejected', empty: 'No rejected events.' },
];

type Props = { onChanged?: () => void };

export default function EventRequestsPanel({ onChanged }: Props) {
  const [tab, setTab] = useState<Visibility>('pending_review');
  const [items, setItems] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (visibility: Visibility) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminEvents(visibility);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await rejectEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this event?')) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy = TABS.find((t) => t.id === tab)?.empty ?? 'No events.';
  const showActions = tab === 'pending_review';
  const showLiveManage = tab === 'live';

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Event visibility" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={
                selected
                  ? 'rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white'
                  : 'rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy'
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{emptyCopy}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
            >
              <p className="font-display font-bold text-navy">{e.title}</p>
              <p className="text-sm text-muted">{typeLabel(e.event_type)}</p>
              <p className="text-sm text-muted">
                {formatEventPlace(e.barangay, e.city)}
              </p>
              <p className="text-sm text-muted">{formatEventWhen(e.starts_at)}</p>
              <p className="mt-1 text-sm text-navy">{e.created_by.name}</p>
              {!showActions && !showLiveManage ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {e.visibility === 'live' ? 'Live' : 'Rejected'}
                </p>
              ) : null}
              {showActions ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void approve(e.id)}
                    className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void reject(e.id)}
                    className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
              {showLiveManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted">
                    Live
                  </p>
                  <Link
                    to={`/events/${e.id}/edit`}
                    className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void remove(e.id)}
                    className="rounded-[var(--radius-control)] border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
