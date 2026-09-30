// src/pages/client/MaterialsReveal.jsx
// Blocking post-submit AI-materials reveal, wired into OrderWizard.jsx.
// SCOPE-001: shows material_name, category, ai_note only — never estimated_range.
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { RecCard, AcceptModal, SelfPickModal, ConfettiBurst } from './AIMaterials';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const CSS = `
.mr{position:fixed;inset:0;z-index:300;overflow-y:auto;font-family:${FONT};color:var(--ink);
  background:radial-gradient(900px 420px at 85% -10%,rgba(2,195,154,.16),transparent 62%),radial-gradient(800px 420px at -5% 15%,rgba(2,128,144,.12),transparent 60%),radial-gradient(rgba(15,23,42,.06) 1px,transparent 1px) 0 0/22px 22px,#f8fafc}
.mr-wrap{max-width:960px;margin:0 auto;padding:24px 16px calc(120px + env(safe-area-inset-bottom,0px))}
.mr-steps{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:22px;font-size:11px;font-weight:700;color:var(--text-subtle)}
.mr-steps span{display:flex;align-items:center;gap:6px}
.mr-steps i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;background:var(--border);color:var(--text-subtle)}
.mr-steps .on i{background:var(--teal);color:#fff;box-shadow:0 0 0 4px var(--teal-50)}
.mr-steps .on{color:var(--teal)}
.mr-steps .done i{background:var(--teal);color:#fff}
.mr-steps hr{width:28px;border:0;height:2px;background:var(--border);margin:0}
.mr-head{text-align:center;margin-bottom:24px}
.mr-badge{width:64px;height:64px;margin:0 auto 14px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,var(--teal),var(--teal-2));box-shadow:0 14px 34px rgba(2,128,144,.32)}
.mr-title{font-size:clamp(20px,3vw,28px);font-weight:800;letter-spacing:-.015em;margin:0}
.mr-sub{font-size:13px;color:var(--text-muted);margin:8px auto 0;max-width:52ch;line-height:1.65}
.mr-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--teal-50);border:1px solid rgba(2,195,154,.25);font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:18px}
.mr-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.mr-load{display:grid;place-items:center;gap:12px;padding:56px 0;color:var(--text-subtle);font-size:13px}
.mr-spin{width:34px;height:34px;border:3px solid var(--teal);border-top-color:transparent;border-radius:50%;animation:mr-s .8s linear infinite}
.mr-err{display:flex;gap:8px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--danger-bg);border:1px solid var(--danger-border);color:#991b1b;font-size:13px;margin-bottom:18px}
.mr-bar{position:fixed;left:0;right:0;bottom:0;z-index:2;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--border)}
.mr-bar-in{max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.mr-btn{min-height:48px;padding:0 20px;border-radius:14px;font:700 14px/1 ${FONT};cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s,box-shadow .2s}
.mr-btn:focus-visible{outline:2.5px solid var(--teal);outline-offset:2px}
.mr-ok{border:0;color:#fff;background:linear-gradient(135deg,#22c55e,#16a34a);box-shadow:0 6px 18px rgba(22,163,74,.3)}
.mr-alt{border:1px solid var(--teal);color:var(--teal);background:#fff}
@keyframes mr-s{to{transform:rotate(360deg)}}
@media(min-width:768px){
  .mr-wrap{padding:40px 24px 120px}
  .mr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mr-bar-in{flex-direction:row-reverse;justify-content:flex-start}
  .mr-btn{min-width:260px}
}
@media(prefers-reduced-motion:reduce){.mr-spin{animation-duration:2s}.mr-btn{transition:none}}
`;

export default function MaterialsReveal({ order, onDone }) {
  const [recs, setRecs] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [genErr, setGenErr] = useState('');
  const [showAccept, setShowAccept] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await axios.post('/api/customer/ai/recommend-materials', { order_id: order.order_id });
        if (live) setRecs(data?.materials ?? []);
      } catch (e) {
        if (live) setGenErr(e.response?.data?.message ?? 'AI is unavailable right now — you can still pick materials yourself below.');
      } finally {
        if (live) setGenerating(false);
      }
    })();
    return () => { live = false; };
  }, [order.order_id]);

  const finish = () => {
    setShowAccept(false);
    setShowPicker(false);
    setResolved(true);
    setShowConf(true);
    setTimeout(onDone, 1400);
  };

  const actions = !resolved && !generating;
  return (
    <motion.div className="mr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <style>{CSS}</style>
      {showConf && <ConfettiBurst/>}

      <div className="mr-wrap">
        <div className="mr-steps" aria-label="Progress">
          <span className="done"><i><NavIcon name="success" size={12}/></i>Order placed</span><hr/>
          <span className="on"><i>2</i>Materials</span><hr/>
          <span><i>3</i>Done</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mr-head">
          <div className="mr-badge"><NavIcon name="ai" size={30} color="#fff"/></div>
          <h1 className="mr-title">Order #{order.order_id} submitted</h1>
          <p className="mr-sub">
            Review the raw materials our AI suggests for your {order.garment_type || 'order'}, or pick your own from VFRB's catalog.
          </p>
        </motion.div>

        <div className="mr-note">
          <NavIcon name="info" size={16} color="var(--teal)"/>
          <span>AI suggests material types only. VFRB staff decide exact quantities and pricing.</span>
        </div>

        {generating && (
          <div className="mr-load" role="status">
            <div className="mr-spin"/>
            Analyzing your order and matching materials...
          </div>
        )}

        {!generating && genErr && recs.length === 0 && (
          <div className="mr-err" role="alert"><NavIcon name="warning" size={16} color="#991b1b"/> {genErr}</div>
        )}

        {!generating && recs.length > 0 && (
          <div className="mr-grid">
            {recs.map((r, i) => <RecCard key={i} rec={r} index={i}/>)}
          </div>
        )}
      </div>

      {actions && (
        <div className="mr-bar">
          <div className="mr-bar-in">
            {recs.length > 0 && (
              <button onClick={() => setShowAccept(true)} className="mr-btn mr-ok">
                <NavIcon name="success" size={16} color="#fff"/> Accept &amp; notify staff
              </button>
            )}
            <button onClick={() => setShowPicker(true)} className="mr-btn mr-alt">
              <NavIcon name="materials" size={16} color="var(--teal)"/> Choose my own materials
            </button>
          </div>
        </div>
      )}

      {showAccept && <AcceptModal order={order} recs={recs} onClose={() => setShowAccept(false)} onDone={finish}/>}
      {showPicker && <SelfPickModal order={order} onClose={() => setShowPicker(false)} onDone={finish}/>}
    </motion.div>
  );
}
