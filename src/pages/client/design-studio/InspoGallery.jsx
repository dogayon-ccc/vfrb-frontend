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

function FilterRow({ label, options, value, counts, onChange }) {
  return (
    <div className="ds-gal-row" role="group" aria-label={label}>
      <span className="ds-gal-label">{label}</span>
      {options.map(o => (
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

function EntryThumb({ d }) {
  return d.thumb
    ? <img className="ds-gal-img" src={d.thumb} alt={d.name} loading="lazy"/>
    : <div className="ds-gal-img" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}><MiniPreview garment={d.family} colors={{}}/></div>;
}

function DesignBrowser({ onOpen, onOpen3D }) {
  const [filters, setFilters] = useState({});
  const [preview, setPreview] = useState(null);
  const counts = useMemo(() => facetCounts(filters), [filters]);
  const shown  = useMemo(() => filterDesigns(filters), [filters]);

  if (preview) {
    const t = TIER_LABEL[preview.tier];
    return (
      <div className="ds-gal-preview">
        {preview.thumb
          ? <img src={preview.thumb} alt={preview.name}/>
          : <MiniPreview garment={preview.family} colors={{}}/>}
        <p style={{ fontSize:12, fontWeight:800, color:'#1a2332', margin:0 }}>{preview.name}</p>
        <TierBadge tier={preview.tier}/>
        <p className="ds-note" style={{ textAlign:'center' }}>{t.note}</p>
        {preview.kind === 'photo' && preview.base && (
          <p className="ds-note" style={{ textAlign:'center' }}>The 2D shape is the closest VFRB template, not an exact copy of this photo.</p>
        )}
        {preview.sleeves3D?.length > 0 && preview.sleeves.length > 1 && (
          <p className="ds-note" style={{ textAlign:'center' }}>3D is available for {preview.sleeves3D.join(' / ').toLowerCase()} sleeves only.</p>
        )}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
          {preview.base && <button type="button" className="ds-chip" aria-pressed="true" onClick={() => onOpen(preview, filters)}>Edit in 2D</button>}
          {preview.has3D && <button type="button" className="ds-chip" onClick={() => onOpen3D(preview, filters)}>Edit with 3D preview</button>}
          <button type="button" className="ds-chip" onClick={() => setPreview(null)}>Back to designs</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ds-gal-filters">
        {FILTERS.map(([key, label, options]) => (
          <FilterRow key={key} label={label} options={options} value={filters[key]} counts={counts[key]}
            onChange={v => setFilters(f => ({ ...f, [key]: v }))}/>
        ))}
      </div>
      <p className="ds-note" style={{ margin:'0 0 8px' }}>
        {shown.length} of {ENTRIES.length} designs
        {Object.values(filters).some(Boolean) && (
          <> · <button type="button" onClick={() => setFilters({})}
            style={{ background:'none', border:'none', padding:0, color:T2, fontWeight:700, cursor:'pointer' }}>Clear filters</button></>
        )}
      </p>
      <div className="ds-gal-grid">
        {shown.map(d => (
          <Tile key={d.id} label={d.name} sub={<TierBadge tier={d.tier}/>}
            onClick={() => setPreview(d)} thumb={<EntryThumb d={d}/>}/>
        ))}
      </div>
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
                Real VFRB designs and editable garments. Each one shows what it supports.
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
            textTransform:'uppercase', letterSpacing:.4 }}>VFRB Designs</p>
          <DesignBrowser onOpen={loadDesign} onOpen3D={loadDesign3D}/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
