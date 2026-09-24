// src/pages/admin/Suppliers.jsx
//
// RESHAPED (Sept 2 2026): first pass at this file incorrectly
// reconstructed field names from memory instead of verifying against
// the real file (used `name`/`payment_terms`, dropped `materials_supplied`
// and the search bar entirely). Caught via `git diff` before shipping —
// this version is redone from the real original (`git show HEAD:...`),
// changing ONLY what was actually in scope: hex → theme.css tokens,
// emoji (🏭📞✉️⏳✕⚠️) → NavIcon, hand-rolled skeleton/pill → Card/Badge
// where that doesn't change behavior. Every field name, the
// payment-terms option list (matches VFRB's real documented terms —
// "Wednesday close / Friday transfer" is Ma'am Fe's actual OTG
// subcontract term from the interview, not a placeholder), the
// edit-via-button (not whole-card-click) interaction, the search bar,
// and the SupplierModal/AdminSuppliers two-component structure are
// all unchanged from the real file.
//
// Badge's `teal` tone (added this session, maps to theme.css's own
// unused .badge-teal class) and icons.jsx's `phone`/`email` entries
// (also added this session) are both used here for the first time.

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { Card, Badge, NavIcon } from '../../components/ui';

const inp = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:'var(--font)' };

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
        style={{ background:'var(--bg-card)', borderRadius:'var(--r-xl)', width:'min(560px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-xl)', overflow:'hidden' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0 }}>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'var(--r-sm)', border:'none', background:'var(--bg-surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-subtle)' }}>
            <NavIcon name="close" size={14} />
          </button>
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
          {err && (
            <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12, fontWeight:600, margin:0 }}>
              <NavIcon name="warning" size={13} color="var(--danger)" />{err}
            </p>
          )}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg-surface)' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:'var(--r-md)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', opacity:busy?.7:1, display:'flex', alignItems:'center', gap:7 }}>
            {busy && <NavIcon name="loading" size={13} color="#fff" style={{ animation:'sup-spin .8s linear infinite' }} />}
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
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
      <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}>
        <div className="sup-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Suppliers</h1>
            <p style={{ color:'var(--text-subtle)', fontSize:13 }}>{suppliers.length} supplier{suppliers.length!==1?'s':''} · Master data (admin-managed, no supplier login)</p>
          </div>
          <button onClick={() => setModal('add')} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:'var(--r-lg)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', boxShadow:'var(--shadow-teal)' }}>
            <NavIcon name="add" size={14} color="#fff" /> Add Supplier
          </button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers…"
          style={{ ...inp, marginBottom:18 }} onFocus={fi} onBlur={fo}/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {loading ? [1,2,3].map(i => (
            <Card key={i} padding="md">
              {[70,50,40].map(w => <div key={w} style={{ height:10, width:`${w}%`, borderRadius:'var(--r-xs)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'sup-shimmer 1.4s infinite', marginBottom:10 }}/>)}
            </Card>
          )) : filtered.length === 0 ? (
            <div style={{ gridColumn:'1/-1' }}>
              <Card>
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  <NavIcon name="suppliers" size={32} color="var(--text-faint)" style={{ marginBottom:10 }} />
                  <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600 }}>No suppliers found</p>
                </div>
              </Card>
            </div>
          ) : filtered.map(s => (
            <Card key={s.supplier_id} padding="md" className="sup-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.supplier_name}</p>
                  {s.contact_person && <p style={{ fontSize:12, color:'var(--text-subtle)', margin:'3px 0 0' }}>Contact: {s.contact_person}</p>}
                </div>
                <button onClick={() => setModal(s)} style={{ padding:'5px 12px', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--ink)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', flexShrink:0, marginLeft:10 }}>Edit</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {s.contact_number && (
                  <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-subtle)', margin:0 }}>
                    <NavIcon name="phone" size={12} color="var(--text-faint)" />{s.contact_number}
                  </p>
                )}
                {s.email && (
                  <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-subtle)', margin:0 }}>
                    <NavIcon name="email" size={12} color="var(--text-faint)" />{s.email}
                  </p>
                )}
                {s.payment_terms_with_supplier && (
                  <span style={{ marginTop:4 }}>
                    <Badge tone="teal">{s.payment_terms_with_supplier}</Badge>
                  </span>
                )}
                {s.materials_supplied && <p style={{ fontSize:11, color:'var(--text-faint)', margin:'4px 0 0', lineHeight:1.5 }}>{s.materials_supplied}</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <style>{`
      @keyframes sup-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      @keyframes sup-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      .sup-card{transition:box-shadow .15s, transform .15s;}
      .sup-card:hover{box-shadow:var(--shadow-md)!important;transform:translateY(-1px);}
      /* Header row: title+subtitle vs Add Supplier button. Grid already
         handles the card list responsively (auto-fill collapses to 1
         column on narrow screens on its own) — this is the only real
         mobile need this page has. */
      @media (max-width: 767px) {
        .sup-header { flex-direction: column; align-items: stretch !important; }
        .sup-header button { width: 100%; justify-content: center; }
      }
      `}</style>
    </>
  );
}
