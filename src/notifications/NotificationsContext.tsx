import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteNotification,
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from '../api/notifications';
import type { AppNotification } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { showToast } from '../lib/adminNotifications';

const POLL_MS = 45_000;

type Ctx = {
  unreadCount: number;
  items: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (ids: number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const baselineDone = useRef(false);
  const toastedIds = useRef(new Set<number>());

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        unreadNotificationCount(),
        listNotifications(),
      ]);
      const nextItems = listRes.data;
      setUnreadCount(countRes.count);
      setItems(nextItems);

      const unread = nextItems.filter((n) => !n.read_at);
      if (!baselineDone.current) {
        for (const n of unread) toastedIds.current.add(n.id);
        baselineDone.current = true;
      } else {
        for (const n of unread) {
          if (!toastedIds.current.has(n.id)) {
            toastedIds.current.add(n.id);
            showToast(n.message);
          }
        }
      }
    } catch {
      // silent poll failures
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setItems([]);
      baselineDone.current = false;
      toastedIds.current = new Set();
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      setItems((prev) =>
        prev.map((n) =>
          ids.includes(n.id) && !n.read_at
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - ids.length));
      try {
        await markNotificationsRead({ ids });
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    setUnreadCount(0);
    try {
      await markNotificationsRead({ all: true });
    } catch {
      await refresh();
    }
  }, [refresh]);

  const removeNotification = useCallback(
    async (id: number) => {
      const target = items.find((n) => n.id === id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read_at) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      try {
        await deleteNotification(id);
      } catch {
        await refresh();
      }
    },
    [items, refresh],
  );

  const value = useMemo(
    () => ({
      unreadCount,
      items,
      loading,
      refresh,
      markRead,
      markAllRead,
      removeNotification,
    }),
    [unreadCount, items, loading, refresh, markRead, markAllRead, removeNotification],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications requires NotificationsProvider');
  }
  return ctx;
}
