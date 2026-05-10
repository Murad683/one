import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export const useSiteSettings = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/site-settings')
      .then((res: any) => setData(res.data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};

export const useProjects = (featuredOnly = false) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const url = featuredOnly ? '/projects/featured' : '/projects';
    apiClient.get(url)
      .then((res: any) => {
        const items = featuredOnly ? res.data : res.data.items;
        setData(items);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [featuredOnly]);

  return { data, loading, error };
};

export const useTeam = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/team')
      .then((res: any) => setData(res.data.items))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};

export const useServices = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/services')
      .then((res: any) => setData(res.data.items))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};

export const usePackages = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/packages')
      .then((res: any) => setData(res.data.items))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};
