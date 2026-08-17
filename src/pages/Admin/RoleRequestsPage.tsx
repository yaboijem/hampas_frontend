import { useEffect, useState } from 'react';
import {
  approveRoleRequest,
  listAdminRoleRequests,
  rejectRoleRequest,
} from '../../api/admin';
import type { AdminRoleRequest } from '../../api/types';

export default function RoleRequestsPage() {
  const [items, setItems] = useState<AdminRoleRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await listAdminRoleRequests('pending');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Role requests</h1>
      <p className="text-sm text-muted">Approve coach or organizer access.</p>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
            >
              <p className="font-display font-bold text-navy">{r.user.name}</p>
              <p className="text-sm text-muted">{r.user.email}</p>
              <p className="mt-1 text-sm capitalize text-navy">{r.role}</p>
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
      )}
    </div>
  );
}
