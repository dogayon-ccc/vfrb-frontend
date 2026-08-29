// src/pages/admin/OrderDetail.jsx
// VFRB Enterprise — Admin Order Detail
//
// NEW (Aug 14 2026): the admin "View"/"View Details" action previously
// pointed at ProductionTracking.jsx — which only shows the 7-stage
// pipeline, not the actual order/design. This page is the missing piece:
// a full read view of one order for staff/managers, reusing the exact
// same backend payload already built for the Invoice page (adminShow() /
// buildOrderDetail()) — no new backend endpoint, no new DB columns.
//
// Design-visual handling:
//   - Design Studio orders (order.studio_config present) → GarmentPreview3D
//     is fed cfg={order.studio_config} directly, same component the
//     customer portal already uses. No new 3D code.
//   - Reference-photo orders (order.client_design_ref_file, no
//     studio_config) → the uploaded photo is shown large via <img>,
//     with a separate "Download Reference" link for the raw file.
//   - Orders with neither: no crash — GarmentPreview3D itself already
//     returns null when both cfg and referenceImageUrl are absent, and
//     this page shows a plain "No design submitted" placeholder instead.
//
// Production/BOM/payment sections reuse the exact field names already
// proven correct in Invoice.jsx (rec.material_name / rec.actual_qty_issued,
// txn.amount_paid / txn.amount_total) — not reinvented.
//
// PDF: reuses the existing GET /api/admin/orders/:id/invoice-pdf endpoint
// as-is. Nothing in the PDF pipeline (OrderController::downloadInvoicePdf,
// buildOrderDetail, resources/views/pdf/invoice.blade.php) is touched.

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getStorageUrl, isImageFile } from '../../utils/fileUrl';
import GarmentPreview3D from '../../components/GarmentPreview3D';

// Fresh-per-mount role check (Aug 23 2026) — NEVER hoist this to module
// scope. A module-scope const here reproduced the exact stale-permission
// bug already fixed once in Settings.jsx: switching accounts in the same
// browser tab without a hard reload would leave a manager's permissions
// stuck on a staff account. This function is called inside the component
// body instead, so it re-reads localStorage on every mount.
function getIsManager() {
  try {
    return (JSON.parse(localStorage.getItem('vfrb_user') || '{}').role) === 'manager';
  } catch { return false; }
}

const TEAL  = '#028090';
const TEAL2 = '#02C39A';
const FONT  = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// Same 11-status map as Orders.jsx — kept in sync manually since there's
// no shared constants file for this in the current codebase.
const STATUS_CFG = {
  pending:     { color:'#f59e0b', bg:'#fef3c7', label:'Pending'     },
  confirmed:   { color:'#3b82f6', bg:'#dbeafe', label:'Confirmed'   },
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', label:'Pattern'     },
  segregation: { color:'#f59e0b', bg:'#fef3c7', label:'Segregation' },
  cutting:     { color:'#ec4899', bg:'#fce7f3', label:'Cutting'     },
  sewing:      { color:'#06b6d4', bg:'#cffafe', label:'Sewing'      },
  qc:          { color:'#3b82f6', bg:'#dbeafe', label:'QC'          },
  pressing:    { color:'#f97316', bg:'#ffedd5', label:'Pressing'    },
  packing:     { color:'#a855f7', bg:'#f3e8ff', label:'Packing'     },
  completed:   { color:'#22c55e', bg:'#dcfce7', label:'Completed'   },
  cancelled:   { color:'#ef4444', bg:'#fee2e2', label:'Cancelled'   },
};

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
        letterSpacing:'.04em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'#1a2332' }}>{value ?? '—'}</div>
    </div>
  );
}

