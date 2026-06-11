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

customerApi.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401) {
      const { refreshToken, setSession, logout, customer } = useCustomerStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE}/auth/refresh-token`, { refreshToken });
          setSession(res.data.data.accessToken, refreshToken, customer);
          err.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return customerApi(err.config);
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
