// src/pages/client/design-studio/DrawPanel.jsx
// NEW (Sept 9 2026) — freeform PencilBrush drawing tool. Built extracted
// from the start (not carved out of DesignStudio.jsx later) to match the
// established pattern from LayersPanel/LogoPanel/PatternPanel — see
// dsShared.js's Aug 31 2026 note on why panels live here.
//
// This panel is presentational only: it reports size/color choices up to
// DesignStudio.jsx via onSizeChange/onColorChange. The actual Fabric.js
// brush wiring (isDrawingMode, freeDrawingBrush, path:created listener)
// lives in useGarmentCanvas() inside DesignStudio.jsx, same as every other
// tool's real canvas work (addLogo, addText, etc.) — this file never
// touches the canvas directly.
import { T2, secLabel } from './dsShared';

// Brush size presets — 3 thumb-friendly dots on mobile, not a slider
// (matches the Figma customer-portal reference's brush-size spec: preset
// dots rather than a fine-grained control that's fiddly to hit on touch).
const SIZES = [2, 5, 10];

// Brush colors — reuses the same institutional palette already established
// elsewhere in Design Studio (school navy/white, scrub ceil/green, corporate
// blue, jersey red), not a separate palette invented just for this tool.
const COLORS = [
  { hex:'#02C39A', label:'Accent teal'  },
  { hex:'#028090', label:'Brand teal'   },
  { hex:'#1B2A4A', label:'Navy blue'    },
  { hex:'#E63946', label:'Red'          },
  { hex:'#FFFFFF', label:'White'        },
  { hex:'#000000', label:'Black'        },
];

export default function DrawPanel({ size, color, onSizeChange, onColorChange }) {
  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:14,
      flex:1, overflowY:'auto' }}>

      <div style={{ padding:'10px 11px', borderRadius:10,
        background:'rgba(2,195,154,.08)', border:'1px solid rgba(2,195,154,.2)' }}>
        <p style={{ fontSize:11, color:'rgba(15,23,42,.55)', margin:0, lineHeight:1.4 }}>
          Draw directly on the garment. Strokes become their own layer —
          reorder, hide, or delete them from the Layers tab like any other
          element.
        </p>
      </div>

      {/* Brush size — preset dots, not a slider (thumb-friendly on mobile) */}
      <div>
        <p style={secLabel}>Brush Size</p>
        <div style={{ display:'flex', gap:10 }}>
          {SIZES.map(s => {
            const active = s === size;
            return (
              <button key={s} onClick={() => onSizeChange(s)}
                aria-label={`Brush size ${s}px`}
                style={{
                  width:40, height:40, borderRadius:'50%', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: active ? 'rgba(2,195,154,.15)' : 'rgba(15,23,42,.05)',
                  border: `1.5px solid ${active ? 'rgba(2,195,154,.5)' : 'rgba(15,23,42,.14)'}`,
                  transition:'background 140ms, border-color 140ms',
                }}>
                <div style={{
                  width: s * 1.6, height: s * 1.6, borderRadius:'50%',
                  background: active ? T2 : 'rgba(15,23,42,.5)',
                  transition:'background 140ms',
                }}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brush color */}
      <div>
        <p style={secLabel}>Brush Color</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {COLORS.map(c => {
            const active = c.hex.toLowerCase() === (color || '').toLowerCase();
            return (
              <button key={c.hex} onClick={() => onColorChange(c.hex)}
                aria-label={c.label} title={c.label}
                style={{
                  width:30, height:30, borderRadius:'50%', cursor:'pointer',
                  background:c.hex,
                  border: active ? `2.5px solid ${T2}` : '1.5px solid rgba(15,23,42,.18)',
                  boxShadow: active ? '0 0 0 3px rgba(2,195,154,.2)' : 'none',
                  transition:'box-shadow 140ms, border-color 140ms',
                }}/>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize:9, color:'rgba(15,23,42,.25)', margin:'2px 0 0', lineHeight:1.5 }}>
        Undo (top bar) removes the last stroke. Switching to another tab
        exits drawing mode automatically.
      </p>
    </div>
  );
}
