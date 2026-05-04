import { useUniverseStore } from '../stores/universeStore';
import { useEffect, useRef, useState } from 'react';

export default function UniverseSwitcher() {
  const { universe, setUniverse, triggerRipple } = useUniverseStore();
  const [pillStyle, setPillStyle] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cinemaBtn = container.querySelector('[data-option="cinema"]');
    const animeBtn = container.querySelector('[data-option="anime"]');
    const target = universe === 'cinema' ? cinemaBtn : animeBtn;
    if (target) {
      setPillStyle({
        width: `${target.offsetWidth}px`,
        transform: `translateX(${target.offsetLeft}px)`,
        opacity: 1,
      });
    }
  }, [universe]);

  const handleClick = (e, newUniverse) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + rect.left;
    const y = e.clientY - rect.top + rect.top;
    triggerRipple(x, y, newUniverse);
    setTimeout(() => setUniverse(newUniverse), 50);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full p-0.5 h-8"
      style={{ minWidth: '140px' }}
    >
      <div
        className="absolute top-0.5 left-0.5 h-[calc(100%-4px)] rounded-full bg-[var(--accent-primary)] shadow-lg transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)"
        style={pillStyle}
      />
      <button
        data-option="cinema"
        onClick={(e) => handleClick(e, 'cinema')}
        className={`relative z-10 px-3 h-full text-xs font-medium transition-colors duration-300 cursor-pointer flex items-center gap-1 ${
          universe === 'cinema' ? 'text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        🎬 Cinema
      </button>
      <button
        data-option="anime"
        onClick={(e) => handleClick(e, 'anime')}
        className={`relative z-10 px-3 h-full text-xs font-medium transition-colors duration-300 cursor-pointer flex items-center gap-1 ${
          universe === 'anime' ? 'text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        ⛩️ Anime
      </button>
    </div>
  );
}
