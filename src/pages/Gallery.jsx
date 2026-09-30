import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Photo from '../components/landing/Photo';
import SitePage from '../components/site/SitePage';
import { Banner, Journey } from '../components/site/parts';
import { GALLERY, GALLERY_CATS, P } from './landing/photos';

function Lightbox({ items, index, onClose, onMove }) {
  const box = useRef(null);
  const [ready, setReady] = useState(false);
  const item = items[index];

  useEffect(() => { setReady(false); }, [index]);
  useEffect(() => {
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector('.vs-lb__close')?.focus();
    return () => { document.body.style.overflow = ''; prevFocus?.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onMove(-1);
      else if (e.key === 'ArrowRight') onMove(1);
      else if (e.key === 'Tab') {
        const f = box.current.querySelectorAll('button');
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onMove]);

  return (
    <div className="vs vs-lb" role="dialog" aria-modal="true" aria-label="Photo viewer" ref={box}>
      <div className="vs-lb__top">
        <span aria-live="polite">{index + 1} of {items.length}</span>
        <button type="button" className="vs-lb__close" onClick={onClose} aria-label="Close viewer">×</button>
      </div>
      <div className="vs-lb__stage">
        <button type="button" className="vs-lb__prev" onClick={() => onMove(-1)} aria-label="Previous photo">‹</button>
        <img src={item.photo.src} alt={item.photo.alt} onLoad={() => setReady(true)}
          style={{ opacity: ready ? 1 : 0, transition: 'opacity 200ms ease' }} />
        <button type="button" className="vs-lb__next" onClick={() => onMove(1)} aria-label="Next photo">›</button>
      </div>
      <p className="vs-lb__cap">{item.caption}</p>
    </div>
  );
}

export default function Gallery() {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const items = useMemo(() => GALLERY.filter(g => cat === 'all' || g.cat === cat), [cat]);
  const move = useCallback((d) => setOpen(i => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);
  const close = useCallback(() => setOpen(null), []);

  return (
    <SitePage title="Gallery">
      <Banner short kicker="Samples and gallery" title="Finished pieces and the floor behind them."
        lede="Embroidery, printing, sublimation, packed orders and the production team, all photographed at VFRB."
        photo={P.printing} pos="35% center" />
      <section className="vs-sec" aria-label="Photo gallery">
        <div className="vs-wrap">
          <div className="vs-filters" role="group" aria-label="Filter photos">
            {GALLERY_CATS.map(c => (
              <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => { setCat(c.id); setOpen(null); }}>{c.label}</button>
            ))}
          </div>
          <p className="vs-count" aria-live="polite">{items.length} photos</p>
          <ul className="vs-masonry">
            {items.map((g, i) => (
              <li key={g.photo.src}>
                <button type="button" className="vs-tile" onClick={() => setOpen(i)} aria-label={`View larger: ${g.caption}`}>
                  <Photo as="span" photo={g.photo} pos={g.pos} caption={g.caption} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Journey current="/gallery" />
      {open !== null && <Lightbox items={items} index={open} onClose={close} onMove={move} />}
    </SitePage>
  );
}
