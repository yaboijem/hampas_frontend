import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastPayload } from '../lib/adminNotifications';

const DISMISS_MS = 4000;

export default function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => subscribeToasts(setToast), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const isError = toast.kind === 'error';

  return (
    <div
      role="status"
      className={[
        'fixed top-4 right-4 z-50 max-w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border px-4 py-3 text-sm font-medium text-white shadow-soft',
        isError
          ? 'border-red-300 bg-red-600'
          : 'border-emerald-200 bg-emerald-600',
      ].join(' ')}
    >
      {toast.message}
    </div>
  );
}
