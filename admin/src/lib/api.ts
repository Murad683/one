import axios from 'axios';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${BACKEND}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor to attach CSRF token and Bearer token
api.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Portal'] = 'admin';
    
    // Attach Bearer token from localStorage
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['x-csrf-token'] = '1';
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    // Prevent infinite loop by not retrying login or refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/login' &&
      originalRequest.url !== '/auth/refresh'
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        
        // Use a fresh axios instance to avoid interceptor loops
        const res = await axios.post(
          `${BACKEND}/api/v1/auth/refresh`,
          { refreshToken },
          {
            withCredentials: true,
            headers: { 
              'x-csrf-token': '1',
              'X-Portal': 'admin'
            }
          }
        );
        
        if (res.data?.success && res.data.data?.token) {
          // Save new tokens
          localStorage.setItem('adminToken', res.data.data.token);
          if (res.data.data.refreshToken) {
            localStorage.setItem('adminRefreshToken', res.data.data.refreshToken);
          }
          
          // Update the failed request with new token and retry
          originalRequest.headers.Authorization = `Bearer ${res.data.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('admin-auth');
        localStorage.removeItem('admin_user');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('admin-auth');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
