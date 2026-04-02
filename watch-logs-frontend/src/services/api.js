import axios from 'axios';

const API_BASE = 'http://localhost:8000/movies';

const api = axios.create({
  baseURL: API_BASE,
});

export const getTrendingMovies = () => api.get('/get-trending/movie');
export const getTrendingTV = () => api.get('/get-trending/tv');
export const searchByName = (q) => api.get(`/search?q=${encodeURIComponent(q)}`);
export const getImdbId = (movieId, contentType) => api.get(`/get-imdb-id/${movieId}/${contentType}`);

export const addToWatchlist = (imdbId, contentType = 'movie') => 
  api.post(`/watchlist?content_type=${contentType}`, { imdb_id: imdbId });
export const addToWatching = (imdbId, timeStamp, notes, type = 'movie') => 
  api.post(`/watching?imdb_id=${imdbId}&type=${type}`, { time_stamp: timeStamp, notes, type });
export const addToCompleted = (imdbId, contentType = 'movie') => 
  api.post(`/completed?content_type=${contentType}`, { imdb_id: imdbId });

export const fetchWatchlist = () => api.get('/watchlist');
export const fetchWatching = () => api.get('/watching');
export const fetchCompleted = () => api.get('/completed');

export const deleteFromWatchlist = (imdbId) => api.delete(`/watchlist/${imdbId}`);
export const deleteFromWatching = (imdbId) => api.delete(`/watching/${imdbId}`);
export const deleteFromCompleted = (imdbId) => api.delete(`/completed/${imdbId}`);

export const updateProgress = (imdbId, data) => 
  api.patch(`/watching/${imdbId}/progress`, data);

export const createSharedList = (listTypes, expirationDays = null) => 
  api.post('/share/create', { list_types: listTypes, expiration_days: expirationDays });

export const getSharedList = (code) => api.get(`/share/${code}`);

export default api;
