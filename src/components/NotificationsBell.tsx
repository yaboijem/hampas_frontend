import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/NotificationsContext';
import { notificationTargetPath } from '../notifications/notificationTargetPath';

export default function NotificationsBell() {
  const { unreadCount, items, markRead, markAllRead, removeNotification } = useNotifications();
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

  const openItem = async (n: (typeof items)[number]) => {
    setOpen(false);
    await markRead([n.id]);
    const path = notificationTargetPath(n);
    if (path) navigate(path);
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy hover:border-cobalt sm:h-11 sm:w-11"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-navy"
        >
          <path
            d="M14.9997 19C14.9997 20.6569 13.6566 22 11.9997 22C10.3429 22 8.99972 20.6569 8.99972 19M13.7962 6.23856C14.2317 5.78864 14.4997 5.17562 14.4997 4.5C14.4997 3.11929 13.3804 2 11.9997 2C10.619 2 9.49972 3.11929 9.49972 4.5C9.49972 5.17562 9.76772 5.78864 10.2032 6.23856M17.9997 11.2C17.9997 9.82087 17.3676 8.49823 16.2424 7.52304C15.1171 6.54786 13.591 6 11.9997 6C10.4084 6 8.8823 6.54786 7.75708 7.52304C6.63186 8.49823 5.99972 9.82087 5.99972 11.2C5.99972 13.4818 5.43385 15.1506 4.72778 16.3447C3.92306 17.7056 3.5207 18.3861 3.53659 18.5486C3.55476 18.7346 3.58824 18.7933 3.73906 18.9036C3.87089 19 4.53323 19 5.85791 19H18.1415C19.4662 19 20.1286 19 20.2604 18.9036C20.4112 18.7933 20.4447 18.7346 20.4629 18.5486C20.4787 18.3861 20.0764 17.7056 19.2717 16.3447C18.5656 15.1506 17.9997 13.4818 17.9997 11.2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
          className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[min(24rem,calc(100dvh-5.5rem))] w-auto origin-top overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-soft sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-96"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
            <p className="text-sm font-semibold text-navy">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-cobalt hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-[min(18rem,calc(100dvh-10rem))] space-y-1 overflow-y-auto sm:max-h-72">
              {recent.map((n) => (
                <li key={n.id} className="flex items-start gap-1">
                  <button
                    type="button"
                    role="menuitem"
                    className={[
                      'min-w-0 flex-1 rounded-[var(--radius-control)] px-2 py-2 text-left text-sm break-words transition hover:bg-ice',
                      n.read_at ? 'text-muted' : 'font-medium text-navy',
                    ].join(' ')}
                    onClick={() => void openItem(n)}
                  >
                    {n.message}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete notification"
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-lg leading-none text-muted hover:bg-ice hover:text-navy"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeNotification(n.id);
                    }}
                  >
                    ×
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
