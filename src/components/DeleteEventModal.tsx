import { useEffect } from 'react';

interface Props {
  title: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteEventModal({
  title,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-safe-max-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-event-title"
        aria-describedby="delete-event-message"
        className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-navy shadow-soft sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 id="delete-event-title" className="font-display text-lg font-bold tracking-tight">
            Delete event
          </h2>
          <p id="delete-event-message" className="text-sm text-muted">
            Are you sure you want to delete this event
            {title ? (
              <>
                {' '}
                <span className="font-semibold text-navy">“{title}”</span>
              </>
            ) : null}
            ? This cannot be undone.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:border-cobalt disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
