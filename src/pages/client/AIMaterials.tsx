// src/pages/client/AIMaterials.jsx — AI raw-material recommendation (Layer 1, Gemini Flash).
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import usePageTitle from '../../hooks/usePageTitle';
import useDialogFocus from '../../hooks/useDialogFocus';
import { useNavigate }                              from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavIcon }                                  from '../../components/ui/icons';
import axios                                        from 'axios';
import { cacheClear }                               from '../../utils/cache';
import { fetchAllPages }                            from '../../utils/fetchAllPages';
import { materialColour }                           from '../../utils/materialColour';
import { garmentLabel } from '../../utils/designName';
import { useToast, STATUS, StatusPill, EmptyState, ErrorState } from '../../components/customer/kit';
import { PageHeader, Button, Field, Skeleton, AlertBanner } from '../../components/ui';

// Category icon per material category — shared with MaterialsReveal.jsx. One Pattern Room tile for every category.
const TILE = { color:'var(--pr-ink-muted)', bg:'var(--pr-paper-inset)' };
export const CAT = {
  Fabric:       { icon:'materials', ...TILE },
  Thread:       { icon:'materials', ...TILE },
  Elastic:      { icon:'materials', ...TILE },
  Accessories:  { icon:'package',   ...TILE },
  Trim:         { icon:'materials', ...TILE },
  Label:        { icon:'package',   ...TILE },
  Trims:        { icon:'materials', ...TILE },
  Lining:       { icon:'materials', ...TILE },
  Other:        { icon:'package',   ...TILE },
};

// Customer label for an order status: stage names never reach the customer.
const statusLabel = (s) => (STATUS[s] ?? STATUS.pending).label;

// Short brand burst on accept (300 ms); nothing under reduced motion. Shared with MaterialsReveal.jsx.
const BURST = ['var(--teal)', 'var(--kraft, #C9A27A)', '#C4313B', 'var(--navy)'];
export function ConfettiBurst() {
  const reduce = useReducedMotion();
  const [parts] = useState(() => Array.from({ length:16 }, (_, i) => ({
    id:i, color:BURST[i % 4], x:(Math.random() - 0.5) * 180, y:-(40 + Math.random() * 80), r:Math.random() * 180,
  })));
  if (reduce) return null;
  return (
    <div className="aim-burst" aria-hidden="true">
      {parts.map(p => (
        <motion.i key={p.id} style={{ background:p.color, borderRadius:p.id % 3 === 0 ? '50%' : 2 }}
          initial={{ opacity:1, x:0, y:0, rotate:0, scale:1 }} animate={{ opacity:0, x:p.x, y:p.y, rotate:p.r, scale:.4 }}
          transition={{ duration:.3, ease:'easeOut' }}/>
      ))}
    </div>
  );
}

// One dialog frame for both material dialogs: portalled, focus-trapped, Esc closes.
function AimDialog({ title, sub, icon, onClose, footer, children, width = 480 }: any) {
  const ref = useRef(null);
  const id = useRef(`aim-dlg-${Math.random().toString(36).slice(2, 8)}`).current;
  useDialogFocus(ref, { onClose });
  return createPortal(
    <AnimatePresence>
      <motion.div className="aim-scrim" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        transition={{ duration:.2 }} onClick={onClose}>
        <motion.div ref={ref} className="aim-dlg" role="dialog" aria-modal="true" aria-labelledby={id} style={{ '--w':`${width}px` }}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.2, ease:'easeOut' }}
          onClick={e => e.stopPropagation()}>
          <header className="aim-dlg-h">
            <h2 id={id}><NavIcon name={icon} size={18} color="currentColor"/>{title}</h2>
            {sub && <p>{sub}</p>}
          </header>
          <div className="aim-dlg-b">{children}</div>
          <footer className="aim-dlg-f">{footer}</footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.querySelector('.cm-shell') ?? document.body,
  );
}

