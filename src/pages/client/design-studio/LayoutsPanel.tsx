import { useMemo, useState } from 'react';
import LayoutPreview from './LayoutPreview';
import { CATEGORIES, matchesLayout } from './layoutLibrary';
import { ZONE_LABEL } from './zoneMap';

export default function LayoutsPanel({ list = [], onPlace }: any) {
  const [cat, setCat] = useState<string>('All');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const cats = useMemo(() => CATEGORIES.filter(c => list.some(l => l.cat === c)), [list]);
  const shown = useMemo(() => list.filter(l => (cat === 'All' || l.cat === cat) && matchesLayout(l, q)), [list, cat, q]);
  if (!list.length) return <p className="ds-note">No ready-made layouts fit this garment side yet.</p>;
  const place = async l => {
    setBusy(l.id); setMsg('');
    try { const n = await onPlace(l); setMsg(n ? `${l.name} added as ${n} editable layer${n > 1 ? 's' : ''}. Undo removes it in one step.` : `${l.name} could not be placed on this piece.`); }
    catch { setMsg(`${l.name} could not be placed.`); }
    setBusy(null);
  };
  return (
    <div className="ds-stack" aria-label="Ready-made layouts">
      <p className="ds-note">Each layout is a set of ordinary layers you can recolour, resize, rotate, duplicate and delete. Only layouts that fit this garment piece are shown; they scale to the piece, not to a printed size.</p>
      <label className="ds-lay-search"><span className="sr-only">Search layouts</span>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search layouts (star, band, back…)"/>
      </label>
      <div className="ds-lay-cats" role="group" aria-label="Layout categories">
        {['All', ...cats].map(c => <button key={c} type="button" className="ds-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <p className="ds-note" role="status" aria-live="polite">{msg || `${shown.length} layout${shown.length === 1 ? '' : 's'}`}</p>
      <ul className="ds-lay-grid">
        {shown.map(l => (
          <li key={l.id}>
            <button type="button" className="ds-lay-card" disabled={busy === l.id} onClick={() => place(l)} aria-label={`Add ${l.name} on ${ZONE_LABEL[l.zone] ?? l.zone}`}>
              <LayoutPreview layout={l}/>
              <strong>{l.name}</strong>
              <small>{ZONE_LABEL[l.zone] ?? l.zone} · {l.cat}</small>
            </button>
          </li>
        ))}
      </ul>
      {!shown.length && <p className="ds-note">No layouts match. Clear the search or pick another category.</p>}
    </div>
  );
}
