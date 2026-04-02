import { useState } from 'react';
import { getImdbId, addToWatchlist, addToWatching, addToCompleted } from '../services/api';
import { useToast } from './ToastProvider';

export default function MovieCard({ movie, contentType = 'movie', onAdded }) {
  const [showActions, setShowActions] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const { showToast } = useToast();

  const posterUrl = movie.poster_link || 'https://placehold.co/500x750/png?text=No+Poster';
  const title = movie.name || movie.title || 'Untitled';
  const overview = movie.overview || 'No overview available.';
  const contentTypeLabel = movie.content_type === 'tv' ? 'TV Series' : 'Movie';

  const handleClick = () => {
    setShowActions(true);
    setShowOverview(true);
  };

  const handleInfoToggle = (e) => {
    e.stopPropagation();
    setShowInfo(!showInfo);
    setShowActions(true);
  };

  const handleAdd = async (listType) => {
    setLoadingAction(listType);
    setLoading(true);
    try {
      const type = movie.content_type || contentType;
      const imdbRes = await getImdbId(movie.id, type);
      const imdbId = imdbRes.data.response;
      
      if (listType === 'watchlist') {
        await addToWatchlist(imdbId, type);
        showToast('Added to Watchlist', 'success');
      } else if (listType === 'watching') {
        await addToWatching(imdbId, 0, null, type);
        showToast('Added to Watching', 'success');
      } else if (listType === 'completed') {
        await addToCompleted(imdbId, type);
        showToast('Added to Completed', 'success');
      }
      
      if (onAdded) onAdded(listType);
    } catch (err) {
      console.error('Failed to add:', err);
      showToast('Failed to add', 'error');
    }
    setLoading(false);
    setLoadingAction(null);
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
          <div className="absolute inset-0 flex flex-col justify-between p-2" style={{ background: showInfo ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)', minHeight: '100%' }}>
            <div className="flex justify-end">
              <button 
                onClick={handleInfoToggle}
                className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700'}`}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            
            {!showInfo ? (
              <>
                <div className="text-center mb-2">
                  <p className="text-white font-medium text-sm drop-shadow-lg line-clamp-2 px-2">{title}</p>
                </div>
                
                <div className="flex flex-col gap-1 mt-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAdd('watchlist'); }}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600/90 hover:bg-blue-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {loadingAction === 'watchlist' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                      </svg>
                    )}
                    Watchlist
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAdd('watching'); }}
                    disabled={loading}
                    className="w-full py-2 bg-yellow-600/90 hover:bg-yellow-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {loadingAction === 'watching' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                    Watching
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAdd('completed'); }}
                    disabled={loading}
                    className="w-full py-2 bg-green-600/90 hover:bg-green-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {loadingAction === 'completed' ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                    Completed
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto mt-2 pb-14">
                <p className="text-white text-sm leading-relaxed px-1">{overview}</p>
              </div>
            )}
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
                  {contentTypeLabel}
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
