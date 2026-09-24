// src/pages/client/design-studio/ShapesPanel.jsx
// Fills the gap left by an earlier session: dsShared.js TOOLS, ToolDrawer.jsx's
// import/route, useGarmentCanvas.js's addShape()/updateSelected(), and
// LayersPanel.jsx's shape icons/labels were all already in place — only this
// panel file was missing, which broke ToolDrawer.jsx's static import (and
// therefore the whole DesignStudio.jsx bundle). Same pattern as DrawPanel.jsx:
// presentational only, all real canvas work stays in useGarmentCanvas.js.
import { T, T2, secLabel, SHAPES } from './dsShared';

const COLORS = [
  { hex:'#02C39A', label:'Accent teal'  },
  { hex:'#028090', label:'Brand teal'   },
  { hex:'#1B2A4A', label:'Navy blue'    },
  { hex:'#E63946', label:'Red'          },
  { hex:'#FFFFFF', label:'White'        },
  { hex:'#000000', label:'Black'        },
];

const star = Array.from({ length:10 }, (_, i) => {
  const r = i % 2 ? 4.5 : 10, a = -Math.PI / 2 + i * Math.PI / 5;
  return `${(12 + r * Math.cos(a)).toFixed(1)},${(12 + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

function ShapeGlyph({ kind }) {
  const p = { fill:T2, stroke:T2 };
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'rect' && <rect x="3" y="6" width="18" height="12" rx="2" {...p}/>}
      {kind === 'circle' && <circle cx="12" cy="12" r="9" {...p}/>}
      {kind === 'triangle' && <polygon points="12,3 22,20 2,20" {...p}/>}
      {kind === 'ellipse' && <ellipse cx="12" cy="12" rx="10" ry="6" {...p}/>}
      {kind === 'line' && <line x1="3" y1="20" x2="21" y2="4" stroke={T2} strokeWidth="3" strokeLinecap="round"/>}
      {kind === 'star' && <polygon points={star} {...p}/>}
    </svg>
  );
}

export default function ShapesPanel({ selObj, onAdd, onUpdate }) {
  const isShapeSelected = !!selObj?.__shape;
  const colorProp = selObj?.type === 'line' ? 'stroke' : 'fill';

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:14, flex:1, overflowY:'auto' }}>
      <div>
        <p style={secLabel}>Add Shape</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {SHAPES.map(sh => (
            <button key={sh.id} type="button" className="ds-shape-btn" onClick={() => onAdd(sh.kind)}>
              <ShapeGlyph kind={sh.kind}/>
              <span>{sh.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isShapeSelected ? (
        <>
          <div>
            <p style={secLabel}>Fill Color</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4 }}>
              {COLORS.map(c => (
                <button key={c.hex} type="button" onClick={() => onUpdate({ [colorProp]: c.hex })}
                  aria-label={c.label} title={c.label}
                  style={{
                    height:26, borderRadius:6, cursor:'pointer', background:c.hex,
                    border: (selObj[colorProp] || '').toLowerCase() === c.hex.toLowerCase()
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
