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
import DeleteEventModal from '../../components/DeleteEventModal';
import {
  SKILL_LABEL,
  formatEventPlace,
  formatEventWhen,
  hostDisplayName,
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [tab, query]);

  useEffect(() => {
    setExpandedId(null);
  }, [page]);

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
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft">
            {items.map((e) => {
              const open = expandedId === e.id;
              return (
                <li key={e.id} className="bg-surface">
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpandedId(open ? null : e.id)}
                      className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35"
                    >
                      <div className="flex min-w-0 items-start gap-1.5">
                        <span
                          className="mt-0.5 shrink-0 text-xs text-muted transition-transform"
                          aria-hidden
                          style={{ transform: open ? 'rotate(90deg)' : undefined }}
                        >
                          ›
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <span className="truncate text-sm font-semibold text-navy">
                              {e.title}
                            </span>
                            {!showActions && !showLiveManage ? (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                {e.visibility === 'live' ? 'Live' : 'Rejected'}
                              </span>
                            ) : null}
                            {showLiveManage ? (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Live
                              </span>
                            ) : null}
                          </span>
                          {!open ? (
                            <>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {typeLabel(e.event_type)}
                                <span className="mx-1 text-border">·</span>
                                {formatEventPlace(e.barangay, e.city)}
                                <span className="mx-1 text-border">·</span>
                                {formatEventWhen(e.starts_at)}
                              </span>
                              <span className="block truncate text-xs text-navy">
                                {e.created_by.name}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {showActions ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() => void approve(e.id)}
                            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() => void reject(e.id)}
                            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-2 text-xs font-semibold text-navy disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {showLiveManage ? (
                        <>
                          <Link
                            to={`/events/${e.id}/edit`}
                            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-2 text-xs font-semibold text-navy"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={busyId === e.id}
                            onClick={() => setDeleteTarget(e)}
                            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-red-200 bg-surface px-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {open ? (
                    <div className="space-y-2 border-t border-border/70 bg-ice/50 px-3 py-2.5 sm:px-4">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                        <dt className="text-muted">Title</dt>
                        <dd className="font-medium text-navy">{e.title}</dd>
                        <dt className="text-muted">Type</dt>
                        <dd className="font-medium text-navy">{typeLabel(e.event_type)}</dd>
                        <dt className="text-muted">Skill</dt>
                        <dd className="font-medium text-navy">
                          {SKILL_LABEL[e.skill_level] ?? e.skill_level}
                        </dd>
                        <dt className="text-muted">When</dt>
                        <dd className="font-medium text-navy">{formatEventWhen(e.starts_at)}</dd>
                        <dt className="text-muted">Where</dt>
                        <dd className="font-medium text-navy">
                          {formatEventPlace(e.barangay, e.city)}
                        </dd>
                        <dt className="text-muted">Host</dt>
                        <dd className="font-medium text-navy">
                          {hostDisplayName(e.created_by.name, e.created_by.roles)}
                        </dd>
                        <dt className="text-muted">Visibility</dt>
                        <dd className="font-medium capitalize text-navy">
                          {e.visibility.replaceAll('_', ' ')}
                        </dd>
                      </dl>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Description
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-navy">
                          {e.description?.trim() ? e.description : 'No description.'}
                        </p>
                      </div>
                      <Link
                        to={`/events/${e.id}`}
                        className="inline-flex text-xs font-semibold text-cobalt hover:underline"
                      >
                        Open event page
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
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
        <DeleteEventModal
          title={deleteTarget.title}
          busy={busyId === deleteTarget.id}
          error={error}
          onCancel={() => {
            if (busyId !== deleteTarget.id) setDeleteTarget(null);
          }}
          onConfirm={() => void remove(deleteTarget.id)}
        />
      ) : null}
    </div>
  );
}
