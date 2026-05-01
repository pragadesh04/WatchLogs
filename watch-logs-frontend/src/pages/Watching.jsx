import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatching, deleteFromWatching, updateWatchingProgress, moveToCompleted } from '../services/api';
import { useSettingsStore, getGridCols, getPosterUrl } from '../stores/settingsStore';
import { useUniverseStore } from '../stores/universeStore';
import { useStatsStore } from '../stores/statsStore';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useToast } from '../components/ToastProvider';
import SentientCard from '../components/SentientCard';
import AnimeCard from '../components/AnimeCard';
import CastChips from '../components/CastChips';
import MagneticButton from '../components/MagneticButton';
import gsap from 'gsap';

const formatRuntime = (mins) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

const sanitizeSeriesData = (value, fallback = '?') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = parseInt(value);
    return isNaN(num) ? fallback : num;
};

export default function Watching() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [sortBy, setSortBy] = useState('date_added');
    const [animeSubTab, setAnimeSubTab] = useState('all');
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [progress, setProgress] = useState({ season: '', episode: '' });
    const [seriesDetails, setSeriesDetails] = useState(null);
    const [animeEpisodes, setAnimeEpisodes] = useState([]);
    const [animeEpLoading, setAnimeEpLoading] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualInput, setManualInput] = useState({ seasons: '', perSeason: [] });
    const [showPerSeasonInput, setShowPerSeasonInput] = useState(false);
    const [usingDefault, setUsingDefault] = useState(false);
    const [updating, setUpdating] = useState(false);
    const gridRef = useRef(null);
    const modalRef = useRef(null);
    const backdropRef = useRef(null);
    const seasonRefs = useRef({});
    const [expandedSeasons, setExpandedSeasons] = useState({});
    const { universe } = useUniverseStore();
    const { gridSize, showImages } = useSettingsStore();
    const { updateFromLists } = useStatsStore();
    const { showToast } = useToast();

    const loadData = async (search = '') => {
        try {
            const res = await fetchWatching('date_added', 'desc', null, search);
            const data = res.data || [];
            setItems(data);
            updateFromLists([], data, []);
        } catch (err) {
            console.error('Failed to fetch watching:', err);
        }
        setLoading(false);
    };

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
        if (selectedItem && selectedItem.content_type !== 'tv' && selectedItem.content_type !== 'series') {
            setHours(Math.floor((selectedItem.time_stamp || 0) / 60));
            setMinutes((selectedItem.time_stamp || 0) % 60);
        }
    }, [selectedItem]);

    useEffect(() => {
        if (selectedItem && (selectedItem.content_type === 'tv' || selectedItem.content_type === 'series')) {
            const cached = localStorage.getItem(`series_${selectedItem.imdb_id}`);
            if (cached) {
                try {
                    setSeriesDetails(JSON.parse(cached));
                    setUsingDefault(false);
                } catch {
                    fetchSeriesData(selectedItem);
                }
            } else {
                fetchSeriesData(selectedItem);
            }
        } else {
            setSeriesDetails(null);
        }
    }, [selectedItem]);

    useEffect(() => {
        if (selectedItem && selectedItem.content_type === 'anime_tv') {
            loadAnimeEpisodes(selectedItem.imdb_id);
        } else {
            setAnimeEpisodes([]);
        }
    }, [selectedItem]);

    const fetchSeriesData = async (item) => {
        try {
            const { getSeriesDetails } = await import('../services/api');
            const res = await getSeriesDetails(item.imdb_id);
            if (res?.data) {
                setSeriesDetails(res.data);
                localStorage.setItem(`series_${item.imdb_id}`, JSON.stringify(res.data));
                setUsingDefault(false);
            } else {
                useDefaultSeries(item);
            }
        } catch {
            useDefaultSeries(item);
        }
    };

    const useDefaultSeries = (item) => {
        const seriesData = {
            totalSeasons: 99,
            totalEpisodes: 99,
            seasons: Array.from({ length: 99 }, (_, i) => ({
                season: i + 1,
                totalEpisodes: 99,
                episodes: []
            }))
        };
        setSeriesDetails(seriesData);
        localStorage.setItem(`series_${item.imdb_id}`, JSON.stringify(seriesData));
        setUsingDefault(true);
    };

    const loadAnimeEpisodes = async (imdbId) => {
        setAnimeEpLoading(true);
        try {
            const { getAnimeEpisodes } = await import('../services/api');
            const malId = parseInt(imdbId.replace('mal_', ''));
            const res = await getAnimeEpisodes(malId, 1);
            setAnimeEpisodes(res.episodes || []);
        } catch {
            setAnimeEpisodes([]);
        }
        setAnimeEpLoading(false);
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...items];

        if (universe === 'anime') {
            result = result.filter(item => item.content_type === 'anime_movie' || item.content_type === 'anime_tv');
        } else {
            result = result.filter(item => item.content_type === 'movie' || item.content_type === 'tv' || item.content_type === 'series');
        }

        if (appliedSearch) {
            const term = appliedSearch.toLowerCase();
            result = result.filter(item => {
                const name = (item.name || '').toLowerCase();
                const cast = (Array.isArray(item.cast) ? item.cast.join(', ') : (item.cast || '')).toLowerCase();
                const director = (item.director || '').toLowerCase();
                return name.includes(term) || cast.includes(term) || director.includes(term);
            });
        }

        if (universe === 'anime' && animeSubTab !== 'all') {
            result = result.filter(item =>
                animeSubTab === 'tv' ? item.content_type === 'anime_tv' : item.content_type === 'anime_movie'
            );
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
    }, [items, universe, appliedSearch, sortBy, animeSubTab]);

    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter') {
            setAppliedSearch(searchTerm);
            loadData(searchTerm);
        }
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setProgress({ season: '', episode: '' });

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

        setTimeout(() => {
            setSelectedItem(null);
            setSeriesDetails(null);
            setAnimeEpisodes([]);
            setShowManualModal(false);
            setUsingDefault(false);
        }, 300);
    };

    const handleSaveProgress = async () => {
        if (!selectedItem) return;
        setUpdating(true);

        try {
            let timeStamp = 0;
            let currentSeason = null;
            let currentEpisode = null;

            if (selectedItem.content_type === 'tv' || selectedItem.content_type === 'series') {
                currentSeason = sanitizeSeriesData(progress.season, 1);
                currentEpisode = sanitizeSeriesData(progress.episode, 1);
            } else if (selectedItem.content_type === 'anime_tv') {
                currentEpisode = sanitizeSeriesData(progress.episode, 1);
            } else {
                timeStamp = hours * 60 + minutes;
            }

            await updateWatchingProgress(
                selectedItem.imdb_id,
                timeStamp,
                currentSeason,
                currentEpisode
            );

            showToast('Progress updated!', 'success');
            closeModal();
        } catch (err) {
            console.error('Failed to update progress:', err);
        }
        setUpdating(false);
    };

    const handleMoveToCompleted = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await moveToCompleted(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            showToast(`Moved "${name}" to Completed`, 'success');
            closeModal();
        } catch (err) {
            console.error('Failed to move to completed:', err);
        }
    };

    const handleDelete = async (e, imdbId, name) => {
        e.stopPropagation();
        try {
            await deleteFromWatching(imdbId);
            setItems(items.filter(item => item.imdb_id !== imdbId));
            showToast(`Removed "${name}" from Watching`, 'success');
            closeModal();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    if (loading) {
        return (
            <div className="pb-20 px-4 py-6">
                <div className="h-8 w-32 bg-[var(--bg-card)] rounded mb-6 animate-pulse" />
                <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
            </div>
        );
    }

    if (items.length === 0 && !appliedSearch) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
                <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <h2 className="text-xl font-semibold mb-2">Nothing in Progress</h2>
                <p className="text-[var(--text-secondary)] mb-6">Movies and shows you're watching will appear here</p>
                <Link
                    to="/"
                    className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors"
                >
                    Browse Trending
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-20 px-4 py-6 relative">
            <h1 className="text-2xl font-bold mb-6">Watching</h1>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    placeholder="Search... (press Enter to apply)"
                    className="flex-1 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)/50] transition-colors"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)/50]"
                >
                    <option value="date_added">Date Added</option>
                    <option value="title">Title</option>
                    <option value="release_year">Release Year</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            {universe === 'anime' && (
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setAnimeSubTab('all')} className={`px-4 py-2 rounded-lg transition-colors ${animeSubTab === 'all' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>All</button>
                    <button onClick={() => setAnimeSubTab('tv')} className={`px-4 py-2 rounded-lg transition-colors ${animeSubTab === 'tv' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>TV</button>
                    <button onClick={() => setAnimeSubTab('movie')} className={`px-4 py-2 rounded-lg transition-colors ${animeSubTab === 'movie' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}>Movies</button>
                </div>
            )}

            <div ref={gridRef}>
                {filteredAndSorted.length > 0 && (
                    <div className={`grid ${getGridCols(gridSize)} gap-4`}>
                        {filteredAndSorted.map((item) => (
                            <div key={item.id}>
                                {universe === 'anime' ? (
                                    <AnimeCard anime={item} />
                                ) : (
                                    <div onClick={() => handleItemClick(item)} className="cursor-pointer">
                                        <SentientCard
                                            item={item}
                                            showProgress
                                            progress={item.time_stamp ? Math.min((item.time_stamp / 120) * 100, 100) : 0}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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
                                    className="w-24 h-36 object-cover rounded-lg shadow-lg"
                                />
                                <div>
                                    <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                                        {selectedItem.content_type === 'tv' || selectedItem.content_type === 'series' || selectedItem.content_type === 'anime_tv' ? 'TV Series' : 'Movie'}
                                        {selectedItem.release_date && ` • ${new Date(selectedItem.release_date).getFullYear()}`}
                                        {selectedItem.rating && ` • ★ ${selectedItem.rating}`}
                                        {(selectedItem.content_type === 'tv' || selectedItem.content_type === 'series' || selectedItem.content_type === 'anime_tv') && (
                                            <span className="ml-2">
                                                {`S${sanitizeSeriesData(selectedItem.current_season, '?')}E${sanitizeSeriesData(selectedItem.current_episode, '?')}`}
                                            </span>
                                        )}
                                    </p>
                                    {selectedItem.cast && <CastChips cast={Array.isArray(selectedItem.cast) ? selectedItem.cast : selectedItem.cast.split(',').filter(Boolean)} />}
                                    {selectedItem.directors && selectedItem.directors.length > 0 && (
                                        <p className="text-gray-400 text-xs mt-1">Director(s): {Array.isArray(selectedItem.directors) ? selectedItem.directors.join(', ') : selectedItem.directors}</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-[var(--text-secondary)] mb-4">{selectedItem.overview || 'No overview available.'}</p>

                            {selectedItem.release_date && new Date(selectedItem.release_date) > new Date() && (
                                <div className="mb-4 px-3 py-2 bg-[var(--accent-primary)/20] border border-[var(--accent-primary)/30] rounded-lg flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full pulse-badge" />
                                    <span className="text-[var(--accent-primary)/90] text-sm font-medium">Upcoming • Releases {new Date(selectedItem.release_date).toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-4">
                                <h3 className="text-sm font-semibold mb-3">Update Progress</h3>

                                {selectedItem.content_type === 'tv' || selectedItem.content_type === 'series' || selectedItem.content_type === 'anime_tv' ? (
                                    <div>
                                        {seriesDetails || selectedItem.content_type === 'anime_tv' ? (
                                            <>
                                                {selectedItem.content_type !== 'anime_tv' && (
                                                    <div className="flex gap-3 mb-3">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-[var(--text-secondary)]">Season</label>
                                                            <select
                                                                value={progress.season}
                                                                onChange={(e) => {
                                                                    setProgress({ ...progress, season: e.target.value, episode: '' });
                                                                    setExpandedSeasons({ [e.target.value]: true });
                                                                }}
                                                                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white mt-1 cursor-pointer"
                                                            >
                                                                <option value="">Select Season</option>
                                                                {seriesDetails?.seasons.map((s) => (
                                                                    <option key={s.season} value={s.season}>
                                                                        Season {s.season} - {s.totalEpisodes} episodes
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs text-[var(--text-secondary)]">Episode</label>
                                                            <select
                                                                value={progress.episode}
                                                                onChange={(e) => setProgress({ ...progress, episode: e.target.value })}
                                                                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white mt-1 cursor-pointer"
                                                            >
                                                                <option value="">Select Episode</option>
                                                                {(() => {
                                                                    if (selectedItem.content_type === 'anime_tv' && animeEpisodes.length > 0) {
                                                                        return animeEpisodes.map((ep) => (
                                                                            <option key={ep.mal_id || ep.episode_id} value={ep.mal_id || ep.episode_id}>
                                                                                {ep.mal_id || ep.episode_id}: {ep.title || 'Episode'}
                                                                            </option>
                                                                        ));
                                                                    }
                                                                    const selectedSeason = seriesDetails?.seasons.find(
                                                                        s => s.season.toString() === progress.season
                                                                    );
                                                                    if (selectedSeason?.episodes?.length > 0) {
                                                                        return selectedSeason.episodes.map((ep) => (
                                                                            <option key={ep.Episode} value={ep.Episode}>
                                                                                {ep.Episode}: {ep.Title}
                                                                            </option>
                                                                        ));
                                                                    }
                                                                    if (selectedSeason) {
                                                                        return Array.from(
                                                                            { length: selectedSeason.totalEpisodes },
                                                                            (_, i) => (
                                                                                <option key={i + 1} value={i + 1}>
                                                                                    Episode {i + 1}
                                                                                </option>
                                                                            )
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedItem.content_type === 'anime_tv' && (
                                                    <div className="mb-3">
                                                        <label className="text-xs text-[var(--text-secondary)]">Episode</label>
                                                        {animeEpLoading ? (
                                                            <div className="text-center py-2 text-[var(--text-secondary)]">Loading episodes...</div>
                                                        ) : animeEpisodes.length > 0 ? (
                                                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                                                {animeEpisodes.map((ep) => (
                                                                    <div
                                                                        key={ep.mal_id || ep.episode_id}
                                                                        onClick={() => setProgress({ ...progress, episode: (ep.mal_id || ep.episode_id)?.toString() || '' })}
                                                                        className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors ${progress.episode === (ep.mal_id || ep.episode_id)?.toString()
                                                                                ? 'bg-[var(--accent-primary)/30] text-white'
                                                                                : 'hover:bg-white/10 text-[var(--text-secondary)]'
                                                                            }`}
                                                                    >
                                                                        Ep {ep.mal_id || ep.episode_id}: {ep.title || 'Episode'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-[var(--text-secondary)]">No episode data available</p>
                                                        )}
                                                    </div>
                                                )}

                                                {usingDefault && (
                                                    <p className="text-xs text-yellow-500 mb-2">Using default metadata (99/99)</p>
                                                )}
                                            </>
                                        ) : showManualModal ? (
                                            <div className="space-y-3">
                                                <p className="text-sm text-[var(--text-secondary)]">Details not found. Enter manually:</p>
                                                <div className="flex gap-3 mb-3">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-[var(--text-secondary)]">Total Seasons</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={manualInput.seasons}
                                                            onChange={(e) => {
                                                                const seasons = parseInt(e.target.value) || 0;
                                                                setManualInput({
                                                                    seasons: e.target.value,
                                                                    perSeason: Array.from({ length: seasons }, () => '')
                                                                });
                                                                setShowPerSeasonInput(seasons > 1);
                                                            }}
                                                            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white mt-1"
                                                            placeholder="Seasons"
                                                        />
                                                    </div>
                                                </div>

                                                {showPerSeasonInput && manualInput.perSeason.length > 0 && (
                                                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                        <p className="text-xs text-[var(--text-secondary)]">Episodes per season:</p>
                                                        {manualInput.perSeason.map((_, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-400 w-20">S{idx + 1}:</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={manualInput.perSeason[idx]}
                                                                    onChange={(e) => {
                                                                        const newPerSeason = [...manualInput.perSeason];
                                                                        newPerSeason[idx] = e.target.value;
                                                                        setManualInput({ ...manualInput, perSeason: newPerSeason });
                                                                    }}
                                                                    className="flex-1 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white text-sm"
                                                                    placeholder="Episodes"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const seasons = parseInt(manualInput.seasons) || 99;
                                                            let perSeason = manualInput.perSeason;

                                                            if (perSeason.length === 0 || perSeason.every(e => !e)) {
                                                                perSeason = Array.from({ length: seasons }, () => '99');
                                                            }

                                                            const seasonsData = perSeason.map((epCount, idx) => ({
                                                                season: idx + 1,
                                                                totalEpisodes: parseInt(epCount) || 99,
                                                                episodes: []
                                                            }));

                                                            const totalEpisodes = seasonsData.reduce((acc, s) => acc + s.totalEpisodes, 0);

                                                            const seriesData = {
                                                                totalSeasons: seasons,
                                                                totalEpisodes,
                                                                seasons: seasonsData
                                                            };

                                                            setSeriesDetails(seriesData);
                                                            localStorage.setItem(`series_${selectedItem.imdb_id}`, JSON.stringify(seriesData));
                                                            setShowManualModal(false);
                                                        }}
                                                        className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg text-sm"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            useDefaultSeries(selectedItem);
                                                            setShowManualModal(false);
                                                        }}
                                                        className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] rounded-lg text-sm"
                                                    >
                                                        Cancel (Use 99/99)
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-2"></div>
                                                <p className="text-sm text-[var(--text-secondary)]">Loading series data...</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-4 items-center bg-black/20 p-4 rounded-xl">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase tracking-widest text-gray-400">Hours</label>
                                            <select
                                                value={hours}
                                                onChange={(e) => setHours(parseInt(e.target.value))}
                                                className="w-full bg-transparent text-xl font-bold focus:outline-none cursor-pointer"
                                            >
                                                {[...Array(10)].map((_, i) => (
                                                    <option key={i} value={i} className="bg-gray-900">{i}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="h-8 w-[1px] bg-white/10" />
                                        <div className="flex-[2]">
                                            <label className="text-[10px] uppercase tracking-widest text-gray-400">Minutes ({minutes}m)</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="59"
                                                value={minutes}
                                                onChange={(e) => setMinutes(parseInt(e.target.value))}
                                                className="w-full cursor-pointer"
                                                style={{ '--progress': `${(minutes / 59) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mb-3">
                                <MagneticButton
                                    onClick={handleSaveProgress}
                                    disabled={updating}
                                    className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl disabled:opacity-50"
                                >
                                    {updating ? 'Saving...' : 'Save Progress'}
                                </MagneticButton>
                            </div>

                            <div className="flex gap-3">
                                <MagneticButton
                                    onClick={(e) => handleMoveToCompleted(e, selectedItem.imdb_id, selectedItem.name)}
                                    className="flex-1 py-3 bg-green-600/90 hover:bg-green-700 rounded-xl flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark Completed
                                </MagneticButton>

                                <MagneticButton
                                    onClick={(e) => handleDelete(e, selectedItem.imdb_id, selectedItem.name)}
                                    className="flex-1 py-3 bg-[var(--bg-card)] hover:bg-red-600/30 border border-[var(--border-color)] rounded-xl transition-colors"
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
