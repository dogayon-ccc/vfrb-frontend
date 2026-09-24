// src/pages/admin/DailyOutputLog.jsx
// Replaces handwritten sulat — staff logs pieces per size per day per stage
//
// RESHAPED (Sept 8 2026): hex -> theme.css tokens, emoji -> NavIcon.
// Checked which of the 4 injected CSS classes are actually applied
// before touching any of them (learned from UserManagement.jsx/
// DeliveryTracking.jsx's fully-dead blocks) -- this file is a MIXED
// case, not all-dead or all-live: .adm-log-grid and .adm-table-wrap
// are genuinely used (New Output Entry's two-column layout, the
// History tab's table wrapper). .adm-stats and .adm-filter are
// defined and never applied anywhere -- this page has no KPI-stats
// section or filter bar at all. Kept the 2 real ones, tokenized;
// dropped the 2 dead ones rather than leave unused CSS sitting in
// the file.
//
// 🔴/🟡 defect/alteration indicators -> NavIcon 'warning' at
// --danger/--warning respectively, matching the same severity-color
// convention Badge already uses elsewhere, without forcing these
// tight inline table-cell pills into Badge itself (same "don't force
// dense inline elements into a fixed-size shared component" call
// already made for the "YOU" tag in UserManagement.jsx).
//
// The material-actuals gate (empty-string-vs-explicit-0 distinction,
// materials_blocked handling, the whole submit() payload logic) is
// real, load-bearing, interview-grounded business logic -- completely
// untouched.

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui';

const SK  = { borderRadius:'var(--r-sm)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'dol-shimmer 1.4s infinite' };
const inp = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box', transition:'border .15s,box-shadow .15s' };
const fi  = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:'var(--font)' };
const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', boxShadow:'var(--shadow-xs)' };

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];
const SIZES  = ['xs','s','m','l','xl','xxl','xxxl','custom'];
const SIZE_LABELS = { xs:'XS', s:'S', m:'M', l:'L', xl:'XL', xxl:'2XL', xxxl:'3XL', custom:'Custom' };

const emptyForm = () => ({
  order_id:'', stage:'cutting', log_date: new Date().toISOString().split('T')[0],
  qty_xs:0, qty_s:0, qty_m:0, qty_l:0, qty_xl:0, qty_xxl:0, qty_xxxl:0, qty_custom:0,
  defect_count:0, alteration_count:0, defect_notes:'', notes:'',
});

