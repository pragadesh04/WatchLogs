import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await useAuthStore.getState().refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export const register = (email, password) => 
  api.post('/auth/register', { email, password });

export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const logout = () => 
  api.post('/auth/logout');

export const getTrendingMovies = () => api.get('/movies/get-trending/movie');
export const getTrendingTV = () => api.get('/movies/get-trending/tv');
export const searchByName = (q) => api.get(`/movies/search?q=${encodeURIComponent(q)}`);
export const getImdbId = (movieId, contentType) => api.get(`/movies/get-imdb-id/${movieId}/${contentType}`);

export const addToWatchlist = (imdbId, contentType = 'movie') => 
  api.post(`/movies/watchlist?content_type=${contentType}`, { imdb_id: imdbId });
export const addToWatching = (imdbId, timeStamp, notes, type = 'movie') => 
  api.post(`/movies/watching?imdb_id=${imdbId}&type=${type}`, { time_stamp: timeStamp, notes, type });
export const addToCompleted = (imdbId, contentType = 'movie') => 
  api.post(`/movies/completed?content_type=${contentType}`, { imdb_id: imdbId });

export const fetchWatchlist = () => api.get('/movies/watchlist');
export const fetchWatching = () => api.get('/movies/watching');
export const fetchCompleted = () => api.get('/movies/completed');

export const deleteFromWatchlist = (imdbId) => api.delete(`/movies/watchlist/${imdbId}`);
export const deleteFromWatching = (imdbId) => api.delete(`/movies/watching/${imdbId}`);
export const deleteFromCompleted = (imdbId) => api.delete(`/movies/completed/${imdbId}`);

export const updateProgress = (imdbId, data) => 
  api.patch(`/movies/watching/${imdbId}/progress`, data);

export const createSharedList = (listTypes, expirationDays = null) => 
  api.post('/movies/share/create', { list_types: listTypes, expiration_days: expirationDays });

export const getSharedList = (code) => api.get(`/movies/share/${code}`);

export default api;