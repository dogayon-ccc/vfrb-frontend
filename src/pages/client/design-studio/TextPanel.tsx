import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, inputStyle, FONTS, EMOJIS } from './dsShared';
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
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const fontDef = fonts.find(f=>f.id===font) ?? fonts[0], fontCss = fontDef.css;

  const insertEmoji = (e) => {
    const input = inputRef.current;
    const pos = input?.selectionStart ?? val.length;
    setVal(v => v.slice(0, pos) + e + v.slice(pos));
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(pos + e.length, pos + e.length); });
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10, flex:1, overflowY:'auto' }}>
      <p style={secLabel}>Text / Name / Number</p>
      <div style={{ display:'flex', gap:6 }}>
        <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
          placeholder="e.g. VFRB Enterprise" maxLength={32} style={{ ...inputStyle, flex:1 }}/>
        <button type="button" onClick={()=>setShowEmoji(s=>!s)} aria-label="Insert emoji"
          style={{ width:38, borderRadius:9, border:`1px solid ${showEmoji?T2:'var(--border-strong)'}`,
            background: showEmoji ? 'var(--teal-50)' : 'var(--bg-card)', fontSize:15, cursor:'pointer' }}>
          🙂
        </button>
      </div>

      {showEmoji && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:2,
          padding:8, borderRadius:9, background:'rgba(15,23,42,.04)' }}>
          {UNIQUE_EMOJIS.map(e => (
            <button key={e} type="button" onClick={()=>insertEmoji(e)}
              style={{ fontSize:15, padding:4, border:'none', background:'none', cursor:'pointer', borderRadius:6 }}>
              {e}
            </button>
          ))}
        </div>
      )}

      <p style={secLabel}>Font · {fontDef.cat}</p>
      <div className="ds-fontgrid" role="radiogroup" aria-label="Font">
        {fonts.map(f => (
          <button key={f.id} type="button" role="radio" aria-checked={font === f.id} className="ds-fonttile" onClick={() => setFont(f.id)}>
            <b style={{ fontFamily: f.css, fontWeight: defaultWeight(f) }}>{f.label}</b>
            <small>{f.cat}</small>
          </button>
        ))}
      </div>

      <p style={secLabel}>Color</p>
      <div className="ds-swgrid" role="radiogroup" aria-label="Text colour">
        {['#ffffff','#000000',T,T2,'#fbbf24','#dc2626','#3b82f6','#7c3aed','#16a34a','#f97316','#c8a96e','#94a3b8'].map(c=>(
          <button key={c} type="button" role="radio" aria-checked={clr === c} aria-label={c} className="ds-sw" style={{ background: c }} onClick={() => setClr(c)}/>
        ))}
      </div>

      <p style={secLabel}>Size: {size}px</p>
      <input type="range" min="10" max="72" value={size}
        onChange={e=>setSize(Number(e.target.value))} style={{ width:'100%', accentColor:T2 }}/>

      <button onClick={()=>{ if(val.trim()) onAdd(val.trim(), clr, fontCss, size); }}
        disabled={!val.trim()}
        style={{
          padding:'9px', borderRadius:9, border:'none',
          background: val.trim() ? `linear-gradient(135deg,${T},${T2})` : 'var(--bg-surface-2)',
          color: val.trim() ? '#fff' : 'var(--text-muted)', fontSize:13, fontWeight:700, cursor: val.trim()?'pointer':'not-allowed',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
        <NavIcon name="edit" size={13}/> Add to Canvas
      </button>

      {val && (
        <div style={{ padding:'10px', borderRadius:9, background: bodyColor ?? 'rgba(0,0,0,.3)', textAlign:'center' }}>
          <p style={{ color:clr, fontSize:size>32?22:size, fontFamily:fontCss, fontWeight:defaultWeight(fontDef), margin:0,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {val}
          </p>
        </div>
      )}
    </div>
  );
}
