import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../../components/ui/icons';
import { BASE_PATHS } from './garmentPaths';
import { openTarget } from './designGallery';
import { applyGarment } from './garmentCatalog';
import { selectFamily } from './selectGarment';
import GarmentPicker from './GarmentPicker';

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
        color:      danger ? 'var(--danger-text)' : 'var(--cx-ink-2)',
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
        background:'var(--cx-paper)',
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
            style={{ fontSize:12, fontWeight:700, color:'var(--cx-ink)', textAlign:'center',
              width:'100%', border:'1px solid rgba(2,195,154,.4)', borderRadius:5, padding:'2px 4px' }}/>
        ) : (
          <p style={{ fontSize:12, fontWeight:700, color:'var(--cx-ink)', margin:0, textAlign:'center' }}>{label}</p>
        )}
        <div style={{ fontSize:11, color:'var(--cx-ink-2)' }}>{sub}</div>
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
          {showcaseStatus === 'submitted' && <span style={{ fontSize:11, color:'var(--cx-ink-2)', alignSelf:'center' }}>Pending review</span>}
          {showcaseStatus === 'approved'  && <span style={{ fontSize:11, color:'var(--cx-thread-ink)', fontWeight:700, alignSelf:'center' }}>In showcase</span>}
        </div>
      )}
    </motion.div>
  );
}

// The picker modal: past designs, then the one GarmentPicker, opened on Inspiration (Inspo button) or Templates (Change garment).
export default function InspoGallery({ showInspo, setShowInspo, setCfg, loadCanvasJSON, onOpen3D, tab = 'inspiration', cfg, pieceRole = null }) {
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
    setCfg(p => applyGarment(p, t.garment, { ...t, inspirationId: d.id }));
    setShowInspo(false);
  };

  const loadDesign3D = (d, filters) => { loadDesign(d, filters); onOpen3D?.(); };
  const loadFamily = (fam, category) => { selectFamily(setCfg, fam, category); setShowInspo(false); };

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
          className="ds-modal" role="dialog" aria-label="Choose a garment" style={{ x:'-50%' }}>
          <button type="button" className="ds-pick-close" aria-label="Close" onClick={() => setShowInspo(false)}><NavIcon name="close" size={18}/></button>
          {archived.length > 0 && (
            <>
              <h3 className="ds-pick-sec">Your past designs</h3>
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

          <GarmentPicker key={tab} tab={tab} cfg={cfg} pieceRole={pieceRole} onPickPhoto={loadDesign} onPick3D={loadDesign3D} onPickFamily={loadFamily}/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
