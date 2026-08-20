// src/pages/admin/ProductionList.jsx
// FF-BUG-FIX: /admin/production was blank because it rendered ProductionTracking
// with no orderId. This page shows all in-production orders first.
// Clicking "Track" navigates to /admin/production/:orderId (the detail page).
//
// DSA: useMemo filter O(n), STATUS_SEQ hash map O(1), Array.sort O(n log n)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence }                   from 'framer-motion';
import { useNavigate }                               from 'react-router-dom';
import axios                                         from 'axios';
import { cacheGet, cacheSet, TTL }                  from '../../utils/cache';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// DSA: hash map — O(1) status → color/icon
const STAGE_CFG = {
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', icon:'📐', label:'Pattern'     },
  segregation: { color:'#a78bfa', bg:'#f5f3ff', icon:'🗂️', label:'Segregation' },
  cutting:     { color:'#6366f1', bg:'#e0e7ff', icon:'✂️', label:'Cutting'     },
  sewing:      { color:'#06b6d4', bg:'#cffafe', icon:'🧵', label:'Sewing'      },
  qc:          { color:'#f97316', bg:'#ffedd5', icon:'🔍', label:'QC'          },
  pressing:    { color:'#ec4899', bg:'#fce7f3', icon:'🔧', label:'Pressing'    },
  packing:     { color:'#f472b6', bg:'#fdf2f8', icon:'📦', label:'Packing'     },
};

// DSA: ordered array — O(7) indexOf, fixed bound = O(1)
const STAGE_ORDER = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];

