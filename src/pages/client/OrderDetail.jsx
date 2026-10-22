// src/pages/client/OrderDetail.jsx
// Customer Order Detail — summary + status left, materials + messages right (one column on phones),
// AI material recommendation (accept/reject), delivery tracking, message preview.
//
// SCHEMA (locked — never deviate):
//   orders.order_id, status, garment_type, quantity_ordered, color,
//   collar_type, sleeve_type, pocket_type, studio_config JSON,
//   ai_recommendation_status ENUM(not_requested|generating|ready|accepted|rejected|failed),
//   target_delivery_date, po_reference, qc_required, qc_passed_at
//   delivery_tracking.delivery_status (NOT .status)
//   order_messages.body (NOT .message), message_id, sender_id
//   material_recommendations.customer_accepted (estimated_range is
//     staff/inventory-only — this file never receives it)
// Caching: cacheGet('order_detail_'+id) 30s TTL, cleared on AI accept/reject.

import { humanize } from '../../utils/humanize';
import { savedDesignName } from '../../utils/designName';
import { useState, useEffect, useCallback } from 'react';
import DesignPreview from '../../components/DesignPreview';
import OrderBilling from '../../components/OrderBilling';
import { useParams, useNavigate }            from 'react-router-dom';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear }    from '../../utils/cache';
import { getOnce }                           from '../../utils/requestOnce';
import { fetchFailed }                       from '../../utils/loadState';
import LoadError                             from './settings/LoadError';
import { getStorageUrl, isImageFile }        from '../../utils/fileUrl';
import { NavIcon }                           from '../../components/ui/icons';
import { announceMessagesRead }              from '../../hooks/useUnreadMessages';
import { RecCard, AI_OPTIONAL_LINE }        from './AIMaterials';
import { OrderThumb, StatusPill, LIFECYCLE, lifecycleIndex, orderTitle, parseCfg, fmtDate } from '../../components/customer/kit';
import { Card, Button, Badge, PageHeader, Stepper, Skeleton, StatusChip, AlertBanner, EmptyState } from '../../components/ui';
import { setOrders, ROLE_LABEL } from './design-studio/uniformSet';


const PAYMENT_LABEL = { full:'Full payment', full_payment:'Full payment', down:'Down payment', down_payment:'Down payment', net_30:'Net 30 days', net_60:'Net 60 days', not_specified:'Confirmed by VFRB' };

// delivery_status → customer label; StatusChip supplies colour and icon.
const DELIVERY_LABEL = { preparing:'Preparing', dispatched:'Dispatched', in_transit:'In transit', delivered:'Delivered', returned:'Returned' };

// Side requests that load and fail on their own; a 403/404 just means "nothing yet".
const SECTIONS = {
  delivery:  { url: id => `/api/customer/delivery/${id}`, pick: d => d?.delivery ?? d ?? null },
  messages:  { url: id => `/api/customer/messages/${id}?per_page=3`, pick: d => { const l = d?.messages ?? d?.data ?? d; return Array.isArray(l) ? l : []; } },
  materials: { url: id => `/api/customer/orders/${id}/ai-recommendation`, pick: d => d?.recommendation ?? d ?? null },
};
const SECTION_TITLE = { delivery: 'Delivery tracking', messages: 'Messages', materials: 'Material recommendation' };

