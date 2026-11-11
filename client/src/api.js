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
export const errMsg = (e, fallback = 'Something went wrong. Please try again.') => {
  const res = e?.response;
  if (res?.status === 503 && res?.data?.msg) {
    return res.data.msg;
  }
  if (!res || !res.data || typeof res.data !== 'object' || [500, 502, 503, 504].includes(res.status)) {
    return "Can't reach the server. Make sure the server is running.";
  }
  return res.data?.msg || fallback;
};
export default api;
