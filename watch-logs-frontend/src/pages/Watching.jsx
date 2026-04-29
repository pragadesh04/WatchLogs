import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatching, updateProgress, deleteFromWatching, addToCompleted } from '../services/api';
import { useSettingsStore, getGridCols, getPosterUrl } from '../stores/settingsStore';
import { useStatsStore } from '../stores/statsStore';
import { SkeletonGrid } from '../components/SkeletonCard';
import { useToast } from '../components/ToastProvider';
import SentientCard from '../components/SentientCard';
import CastChips from '../components/CastChips';
import MagneticButton from '../components/MagneticButton';
import gsap from 'gsap';
import axios from 'axios';

const OMDB_API_KEY = 'c5390a05';

const formatRuntime = (runtime) => {
    if (!runtime) return '';
    const hours = Math.floor(runtime / 60);
    const mins = runtime % 60;
    return `${hours}h ${mins}m`;
};

const sanitizeSeriesData = (value, fallback = 1) => {
    if (!value) return fallback;
    if (typeof value === 'number') return Math.floor(value);
    const str = String(value);
    // Handle dirty strings like "#episode1.1" or "#1.1" - extract only integer part
    const match = str.match(/(\d+)/);
    if (match) {
        const num = parseInt(match[1], 10);
        return isNaN(num) ? fallback : num;
    }
    return fallback;
};

const calculateSeriesProgress = (item) => {
    if (!item) return 0;
    const currentSeason = sanitizeSeriesData(item.current_season, 1);
    const currentEpisode = sanitizeSeriesData(item.current_episode, 1);
    const totalSeasons = item.total_seasons || 1;
    const totalEpisodes = item.total_episodes || 1;
    // Approximate progress based on current season/episode
    const totalWatched = (currentSeason - 1) * (totalEpisodes / totalSeasons) + currentEpisode;
    const progress = (totalWatched / totalEpisodes) * 100;
    return Math.min(progress, 100);
};

