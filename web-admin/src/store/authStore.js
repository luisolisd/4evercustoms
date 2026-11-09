import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../lib/queryClient';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      workshopId: null,

      setTokens: (token, refreshToken) => set({ token, refreshToken }),

      setUser: (user) => {
        const workshop = user.workshops?.[0];
        set({
          user,
          workshopId: workshop?.workshop?.id || null,
        });
      },

      updateUser: (partial) => set((s) => ({ user: { ...s.user, ...partial } })),

      logout: () => { queryClient.clear(); set({ token: null, refreshToken: null, user: null, workshopId: null }); },
    }),
    { name: '4evr-auth' }
  )
);


// Rol del usuario en su taller: WORKSHOP_ADMIN | SUPERVISOR | TECHNICIAN
export const selectRole = (s) => s.user?.workshops?.[0]?.role || null;
export const selectIsAdmin = (s) => selectRole(s) === 'WORKSHOP_ADMIN';
// Administrador o supervisor: operan el taller (clientes, órdenes, cotizaciones, cobros...)
export const selectIsStaff = (s) => ['WORKSHOP_ADMIN', 'SUPERVISOR'].includes(selectRole(s));
export const selectIsTech = (s) => selectRole(s) === 'TECHNICIAN';

export const ROLE_LABELS = {
  WORKSHOP_ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico',
};
