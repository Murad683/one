import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  package?: { id: string; name: string; priceLabel: string } | null;
  latestPayments?: unknown[];
  openTicketCount?: number;
  igUsername?: string | null;
  igBio?: string | null;
  igFollowers?: string | null;
  igFollowing?: string | null;
  igPostsCount?: string | null;
  igProfilePic?: string | null;
  igHighlights?: { title: string; imageUrl: string }[] | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restored, setRestored] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inPortal = pathname.startsWith('/portal');
  const restoreStarted = useRef(false);

  // Only the portal needs to know who is signed in. Public pages skip the
  // /auth/me call (it answered 401 for every anonymous visitor).
  const isLoading = inPortal && !restored;

  // Restore session the first time the portal is reached
  useEffect(() => {
    if (!inPortal || restoreStarted.current) return;
    restoreStarted.current = true;
    (apiClient.get('/auth/me') as Promise<{ data: { user: User } }>)
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setRestored(true);
      });
  }, [inPortal]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password }) as unknown as {
      data: { user: User; token?: string; refreshToken?: string };
    };
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    setUser(res.data.user);
    restoreStarted.current = true;
    setRestored(true);
    navigate('/portal/panel');
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      navigate('/portal');
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me') as unknown as { data: { user: User } };
      setUser(res.data.user);
    } catch {
      // silently fail — user stays as-is
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
