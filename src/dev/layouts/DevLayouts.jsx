import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SCENARIOS } from './mock';
import OptionGuided from './OptionGuided';
import OptionWorkspace from './OptionWorkspace';
import { DashboardGuided, DashboardWorkspace } from './Dashboards';
import './devLayouts.css';

// Dev-only comparison page for two Studio + dashboard layout options. Mock data, no API calls.

const SCREENS = [
  { id: 'studio-d', label: 'Studio desktop', w: 1440, h: 900, mobile: false },
  { id: 'studio-m', label: 'Studio mobile', w: 390, h: 844, mobile: true },
  { id: 'dash-d', label: 'Dashboard desktop', w: 1440, h: 0, mobile: false },
  { id: 'dash-m', label: 'Dashboard mobile', w: 390, h: 0, mobile: true },
];
const OPTIONS = [{ id: 'a', label: 'Option A · Guided' }, { id: 'b', label: 'Option B · Workspace' }];
const STATES = ['ready', 'empty', 'loading', 'error', 'locked'];

function Screen({ opt, screen, mobile, isSet, setIsSet, state, scenario }) {
  const s = SCENARIOS[scenario];
  if (screen.startsWith('studio')) {
    const Studio = opt === 'a' ? OptionGuided : OptionWorkspace;
    return <Studio mobile={mobile} isSet={isSet} setIsSet={setIsSet} state={state}/>;
  }
  return opt === 'a' ? <DashboardGuided s={s} mobile={mobile}/> : <DashboardWorkspace s={s} mobile={mobile}/>;
}

// Renders a screen at its true design width, scaled down to fit the column.
function Frame({ w, h, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [box, setBox] = useState({ scale: 1, height: h || 600 });
  useLayoutEffect(() => {
    const measure = () => {
      const scale = Math.min(1, outer.current.clientWidth / w);
      setBox({ scale, height: (h || inner.current.scrollHeight) * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current); ro.observe(inner.current);
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div className="dl-frame" ref={outer} style={{ height: box.height }}>
      <div ref={inner} className="dl-frame-in" style={{ width: w, height: h || undefined, transform: `scale(${box.scale})` }}>{children}</div>
    </div>
  );
}

function Controls({ label, value, options, onChange }) {
  return (
    <fieldset className="dl-ctl">
      <legend>{label}</legend>
      <div className="dl-seg dl-seg-wrap">
        {options.map(o => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
      </div>
    </fieldset>
  );
}

const q = () => new URLSearchParams(window.location.search);

export default function DevLayouts() {
  const [screen, setScreen] = useState(q().get('screen') || 'all');
  const [compare, setCompare] = useState('both');
  const [isSet, setIsSet] = useState(q().get('set') !== 'single');
  const [state, setState] = useState(q().get('state') || 'ready');
  const [scenario, setScenario] = useState(q().get('scenario') || 'action');
  const full = q().get('full');
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const root = document.documentElement;
    const had = root.hasAttribute('data-cx');
    root.setAttribute('data-cx', '');
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => { if (!had) root.removeAttribute('data-cx'); mq.removeEventListener('change', on); };
  }, []);

  const props = { isSet, setIsSet, state, scenario };
  const fullHref = (opt, id) => `?full=${opt}-${id.split('-')[0]}&set=${isSet ? 'set' : 'single'}&state=${state}&scenario=${scenario}`;

  // ?full=a-studio renders one screen at the real viewport, so 390 and 1440 can be checked in devtools.
  if (full) {
    const [opt, kind] = full.split('-');
    return <div className="dl-root dl-full"><Screen opt={opt} screen={kind} mobile={narrow} {...props}/></div>;
  }

  const screens = SCREENS.filter(s => screen === 'all' || s.id === screen);
  const opts = OPTIONS.filter(o => compare === 'both' || o.id === compare);
  return (
    <div className="dl-root">
      <header className="dl-page-h">
        <h1 className="dl-serif">Studio layout options</h1>
        <p className="dl-muted">Dev-only prototypes with mock data. Compare A and B side by side, or use "Open full size" to test at the real width.</p>
        <div className="dl-ctls">
          <Controls label="Compare" value={compare} onChange={setCompare} options={[{ id: 'both', label: 'Side by side' }, { id: 'a', label: 'A only' }, { id: 'b', label: 'B only' }]}/>
          <Controls label="Screen" value={screen} onChange={setScreen} options={[{ id: 'all', label: 'All' }, ...SCREENS.map(s => ({ id: s.id, label: s.label }))]}/>
          <Controls label="Pieces" value={isSet ? 'set' : 'single'} onChange={v => setIsSet(v === 'set')} options={[{ id: 'set', label: 'Top + bottom set' }, { id: 'single', label: 'Single piece' }]}/>
          <Controls label="Studio state" value={state} onChange={setState} options={STATES.map(s => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))}/>
          <Controls label="Dashboard data" value={scenario} onChange={setScenario} options={Object.entries(SCENARIOS).map(([id, v]) => ({ id, label: v.label }))}/>
        </div>
      </header>
      {screens.map(sc => (
        <section key={sc.id} className="dl-compare" aria-label={sc.label}>
          <h2 className="dl-compare-h">{sc.label} <span className="dl-muted">({sc.w}px)</span></h2>
          <div className="dl-compare-grid" data-cols={opts.length} data-mobile={sc.mobile || undefined}>
            {opts.map(o => (
              <div key={o.id} className="dl-compare-col">
                <div className="dl-compare-cap"><strong>{o.label}</strong><a className="dl-link" href={fullHref(o.id, sc.id)} target="_blank" rel="noreferrer">Open full size</a></div>
                <Frame w={sc.w} h={sc.h}><Screen opt={o.id} screen={sc.id} mobile={sc.mobile} {...props}/></Frame>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
