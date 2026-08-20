// src/pages/customer/OrderWizard.jsx
// UI/UX POLISH — master prompt v10
//
// FIXES vs zip source:
//   1. CDN font ('DM Sans') removed everywhere — system font stack
//   2. studio.colors.accent → studio.colors.collar (correct key)
//   3. StepReview: shows GarmentPreview3D + previewPng instead of emoji swatch
//   4. StepSizing: − / + stepper buttons on all size inputs (no raw number field)
//   5. Step indicator: Framer Motion animated progress bar + done checkmarks
//   6. whileTap scale(.97) on ALL buttons including Back/Cancel
//   7. Step transitions: AnimatePresence x-axis slide (not just y fade)
//   8. StepConfig: client type selector cards have whileHover lift
//   9. Submit success: navigates with justCreated:true (triggers confetti on Dashboard)

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate }                                   from 'react-router-dom';
import { motion, AnimatePresence }                       from 'framer-motion';
import axios                                             from 'axios';

const GarmentPreview3D = lazy(() => import('../../components/GarmentPreview3D'));

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// ── Shared style helpers ──────────────────────────────────────────────────────
const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10, background:'#fff',
  border:'1px solid #e2e8f0', color:'#0f172a', fontSize:13, outline:'none',
  fontFamily:FONT, transition:'border .15s,box-shadow .15s', boxSizing:'border-box',
};
const fi = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl = {
  display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT,
};
const errMsg = (msg) => msg
  ? <p style={{ color:'#ef4444', fontSize:11, marginTop:5, fontFamily:FONT }}>⚠ {msg}</p>
  : null;

// FIX (garment vocabulary mismatch): removed GARMENT_MAP — it only ever
// mapped literal keys 'Top'/'Bottom', which never occur as a real
// cfg.garmentType value from Design Studio (those are always specific names
// like 'School Polo', 'Track Pants', etc.), so it was dead code that masked
// the real bug: several of those specific names had no GARMENT_SPECS entry
// at all. Fixed by adding them directly to GARMENT_SPECS above instead.
const COLLAR_MAP  = { 'V-Neck':'V-Neck', 'Polo Collar':'Polo Collar', 'Round Neck':'Round Neck', 'Mandarin':'Mandarin Collar' };

// BUG FIX (found alongside the collar issue, same symptom — dropdown
// renders empty despite "pre-filled" banner): the OLD map here was keyed
// on 'Short Sleeve' / 'Long Sleeve' / '3/4 Sleeve' / 'Sleeveless' — but
// DesignStudio.jsx's actual sleeve selector (SLEEVE_OPTS, DesignStudio.jsx
// ~line 207) stores the RAW pill labels: 'Short', '3/4', 'Long',
// 'Sleeveless', 'Raglan'. Those keys never existed in DS's data at all, so
// SLEEVE_MAP[cfg.sleeveType] was always undefined, and the code fell
// through to writing the raw value ("Long") straight into form.sleeve_type.
// That raw value doesn't match any <option value="..."> in the SLEEVES
// list below ('Short Sleeve','Long Sleeve','3/4 Sleeve','Sleeveless',
// 'Others'), so the <select> silently rendered blank — exactly what the
// screenshot shows (Mandarin Collar garment, sleeve genuinely "Long" in
// Design Studio, "Select sleeve..." shown anyway). Fixed by keying the map
// on DS's real values. 'Raglan' (Jersey-only) has no matching option, so
// it's mapped to a new 'Raglan Sleeve' entry added to SLEEVES below rather
// than silently dropped.
const SLEEVE_MAP  = { 'Sleeveless':'Sleeveless', 'Short':'Short Sleeve', '3/4':'3/4 Sleeve', 'Long':'Long Sleeve', 'Raglan':'Raglan Sleeve' };

// ROOT-CAUSE FIX (order 32 investigation): Design Studio has NO independent
// "collar style" selector — collar shape is baked into which garment
// template the customer picked (see DesignStudio.jsx BASE_PATHS: 'Round
// Neck' and 'Mandarin Collar' are each a distinct SVG template with their
// own `collar` path). That's why DesignStudio.jsx orderThis()/saveDesign()
// deliberately write `collarType: null` — confirmed real, not a bug — there
// is no separate value to send.
// The actual bug: OrderWizard still forces a SECOND, independent "Collar
// Type" pick for every top, and two of the Design Studio garment names —
// 'Round Neck' and 'Mandarin Collar' — happen to be *identical strings* to
// real entries in the COLLARS dropdown below. With collarType always null,
// the dropdown rendered empty, so on order 32 the customer manually chose
// "Round Neck" (the option that matched what they'd just designed) — which
// is how orders.collar_type ended up equal to orders.garment_type. No code
// path ever copied garment_type into collar_type; this set makes that
// redundant pick unnecessary for the two garments where the name IS the
// collar style, so the dropdown pre-fills a real, visible, editable value
// instead of forcing a guess.
const COLLAR_STYLE_GARMENTS = new Set(['Round Neck', 'Mandarin Collar']);

const HEX_TO_NAME = {
  '#028090':'Teal','#1e3a5f':'Navy Blue','#7f1d1d':'Dark Red','#14532d':'Dark Green',
  '#f0f0f0':'White','#1a1a1a':'Black','#6b7280':'Gray','#dc2626':'Red',
  '#2563eb':'Blue','#7c3aed':'Purple','#db2777':'Pink','#d97706':'Orange',
  '#1B2A4A':'Navy Blue','#2952A3':'Royal Blue','#006A4E':'Bottle Green',
  '#800000':'Maroon','#808080':'Gray','#FFFFFF':'White','#000000':'Black',
  '#87CEEB':'Sky Blue','#AED6F1':'Light Blue',
};
const hexToName = h => HEX_TO_NAME[h?.toUpperCase?.()] ?? HEX_TO_NAME[h] ?? (h ? h.toUpperCase() : '');

