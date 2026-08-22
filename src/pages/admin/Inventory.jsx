// src/pages/admin/Inventory.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const SK   = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp  = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, boxSizing:'border-box', transition:'border .15s,box-shadow .15s' };
const fi   = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT };

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
        style={{ background:'#fff',borderRadius:18,width:'min(440px,100%)',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid #e2e8f0',
          background: isIn ? '#f0fdf4' : '#fef2f2' }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'#0f172a',margin:0 }}>
            {isIn ? '📥 Stock In (MIGO MT-101)' : '📤 Stock Out (MIGO MT-261)'}
          </h3>
          <p style={{ fontSize:11,color:'#64748b',margin:'3px 0 0' }}>
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
          {err && <p style={{ color:'#ef4444',fontSize:12,fontWeight:600 }}>⚠️ {err}</p>}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid #e2e8f0',display:'flex',gap:10,justifyContent:'flex-end',background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#0f172a',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px',borderRadius:9,border:'none',
              background: busy ? '#94a3b8' : isIn ? 'linear-gradient(135deg,#22c55e,#16a34a)' : `linear-gradient(135deg,${T},${T2})`,
              color:'#fff',fontSize:13,fontWeight:700,cursor:busy?'not-allowed':'pointer',fontFamily:FONT }}>
            {busy ? '⏳…' : isIn ? '✓ Record Receipt' : '✓ Issue Materials'}
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
    setLoading(true);
    // DSA: Promise.allSettled — parallel fetch O(max(t1,t2)) not O(t1+t2)
    Promise.allSettled([
      axios.get('/api/admin/inventory'),
      axios.get('/api/admin/inventory/logs'),
    ]).then(([m,l]) => {
      const mats = m.status==='fulfilled' ? (m.value.data?.data ?? m.value.data ?? []) : [];
      const lgList = l.status==='fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : [];
      setMaterials(mats);
      setLogs(lgList);
      cacheSet('inventory_full', { materials:mats, logs:lgList }, TTL.MATERIALS);
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
        @keyframes sk { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }

        .adm-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
          gap: 12px; margin-bottom: 20px;
        }
        .inv-table-wrap {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
          overflow-x: auto; -webkit-overflow-scrolling: touch;
        }
        .inv-table-wrap table { width:100%; min-width:560px; border-collapse:collapse; }
        .inv-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:8px; }

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
          <h1 style={{ fontSize:22,fontWeight:800,color:'#0f172a',margin:'0 0 4px' }}>Inventory</h1>
          <p style={{ color:'#64748b',fontSize:13,margin:0 }}>
            {totalMats} materials · {lowStock.length} below reorder threshold
          </p>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          <button onClick={()=>nav('/admin/physical-count')}
            style={{ padding:'9px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#0f172a',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:FONT,display:'flex',alignItems:'center',gap:6 }}>
            📋 Physical Count
          </button>
          <button onClick={()=>setModal('out')}
            style={{ padding:'9px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:T,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
            📤 Stock Out
          </button>
          <button onClick={()=>setModal('in')}
            style={{ padding:'10px 18px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${T},${T2})`,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT,boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
            📥 Stock In
          </button>
        </div>
      </div>

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div style={{ padding:'12px 16px',borderRadius:12,background:'#fef3c7',border:'1px solid #fde68a',marginBottom:18,display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <p style={{ fontSize:12,color:'#92400e',fontWeight:600,margin:0 }}>
            {lowStock.length} material{lowStock.length!==1?'s':''} below reorder threshold —{' '}
            {lowStock.slice(0,3).map(m=>m.material_name).join(', ')}
            {lowStock.length > 3 ? ` and ${lowStock.length-3} more` : ''}
          </p>
          <button onClick={()=>nav('/admin/procurement')}
            style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap' }}>
            Create PO →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex',gap:6,marginBottom:18,borderBottom:'2px solid #e2e8f0',paddingBottom:0 }}>
        {[['stock','📦 Stock Levels'],['logs','📜 Transaction Log']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:'9px 16px',borderRadius:'9px 9px 0 0',border:'none',borderBottom:tab===k?`2px solid ${T}`:'2px solid transparent',background:tab===k?'#f0fdfa':'transparent',color:tab===k?T:'#64748b',fontSize:13,fontWeight:tab===k?700:500,cursor:'pointer',fontFamily:FONT,marginBottom:'-2px' }}>
            {l}
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
            <p style={{ color:'#64748b',fontSize:13,fontWeight:600,textAlign:'center',padding:'30px 0' }}>No materials found</p>
          ) : isMobile ? filtered.map(m=>{
            const low = m.quantity_in_stock <= (m.reorder_threshold??0);
            return (
              <div key={m.material_id} className="inv-card">
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:700,color:'#0f172a',margin:0 }}>{m.material_name}</p>
                    <p style={{ fontSize:11,color:'#64748b',margin:'2px 0 0' }}>{m.category??'—'} · {m.unit}</p>
                  </div>
                  <span style={{ flexShrink:0,padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,
                    background:low?'#fee2e2':'#dcfce7',color:low?'#991b1b':'#166534' }}>
                    {low ? '⚠ Low' : '✓ OK'}
                  </span>
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12 }}>
                  <span style={{ fontWeight:800,color:low?'#ef4444':'#22c55e' }}>{m.quantity_in_stock} in stock</span>
                  <span style={{ color:'#94a3b8' }}>reorder @ {m.reorder_threshold??0}</span>
                </div>
              </div>
            );
          }) : (
          <div className="inv-table-wrap">
            <table>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Material','Category','In Stock','Reorder Threshold','Unit','Status'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',borderBottom:'2px solid #e2e8f0',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m=>{
                  const low = m.quantity_in_stock <= (m.reorder_threshold??0);
                  const pct = m.reorder_threshold > 0
                    ? Math.min(100,Math.round((m.quantity_in_stock/m.reorder_threshold)*100)) : 100;
                  return (
                    <tr key={m.material_id} style={{ borderBottom:'1px solid #f1f5f9' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontSize:13,fontWeight:700,color:'#0f172a',margin:0 }}>{m.material_name}</p>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'#64748b' }}>{m.category??'—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontSize:14,fontWeight:800,color:low?'#ef4444':'#22c55e',margin:0 }}>{m.quantity_in_stock}</p>
                        <div style={{ height:3,background:'#f1f5f9',borderRadius:99,marginTop:4,overflow:'hidden',width:60 }}>
                          <div style={{ height:'100%',width:`${pct}%`,background:low?'#ef4444':'#22c55e',borderRadius:99 }}/>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'#64748b' }}>{m.reorder_threshold??0}</td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'#64748b' }}>{m.unit}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:700,
                          background:low?'#fee2e2':'#dcfce7',color:low?'#991b1b':'#166534' }}>
                          {low ? '⚠ Low Stock' : '✓ OK'}
                        </span>
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
          <p style={{ color:'#64748b',fontSize:13,textAlign:'center',padding:'30px 0' }}>No transactions yet</p>
        ) : isMobile ? logs.slice(0,30).map((l,i)=>{
          const TYPE_C = { stock_in:'#22c55e',stock_out:'#ef4444',adjustment:'#f59e0b',wastage:'#8b5cf6' };
          const tc = TYPE_C[l.type]??'#64748b';
          return (
            <div key={l.log_id??i} className="inv-card">
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <p style={{ fontSize:13,fontWeight:700,color:'#0f172a',margin:0 }}>{l.material?.material_name??`#${l.material_id}`}</p>
                <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,background:`${tc}18`,color:tc,textTransform:'capitalize' }}>
                  {(l.type??'—').replace('_',' ')}
                </span>
              </div>
              <p style={{ fontSize:13,fontWeight:800,color:Number(l.change_qty)>=0?'#22c55e':'#ef4444',margin:'6px 0 2px' }}>
                {Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}
              </p>
              <p style={{ fontSize:11,color:'#64748b',margin:0 }}>{l.reason??'—'}</p>
              <p style={{ fontSize:10,color:'#94a3b8',margin:'4px 0 0' }}>
                {l.log_date ? new Date(l.log_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'} · {l.recorder?.name??'—'}
              </p>
            </div>
          );
        }) : (
        <div className="inv-table-wrap">
          <table>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Material','Type','Change','Reason','Date','By'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',borderBottom:'2px solid #e2e8f0',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0,30).map((l,i)=>{
                const TYPE_C = { stock_in:'#22c55e',stock_out:'#ef4444',adjustment:'#f59e0b',wastage:'#8b5cf6' };
                const tc = TYPE_C[l.type]??'#64748b';
                return (
                  <tr key={l.log_id??i} style={{ borderBottom:'1px solid #f1f5f9' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 14px',fontSize:12,fontWeight:600,color:'#0f172a' }}>
                      {l.material?.material_name??`#${l.material_id}`}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,background:`${tc}18`,color:tc,textTransform:'capitalize' }}>
                        {(l.type??'—').replace('_',' ')}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:13,fontWeight:800,color:Number(l.change_qty)>=0?'#22c55e':'#ef4444' }}>
                      {Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'#64748b',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {l.reason??'—'}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'#94a3b8',whiteSpace:'nowrap' }}>
                      {l.log_date ? new Date(l.log_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ padding:'10px 14px',fontSize:11,color:'#64748b' }}>
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