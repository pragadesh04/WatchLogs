import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useSettingsStore, getPosterUrl } from '../stores/settingsStore';

const formatRuntime = (mins) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

export default function SentientCard({ item, onClick, showProgress, progress }) {
    const cardRef = useRef(null);
    const shadowRef = useRef(null);
    const overlayRef = useRef(null);
    const titleRef = useRef(null);
    const yearRef = useRef(null);
    const progressRef = useRef(null);
    const gsapContext = useRef(null);
    const [isTouch, setIsTouch] = useState(true);

    const isTV = item.content_type === 'tv' || item.content_type === 'series';
    const seasonCount = item.total_seasons;
    const episodeCount = item.total_episodes;
    const runtime = item.total_runtime;

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsTouch(touch);
    }, []);

    useEffect(() => {
        const card = cardRef.current;
        const overlay = overlayRef.current;
        const title = titleRef.current;
        const year = yearRef.current;
        const progressBar = progressRef.current;
        if (!card) return;

        gsapContext.current = gsap.context(() => {
            if (!isTouch) {
                const handleMouseMove = (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -8;
                    const rotateY = ((x - centerX) / centerX) * 8;

                    gsap.to(card, {
                        rotateX,
                        rotateY,
                        duration: 0.3,
                        ease: 'power2.out',
                        transformPerspective: 800,
                    });

                    if (shadowRef.current) {
                        const shadowX = ((x - centerX) / centerX) * -15;
                        const shadowY = ((y - centerY) / centerY) * -15;
                        gsap.to(shadowRef.current, {
                            x: shadowX,
                            y: shadowY,
                            duration: 0.3,
                            ease: 'power2.out',
                        });
                    }

                    if (overlay) {
                        gsap.to(overlay, {
                            opacity: 1,
                            duration: 0.2,
                        });
                    }
                    if (title) {
                        gsap.to(title, {
                            y: 0,
                            opacity: 1,
                            duration: 0.3,
                            ease: 'power2.out',
                        });
                    }
                    if (year) {
                        gsap.to(year, {
                            y: 0,
                            opacity: 1,
                            duration: 0.3,
                            delay: 0.05,
                            ease: 'power2.out',
                        });
                    }
                    if (progressBar) {
                        gsap.to(progressBar, {
                            opacity: 1,
                            duration: 0.3,
                        });
                    }
                };

                const handleMouseEnter = () => {
                    gsap.to(card, {
                        scale: 1.02,
                        duration: 0.3,
                        ease: 'power2.out',
                    });
                };

                const handleMouseLeave = () => {
                    gsap.to(card, {
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.5)',
                    });
                    if (shadowRef.current) {
                        gsap.to(shadowRef.current, {
                            x: 0,
                            y: 0,
                            duration: 0.5,
                            ease: 'power2.out',
                        });
                    }
                    if (overlay) {
                        gsap.to(overlay, {
                            opacity: 0,
                            duration: 0.3,
                        });
                    }
                    if (title) {
                        gsap.to(title, {
                            y: 20,
                            opacity: 0,
                            duration: 0.2,
                        });
                    }
                    if (year) {
                        gsap.to(year, {
                            y: 20,
                            opacity: 0,
                            duration: 0.2,
                        });
                    }
                    if (progressBar) {
                        gsap.to(progressBar, {
                            opacity: showProgress ? 1 : 0,
                            duration: 0.3,
                        });
                    }
                };

                card.addEventListener('mousemove', handleMouseMove);
                card.addEventListener('mouseenter', handleMouseEnter);
                card.addEventListener('mouseleave', handleMouseLeave);

                gsap.set(card, { transformPerspective: 800 });
                gsap.set([title, year], { y: 20, opacity: 0 });
            }
        }, card);

        return () => {
            if (gsapContext.current) {
                gsapContext.current.revert();
            }
        };
    }, [isTouch, overlayRef]);

    const handleTouchStart = useCallback(() => {
        if (isTouch) {
            gsap.to(cardRef.current, {
                scale: 0.92,
                duration: 0.1,
                ease: 'power2.out',
            });
        }
    }, [isTouch]);

    const handleTouchEnd = useCallback(() => {
        if (isTouch) {
            gsap.to(cardRef.current, {
                scale: 1,
                duration: 0.4,
                ease: 'elastic.out(1, 0.4)',
            });
        }
    }, [isTouch]);

    const { showImages } = useSettingsStore();
    const posterUrl = getPosterUrl(item, showImages);

    return (
        <div
            ref={shadowRef}
            className="relative rounded-2xl overflow-hidden card-shadow"
        >
            <div
                ref={cardRef}
                className="cursor-pointer group relative rounded-2xl overflow-hidden"
                onClick={onClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ transformStyle: 'preserve-3d' }}
            >
                <img
                    src={posterUrl}
                    alt={item.name}
                    className="w-full h-auto object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/500x750/png?text=No+Poster'; }}
                />
                <div
                    ref={overlayRef}
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                    style={{ opacity: isTouch ? 0 : undefined }}
                />
                <div
                    ref={titleRef}
                    className="absolute bottom-12 left-0 right-0 px-3"
                >
                    <p className="text-white font-medium text-sm truncate drop-shadow-lg">{item.name}</p>
                </div>
                {item.release_date && (
                    <div
                        ref={yearRef}
                        className="absolute bottom-8 left-0 right-0 px-3"
                    >
                        <p className="text-gray-300 text-xs">
                            {new Date(item.release_date).getFullYear()}
                            {!isTV && runtime && ` • ${formatRuntime(runtime)}`}
                            {item.rating && ` • ★ ${item.rating}`}
                        </p>
                    </div>
                )}
                {!isTV && runtime && (
                    <div className="absolute bottom-14 left-0 right-0 px-3">
                        {/* <p className="text-gray-400 text-[10px]">{formatRuntime(runtime)}</p> */}
                    </div>
                )}
                {isTV && (seasonCount || episodeCount) && (
                    <div className="absolute bottom-14 left-0 right-0 px-3">
                        {/* <p className="text-gray-400 text-[10px]">
                            {seasonCount ? `${seasonCount} Season${seasonCount > 1 ? 's' : ''}` : ''}
                            {seasonCount && episodeCount ? ' • ' : ''}
                            {episodeCount ? `${episodeCount} Episodes` : ''}
                        </p> */}
                    </div>
                )}
                {item.release_date && new Date(item.release_date) > new Date() && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full pulse-badge shadow-lg">
                        UPCOMING
                    </div>
                )}
                {showProgress && progress !== undefined && (
                    <div ref={progressRef} className="absolute bottom-0 left-0 right-0 h-2 bg-gray-900/80 backdrop-blur-sm">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-400 progress-neon transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}
                {item.time_stamp && (
                    <div className="absolute bottom-2 left-0 right-0 px-3 flex justify-center">
                        <span className="text-green-400 text-[10px] font-medium bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {item.time_stamp}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
