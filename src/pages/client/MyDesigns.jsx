// src/pages/client/MyDesigns.jsx — customer-facing browsing surface for the customer's
// design work, addressing the gap where "Continue editing" / "order this design again"
// only existed inside the Studio's Inspiration tab (InspoGallery.jsx), not as a page a
// customer could navigate to. Backed by the same two endpoints the Studio already uses:
//   GET /api/customer/drafts/latest — the one in-progress design (one row per user; there
//     is no multi-draft list in this schema, so this page shows at most one "current" card)
//   GET /api/customer/designs       — starter templates (source_order_id null, surfaced in
//     the Studio's own Inspiration tab, not repeated here) + this customer's own designs
//     that were archived when an order completed (is_archived true) — browsable, not
//     re-editable in place, but usable as the base for a new design via "Order again".
// No new backend endpoint, table, or field is used — this page is a read surface over
// data the Studio already writes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import EmptyState from '../../components/EmptyState';
import { NavIcon } from '../../components/ui/icons';
import { MiniPreview } from './design-studio/InspoGallery';
import { PageHeader, Chips, Skeleton, reltime, fmtDate } from '../../components/customer/kit';

function DesignCard({ img, garment, colors, title, meta, badge, tone, primary, secondary, i }) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
      whileHover={{ y: -3 }} className="cx-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', background: 'linear-gradient(160deg,var(--bg-surface),var(--bg-card))',
        display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {img ? <img src={img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <div style={{ transform: 'scale(2.3)', lineHeight: 0 }}><MiniPreview garment={garment} colors={colors ?? {}} /></div>}
        <span className="cx-pill" style={{ position: 'absolute', top: 10, left: 10, background: tone.bg, color: tone.fg }}>{badge}</span>
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-subtle)' }}>{meta}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          {primary && <button className="cx-btn cx-btn-p" style={{ minHeight: 40, padding: '0 10px', width: '100%' }} onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</button>}
          {secondary && <button className="cx-btn cx-btn-s" style={{ minHeight: 40, padding: '0 10px', width: '100%' }} onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button>}
        </div>
      </div>
    </motion.article>
  );
}

const DRAFT = { bg: '#fef3c7', fg: '#b45309' };
const ORDERED = { bg: '#dcfce7', fg: '#15803d' };