const SK = {
  borderRadius:6,
  background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

export default function ProductionList() {
  const nav = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage,   setStage]   = useState('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = cacheGet('production_orders_list');
      if (cached) { setOrders(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const r = await axios.get('/api/admin/orders?status=production&per_page=100');
      // Filter to only in-production statuses
      const all  = r.data?.data ?? r.data ?? [];
      const prod = all.filter(o => STAGE_ORDER.includes(o.status));
      setOrders(prod);
      cacheSet('production_orders_list', prod, 30_000);
    } catch {} finally { setLoading(false); }
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
        @keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}
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
          <h1 style={{ fontSize:22,fontWeight:800,color:'#0f172a',margin:'0 0 4px',fontFamily:FONT }}>
            Production Tracking
          </h1>
          <p style={{ color:'#64748b',fontSize:13,margin:0,fontFamily:FONT }}>
            {orders.length} orders in production ·
            SAP CO11N — Stage Confirmation
          </p>
        </div>
        <button onClick={() => load(true)} style={{
          padding:'9px 18px',borderRadius:10,border:'1px solid #e2e8f0',
          background:'#fff',color:'#0f172a',fontSize:12,fontWeight:600,
          cursor:'pointer',fontFamily:FONT,display:'flex',alignItems:'center',gap:6,
        }}>⟳ Refresh</button>
      </div>

      {/* Stage filter tabs */}
      <div className="prod-stage-strip">
        <button onClick={() => setStage('all')} style={{
          padding:'6px 14px',borderRadius:99,border:`1px solid ${stage==='all'?T+'44':'#e2e8f0'}`,
          background:stage==='all'?'#f0fdfa':'#fff',color:stage==='all'?T:'#64748b',
          fontSize:11,fontWeight:stage==='all'?700:500,cursor:'pointer',fontFamily:FONT,flexShrink:0,
        }}>
          All ({orders.length})
        </button>
        {STAGE_ORDER.map(s => {
          const cfg = STAGE_CFG[s];
          const cnt = counts[s] ?? 0;
          if (cnt === 0) return null;
          return (
            <button key={s} onClick={() => setStage(s)} style={{
              padding:'6px 14px',borderRadius:99,flexShrink:0,
              border:`1px solid ${stage===s?cfg.color+'44':'#e2e8f0'}`,
              background:stage===s?cfg.bg:'#fff',color:stage===s?cfg.color:'#64748b',
              fontSize:11,fontWeight:stage===s?700:500,cursor:'pointer',fontFamily:FONT,
            }}>
              {cfg.icon} {cfg.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search order ID, garment, color…"
        style={{ width:'100%',padding:'10px 14px',borderRadius:11,
          border:'1px solid #e2e8f0',background:'#fff',color:'#0f172a',
          fontSize:13,outline:'none',fontFamily:FONT,marginBottom:16,boxSizing:'border-box' }}
        onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
        onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none';}}
      />

      {/* Order cards grid */}
      {loading ? (
        <div className="prod-grid" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
          {Array(6).fill(0).map((_,i) => (
            <div key={i} style={{ ...SK,height:140,borderRadius:14 }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center',padding:'60px 20px',background:'#fff',
          borderRadius:14,border:'1px solid #e2e8f0' }}>
          <p style={{ fontSize:36,margin:'0 0 12px',opacity:.2 }}>⚙️</p>
          <p style={{ fontSize:14,fontWeight:700,color:'#64748b',fontFamily:FONT }}>
            {search ? `No results for "${search}"` : 'No orders in production right now'}
          </p>
        </div>
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
                  background:'#fff',borderRadius:14,overflow:'hidden',
                  border:'1px solid #e2e8f0',
                  boxShadow:'0 1px 4px rgba(0,0,0,.05)',
                }}
              >
                {/* Stage color bar */}
                <div style={{ height:4,background:cfg.color }}/>

                <div style={{ padding:'14px 16px' }}>
                  {/* Row 1: Order # + stage badge */}
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                    <span style={{ fontSize:14,fontWeight:800,color:T,fontFamily:FONT }}>
                      #{order.order_id}
                    </span>
                    <span style={{
                      padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,
                      background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}28`,
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* Garment + specs */}
                  <p style={{ fontSize:13,fontWeight:600,color:'#0f172a',margin:'0 0 3px',fontFamily:FONT }}>
                    {order.garment_type ?? 'Custom Garment'}
                  </p>
                  <p style={{ fontSize:11,color:'#64748b',margin:'0 0 10px',fontFamily:FONT }}>
                    {order.quantity_ordered ?? 0} pcs
                    {order.color ? ` · ${order.color}` : ''}
                    {order.customer_name ? ` · ${order.customer_name}` : ''}
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                      <span style={{ fontSize:10,color:'#64748b',fontFamily:FONT }}>
                        Stage {stageIdx+1} of {STAGE_ORDER.length}
                      </span>
                      <span style={{ fontSize:10,fontWeight:700,color:T,fontFamily:FONT }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height:5,background:'#f1f5f9',borderRadius:99,overflow:'hidden' }}>
                      <motion.div
                        initial={{ width:0 }}
                        animate={{ width:`${pct}%` }}
                        transition={{ duration:.7,ease:'easeOut' }}
                        style={{ height:'100%',borderRadius:99,
                          background:`linear-gradient(90deg,${T},${T2})` }}
                      />
                    </div>
                  </div>

                  {/* QC hold warning */}
                  {order.status === 'qc' && order.qc_required === 1 && !order.qc_passed_at && (
                    <div style={{
                      padding:'6px 10px',borderRadius:8,marginBottom:10,
                      background:'#fee2e2',border:'1px solid #fecaca',
                      fontSize:11,color:'#dc2626',fontWeight:700,fontFamily:FONT,
                    }}>
                      ⛔ QC HOLD — Complete QC Checklist to advance
                    </div>
                  )}

                  {/* Track button */}
                  <motion.button
                    whileTap={{ scale:.97 }}
                    onClick={() => nav(`/admin/production/${order.order_id}`)}
                    style={{
                      width:'100%',padding:'10px',borderRadius:10,border:'none',
                      background:`linear-gradient(135deg,${T},${T2})`,
                      color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',
                      fontFamily:FONT,minHeight:40,
                      boxShadow:`0 3px 10px rgba(2,128,144,.25)`,
                    }}
                  >
                    ▶ Track — Order #{order.order_id}
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
