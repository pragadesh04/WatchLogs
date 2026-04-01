import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompleted, getDetails } from '../services/api';

export default function Completed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [overview, setOverview] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetchCompleted();
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch completed:', err);
    }
    setLoading(false);
  };

  const handleItemClick = async (item) => {
    try {
      const contentType = item.content_type || 'movie';
      const res = await getDetails(item.movie_id, contentType);
      setOverview(res.data.overview || 'No overview available.');
      setSelectedItem(item);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
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
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <h2 className="text-xl font-semibold mb-2">No Completed Movies</h2>
        <p className="text-gray-500 mb-6">Movies you've finished will appear here</p>
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
      <h1 className="text-2xl font-bold mb-6">Completed</h1>
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
            <p className="mt-2 text-sm text-center truncate">{item.name}</p>
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
                className="w-32 h-48 object-cover rounded-lg"
              />
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedItem.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedItem.content_type === 'tv' ? 'TV Series' : 'Movie'}
                </p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">{overview}</p>
            <button 
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
