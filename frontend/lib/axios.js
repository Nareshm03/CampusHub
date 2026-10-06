import axios from 'axios';
import { isTokenExpired } from './tokenUtils';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'api-version': 'v1'
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = error.config?.url || '';
      const token = localStorage.getItem('token');
      // End the session only when the token is genuinely unusable (missing,
      // undecodable, or past its own expiry) or when the backend rejects a
      // session-validation request. A 401 from any other endpoint (a
      // secondary widget call, an idle session-timeout, a per-resource
      // denial) must not wipe a valid session.
      const sessionCheck = requestUrl.includes('/auth/me');
      if (token && (sessionCheck || isTokenExpired(token))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const publicAuthPages = [
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/offline',
        ];
        const onPublicPage = publicAuthPages.some(
          (page) =>
            window.location.pathname === page ||
            window.location.pathname.startsWith(`${page}/`)
        );
        // Redirect only when a session was actually cleared and the user is
        // not already on a public auth page: avoids redirect loops.
        if (!onPublicPage) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;