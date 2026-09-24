// src/pages/admin/Invoice.jsx
// VFRB Enterprise — Invoice Generator
// Search orders by ID, generate printable invoice with BOM + payment summary
//
// RESHAPED (Sept 6 2026): hex → theme.css tokens on all the normally-
// rendered JSX, emoji → NavIcon. Two new icons added (Printer,
// Paperclip), both verified against the real installed lucide-react.
//
// IMPORTANT, DELIBERATELY NOT TOKENIZED: handlePrint()'s injected HTML
// string below. That function opens a brand-new, blank browser window
// via window.open('') and writes a complete standalone document into it
// with document.write() — that window never loads this app's theme.css,
// so any var(--...) reference inside its <style> block would resolve to
// nothing and render unstyled. Its literal hex values are correct as-is
// and were checked against the real tokens (they already match: #028090
// is --teal, #f0fdfa is --teal-50, #0f172a is --ink, etc.) — this isn't
// unfinished token work, it's a different rendering context that
// structurally can't use CSS custom properties. Don't "fix" this later.
//
// STATUS_LABEL here is label-text only, not per-status color — the
// invoice's status badge is ALWAYS teal regardless of order status
// (even a cancelled order's invoice, if ever printed for record-
// keeping, gets a plain neutral label, not an alarming red one). This
// is a deliberate document-design choice distinct from OrderDetail.jsx's
// per-status STATUS_CFG — preserved exactly, not "fixed" to match.
//
// One precision note, not fixed here retroactively: at least 2 already-
// shipped pages (Suppliers.jsx, Inventory.jsx, confirmed by checking
// their real git originals) mapped BOTH #f8fafc (the real --bg token,
// page background) and #f1f5f9 (the real --bg-surface token) to
// var(--bg-surface) indiscriminately — the two hexes are visually close
// but not identical. Cosmetic, not a functional bug. This file
// distinguishes them correctly; the other pages are a real, mechanical,
// batchable follow-up if a full precision pass is wanted later, not
// something quietly patched in passing here.
//
// Aug 28 2026 BOM note (estimated_range/Qty Required removed, no
// formula/BOM exists in this system, Actual Used sourced from
// actual_qty_issued) and the reference-file link's storage:link
// requirement — both real, both untouched.

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getStorageUrl } from '../../utils/fileUrl';
import { NavIcon } from '../../components/ui';

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
    // See file header note — this document has no access to theme.css,
    // so every color below is intentionally a literal hex, verified to
    // already match the real tokens (var(--teal)=#028090, var(--ink)=
    // #0f172a, var(--bg-surface)=#f1f5f9, var(--border)=#e2e8f0,
    // var(--text-subtle)=#64748b, var(--bg)=#f8fafc, var(--teal-50)=
    // #f0fdfa, var(--success-bg)-adjacent=#dcfce7, success-text=#166534).
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
    <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}>
      <style>{`
        @keyframes inv-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .inv-preview { animation: inv-fade .25s ease-out both; }
        .inv-grid-2  { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .inv-bom-wrap {
          overflow-x:auto; -webkit-overflow-scrolling:touch;
          border-radius:var(--r-md); border:1px solid var(--border);
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
        <h1 style={{ display:'flex', alignItems:'center', gap:8, fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>
          <NavIcon name="invoice" size={20} color="var(--ink)" /> Invoice Generator
        </h1>
        <p style={{ color:'var(--text-subtle)', fontSize:13 }}>
          Search an order to generate a printable invoice.
        </p>
      </div>

      {/* Search */}
      <div style={{ background:'var(--bg-card)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)',
        padding:'20px', marginBottom:24, boxShadow:'var(--shadow-xs)' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase',
          letterSpacing:'.07em', marginBottom:10 }}>Order ID</p>
        <div style={{ display:'flex', gap:10 }}>
          <input type="number" value={orderId} onChange={e => setOrderId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrder()}
            placeholder="Enter order ID (e.g. 42)"
            style={{ flex:1, padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
              background:'var(--bg)', color:'var(--ink)', fontSize:13, outline:'none',
              fontFamily:'var(--font)' }}
            onFocus={e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,0.1)'; }}
            onBlur={e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; }}/>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={fetchOrder} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 24px', borderRadius:'var(--r-md)', border:'none',
              background:'linear-gradient(135deg,var(--teal),var(--teal-2))',
              color:'#fff', fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'var(--font)', opacity: loading ? .7 : 1 }}>
            <NavIcon name={loading ? 'loading' : 'search'} size={14} color="#fff" style={loading ? { animation:'inv-spin .8s linear infinite' } : undefined} />
            {loading ? 'Loading…' : 'Load Order'}
          </motion.button>
        </div>
        {error && (
          <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12, marginTop:10, fontWeight:600 }}>
            <NavIcon name="warning" size={13} color="var(--danger)" />{error}
          </p>
        )}
      </div>

      {/* Invoice Preview */}
      {order && (
        <>
          {/* Print button */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14, gap:10 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={handleDownloadPdf} disabled={downloadingPdf}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
                background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:700,
                cursor: downloadingPdf ? 'not-allowed' : 'pointer', fontFamily:'var(--font)',
                opacity: downloadingPdf ? 0.6 : 1 }}>
              <NavIcon name={downloadingPdf ? 'loading' : 'download'} size={14} color="var(--ink)" style={downloadingPdf ? { animation:'inv-spin .8s linear infinite' } : undefined} />
              {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </motion.button>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={handlePrint}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:'var(--r-md)', border:'none',
                background:'linear-gradient(135deg,var(--teal),var(--teal-2))',
                color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'var(--font)',
                boxShadow:'var(--shadow-teal)' }}>
              <NavIcon name="print" size={14} color="#fff" /> Print / Save PDF
            </motion.button>
          </div>

          {/* Invoice content */}
          <div ref={printRef} className="inv-preview" style={{ background:'var(--bg-card)', borderRadius:'var(--r-xl)',
            border:'1px solid var(--border)', padding:'32px',
            boxShadow:'var(--shadow-sm)' }}>

            {/* Invoice header */}
            <div className="inv-header" style={{ display:'flex', justifyContent:'space-between',
              alignItems:'flex-start', marginBottom:28, paddingBottom:20,
              borderBottom:'2px solid var(--border)' }}>
              <div>
                <h1 style={{ fontSize:26, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>
                  INVOICE
                </h1>
                <p style={{ color:'var(--text-subtle)', fontSize:13 }}>VFRB Enterprise</p>
                <p style={{ color:'var(--text-subtle)', fontSize:12 }}>
                  #31 San Guillermo St., Bayanan, Muntinlupa City 1772
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:20, fontWeight:800, color:'var(--teal)' }}>
                  #{String(order.order_id).padStart(5,'0')}
                </p>
                <p style={{ color:'var(--text-subtle)', fontSize:12, marginTop:4 }}>
                  Issued: {new Date().toLocaleDateString('en-PH',{
                    month:'long', day:'numeric', year:'numeric'})}
                </p>
                <span style={{ display:'inline-block', marginTop:6, padding:'4px 12px',
                  borderRadius:'var(--r-full)', fontSize:11, fontWeight:700,
                  background:'var(--teal-50)', color:'var(--teal)', border:'1px solid rgba(2,128,144,0.3)' }}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            </div>

            {/* Client + Order info */}
            <div className="inv-grid-2" style={{ marginBottom:24 }}>
              <div style={{ background:'var(--bg)', borderRadius:'var(--r-lg)', padding:'16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-subtle)',
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
                  Bill To
                </p>
                <p style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>
                  {order.user?.name ?? '—'}
                </p>
                {order.user?.organization_name && (
                  <p style={{ color:'var(--text-subtle)', fontSize:13, marginTop:3 }}>
                    {order.user.organization_name}
                  </p>
                )}
                {order.user?.email && (
                  <p style={{ color:'var(--text-subtle)', fontSize:12, marginTop:3 }}>
                    {order.user.email}
                  </p>
                )}
                {order.user?.contact_number && (
                  <p style={{ color:'var(--text-subtle)', fontSize:12, marginTop:2 }}>
                    {order.user.contact_number}
                  </p>
                )}
                <p style={{ color:'var(--text-subtle)', fontSize:12, marginTop:4 }}>
                  Type: {order.order_type === 'direct' ? 'Direct Client' : 'Institutional / OTG'}
                </p>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:'var(--r-lg)', padding:'16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-subtle)',
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
                    <span style={{ color:'var(--text-faint)', fontSize:12 }}>{label}</span>
                    <span style={{ color:'var(--ink)', fontSize:12, fontWeight:600 }}>{val}</span>
                  </div>
                ))}
                {/* NEW (Aug 10 2026) — reference file, staff-facing view.
                    Plain link, not an inline thumbnail — this table is
                    print-oriented and an embedded image would break that.
                    Requires php artisan storage:link on the backend. */}
                {order.client_design_ref_file && (
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
                    <span style={{ color:'var(--text-faint)', fontSize:12 }}>Reference File</span>
                    <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:4, color:'var(--teal)', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      <NavIcon name="attachment" size={12} color="var(--teal)" /> View File →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Design description */}
            {order.client_design_notes && (
              <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:'var(--r-md)',
                background:'var(--bg)', border:'1px solid var(--border)' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-subtle)',
                  textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
                  Design Description
                </p>
                <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6 }}>
                  {order.client_design_notes}
                </p>
              </div>
            )}

            {/* BOM Table — Aug 28 2026: "Qty Required" column removed (no
                formula/BOM exists in this system). Replaced with "Actual
                Used", sourced from actual_qty_issued — the real,
                staff-entered quantity from Pattern-stage completion. */}
            {recs.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--teal)', marginBottom:10,
                  textTransform:'uppercase', letterSpacing:'.07em' }}>
                  Bill of Materials (BOM)
                </p>
                <div className="inv-bom-wrap"><table>
                  <thead>
                    <tr style={{ background:'var(--bg)' }}>
                      {['Material','Unit','Actual Used','In Stock','Status'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left',
                          fontSize:10, fontWeight:700, color:'var(--text-subtle)',
                          textTransform:'uppercase', letterSpacing:'.05em',
                          borderBottom:'2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recs.map((rec, i) => {
                      const inStock = rec.material?.quantity_in_stock ?? 0;
                      const hasStock = inStock > 0;
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid var(--bg-surface)' }}>
                          <td style={{ padding:'9px 12px', color:'var(--ink)', fontSize:13,
                            fontWeight:500 }}>{rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}</td>
                          <td style={{ padding:'9px 12px', color:'var(--text-subtle)', fontSize:12 }}>
                            {rec.material?.unit ?? '—'}
                          </td>
                          <td style={{ padding:'9px 12px', color:'var(--ink)', fontSize:13,
                            fontWeight:600 }}>{rec.actual_qty_issued != null ? rec.actual_qty_issued : 'Not yet issued'}</td>
                          <td style={{ padding:'9px 12px', color:'var(--ink)', fontSize:12 }}>
                            {inStock > 0 ? inStock : '—'}
                          </td>
                          <td style={{ padding:'9px 12px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:'var(--r-full)', fontSize:10,
                              fontWeight:700,
                              background: hasStock ? 'var(--success-bg)' : 'var(--warning-bg)',
                              color: hasStock ? 'var(--success)' : 'var(--warning)' }}>
                              <NavIcon name={hasStock ? 'success' : 'warning'} size={10} color={hasStock ? 'var(--success)' : 'var(--warning)'} />
                              {hasStock ? 'In Stock' : 'Check Stock'}
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
              <p style={{ fontSize:13, fontWeight:700, color:'var(--teal)', marginBottom:10,
                textTransform:'uppercase', letterSpacing:'.07em' }}>
                Payment Summary
              </p>
              <div style={{ background:'var(--bg)', borderRadius:'var(--r-lg)',
                border:'1px solid var(--border)', overflow:'hidden' }}>
                {[
                  { label:'Total Amount', val: total > 0 ? `₱${Number(total).toLocaleString('en-PH',{minimumFractionDigits:2})}` : 'To be confirmed' },
                  { label:'Amount Paid',  val: paid > 0  ? `₱${Number(paid).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '₱0.00', color:'var(--success)' },
                  { label:'Balance Due',  val: balance > 0 ? `₱${Number(balance).toLocaleString('en-PH',{minimumFractionDigits:2})}` : '₱0.00',
                    color: balance > 0 ? 'var(--danger)' : 'var(--success)', bold:true },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between',
                    padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-subtle)', fontSize:13 }}>{row.label}</span>
                    <span style={{ fontSize:14, fontWeight: row.bold ? 800 : 600,
                      color: row.color ?? 'var(--ink)' }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ padding:'10px 16px', background:'var(--teal-50)' }}>
                  <p style={{ color:'var(--text-muted)', fontSize:11 }}>
                    {order.order_type === 'direct'
                      ? '80% downpayment upon confirmation · 20% balance upon delivery'
                      : 'Full payment upon delivery (Wednesday close → Friday BDO/Metrobank transfer)'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI explanation */}
            {order.ai_explanation && (
              <div style={{ padding:'14px 16px', borderRadius:'var(--r-lg)',
                background:'var(--teal-50)', border:'1px solid var(--teal-100)', marginBottom:20 }}>
                <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'var(--teal)', marginBottom:6,
                  textTransform:'uppercase', letterSpacing:'.07em' }}>
                  <NavIcon name="ai" size={12} color="var(--teal)" /> AI Material Explanation
                </p>
                <p style={{ color:'var(--text-muted)', fontSize:12, lineHeight:1.7 }}>
                  {order.ai_explanation}
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ paddingTop:20, borderTop:'1px solid var(--border)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:11, color:'var(--text-faint)' }}>
                  Generated by VFRB Enterprise System · {new Date().toLocaleString('en-PH')}
                </p>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>
                  Hotline: (02) 8XXX-XXXX · vfrb@enterprise.ph
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--teal)' }}>VFRB Enterprise</p>
                <p style={{ fontSize:11, color:'var(--text-faint)' }}>Garment Manufacturing Since 2000</p>
              </div>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes inv-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
