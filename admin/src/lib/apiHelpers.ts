import { api } from './api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
}

export const apiOrigin = () => {
  const baseUrl = api.defaults.baseURL || '';
  return baseUrl.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
};

export const assetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  
  // Local assets (like /videos/hero-bg.mp4) should be returned as-is for the frontend
  if (!url.startsWith('/uploads')) return url;

  return `${apiOrigin()}${url.startsWith('/') ? url : `/${url}`}`;
};

export const uploadImage = async (file: File, folder: 'thumbnails' | 'avatars' | 'images') => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiEnvelope<UploadResult>>(`/uploads/image?folder=${folder}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
};

export const getYoutubeId = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || trimmed;
};

export const requestErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return fallback;
};
