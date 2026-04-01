import { useState } from 'react';
import { getDetails, getImdbId, addToWatchlist, addToWatching, addToCompleted } from '../services/api';

export default function MovieCard({ movie, contentType = 'movie', onAdded }) {
  const [showActions, setShowActions] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [overview, setOverview] = useState('');
  const [loading, setLoading] = useState(false);

  const posterUrl = movie.poster_link || 'https://placehold.co/500x750/png?text=No+Poster';
  const title = movie.name || movie.title || 'Untitled';

  const handleClick = async () => {
    try {
      const type = movie.content_type || contentType;
      const res = await getDetails(movie.id, type);
      setOverview(res.data.overview || 'No overview available.');
      setShowOverview(true);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleAdd = async (listType) => {
    setLoading(true);
    try {
      const type = movie.content_type || contentType;
      const imdbRes = await getImdbId(movie.id, type);
      const imdbId = imdbRes.data.response;
      
      if (listType === 'watchlist') {
        await addToWatchlist(imdbId, type);
      } else if (listType === 'watching') {
        await addToWatching(imdbId, 0, null, type);
      } else if (listType === 'completed') {
        await addToCompleted(imdbId, type);
      }
      
      if (onAdded) onAdded(listType);
    } catch (err) {
      console.error('Failed to add:', err);
    }
    setLoading(false);
    setShowActions(false);
  };

  return (
    <>
      <div 
        className="relative group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={handleClick}
      >
        <img 
          src={posterUrl} 
          alt={title} 
          className="w-full h-auto object-cover"
          onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
        />
        
        {showActions && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAdd('watchlist'); }}
              disabled={loading}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
            >
              Add to Watchlist
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleAdd('watching'); }}
              disabled={loading}
              className="w-full py-2 px-3 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium transition-colors"
            >
              Add to Watching
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleAdd('completed'); }}
              disabled={loading}
              className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
            >
              Add to Completed
            </button>
          </div>
        )}
      </div>

      {showOverview && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOverview(false)}
        >
          <div 
            className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4 mb-4">
              <img 
                src={posterUrl} 
                alt={title} 
                className="w-32 h-48 object-cover rounded-lg"
                onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
              />
              <div>
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-sm text-gray-500">
                  {movie.content_type === 'tv' ? 'TV Series' : 'Movie'}
                </p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">{overview}</p>
            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => { setShowOverview(false); setShowActions(true); }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Add to List
              </button>
              <button 
                onClick={() => setShowOverview(false)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
