import { useState } from 'react';
import { PALETTE, PIECES, START_COLOURS, PLACEMENTS, colourName } from './mock';

// Shared prototype pieces for both options. Dev-only; production Studio components are not imported.

export function useMockDesign(isSet) {
  const [colours, setColours] = useState(START_COLOURS);
  const [garments, setGarments] = useState({ top: PIECES.top.garment, bottom: PIECES.bottom.garment });
  const [logo, setLogo] = useState({ on: true, placement: 'Left chest', text: 'OTG' });
  const roles = isSet ? ['top', 'bottom'] : ['top'];
  const setZone = (role, zone, hex) => setColours(c => ({ ...c, [role]: { ...c[role], [zone]: hex } }));
  // Whole-set edit: one scheme colour lands on every matching zone of every piece.
  const setScheme = (scheme, hex) => setColours(c => {
    const next = { ...c };
    roles.forEach(r => { next[r] = { ...c[r] }; PIECES[r].zones.filter(z => z.scheme === scheme).forEach(z => { next[r][z.id] = hex; }); });
    return next;
  });
  const schemeOf = scheme => colours.top[PIECES.top.zones.find(z => z.scheme === scheme).id];
  return { colours, setZone, setScheme, schemeOf, garments, setGarments, logo, setLogo, roles };
}

function TopArt({ c, logo }) {
  return (
    <svg viewBox="0 0 200 220" className="dl-art" aria-hidden="true">
      <path d="M60 20 L15 55 L35 85 L55 72 Z M140 20 L185 55 L165 85 L145 72 Z" fill={c.sleeves} stroke="#0003"/>
      <path d="M60 20 L85 10 Q100 22 115 10 L140 20 L145 72 L145 210 L55 210 L55 72 Z" fill={c.body} stroke="#0003"/>
      <path d="M85 10 Q100 22 115 10 L110 32 L100 26 L90 32 Z" fill={c.collar} stroke="#0003"/>
      {logo?.on && logo.placement === 'Left chest' && <text x="125" y="70" fontSize="11" textAnchor="middle" fill={c.collar} fontWeight="700">{logo.text}</text>}
      {logo?.on && logo.placement === 'Right chest' && <text x="75" y="70" fontSize="11" textAnchor="middle" fill={c.collar} fontWeight="700">{logo.text}</text>}
    </svg>
  );
}

function BottomArt({ c }) {
  return (
    <svg viewBox="0 0 160 240" className="dl-art" aria-hidden="true">
      <path d="M28 28 L132 28 L140 230 L92 230 L80 80 L68 230 L20 230 Z" fill={c.legs} stroke="#0003"/>
      <path d="M30 10 L130 10 L132 28 L28 28 Z" fill={c.waist} stroke="#0003"/>
    </svg>
  );
}

export function PieceArt({ role, colours, logo }) {
  return role === 'top' ? <TopArt c={colours.top} logo={logo}/> : <BottomArt c={colours.bottom}/>;
}

// Large garment stage: set pieces side by side, the active one outlined; tapping a piece selects it.
export function Stage({ d, active, onActive, view, compact = false }) {
  const [zoom, setZoom] = useState(1);
  const [back, setBack] = useState(false);
  return (
    <div className="dl-stage" data-compact={compact || undefined}>
      {view === '3d' && <span className="dl-badge dl-badge-warn dl-stage-badge">3D (approx.)</span>}
      <div className="dl-stage-pieces" style={{ transform: `scale(${zoom})` }}>
        {d.roles.map(r => (
          <button key={r} type="button" className="dl-piece" aria-pressed={active === r}            aria-label={`${PIECES[r].label}: ${d.garments[r]}`} onClick={() => onActive?.(r)} data-solo={d.roles.length === 1 || undefined}>
            <PieceArt role={r} colours={d.colours} logo={back ? null : d.logo}/>
            <span className="dl-piece-cap">{PIECES[r].label} · {d.garments[r]}{back ? ' (back)' : ''}</span>
          </button>
        ))}
      </div>
      <div className="dl-floatbar" role="toolbar" aria-label="View controls">
        <button type="button" onClick={() => setZoom(z => Math.max(.7, z - .1))}>Zoom out</button>
        <button type="button" onClick={() => setZoom(z => Math.min(1.4, z + .1))}>Zoom in</button>
        <button type="button" onClick={() => setZoom(1)}>Fit</button>
        <button type="button" aria-pressed={back} onClick={() => setBack(b => !b)}>{back ? 'Front view' : 'Back view'}</button>
      </div>
    </div>
  );
}

export function StageHint({ view }) {
  return <p className="dl-hint">{view === '3d' ? 'Drag to turn the garment. 3D is a preview; the 2D view is what we make.' : 'Tap a piece to edit it.'}</p>;
}

export function ViewToggle({ view, setView }) {
  return (
    <div className="dl-seg" role="group" aria-label="View">
      <button type="button" aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D</button>
      <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button>
    </div>
  );
}

