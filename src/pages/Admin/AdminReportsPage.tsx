import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminReports, type AdminReport } from '../../api/reports';
import AdminPagination from '../../components/AdminPagination';
import { reportReasonLabel } from '../../content/reportReasons';
import { getApiErrorMessage } from '../../lib/apiError';

export default function AdminReportsPage() {
  const [items, setItems] = useState<AdminReport[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAdminReports({ page })
      .then((data) => {
        if (cancelled) return;
        setItems(data.data);
        setLastPage(data.meta.last_page);
        setTotal(data.meta.total);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Failed to load reports.'));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Reports</h1>
      <p className="text-sm text-muted">Review user-submitted reports (read-only).</p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-muted" role="status">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No reports yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-navy">{reportReasonLabel(r.reason)}</p>
                <time className="text-xs text-muted" dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted">
                Reporter: <span className="text-navy">{r.reporter.name}</span>
              </p>
              <p className="mt-1 text-sm">
                Target:{' '}
                {r.target_type === 'event' ? (
                  <Link
                    to={`/events/${r.target_id}`}
                    className="font-semibold text-cobalt underline-offset-2 hover:underline"
                  >
                    Event #{r.target_id}
                  </Link>
                ) : (
                  <span className="font-semibold text-navy">User #{r.target_id}</span>
                )}
              </p>
              {r.details ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-navy">{r.details}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <AdminPagination page={page} lastPage={lastPage} total={total} onPageChange={setPage} />
    </div>
  );
}
