import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelApplication, myApplications } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus, EventItem } from '../../api/types';

interface Row { id: number; status: ApplicationStatus; event: EventItem }

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    myApplications()
      .then(({ data }) => setRows(data))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const cancel = async (eventId: number) => {
    await cancelApplication(eventId);
    await load();
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <h1 className="text-2xl font-bold">My Applications</h1>
      {rows.length === 0 && <p>You have not applied to any events yet.</p>}
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between border p-4">
          <div>
            <Link to={`/events/${row.event.id}`} className="font-semibold hover:underline">{row.event.title}</Link>
            <p className="text-sm text-gray-600">{new Date(row.event.starts_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={row.status} />
            {row.status === 'pending' && (
              <button onClick={() => cancel(row.event.id)} className="border px-3 py-1">Cancel</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
