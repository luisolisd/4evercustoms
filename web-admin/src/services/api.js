import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Una sola renovación a la vez: si varias peticiones fallan con 401 comparten la misma promesa.
let refreshing = null;
const refreshAccessToken = (refreshToken) => {
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/auth/refresh-token`, { refreshToken })
      .then((res) => res.data.data.accessToken)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    const isAuthCall = original?.url?.includes('/auth/');
    if (err.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          setTokens(accessToken, refreshToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
