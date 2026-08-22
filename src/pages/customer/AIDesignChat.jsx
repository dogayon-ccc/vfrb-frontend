// src/components/AIDesignChat.jsx
// NEW FEATURE — Month 5 Week 2
// AI Design Assistant Chat Widget — floatable on any customer page
//
// Uses Gemini Flash (Layer 2 extended) for garment design Q&A.
// Free tier: 15 RPM, 1500 req/day per key — more than enough for demo.
// Prompts are cached per session so repeated questions are free.
//
// Capabilities demonstrated to panel:
//   - AI answers garment design questions ("what color goes with navy scrubs?")
//   - AI suggests sizing for Philippine institutional garments
//   - AI explains VFRB production process in plain language
//   - Context-aware: knows VFRB makes scrub suits + school uniforms
//
// Uses POST /api/ai/describe-design (public route, no auth needed)
// For chat it calls a new endpoint: POST /api/ai/design-chat
// If that route doesn't exist yet, falls back to /api/ai/describe-design
// with the chat prompt wrapped as a design description request.
//
// Deploy: import AIDesignChat from '../../components/AIDesignChat'
//         Add <AIDesignChat/> near bottom of CustomerLayout before </div>

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence }      from 'framer-motion';
import axios                            from 'axios';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,sans-serif`;

const QUICK = [
  '🎨 What colors work for school uniforms?',
  '📐 How many yards of fabric for 50 polo shirts?',
  '🧵 What thread type for scrub suits?',
  '📏 Standard sizing for Philippine nurses?',
  '✂️ Difference between polo and mandarin collar?',
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

export default function AIDesignChat() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { role:'ai', text:"Hi! I'm VFRB's AI Design Assistant. Ask me anything about garment design, materials, sizing, or colors. 🎨" }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const cache  = useRef({});  // session prompt cache

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs, open]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    // Add user message
    setMsgs(m => [...m, { role:'user', text:q }]);
    setLoading(true);

    // Check session cache
    const cKey = q.toLowerCase().slice(0,80);
    if (cache.current[cKey]) {
      setMsgs(m => [...m, { role:'ai', text:cache.current[cKey] }]);
      setLoading(false);
      return;
    }

    try {
      // Build conversation history for context (last 6 messages)
      const history = msgs.slice(-6)
        .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const prompt = `${SYSTEM_CONTEXT}\n\nConversation:\n${history}\nCustomer: ${q}\nAssistant:`;

      // POST to describe-design (public route) with the full chat prompt
      const { data } = await axios.post('/api/ai/describe-design', {
        prompt: q,
        chat_context: prompt,
        mode: 'chat'
      });

      // The endpoint returns JSON config — extract text if available,
      // otherwise build a natural language answer from the config
      let answer = '';
      if (data?.chat_response) {
        answer = data.chat_response;
      } else if (data?.garmentType) {
        // Gemini returned design config — convert to natural language
        const colors = Object.values(data.colors ?? {})
          .filter((v,i,a) => a.indexOf(v) === i).join(', ');
        answer = `I'd suggest a ${data.garmentType?.replace(/-/g,' ')} with ${
          data.collarType} collar and ${data.sleeveType} sleeves. ${
          colors ? `Color scheme: ${colors}.` : ''} ${
          data.textContent ? `Text: "${data.textContent}".` : ''}`;
      } else {
        answer = "Great question! For VFRB Enterprise orders, our staff can give you the most accurate advice. Would you like me to help you configure a garment in Design Studio instead?";
      }

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

  return (
    <>
      {/* FAB trigger */}
      <motion.button
        whileHover={{ scale:1.08, boxShadow:`0 8px 28px rgba(2,128,144,.5)` }}
        whileTap={{ scale:.94 }}
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:90, right:20, width:52, height:52,
          borderRadius:'50%', border:'none', cursor:'pointer', zIndex:300,
          background:`linear-gradient(135deg,${T},${T2})`,
          boxShadow:`0 4px 20px rgba(2,128,144,.4)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22,
        }}>
        <AnimatePresence mode="wait">
          <motion.span key={open ? 'close' : 'open'}
            initial={{ rotate:-90, opacity:0, scale:.6 }}
            animate={{ rotate:0, opacity:1, scale:1 }}
            exit={{ rotate:90, opacity:0, scale:.6 }}
            transition={{ duration:.18 }}>
            {open ? '✕' : '🤖'}
          </motion.span>
        </AnimatePresence>
        {/* Unread dot */}
        {!open && (
          <motion.span
            animate={{ scale:[1,1.3,1] }} transition={{ duration:2, repeat:Infinity }}
            style={{ position:'absolute', top:2, right:2, width:10, height:10,
              borderRadius:'50%', background:'#f59e0b',
              border:'2px solid #fff' }}/>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, scale:.92, y:20, originX:1, originY:1 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:.92, y:20 }}
            transition={{ type:'spring', damping:22, stiffness:300 }}
            style={{
              position:'fixed', bottom:152, right:20, width:'min(360px,calc(100vw-32px))',
              height:440, zIndex:300, borderRadius:20, overflow:'hidden',
              background:'#fff', border:'1px solid #e2e8f0',
              boxShadow:'0 24px 64px rgba(0,0,0,.18)',
              display:'flex', flexDirection:'column',
            }}>

            {/* Header */}
            <div style={{ padding:'14px 18px', flexShrink:0,
              background:`linear-gradient(135deg,${T},${T2})` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10,
                  background:'rgba(255,255,255,.2)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  🤖
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0, fontFamily:FONT }}>
                    VFRB AI Assistant
                  </p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,.7)', margin:0, fontFamily:FONT }}>
                    Powered by Gemini Flash · Free tier
                  </p>
                </div>
                <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%',
                  background:'#22c55e', boxShadow:'0 0 0 3px rgba(34,197,94,.3)' }}/>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'14px 16px',
              display:'flex', flexDirection:'column', gap:10,
              scrollbarWidth:'thin', scrollbarColor:'#e2e8f0 transparent' }}>

              {/* Quick suggestions — only show when few messages */}
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
                      fontSize:12, marginRight:7, marginTop:2 }}>🤖</div>
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
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                    🤖
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

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid #e2e8f0',
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
                ➤
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
