import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { approveApplication, listEventApplications, rejectApplication } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus } from '../../api/types';

interface Applicant { id: number; user: { id: number; name: string }; status: ApplicationStatus }

export default function EventApplicationsPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listEventApplications(eventId)
      .then(({ data }) => setApplicants(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load applications.'));

  useEffect(() => {
    void load();
  }, [eventId]);

  const decide = async (applicationId: number, status: 'approved' | 'rejected') => {
    setError(null);
    if (status === 'approved') {
      await approveApplication(eventId, applicationId);
    } else {
      await rejectApplication(eventId, applicationId);
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <h1 className="text-2xl font-bold">Applications</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {applicants.length === 0 && <p>No applications yet.</p>}
      {applicants.map((a) => (
        <div key={a.id} className="flex items-center justify-between border p-4">
          <span className="font-semibold">{a.user.name}</span>
          <div className="flex items-center gap-3">
            <StatusBadge status={a.status} />
            {a.status === 'pending' && (
              <>
                <button onClick={() => decide(a.id, 'approved')} className="bg-green-700 px-3 py-1 text-white">Approve</button>
                <button onClick={() => decide(a.id, 'rejected')} className="bg-red-700 px-3 py-1 text-white">Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
