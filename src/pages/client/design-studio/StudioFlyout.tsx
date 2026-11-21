import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';

// Left contextual panel (desktop): the panel for the picked tool, docked beside the tool rail instead of the right sidebar.
// It is a sibling inside .ds-body, so it measures the rail (.ds-tools) and sits 12px to its right; it keeps the .ds-panel class so
// the shared panel styles (inputs, swatches, sections) apply unchanged. Escape closes it.
type Props = { title: string; icon: string; hint?: string; onClose: () => void; children: ReactNode };

export default function StudioFlyout({ title, icon, hint, onClose, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const body = ref.current?.closest('.ds-body') as HTMLElement | null;
    if (!body) return undefined;
    // The tool rail is portaled into the pieces column after the first paint, so it is looked up on every measure, never held.
    const place = () => {
      const b = body.getBoundingClientRect(), bar = body.querySelector('.ds-tools') as HTMLElement | null, rail = body.querySelector('.ds-rail') as HTMLElement | null;
      const r = bar?.getBoundingClientRect(), rr = rail?.getBoundingClientRect();
      const right = Math.max(r && r.width ? r.right : 0, rr && rr.width ? rr.right : 0);
      const top = Math.max(8, (r && r.height ? r.top : rr?.top ?? b.top) - b.top);
      setPos(prev => { const next = { left: right - b.left + 12, top, maxHeight: Math.max(240, b.height - top - 8) }; return prev && prev.left === next.left && prev.top === next.top && prev.maxHeight === next.maxHeight ? prev : next; });
    };
    place();
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    const ro = new ResizeObserver(later), mo = new MutationObserver(later);
    ro.observe(body); mo.observe(body, { childList: true, subtree: true });
    window.addEventListener('resize', later);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', later); };
  }, []);

  return (
    <section ref={ref} className="ds-panel ds-fly" role="group" aria-label={`${title} options`} data-fly
      style={pos ?? { left: 0, top: 0, visibility: 'hidden' }}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <header className="ds-sheet-head">
        <span className="ds-sheet-icon" aria-hidden="true"><NavIcon name={icon} size={16}/></span>
        <div className="ds-sheet-title"><h2>{title}</h2>{hint && <p>{hint}</p>}</div>
        <button type="button" className="ds-opts-x" aria-label={`Close ${title}`} onClick={onClose}><X size={16} aria-hidden="true"/></button>
      </header>
      <div className="ds-panel-scroll">{children}</div>
    </section>
  );
}
