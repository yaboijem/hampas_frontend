import type { ApplicationStatus } from '../api/types';

const STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`rounded px-2 py-1 text-sm ${STYLES[status]}`}>{status}</span>;
}
