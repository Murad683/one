import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = BACKEND_URL + '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach CSRF token and Bearer token
apiClient.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Portal'] = 'client';
    
    // Attach Bearer token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['x-csrf-token'] = '1';
  }
  return config;
});

// Response interceptor for easy data access
apiClient.interceptors.response.use(
  (response) => response.data,
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
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Use a fresh axios instance to avoid interceptor loops
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            withCredentials: true,
            headers: { 
              'x-csrf-token': '1',
              'X-Portal': 'client'
            }
          }
        );
        
        if (res.data?.success && res.data.data?.token) {
          // Save new tokens
          localStorage.setItem('token', res.data.data.token);
          if (res.data.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.data.refreshToken);
          }
          
          // Update the failed request with new token and retry
          originalRequest.headers.Authorization = `Bearer ${res.data.data.token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login if in portal area
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        if (window.location.pathname.startsWith('/portal/')) {
          window.location.href = '/portal';
        }
        return Promise.reject(refreshError);
      }
    }
    
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