export function Seg({ label, value, options, onChange }) {
  return (
    <div className="dl-seg dl-seg-wide" role="group" aria-label={label}>
      {options.map(o => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function Swatches({ label, value, onPick, disabled }) {
  return (
    <div className="dl-zone">
      <div className="dl-zone-h"><span>{label}</span><span className="dl-muted">{colourName(value)}</span></div>
      <div className="dl-swatches" role="radiogroup" aria-label={`${label} colour`}>
        {PALETTE.map(p => (
          <button key={p.hex} type="button" role="radio" aria-checked={value === p.hex} aria-label={p.name} title={p.name}
            disabled={disabled} style={{ background: p.hex }} onClick={() => onPick(p.hex)}/>
        ))}
      </div>
    </div>
  );
}

// Colour editor shared by both options; "Whole set" edits the scheme, a piece edits its own zones.
export function ColourEditor({ d, target, locked }) {
  if (target === 'set') return (
    <>
      <p className="dl-muted dl-small">Changes here apply to every piece in the set.</p>
      <Swatches label="Main colour" value={d.schemeOf('main')} onPick={h => d.setScheme('main', h)} disabled={locked}/>
      <Swatches label="Accent colour" value={d.schemeOf('accent')} onPick={h => d.setScheme('accent', h)} disabled={locked}/>
    </>
  );
  return PIECES[target].zones.map(z => (
    <Swatches key={z.id} label={z.label} value={d.colours[target][z.id]} onPick={h => d.setZone(target, z.id, h)} disabled={locked}/>
  ));
}

export function GarmentChoices({ d, role, locked }) {
  return (
    <div className="dl-choices" role="radiogroup" aria-label={`${PIECES[role].label} garment`}>
      {PIECES[role].choices.map(g => (
        <button key={g} type="button" role="radio" aria-checked={d.garments[role] === g} disabled={locked}
          onClick={() => d.setGarments(s => ({ ...s, [role]: g }))}>{g}</button>
      ))}
    </div>
  );
}

export function LogoEditor({ d, locked }) {
  const set = patch => d.setLogo(l => ({ ...l, ...patch }));
  return (
    <>
      <button type="button" className="dl-btn" disabled={locked} onClick={() => set({ on: !d.logo.on })}>{d.logo.on ? 'Remove logo' : 'Upload logo'}</button>
      <label className="dl-field"><span>Placement</span>
        <select value={d.logo.placement} disabled={locked} onChange={e => set({ placement: e.target.value })}>
          {PLACEMENTS.map(p => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="dl-field"><span>Text (name, slogan or number)</span>
        <input value={d.logo.text} disabled={locked} maxLength={24} onChange={e => set({ text: e.target.value })}/>
      </label>
    </>
  );
}

export function ReviewList({ d }) {
  return (
    <dl className="dl-review">
      {d.roles.map(r => (
        <div key={r}>
          <dt>{PIECES[r].label}</dt>
          <dd>{d.garments[r]}: {PIECES[r].zones.map(z => `${z.label} ${colourName(d.colours[r][z.id])}`).join(', ')}</dd>
        </div>
      ))}
      <div><dt>Logo</dt><dd>{d.logo.on ? `${d.logo.placement}, text "${d.logo.text}"` : 'None'}</dd></div>
      <div><dt>Next</dt><dd>Sizes and quantities are asked in the order form.</dd></div>
    </dl>
  );
}

export function StudioTop({ mobile, locked, empty, view, setView, onReview, children }) {
  return (
    <header className="dl-top">
      <a className="dl-btn dl-btn-ghost" href="#back">{mobile ? 'Back' : 'Dashboard'}</a>
      <div className="dl-top-name">
        <strong>Front desk set</strong>
        <span className="dl-muted dl-small">{locked ? 'Ordered · read-only' : 'Saved'}</span>
      </div>
      {children}
      {!mobile && <ViewToggle view={view} setView={setView}/>}
      {locked ? (
        <div className="dl-top-actions">
          {!mobile && <button type="button" className="dl-btn">Duplicate to edit</button>}
          <button type="button" className="dl-btn dl-btn-primary">Reorder</button>
        </div>
      ) : (
        <button type="button" className="dl-btn dl-btn-primary" disabled={empty} onClick={onReview}>{mobile ? 'Review' : 'Review & order'}</button>
      )}
    </header>
  );
}

export function LockNote({ mobile }) {
  return (
    <div className="dl-note" role="status">
      <strong>This design has been ordered, so it's read-only.</strong>
      <span>Duplicate it to make changes, or reorder it as it is.</span>
      {mobile && <button type="button" className="dl-btn">Duplicate to edit</button>}
    </div>
  );
}

// Empty / loading / error take the whole studio body; the top bar stays so Back always works.
export function StudioState({ state, onPick }) {
  if (state === 'loading') return (
    <div className="dl-state" role="status" aria-live="polite">
      <div className="dl-skel dl-skel-art"/><div className="dl-skel dl-skel-line"/><p>Loading your design…</p>
    </div>
  );
  if (state === 'error') return (
    <div className="dl-state" role="alert">
      <h2 className="dl-serif">We couldn't load this design</h2>
      <p>Your saved work is safe. Check your connection and try again.</p>
      <div className="dl-row"><button type="button" className="dl-btn dl-btn-primary">Try again</button><a className="dl-btn" href="#back">Back to dashboard</a></div>
    </div>
  );
  return (
    <div className="dl-state">
      <h2 className="dl-serif">What are you ordering?</h2>
      <p>Most teams order a matching top and bottom. You can add or remove a piece later.</p>
      <div className="dl-row">
        <button type="button" className="dl-btn dl-btn-primary" onClick={() => onPick?.(true)}>Top + bottom set</button>
        <button type="button" className="dl-btn" onClick={() => onPick?.(false)}>Single piece</button>
      </div>
    </div>
  );
}
