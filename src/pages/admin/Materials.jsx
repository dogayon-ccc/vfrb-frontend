// src/pages/admin/Materials.jsx
//
// RESHAPED (Sept 4 2026): same gap as every other admin page — zero
// var(--) token usage, raw hex throughout. Unlike ActivityLog.jsx, the
// color usage here is simple and maps directly (teal brand, red/green
// for low/OK stock) — no taxonomy judgment calls needed this time.
//
// Preserved exactly, verified via `git show` before writing anything
// (not reconstructed from memory — see the Suppliers.jsx mistake two
// pages back): the MaterialModal/AdminMaterials two-component
// structure, all real field names (material_name, unit, category,
// quantity_in_stock, reorder_threshold, unit_cost, material_id), the
// UNITS/CATS option lists, and — importantly — the existing mobile-card
// vs desktop-table dual rendering (isMobile via window resize
// listener). That responsive split was a real Aug 27 2026 fix
// (documented in the original file's own comment: the table used to
// clip content at narrow widths with overflow:hidden) — kept both
// paths fully intact, just tokenized. "Mobile first" here means work
// order, not deleting desktop support that already exists and works.
//
// LOW-stock indicator now uses the shared Badge (tone="danger")
// instead of a hand-rolled pill — close match to the original's own
// sizing, confirmed by reading Badge's actual render output first.
// Skeleton shimmer keyframe renamed sk → mat-shimmer, matching the
// page-prefixed naming already used in Suppliers.jsx/ActivityLog.jsx
// (avoids a global @keyframes collision if two admin pages' styles
// were ever both in the DOM at once).

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card, Badge, NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';

