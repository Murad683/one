import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Package, Layers, Users, FileVideo, Settings, MessageSquare, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import useSidebarStore from '@/store/useSidebarStore';

const navLinks = [
  { label: 'İdarəetmə Paneli', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Portfolio', href: '/projects', icon: FolderOpen },
  { label: 'Xidmətlər', href: '/services', icon: Layers },
  { label: 'Paketlər', href: '/packages', icon: Package },
  { label: 'Komandamız', href: '/team', icon: Users },
  { label: 'Müştərilər', href: '/users', icon: UserCheck },
  { label: 'Layihə Faylları', href: '/deliverables', icon: FileVideo },
  { label: 'Mesajlar', href: '/messages', icon: MessageSquare },
  { label: 'Veb-sayt Ayarları', href: '/settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-full border-r border-gray-100 bg-white transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-14' : 'w-60'
      }`}
    >
      <div className={`p-6 flex items-center justify-center ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Baku Tech</h2>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-900 text-white font-bold">
            B
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                `flex items-center rounded-lg py-2 transition-colors duration-150 ${
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              title={isCollapsed ? link.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                  {!isCollapsed && <span>{link.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
