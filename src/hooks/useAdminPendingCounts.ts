import { useCallback, useEffect, useRef, useState } from 'react';
import { listAdminEvents, listAdminRoleRequests } from '../api/admin';
import {
  buildIncreaseMessages,
  emptyCounts,
  showToast,
  type AdminPendingCounts,
} from '../lib/adminNotifications';

const POLL_MS = 30_000;

async function fetchCounts(): Promise<AdminPendingCounts> {
  const [roles, events] = await Promise.all([
    listAdminRoleRequests('pending'),
    listAdminEvents('pending_review'),
  ]);
  const coach = roles.filter((r) => r.role === 'coach').length;
  const organizer = roles.filter((r) => r.role === 'organizer').length;
  const eventsCount = events.length;
  return {
    coach,
    organizer,
    events: eventsCount,
    total: coach + organizer + eventsCount,
  };
}

export function useAdminPendingCounts(enabled: boolean): {
  counts: AdminPendingCounts;
  refresh: () => Promise<void>;
  loading: boolean;
} {
  const [counts, setCounts] = useState<AdminPendingCounts>(emptyCounts);
  const [loading, setLoading] = useState(enabled);
  const baselineReady = useRef(false);
  const prevRef = useRef<AdminPendingCounts>(emptyCounts());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await fetchCounts();
      if (baselineReady.current) {
        const msg = buildIncreaseMessages(prevRef.current, next);
        if (msg) showToast(msg);
      } else {
        baselineReady.current = true;
      }
      prevRef.current = next;
      setCounts(next);
    } catch {
      // keep last counts; silent
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      baselineReady.current = false;
      prevRef.current = emptyCounts();
      setCounts(emptyCounts());
      setLoading(false);
      return;
    }

    void refresh();

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, refresh]);

  return { counts, refresh, loading };
}
