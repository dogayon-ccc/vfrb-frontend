// Own profile photo for any role: pick, crop to a square with a live preview, upload (POST /api/profile/photo) or remove (DELETE).
// The crop is drawn to a 512px JPEG in the browser; the server still re-checks type, size and dimensions.
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera, Check, Minus, Plus, Trash2, UserRound, X } from 'lucide-react';
import { ConfirmDialog } from './ui';
import { checkUpload } from '../utils/fileCheck';
import { patchStoredUser } from '../utils/session';
import { coverSize, clampPan, centerPan, zoomAround, cropRect } from '../utils/squareCrop';

const SOURCE_MAX = 10 * 1048576; // the source can be large; the uploaded crop is ~100 KB
const STAGE = 240, PREVIEW = 64, OUT = 512, MIN_SIDE = 64, MAX_ZOOM = 3;

const loadImage = (url) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });

function Cropper({ img, onCancel, onSave, busy }) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(() => centerPan(W, H, STAGE, 1));
  const drag = useRef(null);
  const size = coverSize(W, H, STAGE, zoom);

  const setZoomTo = (z) => { const next = Math.min(MAX_ZOOM, Math.max(1, z)); setPan((p) => zoomAround(p, W, H, STAGE, zoom, next)); setZoom(next); };
  const move = (dx, dy) => setPan((p) => clampPan(p.x + dx, p.y + dy, W, H, STAGE, zoom));

  const onDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; };
  const onMove = (e) => { if (!drag.current) return; move(e.clientX - drag.current.x, e.clientY - drag.current.y); drag.current = { x: e.clientX, y: e.clientY }; };
  const onUp = () => { drag.current = null; };
  const onKey = (e) => {
    const k = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (k) { e.preventDefault(); move(...k); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoomTo(zoom + 0.1); }
    else if (e.key === '-') { e.preventDefault(); setZoomTo(zoom - 0.1); }
  };

  const save = () => {
    const r = cropRect(pan, W, H, STAGE, zoom);
    const out = Math.max(MIN_SIDE, Math.min(OUT, Math.round(r.size)));
    const c = document.createElement('canvas'); c.width = c.height = out;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, out, out); // JPEG has no transparency
    g.drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, out, out);
    c.toBlob((b) => b && onSave(b), 'image/jpeg', 0.9);
  };

  const pic = (scale) => ({ position: 'absolute', left: pan.x * scale, top: pan.y * scale, width: size.w * scale, height: size.h * scale, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' });

  return (
    <div className="pp-crop">
      <div className="pp-stage" tabIndex={0} role="group" aria-label="Crop area. Drag or use the arrow keys to move the photo; plus and minus zoom."
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
        onWheel={(e) => setZoomTo(zoom - e.deltaY * 0.002)}>
        <img src={img.src} alt="" draggable={false} style={pic(1)} />
        <span className="pp-mask" aria-hidden="true" />
      </div>
      <div className="pp-side">
        <div className="pp-prev" aria-hidden="true"><img src={img.src} alt="" style={pic(PREVIEW / STAGE)} /></div>
        <span className="pp-hint">Preview</span>
      </div>
      <div className="pp-zoom">
        <button type="button" className="pp-icon" onClick={() => setZoomTo(zoom - 0.2)} aria-label="Zoom out" disabled={zoom <= 1}><Minus size={16} aria-hidden="true" /></button>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoomTo(Number(e.target.value))} aria-label="Zoom" />
        <button type="button" className="pp-icon" onClick={() => setZoomTo(zoom + 0.2)} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}><Plus size={16} aria-hidden="true" /></button>
      </div>
      <div className="pp-actions">
        <button type="button" className="pp-btn" onClick={onCancel} disabled={busy}><X size={14} aria-hidden="true" /> Cancel</button>
        <button type="button" className="pp-btn pp-primary" onClick={save} disabled={busy}><Check size={14} aria-hidden="true" /> {busy ? 'Saving…' : 'Save photo'}</button>
      </div>
    </div>
  );
}

