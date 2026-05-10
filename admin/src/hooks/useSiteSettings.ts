import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ApiEnvelope } from '../lib/apiHelpers';

export type SiteSettings = Record<string, string | null>;

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<ApiEnvelope<SiteSettings>>('/site-settings')
      .then(({ data }) => setSettings(data.data))
      .catch(() => setError('Settings could not be loaded.'))
      .finally(() => setIsLoading(false));
  }, []);

  const save = async (partial: Record<string, unknown>) => {
    const { data } = await api.patch<ApiEnvelope<SiteSettings>>('/site-settings', partial);
    setSettings(data.data);
    return data.data;
  };

  const uploadMedia = async (file: File, field: string = 'heroVideoUrl') => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.patch<ApiEnvelope<SiteSettings>>(`/site-settings/upload?field=${field}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setSettings(data.data);
    return data.data;
  };

  return { settings, isLoading, error, save, uploadMedia };
};
