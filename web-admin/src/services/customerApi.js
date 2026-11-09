import axios from 'axios';
import { useCustomerStore } from '../store/customerAuthStore';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

const customerApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

customerApi.interceptors.request.use((config) => {
  const token = useCustomerStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

customerApi.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    const isAuthCall = original?.url?.includes('/auth/');
    if (err.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const { refreshToken, setSession, logout, customer } = useCustomerStore.getState();
      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          setSession(accessToken, refreshToken, customer);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return customerApi(original);
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

export default customerApi;
