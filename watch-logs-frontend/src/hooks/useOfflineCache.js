import { useCallback, useRef } from 'react';

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in ms

export function useOfflineCache() {
  const cacheRef = useRef({});

  const getCached = useCallback((key) => {
    const cached = cacheRef.current[key];
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      delete cacheRef.current[key];
      return null;
    }
    return cached.data;
  }, []);

  const setCache = useCallback((key, data) => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
    };
  }, []);

  const clearCache = useCallback((key) => {
    if (key) {
      delete cacheRef.current[key];
    } else {
      cacheRef.current = {};
    }
  }, []);

  const isStale = useCallback((key) => {
    const cached = cacheRef.current[key];
    if (!cached) return true;
    return Date.now() - cached.timestamp > CACHE_DURATION;
  }, []);

  return { getCached, setCache, clearCache, isStale };
}
