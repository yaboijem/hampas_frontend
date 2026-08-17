import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../api/types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hampas_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('hampas_token'))
      .finally(() => setLoading(false));
  }, []);

  const signIn = (token: string, nextUser: User) => {
    localStorage.setItem('hampas_token', token);
    setUser(nextUser);
  };

  const signOut = () => {
    localStorage.removeItem('hampas_token');
    setUser(null);
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