// ── DSA: Hash map — O(1) lookup of which fields each garment needs ──────────
// Bottoms (Pants/Shorts/Skirts) have NO collar or sleeve — fixing the UX bug
// FIX: this used to be defined *inside* StepDesign, so validate() in the main
// component (a different function scope) couldn't see it at all —
// "ReferenceError: GARMENT_SPECS is not defined". Module scope fixes that,
// and as a side benefit this object no longer gets recreated on every
// StepDesign render.
const GARMENT_SPECS = {
  // garment_type: { needsCollar, needsSleeve, needsPocket, needsWaist, category }
  'T-Shirt':                   { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Polo Shirt':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'School Uniform Top':        { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'School Uniform Bottom':     { needsCollar:false, needsSleeve:false, needsPocket:false, needsWaist:true,  cat:'bottom' },
  'PE Uniform Top':            { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'PE Uniform Bottom':         { needsCollar:false, needsSleeve:false, needsPocket:false, needsWaist:true,  cat:'bottom' },
  'Blouse':                    { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Polo Barong':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Medical Scrubs Top':        { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Medical Scrubs Bottom':     { needsCollar:false, needsSleeve:false, needsPocket:false, needsWaist:true,  cat:'bottom' },
  'Shorts':                    { needsCollar:false, needsSleeve:false, needsPocket:true,  needsWaist:true,  cat:'bottom' },
  'Pants':                     { needsCollar:false, needsSleeve:false, needsPocket:true,  needsWaist:true,  cat:'bottom' },
  'Skirt':                     { needsCollar:false, needsSleeve:false, needsPocket:false, needsWaist:true,  cat:'bottom' },
  'Jacket':                    { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Vest':                      { needsCollar:true,  needsSleeve:false, needsPocket:true,  needsWaist:false, cat:'top' },
  'Others':                    { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  // FIX (garment vocabulary mismatch): these 9 are real Design Studio
  // garment names (DesignStudio.jsx CATS list) that had no entry here at
  // all — GARMENT_MAP below never actually mapped them (it only handles
  // literal 'Top'/'Bottom', which never occurs as a real value), so they
  // silently fell through to the default top-with-collar-and-sleeve specs,
  // which is wrong for a bottom garment like Track Pants. Flags below are
  // cross-checked against each garment's real BASE_PATHS in DesignStudio.jsx
  // (collar path present? pocket path present? sleeve paths present?).
  'Scrub Top':                 { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'V-Neck Shirt':               { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Lab Coat':                  { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'School Polo':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Round Neck':                 { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Mandarin Collar':            { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Button-Down':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Jersey':                     { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Track Pants':                { needsCollar:false, needsSleeve:false, needsPocket:true,  needsWaist:true,  cat:'bottom' },
};
const GARMENTS = Object.keys(GARMENT_SPECS);

// ── Studio banner ─────────────────────────────────────────────────────────────
function StudioBanner({ cfg, onClear }) {
  const bodyColor = cfg.colors?.body ?? T;
  const garmentName = cfg.garmentType ?? cfg.garment ?? '';
  // Same rule as the mount pre-fill below: only claim a collar value when
  // one genuinely exists (either sent by studio_config or implied by a
  // garment name that IS a collar style). Never fabricate one.
  const collarDisplay = COLLAR_STYLE_GARMENTS.has(garmentName)
    ? garmentName
    : (cfg.collarType ?? cfg.collar ?? null);
  // Same mapping SLEEVE_MAP uses for the dropdown, so the banner text
  // never shows a raw DS value ("Long") next to a dropdown that actually
  // needs "Long Sleeve" — keeps the summary line and the form in sync.
  const sleeveDisplay = SLEEVE_MAP[cfg.sleeveType ?? cfg.sleeve] ?? null;
  const allPrefilled = !!(garmentName && collarDisplay && sleeveDisplay);
  return (
    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
      style={{ padding:'14px 16px', borderRadius:14, marginBottom:20,
        background:'rgba(2,195,154,.07)', border:'1.5px solid rgba(2,195,154,.3)',
        display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>

      {/* Color preview or PNG thumbnail */}
      {cfg.previewPng ? (
        <div style={{ width:52, height:52, borderRadius:10, flexShrink:0,
          overflow:'hidden', border:'2px solid rgba(2,195,154,.3)' }}>
          <img src={cfg.previewPng} alt="design"
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        </div>
      ) : (
        <div style={{ width:52, height:52, borderRadius:10, flexShrink:0,
          background:bodyColor, border:'2px solid rgba(2,195,154,.3)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
          {(cfg.garmentType ?? cfg.garment ?? '').toLowerCase().includes('pant') ? '👖' : '👕'}
        </div>
      )}

      <div style={{ flex:1, minWidth:140 }}>
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100,
          background:'rgba(2,195,154,.15)', color:T, fontFamily:FONT }}>
          🎨 Designed in Studio
        </span>
        <p style={{ color:'#0f172a', fontSize:12, fontWeight:600, margin:'5px 0 1px', fontFamily:FONT }}>
          {garmentName} · {collarDisplay ?? 'Collar not set'} · {sleeveDisplay ?? 'Sleeve not set'}
        </p>
        <p style={{ color:'#64748b', fontSize:11, margin:0, fontFamily:FONT }}>
          {cfg.category} · {allPrefilled
            ? 'Fields pre-filled from your design'
            : 'Garment pre-filled — please check collar / sleeve below'}
        </p>
      </div>

      <div style={{ display:'flex', gap:7 }}>
        <motion.button whileTap={{ scale:.95 }}
          onClick={() => window.location.href='/customer/design-studio'}
          style={{ padding:'7px 12px', borderRadius:9, cursor:'pointer', fontSize:11,
            fontWeight:600, background:'rgba(2,195,154,.10)',
            border:'1px solid rgba(2,195,154,.3)', color:T,
            fontFamily:FONT, transition:'background .13s' }}>
          Edit in Studio
        </motion.button>
        <motion.button whileTap={{ scale:.95 }} onClick={onClear}
          style={{ padding:'7px 12px', borderRadius:9, cursor:'pointer', fontSize:11,
            fontWeight:500, background:'#f8fafc', border:'1px solid #e2e8f0',
            color:'#64748b', fontFamily:FONT }}>
          Clear
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Step 0: Design ────────────────────────────────────────────────────────────
function StepDesign({ form, set, errors, studio, onClearStudio }) {
  const fileRef  = useRef(null);

  // Task Y: show PNG hero from sessionStorage('studio_preview') when no StudioBanner
  const previewPng = (() => {
    try { return sessionStorage.getItem('studio_preview') || null; }
    catch { return null; }
  })();

  // GARMENT_SPECS and GARMENTS now module-level (see top of file) — was
  // duplicated here before, which is why validate() couldn't see it.
  const COLLARS  = ['Round Neck','V-Neck','Polo Collar','Mandarin Collar','Button Down','No Collar','Others'];
  const SLEEVES  = ['Short Sleeve','Long Sleeve','3/4 Sleeve','Sleeveless','Raglan Sleeve','Others'];
  const POCKETS  = ['Left Chest Pocket','No Pocket','Two Side Pockets','Chest + Side Pockets'];

  // Derive which fields to show based on selected garment — DSA: O(1) hash map lookup
  const gSpec = GARMENT_SPECS[form.garment_type] ?? { needsCollar:true, needsSleeve:true, needsPocket:true, needsWaist:false, cat:'top' };
  const isBottom = gSpec.cat === 'bottom';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {studio && <StudioBanner cfg={studio} onClear={onClearStudio}/>}

      {/* Task Y: garment PNG hero — shown when studio has a preview but no banner rendered yet */}
      {!studio && previewPng && (
        <motion.div
          initial={{ opacity: 0, scale: .97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            borderRadius: 14, overflow: 'hidden',
            border: `2px solid rgba(2,195,154,.3)`,
            background: 'linear-gradient(135deg,#060d1a,#0a1628)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px', position: 'relative',
          }}
        >
          <img
            src={previewPng}
            alt="Your design"
            style={{
              maxHeight: 200, maxWidth: '100%', objectFit: 'contain',
              borderRadius: 10, display: 'block',
              filter: 'drop-shadow(0 8px 24px rgba(2,195,154,.2))',
            }}
          />
          <div style={{
            position: 'absolute', top: 10, right: 10,
            padding: '3px 10px', borderRadius: 99,
            background: 'rgba(2,195,154,.18)',
            border: '1px solid rgba(2,195,154,.3)',
            color: T2, fontSize: 9, fontWeight: 700, fontFamily: FONT,
          }}>
            🎨 Your Design
          </div>
        </motion.div>
      )}

      {!studio && (
        <motion.div
          whileHover={{ y:-2, boxShadow:`0 8px 24px rgba(2,128,144,.12)` }}
          whileTap={{ scale:.98 }}
          onClick={() => window.location.href='/customer/design-studio'}
          style={{ padding:'18px 20px', borderRadius:14, cursor:'pointer',
            background:'linear-gradient(135deg,rgba(2,128,144,.06),rgba(2,195,154,.10))',
            border:'1.5px dashed rgba(2,195,154,.4)',
            display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:50, height:50, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg,${T},${T2})`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
            🎨
          </div>
          <div style={{ flex:1 }}>
            <p style={{ color:T, fontSize:14, fontWeight:800, marginBottom:4, fontFamily:FONT }}>
              Design Your Uniform First →
            </p>
            <p style={{ color:'#475569', fontSize:12, lineHeight:1.5, fontFamily:FONT }}>
              Use the interactive Design Studio to pick garment type, collar, sleeves,
              and colors. Choices carry over automatically.
            </p>
          </div>
          <span style={{ color:T, fontSize:22, flexShrink:0 }}>→</span>
        </motion.div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
        <span style={{ color:'#94a3b8', fontSize:11, whiteSpace:'nowrap', fontFamily:FONT }}>
          {studio ? 'or edit details below' : 'or fill manually'}
        </span>
        <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
      </div>

      <div style={{ padding:'12px 14px', borderRadius:12, background:'#f0fdfa',
        border:'1px solid #99f6e4' }}>
        <p style={{ color:'#0f172a', fontSize:12, fontWeight:600,
          marginBottom:3, fontFamily:FONT }}>📋 How it works</p>
        <p style={{ color:'#475569', fontSize:11, lineHeight:1.6, fontFamily:FONT }}>
          VFRB Enterprise manufactures custom garments based on your specifications.
          Describe your design and our AI will recommend the raw materials needed for your order.
        </p>
      </div>

      <div>
        <label style={lbl}>Garment Type <span style={{ color:'#ef4444' }}>*</span></label>
        <select value={form.garment_type||''} onChange={e=>{
          const g = e.target.value;
          const spec = GARMENT_SPECS[g] ?? { needsCollar:true, needsSleeve:true };
          // FIX: this used to call setForm(...)/setErrs(...) directly, but
          // this component only ever receives `set` as a prop — setForm and
          // setErrs are the *parent's* internal state setters, never passed
          // down. That's what threw "ReferenceError: setForm is not
          // defined" the instant anyone touched this dropdown. `set(k,v)`
          // (defined in the parent, line ~1212) already updates both the
          // form field and clears that field's error in one call — calling
          // it up to 3 times here is safe, React 18 batches these.
          set('garment_type', g);
          if (!spec.needsCollar) set('collar_type', '');
          if (!spec.needsSleeve) set('sleeve_type', '');
        }}
          style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
          <option value="">Select garment type…</option>
          {GARMENTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {errMsg(errors.garment_type)}
      </div>

      {/* ── Conditional fields based on garment type — DSA: O(1) hash map lookup ── */}

      {/* Bottom garments (Pants/Shorts/Skirts): show waist info, NOT collar/sleeve */}
      {isBottom && (
        <div style={{ padding:'12px 14px', borderRadius:10,
          background:'#f0fdfa', border:'1px solid #99f6e4' }}>
          <p style={{ fontSize:12, fontWeight:700, color:T, margin:'0 0 4px', fontFamily:FONT }}>
            📏 Bottom Garment Selected
          </p>
          <p style={{ fontSize:11, color:'#475569', lineHeight:1.6, fontFamily:FONT }}>
            {form.garment_type} does not require collar or sleeve type.
            Our team will apply VFRB standard waist measurements.
            Use the Design Description below to specify elastic waist, drawstring, zipper, pocket details, etc.
          </p>
        </div>
      )}

      {/* Top garments: show collar + sleeve selectors */}
      {gSpec.needsCollar && gSpec.needsSleeve && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={lbl}>Collar Type <span style={{ color:'#ef4444' }}>*</span></label>
            <select value={form.collar_type||''} onChange={e=>set('collar_type',e.target.value)}
              style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
              <option value="">Select collar…</option>
              {COLLARS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errMsg(errors.collar_type)}
            {studio && !form.collar_type && (
              <p style={{ color:'#94a3b8', fontSize:10, margin:'3px 0 0', fontFamily:FONT }}>
                Not specified in your design — please choose one
              </p>
            )}
          </div>
          <div>
            <label style={lbl}>Sleeve Type <span style={{ color:'#ef4444' }}>*</span></label>
            <select value={form.sleeve_type||''} onChange={e=>set('sleeve_type',e.target.value)}
              style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
              <option value="">Select sleeve…</option>
              {SLEEVES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errMsg(errors.sleeve_type)}
            {studio && !form.sleeve_type && (
              <p style={{ color:'#94a3b8', fontSize:10, margin:'3px 0 0', fontFamily:FONT }}>
                Not specified in your design — please choose one
              </p>
            )}
          </div>
        </div>
      )}

      {/* Collar only (e.g. Vest) */}
      {gSpec.needsCollar && !gSpec.needsSleeve && (
        <div>
          <label style={lbl}>Collar Type <span style={{ color:'#ef4444' }}>*</span></label>
          <select value={form.collar_type||''} onChange={e=>set('collar_type',e.target.value)}
            style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
            <option value="">Select collar…</option>
            {COLLARS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errMsg(errors.collar_type)}
          {studio && !form.collar_type && (
            <p style={{ color:'#94a3b8', fontSize:10, margin:'3px 0 0', fontFamily:FONT }}>
              Not specified in your design — please choose one
            </p>
          )}
        </div>
      )}

      <div>
        <label style={lbl}>Design Description <span style={{ color:'#ef4444' }}>*</span></label>
        <textarea value={form.client_design_notes||''} rows={4}
          onChange={e=>set('client_design_notes',e.target.value)}
          onFocus={fi} onBlur={fo}
          placeholder="Describe your design: colors, patterns, logos, placement, special requirements…"
          style={{ ...inp, resize:'vertical', minHeight:100 }}/>
        {errMsg(errors.client_design_notes)}
      </div>

      <div>
        <label style={lbl}>
          Reference Image / File{' '}
          <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
            (optional)
          </span>
        </label>
        <motion.div whileHover={{ borderColor:T }}
          style={{ border:`2px dashed ${form.design_ref_file?T:'#e2e8f0'}`,
            borderRadius:12, padding:'18px 16px', textAlign:'center',
            background:form.design_ref_file?'#f0fdfa':'#f8fafc', cursor:'pointer',
            transition:'all .15s' }}
          onClick={() => fileRef.current?.click()}>
          {form.design_ref_file
            ? (<><p style={{ color:T, fontSize:13, fontWeight:600, fontFamily:FONT }}>
                ✓ {form.design_ref_file.name}</p>
               <p style={{ color:'#64748b', fontSize:11, marginTop:4, fontFamily:FONT }}>
                Click to change</p></>)
            : (<><p style={{ fontSize:26, marginBottom:6 }}>📎</p>
               <p style={{ color:'#64748b', fontSize:13, fontFamily:FONT }}>
                Click to upload reference image or PDF</p>
               <p style={{ color:'#94a3b8', fontSize:11, marginTop:4, fontFamily:FONT }}>
                JPG, PNG, PDF — max 10MB</p></>)
          }
        </motion.div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:'none' }}
          onChange={e => set('design_ref_file', e.target.files[0]||null)}/>
      </div>
    </div>
  );
}

// ── Step 1: Configure ─────────────────────────────────────────────────────────
function StepConfig({ form, set, errors, studio }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Color from Design Studio */}
      {studio?.colors?.body && (
        <div style={{ padding:'10px 14px', borderRadius:11,
          background:'rgba(2,195,154,.05)', border:'1px solid rgba(2,195,154,.2)',
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:5 }}>
            {/* FIX: use .collar not .accent */}
            {['body','collar','sleeve'].map(zone => studio.colors[zone] && (
              <div key={zone} style={{ width:20, height:20, borderRadius:5,
                background:studio.colors[zone], border:'2px solid rgba(255,255,255,.6)',
                boxShadow:'0 1px 4px rgba(0,0,0,.12)', flexShrink:0 }}
                title={zone}/>
            ))}
          </div>
          <div>
            <p style={{ color:T, fontSize:11, fontWeight:700, margin:0, fontFamily:FONT }}>
              🎨 Colors from Design Studio
            </p>
            <p style={{ color:'#64748b', fontSize:11, margin:0, fontFamily:FONT }}>
              Body · Collar · Sleeve — edit below to override
            </p>
          </div>
        </div>
      )}

      {/* Client type */}
      <div>
        <label style={lbl}>Client Type <span style={{ color:'#ef4444' }}>*</span></label>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { v:'direct',      l:'Direct Client',      s:'80% downpayment at confirmation, 20% on delivery' },
            { v:'institutional',l:'Institutional / OTG', s:'Full payment on delivery (Wed close / Fri bank transfer)' },
          ].map(o => (
            <motion.button key={o.v} type="button"
              whileHover={{ y:-1, boxShadow:'0 4px 12px rgba(0,0,0,.07)' }}
              whileTap={{ scale:.98 }}
              onClick={() => set('order_type', o.v)}
              style={{ padding:'12px 14px', borderRadius:12, border:'none', cursor:'pointer',
                textAlign:'left', fontFamily:FONT,
                background: form.order_type===o.v ? '#f0fdfa' : '#fff',
                outline:`2px solid ${form.order_type===o.v ? T+'55' : '#e2e8f0'}`,
                transition:'all .15s' }}>
              <p style={{ fontSize:13, fontWeight:700, margin:0, fontFamily:FONT,
                color: form.order_type===o.v ? T : '#0f172a' }}>
                {form.order_type===o.v ? '● ' : '○ '}{o.l}
              </p>
              <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0 16px', fontFamily:FONT }}>
                {o.s}
              </p>
            </motion.button>
          ))}
        </div>
        {errMsg(errors.order_type)}
      </div>

      {/* Quantity */}
      <div>
        <label style={lbl}>Total Quantity (pieces) <span style={{ color:'#ef4444' }}>*</span></label>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <motion.button whileTap={{ scale:.9 }} type="button"
            onClick={() => set('quantity_ordered', Math.max(1, (form.quantity_ordered||0) - 10))}
            style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0',
              background:'#f8fafc', fontSize:18, cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#64748b', fontWeight:700 }}>
            −
          </motion.button>
          <input type="number" min={1} value={form.quantity_ordered||''}
            onChange={e => set('quantity_ordered', Math.max(1, Number(e.target.value)||1))}
            placeholder="e.g. 100" style={{ ...inp, textAlign:'center', fontWeight:700 }}
            onFocus={fi} onBlur={fo}/>
          <motion.button whileTap={{ scale:.9 }} type="button"
            onClick={() => set('quantity_ordered', (form.quantity_ordered||0) + 10)}
            style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0',
              background:'#f8fafc', fontSize:18, cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#64748b', fontWeight:700 }}>
            +
          </motion.button>
        </div>
        {errMsg(errors.quantity_ordered)}
      </div>

      {/* Color */}
      <div>
        <label style={lbl}>Primary Color <span style={{ color:'#ef4444' }}>*</span></label>
        <input type="text" value={form.color||''}
          onChange={e => set('color', e.target.value)}
          placeholder="e.g. White, Navy Blue, Maroon"
          style={inp} onFocus={fi} onBlur={fo}/>
        {errMsg(errors.color)}
      </div>

      {/* Delivery date */}
      <div>
        <label style={lbl}>Desired Delivery Date</label>
        <input type="date" value={form.deadline||''}
          min={new Date(Date.now()+7*864e5).toISOString().split('T')[0]}
          onChange={e => set('deadline', e.target.value)}
          style={inp} onFocus={fi} onBlur={fo}/>
      </div>

      {/* PO reference */}
      <div>
        <label style={lbl}>
          PO Reference{' '}
          <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
            (optional)
          </span>
        </label>
        <input type="text" value={form.po_reference||''}
          onChange={e => set('po_reference', e.target.value)}
          placeholder="Your purchase order number"
          style={inp} onFocus={fi} onBlur={fo}/>
      </div>

      {/* Notes */}
      <div>
        <label style={lbl}>
          Additional Notes{' '}
          <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
            (optional)
          </span>
        </label>
        <textarea value={form.special_notes||''} rows={3}
          onChange={e => set('special_notes', e.target.value)}
          placeholder="Any additional instructions for VFRB…"
          style={{ ...inp, resize:'vertical', minHeight:70 }}
          onFocus={fi} onBlur={fo}/>
      </div>
    </div>
  );
}

// ── Step 2: Sizing — stepper buttons ─────────────────────────────────────────
const STD = ['XS','S','M','L','XL','XXL','3XL'];

function SteP({ label, value, onChange }) {
  return (
    <motion.div whileHover={{ y:-1, boxShadow:'0 4px 12px rgba(0,0,0,.07)' }}
      style={{ background:'#fff', border:`1.5px solid ${value>0?T:'#e2e8f0'}`,
        borderRadius:12, padding:'12px 10px', textAlign:'center',
        transition:'border-color .15s' }}>
      <p style={{ fontSize:13, fontWeight:800, color: value>0?T:'#0f172a',
        marginBottom:8, fontFamily:FONT }}>
        {label}
      </p>
      <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center' }}>
        <motion.button whileTap={{ scale:.85 }} type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid #e2e8f0',
            background:'#f8fafc', fontSize:16, cursor:'pointer', lineHeight:1,
            color:'#64748b', fontWeight:700, display:'flex',
            alignItems:'center', justifyContent:'center' }}>
          −
        </motion.button>
        <span style={{ fontSize:18, fontWeight:800, color: value>0?T:'#94a3b8',
          width:30, textAlign:'center', fontFamily:FONT }}>
          {value}
        </span>
        <motion.button whileTap={{ scale:.85 }} type="button"
          onClick={() => onChange(value + 1)}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid #e2e8f0',
            background:'#f8fafc', fontSize:16, cursor:'pointer', lineHeight:1,
            color:'#64748b', fontWeight:700, display:'flex',
            alignItems:'center', justifyContent:'center' }}>
          +
        </motion.button>
      </div>
    </motion.div>
  );
}

function StepSize({ form, set, errors, onShowChart }) {
  const isCustom = form.sizing_type === 'custom';
  const total = STD.reduce((a, sz) => a + (form.sizes?.[sz] || 0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Size chart reference button — Task Y */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a',
          margin: 0, fontFamily: FONT }}>
          How many pieces per size?
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: .96 }}
          type="button"
          onClick={onShowChart}
          style={{
            padding: '6px 14px', borderRadius: 9, border: `1px solid ${T}30`,
            background: '#f0fdfa', color: T, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT, display: 'flex',
            alignItems: 'center', gap: 5,
          }}
        >
          📏 Size Chart
        </motion.button>
      </div>

      {/* Standard / Custom toggle */}
      <div>
        <label style={lbl}>Sizing Method</label>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { v:'standard', l:'Standard Sizes', ic:'📏' },
            { v:'custom',   l:'Custom Measurements', ic:'📐' },
          ].map(o => (
            <motion.button key={o.v} type="button"
              whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
              onClick={() => set('sizing_type', o.v)}
              style={{ flex:1, padding:'14px 12px', borderRadius:12, border:'none',
                cursor:'pointer', textAlign:'center', fontFamily:FONT,
                background: form.sizing_type===o.v ? '#f0fdfa' : '#fff',
                outline:`2px solid ${form.sizing_type===o.v ? T+'55' : '#e2e8f0'}`,
                transition:'all .15s' }}>
              <p style={{ fontSize:20, margin:'0 0 6px' }}>{o.ic}</p>
              <p style={{ fontSize:12, fontWeight:700, margin:0, fontFamily:FONT,
                color: form.sizing_type===o.v ? T : '#0f172a' }}>
                {o.l}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Standard: stepper grid */}
      {!isCustom && (
        <>
          <div>
            <label style={lbl}>
              Size Breakdown{' '}
              <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
                (pieces per size)
              </span>
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(88px,1fr))', gap:10 }}>
              {STD.map(sz => (
                <SteP key={sz} label={sz}
                  value={form.sizes?.[sz] || 0}
                  onChange={v => set('sizes', { ...form.sizes, [sz]:v })}/>
              ))}
            </div>
            {errMsg(errors.sizes)}
          </div>

          {/* Running total */}
          <AnimatePresence>
            {total > 0 && (
              <motion.div
                initial={{ opacity:0, y:-6, height:0 }}
                animate={{ opacity:1, y:0, height:'auto' }}
                exit={{ opacity:0, height:0 }}
                style={{ padding:'12px 16px', borderRadius:11,
                  background:'#f0fdfa', border:'1px solid #99f6e4',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#0f172a', fontFamily:FONT }}>
                  Total pieces across all sizes
                </span>
                <span style={{ fontSize:18, fontWeight:800, color:T, fontFamily:FONT }}>
                  {total} pcs
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Check vs quantity_ordered */}
          {total > 0 && form.quantity_ordered > 0 && total !== form.quantity_ordered && (
            <div style={{ padding:'10px 14px', borderRadius:10,
              background:'#fef3c7', border:'1px solid #fde68a' }}>
              <p style={{ fontSize:11, color:'#92400e', margin:0, fontFamily:FONT }}>
                ⚠️ Size total ({total} pcs) differs from quantity ordered ({form.quantity_ordered} pcs).
                This is OK — VFRB staff will confirm final breakdown.
              </p>
            </div>
          )}
        </>
      )}

      {/* Custom measurements */}
      {isCustom && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'12px 14px', borderRadius:10,
            background:'#fffbeb', border:'1px solid #fde68a' }}>
            <p style={{ color:'#92400e', fontSize:12, fontWeight:600,
              marginBottom:3, fontFamily:FONT }}>
              ⚠️ Custom Measurements
            </p>
            <p style={{ color:'#92400e', fontSize:11, marginTop:4,
              lineHeight:1.5, fontFamily:FONT }}>
              Custom measurements will be reviewed by VFRB production staff
              who will confirm the final sizing specifications.
            </p>
          </div>

          {[
            ['chest_cm',  'Chest (cm)',  '96'],
            ['waist_cm',  'Waist (cm)',  '76'],
            ['hip_cm',    'Hip (cm)',    '98'],
            ['length_cm', 'Length (cm)', '70'],
            ['sleeve_cm', 'Sleeve (cm)', '24'],
          ].map(([k, l, ph]) => (
            <div key={k}>
              <label style={lbl}>{l}</label>
              <input type="number" min={0} step={0.5} placeholder={`e.g. ${ph}`}
                value={form.measurements?.[k] || ''}
                onChange={e => set('measurements', { ...form.measurements, [k]:Number(e.target.value)||0 })}
                style={inp} onFocus={fi} onBlur={fo}/>
            </div>
          ))}

          <div>
            <label style={lbl}>Quantity (pieces) <span style={{ color:'#ef4444' }}>*</span></label>
            <input type="number" min={1} value={form.custom_qty||''}
              onChange={e => set('custom_qty', Number(e.target.value))}
              placeholder="Total pieces" style={inp} onFocus={fi} onBlur={fo}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Review ────────────────────────────────────────────────────────────
function StepReview({ form, studio }) {
  const tot = STD.reduce((a, sz) => a + (form.sizes?.[sz] || 0), 0);

  // NEW (Aug 10 2026): local preview URL for the uploaded reference file —
  // it hasn't been sent to the server yet at review time, so there's no
  // storage URL for it. URL.createObjectURL() gives a temporary local blob
  // URL good only for this browser tab; must be explicitly revoked or it
  // leaks memory for the life of the page.
  const [refFileBlobUrl, setRefFileBlobUrl] = useState(null);
  useEffect(() => {
    if (!form.design_ref_file) { setRefFileBlobUrl(null); return; }
    const url = URL.createObjectURL(form.design_ref_file);
    setRefFileBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.design_ref_file]);

  // Task Y: "Confirm Your Creation" hero moment
  const previewPng  = studio?.previewPng || (() => {
    try { return sessionStorage.getItem('studio_preview') || null; }
    catch { return null; }
  })();
  const bodyColor   = studio?.colors?.body ?? T;
  const garmentName = form.garment_type || studio?.garmentType || 'Custom Garment';

  const reviewSections = [
    {
      t:'Design Details',
      rows:[
        ['Garment',     form.garment_type || '—'],
        ['Collar',      form.collar_type  || '—'],
        ['Sleeve',      form.sleeve_type  || '—'],
        ['Description', (form.client_design_notes||'').slice(0,80) + ((form.client_design_notes||'').length>80?'…':'')],
        ['Reference',   form.design_ref_file?.name || 'None'],
      ],
    },
    {
      t:'Order Configuration',
      rows:[
        ['Client Type', form.order_type==='direct' ? 'Direct Client' : 'Institutional / OTG'],
        ['Quantity',    `${form.quantity_ordered || 0} pcs`],
        ['Color',       form.color || '—'],
        ['Deadline',    form.deadline || 'Not specified'],
        ['PO Ref',      form.po_reference || 'None'],
      ],
    },
    {
      t:'Sizing',
      rows: form.sizing_type==='custom' ? [
        ['Method', 'Custom'],
        ['Chest',  `${form.measurements?.chest_cm || '—'} cm`],
        ['Waist',  `${form.measurements?.waist_cm || '—'} cm`],
        ['Hip',    `${form.measurements?.hip_cm   || '—'} cm`],
        ['Length', `${form.measurements?.length_cm|| '—'} cm`],
      ] : [
        ['Method', 'Standard'],
        ...STD.filter(s => (form.sizes?.[s]||0) > 0).map(s => [s, `${form.sizes[s]} pcs`]),
        ['Total', `${tot} pcs`],
      ],
    },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Task Y: "Confirm Your Creation" hero reveal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: 'easeOut' }}
        style={{
          borderRadius: 16, overflow: 'hidden',
          background: `linear-gradient(135deg, ${bodyColor}22, rgba(2,195,154,.12))`,
          border: `2px solid ${bodyColor}40`,
          padding: '20px 20px 16px',
          display: 'flex', alignItems: 'center', gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: preview image or color swatch */}
        {previewPng ? (
          <div style={{
            flexShrink: 0, borderRadius: 12, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,.5)',
            background: '#060d1a', width: 80, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={previewPng} alt="design"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
          </div>
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: 12, flexShrink: 0,
            background: bodyColor,
            border: '2px solid rgba(255,255,255,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            {garmentName.toLowerCase().includes('pant') || garmentName.toLowerCase().includes('short') ? '👖' : '👕'}
          </div>
        )}

        {/* Right: summary text */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: T2,
            textTransform: 'uppercase', letterSpacing: '.08em',
            margin: '0 0 4px', fontFamily: FONT,
          }}>
            ✦ Confirm Your Creation
          </p>
          <p style={{
            fontSize: 17, fontWeight: 800, color: '#0f172a',
            margin: '0 0 6px', fontFamily: FONT, lineHeight: 1.2,
          }}>
            {garmentName}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              form.quantity_ordered && `${form.quantity_ordered} pcs`,
              form.color,
              form.sleeve_type,
              form.order_type === 'direct' ? '80% DP' : 'On Delivery',
            ].filter(Boolean).map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 9px',
                borderRadius: 99, background: 'rgba(255,255,255,.6)',
                color: '#475569', fontFamily: FONT,
                border: '1px solid rgba(0,0,0,.06)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 3D / PNG preview — FIX (Aug 10 2026): used to only render when
          `studio` existed, so an order placed by uploading a reference
          photo instead of using Design Studio showed nothing here at all.
          Now also renders using the uploaded file as a texture on the
          body mesh, with a synthetic minimal cfg (garment type only —
          real colors aren't known without Design Studio) so GarmentMesh
          still picks the correct shape (shirt/pants/shorts). */}
      {(studio || form.design_ref_file) && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
            overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
          <div style={{ padding:'11px 16px', background:'#f8fafc',
            borderBottom:'1px solid #e2e8f0' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#64748b',
              textTransform:'uppercase', letterSpacing:'.07em',
              margin:0, fontFamily:FONT }}>
              Design Preview
            </p>
          </div>
          <div style={{ padding:'16px' }}>
            <Suspense fallback={
              <div style={{ height:220, background:'#f8fafc', borderRadius:10,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <p style={{ color:'#94a3b8', fontSize:12, fontFamily:FONT }}>
                  Loading preview…
                </p>
              </div>
            }>
              <GarmentPreview3D
                cfg={studio ?? { garmentType: form.garment_type }}
                height={220} autoRotate={true} showLabel={true}
                referenceImageUrl={
                  !studio && form.design_ref_file?.type?.startsWith('image/') ? refFileBlobUrl : null
                }
              />
            </Suspense>
          </div>
        </motion.div>
      )}

      {/* Review tables */}
      {reviewSections.map((sec, si) => (
        <motion.div key={sec.t}
          initial={{ opacity:0, y:6 }}
          animate={{ opacity:1, y:0 }}
          transition={{ delay:si * 0.05 }}
          style={{ background:'#fff', borderRadius:12,
            border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'11px 16px', background:'#f8fafc',
            borderBottom:'1px solid #e2e8f0' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#64748b',
              textTransform:'uppercase', letterSpacing:'.07em',
              margin:0, fontFamily:FONT }}>
              {sec.t}
            </p>
          </div>
          {sec.rows.map(([l, v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between',
              padding:'9px 16px', borderBottom:'1px solid #f8fafc' }}>
              <span style={{ fontSize:12, color:'#64748b', fontFamily:FONT }}>{l}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#0f172a',
                maxWidth:'60%', textAlign:'right', wordBreak:'break-word',
                fontFamily:FONT }}>
                {v}
              </span>
            </div>
          ))}
        </motion.div>
      ))}

      {/* AI note */}
      <div style={{ padding:'14px 16px', borderRadius:12,
        background:'#f0fdfa', border:'1px solid #99f6e4' }}>
        <p style={{ color:'#0f172a', fontSize:12, fontWeight:700,
          marginBottom:6, fontFamily:FONT }}>
          🤖 AI Material Recommendation (Auto)
        </p>
        <p style={{ color:'#475569', fontSize:11, lineHeight:1.6, margin:0, fontFamily:FONT }}>
          After submitting, our AI will analyze your order and recommend the
          types of raw materials needed. You can review and accept the recommendation
          from the AI Materials page.
        </p>
      </div>
    </div>
  );
}

// ── Step progress indicator ───────────────────────────────────────────────────
const STEPS = ['Your Design', 'Configure', 'Sizing', 'Review'];

function StepBar({ step }) {
  return (
    <div style={{ display:'flex', marginBottom:28 }}>
      {STEPS.map((l, i) => {
        const done = i < step;
        const act  = i === step;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', position:'relative' }}>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{ position:'absolute', top:16, left:'50%', right:'-50%',
                height:3, zIndex:0,
                background: done ? `linear-gradient(90deg,${T2},${T2})` : '#e2e8f0',
                transition:'background .4s' }}/>
            )}

            {/* Circle */}
            <motion.div
              animate={{
                background: done ? T2 : act ? T : '#e2e8f0',
                scale:       act ? 1.12 : 1,
              }}
              transition={{ duration:.25 }}
              style={{ width:32, height:32, borderRadius:'50%', zIndex:1,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, fontWeight:800, color: done||act ? '#fff' : '#94a3b8',
                boxShadow: act ? `0 0 0 4px ${T}22` : 'none',
                marginBottom:8, position:'relative' }}>
              {done ? '✓' : i + 1}

              {/* Active pulse ring */}
              {act && (
                <motion.div
                  animate={{ scale:[1,1.6,1], opacity:[.4,0,.4] }}
                  transition={{ duration:2, repeat:Infinity }}
                  style={{ position:'absolute', inset:0, borderRadius:'50%',
                    border:`2px solid ${T}`, pointerEvents:'none' }}/>
              )}
            </motion.div>

            <p style={{ fontSize:9, fontWeight: act ? 800 : 500, margin:0,
              color: act ? T : done ? '#22c55e' : '#94a3b8',
              textAlign:'center', fontFamily:FONT, lineHeight:1.3 }}>
              {l}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Philippine Standard Garment Size Chart ────────────────────────────────────
// Source: common institutional uniform sizing used by PH school/hospital suppliers.
// Measurements in centimeters. Shown as a modal in StepSize.
const PH_SIZE_CHART = {
  tops: {
    label: 'Tops (Polo, Scrubs, Blouses)',
    headers: ['Size', 'Chest', 'Shoulder', 'Body Length', 'Sleeve'],
    rows: [
      ['XS',  '84–88',  '38',  '66', '19'],
      ['S',   '88–92',  '40',  '68', '20'],
      ['M',   '92–96',  '42',  '70', '21'],
      ['L',   '96–100', '44',  '72', '22'],
      ['XL',  '100–106','46',  '74', '23'],
      ['XXL', '106–112','48',  '76', '24'],
      ['3XL', '112–118','50',  '78', '25'],
    ],
    unit: 'cm',
  },
  bottoms: {
    label: 'Bottoms (Pants, Shorts, Skirts)',
    headers: ['Size', 'Waist', 'Hip', 'Length', 'Inseam'],
    rows: [
      ['XS',  '60–64',  '84–88',  '96', '70'],
      ['S',   '64–68',  '88–92',  '98', '72'],
      ['M',   '68–72',  '92–96',  '100','74'],
      ['L',   '72–76',  '96–102', '102','76'],
      ['XL',  '76–82',  '102–108','104','77'],
      ['XXL', '82–88',  '108–114','106','78'],
      ['3XL', '88–96',  '114–122','108','79'],
    ],
    unit: 'cm',
  },
};

function SizeChartModal({ onClose }) {
  const [chartTab, setChartTab] = useState('tops');
  const chart = PH_SIZE_CHART[chartTab];

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.52)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: .94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{   opacity: 0, scale: .96, y: 8 }}
        transition={{ duration: .22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560,
          maxHeight: '88vh', overflow: 'hidden', display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,.25)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8fafc', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a',
              margin: 0, fontFamily: FONT }}>📏 Philippine Standard Sizing</p>
            <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0',
              fontFamily: FONT }}>
              Common institutional uniform measurements · All values in cm
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: '#e2e8f0', color: '#64748b', fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Tops / Bottoms tabs */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 20px 0',
          borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          {[
            { k: 'tops',    l: '👕 Tops'    },
            { k: 'bottoms', l: '👖 Bottoms' },
          ].map(t => (
            <button key={t.k} onClick={() => setChartTab(t.k)}
              style={{
                padding: '7px 16px', borderRadius: '8px 8px 0 0',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: FONT, transition: 'all .13s',
                background: chartTab === t.k ? '#fff' : 'transparent',
                color:      chartTab === t.k ? T      : '#64748b',
                borderBottom: chartTab === t.k ? `2px solid ${T}` : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b',
            margin: '0 0 12px', fontFamily: FONT }}>
            {chart.label}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 12, fontFamily: FONT,
            }}>
              <thead>
                <tr style={{ background: T }}>
                  {chart.headers.map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left',
                      color: '#fff', fontWeight: 700, fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? '#f8fafc' : '#fff',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '9px 14px', color: ci === 0 ? T : '#0f172a',
                        fontWeight: ci === 0 ? 800 : 500,
                        whiteSpace: 'nowrap',
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{
            fontSize: 10, color: '#94a3b8', margin: '14px 0 0',
            lineHeight: 1.6, fontFamily: FONT,
          }}>
            ℹ️ These are guide measurements. Final garment dimensions are confirmed
            with VFRB production staff after order placement.
            Custom measurements can be provided in the sizing step.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Confetti burst (CSS keyframe particles, no external library) ──────────────
// 28 particles, random colors, random trajectories.
// Mounts on submit success, auto-unmounts after 2.8s.
const CONFETTI_COLORS = [T, T2, '#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#f97316'];

function ConfettiBurst() {
  const particles = Array.from({ length: 28 }, (_, i) => {
    const color  = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const x      = Math.random() * 100;   // vw start
    const xDrift = (Math.random() - 0.5) * 260;
    const rot    = Math.random() * 720;
    const delay  = Math.random() * 0.4;
    const dur    = 1.6 + Math.random() * 0.8;
    const size   = 6 + Math.random() * 8;
    const shape  = i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0';
    return { color, x, xDrift, rot, delay, dur, size, shape };
  });

  return (
    <>
      <style>{`
        @keyframes sk  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes cfetti {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) translateX(var(--cx)) rotate(var(--cr)); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: '-12px',
            left: `${p.x}%`,
            width:  p.size,
            height: p.size,
            borderRadius: p.shape,
            background: p.color,
            '--cx': `${p.xDrift}px`,
            '--cr': `${p.rot}deg`,
            animation: `cfetti ${p.dur}s ease-in ${p.delay}s forwards`,
            opacity: 0,
          }}/>
        ))}
      </div>
    </>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
const INIT = {
  garment_type:'', collar_type:'', sleeve_type:'', client_design_notes:'',
  design_ref_file:null, order_type:'direct', quantity_ordered:'', color:'',
  deadline:'', po_reference:'', special_notes:'', sizing_type:'standard',
  sizes:{}, measurements:{}, custom_qty:'',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderWizard() {
  const nav = useNavigate();

  const [step,   setStep]   = useState(0);
  const [form,   setForm]   = useState(INIT);
  const [errs,   setErrs]   = useState({});
  const [busy,   setBusy]   = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [studio, setStudio] = useState(null);
  const [dir,    setDir]    = useState(1); // 1=forward, -1=back (for slide direction)
  const [showSizeChart,  setShowSizeChart]  = useState(false);
  const [showConfetti,   setShowConfetti]   = useState(false);

  // Read studio_config from DesignStudio on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('studio_config');
      if (!raw) return;
      const cfg = JSON.parse(raw);
      setStudio(cfg);
      // cfg.collarType is always null from Design Studio (it has no
      // independent collar-style selector — see COLLAR_STYLE_GARMENTS
      // comment above). Only pre-fill collar_type when a real value
      // exists: either studio_config genuinely sent one (COLLAR_MAP /
      // cfg.collarType, kept for forward-compat if that ever changes),
      // or the garment name itself IS the collar style. Anything else
      // is left empty — NEVER defaulted to the garment name — so the
      // customer makes a real, conscious choice instead of the dropdown
      // silently landing on a copy of the garment type.
      const derivedCollar =
        COLLAR_MAP[cfg.collarType] ??
        (COLLAR_STYLE_GARMENTS.has(cfg.garmentType) ? cfg.garmentType : null);
      // Same discipline as collar: only ever write a value that has a real,
      // matching <option> in the SLEEVES dropdown. If SLEEVE_MAP has no
      // entry for whatever DS sent (e.g. a future new sleeve style), leave
      // it genuinely empty for the customer to pick — never write the raw
      // unmapped string, which is exactly what produced the blank-dropdown
      // bug (see SLEEVE_MAP comment above).
      const derivedSleeve = SLEEVE_MAP[cfg.sleeveType] ?? null;
      setForm(prev => ({
        ...prev,
        garment_type:        cfg.garmentType ?? prev.garment_type,
        collar_type:         derivedCollar ?? prev.collar_type,
        sleeve_type:         derivedSleeve  ?? prev.sleeve_type,
        color:               hexToName(cfg.colors?.body)  || prev.color,
        client_design_notes: prev.client_design_notes || [
          cfg.category    ? `${cfg.category} uniform.` : '',
          cfg.garmentType ? `${cfg.garmentType} style.` : '',
          derivedCollar   ? `${derivedCollar} collar.` : '',
          derivedSleeve   ? `${derivedSleeve}.` : '',
          cfg.colors?.body ? `Primary color: ${hexToName(cfg.colors.body)}.` : '',
        ].filter(Boolean).join(' '),
      }));
    } catch { /* silent */ }
  }, []);

  const clearStudio = () => {
    setStudio(null);
    ['studio_config','studio_color','studio_garment','studio_category']
      .forEach(k => sessionStorage.removeItem(k));
    setForm(prev => ({ ...prev, garment_type:'', collar_type:'',
      sleeve_type:'', client_design_notes:'', color:'' }));
  };

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrs(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (step===0) {
      if (!form.garment_type) {
        e.garment_type = 'Required';
      }
      // DSA: O(1) hash map lookup — only validate collar/sleeve for tops
      const spec = GARMENT_SPECS[form.garment_type] ?? { needsCollar:true, needsSleeve:true };
      if (spec.needsCollar && !form.collar_type) e.collar_type = 'Required';
      if (spec.needsSleeve && !form.sleeve_type) e.sleeve_type = 'Required';
      if (!form.client_design_notes?.trim()) e.client_design_notes = 'Please describe your design';
    }
    if (step===1) {
      if (!form.order_type)                  e.order_type          = 'Required';
      if (!form.quantity_ordered || form.quantity_ordered < 1)
                                             e.quantity_ordered    = 'Must be at least 1';
      if (!form.color?.trim())               e.color               = 'Required';
    }
    if (step===2 && form.sizing_type==='standard') {
      if (STD.reduce((a,sz)=>a+(form.sizes?.[sz]||0),0) < 1)
                                             e.sizes               = 'Enter at least 1 piece';
    }
    setErrs(e);
    return !Object.keys(e).length;
  };

  const goNext = () => {
    if (!validate()) return;
    setDir(1);
    setStep(s => s + 1);
    setErrs({});
  };
  const goBack = () => {
    setDir(-1);
    setStep(s => s - 1);
    setErrs({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true); setApiErr('');
    try {
      const fd = new FormData();
      ['garment_type','collar_type','sleeve_type','client_design_notes',
       'order_type','color'].forEach(k => fd.append(k, form[k]));
      if (form.quantity_ordered) fd.append('quantity_ordered', form.quantity_ordered);
      if (form.deadline)         fd.append('deadline',         form.deadline);
      if (form.po_reference)     fd.append('po_reference',     form.po_reference);
      if (form.special_notes)    fd.append('special_notes',    form.special_notes);
      // FIX (Aug 9 2026): backend validates/reads this as 'design_ref_file'
      // (see OrderController::customerStore — $request->hasFile('design_ref_file')),
      // then stores the resulting path into the client_design_ref_file DB
      // column. The old code sent the upload under 'client_design_ref_file'
      // (the DB column name) instead of the request field name the backend
      // actually checks — so hasFile() always returned false and the file
      // was silently discarded every time, with no error shown anywhere
      // (the field is nullable, so validation passed trivially). The "✓
      // shorts.jpeg" confirmation in the UI was real on the client side,
      // it just never made it to the server.
      if (form.design_ref_file)  fd.append('design_ref_file', form.design_ref_file);
      if (studio) {
        fd.append('studio_config', JSON.stringify(studio));
        if (studio.colors?.body) fd.append('studio_color', studio.colors.body);
      }
      fd.append('sizing_type', form.sizing_type);
      // FIX (Aug 8 2026): backend does json_decode($request->input('sizes','{}'))
      // — it expects ONE field containing a JSON string, matching exactly
      // how studio_config is already sent two lines above. The old code
      // instead sent sizes[XS], sizes[S], sizes[M]... as separate bracket-
      // notation fields, which Laravel parses into an actual PHP array —
      // failing the 'sizes' => 'nullable|string' validation rule outright
      // (an array is not a string) before json_decode() was ever reached.
      // This was the real cause of the 422 on every standard-size order;
      // measurements had the identical bug for custom-sizing orders.
      if (form.sizing_type === 'standard') {
        const sizePayload = {};
        STD.forEach(sz => {
          if ((form.sizes?.[sz]||0) > 0) sizePayload[sz] = form.sizes[sz];
        });
        if (Object.keys(sizePayload).length) fd.append('sizes', JSON.stringify(sizePayload));
      } else {
        const measurementPayload = {};
        Object.entries(form.measurements||{}).forEach(([k,v]) => {
          if (v) measurementPayload[k] = v;
        });
        if (Object.keys(measurementPayload).length) fd.append('measurements', JSON.stringify(measurementPayload));
        if (form.custom_qty) fd.append('custom_qty', form.custom_qty);
      }

      const r = await axios.post('/api/customer/orders', fd,
        { headers:{ 'Content-Type':'multipart/form-data' } });

      ['studio_config','studio_color','studio_garment','studio_category']
        .forEach(k => sessionStorage.removeItem(k));

      // Confetti burst — fires immediately on success, then navigate after 1.4s
      setShowConfetti(true);
      setTimeout(() => {
        nav(`/customer/orders/${r.data.order?.order_id ?? r.data.order_id ?? ''}`,
          { state: { justCreated: true } });
      }, 1400);

    } catch(e) {
      // FIX (Aug 8 2026): backend's exception handler (bootstrap/app.php)
      // deliberately returns a generic top-level "message" for validation
      // failures (reasonable — avoids leaking implementation detail in a
      // toast), but always includes the real per-field detail in
      // response.data.errors. The old code only ever read .message, so
      // every validation failure showed the same unhelpful "Validation
      // failed." with no way to tell which field or why — exactly what
      // hid the sizes/measurements bug above until it was traced by hand.
      const fieldErrors = e.response?.data?.errors;
      const firstDetail = fieldErrors ? Object.values(fieldErrors)[0]?.[0] : null;
      setApiErr(
        firstDetail
          ?? e.response?.data?.message
          ?? e.response?.data?.error
          ?? 'Failed to submit. Try again.'
      );
    } finally { setBusy(false); }
  };

  const COMPS = [
    <StepDesign key="d" form={form} set={set} errors={errs} studio={studio} onClearStudio={clearStudio}/>,
    <StepConfig key="c" form={form} set={set} errors={errs} studio={studio}/>,
    <StepSize   key="s" form={form} set={set} errors={errs} onShowChart={() => setShowSizeChart(true)}/>,
    <StepReview key="r" form={form} studio={studio}/>,
  ];

  return (
    <>
      <style>{`
        @keyframes sk { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }

        /* ── Responsive ── */
        .wiz-size-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        @media (max-width:767px) {
          .wiz-size-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width:2560px) {
          .wiz-size-grid { grid-template-columns: repeat(8, 1fr); }
        }
      `}</style>

      {/* Confetti burst on submit success */}
      {showConfetti && <ConfettiBurst/>}

      {/* Size chart modal */}
      <AnimatePresence>
        {showSizeChart && (
          <SizeChartModal onClose={() => setShowSizeChart(false)}/>
        )}
      </AnimatePresence>

      <div style={{ width:'100%', fontFamily:FONT }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a',
            marginBottom:4, fontFamily:FONT }}>
            Place an Order
          </h1>
          <p style={{ color:'#64748b', fontSize:13, fontFamily:FONT }}>
            Step {step+1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Animated step bar */}
        <StepBar step={step}/>

        {/* Step content — x-axis slide */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step}
            custom={dir}
            initial={{ opacity:0, x: dir * 30 }}
            animate={{ opacity:1, x:0 }}
            exit={{ opacity:0, x: dir * -30 }}
            transition={{ duration:.22, ease:'easeOut' }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              padding:'24px 22px', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              {COMPS[step]}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* API error */}
        {apiErr && (
          <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
            style={{ marginTop:14, padding:'12px 16px', borderRadius:10,
              background:'#fef2f2', border:'1px solid #fecaca',
              color:'#ef4444', fontSize:13, fontFamily:FONT }}>
            ⚠ {apiErr}
          </motion.div>
        )}

        {/* Navigation buttons */}
        <div style={{ display:'flex', justifyContent:'space-between',
          marginTop:20, gap:12 }}>
          {step > 0 ? (
            <motion.button whileHover={{ x:-2 }} whileTap={{ scale:.96 }}
              onClick={goBack}
              style={{ padding:'12px 24px', borderRadius:11, border:'1px solid #e2e8f0',
                background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              ← Back
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale:.96 }}
              onClick={() => nav(-1)}
              style={{ padding:'12px 24px', borderRadius:11, border:'1px solid #e2e8f0',
                background:'#fff', color:'#64748b', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              Cancel
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: busy ? 1 : 1.02, y: busy ? 0 : -1,
              boxShadow: busy ? '0px 0px 0px rgba(2,128,144,0)' : `0 8px 24px rgba(2,128,144,.35)` }}
            whileTap={{ scale: busy ? 1 : .97 }}
            onClick={step === STEPS.length - 1 ? handleSubmit : goNext}
            disabled={busy}
            style={{ flex:1, maxWidth:280, padding:'12px 24px', borderRadius:11,
              border:'none', fontFamily:FONT,
              background: busy ? '#94a3b8' : `linear-gradient(135deg,${T},${T2})`,
              color:'#fff', fontSize:13, fontWeight:700,
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? '0px 0px 0px rgba(2,128,144,0)' : `0 4px 16px rgba(2,128,144,.3)`,
              transition:'all .2s' }}>
            {busy
              ? '⏳ Submitting…'
              : step === STEPS.length - 1
              ? '✓ Submit Order'
              : `Next: ${STEPS[step+1]} →`}
          </motion.button>
        </div>
      </div>
    </>
  );
}