// src/pages/admin/Reports.jsx — white theme, prescriptive alerts, sales analytics
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import axios                            from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// ── CSV export helper ──────────────────────────────────────────────────────────
// Converts a 2D array (header row + data rows) to a downloadable CSV file.
// No external library — pure JS Blob + URL.createObjectURL.
function downloadCSV(rows, filename) {
  const csv = rows
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? '').replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s}"`
          : s;
      }).join(',')
    ).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // \ufeff = BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Build CSV rows from current report data
function buildCSV(data, tab) {
  if (!data) return null;
  if (tab === 'overview') {
    const rows = [
      ['VFRB Enterprise — Sales Report', '', '', ''],
      ['Generated', new Date().toLocaleString('en-PH'), '', ''],
      ['', '', '', ''],
      ['KPI', 'Value', '', ''],
      ['Total Revenue', `₱${Number(data.total_revenue ?? 0).toFixed(2)}`, '', ''],
      ['Total Orders',     data.total_orders ?? 0, '', ''],
      ['Completed Orders', data.completed_orders ?? 0, '', ''],
      ['Avg Order Value', `₱${Number(data.avg_order_value ?? 0).toFixed(2)}`, '', ''],
      ['', '', '', ''],
      ['Month', 'Orders', 'Pieces', 'Completed'],
      ...(data.order_trends ?? []).map(t => [t.month, t.orders, t.pieces, t.completed]),
    ];
    return rows;
  }
  if (tab === 'prescriptive') {
    const rows = [
      ['VFRB Enterprise — MRP Prescriptive Alerts', '', '', '', ''],
      ['Generated', new Date().toLocaleString('en-PH'), '', '', ''],
      ['', '', '', '', ''],
      ['Severity', 'Material', 'In Stock', 'Reorder Threshold', 'Recommended Order', 'Action'],
      ...(data.prescriptive_alerts ?? []).map(a => [
        a.severity ?? '',
        a.material ?? a.material_name ?? '',
        `${a.in_stock ?? a.current_stock ?? 0} ${a.unit ?? ''}`,
        `${a.demanded_qty ?? a.total_required ?? 0} ${a.unit ?? ''}`,
        `${a.recommend_order_qty ?? a.recommended_order ?? 0} ${a.unit ?? ''}`,
        a.action ?? '',
      ]),
    ];
    return rows;
  }
  return null;
}
const SK = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize: '400px', animation: 'sk 1.4s infinite'
};
const card = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)'
};