// Placeholder card for one section while it loads or after it failed.
function SectionState({ id, state, onRetry, style }) {
  return (
    <Card className="od-card" style={style} title={SECTION_TITLE[id]} aria-busy={state === 'loading' || undefined}>
      {state === 'loading' ? <Skeleton count={3} height={14} label={`Loading ${SECTION_TITLE[id].toLowerCase()}`}/> : (
        <div role="alert" className="od-note-row">
          <span>Couldn't load this section. Check your connection.</span>
          <Button onClick={onRetry}>Retry</Button>
        </div>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// A uniform set's linked orders on one card: each piece with its own preview (2D, or 3D where the garment has a model),
// production progress, and its own documents and messages. Siblings are found in the customer's order list by set id.
function UniformSetCard({ order, nav }) {
  const setId = parseCfg(order)?.uniformSet?.id;
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!setId) return undefined;
    let live = true;
    getOnce('/api/customer/orders?per_page=100', 30_000)
      .then(r => { if (live) setList(r.data?.data ?? r.data ?? []); })
      .catch(() => { if (live) setList([]); });
    return () => { live = false; };
  }, [setId]);
  if (!setId) return null;
  const pieces = setOrders(order, Array.isArray(list) ? list : []);
  return (
    <Card className="od-card od-set" title={`Uniform set · ${pieces.length} linked order${pieces.length > 1 ? 's' : ''}`}>
        {list === null && <p className="od-set-note">Loading the other piece…</p>}
        {list !== null && pieces.length < 2 && <p className="od-set-note">The other piece of this set was not found in your orders.</p>}
        <div className="od-set-grid">
          {pieces.map(o => {
            const cfg = parseCfg(o), cur = String(o.order_id) === String(order.order_id);
            return (
              <article key={o.order_id} className="od-set-piece" data-current={cur || undefined}>
                <header className="od-set-h">
                  <div className="od-min">
                    <p className="od-set-role">{ROLE_LABEL[cfg?.uniformSet?.role] ?? 'Piece'}{cur && ' · this order'}</p>
                    <p className="od-set-name">#{o.order_id} · {humanize(o.garment_type) ?? 'Garment'}</p>
                    <p className="od-set-sub">{o.quantity_ordered ?? 0} pcs{o.target_delivery_date ? ` · Due ${fmtDate(o.target_delivery_date)}` : ''}</p>
                  </div>
                  <StatusPill status={o.status}/>
                </header>
                <DesignPreview cfg={cfg && Object.keys(cfg).length ? cfg : null} height={220} previewUrl={o.design_preview_url ?? null}/>
                <div className="od-set-act">
                  {!cur && <Button onClick={() => nav(`/orders/${o.order_id}`)}>Details &amp; documents</Button>}
                  <Button onClick={() => nav(`/messages?order=${o.order_id}`)}>Messages</Button>
                </div>
              </article>
            );
          })}
        </div>
    </Card>
  );
}

// Reasons VFRB or the customer gave, as the backend posts them to the order's message thread.
const REASON_RE = /^(Order cancelled by VFRB|Proposal declined)\. Reason: /;

// VFRB's proposal (promised date, note) with the customer's reply: accept, message or decline with a reason. Prices are agreed off-platform.
function ProposalCard({ order, orderId, onDone, showToast }) {
  const [mode, setMode] = useState(null); // 'message' | 'decline'
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const ps = order.proposal_status;
  if (!ps) return order.status !== 'pending' ? null : (
    <Card className="od-card od-prop" title="VFRB proposal" action={<Badge tone="warning">Waiting for VFRB proposal</Badge>}>
        <p className="od-prop-note">
          VFRB is reviewing your order and will propose a delivery date.
          {order.target_delivery_date ? ` Your preferred date: ${fmtDate(order.target_delivery_date)}.` : ''}
        </p>
    </Card>
  );
  const open = ps === 'pending' && order.status === 'pending';

  const send = async (path, body, okMsg) => {
    setBusy(true); setErr('');
    try {
      const r = await axios.post(`/api/customer/orders/${orderId}/${path}`, body);
      showToast(r.data?.message ?? okMsg);
      setMode(null); setText('');
      await onDone();
    } catch (e) {
      const fe = e.response?.data?.errors;
      setErr((fe && Object.values(fe)[0]?.[0]) ?? e.response?.data?.message ?? 'Action failed. Please retry.');
    } finally { setBusy(false); }
  };

  return (
    <Card className="od-card od-prop" title="VFRB proposal"
      action={<Badge tone={ps === 'pending' ? 'warning' : ps === 'accepted' ? 'success' : 'danger'}>{ps === 'pending' ? 'Waiting for your reply' : ps === 'accepted' ? 'Accepted' : 'Declined'}</Badge>}>
        <dl className="od-prop-grid">
          <div><dt>Delivery date</dt><dd>{order.promised_date ? fmtDate(order.promised_date) : '—'}</dd></div>
        </dl>
        {order.proposal_note && <p className="od-prop-note"><strong>Note from Admin:</strong> {order.proposal_note}</p>}
        {ps === 'declined' && <p className="od-prop-note">You declined this proposal. VFRB will review your reason and may send a new one.</p>}

        {open && !mode && (
          <div className="od-prop-act">
            <Button variant="primary" disabled={busy} onClick={() => send('accept', {}, 'Proposal accepted.')}>Accept</Button>
            <Button disabled={busy} onClick={() => { setMode('message'); setErr(''); }}>Message</Button>
            <Button className="is-danger" disabled={busy} onClick={() => { setMode('decline'); setErr(''); }}>Decline</Button>
          </div>
        )}
        {open && mode && (
          <div className="od-prop-form">
            <label htmlFor="od-prop-text">{mode === 'decline' ? 'Why are you declining? (required)' : 'Message to VFRB'}</label>
            <textarea id="od-prop-text" rows={3} value={text} onChange={e => setText(e.target.value)}
              placeholder={mode === 'decline' ? 'e.g. The date is too late for our event' : 'Ask about the date, fabric or total'}/>
            <div className="od-prop-act">
              <Button variant={mode === 'decline' ? 'secondary' : 'primary'} className={mode === 'decline' ? 'is-danger' : ''} disabled={busy || !text.trim()}
                onClick={() => mode === 'decline'
                  ? send('decline', { reason: text.trim() }, 'Proposal declined.')
                  : send('message', { body: text.trim() }, 'Message sent.')}>
                {busy ? 'Sending' : mode === 'decline' ? 'Decline proposal' : 'Send message'}
              </Button>
              <Button disabled={busy} onClick={() => { setMode(null); setText(''); setErr(''); }}>Back</Button>
            </div>
          </div>
        )}
        {err && <p className="od-prop-err" role="alert">{err}</p>}
    </Card>
  );
}

export default function CustomerOrderDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const orderId = id;

  const [order,    setOrder]    = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiRec,    setAiRec]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState(false); // the order request failed (network/5xx), as opposed to a missing order
  const [aiAction, setAiAction] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [dlBusy,   setDlBusy]   = useState(false);
  const [reasons,  setReasons]  = useState([]);
  const [secState, setSecState] = useState({}); // section id → 'loading' | 'error'

  const CACHE_KEY = `order_detail_${orderId}`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetches into a Blob first rather than pointing <a download> straight at
  // the URL — the preview lives on Cloudinary once that disk is configured,
  // and a cross-origin href makes the browser navigate instead of download. `api` routes through axios for the auth header.
  const downloadDesign = useCallback(async (url, filename, api = false) => {
    if (!url) return;
    setDlBusy(filename);
    try {
      let blob;
      if (api) blob = (await axios.get(url, { responseType: 'blob' })).data;
      else {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        blob = await res.blob();
      }
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      showToast(api ? 'Could not generate the spec sheet. Please try again.' : 'Could not download the design. Try opening it in a new tab.', 'error');
    } finally {
      setDlBusy(false);
    }
  }, []);

  // ── Load: one wave. The page shows as soon as the order arrives; delivery, messages and AI fill in
  // (skeletons meanwhile), and billing starts now so OrderBilling reuses it instead of a second round trip.
  const load = useCallback(async (force = false) => {
    if (!orderId) return;
    if (!force) {
      const cached = cacheGet(CACHE_KEY);
      if (cached) {
        setOrder(cached.order);
        setDelivery(cached.delivery);
        setMessages(cached.messages);
        setAiRec(cached.aiRec);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    getOnce(`/api/customer/orders/${orderId}/billing`).catch(() => {});
    try {
      const orderReq = axios.get(`/api/customer/orders/${orderId}`);
      const rest = Promise.allSettled([
        axios.get(SECTIONS.delivery.url(orderId)),
        axios.get(SECTIONS.messages.url(orderId)),
        axios.get(SECTIONS.materials.url(orderId)),
      ]);
      const [o] = await Promise.allSettled([orderReq]);
      const orderData = o.status === 'fulfilled' ? (o.value.data?.order ?? o.value.data) : null;
      const failed = fetchFailed(o);
      setLoadErr(failed);
      setOrder(orderData);
      if (!failed) {
        setSecState({ delivery: 'loading', messages: 'loading', materials: 'loading' });
        setLoading(false);
      }

      const [d, m, a] = await rest;
      const delivData = d.status === 'fulfilled' ? SECTIONS.delivery.pick(d.value.data)  : null;
      const msgsData  = m.status === 'fulfilled' ? SECTIONS.messages.pick(m.value.data)  : [];
      const aiData    = a.status === 'fulfilled' ? SECTIONS.materials.pick(a.value.data) : null;
      // The thread fetch marks staff replies read, so the nav badge refreshes.
      if (m.status === 'fulfilled') announceMessagesRead();

      const secErr = { delivery: fetchFailed(d), messages: fetchFailed(m), materials: fetchFailed(a) };
      setSecState(Object.fromEntries(Object.entries(secErr).filter(([, e]) => e).map(([k]) => [k, 'error'])));
      setDelivery(delivData);
      setMessages(msgsData);
      setAiRec(aiData);
      // A failed load is not cached: a retry must ask the server again instead of replaying the failure for 30s.
      if (!failed && !Object.values(secErr).some(Boolean)) cacheSet(CACHE_KEY, {
        order: orderData, delivery: delivData,
        messages: msgsData, aiRec: aiData,
      }, 30_000);
    } finally {
      setLoading(false);
    }
  }, [orderId, CACHE_KEY]);

  useEffect(() => { load(); }, [load]);

  // Retries one failed section without reloading the whole page.
  const SET = { delivery: setDelivery, messages: setMessages, materials: setAiRec };
  const retrySection = async (key) => {
    setSecState(s => ({ ...s, [key]: 'loading' }));
    try {
      const r = await axios.get(SECTIONS[key].url(orderId));
      SET[key](SECTIONS[key].pick(r.data));
      if (key === 'messages') announceMessagesRead();
      setSecState(s => { const { [key]: _, ...rest } = s; return rest; });
    } catch (e) {
      const missing = [403, 404].includes(e.response?.status);
      if (missing) SET[key](key === 'messages' ? [] : null);
      setSecState(s => { const { [key]: _, ...rest } = s; return missing ? rest : { ...rest, [key]: 'error' }; });
    }
    cacheClear(CACHE_KEY);
  };

  // ── Derived state — all O(1) ───────────────────────────────────────────────
  const status    = order?.status ?? 'pending';
  // Summary title is the saved design name (orderTitle); the line under it keeps the garment when the name replaced it.
  const savedName = savedDesignName(order?.studio_config);
  const garmentLine = [savedName && humanize(order?.garment_type), parseCfg(order).category, `${order?.quantity_ordered ?? 0} pcs`].filter(Boolean).join(' · ');
  // The promised date counts only once the customer accepted it; before that target_delivery_date is just their preference.
  const agreedDate = order?.proposal_status === 'accepted' ? (order.promised_date ?? null) : null;
  const dueLine = agreedDate ? ` · Due ${fmtDate(agreedDate)}`
    : order?.target_delivery_date ? ` · Preferred ${fmtDate(order.target_delivery_date)}` : '';

  const specs = [
    { label:'Garment Type', value: humanize(order?.garment_type) ?? '—'              },
    { label:'Color',        value: order?.color ?? '—'                      },
    { label:'Quantity',     value: order?.quantity_ordered
        ? `${order.quantity_ordered} pcs` : '—'                            },
    { label:'Collar',       value: humanize(order?.collar_type) ?? '—'                },
    { label:'Sleeve',       value: humanize(order?.sleeve_type) ?? '—'                },
    { label:'Pocket',       value: humanize(order?.pocket_type) ?? '—'                },
    { label:'Order Type',   value: humanize(order?.order_type) ?? '—'                 },
    { label:'Payment',      value: PAYMENT_LABEL[order?.payment_terms] ?? '—' },
    { label:'PO Reference', value: order?.po_reference ?? 'N/A'             },
    { label: agreedDate ? 'Delivery' : 'Preferred date', value: (agreedDate ?? order?.target_delivery_date)
        ? new Date(agreedDate ?? order.target_delivery_date).toLocaleDateString('en-PH',{
            year:'numeric', month:'long', day:'numeric',
          })
        : '—'
    },
  ];

  const needReasons = !!order && (order.status === 'cancelled' || order.proposal_status === 'declined');
  useEffect(() => {
    if (!needReasons) { setReasons([]); return; }
    let live = true;
    axios.get(`/api/customer/messages/${orderId}`).then(r => {
      const list = r.data?.messages ?? r.data?.data ?? r.data ?? [];
      if (live) setReasons((Array.isArray(list) ? list : []).filter(m => REASON_RE.test(m.body ?? '')));
      announceMessagesRead();
    }).catch(() => {});
    return () => { live = false; };
  }, [needReasons, orderId, order?.status, order?.proposal_status]);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg,  setAiMsg]  = useState('');
  const retryAI = useCallback(async () => {
    setAiBusy(true); setAiMsg('');
    try {
      await axios.post('/api/customer/ai/recommend-materials', { order_id: Number(orderId) }, { timeout: 120_000 });
      await load(true);
    } catch (e) {
      setAiMsg(e.response?.data?.message ?? 'The recommendation is unavailable right now. You can choose materials yourself.');
    } finally { setAiBusy(false); }
  }, [orderId, load]);

  // ── AI recommendation — optimistic UI — O(1) ─────────────────────────────
  const handleAI = useCallback(async (action) => {
    if (!aiRec || !orderId) return;
    const prev = aiRec;
    setAiAction(action);
    setAiRec(r => ({ ...r, customer_accepted: action === 'accept' ? 1 : 0 }));
    setOrder(o => ({
      ...o,
      ai_recommendation_status: action === 'accept' ? 'accepted' : 'rejected',
    }));
    cacheClear(CACHE_KEY, 'orders_list');
    try {
      if (action === 'accept') {
        await axios.post(`/api/customer/orders/${orderId}/accept-materials`);
        showToast('AI recommendation accepted! The VFRB team has been notified.');
      } else {
        await axios.post(`/api/customer/orders/${orderId}/reject-materials`);
        showToast('Recommendation declined.', 'info');
      }
    } catch (e) {
      setAiRec(prev);
      setOrder(o => ({
        ...o,
        ai_recommendation_status: prev.customer_accepted === 1 ? 'accepted' : 'ready',
      }));
      showToast(e.response?.data?.message ?? 'Action failed. Please retry.', 'error');
    } finally {
      setAiAction(null);
    }
  }, [aiRec, CACHE_KEY]);

  // Current user id (to identify own messages)
  const meId = (() => {
    try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').user_id; }
    catch { return null; }
  })();

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="cx-page" aria-busy="true" aria-label="Loading order">
      <Skeleton count={2} height={20} label="Loading order" className="od-sk-head" />
      <div className="od-sk">
        <div className="od-sk-col"><Skeleton variant="block" height={150} /><Skeleton variant="block" height={110} /><Skeleton variant="block" height={90} /></div>
        <div className="od-sk-col"><Skeleton variant="block" height={220} /><Skeleton variant="block" height={120} /></div>
      </div>
    </div>
  );

  // ── Could not load (network/server): retryable, never shown as "not found" ──
  if (loadErr) return (
    <div className="od-gone">
      <LoadError what="this order" onRetry={() => load(true)}/>
      <Button icon="back" onClick={() => nav('/orders')}>Back to My Orders</Button>
    </div>
  );

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!order) return (
    <div className="od-gone">
      <EmptyState boxed title="Order not found" action={<Button icon="back" onClick={() => nav('/orders')}>Back to My Orders</Button>}>
        It may have been removed, or the link is wrong.
      </EmptyState>
    </div>
  );

  // `order` sets the phone stacking (status → delivery → materials → messages → details → billing); desktop keeps each column's order.
  const card = (n, extra = '') => ({ className: `od-card ${extra}`.trim(), style: { order: n } });
  const recDone = ['ready','accepted','rejected'].includes(order.ai_recommendation_status);
  const pngName = `VFRB-ORD-${order.order_id}-design.png`, specName = `VFRB-ORD-${order.order_id}-spec-sheet.pdf`;

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div className="od-toast" data-type={toast.type} role="status" aria-live="polite"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="od-wrap">
        <PageHeader back={{ to: '/orders', label: 'My Orders' }} title={`Order #${orderId}`}
          subtitle={[humanize(order.garment_type) ?? 'Custom Order', order.quantity_ordered && `${order.quantity_ordered} pcs`, order.color].filter(Boolean).join(' · ')}
          actions={<StatusPill status={status}/>} className="od-head"/>

        <div className="od-cols"><div className="od-main">
        {/* ── Lifecycle summary (customer-facing 5 steps derived from real status) ── */}
        {status !== 'cancelled' && (
          <Card {...card(1)}>
            <div className="od-sum">
              <div className="od-sum-h">
                <span className="od-sum-thumb"><OrderThumb order={order} size={64}/></span>
                <div className="od-sum-txt">
                  <p className="od-sum-t" title={orderTitle(order)}>{orderTitle(order)}</p>
                  <p className="od-sum-m">{garmentLine}{dueLine}</p>
                </div>
                <Button icon="chat" onClick={() => nav(`/messages?order=${orderId}`)}>Messages</Button>
              </div>
              <Stepper steps={LIFECYCLE} current={lifecycleIndex(status)} label="Order progress"/>
            </div>
          </Card>
        )}

        {/* ── Completed / Cancelled banners ─────────────────────────────── */}
        {status === 'completed' && (
          <AlertBanner tone="success" title="Order completed" style={{ order:2 }}>
            Your order is ready. Final 20% payment is due on delivery.
          </AlertBanner>
        )}

        {status === 'cancelled' && (
          <AlertBanner tone="error" title="Order cancelled" style={{ order:2 }}>
            {reasons.length > 0
              ? reasons.map(m => (
                  <span key={m.message_id ?? m.body} className="od-reason">
                    <strong>{m.body.startsWith('Proposal') ? 'You declined:' : 'Reason from Admin:'}</strong> {m.body.replace(REASON_RE, '')}
                  </span>))
              : 'No reason was recorded. Message VFRB for details.'}
          </AlertBanner>
        )}

        <div style={{ order:3 }}>
          <ProposalCard order={order} orderId={orderId} showToast={showToast}
            onDone={() => { cacheClear(CACHE_KEY, 'orders_list'); return load(true); }}/>
        </div>

        {reasons.length > 0 && status !== 'cancelled' && (
          <div className="od-reasons" role="note" style={{ order:4 }}>
            {reasons.map(m => <p key={m.message_id ?? m.body}>{m.body}</p>)}
          </div>
        )}

        {/* ── Delivery tracking ─────────────────────────────────────────── */}
        {secState.delivery ? <SectionState id="delivery" state={secState.delivery} onRetry={() => retrySection('delivery')} style={{ order:5 }}/> : delivery && (() => {
          // delivery_status column — NOT .status (locked schema rule)
          const ds = delivery.delivery_status;
          const label = ds ? (DELIVERY_LABEL[ds] ?? humanize(ds)) : 'Not scheduled yet';
          const rows = [
            { l:'Method',        v: delivery.delivery_method },
            { l:'Courier',       v: delivery.courier_name },
            { l:'Tracking #',    v: delivery.tracking_number },
            { l:'Address',       v: delivery.delivery_address },
            { l:'Est. Delivery', v: delivery.estimated_delivery_date ? fmtDate(delivery.estimated_delivery_date, { year:'numeric', month:'long', day:'numeric' }) : null },
          ].filter(r => r.v);
          return (
            <Card {...card(5)} title="Delivery tracking" action={<StatusChip status={ds ?? 'pending'} label={label}/>}>
              {rows.length === 0
                ? <p className="od-muted">VFRB staff haven't added delivery details yet.</p>
                : <dl className="od-kv">{rows.map(r => <div key={r.l}><dt>{r.l}</dt><dd>{r.v}</dd></div>)}</dl>}
            </Card>
          );
        })()}

        {(order.studio_config || order.design_preview_url || (order.client_design_ref_file && isImageFile(order.client_design_ref_file))) && (
          <Card {...card(20, 'od-hero')} title="Your design"
            subtitle={status === 'cancelled' ? orderTitle(order) : undefined}
            action={(order.design_preview_url || order.studio_config) && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {order.design_preview_url && (
                  <Button icon="download" loading={dlBusy === pngName} disabled={!!dlBusy}
                    onClick={() => downloadDesign(order.design_preview_url, pngName)}>
                    {dlBusy === pngName ? 'Preparing…' : 'Download PNG'}
                  </Button>
                )}
                {order.studio_config && (
                  <Button icon="download" loading={dlBusy === specName} disabled={!!dlBusy}
                    onClick={() => downloadDesign(`/api/customer/orders/${order.order_id}/spec-sheet`, specName, true)}>
                    {dlBusy === specName ? 'Preparing…' : 'Download spec sheet'}
                  </Button>
                )}
              </div>
            )}>
            <div className="od-stage">
              <DesignPreview cfg={order.studio_config} height={340}
                previewUrl={order.design_preview_url ?? null} snapshot={order.design_3d_snapshot_url ?? null}
                referenceImageUrl={!order.studio_config ? getStorageUrl(order.client_design_ref_file) : null}/>
            </div>
            <p className="od-muted od-gap">
              {order.design_preview_url
                ? 'This is the artwork submitted with your order. VFRB staff work from this file, so check it matches what you expect before production starts.'
                : 'Preview built from your submitted design.'}
            </p>
          </Card>
        )}

        {order.client_design_notes && (
          <Card {...card(21)} title="Design notes">
            <p className="od-pre">{order.client_design_notes}</p>
          </Card>
        )}

        {/* ── Order specs grid ──────────────────────────────────────────── */}
        <Card {...card(22)} title="Order specifications">
          <dl className="od-spec-grid">
            {specs.filter(s => s.value && s.value !== '—').map(spec => (
              <div key={spec.label} className="od-spec">
                <dt>{spec.label}</dt>
                <dd>
                  {spec.label === 'Color' && /^#[0-9a-f]{3,6}$/i.test(spec.value)
                    ? <span className="od-swatch"><i style={{ background:spec.value }} aria-hidden="true"/>{spec.value}</span>
                    : spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Requires the backend's storage symlink (php artisan storage:link) to resolve. */}
        {order.client_design_ref_file && (
          <Card {...card(23)} title="Reference file">
            {isImageFile(order.client_design_ref_file) ? (
              <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer" className="od-ref-img">
                <img src={getStorageUrl(order.client_design_ref_file)} alt="Customer reference"
                  onError={e => { e.target.style.display='none'; }}/>
              </a>
            ) : (
              <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer" className="ui-btn od-ref-pdf" data-v="secondary" data-size="md">
                <NavIcon name="attachment" size={14}/> View reference PDF
              </a>
            )}
          </Card>
        )}

        <div style={{ order:24 }}><UniformSetCard order={order} nav={nav}/></div>

        {/* Billing reads its own endpoint, so it mounts only once the order itself has loaded. */}
        <Card {...card(30, 'od-billing')} title="Billing">
          <OrderBilling orderId={order.order_id ?? orderId} mode="customer" />
        </Card>
        </div><div className="od-side">
        {/* ── AI Recommendation card ────────────────────────────────────── */}
        {order && !recDone && !['completed','cancelled'].includes(order.status) && (
          <Card {...card(10)} title="Material recommendation">
            <p className="od-muted od-lead">
              {order.ai_recommendation_status === 'generating'
                ? 'Your recommendation is being prepared. Check again in a moment.'
                : order.ai_recommendation_status === 'failed'
                ? 'The recommendation could not be generated. Try again, or choose the material types yourself.'
                : 'No material types have been recommended for this order yet.'}
            </p>
            {aiMsg && <p role="alert" className="od-err">{aiMsg}</p>}
            <div className="od-acts">
              <Button variant="primary" loading={aiBusy}
                onClick={order.ai_recommendation_status === 'generating' ? () => load(true) : retryAI}>
                {aiBusy ? 'Working…' : order.ai_recommendation_status === 'generating' ? 'Check again' : 'Get recommendation'}
              </Button>
              <Button onClick={() => nav('/ai-materials')}>Choose materials myself</Button>
            </div>
          </Card>
        )}

        {recDone && secState.materials && <SectionState id="materials" state={secState.materials} onRetry={() => retrySection('materials')} style={{ order:10 }}/>}
        {aiRec && recDone && !secState.materials && (
          <Card as={motion.section} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} {...card(10)}
            title="AI material recommendation" subtitle="Based on VFRB production standards"
            action={order.ai_recommendation_status === 'accepted' ? <Badge tone="success" icon="success">Accepted</Badge>
              : order.ai_recommendation_status === 'rejected' ? <Badge tone="danger">Declined</Badge> : null}>
            {order.ai_recommendation_status === 'rejected' && (
              <div className="od-note-row">
                <span>VFRB staff has been notified. Want to pick materials yourself instead?</span>
                <Button onClick={() => nav('/ai-materials')}>Choose myself</Button>
              </div>
            )}

            {/* Materials breakdown */}
            {aiRec.materials_json && (() => {
              try {
                const mats = typeof aiRec.materials_json === 'string' ? JSON.parse(aiRec.materials_json) : aiRec.materials_json;
                return (
                  <div className="od-gap-b">
                    <p className="od-label">{AI_OPTIONAL_LINE}</p>
                    <div className="od-rec-grid">
                      {Object.entries(mats).map(([mat, info], i) => <RecCard key={mat} rec={{ ...info, material_name: mat }} index={i}/>)}
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}

            {aiRec.notes && <p className="od-muted od-gap-b">{aiRec.notes}</p>}

            {/* Accept / Reject — only when status is 'ready' */}
            {order.ai_recommendation_status === 'ready' && (
              <div className="od-acts">
                <Button variant="primary" icon="success" disabled={!!aiAction} loading={aiAction === 'accept'} onClick={() => handleAI('accept')}>Accept recommendation</Button>
                <Button className="is-danger" disabled={!!aiAction} loading={aiAction === 'reject'} onClick={() => handleAI('reject')}>Decline</Button>
              </div>
            )}
          </Card>
        )}

        {/* ── Messages preview ──────────────────────────────────────────── */}
        {secState.messages ? <SectionState id="messages" state={secState.messages} onRetry={() => retrySection('messages')} style={{ order:11 }}/> : messages.length > 0 && (
          <Card {...card(11)} title="Messages" action={<Button size="sm" iconRight="chevronRight" onClick={() => nav(`/messages?order=${orderId}`)}>Open chat</Button>}>
            <div className="od-msgs">
              {messages.slice(-3).map(msg => {
                const at = msg.sent_at ?? msg.created_at;
                return (
                  <div key={msg.message_id} className="od-msg" data-me={msg.sender_id === meId || undefined}>
                    {/* body column — order_messages schema */}
                    <p>{msg.body}</p>
                    <time>{at ? new Date(at).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' }) : ''}</time>
                  </div>
                );
              })}
              {messages.length > 3 && <p className="od-muted od-center">+{messages.length - 3} earlier</p>}
            </div>
          </Card>
        )}

        </div></div>
        {/* ── Bottom action row ─────────────────────────────────────────── */}
        <div className="od-acts od-bottom">
          <Button icon="chat" onClick={() => nav(`/messages?order=${orderId}`)}>Message VFRB team</Button>
          <Button variant="ghost" icon="back" onClick={() => nav('/orders')}>All orders</Button>
        </div>
      </div>
    </>
  );
}
