// src/components/landing/Reveal.jsx — scroll-in-view fade/rise wrapper; static under prefers-reduced-motion.
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

export default function Reveal({ children, delay = 0, style = {}, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const still = useReducedMotion();
  if (still) return <div ref={ref} style={style} className={className}>{children}</div>;
  return (
    <motion.div ref={ref} style={style} className={className}
      initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
