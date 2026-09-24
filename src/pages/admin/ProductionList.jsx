// src/pages/admin/ProductionList.jsx
// FF-BUG-FIX: /admin/production was blank because it rendered ProductionTracking
// with no orderId. This page shows all in-production orders first.
// Clicking "Track" navigates to /admin/production/:orderId (the detail page).
//
// DSA: useMemo filter O(n), STATUS_SEQ hash map O(1), Array.sort O(n log n)
//
// RESHAPED (Sept 4 2026): same taxonomy situation as ActivityLog.jsx —
// STAGE_CFG's 7 colors categorize the 7 real production stages, not a
// brand mismatch. theme.css only has 4 non-neutral hue families (teal/
// purple/success-green/warning-amber/danger-red/info-blue), not 7, so
// this couldn't be a clean 1:1 token swap. Mapping used, verified
// against real tokens, not guessed:
//   pattern → --purple | segregation → --purple-dark | cutting → --info
//   sewing → --teal | qc → --warning | packing → --success
// ONE FLAGGED COMPROMISE: pressing has no good token. --danger was
// deliberately ruled out — this same page already uses --danger for
// the QC HOLD warning box below, and reusing red for a normal
// "Pressing" stage badge right next to an actual problem-state warning
// would be actively misleading, not just imperfect. Pressing reuses
// --purple-dark (same as segregation) instead — the two stages are far
// apart in the sequence (2nd vs 6th), so the shared hue is unlikely to
// cause real confusion in practice. Flagging this as a genuine gap in
// theme.css's palette for anyone who wants a fully distinct 7-color
// system later, not silently resolving it as if 6 tokens were always
// going to be enough for 7 stages.
//
// Emoji → NavIcon, verified against the real installed lucide-react
// (0.462.0, satisfies package.json's ^0.383.0) rather than guessed —
// checked node_modules/lucide-react directly for Scissors/RefreshCw
// before using them, since neither existed in icons.jsx yet.
//
// Dropped an unused `TTL` import (utils/cache exports it, this file
// never referenced it — same dead-import pattern already found and
// removed in Feedback.jsx). Logic (load/filter/sort/cache) untouched.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion }                                     from 'framer-motion';
import { useNavigate }                                from 'react-router-dom';
import axios                                          from 'axios';
import { cacheGet, cacheSet }                         from '../../utils/cache';
import { Card, NavIcon }                              from '../../components/ui';

// DSA: hash map — O(1) status → color/icon
const STAGE_CFG = {
  pattern:     { color:'var(--purple)',      bg:'var(--purple-50)', icon:'pattern',    label:'Pattern'     },
  segregation: { color:'var(--purple-dark)', bg:'var(--purple-50)', icon:'folder',     label:'Segregation' },
  cutting:     { color:'var(--info)',        bg:'var(--info-bg)',   icon:'cutting',    label:'Cutting'     },
  sewing:      { color:'var(--teal)',        bg:'var(--teal-50)',   icon:'garmentType',label:'Sewing'      },
  qc:          { color:'var(--warning)',     bg:'var(--warning-bg)',icon:'qc',         label:'QC'          },
  pressing:    { color:'var(--purple-dark)', bg:'var(--purple-50)', icon:'adjustment', label:'Pressing'    },
  packing:     { color:'var(--success)',     bg:'var(--success-bg)',icon:'package',    label:'Packing'     },
};

// DSA: ordered array — O(7) indexOf, fixed bound = O(1)
const STAGE_ORDER = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];

const SK = {
  borderRadius:'var(--r-sm)',
  background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
  backgroundSize:'400px', animation:'prod-shimmer 1.4s infinite',
};

