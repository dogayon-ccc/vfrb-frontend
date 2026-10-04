import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../../components/ui/icons';
import { T2 } from './dsShared';
import { BASE_PATHS } from './garmentPaths';
import { CATEGORIES, PIECES, SLEEVES, GENDERS, ENTRIES, TIER_LABEL, filterDesigns, facetCounts, openTarget } from './designGallery';
import { applyGarment } from './garmentCatalog';

export function MiniPreview({ garment, colors }) {
  const paths = BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt'];
  return (
    <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width="54" height="66" style={{ display:'block' }}>
      {paths.body    && <path d={paths.body}    fill={colors.body   ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="3"/>}
      {paths.collar  && <path d={paths.collar}  fill={colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.1)"  strokeWidth="2"/>}
      {paths.sleeveL && <path d={paths.sleeveL} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.1)" strokeWidth="2"/>}
      {paths.sleeveR && <path d={paths.sleeveR} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.1)" strokeWidth="2"/>}
      {paths.pocket  && <path d={paths.pocket}  fill={colors.pocket ?? colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.08)" strokeWidth="1"/>}
    </svg>
  );
}

// 28px circular icon button — matches the panel's own close ("✕") button.
function IconBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick}
      style={{
        width:24, height:24, borderRadius:7, border:'none', flexShrink:0,
        background: danger ? 'rgba(229,62,62,.12)' : 'rgba(15,23,42,.07)',
        color:      danger ? '#e53e3e' : 'rgba(15,23,42,.5)',
        fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
      }}>{children}</button>
  );
}

function Tile({ label, sub, thumb, onClick, editable, onRename, onDelete, onSubmitShowcase, showcaseStatus }) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(label);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const revertTimer = useRef(null);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== label) onRename(trimmed);
    else setValue(label);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      revertTimer.current = setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    clearTimeout(revertTimer.current);
    onDelete();
  };

  return (
    <motion.div whileHover={{ scale:1.04, boxShadow:'0 8px 28px rgba(2,195,154,.18)' }}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        padding:'14px 10px 10px', borderRadius:12, border:'1px solid rgba(15,23,42,.08)',
        background:'rgba(15,23,42,.04)',
      }}>
      <button onClick={onClick} disabled={renaming}
        style={{ background:'none', border:'none', padding:0, cursor:renaming ? 'default' : 'pointer',
          display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:'100%' }}>
        {thumb}
        {renaming ? (
          <input autoFocus value={value} onClick={e => e.stopPropagation()}
            onChange={e => setValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setValue(label); setRenaming(false); } }}
            style={{ fontSize:10, fontWeight:700, color:'rgba(15,23,42,.7)', textAlign:'center',
              width:'100%', border:'1px solid rgba(2,195,154,.4)', borderRadius:5, padding:'2px 4px' }}/>
        ) : (
          <p style={{ fontSize:10, fontWeight:700, color:'rgba(15,23,42,.7)', margin:0, textAlign:'center' }}>{label}</p>
        )}
        <div style={{ fontSize:9, color:'rgba(15,23,42,.28)' }}>{sub}</div>
      </button>

      {editable && !renaming && (
        <div style={{ display:'flex', gap:5, marginTop:2 }}>
          <IconBtn onClick={(e) => { e.stopPropagation(); setRenaming(true); }}>✎</IconBtn>
          <IconBtn danger onClick={handleDeleteClick}>
            {confirmingDelete ? 'Sure?' : '🗑'}
          </IconBtn>
          {onSubmitShowcase && (!showcaseStatus || showcaseStatus === 'none' || showcaseStatus === 'rejected') && (
            <IconBtn onClick={(e) => { e.stopPropagation(); onSubmitShowcase(); }}>🏆</IconBtn>
          )}
          {showcaseStatus === 'submitted' && <span style={{ fontSize:9, color:'rgba(15,23,42,.35)', alignSelf:'center' }}>Pending review</span>}
          {showcaseStatus === 'approved'  && <span style={{ fontSize:9, color:T2, fontWeight:700, alignSelf:'center' }}>In showcase</span>}
        </div>
      )}
    </motion.div>
  );
}

const FILTERS = [
  ['category', 'Category', CATEGORIES],
  ['piece',    'Piece',    PIECES],
  ['gender',   'For',      GENDERS],
  ['tier',     'Type',     Object.entries(TIER_LABEL).map(([id, t]) => ({ id, label: t.label }))],
  ['sleeve',   'Sleeve',   SLEEVES.map(id => ({ id, label:id }))],
];

function FilterRow({ label, options, value, counts, totals, onChange }) {
  const shown = options.filter(o => totals[o.id] > 0);
  if (shown.length < 2) return null;
  return (
    <div className="ds-gal-row" role="group" aria-label={label}>
      <span className="ds-gal-label">{label}</span>
      {shown.map(o => (
        <button key={o.id} type="button" className="ds-chip" aria-pressed={value === o.id}
          disabled={value !== o.id && !counts[o.id]}
          onClick={() => onChange(value === o.id ? null : o.id)}>
          {o.label}<span className="ds-chip-note"> {counts[o.id]}</span>
        </button>
      ))}
    </div>
  );
}