function Card({ title, children, right }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
      padding:20, marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h3 style={{ margin:0, fontSize:13, fontWeight:800, color:'#334155',
          textTransform:'uppercase', letterSpacing:'.04em' }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Review & Confirm panel (Aug 23 2026) ─────────────────────────────────────
// Real, demo-relevant gap closed here: the backend (OrderController::
// adminUpdate) and schema (orders.status, .negotiated_delivery_date,
// .agreed_total) already supported this negotiation-before-production
// workflow — described directly by Ma'am Fe in the interview transcript
// (capacity-check negotiation on bulk POs) — but there was no manager-
// facing UI to actually do it. This is that missing piece.
// Manager-only, and only shown while status is still 'pending' — once
// confirmed or cancelled, this panel disappears and the read-only
// "Negotiated Delivery" field above (already existing) takes over.
function ReviewPanel({ order, onUpdated }) {
  const [negotiatedDate, setNegotiatedDate] = useState(order.target_delivery_date ?? '');
  const [agreedTotal,    setAgreedTotal]    = useState('');
  const [notes,          setNotes]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [err,            setErr]            = useState('');

  const submit = async (status) => {
    if (status === 'cancelled' && !notes.trim()) {
      setErr('A reason is required to cancel an order — this is sent to the customer.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const payload = { status, notes };
      if (negotiatedDate) payload.negotiated_delivery_date = negotiatedDate;
      if (agreedTotal)    payload.agreed_total = agreedTotal;
      const r = await axios.patch(`/api/admin/orders/${order.order_id}`, payload);
      onUpdated(r.data);
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Could not update the order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14,
      padding:20, marginBottom:16 }}>
      <h3 style={{ margin:'0 0 4px', fontSize:13, fontWeight:800, color:'#92400e',
        textTransform:'uppercase', letterSpacing:'.04em' }}>⚠ Review & Confirm</h3>
      <p style={{ fontSize:12, color:'#92400e', margin:'0 0 16px' }}>
        This order is pending — nothing proceeds to production until it's confirmed here.
        Propose a delivery date and total if the customer's request needs adjusting, or cancel with a reason.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:14 }}>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#78716c',
            textTransform:'uppercase', marginBottom:6 }}>Negotiated Delivery Date</label>
          <input type="date" value={negotiatedDate} onChange={e => setNegotiatedDate(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0',
              fontSize:13, boxSizing:'border-box' }}/>
          <p style={{ fontSize:11, color:'#a8a29e', margin:'4px 0 0' }}>
            Customer requested: {order.target_delivery_date ?? '—'}. Leave unchanged to accept it as-is.
          </p>
        </div>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#78716c',
            textTransform:'uppercase', marginBottom:6 }}>Agreed Total (₱)</label>
          <input type="number" min="0" step="0.01" value={agreedTotal}
            onChange={e => setAgreedTotal(e.target.value)} placeholder="Optional — can be set later at payment"
            style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0',
              fontSize:13, boxSizing:'border-box' }}/>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#78716c',
          textTransform:'uppercase', marginBottom:6 }}>Notes (required if cancelling)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="e.g. Quantity exceeds this week's production quota, proposing split delivery"
          style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0',
            fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}/>
      </div>

      {err && <p style={{ color:'#dc2626', fontSize:12, fontWeight:600, margin:'0 0 12px' }}>{err}</p>}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={() => submit('confirmed')} disabled={busy}
          style={{ padding:'10px 20px', borderRadius:9, border:'none', cursor: busy ? 'wait' : 'pointer',
            background:'#16a34a', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
          {busy ? 'Working…' : '✓ Confirm Order'}
        </button>
        <button onClick={() => submit('cancelled')} disabled={busy}
          style={{ padding:'10px 20px', borderRadius:9, border:'1px solid #dc2626', cursor: busy ? 'wait' : 'pointer',
            background:'#fff', color:'#dc2626', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
          ✕ Cancel Order
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const r = await axios.get(`/api/admin/orders/${id}`);
        if (!cancelled) setOrder(r.data?.order ?? r.data);
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.status === 404
            ? `Order #${id} not found`
            : 'Failed to load order.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
      // Same blob-download pattern as Invoice.jsx — Bearer auth means a
      // plain <a href> can't be used, has to go through axios.
      const res = await axios.get(`/api/admin/orders/${order.order_id}/invoice-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `VFRB-Order-${order.order_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return <div style={{ padding:40, fontFamily:FONT, color:'#64748b' }}>Loading order…</div>;
  }
  if (error) {
    return (
      <div style={{ padding:40, fontFamily:FONT }}>
        <p style={{ color:'#ef4444', fontWeight:600 }}>{error}</p>
        <button onClick={() => navigate('/admin/orders')} style={{
          marginTop:12, padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0',
          background:'#f8fafc', cursor:'pointer', fontFamily:FONT }}>← Back to Orders</button>
      </div>
    );
  }
  if (!order) return null;

  const st = STATUS_CFG[order.status] ?? { color:'#64748b', bg:'#f1f5f9', label:order.status ?? '—' };
  const recs = order.recommendations ?? [];
  const txn  = order.transactions?.[0] ?? null;

  const hasStudioConfig = !!order.studio_config;
  const hasRefFile      = !!order.client_design_ref_file;
  const refIsImage      = hasRefFile && isImageFile(order.client_design_ref_file);

  return (
    <div style={{ fontFamily:FONT, padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <button onClick={() => navigate('/admin/orders')} style={{
            background:'none', border:'none', color:'#64748b', fontSize:13, fontWeight:600,
            cursor:'pointer', padding:0, marginBottom:8, fontFamily:FONT }}>← All Orders</button>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#1a2332' }}>
            Order #{order.order_id}
          </h1>
          <div style={{ marginTop:6, fontSize:13, color:'#64748b' }}>
            {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs · {order.color ?? '—'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:700,
            color:st.color, background:st.bg }}>{st.label}</span>
          <button onClick={() => navigate(`/admin/production/${order.order_id}`)} style={{
            padding:'8px 16px', borderRadius:9, border:'none', cursor:'pointer',
            background:`linear-gradient(135deg,${TEAL},${TEAL2})`, color:'#fff',
            fontSize:13, fontWeight:700, fontFamily:FONT }}>▶ Track Production</button>
          <button onClick={handleDownloadPdf} disabled={downloadingPdf} style={{
            padding:'8px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff',
            color:'#334155', fontSize:13, fontWeight:600, cursor:downloadingPdf ? 'default' : 'pointer',
            fontFamily:FONT, opacity:downloadingPdf ? 0.6 : 1 }}>
            {downloadingPdf ? 'Generating…' : '⬇ Download Order Summary (PDF)'}
          </button>
        </div>
      </div>

      {/* Review & Confirm — manager-only, pending orders only */}
      {order.status === 'pending' && getIsManager() && (
        <ReviewPanel order={order} onUpdated={(updated) => setOrder(o => ({ ...o, ...updated }))}/>
      )}

      {/* Design visual — the core of this page */}
      <Card title="Submitted Design">
        {hasStudioConfig ? (
          <div style={{ display:'flex', justifyContent:'center' }}>
            <GarmentPreview3D cfg={order.studio_config} height={360} autoRotate showLabel={false}/>
          </div>
        ) : refIsImage ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <img src={getStorageUrl(order.client_design_ref_file)} alt="Customer reference"
              style={{ maxWidth:'100%', maxHeight:480, borderRadius:12, border:'1px solid #e2e8f0',
                objectFit:'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
            <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, fontWeight:600, color:TEAL, textDecoration:'none' }}>
              ⬇ Download Reference File
            </a>
          </div>
        ) : hasRefFile ? (
          // Non-image reference file (e.g. PDF) — no <img>, just the link.
          <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:14, fontWeight:600, color:TEAL, textDecoration:'none' }}>
            ⬇ Download Reference File
          </a>
        ) : (
          <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
            No design submitted for this order.
          </div>
        )}
        {order.client_design_notes && (
          <div style={{ marginTop:16, padding:12, background:'#f8fafc', borderRadius:10,
            fontSize:13, color:'#475569', lineHeight:1.5 }}>
            <strong style={{ color:'#334155' }}>Customer notes: </strong>{order.client_design_notes}
          </div>
        )}
      </Card>

      {/* Order specifications */}
      <Card title="Order Specifications">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16 }}>
          <Field label="Garment Type"   value={order.garment_type}/>
          <Field label="Quantity"       value={order.quantity_ordered ? `${order.quantity_ordered} pcs` : null}/>
          <Field label="Color"          value={order.color}/>
          <Field label="Collar"         value={order.collar_type}/>
          <Field label="Sleeve"         value={order.sleeve_type}/>
          <Field label="Pocket"         value={order.pocket_type}/>
          <Field label="Order Type"     value={order.order_type}/>
          <Field label="Sizing Type"    value={order.sizing_type}/>
          <Field label="PO Reference"   value={order.po_reference}/>
          <Field label="Target Delivery" value={order.target_delivery_date}/>
          <Field label="Negotiated Delivery" value={order.negotiated_delivery_date}/>
        </div>
      </Card>

      {/* Customer */}
      <Card title="Customer">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16 }}>
          <Field label="Name"          value={order.user?.name}/>
          <Field label="Organization"  value={order.user?.organization_name}/>
          <Field label="Email"         value={order.user?.email}/>
          <Field label="Contact"       value={order.user?.contact_number}/>
        </div>
      </Card>

      {/* Material recommendations — Aug 28 2026: estimated_range column
          removed (no formula/BOM exists in this system). Replaced with
          Actual Used, sourced from actual_qty_issued — the real,
          staff-entered quantity from Pattern-stage completion. Null until
          Pattern actually completes for this order. */}
      <Card title="Material Recommendations">
        {recs.length === 0 ? (
          <div style={{ color:'#94a3b8', fontSize:13 }}>No material recommendations recorded yet.</div>
        ) : (
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:400 }}>
            <thead>
              <tr style={{ textAlign:'left', color:'#94a3b8', fontSize:11, textTransform:'uppercase' }}>
                <th style={{ padding:'6px 8px' }}>Material</th>
                <th style={{ padding:'6px 8px' }}>Actual Used</th>
                <th style={{ padding:'6px 8px' }}>In Stock</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((rec, i) => (
                <tr key={rec.rec_id ?? i} style={{ borderTop:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'8px', fontWeight:500 }}>
                    {rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}
                  </td>
                  <td style={{ padding:'8px', fontWeight:600 }}>
                    {rec.actual_qty_issued != null ? `${rec.actual_qty_issued} ${rec.unit ?? ''}` : 'Not yet issued'}
                  </td>
                  <td style={{ padding:'8px', color:'#64748b' }}>
                    {rec.material?.quantity_in_stock ?? '—'} {rec.material?.unit ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Payment / transaction history */}
      <Card title="Payment">
        {!txn ? (
          <div style={{ color:'#94a3b8', fontSize:13 }}>No payment records yet.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16 }}>
            <Field label="Amount Paid"  value={txn.amount_paid  != null ? `₱${txn.amount_paid}`  : null}/>
            <Field label="Amount Total" value={txn.amount_total != null ? `₱${txn.amount_total}` : null}/>
            <Field label="Balance Due"
              value={(txn.amount_total != null && txn.amount_paid != null)
                ? `₱${(txn.amount_total - txn.amount_paid)}` : null}/>
            <Field label="Date Processed" value={txn.date_processed}/>
          </div>
        )}
      </Card>

    </div>
  );
}
