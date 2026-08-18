import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/NotificationsContext';

export default function NotificationsBell() {
  const { unreadCount, items, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const recent = items.slice(0, 10);
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (id: number, eventId?: number) => {
    setOpen(false);
    await markRead([id]);
    if (eventId) navigate(`/events/${eventId}`);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy hover:border-cobalt"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className="text-lg leading-none">
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cobalt px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-soft"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
            <p className="text-sm font-semibold text-navy">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-cobalt hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={[
                      'w-full rounded-[var(--radius-control)] px-2 py-2 text-left text-sm transition hover:bg-ice',
                      n.read_at ? 'text-muted' : 'font-medium text-navy',
                    ].join(' ')}
                    onClick={() => void openItem(n.id, n.data?.event_id)}
                  >
                    {n.message}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/me/notifications"
            role="menuitem"
            className="mt-2 block rounded-[var(--radius-control)] px-2 py-2 text-center text-sm font-semibold text-cobalt hover:bg-sky-tint"
            onClick={() => setOpen(false)}
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