export default function ProductionList() {
  const nav = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stage,   setStage]   = useState('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = cacheGet('production_orders_list');
      if (cached) { setOrders(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadError(false);
    try {
      const r = await axios.get('/api/admin/orders?status=production&per_page=100');
      // Filter to only in-production statuses
      const all  = r.data?.data ?? r.data ?? [];
      const prod = all.filter(o => STAGE_ORDER.includes(o.status));
      setOrders(prod);
      cacheSet('production_orders_list', prod, 30_000);
    } catch { setLoadError(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // DSA: useMemo filter O(n) + sort O(n log n)
  const filtered = useMemo(() =>
    orders
      .filter(o => {
        const matchStage = stage === 'all' || o.status === stage;
        const q = search.toLowerCase().trim();
        const matchSearch = !q
          || String(o.order_id).includes(q)
          || o.garment_type?.toLowerCase().includes(q)
          || o.color?.toLowerCase().includes(q);
        return matchStage && matchSearch;
      })
      .sort((a, b) =>
        // Sort by stage order (pattern first, packing last)
        STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status)
      ),
  [orders, stage, search]);

  // Count per stage for filter tabs — DSA: reduce O(n) builds hash map
  const counts = useMemo(() =>
    orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {}),
  [orders]);

  return (
    <>
      <style>{`
        @keyframes prod-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .prod-stage-strip{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;margin-bottom:14px;}
        .prod-stage-strip::-webkit-scrollbar{display:none}
        @media(max-width:767px){
          .prod-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',
        marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--ink)',margin:'0 0 4px',fontFamily:'var(--font)' }}>
            Production Tracking
          </h1>
          <p style={{ color:'var(--text-subtle)',fontSize:13,margin:0,fontFamily:'var(--font)' }}>
            {orders.length} orders in production ·
            Stage Confirmation
          </p>
        </div>
        <button onClick={() => load(true)} style={{
          display:'flex',alignItems:'center',gap:6,
          padding:'9px 18px',borderRadius:'var(--r-md)',border:'1px solid var(--border)',
          background:'var(--bg-card)',color:'var(--ink)',fontSize:12,fontWeight:600,
          cursor:'pointer',fontFamily:'var(--font)',
        }}>
          <NavIcon name="refresh" size={13} color="var(--ink)" /> Refresh
        </button>
      </div>

      {/* Stage filter tabs */}
      <div className="prod-stage-strip">
        <button onClick={() => setStage('all')} style={{
          padding:'6px 14px',borderRadius:'var(--r-full)',border:`1px solid ${stage==='all'?'var(--teal)':'var(--border)'}`,
          background:stage==='all'?'var(--teal-50)':'var(--bg-card)',color:stage==='all'?'var(--teal)':'var(--text-subtle)',
          fontSize:11,fontWeight:stage==='all'?700:500,cursor:'pointer',fontFamily:'var(--font)',flexShrink:0,
        }}>
          All ({orders.length})
        </button>
        {STAGE_ORDER.map(s => {
          const cfg = STAGE_CFG[s];
          const cnt = counts[s] ?? 0;
          if (cnt === 0) return null;
          const active = stage === s;
          return (
            <button key={s} onClick={() => setStage(s)} style={{
              display:'flex',alignItems:'center',gap:5,
              padding:'6px 14px',borderRadius:'var(--r-full)',flexShrink:0,
              border:`1px solid ${active?cfg.color:'var(--border)'}`,
              background:active?cfg.bg:'var(--bg-card)',color:active?cfg.color:'var(--text-subtle)',
              fontSize:11,fontWeight:active?700:500,cursor:'pointer',fontFamily:'var(--font)',
            }}>
              <NavIcon name={cfg.icon} size={12} color={active ? cfg.color : 'var(--text-subtle)'} />
              {cfg.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search order ID, garment, color…"
        style={{ width:'100%',padding:'10px 14px',borderRadius:'var(--r-md)',
          border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--ink)',
          fontSize:13,outline:'none',fontFamily:'var(--font)',marginBottom:16,boxSizing:'border-box' }}
        onFocus={e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)';}}
        onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';}}
      />

      {/* Order cards grid */}
      {loading ? (
        <div className="prod-grid" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
          {Array(6).fill(0).map((_,i) => (
            <div key={i} style={{ ...SK,height:140,borderRadius:'var(--r-lg)' }}/>
          ))}
        </div>
      ) : loadError ? (
        <div style={{ padding:'12px 16px',borderRadius:'var(--r-md)',background:'var(--danger-bg)',border:'1px solid var(--danger-border)',marginBottom:18,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <NavIcon name="warning" size={17} color="var(--danger)" />
          <p style={{ fontSize:12,color:'var(--danger)',fontWeight:600,margin:0 }}>Couldn't load production orders — check your connection.</p>
          <button onClick={()=>load(true)}
            style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:'var(--r-sm)',border:'none',background:'var(--danger)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap' }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center',padding:'40px 20px' }}>
            <NavIcon name="production" size={36} color="var(--text-faint)" style={{ marginBottom:12 }} />
            <p style={{ fontSize:14,fontWeight:700,color:'var(--text-subtle)',fontFamily:'var(--font)' }}>
              {search ? `No results for "${search}"` : 'No orders in production right now'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="prod-grid" style={{ display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
          {filtered.map((order, i) => {
            const cfg      = STAGE_CFG[order.status] ?? STAGE_CFG.pattern;
            const stageIdx = STAGE_ORDER.indexOf(order.status);
            const pct      = Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100);

            return (
              <motion.div
                key={order.order_id}
                initial={{ opacity:0,y:10 }}
                animate={{ opacity:1,y:0 }}
                transition={{ delay:i*0.04 }}
                style={{
                  background:'var(--bg-card)',borderRadius:'var(--r-lg)',overflow:'hidden',
                  border:'1px solid var(--border)',
                  boxShadow:'var(--shadow-xs)',
                }}
              >
                {/* Stage color bar */}
                <div style={{ height:4,background:cfg.color }}/>

                <div style={{ padding:'14px 16px' }}>
                  {/* Row 1: Order # + stage badge */}
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                    <span style={{ fontSize:14,fontWeight:800,color:'var(--teal)',fontFamily:'var(--font)' }}>
                      #{order.order_id}
                    </span>
                    <span style={{
                      display:'flex',alignItems:'center',gap:5,
                      padding:'3px 10px',borderRadius:'var(--r-full)',fontSize:10,fontWeight:700,
                      background:cfg.bg,color:cfg.color,
                    }}>
                      <NavIcon name={cfg.icon} size={11} color={cfg.color} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Garment + specs */}
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--ink)',margin:'0 0 3px',fontFamily:'var(--font)' }}>
                    {order.garment_type ?? 'Custom Garment'}
                  </p>
                  <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'0 0 10px',fontFamily:'var(--font)' }}>
                    {order.quantity_ordered ?? 0} pcs
                    {order.color ? ` · ${order.color}` : ''}
                    {order.customer_name ? ` · ${order.customer_name}` : ''}
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                      <span style={{ fontSize:10,color:'var(--text-subtle)',fontFamily:'var(--font)' }}>
                        Stage {stageIdx+1} of {STAGE_ORDER.length}
                      </span>
                      <span style={{ fontSize:10,fontWeight:700,color:'var(--teal)',fontFamily:'var(--font)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height:5,background:'var(--bg-surface)',borderRadius:'var(--r-full)',overflow:'hidden' }}>
                      <motion.div
                        initial={{ width:0 }}
                        animate={{ width:`${pct}%` }}
                        transition={{ duration:.7,ease:'easeOut' }}
                        style={{ height:'100%',borderRadius:'var(--r-full)',
                          background:'linear-gradient(90deg,var(--teal),var(--teal-2))' }}
                      />
                    </div>
                  </div>

                  {/* QC hold warning */}
                  {order.status === 'qc' && order.qc_required === 1 && !order.qc_passed_at && (
                    <div style={{
                      display:'flex',alignItems:'center',gap:6,
                      padding:'6px 10px',borderRadius:'var(--r-sm)',marginBottom:10,
                      background:'var(--danger-bg)',border:'1px solid var(--danger-border)',
                      fontSize:11,color:'var(--danger)',fontWeight:700,fontFamily:'var(--font)',
                    }}>
                      <NavIcon name="warning" size={13} color="var(--danger)" />
                      QC HOLD — Complete QC Checklist to advance
                    </div>
                  )}

                  {/* Track button */}
                  <motion.button
                    whileTap={{ scale:.97 }}
                    onClick={() => nav(`/admin/production/${order.order_id}`)}
                    style={{
                      width:'100%',padding:'10px',borderRadius:'var(--r-md)',border:'none',
                      background:'linear-gradient(135deg,var(--teal),var(--teal-2))',
                      color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',
                      fontFamily:'var(--font)',minHeight:44,
                      boxShadow:'var(--shadow-teal)',
                    }}
                  >
                    Track — Order #{order.order_id}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
