import { secLabel, zone3D, ONLY_2D_TAG } from './dsShared';
import { useEffect, useRef, useState } from 'react';
import { paintZone, designPalette, pushRecent, contrastRatio, contrastLabel, bestInk } from './colorRules';
import { SwatchGrid, CustomColor, colourName } from './SwatchGrid';
import { PartButtons, PartStyles, partLabel } from './PartControls';

// Recent colours are per user, like ds_guides:<user_id>; signOut clears them.
const recentKey = () => { try { const id = JSON.parse(localStorage.getItem('vfrb_user') || '{}')?.user_id; return id ? `ds_recent_colours:${id}` : 'ds_recent_colours'; } catch { return 'ds_recent_colours'; } };
const readRecent = () => { try { const v = JSON.parse(localStorage.getItem(recentKey()) ?? '[]'); return Array.isArray(v) ? v.filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8) : []; } catch { return []; } };

// A row of one-tap colours (this design's own, or recent custom picks).
function QuickRow({ title, colours, current, label, onPick }: any) {
  return (
    <div className="ds-quick">
      <p style={secLabel}>{title}</p>
      <div className="ds-quick-row" role="group" aria-label={`${title} colours`}>
        {colours.map(c => (
          <button key={c} type="button" className="ds-quick-sw" style={{ background: c }} aria-pressed={c === (current ?? '').toLowerCase()}
            aria-label={`${label}: ${colourName(c)} ${c.toUpperCase()}`} title={c.toUpperCase()} onClick={() => onPick(c)}/>
        ))}
      </div>
    </div>
  );
}

// Body: which text ink reads on it. Any other part: how it reads against the body. A guide only, never a rule.
function ContrastNote({ zone, cur, body, label }: any) {
  if (zone === 'body') {
    const b = bestInk(cur);
    return (
      <div className="ds-contrast">
        <span className="ds-contrast-demo" style={{ background: cur, color: b.ink }} aria-hidden="true">Aa</span>
        <p><b>{b.name} text reads best</b> on this body colour ({b.r.toFixed(1)}:1). Use it for names and numbers.</p>
      </div>
    );
  }
  if (!/^#[0-9a-f]{6}$/i.test(body ?? '')) return null;
  const r = contrastRatio(cur, body), word = contrastLabel(r);
  return (
    <div className="ds-contrast" data-level={r >= 3 ? 'high' : r >= 1.6 ? 'mid' : 'low'}>
      <span className="ds-contrast-pair" aria-hidden="true"><i style={{ background: body }}/><i style={{ background: cur }}/></span>
      <p><b>{word}</b> against the body ({r.toFixed(1)}:1).{r < 1.6 ? ` Pick a lighter or darker ${label.toLowerCase()} if it should show.` : ''}</p>
    </div>
  );
}

// One part of the garment: its colours and the style options it really has. Done returns to the whole uniform;
// without Done (a colour-only copy) the part buttons switch parts instead.
export default function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone, onDone = null }: any) {
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors: paintZone(p.colors, zone, c) }));
  const label = partLabel(cfg, activeZone);
  const cur = cfg.colors[activeZone];
  const only2D = zone3D(cfg.garment, cfg.sleeve, cfg.fit, activeZone) === false;
  const palette = designPalette(cfg.colors);
  const [recent, setRecent] = useState(readRecent);
  // Custom picks only: the colour input fires while dragging, so the list is saved on a short pause, not every frame.
  const saveTimer = useRef(null);
  const remember = hex => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setRecent(list => { const next = pushRecent(list, hex); try { localStorage.setItem(recentKey(), JSON.stringify(next)); } catch { /* storage blocked */ } return next; }), 400);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  return (
    <div className="ds-colors">
      {cfg.garment && (
        <div className="ds-part-head">
          <div className="ds-zone-now">
            <span className="ds-zone-dot" style={{ background: cur ?? 'var(--cx-paper-2)' }}/>
            <span><b>{label}</b>: {colourName(cur)}</span>
            {only2D && <span title="The 3D model has no separate region for this part" style={ONLY_2D_TAG}>2D only</span>}
            <code>{(cur ?? '').toUpperCase()}</code>
          </div>
          {onDone && <button type="button" className="ds-btn ds-part-done" onClick={onDone}>Done</button>}
        </div>
      )}
      {!onDone && <PartButtons cfg={cfg} active={activeZone} onPick={setActiveZone}/>}

      <PartStyles cfg={cfg} setCfg={setCfg} zone={activeZone}/>

      {activeZone === 'tipping' && cfg.colors.tipping === null ? (
        <button type="button" className="ds-btn ds-part-done" onClick={() => setColor('tipping', '#ffffff')}>+ Add tipping (contrast collar edge)</button>
      ) : (
        <>
          <p style={secLabel}>Philippine colours</p>
          <SwatchGrid label={label} current={cur} onPick={hex => setColor(activeZone, hex)}/>
          <p style={secLabel}>Custom</p>
          <CustomColor label={label} current={cur} onPick={hex => { setColor(activeZone, hex); remember(hex); }}/>
          {activeZone === 'tipping' && <button type="button" className="ds-link" onClick={() => setColor('tipping', null)}>Turn off tipping</button>}
          {palette.length > 1 && <QuickRow title="In this design" colours={palette} current={cur} label={label} onPick={hex => setColor(activeZone, hex)}/>}
          {recent.length > 0 && <QuickRow title="Recent" colours={recent} current={cur} label={label} onPick={hex => setColor(activeZone, hex)}/>}
          {cfg.garment && /^#[0-9a-f]{6}$/i.test(cur ?? '') && <ContrastNote zone={activeZone} cur={cur} body={cfg.colors.body} label={label}/>}
        </>
      )}
    </div>
  );
}
