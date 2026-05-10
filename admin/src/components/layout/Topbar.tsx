import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';

interface TopbarProps {
  title: string;
}

const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed right-0 top-0 z-10 flex h-14 w-[calc(100%-15rem)] items-center justify-between border-b border-gray-100 bg-white px-8">
      <div>
        <h1 className="text-sm font-medium text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-500">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
