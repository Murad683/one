import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Signed out (no tokens at all): go straight to the login page instead of sending a request that can only 401.
const hasSession = (): boolean =>
  !!(localStorage.getItem('adminToken') || localStorage.getItem('adminRefreshToken'));

export const RequireAuth = () => {
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [isLoading, setIsLoading] = useState(hasSession);

  useEffect(() => {
    if (!hasSession()) {
      useAuthStore.setState({ user: null });
      return;
    }
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  if (!hasSession()) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="p-6 text-sm text-muted">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export const RequireAdmin = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [isLoading, setIsLoading] = useState(hasSession);

  useEffect(() => {
    if (!hasSession()) {
      useAuthStore.setState({ user: null });
      return;
    }
    if (user) {
      setIsLoading(false);
      return;
    }

    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe, user]);

  if (!hasSession()) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="p-6 text-sm text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Creators (videographers) only get the deliverables page.
  if (user.role === 'CREATOR') {
    return location.pathname === '/deliverables' ? <Outlet /> : <Navigate to="/deliverables" replace />;
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
};
