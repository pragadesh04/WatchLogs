import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      gridSize: 'medium',
      theme: 'system',
      showImages: true,
      setGridSize: (size) => set({ gridSize: size }),
      setTheme: (theme) => set({ theme }),
      setShowImages: (show) => set({ showImages: show }),
    }),
    {
      name: 'watchlogs-settings',
    }
  )
);

export const getGridCols = (size) => {
  const cols = {
    small: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
    medium: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };
  return cols[size] || cols.medium;
};

export const getPosterUrl = (item, showImages) => {
  if (!showImages) {
    return `https://placehold.co/500x750/1a1a1a/666666?text=${encodeURIComponent(item.name || item.Title || 'No Image')}`;
  }
  return item.poster_link || item.poster_url || item.Poster || 'https://placehold.co/500x750/png?text=No+Poster';
};
