import { useEffect, useRef, useState } from 'react';
import { useUniverseStore } from '../stores/universeStore';

export default function UniverseTransition() {
  const { rippleOrigin, targetUniverse, isRippling, clearRipple } = useUniverseStore();
  const [rippleStyle, setRippleStyle] = useState(null);
  const rippleRef = useRef(null);

  useEffect(() => {
    if (!isRippling || !rippleOrigin) return;

    const { x, y } = rippleOrigin;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const maxRadius = Math.hypot(
      Math.max(x, width - x),
      Math.max(y, height - y)
    );

    const size = maxRadius * 2;

    setRippleStyle({
      position: 'fixed',
      left: x,
      top: y,
      width: size,
      height: size,
      marginLeft: -maxRadius,
      marginTop: -maxRadius,
      borderRadius: '50%',
      zIndex: 9999,
      pointerEvents: 'none',
      transform: 'scale(0)',
      willChange: 'transform, opacity',
    });

    const ripple = rippleRef.current;
    if (!ripple) return;

    ripple.animate(
      [
        { transform: 'scale(0)', opacity: 1 },
        { transform: `scale(1)`, opacity: 1 },
        { transform: `scale(1)`, opacity: 0 },
      ],
      {
        duration: 700,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      }
    ).onfinish = () => {
      clearRipple();
      setRippleStyle(null);
    };
  }, [isRippling, rippleOrigin]);

  if (!isRippling || !rippleStyle) return null;

  const bgColor = targetUniverse === 'cinema'
    ? 'rgba(47, 47, 228, 0.8)'
    : 'rgba(214, 40, 40, 0.8)';

  return (
    <div ref={rippleRef} style={{ ...rippleStyle, backgroundColor: bgColor }} />
  );
}
