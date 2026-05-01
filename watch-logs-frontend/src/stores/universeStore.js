import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUniverseStore = create(
  persist(
    (set) => ({
      universe: 'cinema',
      setUniverse: (u) => set({ universe: u }),
      toggleUniverse: () =>
        set((s) => ({ universe: s.universe === 'cinema' ? 'anime' : 'cinema' })),
    }),
    { name: 'watchlogs-universe' }
  )
);
