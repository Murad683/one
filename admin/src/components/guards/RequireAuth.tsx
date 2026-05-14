import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const RequireAuth = () => {
  const token = useAuthStore((state) => state.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export const RequireAdmin = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [isLoading, setIsLoading] = useState(Boolean(token && !user));

  useEffect(() => {
    if (!token || user) {
      setIsLoading(false);
      return;
    }

    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe, token, user]);

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
};
