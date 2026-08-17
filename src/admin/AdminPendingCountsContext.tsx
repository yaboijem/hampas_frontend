import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';
import {
  emptyCounts,
  type AdminPendingCounts,
} from '../lib/adminNotifications';
import { ensureAdminPushRegistration } from '../push/adminPush';

type Ctx = {
  counts: AdminPendingCounts;
  refresh: () => Promise<void>;
  loading: boolean;
};

const AdminPendingCountsContext = createContext<Ctx>({
  counts: emptyCounts(),
  refresh: async () => {},
  loading: false,
});

export function AdminPendingCountsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = user?.is_admin === true;
  const value = useAdminPendingCounts(enabled);

  useEffect(() => {
    if (enabled) void ensureAdminPushRegistration();
  }, [enabled]);

  return (
    <AdminPendingCountsContext.Provider value={value}>
      {children}
    </AdminPendingCountsContext.Provider>
  );
}

export function useAdminPendingCountsContext(): Ctx {
  return useContext(AdminPendingCountsContext);
}