const TONE = { muted:'rgba(15,23,42,.45)', info:'#2563eb', warn:'#b45309', ok:'#047857' };

function TierBadge({ tier }) {
  const t = TIER_LABEL[tier];
  return <span style={{ fontSize:9, fontWeight:800, color:TONE[t.tone] }}>{t.label}</span>;
}

const PIECE_LABEL = Object.fromEntries(PIECES.map(p => [p.id, p.label]));
const GENDER_LABEL = Object.fromEntries(GENDERS.map(g => [g.id, g.label]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const facts = d => [CAT_LABEL[d.category], PIECE_LABEL[d.piece], GENDER_LABEL[d.gender], d.sleeve && `${d.sleeve} sleeve`].filter(Boolean);
const TOTALS = facetCounts({});

function PhotoCard({ d, onClick }) {
  return (
    <button type="button" className="ds-photo-card" onClick={onClick} aria-label={`${d.label}, ${TIER_LABEL[d.tier].label}`}>
      <img src={d.image} alt={d.label} loading="lazy"/>
      <span className="ds-photo-meta">
        <strong>{d.label}</strong>
        <span>{facts(d).join(' · ')}</span>
        <TierBadge tier={d.tier}/>
      </span>
    </button>
  );
}

function DesignBrowser({ onOpen, onOpen3D }) {
  const [filters, setFilters] = useState({});
  const [kind, setKind] = useState('editable');
  const [preview, setPreview] = useState(null);
  const counts = useMemo(() => facetCounts(filters), [filters]);
  const matched = useMemo(() => filterDesigns(filters), [filters]);
  const kindCount = { editable: matched.filter(d => d.editable2D).length, reference: matched.filter(d => !d.editable2D).length, all: matched.length };
  const shown = useMemo(() => kind === 'all' ? matched : matched.filter(d => kind === 'editable' ? d.editable2D : !d.editable2D), [matched, kind]);

  if (preview) {
    const t = TIER_LABEL[preview.tier];
    return (
      <div className="ds-gal-preview">
        <img src={preview.image} alt={preview.label} style={{ maxHeight:360, maxWidth:'100%', objectFit:'contain' }}/>
        <p style={{ fontSize:13, fontWeight:800, color:'#1a2332', margin:0 }}>{preview.label}</p>
        <p className="ds-note" style={{ textAlign:'center', margin:0 }}>{facts(preview).join(' · ')}</p>
        <TierBadge tier={preview.tier}/>
        <p className="ds-note" style={{ textAlign:'center' }}>{preview.exactBase ? 'Editable in 2D on a real VFRB photo base. No 3D model.' : t.note}</p>
        {preview.editable2D && <p className="ds-note" style={{ textAlign:'center' }}>{preview.exactBase ? `Opens this garment as an editable real-photo base (${preview.garmentFamily}).` : `Opens the closest ${preview.garmentFamily} template${preview.sleeve ? `, ${preview.sleeve.toLowerCase()} sleeve` : ''}. It is not an exact copy of the photo.`}</p>}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
          {preview.editable2D && <button type="button" className="ds-chip" aria-pressed="true" onClick={() => onOpen(preview, filters)}>{preview.exactBase ? 'Edit this garment' : `Open ${preview.garmentFamily} template`}</button>}
          {preview.has3D && <button type="button" className="ds-chip" onClick={() => onOpen3D(preview, filters)}>Open with 3D preview</button>}
          <button type="button" className="ds-chip" onClick={() => setPreview(null)}>Back to photos</button>
        </div>
      </div>
    );
  }

  const active = Object.values(filters).some(Boolean);
  return (
    <>
      <input type="search" className="ds-gal-search" placeholder="Search photos (blazer, mandarin, scrub…)" aria-label="Search photos"
        value={filters.q ?? ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}/>
      <div role="group" aria-label="Photo type" style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'0 0 10px' }}>
        {[['editable','Editable in Studio'],['reference','Inspiration only'],['all','All']].map(([id,lbl]) => (
          <button key={id} type="button" className="ds-chip" aria-pressed={kind === id} onClick={() => setKind(id)}>{lbl} ({kindCount[id]})</button>
        ))}
      </div>
      <div className="ds-gal-filters">
        {FILTERS.map(([key, label, options]) => (
          <FilterRow key={key} label={label} options={options} value={filters[key]} counts={counts[key]} totals={TOTALS[key]}
            onChange={v => setFilters(f => ({ ...f, [key]: v }))}/>
        ))}
      </div>
      <p className="ds-note" style={{ margin:'0 0 8px' }}>
        {`${shown.length} photos`}
        {active && (
          <> · <button type="button" onClick={() => setFilters({})}
            style={{ background:'none', border:'none', padding:0, color:T2, fontWeight:700, cursor:'pointer' }}>Clear filters</button></>
        )}
      </p>
      {shown.length === 0
        ? <p className="ds-note" style={{ padding:'24px 0', textAlign:'center' }}>No photos match these filters.</p>
        : <div className="ds-photo-grid">{shown.map(d => <PhotoCard key={d.id} d={d} onClick={() => setPreview(d)}/>)}</div>}
    </>
  );
}

