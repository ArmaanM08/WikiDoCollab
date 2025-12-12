import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
      if (!token) {
        try {
          const r = await api.post('/api/auth/refresh');
          token = r.data?.token;
          if (token) sessionStorage.setItem('accessToken', token);
        } catch (_) {}
      }
      if (token) {
        try {
          const me = await api.get('/api/auth/me');
          setUser(me.data);
        } catch (_) {
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (token) => {
    sessionStorage.setItem('accessToken', token);
    return api.get('/api/auth/me').then(res => { setUser(res.data); return res.data; });
  };

  const logout = () => {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('accessToken');
    setUser(null);
    api.post('/api/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
