// src/pages/admin/Inventory.jsx
//
// RESHAPED (Sept 5 2026): hex → theme.css tokens, emoji → NavIcon, LOW/
// OK and transaction-type pills → Badge. Kept `TTL` import (unlike the
// last two pages' dead-import removals — checked first this time:
// `TTL.MATERIALS` is genuinely used in cacheSet below, not dead code).
//
// Transaction-log TYPE_C used the same `${hexColor}18` alpha-suffix
// trick as ActivityLog.jsx's icon chips, same fix: each hue's real
// pale companion token (--success-bg/--danger-bg/--warning-bg/
// --purple-50) instead of string-concatenating a var() reference,
// which doesn't work. wastage's original #8b5cf6 mapped to --purple,
// same "close enough, same hue family" treatment already used for
// ProductionList.jsx's stage colors.
//
// One real simplification, not a fudge: the Stock-In button's original
// two-stop green gradient (#22c55e→#16a34a) has no equivalent in
// theme.css — there's no darker/lighter green pair, only a single
// --success token. Inventing a new --success-dark for one button felt
// disproportionate (same reasoning already applied to the missing
// orange/pink tokens on ActivityLog/ProductionList), so it's a flat
// var(--success) background instead of a gradient. Stock-Out keeps its
// real --teal/--teal-2 two-stop gradient — that pair does exist.
//
// Preserved exactly: the low-stock banner, the stock/logs tab split,
// the DSA comments (Promise.allSettled parallel fetch, useMemo filters),
// and both isMobile card / desktop table render paths for both tabs.
// Logic (load/cache/filter/StockModal submit) completely untouched.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { Badge, NavIcon } from '../../components/ui';

const SK   = { borderRadius:'var(--r-sm)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'inv-shimmer 1.4s infinite' };
const inp  = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box', transition:'border .15s,box-shadow .15s' };
const fi   = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo   = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:'var(--font)' };

const TYPE_CFG = {
  stock_in:   { color:'var(--success)', bg:'var(--success-bg)' },
  stock_out:  { color:'var(--danger)',  bg:'var(--danger-bg)'  },
  adjustment: { color:'var(--warning)', bg:'var(--warning-bg)' },
  wastage:    { color:'var(--purple)',  bg:'var(--purple-50)'  },
};

