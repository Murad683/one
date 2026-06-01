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

export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return '/placeholder.jpg';
  }
  return url;
};

export const assetUrl = (url?: string | null) => {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) return '';
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) return sanitized;
  
  if (sanitized.startsWith('/videos/') || sanitized === '/logo.jpg') return sanitized;

  let cleanUrl = sanitized.replace(/\\/g, '/');
  if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.replace('uploads/', '');
  else if (cleanUrl.startsWith('/uploads/')) cleanUrl = cleanUrl.replace('/uploads/', '');

  if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);

  const baseUrl = api.defaults.baseURL || '';
  let url = `${baseUrl}/uploads/${cleanUrl}?portal=admin`;
  const token = localStorage.getItem('adminToken');
  if (token) {
    url += `&adminToken=${token}`;
  }
  return sanitizeUrl(url);
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
