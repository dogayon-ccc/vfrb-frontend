import { useEffect, useRef, useState } from 'react';

export default function Reveal({ children, delay = 0, style, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } },
      { rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const td = delay ? { transitionDelay: `${Math.min(delay, 0.12)}s` } : null;
  return <Tag ref={ref} className={`vs-reveal${on ? ' is-in' : ''} ${className}`} style={{ ...td, ...style }}>{children}</Tag>;
}
