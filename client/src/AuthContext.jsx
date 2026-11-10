import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleRefreshed = (e) => {
      if (e.detail?.user) setUser(e.detail.user);
    };
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:token-refreshed', handleRefreshed);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:token-refreshed', handleRefreshed);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api
        .get('/auth/me')
        .then((r) => setUser(r.data.user))
        .catch(() => {
          // Attempt refresh from httpOnly cookie
          return api
            .post('/auth/refresh')
            .then((r) => {
              localStorage.setItem('token', r.data.token);
              setUser(r.data.user);
            })
            .catch(() => {
              localStorage.removeItem('token');
              setUser(null);
            });
        })
        .finally(() => setLoading(false));
    } else {
      // Try refresh from cookie directly in case user has cookie but no localStorage token
      api
        .post('/auth/refresh')
        .then((r) => {
          localStorage.setItem('token', r.data.token);
          setUser(r.data.user);
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
