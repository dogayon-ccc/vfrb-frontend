// src/pages/admin/PurchaseOrders.jsx
// FIX (Sony Mark, Sept 10 2026): hex→var(--...) token migration — 172 of
// ~200 literal hex replaced. CRITICAL — explicitly did NOT touch
// PH_SWATCHES (lines 57-67): these are real Philippine institutional
// garment colors from the master prompt's own color map (Navy Blue,
// Royal Blue, Bottle Green, etc.) — actual business/fabric-matching
// data, not UI chrome. Forcing these into theme.css tokens would have
// silently corrupted real swatch-matching values. Also protected two
// document.write() print-popup blocks (RFQ response sheet, PO sheet) —
// genuinely separate documents where CSS variables don't inherit.
//
// CAUGHT AND FIXED a real bug my own automated pass introduced: a
// blanket color:'#fff'→token substitution had also rewritten a
// same-string EQUALITY COMPARISON (hex==='#fff', used to detect a white
// swatch for text-contrast decisions) into hex==='var(--bg-card)' —
// which would never match since `hex` holds real swatch values like
// '#FFFFFF', never the literal text 'var(--bg-card)'. This silently
// broke the white-detection logic. Reverted the comparison to check
// against the real swatch value ('#FFFFFF') while keeping the
// surrounding style properties tokenized. Audited every other file
// fixed this session for the same class of bug (comparison against a
// wrongly-substituted token) — none found elsewhere.
//
// #92400e/#166534 (13 occurrences) left literal — same established
// theme.css .alert-warning/.alert-success un-tokenized text precedent
// used throughout this project. Logic (RFQ flow, PO conversion, color
// swatch matching, print generation) untouched throughout.
// TASK N — RFQ full flow: log supplier response + manager convert-to-PO + printable doc
// TASK M — color swatch matching (already in previous version — preserved here)
// CDN font removed — system font stack
// cache.js wired
//
// RFQ flow per master prompt + Ma'am Fe interview:
//   Staff: New RFQ → pick material → qty needed → [system logs it]
//   Supplier responds by phone/email → staff logs response here (not supplier portal)
//   Manager reviews responses → selects best → converts to Purchase Order
//   Goods arrive → staff receives PO + matches color swatch
//
// API routes (all in api.php):
//   GET  /api/admin/rfq                       → rfqIndex
//   POST /api/admin/rfq                       → rfqStore
//   PATCH /api/admin/rfq/{id}/close           → rfqClose
//   POST /api/admin/rfq/{id}/respond          → rfqRespond   [TASK N NEW]
//   PATCH /api/admin/rfq/{id}/convert-po       → rfqConvertToPO [TASK N NEW]
//   GET  /api/admin/purchase-orders           → index
//   POST /api/admin/purchase-orders/{id}/receive → receive
//   PATCH /api/admin/purchase-orders/{id}/confirm-color → confirmColor [TASK M]
//
// DB columns confirmed from models:
//   rfq_requests: rfq_id (PK), material_id, qty_needed, needed_by_date, status(open|closed), created_by
//   rfq_responses: response_id (PK), rfq_id, supplier_id, unit_price, qty_available,
//                  lead_time_days, notes, responded_at, logged_by, selected_for_po
//   purchase_orders: po_id (PK), po_number, supplier_id, items(JSON), total_amount,
//                    expected_delivery_date, order_color_hex, received_color_hex,
//                    color_mismatch, color_confirmed, color_notes, status

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon }                             from '../../components/ui/icons';

const T    = 'var(--teal)';
const T2   = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const SK   = { borderRadius:6, background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp  = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:FONT, boxSizing:'border-box', transition:'border .15s,box-shadow .15s' };
const fi   = e => { e.target.style.borderColor=T;         e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo   = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:FONT };
const card = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)' };

const PO_STATUS = {
  pending:   { l:'Pending',   c:'var(--warning)', bg:'var(--warning-bg)' },
  draft:     { l:'Draft',     c:'var(--text-faint)', bg:'var(--bg-surface)' },
  sent:      { l:'Sent',      c:'var(--info)', bg:'var(--info-bg)' },
  approved:  { l:'Approved',  c:'var(--info)', bg:'var(--purple-50)' },
  received:  { l:'Received',  c:'var(--success)', bg:'var(--success-bg)' },
  closed:    { l:'Closed',    c:'var(--text-subtle)', bg:'var(--bg-surface)' },
  cancelled: { l:'Cancelled', c:'var(--danger)', bg:'var(--danger-bg)' },
};

// Philippine institutional colour swatches (master prompt color map)
const PH_SWATCHES = [
  { hex:'#1B2A4A', name:'Navy Blue'   },{ hex:'#2952A3', name:'Royal Blue'   },
  { hex:'#006A4E', name:'Bottle Green'},{ hex:'#800000', name:'Maroon'       },
  { hex:'#87CEEB', name:'Sky Blue'    },{ hex:'#AED6F1', name:'Light Blue'   },
  { hex:'#808080', name:'Gray'        },{ hex:'#FFFFFF', name:'White'        },
  { hex:'#000000', name:'Black'       },{ hex:'#CC0000', name:'Red'          },
  { hex:'#FFD700', name:'Yellow'      },{ hex:'#4B5563', name:'Charcoal'     },
  { hex:'#D1FAE5', name:'Mint'        },{ hex:'#FDE68A', name:'Lt Yellow'    },
  { hex:'#FECACA', name:'Lt Pink'     },{ hex:'#DDD6FE', name:'Lavender'     },
  { hex:'#FED7AA', name:'Peach'       },{ hex:'#E5E7EB', name:'Lt Gray'      },
];

