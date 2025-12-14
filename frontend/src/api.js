import axios from 'axios';

// Use environment-driven backend URL for Vercel deployment
const baseURL = import.meta.env.VITE_API_BASE || 'https://wikidocollab.onrender.com';
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach auth header when token exists
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pending = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    if (error.response && error.response.status === 401 && !original.__isRetry) {
      if (isRefreshing) {
        await new Promise((resolve) => pending.push(resolve));
      } else {
        isRefreshing = true;
        try {
          const r = await api.post('/api/auth/refresh');
          const newToken = r.data?.token;
          if (newToken) {
            sessionStorage.setItem('accessToken', newToken);
          }
        } catch (_) {
          // refresh failed: clear token
          sessionStorage.removeItem('accessToken');
          localStorage.removeItem('accessToken');
        } finally {
          isRefreshing = false;
          pending.forEach((fn) => fn());
          pending = [];
        }
      }
      original.__isRetry = true;
      const token = sessionStorage.getItem('accessToken');
      if (token) original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
      return api.request(original);
    }
    return Promise.reject(error);
  }
);
