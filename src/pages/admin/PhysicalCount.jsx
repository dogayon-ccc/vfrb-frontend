
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                           from 'framer-motion';
import axios                                                 from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }              from '../../utils/cache';
import { NavIcon }                                           from '../../components/ui/icons';
import { escapeHtml }                                        from '../../utils/escapeHtml';
import BottomSheet                                           from '../../components/ui/BottomSheet';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, Banner, SkeletonRows } from '../../components/admin/AdminUI';

const T    = 'var(--teal)';
const T2   = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const SK   = { borderRadius:6, background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp  = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
  fontSize:13, outline:'none', fontFamily:FONT,  boxSizing:'border-box', transition:'border .15s,box-shadow .15s',
};
const fi   = e => { e.target.style.borderColor=T;         e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:FONT };
const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)' };

const readIsManager = () => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').role === 'manager'; } catch { return false; } };

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

function CountModal({ materials, onClose, onDone, isMobile, initialMatId }) {
  const [matId,   setMatId]   = useState(initialMatId ? String(initialMatId) : '');
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
      cacheClear('materials_list', 'dashboard_stats');
      onDone(`Count logged for ${selMat?.material_name ?? 'material'}. Variance computed.`);
    } catch(e) {
      setErr(e.response?.data?.message ?? 'Failed to log count.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet title="Log Physical Count" onClose={onClose} isMobile={isMobile} maxWidth={520}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
            Physical Inventory Count
          </p>

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
              <p style={{ color:'var(--danger)', fontSize:12, fontWeight:600, fontFamily:FONT, margin:0 }}>
                <NavIcon name="warning" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>{err}
              </p>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
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
        </div>
    </BottomSheet>
  );
}

