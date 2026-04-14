import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        try {
          if (get().accessToken) {
            await api.post('/auth/logout', {}, {
              headers: { Authorization: `Bearer ${get().accessToken}` }
            });
          }
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
          const newAccessToken = res.data.access_token;
          set({ accessToken: newAccessToken });
          return newAccessToken;
        } catch (e) {
          get().logout();
          return null;
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);