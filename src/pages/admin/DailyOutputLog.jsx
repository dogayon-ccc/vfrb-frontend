// src/pages/admin/DailyOutputLog.jsx
// Replaces handwritten sulat — staff logs pieces per size per day per stage
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const T = '#028090', T2 = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;
const SK = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, boxSizing:'border-box', transition:'border .15s,box-shadow .15s' };
const fi = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT };
const card = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)' };

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];
const SIZES  = ['xs','s','m','l','xl','xxl','xxxl','custom'];
const SIZE_LABELS = { xs:'XS', s:'S', m:'M', l:'L', xl:'XL', xxl:'2XL', xxxl:'3XL', custom:'Custom' };

const emptyForm = () => ({
  order_id:'', stage:'cutting', log_date: new Date().toISOString().split('T')[0],
  qty_xs:0, qty_s:0, qty_m:0, qty_l:0, qty_xl:0, qty_xxl:0, qty_xxxl:0, qty_custom:0,
  defect_count:0, alteration_count:0, defect_notes:'', notes:'', scanned_via_qr:false,
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

  const totalInForm = SIZES.reduce((sum, s) => sum + (Number(form[`qty_${s}`]) || 0), 0);

  const submit = async () => {
    if (!form.order_id) { setErr('Select an order.'); return; }
    if (totalInForm === 0) { setErr('Enter at least 1 piece completed.'); return; }
    setSaving(true); setErr(''); setSuccess('');
    try {
      const r = await axios.post('/api/admin/output-logs', form);
      setSuccess(`✓ Logged ${r.data.total_output} pieces for Order #${form.order_id}`);
      setForm(emptyForm());
      load();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to log output.'); }
    finally { setSaving(false); }
  };

  const selOrder = orders.find(o => String(o.order_id) === String(form.order_id));

  return (
    <>
      <style>{`
        @keyframes sk {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        /* ── Responsive — mobile sweep ── */
        .adm-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        /* 4K: more columns */
        @media (min-width: 2560px) {
          .adm-stats { grid-template-columns: repeat(6, 1fr); }
        }
        .adm-log-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 18px;
          align-items: start;
        }
        .adm-filter {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 16px;
        }
        .adm-filter input,
        .adm-filter select { flex: 1; min-width: 150px; }
        .adm-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .adm-table-wrap table { width: 100%; min-width: 520px; border-collapse: collapse; }
        /* ── TABLET 768–1023px ── */
        @media (max-width: 1023px) {
          .adm-log-grid { grid-template-columns: 1fr; gap: 14px; }
        }
        /* ── MOBILE ≤ 767px ── */
        @media (max-width: 767px) {
          .adm-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
          .adm-log-grid { grid-template-columns: 1fr; gap: 12px; }
          .adm-filter { flex-direction: column; }
          .adm-filter input,
          .adm-filter select { min-width: 0; width: 100%; }
          .adm-mob-hide { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>
          Daily Output Log
        </h1>
        <p style={{ color:'#64748b', fontSize:13, margin:0 }}>
          Replaces handwritten sulat · Log pieces completed per size per shift
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18, borderBottom:'2px solid #e2e8f0' }}>
        {[['log','📝 Log Output'],['history','📋 Today\'s History']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:'9px 16px', borderRadius:'9px 9px 0 0', border:'none',
              borderBottom:tab===k?`2px solid ${T}`:'2px solid transparent',
              background:tab===k?'#f0fdfa':'transparent', color:tab===k?T:'#64748b',
              fontSize:13, fontWeight:tab===k?700:500, cursor:'pointer',
              fontFamily:FONT, marginBottom:'-2px' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="adm-log-grid">

          {/* Left: Log form */}
          <div style={{ ...card, padding:'22px' }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:18 }}>
              New Output Entry
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Order + Stage */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>
                    Order {form.scanned_via_qr && <span style={{ color:T, fontSize:9, marginLeft:4 }}>📷 via QR</span>}
                  </label>
                  <select value={form.order_id} onChange={e=>{ set('order_id',e.target.value); set('scanned_via_qr',false); }}
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
                  <div style={{ padding:'10px 14px', borderRadius:10, background:'#f0fdfa',
                    border:`1px solid ${T}30`, width:'100%', textAlign:'center' }}>
                    <p style={{ fontSize:22, fontWeight:800, color:T, margin:0 }}>{totalInForm}</p>
                    <p style={{ fontSize:10, color:'#64748b', margin:'2px 0 0' }}>Total pieces entered</p>
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

              {/* Defects */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Defects 🔴</label>
                  <input type="number" min={0} value={form.defect_count}
                    onChange={e=>set('defect_count', Math.max(0, Number(e.target.value)))}
                    style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <div>
                  <label style={lbl}>For Alteration 🟡</label>
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
                <label style={lbl}>Shift Notes <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)}
                  placeholder="Any notes for this shift…" rows={2}
                  style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
              </div>

              {err     && <p style={{ color:'#ef4444', fontSize:12, fontWeight:600 }}>⚠️ {err}</p>}
              {success && <p style={{ color:'#22c55e', fontSize:12, fontWeight:600 }}>{success}</p>}

              <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:.98 }}
                onClick={submit} disabled={saving}
                style={{ padding:'12px', borderRadius:11, border:'none',
                  background:saving?'#94a3b8':`linear-gradient(135deg,${T},${T2})`,
                  color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer',
                  fontFamily:FONT,
                  boxShadow:saving?'none':`0 4px 14px rgba(2,128,144,.25)` }}>
                {saving ? '⏳ Saving…' : '✓ Log Output'}
              </motion.button>
            </div>
          </div>

          {/* Right: Order summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {selOrder && (
              <div style={{ ...card, padding:'16px' }}>
                <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12 }}>
                  Order #{selOrder.order_id}
                </p>
                {[
                  ['Garment', selOrder.garment_type??'—'],
                  ['Quantity', `${selOrder.quantity_ordered??0} pcs`],
                  ['Color',    selOrder.color??'—'],
                  ['Status',   selOrder.status],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>{l}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'#0f172a', textTransform:'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary by stage */}
            {summary?.by_stage?.length > 0 && (
              <div style={{ ...card, overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0 }}>Cumulative Output</p>
                </div>
                {summary.by_stage.map(s=>(
                  <div key={s.stage} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ fontSize:12, color:'#0f172a', textTransform:'capitalize' }}>{s.stage}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:T }}>{s.total_pieces} pcs</span>
                  </div>
                ))}
                {summary.by_size && (
                  <div style={{ padding:'10px 14px', background:'#f0fdfa', borderTop:'1px solid #e2e8f0' }}>
                    <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px', fontWeight:700 }}>By Size (all stages)</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Object.entries({ XS:summary.by_size.xs, S:summary.by_size.s, M:summary.by_size.m, L:summary.by_size.l, XL:summary.by_size.xl, '2XL':summary.by_size.xxl, '3XL':summary.by_size.xxxl, Custom:summary.by_size.custom }).filter(([,v])=>v>0).map(([s,v])=>(
                        <span key={s} style={{ padding:'3px 8px', borderRadius:99, background:'#fff', border:'1px solid #e2e8f0', fontSize:10, fontWeight:700, color:'#0f172a' }}>
                          {s}: {v}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize:13, fontWeight:800, color:T, margin:'8px 0 0' }}>
                      Total: {summary.by_size.grand_total} pcs
                    </p>
                  </div>
                )}
              </div>
            )}

            {!selOrder && (
              <div style={{ ...card, padding:'30px', textAlign:'center' }}>
                <p style={{ fontSize:32, margin:'0 0 10px', opacity:.3 }}>📋</p>
                <p style={{ fontSize:12, color:'#64748b' }}>Select an order or scan QR to see summary</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
            <p style={{ fontSize:13, fontWeight:800, color:'#0f172a', margin:0 }}>
              Today's Logs — {new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}
            </p>
          </div>
          <div className="adm-table-wrap" style={{ border:'none', borderRadius:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Order','Stage','Total','By Size','Defects','Logged By','Via QR'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(7).fill(0).map((_,j)=>(
                    <td key={j} style={{ padding:'11px 14px' }}><div style={{ ...SK, height:10, width:'60%' }}/></td>
                  ))}
                </tr>
              )) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center' }}>
                  <p style={{ color:'#94a3b8', fontSize:13 }}>No logs for today yet. Start logging above.</p>
                </td></tr>
              ) : logs.map((l,i)=>(
                <tr key={l.log_id??i} style={{ borderBottom:'1px solid #f1f5f9' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:T }}>#{l.order_id}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#0f172a', textTransform:'capitalize' }}>{l.stage}</td>
                  <td style={{ padding:'10px 14px', fontSize:14, fontWeight:800, color:T }}>{l.total_output}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {Object.entries({ XS:l.qty_xs, S:l.qty_s, M:l.qty_m, L:l.qty_l, XL:l.qty_xl, '2XL':l.qty_xxl, '3XL':l.qty_xxxl, Custom:l.qty_custom }).filter(([,v])=>v>0).map(([s,v])=>(
                        <span key={s} style={{ padding:'2px 6px', borderRadius:99, background:'#f0fdfa', border:`1px solid ${T}30`, fontSize:9, fontWeight:700, color:T }}>
                          {s}:{v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color: l.defect_count>0?'#ef4444':'#94a3b8' }}>
                    {l.defect_count > 0 ? `🔴 ${l.defect_count}` : '—'}
                    {l.alteration_count > 0 && <span style={{ color:'#f59e0b', marginLeft:4 }}>🟡 {l.alteration_count}</span>}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#64748b' }}>{l.logger?.name??'—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    {l.scanned_via_qr ? <span style={{ fontSize:11, color:T }}>📷 Yes</span> : <span style={{ fontSize:11, color:'#94a3b8' }}>Manual</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </>
  );
}
