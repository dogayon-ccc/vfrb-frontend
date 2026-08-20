// src/pages/admin/MaterialRates.jsx
// Deterministic BOM engine — staff-configurable material usage rates.
// See backend: database/migrations/2026_08_01_000001_create_material_usage_rates_table.php
//              app/Http/Controllers/Api/InventoryController.php (ratesIndex/ratesUpsert/ratesDestroy)
//              app/Http/Controllers/Api/AIController.php (computeDeterministicQty — the consumer)
//
// This is the missing piece flagged in the Aug 1 2026 audit: the AI/BOM
// recommendation flow can select real materials and notify staff, but until
// a rate exists here for (material, garment_type), every recommendation
// shows "Not yet configured" instead of a number. This page is where that
// gets fixed — one rate at a time, set by a human, never guessed by AI.
//
// garment_type is deliberately a DROPDOWN sourced from real orders
// (GET /api/admin/orders/garment-types), not free text — the audit found
// old seeded orders use 'polo_shirt' while the current OrderWizard.jsx
// submits 'Polo Shirt'; free-typing a rate here risks silently matching
// neither. Picking from real values sidesteps that entirely.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T = '#028090', T2 = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo  = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 };
const SK  = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };

const CAT_CFG = {
  Fabric:      { icon:'🧶', color:'#3b82f6' },
  Thread:      { icon:'🪡', color:'#8b5cf6' },
  Elastic:     { icon:'〰️',  color:'#f97316' },
  Accessories: { icon:'🔩', color:'#64748b' },
  Trims:       { icon:'✂️', color:'#06b6d4' },
  Trim:        { icon:'✂️', color:'#06b6d4' },
  Other:       { icon:'📦', color:'#94a3b8' },
};

