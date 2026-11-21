// Textile library: searchable, categorised vector repeats for the active garment zone (textiles.ts). Controls edit cfg.patternParams[zone];
// colour 1 / colour 2 / background are the pattern's own, the zone colour stays the base cloth until a background is chosen.
import { useMemo, useState } from 'react';
import { Search, RotateCcw, Layers } from 'lucide-react';
import { TEXTILES, TEXTILE_CATEGORIES, TEXTILE_RANGE, matchesTextile, textileParams, textileTileUrl, tileSketchSize, textileById } from './textiles';
import { zonesFor, ZONE_LABEL } from './dsShared';
import './textilePanel.css';

const ALL = 'All';

function Swatch({ t, colour, on, onPick }: any) {
  const url = textileTileUrl(t.id, {}, colour), sz = tileSketchSize(t, 0.7);
  return (
    <button type="button" className="tx-sw" aria-pressed={on} title={`${t.label}: ${t.note}`} onClick={() => onPick(t.id)}>
      <span className="tx-sw-img" aria-hidden="true" style={url ? { backgroundImage: `url(${url})`, backgroundSize: `${sz.w}px ${sz.h}px` } : { background: colour }}/>
      <span className="tx-sw-name">{t.label}</span>
    </button>
  );
}

function Num({ label, value, min, max, step, unit = '', onChange }: any) {
  return (
    <label className="tx-row tx-row--col">
      <span className="tx-row-top"><span>{label}</span><b>{value}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/>
    </label>
  );
}

export default function TextilePanel({ cfg, setCfg, zone }: any) {
  const [q, setQ] = useState(''), [cat, setCat] = useState<string>(ALL);
  const zoneColour = cfg.colors?.[zone] ?? cfg.colors?.body ?? '#1b2a4a';
  const current = cfg.patterns?.[zone];
  const def = textileById(current ?? '');
  const p = textileParams(cfg.patternParams?.[zone], zoneColour);
  const list = useMemo(() => TEXTILES.filter(t => (cat === ALL || t.cat === cat) && matchesTextile(t, q)), [q, cat]);
  const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => z !== 'tipping');
  const others = zones.filter(z => z !== zone);

  const pick = (id: string) => setCfg((s: any) => { const pp = { ...(s.patternParams ?? {}) }; delete pp[zone]; return { ...s, patterns: { ...(s.patterns ?? {}), [zone]: id }, patternParams: pp }; });
  const set = (patch: any) => setCfg((s: any) => ({ ...s, patternParams: { ...(s.patternParams ?? {}), [zone]: { ...textileParams(s.patternParams?.[zone], s.colors?.[zone] ?? s.colors?.body ?? '#1b2a4a'), ...patch } } }));
  const reset = () => setCfg((s: any) => { const pp = { ...(s.patternParams ?? {}) }; delete pp[zone]; return { ...s, patternParams: pp }; });
  const applyTo = (targets: string[]) => setCfg((s: any) => {
    const patterns = { ...(s.patterns ?? {}) }, patternParams = { ...(s.patternParams ?? {}) };
    for (const z of targets) { patterns[z] = current; patternParams[z] = { ...(s.patternParams?.[zone] ?? {}) }; }
    return { ...s, patterns, patternParams };
  });

  return (
    <section className="tx" aria-label="Textile library">
      <header className="tx-head">
        <h3>Textile library</h3>
        <p>{TEXTILES.length} original repeats for the {ZONE_LABEL[zone]?.toLowerCase() ?? zone}. Fabric patterns sit under your artwork and print files.</p>
      </header>
      <label className="tx-search">
        <Search size={16} aria-hidden="true"/>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search stripes, floral, diamond…" aria-label="Search textiles"/>
      </label>
      <div className="tx-cats" role="group" aria-label="Textile category">
        {[ALL, ...TEXTILE_CATEGORIES].map(c => <button key={c} type="button" className="tx-cat" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {list.length === 0
        ? <p className="tx-empty" role="status">No textile matches “{q}”. Clear the search or pick another category.</p>
        : <div className="tx-grid" role="group" aria-label="Textiles">{list.map(t => <Swatch key={t.id} t={t} colour={zoneColour} on={current === t.id} onPick={pick}/>)}</div>}

      {def && (
        <div className="tx-ctl" role="group" aria-label={`Adjust ${def.label}`}>
          <p className="tx-ctl-title">{def.label}</p>
          {def.cat === 'Philippine-inspired' && <p className="tx-note">{def.note}</p>}
          <div className="tx-colours">
            {([['Colour 1', 'a'], ['Colour 2', 'b'], ['Background', 'bg']] as const).map(([label, k]) => (
              <label key={k} className="tx-colour"><span>{label}</span><input type="color" value={p[k]} onChange={e => set({ [k]: e.target.value })} aria-label={label}/></label>
            ))}
          </div>
          <Num label="Scale" value={p.scale} min={TEXTILE_RANGE.scale.min} max={TEXTILE_RANGE.scale.max} step={0.25} unit="x" onChange={(v: number) => set({ scale: v })}/>
          <Num label="Rotation" value={p.rotation} min={0} max={345} step={15} unit="°" onChange={(v: number) => set({ rotation: v })}/>
          <Num label="Opacity" value={Math.round(p.opacity * 100)} min={10} max={100} step={5} unit="%" onChange={(v: number) => set({ opacity: v / 100 })}/>
          <Num label="Shift across" value={Math.round(p.ox * 100)} min={0} max={100} step={5} unit="%" onChange={(v: number) => set({ ox: v / 100 })}/>
          <Num label="Shift down" value={Math.round(p.oy * 100)} min={0} max={100} step={5} unit="%" onChange={(v: number) => set({ oy: v / 100 })}/>
          <div className="tx-toggles" role="group" aria-label="Repeat">
            <button type="button" className="tx-tog" aria-pressed={p.rx} onClick={() => set({ rx: !p.rx })}>Repeat across</button>
            <button type="button" className="tx-tog" aria-pressed={p.ry} onClick={() => set({ ry: !p.ry })}>Repeat down</button>
          </div>
          <div className="tx-acts">
            <button type="button" className="ds-btn" onClick={reset}><RotateCcw size={15} aria-hidden="true"/>Reset</button>
            {others.length > 0 && <button type="button" className="ds-btn" onClick={() => applyTo(others)} title={`Copy this pattern and its settings to ${others.map(z => ZONE_LABEL[z]).join(', ')}`}><Layers size={15} aria-hidden="true"/>Apply to {others.length === 1 ? ZONE_LABEL[others[0]].toLowerCase() : 'all pieces'}</button>}
          </div>
          <p className="tx-note">Shown in 2D, previews, PNG and the spec sheet. The 3D model keeps solid colour here.</p>
        </div>
      )}
    </section>
  );
}
