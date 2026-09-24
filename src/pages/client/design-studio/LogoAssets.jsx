import { useRef, useState } from 'react';
import { NavIcon } from '../../../components/ui/icons';
import { placementsFor } from './dsShared';

const MODES = [
  { id: 'auto', label: 'Auto',  hint: 'Instant and offline. Best for logos on a plain background.' },
  { id: 'ai',   label: 'AI',    hint: 'Handles photos and busy backgrounds. Downloads a large model on first use.' },
  { id: 'off',  label: 'Off',   hint: 'Keep the image exactly as uploaded.' },
];

function Progress({ progress }) {
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

function StatusCard({ logo }) {
  const { status: s, retry, addOriginal, dismiss, mode } = logo;
  if (s.phase === 'working') {
    return (
      <div className="ds-status" data-phase="working" role="status" aria-live="polite">
        <div className="ds-status-row"><span className="ds-spin"/><strong>{s.method === 'ai' ? 'Removing background with AI…' : 'Removing background…'}</strong></div>
        <p className="ds-note">{s.fileName}</p>
        {s.method === 'ai' && <Progress progress={s.progress}/>}
      </div>
    );
  }
  if (s.phase === 'error') {
    const canAi = mode !== 'ai' && (s.code === 'NO_SOLID_BG' || s.code === 'OVER_REMOVED');
    return (
      <div className="ds-status" data-phase="error" role="alert">
        <div className="ds-status-row"><NavIcon name="warning" size={16}/><strong>Background not removed</strong></div>
        <p className="ds-note">{s.message}</p>
        {s.file && (
          <div className="ds-status-actions">
            {canAi && <button type="button" className="ds-btn ds-btn--primary" onClick={() => retry('ai')}>Try AI mode</button>}
            {!canAi && s.method && s.code !== 'TYPE' && s.code !== 'SIZE' && <button type="button" className="ds-btn ds-btn--primary" onClick={() => retry()}><NavIcon name="refresh" size={13}/> Retry</button>}
            <button type="button" className="ds-btn" onClick={addOriginal}>Add original anyway</button>
          </div>
        )}
        <button type="button" className="ds-link" onClick={dismiss}>Dismiss</button>
      </div>
    );
  }
  if (s.phase === 'done') {
    return (
      <div className="ds-status" data-phase="done" role="status" aria-live="polite">
        <div className="ds-status-row"><NavIcon name="success" size={16}/><strong>{s.changed ? 'Logo added, background removed' : 'Logo added'}</strong></div>
        <div className="ds-checker"><img src={s.preview} alt="Logo preview"/></div>
        <p className="ds-note">{s.message} Drag it on the canvas; corner handles resize.</p>
      </div>
    );
  }
  return null;
}

export default function LogoAssets({ cfg, logo }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const noGarment = !cfg.garment;
  const working = logo.status.phase === 'working';
  const blocked = noGarment || working;
  const presets = placementsFor(cfg.garment, cfg.sleeve);
  const placement = presets.some((p) => p.id === logo.placement) ? logo.placement : presets[0].id;
  const modeHint = MODES.find((m) => m.id === logo.mode)?.hint;

  const pick = (file) => { if (!blocked && file) logo.upload(file); };

  return (
    <div className="ds-stack">
      <section>
        <h3 className="ds-h3">Placement</h3>
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

      <button type="button" className="ds-drop" data-drag={drag || undefined} disabled={blocked}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!blocked) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
        <NavIcon name="dropzone" size={26}/>
        <strong>{noGarment ? 'Pick a garment first' : working ? 'Working…' : 'Drop a logo or click to browse'}</strong>
        <span>{noGarment ? 'Logos are placed relative to the garment.' : 'PNG, JPG, WEBP or SVG, up to 5 MB'}</span>
      </button>
      <input ref={fileRef} type="file" hidden accept="image/png,image/svg+xml,image/jpeg,image/webp"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}/>

      <StatusCard logo={logo}/>
    </div>
  );
}
