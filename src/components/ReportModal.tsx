import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportReasons, submitReport } from '../api/reports';
import { useAuth } from '../auth/AuthContext';

interface Props {
  targetType: 'user' | 'event';
  targetId: number;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  fake_event: 'Fake event',
  fake_organizer: 'Fake organizer',
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  harassment: 'Harassment',
  other: 'Other',
};

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reasons, setReasons] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    getReportReasons()
      .then(({ reasons }) => {
        setReasons(reasons);
        setReason(reasons[0] ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reasons.'));
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({ target_type: targetType, target_id: targetId, reason, details: details || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" role="dialog" aria-label="Report">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-navy shadow-soft">
        <h2 className="text-lg font-bold">Report this {targetType}</h2>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <label className="block">
          Reason
          <select className="block w-full border p-2" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
            {reasons.map((r) => <option key={r} value={r}>{LABELS[r] ?? r}</option>)}
          </select>
        </label>
        <label className="block">
          Details
          <textarea className="block w-full border p-2" value={details} onChange={(e) => setDetails(e.target.value)} aria-label="Details" />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="border px-4 py-2">Cancel</button>
          <button type="submit" disabled={submitting} className="bg-red-700 px-4 py-2 text-white">Submit report</button>
        </div>
      </form>
    </div>
  );
}
