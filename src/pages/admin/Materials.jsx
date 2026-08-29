// src/pages/admin/Materials.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T = '#028090', T2 = '#02C39A';
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif", transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 };
const SK = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };

const UNITS = ['meters','kg','grams','yards','pieces','rolls','packs'];
const CATS  = ['Fabric','Thread','Accessory','Elastic','Lining','Interfacing','Other'];

const INIT = { material_name:'', unit:'meters', category:'Fabric', quantity_in_stock:0, reorder_threshold:10, unit_cost:'' };

function MaterialModal({ item, onClose, onDone }) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? { ...item } : { ...INIT });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    if (!form.material_name?.trim()) { setErr('Material name required.'); return; }
    setBusy(true); setErr('');
    try {
      isEdit
        ? await axios.put(`/api/admin/materials/${item.material_id}`, form)
        : await axios.post('/api/admin/materials', form);
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(520px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>{isEdit ? 'Edit Material' : 'Add Material'}</h3>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'none', background:'#f1f5f9', cursor:'pointer', fontSize:14, color:'#64748b' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Material Name *</label>
            <input value={form.material_name ?? ''} onChange={e => set('material_name', e.target.value)} placeholder="e.g. Cotton Fabric" style={inp} onFocus={fi} onBlur={fo}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={lbl}>Unit</label>
              <select value={form.unit ?? 'meters'} onChange={e => set('unit', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label style={lbl}>Category</label>
              <select value={form.category ?? 'Fabric'} onChange={e => set('category', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div><label style={lbl}>In Stock</label>
              <input type="number" min={0} step={0.01} value={form.quantity_in_stock ?? 0} onChange={e => set('quantity_in_stock', Number(e.target.value))} style={inp} onFocus={fi} onBlur={fo}/></div>
            <div><label style={lbl}>Reorder Threshold</label>
              <input type="number" min={0} step={0.01} value={form.reorder_threshold ?? 0} onChange={e => set('reorder_threshold', Number(e.target.value))} style={inp} onFocus={fi} onBlur={fo}/></div>
            <div><label style={lbl}>Unit Cost (₱)</label>
              <input type="number" min={0} step={0.01} value={form.unit_cost ?? ''} onChange={e => set('unit_cost', e.target.value)} placeholder="0.00" style={inp} onFocus={fi} onBlur={fo}/></div>
          </div>
          {err && <p style={{ color:'#ef4444', fontSize:12, fontWeight:600 }}>⚠️ {err}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif" }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif", opacity:busy?.7:1 }}>
            {busy ? '⏳…' : isEdit ? 'Save Changes' : 'Add Material'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminMaterials() {
  const [mats,    setMats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null); // null | 'add' | item

  // MOBILE FIX (Aug 27 2026): this table had overflow:'hidden' (not
  // overflow-x:auto) and zero mobile handling of any kind — genuinely
  // clipping content at narrow widths, not just cramped. isMobile pattern
  // matches Inventory.jsx exactly, same card fallback approach.
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  const isMobile = winW <= 767;

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/admin/materials').then(r => setMats(r.data?.data ?? r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = mats.filter(m => !search || m.material_name?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      {modal && <MaterialModal item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }}/>}
      <div style={{ fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif", color:'#0f172a' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Materials</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>{mats.length} materials in master data</p>
          </div>
          <button onClick={() => setModal('add')} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif", boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>+ Add Material</button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials…"
          style={{ ...inp, marginBottom:18 }} onFocus={fi} onBlur={fo}/>
        {isMobile ? (
          loading ? (
            <div style={{ padding:40, textAlign:'center' }}>
              {[1,2,3].map(i => <div key={i} style={{ ...SK, height:60, marginBottom:10 }}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
              <p style={{ fontSize:36, margin:'0 0 10px', opacity:.3 }}>🧵</p>
              <p style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>No materials found</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(m => {
                const low = (m.quantity_in_stock ?? 0) <= (m.reorder_threshold ?? 0);
                return (
                  <div key={m.material_id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>{m.material_name}</p>
                        <p style={{ fontSize:11, color:'#64748b', margin:'2px 0 0' }}>{m.category ?? '—'} · {m.unit}</p>
                      </div>
                      <button onClick={() => setModal(m)} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#0f172a', fontSize:11, fontWeight:600, cursor:'pointer', minHeight:44 }}>Edit</button>
                    </div>
                    <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b' }}>
                      <span>Stock: <b style={{ color: low ? '#ef4444' : '#22c55e' }}>{m.quantity_in_stock ?? 0}</b>{low && <span style={{ marginLeft:4, fontSize:9, padding:'2px 7px', borderRadius:99, background:'#fee2e2', color:'#991b1b', fontWeight:700 }}>LOW</span>}</span>
                      <span>Reorder at: {m.reorder_threshold ?? 0}</span>
                      <span>{m.unit_cost ? `₱${Number(m.unit_cost).toFixed(2)}` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', overflowX:'auto', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead><tr style={{ background:'#f8fafc' }}>
              {['Material Name','Category','Unit','In Stock','Reorder Threshold','Unit Cost','Action'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center' }}>
                  {[1,2,3].map(i => <div key={i} style={{ ...SK, height:12, width:'80%', margin:'0 auto 10px' }}/>)}
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center' }}>
                  <p style={{ fontSize:36, margin:'0 0 10px', opacity:.3 }}>🧵</p>
                  <p style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>No materials found</p>
                </td></tr>
              ) : filtered.map((m, i) => {
                const low = (m.quantity_in_stock ?? 0) <= (m.reorder_threshold ?? 0);
                return (
                  <tr key={m.material_id} style={{ borderBottom:'1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'11px 14px' }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>{m.material_name}</p>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>{m.category ?? '—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>{m.unit}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontSize:13, fontWeight:700, color: low ? '#ef4444' : '#22c55e' }}>
                        {m.quantity_in_stock ?? 0}
                      </span>
                      {low && <span style={{ marginLeft:6, fontSize:9, padding:'2px 7px', borderRadius:99, background:'#fee2e2', color:'#991b1b', fontWeight:700 }}>LOW</span>}
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>{m.reorder_threshold ?? 0}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>
                      {m.unit_cost ? `₱${Number(m.unit_cost).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <button onClick={() => setModal(m)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#0f172a', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,sans-serif" }}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
}
