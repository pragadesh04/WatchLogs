import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { addToWatchlist, addToWatching, addToCompleted, getImdbId, getSeriesMetadata, getImdbId as getImdbIdForCredits } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { useAuthStore } from '../stores/authStore';
import CastChips from '../components/CastChips';

export default function MovieInfo() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isAuthenticated } = useAuthStore();

    const [movie, setMovie] = useState(null);
    const [credits, setCredits] = useState(null);
    const [seriesMetadata, setSeriesMetadata] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);
    const [fetchingEpisodes, setFetchingEpisodes] = useState(false);

    const title = movie?.name || movie?.title || 'Untitled';
    const overview = movie?.overview || 'No overview available.';
    const contentTypeLabel = movie?.content_type === 'tv' || movie?.content_type === 'series' ? 'TV Series' : 'Movie';

    const posterUrl = movie?.poster_link
        ? movie.poster_link
        : movie?.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : movie?.poster_url || movie?.Poster || 'https://placehold.co/500x750/1a1a2e/666?text=No+Poster';

    const backdropUrl = movie?.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : posterUrl;

    const formatRuntime = (mins) => {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    const runtime = movie?.total_runtime;
    const seasonCount = movie?.total_seasons;
    const episodeCount = movie?.total_episodes;

    useEffect(() => {
        const movieData = location.state?.movie;
        if (movieData) {
            setMovie(movieData);
            const cast = Array.isArray(movieData.cast) ? movieData.cast : (movieData.cast ? movieData.cast.split(',').filter(Boolean) : []);
            const directors = Array.isArray(movieData.directors) ? movieData.directors : (movieData.directors ? movieData.directors.split(',').filter(Boolean) : []);
            if (cast.length > 0 || directors.length > 0) {
                setCredits({ cast, directors });
            }
        } else {
            showToast('No movie data available', 'error');
            navigate(-1);
        }
    }, []);

    const fetchEpisodes = async () => {
        if (!movie || (movie.content_type !== 'tv' && movie.content_type !== 'series')) return;
        setFetchingEpisodes(true);
        try {
            const type = movie.content_type || 'movie';
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

    const handleAdd = async (listType) => {
        if (!isAuthenticated) {
            showToast('Please login to add to your list', 'error');
            navigate('/login');
            return;
        }

        setLoadingAction(listType);
        try {
            const type = movie.content_type || 'movie';
            const isAnime = type === 'anime_movie' || type === 'anime_tv';
            const imdbId = isAnime ? movie.imdb_id : (await getImdbId(movie.id, type)).data.response;
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
        } catch (err) {
            console.error('Failed to add:', err);
            showToast('Failed to add', 'error');
        }
        setLoadingAction(null);
    };

    if (!movie) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)]"></div>
            </div>
        );
    }

    const isUpcoming = movie?.release_date && new Date(movie.release_date) > new Date();

    return (
        <div className="min-h-screen pb-28 bg-[var(--bg-primary)]">
            {/* Backdrop */}
            <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
                <img src={backdropUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-black/30" />

                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="-mt-28 md:-mt-36 relative z-10 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Poster */}
                        <div className="flex-shrink-0 w-44 sm:w-52 md:w-60 mx-auto md:mx-0">
                            <img
                                src={posterUrl}
                                alt={title}
                                className="w-full rounded-2xl shadow-2xl border-2 border-white/10"
                                onError={(e) => { e.target.src = 'https://placehold.co/500x750/1a1a2e/666?text=No+Poster'; }}
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 md:pt-20">
                            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>

                            <div className="flex flex-wrap gap-3 items-center mt-2 text-sm">
                                <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium">{contentTypeLabel}</span>
                                {movie?.release_date && <span className="text-[var(--text-secondary)]">{new Date(movie.release_date).getFullYear()}</span>}
                                {movie?.rating && <span className="flex items-center gap-1 text-yellow-400 font-medium"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{movie.rating}</span>}
                                {movie?.content_type !== 'tv' && movie?.content_type !== 'series' && runtime && <span className="text-[var(--text-secondary)]">{formatRuntime(runtime)}</span>}
                                {(movie?.content_type === 'tv' || movie?.content_type === 'series') && (seasonCount || episodeCount) && <span className="text-[var(--text-secondary)]">{seasonCount ? `${seasonCount}S` : ''}{seasonCount && episodeCount ? ' • ' : ''}{episodeCount ? `${episodeCount}E` : ''}</span>}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => handleAdd('watchlist')} disabled={loadingAction !== null} className="flex-1 py-2.5 bg-blue-600/90 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                    {loadingAction === 'watchlist' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>}
                                    Watchlist
                                </button>
                                <button onClick={() => handleAdd('watching')} disabled={loadingAction !== null} className="flex-1 py-2.5 bg-yellow-600/90 hover:bg-yellow-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                    {loadingAction === 'watching' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                    Watching
                                </button>
                                <button onClick={() => handleAdd('completed')} disabled={loadingAction !== null} className="flex-1 py-2.5 bg-green-600/90 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                    {loadingAction === 'completed' ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                                    Completed
                                </button>
                            </div>

                            {isUpcoming && (
                                <div className="mt-4 px-3 py-2 bg-red-600/20 border border-red-500/30 rounded-lg inline-flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-400 text-sm font-medium">Upcoming • Releases {new Date(movie.release_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl p-5 border border-[var(--border-color)]">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                    Overview
                                </h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed">{overview}</p>
                            </div>

                            {(movie?.content_type === 'tv' || movie?.content_type === 'series') && (
                                <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl p-5 border border-[var(--border-color)]">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" /></svg>
                                        Seasons & Episodes
                                    </h3>
                                    {!seriesMetadata ? (
                                        <button onClick={fetchEpisodes} disabled={fetchingEpisodes} className="px-5 py-2.5 bg-blue-600/90 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">{fetchingEpisodes ? 'Fetching...' : 'Fetch Episodes'}</button>
                                    ) : (
                                        <div>
                                            <p className="text-[var(--text-secondary)] text-sm mb-3">Total: <span className="text-white font-medium">{seriesMetadata.total_seasons}</span> Seasons, <span className="text-white font-medium">{seriesMetadata.total_episodes}</span> Episodes</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {seriesMetadata.seasons?.map((season) => (
                                                    <div key={season.season} className="px-4 py-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                                        <p className="text-white font-medium text-sm">Season {season.season}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">{season.episode_count || season.totalEpisodes || 0} episodes</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-5">
                            {credits?.cast && credits.cast.length > 0 && (
                                <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl p-5 border border-[var(--border-color)]">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                                        Cast
                                    </h3>
                                    <CastChips cast={credits.cast} />
                                </div>
                            )}

                            {credits?.directors && credits.directors.length > 0 && (
                                <div className="bg-[var(--bg-card)]/50 backdrop-blur-sm rounded-xl p-5 border border-[var(--border-color)]">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        Director(s)
                                    </h3>
                                    <CastChips cast={credits.directors} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
