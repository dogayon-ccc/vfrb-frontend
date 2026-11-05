// Studio help: a guided tour that spotlights the real controls (desktop and phone steps differ, a step whose control is not on
// screen is skipped) and the "?" shortcut list. The tour opens once, the first time a garment is on the stage; both reopen from the
// Pieces column (desktop) or More (phones). How to lists short tutorials that play in the same spotlight card. Display only: nothing
// here touches the design.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS, helpKey, letterKeysOn, setLetterKeys } from './railTools';
import { TUTORIALS, tutorialById } from './studioTutorials';
import useDialogFocus from '../../../hooks/useDialogFocus';

const SEEN_KEY = 'ds_tour_v1';
const DESKTOP = '(min-width:1024px)';

// [selector or null, title, body]. Copy describes what the Studio really does; no sizes, prices or 3D promises.
const DESKTOP_STEPS = [
  [null, 'Welcome to the Design Studio', 'Design a uniform the way you would in a photo editor: colour each part, place logos and text, and check the front and back. This tour takes about a minute.'],
  ['.ds-lane-top>.ds-tools', 'Tools', 'Pick a tool here or press its letter: V moves, B draws, M and O drag out a rectangle or an ellipse, G fills a part. The circle at the foot is your active colour.'],
  ['.ds-stage-fit', 'Your garment', 'Tap a part to colour it. Drag an item to move it; it snaps to the grid and the centre and chest lines. Scroll to pan, Z or Ctrl+scroll to zoom, double-click the empty stage to fit.'],
  ['.ds-rail-card', 'Pieces', 'Each uniform piece has a card. Add a matching top or bottom to design the set together.'],
  ['.ds-navi', 'Navigator', 'A live map of your design. Zoom in, then drag the frame to move around; the slider zooms.'],
  ['.ds-dock', 'Layers', 'Everything you placed, front-most first. Tap a row to select it, use the eye to hide it. Edit all opens rename, order, lock and opacity.'],
  ['.ds-lane-top .ds-vt', 'View', 'Grid, rulers, snap and guides help you place things. They never reach your saved design or its picture.'],
  ['.ds-tabs', 'Panels', 'Garment holds colours, patterns and details. Add places logos, text and shapes. Ask AI turns a described change into edits you preview before keeping.'],
  ['.ds-bar-save-btn', 'Save', 'Saves the design to your account. Open it again any time from My Designs.'],
  ['.ds-bar-primary', 'Review & order', 'When it looks right, review the design and order it from there.'],
  [null, 'Shortcuts', 'Press ? any time for every shortcut. Replay this tour from Take the tour at the foot of the left column.'],
];
const PHONE_STEPS = [
  [null, 'Welcome to the Design Studio', 'Colour each part, place logos and text, and check the front and back. This tour takes about a minute.'],
  ['.ds-rail[data-strip],.ds-rail[data-set]', 'Pieces', 'Your piece is here. Add bottom (or Add top) designs the matching piece as a set.'],
  ['.ds-lane-top>.ds-tools', 'Tools', 'Move, eyedropper, paint bucket, pen and line, plus your active colour. Logos, text and drawing are in Add.'],
  ['.ds-stage-fit', 'Gestures', 'Pinch to zoom and drag with two fingers to pan. Double-tap the empty stage to fit or zoom in. Tap with two fingers to undo.'],
  ['.ds-bnav', 'Panels', 'Garment colours each part, Add places logos, text and shapes, Layers lists everything, Ask AI previews a described change. More has View, Save a copy and this tour.'],
  ['.ds-bar-primary', 'Review', 'When it looks right, review the design and order it from there. Save now is in the ··· menu.'],
];

const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const find = sel => (sel ? [...document.querySelectorAll(sel)].find(visible) ?? null : null);
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } }; // no storage: never auto-open
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ } };

// Where the card goes: beside the target when there is room (right, then left), else below or above; always on screen.
function place(r, card, vw, vh) {
  const m = 12, cw = card.w, ch = card.h;
  const clampX = x => Math.min(vw - cw - m, Math.max(m, x)), clampY = y => Math.min(vh - ch - m, Math.max(m, y));
  if (!r) return { left: (vw - cw) / 2, top: (vh - ch) / 2 };
  if (r.right + m + cw <= vw - m && r.width < vw * 0.6) return { left: r.right + m, top: clampY(r.top) };
  if (r.left - m - cw >= m && r.width < vw * 0.6) return { left: r.left - m - cw, top: clampY(r.top) };
  if (r.bottom + m + ch <= vh - m) return { left: clampX(r.left), top: r.bottom + m };
  if (r.top - m - ch >= m) return { left: clampX(r.left), top: r.top - m - ch };
  return { left: clampX(r.left), top: clampY(vh - ch - m) };
}

