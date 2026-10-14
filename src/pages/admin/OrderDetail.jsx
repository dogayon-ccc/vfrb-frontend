
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DesignPreview from '../../components/DesignPreview';
import OrderDesignDetails, { ReferenceFile } from '../../components/admin/OrderDesignDetails';
import OrderBilling from '../../components/OrderBilling';
import { savedDesignName } from '../../utils/designName';
import { NavIcon } from '../../components/ui';
import { canAccessArea, readAdminUser, isOwner } from '../../utils/jobAccess';
import { Panel, StatusPill, Meter, EmptyBlock, Toast, useToast, useIsMobile } from '../../components/admin/AdminUI';

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
      <h3 style={{ display:'flex', alignItems:'center', gap:7, margin:'0 0 4px', fontSize:13, fontWeight:800, color:'var(--warning-text)',
        textTransform:'uppercase', letterSpacing:'.04em', fontFamily:'var(--font)' }}>
        <NavIcon name="warning" size={14} color="var(--warning)" /> Review & Confirm
      </h3>
      <p style={{ fontSize:12, color:'var(--warning-text)', margin:'0 0 16px', fontFamily:'var(--font)' }}>
        This order is pending — nothing proceeds to production until it's confirmed here.
        Propose a delivery date and total if the customer's request needs adjusting, or cancel with a reason.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:14 }}>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-subtle)',
            textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Negotiated Delivery Date</label>
          <input type="date" aria-label="Negotiated delivery date" value={negotiatedDate} onChange={e => setNegotiatedDate(e.target.value)}
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
          textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Note to the customer (required if cancelling)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="e.g. Quantity exceeds this week's production quota, proposing split delivery"
          style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
            fontSize:13, fontFamily:'var(--font)', resize:'vertical', boxSizing:'border-box', background:'var(--bg-card)', color:'var(--ink)' }}/>
      </div>

      {err && (
        <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger-text)', fontSize:12, fontWeight:600, margin:'0 0 12px', fontFamily:'var(--font)' }}>
          <NavIcon name="warning" size={13} color="var(--danger)" />{err}
        </p>
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={() => submit('confirmed')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'none', cursor: busy ? 'wait' : 'pointer',
            background:'var(--success-text)', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          {busy ? 'Working…' : <><NavIcon name="success" size={14} color="#fff" /> Confirm Order</>}
        </button>
        <button onClick={() => submit('cancelled')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'1px solid var(--danger)', cursor: busy ? 'wait' : 'pointer',
            background:'var(--bg-card)', color:'var(--danger-text)', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          <NavIcon name="close" size={14} color="var(--danger)" /> Cancel Order
        </button>
      </div>
    </div>
  );
}

// Staff verdict on one AI-recommended line. Rejections become "avoid" hints in later prompts.
function StaffCheck({ rec, setToast, onSaved }) {
  const [busy, setBusy] = useState(false);
  if (!rec.rec_id) return null;
  const send = async (verdict) => {
    setBusy(true);
    try {
      const r = await axios.patch(`/api/admin/material-recommendations/${rec.rec_id}/feedback`, { verdict });
      onSaved(r.data?.data ?? { staff_feedback: verdict === 'clear' ? null : verdict });
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message ?? 'Could not save your check.' });
    } finally { setBusy(false); }
  };
  const v = rec.staff_feedback;
  if (isOwner()) return <span style={{ color:'var(--text-subtle)' }}>{v === 'accept' ? 'Suits' : v === 'reject' ? 'Wrong pick' : '—'}</span>;
  return (
    <div className="adm-verdict" role="group" aria-label={`Staff check for ${rec.material_name ?? 'material'}`}>
      <button type="button" className={`adm-btn${v === 'accept' ? ' on ok' : ''}`} disabled={busy} aria-pressed={v === 'accept'}
        onClick={() => send(v === 'accept' ? 'clear' : 'accept')}>Suits</button>
      <button type="button" className={`adm-btn${v === 'reject' ? ' on no' : ''}`} disabled={busy} aria-pressed={v === 'reject'}
        onClick={() => send(v === 'reject' ? 'clear' : 'reject')}>Wrong pick</button>
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
  const [toast, setToast] = useToast();
  const [stages,  setStages]  = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setStages(null); setNotFound(false);
      try {
        const r = await axios.get(`/api/admin/orders/${id}`);
        if (!cancelled) setOrder(r.data?.order ?? r.data);
      } catch (e) {
        if (!cancelled) setLoading(false);
        // A missing order is final: no follow-up requests and no Retry.
        if (e.response?.status === 404) { if (!cancelled) setNotFound(true); return; }
        if (!cancelled) setError('Failed to load order.');
        return;
      }
      if (!cancelled) setLoading(false);
      try {
        const p = await axios.get(`/api/admin/orders/${id}/production`);
        const list = p.data?.stages ?? p.data;
        if (!cancelled) setStages(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setStages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, attempt]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
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
      setToast({ type: 'error', msg: 'Could not generate the PDF. Please try again.' });
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
  if (notFound) {
    return (
      <div className="adm-od" style={{ textAlign:'center', padding:'48px 16px' }}>
        <h1 className="adm-h1" style={{ margin:'0 0 6px', fontSize:20 }}>Order not found</h1>
        <p className="adm-sub" style={{ margin:'0 0 16px' }}>Order #{id} does not exist or was removed.</p>
        <button className="adm-btn" style={{ minHeight:44 }} onClick={() => navigate('/admin/orders')}>
          <NavIcon name="back" size={14} color="currentColor" /> Back to Orders
        </button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="adm-od">
        <div className="adm-err"><span>{error}</span><button className="adm-btn" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>
        <button className="adm-btn" style={{ marginTop:12 }} onClick={() => navigate('/admin/orders')}>
          <NavIcon name="back" size={14} color="currentColor" /> Back to Orders
        </button>
      </div>
    );
  }
  if (!order) return null;

  const recs = order.recommendations ?? [];
  const client = order.user ?? {};
  const clientName = client.name ?? order.customer_name;

  const isManager = getIsManager(), canTrack = canAccessArea(readAdminUser(), 'production');
  const hasStudioConfig = !!order.studio_config;
  const hasRefFile      = !!order.client_design_ref_file;

  const stageRows = Array.isArray(stages) ? STAGES.map((k) => ({ key:k, row: stages.find((t) => t.stage === k) })) : [];
  const stagesWithData = stageRows.filter((x) => x.row);
  const qcHold = order.status === 'qc' && order.qc_required && !order.qc_passed_at;

  return (
    <div className="adm-od">

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
        {/* Each action only for accounts its route allows: production tracking (job area) and the PDF (manager-only endpoint). */}
        {(canTrack || isManager) && (
          <div className="adm-actions">
            {canTrack && (
              <button className="adm-btn primary" onClick={() => navigate(`/admin/production/${order.order_id}`)}>
                <NavIcon name="production" size={14} color="currentColor" /> Track Production
              </button>
            )}
            {isManager && (
              <button className="adm-btn" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <NavIcon name="download" size={14} color="currentColor" />
                {downloadingPdf ? 'Generating…' : 'Order Summary (PDF)'}
              </button>
            )}
          </div>
        )}
      </div>

      {order.status === 'pending' && isManager && (
        <ReviewPanel order={order} onUpdated={(updated) => setOrder(o => ({ ...o, ...updated }))}/>
      )}

      <div className="adm-od-grid">
        <div className="adm-od-side">
          <Panel title="Client" style={{ order:1 }}>
            <div className="adm-od-fields">
              <Field label="Name"          value={clientName}/>
              <Field label="Organization"  value={client.organization_name ?? order.organization_name}/>
              <Field label="Email"         value={client.email}/>
              <Field label="Contact"       value={client.contact_number}/>
            </div>
          </Panel>

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

          <Panel title="Size Breakdown" style={{ order:3 }}>
            {(order.measurements ?? []).length === 0 ? (
              <EmptyBlock>No size breakdown submitted.</EmptyBlock>
            ) : (
              <div className="adm-chipset">
                {order.measurements.map((m) => (
                  <span key={m.measurement_id}><i>{m.size_label ?? (m.type === 'custom' ? 'Custom' : '—')}</i>{m.qty ?? '—'}</span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Production" style={{ order:4 }}
            action={canTrack ? <button className="adm-link-btn" onClick={() => navigate(`/admin/production/${order.order_id}`)}>Open tracking →</button> : null}>
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

          <Panel title="Quality Control" style={{ order:5 }}
            action={canAccessArea(readAdminUser(), 'production') ? <button className="adm-link-btn" onClick={() => navigate('/admin/qc')}>QC checklist →</button> : null}>
            <div className="adm-od-fields">
              <Field label="QC Required" value={order.qc_required ? 'Yes' : 'No'}/>
              <Field label="QC Result" value={order.qc_passed_at ? `Passed ${fmtDay(order.qc_passed_at)}` : (qcHold ? 'Awaiting passing checklist' : 'Not passed yet')}/>
            </div>
          </Panel>

          <Panel title="Delivery" style={{ order:6 }}
            action={isOwner() ? null : <button className="adm-link-btn" onClick={() => navigate('/admin/delivery')}>Delivery →</button>}>
            <div className="adm-od-fields">
              <Field label="Client Requested" value={fmtDay(order.target_delivery_date)}/>
              <Field label="Negotiated"       value={fmtDay(order.negotiated_delivery_date)}/>
              <Field label="Est. Completion"  value={fmtDay(order.estimated_completion_date)}/>
            </div>
          </Panel>

          {!isOwner() && <Panel title="Communication" style={{ order:7 }}>
            <button className="adm-btn" onClick={() => navigate(`/admin/messages?order=${order.order_id}`)} style={{ width:'100%', justifyContent:'center' }}>
              <NavIcon name="messages" size={14} color="currentColor" /> Message customer about #{order.order_id}
            </button>
          </Panel>}
        </div>

        <div className="adm-od-main">
          <Panel title="Submitted Design" style={{ order:2 }}>
            {hasStudioConfig ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'stretch', gap:6, width:'100%', minWidth:0 }}>
                {savedDesignName(order.studio_config) && (
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', textAlign:'center', overflowWrap:'anywhere' }}>{savedDesignName(order.studio_config)}</div>
                )}
                <DesignPreview cfg={order.studio_config} height={isMobile ? 260 : 360} previewUrl={order.design_preview_url ?? null}/>
                {order.design_preview_url && (
                  <a href={order.design_preview_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                      color:'var(--teal)', textDecoration:'none' }}>
                    <NavIcon name="download" size={13} color="var(--teal)" /> View Submitted Design (PNG)
                  </a>
                )}
              </div>
            ) : hasRefFile ? (
              <ReferenceFile path={order.client_design_ref_file} />
            ) : (
              <EmptyBlock>No design submitted for this order.</EmptyBlock>
            )}
            {order.client_design_notes && (
              <div style={{ marginTop:16, padding:12, background:'var(--bg-surface)', borderRadius:'var(--r-md)',
                fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>
                <strong style={{ color:'var(--ink)' }}>Client notes: </strong>{order.client_design_notes}
              </div>
            )}
            <OrderDesignDetails order={order} />
          </Panel>

          <Panel title="Material Recommendations" flush style={{ order:8 }}>
            {recs.length === 0 ? (
              <EmptyBlock>No material recommendations recorded yet.</EmptyBlock>
            ) : (
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th>Material</th><th>Customer</th><th>Staff check</th><th>Actual Used</th><th>In Stock</th></tr></thead>
                  <tbody>
                    {recs.map((rec, i) => (
                      <tr key={rec.rec_id ?? i}>
                        <td style={{ fontWeight:600 }}>{rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}</td>
                        <td style={{ textTransform:'capitalize' }}>{rec.customer_accepted ? 'Accepted' : (rec.status ?? 'pending')}</td>
                        <td><StaffCheck rec={rec} setToast={setToast} onSaved={(f) => setOrder(o => ({ ...o, recommendations: o.recommendations.map(r => r.rec_id === rec.rec_id ? { ...r, ...f } : r) }))}/></td>
                        <td>{rec.actual_qty_issued != null ? `${rec.actual_qty_issued} ${rec.unit ?? ''}` : <span style={{ color:'var(--text-faint)' }}>Not yet issued</span>}</td>
                        <td style={{ color:'var(--text-subtle)' }}>{rec.material?.quantity_in_stock ?? '—'} {rec.material?.unit ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Billing" style={{ order:9 }}>
            <OrderBilling orderId={order.order_id} mode="admin" isManager={isManager} />
          </Panel>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
