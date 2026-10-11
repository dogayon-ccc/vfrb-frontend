// The one garment picker: Inspiration (real VFRB photos with their honest status) and Templates (the catalog).
// Used inline on the empty canvas and inside the picker modal (Inspo button, "Change garment").
import { Suspense, lazy, useMemo, useState } from 'react';
import { Upload, SlidersHorizontal, Eye, Square, CheckCircle2, Box, X } from 'lucide-react';
import { BASE_PATHS } from './garmentPaths';
import GarmentThumb from './GarmentThumb';
import { CATALOG, resolveFit, pieceOf } from './garmentCatalog';
import { CATEGORIES, PIECES, SLEEVES, GENDERS, ENTRIES, TIER_LABEL, filterDesigns, facetCounts } from './designGallery';
import { assetFor } from './garmentAssets';
import { hasWebGL } from './webglSupport';

const ReferenceModel3D = lazy(() => import('./ReferenceModel3D'));
const CAT_SHORT = { 'School Uniform': 'School', 'Medical / Scrubs': 'Medical', 'Hospitality / Service': 'Hospitality', 'Industrial / Work': 'Industrial' };
const mode = list => Object.entries(list.reduce((n, k) => ({ ...n, [k]: (n[k] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0];

// Status shown once as a legend; a card carries a small badge only when it differs from the most common status among the cards shown.
const PHOTO_BADGE = { reference: Eye, 'editable-2d': Square, '2d-3d-approx': Box, '2d-3d': CheckCircle2 };
const TEMPLATE_STATUS = { partial: '3D (approx.)', none: '2D only', supported: '3D' };
const TEMPLATE_BADGE = { none: Square, supported: CheckCircle2, partial: Box };

function Badge({ icon: Icon, label }) {
  return <span className="ds-pick-badge" title={label}><Icon size={13} strokeWidth={2.2} aria-hidden="true"/><span className="sr-only">{label}</span></span>;
}

function Legend({ def, labels, icons, present }) {
  if (!def) return null;
  return (
    <p className="ds-pick-legend">
      <span>{labels[def]}, unless marked:</span>
      {present.filter(k => k !== def).map(k => { const I = icons[k]; return <span key={k} className="ds-pick-key"><I size={13} strokeWidth={2.2} aria-hidden="true"/>{labels[k]}</span>; })}
    </p>
  );
}

function UploadCard({ onUpload }) {
  return (
    <li>
      <label className="ds-pick-card ds-pick-up">
        <span className="ds-pick-img"><Upload size={28} strokeWidth={1.8} aria-hidden="true"/></span>
        <strong>Upload my design</strong>
        <span className="ds-pick-sub">PNG, JPG, WEBP or SVG, up to 5 MB</span>
        <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }}/>
      </label>
    </li>
  );
}

const FILTERS = [['category', 'Category', CATEGORIES], ['piece', 'Piece', PIECES], ['gender', 'For', GENDERS],
  ['tier', 'Type', Object.entries(TIER_LABEL).map(([id, t]) => ({ id, label: t.label }))], ['sleeve', 'Sleeve', SLEEVES.map(id => ({ id, label: id }))]];
const TOTALS = facetCounts({});
const PIECE_LABEL = Object.fromEntries(PIECES.map(p => [p.id, p.label]));
const GENDER_LABEL = Object.fromEntries(GENDERS.map(g => [g.id, g.label]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const facts = d => [CAT_LABEL[d.category], PIECE_LABEL[d.piece], GENDER_LABEL[d.gender], d.sleeve && `${d.sleeve} sleeve`].filter(Boolean).join(' · ');
const previewNote = (p) => {
  const t = TIER_LABEL[p.tier];
  if (p.exactBase) return p.has3D ? 'Editable in 2D on a real VFRB photo base, with its own garment-only 3D model. 3D shows one body colour.' : 'Editable in 2D on a real VFRB photo base. No 3D model.';
  if (p.has3D) return `Opens the VFRB ${p.garmentFamily} template in 2D. The 3D model was made from this photo and shows one body colour.`;
  if (p.familyApprox3D) return `${t.note} Its 3D view is the generic ${p.garmentFamily} model, an approximation, not this exact garment.`;
  if (p.family3DOff) return `${t.note} The Studio shows it in 2D only: the ${p.garmentFamily} 3D model is a different garment.`;
  return !p.editable2D && p.ref3D ? 'Inspiration only: no editable VFRB template for this design. A read-only 3D reference of this photo is available.' : t.note;
};

function Photos({ pieceRole, onPickPhoto, onPick3D, onUpload }) {
  const [filters, setFilters] = useState({});
  const [kind, setKind] = useState('editable');
  const [preview, setPreview] = useState(null);
  const [ref3D, setRef3D] = useState(false);
  const pool = useMemo(() => (pieceRole ? ENTRIES.filter(d => d.base && pieceOf(d.base[1]) === pieceRole) : ENTRIES), [pieceRole]);
  const counts = useMemo(() => facetCounts(filters, pool), [filters, pool]);
  const matched = useMemo(() => filterDesigns(filters, pool), [filters, pool]);
  const kindCount = { editable: matched.filter(d => d.editable2D).length, reference: matched.filter(d => !d.editable2D).length, all: matched.length };
  const shown = kind === 'all' ? matched : matched.filter(d => (kind === 'editable' ? d.editable2D : !d.editable2D));
  const active = FILTERS.filter(([k]) => filters[k]).length;
  const def = mode(shown.map(d => d.tier));

  if (preview) {
    return (
      <div className="ds-pick-preview">
        <img src={preview.image} alt={preview.label}/>
        <h3>{preview.label}</h3>
        <p className="ds-pick-sub">{facts(preview)} · {TIER_LABEL[preview.tier].label}</p>
        <p className="ds-note">{previewNote(preview)}</p>
        {preview.editable2D && <p className="ds-note">{preview.exactBase ? `Opens this garment as an editable real-photo base (${preview.garmentFamily}).` : `Opens the closest ${preview.garmentFamily} template${preview.sleeve ? `, ${preview.sleeve.toLowerCase()} sleeve` : ''}. It is not an exact copy of the photo.`}</p>}
        <div className="ds-pick-actions">
          {preview.editable2D && <button type="button" className="ds-btn ds-btn--primary" onClick={() => onPickPhoto(preview, filters)}>{preview.exactBase ? 'Edit this garment' : `Open ${preview.garmentFamily} template`}</button>}
          {preview.has3D && onPick3D && <button type="button" className="ds-btn" onClick={() => onPick3D(preview, filters)}>Open with 3D preview</button>}
          {preview.ref3D && hasWebGL() && <button type="button" className="ds-btn" aria-pressed={ref3D} onClick={() => setRef3D(v => !v)}>{ref3D ? 'Hide 3D reference' : preview.ref3D.set ? 'View the set in 3D' : 'View in 3D'}</button>}
          <button type="button" className="ds-btn" onClick={() => { setPreview(null); setRef3D(false); }}>Back to photos</button>
        </div>
        {ref3D && preview.ref3D && (
          <div className="ds-pick-ref3d">
            <Suspense fallback={<p className="ds-note">Loading 3D reference…</p>}><ReferenceModel3D url={preview.ref3D.file}/></Suspense>
            <p className="ds-note">3D reference of this photo: shape only, one neutral colour, not editable.{preview.ref3D.set ? ' The set is one fused model, so its pieces cannot be coloured separately here.' : ''} Drag to rotate.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="ds-pick-tools">
        <input type="search" className="ds-pick-search" placeholder="Search photos (blazer, mandarin, scrub…)" aria-label="Search photos"
          value={filters.q ?? ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}/>
        <div className="ds-chips" role="group" aria-label="Photo type">
          {[['editable', 'Editable in Studio'], ['reference', 'Inspiration only'], ['all', 'All']].map(([id, lbl]) => (
            <button key={id} type="button" className="ds-chip" aria-pressed={kind === id} onClick={() => setKind(id)}>{lbl} ({kindCount[id]})</button>
          ))}
        </div>
        <details className="ds-pick-filters">
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
      <Legend def={def} labels={Object.fromEntries(Object.entries(TIER_LABEL).map(([k, t]) => [k, t.label]))} icons={PHOTO_BADGE} present={[...new Set(shown.map(d => d.tier))]}/>
      <ul className="ds-pick-grid">
        {onUpload && <UploadCard onUpload={onUpload}/>}
        {shown.map((d, i) => (
          <li key={d.id} style={{ '--i': Math.min(i, 8) }}>
            <button type="button" className="ds-pick-card" onClick={() => setPreview(d)} title={TIER_LABEL[d.tier].note} aria-label={`${d.label}, ${TIER_LABEL[d.tier].label}`}>
              <span className="ds-pick-img"><img src={d.thumb} alt="" loading="lazy" decoding="async"/></span>
              <strong>{d.label}</strong>
              {d.tier !== def && <Badge icon={PHOTO_BADGE[d.tier]} label={TIER_LABEL[d.tier].label}/>}
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="ds-note">No photos match. Clear the search or filters.</p>}
    </>
  );
}

// A template card shows the family's real photo base when it has one, otherwise its 2D template drawing.
function TemplateImage({ fam, cfg }) {
  const asset = assetFor(fam.id, fam.defaultStyle, 'front', resolveFit(fam.id, cfg.fit));
  return asset ? <img src={asset.src} alt="" decoding="async" draggable={false}/> : <GarmentThumb paths={BASE_PATHS[fam.id] ?? BASE_PATHS['Polo Shirt']} colors={cfg.colors} size={96}/>;
}

function Templates({ cfg, pieceRole, onPickFamily, onUpload }) {
  const [cat, setCat] = useState(CATALOG.some(c => c.id === cfg.category) ? cfg.category : CATALOG[0].id);
  const data = CATALOG.find(c => c.id === cat) ?? CATALOG[0];
  const families = pieceRole ? data.families.filter(f => pieceOf(f.id) === pieceRole) : data.families;
  const def = mode(families.map(f => f.status3D));
  return (
    <>
      <div className="ds-chips" role="tablist" aria-label="Uniform category">
        {CATALOG.map(c => <button key={c.id} type="button" role="tab" className="ds-chip" aria-selected={cat === c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{CAT_SHORT[c.id] ?? c.id}</button>)}
      </div>
      <Legend def={def} labels={TEMPLATE_STATUS} icons={TEMPLATE_BADGE} present={[...new Set(families.map(f => f.status3D))]}/>
      <ul className="ds-pick-grid">
        {onUpload && <UploadCard onUpload={onUpload}/>}
        {families.map((fam, i) => (
          <li key={fam.id} style={{ '--i': Math.min(i, 8) }}>
            <button type="button" className="ds-pick-card" aria-pressed={cfg.garment === fam.id} onClick={() => onPickFamily(fam, data.id)}
              aria-label={`${fam.id}, ${TEMPLATE_STATUS[fam.status3D]}`}>
              <span className="ds-pick-img"><TemplateImage fam={fam} cfg={cfg}/></span>
              <strong>{fam.id}</strong>
              {fam.status3D !== def && <Badge icon={TEMPLATE_BADGE[fam.status3D]} label={TEMPLATE_STATUS[fam.status3D]}/>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function GarmentPicker({ tab = 'inspiration', inline = false, cfg, pieceRole = null, onPickPhoto, onPick3D, onPickFamily, onUpload, pendingArt, onCancelArt }) {
  const [view, setView] = useState(tab);
  return (
    <section className="ds-pick" data-inline={inline || undefined} aria-labelledby="ds-pick-h">
      <header className="ds-pick-head">
        <h2 id="ds-pick-h">{pendingArt ? 'Now choose the garment for your design' : cfg.garment ? 'Change garment' : 'Start from a VFRB garment'}</h2>
        {pendingArt
          ? <p>Your file <strong>{pendingArt.name}</strong> goes on the garment you pick. <button type="button" className="ds-pick-link" onClick={onCancelArt}><X size={14} aria-hidden="true"/>Cancel upload</button></p>
          : <p>Real uniforms we have made, or a VFRB template.</p>}
        <div className="ds-pick-tabs" role="tablist" aria-label="Garment source">
          {[['inspiration', 'Inspiration'], ['templates', 'Templates']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
      </header>
      {view === 'inspiration'
        ? <Photos pieceRole={pieceRole} onPickPhoto={onPickPhoto} onPick3D={onPick3D} onUpload={pendingArt ? null : onUpload}/>
        : <Templates cfg={cfg} pieceRole={pieceRole} onPickFamily={onPickFamily} onUpload={pendingArt ? null : onUpload}/>}
    </section>
  );
}
