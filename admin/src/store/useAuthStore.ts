import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start in a loading state until hydration runs

  login: (token: string, user: User) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem('admin_token');
      const userStr = localStorage.getItem('admin_user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          set({ user, token, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch (e) {
      console.error('Failed to hydrate auth state from localStorage', e);
    }

    // Default: Clear state and storage if anything is invalid or missing
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));

export default useAuthStore;
