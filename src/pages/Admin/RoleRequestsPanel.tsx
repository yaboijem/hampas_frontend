import { useEffect, useState } from 'react';
import {
  ADMIN_PAGE_SIZE,
  approveRoleRequest,
  listAdminRoleRequests,
  rejectRoleRequest,
} from '../../api/admin';
import type { AdminRoleRequest, ElevatedRole } from '../../api/types';
import AdminPagination from '../../components/AdminPagination';

type Props = { role: ElevatedRole; query?: string; onChanged?: () => void };

export default function RoleRequestsPanel({
  role,
  query = '',
  onChanged,
}: Props) {
  const [items, setItems] = useState<AdminRoleRequest[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [role, query]);

  useEffect(() => {
    setExpandedId(null);
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await listAdminRoleRequests({
          status: 'pending',
          role,
          q: query,
          page,
          per_page: ADMIN_PAGE_SIZE,
        });
        if (!cancelled) {
          setItems(data.data);
          setLastPage(data.meta.last_page);
          setTotal(data.meta.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load requests.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, query, page]);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      onChanged?.();
      if (items.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else if (items.length <= 1 && page === 1) {
        const data = await listAdminRoleRequests({
          status: 'pending',
          role,
          q: query,
          page: 1,
          per_page: ADMIN_PAGE_SIZE,
        });
        setItems(data.data);
        setLastPage(data.meta.last_page);
        setTotal(data.meta.total);
      }
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
      await rejectRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      onChanged?.();
      if (items.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else if (items.length <= 1 && page === 1) {
        const data = await listAdminRoleRequests({
          status: 'pending',
          role,
          q: query,
          page: 1,
          per_page: ADMIN_PAGE_SIZE,
        });
        setItems(data.data);
        setLastPage(data.meta.last_page);
        setTotal(data.meta.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const empty =
    role === 'coach'
      ? 'No pending coach requests.'
      : 'No pending organizer requests.';
  const emptyCopy = query.trim() ? 'No matching requests.' : empty;

  return (
    <div className="space-y-3">
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
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft">
            {items.map((r) => {
              const open = expandedId === r.id;
              return (
                <li key={r.id} className="bg-surface">
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpandedId(open ? null : r.id)}
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
                              {r.user.name}
                            </span>
                            <span className="truncate text-xs text-muted">{r.user.email}</span>
                          </span>
                          {r.note && !open ? (
                            <span className="mt-0.5 block line-clamp-1 text-xs text-muted">
                              {r.note}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void approve(r.id)}
                        className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void reject(r.id)}
                        className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-2 text-xs font-semibold text-navy disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="space-y-2 border-t border-border/70 bg-ice/50 px-3 py-2.5 sm:px-4">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                        <dt className="text-muted">Name</dt>
                        <dd className="font-medium text-navy">{r.user.name}</dd>
                        <dt className="text-muted">Email</dt>
                        <dd className="break-all font-medium text-navy">{r.user.email}</dd>
                        <dt className="text-muted">Role</dt>
                        <dd className="font-medium capitalize text-navy">{r.role}</dd>
                        <dt className="text-muted">Status</dt>
                        <dd className="font-medium capitalize text-navy">{r.status}</dd>
                        <dt className="text-muted">Requested</dt>
                        <dd className="font-medium text-navy">
                          {new Date(r.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </dd>
                      </dl>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Note
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-navy">
                          {r.note?.trim() ? r.note : 'No note provided.'}
                        </p>
                      </div>
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
    </div>
  );
}
