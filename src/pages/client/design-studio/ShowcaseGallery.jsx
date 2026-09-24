import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../../components/ui/icons';
import GarmentSilhouette from './GarmentSilhouette';

export default function ShowcaseGallery({ showShowcase, setShowShowcase, setCfg, loadCanvasJSON }) {
  const [designs, setDesigns] = useState([]);

  useEffect(() => {
    if (!showShowcase) return;
    axios.get('/api/customer/designs/showcase').then(res => setDesigns(res.data)).catch(() => setDesigns([]));
  }, [showShowcase]);

  const load = (d) => {
    const cfg = d.config ?? {};
    setCfg(p => ({ ...p, ...cfg }));
    if (Array.isArray(cfg.overlays) && cfg.overlays.length > 0) {
      setTimeout(() => loadCanvasJSON(cfg.overlays), 200);
    }
    setShowShowcase(false);
  };

  return (
    <AnimatePresence>
      {showShowcase && (
        <motion.div
          initial={{ opacity:0, y:-10 }}
          animate={{ opacity:1, y:0, transition:{ duration:.2, ease:'easeOut' } }}
          exit={{   opacity:0, y:-10, transition:{ duration:.15 } }}
          style={{
            position:'absolute', top:60, left:'50%', transform:'translateX(-50%)',
            zIndex:100, width:'min(700px, calc(100vw - 32px))', maxHeight:'calc(100vh - 120px)',
            overflowY:'auto', background:'rgba(255,255,255,.98)', backdropFilter:'blur(16px)',
            border:'1px solid rgba(15,23,42,.08)', borderRadius:18,
            padding:20, boxShadow:'0 24px 60px rgba(15,23,42,.18)',
          }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:'#1a2332', margin:0,
                display:'flex', alignItems:'center', gap:6 }}>
                <NavIcon name="ai" size={14}/> Showcase
              </p>
              <p style={{ fontSize:10, color:'rgba(15,23,42,.35)', margin:'2px 0 0' }}>
                Designs other clients chose to share, approved by VFRB
              </p>
            </div>
            <button onClick={() => setShowShowcase(false)}
              style={{ width:28, height:28, borderRadius:8, border:'none',
                background:'rgba(15,23,42,.07)', color:'rgba(15,23,42,.5)',
                fontSize:14, cursor:'pointer' }}>✕</button>
          </div>

          {designs.length === 0 ? (
            <p style={{ fontSize:11, color:'rgba(15,23,42,.35)', textAlign:'center', padding:'20px 0' }}>
              Nothing in the showcase yet.
            </p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
              {designs.map(d => (
                <button key={d.id} onClick={() => load(d)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                    padding:'14px 10px 10px', borderRadius:12, border:'1px solid rgba(15,23,42,.08)',
                    background:'rgba(15,23,42,.04)', cursor:'pointer',
                  }}>
                  {d.photo_path
                    ? <img src={d.photo_path} alt={d.label} width="54" height="66" style={{ objectFit:'contain', borderRadius:6 }}/>
                    : <GarmentSilhouette garment={d.config?.garment} sleeve={d.config?.sleeve} colors={d.config?.colors ?? {}}/>}
                  <p style={{ fontSize:10, fontWeight:700, color:'rgba(15,23,42,.7)', margin:0, textAlign:'center' }}>{d.label}</p>
                  <p style={{ fontSize:9, color:'rgba(15,23,42,.28)', margin:0 }}>{d.garment}</p>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
