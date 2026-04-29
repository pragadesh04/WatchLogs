import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatchlist, deleteFromWatchlist, addToCompleted } from '../services/api';
import { useSettingsStore, getGridCols, getPosterUrl } from '../stores/settingsStore';
import { useStatsStore } from '../stores/statsStore';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useToast } from '../components/ToastProvider';

export default function Watchlist() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { gridSize, showImages } = useSettingsStore();
    const { incrementWatched } = useStatsStore();
    const { showToast } = useToast();
    const lastY = useRef(0);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const handleTouchStart = (e) => {
            lastY.current = e.touches[0].clientY;
        };

        const handleTouchMove = async (e) => {
            const currentY = e.touches[0].clientY;
            const diff = lastY.current - currentY;

            if (diff > 50 && window.scrollY < 50) {
                setIsRefreshing(true);
                await loadData();
                setIsRefreshing(false);
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const loadData = async () => {
        try {
            const res = await fetchWatchlist();
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to fetch watchlist:', err);
        }
        setLoading(false);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleDelete = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await deleteFromWatchlist(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            setSelectedItem(null);
            showToast(`Removed "${name}" from Watchlist`, 'success');
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const handleMoveToCompleted = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await addToCompleted(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            setSelectedItem(null);
            incrementWatched();
            showToast(`Moved "${name}" to Completed`, 'success');
        } catch (err) {
            console.error('Failed to move to completed:', err);
        }
    };

    if (loading) {
        return (
            <div className="pb-20 px-4 py-6">
                <div className="h-8 w-32 bg-gray-800 rounded mb-6 animate-pulse" />
                <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
                <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                </svg>
                <h2 className="text-xl font-semibold mb-2">Your Watchlist is Empty</h2>
                <p className="text-gray-500 mb-6">Add movies you want to watch later</p>
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
            <h1 className="text-2xl font-bold mb-6">Watchlist</h1>
            <div className={`grid ${getGridCols(gridSize)} gap-4`}>
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="cursor-pointer group rounded-lg overflow-hidden transition-transform hover:scale-105"
                        onClick={() => handleItemClick(item)}
                    >
                        <img
                            src={getPosterUrl(item, showImages)}
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
                                src={getPosterUrl(selectedItem, showImages)}
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
                        <p className="text-gray-300 leading-relaxed">{selectedItem.overview || 'No overview available.'}</p>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={(e) => handleMoveToCompleted(e, selectedItem.imdb_id, selectedItem.name)}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Completed
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, selectedItem.imdb_id, selectedItem.name)}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
