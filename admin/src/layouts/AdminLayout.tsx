import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  UserCircle,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

const settingsItems: NavItem[] = [
  { icon: Settings, label: 'Veb-sayt Ayarları', path: '/settings' },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const unreadCount = useMessageStore((state) => state.unreadCount);
  const fetchUnreadCount = useMessageStore((state) => state.fetchUnreadCount);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchUnreadCount().catch(() => {
      if (isMounted) useMessageStore.getState().setUnreadCount(0);
    });

    return () => {
      isMounted = false;
    };
  }, [fetchUnreadCount]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {/* ── Mobile Top Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Logo" className="h-7 w-auto rounded-sm object-contain" />
          <h2 className="text-sm font-bold tracking-tighter">
            ONE<span className="text-blue-600">.</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Mobile Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out',
          'md:translate-x-0 md:w-60',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 md:h-16 items-center gap-3 border-b border-slate-200 px-5">
          <img src="/logo.jpg" alt="Logo" className="h-8 w-auto rounded-sm object-contain" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tighter">
              ONE<span className="text-blue-600">.</span>
            </h2>
            <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-minimal">
          <div className="space-y-1">
            <SidebarLink item={{ icon: LayoutDashboard, label: 'İdarəetmə Paneli', path: '/' }} />
            <SidebarLink item={{ icon: Briefcase, label: 'Portfolio', path: '/portfolio' }} />
            <SidebarLink item={{ icon: Wrench, label: 'Xidmətlər', path: '/services' }} />
            <SidebarLink item={{ icon: Package, label: 'Paketlər', path: '/packages' }} />
            <SidebarLink item={{ icon: Users, label: 'Komandamız', path: '/team-members' }} />
            
            {user?.role === 'SUPER_ADMIN' && (
              <SidebarLink item={{ icon: UserCircle, label: 'Komanda', path: '/team' }} />
            )}
            
            <SidebarLink item={{ icon: UserCircle, label: 'Müştərilər', path: '/users' }} />
            <SidebarLink item={{ icon: FolderOpen, label: 'Layihə Faylları', path: '/deliverables' }} />
            <SidebarLink item={{ icon: LifeBuoy, label: 'Sorğular', path: '/tickets' }} />
            <SidebarLink
              item={{
                icon: MessageSquare,
                label: 'Mesajlar',
                path: '/messages',
                badge: unreadCount,
              }}
            />
          </div>

          <div className="my-5 border-t border-slate-200 pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">
              Ayarlar
            </p>
            <div className="space-y-1">
              {settingsItems.map((item) => (
                <SidebarLink key={item.path} item={item} />
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Çıxış</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="min-h-screen pt-14 md:pt-0 md:ml-60">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:px-8 md:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        [
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
      title={item.label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
      {Boolean(item.badge) && (
        <span className="ml-auto min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-semibold leading-5 text-white">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};
