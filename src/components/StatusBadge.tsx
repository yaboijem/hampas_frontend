import type { ApplicationStatus } from '../api/types';

const LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STYLES: Record<ApplicationStatus, string> = {
  pending: 'border border-amber-500/25 bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
  approved: 'border border-cobalt/20 bg-sky-tint text-chip-text',
  rejected: 'border border-border bg-ice text-muted',
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
