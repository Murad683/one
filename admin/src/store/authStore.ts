import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
}

interface ApiEnvelope<T> {
  data: T;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: localStorage.getItem('token'),
      login: async (email, password) => {
        const response = await api.post<ApiEnvelope<{ user: User; token: string }>>('/auth/login', {
          email,
          password,
        });
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      fetchMe: async () => {
        const response = await api.get<ApiEnvelope<{ user: User }>>('/auth/me');
        set({ user: response.data.data.user });
      },
    }),
    { name: 'admin-auth' },
  ),
);
