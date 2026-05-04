import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUniverseStore = create(
  persist(
    (set) => ({
      universe: 'cinema',
      rippleOrigin: { x: 0, y: 0 },
      targetUniverse: null,
      isRippling: false,
      setUniverse: (u) => set({ universe: u }),
      toggleUniverse: () =>
        set((s) => ({ universe: s.universe === 'cinema' ? 'anime' : 'cinema' })),
      triggerRipple: (x, y, target) => set({ rippleOrigin: { x, y }, targetUniverse: target, isRippling: true }),
      clearRipple: () => set({ isRippling: false, targetUniverse: null }),
    }),
    { name: 'watchlogs-universe' }
  )
);
