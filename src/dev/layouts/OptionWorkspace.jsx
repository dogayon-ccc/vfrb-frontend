import { useState } from 'react';
import { PIECES } from './mock';
import { useMockDesign, Stage, StageHint, ViewToggle, Seg, ColourEditor, GarmentChoices, LogoEditor, ReviewList, StudioTop, LockNote, StudioState, PieceArt } from './parts';

// Option B "Workspace": piece rail | canvas | labelled tabs. Everything is reachable, nothing hidden behind icons.
const TABS = [{ id: 'garment', label: 'Garment' }, { id: 'colours', label: 'Colours' }, { id: 'details', label: 'Details' }, { id: 'logo', label: 'Logo & text' }, { id: 'layers', label: 'Layers' }];

function Details({ locked }) {
  const [on, setOn] = useState({ 'Chest pocket': true, 'Side pockets': false, 'Button placket': true });
  return Object.keys(on).map(k => (
    <label key={k} className="dl-check">
      <input type="checkbox" checked={on[k]} disabled={locked} onChange={() => setOn(s => ({ ...s, [k]: !s[k] }))}/>{k}
    </label>
  ));
}

function Layers({ d }) {
  const items = d.logo.on ? [`Logo · ${d.logo.placement}`, `Text "${d.logo.text}"`] : [];
  return items.length
    ? <ol className="dl-layers">{items.map(i => <li key={i}>{i}</li>)}</ol>
    : <p className="dl-muted">Nothing added yet. Add a logo or text from the Logo & text tab.</p>;
}

export default function OptionWorkspace({ mobile, isSet, setIsSet, state }) {
  const d = useMockDesign(isSet);
  const [tab, setTab] = useState('colours');
  const [active, setActive] = useState('top');
  const [match, setMatch] = useState(true);
  const [view, setView] = useState('2d');
  const [review, setReview] = useState(false);
  const locked = state === 'locked';
  const blocked = ['empty', 'loading', 'error'].includes(state);
  const role = isSet ? active : 'top';
  const colourTarget = isSet && match ? 'set' : role;

  const panel = review ? (
    <>
      <h2 className="dl-serif dl-panel-h">Review</h2>
      <ReviewList d={d}/>
      <div className="dl-row"><button type="button" className="dl-btn" onClick={() => setReview(false)}>Keep editing</button>
        <button type="button" className="dl-btn dl-btn-primary" disabled={locked}>Continue to order</button></div>
    </>
  ) : (
    <>
      {locked && <LockNote mobile={mobile}/>}
      {tab === 'garment' && <GarmentChoices d={d} role={role} locked={locked}/>}
      {tab === 'colours' && <ColourEditor d={d} target={colourTarget} locked={locked}/>}
      {tab === 'details' && <Details locked={locked}/>}
      {tab === 'logo' && <LogoEditor d={d} locked={locked}/>}
      {tab === 'layers' && <Layers d={d}/>}
    </>
  );

  const tabs = (
    <nav className="dl-tabs" aria-label="Edit">
      {TABS.map(t => (
        <button key={t.id} type="button" aria-current={tab === t.id && !review ? 'page' : undefined} onClick={() => { setTab(t.id); setReview(false); }}>
          {mobile && t.id === 'logo' ? 'Logo' : t.label}
        </button>
      ))}
    </nav>
  );

  const matchToggle = isSet && (
    <label className="dl-check">
      <input type="checkbox" checked={match} disabled={locked} onChange={() => setMatch(m => !m)}/>Match colours across set
    </label>
  );

  return (
    <div className="dl-studio" data-mobile={mobile || undefined}>
      <StudioTop mobile={mobile} locked={locked} empty={blocked} view={view} setView={setView} onReview={() => setReview(true)}/>
      {blocked ? <StudioState state={state} onPick={setIsSet}/> : mobile ? (
        <div className="dl-m-body">
          {isSet && <Seg label="Piece" value={active} onChange={setActive} options={d.roles.map(r => ({ id: r, label: `${PIECES[r].label} · ${d.garments[r]}` }))}/>}
          <div className="dl-m-stage">
            <Stage d={d} active={role} onActive={setActive} view={view} compact/>
            <div className="dl-m-stagebar"><ViewToggle view={view} setView={setView}/><StageHint view={view}/></div>
          </div>
          {tabs}
          <div className="dl-m-panel">{tab === 'colours' && !review && matchToggle}{panel}</div>
          {!isSet && !locked && <button type="button" className="dl-btn dl-m-add" onClick={() => setIsSet(true)}>Add a matching bottom</button>}
        </div>
      ) : (
        <div className="dl-b-grid">
          <aside className="dl-rail" aria-label="Pieces">
            <h2 className="dl-rail-h">Pieces</h2>
            {d.roles.map(r => (
              <button key={r} type="button" className="dl-rail-piece" aria-pressed={role === r} onClick={() => setActive(r)}>
                <span className="dl-rail-thumb"><PieceArt role={r} colours={d.colours}/></span>
                <span><strong>{PIECES[r].label}</strong><span className="dl-muted dl-small">{d.garments[r]}</span></span>
              </button>
            ))}
            {isSet ? matchToggle : !locked && <button type="button" className="dl-btn" onClick={() => setIsSet(true)}>Add a matching bottom</button>}
            {isSet && !locked && <button type="button" className="dl-btn dl-btn-ghost" onClick={() => setIsSet(false)}>Make it a single piece</button>}
          </aside>
          <main className="dl-a-canvas"><Stage d={d} active={role} onActive={setActive} view={view}/><StageHint view={view}/></main>
          <aside className="dl-panel">
            {tabs}
            <div className="dl-panel-scroll">
              <p className="dl-muted dl-small">{review ? 'Check everything before you order.' : `Editing: ${isSet && match && tab === 'colours' ? 'Whole set' : `${PIECES[role].label} · ${d.garments[role]}`}`}</p>
              {panel}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
