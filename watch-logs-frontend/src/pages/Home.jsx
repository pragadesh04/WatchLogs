import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTrendingMovies, getTrendingTV, searchByName } from '../services/api';
import MovieCard from '../components/MovieCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useSettingsStore, getGridCols } from '../stores/settingsStore';
import { useKeyboardShortcuts, useRecentSearches } from '../hooks/useSearch';
import { useOfflineCache } from '../hooks/useOfflineCache';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawSearchResults, setRawSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');

  const { gridSize } = useSettingsStore();
  const searchInputRef = useRef(null);
  const { getCached, setCache, isStale } = useOfflineCache();
  const { getSearches, addSearch, removeSearch } = useRecentSearches();

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setRawSearchResults([]);
  }, []);

  useKeyboardShortcuts({ onSearch: focusSearch, onClear: clearSearch });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const movieCacheKey = 'trending_movies';
      const tvCacheKey = 'trending_tv';

      const cachedMovies = getCached(movieCacheKey);
      const cachedTV = getCached(tvCacheKey);

      if (cachedMovies && cachedTV && !isStale(movieCacheKey)) {
        setMovies(cachedMovies);
        setTvShows(cachedTV);
        setLoading(false);
        return;
      }

      try {
        const [moviesRes, tvRes] = await Promise.all([
          getTrendingMovies(),
          getTrendingTV(),
        ]);
        const movieData = moviesRes.data || [];
        const tvData = tvRes.data || [];

        setCache(movieCacheKey, movieData);
        setCache(tvCacheKey, tvData);

        setMovies(movieData);
        setTvShows(tvData);
      } catch (err) {
        console.error('Failed to fetch trending:', err);

        if (cachedMovies) setMovies(cachedMovies);
        if (cachedTV) setTvShows(cachedTV);
      }
      setLoading(false);
    };
    fetchData();
  }, [getCached, setCache, isStale]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setRawSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchByName(searchQuery);
      setRawSearchResults(res.data || []);
      addSearch(searchQuery);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setSearching(false);
  };

  const searchResults = useMemo(() => {
    let filtered = [...rawSearchResults];

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filterType);
    }

    if (sortBy === 'popularity') {
      // Already sorted by TMDB popularity
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'year') {
      filtered.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    }

    return filtered;
  }, [rawSearchResults, filterType, sortBy]);

  const getSortedAndFiltered = (items) => {
    let filtered = [...items];

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filterType);
    }

    if (sortBy === 'popularity') {
      // Already sorted by TMDB popularity
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'year') {
      filtered.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    }

    return filtered;
  };

  const recentSearches = getSearches();

  if (loading) {
    return (
      <div className="pb-20 px-4 py-6">
        <div className="mb-6 h-12 bg-gray-800 rounded-lg animate-pulse" />
        <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 py-6">
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies... (press /)"
            className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        {searching && <p className="text-gray-500 mt-2">Searching...</p>}
      </form>

      {searchQuery && recentSearches.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {recentSearches.map((term) => (
            <button
              key={term}
              onClick={() => { setSearchQuery(term); handleSearch({ preventDefault: () => {} }); }}
              className="text-xs px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-gray-400 hover:text-white"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm"
        >
          <option value="all">All Types</option>
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-sm"
        >
          <option value="popularity">Popularity</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
      </div>

      {searchResults.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className={`grid ${getGridCols(gridSize)} gap-4`}>
            {searchResults.map((item) => (
              <MovieCard
                key={item.id}
                movie={item}
                contentType={item.content_type || 'movie'}
              />
            ))}
          </div>
        </section>
      ) : searchQuery ? (
        <p className="text-gray-500 text-center">No results found</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-red-500">●</span> Trending Movies
            </h2>
            <div className={`grid ${getGridCols(gridSize)} gap-4`}>
              {getSortedAndFiltered(movies).map((movie) => (
                <MovieCard key={movie.id} movie={movie} contentType={movie.content_type || 'movie'} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-500">●</span> Trending TV Shows
            </h2>
            <div className={`grid ${getGridCols(gridSize)} gap-4`}>
              {getSortedAndFiltered(tvShows).map((show) => (
                <MovieCard key={show.id} movie={show} contentType={show.content_type || 'tv'} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
