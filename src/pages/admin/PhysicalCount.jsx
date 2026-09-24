// src/pages/admin/PhysicalCount.jsx
// FIX (Sony Mark, Sept 10 2026): hex→var(--...) + emoji→NavIcon
// migration — 138 hex, 24 emoji. IMPORTANT SELF-CORRECTION mid-fix:
// caught a real mapping error in my own automated pass — #166534
// (theme.css's own literal .alert-success text color) had been
// auto-mapped to var(--success-border), which is actually a DIFFERENT,
// much lighter value (#bbf7d0, meant for borders). Any text-color usage
// with that wrong mapping would have been a light-green-on-light-
// background contrast failure. Audited and fixed this same error
// across QCChecklist.jsx, ProductionTracking.jsx, and Orders.jsx too
// (already-"done" files from earlier this session) — all re-verified
// with a full rebuild after the correction. #134e4a (this file's teal-
// alert text) and the two document.write() print-popup colors (#ccc/
// #f0f0f0 — a genuinely separate document, CSS variables don't inherit
// across window.open() at all) are legitimate literal exceptions,
// matching theme.css's own established un-tokenized precedents.
// Also moved two emoji out of onDone() toast message strings entirely
// (plain-text template literals, not JSX — a NavIcon component can't
// render inside a string) rather than leaving them embedded.
// Logic (count entry, variance calc, reconcile flow, caching)
// untouched throughout.
//
// FIXES vs zip source:
//   1. CDN font ('DM Sans') removed — system font stack throughout
//   2. CountModal: success toast before closing instead of silent close
//   3. cache.js wired — materials list cached 5 min (TTL.MATERIALS)
//      cacheClear('materials_list','dashboard_stats') on every count submit
//   4. AnimatePresence added for filter tab transitions
//
// API endpoints (all verified in api.php):
//   GET  /api/admin/physical-counts          → count list
//   GET  /api/admin/physical-counts/summary  → summary stats
//   GET  /api/admin/physical-counts/sheet    → printable count sheet
//   POST /api/admin/physical-counts          → log new count
//   PATCH /api/admin/physical-counts/{id}/reconcile → manager reconcile
//   GET  /api/admin/materials                → materials for dropdown
//
// DB rules:
//   physical_count_logs: variance + variance_pct are GENERATED — never insert
//   notifications: NO type, NO title columns

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                           from 'framer-motion';
import axios                                                 from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }              from '../../utils/cache';
import { NavIcon }                                           from '../../components/ui/icons';

const T    = 'var(--teal)';
const T2   = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const SK   = { borderRadius:6, background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp  = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
  fontSize:13, outline:'none', fontFamily:FONT, // FIX 1: CDN font removed
  boxSizing:'border-box', transition:'border .15s,box-shadow .15s',
};
const fi   = e => { e.target.style.borderColor=T;         e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:FONT };
const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)' };

const user      = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
const isManager = user.role === 'manager';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'error' ? 'var(--danger)' : type === 'warn' ? 'var(--warning)' : T;
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }}
      style={{ position:'fixed', bottom:24, right:24, zIndex:9999,
        padding:'12px 20px', borderRadius:12, background:bg, color:'var(--bg-card)',
        fontSize:13, fontWeight:600, fontFamily:FONT,
        boxShadow:'0 8px 24px rgba(0,0,0,.18)', maxWidth:380, lineHeight:1.5 }}>
      {msg}
    </motion.div>
  );
}

