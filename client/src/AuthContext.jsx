import { createContext, useContext, useEffect, useState } from 'react';
import api, { refreshSession, setOnAuthLost, setToken } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the refresh cookie on page load
  useEffect(() => {
    setOnAuthLost(() => setUser(null));
    refreshSession().then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const start = (d) => { setToken(d.accessToken); setUser(d.user); };
  const login = async (body) => start((await api.post('/auth/login', body)).data);
  const verify = async (body) => start((await api.post('/auth/verify', body)).data);
  const logout = async () => { try { await api.post('/auth/logout'); } catch {} setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, setUser, loading, login, verify, logout }}>{children}</Ctx.Provider>;
}
