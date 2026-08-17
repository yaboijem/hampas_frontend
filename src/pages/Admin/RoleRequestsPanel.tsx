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

  useEffect(() => {
    setPage(1);
  }, [role, query]);

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
          <ul className="space-y-3">
            {items.map((r) => (
              <li
                key={r.id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
              >
                <p className="font-display font-bold text-navy">{r.user.name}</p>
                <p className="text-sm text-muted">{r.user.email}</p>
                {r.note ? <p className="mt-1 text-sm text-muted">{r.note}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void approve(r.id)}
                    className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void reject(r.id)}
                    className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
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
    </div>
  );
}
