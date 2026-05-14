import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Package, Layers, Users, FileVideo, Settings, MessageSquare, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useSidebarStore from '@/store/useSidebarStore';

const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar, isMobileOpen, setMobileOpen } = useSidebarStore();
  const { user } = useAuthStore();

  const navLinks = [
    { label: 'İdarəetmə Paneli', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Portfolio', href: '/projects', icon: FolderOpen },
    { label: 'Xidmətlər', href: '/services', icon: Layers },
    { label: 'Paketlər', href: '/packages', icon: Package },
    { label: 'Komandamız', href: '/team-members', icon: Users },
    ...(user?.role === 'SUPER_ADMIN' ? [{ label: 'Komanda', href: '/team', icon: UserCheck }] : []),
    { label: 'Müştərilər', href: '/users', icon: UserCheck },
    { label: 'Layihə Faylları', href: '/deliverables', icon: FileVideo },
    { label: 'Mesajlar', href: '/messages', icon: MessageSquare },
    { label: 'Veb-sayt Ayarları', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full border-r border-gray-100 bg-white transition-all duration-300 flex flex-col z-50 ${
          isCollapsed ? 'md:w-14' : 'md:w-60'
        } ${
          isMobileOpen ? 'w-64 translate-x-0' : 'w-60 -translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'md:px-2' : ''}`}>
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Logo" className="h-7 w-auto rounded-sm object-contain" />
              <div>
                <h2 className="text-sm font-bold tracking-tighter text-gray-900">
                  ONE<span className="text-blue-600">.</span>
                </h2>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Admin</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto overflow-hidden rounded-sm">
              <img src="/logo.jpg" alt="Logo" className="h-6 w-auto object-contain" />
            </div>
          )}
          
          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 md:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center rounded-lg py-2 transition-colors duration-150 ${
                    (isCollapsed && !isMobileOpen) ? 'md:justify-center px-0' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
                title={(isCollapsed && !isMobileOpen) ? link.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                    {(!isCollapsed || isMobileOpen) && <span>{link.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-3 hidden md:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title={isCollapsed ? "Genişləndir" : "Bağla"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