const inp = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:'var(--font)' };
const SK  = { borderRadius:'var(--r-sm)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'mat-shimmer 1.4s infinite' };

const UNITS = ['meters','kg','grams','yards','pieces','rolls','packs'];
const CATS  = ['Fabric','Thread','Accessory','Elastic','Lining','Interfacing','Other'];

const INIT = { material_name:'', unit:'meters', category:'Fabric', quantity_in_stock:0, reorder_threshold:10, unit_cost:'' };

function MaterialModal({ item, onClose, onDone, isMobile }) {
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
    <BottomSheet title={isEdit ? 'Edit Material' : 'Add Material'} onClose={onClose} isMobile={isMobile} maxWidth={520}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Material Name *</label>
            <input value={form.material_name ?? ''} onChange={e => set('material_name', e.target.value)} placeholder="e.g. Cotton Fabric" style={inp} onFocus={fi} onBlur={fo}/></div>
          <div className="mat-modal-grid2">
            <div><label style={lbl}>Unit</label>
              <select value={form.unit ?? 'meters'} onChange={e => set('unit', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label style={lbl}>Category</label>
              <select value={form.category ?? 'Fabric'} onChange={e => set('category', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="mat-modal-grid3">
            <div><label style={lbl}>In Stock</label>
              <input type="number" min={0} step={0.01} value={form.quantity_in_stock ?? 0} onChange={e => set('quantity_in_stock', Number(e.target.value))} style={inp} onFocus={fi} onBlur={fo}/></div>
            <div><label style={lbl}>Reorder Threshold</label>
              <input type="number" min={0} step={0.01} value={form.reorder_threshold ?? 0} onChange={e => set('reorder_threshold', Number(e.target.value))} style={inp} onFocus={fi} onBlur={fo}/></div>
            <div><label style={lbl}>Unit Cost (₱)</label>
              <input type="number" min={0} step={0.01} value={form.unit_cost ?? ''} onChange={e => set('unit_cost', e.target.value)} placeholder="0.00" style={inp} onFocus={fi} onBlur={fo}/></div>
          </div>
          {err && (
            <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12, fontWeight:600, margin:0 }}>
              <NavIcon name="warning" size={13} color="var(--danger)" />{err}
            </p>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:'var(--r-md)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', opacity:busy?.7:1, display:'flex', alignItems:'center', gap:7 }}>
              {busy && <NavIcon name="loading" size={13} color="#fff" style={{ animation:'mat-spin .8s linear infinite' }} />}
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Material'}
            </button>
          </div>
        </div>
    </BottomSheet>
  );
}

export default function AdminMaterials() {
  const [mats,    setMats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null); // null | 'add' | item

  // MOBILE FIX (Aug 27 2026, unchanged this pass): this table used to
  // have overflow:'hidden' and zero mobile handling — real clipping at
  // narrow widths, not just cramped. isMobile pattern matches
  // Inventory.jsx exactly, same card-fallback approach.
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
      <style>{`@keyframes mat-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes mat-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .mat-modal-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .mat-modal-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
        @media(max-width:480px){.mat-modal-grid2,.mat-modal-grid3{grid-template-columns:1fr;}}
      `}</style>
      {modal && <MaterialModal item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} isMobile={isMobile}/>}
      <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Materials</h1>
            <p style={{ color:'var(--text-subtle)', fontSize:13 }}>{mats.length} materials in master data</p>
          </div>
          <button onClick={() => setModal('add')} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:'var(--r-lg)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', boxShadow:'var(--shadow-teal)' }}>
            <NavIcon name="add" size={14} color="#fff" /> Add Material
          </button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials…"
          style={{ ...inp, marginBottom:18 }} onFocus={fi} onBlur={fo}/>

        {isMobile ? (
          loading ? (
            <div style={{ padding:40, textAlign:'center' }}>
              {[1,2,3].map(i => <div key={i} style={{ ...SK, height:60, marginBottom:10 }}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <NavIcon name="materials" size={32} color="var(--text-faint)" style={{ marginBottom:8 }} />
                <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600 }}>No materials found</p>
              </div>
            </Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(m => {
                const low = (m.quantity_in_stock ?? 0) <= (m.reorder_threshold ?? 0);
                return (
                  <Card key={m.material_id} padding="sm">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', margin:0 }}>{m.material_name}</p>
                        <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'2px 0 0' }}>{m.category ?? '—'} · {m.unit}</p>
                      </div>
                      <button onClick={() => setModal(m)} style={{ padding:'6px 14px', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--ink)', fontSize:11, fontWeight:600, cursor:'pointer', minHeight:44, fontFamily:'var(--font)' }}>Edit</button>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:12, color:'var(--text-subtle)', flexWrap:'wrap' }}>
                      <span>Stock: <b style={{ color: low ? 'var(--danger)' : 'var(--success)' }}>{m.quantity_in_stock ?? 0}</b></span>
                      {low && <Badge tone="danger">LOW</Badge>}
                      <span>Reorder at: {m.reorder_threshold ?? 0}</span>
                      <span>{m.unit_cost ? `₱${Number(m.unit_cost).toFixed(2)}` : '—'}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <Card padding="sm" bodyStyle={{ padding:0 }} style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
              <thead><tr style={{ background:'var(--bg-surface)' }}>
                {['Material Name','Category','Unit','In Stock','Reorder Threshold','Unit Cost','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding:40, textAlign:'center' }}>
                    {[1,2,3].map(i => <div key={i} style={{ ...SK, height:12, width:'80%', margin:'0 auto 10px' }}/>)}
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center' }}>
                    <NavIcon name="materials" size={32} color="var(--text-faint)" style={{ marginBottom:8 }} />
                    <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600 }}>No materials found</p>
                  </td></tr>
                ) : filtered.map(m => {
                  const low = (m.quantity_in_stock ?? 0) <= (m.reorder_threshold ?? 0);
                  return (
                    <tr key={m.material_id} style={{ borderBottom:'1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-surface)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)', margin:0 }}>{m.material_name}</p>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)' }}>{m.category ?? '—'}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)' }}>{m.unit}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:13, fontWeight:700, color: low ? 'var(--danger)' : 'var(--success)' }}>{m.quantity_in_stock ?? 0}</span>
                          {low && <Badge tone="danger">LOW</Badge>}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)' }}>{m.reorder_threshold ?? 0}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)' }}>
                        {m.unit_cost ? `₱${Number(m.unit_cost).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <button onClick={() => setModal(m)} style={{ padding:'5px 12px', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--ink)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
