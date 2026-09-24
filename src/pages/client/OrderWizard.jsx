// src/pages/client/OrderWizard.jsx
// 4-step order wizard: Design → Configure → Sizing → Review.
// On submit, hands off to MaterialsReveal instead of navigating directly.
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate }                                   from 'react-router-dom';
import { motion, AnimatePresence }                       from 'framer-motion';
import axios                                             from 'axios';
import MaterialsReveal                                   from './MaterialsReveal'; // post-submit AI-materials reveal, see its own header for SCOPE-001
import { NavIcon }                                        from '../../components/ui/icons';
import { zonesFor }                                       from './design-studio/dsShared';

const GarmentPreview3D = lazy(() => import('../../components/GarmentPreview3D'));

const T    = 'var(--teal)';
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
  ? <p style={{ color:'#ef4444', fontSize:11, marginTop:5, fontFamily:FONT, display:'flex', alignItems:'center', gap:4 }}><NavIcon name="warning" size={11} color="#ef4444"/> {msg}</p>
  : null;

const COLLAR_MAP = { 'V-Neck':'V-Neck', 'Polo Collar':'Polo Collar', 'Round Neck':'Round Neck', 'Mandarin':'Mandarin Collar' };

// Keyed on Design Studio's raw sleeve pill values, not the SLEEVES dropdown labels.
const SLEEVE_MAP = { 'Sleeveless':'Sleeveless', 'Short':'Short Sleeve', '3/4':'3/4 Sleeve', 'Long':'Long Sleeve', 'Raglan':'Raglan Sleeve' };

// Design Studio has no separate collar-style picker — for these two garments the
// garment name itself IS the collar style, so collar_type pre-fills from it.
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

