// src/customer/AIDesignChat.jsx
// AI design-assistant chat. Two render modes off one shared engine (state,
// send(), caching, quick questions all identical either way):
//   docked=false (default) — floating FAB + panel, was mounted globally in
//     CustomerLayout; that global mount is removed (Sept 18 2026) since it
//     had no relation to whatever page a customer was actually on.
//   docked=true — inline block for DesignStudio's right sidebar (ds-info),
//     collapsed by default (a 156px→280px column has no room for a full
//     thread at rest); no FAB, no backdrop, no fixed positioning.
// Uses Gemini Flash via /api/ai/describe-design (chat mode); falls back
// gracefully if that route errors. Prompts cached per session.
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence }      from 'framer-motion';
import axios                            from 'axios';
import { NavIcon }                      from '../../components/ui/icons';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,sans-serif`;

const QUICK = [
  'What colors work for school uniforms?',
  'How many yards of fabric for 50 polo shirts?',
  'What thread type for scrub suits?',
  'Standard sizing for Philippine nurses?',
  'Difference between polo and mandarin collar?',
];

const SYSTEM_CONTEXT = `You are VFRB Design Assistant, an AI for VFRB Enterprise — 
a Philippine garment manufacturer in Muntinlupa City that has been making uniforms since 2000.
VFRB makes scrub suits for hospitals, polo shirts for schools, corporate uniforms, 
and exports school uniforms to Papua New Guinea.

VFRB production:
- 7 stages — Pattern → Segregation → Cutting → Sewing → QC → Pressing → Packing
- Sizes: XS, S, M, L, XL, XXL, XXXL, Custom
- All material quantities are determined by VFRB's internal production team.
  Do not state specific yardage or meter quantities when asked.

Answer questions about garment design, material selection, sizing, colors, and production.
Keep answers brief (2-4 sentences), friendly, and practical for Philippine institutional clients.
If asked to design something, describe the garment in plain terms.
Do NOT mention prices or delivery times — only production staff can confirm those.`;

/* FAB stack (mobile, bottom→top): Studio 58 · this 130 · Feedback 202 — 20px clear gaps.
   Desktop: Studio hidden; this 24 · Feedback 92 — 16px clear gap. */
const CSS = `
.aidc-fab{ position:fixed; bottom:130px; right:16px; z-index:300; }
.aidc-panel{ position:fixed; left:12px; right:12px; bottom:192px; height:min(60dvh,420px); z-index:300; }
.aidc-backdrop{ position:fixed; inset:0; z-index:290; background:rgba(15,23,42,.45); backdrop-filter:blur(4px); }
@media (min-width:768px){
  .aidc-fab{ bottom:24px; right:24px; }
  .aidc-panel{ left:auto; right:24px; width:360px; bottom:86px; height:440px; }
}
/* Docked (Design Studio right sidebar) — static block, no fixed positioning,
   no backdrop; width comes from the ds-info column it lives in. */
