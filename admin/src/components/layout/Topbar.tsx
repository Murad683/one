import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import useSidebarStore from '@/store/useSidebarStore';

interface TopbarProps {
  title: string;
}

const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useSidebarStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-gray-100 bg-white px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-medium text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <span className="hidden text-sm text-gray-500 sm:inline">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Çıxış</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
