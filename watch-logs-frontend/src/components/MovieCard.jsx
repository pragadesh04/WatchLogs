import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImdbId, addToWatchlist, addToWatching, addToCompleted, getSeriesMetadata, getImdbId as getImdbIdForCredits } from '../services/api';
import { useToast } from './ToastProvider';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore, getPosterUrl } from '../stores/settingsStore';
import CastChips from './CastChips';
import MagneticButton from './MagneticButton';

export default function MovieCard({ movie, contentType = 'movie', onAdded, showProgress = false, progress = 0 }) {
    const [showActions, setShowActions] = useState(false);
    const [showOverview, setShowOverview] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null);
    const [credits, setCredits] = useState(null);
    const [seriesMetadata, setSeriesMetadata] = useState(null);
    const [fetchingEpisodes, setFetchingEpisodes] = useState(false);
    const cardRef = useRef(null);
    const overlayRef = useRef(null);
    const { showToast } = useToast();
    const { isAuthenticated } = useAuthStore();
    const { showImages } = useSettingsStore();
    const navigate = useNavigate();

    const posterUrl = getPosterUrl(movie, showImages);
    const title = movie.name || movie.title || 'Untitled';
    const overview = movie.overview || 'No overview available.';
    const contentTypeLabel = movie.content_type === 'tv' ? 'TV Series' : 'Movie';
    const seasonCount = movie.total_seasons;
    const episodeCount = movie.total_episodes;
    const runtime = movie.total_runtime;

    const formatRuntime = (mins) => {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    const fetchCredits = async () => {
        try {
            const type = movie.content_type || contentType;
            const imdbRes = await getImdbIdForCredits(movie.id, type);
            const imdbId = imdbRes.data.response;
            if (imdbId) {
                setCredits({
                    cast: movie.cast || [],
                    directors: movie.directors || []
                });
            }
        } catch (err) {
            console.error('Failed to fetch credits:', err);
        }
    };

    const fetchEpisodes = async () => {
        if (movie.content_type !== 'tv' && movie.content_type !== 'series') return;
        setFetchingEpisodes(true);
        try {
            const type = movie.content_type || contentType;
            const imdbRes = await getImdbIdForCredits(movie.id, type);
            const imdbId = imdbRes.data.response;
            if (imdbId) {
                const res = await getSeriesMetadata(imdbId);
                if (res.data && res.data.status !== "error") {
                    setSeriesMetadata(res.data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch episodes:', err);
            showToast('Failed to fetch episode data', 'error');
        }
        setFetchingEpisodes(false);
    };

    useEffect(() => {
        if (showOverview && !credits) {
            fetchCredits();
        }
    }, [showOverview]);

    const handleClick = () => {
        navigate(`/info/${movie.id}`, { state: { movie } });
    };

    const handleInfoToggle = (e) => {
        e.stopPropagation();
        setShowInfo(!showInfo);
        setShowActions(true);
    };

    const handleAdd = async (listType) => {
        if (!isAuthenticated) {
            showToast('Please login to add movies to your list', 'error');
            navigate('/login');
            return;
        }

        setLoadingAction(listType);
        setLoading(true);
        try {
            const type = movie.content_type || contentType;
            const imdbRes = await getImdbId(movie.id, type);
            const imdbId = imdbRes.data.response;
            const movieName = movie.name || movie.title || 'Untitled';

            if (listType === 'watchlist') {
                await addToWatchlist(imdbId, type);
                showToast(`Added "${movieName}" to Watchlist`, 'success');
            } else if (listType === 'watching') {
                await addToWatching(imdbId, 0, null, type);
                showToast(`Added "${movieName}" to Watching`, 'success');
            } else if (listType === 'completed') {
                await addToCompleted(imdbId, type);
                showToast(`Added "${movieName}" to Completed`, 'success');
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
                ref={cardRef}
                className="relative group cursor-pointer rounded-2xl overflow-hidden card-shadow transition-all duration-300 hover:card-shadow-hover hover:scale-[1.02]"
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => { setShowActions(false); setShowInfo(false); }}
                onClick={handleClick}
            >
                <img
                    src={posterUrl}
                    alt={title}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
                />

                {/* Gradient overlay at bottom for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

                {/* Upcoming badge */}
                {movie.release_date && new Date(movie.release_date) > new Date() && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-[var(--accent-primary)] text-white text-xs font-bold rounded-full pulse-badge z-10 shadow-lg">
                        UPCOMING
                    </div>
                )}

                {/* Progress bar for watching list */}
                {showProgress && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/80 backdrop-blur-sm">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)] progress-neon transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}

                {/* Bottom info overlay - always visible */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
                    <h3 className="font-bold text-sm md:text-base line-clamp-2 mb-1 drop-shadow-lg">{title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                        {movie.release_date && (
                            <span>{new Date(movie.release_date).getFullYear()}</span>
                        )}
                        {movie.content_type !== 'tv' && runtime && (
                            <span>• {formatRuntime(runtime)}</span>
                        )}
                        {movie.rating && (
                            <span className="flex items-center gap-0.5">
                                • ★ {movie.rating}
                            </span>
                        )}
                    </div>
                    {movie.content_type === 'tv' && (seasonCount || episodeCount) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            {seasonCount ? `${seasonCount} Season${seasonCount > 1 ? 's' : ''}` : ''}
                            {seasonCount && episodeCount ? ' • ' : ''}
                            {episodeCount ? `${episodeCount} Episodes` : ''}
                        </p>
                    )}
                </div>

                {/* Hover overlay with actions - sits on top with higher z-index */}
                <div
                    ref={overlayRef}
                    className="absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-300 backdrop-blur-sm z-20"
                    style={{ background: 'rgba(0,0,0,0.85)', opacity: showActions ? 1 : 0 }}
                >
                    <div className="flex justify-end">
                        <button
                            onClick={handleInfoToggle}
                            className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-red-600 shadow-lg' : 'bg-black/40 hover:bg-black/60'}`}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Action buttons - positioned at bottom with higher z-index */}
                    {!showInfo ? (
                        <div className="flex flex-col gap-1.5 mt-auto z-30 relative">
                            <MagneticButton
                                onClick={(e) => { e.stopPropagation(); handleAdd('watchlist'); }}
                                disabled={loading}
                                className="w-full py-2 bg-[var(--accent-muted,blue-600/90)] hover:opacity-90 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 shadow-lg"
                             >
                                {loadingAction === 'watchlist' ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                    </svg>
                                )}
                                Watchlist
                            </MagneticButton>
                            <MagneticButton
                                onClick={(e) => { e.stopPropagation(); handleAdd('watching'); }}
                                disabled={loading}
                                className="w-full py-2 bg-[var(--accent-secondary,yellow-600/90)] hover:opacity-90 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 shadow-lg"
                             >
                                {loadingAction === 'watching' ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                                Watching
                            </MagneticButton>
                            <MagneticButton
                                onClick={(e) => { e.stopPropagation(); handleAdd('completed'); }}
                                disabled={loading}
                                className="w-full py-2 bg-[var(--accent-secondary,green-600/90)] hover:opacity-90 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 shadow-lg"
                             >
                                {loadingAction === 'completed' ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                )}
                                Completed
                            </MagneticButton>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto mt-2 pb-14 custom-scrollbar">
                            <p className="text-white text-sm leading-relaxed px-1">{overview}</p>
                            {credits?.cast && <CastChips cast={Array.isArray(credits.cast) ? credits.cast : credits.cast.split(',').filter(Boolean)} />}
                            {credits?.directors && credits.directors.length > 0 && (
                                <div className="mt-2 px-1">
                                    <p className="text-gray-400 text-xs">Director(s): {credits.directors.join(', ')}</p>
                                </div>
                            )}
                            {movie.content_type === 'tv' && (
                                <div className="mt-3 px-1">
                                    {!seriesMetadata ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fetchEpisodes(); }}
                                            disabled={fetchingEpisodes}
                                            className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-700 rounded-lg text-xs font-medium disabled:opacity-50 shadow-lg"
                                        >
                                            {fetchingEpisodes ? 'Fetching...' : 'Fetch Episodes'}
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-300">
                                            <p className="font-medium text-white mb-1">Seasons & Episodes</p>
                                            <p>Total: {seriesMetadata.total_seasons} Seasons, {seriesMetadata.total_episodes} Episodes</p>
                                            {seriesMetadata.seasons?.map((season) => (
                                                <div key={season.season} className="mt-1 ml-2">
                                                    <p className="text-gray-400">Season {season.season}: {season.episode_count || season.totalEpisodes || 0} episodes</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </>
    );
}
