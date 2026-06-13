import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
const USER_CACHE_KEY = 'cached_user';

function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCachedUser(u) {
  if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_CACHE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedUser());
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((u) => {
    setUser(u);
    setCachedUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      let token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

      // If no token at all, try refresh (cookie-based)
      if (!token) {
        try {
          const r = await api.post('/api/auth/refresh');
          token = r.data?.token;
          if (token) sessionStorage.setItem('accessToken', token);
        } catch (_) {}
      }

      if (!token) {
        if (!cancelled) { persistUser(null); setLoading(false); }
        return;
      }

      // If we have a cached user, render immediately and validate in background
      const cached = getCachedUser();
      if (cached) {
        setLoading(false);
        // Background validation – update cache if profile changed
        api.get('/api/auth/me').then(res => {
          if (!cancelled) persistUser(res.data);
        }).catch(() => {
          // Token invalid – clear everything
          sessionStorage.removeItem('accessToken');
          localStorage.removeItem('accessToken');
          if (!cancelled) persistUser(null);
        });
        return;
      }

      // No cache – must block for /me
      try {
        const me = await api.get('/api/auth/me');
        if (!cancelled) persistUser(me.data);
      } catch (_) {
        if (!cancelled) persistUser(null);
      }
      if (!cancelled) setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [persistUser]);

  useEffect(() => {
    const handleLogout = () => { persistUser(null); };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [persistUser]);

  const login = useCallback((token, userData) => {
    sessionStorage.setItem('accessToken', token);
    // If caller already has user data from the login response, use it directly
    if (userData) {
      persistUser(userData);
      return Promise.resolve(userData);
    }
    return api.get('/api/auth/me').then(res => {
      persistUser(res.data);
      return res.data;
    });
  }, [persistUser]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('accessToken');
    persistUser(null);
    api.post('/api/auth/logout').catch(() => {});
  }, [persistUser]);

  return (
    <AuthContext.Provider value={{ user, setUser: persistUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
