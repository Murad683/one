import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10 minutes — large video uploads need time
  withCredentials: true,
});

// Request interceptor to attach CSRF token and Bearer token
client.interceptors.request.use((config) => {
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

// Response interceptor
client.interceptors.response.use(
  (response) => response,
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
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Use a fresh axios instance to avoid interceptor loops
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
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
          return client(originalRequest);
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

    if (error.response && error.response.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('admin-auth');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default client;
