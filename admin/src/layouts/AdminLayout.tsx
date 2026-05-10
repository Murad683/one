import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  UserCircle,
  Users,
  Wrench,
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

const primaryItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Briefcase, label: 'Portfolio', path: '/portfolio' },
  { icon: Wrench, label: 'Services', path: '/services' },
  { icon: Package, label: 'Packages', path: '/packages' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: UserCircle, label: 'Clients', path: '/users' },
  { icon: FolderOpen, label: 'Deliverables', path: '/deliverables' },
];

const settingsItems: NavItem[] = [
  { icon: Settings, label: 'Global Settings', path: '/settings' },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const unreadCount = useMessageStore((state) => state.unreadCount);
  const fetchUnreadCount = useMessageStore((state) => state.fetchUnreadCount);

  useEffect(() => {
    let isMounted = true;

    fetchUnreadCount().catch(() => {
      if (isMounted) useMessageStore.getState().setUnreadCount(0);
    });

    return () => {
      isMounted = false;
    };
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-slate-200 bg-white md:w-60">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-3 md:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
            BT
          </div>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold">Baku Tech</p>
            <p className="truncate text-xs text-slate-500">{user?.name || 'Admin'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {primaryItems.map((item) => (
              <SidebarLink key={item.path} item={item} />
            ))}
            <SidebarLink
              item={{
                icon: MessageSquare,
                label: 'Messages',
                path: '/messages',
                badge: unreadCount,
              }}
            />
          </div>

          <div className="my-5 border-t border-slate-200 pt-4">
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase text-slate-400 md:block">
              Settings
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
            className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 md:justify-start"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-16 min-h-screen md:ml-60">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
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
          'relative flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition md:justify-start',
          isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        ].join(' ')
      }
      title={item.label}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">{item.label}</span>
      {Boolean(item.badge) && (
        <span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-semibold leading-5 text-white md:static md:ml-auto">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};