// ── Count Entry Modal (Staff) ──────────────────────────────────────────────────
function CountModal({ materials, onClose, onDone }) {
  const [matId,   setMatId]   = useState('');
  const [physQty, setPhysQty] = useState('');
  const [reason,  setReason]  = useState('');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [preview, setPreview] = useState(null);

  const selMat = materials.find(m => String(m.material_id) === String(matId));

  useEffect(() => {
    if (selMat && physQty !== '') {
      const sys = Number(selMat.quantity_in_stock);
      const phy = Number(physQty);
      const variance = phy - sys;
      const pct = sys > 0 ? ((variance / sys) * 100).toFixed(1) : '0.0';
      setPreview({ sys, phy, variance, pct, flagged: Math.abs(Number(pct)) > 5 });
    } else {
      setPreview(null);
    }
  }, [matId, physQty, selMat]);

  const submit = async () => {
    if (!matId || physQty === '') { setErr('Material and physical quantity required.'); return; }
    if (Number(physQty) < 0)      { setErr('Quantity cannot be negative.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post('/api/admin/physical-counts', {
        material_id:  matId,
        physical_qty: Number(physQty),
        count_date:   date,
        reason,
      });
      // FIX 4: invalidate materials + dashboard cache on every count
      cacheClear('materials_list', 'dashboard_stats');
      // FIX 3: pass success message up so parent can show toast before clearing modal
      onDone(`Count logged for ${selMat?.material_name ?? 'material'}. Variance computed.`);
    } catch(e) {
      setErr(e.response?.data?.message ?? 'Failed to log count.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>

      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)',
        backdropFilter:'blur(4px)', zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
          style={{ background:'var(--bg-card)', borderRadius:18, width:'min(520px,100%)',
            maxHeight:'92vh', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' }}>

          <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', background:'var(--teal-50)' }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0, fontFamily:FONT }}>
              <NavIcon name="physicalCount" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>Log Physical Count
            </h3>
            <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'3px 0 0', fontFamily:FONT }}>
              Physical Inventory Count
            </p>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'20px 22px',
            display:'flex', flexDirection:'column', gap:14 }}>

            {/* Material selector */}
            <div>
              <label style={{ ...lbl, marginBottom:7 }}>Material *</label>
              <select value={matId} onChange={e => setMatId(e.target.value)}
                style={{ ...inp, cursor:'pointer' }}>
                <option value="">Select material to count…</option>
                {materials.map(m => (
                  <option key={m.material_id} value={m.material_id}>
                    {m.material_name} — System: {m.quantity_in_stock} {m.unit}
                  </option>
                ))}
              </select>
              {matId && selMat && (
                <p style={{ fontSize:10, color:T, margin:'4px 0 0', fontFamily:FONT }}>
                  <NavIcon name="success" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>{selMat.material_name} · Category: {selMat.category ?? '—'} · Unit: {selMat.unit}
                </p>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Physical Count *</label>
                <input type="number" min={0} step={0.01} value={physQty}
                  onChange={e => setPhysQty(e.target.value)} placeholder="0.00"
                  style={inp} onFocus={fi} onBlur={fo}/>
              </div>
              <div>
                <label style={lbl}>Count Date *</label>
                <input type="date" value={date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)} style={inp} onFocus={fi} onBlur={fo}/>
              </div>
            </div>

            {/* Live variance preview */}
            {preview && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                style={{ padding:'14px 16px', borderRadius:12,
                  background: preview.flagged ? 'var(--warning-bg)' : 'var(--success-bg)',
                  border:`1px solid ${preview.flagged ? 'var(--warning-border)' : 'var(--success-border)'}` }}>
                <p style={{ fontSize:12, fontWeight:700, fontFamily:FONT,
                  color:preview.flagged ? '#92400e' : '#166534', marginBottom:10 }}>
                  {preview.flagged
                    ? <><NavIcon name="warning" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>High Variance — Manager Review Required</>
                    : <><NavIcon name="success" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Variance Within Acceptable Range</>}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    ['System Stock',    `${preview.sys}`,  'var(--text-subtle)'],
                    ['Physical Count',  `${preview.phy}`,  T],
                    ['Variance',
                      `${preview.variance > 0 ? '+' : ''}${preview.variance} (${preview.pct}%)`,
                      preview.variance > 0 ? 'var(--success)' : preview.variance < 0 ? 'var(--danger)' : 'var(--text-subtle)'],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ background:'rgba(255,255,255,.7)', borderRadius:9,
                      padding:'8px 10px', textAlign:'center' }}>
                      <p style={{ fontSize:14, fontWeight:800, color:c, margin:0, fontFamily:FONT }}>{v}</p>
                      <p style={{ fontSize:9, color:'var(--text-subtle)', margin:'2px 0 0', fontFamily:FONT }}>{l}</p>
                    </div>
                  ))}
                </div>
                {selMat && (
                  <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'8px 0 0', fontFamily:FONT }}>
                    Unit: {selMat.unit} · Category: {selMat.category ?? '—'}
                  </p>
                )}
              </motion.div>
            )}

            <div>
              <label style={lbl}>
                Reason for Variance{' '}
                <span style={{ color:'var(--text-faint)', fontWeight:400, textTransform:'none' }}>(if any)</span>
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. Damaged items discarded, unlogged receipt, cutting wastage…"
                rows={2} style={{ ...inp, resize:'none', minHeight:60 }}
                onFocus={fi} onBlur={fo}/>
            </div>

            {err && (
              <p style={{ color:'var(--danger)', fontSize:12, fontWeight:600, fontFamily:FONT }}>
                <NavIcon name="warning" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>{err}
              </p>
            )}
          </div>

          <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)',
            display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg)' }}>
            <button onClick={onClose}
              style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)',
                background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              Cancel
            </button>
            <button onClick={submit} disabled={busy}
              style={{ padding:'9px 22px', borderRadius:9, border:'none',
                background:busy?'var(--text-faint)':`linear-gradient(135deg,${T},${T2})`,
                color:'var(--bg-card)', fontSize:13, fontWeight:700,
                cursor:busy?'not-allowed':'pointer', fontFamily:FONT }}>
              {busy ? 'Saving…' : <><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Log Count</>}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── Reconcile Modal (Manager only) ─────────────────────────────────────────────