export default function AdminDailyOutputLog() {
  const [orders,  setOrders]  = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [summary, setSummary] = useState(null);
  const [form,    setForm]    = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState('');
  const [tab,     setTab]     = useState('log'); // log | history

  // ── Material actuals — Aug 29 2026 (Account 2, Step 3) ────────────────────
  // No formula/BOM exists in this system: Gemini recommends material TYPES
  // only, and the ONE place a real quantity now enters the system is here —
  // staff typing what was actually used, only relevant when logging the
  // Pattern stage (the only stage ProductionStageService::logOutput() gates
  // on material_actuals). orderMaterials = this order's accepted+linked
  // material_recommendations rows, sourced from the SAME admin order-detail
  // endpoint ProductionTracking.jsx already uses (GET /api/admin/orders/{id}
  // → order.recommendations) — no new backend endpoint needed.
  // materialQty is kept as strings, not numbers: an empty string means
  // "staff hasn't entered anything yet" (omitted from the submit payload,
  // so the backend's gate correctly treats it as missing), which is a real,
  // distinguishable state from an explicit "0" (confirmed, none used).
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [materialQty,    setMaterialQty]    = useState({});

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Load orders + today's logs
  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      axios.get('/api/admin/orders?status=pattern,segregation,cutting,sewing,qc,pressing,packing'),
      axios.get(`/api/admin/output-logs?date=${new Date().toISOString().split('T')[0]}`),
    ]).then(([o, l]) => {
      setOrders(o.status==='fulfilled' ? (o.value.data?.data ?? o.value.data ?? []) : []);
      setLogs(l.status==='fulfilled'   ? (l.value.data?.data ?? l.value.data ?? []) : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load order summary when order selected
  useEffect(() => {
    if (!form.order_id) { setSummary(null); return; }
    axios.get(`/api/admin/output-logs/summary/${form.order_id}`)
      .then(r => setSummary(r.data))
      .catch(() => setSummary(null));
  }, [form.order_id]);

  // Load this order's accepted+linked materials (for the Pattern-stage
  // actual-usage inputs below). Reuses the existing admin order-detail
  // endpoint — same one ProductionTracking.jsx already calls — rather than
  // adding a new route. Resets the entered quantities whenever the order
  // selection changes, since a stale material_id → qty_used map from a
  // previously-selected order must never silently attach to a different one.
  useEffect(() => {
    setMaterialQty({});
    if (!form.order_id) { setOrderMaterials([]); return; }
    axios.get(`/api/admin/orders/${form.order_id}`)
      .then(r => {
        const recs = r.data?.order?.recommendations ?? [];
        setOrderMaterials(recs.filter(rec => rec.customer_accepted && rec.material_id));
      })
      .catch(() => setOrderMaterials([]));
  }, [form.order_id]);

  const setMatQty = (materialId, val) =>
    setMaterialQty(m => ({ ...m, [materialId]: val }));

  // Only entries the staff actually typed a value into are sent — an
  // untouched field must stay indistinguishable from "not provided" so
  // ProductionStageService::checkMaterialActualsGate() can correctly hold
  // the stage advance and say which materials are still missing, rather
  // than the frontend silently sending a fabricated 0 for every material
  // the staff member hasn't gotten to yet.
  const materialActualsPayload = () =>
    Object.entries(materialQty)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([material_id, qty_used]) => ({ material_id: Number(material_id), qty_used: Number(qty_used) }));

  const totalInForm = SIZES.reduce((sum, s) => sum + (Number(form[`qty_${s}`]) || 0), 0);

  const submit = async () => {
    if (!form.order_id) { setErr('Select an order.'); return; }
    if (totalInForm === 0) { setErr('Enter at least 1 piece completed.'); return; }
    setSaving(true); setErr(''); setSuccess('');
    try {
      const payload = { ...form, material_actuals: materialActualsPayload() };
      const r = await axios.post('/api/admin/output-logs', payload);

      // materials_blocked (Aug 29 2026): the output log + tracking row
      // still committed — real physical progress isn't erased by a
      // paperwork gap — but the stage advance itself was held because one
      // or more accepted materials still don't have an actual usage entry.
      // Distinct message, not an error: the log succeeded, the advance
      // didn't.
      if (r.data.materials_blocked) {
        const names = (r.data.materials_needing_actual ?? [])
          .map(m => m.material_name).join(', ');
        setSuccess(
          `Logged ${r.data.total_output} pieces for Order #${form.order_id}. `
          + `Stage advance is on hold until actual usage is entered for: ${names}.`
        );
      } else {
        const deducted = r.data.deduction_log?.length
          ? ` · ${r.data.deduction_log.length} material(s) deducted from stock.`
          : '';
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${form.order_id}.${deducted}`);
      }

      if (r.data.low_stock?.length) {
        setErr(`Low stock after deduction: ${r.data.low_stock.map(m => m.material_name).join(', ')}`);
      }

      setForm(emptyForm());
      setMaterialQty({});
      load();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to log output.'); }
    finally { setSaving(false); }
  };

  const selOrder = orders.find(o => String(o.order_id) === String(form.order_id));

  return (
    <>
      <style>{`
        @keyframes dol-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .adm-log-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 18px;
          align-items: start;
        }
        .adm-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: var(--r-lg);
          border: 1px solid var(--border);
        }
        .adm-table-wrap table { width: 100%; min-width: 520px; border-collapse: collapse; }
        @media (max-width: 1023px) {
          .adm-log-grid { grid-template-columns: 1fr; gap: 14px; }
        }
        @media (max-width: 767px) {
          .adm-log-grid { grid-template-columns: 1fr; gap: 12px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', margin:'0 0 4px' }}>
          Daily Output Log
        </h1>
        <p style={{ color:'var(--text-subtle)', fontSize:13, margin:0 }}>
          Replaces handwritten sulat · Log pieces completed per size per shift
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18, borderBottom:'2px solid var(--border)' }}>
        {[['log','edit','Log Output'],['history','outputLog',"Today's History"]].map(([k,ic,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:'var(--r-md) var(--r-md) 0 0', border:'none',
              borderBottom:tab===k?'2px solid var(--teal)':'2px solid transparent',
              background:tab===k?'var(--teal-50)':'transparent', color:tab===k?'var(--teal)':'var(--text-subtle)',
              fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer',
              fontFamily:'var(--font)', marginBottom:'-2px' }}>
            <NavIcon name={ic} size={13} color={tab===k?'var(--teal)':'var(--text-subtle)'} />{l}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="adm-log-grid">

          {/* Left: Log form */}
          <div style={{ ...card, padding:'22px' }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:'var(--ink)', marginBottom:18 }}>
              New Output Entry
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Order + Stage */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>
                    Order
                  </label>
                  <select value={form.order_id} onChange={e=>{ set('order_id',e.target.value); }}
                    style={{ ...inp, cursor:'pointer' }}>
                    <option value="">Select order…</option>
                    {orders.map(o=>(
                      <option key={o.order_id} value={o.order_id}>
                        #{o.order_id} — {o.garment_type??'Order'} · {o.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Production Stage</label>
                  <select value={form.stage} onChange={e=>set('stage',e.target.value)}
                    style={{ ...inp, cursor:'pointer' }}>
                    {STAGES.map(s=>(
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Log Date</label>
                  <input type="date" value={form.log_date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e=>set('log_date',e.target.value)}
                    style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <div style={{ padding:'10px 14px', borderRadius:'var(--r-md)', background:'var(--teal-50)',
                    border:'1px solid var(--teal-100)', width:'100%', textAlign:'center' }}>
                    <p style={{ fontSize:22, fontWeight:800, color:'var(--teal)', margin:0 }}>{totalInForm}</p>
                    <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'2px 0 0' }}>Total pieces entered</p>
                  </div>
                </div>
              </div>

              {/* Size quantities grid */}
              <div>
                <label style={{ ...lbl, marginBottom:10 }}>Pieces Completed Per Size</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {SIZES.map(s=>(
                    <div key={s}>
                      <label style={{ ...lbl, fontSize:10, marginBottom:5 }}>{SIZE_LABELS[s]}</label>
                      <input type="number" min={0} value={form[`qty_${s}`]}
                        onChange={e=>set(`qty_${s}`, Math.max(0, Number(e.target.value)))}
                        style={{ ...inp, textAlign:'center', padding:'8px 6px' }}
                        onFocus={fi} onBlur={fo}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actual materials used — Pattern stage only. Shown when this
                  order has accepted+linked material recommendations; the
                  backend gate (checkMaterialActualsGate) only checks these
                  when the Pattern stage's quantity target is met, but the
                  input is offered here on every Pattern-stage log so staff
                  can enter it progressively rather than being surprised by
                  a hold on the exact log that completes the stage. */}
              {form.stage === 'pattern' && orderMaterials.length > 0 && (
                <div style={{
                  padding:'14px', borderRadius:'var(--r-lg)', background:'var(--teal-50)',
                  border:'1px solid var(--teal-100)',
                }}>
                  <label style={{ ...lbl, marginBottom:10 }}>
                    Actual Materials Used <span style={{ color:'var(--text-faint)', fontWeight:400, textTransform:'none' }}>
                      (required before Pattern can advance)
                    </span>
                  </label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {orderMaterials.map(m => (
                      <div key={m.material_id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ flex:1, fontSize:12, color:'var(--ink)', fontWeight:600 }}>
                          {m.material_name}
                          <span style={{ color:'var(--text-faint)', fontWeight:400 }}> ({m.unit})</span>
                        </span>
                        <input
                          type="number" min={0} step="any"
                          placeholder="qty used"
                          value={materialQty[m.material_id] ?? ''}
                          onChange={e => setMatQty(m.material_id, e.target.value)}
                          style={{ ...inp, width:110, textAlign:'right' }}
                          onFocus={fi} onBlur={fo}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Defects */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>
                    <NavIcon name="warning" size={11} color="var(--danger)" />Defects
                  </label>
                  <input type="number" min={0} value={form.defect_count}
                    onChange={e=>set('defect_count', Math.max(0, Number(e.target.value)))}
                    style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <div>
                  <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>
                    <NavIcon name="warning" size={11} color="var(--warning)" />For Alteration
                  </label>
                  <input type="number" min={0} value={form.alteration_count}
                    onChange={e=>set('alteration_count', Math.max(0, Number(e.target.value)))}
                    style={inp} onFocus={fi} onBlur={fo}/>
                </div>
              </div>

              {(form.defect_count > 0 || form.alteration_count > 0) && (
                <div>
                  <label style={lbl}>Defect / Alteration Notes</label>
                  <textarea value={form.defect_notes}
                    onChange={e=>set('defect_notes',e.target.value)}
                    placeholder="Describe the issue…" rows={2}
                    style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
                </div>
              )}

              <div>
                <label style={lbl}>Shift Notes <span style={{ color:'var(--text-faint)', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)}
                  placeholder="Any notes for this shift…" rows={2}
                  style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
              </div>

              {err     && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12, fontWeight:600 }}><NavIcon name="warning" size={13} color="var(--danger)" />{err}</p>}
              {success && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--success)', fontSize:12, fontWeight:600 }}><NavIcon name="success" size={13} color="var(--success)" />{success}</p>}

              <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:.98 }}
                onClick={submit} disabled={saving}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'12px', borderRadius:'var(--r-lg)', border:'none',
                  background:saving?'var(--text-faint)':'linear-gradient(135deg,var(--teal),var(--teal-2))',
                  color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer',
                  fontFamily:'var(--font)',
                  boxShadow:saving?'none':'var(--shadow-teal)' }}>
                <NavIcon name={saving ? 'loading' : 'success'} size={15} color="#fff" style={saving ? { animation:'dol-spin .8s linear infinite' } : undefined} />
                {saving ? 'Saving…' : 'Log Output'}
              </motion.button>
            </div>
          </div>

          {/* Right: Order summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {selOrder && (
              <div style={{ ...card, padding:'16px' }}>
                <p style={{ fontSize:12, fontWeight:800, color:'var(--ink)', marginBottom:12 }}>
                  Order #{selOrder.order_id}
                </p>
                {[
                  ['Garment', selOrder.garment_type??'—'],
                  ['Quantity', `${selOrder.quantity_ordered??0} pcs`],
                  ['Color',    selOrder.color??'—'],
                  ['Status',   selOrder.status],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--bg-surface)' }}>
                    <span style={{ fontSize:11, color:'var(--text-faint)' }}>{l}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)', textTransform:'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary by stage */}
            {summary?.by_stage?.length > 0 && (
              <div style={{ ...card, overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--ink)', margin:0 }}>Cumulative Output</p>
                </div>
                {summary.by_stage.map(s=>(
                  <div key={s.stage} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', borderBottom:'1px solid var(--bg-surface)' }}>
                    <span style={{ fontSize:12, color:'var(--ink)', textTransform:'capitalize' }}>{s.stage}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:'var(--teal)' }}>{s.total_pieces} pcs</span>
                  </div>
                ))}
                {summary.by_size && (
                  <div style={{ padding:'10px 14px', background:'var(--teal-50)', borderTop:'1px solid var(--border)' }}>
                    <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'0 0 6px', fontWeight:700 }}>By Size (all stages)</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Object.entries({ XS:summary.by_size.xs, S:summary.by_size.s, M:summary.by_size.m, L:summary.by_size.l, XL:summary.by_size.xl, '2XL':summary.by_size.xxl, '3XL':summary.by_size.xxxl, Custom:summary.by_size.custom }).filter(([,v])=>v>0).map(([s,v])=>(
                        <span key={s} style={{ padding:'3px 8px', borderRadius:'var(--r-full)', background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'var(--ink)' }}>
                          {s}: {v}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize:13, fontWeight:800, color:'var(--teal)', margin:'8px 0 0' }}>
                      Total: {summary.by_size.grand_total} pcs
                    </p>
                  </div>
                )}
              </div>
            )}

            {!selOrder && (
              <div style={{ ...card, padding:'30px', textAlign:'center' }}>
                <NavIcon name="outputLog" size={32} color="var(--text-faint)" style={{ marginBottom:10 }} />
                <p style={{ fontSize:12, color:'var(--text-subtle)' }}>Select an order to see summary</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, fontWeight:800, color:'var(--ink)', margin:0 }}>
              Today's Logs — {new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}
            </p>
          </div>
          <div className="adm-table-wrap" style={{ border:'none', borderRadius:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg)' }}>
                {['Order','Stage','Total','By Size','Defects','Logged By'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid var(--bg-surface)' }}>
                  {Array(6).fill(0).map((_,j)=>(
                    <td key={j} style={{ padding:'11px 14px' }}><div style={{ ...SK, height:10, width:'60%' }}/></td>
                  ))}
                </tr>
              )) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'40px', textAlign:'center' }}>
                  <p style={{ color:'var(--text-faint)', fontSize:13 }}>No logs for today yet. Start logging above.</p>
                </td></tr>
              ) : logs.map((l,i)=>(
                <tr key={l.log_id??i} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'var(--teal)' }}>#{l.order_id}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--ink)', textTransform:'capitalize' }}>{l.stage}</td>
                  <td style={{ padding:'10px 14px', fontSize:14, fontWeight:800, color:'var(--teal)' }}>{l.total_output}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {Object.entries({ XS:l.qty_xs, S:l.qty_s, M:l.qty_m, L:l.qty_l, XL:l.qty_xl, '2XL':l.qty_xxl, '3XL':l.qty_xxxl, Custom:l.qty_custom }).filter(([,v])=>v>0).map(([s,v])=>(
                        <span key={s} style={{ padding:'2px 6px', borderRadius:'var(--r-full)', background:'var(--teal-50)', border:'1px solid var(--teal-100)', fontSize:9, fontWeight:700, color:'var(--teal)' }}>
                          {s}:{v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color: l.defect_count>0?'var(--danger)':'var(--text-faint)' }}>
                    {l.defect_count > 0 ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}><NavIcon name="warning" size={11} color="var(--danger)" />{l.defect_count}</span>
                    ) : '—'}
                    {l.alteration_count > 0 && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3, color:'var(--warning)', marginLeft:6 }}><NavIcon name="warning" size={11} color="var(--warning)" />{l.alteration_count}</span>
                    )}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'var(--text-subtle)' }}>{l.logger?.name??'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <style>{`@keyframes dol-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
