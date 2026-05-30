import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PortalSidebar from './PortalSidebar';
import { LayoutDashboard, FolderOpen, CreditCard, MessageCircle, LogOut, Sun, Moon } from 'lucide-react';
import ProfileSettingsModal from '../ui/ProfileSettingsModal';

const mobileNavItems = [
  { to: '/portal/panel', icon: LayoutDashboard, label: 'İcmal' },
  { to: '/portal/panel/deliverables', icon: FolderOpen, label: 'Çatdırılmalar' },
  { to: '/portal/panel/billing', icon: CreditCard, label: 'Ödənişlər' },
  { to: '/portal/panel/support', icon: MessageCircle, label: 'Dəstək' },
];

const PortalLayout = () => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme(); // Corrected: theme is not used
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <PortalSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-5 py-3.5 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Link
            to="/"
            className="font-heading text-lg font-bold tracking-tighter"
            style={{ color: 'var(--text-primary)' }}
          >
            ONE<span style={{ color: 'var(--accent-text)' }}>.</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-faint)' }}
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] cursor-pointer hover:underline"
                style={{ color: 'var(--text-faint)' }}
                onClick={() => setIsProfileModalOpen(true)}
              >
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-faint)' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <Outlet />

        {/* Mobile Bottom Nav */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around py-2.5 border-t backdrop-blur-md"
          style={{
            backgroundColor: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          {mobileNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/portal/panel'}
              className="flex flex-col items-center gap-1 py-1 px-2"
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent-text)' : 'var(--text-ghost)',
              })}
            >
              <Icon size={18} />
              <span className="text-[9px] tracking-wide font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profile Settings Modal */}
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      </main>
    </div>
  );
};

export default PortalLayout;
