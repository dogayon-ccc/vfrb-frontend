// src/pages/client/MyDesigns.jsx — customer-facing browsing surface for the customer's
// design work, addressing the gap where "Continue editing" / "order this design again"
// only existed inside the Studio's Inspiration tab (InspoGallery.jsx), not as a page a
// customer could navigate to. Backed by the same two endpoints the Studio already uses:
//   GET /api/customer/drafts/latest — the one in-progress design (one row per user; there
//     is no multi-draft list in this schema, so this page shows at most one "current" card)
//   GET /api/customer/designs       — starter templates (source_order_id null, surfaced in
//     the Studio's own Inspiration tab, not repeated here) + this customer's own designs
//     tied to an order (is_archived true). `locked` ones are view-only with Reorder and
//     "Duplicate to edit" (POST /api/customer/designs/{id}/copy); copies are colour-only.
import { stashStudioConfig } from '../../utils/studioHandoff';
import { setStudioLock } from '../../utils/studioLock';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';
import axios from 'axios';
import EmptyState from '../../components/EmptyState';
import { Card, Button, Badge, PageHeader, Skeleton, ActionMenu } from '../../components/ui';
import { Chips, DesignThumb, reltime, fmtDate } from '../../components/customer/kit';
import { savedDesignName, garmentLabel } from '../../utils/designName';
import { openDesign, reorderDesign, duplicateDesign } from '../../utils/designActions';

// Gallery card: big preview, one primary action, one visible secondary, the rest in the "⋯" menu.
function DesignCard({ img, garment, colors, title, meta, badge, tone, primary, secondary, tertiary, i, what }) {
  return (
    <Card as={motion.article} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
      padding="none" className="mx-card" bodyClassName="mx-card-in">
      <button type="button" className="mx-stage" onClick={primary?.onClick} disabled={primary?.disabled} aria-label={`${primary?.label ?? 'Open'}: ${title}`}>
        <DesignThumb src={img} garment={garment} colors={colors} name={title} what={what} scale={2.3} />
        <span className="mx-badge"><Badge tone={tone}>{badge}</Badge></span>
      </button>
      <div className="mx-body">
        <div className="mx-txt"><h3 title={title}>{title}</h3><p>{meta}</p></div>
        <div className="mx-acts">
          {primary && <Button variant="primary" className="mx-primary" onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</Button>}
          {secondary && <Button onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</Button>}
          {tertiary && <ActionMenu label={`More actions for ${title}`} items={[tertiary]} />}
        </div>
      </div>
    </Card>
  );
}

const DRAFT = 'warning';
const ORDERED = 'success';
const INSPO = 'info';
const FINAL = 'neutral';
const STEPS = [['Design', 'Pick a garment in the Design Studio, then set colors, logo and text.'], ['Save', 'Save it to keep your work. You can come back and edit any time.'], ['Order', 'Tell us quantity and sizes. VFRB reviews the order before production.']];

