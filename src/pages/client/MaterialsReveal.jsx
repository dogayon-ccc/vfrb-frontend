// src/pages/client/MaterialsReveal.jsx
// Blocking post-submit AI-materials reveal, wired into OrderWizard.jsx.
// SCOPE-001: shows material_name, category, ai_note only — never estimated_range.
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { CAT, RecCard, AcceptModal, SelfPickModal, ConfettiBurst } from './AIMaterials';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const CSS = `
.mr-wrap { max-width: 640px; margin: 0 auto; padding: 28px 16px 64px; }
.mr-head { text-align: center; margin-bottom: 22px; }
.mr-title { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }
.mr-sub { font-size: 12.5px; color: #64748b; margin-top: 6px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.6; }
.mr-btn { padding: 13px 18px; font-size: 13.5px; min-height: 44px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
@media (min-width: 768px) {
  .mr-wrap { padding: 48px 20px 80px; }
  .mr-title { font-size: 20px; }
  .mr-sub { font-size: 13px; }
  .mr-btn { padding: 14px 20px; font-size: 14px; }
}
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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#f8fafc', overflowY: 'auto', fontFamily: FONT }}
    >
      <style>{CSS}</style>
      {showConf && <ConfettiBurst/>}

      <div className="mr-wrap">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mr-head">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <NavIcon name="ai" size={32} color={T}/>
          </div>
          <h2 className="mr-title" style={{ fontFamily: FONT }}>Order #{order.order_id} submitted!</h2>
          <p className="mr-sub" style={{ fontFamily: FONT }}>
            Before production starts, review the raw materials our AI recommends for your {order.garment_type || 'order'} — or pick your own from VFRB's catalog.
          </p>
        </motion.div>

        {generating && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13, fontFamily: FONT }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <NavIcon name="loading" size={22} color="#64748b"/>
            </div>
            Analyzing your order and matching materials…
          </div>
        )}

        {!generating && genErr && recs.length === 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 20, color: '#991b1b', fontSize: 12.5, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
            <NavIcon name="warning" size={14} color="#991b1b"/> {genErr}
          </div>
        )}

        {!generating && recs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {recs.map((r, i) => <RecCard key={i} rec={r} index={i}/>)}
          </div>
        )}

        {!resolved && !generating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recs.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowAccept(true)} className="mr-btn"
                style={{ border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontFamily: FONT, boxShadow: '0 4px 14px rgba(34,197,94,.3)' }}
              >
                <NavIcon name="success" size={15} color="#fff"/> Accept These Materials &amp; Notify Staff
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowPicker(true)} className="mr-btn"
              style={{ border: `1px solid ${T}`, background: '#fff', color: T, fontFamily: FONT }}
            >
              <NavIcon name="materials" size={15} color={T}/> Choose My Own Materials Instead
            </motion.button>
          </div>
        )}
      </div>

      {showAccept && <AcceptModal order={order} recs={recs} onClose={() => setShowAccept(false)} onDone={finish}/>}
      {showPicker && <SelfPickModal order={order} onClose={() => setShowPicker(false)} onDone={finish}/>}
    </motion.div>
  );
}
