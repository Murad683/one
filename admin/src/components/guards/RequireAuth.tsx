import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const RequireAuth = () => {
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export const RequireAdmin = () => {
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(false);
      return;
    }

    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe, user]);

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
};
