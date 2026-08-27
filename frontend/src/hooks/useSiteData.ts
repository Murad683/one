import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';

// A signed media URL stays valid for ~1 day (backend PRESIGNED_URL_TTL_SECONDS),
// so re-pulling site data every 30 min while a tab is refocused is enough to keep
// its embedded image/video URLs fresh without any real cost (tiny JSON payloads).
const STALE_MS = 30 * 60 * 1000;

// Collapses the many independent mounts of the same hook on one page (e.g.
// useSiteSettings is used by the loader, navbar, footer, hero, portal layout…)
// into a single in-flight request. Cleared as soon as the request settles, so a
// later refetch always hits the network again.
const inFlight = new Map<string, Promise<any>>();

function sharedGet(url: string): Promise<any> {
  const existing = inFlight.get(url);
  if (existing) return existing;
  const p = apiClient
    .get(url)
    .finally(() => {
      inFlight.delete(url);
    });
  inFlight.set(url, p);
  return p;
}

interface Resource<T> {
  data: T;
  loading: boolean;
  error: any;
  refetch: () => Promise<void>;
}

function useApiResource<T>(url: string, pick: (res: any) => T, initial: T): Resource<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const lastFetched = useRef(0);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await sharedGet(url);
      if (!mounted.current) return;
      setData(pick(res));
      setError(null);
      lastFetched.current = Date.now();
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // pick is defined inline by each caller and is effectively stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => {
      mounted.current = false;
    };
  }, [refetch]);

  useEffect(() => {
    const revalidate = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetched.current > STALE_MS
      ) {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('focus', revalidate);
    return () => {
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('focus', revalidate);
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}

export const useSiteSettings = () =>
  useApiResource<any>('/site-settings', (res) => res.data, null);

export const useProjects = (featuredOnly = false) =>
  useApiResource<any[]>(
    featuredOnly ? '/projects/featured' : '/projects',
    (res) => (featuredOnly ? res.data : res.data.items),
    []
  );

export const useTeam = () =>
  useApiResource<any[]>('/team', (res) => res.data.items, []);

export const useServices = () =>
  useApiResource<any[]>('/services', (res) => res.data.items, []);

export const usePackages = () =>
  useApiResource<any[]>('/packages', (res) => res.data.items, []);
