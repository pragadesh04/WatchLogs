import axios from 'axios';

const API_BASE = 'http://localhost:8000/movies';

const api = axios.create({
  baseURL: API_BASE,
});

export const getTrendingMovies = () => api.get('/get-trending/movie');
export const getTrendingTV = () => api.get('/get-trending/tv');
export const searchByName = (q) => api.get(`/search?q=${encodeURIComponent(q)}`);
export const getDetails = (movieId, contentType) => api.get(`/get-details/${movieId}/${contentType}`);
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

export const updateProgress = (imdbId, data) => 
  api.patch(`/watching/${imdbId}/progress`, data);

export default api;