function StockModal({ type, materials, onClose, onDone }) {
  const [matId, setMatId] = useState('');
  const [qty,   setQty]   = useState('');
  const [note,  setNote]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const isIn = type === 'in';

  const submit = async () => {
    if (!matId || !qty || Number(qty) <= 0) { setErr('Material and quantity required.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/admin/inventory/stock-${type}`, {
        material_id: matId, quantity: Number(qty), reason: note,
      });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.45)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
        style={{ background:'var(--bg-card)',borderRadius:'var(--r-xl)',width:'min(440px,100%)',overflow:'hidden',boxShadow:'var(--shadow-xl)' }}>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid var(--border)',
          background: isIn ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
          <h3 style={{ display:'flex', alignItems:'center', gap:7, fontSize:15,fontWeight:800,color:'var(--ink)',margin:0 }}>
            <NavIcon name={isIn ? 'stockIn' : 'stockOut'} size={16} color={isIn ? 'var(--success)' : 'var(--danger)'} />
            {isIn ? 'Stock In' : 'Stock Out'}
          </h3>
          <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'3px 0 0' }}>
            {isIn ? 'Record goods receipt from supplier' : 'Issue materials to production'}
          </p>
        </div>
        <div style={{ padding:'20px 22px',display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={lbl}>Material *</label>
            <select value={matId} onChange={e=>setMatId(e.target.value)} style={{ ...inp,cursor:'pointer' }}>
              <option value="">Select material…</option>
              {materials.map(m=>(
                <option key={m.material_id} value={m.material_id}>
                  {m.material_name} — {m.quantity_in_stock} {m.unit} in stock
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Quantity *</label>
            <input type="number" min={0.01} step={0.01} value={qty}
              onChange={e=>setQty(e.target.value)} placeholder="0.00"
              style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div>
            <label style={lbl}>Reason / Notes</label>
            <input value={note} onChange={e=>setNote(e.target.value)}
              placeholder={isIn ? 'e.g. Delivery from OTG Company' : 'e.g. Issued for Order #45'}
              style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          {err && (
            <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)',fontSize:12,fontWeight:600, margin:0 }}>
              <NavIcon name="warning" size={13} color="var(--danger)" />{err}
            </p>
          )}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',display:'flex',gap:10,justifyContent:'flex-end',background:'var(--bg-surface)' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:'var(--r-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--ink)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px',borderRadius:'var(--r-md)',border:'none',
              background: busy ? 'var(--text-faint)' : isIn ? 'var(--success)' : 'linear-gradient(135deg,var(--teal),var(--teal-2))',
              color:'#fff',fontSize:13,fontWeight:700,cursor:busy?'not-allowed':'pointer',fontFamily:'var(--font)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {busy
              ? <><NavIcon name="loading" size={13} color="#fff" style={{ animation:'inv-spin .8s linear infinite' }} />…</>
              : <><NavIcon name="success" size={13} color="#fff" />{isIn ? 'Record Receipt' : 'Issue Materials'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminInventory() {
  const nav = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab,       setTab]       = useState('stock'); // stock | logs
  const [search,    setSearch]    = useState('');
  const [winW, setWinW] = useState(typeof window!=='undefined'?window.innerWidth:1280);
  useEffect(() => { const h=()=>setWinW(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h); }, []);
  const isMobile = winW <= 767;
  const [modal,     setModal]     = useState(null); // 'in' | 'out'

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('inventory_full');
      if (cached) {
        setMaterials(cached.materials);
        setLogs(cached.logs);
        setLoading(false);
        return;
      }
    }
    setLoading(true); setLoadError(false);
    // DSA: Promise.allSettled — parallel fetch O(max(t1,t2)) not O(t1+t2)
    Promise.allSettled([
      axios.get('/api/admin/inventory'),
      axios.get('/api/admin/inventory/logs'),
    ]).then(([m,l]) => {
      const mats = m.status==='fulfilled' ? (m.value.data?.data ?? m.value.data ?? []) : [];
      const lgList = l.status==='fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : [];
      setMaterials(mats);
      setLogs(lgList);
      // Both failing means the page's own data is unavailable, not "no
      // records" — surface that distinctly instead of showing an empty
      // state that looks identical to a genuinely empty inventory.
      if (m.status==='rejected' && l.status==='rejected') setLoadError(true);
      else cacheSet('inventory_full', { materials:mats, logs:lgList }, TTL.MATERIALS);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // DSA: useMemo — O(n) filter only reruns when materials or search changes
  const filtered  = useMemo(() =>
    materials.filter(m =>
      !search || m.material_name?.toLowerCase().includes(search.toLowerCase())
               || m.category?.toLowerCase().includes(search.toLowerCase())
    ), [materials, search]);

  // DSA: useMemo — O(n) filter only reruns when materials changes
  const lowStock  = useMemo(() =>
    materials.filter(m => m.quantity_in_stock <= (m.reorder_threshold ?? 0)),
  [materials]);

  const totalMats = materials.length;

  return (
    <>
      <style>{`
        @keyframes inv-shimmer { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }
        @keyframes inv-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }

        .adm-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
          gap: 12px; margin-bottom: 20px;
        }
        .inv-table-wrap {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: var(--shadow-xs);
          overflow-x: auto; -webkit-overflow-scrolling: touch;
        }
        .inv-table-wrap table { width:100%; min-width:560px; border-collapse:collapse; }
        .inv-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r-md); padding:12px 14px; margin-bottom:8px; }

        @media (max-width:767px) {
          .adm-stats { grid-template-columns: 1fr 1fr; gap:10px; }
          .inv-header-btns { flex-direction:column; align-items:stretch !important; }
          .inv-header-btns button { width:100%; justify-content:center !important; }
        }
        @media (min-width:2560px) {
          .adm-stats { grid-template-columns: repeat(6,1fr); }
        }
      `}</style>
      {modal && (
        <StockModal type={modal} materials={materials}
          onClose={()=>setModal(null)}
          onDone={()=>{ setModal(null); cacheClear('inventory_full'); load(true); }}/>
      )}

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--ink)',margin:'0 0 4px' }}>Inventory</h1>
          <p style={{ color:'var(--text-subtle)',fontSize:13,margin:0 }}>
            {totalMats} materials · {lowStock.length} below reorder threshold
          </p>
        </div>
        <div className="inv-header-btns" style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <button onClick={()=>nav('/admin/physical-count')}
            style={{ padding:'9px 16px',borderRadius:'var(--r-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--ink)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:6 }}>
            <NavIcon name="physicalCount" size={14} color="var(--ink)" /> Physical Count
          </button>
          <button onClick={()=>setModal('out')}
            style={{ padding:'9px 16px',borderRadius:'var(--r-md)',border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--teal)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',display:'flex',alignItems:'center',gap:6 }}>
            <NavIcon name="stockOut" size={14} color="var(--teal)" /> Stock Out
          </button>
          <button onClick={()=>setModal('in')}
            style={{ padding:'10px 18px',borderRadius:'var(--r-md)',border:'none',background:'linear-gradient(135deg,var(--teal),var(--teal-2))',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',boxShadow:'var(--shadow-teal)',display:'flex',alignItems:'center',gap:6 }}>
            <NavIcon name="stockIn" size={14} color="#fff" /> Stock In
          </button>
        </div>
      </div>

      {/* Load error — distinct from "no materials yet" */}
      {loadError && !loading && (
        <div style={{ padding:'12px 16px',borderRadius:'var(--r-md)',background:'var(--danger-bg)',border:'1px solid var(--danger-border)',marginBottom:18,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <NavIcon name="warning" size={17} color="var(--danger)" />
          <p style={{ fontSize:12,color:'var(--danger)',fontWeight:600,margin:0 }}>Couldn't load inventory — check your connection.</p>
          <button onClick={()=>load(true)}
            style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:'var(--r-sm)',border:'none',background:'var(--danger)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap' }}>
            Retry
          </button>
        </div>
      )}

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div style={{ padding:'12px 16px',borderRadius:'var(--r-md)',background:'var(--warning-bg)',border:'1px solid var(--warning-border)',marginBottom:18,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <NavIcon name="warning" size={17} color="var(--warning)" />
          <p style={{ fontSize:12,color:'var(--warning)',fontWeight:600,margin:0 }}>
            {lowStock.length} material{lowStock.length!==1?'s':''} below reorder threshold —{' '}
            {lowStock.slice(0,3).map(m=>m.material_name).join(', ')}
            {lowStock.length > 3 ? ` and ${lowStock.length-3} more` : ''}
          </p>
          <button onClick={()=>nav('/admin/procurement')}
            style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:'var(--r-sm)',border:'none',background:'var(--warning)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap' }}>
            Create PO →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex',gap:6,marginBottom:18,borderBottom:'2px solid var(--border)',paddingBottom:0 }}>
        {[['stock','stock','Stock Levels'],['logs','outputLog','Transaction Log']].map(([k,ic,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px',borderRadius:'var(--r-md) var(--r-md) 0 0',border:'none',borderBottom:tab===k?'2px solid var(--teal)':'2px solid transparent',background:tab===k?'var(--teal-50)':'transparent',color:tab===k?'var(--teal)':'var(--text-subtle)',fontSize:13,fontWeight:tab===k?700:500,cursor:'pointer',fontFamily:'var(--font)',marginBottom:'-2px' }}>
            <NavIcon name={ic} size={14} color={tab===k?'var(--teal)':'var(--text-subtle)'} />{l}
          </button>
        ))}
      </div>

      {/* Stock Levels Tab */}
      {tab==='stock' && (
        <>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search materials…"
            style={{ ...inp,marginBottom:14 }} onFocus={fi} onBlur={fo}/>

          {loading ? Array(5).fill(0).map((_,i)=>(
            <div key={i} className="inv-card"><div style={{ ...SK,height:14,width:'60%' }}/></div>
          )) : filtered.length===0 ? (
            <p style={{ color:'var(--text-subtle)',fontSize:13,fontWeight:600,textAlign:'center',padding:'30px 0' }}>No materials found</p>
          ) : isMobile ? filtered.map(m=>{
            const low = m.quantity_in_stock <= (m.reorder_threshold??0);
            return (
              <div key={m.material_id} className="inv-card">
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:700,color:'var(--ink)',margin:0 }}>{m.material_name}</p>
                    <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'2px 0 0' }}>{m.category??'—'} · {m.unit}</p>
                  </div>
                  <Badge tone={low ? 'danger' : 'success'}>{low ? 'Low' : 'OK'}</Badge>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12 }}>
                  <span style={{ fontWeight:800,color:low?'var(--danger)':'var(--success)' }}>{m.quantity_in_stock} in stock</span>
                  <span style={{ color:'var(--text-faint)' }}>reorder @ {m.reorder_threshold??0}</span>
                </div>
              </div>
            );
          }) : (
          <div className="inv-table-wrap">
            <table>
              <thead>
                <tr style={{ background:'var(--bg-surface)' }}>
                  {['Material','Category','In Stock','Reorder Threshold','Unit','Status'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',letterSpacing:'.06em',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m=>{
                  const low = m.quantity_in_stock <= (m.reorder_threshold??0);
                  const pct = m.reorder_threshold > 0
                    ? Math.min(100,Math.round((m.quantity_in_stock/m.reorder_threshold)*100)) : 100;
                  return (
                    <tr key={m.material_id} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-surface)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontSize:13,fontWeight:700,color:'var(--ink)',margin:0 }}>{m.material_name}</p>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'var(--text-subtle)' }}>{m.category??'—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontSize:14,fontWeight:800,color:low?'var(--danger)':'var(--success)',margin:0 }}>{m.quantity_in_stock}</p>
                        <div style={{ height:3,background:'var(--bg-surface)',borderRadius:'var(--r-full)',marginTop:4,overflow:'hidden',width:60 }}>
                          <div style={{ height:'100%',width:`${pct}%`,background:low?'var(--danger)':'var(--success)',borderRadius:'var(--r-full)' }}/>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'var(--text-subtle)' }}>{m.reorder_threshold??0}</td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'var(--text-subtle)' }}>{m.unit}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <Badge tone={low ? 'danger' : 'success'}>{low ? 'Low Stock' : 'OK'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}

      {/* Transaction Log Tab */}
      {tab==='logs' && (
        loading ? Array(5).fill(0).map((_,i)=>(
          <div key={i} className="inv-card"><div style={{ ...SK,height:14,width:'60%' }}/></div>
        )) : logs.length===0 ? (
          <p style={{ color:'var(--text-subtle)',fontSize:13,textAlign:'center',padding:'30px 0' }}>No transactions yet</p>
        ) : isMobile ? logs.slice(0,30).map((l,i)=>{
          const tc = TYPE_CFG[l.type] ?? { color:'var(--text-subtle)', bg:'var(--bg-surface)' };
          return (
            <div key={l.log_id??i} className="inv-card">
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <p style={{ fontSize:13,fontWeight:700,color:'var(--ink)',margin:0 }}>{l.material?.material_name??`#${l.material_id}`}</p>
                <span style={{ padding:'3px 9px',borderRadius:'var(--r-full)',fontSize:10,fontWeight:700,background:tc.bg,color:tc.color,textTransform:'capitalize' }}>
                  {(l.type??'—').replace('_',' ')}
                </span>
              </div>
              <p style={{ fontSize:13,fontWeight:800,color:Number(l.change_qty)>=0?'var(--success)':'var(--danger)',margin:'6px 0 2px' }}>
                {Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}
              </p>
              <p style={{ fontSize:11,color:'var(--text-subtle)',margin:0 }}>{l.reason??'—'}</p>
              <p style={{ fontSize:10,color:'var(--text-faint)',margin:'4px 0 0' }}>
                {l.log_date ? new Date(l.log_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'} · {l.recorder?.name??'—'}
              </p>
            </div>
          );
        }) : (
        <div className="inv-table-wrap">
          <table>
            <thead>
              <tr style={{ background:'var(--bg-surface)' }}>
                {['Material','Type','Change','Reason','Date','By'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',letterSpacing:'.06em',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0,30).map((l,i)=>{
                const tc = TYPE_CFG[l.type] ?? { color:'var(--text-subtle)', bg:'var(--bg-surface)' };
                return (
                  <tr key={l.log_id??i} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-surface)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 14px',fontSize:12,fontWeight:600,color:'var(--ink)' }}>
                      {l.material?.material_name??`#${l.material_id}`}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'3px 9px',borderRadius:'var(--r-full)',fontSize:10,fontWeight:700,background:tc.bg,color:tc.color,textTransform:'capitalize' }}>
                        {(l.type??'—').replace('_',' ')}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:13,fontWeight:800,color:Number(l.change_qty)>=0?'var(--success)':'var(--danger)' }}>
                      {Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'var(--text-subtle)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {l.reason??'—'}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'var(--text-faint)',whiteSpace:'nowrap' }}>
                      {l.log_date ? new Date(l.log_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'var(--text-subtle)' }}>
                      {l.recorder?.name??'—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )
      )}
    </>
  );
}