export default function MyDesigns() {
  const nav = useNavigate();
  const [draft, setDraft] = useState(null);
  const [past, setPast] = useState([]);
  const [copies, setCopies] = useState([]);
  const [busy, setBusy] = useState(null);
  const [actErr, setActErr] = useState('');
  const [tpl, setTpl] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(() => ['draft', 'ordered', 'inspo'].includes(sp.get('tab')) ? sp.get('tab') : 'all');
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true); setError(false);
    Promise.allSettled([axios.get('/api/customer/drafts/latest'), axios.get('/api/customer/designs')]).then(([d, p]) => {
      if (d.status === 'fulfilled' && d.value.data?.draft?.studio_config?.garment) setDraft(d.value.data.draft); else setDraft(null);
      if (p.status === 'fulfilled') {
        const rows = Array.isArray(p.value.data) ? p.value.data : [];
        setPast(rows.filter(x => x.is_archived && !x.is_copy && x.config?.garment));
        setCopies(rows.filter(x => x.is_copy && x.config?.garment));
        setTpl(rows.filter(x => !x.is_archived && x.config?.garment));
      }
      if (d.status === 'rejected' && p.status === 'rejected') setError(true);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const openStudioBlank = () => { sessionStorage.removeItem('studio_config'); setStudioLock(null); nav('/design-studio'); };
  const continueDraft = () => { sessionStorage.setItem('studio_config', JSON.stringify(draft.studio_config)); setStudioLock(null); nav('/design-studio'); };
  const orderDraft = () => {
    const png = draft.preview_dataurl;
    const snap = png?.startsWith?.('data:image/png') ? { ...draft.studio_config, previewPng: png } : draft.studio_config;
    stashStudioConfig(snap, { fromDraft: true });
    nav('/order/create');
  };
  const useTemplate = (d) => { sessionStorage.setItem('studio_config', JSON.stringify(d.config)); setStudioLock(null); nav('/design-studio'); };
  const open = (d) => { setActErr(''); if (!openDesign(d, nav)) setActErr('Could not open the design in this browser. Try again.'); };
  const reorder = (d) => { setActErr(''); if (!reorderDesign(d, nav)) setActErr('Could not start the order in this browser. Try again.'); };
  const duplicate = async (d) => {
    setBusy(d.id); setActErr('');
    try { open(await duplicateDesign(d)); } catch { setActErr('Could not make a copy. Check your connection and try again.'); setBusy(null); }
  };

  const nDraft = (draft ? 1 : 0) + copies.length, nOrdered = past.length, nInspo = tpl.length, total = nDraft + nOrdered;
  const hit = (...v) => !q.trim() || v.filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase());
  const cfg = draft?.studio_config ?? {};
  // Card title: the customer's design name when it has one (archived designs are labelled "<garment> — Order #n" by the backend).
  const titleOf = (c, label, fallback) => garmentLabel(savedDesignName(c) || label || fallback);
  const draftTitle = draft ? titleOf(cfg, draft.label, cfg.garment || 'Untitled design') : '';
  const showDraft = draft && (tab === 'all' || tab === 'draft') && hit(draftTitle, cfg.garment, cfg.category);
  const shownCopies = tab === 'all' || tab === 'draft' ? copies.filter(d => hit(titleOf(d.config, d.label), d.label, d.garment, d.category)) : [];
  const shownPast = past.filter(d => hit(titleOf(d.config, d.label), d.label, d.garment, d.category));
  const showPast = tab === 'all' || tab === 'ordered';
  const shownTpl = tab === 'inspo' ? tpl.filter(d => hit(d.label, d.garment, d.category)) : [];
  const noMatch = q.trim() && !showDraft && !shownCopies.length && !(showPast && shownPast.length) && !shownTpl.length;
  const empty = !loading && !error && total === 0;
  const tabEmpty = !loading && !error && total > 0 && ((tab === 'draft' && !nDraft) || (tab === 'ordered' && !nOrdered) || (tab === 'inspo' && !nInspo));

  return (
    <div className="cx-page">
      <PageHeader title="My Designs" subtitle={total ? `${total} of your own design${total !== 1 ? 's' : ''}${nInspo ? ` · ${nInspo} inspiration` : ''}` : 'Your work in progress, saved designs and inspiration'}>
        {!empty && <Button variant="primary" icon="designStudio" onClick={openStudioBlank}>New design</Button>}
      </PageHeader>

      {!loading && !error && (total > 0 || nInspo > 0) && (
        <div className="mx-tools">
          <input type="search" className="cx-in mx-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search designs" aria-label="Search designs" />
          <Chips label="Filter designs" value={tab} onChange={setTab}
            items={[{ id: 'all', label: 'All', count: total }, { id: 'draft', label: 'Drafts', count: nDraft }, { id: 'ordered', label: 'Ordered before', count: nOrdered }, ...(nInspo ? [{ id: 'inspo', label: 'Inspiration', count: nInspo }] : [])]} />
        </div>
      )}

      {loading && (
        <div className="cx-dgrid">{[1, 2, 3].map(i => <Card key={i} padding="none"><Skeleton variant="block" height={200} label="Loading designs" className="mx-sk" /><div className="mx-body"><Skeleton count={2} /></div></Card>)}</div>
      )}

      {error && <EmptyState illustration="error" headline="Couldn't load your designs" sub="Check your connection and try again." cta={{ label: 'Retry', onClick: load }} />}
      {empty && tab !== 'inspo' && (
        <Card padding="lg" className="mx-start" title="Create your first uniform design" subtitle="Designs you save appear here, ready to edit or order in bulk.">
          <ol className="mx-steps">
            {STEPS.map(([t, d], n) => <li key={t}><span aria-hidden="true">{n + 1}</span><strong>{t}</strong><p>{d}</p></li>)}
          </ol>
          <Button variant="primary" size="lg" icon="designStudio" onClick={openStudioBlank}>Open Design Studio</Button>
        </Card>
      )}
      {tabEmpty && <EmptyState illustration="order" headline={tab === 'draft' ? 'No drafts right now' : tab === 'inspo' ? 'No inspiration yet' : 'No past orders yet'}
        sub={tab === 'draft' ? 'Start a new design in the Design Studio.' : tab === 'inspo' ? 'Starter designs will appear here.' : 'Designs from your completed orders will show up here.'} cta={{ label: 'Open Design Studio', onClick: openStudioBlank }} />}

      {actErr && <p role="alert" className="mx-err">{actErr}</p>}
      {noMatch && <EmptyState illustration="order" headline="No designs match your search" sub="Try a different garment name." />}

      {!loading && !error && (total > 0 || (tab === 'inspo' && nInspo > 0)) && !noMatch && (
        <div className="cx-dgrid">
          {showDraft && (
            <DesignCard i={0} img={draft.preview_dataurl} garment={cfg.garment} colors={cfg.colors}
              title={draftTitle} meta={`${cfg.category ?? 'Design'} · edited ${reltime(draft.updated_at)}`}
              badge="Draft" tone={DRAFT} primary={{ label: 'Continue editing', onClick: continueDraft }} secondary={{ label: 'Order this', onClick: orderDraft }} />
          )}
          {shownCopies.map((d, i) => (
            <DesignCard key={d.id} i={i + 1} img={null} garment={d.garment} colors={d.config?.colors}
              title={titleOf(d.config, d.label, d.garment || 'Design')} meta={d.order_id ? `Copy of a design from order #${d.order_id}` : 'Copy'}
              badge="Copy" tone={DRAFT} primary={{ label: 'Edit colors', onClick: () => open(d) }} secondary={{ label: 'Order this', onClick: () => reorder(d) }} />
          ))}
          {showPast && shownPast.map((d, i) => (
            <DesignCard key={d.id} i={i + 1} img={d.photo_path} garment={d.garment} colors={d.config?.colors}
              title={titleOf(d.config, d.label, d.garment || 'Design')} meta={[d.category, d.sleeve].filter(Boolean).join(' · ') || fmtDate(d.updated_at ?? d.created_at)}
              badge={d.locked ? 'Ordered · view only' : 'Ordered before'} tone={d.locked ? FINAL : ORDERED}
              primary={{ label: 'Reorder', onClick: () => reorder(d) }}
              secondary={{ label: busy === d.id ? 'Copying…' : 'Duplicate to edit', onClick: () => duplicate(d), disabled: !!busy }}
              tertiary={{ label: d.locked ? 'View in Studio' : 'Open in Studio', onClick: () => open(d) }} />
          ))}
          {shownTpl.map((d, i) => (
            <DesignCard key={`t${d.id}`} i={i} img={d.photo_path} garment={d.garment} colors={d.config?.colors}
              title={garmentLabel(d.label || d.garment) || 'Inspiration'} meta={[d.category, d.sleeve].filter(Boolean).join(' · ') || 'Starter design'}
              badge="Inspiration" tone={INSPO} what="Starter design photo" primary={{ label: 'Use as starting point', onClick: () => useTemplate(d) }} />
          ))}
          {tab !== 'inspo' && <button type="button" className="cx-newtile" onClick={openStudioBlank}>
            <Palette size={22} aria-hidden="true" /> <strong>Start a new design</strong><span>Pick a garment and make it yours</span>
          </button>}
        </div>
      )}
    </div>
  );
}
