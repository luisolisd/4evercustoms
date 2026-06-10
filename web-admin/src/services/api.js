import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh-token', { refreshToken });
          setTokens(res.data.data.accessToken, refreshToken);
          err.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return api(err.config);
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