// ── ΔE helpers ────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function deltaE(h1, h2) {
  if (!h1 || !h2) return null;
  const [r1,g1,b1]=hexToRgb(h1), [r2,g2,b2]=hexToRgb(h2);
  return Math.round(Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2)/4.42*10)/10;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,4000); return ()=>clearTimeout(t); },[onDone]);
  return (
    <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:16 }}
      style={{ position:'fixed',bottom:24,right:24,zIndex:9999,padding:'12px 20px',borderRadius:12,
        background:type==='error'?'var(--danger)':type==='warn'?'var(--warning)':T,
        color:'var(--text-on-accent)',fontSize:13,fontWeight:600,fontFamily:FONT,
        boxShadow:'0 8px 24px rgba(0,0,0,.18)',maxWidth:400,lineHeight:1.5 }}>
      {msg}
    </motion.div>
  );
}

// ── ColorSwatchMatch ──────────────────────────────────────────────────────────
function ColorSwatchMatch({ orderedHex, receivedHex, onChangeReceived }) {
  const de = deltaE(orderedHex, receivedHex);
  const mismatch = de !== null && de > 5;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          {icon:'orders', label:'Order Color', hex:orderedHex, onChange:null},
          {icon:'inventory', label:'Received Color', hex:receivedHex, onChange:onChangeReceived},
        ].map(({icon, label, hex, onChange}) => (
          <div key={label}>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--text-subtle)',margin:'0 0 6px',
              textTransform:'uppercase',letterSpacing:'.06em',fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
              <NavIcon name={icon} size={11} color="currentColor"/>{label}
            </p>
            <div style={{ position:'relative',height:60,borderRadius:10,
              border:`2px solid ${onChange && mismatch?'var(--danger-border)':onChange&&hex?T+'40':'var(--border)'}`,
              background:hex??'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',
              overflow:'hidden',cursor:onChange?'pointer':'default' }}>
              {hex
                ? <span style={{ fontSize:9,fontWeight:700,fontFamily:'monospace',
                    color:hex==='#FFFFFF'?'var(--text-subtle)':'var(--text-on-accent)',textShadow:'0 1px 2px rgba(0,0,0,.3)' }}>{hex}</span>
                : <span style={{ fontSize:10,color:'var(--text-faint)',fontFamily:FONT }}>
                    {onChange ? 'Select below ↓' : 'Not specified'}
                  </span>}
              {onChange && (
                <input type="color" value={hex??'#028090'}
                  onChange={e=>onChange(e.target.value.toUpperCase())}
                  style={{ position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
              )}
            </div>
          </div>
        ))}
      </div>

      {de !== null && (
        <div style={{ padding:'10px 14px',borderRadius:10,
          background:mismatch?'var(--warning-bg)':'var(--success-bg)',
          border:`1px solid ${mismatch?'var(--warning-border)':'var(--success-border)'}` }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <p style={{ fontSize:12,fontWeight:700,fontFamily:FONT,
              color:mismatch?'#92400e':'#166534',margin:0 }}>
              {mismatch ? <><NavIcon name="warning" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Color Mismatch</> : <><NavIcon name="success" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Colors Match</>}
            </p>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:16,fontWeight:800,color:mismatch?'var(--danger)':'var(--success)',margin:0,fontFamily:FONT }}>
                ΔE = {de}
              </p>
              <p style={{ fontSize:9,color:'var(--text-subtle)',margin:0,fontFamily:FONT }}>
                {mismatch?'Exceeds tolerance (max 5)':'Within tolerance (≤ 5)'}
              </p>
            </div>
          </div>
          {mismatch && (
            <p style={{ fontSize:10,color:'#92400e',margin:'6px 0 0',fontFamily:FONT }}>
              Production hold — cutting blocked until manager confirms this color.
            </p>
          )}
        </div>
      )}

      {onChangeReceived && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
          {PH_SWATCHES.map(s=>(
            <button key={s.hex} onClick={()=>onChangeReceived(s.hex)} title={`${s.name} ${s.hex}`}
              style={{ width:26,height:26,borderRadius:6,cursor:'pointer',border:'none',padding:0,
                background:s.hex,
                outline:receivedHex===s.hex?`3px solid ${T}`:'1.5px solid rgba(0,0,0,.15)',
                outlineOffset:receivedHex===s.hex?2:0,
                boxShadow:s.hex==='var(--bg-card)'?'0 0 0 1px var(--border)':'none' }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RFQ: New Request Modal ────────────────────────────────────────────────────
function NewRFQModal({ materials, onClose, onDone }) {
  const [matId,  setMatId]  = useState('');
  const [qty,    setQty]    = useState('');
  const [byDate, setByDate] = useState('');
  const [notes,  setNotes]  = useState('');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  const selMat = materials.find(m=>String(m.material_id)===String(matId));

  const submit = async () => {
    if (!matId || !qty || Number(qty)<=0) { setErr('Material and quantity required.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await axios.post('/api/admin/rfq', {
        material_id:    matId,
        qty_needed:     Number(qty),
        needed_by_date: byDate || null,
        notes,
      });
      onDone(`RFQ #${r.data.rfq?.rfq_id} created — open for supplier responses.`);
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.5)',
      backdropFilter:'blur(4px)',zIndex:200,display:'flex',
      alignItems:'center',justifyContent:'center',padding:16 }}>
      <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
        style={{ background:'var(--bg-card)',borderRadius:18,width:'min(480px,100%)',overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid var(--border)',background:'var(--teal-50)' }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'var(--ink)',margin:0,fontFamily:FONT }}>
            <NavIcon name="invoice" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>New Request for Quotation
          </h3>
          <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'3px 0 0',fontFamily:FONT }}>
            Supplier will respond by phone/email
          </p>
        </div>
        <div style={{ padding:'20px 22px',display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={lbl}>Material *</label>
            <select value={matId} onChange={e=>setMatId(e.target.value)}
              style={{ ...inp, cursor:'pointer' }}>
              <option value="">Select material to request…</option>
              {materials.map(m=>(
                <option key={m.material_id} value={m.material_id}>
                  {m.material_name} — {m.quantity_in_stock} {m.unit} in stock
                </option>
              ))}
            </select>
            {selMat?.quantity_in_stock <= (selMat?.reorder_threshold ?? 0) && (
              <p style={{ fontSize:10,color:'var(--danger)',margin:'4px 0 0',fontFamily:FONT }}>
                <NavIcon name="warning" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Below reorder threshold — urgent
              </p>
            )}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={lbl}>Quantity Needed *</label>
              <input type="number" min={0.01} step={0.01} value={qty}
                onChange={e=>setQty(e.target.value)} placeholder="0.00"
                style={inp} onFocus={fi} onBlur={fo}/>
              {selMat && <p style={{ fontSize:10,color:'var(--text-subtle)',margin:'3px 0 0',fontFamily:FONT }}>Unit: {selMat.unit}</p>}
            </div>
            <div>
              <label style={lbl}>Needed By</label>
              <input type="date" value={byDate} min={new Date().toISOString().split('T')[0]}
                onChange={e=>setByDate(e.target.value)} style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Specifications, quality requirements…" rows={2}
              style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          </div>
          {err && <p style={{ color:'var(--danger)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',
          display:'flex',gap:10,justifyContent:'flex-end',background:'var(--bg)' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px',borderRadius:9,border:'1px solid var(--border)',
              background:'var(--bg-card)',color:'var(--ink)',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px',borderRadius:9,border:'none',
              background:busy?'var(--text-faint)':`linear-gradient(135deg,${T},${T2})`,
              color:'var(--text-on-accent)',fontSize:13,fontWeight:700,
              cursor:busy?'not-allowed':'pointer',fontFamily:FONT }}>
            {busy?<><NavIcon name="loading" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Creating…</>:<><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Create RFQ</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── RFQ: Log Supplier Response Modal ─────────────────────────────────────────
// Ma'am Fe: "Supplier responds phone/email — NOT in system"
// Staff manually logs what the supplier told them
function LogResponseModal({ rfq, suppliers, onClose, onDone }) {
  const [supId,    setSupId]    = useState('');
  const [price,    setPrice]    = useState('');
  const [qtyAvail, setQtyAvail] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [notes,    setNotes]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  const selSup   = suppliers.find(s=>String(s.supplier_id)===String(supId));
  const total    = price && rfq.qty_needed ? (Number(price)*Number(rfq.qty_needed)).toFixed(2) : null;

  const submit = async () => {
    if (!supId || !price) { setErr('Supplier and unit price required.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await axios.post(`/api/admin/rfq/${rfq.rfq_id}/respond`, {
        supplier_id:    supId,
        unit_price:     Number(price),
        qty_available:  qtyAvail ? Number(qtyAvail) : null,
        lead_time_days: leadDays ? Number(leadDays) : null,
        notes,
      });
      onDone(`Response from ${selSup?.supplier_name ?? 'supplier'} logged.`);
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.5)',
      backdropFilter:'blur(4px)',zIndex:200,display:'flex',
      alignItems:'center',justifyContent:'center',padding:16 }}>
      <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
        style={{ background:'var(--bg-card)',borderRadius:18,width:'min(500px,100%)',overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px',borderBottom:'1px solid var(--border)',background:'var(--info-bg)' }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'var(--ink)',margin:0,fontFamily:FONT }}>
            <NavIcon name="phone" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>Log Supplier Response — RFQ #{rfq.rfq_id}
          </h3>
          <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'3px 0 0',fontFamily:FONT }}>
            {rfq.material_name} · Needed: {rfq.qty_needed} {rfq.unit}
          </p>
        </div>
        <div style={{ padding:'20px 22px',display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={lbl}>Supplier *</label>
            <select value={supId} onChange={e=>setSupId(e.target.value)}
              style={{ ...inp, cursor:'pointer' }}>
              <option value="">Select supplier that responded…</option>
              {suppliers.map(s=>(
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={lbl}>Unit Price (₱) *</label>
              <input type="number" min={0} step={0.01} value={price}
                onChange={e=>setPrice(e.target.value)} placeholder="0.00"
                style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            <div>
              <label style={lbl}>Qty Available</label>
              <input type="number" min={0} step={0.01} value={qtyAvail}
                onChange={e=>setQtyAvail(e.target.value)} placeholder={String(rfq.qty_needed)}
                style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={lbl}>Lead Time (days)</label>
              <input type="number" min={1} value={leadDays}
                onChange={e=>setLeadDays(e.target.value)} placeholder="e.g. 7"
                style={inp} onFocus={fi} onBlur={fo}/>
            </div>
            {total && (
              <div style={{ display:'flex',alignItems:'flex-end' }}>
                <div style={{ padding:'10px 14px',borderRadius:10,background:'var(--teal-50)',
                  border:`1px solid ${T}30`,width:'100%',textAlign:'center' }}>
                  <p style={{ fontSize:18,fontWeight:800,color:T,margin:0,fontFamily:FONT }}>
                    ₱{Number(total).toLocaleString('en-PH',{minimumFractionDigits:2})}
                  </p>
                  <p style={{ fontSize:9,color:'var(--text-subtle)',margin:'2px 0 0',fontFamily:FONT }}>
                    Total for {rfq.qty_needed} {rfq.unit}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="e.g. Can deliver Wednesday, payment COD…" rows={2}
              style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          </div>
          {err && <p style={{ color:'var(--danger)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',
          display:'flex',gap:10,justifyContent:'flex-end',background:'var(--bg)' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px',borderRadius:9,border:'1px solid var(--border)',
              background:'var(--bg-card)',color:'var(--ink)',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px',borderRadius:9,border:'none',
              background:busy?'var(--text-faint)':'linear-gradient(135deg,var(--info),var(--info))',
              color:'var(--text-on-accent)',fontSize:13,fontWeight:700,
              cursor:busy?'not-allowed':'pointer',fontFamily:FONT }}>
            {busy?<><NavIcon name="loading" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Saving…</>:<><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Log Response</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── RFQ: printable document ───────────────────────────────────────────────────
function printRFQ(rfq) {
  const w = window.open('', '_blank', 'width=700,height:600');
  const rows = rfq.responses?.length
    ? rfq.responses.map((r,i) => `
        <tr>
          <td>${i+1}</td>
          <td>${r.supplier?.supplier_name ?? '—'}</td>
          <td>₱${Number(r.unit_price).toFixed(2)}</td>
          <td>${r.qty_available ?? '—'}</td>
          <td>${r.lead_time_days ? `${r.lead_time_days} days` : '—'}</td>
          <td>${r.notes ?? '—'}</td>
          <td>${r.selected_for_po ? '✓ Selected' : ''}</td>
        </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:#999">No responses yet</td></tr>';

  w.document.write(`<html><head><title>RFQ #${rfq.rfq_id} — VFRB Enterprise</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:30px;color:#000}
      h1{font-size:18px;margin-bottom:4px}
      .sub{font-size:12px;color:#666;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:14px}
      th{background:#f0f0f0;border:1px solid #ccc;padding:7px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
      td{border:1px solid #ddd;padding:7px 10px}
      .section{margin-bottom:16px}
      .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.06em}
      .value{font-size:13px;font-weight:700}
      @media print{body{padding:0}}
    </style></head><body>
    <h1>🏭 VFRB Enterprise — Request for Quotation</h1>
    <div class="sub">RFQ #${rfq.rfq_id} · Generated ${new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><div class="label">Material</div><div class="value">${rfq.material_name ?? '—'}</div></div>
      <div><div class="label">Quantity Needed</div><div class="value">${rfq.qty_needed} ${rfq.unit ?? ''}</div></div>
      <div><div class="label">Needed By</div><div class="value">${rfq.needed_by_date ?? 'ASAP'}</div></div>
      <div><div class="label">Status</div><div class="value">${rfq.status?.toUpperCase()}</div></div>
    </div>
    ${rfq.notes ? `<div class="section"><div class="label">Notes</div><div>${rfq.notes}</div></div>` : ''}
    <h2 style="font-size:13px;margin-top:20px;border-top:2px solid #000;padding-top:12px">
      Supplier Quotations Received
    </h2>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Supplier</th><th>Unit Price</th><th>Qty Available</th>
          <th>Lead Time</th><th>Notes</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
      <div style="border-top:1px solid #000;padding-top:8px">Prepared by: ___________________</div>
      <div style="border-top:1px solid #000;padding-top:8px">Date: ___________________</div>
      <div style="border-top:1px solid #000;padding-top:8px">Approved by: ___________________</div>
    </div>
    <script>setTimeout(()=>window.print(),300);<\/script>
    </body></html>`);
  w.document.close();
}

// ── ReceiveModal (TASK M) ─────────────────────────────────────────────────────
function ReceiveModal({ po, onClose, onDone }) {
  const [receivedHex, setReceivedHex] = useState(po.order_color_hex ?? '');
  const [colorNotes,  setColorNotes]  = useState('');
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState('');

  const de       = deltaE(po.order_color_hex, receivedHex);
  const mismatch = de !== null && de > 5;
  const items    = Array.isArray(po.items) ? po.items : [];

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await axios.patch(`/api/admin/purchase-orders/${po.po_id}/receive`, {
        received_color_hex: receivedHex || null,
        color_notes:        colorNotes  || null,
      });
      cacheClear('dashboard_stats','materials_list');
      onDone(r.data.message, r.data.color_mismatch);
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.5)',
      backdropFilter:'blur(4px)',zIndex:200,display:'flex',
      alignItems:'center',justifyContent:'center',padding:16 }}>
      <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
        style={{ background:'var(--bg-card)',borderRadius:18,width:'min(540px,100%)',
          maxHeight:'92vh',display:'flex',flexDirection:'column',
          boxShadow:'0 20px 60px rgba(0,0,0,.15)',overflow:'hidden' }}>
        <div style={{ padding:'16px 22px',background:'var(--teal-50)',borderBottom:'1px solid var(--teal-100)' }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'var(--ink)',margin:0,fontFamily:FONT }}>
            <NavIcon name="inventory" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>Receive PO — {po.po_number}
          </h3>
          <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'3px 0 0',fontFamily:FONT }}>
            Match fabric color to order swatch before confirming
          </p>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'20px 22px',display:'flex',flexDirection:'column',gap:16 }}>
          {items.length > 0 && (
            <div style={{ background:'var(--bg)',borderRadius:11,padding:'12px 14px' }}>
              <p style={{ fontSize:11,fontWeight:700,color:'var(--text-subtle)',margin:'0 0 8px',fontFamily:FONT }}>
                Materials to receive:
              </p>
              {items.map((item,i)=>(
                <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',
                  borderBottom:i<items.length-1?'1px solid var(--bg-surface)':'none' }}>
                  <span style={{ fontSize:12,color:'var(--ink)',fontFamily:FONT }}>{item.material_name}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:T,fontFamily:FONT }}>+{item.qty} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'14px' }}>
            <p style={{ fontSize:13,fontWeight:800,color:'var(--ink)',margin:'0 0 12px',fontFamily:FONT }}>
              <NavIcon name="designStudio" size={14} color="currentColor" style={{verticalAlign:'-2px',marginRight:6}}/>Color Swatch Matching
            </p>
            <ColorSwatchMatch
              orderedHex={po.order_color_hex}
              receivedHex={receivedHex}
              onChangeReceived={setReceivedHex}/>
          </div>
          <div>
            <label style={{ ...lbl,marginBottom:7 }}>
              Color Notes{' '}
              <span style={{ color:'var(--text-faint)',fontWeight:400,textTransform:'none' }}>
                {mismatch?'(required for mismatch)':'(optional)'}
              </span>
            </label>
            <textarea value={colorNotes} onChange={e=>setColorNotes(e.target.value)}
              placeholder={mismatch?'Describe the color difference…':'Any notes on received color…'}
              rows={2} style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          </div>
          {mismatch && (
            <div style={{ padding:'10px 14px',borderRadius:10,background:'var(--warning-bg)',border:'1px solid var(--warning-border)' }}>
              <p style={{ fontSize:11,color:'#92400e',fontWeight:600,margin:0,fontFamily:FONT }}>
                <NavIcon name="warning" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Proceeding will hold cutting. Manager must confirm color before cutting begins.
              </p>
            </div>
          )}
          {err && <p style={{ color:'var(--danger)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',
          display:'flex',gap:10,justifyContent:'flex-end',background:'var(--bg)' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px',borderRadius:9,border:'1px solid var(--border)',
              background:'var(--bg-card)',color:'var(--ink)',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 22px',borderRadius:9,border:'none',
              background:busy?'var(--text-faint)':mismatch
                ?'linear-gradient(135deg,var(--warning),var(--warning))'
                :`linear-gradient(135deg,${T},${T2})`,
              color:'var(--text-on-accent)',fontSize:13,fontWeight:700,
              cursor:busy?'not-allowed':'pointer',fontFamily:FONT }}>
            {busy?<><NavIcon name="loading" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Processing…</>:mismatch?<><NavIcon name="warning" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Receive with Mismatch</>:<><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Confirm Receipt</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── ConfirmColorModal (TASK M — manager override) ─────────────────────────────
function ConfirmColorModal({ po, onClose, onDone }) {
  const [notes, setNotes] = useState(po.color_notes ?? '');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const submit = async () => {
    if (!notes.trim()) { setErr('Manager notes are required for color override.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await axios.patch(`/api/admin/purchase-orders/${po.po_id}/confirm-color`, { color_notes: notes });
      cacheClear('dashboard_stats');
      onDone(r.data.message);
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.5)',
      backdropFilter:'blur(4px)',zIndex:200,display:'flex',
      alignItems:'center',justifyContent:'center',padding:16 }}>
      <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }}
        style={{ background:'var(--bg-card)',borderRadius:18,width:'min(460px,100%)',overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px',background:'var(--warning-bg)',borderBottom:'1px solid var(--warning-border)' }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:'#92400e',margin:0,fontFamily:FONT }}>
            <NavIcon name="manager" size={16} color="currentColor" style={{verticalAlign:'-3px',marginRight:6}}/>Confirm Color — Manager Override
          </h3>
          <p style={{ fontSize:11,color:'#92400e',margin:'3px 0 0',opacity:.7,fontFamily:FONT }}>
            Unblocks cutting for {po.po_number}
          </p>
        </div>
        <div style={{ padding:'20px 22px',display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            {[{icon:'orders',label:'Order Color',h:po.order_color_hex},{icon:'inventory',label:'Received',h:po.received_color_hex}].map(({icon,label,h})=>(
              <div key={label}>
                <p style={{ fontSize:10,fontWeight:700,color:'var(--text-subtle)',margin:'0 0 6px',
                  textTransform:'uppercase',letterSpacing:'.06em',fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
                  <NavIcon name={icon} size={11} color="currentColor"/>{label}
                </p>
                <div style={{ height:50,borderRadius:10,border:'2px solid var(--border)',
                  background:h??'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:9,fontFamily:'monospace',
                    color:h==='#FFFFFF'?'var(--text-subtle)':'var(--text-on-accent)',textShadow:'0 1px 2px rgba(0,0,0,.3)',fontWeight:700 }}>
                    {h??'—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'9px 12px',borderRadius:9,background:'var(--warning-bg)',border:'1px solid var(--warning-border)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#92400e',margin:0,fontFamily:FONT }}>
              ΔE = {deltaE(po.order_color_hex,po.received_color_hex)??'—'} — exceeds tolerance of 5
            </p>
          </div>
          <div>
            <label style={lbl}>Manager Confirmation Notes *</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Why is this color acceptable? (e.g. client approved off-shade)…"
              rows={3} style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          </div>
          {err && <p style={{ color:'var(--danger)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--border)',
          display:'flex',gap:10,justifyContent:'flex-end',background:'var(--bg)' }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px',borderRadius:9,border:'1px solid var(--border)',
              background:'var(--bg-card)',color:'var(--ink)',fontSize:13,fontWeight:600,
              cursor:'pointer',fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy||!notes.trim()}
            style={{ padding:'9px 22px',borderRadius:9,border:'none',
              background:(busy||!notes.trim())?'var(--text-faint)':'linear-gradient(135deg,var(--warning),var(--warning-border))',
              color:'var(--text-on-accent)',fontSize:13,fontWeight:700,
              cursor:(busy||!notes.trim())?'not-allowed':'pointer',fontFamily:FONT }}>
            {busy?'…':<><NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Confirm Color — Allow Cutting</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPurchaseOrders() {
  const [pos,        setPos]        = useState([]);
  const [rfqs,       setRfqs]       = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('pos');
  const [receiving,  setReceiving]  = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [newRFQ,     setNewRFQ]     = useState(false);
  const [logResp,    setLogResp]    = useState(null);  // RFQ to log response for
  const [convertPO,  setConvertPO]  = useState(null);  // RFQ to convert (manager selects response)
  const [toast,      setToast]      = useState(null);

  const user      = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user')||'{}'); } catch { return {}; } })();
  const isManager = user.role === 'manager';

  const showToast = (msg, type='success') => setToast({ msg, type });

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('purchase_orders_full');
      if (cached) {
        setPos(cached.pos); setRfqs(cached.rfqs);
        setSuppliers(cached.suppliers); setMaterials(cached.materials);
        setLoading(false); return;
      }
    }
    setLoading(true);
    // DSA: Promise.allSettled — parallel O(max(t1..t4)) not O(t1+t2+t3+t4)
    Promise.allSettled([
      axios.get('/api/admin/purchase-orders'),
      axios.get('/api/admin/rfq'),
      axios.get('/api/admin/suppliers'),
      axios.get('/api/admin/materials?per_page=200'),
    ]).then(([p,r,s,m]) => {
      const pos       = p.status==='fulfilled'?(p.value.data?.data??p.value.data??[]):[];
      const rfqs      = r.status==='fulfilled'?(r.value.data?.data??r.value.data??[]):[];
      const suppliers = s.status==='fulfilled'?(s.value.data?.data??s.value.data??[]):[];
      const materials = m.status==='fulfilled'?(m.value.data?.data??m.value.data??[]):[];
      setPos(pos); setRfqs(rfqs); setSuppliers(suppliers); setMaterials(materials);
      cacheSet('purchase_orders_full', { pos, rfqs, suppliers, materials }, 300_000);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const mismatchCount = pos.filter(p=>p.color_mismatch&&!p.color_confirmed).length;

  // Manager: convert RFQ → PO by picking a response
  const handleConvertToPO = async (rfq, responseId) => {
    try {
      const r = await axios.patch(`/api/admin/rfq/${rfq.rfq_id}/convert-po`, { response_id: responseId });
      showToast(r.data.message);
      setConvertPO(null);
      load();
    } catch(e) { showToast(e.response?.data?.message ?? 'Failed.', 'error'); }
  };

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      <AnimatePresence>
        {toast && <Toast key="t" msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      </AnimatePresence>

      {newRFQ    && <NewRFQModal materials={materials} onClose={() => setNewRFQ(false)}
                      onDone={msg=>{ setNewRFQ(false); showToast(msg); load(); }}/>}
      {logResp   && <LogResponseModal rfq={logResp} suppliers={suppliers}
                      onClose={() => setLogResp(null)}
                      onDone={msg=>{ setLogResp(null); showToast(msg); load(); }}/>}
      {receiving  && <ReceiveModal po={receiving} onClose={() => setReceiving(null)}
                      onDone={(msg,hm)=>{ setReceiving(null); showToast(msg,hm?'warn':'success'); load(); }}/>}
      {confirming && <ConfirmColorModal po={confirming} onClose={() => setConfirming(null)}
                      onDone={msg=>{ setConfirming(null); showToast(msg); load(); }}/>}

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',
        marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--ink)',margin:'0 0 4px',fontFamily:FONT }}>
            Procurement
          </h1>
          <p style={{ color:'var(--text-subtle)',fontSize:13,margin:0,fontFamily:FONT }}>
            RFQ → PO → Goods Receipt · Color swatch matching on delivery
          </p>
        </div>
        <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
          {mismatchCount > 0 && (
            <div style={{ padding:'8px 14px',borderRadius:10,background:'var(--warning-bg)',
              border:'1px solid var(--warning-border)',display:'flex',alignItems:'center',gap:8 }}>
              <NavIcon name="warning" size={14} color="currentColor"/>
              <p style={{ fontSize:12,fontWeight:700,color:'#92400e',margin:0,fontFamily:FONT }}>
                {mismatchCount} color mismatch{mismatchCount!==1?'es':''}
                {isManager?' — review required':' — awaiting manager'}
              </p>
            </div>
          )}
          <button onClick={() => setNewRFQ(true)}
            style={{ padding:'9px 18px',borderRadius:10,border:`1px solid ${T}40`,
              background:'var(--teal-50)',color:T,fontSize:12,fontWeight:700,
              cursor:'pointer',fontFamily:FONT }}>
            <NavIcon name="invoice" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>New RFQ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:6,marginBottom:20,borderBottom:'2px solid var(--border)' }}>
        {[['pos',{icon:'orders',label:'Purchase Orders'}],['rfq',{icon:'invoice',label:'RFQ'}]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:'9px 16px',borderRadius:'9px 9px 0 0',border:'none',
              borderBottom:tab===k?`2px solid ${T}`:'2px solid transparent',
              background:tab===k?'var(--teal-50)':'transparent',color:tab===k?T:'var(--text-subtle)',
              fontSize:13,fontWeight:tab===k?700:500,cursor:'pointer',
              fontFamily:FONT,marginBottom:'-2px' }}>
            <NavIcon name={l.icon} size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>{l.label}
            {k==='rfq'&&rfqs.filter(r=>r.status==='open').length>0&&(
              <span style={{ marginLeft:6,fontSize:9,padding:'1px 6px',borderRadius:99,
                background:'var(--info-bg)',color:'var(--info)',fontWeight:800 }}>
                {rfqs.filter(r=>r.status==='open').length} open
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PO TAB ── */}
      {tab === 'pos' && (
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {loading ? Array(3).fill(0).map((_,i) => (
            <div key={i} style={{ ...card, padding:'18px 22px' }}>
              {[80,55,40].map(w => <div key={w} style={{ ...SK, height:12, width:`${w}%`, marginBottom:10 }}/>)}
            </div>
          )) : pos.length === 0 ? (
            <div style={{ ...card,padding:'50px',textAlign:'center' }}>
              <p style={{ fontSize:36,margin:'0 0 12px',opacity:.3, display:'flex', justifyContent:'center' }}><NavIcon name="orders" size={36} color="currentColor"/></p>
              <p style={{ fontSize:14,color:'var(--text-subtle)',fontFamily:FONT }}>
                No purchase orders yet. Create one from an approved RFQ.
              </p>
            </div>
          ) : pos.map(po => {
            const st         = PO_STATUS[po.status] ?? PO_STATUS.pending;
            const items      = Array.isArray(po.items) ? po.items : [];
            const hasMismatch= po.color_mismatch && !po.color_confirmed;
            const de         = deltaE(po.order_color_hex, po.received_color_hex);
            return (
              <motion.div key={po.po_id} layout whileHover={{ y:-1 }}
                style={{ ...card,padding:'18px 22px',
                  borderLeft:`4px solid ${hasMismatch?'var(--warning)':st.c}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',
                  alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:10 }}>
                  <div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                      <p style={{ fontSize:15,fontWeight:800,color:'var(--ink)',margin:0,fontFamily:FONT }}>
                        {po.po_number}
                      </p>
                      <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,
                        background:st.bg,color:st.c,fontFamily:FONT }}>{st.l}</span>
                      {hasMismatch && (
                        <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,
                          background:'var(--warning-bg)',color:'#92400e',fontFamily:FONT }}>
                          <NavIcon name="warning" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Color Mismatch — Cutting Held
                        </span>
                      )}
                      {po.color_confirmed && po.color_mismatch && (
                        <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,
                          background:'var(--success-bg)',color:'#166534',fontFamily:FONT }}>
                          <NavIcon name="success" size={12} color="currentColor" style={{verticalAlign:'-2px',marginRight:4}}/>Color Override Approved
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:12,color:'var(--text-subtle)',margin:'4px 0 0',fontFamily:FONT }}>
                      {po.supplier_name ?? '—'} ·
                      Expected: {po.expected_delivery_date ?? '—'} ·
                      ₱{Number(po.total_amount??0).toLocaleString('en-PH',{minimumFractionDigits:2})}
                    </p>
                  </div>
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    {po.status === 'sent' && (
                      <button onClick={()=>setReceiving(po)}
                        style={{ padding:'7px 14px',borderRadius:9,border:'none',
                          background:`linear-gradient(135deg,${T},${T2})`,
                          color:'var(--text-on-accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                        <NavIcon name="inventory" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Receive + Match Color
                      </button>
                    )}
                    {hasMismatch && isManager && (
                      <button onClick={()=>setConfirming(po)}
                        style={{ padding:'7px 14px',borderRadius:9,border:'none',
                          background:'linear-gradient(135deg,var(--warning),var(--warning-border))',
                          color:'var(--text-on-accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                        <NavIcon name="designStudio" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Confirm Color
                      </button>
                    )}
                  </div>
                </div>

                {po.status==='received' && po.order_color_hex && (
                  <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:10,
                    padding:'10px 12px',borderRadius:10,background:'var(--bg)',border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                      {[['Order',po.order_color_hex],['Received',po.received_color_hex]].map(([l,h])=>(
                        <div key={l}>
                          <p style={{ fontSize:9,color:'var(--text-faint)',margin:'0 0 3px',
                            textTransform:'uppercase',letterSpacing:'.06em',fontFamily:FONT }}>{l}</p>
                          <div style={{ width:32,height:32,borderRadius:7,
                            border:`1.5px solid ${hasMismatch&&l==='Received'?'var(--danger-border)':'var(--border)'}`,
                            background:h??'var(--bg)' }}/>
                        </div>
                      ))}
                    </div>
                    {de !== null && (
                      <p style={{ fontSize:11,fontWeight:700,fontFamily:FONT,
                        color:hasMismatch?'var(--danger)':'var(--success)',margin:0 }}>
                        {hasMismatch?<><NavIcon name="warning" size={11} color="currentColor" style={{verticalAlign:'-2px',marginRight:3}}/>{`ΔE = ${de}`}</>:<><NavIcon name="success" size={11} color="currentColor" style={{verticalAlign:'-2px',marginRight:3}}/>{`ΔE = ${de}`}</>}
                      </p>
                    )}
                  </div>
                )}

                {items.length > 0 && (
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                    {items.map((item,i) => (
                      <span key={i} style={{ padding:'4px 10px',borderRadius:8,
                        background:'var(--bg)',border:'1px solid var(--border)',fontSize:11,
                        color:'var(--ink)',fontFamily:FONT }}>
                        {item.material_name} · {item.qty} {item.unit}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── RFQ TAB ── */}
      {tab === 'rfq' && (
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {loading ? Array(2).fill(0).map((_,i) => (
            <div key={i} style={{ ...card, padding:'18px 22px' }}>
              {[70,50,85].map(w => <div key={w} style={{ ...SK, height:12, width:`${w}%`, marginBottom:10 }}/>)}
            </div>
          )) : rfqs.length === 0 ? (
            <div style={{ ...card,padding:'50px',textAlign:'center' }}>
              <p style={{ fontSize:36,margin:'0 0 12px',opacity:.3, display:'flex', justifyContent:'center' }}><NavIcon name="invoice" size={36} color="currentColor"/></p>
              <p style={{ fontSize:14,color:'var(--text-subtle)',marginBottom:16,fontFamily:FONT }}>
                No RFQs yet. Create one when stock is low.
              </p>
              <button onClick={()=>setNewRFQ(true)}
                style={{ padding:'10px 22px',borderRadius:11,border:'none',
                  background:`linear-gradient(135deg,${T},${T2})`,
                  color:'var(--text-on-accent)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                + New RFQ
              </button>
            </div>
          ) : rfqs.map(rfq => {
            const isOpen   = rfq.status === 'open';
            const respCount = rfq.responses?.length ?? 0;
            return (
              <motion.div key={rfq.rfq_id} layout whileHover={{ y:-1 }}
                style={{ ...card,padding:'18px 22px',
                  borderLeft:`4px solid ${isOpen?'var(--info)':'var(--text-faint)'}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',
                  alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:respCount?12:0 }}>
                  <div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap' }}>
                      <p style={{ fontSize:15,fontWeight:800,color:'var(--ink)',margin:0,fontFamily:FONT }}>
                        RFQ #{rfq.rfq_id} — {rfq.material_name ?? '—'}
                      </p>
                      <span style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,
                        background:isOpen?'var(--info-bg)':'var(--bg-surface)',
                        color:isOpen?'var(--info)':'var(--text-subtle)',fontFamily:FONT }}>
                        {rfq.status?.toUpperCase()}
                      </span>
                      {!!rfq.auto_generated && (
                        <span title="Created automatically because this material crossed its reorder threshold — review and respond/close like any other RFQ."
                          style={{ padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,
                          background:'var(--teal-50)',color:'var(--teal)',border:'1px solid #02809044',fontFamily:FONT }}>
                          <NavIcon name="ai" size={11} color="currentColor" style={{verticalAlign:'-2px',marginRight:3}}/>Auto-suggested
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:12,color:'var(--text-subtle)',margin:0,fontFamily:FONT }}>
                      {rfq.qty_needed} {rfq.unit} needed ·
                      By: {rfq.needed_by_date ?? 'ASAP'} ·
                      Created by: {rfq.auto_generated ? 'System (automation)' : (rfq.created_by_name ?? '—')} ·
                      {respCount} response{respCount!==1?'s':''}
                    </p>
                  </div>
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    <button onClick={()=>printRFQ(rfq)}
                      style={{ padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',
                        background:'var(--bg-card)',color:'var(--text-subtle)',fontSize:11,fontWeight:600,
                        cursor:'pointer',fontFamily:FONT }}>
                      <NavIcon name="print" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Print
                    </button>
                    {isOpen && (
                      <button onClick={()=>setLogResp(rfq)}
                        style={{ padding:'6px 14px',borderRadius:8,border:'none',
                          background:'linear-gradient(135deg,var(--info),var(--info))',
                          color:'var(--text-on-accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                        + Log Response
                      </button>
                    )}
                    {isOpen && isManager && respCount > 0 && (
                      <button onClick={()=>setConvertPO(rfq)}
                        style={{ padding:'6px 14px',borderRadius:8,border:'none',
                          background:`linear-gradient(135deg,${T},${T2})`,
                          color:'var(--text-on-accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                        <NavIcon name="success" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Convert to PO
                      </button>
                    )}
                    {isOpen && (
                      <button onClick={async()=>{
                        try { await axios.patch(`/api/admin/rfq/${rfq.rfq_id}/close`); showToast(`RFQ #${rfq.rfq_id} closed.`); load(); }
                        catch(e) { showToast(e.response?.data?.message??'Failed.','error'); }
                      }}
                        style={{ padding:'6px 12px',borderRadius:8,border:'1px solid var(--danger-border)',
                          background:'var(--danger-bg)',color:'var(--danger)',fontSize:11,fontWeight:600,
                          cursor:'pointer',fontFamily:FONT }}>
                        Close RFQ
                      </button>
                    )}
                  </div>
                </div>

                {/* Responses list */}
                {respCount > 0 && (
                  <div style={{ marginTop:10,background:'var(--bg)',borderRadius:10,overflow:'hidden',
                    border:'1px solid var(--border)' }}>
                    {rfq.responses.map((resp,i) => (
                      <div key={resp.response_id}
                        style={{ padding:'10px 14px',
                          borderBottom:i<rfq.responses.length-1?'1px solid var(--bg-surface)':'none',
                          background:resp.selected_for_po?'var(--success-bg)':'transparent',
                          display:'flex',justifyContent:'space-between',alignItems:'center',
                          flexWrap:'wrap',gap:8 }}>
                        <div>
                          <p style={{ fontSize:12,fontWeight:700,color:'var(--ink)',margin:0,fontFamily:FONT }}>
                            {resp.selected_for_po && <span style={{ color:'var(--success)',marginRight:5, display:'inline-flex', alignItems:'center', gap:3 }}><NavIcon name="success" size={11} color="currentColor"/>Selected</span>}
                            {resp.supplier?.supplier_name ?? `Supplier #${resp.supplier_id}`}
                          </p>
                          <p style={{ fontSize:11,color:'var(--text-subtle)',margin:'2px 0 0',fontFamily:FONT }}>
                            ₱{Number(resp.unit_price).toFixed(2)}/unit ·
                            {resp.qty_available ? ` Qty: ${resp.qty_available} ·` : ''}
                            {resp.lead_time_days ? ` Lead: ${resp.lead_time_days} days` : ''}
                            {resp.notes ? ` · "${resp.notes}"` : ''}
                          </p>
                        </div>
                        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                          <p style={{ fontSize:14,fontWeight:800,color:T,margin:0,fontFamily:FONT }}>
                            ₱{(Number(resp.unit_price)*Number(rfq.qty_needed)).toLocaleString('en-PH',{minimumFractionDigits:2})}
                            <span style={{ fontSize:10,color:'var(--text-faint)',fontWeight:400,marginLeft:3 }}>total</span>
                          </p>
                          {isOpen && isManager && !resp.selected_for_po && (
                            <button onClick={()=>handleConvertToPO(rfq,resp.response_id)}
                              style={{ padding:'5px 12px',borderRadius:8,border:'none',
                                background:`linear-gradient(135deg,${T},${T2})`,
                                color:'var(--text-on-accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:FONT }}>
                              Select & Create PO
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
