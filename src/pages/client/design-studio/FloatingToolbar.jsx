// Contextual toolbar above the selection (below it when there is no room). Its slot holds alignment: centre one element on the
// garment centre line, align 2+ to their shared bounds, distribute 3+. Each action is one undo step; arrow keys move between buttons.
import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy, Trash2, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from 'lucide-react';
import { SHAPE_TYPE_LABEL } from './dsShared';

const kindLabel = o => (o.__artwork ? 'Artwork' : o.__logo ? 'Logo' : o.__shape ? (SHAPE_TYPE_LABEL[o.type] ?? 'Shape') : o.__draw ? 'Drawing' : 'Text');
const ALIGN = [['left', 'Align left edges', AlignStartVertical], ['hcenter', 'Align centres horizontally', AlignCenterVertical], ['right', 'Align right edges', AlignEndVertical],
  ['top', 'Align top edges', AlignStartHorizontal], ['vcenter', 'Align middles', AlignCenterHorizontal], ['bottom', 'Align bottom edges', AlignEndHorizontal]];
const DISTRIBUTE = [['h', 'Distribute horizontally', AlignHorizontalDistributeCenter], ['v', 'Distribute vertically', AlignVerticalDistributeCenter]];

// Left/Right/Home/End move focus between the toolbar's buttons (and stop the canvas nudge from seeing the key).
function roving(e) {
  const keys = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
  if (!(e.key in keys)) return;
  const bs = [...e.currentTarget.querySelectorAll('button:not(:disabled)')], i = bs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault(); e.stopPropagation();
  const d = keys[e.key];
  bs[d === -Infinity ? 0 : d === Infinity ? bs.length - 1 : (i + d + bs.length) % bs.length].focus();
}

export default function FloatingToolbar({ selObj, at, duplicateSelected, deleteSelected, alignSelected, arrangeSelected }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => { const e = ref.current; if (e && (e.offsetWidth !== size.w || e.offsetHeight !== size.h)) setSize({ w: e.offsetWidth, h: e.offsetHeight }); });
  const n = at.n ?? 1, multi = n > 1;
  // Clear of Fabric's rotate handle, which sits 40 canvas px above the object.
  const gap = 10 + Math.round(40 * at.k);
  const above = at.top - gap - size.h >= 8;
  const left = Math.max(8, Math.min(at.w - size.w - 8, at.x - size.w / 2));
  const top = above ? at.top - gap - size.h : Math.min(at.h - size.h - 8, at.bottom + 12);
  const label = multi ? `${n} selected` : kindLabel(selObj);
  return (
    <motion.div ref={ref} className="ds-ftb" role="toolbar" aria-label={`${label} actions`} data-place={above ? 'above' : 'below'} onKeyDown={roving}
      style={{ left, top, visibility: size.w ? 'visible' : 'hidden' }}
      initial={reduce ? false : { opacity: 0, y: above ? 4 : -4 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : .2, ease: [.4, 0, 1, 1] }}>
      <span className="ds-ftb-kind">{label}</span>
      <span className="ds-ftb-slot" data-slot="align">
        {multi ? (<>
          {ALIGN.map(([w, t, I]) => <button key={w} type="button" onClick={() => arrangeSelected('align', w)} aria-label={t} title={t}><I size={17} aria-hidden="true"/></button>)}
          {n >= 3 && DISTRIBUTE.map(([w, t, I]) => <button key={w} type="button" onClick={() => arrangeSelected('distribute', w)} aria-label={t} title={t}><I size={17} aria-hidden="true"/></button>)}
        </>) : (
          <button type="button" onClick={() => alignSelected('hcenter')} aria-label="Centre on the garment centre line" title="Centre on the garment centre line"><AlignCenterVertical size={17} aria-hidden="true"/></button>
        )}
      </span>
      {!multi && <button type="button" onClick={duplicateSelected} aria-label="Duplicate" title="Duplicate (Ctrl+D)"><Copy size={17} aria-hidden="true"/></button>}
      <button type="button" className="ds-ftb-danger" onClick={deleteSelected} aria-label="Delete" title="Delete (Del)"><Trash2 size={17} aria-hidden="true"/></button>
    </motion.div>
  );
}
