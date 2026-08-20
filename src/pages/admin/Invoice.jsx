// src/pages/admin/Invoice.jsx
// VFRB Enterprise — Invoice Generator
// Search orders by ID, generate printable invoice with BOM + payment summary

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getStorageUrl } from '../../utils/fileUrl';

const TEAL  = '#028090';
const TEAL2 = '#02C39A';
const FONT  = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const STATUS_LABEL = {
  pending:'Pending', confirmed:'Confirmed', pattern:'Pattern',
  segregation:'Segregation', cutting:'Cutting', sewing:'Sewing',
  qc:'QC', pressing:'Pressing', packing:'Packing',
  completed:'Completed', cancelled:'Cancelled',
};

export default function AdminInvoice() {
  const [orderId,  setOrderId]  = useState('');
  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const printRef = useRef(null);

  const fetchOrder = async () => {
    if (!orderId.trim()) { setError('Enter an order ID'); return; }
    setLoading(true); setError(''); setOrder(null);
    try {
      const r = await axios.get(`/api/admin/orders/${orderId}`);
      setOrder(r.data?.order ?? r.data);
    } catch (e) {
      setError(e.response?.status === 404
        ? `Order #${orderId} not found`
        : 'Failed to load order. Check the order ID.');
    } finally { setLoading(false); }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
      // Bearer-token auth (not cookie sessions) — a plain <a href> or
      // window.open() wouldn't carry the Authorization header, so this has
      // to go through axios (which already attaches it) as a blob download.
      const res = await axios.get(`/api/admin/orders/${order.order_id}/invoice-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `VFRB-Invoice-ORD-${order.order_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head>
        <title>Invoice #${order?.order_id} — VFRB Enterprise</title>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; color:#0f172a; padding:40px; font-size:13px; }
          h1 { font-size:26px; font-weight:800; }
          h2 { font-size:14px; font-weight:700; margin-bottom:12px; color:#028090; }
          table { width:100%; border-collapse:collapse; margin-bottom:20px; }
          th { background:#f8fafc; padding:8px 12px; text-align:left; font-size:11px;
               text-transform:uppercase; letter-spacing:.05em; color:#64748b;
               border-bottom:2px solid #e2e8f0; }
          td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
          .total-row td { font-weight:700; background:#f0fdfa; border-top:2px solid #028090; }
          .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:11px;
                   font-weight:700; background:#dcfce7; color:#166534; }
          .section { margin-bottom:28px; }
          .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
          .info-block { background:#f8fafc; border-radius:10px; padding:14px; }
          .info-block p { font-size:12px; color:#64748b; margin-bottom:4px; }
          .info-block strong { font-size:14px; color:#0f172a; }
          .divider { border:none; border-top:1px solid #e2e8f0; margin:20px 0; }
          @media print {
            body { padding:20px; }
            button { display:none; }
          }
        </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  // Compute totals
  const recs = order?.recommendations ?? [];
  const txn  = order?.transactions?.[0] ?? order?.transaction ?? null;
  const paid = txn?.amount_paid ?? 0;
  const total = txn?.amount_total ?? 0;
  const balance = Math.max(0, total - paid);

  return (
    <div style={{ fontFamily:FONT, color:'#0f172a' }}>
      <style>{`
        @keyframes inv-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .inv-preview { animation: inv-fade .25s ease-out both; }
        .inv-grid-2  { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .inv-bom-wrap {
          overflow-x:auto; -webkit-overflow-scrolling:touch;
          border-radius:10px; border:1px solid #e2e8f0;
        }
        .inv-bom-wrap table { min-width:480px; width:100%; border-collapse:collapse; }
        @media (max-width:640px) {
          .inv-grid-2 { grid-template-columns:1fr; }
          .inv-header  { flex-direction:column; gap:8px; }
          .inv-actions { flex-direction:column; gap:8px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>
          🧾 Invoice Generator
        </h1>
        <p style={{ color:'#64748b', fontSize:13 }}>
          Search an order to generate a printable invoice.
        </p>
      </div>

      {/* Search */}
      <div style={{ background:'#ffffff', borderRadius:14, border:'1px solid #e2e8f0',
        padding:'20px', marginBottom:24, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
          letterSpacing:'.07em', marginBottom:10 }}>Order ID</p>
        <div style={{ display:'flex', gap:10 }}>
          <input type="number" value={orderId} onChange={e => setOrderId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrder()}
            placeholder="Enter order ID (e.g. 42)"
            style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0',
              background:'#f8fafc', color:'#0f172a', fontSize:13, outline:'none',
              fontFamily:FONT }}
            onFocus={e => { e.target.style.borderColor=TEAL; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,0.1)`; }}
            onBlur={e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; }}/>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={fetchOrder} disabled={loading}
            style={{ padding:'10px 24px', borderRadius:10, border:'none',
              background:`linear-gradient(135deg,${TEAL},${TEAL2})`,
              color:'#fff', fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:FONT, opacity: loading ? .7 : 1 }}>
            {loading ? '⏳ Loading…' : '🔍 Load Order'}
          </motion.button>
        </div>
        {error && (
          <p style={{ color:'#ef4444', fontSize:12, marginTop:10, fontWeight:600 }}>⚠️ {error}</p>
        )}
      </div>

      {/* Invoice Preview */}
      {order && (
        <>
          {/* Print button */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14, gap:10 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={handleDownloadPdf} disabled={downloadingPdf}
              style={{ padding:'10px 22px', borderRadius:10, border:'1px solid #e2e8f0',
                background:'#fff', color:'#0f172a', fontSize:13, fontWeight:700,
                cursor: downloadingPdf ? 'not-allowed' : 'pointer', fontFamily:FONT,
                opacity: downloadingPdf ? 0.6 : 1 }}>
              {downloadingPdf ? '⏳ Generating…' : '📄 Download PDF'}
            </motion.button>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={handlePrint}
              style={{ padding:'10px 22px', borderRadius:10, border:'none',
                background:`linear-gradient(135deg,${TEAL},${TEAL2})`,
                color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:FONT,
                boxShadow:`0 4px 12px rgba(2,128,144,0.25)` }}>
              🖨️ Print / Save PDF
            </motion.button>
          </div>

          {/* Invoice content */}
          <div ref={printRef} className="inv-preview" style={{ background:'#ffffff', borderRadius:16,
            border:'1px solid #e2e8f0', padding:'32px',
            boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* Invoice header */}
            <div className="inv-header" style={{ display:'flex', justifyContent:'space-between',
              alignItems:'flex-start', marginBottom:28, paddingBottom:20,
              borderBottom:'2px solid #e2e8f0' }}>
              <div>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:4 }}>
                  INVOICE
                </h1>
                <p style={{ color:'#64748b', fontSize:13 }}>VFRB Enterprise</p>
                <p style={{ color:'#64748b', fontSize:12 }}>
                  #31 San Guillermo St., Bayanan, Muntinlupa City 1772
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:20, fontWeight:800, color:TEAL }}>
                  #{String(order.order_id).padStart(5,'0')}
                </p>
                <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>
                  Issued: {new Date().toLocaleDateString('en-PH',{
                    month:'long', day:'numeric', year:'numeric'})}
                </p>
                <span style={{ display:'inline-block', marginTop:6, padding:'4px 12px',
                  borderRadius:99, fontSize:11, fontWeight:700,
                  background:'#f0fdfa', color:TEAL, border:`1px solid ${TEAL}30` }}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            </div>

            {/* Client + Order info */}
            <div className="inv-grid-2" style={{ marginBottom:24 }}>
              <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b',
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
                  Bill To
                </p>
                <p style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>
                  {order.user?.name ?? '—'}
                </p>
                {order.user?.organization_name && (
                  <p style={{ color:'#64748b', fontSize:13, marginTop:3 }}>
                    {order.user.organization_name}
                  </p>
                )}
                {order.user?.email && (
                  <p style={{ color:'#64748b', fontSize:12, marginTop:3 }}>
                    {order.user.email}
                  </p>
                )}
                {order.user?.contact_number && (
                  <p style={{ color:'#64748b', fontSize:12, marginTop:2 }}>
                    {order.user.contact_number}
                  </p>
                )}
                <p style={{ color:'#64748b', fontSize:12, marginTop:4 }}>
                  Type: {order.order_type === 'direct' ? 'Direct Client' : 'Institutional / OTG'}
                </p>
              </div>
              <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b',
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
                  Order Details
                </p>
                {[
                  ['Order ID',  `#${order.order_id}`],
                  ['Garment',   order.design?.design_name ?? order.garment_type ?? '—'],
                  ['Color',     order.color ?? '—'],
                  ['Quantity',  `${order.quantity_ordered ?? 0} pcs`],
                  ['Deadline',  (order.negotiated_delivery_date || order.target_delivery_date)
                    ? new Date(order.negotiated_delivery_date || order.target_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                    : 'N/A'],
                  ['PO Ref',    order.po_reference ?? 'N/A'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between',
                    marginBottom:5 }}>
                    <span style={{ color:'#94a3b8', fontSize:12 }}>{label}</span>
                    <span style={{ color:'#0f172a', fontSize:12, fontWeight:600 }}>{val}</span>
                  </div>
                ))}
                {/* NEW (Aug 10 2026) — reference file, staff-facing view.
                    Plain link, not an inline thumbnail — this table is
                    print-oriented and an embedded image would break that.
                    Requires php artisan storage:link on the backend. */}
                {order.client_design_ref_file && (
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                    <span style={{ color:'#94a3b8', fontSize:12 }}>Reference File</span>
                    <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                      style={{ color:'#028090', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      📎 View File →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Design description */}
            {order.client_design_notes && (
              <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:10,
                background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b',
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
                  Design Description
                </p>
                <p style={{ color:'#475569', fontSize:13, lineHeight:1.6 }}>
                  {order.client_design_notes}
                </p>
              </div>
            )}

            {/* BOM Table */}
            {recs.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <p style={{ fontSize:13, fontWeight:700, color:TEAL, marginBottom:10,
                  textTransform:'uppercase', letterSpacing:'.07em' }}>
                  Bill of Materials (BOM)
                </p>
                <div className="inv-bom-wrap"><table>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Material','Unit','Qty Required','In Stock','Status'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left',
                          fontSize:10, fontWeight:700, color:'#64748b',
                          textTransform:'uppercase', letterSpacing:'.05em',
                          borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recs.map((rec, i) => {
                      // estimated_range is a varchar string e.g. "350 yards" — locked column name
                      const inStock = rec.material?.quantity_in_stock ?? 0;
                      const hasStock = inStock > 0;
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'9px 12px', color:'#0f172a', fontSize:13,
                            fontWeight:500 }}>{rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}</td>
                          <td style={{ padding:'9px 12px', color:'#64748b', fontSize:12 }}>
                            {rec.material?.unit ?? '—'}
                          </td>
                          <td style={{ padding:'9px 12px', color:'#0f172a', fontSize:13,
                            fontWeight:600 }}>{rec.estimated_range ?? '—'}</td>
                          <td style={{ padding:'9px 12px', color:'#0f172a', fontSize:12 }}>
                            {inStock > 0 ? inStock : '—'}
                          </td>
                          <td style={{ padding:'9px 12px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10,
                              fontWeight:700,
                              background: hasStock ? '#dcfce7' : '#fef3c7',
                              color: hasStock ? '#166534' : '#92400e' }}>
                              {hasStock ? '✓ In Stock' : '⚠ Check Stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              </div>
            )}

            {/* Payment summary */}
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:13, fontWeight:700, color:TEAL, marginBottom:10,
                textTransform:'uppercase', letterSpacing:'.07em' }}>
                Payment Summary
              </p>
              <div style={{ background:'#f8fafc', borderRadius:12,
                border:'1px solid #e2e8f0', overflow:'hidden' }}>
                {[
                  { label:'Total Amount', val: total > 0 ? `₱${Number(total).toLocaleString('en-PH',{minimumFractionDigits:2})}` : 'To be confirmed' },
                  { label:'Amount Paid',  val: paid > 0  ? `₱${Number(paid).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '₱0.00', color:'#22c55e' },
                  { label:'Balance Due',  val: balance > 0 ? `₱${Number(balance).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '₱0.00',
                    color: balance > 0 ? '#ef4444' : '#22c55e', bold:true },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between',
                    padding:'12px 16px', borderBottom:'1px solid #e2e8f0' }}>
                    <span style={{ color:'#64748b', fontSize:13 }}>{row.label}</span>
                    <span style={{ fontSize:14, fontWeight: row.bold ? 800 : 600,
                      color: row.color ?? '#0f172a' }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ padding:'10px 16px', background:'#f0fdfa' }}>
                  <p style={{ color:'#475569', fontSize:11 }}>
                    {order.order_type === 'direct'
                      ? '80% downpayment upon confirmation · 20% balance upon delivery'
                      : 'Full payment upon delivery (Wednesday close → Friday BDO/Metrobank transfer)'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI explanation */}
            {order.ai_explanation && (
              <div style={{ padding:'14px 16px', borderRadius:12,
                background:'#f0fdfa', border:'1px solid #99f6e4', marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:700, color:TEAL, marginBottom:6,
                  textTransform:'uppercase', letterSpacing:'.07em' }}>
                  🤖 AI Material Explanation
                </p>
                <p style={{ color:'#475569', fontSize:12, lineHeight:1.7 }}>
                  {order.ai_explanation}
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ paddingTop:20, borderTop:'1px solid #e2e8f0',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:11, color:'#94a3b8' }}>
                  Generated by VFRB Enterprise System · {new Date().toLocaleString('en-PH')}
                </p>
                <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                  Hotline: (02) 8XXX-XXXX · vfrb@enterprise.ph
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:12, fontWeight:700, color:TEAL }}>VFRB Enterprise</p>
                <p style={{ fontSize:11, color:'#94a3b8' }}>Garment Manufacturing Since 2000</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
