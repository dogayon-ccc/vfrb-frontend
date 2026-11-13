import { useRef, useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { placementsFor, revealAlert } from './dsShared';
import { REF_KINDS, REF_SKETCH_LABEL, REF_SKETCH_NOTE, REF_3D_NOTE, REF_UNIFORM_CONFIRM } from './referenceSketch';
import { personGate } from './personDetector';
import { CustomControls } from './BuildYourOwn';
import { customPaths } from './garmentPaths';
import GarmentThumb from './GarmentThumb';


const MODES = [
  { id: 'auto', label: 'Auto',  hint: 'Instant and offline. Best for logos on a plain background.' },
  { id: 'ai',   label: 'AI',    hint: 'Handles photos and busy backgrounds. Downloads a large model on first use.' },
  { id: 'off',  label: 'Off',   hint: 'Keep the image exactly as uploaded.' },
];

function Progress({ progress }: any) {
  if (!progress) return <p className="ds-note">Preparing the AI model. First use downloads it once…</p>;
  return (
    <>
      <div className="ds-bar-track" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${progress.pct}%` }}/>
      </div>
      <p className="ds-note">Downloading AI model: {progress.pct}% ({Math.round(progress.loadedMB)} / {Math.round(progress.totalMB)} MB)</p>
    </>
  );
}

function StatusCard({ logo, onBrowse }: any) {
  const { status: s, retry, addOriginal, dismiss, mode } = logo;
  if (s.phase === 'working') {
    return (
      <div className="ds-status" data-phase="working" role="status" aria-live="polite">
        <div className="ds-status-row"><span className="ds-spin"/><strong>{s.method === 'check' ? 'Checking the file…' : s.method === 'ai' ? 'Removing background with AI…' : 'Removing background…'}</strong></div>
        <p className="ds-note">{s.fileName}</p>
        {s.method === 'ai' && <Progress progress={s.progress}/>}
      </div>
    );
  }
  if (s.phase === 'error') {
    const canAi = mode !== 'ai' && (s.code === 'NO_SOLID_BG' || s.code === 'OVER_REMOVED');
    return (
      <div className="ds-status" data-phase="error" role="alert" tabIndex={-1} ref={revealAlert}>
        <div className="ds-status-row"><NavIcon name="warning" size={16}/><strong>{['TYPE', 'SIZE', 'SMALL', 'DECODE', 'READ', 'EMPTY', 'NOT_SET', 'PERSON'].includes(s.code) ? 'Upload not accepted' : 'Background not removed'}</strong></div>
        <p className="ds-note">{s.message}</p>
        {s.file && (
          <div className="ds-status-actions">
            {canAi && <button type="button" className="ds-btn ds-btn--primary" onClick={() => retry('ai')}>Try AI mode</button>}
            {!canAi && s.method && s.code !== 'TYPE' && s.code !== 'SIZE' && <button type="button" className="ds-btn ds-btn--primary" onClick={() => retry()}><NavIcon name="refresh" size={13}/> Retry</button>}
            <button type="button" className="ds-btn" onClick={addOriginal}>Add original anyway</button>
          </div>
        )}
        {(s.code === 'NOT_SET' || s.code === 'PERSON') && (
          <div className="ds-status-actions">
            <button type="button" className="ds-btn ds-btn--primary" onClick={onBrowse}>Choose another photo</button>
          </div>
        )}
        <button type="button" className="ds-link" onClick={dismiss}>Dismiss</button>
      </div>
    );
  }
  // Artwork review: before/after, "Remove background" toggle (back to the original), and Use as artwork or reference photo.
  if (s.phase === 'review') {
    const art = s.useAs === 'artwork';
    const USE_AS = [['artwork', 'Add my logo', 'A movable image layer on the design', 'Add to garment', true]];
    const action = USE_AS.find(o => o[0] === s.useAs)?.[3] ?? 'Add to garment';
    const gate = personGate(s.useAs, s.person);
    return (
      <div className="ds-status" data-phase="review" role="group" aria-label="Check your upload">
        <div className="ds-status-row"><strong>Check your upload</strong><span className="ds-note" style={{ marginLeft: 'auto' }}>{s.fileName}</span></div>
        <div className="ds-ba">
          <figure><div className="ds-checker"><img src={s.before} alt="Original upload"/></div><figcaption>Original</figcaption></figure>
          <figure aria-hidden={!s.after || undefined}><div className="ds-checker">{s.after ? <img src={s.after} alt="Background removed"/> : <span className="ds-note">No change</span>}</div><figcaption>Background removed</figcaption></figure>
        </div>
        <p className="ds-note">{s.note}</p>
        {art && s.after && (
          <label className="ds-switch"><input type="checkbox" checked={s.removeBg} onChange={e => logo.setRemoveBg(e.target.checked)}/><span>Remove background</span></label>
        )}
        {art && s.canAi && <button type="button" className="ds-btn" onClick={logo.tryAi}>Try AI background removal</button>}
        {s.useAs === 'sketch' && <>
          <label className="ds-switch"><input type="checkbox" checked={!!s.uniformOk} onChange={e => logo.setUniformOk(e.target.checked)}/><span>{REF_UNIFORM_CONFIRM}</span></label>
          <p className="ds-note">{REF_3D_NOTE}</p>
        </>}
        {gate.message && <p className="ds-note" role="status">{gate.message}</p>}
        <div className="ds-status-actions">
          <button type="button" className="ds-btn ds-btn--primary" onClick={logo.confirm} disabled={gate.blocked || (s.useAs === 'sketch' && !s.uniformOk)}>{action}</button>
          {s.person === 'failed' && <button type="button" className="ds-btn" onClick={logo.recheckPerson}>Check again</button>}
          <button type="button" className="ds-btn" onClick={dismiss}>Cancel</button>
        </div>
      </div>
    );
  }
  // Reference to 2D: the detected type (always confirmed by the customer), the proposed shape with the same controls as Build your own.
  if (s.phase === 'sketch') {
    const a = s.analysis, d = s.draft;
    return (
      <div className="ds-status" data-phase="review" role="group" aria-label="Create a sketch from your photo">
        <div className="ds-status-row"><strong>{REF_SKETCH_LABEL}</strong><span className="ds-note" style={{ marginLeft: 'auto' }}>{s.fileName}</span></div>
        <div className="ds-ba">
          <figure><div className="ds-checker"><img src={s.preview} alt="Your photo"/></div><figcaption>Your photo</figcaption></figure>
          <figure><div className="ds-checker"><GarmentThumb paths={customPaths(d.garment, d.custom, d.sleeve)} colors={{ body: '#cfd8dc', collar: '#b0bec5' }} size={110}/></div><figcaption>Proposed sketch</figcaption></figure>
        </div>
        <p className="ds-note">{a ? (a.sure ? 'The outline looks like a ' : 'Not sure: the outline might be a ') + (REF_KINDS.find(k => k[0] === a.kind)?.[1] ?? 'top').toLowerCase() + '. Confirm or correct it.'
          : 'The garment outline could not be read from this photo (busy background or cropped garment). Pick the type and shape it by hand; the photo stays as a tracing guide.'}</p>
        <div className="ds-pick-frow" role="radiogroup" aria-label="Garment type">
          <span>This is a</span>
          {REF_KINDS.map(([id, label]) => <button key={id} type="button" role="radio" className="ds-chip" aria-checked={s.kind === id} onClick={() => logo.setSketchKind(id)}>{label}</button>)}
        </div>
        {s.kind === 'dress' && <p className="ds-note">A dress is sketched as a full-length top; there is no separate dress shape yet.</p>}
        <CustomControls garment={d.garment} spec={d.custom} sleeve={d.sleeve} onSpec={custom => logo.setSketchDraft({ custom })} onSleeve={sleeve => logo.setSketchDraft({ sleeve })}/>
        <p className="ds-note">{REF_SKETCH_NOTE} {REF_3D_NOTE}</p>
        <div className="ds-status-actions">
          <button type="button" className="ds-btn ds-btn--primary" onClick={logo.createSketch}>Create sketch</button>
          <button type="button" className="ds-btn" onClick={dismiss}>Cancel</button>
        </div>
      </div>
    );
  }
  if (s.phase === 'trace') {
    return (
      <div className="ds-status" data-phase="done" role="status" aria-live="polite">
        <div className="ds-status-row"><NavIcon name="success" size={16}/><strong>Tracing guide on</strong></div>
        <div className="ds-checker"><img src={s.preview} alt="Tracing guide"/></div>
        <p className="ds-note">{s.message} Adjust or remove it under Garment, Tracing guide.</p>
        <button type="button" className="ds-link" onClick={dismiss}>Dismiss</button>
      </div>
    );
  }
  if (s.phase === 'done') {
    return (
      <div className="ds-status" data-phase="done" role="status" aria-live="polite">
        <div className="ds-status-row"><NavIcon name="success" size={16}/><strong>{s.artwork ? 'Artwork added' : s.changed ? 'Logo added, background removed' : 'Logo added'}</strong></div>
        <div className="ds-checker"><img src={s.preview} alt="Logo preview"/></div>
        <p className="ds-note">{s.message} Drag it on the canvas or use the corner handles. Selection sets its zone, size, rotation and opacity.</p>
      </div>
    );
  }
  return null;
}

const IMAGE_ACCEPT = 'image/png,image/svg+xml,image/jpeg,image/webp';

export default function LogoAssets({ cfg, logo }: any) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const noGarment = !cfg.garment;
  const working = logo.status.phase === 'working';
  const blocked = noGarment || working;
  const presets = placementsFor(cfg.garment, cfg.sleeve, cfg.fit);
  const placement = presets.some((p) => p.id === logo.placement) ? logo.placement : presets[0].id;
  const modeHint = MODES.find((m) => m.id === logo.mode)?.hint;
  const browse = () => fileRef.current?.click();
  const pick = (file) => { if (!blocked && file) { if (logo.kind !== 'logo') logo.setKind('logo'); logo.upload(file); } };

  return (
    <div className="ds-stack">
      <button type="button" className="ds-drop" data-drag={drag || undefined} disabled={blocked}
        onClick={browse}
        onDragOver={(e) => { e.preventDefault(); if (!blocked) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
        <NavIcon name="dropzone" size={26}/>
        <strong>{noGarment ? 'Pick a garment first' : working ? 'Working…' : 'Drop a logo or click to browse'}</strong>
        <span>{noGarment ? 'Images are placed relative to the garment.' : 'PNG, JPG, WEBP or SVG, up to 5 MB'}</span>
      </button>
      <input ref={fileRef} type="file" hidden accept={IMAGE_ACCEPT} aria-label="Drop a logo or click to browse"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}/>

      <StatusCard logo={logo} onBrowse={browse}/>

      <section>
        <h3 className="ds-h3">Place on</h3>
        <div className="ds-chips">
          {presets.map((p) => (
            <button key={p.id} type="button" className="ds-chip" aria-pressed={placement === p.id} onClick={() => logo.setPlacement(p.id)}>{p.label}</button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="ds-h3">Background removal</h3>
        <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Background removal mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={logo.mode === m.id} onClick={() => logo.setMode(m.id)}>{m.label}</button>
          ))}
        </div>
        <p className="ds-note">{modeHint}</p>
      </section>
    </div>
  );
}
