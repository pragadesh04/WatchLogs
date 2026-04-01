export const normalizeMovie = (item, source) => {
  const normalized = {
    id: item.id,
    title: item.title || item.name || item.Title || '',
    overview: item.overview || item.Plot || '',
    poster_path: item.poster_path || item.Poster || '',
    poster_link: item.poster_link || (item.Poster !== 'N/A' ? item.Poster : ''),
    content_type: item.content_type || item.Type || 'movie',
    media_type: item.media_type || item.Type || 'movie',
  };

  if (source === 'trending') {
    normalized.posterUrl = item.poster_link || '';
  } else if (source === 'omdb') {
    normalized.posterUrl = item.Poster !== 'N/A' ? item.Poster : '';
    normalized.id = item.imdbID || item.imdb_id || item.id;
  } else {
    normalized.posterUrl = item.poster_path 
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
      : item.poster_link || '';
  }

  return normalized;
};

export const normalizeListItem = (item) => {
  return {
    id: item._id || item.id,
    movie_id: item.movie_id || item.tmdb_id,
    imdb_id: item.imdb_id,
    title: item.title || item.Title || '',
    poster_url: item.poster_url || item.Poster || '',
    type: item.type || item.media_type || 'movie',
    time_stamp: item.time_stamp || 0,
    season: item.season,
    episode: item.episode,
  };
};
