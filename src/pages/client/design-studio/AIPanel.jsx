import { useState } from 'react';
import axios from 'axios';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, inputStyle } from './dsShared';

const EXAMPLES = [
  'Navy blue school polo, white collar, left chest pocket',
  'Green medical scrubs, V-neck, minimalist',
  'White lab coat, long sleeve, two hip pockets',
  'Teal corporate polo, mandarin collar, clean',
];

const cacheKey = p => `ai_d_${btoa(unescape(encodeURIComponent(p.slice(0,60))))}`;
const getCached = p => { try { return JSON.parse(sessionStorage.getItem(cacheKey(p))); } catch { return null; } };
const setCache  = (p,v) => { try { sessionStorage.setItem(cacheKey(p), JSON.stringify(v)); } catch {} };

export default function AIPanel({ onApply, onTexture }) {
  const [prompt, setPrompt] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [msg,    setMsg]    = useState('');
  const [err,    setErr]    = useState('');
  const [texUrl, setTexUrl] = useState('');

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setErr(''); setMsg('');
    const cached = getCached(prompt.trim());
    if (cached) { onApply(cached); setMsg('✓ Applied (cached)'); setBusy(false); return; }
    try {
      const { data } = await axios.post('/api/ai/describe-design', { description:prompt });
      if (!data?.config) { setErr('No config returned. Try rephrasing.'); return; }
      setCache(prompt.trim(), data.config);
      onApply(data.config);
      setMsg(data.interpretation ?? '✓ Design applied!');
    } catch(e) {
      setErr(e.response?.data?.error ?? 'AI unavailable. Check GEMINI_API_KEY in .env');
    } finally { setBusy(false); }
  };

  // Pollinations.ai: free, no key — texture inspiration image, opt-in via navigator.onLine
  const getTexture = () => {
    if (!prompt.trim() || !navigator.onLine) {
      if (!navigator.onLine) setErr('Texture requires internet connection.');
      return;
    }
    const encoded = encodeURIComponent(`${prompt} fabric texture seamless pattern`);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=256&height=256&nologo=true`;
    setTexUrl(url);
    onTexture?.(url);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10, flex:1, overflowY:'auto' }}>
      <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(2,195,154,.07)', border:'1px solid rgba(2,195,154,.2)' }}>
        <p style={{ fontSize:11,fontWeight:700,color:T2,margin:'0 0 3px', display:'flex', alignItems:'center', gap:5 }}>
          <NavIcon name="ai" size={13}/> AI Design Generator
        </p>
        <p style={{ fontSize:10,color:'rgba(15,23,42,.4)',margin:0,lineHeight:1.5 }}>
          Describe your uniform — Gemini fills all zones. Results cached per session.
        </p>
      </div>

      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3}
        placeholder="e.g. Navy blue school polo, white collar, left chest pocket"
        onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();generate();} }}
        style={{ ...inputStyle, resize:'none', lineHeight:1.6 }}/>

      <div style={{ display:'flex', gap:6 }}>
        <button onClick={generate} disabled={busy||!prompt.trim()}
          style={{
            flex:1, padding:'8px', borderRadius:9, border:'none',
            cursor: busy||!prompt.trim() ? 'not-allowed' : 'pointer',
            background: busy ? 'rgba(15,23,42,.08)' : `linear-gradient(135deg,${T},${T2})`,
            color: busy ? 'rgba(15,23,42,.35)' : '#fff', fontSize:11, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
          {busy
            ? <><NavIcon name="loading" size={13} style={{ animation:'dspin .7s linear infinite' }}/> Thinking…</>
            : <><NavIcon name="ai" size={13}/> Generate</>}
        </button>
        <button onClick={getTexture} disabled={!prompt.trim()} title="Get texture from Pollinations.ai"
          style={{
            padding:'8px 10px', borderRadius:9, border:`1px solid rgba(2,195,154,.25)`,
            cursor: !prompt.trim() ? 'not-allowed' : 'pointer',
            background:'rgba(2,195,154,.07)', color:T2, fontSize:11, fontWeight:700,
            display:'flex', alignItems:'center', gap:5,
          }}>
          <NavIcon name="image" size={13}/> Texture
        </button>
      </div>

      {err && <p style={{ fontSize:10,color:'#fca5a5',margin:0, display:'flex', alignItems:'center', gap:4 }}>
        <NavIcon name="warning" size={11} color="#fca5a5"/> {err}
      </p>}
      {msg && (
        <div style={{ padding:'8px 10px',borderRadius:9, background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.2)' }}>
          <p style={{ fontSize:10,color:'#86efac',margin:0 }}>{msg}</p>
        </div>
      )}

      {texUrl && (
        <div style={{ borderRadius:10,overflow:'hidden',border:'1px solid rgba(15,23,42,.1)' }}>
          <p style={{ fontSize:9,color:'rgba(15,23,42,.3)',margin:'0 0 4px', padding:'6px 8px 0',
            textTransform:'uppercase',letterSpacing:'.07em' }}>
            Texture Inspiration (Pollinations.ai)
          </p>
          <img src={texUrl} alt="texture" style={{ width:'100%',display:'block' }} onError={()=>setTexUrl('')}/>
        </div>
      )}

      <p style={secLabel}>Quick Examples</p>
      {EXAMPLES.map((ex,i) => (
        <button key={i} onClick={()=>setPrompt(ex)}
          style={{ padding:'7px 9px',borderRadius:8, border:'1px solid rgba(15,23,42,.07)',
            background:'rgba(15,23,42,.03)',color:'rgba(15,23,42,.4)',
            fontSize:10,cursor:'pointer',textAlign:'left',lineHeight:1.4 }}>
          {ex}
        </button>
      ))}
    </div>
  );
}
