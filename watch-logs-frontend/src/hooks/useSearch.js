import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ onSearch, onClear }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onSearch?.();
    }
    if (e.key === 'Escape') {
      onClear?.();
    }
  }, [onSearch, onClear]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useRecentSearches() {
  const STORAGE_KEY = 'watchlogs-recent-searches';
  const MAX_SEARCHES = 5;

  const getSearches = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }, []);

  const addSearch = useCallback((query) => {
    if (!query.trim()) return;
    const searches = getSearches();
    const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_SEARCHES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [getSearches]);

  const removeSearch = useCallback((query) => {
    const searches = getSearches();
    const updated = searches.filter(s => s !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [getSearches]);

  const clearSearches = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { getSearches, addSearch, removeSearch, clearSearches };
}
