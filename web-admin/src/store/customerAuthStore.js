import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sesión del cliente (separada de la del taller)
export const useCustomerStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      customer: null,

      setSession: (token, refreshToken, customer) => set({ token, refreshToken, customer }),
      setCustomer: (customer) => set({ customer }),
      logout: () => set({ token: null, refreshToken: null, customer: null }),
    }),
    { name: '4evr-customer' }
  )
);
