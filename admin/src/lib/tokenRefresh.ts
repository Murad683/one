import axios from 'axios';

// The access token is short-lived. Refreshing it BEFORE a request is sent (when it is expired or about
// to be) means the page does not first get a 401 for the old token and only then retry, which showed up
// as a red error in the console on every reload after 15 minutes.

const EXPIRY_MARGIN_SECONDS = 30;

let inFlight: Promise<void> | null = null;

const expiresAt = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
};

const isStale = (token: string): boolean => {
  const exp = expiresAt(token);
  return exp !== null && exp - EXPIRY_MARGIN_SECONDS <= Date.now() / 1000;
};

/**
 * Makes sure localStorage holds a usable admin token. Concurrent callers share one refresh request.
 * Never throws: when it cannot refresh, the request goes out as before and the 401 handlers take over.
 */
export const ensureFreshAdminToken = async (refreshUrl: string): Promise<void> => {
  const token = localStorage.getItem('adminToken');
  const refreshToken = localStorage.getItem('adminRefreshToken');
  if (!token || !refreshToken || !isStale(token)) return;

  if (!inFlight) {
    inFlight = axios
      .post(
        refreshUrl,
        { refreshToken },
        { withCredentials: true, headers: { 'x-csrf-token': '1', 'X-Portal': 'admin' } },
      )
      .then((res) => {
        const data = res.data?.data;
        if (res.data?.success && data?.token) {
          localStorage.setItem('adminToken', data.token);
          if (data.refreshToken) localStorage.setItem('adminRefreshToken', data.refreshToken);
        }
      })
      .catch(() => {})
      .finally(() => {
        inFlight = null;
      });
  }
  await inFlight;
};

/** True when the request is the login or refresh call itself. */
export const isAuthCall = (url?: string): boolean => url === '/auth/login' || url === '/auth/refresh';