export default function Watching() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [progress, setProgress] = useState({ minutes: '', season: '', episode: '' });
    const [updating, setUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_added');
    const [seriesDetails, setSeriesDetails] = useState(null);
    const [expandedSeasons, setExpandedSeasons] = useState({});
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualInput, setManualInput] = useState({ seasons: '', perSeason: [] });
    const [showPerSeasonInput, setShowPerSeasonInput] = useState(false);
    const [usingDefault, setUsingDefault] = useState(false);
    const seasonRefs = useRef({});
    const gridRef = useRef(null);
    const modalRef = useRef(null);
    const backdropRef = useRef(null);
    const { gridSize, showImages } = useSettingsStore();
    const { updateFromLists, incrementWatched } = useStatsStore();
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
        Object.entries(expandedSeasons).forEach(([season, isExpanded]) => {
            const el = seasonRefs.current[season];
            if (el) {
                if (isExpanded) {
                    gsap.fromTo(el,
                        { height: 0, opacity: 0 },
                        { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' }
                    );
                }
            }
        });
    }, [expandedSeasons]);

    const loadData = async () => {
        try {
            const res = await fetchWatching(sortBy, 'desc');
            const data = res.data || [];
            setItems(data);
            updateFromLists([], data, []);
        } catch (err) {
            console.error('Failed to fetch watching:', err);
        }
        setLoading(false);
    };

    const loadSeriesMetadata = async (imdbId, content_type) => {
        if (content_type !== 'tv' && content_type !== 'series') return;
        
        try {
            setSeriesDetails(null);
            setExpandedSeasons({});
            setUsingDefault(false);
            
            // Check localStorage for previously stored manual data
            const savedData = localStorage.getItem(`series_${imdbId}`);
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    setSeriesDetails(parsed);
                    return;
                } catch (e) {
                    localStorage.removeItem(`series_${imdbId}`);
                }
            }
            
            // Use new backend API to get series metadata from TMDB
            try {
                const res = await getSeriesMetadata(imdbId);
                if (res.data && res.data.status !== "error") {
                    // Transform backend format to frontend format
                    const seasons = (res.data.seasons || []).map(s => ({
                        season: s.season,
                        totalEpisodes: s.episode_count,
                        episodes: (s.episodes || []).map(ep => ({
                            Episode: ep.episode_number,
                            Title: ep.episode_name
                        }))
                    }));
                    
                    const seriesData = {
                        totalSeasons: res.data.total_seasons,
                        totalEpisodes: res.data.total_episodes,
                        seasons
                    };
                    
                    setSeriesDetails(seriesData);
                    
                    // Save to localStorage for future use
                    localStorage.setItem(`series_${imdbId}`, JSON.stringify(seriesData));
                    return;
                }
            } catch (apiError) {
                console.error('Failed to fetch from backend API:', apiError);
            }
            
            // Fallback: Trigger manual input
            setShowManualModal(true);
            
        } catch (err) {
            console.error('Failed to load series metadata:', err);
            setShowManualModal(true);
        }
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

    const handleItemClick = async (item) => {
        setSelectedItem(item);
        
        // Parse existing progress with sanitization
        const rawSeason = item.current_season;
        const rawEpisode = item.current_episode;
        const currentSeason = sanitizeSeriesData(rawSeason, 1);
        const currentEpisode = sanitizeSeriesData(rawEpisode, 1);
        const timeStamp = item.time_stamp || '';
        
        setProgress({
            minutes: timeStamp,
            season: currentSeason.toString(),
            episode: currentEpisode.toString()
        });
        
        // Parse hours/minutes for movie
        if (item.content_type !== 'tv' && item.content_type !== 'series') {
            const runtime = item.total_runtime || 120;
            const watchedMin = item.watched_minutes || 0;
            setHours(Math.floor(watchedMin / 60));
            setMinutes(watchedMin % 60);
        }
        
        // Load series metadata if TV
        if (item.content_type === 'tv' || item.content_type === 'series') {
            await loadSeriesMetadata(item.imdb_id, item.content_type);
        } else {
            setSeriesDetails(null);
        }

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

    const handleUpdateProgress = async () => {
        setUpdating(true);
        try {
            const data = {};
            if (selectedItem.content_type === 'tv' || selectedItem.content_type === 'series') {
                if (progress.season) data.season = parseInt(progress.season);
                if (progress.episode) data.episode = parseInt(progress.episode);
            } else {
                // Convert hours and minutes to total minutes
                const totalMinutes = (parseInt(hours) * 60) + parseInt(minutes);
                data.minutes = totalMinutes;
            }

            const res = await updateProgress(selectedItem.imdb_id, data);

            if (res.data?.action === 'completed') {
                showToast(`"${selectedItem.name}" completed!`, 'success');
                closeModal();
            } else {
                closeModal();
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
            closeModal();
            incrementWatched();
            showToast(`Moved "${name}" to Completed`, 'success');
        } catch (err) {
            console.error('Failed to move to completed:', err);
        }
    };

    const movies = filteredAndSorted.filter(i => i.content_type === 'movie');
    const series = filteredAndSorted.filter(i => i.content_type === 'tv' || i.content_type === 'series');

    if (loading) {
        return (
            <div className="pb-20 px-4 py-6">
                <div className="h-8 w-40 bg-[var(--bg-card)] rounded mb-6 animate-pulse" />
                <SkeletonGrid count={10} gridCols={getGridCols(gridSize)} />
            </div>
        );
    }

    if (items.length === 0 && !searchTerm) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-4">
                <svg className="w-20 h-20 text-gray-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                </svg>
                <h2 className="text-xl font-semibold mb-2">Nothing in Progress</h2>
                <p className="text-[var(--text-secondary)] mb-6">Start watching something</p>
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
            <h1 className="text-2xl font-bold mb-6">Currently Watching</h1>

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
                            <span className="text-red-500">●</span> Movies
                            <span className="text-sm text-[var(--text-secondary)]">({movies.length})</span>
                        </h2>
                        <div className={`grid ${getGridCols(gridSize)} gap-4 mb-6`}>
                            {movies.map((item) => (
                                <div key={item.id} className="sentient-card">
                                    <SentientCard
                                        item={item}
                                        onClick={() => handleItemClick(item)}
                                        showProgress
                                        progress={item.time_stamp ? Math.min((item.time_stamp / 120) * 100, 100) : 0}
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
                                        showProgress={false}
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
                                    className="w-24 h-36 object-cover rounded-lg shadow-lg"
                                />
                                <div>
                                    <h2 className="text-xl font-bold">{selectedItem.name}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                                        {selectedItem.content_type === 'tv' || selectedItem.content_type === 'series' ? 'TV Series' : 'Movie'}
                                        {selectedItem.release_date && ` • ${new Date(selectedItem.release_date).getFullYear()}`}
                                        {selectedItem.content_type !== 'tv' && selectedItem.content_type !== 'series' && selectedItem.total_runtime && ` • ${formatRuntime(selectedItem.total_runtime)}`}
                                        {(selectedItem.content_type === 'tv' || selectedItem.content_type === 'series') && (
                                            <span className="ml-2">
                                                {`S${sanitizeSeriesData(selectedItem.current_season, '?')}E${sanitizeSeriesData(selectedItem.current_episode, '?')}`}
                                            </span>
                                        )}
                                    </p>
                                    {selectedItem.cast && <CastChips cast={Array.isArray(selectedItem.cast) ? selectedItem.cast : selectedItem.cast.split(',').filter(Boolean)} />}
                                </div>
                            </div>

                            <p className="text-[var(--text-secondary)] mb-4">{selectedItem.overview || 'No overview available.'}</p>

                            {selectedItem.release_date && new Date(selectedItem.release_date) > new Date() && (
                                <div className="mb-4 px-3 py-2 bg-red-600/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full pulse-badge" />
                                    <span className="text-red-400 text-sm font-medium">Upcoming • Releases {new Date(selectedItem.release_date).toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-4">
                                <h3 className="text-sm font-semibold mb-3">Update Progress</h3>
                                {selectedItem.content_type === 'tv' || selectedItem.content_type === 'series' ? (
                                    <div>
                                        {seriesDetails ? (
                                            <>
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
                                                            {seriesDetails.seasons.map((s) => (
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
                                                                const selectedSeason = seriesDetails.seasons.find(
                                                                    s => s.season.toString() === progress.season
                                                                );
                                                                if (selectedSeason?.episodes?.length > 0) {
                                                                    return selectedSeason.episodes.map((ep) => {
                                                                        const epNum = sanitizeSeriesData(ep.Episode, ep.Episode);
                                                                        return (
                                                                            <option key={ep.Episode} value={epNum}>
                                                                                {epNum}: {ep.Title}
                                                                            </option>
                                                                        );
                                                                    });
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
                                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        onClick={() => {
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
                                                            localStorage.setItem(`series_${selectedItem.imdb_id}`, JSON.stringify(seriesData));
                                                            setShowManualModal(false);
                                                            setUsingDefault(true);
                                                        }}
                                                        className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] rounded-lg text-sm"
                                                    >
                                                        Cancel (Use 99/99)
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
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

                            {seriesDetails && selectedItem && (selectedItem.content_type === 'tv' || selectedItem.content_type === 'series') && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold mb-2">Season Details</h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {seriesDetails.seasons.map((season) => (
                                            <div key={season.season} className="backdrop-blur-xl bg-white/5 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedSeasons(prev => ({
                                                        ...prev,
                                                        [season.season]: !prev[season.season]
                                                    }))}
                                                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                                >
                                                    <span className="text-sm font-medium">
                                                        Season {season.season} - {season.totalEpisodes} episodes
                                                    </span>
                                                    <svg
                                                        className={`w-4 h-4 transition-transform ${expandedSeasons[season.season] ? 'rotate-180' : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                {expandedSeasons[season.season] && season.episodes?.length > 0 && (
                                                    <div 
                                                        ref={el => seasonRefs.current[season.season] = el}
                                                        className="px-4 pb-3 space-y-1"
                                                    >
                                                        {season.episodes.map((ep) => (
                                                            <div
                                                                key={ep.Episode}
                                                                onClick={() => setProgress({ ...progress, episode: ep.Episode })}
                                                                className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors ${
                                                                    progress.episode === ep.Episode
                                                                        ? 'bg-red-600/30 text-white'
                                                                        : 'hover:bg-white/10 text-[var(--text-secondary)]'
                                                                }`}
                                                            >
                                                                {ep.Episode}: {ep.Title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <MagneticButton
                                onClick={handleUpdateProgress}
                                disabled={updating}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 mb-3"
                            >
                                {updating ? 'Saving...' : 'Save Progress'}
                            </MagneticButton>

                            <MagneticButton
                                onClick={(e) => handleMoveToCompleted(e, selectedItem.imdb_id, selectedItem.name)}
                                className="w-full py-3 bg-green-600/90 hover:bg-green-700 rounded-xl flex items-center justify-center gap-2 mb-3"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Mark Completed
                            </MagneticButton>

                            <MagneticButton
                                onClick={(e) => handleDelete(e, selectedItem.imdb_id, selectedItem.name)}
                                className="w-full py-3 bg-[var(--bg-card)] hover:bg-red-600/30 border border-[var(--border-color)] rounded-xl transition-colors"
                            >
                                Remove
                            </MagneticButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
