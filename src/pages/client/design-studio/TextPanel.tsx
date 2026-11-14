import { useEffect, useRef, useState } from 'react';
import { T2, secLabel, FONTS, EMOJIS } from './dsShared';
import { loadFontPreviews, defaultWeight } from './studioFonts';

// EMOJIS contains repeats (e.g. 🦺) which made React warn about duplicate keys and
// could drop/duplicate buttons — de-dupe once at module load.
const UNIQUE_EMOJIS = [...new Set(EMOJIS)];

// Readable default: white on a dark garment, near-black on a light one, until the customer picks a color themselves.
const readableOn = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16), lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? '#111827' : '#ffffff';
};

// Text colours: neutrals, the Philippine uniform colours, then brights and golds. Any other colour comes from the custom picker.
const TEXT_COLOURS = ['#ffffff', '#f4f5f2', '#c9a27a', '#94a3b8', '#475569', '#000000',
  '#1b2a4a', '#2952a3', '#87ceeb', '#006a4e', '#800000', '#dc2626',
  '#f97316', '#fbbf24', '#facc15', '#a3e635', '#16a34a', '#028090',
  '#02c39a', '#7c3aed', '#c026d3', '#f472b6', '#fda4af', '#8b5a2b'];
// Quick styles use the same Fabric props as the Selection inspector's Outline & shadow, so each can be tuned after it is placed.
const STYLES = [
  { id: 'plain',   label: 'Plain',   make: () => ({}),                                                                      css: () => ({}) },
  { id: 'outline', label: 'Outline', make: c => ({ strokeWidth: 2, stroke: readableOn(c), paintFirst: 'stroke', strokeLineJoin: 'round' }),
    css: c => ({ WebkitTextStroke: `1.5px ${readableOn(c)}`, paintOrder: 'stroke fill' }) },
  { id: 'shadow',  label: 'Shadow',  make: () => ({ shadow: { color: 'rgba(0,0,0,.45)', blur: 8, offsetX: 0, offsetY: 3 } }), css: () => ({ textShadow: '0 3px 8px rgba(0,0,0,.45)' }) },
  { id: 'varsity', label: 'Varsity', make: c => ({ strokeWidth: 3, stroke: readableOn(c), paintFirst: 'stroke', strokeLineJoin: 'round', shadow: { color: 'rgba(0,0,0,.6)', blur: 0, offsetX: 2, offsetY: 2 } }),
    css: c => ({ WebkitTextStroke: `2px ${readableOn(c)}`, paintOrder: 'stroke fill', textShadow: '2px 2px 0 rgba(0,0,0,.6)' }) },
  { id: 'spaced',  label: 'Spaced',  make: () => ({ charSpacing: 240 }),                                                    css: () => ({ letterSpacing: '.24em' }) },
];
const ALL = 'All';
const CATS = [ALL, ...new Set(FONTS.map(f => f.cat))];

export default function TextPanel({ onAdd, bodyColor }: any) {
  const [val,  setVal]  = useState('');
  const [picked, setClr] = useState(null);
  const clr = picked ?? readableOn(bodyColor);
  const fonts = FONTS;
  const [font, setFont] = useState(fonts[0].id);
  // Self-hosted faces load on first use; the panel opening is the first use of their previews.
  const [, setFontsReady] = useState(false);
  useEffect(() => { let live = true; loadFontPreviews().then(() => live && setFontsReady(true)); return () => { live = false; }; }, []);
  const [size, setSize] = useState(18);
  const [cat, setCat] = useState(ALL);
  const [look, setLook] = useState('plain');
  const lookDef = STYLES.find(x => x.id === look) ?? STYLES[0];
  const shown = cat === ALL ? fonts : fonts.filter(f => f.cat === cat);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const fontDef = fonts.find(f=>f.id===font) ?? fonts[0], fontCss = fontDef.css;

  const add = () => { if (val.trim()) onAdd(val.trim(), clr, fontCss, size, null, lookDef.make(clr)); };

  const insertEmoji = (e) => {
    const input = inputRef.current;
    const pos = input?.selectionStart ?? val.length;
    setVal(v => v.slice(0, pos) + e + v.slice(pos));
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(pos + e.length, pos + e.length); });
  };

  return (
    <div className="ds-txt">
      <p style={secLabel}>Font · {fontDef.label}</p>
      <div className="ds-fontcats ds-fontcats-stick" role="group" aria-label="Font style">
        {CATS.map(c => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="ds-fontgrid" role="radiogroup" aria-label="Font">
        {shown.map(f => (
          <button key={f.id} type="button" role="radio" aria-checked={font === f.id} className="ds-fonttile" onClick={() => setFont(f.id)}>
            <b style={{ fontFamily: f.css, fontWeight: defaultWeight(f) }}>{val.trim() || 'Aa Bb 123'}</b>
            <small>{f.label}</small>
          </button>
        ))}
      </div>

      <p style={secLabel}>Style</p>
      <div className="ds-fontcats" data-wrap role="radiogroup" aria-label="Text style">
        {STYLES.map(x => <button key={x.id} type="button" role="radio" aria-checked={look === x.id} aria-pressed={look === x.id} onClick={() => setLook(x.id)}>{x.label}</button>)}
      </div>

      <p style={secLabel}>Colour</p>
      <div className="ds-swgrid" data-wide role="radiogroup" aria-label="Text colour">
        {TEXT_COLOURS.map(c => (
          <button key={c} type="button" role="radio" aria-checked={clr === c} aria-label={c} className="ds-sw" style={{ background: c }} onClick={() => setClr(c)}/>
        ))}
      </div>
      <label className="ds-customclr">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(clr) ? clr : '#ffffff'} onChange={e => setClr(e.target.value)} aria-label="Custom text colour"/>
        <span>Custom colour</span><code>{clr}</code>
      </label>

      <p style={secLabel}>Size: {size}px</p>
      <input type="range" min="10" max="72" value={size}
        onChange={e=>setSize(Number(e.target.value))} style={{ width:'100%', accentColor:T2 }}/>
      <div className="ds-addbar">
        {showEmoji && (
          <div className="ds-emoji" role="group" aria-label="Emoji">
            {UNIQUE_EMOJIS.map(e => <button key={e} type="button" onClick={() => insertEmoji(e)}>{e}</button>)}
          </div>
        )}
        {val.trim() && (
          <div className="ds-txt-preview" style={{ background: bodyColor ?? 'rgba(0,0,0,.3)' }}>
            <span style={{ color:clr, fontSize:Math.min(size, 28), fontFamily:fontCss, fontWeight:defaultWeight(fontDef), ...lookDef.css(clr) }}>{val}</span>
          </div>
        )}
        <div className="ds-compose">
          <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
            placeholder="Type a name, slogan or number" aria-label="Text, name or number" maxLength={32}/>
          <button type="button" className="ds-compose-emoji" aria-label="Insert emoji" aria-pressed={showEmoji} onClick={() => setShowEmoji(v => !v)}>🙂</button>
          <button type="button" className="ds-addbtn" disabled={!val.trim()} onClick={add}>Add text</button>
        </div>
      </div>
    </div>
  );
}
