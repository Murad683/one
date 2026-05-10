import { create } from 'zustand';
import { api } from '../lib/api';

interface UnreadCountResponse {
  count: number;
}

interface MessageState {
  unreadCount: number;
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  unreadCount: 0,
  fetchUnreadCount: async () => {
    const response = await api.get<UnreadCountResponse>('/contact-submissions/unread-count');
    set({ unreadCount: response.data.count });
  },
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
