import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

const getInitialState = () => {
  const stored = localStorage.getItem('sidebar_collapsed');
  return stored ? JSON.parse(stored) : false;
};

const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: getInitialState(),
  isMobileOpen: false,
  toggleSidebar: () =>
    set((state) => {
      const newState = !state.isCollapsed;
      localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
      return { isCollapsed: newState };
    }),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  setCollapsed: (collapsed: boolean) => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed));
    set({ isCollapsed: collapsed });
  },
  setMobileOpen: (open: boolean) => set({ isMobileOpen: open }),
}));

export default useSidebarStore;
