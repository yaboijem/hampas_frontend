import { useEffect, useState } from 'react';
import {
  approveRoleRequest,
  listAdminRoleRequests,
  rejectRoleRequest,
} from '../../api/admin';
import type { AdminRoleRequest, ElevatedRole } from '../../api/types';

type Props = { role: ElevatedRole; onChanged?: () => void };

export default function RoleRequestsPanel({ role, onChanged }: Props) {
  const [items, setItems] = useState<AdminRoleRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await listAdminRoleRequests('pending');
        if (!cancelled) setItems(data.filter((r) => r.role === role));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load requests.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
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
      await rejectRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
      onChanged?.();
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
        <p className="text-sm text-muted">{empty}</p>
      ) : (
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
      )}
    </div>
  );
}
