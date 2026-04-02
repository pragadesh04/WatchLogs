import { create } from 'zustand';

export const useStatsStore = create((set, get) => ({
  stats: {
    totalWatched: 0,
    thisMonth: 0,
    thisYear: 0,
    watchlist: 0,
    watching: 0,
  },
  setStats: (stats) => set({ stats }),
  incrementWatched: () => set((state) => ({
    stats: {
      ...state.stats,
      totalWatched: state.stats.totalWatched + 1,
      thisMonth: state.stats.thisMonth + 1,
      thisYear: state.stats.thisYear + 1,
      watchlist: state.stats.watchlist,
      watching: state.stats.watching,
    }
  })),
  updateFromLists: (watchlist, watching, completed) => set({
    stats: {
      ...get().stats,
      watchlist: watchlist.length,
      watching: watching.length,
      totalWatched: completed.length,
    }
  }),
}));
