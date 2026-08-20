// src/components/InlineColorPicker.jsx
// Task S — Custom inline HSL color picker
//
// Replaces the browser <input type="color"> in DesignStudio ColorsPanel.
// Zero external dependencies — pure React + inline CSS.
// Works offline. No CDN.
//
// Props:
//   value    — current hex color string e.g. "#1e3a5f"
//   onChange — (hexString) => void, called on every pointer move
//   onClose  — () => void, called when clicking outside or pressing Escape
//
// Usage in ColorsPanel:
//   <InlineColorPicker
//     value={cfg.colors[activeZone] ?? '#028090'}
//     onChange={hex => setColor(activeZone, hex)}
//     onClose={() => setPickerOpen(false)}
//   />

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Colour conversion helpers ─────────────────────────────────────────────────

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6;          break;
      case b: h = ((r-g)/d + 4)/6;          break;
    }
  }
  return { h: h*360, s: s*100, l: l*100 };
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r,g,b;
  if (s === 0) { r=g=b=l; } else {
    const hue2rgb = (p,q,t) => {
      if(t<0) t+=1; if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  const toHex = x => Math.round(x*255).toString(16).padStart(2,'0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Component ─────────────────────────────────────────────────────────────────

export default function InlineColorPicker({ value, onChange, onClose }) {
  const initial = (() => {
    try { return hexToHsl(value && value.length===7 ? value : '#028090'); }
    catch { return { h:193, s:97, l:28 }; }
  })();

  const [hsl, setHsl] = useState(initial);
  const [hexInput, setHexInput] = useState(value ?? '#028090');

  const svRef  = useRef(null);   // saturation/value square
  const hueRef = useRef(null);   // hue bar
  const wrapRef = useRef(null);  // outer wrapper for click-outside

  // Sync hex input when hsl changes
  useEffect(() => {
    const hex = hslToHex(hsl.h, hsl.s, hsl.l);
    setHexInput(hex);
    onChange(hex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsl]);

  // Click outside → close
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Escape → close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── SV square drag ──────────────────────────────────────────
  const handleSVDrag = useCallback((e) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const s  = clamp((cx - rect.left) / rect.width * 100,  0, 100);
    // In HSL, "value" maps to lightness differently — use saturation + lightness
    // We simulate HSV: from the square x=saturation, y=inverted lightness
    const rawL = clamp(1 - (cy - rect.top) / rect.height, 0, 1);
    // HSV → HSL conversion: L = rawL*(1 - s/200)
    const l = rawL * (1 - s / 200);
    setHsl(p => ({ ...p, s: clamp(s, 0, 100), l: clamp(l * 100, 0, 100) }));
  }, []);

  const startSVDrag = useCallback((e) => {
    e.preventDefault();
    handleSVDrag(e);
    const move = (ev) => handleSVDrag(ev);
    const up   = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
    document.addEventListener('touchmove', move, { passive:false });
    document.addEventListener('touchend',  up);
  }, [handleSVDrag]);

  // ── Hue bar drag ────────────────────────────────────────────
  const handleHueDrag = useCallback((e) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const h  = clamp((cx - rect.left) / rect.width * 360, 0, 360);
    setHsl(p => ({ ...p, h }));
  }, []);

  const startHueDrag = useCallback((e) => {
    e.preventDefault();
    handleHueDrag(e);
    const move = (ev) => handleHueDrag(ev);
    const up   = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
  }, [handleHueDrag]);

  // ── Hex input ───────────────────────────────────────────────
  const handleHexInput = (raw) => {
    setHexInput(raw);
    const clean = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      setHsl(hexToHsl(clean));
    }
  };

  // ── Derived values for rendering ────────────────────────────
  const pureHue     = hslToHex(hsl.h, 100, 50);
  const currentHex  = hslToHex(hsl.h, hsl.s, hsl.l);

  // SV thumb position — reverse HSV→HSL to get thumb coords
  // s is % x-axis, for y: rawL = L / (1 - s/200); thumbY = 1 - rawL
  const sv_s   = hsl.s;
  const rawL   = hsl.s > 0 ? hsl.l / (100 * (1 - hsl.s/200)) : hsl.l / 100;
  const sv_v   = clamp(rawL, 0, 1);
  const thumbX = `${sv_s}%`;
  const thumbY = `${(1 - sv_v) * 100}%`;

  // Hue thumb position
  const hueX   = `${hsl.h / 360 * 100}%`;

  return (
    <div ref={wrapRef} style={{
      position:'absolute', zIndex:200,
      left:0, top:'calc(100% + 6px)',
      background:'rgba(12,20,35,.97)',
      border:'1px solid rgba(255,255,255,.12)',
      borderRadius:14, padding:14, width:216,
      boxShadow:'0 12px 40px rgba(0,0,0,.6)',
      backdropFilter:'blur(8px)',
      userSelect:'none',
    }}>

      {/* ── Saturation / Value square ── */}
      <div ref={svRef}
        onMouseDown={startSVDrag}
        onTouchStart={startSVDrag}
        style={{
          width:'100%', height:140, borderRadius:9,
          position:'relative', cursor:'crosshair', marginBottom:10,
          background:`linear-gradient(to bottom, transparent, #000),
                      linear-gradient(to right,  #fff, ${pureHue})`,
        }}>
        {/* Thumb */}
        <div style={{
          position:'absolute',
          left:thumbX, top:thumbY,
          transform:'translate(-50%,-50%)',
          width:14, height:14, borderRadius:'50%',
          border:'2px solid #fff',
          boxShadow:'0 0 0 1px rgba(0,0,0,.5)',
          background:currentHex,
          pointerEvents:'none',
        }}/>
      </div>

      {/* ── Hue bar ── */}
      <div ref={hueRef}
        onMouseDown={startHueDrag}
        onTouchStart={startHueDrag}
        style={{
          width:'100%', height:12, borderRadius:6,
          position:'relative', cursor:'pointer', marginBottom:12,
          background:'linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
        }}>
        {/* Thumb */}
        <div style={{
          position:'absolute',
          left:hueX, top:'50%',
          transform:'translate(-50%,-50%)',
          width:16, height:16, borderRadius:'50%',
          border:'2px solid #fff',
          boxShadow:'0 0 0 1px rgba(0,0,0,.5)',
          background:pureHue,
          pointerEvents:'none',
        }}/>
      </div>

      {/* ── Hex input + preview swatch ── */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <div style={{
          width:32, height:32, borderRadius:7, flexShrink:0,
          background:currentHex,
          border:'1px solid rgba(255,255,255,.18)',
          boxShadow:'0 2px 6px rgba(0,0,0,.4)',
        }}/>
        <input
          value={hexInput}
          onChange={e => handleHexInput(e.target.value)}
          placeholder="#000000"
          spellCheck={false}
          style={{
            flex:1, padding:'6px 9px', borderRadius:8,
            border:'1px solid rgba(255,255,255,.12)',
            background:'rgba(255,255,255,.06)',
            color:'#fff', fontSize:12, fontFamily:'monospace',
            outline:'none', letterSpacing:'.04em',
          }}
        />
        <button
          onClick={onClose}
          style={{
            width:30, height:30, borderRadius:8, border:'none',
            background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)',
            fontSize:13, cursor:'pointer', flexShrink:0,
          }}>
          ✕
        </button>
      </div>

      {/* ── HSL readout ── */}
      <div style={{
        display:'flex', gap:6, marginTop:10,
        fontSize:9, color:'rgba(255,255,255,.3)',
        fontFamily:'monospace', letterSpacing:'.02em',
      }}>
        <span>H {Math.round(hsl.h)}°</span>
        <span>S {Math.round(hsl.s)}%</span>
        <span>L {Math.round(hsl.l)}%</span>
      </div>
    </div>
  );
}
