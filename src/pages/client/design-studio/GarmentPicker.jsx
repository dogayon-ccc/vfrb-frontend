// The one garment picker: Inspiration (real VFRB photos with their honest status) and Templates (the catalog).
// Used inline on the empty canvas and inside the picker modal ("Change garment"). Header and action footer stay in view while it scrolls.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, SlidersHorizontal, Eye, Square, CheckCircle2, Box, X, PencilRuler } from 'lucide-react';
import { BASE_PATHS, getGarmentPaths, customPaths } from './garmentPaths';
import GarmentThumb from './GarmentThumb';
import { CATALOG, pieceOf, applyGarment, resolveTarget, PIECE_FACETS, GENDER_FACETS, pieceFacet, genderFacets, counterpartsFor } from './garmentCatalog';
import { DERIVED_LABEL } from './derivedFamilies';
import { CATEGORIES, PIECES, SLEEVES, GENDERS, ENTRIES, TIER_LABEL, filterDesigns, facetCounts } from './designGallery';
import { hasWebGL } from './webglSupport';
import { ROLE_LABEL } from './uniformSet';
import { SwatchGrid } from './SwatchGrid';
import GarmentCarousel from './GarmentCarousel';
import { REF_SPLIT, PREVIEW_CAPTION, previewColors } from './referenceColour';
import { CUSTOM_TOP, CUSTOM_BOTTOM, CUSTOM_SKIRT, CUSTOM_BADGE, DEFAULT_CUSTOM, kindOf } from './customGarment';
import { CustomControls, CustomNote } from './BuildYourOwn';
import { peekStudioCategory, clearStudioCategory } from '../../../utils/studioIntent';
import { garmentLabel } from '../../../utils/designName';

const ReferenceModel3D = lazy(() => import('./ReferenceModel3D'));
const CAT_SHORT = { 'School Uniform': 'School', 'Medical / Scrubs': 'Medical', 'Hospitality / Service': 'Hospitality', 'Industrial / Work': 'Industrial' };

const PHOTO_BADGE = { reference: Eye, 'editable-2d': Square, '2d-3d-approx': Box, '2d-3d': CheckCircle2 };
const PHOTO_LABEL = Object.fromEntries(Object.entries(TIER_LABEL).map(([k, t]) => [k, t.label]));

function Badge({ icon: Icon, label }) {
  return <span className="ds-pick-badge" title={label}><Icon size={13} strokeWidth={2.2} aria-hidden="true"/><span className="sr-only">{label}</span></span>;
}

function Legend({ labels, icons, present }) {
  if (!present.length) return null;
  return (
    <p className="ds-pick-legend" aria-label="Badge key">
      {present.map(k => { const I = icons[k]; return <span key={k} className="ds-pick-key"><span className="ds-pick-key-ic"><I size={12} strokeWidth={2.2} aria-hidden="true"/></span>{labels[k]}</span>; })}
    </p>
  );
}

// Header (title, close, tabs + Upload, badge key) and footer (actions) stick to the picker's scroll box. Once the grid scrolls, the
// header collapses to one opaque row: the tabs and Upload (the picker sets data-compact).
function Head({ title, sub, onClose, view, setView, legend, onUpload }) {
  return (
    <header className="ds-pick-head">
      <div className="ds-pick-titlebar">
        <h2 id="ds-pick-h">{title}</h2>
        {onClose && <button type="button" className="ds-pick-close" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true"/></button>}
      </div>
      {sub}
      <div className="ds-pick-row">
        <div className="ds-pick-tabs" role="tablist" aria-label="Garment source">
          {[['inspiration', 'Start from a reference', 'Reference'], ['templates', 'Start from scratch', 'Scratch']].map(([id, label, short]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} aria-label={label} onClick={() => setView(id)}>
              <span className="ds-tab-long">{label}</span><span className="ds-tab-short" aria-hidden="true">{short}</span>
            </button>
          ))}
        </div>
        {onUpload && <UploadButton onUpload={onUpload}/>}
      </div>
      {legend}
    </header>
  );
}
const Foot = ({ children }) => (children ? <footer className="ds-pick-foot">{children}</footer> : null);

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
// "Upload my design" in the header: tap to choose a file, or drop one on it. The file waits until a garment is chosen.
function UploadButton({ onUpload }) {
  const [over, setOver] = useState(false);
  const take = f => { if (f) onUpload(f); };
  return (
    <label className="ds-pick-upbtn" data-over={over || undefined} title="PNG, JPG, WEBP or SVG, up to 5 MB"
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); take(e.dataTransfer.files?.[0]); }}>
      <Upload size={16} strokeWidth={2} aria-hidden="true"/>Upload<span className="ds-wide-only">my design</span>
      <input type="file" className="sr-only" accept={ACCEPT} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; take(f); }}/>
    </label>
  );
}

