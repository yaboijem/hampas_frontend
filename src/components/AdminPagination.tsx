type Props = {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function AdminPagination({
  page,
  lastPage,
  total,
  onPageChange,
}: Props) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <p className="text-xs text-muted">
        Page {page} of {lastPage}
        <span className="mx-1">·</span>
        {total} total
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className="rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
