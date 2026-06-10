import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  workshopId: null,
  customerId: null,
  isLoading: true,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { set({ isLoading: false }); return; }
      const res = await api.get('/auth/me');
      const user = res.data;
      const workshop = user.workshops?.[0];
      set({
        isLoading: false,
        user,
        workshopId: workshop?.workshop?.id || null,
        customerId: user.customerId || null,
      });
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ isLoading: false, user: null });
    }
  },

  setSession: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    const workshop = user.workshops?.[0];
    set({
      user,
      workshopId: workshop?.workshop?.id || null,
      customerId: user.customerId || null,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, workshopId: null, customerId: null });
  },
}));
