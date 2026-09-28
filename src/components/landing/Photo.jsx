// src/components/landing/Photo.jsx — real-photo tile: reveal-on-scroll wipe, inner scale, hover zoom, caption overlay.
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

export default function Photo({ photo, caption, ratio, pos = 'center', radius = 20, delay = 0,
  instant = false, hover = true, shade = false, style = {}, className = '', children }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  const still = useReducedMotion();
  const show = instant || seen;
  const rev = still ? {} : { initial: { clipPath: `inset(0 0 100% 0 round ${radius}px)` },
    animate: show ? { clipPath: `inset(0 0 0% 0 round ${radius}px)` } : undefined,
    transition: { duration: 0.9, delay, ease: EASE } };

  return (
    <motion.figure ref={ref} className={`vf-photo ${className}`} {...rev}
      style={{ position: 'relative', margin: 0, overflow: 'hidden', borderRadius: radius,
        aspectRatio: ratio, background: '#dbe4ea', ...style }}>
      <motion.img src={photo.src} alt={photo.alt} loading={instant ? 'eager' : 'lazy'} decoding="async"
        initial={still ? false : { scale: 1.18 }} animate={show || still ? { scale: 1 } : undefined}
        whileHover={hover && !still ? { scale: 1.06 } : undefined}
        transition={{ duration: 1.1, delay, ease: EASE }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: pos, display: 'block' }} />
      {(shade || caption) && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to top,rgba(6,16,26,0.72),rgba(6,16,26,0) 55%)' }} />}
      {caption && <figcaption style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff',
        fontSize: 13, fontWeight: 600, letterSpacing: '0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{caption}</figcaption>}
      {children}
    </motion.figure>
  );
}