function RateForm({ materials, garmentTypes, onDone }) {
  const [materialId,   setMaterialId]   = useState('');
  const [garmentType,  setGarmentType]  = useState('');
  const [customGT,     setCustomGT]     = useState(false);
  const [customValue,  setCustomValue]  = useState('');
  const [qtyPerUnit,   setQtyPerUnit]   = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const selectedMat = materials.find(m => String(m.material_id) === String(materialId));
  const gt = customGT ? customValue : garmentType;

  const submit = async () => {
    if (!materialId)   { setErr('Pick a material.');      return; }
    if (!gt?.trim())   { setErr('Pick or enter a garment type.'); return; }
    if (!qtyPerUnit || Number(qtyPerUnit) <= 0) { setErr('Enter a quantity greater than 0.'); return; }

    setBusy(true); setErr('');
    try {
      await axios.post('/api/admin/material-rates', {
        material_id:  materialId,
        garment_type: gt.trim(),
        qty_per_unit: qtyPerUnit,
        unit:         selectedMat.unit,
      });
      setMaterialId(''); setGarmentType(''); setCustomGT(false); setCustomValue(''); setQtyPerUnit('');
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to save.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
      padding:20, marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
      <p style={{ fontSize:13, fontWeight:800, color:'#0f172a', margin:'0 0 14px', fontFamily:FONT }}>
        ➕ Set a Usage Rate
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
        <div>
          <label style={lbl}>Material</label>
          <select value={materialId} onChange={e=>setMaterialId(e.target.value)}
            style={inp} onFocus={fi} onBlur={fo}>
            <option value="">Select material…</option>
            {materials.map(m => (
              <option key={m.material_id} value={m.material_id}>
                {m.material_name} ({m.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={lbl}>Garment Type</label>
          {!customGT ? (
            <select value={garmentType}
              onChange={e => {
                if (e.target.value === '__custom__') { setCustomGT(true); return; }
                setGarmentType(e.target.value);
              }}
              style={inp} onFocus={fi} onBlur={fo}>
              <option value="">Select garment type…</option>
              {garmentTypes.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="__custom__">✏️ Type a new one…</option>
            </select>
          ) : (
            <div style={{ display:'flex', gap:6 }}>
              <input value={customValue} onChange={e=>setCustomValue(e.target.value)}
                placeholder="e.g. Polo Shirt" style={inp} onFocus={fi} onBlur={fo}/>
              <button type="button" onClick={()=>{setCustomGT(false); setCustomValue('');}}
                style={{ padding:'0 12px', borderRadius:10, border:'1px solid #e2e8f0',
                  background:'#f8fafc', color:'#64748b', fontSize:12, cursor:'pointer', fontFamily:FONT }}>
                ✕
              </button>
            </div>
          )}
          {customGT && (
            <p style={{ fontSize:10, color:'#f59e0b', margin:'5px 0 0', fontFamily:FONT }}>
              ⚠️ Must exactly match the garment_type on real orders, or this rate will never be found.
            </p>
          )}
        </div>

        <div>
          <label style={lbl}>Qty per Piece {selectedMat ? `(${selectedMat.unit})` : ''}</label>
          <input type="number" min={0} step={0.0001} value={qtyPerUnit}
            onChange={e=>setQtyPerUnit(e.target.value)} placeholder="e.g. 2.5"
            style={inp} onFocus={fi} onBlur={fo}/>
        </div>
      </div>

      {err && <p style={{ color:'#ef4444', fontSize:12, marginTop:10, fontFamily:FONT }}>⚠️ {err}</p>}

      <button onClick={submit} disabled={busy}
        style={{ marginTop:14, padding:'10px 22px', borderRadius:10, border:'none',
          background: busy ? '#94a3b8' : `linear-gradient(135deg,${T},${T2})`,
          color:'#fff', fontSize:12, fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily:FONT }}>
        {busy ? '⏳ Saving…' : '💾 Save Rate'}
      </button>
    </div>
  );
}

export default function MaterialRates() {
  const [rates,        setRates]        = useState([]);
  const [materials,    setMaterials]    = useState([]);
  const [garmentTypes, setGarmentTypes] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, g] = await Promise.all([
        axios.get('/api/admin/material-rates'),
        axios.get('/api/admin/materials?per_page=200'),
        axios.get('/api/admin/orders/garment-types'),
      ]);
      setRates(r.data?.rates ?? []);
      setMaterials(m.data?.data ?? m.data ?? []);
      setGarmentTypes(g.data?.garment_types ?? []);
    } catch {
      setToast({ msg:'Could not load rates. Please refresh.', type:'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const onSaved = () => {
    setToast({ msg:'Rate saved.', type:'success' });
    load();
  };

  const remove = async (rateId) => {
    const prev = rates;
    setRates(rs => rs.filter(r => r.rate_id !== rateId)); // optimistic
    try {
      await axios.delete(`/api/admin/material-rates/${rateId}`);
      setToast({ msg:'Rate removed.', type:'success' });
    } catch {
      setRates(prev); // rollback
      setToast({ msg:'Could not remove rate.', type:'error' });
    }
  };

  // Group by garment_type for a scannable layout — staff typically thinks
  // "what does a polo shirt need", not "what uses this fabric"
  const byGarment = rates.reduce((acc, r) => {
    (acc[r.garment_type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily:FONT, color:'#0f172a' }}>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:'0 0 4px', fontFamily:FONT }}>
          📐 Material Usage Rates
        </h1>
        <p style={{ color:'#64748b', fontSize:13, margin:0, fontFamily:FONT }}>
          How much of each material one garment piece needs. This is what turns the AI's
          material picks and customer selections into real numbers for deduction and
          feasibility checks — the AI never sets these, only staff do.
        </p>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ ...SK, height:160, borderRadius:16 }}/>
          <div style={{ ...SK, height:80, borderRadius:16 }}/>
        </div>
      ) : (
        <>
          <RateForm materials={materials} garmentTypes={garmentTypes} onDone={onSaved}/>

          {Object.keys(byGarment).length === 0 ? (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
              padding:'40px 24px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:10, opacity:.3 }}>📐</div>
              <p style={{ fontSize:13, color:'#64748b', fontFamily:FONT }}>
                No rates configured yet. Every AI/BOM recommendation will show
                "Not yet configured" until you add some above.
              </p>
            </div>
          ) : (
            Object.entries(byGarment).map(([gt, list]) => (
              <div key={gt} style={{ background:'#fff', border:'1px solid #e2e8f0',
                borderRadius:16, padding:'16px 20px', marginBottom:14,
                boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
                <p style={{ fontSize:13, fontWeight:800, color:'#0f172a', margin:'0 0 10px', fontFamily:FONT }}>
                  👕 {gt}
                </p>
                {list.map(r => {
                  const cfg = CAT_CFG[r.category] ?? CAT_CFG.Other;
                  return (
                    <div key={r.rate_id} style={{ display:'flex', alignItems:'center',
                      justifyContent:'space-between', padding:'9px 0',
                      borderTop:'1px solid #f1f5f9' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <span style={{ fontSize:15 }}>{cfg.icon}</span>
                        <span style={{ fontSize:13, color:'#0f172a', fontFamily:FONT }}>{r.material_name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:cfg.color, fontFamily:FONT }}>
                          {r.qty_per_unit} {r.unit} / pc
                        </span>
                        <button onClick={()=>remove(r.rate_id)}
                          style={{ width:26, height:26, borderRadius:8, border:'none',
                            background:'#fef2f2', color:'#dc2626', fontSize:12, cursor:'pointer' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            style={{ position:'fixed', bottom:24, right:24, zIndex:300,
              padding:'12px 18px', borderRadius:12,
              background: toast.type==='error' ? '#fef2f2' : '#f0fdf4',
              border:`1px solid ${toast.type==='error' ? '#fecaca' : '#bbf7d0'}`,
              color: toast.type==='error' ? '#dc2626' : '#16a34a',
              fontSize:12, fontWeight:600, fontFamily:FONT, boxShadow:'0 8px 24px rgba(0,0,0,.12)' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