// A uniform set limits the picker to the active piece; shown as a removable chip with the count, never silently.
function RoleChip({ pieceRole, on, setOn, count, total }) {
  if (!pieceRole) return null;
  const lbl = `${ROLE_LABEL[pieceRole]}s for your set`;
  return on
    ? <button type="button" className="ds-chip ds-chip-x" aria-pressed="true" onClick={() => setOn(false)} aria-label={`Remove filter: ${lbl} (${count} of ${total})`}>{lbl} ({count} of {total})<X size={13} aria-hidden="true"/></button>
    : <button type="button" className="ds-chip" aria-pressed="false" onClick={() => setOn(true)}>Only {lbl.toLowerCase()}</button>;
}

const FILTERS = [['category', 'Category', CATEGORIES], ['piece', 'Piece', PIECES], ['gender', 'For', GENDERS],
  ['tier', 'Type', Object.entries(TIER_LABEL).map(([id, t]) => ({ id, label: t.label }))], ['sleeve', 'Sleeve', SLEEVES.map(id => ({ id, label: id }))]];
const TOTALS = facetCounts({});
const PIECE_LABEL = Object.fromEntries(PIECES.map(p => [p.id, p.label]));
const GENDER_LABEL = Object.fromEntries(GENDERS.map(g => [g.id, g.label]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const sleeveTxt = p => (p.sleeve ? `, ${p.sleeve.toLowerCase()} sleeve` : '');

// One sentence on what picking the photo does; status details go in the chips under it.
export function previewSentence(p, offRole = null) {
  if (offRole) return `Your set needs a ${offRole.toLowerCase()} here, so this photo is inspiration only.`;
  if (!p.editable2D) return 'Inspiration only: VFRB has no editable template for this design.';
  if (p.pieces?.bottom) return `Opens the ${p.garmentFamily} and the ${p.pieces.bottom} as one uniform set, in the photo's colours.`;
  if (p.pieces?.single && p.pieces.derived) return `Opens the ${p.garmentFamily} template traced from this photo's 3D model, in the photo's colour.`;
  if (p.exactBase) return `Opens this garment as an editable real-photo base (${p.garmentFamily}).`;
  return `Opens the closest ${p.garmentFamily} template${sleeveTxt(p)}; it is not an exact copy of the photo.`;
}
export function previewChips(p, offRole = null) {
  const three = !p.editable2D || offRole ? (p.ref3D ? '3D reference only' : 'No 3D') : p.has3D ? '3D (approx.), one body colour'
    : p.familyApprox3D ? `3D is the generic ${p.garmentFamily} model` : '2D only';
  return [offRole ? TIER_LABEL.reference.label : TIER_LABEL[p.tier].label, CAT_LABEL[p.category], PIECE_LABEL[p.piece], GENDER_LABEL[p.gender], p.sleeve && `${p.sleeve} sleeve`, three,
    p.pieces?.derived && !offRole && DERIVED_LABEL].filter(Boolean);
}
// Filters for "See editable garments like this": the photo's category and piece, relaxed only when nothing editable matches.
export function similarFilters(p, pool, canEdit) {
  const tries = [{ category: p.category, piece: p.piece }, { piece: p.piece }, { category: p.category }];
  return tries.find(f => filterDesigns(f, pool).some(canEdit)) ?? tries[0];
}

function Photos({ head, onClose, cfg, pieceRole, onPickPhoto, onPick3D, onPickFamily, extra }) {
  const [derivedFam, setDerivedFam] = useState(null);
  const [filters, setFilters] = useState({});
  const [kind, setKind] = useState('editable');
  const [preview, setPreview] = useState(null);
  const [view3D, setView3D] = useState('3d'); // phone: Photo | 3D switch, 3D first; desktop shows both
  // "Try colours" on the 3D reference: a preview held only here, never saved or sent with an order (VFRB produces from the 2D design).
  const [tryCol, setTryCol] = useState(false);
  const [refCol, setRefCol] = useState({ top: '#1B2A4A', bottom: '#1B2A4A' });
  const [refPart, setRefPart] = useState('top');
  const [ref3DFailed, setRef3DFailed] = useState(false);
  const [roleOn, setRoleOn] = useState(true);
  // In a uniform set only photos of the active piece can open; with the chip removed the rest stay visible as inspiration.
  const fitsRole = d => !pieceRole || (!!d.base && pieceOf(d.base[1]) === pieceRole);
  const canEdit = d => d.editable2D && fitsRole(d);
  const tierOf = d => (canEdit(d) ? d.tier : 'reference');
  const pool = useMemo(() => (pieceRole && roleOn ? ENTRIES.filter(d => !!d.base && pieceOf(d.base[1]) === pieceRole) : ENTRIES), [pieceRole, roleOn]);
  const counts = useMemo(() => facetCounts(filters, pool), [filters, pool]);
  const matched = useMemo(() => filterDesigns(filters, pool), [filters, pool]);
  const kindCount = { editable: matched.filter(canEdit).length, reference: matched.filter(d => !canEdit(d)).length, all: matched.length };
  const shown = kind === 'all' ? matched : matched.filter(d => (kind === 'editable' ? canEdit(d) : !canEdit(d)));
  const active = FILTERS.filter(([k]) => filters[k]).length;
  const legend = <Legend labels={PHOTO_LABEL} icons={PHOTO_BADGE} present={Object.keys(PHOTO_BADGE).filter(k => shown.some(d => tierOf(d) === k))}/>;
  const back = () => { setPreview(null); setView3D('3d'); setRef3DFailed(false); setTryCol(false); setRefPart('top'); };
  const famFitsRole = f => !pieceRole || pieceOf(f.id) === pieceRole;
  const derived = DERIVED_FAMS.filter(f => !(pieceRole && roleOn) || famFitsRole(f));
  if (derivedFam) return <>{head(null)}<FamilySteps fam={derivedFam} cfg={cfg} backLabel="Back to photos" onBack={() => setDerivedFam(null)} onOpen={pick => onPickFamily(derivedFam, homeOf(derivedFam.id, cfg.category), pick)}/></>;

  if (preview) {
    const offRole = preview.editable2D && !fitsRole(preview) ? ROLE_LABEL[pieceRole] : null;
    const primary = canEdit(preview)
      ? <button type="button" className="ds-btn ds-btn--primary" onClick={() => onPickPhoto(preview, filters)}>Use as template</button>
      : offRole ? <button type="button" className="ds-btn ds-btn--primary" onClick={() => { setRoleOn(true); setKind('editable'); back(); }}>Show {offRole.toLowerCase()}s for my set</button>
      : <button type="button" className="ds-btn ds-btn--primary" onClick={() => { setFilters(similarFilters(preview, pool, canEdit)); setKind('editable'); back(); }}>See editable garments like this</button>;
    return (
      <>
        {head(null)}
        <div className="ds-pick-preview">
          {preview.ref3D && hasWebGL() && !ref3DFailed ? (
            // Photo and its read-only 3D reference: side by side on desktop, a Photo | 3D switch on phones. One lazy Canvas.
            <div className="ds-pick-media" data-view={view3D}>
              <div className="ds-seg ds-seg--sm ds-pick-switch" role="radiogroup" aria-label="Show the photo or the 3D reference">
                {[['photo', 'Photo'], ['3d', '3D']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={view3D === v} onClick={() => setView3D(v)}>{l}</button>)}
              </div>
              <figure className="ds-pick-photo"><img src={preview.image} alt={preview.label}/></figure>
              <figure className="ds-pick-3d">
                <Suspense fallback={<div className="ds-ref3d-stage"><div className="ds-ref3d-skel" role="status"><span/>Loading 3D reference…</div></div>}>
                  <ReferenceModel3D url={preview.ref3D.file} onError={() => { setRef3DFailed(true); setView3D('photo'); }}
                    colors={tryCol ? previewColors(preview.ref3D.set ? refCol : { top: refCol.top }) : null} split={preview.ref3D.set ? REF_SPLIT[preview.id] ?? null : null}/>
                </Suspense>
                <figcaption className="ds-note">{tryCol ? PREVIEW_CAPTION : `3D reference${preview.ref3D.set ? ' of the full set' : ''}: neutral colour, not editable.${preview.ref3D.set ? ' The set is one fused model.' : ''} Drag to rotate.`}</figcaption>
                <div className="ds-ref-try">
                  <button type="button" className="ds-btn" aria-pressed={tryCol} onClick={() => setTryCol(v => !v)}>{tryCol ? 'Back to neutral' : 'Try colours'}</button>
                  {tryCol && (<>
                    {preview.ref3D.set && (
                      <div className="ds-zones" role="group" aria-label="Part to colour">
                        {[['top', 'Top'], ['bottom', 'Bottom']].map(([k, l]) => (
                          <button key={k} type="button" className="ds-zone" aria-pressed={refPart === k} onClick={() => setRefPart(k)}>
                            <span className="ds-zone-sw" style={{ background: refCol[k] }} aria-hidden="true"/>{l}
                          </button>
                        ))}
                        <span className="ds-ref-approx">approximate split</span>
                      </div>
                    )}
                    <SwatchGrid label={preview.ref3D.set ? (refPart === 'top' ? 'Top' : 'Bottom') : 'Garment'} current={preview.ref3D.set ? refCol[refPart] : refCol.top}
                      onPick={hex => setRefCol(c => ({ ...c, [preview.ref3D.set ? refPart : 'top']: hex }))}/>
                  </>)}
                </div>
              </figure>
            </div>
          ) : <img src={preview.image} alt={preview.label}/>}
          {ref3DFailed && <p className="ds-note">The 3D reference could not load; the photo is the reference.</p>}
          <h3>{garmentLabel(preview.label)}</h3>
          <p className="ds-pick-sum">{previewSentence(preview, offRole)}</p>
          <ul className="ds-pick-status" aria-label="Status">{previewChips(preview, offRole).map(c => <li key={c}>{c}</li>)}</ul>
        </div>
        <Foot>
          <button type="button" className="ds-btn" onClick={back}>Back to photos</button>
          {canEdit(preview) && preview.has3D && onPick3D && <button type="button" className="ds-btn" onClick={() => onPick3D(preview, filters)}>Open with 3D preview</button>}
          {primary}
        </Foot>
      </>
    );
  }

  return (
    <>
      {head(legend)}
      {extra}
      <div className="ds-pick-tools">
        <input type="search" className="ds-pick-search" placeholder="Search photos (blazer, mandarin, scrub…)" aria-label="Search photos"
          value={filters.q ?? ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}/>
        <div className="ds-chips" role="group" aria-label="Photo type">
          <RoleChip pieceRole={pieceRole} on={roleOn} setOn={setRoleOn} count={ENTRIES.filter(canEdit).length} total={ENTRIES.length}/>
          {[['editable', 'Editable in Studio'], ['reference', 'Inspiration only'], ['all', 'All']].map(([id, lbl]) => (
            <button key={id} type="button" className="ds-chip" aria-pressed={kind === id} onClick={() => setKind(id)}>{lbl} ({kindCount[id]})</button>
          ))}
        </div>
        <details className="ds-pick-filters" open={active > 0 || undefined}>
          <summary><SlidersHorizontal size={15} aria-hidden="true"/>Filters{active ? ` (${active})` : ''}</summary>
          {FILTERS.map(([key, label, options]) => {
            const opts = options.filter(o => TOTALS[key][o.id] > 0);
            return opts.length < 2 ? null : (
              <div key={key} className="ds-pick-frow" role="group" aria-label={label}>
                <span>{label}</span>
                {opts.map(o => (
                  <button key={o.id} type="button" className="ds-chip" aria-pressed={filters[key] === o.id} disabled={filters[key] !== o.id && !counts[key][o.id]}
                    onClick={() => setFilters(f => ({ ...f, [key]: f[key] === o.id ? null : o.id }))}>{o.label} ({counts[key][o.id]})</button>
                ))}
              </div>
            );
          })}
          {active > 0 && <button type="button" className="ds-btn" onClick={() => setFilters(f => ({ q: f.q }))}>Clear filters</button>}
        </details>
      </div>
      <ul className="ds-pick-grid">
        {shown.map((d, i) => (
          <li key={d.id} style={{ '--i': Math.min(i, 8) }}>
            <button type="button" className="ds-pick-card" onClick={() => setPreview(d)} title={TIER_LABEL[tierOf(d)].note} aria-label={`${d.label}, ${PHOTO_LABEL[tierOf(d)]}`}>
              <span className="ds-pick-img"><img src={d.thumb} alt="" loading="lazy" decoding="async"/></span>
              <strong>{garmentLabel(d.label)}</strong>
              <Badge icon={PHOTO_BADGE[tierOf(d)]} label={PHOTO_LABEL[tierOf(d)]}/>
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="ds-note">No photos match. Clear the search or filters.</p>}
      {derived.length > 0 && kind !== 'reference' && (
        <section className="ds-pick-sec" aria-label="Templates traced from reference photos">
          <h3>Traced from reference photos</h3>
          <p className="ds-note">{DERIVED_LABEL}: each template is traced from the 3D model of a VFRB reference photo, with one colour zone.</p>
          <ul className="ds-pick-grid">{derived.map((f, i) => <FamilyCard key={f.id} fam={f} cfg={cfg} fitsRole={famFitsRole} pieceRole={pieceRole} onPick={setDerivedFam} i={i}/>)}</ul>
        </section>
      )}
      {onClose && <Foot><span className="ds-pick-count">{shown.length} shown</span><button type="button" className="ds-btn" onClick={onClose}>Keep current garment</button></Foot>}
    </>
  );
}

// A template card shows exactly what picking it opens: the model's own lighting for a derived template, or the vector sketch in the chosen
// sleeve. Scratch is sketches only: a photo base is never drawn or opened from here (photos live under "Start from a reference").
function TemplateImage({ fam, cfg, pick = {} }) {
  const r = applyGarment(cfg, fam.id, pick);
  const base = BASE_PATHS[fam.id] ?? BASE_PATHS['Polo Shirt'];
  if (base.shade) return <><img src={base.shade.front} alt="" decoding="async" draggable={false}/><span className="ds-sketch">From model</span></>;
  return <><GarmentThumb paths={getGarmentPaths(fam.id, r.sleeve ?? 'Short')} colors={cfg.colors} size={96}/><span className="ds-sketch">Sketch</span></>;
}

const FIT_LABEL = { male: 'Men', female: 'Women', unisex: 'Unisex' };
// Every fit and style of a family that resolves to an editable template, once each, with its tier (reference combinations are left out).
// vectorOnly: template cards keep the vector templates; a real-photo base opens only from its photo under "Start from a reference".
export function combosFor(fam, { vectorOnly = false } = {}) {
  const seen = new Map();
  for (const fit of fam.fits.length ? fam.fits : [null]) for (const sleeve of fam.styles.length ? fam.styles : [null]) {
    const r = resolveTarget(fam.id, sleeve, fit);
    if (r && r.status !== 'reference' && !(vectorOnly && r.photo) && !seen.has(`${r.fit}|${r.sleeve}`)) seen.set(`${r.fit}|${r.sleeve}`, { fit: r.fit, sleeve: r.sleeve, status: r.status });
  }
  return [...seen.values()];
}
const VECTOR = { vectorOnly: true };
const tierOfFamily = fam => combosFor(fam, VECTOR)[0]?.status ?? 'reference';

// All families once, each opened in the browsed category, or the customer's current one when it lists that family.
const ALL = 'all';
const homeOf = (famId, cur) => (CATALOG.find(c => c.id === cur && c.families.some(f => f.id === famId)) ?? CATALOG.find(c => c.families.some(f => f.id === famId))).id;
const ALL_FAMILIES = [...new Map(CATALOG.flatMap(c => c.families).map(f => [f.id, f])).values()];
const OWN_FAMILIES = ALL_FAMILIES.filter(f => !f.derived);
// Templates traced from a reference photo's model: listed under "Start from a reference", never under "Start from scratch".
const DERIVED_FAMS = ALL_FAMILIES.filter(f => f.derived && tierOfFamily(f) !== 'reference');

function FamilyCard({ fam, cfg, fitsRole, pieceRole, onPick, i }) {
  const tier = tierOfFamily(fam);
  return (
    <li style={{ '--i': Math.min(i, 8) }}>
      <button type="button" className="ds-pick-card" aria-pressed={cfg.garment === fam.id} disabled={!fitsRole(fam)}
        title={fitsRole(fam) ? TIER_LABEL[tier].note : `Your set needs a ${ROLE_LABEL[pieceRole].toLowerCase()} here`}
        onClick={() => onPick(fam)} aria-label={`${fam.id}, ${PHOTO_LABEL[tier]}`}>
        <span className="ds-pick-img"><TemplateImage fam={fam} cfg={cfg} pick={combosFor(fam, VECTOR)[0] ?? {}}/></span>
        <strong>{garmentLabel(fam.id)}</strong>
        <Badge icon={PHOTO_BADGE[tier]} label={PHOTO_LABEL[tier]}/>
      </button>
    </li>
  );
}

function Choice({ label, items, value, set, text }) {
  if (items.length < 2) return null;
  return (
    <div className="ds-pick-frow" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {items.map(v => <button key={String(v)} type="button" role="radio" className="ds-chip" aria-checked={value === v} aria-pressed={value === v} onClick={() => set(v)}>{text(v)}</button>)}
    </div>
  );
}

// Step 2 of "Start from scratch": fit / cut, then style, offering only combinations that open an editable template. Back keeps the draft.
function FamilySteps({ fam, cfg, onBack, onOpen, backLabel = 'Back to garments' }) {
  const combos = combosFor(fam, VECTOR);
  const fits = [...new Set(combos.map(c => c.fit))];
  const [fit, setFit] = useState(combos.find(c => c.fit === cfg.fit)?.fit ?? fits[0]);
  const styles = combos.filter(c => c.fit === fit);
  const [sleeve, setSleeve] = useState(styles[0]?.sleeve ?? null);
  const chosen = styles.find(c => c.sleeve === sleeve) ?? styles[0];
  return (
    <>
      <div className="ds-pick-preview ds-pick-steps">
        <span className="ds-pick-img"><TemplateImage fam={fam} cfg={cfg} pick={{ fit: chosen?.fit, sleeve: chosen?.sleeve }}/></span>
        <h3>{garmentLabel(fam.id)}</h3>
        {fam.derived && <p className="ds-note">{DERIVED_LABEL}. One colour zone: the outline is traced from the reference model.</p>}
        <Choice label="Fit / cut" items={fits} value={fit} set={v => { setFit(v); setSleeve(combos.find(c => c.fit === v)?.sleeve ?? null); }} text={v => FIT_LABEL[v] ?? 'Standard'}/>
        <Choice label="Style" items={styles.map(c => c.sleeve)} value={chosen?.sleeve} set={setSleeve} text={v => `${v ?? 'Standard'} sleeve`}/>
        {chosen && <p className="ds-pick-sum ds-pick-tier"><Badge icon={PHOTO_BADGE[chosen.status]} label={PHOTO_LABEL[chosen.status]}/>{PHOTO_LABEL[chosen.status]}: {TIER_LABEL[chosen.status].note}</p>}
      </div>
      <Foot>
        <button type="button" className="ds-btn" onClick={onBack}>{backLabel}</button>
        <button type="button" className="ds-btn ds-btn--primary" disabled={!chosen} onClick={() => onOpen({ fit: chosen.fit, sleeve: chosen.sleeve })}>Open in Studio</button>
      </Foot>
    </>
  );
}

// "Build your own": a top, trousers or a skirt shaped with a few clamped choices (customGarment.js). The preview is the same generator
// the canvas draws with. A uniform set keeps the piece it needs (a top, or one of the two bottoms).
const BYO_KINDS = [[CUSTOM_TOP, 'Top', 'top'], [CUSTOM_BOTTOM, 'Trousers', 'bottom'], [CUSTOM_SKIRT, 'Skirt', 'bottom']];
function BuildYourOwnSteps({ cfg, pieceRole, onBack, onOpen }) {
  const kinds = BYO_KINDS.filter(([, , role]) => !pieceRole || role === pieceRole);
  const [garment, setGarment] = useState(kinds.find(([g]) => g === cfg.garment)?.[0] ?? kinds[0][0]);
  const [specs, setSpecs] = useState(() => ({ [CUSTOM_TOP]: DEFAULT_CUSTOM.top, [CUSTOM_BOTTOM]: DEFAULT_CUSTOM.bottom, [CUSTOM_SKIRT]: DEFAULT_CUSTOM.skirt,
    ...(kindOf(cfg.garment) && cfg.custom ? { [cfg.garment]: cfg.custom } : {}) }));
  const [sleeve, setSleeve] = useState(cfg.garment === CUSTOM_TOP && cfg.sleeve ? cfg.sleeve : 'Short');
  const top = garment === CUSTOM_TOP;
  return (
    <>
      {/* Desktop: the live preview large on the left, the choices on the right; phones stack them. */}
      <div className="ds-pick-preview ds-pick-steps ds-byo-steps">
        <div className="ds-byo-stage">
          <span className="ds-pick-img"><GarmentThumb paths={customPaths(garment, specs[garment], top ? sleeve : null)} colors={cfg.colors} size={300}/><span className="ds-sketch">{CUSTOM_BADGE}</span></span>
        </div>
        <div className="ds-byo-side">
          <h3>Build your own</h3>
          <div className="ds-pick-frow" role="radiogroup" aria-label="Garment">
            <span>Garment</span>
            {kinds.map(([g, label]) => <button key={g} type="button" role="radio" className="ds-chip" aria-checked={garment === g} aria-pressed={garment === g} onClick={() => setGarment(g)}>{label}</button>)}
          </div>
          <CustomControls garment={garment} spec={specs[garment]} sleeve={sleeve} onSleeve={setSleeve} onSpec={next => setSpecs(p => ({ ...p, [garment]: next }))}/>
          <CustomNote/>
        </div>
      </div>
      <Foot>
        <button type="button" className="ds-btn" onClick={onBack}>Back to garments</button>
        <button type="button" className="ds-btn ds-btn--primary" onClick={() => onOpen(garment, { custom: specs[garment], ...(top ? { sleeve } : {}) })}>Open in Studio</button>
      </Foot>
    </>
  );
}

function BuildYourOwnCard({ onPick }) {
  return (
    <li style={{ '--i': 0 }}>
      <button type="button" className="ds-pick-card ds-byo-card" onClick={onPick} aria-label={`Build your own: a top, trousers or skirt you shape yourself. ${CUSTOM_BADGE}, 2D only`}>
        <span className="ds-pick-img"><PencilRuler size={40} strokeWidth={1.6} aria-hidden="true"/></span>
        <strong>Build your own</strong>
        <span className="ds-sketch">{CUSTOM_BADGE} · 2D only</span>
      </button>
    </li>
  );
}

// "Complete the set": with a top on the canvas, its bottoms first (and a bottom's tops); picking one adds it as the set's other piece, so
// the garment already designed is kept. A one-piece garment needs no partner, and the picker says so instead of offering one.
function PairSection({ cfg, onPair, i0 = 0 }) {
  const role = pieceOf(cfg.garment);
  if (!role) return <p className="ds-note ds-pick-pairnote">{garmentLabel(cfg.garment)} is a one-piece garment: it needs no separate top or bottom. Pick any garment below to replace it.</p>;
  const list = counterpartsFor(cfg.garment, cfg.category).filter(f => !f.derived && tierOfFamily(f) !== 'reference');
  const want = role === 'top' ? 'bottom' : 'top';
  return (
    <section className="ds-pick-sec ds-pick-pair" aria-label={`Pair a ${ROLE_LABEL[want].toLowerCase()} with your ${garmentLabel(cfg.garment)}`}>
      <h3>Pair with your {garmentLabel(cfg.garment)}</h3>
      <p className="ds-note">Adds a {ROLE_LABEL[want].toLowerCase()} as the other piece of a uniform set, in your colours. Your {ROLE_LABEL[role].toLowerCase()} stays as it is.</p>
      {list.length
        ? <ul className="ds-pick-grid">{list.map((f, i) => <FamilyCard key={f.id} fam={f} cfg={cfg} fitsRole={() => true} pieceRole={null} onPick={onPair} i={i0 + i}/>)}</ul>
        : <p className="ds-note">No {ROLE_LABEL[want].toLowerCase()} template matches yet. Choose another category, or build your own.</p>}
    </section>
  );
}

function Templates({ head, onClose, cfg, pieceRole, onPickFamily, onPairFamily = null, extra, startCat = null }) {
  const [cat, setCat] = useState(startCat ?? ALL);
  const [roleOn, setRoleOn] = useState(true);
  const [fam, setFam] = useState(null);
  const [pairFam, setPairFam] = useState(null);
  const [byo, setByo] = useState(false);
  const [piece, setPiece] = useState(null);   // Tops | Trousers & shorts | Skirts | Dresses & one-piece
  const [gender, setGender] = useState(null); // a recommendation filter: unisex sketches always stay listed
  const [view, setView] = useState('grid');
  const [carIdx, setCarIdx] = useState(0);
  const [colour, setColour] = useState(null); // carousel body colour: previewed here, written to cfg.colors only on open
  const pcfg = colour ? { ...cfg, colors: { ...cfg.colors, body: colour } } : cfg;
  const withColour = pick => (colour ? { ...pick, bodyColor: colour } : pick);
  const fitsRole = f => !pieceRole || pieceOf(f.id) === pieceRole;
  const facetOk = f => (!piece || pieceFacet(f.id) === piece) && (!gender || genderFacets(f).has(gender) || genderFacets(f).has('unisex'));
  const inCat = c => (c === ALL ? ALL_FAMILIES : CATALOG.find(x => x.id === c).families).filter(f => !f.derived && tierOfFamily(f) !== 'reference' && (!(pieceRole && roleOn) || fitsRole(f)) && facetOk(f));
  const families = inCat(cat);
  const pairing = !!onPairFamily && !!cfg.garment && !pieceRole;
  const legend = <Legend labels={PHOTO_LABEL} icons={PHOTO_BADGE} present={Object.keys(PHOTO_BADGE).filter(k => families.some(f => tierOfFamily(f) === k))}/>;
  if (byo) return <>{head(null)}<BuildYourOwnSteps cfg={cfg} pieceRole={pieceRole && roleOn ? pieceRole : null} onBack={() => setByo(false)}
    onOpen={(garment, pick) => onPickFamily({ id: garment }, cfg.category, pick)}/></>;
  if (pairFam) return <>{head(null)}<FamilySteps fam={pairFam} cfg={cfg} backLabel="Back to garments" onBack={() => setPairFam(null)} onOpen={pick => onPairFamily(pairFam, homeOf(pairFam.id, cfg.category), pick)}/></>;
  if (fam) return <>{head(null)}<FamilySteps fam={fam} cfg={pcfg} onBack={() => setFam(null)} onOpen={pick => onPickFamily(fam, cat === ALL ? homeOf(fam.id, cfg.category) : cat, withColour(pick))}/></>;
  const card = (f, i) => <FamilyCard key={f.id} fam={f} cfg={cfg} fitsRole={fitsRole} pieceRole={pieceRole} onPick={setFam} i={i}/>;
  return (
    <>
      {head(legend)}
      {extra}
      <div className="ds-chips" role="tablist" aria-label="Uniform category">
        <RoleChip pieceRole={pieceRole} on={roleOn} setOn={setRoleOn} count={OWN_FAMILIES.filter(fitsRole).length} total={OWN_FAMILIES.length}/>
        {[{ id: ALL }, ...CATALOG].map(c => (
          <button key={c.id} type="button" role="tab" className="ds-chip" aria-selected={cat === c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.id === ALL ? 'All' : CAT_SHORT[c.id] ?? c.id} ({inCat(c.id).length})
          </button>
        ))}
      </div>
      <div className="ds-pick-facets">
        <div className="ds-pick-frow" role="group" aria-label="Piece">
          <span>Piece</span>
          {PIECE_FACETS.map(([id, label]) => <button key={id} type="button" className="ds-chip" aria-pressed={piece === id} onClick={() => setPiece(p => (p === id ? null : id))}>{label}</button>)}
        </div>
        <div className="ds-pick-frow" role="group" aria-label="For">
          <span>For</span>
          {GENDER_FACETS.map(([id, label]) => <button key={id} type="button" className="ds-chip" aria-pressed={gender === id} onClick={() => setGender(g => (g === id ? null : id))}>{label}</button>)}
          {gender && gender !== 'unisex' && <span className="ds-note">Unisex templates stay listed: any garment can be made in any size.</span>}
        </div>
      </div>
      {pairing && <PairSection cfg={cfg} onPair={setPairFam}/>}
      {pairing && <h3 className="ds-pick-subh">Or replace your garment</h3>}
      <div className="ds-seg ds-seg--sm ds-pick-viewsw" role="radiogroup" aria-label="Browse as">
        {[['grid', 'Grid'], ['carousel', 'Carousel']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}>{l}</button>)}
      </div>
      {view === 'carousel' && families.length > 0 ? (
        <GarmentCarousel families={families} index={carIdx} setIndex={setCarIdx} colour={colour} setColour={setColour}
          renderImage={f => <TemplateImage fam={f} cfg={pcfg} pick={combosFor(f, VECTOR)[0] ?? {}}/>}
          renderBadge={f => <span className="ds-car-tier"><Badge icon={PHOTO_BADGE[tierOfFamily(f)]} label={PHOTO_LABEL[tierOfFamily(f)]}/><span aria-hidden="true">{PHOTO_LABEL[tierOfFamily(f)]}</span></span>}
          isDisabled={f => !fitsRole(f)} onChoose={setFam}/>
      ) : (
        <ul className="ds-pick-grid">
          <BuildYourOwnCard onPick={() => setByo(true)}/>
          {families.map((f, i) => card(f, i + 1))}
        </ul>
      )}
      {families.length === 0 && <p className="ds-note">No template matches these filters. Clear a filter or pick another category.</p>}
      {onClose && <Foot><span className="ds-pick-count">{families.length} templates</span><button type="button" className="ds-btn" onClick={onClose}>Keep current garment</button></Foot>}
    </>
  );
}

// What an uploaded photo shows, said by the customer (never guessed): one piece narrows the picker to that piece; a full set
// opens the top with its bottom as one uniform set. Inside a set the picker already shows only the piece being designed.
const ART_SCOPES = [['top', 'Top only'], ['bottom', 'Bottom only'], ['set', 'Full set (top + bottom)']];
function ArtScope({ value, onChange }) {
  return (
    <div className="ds-pick-frow" role="radiogroup" aria-label="What does your photo show?">
      <span>Your photo shows</span>
      {ART_SCOPES.map(([v, l]) => <button key={v} type="button" role="radio" className="ds-chip" aria-checked={value === v} aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>{l}</button>)}
    </div>
  );
}

export default function GarmentPicker({ tab = 'inspiration', inline = false, cfg, pieceRole = null, onPickPhoto, onPick3D, onPickFamily, onPairFamily = null, onUpload, pendingArt, onCancelArt, onSketchArt = null, artScope = null, onArtScope = null, onClose = null, extra = null }) {
  // A landing tile's category (studioIntent.js) opens the scratch list filtered to it; an unknown id is ignored.
  const [startCat] = useState(() => { const c = inline && !cfg.garment ? peekStudioCategory() : null; return CATALOG.some(x => x.id === c) ? c : null; });
  useEffect(clearStudioCategory, []);
  const [view, setView] = useState(startCat ? 'templates' : tab);
  const title = pendingArt ? 'Now choose the garment for your design' : cfg.garment ? 'Change garment' : 'Start from a VFRB garment';
  const sub = pendingArt
    ? <><p>Your file <strong>{pendingArt.name}</strong> goes on the garment you pick{artScope === 'set' ? '; pick the top and its bottom is added as a set' : ''}. <button type="button" className="ds-pick-link" onClick={onCancelArt}><X size={14} aria-hidden="true"/>Cancel upload</button></p>
        {onArtScope && <ArtScope value={artScope} onChange={onArtScope}/>}
        {onSketchArt && <p><button type="button" className="ds-btn" onClick={onSketchArt}><PencilRuler size={15} aria-hidden="true"/>Create a 2D garment from this photo</button> <span className="ds-note">Reads the outline into an editable sketch you confirm (2D only).</span></p>}</>
    : <p>Real uniforms we have made, or a VFRB template.</p>;
  const head = legend => <Head title={title} sub={sub} onClose={onClose} view={view} setView={setView} legend={legend} onUpload={pendingArt ? null : onUpload}/>;
  // Compact header once the picker's scroll box (the inline stage or the modal) has scrolled. The gap between the two thresholds, with
  // scroll anchoring off (CSS), keeps the header's own height change from flipping it back.
  const root = useRef(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const box = root.current?.closest('.ds-modal') ?? root.current;
    if (!box) return undefined;
    const onScroll = () => setCompact(c => (c ? box.scrollTop > 24 : box.scrollTop > 120));
    box.addEventListener('scroll', onScroll, { passive: true });
    return () => box.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <section ref={root} className="ds-pick" data-inline={inline || undefined} data-compact={compact || undefined} aria-labelledby="ds-pick-h">
      {view === 'inspiration'
        ? <Photos head={head} onClose={onClose} cfg={cfg} pieceRole={pieceRole} onPickPhoto={onPickPhoto} onPick3D={onPick3D} onPickFamily={onPickFamily} extra={extra}/>
        : <Templates head={head} onClose={onClose} cfg={cfg} pieceRole={pieceRole} onPickFamily={onPickFamily} onPairFamily={onPairFamily} extra={extra} startCat={startCat}/>}
    </section>
  );
}
