import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImdbId, addToWatchlist, addToWatching, addToCompleted } from '../services/api';
import { useToast } from './ToastProvider';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore, getPosterUrl } from '../stores/settingsStore';
import CastChips from './CastChips';
import MagneticButton from './MagneticButton';
import gsap from 'gsap';

export default function MovieCard({ movie, contentType = 'movie', onAdded }) {
    const [showActions, setShowActions] = useState(false);
    const [showOverview, setShowOverview] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null);
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

    const handleClick = () => {
        setShowOverview(true);
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
                className="relative group cursor-pointer rounded-xl overflow-hidden card-shadow transition-all duration-300 hover:card-shadow-hover"
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
                onClick={handleClick}
            >
                <img
                    src={posterUrl}
                    alt={title}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
                />

                {movie.release_date && new Date(movie.release_date) > new Date() && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full pulse-badge z-10">
                        UPCOMING
                    </div>
                )}

                <div
                    ref={overlayRef}
                    className="absolute inset-0 flex flex-col justify-between p-3 transition-opacity duration-300"
                    style={{ background: showInfo ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.75)', opacity: showActions ? 1 : 0 }}
                >
                    <div className="flex justify-end">
                        <button
                            onClick={handleInfoToggle}
                            className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-red-600' : 'bg-black/40 hover:bg-black/60'}`}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>

                    {!showInfo ? (
                        <>
                            <div className="text-center mb-2">
                                <p className="text-white font-medium text-sm drop-shadow-lg line-clamp-2">{title}</p>
                                {movie.release_date && (
                                    <p className="text-gray-300 text-xs mt-1">
                                        {new Date(movie.release_date).getFullYear()}
                                        {movie.content_type !== 'tv' && runtime && ` • ${formatRuntime(runtime)}`}
                                    </p>
                                )}
                                {movie.content_type === 'tv' && (seasonCount || episodeCount) && (
                                    <p className="text-gray-400 text-xs mt-1">
                                        {seasonCount ? `${seasonCount} Season${seasonCount > 1 ? 's' : ''}` : ''}
                                        {seasonCount && episodeCount ? ' • ' : ''}
                                        {episodeCount ? `${episodeCount} Episodes` : ''}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5 mt-auto">
                                <MagneticButton
                                    onClick={(e) => { e.stopPropagation(); handleAdd('watchlist'); }}
                                    disabled={loading}
                                    className="w-full py-2 bg-blue-600/90 hover:bg-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
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
                                    className="w-full py-2 bg-yellow-600/90 hover:bg-yellow-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
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
                                    className="w-full py-2 bg-green-600/90 hover:bg-green-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
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
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto mt-2 pb-14">
                            <p className="text-white text-sm leading-relaxed px-1">{overview}</p>
                            {movie.cast && <CastChips cast={Array.isArray(movie.cast) ? movie.cast : movie.cast.split(',').filter(Boolean)} />}
                        </div>
                    )}
                </div>
            </div>

            {showOverview && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowOverview(false)}
                >
                    <div
                        className="glass noise-overlay rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex gap-4 mb-4">
                                <img
                                    src={posterUrl}
                                    alt={title}
                                    className="w-32 h-48 object-cover rounded-lg shadow-lg"
                                    onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
                                />
                                <div>
                                    <h2 className="text-2xl font-bold">{title}</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                        {contentTypeLabel}
                                        {movie.release_date && ` • ${new Date(movie.release_date).getFullYear()}`}
                                        {movie.rating && ` • ★ ${movie.rating}`}
                                        {movie.content_type !== 'tv' && runtime && ` • ${formatRuntime(runtime)}`}
                                        {movie.content_type === 'tv' && (seasonCount || episodeCount) && (
                                            <span className="ml-2">
                                                {seasonCount ? `${seasonCount} Season${seasonCount > 1 ? 's' : ''}` : ''}
                                                {seasonCount && episodeCount ? ' • ' : ''}
                                                {episodeCount ? `${episodeCount} Episodes` : ''}
                                            </span>
                                        )}
                                    </p>
                                    {movie.cast && <CastChips cast={Array.isArray(movie.cast) ? movie.cast : movie.cast.split(',').filter(Boolean)} />}
                                </div>
                            </div>

                            <p className="text-[var(--text-secondary)] leading-relaxed">{overview}</p>

                            {movie.release_date && new Date(movie.release_date) > new Date() && (
                                <div className="mt-4 px-3 py-2 bg-red-600/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full pulse-badge" />
                                    <span className="text-red-400 text-sm font-medium">Upcoming • Releases {new Date(movie.release_date).toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="flex gap-2 mt-6">
                                <MagneticButton
                                    onClick={() => { setShowOverview(false); setShowActions(true); }}
                                    className="flex-1 py-3 bg-red-600/90 hover:bg-red-700 rounded-xl"
                                >
                                    Add to List
                                </MagneticButton>
                                <MagneticButton
                                    onClick={() => setShowOverview(false)}
                                    className="flex-1 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"
                                >
                                    Close
                                </MagneticButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