export default function ProfilePhotoField({ avatar, name, onChange }) {
  const fileRef = useRef(null);
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);

  // Frees the picked file's object URL when the cropper closes.
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.src); }, [img]);

  const apply = (url) => { patchStoredUser({ avatar: url }); onChange?.(url); };

  const pick = async (file) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setErr('');
    const bad = await checkUpload(file, { kinds: ['png', 'jpg', 'webp'], maxBytes: SOURCE_MAX });
    if (bad) { setErr(bad); return; }
    const url = URL.createObjectURL(file);
    try {
      const i = await loadImage(url);
      if (Math.min(i.naturalWidth, i.naturalHeight) < MIN_SIDE) { URL.revokeObjectURL(url); setErr(`Use an image at least ${MIN_SIDE} pixels on each side.`); return; }
      setImg(i);
    } catch { URL.revokeObjectURL(url); setErr('Could not open that image. Choose another one.'); }
  };

  const upload = async (blob) => {
    setBusy(true); setErr('');
    try {
      const fd = new FormData(); fd.append('photo', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      const r = await axios.post('/api/profile/photo', fd, { headers: { 'Content-Type': undefined } });
      apply(r.data.avatar); setImg(null);
    } catch (e) { setErr(e.response?.data?.errors?.photo?.[0] ?? e.response?.data?.message ?? 'Upload failed. Try again.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setErr('');
    try { await axios.delete('/api/profile/photo'); apply(null); setConfirm(false); }
    catch (e) { setErr(e.response?.data?.message ?? 'Could not remove the photo.'); setConfirm(false); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {img ? <Cropper img={img} busy={busy} onCancel={() => setImg(null)} onSave={upload} /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div className="pp-face">
            {avatar ? <img src={avatar} alt={`${name ?? 'Your'} profile photo`} /> : <UserRound size={30} aria-hidden="true" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="pp-btn" aria-disabled={busy}>
                <Camera size={14} aria-hidden="true" /> {avatar ? 'Change photo' : 'Upload photo'}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => pick(e.target.files?.[0])}
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
              </label>
              {avatar && <button type="button" className="pp-btn" onClick={() => setConfirm(true)} disabled={busy}><Trash2 size={14} aria-hidden="true" /> Remove</button>}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>JPG, PNG or WebP. You can crop it to a square next.</span>
          </div>
        </div>
      )}
      {err && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-text)', margin: '8px 0 0' }}>{err}</p>}
      <ConfirmDialog open={confirm} title="Remove your profile photo?" body="Your initials will show instead. You can upload a new photo any time."
        confirmLabel="Remove" busy={busy} onCancel={() => setConfirm(false)} onConfirm={remove} />
      <style>{`
        .pp-face{width:72px;height:72px;border-radius:var(--r-full);overflow:hidden;flex-shrink:0;display:grid;place-items:center;
          background:var(--bg-surface);border:1px solid var(--border);color:var(--text-muted)}
        .pp-face img{width:100%;height:100%;object-fit:cover}
        .pp-btn{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:var(--r-md);
          border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:var(--text-sm);font-weight:600;cursor:pointer}
        .pp-btn:hover{border-color:var(--border-hover)}
        .pp-primary{background:var(--teal);border-color:var(--teal);color:var(--on-teal)}
        .pp-primary:hover{border-color:var(--teal-dark)}
        .pp-btn:focus-within,.pp-btn:focus-visible,.pp-icon:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px}
        .pp-btn[aria-disabled=true],.pp-btn:disabled,.pp-icon:disabled{opacity:.6;cursor:not-allowed}
        .pp-crop{display:grid;grid-template-columns:${STAGE}px auto;gap:12px 16px;align-items:start;justify-content:start}
        .pp-stage{position:relative;width:${STAGE}px;height:${STAGE}px;overflow:hidden;border-radius:var(--r-md);background:var(--bg-surface);
          cursor:grab;touch-action:none}
        .pp-stage:active{cursor:grabbing}
        .pp-stage:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px}
        .pp-mask{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 999px rgb(0 0 0 / .45);border:2px solid rgb(255 255 255 / .85);pointer-events:none}
        .pp-side{display:flex;flex-direction:column;align-items:center;gap:6px}
        .pp-prev{position:relative;width:${PREVIEW}px;height:${PREVIEW}px;border-radius:50%;overflow:hidden;background:var(--bg-surface);border:1px solid var(--border)}
        .pp-hint{font-size:var(--text-xs);color:var(--text-muted)}
        .pp-zoom{grid-column:1;display:flex;align-items:center;gap:8px}
        .pp-zoom input{flex:1;accent-color:var(--teal);min-height:44px}
        .pp-icon{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:var(--r-md);border:1px solid var(--border);
          background:var(--bg-card);color:var(--text);cursor:pointer}
        .pp-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
        @media (max-width:420px){.pp-crop{grid-template-columns:${STAGE}px}.pp-side{flex-direction:row}}
      `}</style>
    </div>
  );
}
