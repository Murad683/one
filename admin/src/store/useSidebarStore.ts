import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const getInitialState = () => {
  const stored = localStorage.getItem('sidebar_collapsed');
  return stored ? JSON.parse(stored) : false;
};

const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: getInitialState(),
  toggleSidebar: () =>
    set((state) => {
      const newState = !state.isCollapsed;
      localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
      return { isCollapsed: newState };
    }),
  setCollapsed: (collapsed: boolean) => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed));
    set({ isCollapsed: collapsed });
  },
}));

export default useSidebarStore;
