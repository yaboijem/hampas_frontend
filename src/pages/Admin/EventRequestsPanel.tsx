import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ADMIN_PAGE_SIZE,
  approveEvent,
  listAdminEvents,
  rejectEvent,
} from '../../api/admin';
import { deleteEvent } from '../../api/events';
import type { EventItem, Visibility } from '../../api/types';
import AdminPagination from '../../components/AdminPagination';
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

type Props = { query?: string; onChanged?: () => void };

export default function EventRequestsPanel({
  query = '',
  onChanged,
}: Props) {
  const [tab, setTab] = useState<Visibility>('pending_review');
  const [items, setItems] = useState<EventItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [tab, query]);

  const load = useCallback(
    async (visibility: Visibility, pageNum: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAdminEvents({
          visibility,
          q,
          page: pageNum,
          per_page: ADMIN_PAGE_SIZE,
        });
        setItems(data.data);
        setLastPage(data.meta.last_page);
        setTotal(data.meta.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(tab, page, query);
  }, [tab, page, query, load]);

  const afterRemove = async () => {
    onChanged?.();
    if (items.length <= 1 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    await load(tab, page, query);
  };

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
      await afterRemove();
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
      await afterRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteEvent(id);
      setDeleteTarget(null);
      setItems((list) => list.filter((e) => e.id !== id));
      await afterRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy = TABS.find((t) => t.id === tab)?.empty ?? 'No events.';
  const showActions = tab === 'pending_review';
  const showLiveManage = tab === 'live';
  const listEmptyCopy = query.trim() ? 'No matching events.' : emptyCopy;

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
        <p className="text-sm text-muted">{listEmptyCopy}</p>
      ) : (
        <>
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
                      onClick={() => setDeleteTarget(e)}
                      className="rounded-[var(--radius-control)] border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <AdminPagination
            page={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
          aria-describedby="delete-event-message"
        >
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-navy shadow-soft">
            <h2 id="delete-event-title" className="font-display text-lg font-bold">
              Delete event
            </h2>
            <p id="delete-event-message" className="text-sm text-muted">
              Are you sure you want to delete this event
              {deleteTarget.title ? (
                <>
                  {' '}
                  <span className="font-semibold text-navy">“{deleteTarget.title}”</span>
                </>
              ) : null}
              ?
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => setDeleteTarget(null)}
                className="rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => void remove(deleteTarget.id)}
                className="rounded-[var(--radius-control)] bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