export default function MyDesigns() {
  const nav = useNavigate();
  const [draft, setDraft] = useState(null);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true); setError(false);
    Promise.allSettled([axios.get('/api/customer/drafts/latest'), axios.get('/api/customer/designs')]).then(([d, p]) => {
      if (d.status === 'fulfilled' && d.value.data?.draft?.studio_config?.garment) setDraft(d.value.data.draft); else setDraft(null);
      if (p.status === 'fulfilled') setPast((p.value.data ?? []).filter(x => x.is_archived && x.config?.garment));
      if (d.status === 'rejected' && p.status === 'rejected') setError(true);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const openStudioBlank = () => { sessionStorage.removeItem('studio_config'); nav('/design-studio'); };
  const continueDraft = () => { sessionStorage.removeItem('studio_config'); nav('/design-studio'); };
  const orderDraft = () => { sessionStorage.setItem('studio_config', JSON.stringify(draft.studio_config)); nav('/order/create'); };
  const orderAgain = (d) => { sessionStorage.setItem('studio_config', JSON.stringify(d.config)); nav('/design-studio'); };

  const nDraft = draft ? 1 : 0, nOrdered = past.length, total = nDraft + nOrdered;
  const hit = (...v) => !q.trim() || v.filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase());
  const cfg = draft?.studio_config ?? {};
  const showDraft = draft && (tab === 'all' || tab === 'draft') && hit(draft.label, cfg.garment, cfg.category);
  const shownPast = past.filter(d => hit(d.label, d.garment, d.category));
  const showPast = tab === 'all' || tab === 'ordered';
  const noMatch = q.trim() && !showDraft && !(showPast && shownPast.length);
  const empty = !loading && !error && total === 0;
  const tabEmpty = !loading && !error && total > 0 && ((tab === 'draft' && !draft) || (tab === 'ordered' && !nOrdered));

  return (
    <div className="cx-page">
      <PageHeader title="My Designs" subtitle={total ? `${total} design${total !== 1 ? 's' : ''} · draft and ordered` : 'Your work in progress and past designs'}>
        <button className="cx-btn cx-btn-p" onClick={openStudioBlank}><NavIcon name="designStudio" size={15} color="#fff" /> New Design</button>
      </PageHeader>

      {!loading && !error && total > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="search" className="cx-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Search designs" aria-label="Search designs" style={{ maxWidth: 420 }} />
          <Chips label="Filter designs" value={tab} onChange={setTab}
            items={[{ id: 'all', label: 'All', count: total }, { id: 'draft', label: 'Draft', count: nDraft }, { id: 'ordered', label: 'Ordered', count: nOrdered }]} />
        </div>
      )}

      {loading && (
        <div className="cx-dgrid">{[1, 2, 3].map(i => <div key={i} className="cx-card" style={{ overflow: 'hidden' }}><Skeleton h={200} style={{ borderRadius: 0 }} /><div style={{ padding: 14 }}><Skeleton h={14} w="60%" /><Skeleton h={40} style={{ marginTop: 14 }} /></div></div>)}</div>
      )}

      {error && <EmptyState illustration="error" headline="Couldn't load your designs" sub="Check your connection and try again." cta={{ label: 'Retry', onClick: load }} />}
      {empty && <EmptyState illustration="order" headline="No designs yet" sub="Open the Design Studio to create your first custom uniform." cta={{ label: 'Open Design Studio', onClick: openStudioBlank }} />}
      {tabEmpty && <EmptyState illustration="order" headline={tab === 'draft' ? 'No draft in progress' : 'No ordered designs yet'}
        sub={tab === 'draft' ? 'Start a new design in the Design Studio.' : 'Designs you order will show up here.'} cta={{ label: 'Open Design Studio', onClick: openStudioBlank }} />}

      {noMatch && <EmptyState illustration="order" headline="No designs match your search" sub="Try a different garment name." />}

      {!loading && !error && total > 0 && !noMatch && (
        <div className="cx-dgrid">
          {showDraft && (
            <DesignCard i={0} img={draft.preview_dataurl} garment={cfg.garment} colors={cfg.colors}
              title={draft.label || cfg.garment || 'Untitled design'} meta={`${cfg.category ?? 'Design'} · edited ${reltime(draft.updated_at)}`}
              badge="Draft" tone={DRAFT} primary={{ label: 'Continue editing', onClick: continueDraft }} secondary={{ label: 'Order this', onClick: orderDraft }} />
          )}
          {showPast && shownPast.map((d, i) => (
            <DesignCard key={d.id} i={i + 1} img={d.photo_path} garment={d.garment} colors={d.config?.colors}
              title={d.label || d.garment || 'Design'} meta={[d.category, d.sleeve].filter(Boolean).join(' · ') || fmtDate(d.updated_at ?? d.created_at)}
              badge="Ordered" tone={ORDERED} primary={{ label: 'Order again', onClick: () => orderAgain(d), disabled: !d.config?.garment }} />
          ))}
          <button type="button" className="cx-newtile" onClick={openStudioBlank}>
            <NavIcon name="designStudio" size={22} /> <strong>Start a new design</strong><span>Pick a garment and make it yours</span>
          </button>
        </div>
      )}
      <style>{`.cx-newtile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:240px;padding:20px;border:2px dashed var(--border-strong);border-radius:16px;background:transparent;color:var(--teal);cursor:pointer;font:inherit;transition:border-color .15s,background .15s,transform .15s}
        .cx-newtile:hover{border-color:var(--teal);background:var(--teal-50);transform:translateY(-2px)}
        .cx-newtile strong{font-size:14px}.cx-newtile span{font-size:12px;color:var(--text-muted)}
        @media(prefers-reduced-motion:reduce){.cx-newtile{transition:none}}
        .cx-dgrid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr))}
        @media(min-width:768px){.cx-dgrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
        @media(min-width:1100px){.cx-dgrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:339px){.cx-dgrid{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
