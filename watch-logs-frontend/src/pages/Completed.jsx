import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompleted, deleteFromCompleted } from '../services/api';
import { useSettingsStore, getGridCols, getPosterUrl } from '../stores/settingsStore';
import { useStatsStore } from '../stores/statsStore';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useToast } from '../components/ToastProvider';
import SentientCard from '../components/SentientCard';
import CastChips from '../components/CastChips';
import MagneticButton from '../components/MagneticButton';
import gsap from 'gsap';

export default function Completed() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_added');
    const gridRef = useRef(null);
    const modalRef = useRef(null);
    const backdropRef = useRef(null);
    const { gridSize, showImages } = useSettingsStore();
    const { updateFromLists } = useStatsStore();
    const { showToast } = useToast();
    const lastY = useRef(0);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!loading && items.length > 0) {
            gsap.fromTo(gridRef.current?.querySelectorAll('.sentient-card'), {
                opacity: 0, y: 30, scale: 0.95
            }, {
                opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.2)',
                delay: 0.1,
            });
        }
    }, [items, loading]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {}, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

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
            const res = await fetchCompleted(sortBy, 'desc');
            const data = res.data || [];
            setItems(data);
            updateFromLists([], [], data);
        } catch (err) {
            console.error('Failed to fetch completed:', err);
        }
        setLoading(false);
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...items];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => {
                const name = (item.name || '').toLowerCase();
                const cast = (Array.isArray(item.cast) ? item.cast.join(', ') : (item.cast || '')).toLowerCase();
                const director = (item.director || '').toLowerCase();
                return name.includes(term) || cast.includes(term) || director.includes(term);
            });
        }

        result.sort((a, b) => {
            if (sortBy === 'date_added') {
                return new Date(b.date_added || 0) - new Date(a.date_added || 0);
            } else if (sortBy === 'release_year') {
                return (b.release_date || '').localeCompare(a.release_date || '');
            } else if (sortBy === 'rating') {
                return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
            } else if (sortBy === 'title') {
                return (a.name || '').localeCompare(b.name || '');
            }
            return 0;
        });

        return result;
    }, [items, searchTerm, sortBy]);

    const handleItemClick = (item) => {
        setSelectedItem(item);

        gsap.to(gridRef.current, {
            scale: 0.9,
            filter: 'blur(8px)',
            duration: 0.4,
            ease: 'power2.inOut',
        });

        gsap.fromTo(modalRef.current, {
            y: '100%',
            opacity: 0,
            rotateX: 15,
        }, {
            y: '0%',
            opacity: 1,
            rotateX: 0,
            duration: 0.5,
            ease: 'power3.out',
        });

        if (backdropRef.current) {
            gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        }
    };

    const closeModal = () => {
        gsap.to(gridRef.current, {
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.4,
            ease: 'power2.inOut',
        });

        gsap.to(modalRef.current, {
            y: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
        });

        if (backdropRef.current) {
            gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
        }

        setTimeout(() => setSelectedItem(null), 300);
    };

    const handleDelete = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await deleteFromCompleted(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            showToast(`Removed "${name}" from Completed`, 'success');
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const movies = filteredAndSorted.filter(i => i.content_type === 'movie');
    const series = filteredAndSorted.filter(i => i.content_type === 'tv' || i.content_type === 'series');

    if (loading) {
        return (
            <div className="pb-20 px-4 py-6">
                <div className="h-8 w-32 bg-[var(--bg-card)] rounded mb-6 animate-pulse" />
                <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
            </div>
        );
    }

    if (items.length === 0 && !searchTerm) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
                <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <h2 className="text-xl font-semibold mb-2">No Completed Movies</h2>
                <p className="text-[var(--text-secondary)] mb-6">Movies you've finished will appear here</p>
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
        <div className="pb-20 px-4 py-6 relative">
            <h1 className="text-2xl font-bold mb-6">Completed</h1>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, cast, director..."
                    className="flex-1 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-red-500/50"
                >
                    <option value="date_added">Date Added</option>
                    <option value="title">Title</option>
                    <option value="release_year">Release Year</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            <div ref={gridRef}>
                {movies.length > 0 && (
                    <>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="text-green-500">●</span> Movies
                            <span className="text-sm text-[var(--text-secondary)]">({movies.length})</span>
                        </h2>
                        <div className={`grid ${getGridCols(gridSize)} gap-4 mb-6`}>
                            {movies.map((item) => (
                                <div key={item.id} className="sentient-card">
                                    <SentientCard
                                        item={item}
                                        onClick={() => handleItemClick(item)}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {series.length > 0 && (
                    <>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="text-blue-500">●</span> TV Series
                            <span className="text-sm text-[var(--text-secondary)]">({series.length})</span>
                        </h2>
                        <div className={`grid ${getGridCols(gridSize)} gap-4`}>
                            {series.map((item) => (
                                <div key={item.id} className="sentient-card">
                                    <SentientCard
                                        item={item}
                                        onClick={() => handleItemClick(item)}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {selectedItem && (
                <div
                    ref={backdropRef}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={closeModal}
                >
                    <div className="absolute inset-0 bg-black/70" />
                    <div
                        ref={modalRef}
                        className="glass noise-overlay relative max-w-2xl w-full mx-4 rounded-2xl max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                        style={{ transformOrigin: 'bottom center' }}
                    >
                        <div className="p-6 relative z-10">
                            <div className="flex gap-4 mb-4">
                                <img
                                    src={getPosterUrl(selectedItem, showImages)}
                                    alt={selectedItem.name}
                                    className="w-32 h-48 object-cover rounded-lg shadow-lg"
                                />
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                                        {selectedItem.content_type === 'tv' ? 'TV Series' : 'Movie'}
                                        {selectedItem.release_date && ` • ${new Date(selectedItem.release_date).getFullYear()}`}
                                        {selectedItem.rating && ` • ★ ${selectedItem.rating}`}
                                    </p>
                                    {selectedItem.cast && <CastChips cast={Array.isArray(selectedItem.cast) ? selectedItem.cast : selectedItem.cast.split(',').filter(Boolean)} />}
                                </div>
                            </div>

                            <p className="text-[var(--text-secondary)] leading-relaxed">{selectedItem.overview || 'No overview available.'}</p>

                            <div className="flex gap-3 mt-6">
                                <MagneticButton
                                    onClick={closeModal}
                                    className="flex-1 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"
                                >
                                    Close
                                </MagneticButton>
                                <MagneticButton
                                    onClick={(e) => handleDelete(e, selectedItem.imdb_id, selectedItem.name)}
                                    className="flex-1 py-3 bg-red-600/90 hover:bg-red-700 rounded-xl"
                                >
                                    Remove
                                </MagneticButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
