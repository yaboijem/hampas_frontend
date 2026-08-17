import { useEffect, useState } from 'react';
import { subscribeToasts } from '../lib/adminNotifications';

const DISMISS_MS = 4000;

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeToasts(setMessage), []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm font-medium text-navy shadow-soft"
    >
      {message}
    </div>
  );
}