// Accept confirmation modal — shared with MaterialsReveal.jsx.
export function AcceptModal({ order, recs, onClose, onDone }: any) {
  const [notes, setNotes] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/customer/orders/${order.order_id}/accept-materials`, { notes });
      cacheClear('orders_list','customer_dashboard');
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Could not send. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  return (
    <AimDialog title="Accept these materials" icon="success" onClose={onClose}
      sub={`Order #${order.order_id} · ${garmentLabel(order.garment_type)} · ${order.quantity_ordered} pcs`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} loading={busy} disabled={busy}>{busy ? 'Sending…' : 'Accept and notify VFRB'}</Button>
      </>}>
      <div className="aim-list">
        <p className="aim-list-h">Materials you are accepting</p>
        {recs.map((r, i) => {
          const cat = CAT[r.category] ?? CAT.Other;
          return (
            <div key={i} className="aim-list-row">
              <NavIcon name={cat.icon} size={16} color={cat.color}/>
              <div><strong>{stripCodes(r.material_name)}</strong><small>{r.category}</small></div>
            </div>
          );
        })}
      </div>
      <Field as="textarea" label="Notes for the VFRB team (optional)" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="For example: prefer a cotton blend, navy thread" style={{ resize:'vertical', minHeight:88 }}/>
      {err && <AlertBanner tone="error" title="Not sent" style={{ marginTop:12 }}>{err}</AlertBanner>}
    </AimDialog>
  );
}

