import { useState, useEffect } from 'react';
import { getTrendingMovies, getTrendingTV, searchByName } from '../services/api';
import MovieCard from '../components/MovieCard';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesRes, tvRes] = await Promise.all([
          getTrendingMovies(),
          getTrendingTV(),
        ]);
        setMovies(moviesRes.data || []);
        setTvShows(tvRes.data || []);
      } catch (err) {
        console.error('Failed to fetch trending:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchByName(searchQuery);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 py-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
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

      {searchResults.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} contentType={movie.content_type || 'movie'} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-500">●</span> Trending TV Shows
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tvShows.map((show) => (
                <MovieCard key={show.id} movie={show} contentType={show.content_type || 'tv'} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