function ReconcileModal({ count, onClose, onDone, isMobile }) {
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
    <BottomSheet title={`Reconcile Count — ${count.material?.material_name}`} onClose={onClose} isMobile={isMobile} maxWidth={480}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
            Post Count &amp; Reconcile
          </p>

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
            <p style={{ color:'var(--danger)', fontSize:12, fontFamily:FONT, display:'flex', alignItems:'center', gap:5, margin:0 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
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
        </div>
    </BottomSheet>
  );
}

export default function AdminPhysicalCount() {
  const isManager = readIsManager();
  const [logFor, setLogFor] = useState(null);
  const [counts,      setCounts]      = useState([]);
  const [materials,   setMaterials]   = useState([]);
  const [summary,     setSummary]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [filterR,     setFilterR]     = useState('all');
  const [showLog,     setShowLog]     = useState(false);
  const [reconciling, setReconciling] = useState(null);
  const [toast,       setToast]       = useState(null);  const [winW, setWinW] = useState(typeof window!=='undefined'?window.innerWidth:1280);
  useEffect(() => { const h=()=>setWinW(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h); }, []);
  const isMobile = winW <= 767;

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(() => {
    setLoading(true);

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
      <p>Generated: ${escapeHtml(r.data.generated_at)} | By: ${escapeHtml(r.data.generated_by)}</p>
      <table>
        <tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th>
            <th>System Qty</th><th>Physical Count</th><th>Variance</th><th>Notes</th></tr>
        ${mats.map((m, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(m.material_name)}</td>
            <td>${escapeHtml(m.category ?? '')}</td>
            <td>${escapeHtml(m.unit)}</td>
            <td>${escapeHtml(m.system_qty)}</td>
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

  const flaggedN = counts.filter((c) => Math.abs(Number(c.variance_pct)) > 5).length;
  const tabs = [
    { key: 'all', label: 'All', count: counts.length },
    { key: 'pending', label: 'Needs review', count: counts.filter((c) => !c.reconciled).length },
    { key: 'flagged', label: 'Flagged >5%', count: flaggedN },
    { key: 'reconciled', label: 'Reconciled', count: counts.filter((c) => c.reconciled).length },
  ];
  const overdue = summary.overdue_materials ?? [];
  const openLog = (matId = null) => { setLogFor(matId); setShowLog(true); };

  const VarCell = ({ c }) => {
    const v = Number(c.variance ?? 0); const pct = Number(c.variance_pct ?? 0);
    const color = v > 0 ? 'var(--success)' : v < 0 ? 'var(--danger)' : 'var(--text-subtle)';
    return (
      <span className="pc-var" style={{ color }}>
        <b>{v > 0 ? '+' : ''}{v}</b>
        <i style={{ color: Math.abs(pct) > 5 ? 'var(--warning-text)' : 'var(--text-faint)' }}>{Math.abs(pct) > 5 ? '! ' : ''}{pct}%</i>
      </span>
    );
  };
  const Status = ({ c }) => (c.reconciled
    ? <StatusPill status="reconciled" label={c.stock_adjusted ? 'Reconciled · adjusted' : 'Reconciled'} />
    : Math.abs(Number(c.variance_pct)) > 5 ? <StatusPill status="flagged" label="Flagged" /> : <StatusPill status="pending" label="Awaiting review" />);
  const Action = ({ c }) => (c.reconciled ? <span className="pc-by">by {c.reconciler?.name ?? '—'}</span>
    : isManager ? <button className="adm-btn primary" onClick={() => setReconciling(c)}>Reconcile</button>
      : <span className="pc-by">Awaiting manager</span>);

  return (
    <>
      <style>{`@keyframes sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
      <AnimatePresence>{toast && <Toast key="toast" msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}</AnimatePresence>
      {showLog && <CountModal materials={materials} initialMatId={logFor} onClose={() => setShowLog(false)} onDone={handleCountDone} isMobile={isMobile} />}
      {reconciling && <ReconcileModal count={reconciling} onClose={() => setReconciling(null)} onDone={handleReconcileDone} isMobile={isMobile} />}

      <PageHeader title="Physical Stock Count" sub="Log the shelf count, variance is computed against system stock">
        <button className="adm-btn" onClick={printSheet}><NavIcon name="print" size={14} color="currentColor" /> Print sheet</button>
        <button className="adm-btn primary" onClick={() => openLog()}><NavIcon name="add" size={14} color="currentColor" /> Log count</button>
      </PageHeader>

      <StatGrid loading={loading} items={[
        { label: 'Flagged variances', value: summary.flagged_variances ?? 0, color: summary.flagged_variances ? 'var(--warning-text)' : undefined, sub: 'Over 5% variance', onClick: () => setFilterR('flagged') },
        { label: 'Needs reconciliation', value: summary.unreconciled_counts ?? 0, color: 'var(--info)', sub: 'Manager review', onClick: () => setFilterR('pending') },
        { label: 'Overdue counts', value: overdue.length, color: overdue.length ? 'var(--danger)' : undefined, sub: 'Not counted in 30+ days' },
        { label: 'Last count', value: summary.last_count_date ?? '—', sub: 'Most recent' },
      ]} />

      <Banner tone="info" icon="info">Variance over 5% is flagged for manager review. Reconciling can optionally adjust system stock to match the physical count, and every adjustment is logged.</Banner>

      <PillTabs value={filterR} onChange={setFilterR} tabs={tabs} />

      <div className="adm-only-d">
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr><th>Material</th><th className="adm-hide-t">Category</th><th>System</th><th>Physical</th><th>Variance</th><th className="adm-hide-t">Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
              <tbody>
                {!loading && filtered.map((c) => (
                  <tr key={c.count_id} className="adm-row">
                    <td><div style={{ fontWeight: 700 }}>{c.material?.material_name ?? `Material #${c.material_id}`}</div><div style={{ fontSize: 11, color: 'var(--text-faint)' }}>by {c.counter?.name ?? '—'}</div></td>
                    <td className="adm-hide-t" style={{ color: 'var(--text-subtle)', fontSize: 12 }}>{c.material?.category ?? '—'}</td>
                    <td>{c.system_qty} <small className="pc-unit">{c.material?.unit}</small></td>
                    <td style={{ fontWeight: 700, color: 'var(--teal)' }}>{c.physical_qty} <small className="pc-unit">{c.material?.unit}</small></td>
                    <td><VarCell c={c} /></td>
                    <td className="adm-hide-t" style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{c.count_date}</td>
                    <td><Status c={c} /></td>
                    <td style={{ textAlign: 'right' }}><Action c={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <SkeletonRows rows={5} h={50} />}
          {!loading && filtered.length === 0 && (
            <div className="adm-empty"><NavIcon name="physicalCount" size={30} color="currentColor" />
              <div style={{ marginTop: 8, fontWeight: 700 }}>{filterR === 'all' ? 'No counts logged yet' : 'No records match this filter'}</div>
              {filterR === 'all' && <button className="adm-btn primary" style={{ marginTop: 12 }} onClick={() => openLog()}>Log the first count</button>}
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={filterR}>
        {loading ? <SkeletonRows rows={3} h={120} /> : filtered.length === 0 ? (
          <div className="adm-empty">{filterR === 'all' ? 'No counts logged yet' : 'No records match this filter'}</div>
        ) : filtered.map((c, i) => (
          <div key={c.count_id} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': Math.abs(Number(c.variance_pct)) > 5 ? 'var(--warning)' : 'var(--teal)' }}>
            <div className="adm-mrow"><b>{c.material?.material_name ?? `Material #${c.material_id}`}</b><VarCell c={c} /></div>
            <div className="pc-qty">
              <div><span>System</span><b>{c.system_qty} <small className="pc-unit">{c.material?.unit}</small></b></div>
              <div><span>Physical</span><b style={{ color: 'var(--teal)' }}>{c.physical_qty} <small className="pc-unit">{c.material?.unit}</small></b></div>
            </div>
            <div className="adm-mrow" style={{ marginTop: 10 }}><Status c={c} /><span className="pc-by">{c.count_date}</span></div>
            {!c.reconciled && isManager && <div className="adm-mfoot"><Action c={c} /></div>}
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <Panel title={`${overdue.length} materials not counted in 30+ days`} style={{ marginTop: 16 }} flush>
          <div className="pc-overdue adm-stagger">
            {overdue.map((m, i) => (
              <button key={m.material_id} style={{ '--i': Math.min(i, 12) }} onClick={() => openLog(m.material_id)} aria-label={`Log count for ${m.material_name}`}>
                <span><b>{m.material_name}</b><i>{m.last_count_date ? `Last ${m.last_count_date} · ${m.days_since_count}d ago` : 'Never counted'}</i></span>
                <NavIcon name="add" size={15} color="currentColor" />
              </button>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
