// src/pages/admin/Suppliers.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const inp  = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi   = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT };

const INIT = { supplier_name:'', contact_person:'', contact_number:'', email:'', address:'', payment_terms_with_supplier:'Net 30', materials_supplied:'' };

function SupplierModal({ item, onClose, onDone }) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? { ...item } : { ...INIT });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    if (!form.supplier_name?.trim()) { setErr('Supplier name required.'); return; }
    setBusy(true); setErr('');
    try {
      isEdit
        ? await axios.put(`/api/admin/suppliers/${item.supplier_id}`, form)
        : await axios.post('/api/admin/suppliers', form);
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(560px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'none', background:'#f1f5f9', cursor:'pointer', fontSize:14, color:'#64748b' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={lbl}>Supplier Name *</label>
            <input value={form.supplier_name ?? ''} onChange={e => set('supplier_name', e.target.value)} placeholder="e.g. OTG Company" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl}>Contact Person</label>
              <input value={form.contact_person ?? ''} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Contact Number</label>
              <input value={form.contact_number ?? ''} onChange={e => set('contact_number', e.target.value)} placeholder="09XXXXXXXXX" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="supplier@email.com" style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Payment Terms</label>
              <select value={form.payment_terms_with_supplier ?? 'Net 30'} onChange={e => set('payment_terms_with_supplier', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {['Net 7','Net 14','Net 30','Net 60','COD','Wednesday close / Friday transfer','Upon delivery'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Address</label>
            <input value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="City, Province" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
          <div>
            <label style={lbl}>Materials Supplied</label>
            <textarea value={form.materials_supplied ?? ''} onChange={e => set('materials_supplied', e.target.value)}
              placeholder="e.g. Cotton fabric, elastic, thread…" rows={2}
              style={{ ...inp, resize:'vertical', minHeight:60 }} onFocus={fi} onBlur={fo}/>
          </div>
          {err && <p style={{ color:'#ef4444', fontSize:12, fontWeight:600 }}>⚠️ {err}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1 }}>
            {busy ? '⏳…' : isEdit ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('suppliers_list');
      if (cached) { setSuppliers(cached); setLoading(false); return; }
    }
    setLoading(true);
    // DSA: O(1) cache hit; O(n) only on first load or forced refresh
    axios.get('/api/admin/suppliers')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setSuppliers(list);
        cacheSet('suppliers_list', list, 300_000); // 5 min — supplier list is stable
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter(s =>
    !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {modal && <SupplierModal item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); cacheClear('suppliers_list'); load(true); }}/>}
      <div style={{ fontFamily:FONT, color:'#0f172a' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Suppliers</h1>
            <p style={{ color:'#64748b', fontSize:13 }}>{suppliers.length} supplier{suppliers.length!==1?'s':''} · Master data (admin-managed, no supplier login)</p>
          </div>
          <button onClick={() => setModal('add')} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>+ Add Supplier</button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…"
          style={{ ...inp, marginBottom:18 }} onFocus={fi} onBlur={fo}/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {loading ? [1,2,3].map(i => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              {[70,50,40].map(w => <div key={w} style={{ height:10, width:`${w}%`, borderRadius:5, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite', marginBottom:10 }}/>)}
            </div>
          )) : filtered.length === 0 ? (
            <div style={{ gridColumn:'1/-1', background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'40px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <p style={{ fontSize:36, margin:'0 0 10px', opacity:.3 }}>🏭</p>
              <p style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>No suppliers found</p>
            </div>
          ) : filtered.map(s => (
            <div key={s.supplier_id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.supplier_name}</p>
                  {s.contact_person && <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0' }}>Contact: {s.contact_person}</p>}
                </div>
                <button onClick={() => setModal(s)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#0f172a', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, flexShrink:0, marginLeft:10 }}>Edit</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {s.contact_number && <p style={{ fontSize:12, color:'#64748b', margin:0 }}>📞 {s.contact_number}</p>}
                {s.email && <p style={{ fontSize:12, color:'#64748b', margin:0 }}>✉️ {s.email}</p>}
                {s.payment_terms_with_supplier && (
                  <span style={{ display:'inline-block', marginTop:4, padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:'#f0fdfa', color:T, border:`1px solid #99f6e4` }}>
                    {s.payment_terms_with_supplier}
                  </span>
                )}
                {s.materials_supplied && <p style={{ fontSize:11, color:'#94a3b8', margin:'4px 0 0', lineHeight:1.5 }}>{s.materials_supplied}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
      /* ── Responsive — injected by v10 mobile sweep ── */
      .adm-stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .adm-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
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
        .adm-grid-2 { grid-template-columns: 1fr; gap: 14px; }
      }
      /* ── MOBILE ≤ 767px ── */
      @media (max-width: 767px) {
        .adm-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
        .adm-grid-2 { grid-template-columns: 1fr; gap: 12px; }
        .adm-filter { flex-direction: column; }
        .adm-filter input,
        .adm-filter select { min-width: 0; width: 100%; }
      }
@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </>
  );
}
