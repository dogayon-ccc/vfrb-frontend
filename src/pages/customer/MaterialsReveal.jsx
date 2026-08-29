// src/pages/customer/MaterialsReveal.jsx
// Blocking post-submit AI-materials reveal — wired into OrderWizard.jsx
// (Account 2 task, Aug 28 2026).
//
// LOCKED REQUIREMENTS (confirmed, unchanged from the original brief):
//   1. Blocking accept-or-choose-own-materials screen shown immediately
//      after order submit — not a dismissible toast, not optional.
//   2. No separate later-review page. This IS the review — resolved here,
//      once, right after the order is created.
//   3. Manual override ("choose my own materials") stays available in
//      this same screen, not a different flow or a different day.
//
// SCOPE-001 BOUNDARY (still the rule, unchanged): this screen shows
// material_name, category, and Gemini's plain-language ai_note only.
// It never reads or renders estimated_range or any quantity field.
// That field is real and still load-bearing server-side (inventory
// deduction in ProductionController::materialCheck/confirm) — it's a
// display rule for THIS screen, not a system-wide deletion of quantities.
//
// Reuses AIMaterials.jsx's own CAT / RecCard / AcceptModal / SelfPickModal
// / ConfettiBurst (now exported from that file) instead of duplicating
// ~400 lines of styled JSX — there is exactly one implementation of
// "what the customer sees" for a material recommendation or a self-pick
// flow, so AIMaterials.jsx (still reachable directly, e.g. for staff
// support links or a future admin preview) and this screen can never
// silently drift apart.
//
// API calls (verified against api.php, same contract AIMaterials.jsx uses):
//   POST /api/customer/ai/recommend-materials   — { order_id }  (auto-fired on mount)
//   POST /api/customer/orders/{id}/accept-materials   — { notes }   (via AcceptModal)
//   GET  /api/customer/materials-catalog                          (via SelfPickModal)
//   POST /api/customer/orders/{id}/select-materials — { material_ids, notes } (via SelfPickModal)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { CAT, RecCard, AcceptModal, SelfPickModal, ConfettiBurst } from './AIMaterials';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// order: the just-created order object — needs at minimum order_id,
// garment_type, quantity_ordered (all present in the POST /api/customer/orders
// response's .order, which is what OrderWizard.jsx passes in).
// onDone: called once the customer has either accepted the AI recommendation
// or submitted their own material picks — OrderWizard.jsx uses this to
// finally navigate to the order detail page.
export default function MaterialsReveal({ order, onDone }) {
  const [recs,       setRecs]       = useState([]);
  const [generating, setGenerating] = useState(true);
  const [genErr,     setGenErr]     = useState('');
  const [showAccept, setShowAccept] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [resolved,   setResolved]   = useState(false);

  // Auto-fire the AI recommendation as soon as this screen mounts — the
  // customer already asked for this by submitting the order; no separate
  // "Generate" button needed here (unlike AIMaterials.jsx's standalone
  // page, which supports re-generating for an older order and so keeps
  // that button).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await axios.post('/api/customer/ai/recommend-materials', {
          order_id: order.order_id,
        });
        // BUG FIX (Aug 29 2026): AIController::recommendMaterials() returns
        // { recommendation, materials } — this was reading data.recommendations
        // (doesn't exist), so setRecs() always got []. Confirmed by reading
        // the actual controller response shape, not assumed. Verified by
        // Account 4's independent trace in this same thread, never applied.
        if (live) setRecs(data?.materials ?? []);
      } catch (e) {
        if (live) {
          setGenErr(
            e.response?.data?.message
              ?? 'AI is unavailable right now — you can still pick materials yourself below.'
          );
        }
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
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: '#f8fafc',
        overflowY: 'auto', fontFamily: FONT,
      }}
    >
      {showConf && <ConfettiBurst/>}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px 80px' }}>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 28 }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: FONT }}>
            Order #{order.order_id} submitted!
          </h2>
          <p style={{
            fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 440,
            marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6, fontFamily: FONT,
          }}>
            Before production starts, review the raw materials our AI recommends
            for your {order.garment_type || 'order'} — or pick your own from VFRB's catalog.
          </p>
        </motion.div>

        {generating && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13, fontFamily: FONT }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            Analyzing your order and matching materials…
          </div>
        )}

        {!generating && genErr && recs.length === 0 && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
            padding: '14px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13, fontFamily: FONT,
          }}>
            ⚠️ {genErr}
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
                onClick={() => setShowAccept(true)}
                style={{
                  padding: '14px 20px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                  boxShadow: '0 4px 14px rgba(34,197,94,.3)',
                }}
              >
                ✓ Accept These Materials &amp; Notify Staff
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowPicker(true)}
              style={{
                padding: '14px 20px', borderRadius: 12, border: `1px solid ${T}`,
                background: '#fff', color: T, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              🧵 Choose My Own Materials Instead
            </motion.button>
          </div>
        )}
      </div>

      {showAccept && (
        <AcceptModal
          order={order} recs={recs}
          onClose={() => setShowAccept(false)}
          onDone={finish}
        />
      )}
      {showPicker && (
        <SelfPickModal
          order={order}
          onClose={() => setShowPicker(false)}
          onDone={finish}
        />
      )}
    </motion.div>
  );
}
