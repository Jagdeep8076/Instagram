import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { getToken } from './api';
import { useAuth } from './AuthContext';
import Icon from './components/Icon';

const Ctx = createContext(null);
export const useSocket = () => useContext(Ctx);
export const notifText = (n) => (n.type === 'like' ? 'liked your post' : n.type === 'comment' ? `commented: ${n.text}` : 'started following you');

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(new Set());
  const [counts, setCounts] = useState({ n: 0, m: 0 });
  const [toast, setToast] = useState(null);

  const refreshCounts = useCallback(() => {
    Promise.all([api.get('/notifications/unread'), api.get('/messages/unread')])
      .then(([a, b]) => setCounts({ n: a.data.count, m: b.data.count })).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setSocket(null); return; }
    const s = io({ auth: (cb) => cb({ token: getToken() }) }); // fresh token on every (re)connect
    setSocket(s);
    s.on('online-users', (ids) => setOnline(new Set(ids)));
    s.on('presence', ({ userId, online: o }) => setOnline((p) => { const n = new Set(p); o ? n.add(userId) : n.delete(userId); return n; }));
    s.on('notification', (n) => { setCounts((c) => ({ ...c, n: c.n + 1 })); setToast(`${n.from.username} ${notifText(n)}`); });
    s.on('message', () => setCounts((c) => ({ ...c, m: c.m + 1 })));
    refreshCounts();
    return () => s.disconnect();
  }, [user?._id]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  return (
    <Ctx.Provider value={{ socket, online, counts, refreshCounts }}>
      {children}
      {toast && <div className="toast" onClick={() => setToast(null)}><Icon name="notification-3-fill" /> {toast}</div>}
    </Ctx.Provider>
  );
}
