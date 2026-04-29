import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatching, updateProgress, deleteFromWatching, addToCompleted } from '../services/api';
import { useSettingsStore, getGridCols, getPosterUrl } from '../stores/settingsStore';
import { useStatsStore } from '../stores/statsStore';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useToast } from '../components/ToastProvider';

export default function Watching() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [progress, setProgress] = useState({ minutes: '', season: '', episode: '' });
    const [updating, setUpdating] = useState(false);
    const { gridSize, showImages } = useSettingsStore();
    const { updateFromLists, incrementWatched } = useStatsStore();
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
                setLoading(true);
                await loadData();
                setLoading(false);
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
            const res = await fetchWatching();
            setItems(res.data || []);
            updateFromLists([], res.data || [], []);
        } catch (err) {
            console.error('Failed to fetch watching:', err);
        }
        setLoading(false);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setProgress({
            minutes: item.time_stamp || '',
            season: '',
            episode: ''
        });
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

            const res = await updateProgress(selectedItem.imdb_id, data);

            if (res.data?.action === 'completed') {
                showToast(`"${selectedItem.name}" completed!`, 'success');
                setSelectedItem(null);
            } else {
                setSelectedItem(null);
            }
            loadData();
        } catch (err) {
            console.error('Failed to update progress:', err);
        }
        setUpdating(false);
    };

    const handleDelete = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await deleteFromWatching(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            setSelectedItem(null);
            showToast(`Removed "${name}" from Watching`, 'success');
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
                <div className="h-8 w-40 bg-gray-800 rounded mb-6 animate-pulse" />
                <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
                <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
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
                                src={getPosterUrl(selectedItem, showImages)}
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

                        <p className="text-gray-300 mb-4">{selectedItem.overview || 'No overview available.'}</p>

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
                            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 mb-3"
                        >
                            {updating ? 'Saving...' : 'Save Progress'}
                        </button>
                        <button
                            onClick={(e) => handleMoveToCompleted(e, selectedItem.imdb_id, selectedItem.name)}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Mark Completed
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, selectedItem.imdb_id, selectedItem.name)}
                            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
