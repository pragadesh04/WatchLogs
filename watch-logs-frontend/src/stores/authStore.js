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
      isRefreshing: false,
      refreshPromise: null,

      login: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const { accessToken } = get();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isRefreshing: false,
          refreshPromise: null,
        });
        try {
          if (accessToken) {
            await api.post('/auth/logout', {}, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          }
        } catch (e) {
          console.error('Logout error:', e);
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken, isRefreshing, refreshPromise } = get();
        
        if (isRefreshing && refreshPromise) {
          return refreshPromise;
        }
        
        if (!refreshToken) return false;

        const refresh = async () => {
          try {
            const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
            const newAccessToken = res.data.access_token;
            set({ accessToken: newAccessToken, isRefreshing: false, refreshPromise: null });
            return newAccessToken;
          } catch (e) {
            set({ isRefreshing: false, refreshPromise: null });
            get().logout();
            return null;
          }
        };

        set({ isRefreshing: true });
        const promise = refresh();
        set({ refreshPromise: promise });
        return promise;
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