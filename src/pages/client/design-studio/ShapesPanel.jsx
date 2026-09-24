// src/pages/client/design-studio/ShapesPanel.jsx
// Fills the gap left by an earlier session: dsShared.js TOOLS, ToolDrawer.jsx's
// import/route, useGarmentCanvas.js's addShape()/updateSelected(), and
// LayersPanel.jsx's shape icons/labels were all already in place — only this
// panel file was missing, which broke ToolDrawer.jsx's static import (and
// therefore the whole DesignStudio.jsx bundle). Same pattern as DrawPanel.jsx:
// presentational only, all real canvas work stays in useGarmentCanvas.js.
import { T, T2, secLabel } from './dsShared';

const COLORS = [
  { hex:'#02C39A', label:'Accent teal'  },
  { hex:'#028090', label:'Brand teal'   },
  { hex:'#1B2A4A', label:'Navy blue'    },
  { hex:'#E63946', label:'Red'          },
  { hex:'#FFFFFF', label:'White'        },
  { hex:'#000000', label:'Black'        },
];

export default function ShapesPanel({ selObj, onAdd, onUpdate }) {
  const isShapeSelected = !!selObj?.__shape;

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:14, flex:1, overflowY:'auto' }}>
      <div>
        <p style={secLabel}>Add Shape</p>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={() => onAdd('rect')}
            style={{
              flex:1, padding:'16px 8px', borderRadius:10, cursor:'pointer',
              border:'1px solid rgba(15,23,42,.1)', background:'rgba(15,23,42,.03)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            }}>
            <div style={{ width:28, height:20, background:T2, borderRadius:3 }}/>
            <span style={{ fontSize:11, fontWeight:600, color:'rgba(15,23,42,.6)' }}>Rectangle</span>
          </button>
          <button type="button" onClick={() => onAdd('circle')}
            style={{
              flex:1, padding:'16px 8px', borderRadius:10, cursor:'pointer',
              border:'1px solid rgba(15,23,42,.1)', background:'rgba(15,23,42,.03)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            }}>
            <div style={{ width:24, height:24, background:T2, borderRadius:'50%' }}/>
            <span style={{ fontSize:11, fontWeight:600, color:'rgba(15,23,42,.6)' }}>Circle</span>
          </button>
        </div>
      </div>

      {isShapeSelected ? (
        <>
          <div>
            <p style={secLabel}>Fill Color</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4 }}>
              {COLORS.map(c => (
                <button key={c.hex} type="button" onClick={() => onUpdate({ fill: c.hex })}
                  aria-label={c.label} title={c.label}
                  style={{
                    height:26, borderRadius:6, cursor:'pointer', background:c.hex,
                    border: (selObj.fill || '').toLowerCase() === c.hex.toLowerCase()
                      ? `2px solid ${T}` : '1px solid rgba(15,23,42,.12)',
                  }}/>
              ))}
            </div>
          </div>

          <div>
            <p style={secLabel}>Opacity: {Math.round((selObj.opacity ?? 1) * 100)}%</p>
            <input type="range" min="10" max="100" value={Math.round((selObj.opacity ?? 1) * 100)}
              onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })}
              style={{ width:'100%', accentColor:T2 }}/>
          </div>

          <div>
            <p style={secLabel}>Border</p>
            <div style={{ display:'flex', gap:6 }}>
              <button type="button" onClick={() => onUpdate({ strokeWidth: 0 })}
                style={{ flex:1, padding:'7px', borderRadius:8, cursor:'pointer', fontSize:10,
                  border:`1px solid ${(selObj.strokeWidth ?? 1) === 0 ? T2 : 'rgba(15,23,42,.12)'}`,
                  background: (selObj.strokeWidth ?? 1) === 0 ? 'rgba(2,195,154,.14)' : '#fff',
                  color:'rgba(15,23,42,.6)', fontWeight:600 }}>
                None
              </button>
              <button type="button" onClick={() => onUpdate({ strokeWidth: 1, stroke:'rgba(0,0,0,.25)' })}
                style={{ flex:1, padding:'7px', borderRadius:8, cursor:'pointer', fontSize:10,
                  border:`1px solid ${(selObj.strokeWidth ?? 0) === 1 ? T2 : 'rgba(15,23,42,.12)'}`,
                  background: (selObj.strokeWidth ?? 0) === 1 ? 'rgba(2,195,154,.14)' : '#fff',
                  color:'rgba(15,23,42,.6)', fontWeight:600 }}>
                Thin
              </button>
              <button type="button" onClick={() => onUpdate({ strokeWidth: 3, stroke:'rgba(0,0,0,.4)' })}
                style={{ flex:1, padding:'7px', borderRadius:8, cursor:'pointer', fontSize:10,
                  border:`1px solid ${selObj.strokeWidth === 3 ? T2 : 'rgba(15,23,42,.12)'}`,
                  background: selObj.strokeWidth === 3 ? 'rgba(2,195,154,.14)' : '#fff',
                  color:'rgba(15,23,42,.6)', fontWeight:600 }}>
                Thick
              </button>
            </div>
          </div>
        </>
      ) : (
        <p style={{ fontSize:11, color:'rgba(15,23,42,.35)', textAlign:'center', margin:'4px 0 0', lineHeight:1.5 }}>
          Select a shape on the canvas to edit its color, opacity, or border.
        </p>
      )}
    </div>
  );
}