// Lets the customer skip AI and pick materials from the real catalog directly.
export function SelfPickModal({ order, onClose, onDone }: any) {
  const [catalog, setCatalog] = useState([]);
  const [picked,  setPicked]  = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [notes,   setNotes]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    axios.get('/api/customer/materials-catalog')
      .then(r => setCatalog(r.data?.materials ?? []))
      .catch(() => setErr('Could not load the materials catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setPicked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const submit = async () => {
    if (picked.size === 0) { setErr('Pick at least one material.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/customer/orders/${order.order_id}/select-materials`, { material_ids: Array.from(picked), notes });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Could not send. Check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const byCategory = catalog.reduce((acc, m) => { (acc[m.category || 'Other'] ??= []).push(m); return acc; }, {});

  return (
    <AimDialog title="Choose your own materials" icon="materials" width={520} onClose={onClose}
      sub={`Order #${order.order_id}. Skip the AI and pick from the VFRB catalog yourself.`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} loading={busy} disabled={busy || loading}>{busy ? 'Sending…' : `Send selection (${picked.size})`}</Button>
      </>}>
      {loading ? <Skeleton variant="block" height={120} label="Loading the catalog"/> : (
        Object.entries(byCategory).map(([cat, mats]) => (
          <fieldset key={cat} className="aim-pick">
            <legend>{cat}</legend>
            {mats.map(m => (
              <label key={m.material_id} className="aim-pick-row" data-on={picked.has(m.material_id) || undefined}>
                <input type="checkbox" checked={picked.has(m.material_id)} onChange={() => toggle(m.material_id)}/>
                <span>{stripCodes(m.material_name)}</span>
              </label>
            ))}
          </fieldset>
        ))
      )}
      <Field as="textarea" label="Note for the VFRB team (optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Anything the team should know about your selection" style={{ resize:'vertical', minHeight:72 }}/>
      {err && <AlertBanner tone="error" title="Check this" style={{ marginTop:12 }}>{err}</AlertBanner>}
    </AimDialog>
  );
}

// Catalog facts the server reads from the materials table (never from the AI): code, stock and colour fit. No quantity or price.
// Merges the catalog facts (GET /orders/{id}/ai-recommendation, keyed by material name) into the order's recommendation rows.
export async function withCatalogFacts(orderId, recArr) {
  if (!recArr?.length) return recArr ?? [];
  try {
    const { data } = await axios.get(`/api/customer/orders/${orderId}/ai-recommendation`);
    const facts = data?.recommendation?.materials_json ?? {};
    return recArr.map(r => {
      const f = facts[r.material_name];
      return f ? { ...r, material_code: f.material_code ?? null, in_stock: f.in_stock ?? null, colour_match: f.colour_match ?? null, image_url: f.image_url ?? null, description: f.description ?? null } : r;
    });
  } catch { return recArr; }
}

// Only our Cloudinary account or the app's own /storage uploads; seeded /material-images/ are third-party stock.
const OWN_CLOUD = (import.meta.env.VITE_MODEL_BASE_URL || '').match(/^https:\/\/res\.cloudinary\.com\/[^/]+\//)?.[0];
const isOwnImage = (url) => {
  if (!url) return false;
  if (OWN_CLOUD && url.startsWith(OWN_CLOUD)) return true;
  try { const u = new URL(url, window.location.origin); return u.pathname.startsWith('/storage/'); } catch { return false; }
};
// Display-only: drops internal codes like "(MAT-FAB-014)".
export const stripCodes = (s) => s?.replace(/\s*\(?\bMAT-[A-Z]{3}-\d{3}\b\)?/g, '').trim();

const weave = (hex) => `repeating-linear-gradient(0deg, rgb(255 255 255 / .09) 0 2px, transparent 2px 4px),
  repeating-linear-gradient(90deg, rgb(0 0 0 / .11) 0 2px, transparent 2px 4px), ${hex}`;

// Fabric as a woven colour swatch; a name without a colour word gets the neutral paper tile.
function SwatchTile({ hex, label }: any) {
  return <div className="aim-tile" aria-hidden="true" style={{ background: weave(hex ?? 'var(--bg-surface-2)') }}><span className="aim-type">{label}</span></div>;
}

// Thread as a spool wound in the thread colour.
function SpoolGlyph({ hex, label }: any) {
  const c = hex ?? 'var(--text-faint)';
  return (
    <div className="aim-tile aim-tile--paper" aria-hidden="true">
      <svg width="64" height="88" viewBox="0 0 64 88">
        <rect x="6" y="4" width="52" height="10" rx="3" fill="var(--kraft, #C9A27A)"/>
        <rect x="6" y="74" width="52" height="10" rx="3" fill="var(--kraft, #C9A27A)"/>
        <rect x="12" y="14" width="40" height="60" fill={c}/>
        {[22, 30, 38, 46, 54, 62].map(y => <line key={y} x1="12" x2="52" y1={y} y2={y + 2} stroke="rgb(0 0 0 / .16)" strokeWidth="1.5"/>)}
        <path d="M52 40 C60 44 58 56 62 62" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span className="aim-type">{label}</span>
    </div>
  );
}

// SCOPE-001: swatch, name, type and one catalog description line only — never a quantity, estimate, price or internal code.
export function RecCard({ rec }: any) {
  const cat = CAT[rec.category] ?? CAT.Other;
  const name = stripCodes(rec.material_name);
  const desc = stripCodes(rec.description)?.replace(/\s+/g, ' ');
  const label = rec.category || 'Material';
  const kind = /thread/i.test(rec.category ?? '') ? 'spool' : /fabric|lining/i.test(rec.category ?? '') ? 'swatch' : null;
  return (
    <article className="vfrb-card flush overflow-hidden aim-rec">
      {isOwnImage(rec.image_url) ? (
        <img src={rec.image_url} alt={name} loading="lazy" className="aim-tile aim-tile--img"/>
      ) : kind === 'swatch' ? <SwatchTile hex={materialColour(rec.material_name)} label={label}/>
        : kind === 'spool' ? <SpoolGlyph hex={materialColour(rec.material_name)} label={label}/>
        : (
        <div className="aim-tile aim-tile--paper" aria-hidden="true">
          <NavIcon name={cat.icon} size={32} color={cat.color}/>
          <span className="aim-type">{label}</span>
        </div>
      )}
      <div className="aim-rec-b">
        <h3>{name}</h3>
        {/* Catalog colour fit from the server: a neighbouring colour family, offered but not exact. */}
        {rec.colour_match === 'near' && <span className="aim-near" title="Close to your colour, not an exact match">Near match</span>}
        {desc && <p title={desc}>{desc}</p>}
      </div>
    </article>
  );
}

// Shown once above any list of RecCards.
export const AI_OPTIONAL_LINE = 'Suggested by AI. Optional.';

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIMaterials() {
  usePageTitle('AI Material Recommendation');
  const nav = useNavigate();

  const [orders,      setOrders]      = useState([]);
  const [selId,       setSelId]       = useState(null);
  const [order,       setOrder]       = useState(null);
  const [recs,        setRecs]        = useState([]);
  const [source,      setSource]      = useState(null); // 'ai' | 'cache' | 'catalog_default' from the last generation
  const [generating,  setGenerating]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [ordersError,  setOrdersError]  = useState(false);
  const [recsError,    setRecsError]    = useState(false);
  const [showAccept,  setShowAccept]  = useState(false);
  const [accepted,    setAccepted]    = useState(false);
  const [showConf,    setShowConf]    = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [toastNode, showToast] = useToast();

  const loadOrders = useCallback(() => {
    setLoading(true); setOrdersError(false);
    fetchAllPages('/api/customer/orders')
      .then(all => {
        const active = all.filter(o => o.status !== 'cancelled');
        setOrders(active);
        setSelId(prev => prev ?? active[0]?.order_id ?? null);
      })
      .catch(() => setOrdersError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const loadDetail = useCallback(() => {
    if (!selId) return;
    setLoadingRecs(true); setRecsError(false);
    axios.get(`/api/customer/orders/${selId}`)
      .then(r => {
        const o    = r.data?.order ?? r.data;
        const recArr = r.data?.recommendations ?? [];
        setOrder(o);
        setRecs(recArr);
        setAccepted(o?.ai_recommendation_status === 'accepted');
        withCatalogFacts(selId, recArr).then(setRecs);
      })
      .catch(() => setRecsError(true))
      .finally(() => setLoadingRecs(false));
  }, [selId]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const generate = async () => {
    if (!selId) return;
    setGenerating(true);
    try {
      const { data } = await axios.post('/api/customer/ai/recommend-materials', { order_id: selId });
      const refresh  = await axios.get(`/api/customer/orders/${selId}`);
      const o        = refresh.data?.order ?? refresh.data;
      const recArr   = refresh.data?.recommendations ?? data.recommendations ?? [];
      setOrder(o);
      // The fresh rows carry the catalog facts the recommend call returned (code, stock, colour fit, image, description).
      const facts = Object.fromEntries((data?.materials ?? []).map(m => [m.material_id, m]));
      setRecs(recArr.map(r => { const f = facts[r.material_id]; return f ? { ...r, material_code: f.material_code, in_stock: f.in_stock, colour_match: f.colour_match, image_url: f.image_url ?? null, description: f.description ?? null } : r; }));
      setSource(data?.source ?? null);
      setAccepted(o?.ai_recommendation_status === 'accepted');
    } catch(e) {
      showToast(e.response?.data?.message ?? 'AI recommendations are unavailable right now. Please try again shortly.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const celebrate = () => { setAccepted(true); setShowConf(true); cacheClear('orders_list','customer_dashboard'); setTimeout(() => setShowConf(false), 3500); };
  const onAccepted = () => { setShowAccept(false); celebrate(); };
  const onSelfSelected = async () => {
    setShowPicker(false); celebrate();
    const refresh = await axios.get(`/api/customer/orders/${selId}`).catch(() => null);
    if (refresh) { setOrder(refresh.data?.order ?? refresh.data); setRecs(refresh.data?.recommendations ?? []); }
  };

  const selectedOrder = orders.find(o => o.order_id === selId);
  const hasRecs = recs.length > 0;

  return (
    <>
      {toastNode}
      {showAccept && order && <AcceptModal order={order} recs={recs} onClose={() => setShowAccept(false)} onDone={onAccepted}/>}
      {showPicker && order && <SelfPickModal order={order} onClose={() => setShowPicker(false)} onDone={onSelfSelected}/>}

      <div className="cx-page aim">
        <PageHeader title="AI Material Recommendation" subtitle="Suggests the types of material your order needs. VFRB's team confirms the final materials."/>

        <aside className="aim-how">
          <span className="aim-how-ic" aria-hidden="true"><NavIcon name="ai" size={18} color="currentColor"/></span>
          <div>
            <h2>How it works</h2>
            <p>The AI reads your garment type, fit, colours and design details and suggests the types of raw material your order needs.
              VFRB's production team sets the exact quantities. When you accept, the team is told to prepare your materials.</p>
          </div>
        </aside>

        {loading ? (
          <Skeleton variant="block" height={44} label="Loading your orders"/>
        ) : ordersError ? (
          <ErrorState title="Couldn't load your orders" onRetry={loadOrders}/>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" action={<Button variant="primary" icon="designStudio" onClick={() => nav('/order/create')}>Start a new order</Button>}>
            Place an order first, then get material suggestions for it here.
          </EmptyState>
        ) : (
          <div className="aim-body">
            <div className="aim-pickrow">
              <div className="aim-sel">
                <Field as="select" id="aim-order" label="Order" value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))}>
                  {orders.map(o => (
                    <option key={o.order_id} value={o.order_id}>
                      Order #{o.order_id} · {garmentLabel(o.garment_type) || 'Custom'} · {o.quantity_ordered} pcs ({statusLabel(o.status)})
                    </option>
                  ))}
                </Field>
              </div>
              {selectedOrder && <StatusPill status={selectedOrder.status}/>}
            </div>

            <div className="aim-act">
              <Button variant="primary" fullWidth icon="ai" onClick={generate} loading={generating} disabled={generating}>
                {generating ? 'Reading your order…' : hasRecs ? 'Get new suggestions' : 'Get AI material suggestions'}
              </Button>
              <p className="aim-hint">Suggestions are saved with each order.</p>
              <Button variant="ghost" onClick={() => setShowPicker(true)}>Or choose your own materials</Button>
            </div>

            {loadingRecs ? (
              <div className="aim-grid">{[1, 2, 3].map(i => <Skeleton key={i} variant="block" height={200} label="Loading suggestions"/>)}</div>
            ) : recsError ? (
              <ErrorState title="Couldn't load suggestions for this order" onRetry={loadDetail}/>
            ) : hasRecs ? (
              <>
                <AnimatePresence>
                  {(accepted || showConf) && (
                    <motion.div className="aim-done" initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.2 }}>
                      {showConf && <ConfettiBurst/>}
                      <AlertBanner tone="success" title="Materials accepted. VFRB has been notified.">
                        The team will prepare these materials for your order.
                      </AlertBanner>
                    </motion.div>
                  )}
                </AnimatePresence>

                {source === 'catalog_default' && (
                  <AlertBanner tone="info" title="Standard materials shown">
                    AI suggestions are unavailable right now, so these are VFRB's standard approved materials for this design. Our team will confirm them.
                  </AlertBanner>
                )}

                <p className="aim-optional">{AI_OPTIONAL_LINE}</p>
                <div className="aim-grid">{recs.map((r, i) => <RecCard key={r.rec_id ?? i} rec={r}/>)}</div>

                {!accepted && (
                  <section className="aim-cta" aria-labelledby="aim-cta-h">
                    <h2 id="aim-cta-h">Happy with these materials?</h2>
                    <p>Accepting tells the VFRB team to prepare these materials for your order. You can add a note.</p>
                    <Button variant="primary" icon="success" onClick={() => setShowAccept(true)}>Accept and notify VFRB</Button>
                  </section>
                )}
              </>
            ) : !generating && (
              <EmptyState title="No suggestions yet">Press “Get AI material suggestions” to read this order.</EmptyState>
            )}
          </div>
        )}
      </div>
    </>
  );
}