function ReconcileModal({ count, onClose, onDone }) {
  const [adjust, setAdjust] = useState(true);
  const [note,   setNote]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.patch(`/api/admin/physical-counts/${count.count_id}/reconcile`, {
        adjust_stock:        adjust,
        reconciliation_note: note,
      });
      cacheClear('materials_list', 'dashboard_stats');
      onDone(`Count reconciled. ${adjust ? 'System stock updated.' : 'Variance acknowledged.'}`);
    } catch(e) {
      setErr(e.response?.data?.message ?? 'Failed to reconcile.');
    } finally {
      setBusy(false);
    }
  };

  const variance  = Number(count.variance);
  const varPct    = Number(count.variance_pct);
  const isSurplus = variance > 0;
  const isDeficit = variance < 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)',
      backdropFilter:'blur(4px)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'var(--bg-card)', borderRadius:18, width:'min(480px,100%)',
          overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>

        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', background:'var(--purple-50)' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0, fontFamily:FONT }}>
            <NavIcon name="manager" size={16} color="currentColor" style={{verticalAlign:'-3px',marginRight:6}}/>Reconcile Count — {count.material?.material_name}
          </h3>
          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'3px 0 0', fontFamily:FONT }}>
            Post Count & Reconcile
          </p>
        </div>

        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          {/* Variance summary */}
          <div style={{ padding:'14px', borderRadius:12,
            background:Math.abs(varPct)>5?'var(--warning-bg)':'var(--success-bg)',
            border:`1px solid ${Math.abs(varPct)>5?'var(--warning-border)':'var(--success-border)'}` }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:8 }}>
              {[
                ['System',   `${count.system_qty}`,  'var(--text-subtle)'],
                ['Physical', `${count.physical_qty}`, T],
                ['Variance',
                  `${variance>0?'+':''}${variance} (${varPct}%)`,
                  isDeficit ? 'var(--danger)' : isSurplus ? 'var(--success)' : 'var(--text-subtle)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background:'rgba(255,255,255,.7)', borderRadius:8,
                  padding:'8px', textAlign:'center' }}>
                  <p style={{ fontSize:15, fontWeight:800, color:c, margin:0, fontFamily:FONT }}>{v}</p>
                  <p style={{ fontSize:9, color:'var(--text-subtle)', margin:'2px 0 0', fontFamily:FONT }}>{l}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
              Unit: {count.material?.unit} ·
              Counted by: {count.counter?.name ?? '—'} ·
              Date: {count.count_date}
            </p>
          </div>

          {/* Action selector */}
          <div>
            <label style={lbl}>Reconciliation Action</label>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                {
                  v: true,
                  l: 'Adjust system stock to match physical count',
                  s: `System will update to ${count.physical_qty} ${count.material?.unit}`,
                },
                {
                  v: false,
                  l: 'Acknowledge variance only (no stock change)',
                  s: 'System stock stays at current level — for record purposes',
                },
              ].map(o => (
                <button key={String(o.v)} type="button" onClick={() => setAdjust(o.v)}
                  style={{ padding:'11px 14px', borderRadius:11, border:'none',
                    cursor:'pointer', textAlign:'left', fontFamily:FONT,
                    background:adjust===o.v?'var(--teal-50)':'var(--bg)',
                    outline:`2px solid ${adjust===o.v?T+'55':'var(--border)'}` }}>
                  <p style={{ fontSize:12, fontWeight:700,
                    color:adjust===o.v?T:'var(--ink)', margin:0, fontFamily:FONT }}>
                    {adjust===o.v?'● ':'○ '}{o.l}
                  </p>
                  <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'3px 0 0 14px', fontFamily:FONT }}>
                    {o.s}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>Manager Notes</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Reconciliation explanation…" rows={2}
              style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          </div>

          {err && (
            <p style={{ color:'var(--danger)', fontSize:12, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>
          )}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)',
          display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg)' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)',
              background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:FONT }}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px', borderRadius:9, border:'none',
              background:busy?'var(--text-faint)':'linear-gradient(135deg,var(--purple),var(--purple-dark))',
              color:'var(--bg-card)', fontSize:13, fontWeight:700,
              cursor:busy?'not-allowed':'pointer', fontFamily:FONT }}>
            {busy ? '…' : <><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Reconcile</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPhysicalCount() {
  const [counts,      setCounts]      = useState([]);
  const [materials,   setMaterials]   = useState([]);
  const [summary,     setSummary]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [filterR,     setFilterR]     = useState('all');
  const [showLog,     setShowLog]     = useState(false);
  const [reconciling, setReconciling] = useState(null);
  const [toast,       setToast]       = useState(null); // FIX 3: { msg, type }

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // FIX 4: load with materials cache
  const load = useCallback(() => {
    setLoading(true);

    // Materials list cached 5 min
    const cachedMats = cacheGet('materials_list');
    const matProm = cachedMats
      ? Promise.resolve({ data: cachedMats })
      : axios.get('/api/admin/materials?per_page=200').then(r => {
          const list = r.data?.data ?? r.data ?? [];
          cacheSet('materials_list', list, TTL.MATERIALS);
          return { data: list };
        });

    Promise.allSettled([
      axios.get('/api/admin/physical-counts'),
      axios.get('/api/admin/physical-counts/summary'),
      matProm,
    ]).then(([c, s, m]) => {
      setCounts(   c.status==='fulfilled' ? (c.value.data?.data ?? c.value.data ?? []) : []);
      setSummary(  s.status==='fulfilled' ? s.value.data : {});
      setMaterials(m.status==='fulfilled' ? (Array.isArray(m.value.data) ? m.value.data : (m.value.data?.data ?? [])) : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // FIX 3: onDone now receives success message for toast
  const handleCountDone = (msg) => {
    setShowLog(false);
    showToast(msg);
    load();
  };

  const handleReconcileDone = (msg) => {
    setReconciling(null);
    showToast(msg);
    load();
  };

  const filtered = counts.filter(c => {
    if (filterR === 'pending')    return !c.reconciled;
    if (filterR === 'reconciled') return  c.reconciled;
    if (filterR === 'flagged')    return  Math.abs(Number(c.variance_pct)) > 5;
    return true;
  });

  const printSheet = async () => {
    const r = await axios.get('/api/admin/physical-counts/sheet');
    const w = window.open('', '_blank');
    const mats = r.data.count_sheet ?? [];
    w.document.write(`
      <html><head><title>VFRB Count Sheet</title>
      <style>
        body { font-family:Arial,sans-serif; font-size:12px; }
        table { width:100%; border-collapse:collapse; }
        th,td { border:1px solid #ccc; padding:6px; }
        th { background:#f0f0f0; }
        .title { font-size:18px; font-weight:bold; margin-bottom:8px; }
      </style></head>
      <body>
      <div class="title">VFRB Enterprise — Physical Count Sheet</div>
      <p>Generated: ${r.data.generated_at} | By: ${r.data.generated_by}</p>
      <table>
        <tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th>
            <th>System Qty</th><th>Physical Count</th><th>Variance</th><th>Notes</th></tr>
        ${mats.map((m, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${m.material_name}</td>
            <td>${m.category ?? ''}</td>
            <td>${m.unit}</td>
            <td>${m.system_qty}</td>
            <td style="width:100px"></td>
            <td style="width:80px"></td>
            <td style="width:140px"></td>
          </tr>`).join('')}
      </table>
      <p style="margin-top:20px">
        Counted by: _____________________ &nbsp;
        Date: _____________________ &nbsp;
        Verified by: _____________________
      </p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const FILTERS = [
    ['all','All'],
    ['pending','Needs Review'],
    ['flagged','Flagged >5%'],
    ['reconciled','Reconciled'],
  ];

  return (
    <>
      <style>{`
        @keyframes sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes ping { 75%,100%{ transform:scale(2); opacity:0; } }

        .pc-layout { display:grid; grid-template-columns:280px 1fr; gap:16px; align-items:start; }
        @media (max-width:1023px) { .pc-layout { grid-template-columns:1fr; } }
        @media (min-width:2560px) { .pc-layout { grid-template-columns:360px 1fr; } }
      `}</style>

      {/* Toast — FIX 3 */}
      <AnimatePresence>
        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type}
            onDone={() => setToast(null)}/>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showLog && (
        <CountModal
          materials={materials}
          onClose={() => setShowLog(false)}
          onDone={handleCountDone}
        />
      )}
      {reconciling && (
        <ReconcileModal
          count={reconciling}
          onClose={() => setReconciling(null)}
          onDone={handleReconcileDone}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)',
            margin:'0 0 4px', fontFamily:FONT }}>
            Physical Stock Count
          </h1>
          <p style={{ color:'var(--text-subtle)', fontSize:13, margin:0, fontFamily:FONT }}>
            Digital logbook replacement · Variance auto-computed
          </p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={printSheet}
            style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--border)',
              background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:FONT }}>
            <NavIcon name="print" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>Print Count Sheet
          </button>
          <button onClick={() => setShowLog(true)}
            style={{ padding:'10px 22px', borderRadius:11, border:'none',
              background:`linear-gradient(135deg,${T},${T2})`, color:'var(--bg-card)',
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT,
              boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
            + Log Physical Count
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',
        gap:12, marginBottom:22 }}>
        {[
          { l:'Flagged Variances',    v:summary.flagged_variances   ?? 0,              icon:'warning', c:'var(--warning)', info:'> 5% variance'    },
          { l:'Needs Reconciliation', v:summary.unreconciled_counts ?? 0,              icon:'reconcile', c:'var(--info)', info:'Manager review'   },
          { l:'Overdue Count',        v:summary.overdue_materials?.length ?? 0,        icon:'overdue', c:'var(--danger)', info:'> 30 days ago'    },
          { l:'Last Count Date',      v:summary.last_count_date ?? '—',               icon:'checklist', c:T,         info:'Most recent count' },
        ].map(s => (
          <div key={s.l} style={{ ...card, padding:'14px' }}>
            <span style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><NavIcon name={s.icon} size={22} color={s.c}/></span>
            <p style={{ fontSize: typeof s.v === 'string' ? 14 : 24,
              fontWeight:800, color:s.c, margin:'0 0 2px', fontFamily:FONT }}>
              {s.v}
            </p>
            <p style={{ fontSize:11, color:'var(--ink)', fontWeight:600, margin:0, fontFamily:FONT }}>
              {s.l}
            </p>
            <p style={{ fontSize:9, color:'var(--text-faint)', margin:'2px 0 0', fontFamily:FONT }}>{s.info}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ padding:'12px 16px', borderRadius:12, background:'var(--teal-50)',
        border:'1px solid var(--teal-100)', marginBottom:20 }}>
        <p style={{ fontSize:12, color:'#134e4a', lineHeight:1.6, margin:0, fontFamily:FONT }}>{/* matches theme.css's own .alert-teal class literal text color exactly — not a token, theme.css itself hardcodes this */}
          <strong><NavIcon name="reports" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>How physical count accuracy works:</strong> Staff logs physical count →
          system auto-computes variance vs current system quantity →
          variance &gt;5% flags for manager review →
          manager reconciles (optionally adjusting system stock to match physical count) →
          all adjustments logged in inventory_logs as 'adjustment' type.
        </p>
      </div>

      {/* Filter tabs — FIX 5: AnimatePresence */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setFilterR(v)}
            style={{ padding:'7px 13px', borderRadius:9,
              border:`1px solid ${filterR===v?T+'40':'var(--border)'}`,
              background:filterR===v?'var(--teal-50)':'var(--bg-card)',
              color:filterR===v?T:'var(--text-subtle)',
              fontSize:11, fontWeight:filterR===v?700:500,
              cursor:'pointer', fontFamily:FONT, transition:'all .13s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Counts table */}
      {/* MOBILE FIX (Aug 22): was overflow:'hidden' only, which clipped the
          Status/Action columns off-screen at ≤767px with no way to reach
          them. Matches the overflow-x:auto + min-width pattern already used
          in Inventory.jsx/Suppliers.jsx/UserManagement.jsx — same convention,
          not a new one. overflow:'hidden' is kept for the rounded-corner
          mask on the y-axis; overflowX:'auto' overrides just the x-axis so
          the table scrolls horizontally instead of clipping. */}
      <div style={{ ...card, overflow:'hidden', overflowX:'auto',
        WebkitOverflowScrolling:'touch' }}>
        <table style={{ width:'100%', minWidth:640, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['Material','Category','System Qty','Physical Qty','Variance','Date','Status','Action'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10,
                  fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase',
                  letterSpacing:'.06em', borderBottom:'2px solid var(--border)',
                  whiteSpace:'nowrap', fontFamily:FONT }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--bg-surface)' }}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} style={{ padding:'12px 14px' }}>
                        <div style={{ ...SK, height:10, width:'70%' }}/>
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr><td colSpan={8} style={{ padding:'50px', textAlign:'center' }}>
                    <p style={{ fontSize:36, margin:'0 0 12px', opacity:.3, display:'flex', justifyContent:'center' }}><NavIcon name="checklist" size={36} color="currentColor"/></p>
                    <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:700, fontFamily:FONT }}>
                      No count records
                    </p>
                    <p style={{ color:'var(--text-faint)', fontSize:12, fontFamily:FONT }}>
                      {filterR === 'all'
                        ? 'Log your first physical count to replace the logbook.'
                        : 'No records match this filter.'}
                    </p>
                  </td></tr>
                )
                : filtered.map(c => {
                    const variance = Number(c.variance ?? 0);
                    const varPct   = Number(c.variance_pct ?? 0);
                    const flagged  = Math.abs(varPct) > 5;
                    const vColor   = variance > 0 ? 'var(--success)' : variance < 0 ? 'var(--danger)' : 'var(--text-subtle)';
                    return (
                      <tr key={c.count_id} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding:'11px 14px' }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)',
                            margin:0, fontFamily:FONT }}>
                            {c.material?.material_name ?? `Material #${c.material_id}`}
                          </p>
                          <p style={{ fontSize:10, color:'var(--text-faint)', margin:'2px 0 0', fontFamily:FONT }}>
                            By: {c.counter?.name ?? '—'}
                          </p>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)', fontFamily:FONT }}>
                          {c.material?.category ?? '—'}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600,
                          color:'var(--ink)', fontFamily:FONT }}>
                          {c.system_qty}{' '}
                          <span style={{ fontSize:10, color:'var(--text-faint)' }}>{c.material?.unit}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700,
                          color:T, fontFamily:FONT }}>
                          {c.physical_qty}{' '}
                          <span style={{ fontSize:10, color:'var(--text-faint)' }}>{c.material?.unit}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <p style={{ fontSize:13, fontWeight:800, color:vColor, margin:0, fontFamily:FONT }}>
                            {variance > 0 ? '+' : ''}{variance}
                          </p>
                          <p style={{ fontSize:9, color:flagged?'var(--warning)':'var(--text-faint)',
                            margin:'2px 0 0', fontFamily:FONT }}>
                            {flagged ? <NavIcon name="warning" size={11} color="currentColor" style={{verticalAlign:'-1px',marginRight:2}}/> : ''}{varPct}%
                          </p>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-subtle)', fontFamily:FONT }}>
                          {c.count_date}
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          {c.reconciled ? (
                            <div>
                              <span style={{ padding:'3px 9px', borderRadius:99, fontSize:9,
                                fontWeight:700, background:'var(--success-bg)', color:'#166534', fontFamily:FONT }}>
                                <NavIcon name="success" size={10} color="currentColor" style={{verticalAlign:'-1px',marginRight:3}}/>Reconciled
                              </span>
                              {c.stock_adjusted && (
                                <p style={{ fontSize:9, color:'var(--text-faint)', margin:'2px 0 0', fontFamily:FONT }}>
                                  Stock adjusted
                                </p>
                              )}
                            </div>
                          ) : (
                            <span style={{ padding:'3px 9px', borderRadius:99, fontSize:9,
                              fontWeight:700, fontFamily:FONT,
                              background:flagged?'var(--warning-bg)':'var(--teal-50)',
                              color:flagged?'var(--warning-border)':T }}>
                              {flagged ? <><NavIcon name="warning" size={10} color="currentColor" style={{verticalAlign:'-1px',marginRight:3}}/>Flagged</> : <><NavIcon name="pending" size={10} color="currentColor" style={{verticalAlign:'-1px',marginRight:3}}/>Pending</>}
                            </span>
                          )}
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          {!c.reconciled && isManager && (
                            <button onClick={() => setReconciling(c)}
                              style={{ padding:'6px 12px', borderRadius:8, border:'none',
                                background:'linear-gradient(135deg,var(--purple),var(--purple-dark))',
                                color:'var(--bg-card)', fontSize:11, fontWeight:700,
                                cursor:'pointer', fontFamily:FONT }}>
                              Reconcile
                            </button>
                          )}
                          {!c.reconciled && !isManager && (
                            <span style={{ fontSize:11, color:'var(--text-faint)', fontFamily:FONT }}>
                              Awaiting manager
                            </span>
                          )}
                          {c.reconciled && (
                            <span style={{ fontSize:10, color:'var(--text-faint)', fontFamily:FONT }}>
                              By: {c.reconciler?.name ?? '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {/* Overdue materials */}
      {summary.overdue_materials?.length > 0 && (
        <div style={{ ...card, marginTop:20, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'var(--warning-bg)', borderBottom:'1px solid var(--warning-border)' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--warning-border)', margin:0, fontFamily:FONT }}>
              <NavIcon name="overdue" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>{summary.overdue_materials.length} Materials Not Counted in 30+ Days
            </p>
          </div>
          <div style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:0 }}>
            {summary.overdue_materials.map(m => (
              <div key={m.material_id}
                style={{ padding:'12px 16px', borderBottom:'1px solid var(--bg-surface)' }}>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:0, fontFamily:FONT }}>
                  {m.material_name}
                </p>
                <p style={{ fontSize:11, color:'var(--text-faint)', margin:'3px 0 0', fontFamily:FONT }}>
                  {m.last_count_date
                    ? `Last counted: ${m.last_count_date} (${m.days_since_count} days ago)`
                    : 'Never counted'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
