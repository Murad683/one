import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Reuse the same PageLoader pattern from App.tsx
const FullScreenLoader = () => (
  <div className="h-screen w-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <div className="animate-pulse flex flex-col items-center">
      <span className="font-heading text-3xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
        ONE<span style={{ color: 'var(--accent-text)' }}>.</span>
      </span>
      <div className="mt-4 w-12 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent" />
    </div>
  </div>
);

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/portal" replace />;
  return <Outlet />;
};

export const AdminRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/portal" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/portal/panel" replace />;
  return <Outlet />;
};
