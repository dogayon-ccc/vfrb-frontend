
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion }                            from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { NavIcon }                             from '../../components/ui/icons';
import { escapeHtml }                          from '../../utils/escapeHtml';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, SearchBox, Banner, Toast, useToast, ErrorBlock, SkeletonRows, FilterSheet, FilterButton, useIsMobile } from '../../components/admin/AdminUI';

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

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function deltaE(h1, h2) {
  if (!h1 || !h2) return null;
  const [r1,g1,b1]=hexToRgb(h1), [r2,g2,b2]=hexToRgb(h2);
  return Math.round(Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2)/4.42*10)/10;
}

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
              <p style={{ fontSize:16,fontWeight:800,color:mismatch?'var(--danger-text)':'var(--success-text)',margin:0,fontFamily:FONT }}>
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
              <p style={{ fontSize:10,color:'var(--danger-text)',margin:'4px 0 0',fontFamily:FONT }}>
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
          {err && <p style={{ color:'var(--danger-text)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
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
          {err && <p style={{ color:'var(--danger-text)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
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

function printRFQ(rfq) {
  const w = window.open('', '_blank', 'width=700,height:600');
  const rows = rfq.responses?.length
    ? rfq.responses.map((r,i) => `
        <tr>
          <td>${i+1}</td>
          <td>${escapeHtml(r.supplier?.supplier_name ?? '—')}</td>
          <td>₱${Number(r.unit_price).toFixed(2)}</td>
          <td>${escapeHtml(r.qty_available ?? '—')}</td>
          <td>${r.lead_time_days ? `${escapeHtml(r.lead_time_days)} days` : '—'}</td>
          <td>${escapeHtml(r.notes ?? '—')}</td>
          <td>${r.selected_for_po ? '✓ Selected' : ''}</td>
        </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:#999">No responses yet</td></tr>';

  w.document.write(`<html><head><title>RFQ #${escapeHtml(rfq.rfq_id)} — VFRB Enterprise</title>
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
    <div class="sub">RFQ #${escapeHtml(rfq.rfq_id)} · Generated ${new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><div class="label">Material</div><div class="value">${escapeHtml(rfq.material_name ?? '—')}</div></div>
      <div><div class="label">Quantity Needed</div><div class="value">${escapeHtml(rfq.qty_needed)} ${escapeHtml(rfq.unit ?? '')}</div></div>
      <div><div class="label">Needed By</div><div class="value">${escapeHtml(rfq.needed_by_date ?? 'ASAP')}</div></div>
      <div><div class="label">Status</div><div class="value">${escapeHtml(rfq.status?.toUpperCase())}</div></div>
    </div>
    ${rfq.notes ? `<div class="section"><div class="label">Notes</div><div>${escapeHtml(rfq.notes)}</div></div>` : ''}
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
          {err && <p style={{ color:'var(--danger-text)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
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
          {err && <p style={{ color:'var(--danger-text)',fontSize:12,fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={13} color="currentColor"/>{err}</p>}
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

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const peso = (v) => `₱${Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const PO_TABS = ['all', 'sent', 'received', 'closed'];

function PoActions({ po, isManager, onReceive, onConfirm, stop }) {
  const hold = po.color_mismatch && !po.color_confirmed;
  const click = (fn) => (e) => { if (stop) e.stopPropagation(); fn(); };
  return (
    <>
      {po.status === 'sent' && <button className="adm-btn primary" onClick={click(() => onReceive(po))}><NavIcon name="inventory" size={13} color="currentColor" /> Receive + match color</button>}
      {hold && isManager && <button className="adm-btn" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' }} onClick={click(() => onConfirm(po))}><NavIcon name="colorZone" size={13} color="currentColor" /> Confirm color</button>}
    </>
  );
}

function PoFlags({ po }) {
  const hold = po.color_mismatch && !po.color_confirmed;
  return (
    <>
      {hold && <span className="adm-pill" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>Color mismatch — cutting held</span>}
      {po.color_confirmed && po.color_mismatch && <span className="adm-pill" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>Color override approved</span>}
    </>
  );
}

function ColorCompare({ po }) {
  if (po.status !== 'received' || !po.order_color_hex) return null;
  const de = deltaE(po.order_color_hex, po.received_color_hex);
  const hold = po.color_mismatch && !po.color_confirmed;
  return (
    <div className="po-swatches">
      {[['Order', po.order_color_hex], ['Received', po.received_color_hex]].map(([l, h]) => (
        <div key={l}><span>{l}</span><i style={{ background: h ?? 'var(--bg)', borderColor: hold && l === 'Received' ? 'var(--danger-border)' : 'var(--border)' }} /></div>
      ))}
      {de !== null && <b style={{ color: hold ? 'var(--danger-text)' : 'var(--success-text)' }}>ΔE {de}</b>}
    </div>
  );
}

export default function AdminPurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [tab, setTab] = useState('pos');
  const [poFilter, setPoFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [receiving, setReceiving] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [newRFQ, setNewRFQ] = useState(false);
  const [logResp, setLogResp] = useState(null);
  const [pickFor, setPickFor] = useState(null);
  const [toast, setToast] = useToast();
  const [sheet, setSheet] = useState(false);
  const isMobile = useIsMobile();

  const user = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const isManager = user.role === 'manager';
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback((force = false) => {
    if (!force) {
      const c = cacheGet('purchase_orders_full');
      if (c) { setPos(c.pos); setRfqs(c.rfqs); setSuppliers(c.suppliers); setMaterials(c.materials); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    Promise.allSettled([
      axios.get('/api/admin/purchase-orders'), axios.get('/api/admin/rfq'),
      axios.get('/api/admin/suppliers'), axios.get('/api/admin/materials?per_page=200'),
    ]).then(([p, r, s, m]) => {
      const pick = (x) => (x.status === 'fulfilled' ? (x.value.data?.data ?? x.value.data ?? []) : []);
      if (p.status !== 'fulfilled' && r.status !== 'fulfilled') { setLoadErr(true); return; }
      const next = { pos: pick(p), rfqs: pick(r), suppliers: pick(s), materials: pick(m) };
      setPos(next.pos); setRfqs(next.rfqs); setSuppliers(next.suppliers); setMaterials(next.materials);
      cacheSet('purchase_orders_full', next, 300_000);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { cacheClear('purchase_orders_full'); load(true); };
  const mismatchCount = pos.filter((p) => p.color_mismatch && !p.color_confirmed).length;
  const openRfqs = rfqs.filter((r) => r.status === 'open').length;
  const toReceive = pos.filter((p) => p.status === 'sent').length;

  const poCounts = useMemo(() => pos.reduce((a, p) => { a[p.status] = (a[p.status] ?? 0) + 1; return a; }, {}), [pos]);
  const poTabs = PO_TABS.map((k) => ({ key: k, label: k === 'all' ? 'All' : (PO_STATUS[k]?.l ?? k), count: k === 'all' ? pos.length : (poCounts[k] ?? 0) }));
  const q = search.toLowerCase().trim();
  const filteredPos = pos.filter((p) => (poFilter === 'all' || p.status === poFilter)
    && (!q || p.po_number?.toLowerCase().includes(q) || p.supplier_name?.toLowerCase().includes(q)
      || (Array.isArray(p.items) ? p.items : []).some((i) => i.material_name?.toLowerCase().includes(q))));
  const filteredRfqs = rfqs.filter((r) => !q || String(r.rfq_id).includes(q) || r.material_name?.toLowerCase().includes(q));

  const handleConvertToPO = async (rfq, responseId) => {
    try {
      const r = await axios.patch(`/api/admin/rfq/${rfq.rfq_id}/convert-po`, { response_id: responseId });
      showToast(r.data.message); setPickFor(null); refresh();
    } catch (e) { showToast(e.response?.data?.message ?? 'Failed.', 'error'); }
  };
  const closeRfq = async (rfq) => {
    try { await axios.patch(`/api/admin/rfq/${rfq.rfq_id}/close`); showToast(`RFQ #${rfq.rfq_id} closed.`); refresh(); }
    catch (e) { showToast(e.response?.data?.message ?? 'Failed.', 'error'); }
  };

  const empty = (icon, msg, cta) => (
    <div className="adm-empty"><NavIcon name={icon} size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div>{cta}</div>
  );

  return (
    <>
      <Toast toast={toast} />
      {sheet && <FilterSheet title="Filter by status" options={poTabs} value={poFilter} onChange={setPoFilter} onClose={() => setSheet(false)} isMobile={isMobile} />}
      {newRFQ && <NewRFQModal materials={materials} onClose={() => setNewRFQ(false)} onDone={(msg) => { setNewRFQ(false); showToast(msg); refresh(); }} />}
      {logResp && <LogResponseModal rfq={logResp} suppliers={suppliers} onClose={() => setLogResp(null)} onDone={(msg) => { setLogResp(null); showToast(msg); refresh(); }} />}
      {receiving && <ReceiveModal po={receiving} onClose={() => setReceiving(null)} onDone={(msg, hm) => { setReceiving(null); showToast(msg, hm ? 'warn' : 'success'); refresh(); }} />}
      {confirming && <ConfirmColorModal po={confirming} onClose={() => setConfirming(null)} onDone={(msg) => { setConfirming(null); showToast(msg); refresh(); }} />}

      <PageHeader title="Procurement" sub="RFQ → Purchase Order → Goods receipt · color swatch matching on delivery">
        <button className="adm-btn" onClick={refresh}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
        <button className="adm-btn primary" onClick={() => setNewRFQ(true)}><NavIcon name="add" size={14} color="currentColor" /> New RFQ</button>
      </PageHeader>

      {mismatchCount > 0 && (
        <Banner tone="warn" icon="warning">{mismatchCount} color mismatch{mismatchCount !== 1 ? 'es' : ''} — cutting is held{isManager ? '; review and confirm below.' : ' until a manager confirms.'}</Banner>
      )}
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load procurement data." onRetry={refresh} /></div>}

      <StatGrid loading={loading} items={[
        { label: 'Open RFQs', value: openRfqs, color: 'var(--info)', onClick: () => setTab('rfq') },
        { label: 'To receive', value: toReceive, color: 'var(--teal)', onClick: () => { setTab('pos'); setPoFilter('sent'); } },
        { label: 'Color holds', value: mismatchCount, color: mismatchCount ? 'var(--warning-text)' : undefined },
        { label: 'Purchase orders', value: pos.length, onClick: () => { setTab('pos'); setPoFilter('all'); } },
      ]} />

      <PillTabs value={tab} onChange={setTab} tabs={[{ key: 'pos', label: 'Purchase orders', count: pos.length }, { key: 'rfq', label: 'RFQs', count: openRfqs || null }]} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={tab === 'pos' ? 'Search PO number, supplier, material…' : 'Search RFQ or material…'} label="Search procurement" />
        {tab === 'pos' && <FilterButton label={`Status: ${poTabs.find((t) => t.key === poFilter)?.label}`} onClick={() => setSheet(true)} />}
      </div>

      {tab === 'pos' && (
        <>
          <div className="adm-only-d"><PillTabs value={poFilter} onChange={setPoFilter} tabs={poTabs} /></div>
          <div className="adm-only-d">
            <Panel flush>
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th>PO</th><th>Supplier</th><th>Items</th><th className="adm-hide-t">Expected</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {!loading && filteredPos.map((po) => {
                      const items = Array.isArray(po.items) ? po.items : [];
                      return (
                        <tr key={po.po_id}>
                          <td style={{ fontWeight: 800, color: 'var(--teal)', whiteSpace: 'nowrap' }}>{po.po_number}</td>
                          <td>{po.supplier_name ?? '—'}</td>
                          <td style={{ maxWidth: 260 }}>
                            <div className="po-items">{items.map((it, i) => <span key={i}>{it.material_name} · {it.qty} {it.unit}</span>)}{items.length === 0 && '—'}</div>
                            <ColorCompare po={po} />
                          </td>
                          <td className="adm-hide-t" style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }}>{fmtDate(po.expected_delivery_date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{peso(po.total_amount)}</td>
                          <td><div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}><StatusPill status={po.status} label={PO_STATUS[po.status]?.l} /><PoFlags po={po} /></div></td>
                          <td><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}><PoActions po={po} isManager={isManager} onReceive={setReceiving} onConfirm={setConfirming} /></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && <SkeletonRows rows={5} h={52} />}
              {!loading && filteredPos.length === 0 && empty('procurement', search || poFilter !== 'all' ? 'No purchase orders match' : 'No purchase orders yet. Create one from an approved RFQ.',
                (search || poFilter !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setPoFilter('all'); }}>Clear filters</button>)}
            </Panel>
          </div>
          <div className="adm-only-m adm-stagger" key={`${poFilter}-${search}`}>
            {loading ? <SkeletonRows rows={3} h={140} /> : filteredPos.length === 0 ? empty('procurement', 'No purchase orders match') : filteredPos.map((po, i) => {
              const items = Array.isArray(po.items) ? po.items : [];
              const hold = po.color_mismatch && !po.color_confirmed;
              return (
                <div key={po.po_id} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': hold ? 'var(--warning)' : (PO_STATUS[po.status]?.c ?? 'var(--teal)') }}>
                  <div className="adm-mrow"><b style={{ color: 'var(--teal)' }}>{po.po_number}</b><StatusPill status={po.status} label={PO_STATUS[po.status]?.l} /></div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{po.supplier_name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Expected {fmtDate(po.expected_delivery_date)} · {peso(po.total_amount)}</div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}><PoFlags po={po} /></div>
                  <div className="po-items" style={{ marginTop: 8 }}>{items.map((it, j) => <span key={j}>{it.material_name} · {it.qty} {it.unit}</span>)}</div>
                  <ColorCompare po={po} />
                  {(po.status === 'sent' || (hold && isManager)) && <div className="adm-mfoot"><PoActions po={po} isManager={isManager} onReceive={setReceiving} onConfirm={setConfirming} /></div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'rfq' && (
        <div className="po-rfqs adm-stagger" key={search}>
          {loading ? <SkeletonRows rows={3} h={120} /> : filteredRfqs.length === 0 ? (
            <Panel>{empty('invoice', search ? 'No RFQs match' : 'No RFQs yet. Create one when stock is low.', !search && <button className="adm-btn primary" style={{ marginTop: 12 }} onClick={() => setNewRFQ(true)}>New RFQ</button>)}</Panel>
          ) : filteredRfqs.map((rfq, idx) => {
            const isOpen = rfq.status === 'open';
            const responses = rfq.responses ?? [];
            const picking = pickFor === rfq.rfq_id;
            return (
              <div key={rfq.rfq_id} className="adm-mcard accent" style={{ '--i': Math.min(idx, 8), '--acc': isOpen ? 'var(--info)' : 'var(--text-faint)', marginBottom: 0 }}>
                <div className="adm-mrow" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 15 }}>RFQ #{rfq.rfq_id} — {rfq.material_name ?? '—'}</b>
                      <span className="adm-pill" style={{ background: isOpen ? 'var(--info-bg)' : 'var(--bg-surface)', color: isOpen ? 'var(--info-text)' : 'var(--text-subtle)' }}>{rfq.status}</span>
                      {!!rfq.auto_generated && <span className="adm-pill" title="Created automatically because this material crossed its reorder threshold." style={{ background: 'var(--teal-50)', color: 'var(--teal)' }}>Auto-suggested</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
                      {rfq.qty_needed} {rfq.unit} needed · by {rfq.needed_by_date ?? 'ASAP'} · {rfq.auto_generated ? 'System (automation)' : (rfq.created_by_name ?? '—')} · {responses.length} response{responses.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="adm-actionbar" style={{ marginTop: 12 }}>
                  <button className="adm-btn" onClick={() => printRFQ(rfq)}><NavIcon name="print" size={13} color="currentColor" /> Print</button>
                  {isOpen && <button className="adm-btn" onClick={() => setLogResp(rfq)}><NavIcon name="add" size={13} color="currentColor" /> Log response</button>}
                  {isOpen && isManager && responses.length > 0 && <button className="adm-btn primary" onClick={() => setPickFor(picking ? null : rfq.rfq_id)}><NavIcon name="success" size={13} color="currentColor" /> {picking ? 'Cancel' : 'Convert to PO'}</button>}
                  {isOpen && <button className="adm-btn danger" onClick={() => closeRfq(rfq)}>Close RFQ</button>}
                </div>
                {picking && <div className="adm-callout info" style={{ marginTop: 12, marginBottom: 0 }}><NavIcon name="info" size={16} color="currentColor" /><div><b>Choose the winning response</b>Pick “Select & create PO” on one supplier below.</div></div>}
                {responses.length > 0 && (
                  <div className="po-resp">
                    {responses.map((resp) => (
                      <div key={resp.response_id} className={resp.selected_for_po ? 'sel' : ''}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{resp.selected_for_po && <span style={{ color: 'var(--success-text)', marginRight: 6 }}>Selected ·</span>}{resp.supplier?.supplier_name ?? `Supplier #${resp.supplier_id}`}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                            ₱{Number(resp.unit_price).toFixed(2)}/unit{resp.qty_available ? ` · Qty ${resp.qty_available}` : ''}{resp.lead_time_days ? ` · Lead ${resp.lead_time_days}d` : ''}{resp.notes ? ` · “${resp.notes}”` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <b style={{ color: 'var(--teal)', whiteSpace: 'nowrap' }}>{peso(Number(resp.unit_price) * Number(rfq.qty_needed))}</b>
                          {isOpen && isManager && !resp.selected_for_po && <button className={`adm-btn${picking ? ' primary' : ''}`} onClick={() => handleConvertToPO(rfq, resp.response_id)}>Select &amp; create PO</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
