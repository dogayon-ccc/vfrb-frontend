// src/pages/admin/Reports.jsx — white theme, prescriptive alerts, sales analytics
//
// RESHAPED (Sept 7 2026): hex -> theme.css tokens, emoji -> NavIcon,
// Badge for the Critical/Warning severity pill.
//
// DELIBERATELY LEFT AS LITERAL HEX, not tokenized: every color passed
// directly into a recharts SVG presentation-attribute prop --
// <CartesianGrid stroke="...">, <XAxis tick={{ fill:'...' }}>,
// <YAxis tick={{ fill:'...' }}>, <Bar fill="...">. Recharts renders
// these as raw SVG attribute values, not through a React style object
// the way Tooltip's contentStyle is (contentStyle IS a real style
// object below, and DOES use tokens safely, same as everywhere else).
// Whether var(--...) resolves reliably through recharts' internal
// SVG-attribute pipeline isn't something this sandbox can verify --
// no live browser render available, same limitation already noted for
// PHP files elsewhere in this project. A broken/invisible chart axis
// is a much more costly failure than an off-brand hex, so this stayed
// literal rather than risk it. Each literal value below is still
// checked against its real token equivalent (so the color IS correct,
// just not expressed as var()) -- if someone later confirms recharts
// handles CSS custom properties fine in this app's actual browser
// target, converting these four spots is a safe, easy follow-up.
//
// The alert card's 4-value border-color trick (`${c} var(--border)
// var(--border) ${c}`, faking a colored left border while keeping a
// normal border everywhere else) is a real, deliberate technique from
// the original -- preserved exactly, not "simplified" into borderLeft
// + border since that would drop the right/top/bottom border entirely.
//
// Same real simplification as Inventory.jsx's Stock-In button: the
// deficit bar's original two-stop green gradient has no equivalent in
// theme.css (only a single --success token) -- flat var(--success)
// instead of inventing a --success-dark for this one bar.
//
// CSV export, the automation "Run Now" digest trigger, and the whole
// MRP alert computation are real, load-bearing, and completely
// untouched.

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import axios                            from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { Badge, NavIcon } from '../../components/ui';

// Real token hex, used literally in the 4 recharts SVG props noted above.
const CHART_GRID = '#f1f5f9';  // = --bg-surface
const CHART_TICK = '#94a3b8';  // = --text-faint
const CHART_BAR  = '#028090';  // = --teal

// ── CSV export helper (unchanged) ──────────────────────────────────────────────
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
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCSV(data, tab) {
  if (!data) return null;
  if (tab === 'overview') {
    return [
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
  }
  if (tab === 'prescriptive') {
    return [
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
  }
  return null;
}

const SK = {
  borderRadius: 'var(--r-sm)',
  background: 'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
  backgroundSize: '400px', animation: 'rpt-shimmer 1.4s infinite'
};
const card = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-xs)'
};

