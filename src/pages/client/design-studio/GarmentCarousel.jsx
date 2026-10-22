// Character-select browse: one large garment at a time, a snapping thumbnail strip, and a body colour applied on open.
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SwatchGrid, colourName } from './SwatchGrid';

const smooth = () => (typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto');

export default function GarmentCarousel({ families, index, setIndex, colour, setColour, renderImage, renderBadge, isDisabled, onChoose }) {
  const strip = useRef(null);
  const n = families.length;
  const i = Math.min(index, n - 1);
  const fam = families[i];
  const go = d => setIndex((i + d + n) % n);
  useEffect(() => { strip.current?.children[i]?.scrollIntoView({ behavior: smooth(), block: 'nearest', inline: 'center' }); }, [i]);
  if (!fam) return null;
  const off = isDisabled(fam);
  return (
    <div className="ds-car" role="region" aria-roledescription="carousel" aria-label="Garments"
      onKeyDown={e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } }}>
      <div className="ds-car-stage">
        <button type="button" className="ds-car-nav" aria-label="Previous garment" onClick={() => go(-1)} disabled={n < 2}><ChevronLeft size={22}/></button>
        <figure className="ds-car-hero" aria-live="polite">
          <span className="ds-pick-img" key={fam.id}>{renderImage(fam)}</span>
          <figcaption><strong>{fam.id}</strong>{renderBadge(fam)}<span className="ds-car-pos">{i + 1} / {n}</span></figcaption>
        </figure>
        <button type="button" className="ds-car-nav" aria-label="Next garment" onClick={() => go(1)} disabled={n < 2}><ChevronRight size={22}/></button>
      </div>
      <div className="ds-car-colour">
        <span>Body colour · {colour ? colourName(colour) : 'keep current'}</span>
        <SwatchGrid label="Body" current={colour} onPick={setColour}/>
      </div>
      <ul className="ds-car-strip" ref={strip} aria-label="All garments">
        {families.map((f, k) => (
          <li key={f.id}>
            <button type="button" className="ds-car-thumb" aria-pressed={k === i} aria-label={f.id} onClick={() => setIndex(k)}>
              <span className="ds-pick-img">{renderImage(f)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="ds-btn ds-btn--primary ds-car-go" disabled={off} onClick={() => onChoose(fam)}>
        {off ? 'Not this piece for your set' : `Choose ${fam.id}`}
      </button>
    </div>
  );
}