export default function AdminReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview'); // overview | prescriptive | orders
  const [runningDigest, setRunningDigest] = useState(false);
  const [digestMsg,     setDigestMsg]     = useState('');

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_reports');
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    // DSA: O(1) cache hit; O(n) DB aggregation on miss (cached 5min per master prompt)
    axios.get('/api/admin/reports')
      .then(res => {
        const d = res.data;
        setData(d);
        cacheSet('admin_reports', d, TTL.REPORTS);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // AUTOMATION: manual "Run Now" — same command the scheduler calls
  // (vfrb:daily-digest), so this can never drift out of sync with the
  // automatic run. Useful for local dev where no cron poller is set up yet.
  const runDigest = useCallback(async () => {
    setRunningDigest(true);
    setDigestMsg('');
    try {
      const r = await axios.post('/api/admin/automation/run-digest');
      setDigestMsg(r.data?.message ?? 'Done.');
      cacheClear('admin_reports', 'dashboard_stats', 'notifications');
      load(true); // refresh alerts — new low-stock RFQs/notifications may exist now
    } catch {
      setDigestMsg('Automation run failed. Check backend logs.');
    } finally {
      setRunningDigest(false);
      setTimeout(() => setDigestMsg(''), 6000);
    }
  }, [load]);

  const alerts    = data?.prescriptive_alerts ?? [];
  const monthly   = data?.monthly_sales ?? [];
  const topMats   = data?.top_materials ?? [];
  const summary   = {
    total_revenue:    data?.total_revenue    ?? 0,
    total_orders:     data?.total_orders     ?? 0,
    completed_orders: data?.completed_orders ?? 0,
    avg_order_value:  data?.avg_order_value  ?? 0,
  };

  const TABS = [
    { k:'overview',     l:'📊 Overview'          },
    { k:'prescriptive', l:`⚠️ Alerts${alerts.length ? ` (${alerts.length})` : ''}` },
  ];

  return (
    <>
      <style>{`
        @keyframes sk {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        /* Reports responsive */
        .rpt-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .rpt-orders-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 767px) {
          .rpt-orders-grid { grid-template-columns: 1fr; }
          .rpt-alert-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 2560px) {
          .rpt-kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media print {
          body * { visibility: hidden; }
          .rpt-printable, .rpt-printable * { visibility: visible; }
          .rpt-printable { position: absolute; left: 0; top: 0; width: 100%; }
          .rpt-noprint { display: none !important; }
        }
      `}</style>
      <div style={{ fontFamily:FONT, color:'#0f172a' }}
        className="rpt-printable">

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          marginBottom:22, flexWrap:'wrap', gap:12 }} className="rpt-noprint">
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Reports</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>
              Sales analytics · MRP prescriptive alerts · Production insights
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {/* CSV Export — context-sensitive to active tab */}
            <button
              onClick={() => {
                const rows = buildCSV(data, tab);
                if (!rows) return;
                const today = new Date().toISOString().slice(0,10);
                downloadCSV(rows, `vfrb_${tab}_${today}.csv`);
              }}
              disabled={loading || !data}
              style={{
                padding:'9px 16px', borderRadius:10,
                border:'1px solid #e2e8f0', background:'#fff',
                color: (!loading && data) ? '#0f172a' : '#94a3b8',
                fontSize:12, fontWeight:600,
                cursor: (!loading && data) ? 'pointer' : 'not-allowed',
                fontFamily:FONT,
                display:'flex', alignItems:'center', gap:6,
              }}>
              ⬇ Export CSV
            </button>
            {/* Print */}
            <button
              onClick={() => window.print()}
              style={{
                padding:'9px 14px', borderRadius:10,
                border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a',
                fontSize:12, fontWeight:600, cursor:'pointer',
                fontFamily:FONT,
              }}>
              🖨 Print
            </button>
            <button onClick={() => { cacheClear('admin_reports'); load(true); }}
              style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #e2e8f0',
                background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              ⟳ Refresh
            </button>
            {/* AUTOMATION: manual trigger for the daily digest job — low-stock
                notifications, auto-suggested RFQs, deadline reminders. Same
                job that runs automatically every morning once a real cron/
                Task Scheduler entry is set up on the server. */}
            <button onClick={runDigest} disabled={runningDigest}
              title="Run the automated low-stock digest, auto-suggested RFQs, and deadline reminders now"
              style={{ padding:'9px 18px', borderRadius:10, border:'none',
                background: runningDigest ? '#94a3b8' : 'linear-gradient(135deg,#028090,#02C39A)',
                color:'#fff', fontSize:12, fontWeight:700,
                cursor: runningDigest ? 'not-allowed' : 'pointer', fontFamily:FONT,
                display:'flex', alignItems:'center', gap:6 }}>
              {runningDigest ? '⏳ Running…' : '🤖 Run Automation Now'}
            </button>
          </div>
          {digestMsg && (
            <p style={{ fontSize:12, color:'#028090', fontWeight:600, margin:'8px 0 0',
              fontFamily:FONT, textAlign:'right' }}>
              {digestMsg}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:22, borderBottom:'2px solid #e2e8f0',
          paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ padding:'10px 18px', borderRadius:'10px 10px 0 0', border:'none',
                borderBottom: tab===t.k ? `2px solid ${T}` : '2px solid transparent',
                background: tab===t.k ? '#f0fdfa' : 'transparent',
                color: tab===t.k ? T : '#64748b',
                fontSize:13, fontWeight: tab===t.k ? 700 : 500, cursor:'pointer',
                fontFamily:FONT, transition:'all .14s',
                marginBottom:'-2px' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* KPI row */}
            <div className="rpt-kpi-grid">
              {[
                { l:'Total Revenue',    v:`₱${Number(summary.total_revenue).toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon:'💰', c:'#22c55e', bg:'#f0fdf4' },
                { l:'Total Orders',     v:summary.total_orders,     icon:'📋', c:'#3b82f6', bg:'#eff6ff' },
                { l:'Completed Orders', v:summary.completed_orders, icon:'✅', c:T,         bg:'#f0fdfa' },
                { l:'Avg Order Value',  v:`₱${Number(summary.avg_order_value).toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon:'📈', c:'#8b5cf6', bg:'#f5f3ff' },
              ].map(s => (
                <div key={s.l} style={{ ...card, padding:'18px' }}>
                  <span style={{ width:38, height:38, borderRadius:10, background:s.bg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:20, marginBottom:12 }}>{s.icon}</span>
                  {loading
                    ? <div style={{ ...SK, height:28, width:'65%', marginBottom:6 }}/>
                    : <p style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>{s.v}</p>
                  }
                  <p style={{ fontSize:11, color:'#64748b', margin:0, fontWeight:500 }}>{s.l}</p>
                </div>
              ))}
            </div>

            {/* Monthly revenue chart */}
            {monthly.length > 0 && (
              <div style={{ ...card, padding:'20px' }}>
                <h3 style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:4 }}>
                  Monthly Revenue
                </h3>
                <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>
                  Sales transactions by month
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthly} margin={{ top:0, right:0, left:-5, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₱${(v/1000).toFixed(0)}k`}/>
                    <Tooltip
                      formatter={v => [`₱${Number(v).toLocaleString('en-PH',{minimumFractionDigits:2})}`, 'Revenue']}
                      contentStyle={{ background:'#fff', border:'1px solid #e2e8f0',
                        borderRadius:10, fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,.08)' }}/>
                    <Bar dataKey="total" fill={T} radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top materials */}
            {topMats.length > 0 && (
              <div style={{ ...card, padding:'20px' }}>
                <h3 style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:16 }}>
                  Top Consumed Materials
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {topMats.slice(0,6).map((m, i) => {
                    const max = topMats[0]?.total_consumed ?? 1;
                    const pct = Math.round((m.total_consumed / max) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>
                            {m.material_name}
                          </span>
                          <span style={{ fontSize:12, color:'#64748b' }}>
                            {Number(m.total_consumed).toFixed(2)} {m.unit}
                          </span>
                        </div>
                        <div style={{ height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`,
                            background:`linear-gradient(90deg,${T},${T2})`, borderRadius:99 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Prescriptive Alerts Tab (MRP) ── */}
        {tab === 'prescriptive' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* SAP MD04 explanation */}
            <div style={{ padding:'14px 18px', borderRadius:12,
              background:'#f0fdfa', border:'1px solid #99f6e4' }}>
              <p style={{ fontSize:13, fontWeight:700, color:T, marginBottom:6 }}>
                🤖 MRP Prescriptive Analysis (SAP MD04 Equivalent)
              </p>
              <p style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
                The system cross-references each order's computed BOM against current inventory.
                Any material where current stock is less than the estimated requirement triggers a
                deficit alert with a recommended reorder quantity (current deficit + 20% safety buffer).
              </p>
            </div>

            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ ...card, padding:18 }}>
                    <div style={{ ...SK, height:14, width:'50%', marginBottom:10 }}/>
                    <div style={{ ...SK, height:10, width:'75%' }}/>
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ ...card, padding:'50px 20px', textAlign:'center' }}>
                <p style={{ fontSize:40, margin:'0 0 14px', opacity:.3 }}>✅</p>
                <p style={{ fontSize:15, fontWeight:700, color:'#22c55e', marginBottom:6 }}>
                  All Materials Sufficient
                </p>
                <p style={{ fontSize:13, color:'#64748b' }}>
                  Current stock levels meet all active order requirements.
                </p>
              </div>
            ) : (
              <>
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#fef3c7',
                  border:'1px solid #fde68a', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>⚠️</span>
                  <p style={{ fontSize:13, color:'#92400e', fontWeight:600, margin:0 }}>
                    {alerts.length} material{alerts.length!==1?'s':''} require immediate attention
                    — create purchase orders before production is blocked.
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{ ...card, padding:'18px',
                      borderLeft:`4px solid ${a.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
                      borderColor: a.severity === 'critical'
                        ? `#ef4444 #e2e8f0 #e2e8f0 #ef4444`
                        : `#f59e0b #e2e8f0 #e2e8f0 #f59e0b` }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                        <div>
                          <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>
                            {a.material ?? a.material_name ?? "Unknown Material"}
                          </h3>
                          <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0' }}>
                            Unit: {a.unit} · Category: {a.category ?? '—'}
                          </p>
                        </div>
                        <span style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:700,
                          background: a.severity === 'critical' ? '#fee2e2' : '#fef3c7',
                          color: a.severity === 'critical' ? '#991b1b' : '#92400e' }}>
                          {a.severity === 'critical' ? '🔴 Critical' : '🟡 Warning'}
                        </span>
                      </div>

                      {/* Stock vs need comparison */}
                      <div className="rpt-alert-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                        {[
                          { l:'Current Stock',     v:`${a.in_stock ?? a.current_stock ?? 0 ?? 0} ${a.unit}`,    c:'#ef4444' },
                          { l:'Total Required',    v:`${a.demanded_qty ?? a.total_required ?? 0 ?? 0} ${a.unit}`,   c:'#f59e0b' },
                          { l:'Recommended Order', v:`${a.recommend_order_qty ?? a.recommended_order ?? 0 ?? Math.ceil((a.deficit ?? 0) * 1.2)} ${a.unit}`, c:T },
                        ].map(row => (
                          <div key={row.l} style={{ background:'#f8fafc', borderRadius:10,
                            padding:'10px 12px', textAlign:'center' }}>
                            <p style={{ fontSize:16, fontWeight:800, color:row.c, margin:0 }}>{row.v}</p>
                            <p style={{ fontSize:10, color:'#64748b', margin:'3px 0 0',
                              fontWeight:500 }}>{row.l}</p>
                          </div>
                        ))}
                      </div>

                      {/* Stock deficit bar */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:11, color:'#64748b' }}>Stock Coverage</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'#ef4444' }}>
                            Deficit: {a.deficit ?? Math.max(0,(a.demanded_qty ?? a.total_required ?? 0??0)-(a.in_stock ?? a.current_stock ?? 0??0))} {a.unit}
                          </span>
                        </div>
                        <div style={{ height:8, background:'#fee2e2', borderRadius:99, overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:99,
                            background:'linear-gradient(90deg,#22c55e,#16a34a)',
                            width:`${Math.min(100, Math.round(((a.in_stock ?? a.current_stock ?? 0)/((a.demanded_qty ?? a.total_required ?? 0) || 1))*100))}%`
                          }}/>
                        </div>
                      </div>

                      {/* Affected orders */}
                      {(a.affected_orders?.length > 0 || a.affected_order_ids?.length > 0) && (
                        <div style={{ background:'#f8fafc', borderRadius:9, padding:'8px 12px' }}>
                          <p style={{ fontSize:11, color:'#64748b', margin:0 }}>
                            <strong style={{ color:'#0f172a' }}>
                              {(a.affected_orders ?? a.affected_order_ids ?? []).length} order{(a.affected_orders ?? a.affected_order_ids ?? []).length!==1?'s':''} at risk:
                            </strong>
                            {' '}Orders #{(a.affected_orders ?? a.affected_order_ids ?? []).slice(0,5).join(', #')}
                            {(a.affected_orders ?? a.affected_order_ids ?? []).length > 5 ? ` and ${(a.affected_orders ?? a.affected_order_ids ?? []).length - 5} more` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Orders Breakdown Tab ── */}
      </div>
    </>
  );
}