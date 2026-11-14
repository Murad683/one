import { create } from 'zustand';
import { api } from '../lib/api';

interface UnansweredCountResponse {
  count: number;
}

interface ReplyState {
  unansweredCount: number;
  fetchUnansweredCount: () => Promise<void>;
}

export const useReplyStore = create<ReplyState>((set) => ({
  unansweredCount: 0,
  fetchUnansweredCount: async () => {
    const response = await api.get<UnansweredCountResponse>('/deliverables/unanswered-count');
    set({ unansweredCount: response.data.count });
  },
}));
