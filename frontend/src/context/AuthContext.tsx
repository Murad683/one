import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    (apiClient.get('/auth/me') as Promise<{ data: { user: User } }>)
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password }) as unknown as {
      data: { token: string; user: User };
    };
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    navigate('/portal/panel');
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
    navigate('/portal');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
