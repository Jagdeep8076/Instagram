import axios from 'axios';

// The short-lived access token lives in memory only (never localStorage).
// The long-lived refresh token is an httpOnly cookie the browser sends automatically.
let accessToken = null;
let onAuthLost = () => {};
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken;
export const setOnAuthLost = (fn) => { onAuthLost = fn; };

const api = axios.create({ baseURL: '/api', withCredentials: true });
api.interceptors.request.use((c) => { if (accessToken) c.headers.Authorization = 'Bearer ' + accessToken; return c; });

let refreshing = null;
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = axios.post('/api/auth/refresh', null, { withCredentials: true })
      .then((r) => { accessToken = r.data.accessToken; return r.data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

// On 401 (expired access token): refresh once, then retry the original request
api.interceptors.response.use((r) => r, async (err) => {
  const { config, response } = err;
  if (response?.status === 401 && config && !config._retry && !config.url.startsWith('/auth/')) {
    config._retry = true;
    try { await refreshSession(); config.headers.Authorization = 'Bearer ' + accessToken; return api(config); }
    catch { accessToken = null; onAuthLost(); }
  }
  return Promise.reject(err);
});
// Turns an API error into a friendly English message.
// Uses the server's own message when it sent one (including the 503 "database not connected"
// and the 502 "couldn't send the email" cases); only says "can't reach the server" when there is
// really no usable reply (network error, or the dev proxy returned an empty 500).
export const errMsg = (e, fallback = 'Something went wrong. Please try again.') => {
  const res = e?.response;
  if (!res) return "Can't reach the server. Make sure the server is running.";
  const msg = typeof res.data === 'object' ? res.data?.msg : null;
  if (msg) return msg;
  if (res.status >= 500) return "Can't reach the server. Make sure the server is running.";
  return fallback;
};
export default api;