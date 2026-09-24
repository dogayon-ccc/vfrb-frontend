// Single source of truth for logo uploads: validation, background removal, placement, and a
// visible status for every outcome. Shared by the Assets panel and the canvas file-drop.
import { useCallback, useRef, useState } from 'react';
import { processLogo } from '../../../lib/logoBackground';

const OK_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const IDLE = { phase: 'idle' };

const toDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error ?? new Error('Could not read the file.'));
  r.readAsDataURL(file);
});

export function useLogoUpload(addLogo) {
  const [mode, setMode] = useState('auto');            // auto | ai | off
  const [placement, setPlacement] = useState('left_chest');
  const [status, setStatus] = useState(IDLE);
  const busy = useRef(false);

  const place = useCallback(async (file, info) => {
    const dataUrl = await toDataUrl(file);
    addLogo(dataUrl, placement);
    setStatus({ phase: 'done', preview: dataUrl, ...info });
  }, [addLogo, placement]);

  const run = useCallback(async (file, runMode = mode) => {
    if (!file || busy.current) return;
    if (!OK_TYPES.includes(file.type)) { setStatus({ phase: 'error', code: 'TYPE', message: 'Use a PNG, JPG, WEBP or SVG file.' }); return; }
    if (file.size > MAX_BYTES) { setStatus({ phase: 'error', code: 'SIZE', message: 'That file is over 5 MB. Choose a smaller one.' }); return; }
    busy.current = true;
    try {
      if (file.type === 'image/svg+xml' || runMode === 'off') {
        await place(file, { method: 'none', fileName: file.name,
          message: file.type === 'image/svg+xml' ? 'SVG logos are already transparent.' : 'Added as-is (background removal is off).' });
        return;
      }
      setStatus({ phase: 'working', method: runMode, fileName: file.name, progress: null });
      const res = await processLogo(file, {
        mode: runMode,
        onProgress: (progress) => setStatus((s) => (s.phase === 'working' ? { ...s, progress } : s)),
      });
      if (res.status === 'failed') {
        setStatus({ phase: 'error', code: res.code, message: res.message, method: runMode, file, fileName: file.name });
        return;
      }
      await place(res.file, { method: res.method, message: res.message, fileName: file.name, changed: res.status === 'removed' });
    } catch (e) {
      setStatus({ phase: 'error', code: 'UNKNOWN', message: e?.message || 'Something went wrong.', method: runMode, file, fileName: file.name });
    } finally {
      busy.current = false;
    }
  }, [mode, place]);

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

  const dismiss = useCallback(() => setStatus(IDLE), []);

  return { mode, setMode, placement, setPlacement, status, upload: run, addOriginal, retry, dismiss };
}
