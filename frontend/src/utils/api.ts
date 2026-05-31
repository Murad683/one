const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return '/placeholder.jpg';
  }
  if (!lower.startsWith('https://') && !lower.startsWith('/')) {
    // If we are on localhost, we might want to allow http, but strict rule says https
    if (lower.startsWith('http://localhost') || lower.startsWith('http://127.0.0.1')) {
      return url;
    }
    return '/placeholder.jpg';
  }
  return url;
};

export const assetUrl = (path?: string | null) => {
  const sanitizedPath = sanitizeUrl(path);
  if (!sanitizedPath) return '';
  if (sanitizedPath.startsWith('http')) return sanitizedPath;
  
  if (!sanitizedPath.startsWith('/uploads')) return sanitizedPath;
  
  const normalizedPath = sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`;
  return sanitizeUrl(`${BACKEND_URL}${normalizedPath}`);
};
