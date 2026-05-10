const BACKEND_URL = 'http://localhost:5000';

export const assetUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  
  // Only prepend BACKEND_URL for uploaded content (paths starting with /uploads)
  // Local assets (like /videos/hero-bg.mp4) should be returned as-is for the frontend
  if (!path.startsWith('/uploads')) return path;
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
};