// Module-level so validate() (outside StepDesign) can also read it.
const GARMENT_SPECS = {
  // garment_type: { needsCollar, needsSleeve, needsPocket, needsWaist, category }
  // T-Shirt's scan has no collar node (see design-studio/dsShared.js zonesFor) — matches that, not independently re-derived.
  'T-Shirt':                   { needsCollar:false, needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
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
  // Flags cross-checked against each garment's BASE_PATHS in DesignStudio.jsx.
  'Scrub Top':                 { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'V-Neck Shirt':               { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Lab Coat':                  { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Lab Coverall':              { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:true,  cat:'top' },
  'School Polo':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Round Neck':                 { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Mandarin Collar':            { needsCollar:true,  needsSleeve:true,  needsPocket:false, needsWaist:false, cat:'top' },
  'Button-Down':                { needsCollar:true,  needsSleeve:true,  needsPocket:true,  needsWaist:false, cat:'top' },
  'Track Pants':                { needsCollar:false, needsSleeve:false, needsPocket:true,  needsWaist:true,  cat:'bottom' },
};
const GARMENTS = Object.keys(GARMENT_SPECS);

// The 14 garments the Design Studio actually models (dsShared.js CATS) get their
// collar/sleeve flags from zonesFor() instead of the hand-set values above — same
// bug class as the T-Shirt fix, now closed for good instead of one garment at a
// time. needsPocket is deliberately left hand-set: checked against garmentPaths.js
// and it diverges for Pants/Shorts (no pocket path in the Studio, but the table
// says needsPocket:true) — that's very likely a real manufacturing-order concept
// distinct from the Studio's colorable pocket zone, not a bug, so not collapsed
// here. needsWaist/cat aren't modeled by zonesFor() either and stay hand-set.
const STUDIO_GARMENTS = new Set([
  'T-Shirt','Polo Shirt','Shorts','Pants','Skirt','Scrub Top','V-Neck Shirt',
  'Lab Coat','Lab Coverall','School Polo','Round Neck','Mandarin Collar',
  'Button-Down','Track Pants',
]);
for (const name of STUDIO_GARMENTS) {
  const zones = zonesFor(name);
  GARMENT_SPECS[name].needsCollar = zones.includes('collar');
  GARMENT_SPECS[name].needsSleeve = zones.includes('sleeve');
}

// Same completeness check drives both the mount-time auto-skip and StepConfig's banner — one definition, not two.
function studioComplete(garmentType, collarType, sleeveType, notes) {
  const spec = GARMENT_SPECS[garmentType];
  if (!garmentType || !spec) return false;
  if (spec.needsCollar && !collarType) return false;
  if (spec.needsSleeve && !sleeveType) return false;
  return !!notes?.trim();
}

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
          <NavIcon name="garmentType" size={22} color="#fff"/>
        </div>
      )}

      <div style={{ flex:1, minWidth:140 }}>
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100,
          background:'rgba(2,195,154,.15)', color:T, fontFamily:FONT, display:'inline-flex', alignItems:'center', gap:4 }}>
          <NavIcon name="designStudio" size={11} color={T}/> {cfg.name || 'Designed in Studio'}
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
          onClick={() => window.location.href='/design-studio'}
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

  const previewPng = (() => {
    try { return sessionStorage.getItem('studio_preview') || null; }
    catch { return null; }
  })();

  const COLLARS  = ['Round Neck','V-Neck','Polo Collar','Mandarin Collar','Button Down','No Collar','Others'];
  const SLEEVES  = ['Short Sleeve','Long Sleeve','3/4 Sleeve','Sleeveless','Raglan Sleeve','Others'];
  const POCKETS  = ['Left Chest Pocket','No Pocket','Two Side Pockets','Chest + Side Pockets'];

  const gSpec = GARMENT_SPECS[form.garment_type] ?? { needsCollar:true, needsSleeve:true, needsPocket:true, needsWaist:false, cat:'top' };
  const isBottom = gSpec.cat === 'bottom';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {studio && <StudioBanner cfg={studio} onClear={onClearStudio}/>}

      {/* Garment PNG hero — shown when studio has a preview but no banner rendered yet */}
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
            <NavIcon name="designStudio" size={11} color={T2} style={{ verticalAlign:'-1px', marginRight:3 }}/>Your Design
          </div>
        </motion.div>
      )}

      {!studio && (
        <motion.div
          whileHover={{ y:-2, boxShadow:`0 8px 24px rgba(2,128,144,.12)` }}
          whileTap={{ scale:.98 }}
          onClick={() => window.location.href='/design-studio'}
          style={{ padding:'18px 20px', borderRadius:14, cursor:'pointer',
            background:'linear-gradient(135deg,rgba(2,128,144,.06),rgba(2,195,154,.10))',
            border:'1.5px dashed rgba(2,195,154,.4)',
            display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:50, height:50, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg,${T},${T2})`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
            <NavIcon name="designStudio" size={22} color="#fff"/>
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
          marginBottom:3, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="tip" size={13} color="#0f172a"/>How it works</p>
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
          set('garment_type', g);
          if (!spec.needsCollar) set('collar_type', '');
          if (!spec.needsSleeve) set('sleeve_type', '');
          if (!spec.needsPocket) set('pocket_type', '');
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
          <p style={{ fontSize:12, fontWeight:700, color:T, margin:'0 0 4px', fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
            <NavIcon name="pattern" size={13} color={T}/> Bottom Garment Selected
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
        <div className="wiz-2col" style={{ display:'grid', gap:12 }}>
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

      {/* Optional — matches pocket_type's nullable backend validation. */}
      {gSpec.needsPocket && (
        <div>
          <label style={lbl}>
            Pocket Type{' '}
            <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
              (optional)
            </span>
          </label>
          <select value={form.pocket_type||''} onChange={e=>set('pocket_type',e.target.value)}
            style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
            <option value="">Select pocket style…</option>
            {POCKETS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
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
            : (<><div style={{ display:'flex', justifyContent:'center', marginBottom:6 }}><NavIcon name="attachment" size={24} color="#94a3b8"/></div>
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
function StepConfig({ form, set, errors, studio, onEditDesign }) {
  const complete = studioComplete(form.garment_type, form.collar_type, form.sleeve_type, form.client_design_notes);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {studio && complete && (
        <div style={{ padding:'12px 14px', borderRadius:11,
          background:'rgba(2,195,154,.08)', border:'1px solid rgba(2,195,154,.25)',
          display:'flex', alignItems:'center', gap:10 }}>
          <NavIcon name="designStudio" size={16} color={T}/>
          <p style={{ flex:1, fontSize:12, color:'#0f172a', fontFamily:FONT, lineHeight:1.5 }}>
            <strong>Designed in Studio — {form.garment_type}{form.sleeve_type ? ` · ${form.sleeve_type}` : ''}.</strong>{' '}
            Your Studio configuration carried over — nothing to configure again here.
          </p>
          <button type="button" onClick={onEditDesign}
            style={{ flexShrink:0, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(2,128,144,.3)',
              background:'#fff', color:T, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
            Edit design
          </button>
        </div>
      )}

      {/* Color from Design Studio */}
      {studio?.colors?.body && (
        <div style={{ padding:'10px 14px', borderRadius:11,
          background:'rgba(2,195,154,.05)', border:'1px solid rgba(2,195,154,.2)',
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:5 }}>
            {['body','collar','sleeve'].map(zone => studio.colors[zone] && (
              <div key={zone} style={{ width:20, height:20, borderRadius:5,
                background:studio.colors[zone], border:'2px solid rgba(255,255,255,.6)',
                boxShadow:'0 1px 4px rgba(0,0,0,.12)', flexShrink:0 }}
                title={zone}/>
            ))}
          </div>
          <div>
            <p style={{ color:T, fontSize:11, fontWeight:700, margin:0, fontFamily:FONT, display:'flex', alignItems:'center', gap:4 }}>
              <NavIcon name="colorZone" size={11} color={T}/> Colors from Design Studio
            </p>
            <p style={{ color:'#64748b', fontSize:11, margin:0, fontFamily:FONT }}>
              Body · Collar · Sleeve — edit below to override
            </p>
          </div>
        </div>
      )}

      {/* Client type — OTG/institutional clients are staff-handled subcontract deals per
          VFRB's real payment terms (full payment on delivery, no self-service), not
          something a customer picks here. Self-service orders are always Direct Client
          (80% DP / 20% on delivery) — order_type stays 'direct', no longer a UI choice. */}
      <div style={{ padding:'12px 14px', borderRadius:11, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0, fontFamily:FONT }}>Direct Client order</p>
        <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0', fontFamily:FONT }}>
          80% downpayment at confirmation, 20% on delivery.
        </p>
      </div>

      {/* Quantity */}
      <div>
        <label style={lbl}>Total Quantity (pieces) <span style={{ color:'#ef4444' }}>*</span></label>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <motion.button whileTap={{ scale:.9 }} type="button"
            onClick={() => set('quantity_ordered', Math.max(100, (form.quantity_ordered||0) - 10))}
            style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0',
              background:'#f8fafc', fontSize:18, cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#64748b', fontWeight:700 }}>
            −
          </motion.button>
          <input type="number" min={100} value={form.quantity_ordered||''}
            onChange={e => set('quantity_ordered', Math.max(0, Number(e.target.value)||0))}
            placeholder="e.g. 100 (bulk orders only — 100 pcs minimum)" style={{ ...inp, textAlign:'center', fontWeight:700 }}
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

function SteP({ label, value, onChange, remaining }) {
  // remaining = how many more pieces can still be added across ALL sizes
  // before hitting quantity_ordered. undefined/null = no cap known yet
  // (e.g. quantity_ordered not entered), so don't block anything.
  const atCap = remaining != null && remaining <= 0;
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
        <motion.button whileTap={{ scale: atCap ? 1 : .85 }} type="button"
          disabled={atCap}
          onClick={() => onChange(value + 1)}
          title={atCap ? 'Total quantity reached — reduce another size first' : undefined}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid #e2e8f0',
            background: atCap ? '#f1f5f9' : '#f8fafc', fontSize:16,
            cursor: atCap ? 'not-allowed' : 'pointer', lineHeight:1,
            color: atCap ? '#cbd5e1' : '#64748b', fontWeight:700, display:'flex',
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
          <NavIcon name="pattern" size={13} color={T} style={{ verticalAlign:'-2px', marginRight:4 }}/>Size Chart
        </motion.button>
      </div>

      {/* Standard / Custom toggle */}
      <div>
        <label style={lbl}>Sizing Method</label>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { v:'standard', l:'Standard Sizes', ic:'checklist' },
            { v:'custom',   l:'Custom Measurements', ic:'edit' },
          ].map(o => (
            <motion.button key={o.v} type="button"
              whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
              onClick={() => set('sizing_type', o.v)}
              style={{ flex:1, padding:'14px 12px', borderRadius:12, border:'none',
                cursor:'pointer', textAlign:'center', fontFamily:FONT,
                background: form.sizing_type===o.v ? '#f0fdfa' : '#fff',
                outline:`2px solid ${form.sizing_type===o.v ? T+'55' : '#e2e8f0'}`,
                transition:'all .15s' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:6 }}><NavIcon name={o.ic} size={20} color={form.sizing_method===o.v ? T : '#94a3b8'}/></div>
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
            <div className="wiz-size-grid">
              {STD.map(sz => (
                <SteP key={sz} label={sz}
                  value={form.sizes?.[sz] || 0}
                  remaining={form.quantity_ordered > 0 ? form.quantity_ordered - total : null}
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
              background: total > form.quantity_ordered ? '#fef2f2' : '#fef3c7',
              border: `1px solid ${total > form.quantity_ordered ? '#fecaca' : '#fde68a'}` }}>
              <p style={{ fontSize:11, color: total > form.quantity_ordered ? '#991b1b' : '#92400e',
                margin:0, fontFamily:FONT, fontWeight:600, display:'flex', alignItems:'flex-start', gap:5 }}>
                <NavIcon name={total > form.quantity_ordered ? 'error' : 'warning'} size={13} color={total > form.quantity_ordered ? '#991b1b' : '#92400e'} style={{ flexShrink:0, marginTop:1 }}/>
                Size total ({total} pcs) must exactly match
                quantity ordered ({form.quantity_ordered} pcs) — {Math.abs(form.quantity_ordered - total)} pcs
                {total > form.quantity_ordered ? ' over' : ' short'}. This blocks submission until it matches.
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
              marginBottom:3, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
              <NavIcon name="warning" size={13} color="#92400e"/> Custom Measurements
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

  // Local blob URL for the uploaded reference file — not yet stored server-side at review time.
  const [refFileBlobUrl, setRefFileBlobUrl] = useState(null);
  useEffect(() => {
    if (!form.design_ref_file) { setRefFileBlobUrl(null); return; }
    const url = URL.createObjectURL(form.design_ref_file);
    setRefFileBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.design_ref_file]);

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
        ['Pocket',      form.pocket_type  || '—'],
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
            <NavIcon name="garmentType" size={30} color="#fff"/>
          </div>
        )}

        {/* Right: summary text */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: T2,
            textTransform: 'uppercase', letterSpacing: '.08em',
            margin: '0 0 4px', fontFamily: FONT, display:'flex', alignItems:'center', gap:5,
          }}>
            <NavIcon name="success" size={11} color={T2}/> Confirm Your Creation
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

      {/* Also renders for a reference-photo upload with no Design Studio config. */}
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
          marginBottom:6, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
          <NavIcon name="ai" size={13} color="#0f172a"/> AI Material Recommendation (Auto)
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
              margin: 0, fontFamily: FONT, display:'flex', alignItems:'center', gap:6 }}><NavIcon name="pattern" size={15} color="#0f172a"/>Philippine Standard Sizing</p>
            <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0',
              fontFamily: FONT }}>
              Common institutional uniform measurements · All values in cm
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: '#e2e8f0', color: '#64748b',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}><NavIcon name="close" size={14} color="#64748b"/></button>
        </div>

        {/* Tops / Bottoms tabs */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 20px 0',
          borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          {[
            { k: 'tops',    l: 'Tops',    ic:'garmentType' },
            { k: 'bottoms', l: 'Bottoms', ic:'pattern' },
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
              <NavIcon name={t.ic} size={12} color={chartTab === t.k ? T : '#64748b'} style={{ verticalAlign:'-2px', marginRight:5 }}/>{t.l}
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
  garment_type:'', collar_type:'', sleeve_type:'', pocket_type:'', client_design_notes:'',
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
  // Once set, short-circuits the wizard for the blocking MaterialsReveal screen.
  const [createdOrder,   setCreatedOrder]   = useState(null);

  // Read studio_config from DesignStudio on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('studio_config');
      if (!raw) return;
      const cfg = JSON.parse(raw);
      setStudio(cfg);
      // Only pre-fill from a real mapped value — never default to the garment name.
      const derivedCollar =
        COLLAR_MAP[cfg.collarType] ??
        (COLLAR_STYLE_GARMENTS.has(cfg.garmentType) ? cfg.garmentType : null);
      const derivedSleeve = SLEEVE_MAP[cfg.sleeveType] ?? null;
      const notes = [
          cfg.category    ? `${cfg.category} uniform.` : '',
          cfg.garmentType ? `${cfg.garmentType} style.` : '',
          derivedCollar   ? `${derivedCollar} collar.` : '',
          derivedSleeve   ? `${derivedSleeve}.` : '',
          cfg.colors?.body ? `Primary color: ${hexToName(cfg.colors.body)}.` : '',
        ].filter(Boolean).join(' ');
      setForm(prev => ({
        ...prev,
        garment_type:        cfg.garmentType ?? prev.garment_type,
        collar_type:         derivedCollar ?? prev.collar_type,
        sleeve_type:         derivedSleeve  ?? prev.sleeve_type,
        color:               hexToName(cfg.colors?.body)  || prev.color,
        client_design_notes: prev.client_design_notes || notes,
      }));
      // Studio already supplied everything this garment needs — skip the redundant Step 1 fields.
      if (studioComplete(cfg.garmentType, derivedCollar, derivedSleeve, notes)) setStep(1);
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
      const notes = form.client_design_notes?.trim() ?? '';
      if (!notes) e.client_design_notes = 'Please describe your design';
      else if (notes.length < 15) e.client_design_notes = 'Please give VFRB enough detail to work from (garment, color, key details) — a few words isn\'t enough to manufacture from';
    }
    if (step===1) {
      // order_type is fixed to 'direct' (INIT default) — no longer a customer choice, see StepConfig.
      if (!form.quantity_ordered || form.quantity_ordered < 100)
                                             e.quantity_ordered    = 'VFRB accepts bulk orders only — minimum 100 pieces';
      if (!form.color?.trim())               e.color               = 'Required';
    }
    if (step===2 && form.sizing_type==='standard') {
      const sizeTotal = STD.reduce((a,sz)=>a+(form.sizes?.[sz]||0),0);
      if (sizeTotal < 1) {
        e.sizes = 'Enter at least 1 piece';
      } else if (sizeTotal !== form.quantity_ordered) {
        e.sizes = `Size breakdown (${sizeTotal} pcs) must exactly match quantity ordered (${form.quantity_ordered} pcs)`;
      }
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
      ['garment_type','collar_type','sleeve_type','pocket_type','client_design_notes',
       'order_type','color'].forEach(k => fd.append(k, form[k]));
      if (form.quantity_ordered) fd.append('quantity_ordered', form.quantity_ordered);
      if (form.deadline)         fd.append('deadline',         form.deadline);
      if (form.po_reference)     fd.append('po_reference',     form.po_reference);
      if (form.special_notes)    fd.append('special_notes',    form.special_notes);
      // Backend reads this as 'design_ref_file' (OrderController::customerStore).
      if (form.design_ref_file)  fd.append('design_ref_file', form.design_ref_file);
      if (studio) {
        // previewPng is a base64 data URL; the backend stores it as a real
        // file and strips it from studio_config, so send it as a Blob rather
        // than letting a ~150-500KB string ride along inside the JSON column.
        const { previewPng, ...studioRest } = studio;
        fd.append('studio_config', JSON.stringify(studioRest));
        if (studio.colors?.body) fd.append('studio_color', studio.colors.body);
        if (previewPng?.startsWith('data:image/png')) {
          const blob = await (await fetch(previewPng)).blob();
          fd.append('design_preview_file', blob, `design-${Date.now()}.png`);
        }
      }
      fd.append('sizing_type', form.sizing_type);
      // Backend expects a single JSON-string field, not bracket-notation sizes[XS]=...
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

      // Confetti fires immediately; MaterialsReveal mounts once it finishes.
      setShowConfetti(true);
      const created = r.data.order ?? {
        order_id:         r.data.order_id,
        garment_type:     form.garment_type,
        quantity_ordered: form.quantity_ordered,
      };
      setTimeout(() => setCreatedOrder(created), 1400);

    } catch(e) {
      // response.data.message is a generic validation string; .errors has per-field detail.
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
    <StepConfig key="c" form={form} set={set} errors={errs} studio={studio}
      onEditDesign={() => { setDir(-1); setStep(0); }}/>,
    <StepSize   key="s" form={form} set={set} errors={errs} onShowChart={() => setShowSizeChart(true)}/>,
    <StepReview key="r" form={form} studio={studio}/>,
  ];

  return (
    <>
      {/* Blocking post-submit reveal — nothing below renders while createdOrder is set. */}
      {createdOrder && (
        <MaterialsReveal
          order={createdOrder}
          onDone={() => nav(`/orders/${createdOrder.order_id}`, { state: { justCreated: true } })}
        />
      )}
      {!createdOrder && (
      <>
      <style>{`
        @keyframes sk { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }

        .wiz-size-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .wiz-2col      { grid-template-columns:1fr; }
        .wiz-step-card { padding:18px 16px; }

        @media (min-width:480px) {
          .wiz-size-grid { grid-template-columns:repeat(3,1fr); }
          .wiz-2col      { grid-template-columns:1fr 1fr; }
        }
        @media (min-width:768px) {
          .wiz-size-grid { grid-template-columns:repeat(4,1fr); gap:8px; }
          .wiz-step-card { padding:24px 22px; }
        }
        @media (min-width:1024px) {
          .wiz-size-grid { grid-template-columns:repeat(7,1fr); }
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
            <div className="wiz-step-card" style={{ background:'#fff', borderRadius:14,
              border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              {COMPS[step]}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* API error */}
        {apiErr && (
          <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
            style={{ marginTop:14, padding:'12px 16px', borderRadius:10,
              background:'#fef2f2', border:'1px solid #fecaca',
              color:'#ef4444', fontSize:13, fontFamily:FONT, display:'flex', alignItems:'center', gap:6 }}>
            <NavIcon name="warning" size={14} color="#ef4444"/> {apiErr}
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
      )}
    </>
  );
}