// `script` (a tutorial's steps) replaces the device tour; `onDone` then returns to the How to list.
function Tour({ onClose, onKeys, script = null, kicker = null, onDone = null }) {
  const [desk] = useState(() => window.matchMedia?.(DESKTOP).matches ?? true);
  const [steps] = useState(() => {
    const s = (script ?? (desk ? DESKTOP_STEPS : PHONE_STEPS)).filter(([sel]) => !sel || find(sel));
    return s.length ? s : [[null, 'Nothing to point at yet', 'Open a garment on the stage first, then play this guide again.']];
  });
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState(null);
  const card = useRef(null), next = useRef(null);
  const [sel, title, body] = steps[i];
  const last = i === steps.length - 1;
  const measure = useCallback(() => {
    const el = find(sel), r = el?.getBoundingClientRect() ?? null, c = card.current;
    setRect(r ? { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null);
    if (c) setPos(place(r, { w: c.offsetWidth, h: c.offsetHeight }, window.innerWidth, window.innerHeight));
  }, [sel]);
  useDialogFocus(card, { onClose, initial: '.ds-btn--primary' });
  useLayoutEffect(() => { measure(); }, [measure, i]);
  // The card is hidden until placed, so focus waits for its position.
  const placed = !!pos;
  useEffect(() => { if (placed) next.current?.focus({ preventScroll: true }); }, [placed, i]);
  useEffect(() => { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, [measure]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.stopPropagation(); // never nudges a selected item behind the tour
        if (e.key === 'ArrowRight' && !last) setI(n => n + 1);
        if (e.key === 'ArrowLeft' && i > 0) setI(n => n - 1);
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose, last, i]);
  const pad = 6;
  return (
    <div className="ds-tour" role="presentation">
      {rect
        ? <div className="ds-tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} aria-hidden="true"/>
        : <div className="ds-tour-dim" aria-hidden="true"/>}
      <div ref={card} className="ds-tour-card" role="dialog" aria-modal="true" aria-labelledby="ds-tour-h" aria-describedby="ds-tour-b"
        style={pos ?? { visibility: 'hidden' }}>
        <div className="ds-tour-top">
          <span className="ds-tour-step">{kicker ? `${kicker} · ` : ''}Step {i + 1} of {steps.length}</span>
          <button type="button" className="ds-tour-x" aria-label="Close the tour" onClick={onClose}><X size={16} aria-hidden="true"/></button>
        </div>
        <h2 id="ds-tour-h">{title}</h2>
        <p id="ds-tour-b">{body}</p>
        <div className="ds-tour-dots" aria-hidden="true">{steps.map((_, n) => <i key={n} data-on={n === i || undefined}/>)}</div>
        <div className="ds-tour-acts">
          {onDone ? <button type="button" className="ds-link" onClick={onDone}>All guides</button>
            : last && onKeys ? <button type="button" className="ds-link" onClick={onKeys}>See all shortcuts</button>
            : <button type="button" className="ds-link" onClick={onClose}>Skip tour</button>}
          <span className="ds-tour-nav">
            {i > 0 && <button type="button" className="ds-btn" onClick={() => setI(n => n - 1)}>Back</button>}
            <button ref={next} type="button" className="ds-btn ds-btn--primary" onClick={() => (last ? (onDone ?? onClose)() : setI(n => n + 1))}>{last ? (onDone ? 'Done' : 'Start designing') : 'Next'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// Shared modal frame for the shortcut list and the How to list: Tab stays inside, Esc and a click outside close it.
function useDialogKeys(onClose) {
  const box = useRef(null);
  useDialogFocus(box, { onClose, initial: '.ds-tour-x' });
  return box;
}

function HowTo({ onClose, onPick, onTour, onKeys }) {
  const box = useDialogKeys(onClose);
  return (
    <div className="ds-tour" role="presentation" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ds-tour-dim" aria-hidden="true"/>
      <div ref={box} className="ds-keysdlg ds-howto" role="dialog" aria-modal="true" aria-labelledby="ds-howto-h">
        <div className="ds-tour-top">
          <h2 id="ds-howto-h">How to</h2>
          <button type="button" className="ds-tour-x" aria-label="Close the guides" onClick={onClose}><X size={16} aria-hidden="true"/></button>
        </div>
        <p className="ds-howto-lede">Pick a guide. Each one points at the real controls, step by step.</p>
        <ul className="ds-howto-list">
          {TUTORIALS.map(t => (
            <li key={t.id}><button type="button" onClick={() => onPick(t.id)}><strong>{t.title}</strong><span>{t.summary}</span><small>{t.steps.length} steps</small></button></li>
          ))}
        </ul>
        <div className="ds-tour-acts">
          <button type="button" className="ds-link" onClick={onKeys}>Shortcuts</button>
          <button type="button" className="ds-btn ds-btn--primary" onClick={onTour}>Take the full tour</button>
        </div>
      </div>
    </div>
  );
}

function Keys({ onClose, onTour, onHowTo }) {
  const box = useDialogKeys(onClose);
  const [letters, setLetters] = useState(letterKeysOn);
  return (
    <div className="ds-tour" role="presentation" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ds-tour-dim" aria-hidden="true"/>
      <div ref={box} className="ds-keysdlg" role="dialog" aria-modal="true" aria-labelledby="ds-keys-h">
        <div className="ds-tour-top">
          <h2 id="ds-keys-h">Shortcuts and gestures</h2>
          <button type="button" className="ds-tour-x" aria-label="Close shortcuts" onClick={onClose}><X size={16} aria-hidden="true"/></button>
        </div>
        <div className="ds-keysdlg-grid">
          {SHORTCUTS.map(g => (
            <section key={g.group}>
              <h3>{g.group}</h3>
              <dl>{g.keys.map(([k, label]) => <div key={k + label}><dt><kbd>{k}</kbd></dt><dd>{label}</dd></div>)}</dl>
            </section>
          ))}
        </div>
        <label className="ds-keys-pref">
          <input type="checkbox" checked={letters} onChange={e => { setLetterKeys(e.target.checked); setLetters(e.target.checked); }}/>
          <span>Single-key shortcuts<small>Turn off if you use speech input, or if letters trigger tools by accident.</small></span>
        </label>
        <div className="ds-tour-acts">
          <button type="button" className="ds-link" onClick={onHowTo}>How-to guides</button>
          <button type="button" className="ds-btn ds-btn--primary" onClick={onTour}>Take the tour</button>
        </div>
      </div>
    </div>
  );
}

// mode: null | 'tour' | 'keys' | 'howto' | 'tut:<tutorial id>'. `ready`: a garment is on the stage and the design can be edited (the first-run tour waits for it).
export default function StudioHelp({ mode, setMode, ready }) {
  useEffect(() => {
    if (!ready || mode || readSeen()) return undefined;
    const t = setTimeout(() => setMode('tour'), 700); // after the stage has laid out, so the spotlight lands on real controls
    return () => clearTimeout(t);
  }, [ready, mode, setMode]);
  useEffect(() => {
    const key = (e) => {
      const a = document.activeElement;
      if (!helpKey(e) || (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable))) return;
      e.preventDefault();
      setMode(m => (m === 'keys' ? null : 'keys'));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [setMode]);
  const close = useCallback(() => { markSeen(); setMode(null); }, [setMode]);
  if (mode === 'tour') return <Tour onClose={close} onKeys={() => { markSeen(); setMode('keys'); }}/>;
  if (mode === 'keys') return <Keys onClose={() => setMode(null)} onTour={() => setMode('tour')} onHowTo={() => setMode('howto')}/>;
  if (mode === 'howto') return <HowTo onClose={() => setMode(null)} onPick={id => setMode(`tut:${id}`)} onTour={() => setMode('tour')} onKeys={() => setMode('keys')}/>;
  const tut = typeof mode === 'string' && mode.startsWith('tut:') ? tutorialById(mode.slice(4)) : null;
  if (tut) return <Tour key={tut.id} script={tut.steps} kicker={tut.title} onClose={() => setMode(null)} onDone={() => setMode('howto')}/>;
  return null;
}
