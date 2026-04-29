import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function CastChips({ cast = [], max = 5 }) {
    const containerRef = useRef(null);
    const displayCast = cast.slice(0, max);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const ctx = gsap.context(() => {
            const chips = container.querySelectorAll('.cast-chip');
            gsap.fromTo(chips, {
                opacity: 0,
                y: 15,
                scale: 0.8,
            }, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.4,
                stagger: 0.08,
                ease: 'back.out(1.7)',
            });
        }, container);

        return () => ctx.revert();
    }, [displayCast]);

    if (!displayCast.length) return null;

    return (
        <div ref={containerRef} className="flex flex-wrap gap-2 mt-3">
            {displayCast.map((person, i) => (
                <span
                    key={i}
                    className="cast-chip px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-red-500/50 transition-colors cursor-default"
                >
                    {person}
                </span>
            ))}
        </div>
    );
}