export default function InspoGallery({ showInspo, setShowInspo, setCfg, loadCanvasJSON, onOpen3D }) {
  const [archived, setArchived] = useState([]);

  useEffect(() => {
    if (!showInspo) return;
    axios.get('/api/customer/designs')
      .then(res => setArchived(res.data.filter(d => d.is_archived && d.config)))
      .catch(() => setArchived([]));
  }, [showInspo]);

  const loadArchived = (design) => {
    const cfg = design.config;
    setCfg(p => ({ ...p, ...cfg }));
    if (Array.isArray(cfg.overlays) && cfg.overlays.length > 0) {
      setTimeout(() => loadCanvasJSON(cfg.overlays), 200);
    }
    setShowInspo(false);
  };

  const loadDesign = (d, filters) => {
    const t = openTarget(d, filters);
    if (!t) return;
    setCfg(p => applyGarment(p, t.garment, t));
    setShowInspo(false);
  };

  const loadDesign3D = (d, filters) => { loadDesign(d, filters); onOpen3D?.(); };

  const renameDesign = (id, newLabel) => {
    const prev = archived;
    setArchived(list => list.map(d => d.id === id ? { ...d, label: newLabel } : d));
    axios.put(`/api/customer/designs/${id}`, { design_name: newLabel }).catch(() => setArchived(prev));
  };

  const deleteDesign = (id) => {
    const prev = archived;
    setArchived(list => list.filter(d => d.id !== id));
    axios.delete(`/api/customer/designs/${id}`).catch(() => setArchived(prev));
  };

  const submitShowcase = (id) => {
    const prev = archived;
    setArchived(list => list.map(d => d.id === id ? { ...d, showcase_status:'submitted' } : d));
    axios.post(`/api/customer/designs/${id}/submit-showcase`).catch(() => setArchived(prev));
  };

  return (
    <AnimatePresence>
      {showInspo && (
        <motion.div
          initial={{ opacity:0, y:-10 }}
          animate={{ opacity:1, y:0, transition:{ duration:.2, ease:'easeOut' } }}
          exit={{   opacity:0, y:-10, transition:{ duration:.15 } }}
          style={{
            position:'absolute', top:60, left:'50%', x:'-50%',
            zIndex:100, width:'min(700px, calc(100vw - 32px))', maxHeight:'calc(100vh - 120px)',
            overflowY:'auto', background:'rgba(255,255,255,.98)', backdropFilter:'blur(16px)',
            border:'1px solid rgba(15,23,42,.08)', borderRadius:18,
            padding:20, boxShadow:'0 24px 60px rgba(15,23,42,.18)',
          }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:'#1a2332', margin:0,
                display:'flex', alignItems:'center', gap:6 }}>
                <NavIcon name="ai" size={14}/> Design Inspirations
              </p>
              <p style={{ fontSize:10, color:'rgba(15,23,42,.35)', margin:'2px 0 0' }}>
                Real VFRB uniform photos. Each one shows what it can do.
              </p>
            </div>
            <button onClick={() => setShowInspo(false)}
              style={{ width:28, height:28, borderRadius:8, border:'none',
                background:'rgba(15,23,42,.07)', color:'rgba(15,23,42,.5)',
                fontSize:14, cursor:'pointer' }}>✕</button>
          </div>

          {archived.length > 0 && (
            <>
              <p style={{ fontSize:10, fontWeight:800, color:'rgba(2,195,154,.9)', margin:'0 0 8px',
                textTransform:'uppercase', letterSpacing:.4 }}>Your Past Designs</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:18 }}>
                {archived.map(d => (
                  <Tile key={`d-${d.id}`} label={d.label} sub={d.garment} editable
                    onClick={() => loadArchived(d)}
                    onRename={(newLabel) => renameDesign(d.id, newLabel)}
                    onDelete={() => deleteDesign(d.id)}
                    onSubmitShowcase={() => submitShowcase(d.id)}
                    showcaseStatus={d.showcase_status}
                    thumb={d.photo_path
                      ? <img src={d.photo_path} alt={d.label} width="54" height="66"
                          style={{ objectFit:'contain', borderRadius:6 }}/>
                      : <MiniPreview garment={d.config.garment} colors={d.config.colors ?? {}}/>}/>
                ))}
              </div>
            </>
          )}

          <p style={{ fontSize:10, fontWeight:800, color:'rgba(15,23,42,.4)', margin:'0 0 8px',
            textTransform:'uppercase', letterSpacing:.4 }}>VFRB Photo Gallery</p>
          <DesignBrowser onOpen={loadDesign} onOpen3D={loadDesign3D}/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
