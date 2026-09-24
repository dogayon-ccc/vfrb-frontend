import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';

const T = '#028090', T2 = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const ZONE_LABEL = { body:'Body', collar:'Collar', sleeve:'Sleeve', pocket:'Pocket' };

function parseCfg(order) {
  try {
    const raw = order?.studio_config;
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return null; }
}

function Row({ label, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0',
      borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
      <span style={{ color:'#64748b' }}>{label}</span>
      <span style={{ fontWeight:600, color:'#1a2332', textAlign:'right' }}>{children}</span>
    </div>
  );
}

export default function SpecSheet({ order, onClose }) {
  const cfg = parseCfg(order);
  const colors = cfg?.colors ?? {};
  const hasLogo = (cfg?.overlays ?? []).some(o => o.__logo) || (cfg?.hasLogo);
  const textLayers = (cfg?.overlays ?? []).filter(o => o.__text);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(15,23,42,.55)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
        onClick={onClose}>
        <motion.div initial={{ opacity:0, scale:.96 }} animate={{ opacity:1, scale:1 }}
          onClick={e => e.stopPropagation()}
          style={{ background:'#fff', borderRadius:16, width:'min(560px,100%)',
            maxHeight:'88vh', overflowY:'auto', fontFamily:FONT }}>

          <div className="spec-noprint" style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
            <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:'#1a2332' }}>Production Spec Sheet</h2>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => window.print()}
                style={{ padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer',
                  background:T, color:'#fff', fontSize:12, fontWeight:700,
                  display:'flex', alignItems:'center', gap:5 }}>
                <NavIcon name="print" size={13}/> Print / Save PDF
              </button>
              <button onClick={onClose}
                style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer',
                  background:'#f1f5f9', color:'#64748b', fontSize:14 }}>✕</button>
            </div>
          </div>

          <div id="spec-print-area" style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:14, fontWeight:800, margin:0, color:'#1a2332' }}>VFRB Enterprise</p>
                <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0' }}>Bayanan, Muntinlupa City</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:13, fontWeight:700, margin:0, color:T }}>Order #{order?.order_id}</p>
                <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0' }}>
                  {new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}
                </p>
              </div>
            </div>

            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:'.07em', margin:'0 0 6px' }}>Garment</p>
            <Row label="Type">{order?.garment_type ?? '—'}</Row>
            <Row label="Collar">{order?.collar_type ?? '—'}</Row>
            <Row label="Sleeve">{order?.sleeve_type ?? '—'}</Row>
            <Row label="Pocket">{order?.pocket_type ?? '—'}</Row>
            <Row label="Quantity">{order?.quantity_ordered ? `${order.quantity_ordered} pcs` : '—'}</Row>

            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:'.07em', margin:'16px 0 6px' }}>Colors</p>
            {Object.keys(ZONE_LABEL).map(z => colors[z] && (
              <Row key={z} label={ZONE_LABEL[z]}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:14, height:14, borderRadius:4, background:colors[z],
                    border:'1px solid #e2e8f0', display:'inline-block' }}/>
                  {colors[z]}
                </span>
              </Row>
            ))}
            {!Object.keys(colors).length && <Row label="Color">{order?.color ?? '—'}</Row>}

            {(hasLogo || textLayers.length > 0) && (
              <>
                <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'.07em', margin:'16px 0 6px' }}>Branding</p>
                {hasLogo && <Row label="Logo">Placed on garment — see design preview</Row>}
                {textLayers.map((t, i) => (
                  <Row key={i} label={`Text ${i+1}`}>{t.text ?? '—'}</Row>
                ))}
              </>
            )}

            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:'.07em', margin:'16px 0 6px' }}>Production</p>
            <Row label="PO Reference">{order?.po_reference ?? 'N/A'}</Row>
            <Row label="Order Type">{order?.order_type ?? '—'}</Row>
            <Row label="Payment Terms">{order?.payment_terms ?? '—'}</Row>
            <Row label="Target Delivery">
              {order?.target_delivery_date
                ? new Date(order.target_delivery_date).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })
                : '—'}
            </Row>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #spec-print-area, #spec-print-area * { visibility: visible; }
          #spec-print-area { position: fixed; inset: 0; padding: 24px; }
          .spec-noprint { display: none !important; }
        }
      `}</style>
    </AnimatePresence>
  );
}
