import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { BASE_PATHS } from './garmentPaths';
import { openTarget } from './designGallery';
import { selectFamily } from './selectGarment';
import GarmentPicker from './GarmentPicker';
import ShowcaseConsent from './ShowcaseConsent';

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

function Tile({ label, sub, thumb, onClick, editable, onRename, onDelete, showcase = null }) {
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
        </div>
      )}
      {editable && !renaming && showcase}
    </motion.div>
  );
}

// The picker modal: the one GarmentPicker (past designs under its header), opened on Inspiration (empty canvas) or Templates (Change garment).
export default function InspoGallery({ showInspo, setShowInspo, setCfg, loadCanvasJSON, onOpen3D, onPickPhoto, onPairFamily = null, tab = 'inspiration', cfg, pieceRole = null, onLoadArchived = null }) {
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
    onLoadArchived?.(design); // a past design belongs to its order: the Studio opens it read-only
    setShowInspo(false);
  };

  // The Studio's own "Use as template" (garment, fit, photo colour, set pieces), then close.
  const loadDesign = (d, filters) => { if (!openTarget(d, filters)) return; onPickPhoto(d, filters); setShowInspo(false); };

  const loadDesign3D = (d, filters) => { loadDesign(d, filters); onOpen3D?.(); };
  const loadFamily = (fam, category, pick) => { selectFamily(setCfg, fam, category, pick); setShowInspo(false); };
  const pairFamily = onPairFamily && ((fam, category, pick) => { onPairFamily(fam, category, pick); setShowInspo(false); });

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

  // ShowcaseConsent reports the status only after the server accepted the change.
  const setShowcase = (id, status) => setArchived(list => list.map(d => d.id === id ? { ...d, showcase_status: status, showcase_note: null } : d));

  return (
    <AnimatePresence>
      {showInspo && (
        <motion.div
          initial={{ opacity:0, y:-10 }}
          animate={{ opacity:1, y:0, transition:{ duration:.2, ease:'easeOut' } }}
          exit={{   opacity:0, y:-10, transition:{ duration:.15 } }}
          className="ds-modal" role="dialog" aria-labelledby="ds-pick-h" style={{ x:'-50%' }}>
          {/* The picker owns the sticky header (title, close) and action footer; past designs sit under its header. */}
          <GarmentPicker key={tab} tab={tab} cfg={cfg} pieceRole={pieceRole} onPickPhoto={loadDesign} onPick3D={loadDesign3D} onPickFamily={loadFamily} onPairFamily={pairFamily}
            onClose={() => setShowInspo(false)} extra={archived.length > 0 && (
              <div className="ds-pick-past">
                <h3 className="ds-pick-sec">Your past designs</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
                  {archived.map(d => (
                    <Tile key={`d-${d.id}`} label={d.label} sub={d.garment} editable
                      onClick={() => loadArchived(d)}
                      onRename={(newLabel) => renameDesign(d.id, newLabel)}
                      onDelete={() => deleteDesign(d.id)}
                      showcase={<ShowcaseConsent id={d.id} status={d.showcase_status ?? 'none'} note={d.showcase_note} onStatus={setShowcase}/>}
                      thumb={d.photo_path
                        ? <img src={d.photo_path} alt={d.label} width="54" height="66"
                            style={{ objectFit:'contain', borderRadius:6 }}/>
                        : <span className="ds-sketch-wrap"><MiniPreview garment={d.config.garment} colors={d.config.colors ?? {}}/><span className="ds-sketch">Sketch</span></span>}/>
                  ))}
                </div>
              </div>
            )}/>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
