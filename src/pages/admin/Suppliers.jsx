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
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, ErrorBlock, Panel, SearchBox, Avatar, SkeletonRows, useIsMobile } from '../../components/admin/AdminUI';

const INIT = { supplier_name:'', contact_person:'', contact_number:'', email:'', address:'', payment_terms_with_supplier:'Net 30', materials_supplied:'' };

function SupplierModal({ item, onClose, onDone, isMobile }) {
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

  const F = ({ k, label, ...rest }) => (
    <div><label className="adm-field">{label}</label>
      <input className="adm-input" value={form[k] ?? ''} onChange={e => set(k, e.target.value)} {...rest} /></div>
  );
  return (
    <BottomSheet title={isEdit ? 'Edit Supplier' : 'Add Supplier'} onClose={onClose} isMobile={isMobile} maxWidth={560}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {F({ k:'supplier_name', label:'Supplier Name *', placeholder:'e.g. OTG Company' })}
        <div className="adm-form-grid">
          {F({ k:'contact_person', label:'Contact Person', placeholder:'Full name' })}
          {F({ k:'contact_number', label:'Contact Number', placeholder:'09XXXXXXXXX', inputMode:'tel' })}
        </div>
        <div className="adm-form-grid">
          {F({ k:'email', label:'Email', type:'email', placeholder:'supplier@email.com' })}
          <div>
            <label className="adm-field">Payment Terms</label>
            <select className="adm-input" value={form.payment_terms_with_supplier ?? 'Net 30'} onChange={e => set('payment_terms_with_supplier', e.target.value)}>
              {['Net 7','Net 14','Net 30','Net 60','COD','Wednesday close / Friday transfer','Upon delivery'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {F({ k:'address', label:'Address', placeholder:'City, Province' })}
        <div>
          <label className="adm-field">Materials Supplied</label>
          <textarea className="adm-input" rows={2} value={form.materials_supplied ?? ''} onChange={e => set('materials_supplied', e.target.value)} placeholder="e.g. Cotton fabric, elastic, thread…" />
        </div>
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);
  const [loadErr,   setLoadErr]   = useState(false);
  const isMobile = useIsMobile();

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('suppliers_list');
      if (cached) { setSuppliers(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    // DSA: O(1) cache hit; O(n) only on first load or forced refresh
    axios.get('/api/admin/suppliers')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setSuppliers(list);
        cacheSet('suppliers_list', list, 300_000); // 5 min — supplier list is stable
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter(s =>
    !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {modal && <SupplierModal isMobile={isMobile} item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); cacheClear('suppliers_list'); load(true); }}/>}
      <PageHeader title="Suppliers" sub={`${suppliers.length} supplier${suppliers.length!==1?'s':''} · Master data (admin-managed, no supplier login)`}>
        <button className="adm-btn primary" onClick={() => setModal('add')}><NavIcon name="add" size={14} color="currentColor" /> Add Supplier</button>
      </PageHeader>
      <div className="adm-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search suppliers or contacts…" /></div>
      {loadErr && <div style={{ marginBottom:14 }}><ErrorBlock msg="Could not load suppliers." onRetry={() => load(true)} /></div>}

      {loading ? (
        <div className="adm-cards-grid">{[1,2,3].map(i => <Panel key={i} flush><SkeletonRows rows={3} h={16} /></Panel>)}</div>
      ) : filtered.length === 0 ? (
        <Panel><div className="adm-empty"><NavIcon name="suppliers" size={30} color="currentColor" />
          <div style={{ marginTop:8, fontWeight:700 }}>{search ? `No suppliers match “${search}”` : 'No suppliers yet'}</div>
          {!search && <button className="adm-link-btn" onClick={() => setModal('add')}>Add your first supplier</button>}</div></Panel>
      ) : (
        <div className="adm-cards-grid adm-stagger" key={search}>
          {filtered.map((s, i) => (
            <div key={s.supplier_id} className="adm-mcard adm-card-lift" style={{ '--i':Math.min(i,8), marginBottom:0, cursor:'pointer' }}
              tabIndex={0} role="button" aria-label={`Edit ${s.supplier_name}`}
              onClick={() => setModal(s)} onKeyDown={e => { if (e.key === 'Enter') setModal(s); }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <Avatar name={s.supplier_name} size={42} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.supplier_name}</div>
                  {s.contact_person && <div style={{ fontSize:12, color:'var(--text-subtle)', marginTop:2 }}>{s.contact_person}</div>}
                </div>
                <span className="adm-icon-btn" aria-hidden="true"><NavIcon name="edit" size={14} color="currentColor" /></span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:14 }}>
                {s.contact_number && <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:12, color:'var(--text-subtle)' }}><NavIcon name="phone" size={13} color="var(--text-faint)" />{s.contact_number}</div>}
                {s.email && <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:12, color:'var(--text-subtle)', minWidth:0 }}><NavIcon name="email" size={13} color="var(--text-faint)" /><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.email}</span></div>}
              </div>
              {(s.payment_terms_with_supplier || s.materials_supplied) && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--bg-surface)' }}>
                  {s.payment_terms_with_supplier && <span className="adm-chip" style={{ background:'var(--teal-50)', color:'var(--teal-dark)' }}>{s.payment_terms_with_supplier}</span>}
                  {s.materials_supplied && <p style={{ fontSize:12, color:'var(--text-subtle)', margin:'8px 0 0', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{s.materials_supplied}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
