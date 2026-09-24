import { useRef, useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, inputStyle, FONTS, EMOJIS } from './dsShared';

export default function TextPanel({ onAdd }) {
  const [val,  setVal]  = useState('');
  const [clr,  setClr]  = useState('#ffffff');
  const [font, setFont] = useState(FONTS[0].id);
  const [size, setSize] = useState(18);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  const fontCss = FONTS.find(f=>f.id===font)?.css ?? FONTS[0].css;

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
          style={{ width:38, borderRadius:9, border:`1px solid ${showEmoji?T2:'rgba(15,23,42,.1)'}`,
            background: showEmoji ? 'rgba(2,195,154,.14)' : '#fff', fontSize:16, cursor:'pointer' }}>
          🙂
        </button>
      </div>

      {showEmoji && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:2,
          padding:8, borderRadius:9, background:'rgba(15,23,42,.04)' }}>
          {EMOJIS.map(e => (
            <button key={e} type="button" onClick={()=>insertEmoji(e)}
              style={{ fontSize:16, padding:4, border:'none', background:'none', cursor:'pointer', borderRadius:6 }}>
              {e}
            </button>
          ))}
        </div>
      )}

      <p style={secLabel}>Font Style</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
        {FONTS.map(f => (
          <button key={f.id} onClick={() => setFont(f.id)}
            style={{
              padding:'6px 4px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:10, fontFamily: f.css,
              background: font===f.id ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.04)',
              color:      font===f.id ? T2 : 'rgba(15,23,42,.5)',
              outline:    font===f.id ? `1px solid ${T2}` : '1px solid rgba(15,23,42,.07)',
              fontWeight: font===f.id ? 700 : 400,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <p style={secLabel}>Color</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4 }}>
        {['#ffffff','#000000',T,T2,'#fbbf24','#dc2626','#3b82f6','#7c3aed','#16a34a','#f97316','#c8a96e','#94a3b8'].map(c=>(
          <button key={c} onClick={()=>setClr(c)}
            style={{ height:24,borderRadius:5,cursor:'pointer',border:'none',background:c,
              outline:clr===c?'2px solid rgba(15,23,42,.85)':'1px solid rgba(15,23,42,.1)' }}/>
        ))}
      </div>

      <p style={secLabel}>Size: {size}px</p>
      <input type="range" min="10" max="72" value={size}
        onChange={e=>setSize(Number(e.target.value))} style={{ width:'100%', accentColor:T2 }}/>

      <button onClick={()=>{ if(val.trim()) onAdd(val.trim(), clr, fontCss, size); }}
        disabled={!val.trim()}
        style={{
          padding:'9px', borderRadius:9, border:'none',
          background: val.trim() ? `linear-gradient(135deg,${T},${T2})` : 'rgba(15,23,42,.08)',
          color: val.trim() ? '#fff' : 'rgba(15,23,42,.35)', fontSize:12, fontWeight:700, cursor: val.trim()?'pointer':'not-allowed',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
        <NavIcon name="edit" size={13}/> Add to Canvas
      </button>

      {val && (
        <div style={{ padding:'10px', borderRadius:9, background:'rgba(0,0,0,.3)', textAlign:'center' }}>
          <p style={{ color:clr, fontSize:size>32?22:size, fontFamily:fontCss, fontWeight:800,
            letterSpacing:2, textTransform:'uppercase', margin:0,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {val}
          </p>
        </div>
      )}
    </div>
  );
}
