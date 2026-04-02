import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      gridSize: 'medium',
      theme: 'system',
      setGridSize: (size) => set({ gridSize: size }),
      setTheme: (theme) => set({ theme }),
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
