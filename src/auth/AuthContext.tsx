import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, logout as apiLogout } from '../api/auth';
import type { User } from '../api/types';

function normalizeUser(user: User): User {
  return {
    ...user,
    is_admin: Boolean(user.is_admin),
  };
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: async () => {},
  updateUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(({ user: next }) => setUser(normalizeUser(next)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('hampas:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hampas:unauthorized', onUnauthorized);
  }, []);

  const signIn = (nextUser: User) => {
    setUser(normalizeUser(nextUser));
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch {
      // still clear local session
    }
    setUser(null);
  };

  const updateUser = (nextUser: User) => {
    setUser(normalizeUser(nextUser));
  };

  const refreshUser = async () => {
    const { user: next } = await getMe();
    setUser(normalizeUser(next));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
