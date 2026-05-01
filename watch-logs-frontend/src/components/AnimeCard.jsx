import { useState, useRef } from 'react';
import { useToast } from './ToastProvider';
import { addToWatchlist, addToWatching, addToCompleted } from '../services/api';
import SentientCard from './SentientCard';
import MagneticButton from './MagneticButton';
import gsap from 'gsap';

export default function AnimeCard({ anime }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const { showToast } = useToast();

  const handleClick = () => {
    setSelectedItem(anime);
    setShowModal(true);
    if (modalRef.current) {
      gsap.fromTo(modalRef.current,
        { y: '100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
    }
  };

  const closeModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current,
        { y: '100%', opacity: 0, duration: 0.3, ease: 'power2.in' }
      );
    }
    if (backdropRef.current) {
      gsap.to(backdropRef.current,
        { opacity: 0, duration: 0.2 }
      );
    }
    setTimeout(() => { setShowModal(false); setSelectedItem(null); }, 300);
  };

  const handleAdd = async (action) => {
    try {
      if (action === 'watchlist') await addToWatchlist(anime.imdb_id, anime.content_type);
      if (action === 'watching') await addToWatching(anime.imdb_id, 0, '', anime.content_type);
      if (action === 'completed') await addToCompleted(anime.imdb_id, anime.content_type);
      showToast('Added successfully!', 'success');
      closeModal();
    } catch (err) {
      console.error('Failed to add:', err);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        <SentientCard item={anime} onClick={() => {}} />
      </div>

      {showModal && selectedItem && (
        <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/70" />
          <div ref={modalRef} className="glass noise-overlay relative max-w-2xl w-full mx-4 rounded-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ transformOrigin: 'bottom center' }}>
            <div className="p-6 relative z-10">
              <div className="flex gap-4 mb-4">
                <img src={anime.poster_url} alt={anime.name} className="w-28 h-40 object-cover rounded-lg shadow-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight break-words">{anime.name}</h2>
                  <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
                    <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-[var(--text-secondary)]">{anime.content_type === 'anime_movie' ? 'Movie' : 'TV'}</span>
                    {anime.release_date && <span className="text-xs text-[var(--text-secondary)]">{anime.release_date}</span>}
                    {anime.rating && <span className="text-xs text-yellow-400">★ {anime.rating}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    {anime.total_episodes && <span className="text-xs text-[var(--text-secondary)]">{anime.total_episodes} eps</span>}
                    {anime.season_label && <span className="text-xs text-[var(--text-secondary)]">{anime.season_label}</span>}
                  </div>
                  {anime.airing && <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Airing</span>}
                </div>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-4">{anime.overview || 'No overview available.'}</p>
              <div className="flex gap-3">
                <MagneticButton onClick={() => handleAdd('watchlist')} className="flex-1 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">Add to Watchlist</MagneticButton>
                <MagneticButton onClick={() => handleAdd('watching')} className="flex-1 py-3 bg-blue-600/90 hover:bg-blue-700 rounded-xl">Add to Watching</MagneticButton>
                <MagneticButton onClick={() => handleAdd('completed')} className="flex-1 py-3 bg-green-600/90 hover:bg-green-700 rounded-xl">Completed</MagneticButton>
              </div>
              <MagneticButton onClick={closeModal} className="w-full mt-3 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">Close</MagneticButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