export default function AdminReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview'); // overview | prescriptive
  const [runningDigest, setRunningDigest] = useState(false);
  const [digestMsg,     setDigestMsg]     = useState('');

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_reports');
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
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

  const runDigest = useCallback(async () => {
    setRunningDigest(true);
    setDigestMsg('');
    try {
      const r = await axios.post('/api/admin/automation/run-digest');
      setDigestMsg(r.data?.message ?? 'Done.');
      cacheClear('admin_reports', 'dashboard_stats', 'notifications');
      load(true);
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
    { k:'overview',     icon:'reports', l:'Overview'          },
    { k:'prescriptive', icon:'warning', l:`Alerts${alerts.length ? ` (${alerts.length})` : ''}` },
  ];

  return (
    <>
      <style>{`
        @keyframes rpt-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes rpt-spin { to { transform:rotate(360deg); } }
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
      <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}
        className="rpt-printable">

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          marginBottom:22, flexWrap:'wrap', gap:12 }} className="rpt-noprint">
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Reports</h1>
            <p style={{ color:'var(--text-subtle)', fontSize:13 }}>
              Sales analytics · MRP prescriptive alerts · Production insights
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <button
              onClick={() => {
                const rows = buildCSV(data, tab);
                if (!rows) return;
                const today = new Date().toISOString().slice(0,10);
                downloadCSV(rows, `vfrb_${tab}_${today}.csv`);
              }}
              disabled={loading || !data}
              style={{
                padding:'9px 16px', borderRadius:'var(--r-md)',
                border:'1px solid var(--border)', background:'var(--bg-card)',
                color: (!loading && data) ? 'var(--ink)' : 'var(--text-faint)',
                fontSize:12, fontWeight:600,
                cursor: (!loading && data) ? 'pointer' : 'not-allowed',
                fontFamily:'var(--font)',
                display:'flex', alignItems:'center', gap:6,
              }}>
              <NavIcon name="download" size={13} color={(!loading && data) ? 'var(--ink)' : 'var(--text-faint)'} /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'9px 14px', borderRadius:'var(--r-md)',
                border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
                fontSize:12, fontWeight:600, cursor:'pointer',
                fontFamily:'var(--font)',
              }}>
              <NavIcon name="print" size={13} color="var(--ink)" /> Print
            </button>
            <button onClick={() => { cacheClear('admin_reports'); load(true); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
                background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'var(--font)' }}>
              <NavIcon name="refresh" size={13} color="var(--ink)" /> Refresh
            </button>
            <button onClick={runDigest} disabled={runningDigest}
              title="Run the automated low-stock digest, auto-suggested RFQs, and deadline reminders now"
              style={{ padding:'9px 18px', borderRadius:'var(--r-md)', border:'none',
                background: runningDigest ? 'var(--text-faint)' : 'linear-gradient(135deg,var(--teal),var(--teal-2))',
                color:'#fff', fontSize:12, fontWeight:700,
                cursor: runningDigest ? 'not-allowed' : 'pointer', fontFamily:'var(--font)',
                display:'flex', alignItems:'center', gap:6 }}>
              <NavIcon name={runningDigest ? 'loading' : 'ai'} size={13} color="#fff" style={runningDigest ? { animation:'rpt-spin .8s linear infinite' } : undefined} />
              {runningDigest ? 'Running…' : 'Run Automation Now'}
            </button>
          </div>
          {digestMsg && (
            <p style={{ fontSize:12, color:'var(--teal)', fontWeight:600, margin:'8px 0 0',
              fontFamily:'var(--font)', textAlign:'right' }}>
              {digestMsg}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:22, borderBottom:'2px solid var(--border)',
          paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:'var(--r-md) var(--r-md) 0 0', border:'none',
                borderBottom: tab===t.k ? '2px solid var(--teal)' : '2px solid transparent',
                background: tab===t.k ? 'var(--teal-50)' : 'transparent',
                color: tab===t.k ? 'var(--teal)' : 'var(--text-subtle)',
                fontSize:13, fontWeight: tab===t.k ? 700 : 500, cursor:'pointer',
                fontFamily:'var(--font)', transition:'all .14s',
                marginBottom:'-2px' }}>
              <NavIcon name={t.icon} size={13} color={tab===t.k ? 'var(--teal)' : 'var(--text-subtle)'} />{t.l}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            <div className="rpt-kpi-grid">
              {[
                { l:'Total Revenue',    v:`₱${Number(summary.total_revenue).toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon:'salesPay', c:'var(--success)', bg:'var(--success-bg)' },
                { l:'Total Orders',     v:summary.total_orders,     icon:'orders',   c:'var(--info)',    bg:'var(--info-bg)'   },
                { l:'Completed Orders', v:summary.completed_orders, icon:'success',  c:'var(--teal)',    bg:'var(--teal-50)'   },
                { l:'Avg Order Value',  v:`₱${Number(summary.avg_order_value).toLocaleString('en-PH',{minimumFractionDigits:2})}`, icon:'trending', c:'var(--purple)', bg:'var(--purple-50)' },
              ].map(s => (
                <div key={s.l} style={{ ...card, padding:'18px' }}>
                  <span style={{ width:38, height:38, borderRadius:'var(--r-md)', background:s.bg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginBottom:12 }}><NavIcon name={s.icon} size={19} color={s.c} /></span>
                  {loading
                    ? <div style={{ ...SK, height:28, width:'65%', marginBottom:6 }}/>
                    : <p style={{ fontSize:24, fontWeight:800, color:'var(--ink)', margin:'0 0 4px' }}>{s.v}</p>
                  }
                  <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontWeight:500 }}>{s.l}</p>
                </div>
              ))}
            </div>

            {/* Monthly revenue chart */}
            {monthly.length > 0 && (
              <div style={{ ...card, padding:'20px' }}>
                <h3 style={{ fontSize:14, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>
                  Monthly Revenue
                </h3>
                <p style={{ fontSize:12, color:'var(--text-subtle)', marginBottom:16 }}>
                  Sales transactions by month
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthly} margin={{ top:0, right:0, left:-5, bottom:0 }}>
                    {/* CHART_GRID/CHART_TICK/CHART_BAR — see file header note
                        on why these 4 recharts SVG props stay literal hex. */}
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false}/>
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:CHART_TICK }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:CHART_TICK }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₱${(v/1000).toFixed(0)}k`}/>
                    <Tooltip
                      formatter={v => [`₱${Number(v).toLocaleString('en-PH',{minimumFractionDigits:2})}`, 'Revenue']}
                      contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)',
                        borderRadius:'var(--r-md)', fontSize:12, boxShadow:'var(--shadow-md)' }}/>
                    <Bar dataKey="total" fill={CHART_BAR} radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top materials */}
            {topMats.length > 0 && (
              <div style={{ ...card, padding:'20px' }}>
                <h3 style={{ fontSize:14, fontWeight:800, color:'var(--ink)', marginBottom:16 }}>
                  Top Consumed Materials
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {topMats.slice(0,6).map((m, i) => {
                    const max = topMats[0]?.total_consumed ?? 1;
                    const pct = Math.round((m.total_consumed / max) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>
                            {m.material_name}
                          </span>
                          <span style={{ fontSize:12, color:'var(--text-subtle)' }}>
                            {Number(m.total_consumed).toFixed(2)} {m.unit}
                          </span>
                        </div>
                        <div style={{ height:5, background:'var(--bg-surface)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`,
                            background:'linear-gradient(90deg,var(--teal),var(--teal-2))', borderRadius:'var(--r-full)' }}/>
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

            <div style={{ padding:'14px 18px', borderRadius:'var(--r-lg)',
              background:'var(--teal-50)', border:'1px solid var(--teal-100)' }}>
              <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'var(--teal)', marginBottom:6 }}>
                <NavIcon name="ai" size={13} color="var(--teal)" /> MRP Prescriptive Analysis
              </p>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
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
                <NavIcon name="success" size={40} color="var(--success)" style={{ opacity:.3, marginBottom:14 }} />
                <p style={{ fontSize:15, fontWeight:700, color:'var(--success)', marginBottom:6 }}>
                  All Materials Sufficient
                </p>
                <p style={{ fontSize:13, color:'var(--text-subtle)' }}>
                  Current stock levels meet all active order requirements.
                </p>
              </div>
            ) : (
              <>
                <div style={{ padding:'10px 14px', borderRadius:'var(--r-md)', background:'var(--warning-bg)',
                  border:'1px solid var(--warning-border)', display:'flex', alignItems:'center', gap:10 }}>
                  <NavIcon name="warning" size={18} color="var(--warning)" />
                  <p style={{ fontSize:13, color:'var(--warning)', fontWeight:600, margin:0 }}>
                    {alerts.length} material{alerts.length!==1?'s':''} require immediate attention
                    — create purchase orders before production is blocked.
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {alerts.map((a, i) => {
                    const isCritical = a.severity === 'critical';
                    const sevColor = isCritical ? 'var(--danger)' : 'var(--warning)';
                    return (
                    <div key={i} style={{ ...card, padding:'18px',
                      borderColor: `${sevColor} var(--border) var(--border) ${sevColor}`,
                      borderLeftWidth:4, borderStyle:'solid' }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                        <div>
                          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0 }}>
                            {a.material ?? a.material_name ?? "Unknown Material"}
                          </h3>
                          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'3px 0 0' }}>
                            Unit: {a.unit} · Category: {a.category ?? '—'}
                          </p>
                        </div>
                        <Badge tone={isCritical ? 'danger' : 'warning'}>
                          {isCritical ? 'Critical' : 'Warning'}
                        </Badge>
                      </div>

                      {/* Stock vs need comparison */}
                      <div className="rpt-alert-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                        {[
                          { l:'Current Stock',     v:`${a.in_stock ?? a.current_stock ?? 0} ${a.unit}`,    c:'var(--danger)' },
                          { l:'Total Required',    v:`${a.demanded_qty ?? a.total_required ?? 0} ${a.unit}`,   c:'var(--warning)' },
                          { l:'Recommended Order', v:`${a.recommend_order_qty ?? a.recommended_order ?? Math.ceil((a.deficit ?? 0) * 1.2)} ${a.unit}`, c:'var(--teal)' },
                        ].map(row => (
                          <div key={row.l} style={{ background:'var(--bg)', borderRadius:'var(--r-md)',
                            padding:'10px 12px', textAlign:'center' }}>
                            <p style={{ fontSize:16, fontWeight:800, color:row.c, margin:0 }}>{row.v}</p>
                            <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'3px 0 0',
                              fontWeight:500 }}>{row.l}</p>
                          </div>
                        ))}
                      </div>

                      {/* Stock deficit bar. Flat var(--success) fill — same
                          real simplification as Inventory.jsx's Stock-In
                          button, no --success-dark exists for a two-stop
                          gradient here. */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:11, color:'var(--text-subtle)' }}>Stock Coverage</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--danger)' }}>
                            Deficit: {a.deficit ?? Math.max(0,(a.demanded_qty ?? a.total_required ?? 0)-(a.in_stock ?? a.current_stock ?? 0))} {a.unit}
                          </span>
                        </div>
                        <div style={{ height:8, background:'var(--danger-bg)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:'var(--r-full)',
                            background:'var(--success)',
                            width:`${Math.min(100, Math.round(((a.in_stock ?? a.current_stock ?? 0)/((a.demanded_qty ?? a.total_required ?? 0) || 1))*100))}%`
                          }}/>
                        </div>
                      </div>

                      {/* Affected orders */}
                      {(a.affected_orders?.length > 0 || a.affected_order_ids?.length > 0) && (
                        <div style={{ background:'var(--bg)', borderRadius:'var(--r-sm)', padding:'8px 12px' }}>
                          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0 }}>
                            <strong style={{ color:'var(--ink)' }}>
                              {(a.affected_orders ?? a.affected_order_ids ?? []).length} order{(a.affected_orders ?? a.affected_order_ids ?? []).length!==1?'s':''} at risk:
                            </strong>
                            {' '}Orders #{(a.affected_orders ?? a.affected_order_ids ?? []).slice(0,5).join(', #')}
                            {(a.affected_orders ?? a.affected_order_ids ?? []).length > 5 ? ` and ${(a.affected_orders ?? a.affected_order_ids ?? []).length - 5} more` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}
