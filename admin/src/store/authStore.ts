import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'CLIENT';
}

interface ApiEnvelope<T> {
  data: T;
}

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        const response = await api.post<ApiEnvelope<{ user: User; token?: string; refreshToken?: string }>>('/auth/login', {
          email,
          password,
        });
        const { user, token, refreshToken } = response.data.data;
        if (token) localStorage.setItem('adminToken', token);
        if (refreshToken) localStorage.setItem('adminRefreshToken', refreshToken);
        set({ user });
      },
      logout: () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        set({ user: null });
      },
      fetchMe: async () => {
        const response = await api.get<ApiEnvelope<{ user: User }>>('/auth/me');
        set({ user: response.data.data.user });
      },
    }),
    { name: 'admin-auth' },
  ),
);
