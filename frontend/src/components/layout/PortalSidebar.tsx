import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LayoutDashboard, FolderOpen, CreditCard, MessageCircle, LogOut, User, Sun, Moon } from 'lucide-react';

const navItems = [
  { to: '/portal/panel', icon: LayoutDashboard, label: 'İcmal' },
  { to: '/portal/panel/deliverables', icon: FolderOpen, label: 'Çatdırılmalar' },
  { to: '/portal/panel/billing', icon: CreditCard, label: 'Ödənişlər' },
  { to: '/portal/panel/support', icon: MessageCircle, label: 'Dəstək' },
];

const PortalSidebar = () => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme(); // Corrected: theme is not used

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 border-r backdrop-blur-sm transition-colors duration-300"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Brand */}
      <div className="px-6 pt-8 pb-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <NavLink to="/">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-7 w-auto object-contain rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = document.createElement('span');
                fallback.className = 'font-heading text-xl font-bold tracking-tighter';
                fallback.innerHTML = 'ONE<span style="color: var(--accent-text)">.</span>';
                fallback.style.color = 'var(--text-primary)';
                parent.appendChild(fallback);
              }
            }}
          />
        </NavLink>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-faint)' }}
        >
          {isDark ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/portal/panel'}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200"
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--glow-accent-subtle)' : 'transparent',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div
        className="px-4 py-5 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <User size={14} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.name}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-ghost)' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-faint)' }}
            title="Çıxış"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PortalSidebar;
