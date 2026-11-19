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
    const bar = body?.querySelector('.ds-tools') as HTMLElement | null;
    if (!body || !bar) return undefined;
    const place = () => {
      const b = body.getBoundingClientRect(), r = bar.getBoundingClientRect();
      const top = Math.max(8, r.top - b.top);
      setPos({ left: r.right - b.left + 12, top, maxHeight: Math.max(240, b.height - top - 8) });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(body); ro.observe(bar);
    return () => ro.disconnect();
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
