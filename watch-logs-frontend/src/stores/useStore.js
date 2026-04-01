import { create } from 'zustand';

export const useStore = create((set) => ({
  watchlist: [],
  watching: [],
  completed: [],
  setWatchlist: (list) => set({ watchlist: list }),
  setWatching: (list) => set({ watching: list }),
  setCompleted: (list) => set({ completed: list }),
}));
