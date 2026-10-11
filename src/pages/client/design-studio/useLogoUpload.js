// Single source of truth for uploads (logos and "Upload my design"): validation by content (uploadGuard), background removal,
// placement, and a visible status for every outcome. Shared by the Assets panel, the canvas file-drop and the first-run upload tile.
// Artwork stops at a review step: before/after with "Remove background" (on by default, a toggle back to the original), and
// "Use as: artwork on my garment | reference photo for VFRB". The original upload is always kept.
import { useCallback, useEffect, useRef, useState } from 'react';
import { processLogo } from '../../../lib/logoBackground';
import { prepareUpload, referenceFile } from './uploadGuard';
import { setDesignRef } from '../../../utils/studioHandoff';

const IDLE = { phase: 'idle' };

const toDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error ?? new Error('Could not read the file.'));
  r.readAsDataURL(file);
});

export function useLogoUpload(addLogo) {
  const [mode, setMode] = useState('auto');            // auto | ai | off (logos)
  const [placement, setPlacement] = useState('left_chest');
  const [kind, setKind] = useState('logo');              // logo | artwork (a personal design or reference image)
  const [status, setStatus] = useState(IDLE);
  const busy = useRef(false);
  const urls = useRef([]);
  const keepUrl = (f) => { const u = URL.createObjectURL(f); urls.current.push(u); return u; };
  const freeUrls = () => { urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current = []; };
  useEffect(() => freeUrls, []);

  const place = useCallback(async (file, info, art = kind === 'artwork') => {
    const dataUrl = await toDataUrl(file);
    addLogo(dataUrl, art ? 'center_chest' : placement, null, art ? { artwork: true } : null);
    setStatus({ phase: 'done', preview: dataUrl, artwork: art, ...info });
  }, [addLogo, placement, kind]);

  // Artwork: remove the background ('auto' instant/offline, or 'ai' when asked), then wait for the customer's choice.
  const review = useCallback(async (prep, method = 'auto', prev = null) => {
    setStatus({ phase: 'working', method, fileName: prep.original.name, progress: null });
    const res = prep.rasterised ? { status: 'unchanged', message: 'SVG artwork is already transparent.' }
      : await processLogo(prep.file, { mode: method, onProgress: (progress) => setStatus((s) => (s.phase === 'working' ? { ...s, progress } : s)) });
    const removed = res.status === 'removed';
    setStatus({ phase: 'review', prep, fileName: prep.original.name, before: prev?.before ?? keepUrl(prep.file),
      after: removed ? keepUrl(res.file) : null, cut: removed ? res.file : null, removeBg: removed, method,
      note: res.message, canAi: !removed && method !== 'ai' && (res.code === 'NO_SOLID_BG' || res.code === 'OVER_REMOVED'), useAs: prev?.useAs ?? 'artwork' });
  }, []);

  const run = useCallback(async (file, runMode = mode) => {
    if (!file || busy.current) return;
    busy.current = true;
    freeUrls();
    try {
      setStatus({ phase: 'working', method: 'check', fileName: file.name, progress: null });
      const prep = await prepareUpload(file, kind === 'artwork' ? 'artwork' : 'logo');
      if (!prep.ok) { setStatus({ phase: 'error', code: prep.code, message: prep.message, fileName: file.name }); return; }
      if (kind === 'artwork') { await review(prep); return; }
      if (prep.rasterised || runMode === 'off') {
        await place(prep.file, { method: 'none', fileName: file.name, message: prep.rasterised ? 'SVG converted to a transparent PNG (scripts and links are never kept).' : 'Added as-is (background removal is off).' });
        return;
      }
      setStatus({ phase: 'working', method: runMode, fileName: file.name, progress: null });
      const res = await processLogo(prep.file, { mode: runMode, onProgress: (progress) => setStatus((s) => (s.phase === 'working' ? { ...s, progress } : s)) });
      if (res.status === 'failed') { setStatus({ phase: 'error', code: res.code, message: res.message, method: runMode, file: prep.file, fileName: file.name }); return; }
      await place(res.file, { method: res.method, message: res.message, fileName: file.name, changed: res.status === 'removed' });
    } catch (e) {
      setStatus({ phase: 'error', code: 'UNKNOWN', message: e?.message || 'Something went wrong.', method: runMode, file, fileName: file.name });
    } finally {
      busy.current = false;
    }
  }, [mode, place, kind, review]);

  // Review step controls.
  const setRemoveBg = useCallback((on) => setStatus(s => (s.phase === 'review' && s.cut ? { ...s, removeBg: on } : s)), []);
  const setUseAs = useCallback((useAs) => setStatus(s => (s.phase === 'review' ? { ...s, useAs } : s)), []);
  const tryAi = useCallback(async () => {
    if (status.phase !== 'review' || busy.current) return;
    busy.current = true;
    try { await review(status.prep, 'ai', status); } finally { busy.current = false; }
  }, [status, review]);
  const confirm = useCallback(async () => {
    if (status.phase !== 'review' || busy.current) return;
    busy.current = true;
    const s = status;
    try {
      if (s.useAs === 'reference') {
        const ref = await referenceFile(s.prep); // the original when it is a JPG or PNG
        setDesignRef(ref);
        setStatus({ phase: 'reference', preview: s.before, fileName: ref.name,
          message: 'Attached as a reference photo for VFRB. It goes with your order as its reference image; it is not printed on the garment.' });
        return;
      }
      const useCut = s.removeBg && s.cut;
      await place(useCut ? s.cut : s.prep.file, { method: useCut ? s.method : 'none', fileName: s.fileName, changed: !!useCut,
        message: useCut ? 'Placed with the background removed. Canvas Undo removes it.' : 'Placed exactly as uploaded.' }, true);
    } finally { busy.current = false; }
  }, [status, place]);

  const addOriginal = useCallback(async () => {
    if (!status.file || busy.current) return;
    busy.current = true;
    try { await place(status.file, { method: 'none', fileName: status.fileName, message: 'Added the original image (background kept).' }); }
    finally { busy.current = false; }
  }, [status, place]);

  const retry = useCallback((nextMode) => {
    if (!status.file) return;
    if (nextMode) setMode(nextMode);
    run(status.file, nextMode ?? status.method);
  }, [status, run]);

  const dismiss = useCallback(() => { setStatus(IDLE); }, []);

  return { mode, setMode, kind, setKind, placement, setPlacement, status, upload: run, addOriginal, retry, dismiss, setRemoveBg, setUseAs, tryAi, confirm };
}
