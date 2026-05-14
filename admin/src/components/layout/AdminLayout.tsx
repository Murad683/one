import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useSidebarStore from '@/store/useSidebarStore';

const getPageTitle = (pathname: string): string => {
  const path = pathname.split('/')[1] || '';
  
  switch (path) {
    case 'dashboard':
      return 'Dashboard';
    case 'projects':
      return 'Projects';
    case 'packages':
      return 'Packages';
    case 'services':
      return 'Services';
    case 'team':
      return 'Team';
    case 'deliverables':
      return 'Deliverables';
    default:
      return 'Admin Panel';
  }
};

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`transition-all duration-300 ${isCollapsed ? 'md:ml-14' : 'md:ml-60'} flex flex-col min-h-screen`}>
        <Topbar title={title} />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
