import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatching, getDetails, updateProgress } from '../services/api';

export default function Watching() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [overview, setOverview] = useState('');
  const [progress, setProgress] = useState({ minutes: '', season: '', episode: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetchWatching();
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch watching:', err);
    }
    setLoading(false);
  };

  const handleItemClick = async (item) => {
    try {
      const contentType = item.content_type || item.type || 'movie';
      const res = await getDetails(item.movie_id, contentType);
      setOverview(res.data.overview || 'No overview available.');
      setSelectedItem({ ...item, content_type: contentType });
      setProgress({ 
        minutes: item.time_stamp || '', 
        season: '', 
        episode: '' 
      });
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleUpdateProgress = async () => {
    setUpdating(true);
    try {
      const data = {};
      if (selectedItem.content_type === 'tv') {
        if (progress.season) data.season = parseInt(progress.season);
        if (progress.episode) data.episode = parseInt(progress.episode);
      } else {
        if (progress.minutes) data.minutes = parseInt(progress.minutes);
      }
      await updateProgress(selectedItem.imdb_id, data);
      loadData();
      setSelectedItem(null);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
        <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <h2 className="text-xl font-semibold mb-2">Nothing in Progress</h2>
        <p className="text-gray-500 mb-6">Start watching something</p>
        <Link 
          to="/" 
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Browse Trending
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Currently Watching</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div 
            key={item.id}
            className="cursor-pointer group rounded-lg overflow-hidden transition-transform hover:scale-105"
            onClick={() => handleItemClick(item)}
          >
            <img
              src={item.poster_link || 'https://placehold.co/500x750/png?text=No+Poster'}
              alt={item.name}
              className="w-full h-auto"
            />
            <div className="mt-2 text-center">
              <p className="text-sm truncate">{item.name}</p>
              <p className="text-xs text-gray-500">
                {item.content_type === 'tv' 
                  ? item.time_stamp || 'S0:E0'
                  : item.time_stamp || '0 min'
                }
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4 mb-4">
              <img
                src={selectedItem.poster_link || 'https://placehold.co/500x750/png?text=No+Poster'}
                alt={selectedItem.name}
                className="w-24 h-36 object-cover rounded-lg"
              />
              <div>
                <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                <p className="text-gray-400 text-sm">
                  {selectedItem.content_type === 'tv' ? 'TV Series' : 'Movie'}
                </p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-4">{overview}</p>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3">Update Progress</h3>
              {selectedItem.content_type === 'tv' ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Season</label>
                    <input
                      type="number"
                      min="1"
                      value={progress.season}
                      onChange={(e) => setProgress({ ...progress, season: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                      placeholder="Season"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Episode</label>
                    <input
                      type="number"
                      min="1"
                      value={progress.episode}
                      onChange={(e) => setProgress({ ...progress, episode: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                      placeholder="Episode"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500">Minutes Watched</label>
                  <input
                    type="number"
                    min="0"
                    value={progress.minutes}
                    onChange={(e) => setProgress({ ...progress, minutes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                    placeholder="Minutes"
                  />
                </div>
              )}
            </div>
            
            <button 
              onClick={handleUpdateProgress}
              disabled={updating}
              className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
