import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../notifications/NotificationsContext';

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead, removeNotification, loading } =
    useNotifications();
  const navigate = useNavigate();

  const openItem = async (id: number, eventId?: number) => {
    await markRead([id]);
    if (eventId) navigate(`/events/${eventId}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">
            Notifications
          </h1>
          <p className="text-sm text-muted">Application decisions and updates</p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:border-cobalt"
          >
            Mark all read
          </button>
        ) : null}
      </header>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted" role="status">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">You&apos;re all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={[
                'flex items-start gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-3 shadow-soft sm:px-4',
                n.read_at ? 'opacity-80' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => void openItem(n.id, n.data?.event_id)}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={
                    n.read_at
                      ? 'text-sm break-words text-muted'
                      : 'text-sm font-medium break-words text-navy'
                  }
                >
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </button>
              <button
                type="button"
                aria-label="Delete notification"
                onClick={() => void removeNotification(n.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-xl leading-none text-muted hover:bg-ice hover:text-navy"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
