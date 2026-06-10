import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

      logout: () => set({ token: null, refreshToken: null, user: null, workshopId: null }),
    }),
    { name: '4evr-auth' }
  )
);
