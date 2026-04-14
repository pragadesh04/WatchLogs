import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedList } from '../services/api';
import { SkeletonGrid } from '../components/SkeletonCard';

export default function SharedList() {
  const { code } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await getSharedList(code);
        if (res.data.status === 'success') {
          setItems(res.data.items || []);
        } else {
          setError(res.data.message || 'Failed to load shared list');
        }
      } catch (err) {
        setError('Failed to load shared list');
      }
      setLoading(false);
    };
    fetchShared();
  }, [code]);

  if (loading) {
    return (
      <div className="pb-20 px-4 py-6">
        <SkeletonGrid count={10} gridCols="grid-cols-2 md:grid-cols-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg">
          Go Home
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
        <h2 className="text-xl font-semibold mb-2">Empty List</h2>
        <p className="text-gray-500 mb-6">This shared list is empty</p>
        <Link to="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Shared List</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg overflow-hidden">
            <img
              src={item.poster_url || 'https://placehold.co/500x750/png?text=No+Poster'}
              alt={item.name}
              className="w-full h-auto"
            />
            <p className="mt-2 text-sm text-center truncate">{item.name}</p>
            <p className="text-xs text-center text-gray-500">{item.list_type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}