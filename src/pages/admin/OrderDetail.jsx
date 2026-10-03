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
//
// RESHAPED (Sept 6 2026): this file had its own local Card({title,
// children, right}) component, duplicating the shared one — checked
// first (grep for `right=`) and confirmed zero call sites actually used
// the `right` prop, so this was a clean 1:1 swap for the real shared
// Card, not an adaptation. STATUS_CFG's 11 real order statuses are
// mapped to real tokens using the SAME assignments already established
// on ProductionList.jsx for the 7 shared production stages (pattern=
// purple, segregation=purple-dark, cutting=info, sewing=teal, qc=
// warning, pressing=purple-dark [same flagged compromise as before],
// packing=success) — this matters more here than a fresh mapping would,
// since a manager going from the Orders list to Production Tracking to
// this detail page should see the same stage read the same color every
// time, not three independently-chosen palettes for the same 7 values.
// The 4 non-production statuses map cleanly: pending=warning,
// confirmed=info, completed=success, cancelled=danger.
//
// ReviewPanel's negotiation workflow (interview-grounded — Ma'am Fe's
// capacity-check negotiation on bulk POs) is real, load-bearing logic,
// completely untouched. Emoji → NavIcon throughout.

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getStorageUrl, isImageFile } from '../../utils/fileUrl';
import DesignPreview from '../../components/DesignPreview';
import { NavIcon } from '../../components/ui';
import { Panel, StatusPill, Meter, EmptyBlock, useIsMobile } from '../../components/admin/AdminUI';

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

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];
const STAGE_LABEL = { pattern:'Pattern', segregation:'Segregation', cutting:'Cutting', sewing:'Sewing', qc:'QC', pressing:'Pressing', packing:'Packing' };
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : null);

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase',
        letterSpacing:'.04em', marginBottom:4, fontFamily:'var(--font)' }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', fontFamily:'var(--font)' }}>{value ?? '—'}</div>
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
    <div style={{ background:'var(--warning-bg)', border:'1px solid var(--warning-border)', borderRadius:'var(--r-lg)',
      padding:20, marginBottom:16 }}>
      <h3 style={{ display:'flex', alignItems:'center', gap:7, margin:'0 0 4px', fontSize:13, fontWeight:800, color:'var(--warning)',
        textTransform:'uppercase', letterSpacing:'.04em', fontFamily:'var(--font)' }}>
        <NavIcon name="warning" size={14} color="var(--warning)" /> Review & Confirm
      </h3>
      <p style={{ fontSize:12, color:'var(--warning)', margin:'0 0 16px', fontFamily:'var(--font)' }}>
        This order is pending — nothing proceeds to production until it's confirmed here.
        Propose a delivery date and total if the customer's request needs adjusting, or cancel with a reason.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:14 }}>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-subtle)',
            textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Negotiated Delivery Date</label>
          <input type="date" value={negotiatedDate} onChange={e => setNegotiatedDate(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
              fontSize:13, boxSizing:'border-box', fontFamily:'var(--font)', background:'var(--bg-card)', color:'var(--ink)' }}/>
          <p style={{ fontSize:11, color:'var(--text-faint)', margin:'4px 0 0', fontFamily:'var(--font)' }}>
            Client requested: {order.target_delivery_date ?? '—'}. Leave unchanged to accept it as-is.
          </p>
        </div>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-subtle)',
            textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Agreed Total (₱)</label>
          <input type="number" min="0" step="0.01" value={agreedTotal}
            onChange={e => setAgreedTotal(e.target.value)} placeholder="Optional — can be set later at payment"
            style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
              fontSize:13, boxSizing:'border-box', fontFamily:'var(--font)', background:'var(--bg-card)', color:'var(--ink)' }}/>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-subtle)',
          textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Notes (required if cancelling)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="e.g. Quantity exceeds this week's production quota, proposing split delivery"
          style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
            fontSize:13, fontFamily:'var(--font)', resize:'vertical', boxSizing:'border-box', background:'var(--bg-card)', color:'var(--ink)' }}/>
      </div>

      {err && (
        <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12, fontWeight:600, margin:'0 0 12px', fontFamily:'var(--font)' }}>
          <NavIcon name="warning" size={13} color="var(--danger)" />{err}
        </p>
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={() => submit('confirmed')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'none', cursor: busy ? 'wait' : 'pointer',
            background:'var(--success)', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          {busy ? 'Working…' : <><NavIcon name="success" size={14} color="#fff" /> Confirm Order</>}
        </button>
        <button onClick={() => submit('cancelled')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'1px solid var(--danger)', cursor: busy ? 'wait' : 'pointer',
            background:'var(--bg-card)', color:'var(--danger)', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          <NavIcon name="close" size={14} color="var(--danger)" /> Cancel Order
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [stages,  setStages]  = useState(null); // null = loading, [] = none recorded, false = unavailable

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setStages(null);
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
      // Production progress — same endpoint ProductionTracking already uses.
      try {
        const p = await axios.get(`/api/admin/orders/${id}/production`);
        const list = p.data?.stages ?? p.data;
        if (!cancelled) setStages(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setStages(false);
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
    return (
      <div className="adm-od">
        <div className="adm-sk" style={{ height:28, width:180, marginBottom:10 }} />
        <div className="adm-sk" style={{ height:16, width:260, marginBottom:20 }} />
        <div className="adm-sk" style={{ height:320, marginBottom:14 }} />
        <div className="adm-sk" style={{ height:160 }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="adm-od">
        <div className="adm-err"><span>{error}</span></div>
        <button className="adm-btn" style={{ marginTop:12 }} onClick={() => navigate('/admin/orders')}>
          <NavIcon name="back" size={14} color="currentColor" /> Back to Orders
        </button>
      </div>
    );
  }
  if (!order) return null;

  const recs = order.recommendations ?? [];
  const txn  = order.transactions?.[0] ?? null;
  const client = order.user ?? {};
  const clientName = client.name ?? order.customer_name;

  const hasStudioConfig = !!order.studio_config;
  const hasRefFile      = !!order.client_design_ref_file;
  const refIsImage      = hasRefFile && isImageFile(order.client_design_ref_file);

  const stageRows = Array.isArray(stages) ? STAGES.map((k) => ({ key:k, row: stages.find((t) => t.stage === k) })) : [];
  const stagesWithData = stageRows.filter((x) => x.row);
  const qcHold = order.status === 'qc' && order.qc_required && !order.qc_passed_at;

  return (
    <div className="adm-od">

      {/* 1 · Order identity */}
      <div className="adm-od-head">
        <div style={{ minWidth:0 }}>
          <button className="adm-link-btn" onClick={() => navigate('/admin/orders')} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:0, marginBottom:8, color:'var(--text-subtle)' }}>
            <NavIcon name="back" size={13} color="currentColor" /> All Orders
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <h1 className="adm-h1" style={{ margin:0, fontSize:24 }}>Order #{order.order_id}</h1>
            <StatusPill status={order.status} />
          </div>
          <div className="adm-sub" style={{ marginTop:6 }}>
            {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs · {order.color ?? '—'}
            {order.po_reference ? ` · PO ${order.po_reference}` : ''}
          </div>
        </div>
        <div className="adm-actions">
          <button className="adm-btn primary" onClick={() => navigate(`/admin/production/${order.order_id}`)}>
            <NavIcon name="production" size={14} color="currentColor" /> Track Production
          </button>
          <button className="adm-btn" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            <NavIcon name="download" size={14} color="currentColor" />
            {downloadingPdf ? 'Generating…' : 'Order Summary (PDF)'}
          </button>
        </div>
      </div>

      {/* Review & Confirm — manager-only, pending orders only */}
      {order.status === 'pending' && getIsManager() && (
        <ReviewPanel order={order} onUpdated={(updated) => setOrder(o => ({ ...o, ...updated }))}/>
      )}

      <div className="adm-od-grid">
        {/* Side column: client, order info, production, QC, delivery, communication.
            On phones it follows DOM order: client → design → ... via CSS order. */}
        <div className="adm-od-side">
          {/* 2 · Client */}
          <Panel title="Client" style={{ order:1 }}>
            <div className="adm-od-fields">
              <Field label="Name"          value={clientName}/>
              <Field label="Organization"  value={client.organization_name ?? order.organization_name}/>
              <Field label="Email"         value={client.email}/>
              <Field label="Contact"       value={client.contact_number}/>
            </div>
          </Panel>

          {/* 4 · Order information */}
          <Panel title="Order Information" style={{ order:3 }}>
            <div className="adm-od-fields">
              <Field label="Garment Type"   value={order.garment_type}/>
              <Field label="Quantity"       value={order.quantity_ordered ? `${order.quantity_ordered} pcs` : null}/>
              <Field label="Color"          value={order.color}/>
              <Field label="Collar"         value={order.collar_type}/>
              <Field label="Sleeve"         value={order.sleeve_type}/>
              <Field label="Pocket"         value={order.pocket_type}/>
              <Field label="Order Type"     value={order.order_type}/>
              <Field label="Sizing Type"    value={order.sizing_type}/>
              <Field label="PO Reference"   value={order.po_reference}/>
            </div>
          </Panel>

          {/* 5 · Production — real per-stage qty from order_production_tracking */}
          <Panel title="Production" style={{ order:4 }}
            action={<button className="adm-link-btn" onClick={() => navigate(`/admin/production/${order.order_id}`)}>Open tracking →</button>}>
            {stages === null ? (
              <div className="adm-sk" style={{ height:120 }} />
            ) : stages === false ? (
              <EmptyBlock>Production progress is unavailable right now.</EmptyBlock>
            ) : stagesWithData.length === 0 ? (
              <EmptyBlock>{order.status === 'pending' ? 'Production starts once the order is confirmed.' : 'No stage activity recorded yet.'}</EmptyBlock>
            ) : (
              <div className="adm-od-stages">
                {stagesWithData.map(({ key, row }) => {
                  const target = Number(row.qty_target) || 0;
                  const done = Number(row.qty_completed) || 0;
                  const complete = target > 0 && done >= target;
                  return (
                    <div key={key} className="adm-od-stage">
                      <div className="adm-od-stage-top">
                        <span style={{ fontWeight:700, color: order.status === key ? 'var(--teal)' : 'var(--ink)' }}>{STAGE_LABEL[key]}</span>
                        <span style={{ fontSize:12, color: complete ? 'var(--success-text)' : 'var(--text-subtle)', fontWeight:600 }}>
                          {done} / {target} pcs
                        </span>
                      </div>
                      <Meter pct={target > 0 ? (done / target) * 100 : 0} tone={complete ? 'ok' : undefined} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* 6 · QC — only fields the order record really carries */}
          <Panel title="Quality Control" style={{ order:5 }}
            action={<button className="adm-link-btn" onClick={() => navigate('/admin/qc')}>QC checklist →</button>}>
            <div className="adm-od-fields">
              <Field label="QC Required" value={order.qc_required ? 'Yes' : 'No'}/>
              <Field label="QC Result" value={order.qc_passed_at ? `Passed ${fmtDay(order.qc_passed_at)}` : (qcHold ? 'Awaiting passing checklist' : 'Not passed yet')}/>
            </div>
          </Panel>

          {/* 7 · Delivery — dates stored on the order itself */}
          <Panel title="Delivery" style={{ order:6 }}
            action={<button className="adm-link-btn" onClick={() => navigate('/admin/delivery')}>Delivery →</button>}>
            <div className="adm-od-fields">
              <Field label="Client Requested" value={fmtDay(order.target_delivery_date)}/>
              <Field label="Negotiated"       value={fmtDay(order.negotiated_delivery_date)}/>
              <Field label="Est. Completion"  value={fmtDay(order.estimated_completion_date)}/>
            </div>
          </Panel>

          {/* 8 · Communication */}
          <Panel title="Communication" style={{ order:7 }}>
            <button className="adm-btn" onClick={() => navigate('/admin/messages')} style={{ width:'100%', justifyContent:'center' }}>
              <NavIcon name="messages" size={14} color="currentColor" /> Open messages
            </button>
          </Panel>
        </div>

        {/* Main column: design first — the thing being manufactured */}
        <div className="adm-od-main">
          {/* 3 · Design */}
          <Panel title="Submitted Design" style={{ order:2 }}>
            {hasStudioConfig ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'stretch', gap:6, width:'100%', minWidth:0 }}>
                {order.studio_config?.name && (
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', textAlign:'center' }}>{order.studio_config.name}</div>
                )}
                <DesignPreview cfg={order.studio_config} height={isMobile ? 260 : 360} previewUrl={order.design_preview_url ?? null}/>
                {/* studio_config.previewPng is stripped at order-creation time
                    (OrderController::customerStore); the rendered PNG is served
                    separately as design_preview_url, same as the customer side. */}
                {order.design_preview_url && (
                  <a href={order.design_preview_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                      color:'var(--teal)', textDecoration:'none' }}>
                    <NavIcon name="download" size={13} color="var(--teal)" /> View Submitted Design (PNG)
                  </a>
                )}
              </div>
            ) : refIsImage ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <img src={getStorageUrl(order.client_design_ref_file)} alt="Client reference"
                  style={{ maxWidth:'100%', maxHeight:480, borderRadius:'var(--r-lg)', border:'1px solid var(--border)',
                    objectFit:'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'var(--teal)', textDecoration:'none' }}>
                  <NavIcon name="download" size={13} color="var(--teal)" /> Download Reference File
                </a>
              </div>
            ) : hasRefFile ? (
              <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:600, color:'var(--teal)', textDecoration:'none' }}>
                <NavIcon name="download" size={14} color="var(--teal)" /> Download Reference File
              </a>
            ) : (
              <EmptyBlock>No design submitted for this order.</EmptyBlock>
            )}
            {order.client_design_notes && (
              <div style={{ marginTop:16, padding:12, background:'var(--bg-surface)', borderRadius:'var(--r-md)',
                fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>
                <strong style={{ color:'var(--ink)' }}>Client notes: </strong>{order.client_design_notes}
              </div>
            )}
          </Panel>

          {/* Material recommendations — Actual Used comes from actual_qty_issued,
              the staff-entered quantity from Pattern-stage completion (null until then). */}
          <Panel title="Material Recommendations" flush style={{ order:8 }}>
            {recs.length === 0 ? (
              <EmptyBlock>No material recommendations recorded yet.</EmptyBlock>
            ) : (
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th>Material</th><th>Actual Used</th><th>In Stock</th></tr></thead>
                  <tbody>
                    {recs.map((rec, i) => (
                      <tr key={rec.rec_id ?? i}>
                        <td style={{ fontWeight:600 }}>{rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}</td>
                        <td>{rec.actual_qty_issued != null ? `${rec.actual_qty_issued} ${rec.unit ?? ''}` : <span style={{ color:'var(--text-faint)' }}>Not yet issued</span>}</td>
                        <td style={{ color:'var(--text-subtle)' }}>{rec.material?.quantity_in_stock ?? '—'} {rec.material?.unit ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Payment / transaction history */}
          <Panel title="Payment" style={{ order:9 }}>
            {!txn ? (
              <div style={{ color:'var(--text-faint)', fontSize:13 }}>No payment records yet.</div>
            ) : (
              <div className="adm-od-fields">
                <Field label="Amount Paid"  value={txn.amount_paid  != null ? `₱${txn.amount_paid}`  : null}/>
                <Field label="Amount Total" value={txn.amount_total != null ? `₱${txn.amount_total}` : null}/>
                <Field label="Balance Due"
                  value={(txn.amount_total != null && txn.amount_paid != null)
                    ? `₱${(txn.amount_total - txn.amount_paid)}` : null}/>
                <Field label="Date Processed" value={txn.date_processed}/>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
