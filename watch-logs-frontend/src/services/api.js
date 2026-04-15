import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (token) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        const newToken = await useAuthStore.getState().refreshAccessToken();
        
        if (newToken) {
          processQueue(newToken);
          isRefreshing = false;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        
        isRefreshing = false;
        return Promise.reject(error);
      }
      
      return new Promise((resolve) => {
        failedQueue.push({ resolve });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
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

export const getTrendingMovies = () => api.get('/trending/movie');
export const getTrendingTV = () => api.get('/trending/tv');
export const searchByName = (q) => api.get(`/search?q=${encodeURIComponent(q)}`);
export const getImdbId = (movieId, contentType) => api.get(`/details/imdb-id/${movieId}/${contentType}`);

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