.aidc-dock{ border-top:1px solid rgba(15,23,42,.08); padding-top:8px; margin-top:2px; }
.aidc-dock-thread{ max-height:280px; }
`;

export default function AIDesignChat({ docked = false }) {
  // Same flag either way: floating panel open/closed, or docked thread
  // expanded/collapsed. Starts collapsed in both modes.
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { role:'ai', text:"Hi! I'm VFRB's AI Design Assistant. Ask me anything about garment design, materials, sizing, or colors. 🎨" }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const cache  = useRef({});

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs, open]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMsgs(m => [...m, { role:'user', text:q }]);
    setLoading(true);

    const cKey = q.toLowerCase().slice(0,80);
    if (cache.current[cKey]) {
      setMsgs(m => [...m, { role:'ai', text:cache.current[cKey] }]);
      setLoading(false);
      return;
    }

    try {
      const history = msgs.slice(-6)
        .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.text}`)
        .join('\n');
      const prompt = `${SYSTEM_CONTEXT}\n\nConversation:\n${history}\nCustomer: ${q}\nAssistant:`;

      // describeDesign() branches on mode:'chat' server-side and always
      // replies with { chat_response }, or throws (caught below) on failure.
      const { data } = await axios.post('/api/ai/describe-design', {
        prompt: q,
        chat_context: prompt,
        mode: 'chat'
      });

      const answer = data?.chat_response
        || "Great question! For VFRB Enterprise orders, our staff can give you the most accurate advice. Would you like me to help you configure a garment in Design Studio instead?";

      cache.current[cKey] = answer;
      setMsgs(m => [...m, { role:'ai', text:answer }]);
    } catch {
      setMsgs(m => [...m, {
        role:'ai',
        text:"I'm having trouble connecting right now. Please try again or contact VFRB staff directly via the Messages tab."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Shared between both render modes — the message thread + quick
  // questions + typing indicator never differ, only what wraps them.
  const thread = (
    <div className={docked ? 'aidc-dock-thread' : undefined}
      style={{ flex:1, overflowY:'auto', padding: docked ? '10px 0 0' : '14px 16px',
        display:'flex', flexDirection:'column', gap:10,
        scrollbarWidth:'thin', scrollbarColor:'#e2e8f0 transparent' }}>

      {msgs.length < 3 && (
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:4 }}>
          <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8',
            textTransform:'uppercase', letterSpacing:'.07em', margin:0, fontFamily:FONT }}>
            Quick questions
          </p>
          {QUICK.map((q, i) => (
            <motion.button key={i} onClick={() => send(q)}
              whileHover={{ scale:1.01, background:'#f0fdfa', borderColor:`${T}30` }}
              whileTap={{ scale:.98 }}
              style={{ padding:'7px 10px', borderRadius:9, border:'1px solid #e2e8f0',
                background:'#f8fafc', cursor:'pointer', textAlign:'left',
                fontSize:11, color:'#475569', fontFamily:FONT, transition:'all .13s' }}>
              {q}
            </motion.button>
          ))}
        </div>
      )}

      {msgs.map((m, i) => (
        <motion.div key={i}
          initial={{ opacity:0, y:6, x: m.role==='user' ? 8 : -8 }}
          animate={{ opacity:1, y:0, x:0 }}
          style={{ display:'flex',
            justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
          {m.role === 'ai' && (
            <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
              background:`linear-gradient(135deg,${T},${T2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              marginRight:7, marginTop:2 }}><NavIcon name="ai" size={13} color="#fff"/></div>
          )}
          <div style={{
            maxWidth:'78%', padding:'9px 13px', borderRadius:
              m.role==='user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
            background: m.role==='user'
              ? `linear-gradient(135deg,${T},${T2})`
              : '#f1f5f9',
            fontSize:12, lineHeight:1.6, fontFamily:FONT,
            color: m.role==='user' ? '#fff' : '#0f172a',
          }}>
            {m.text}
          </div>
        </motion.div>
      ))}

      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg,${T},${T2})`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <NavIcon name="ai" size={13} color="#fff"/>
          </div>
          <div style={{ padding:'9px 13px', borderRadius:'12px 12px 12px 3px',
            background:'#f1f5f9', display:'flex', alignItems:'center', gap:4 }}>
            {[0,1,2].map(i => (
              <motion.div key={i}
                animate={{ y:[0,-4,0] }}
                transition={{ duration:.6, delay:i*.15, repeat:Infinity }}
                style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8' }}/>
            ))}
          </div>
        </div>
      )}
      <div ref={endRef}/>
    </div>
  );

  const inputRow = (
    <div style={{ padding: docked ? '8px 0 0' : '10px 12px', borderTop: docked ? 'none' : '1px solid #e2e8f0',
      display:'flex', gap:8, flexShrink:0 }}>
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="Ask about design, materials, sizing…"
        style={{ flex:1, padding:'9px 12px', borderRadius:10,
          border:'1px solid #e2e8f0', background:'#fff',
          fontSize:12, color:'#0f172a', outline:'none', fontFamily:FONT }}
        onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
        onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none';}}/>
      <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:.95 }}
        onClick={() => send()}
        disabled={!input.trim() || loading}
        style={{ padding:'9px 14px', borderRadius:10, border:'none',
          background:(!input.trim()||loading)?'#e2e8f0':`linear-gradient(135deg,${T},${T2})`,
          color:(!input.trim()||loading)?'#94a3b8':'#fff',
          fontSize:14, cursor:(!input.trim()||loading)?'not-allowed':'pointer' }}>
        <NavIcon name="send" size={16} color="#fff"/>
      </motion.button>
    </div>
  );

  if (docked) {
    return (
      <div className="aidc-dock">
        <style>{CSS}</style>
        <motion.button onClick={() => setOpen(o => !o)}
          whileTap={{ scale:.98 }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:8,
            padding:'6px 2px', border:'none', background:'transparent', cursor:'pointer' }}>
          <div style={{ width:24, height:24, borderRadius:7, flexShrink:0,
            background:`linear-gradient(135deg,${T},${T2})`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <NavIcon name="ai" size={13} color="#fff"/>
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:'rgba(15,23,42,.7)',
            fontFamily:FONT, flex:1, textAlign:'left' }}>
            AI Design Assistant
          </span>
          <NavIcon name={open ? 'chevronUp' : 'chevronDown'} size={14} color="rgba(15,23,42,.4)"/>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity:0, height:0 }}
              animate={{ opacity:1, height:'auto' }}
              exit={{ opacity:0, height:0 }}
              style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {thread}
              {inputRow}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      <motion.button
        className="aidc-fab"
        whileHover={{ scale:1.08, boxShadow:`0 8px 28px rgba(2,128,144,.5)` }}
        whileTap={{ scale:.94 }}
        onClick={() => setOpen(o => !o)}
        style={{
          width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
          background:`linear-gradient(135deg,${T},${T2})`,
          boxShadow:`0 4px 20px rgba(2,128,144,.4)`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
        <AnimatePresence mode="wait">
          <motion.span key={open ? 'close' : 'open'}
            initial={{ rotate:-90, opacity:0, scale:.6 }}
            animate={{ rotate:0, opacity:1, scale:1 }}
            exit={{ rotate:90, opacity:0, scale:.6 }}
            transition={{ duration:.18 }}>
            {open ? <NavIcon name="close" size={22} color="#fff"/> : <NavIcon name="ai" size={22} color="#fff"/>}
          </motion.span>
        </AnimatePresence>
        {!open && (
          <motion.span
            animate={{ scale:[1,1.3,1] }} transition={{ duration:2, repeat:Infinity }}
            style={{ position:'absolute', top:2, right:2, width:10, height:10,
              borderRadius:'50%', background:'#f59e0b',
              border:'2px solid #fff' }}/>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="aidc-backdrop"
            className="aidc-backdrop"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="aidc-panel"
            className="aidc-panel"
            initial={{ opacity:0, scale:.92, y:20, originX:1, originY:1 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:.92, y:20 }}
            transition={{ type:'spring', damping:22, stiffness:300 }}
            style={{
              borderRadius:20, overflow:'hidden',
              background:'#fff', border:'1px solid #e2e8f0',
              boxShadow:'0 24px 64px rgba(0,0,0,.18)',
              display:'flex', flexDirection:'column',
            }}>

            <div style={{ padding:'14px 18px', flexShrink:0,
              background:`linear-gradient(135deg,${T},${T2})` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10,
                  background:'rgba(255,255,255,.2)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <NavIcon name="ai" size={18} color="#fff"/>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0, fontFamily:FONT }}>
                    VFRB AI Assistant
                  </p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,.7)', margin:0, fontFamily:FONT }}>
                    Here to help with your design
                  </p>
                </div>
                <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%',
                  background:'#22c55e', boxShadow:'0 0 0 3px rgba(34,197,94,.3)' }}/>
              </div>
            </div>

            {thread}
            {inputRow}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
