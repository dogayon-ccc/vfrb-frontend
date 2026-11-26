// Production print files: the customer sets the real print width of each artwork item, then downloads a ZIP of 300 DPI transparent PNGs
// (plus a production sheet PDF) or just the sheet. Nothing is exported without a size the customer entered; garment measurements are
// VFRB-internal and never appear here.
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, AlertTriangle } from 'lucide-react';
import useDialogFocus from '../../../hooks/useDialogFocus';
import { buildPrintPlan, parsePrintWidth, qualityNote, PRINT_MIN_CM, PRINT_MAX_CM, PRINT_DPI, type FaceMetrics } from './print/printSpec.ts';
import { buildProductionPackage, buildSetPackage } from './print/printExport';
import { ROLE_TITLE } from './print/printSet.ts';
import { downloadBlobOrUrl } from './designExport';

export interface PrintCapture { faces: Array<{ face: 'front' | 'back'; label: string; url: string }>; facesJSON: Record<string, any[]>; metrics: Record<string, FaceMetrics | null | undefined> }

const TONE: Record<string, string> = { ok: '#0a7f5a', vector: '#0a7f5a', low: '#b45309', poor: '#b91c1c', unsized: 'var(--text-muted)' };

// pieces: one entry for a single garment, two (top, bottom) for a uniform set. Each carries its own capture and its own print-size map.
export interface PrintPiece { role: 'top' | 'bottom'; garment: string; capture: PrintCapture | null; sizes: Record<string, number> }

export default function PrintFilesDialog({ pieces, onSizes, meta, fileBase, onClose }: { pieces: PrintPiece[]; onSizes: (role: 'top' | 'bottom', fn: (p: Record<string, number>) => Record<string, number>) => void; meta: any; fileBase: string; onClose: () => void }) {
  const isSet = pieces.length > 1;
  const ref = useRef(null);
  useDialogFocus(ref, { onClose } as any);
  const [busy, setBusy] = useState<null | 'zip' | 'pdf'>(null);
  const [msg, setMsg] = useState<null | { tone: 'ok' | 'err'; text: string }>(null);
  const [draft, setDraft] = useState<Record<string, string>>({}); // what is typed, so "8." and "" are not rewritten under the cursor

  const plans = useMemo(() => pieces.map(p => (p.capture ? buildPrintPlan(p.capture.facesJSON, p.sizes, p.capture.metrics) : null)), [pieces]);

  const setWidth = (role: 'top' | 'bottom', id: string, raw: string) => {
    setDraft(d => ({ ...d, [`${role}:${id}`]: raw }));
    const w = parsePrintWidth(raw);
    onSizes(role, (p: Record<string, number>) => { const n = { ...p }; if (w == null) delete n[id]; else n[id] = w; return n; });
  };

  const run = async (kind: 'zip' | 'pdf') => {
    if (busy || pieces.some(p => !p.capture)) return;
    setBusy(kind); setMsg(null);
    try {
      const r: any = isSet
        ? await buildSetPackage(pieces.map(p => ({ role: p.role, garment: p.garment, input: { ...p.capture!, sizes: p.sizes, meta: { ...meta, garment: p.garment } } })), meta)
        : await buildProductionPackage({ ...pieces[0].capture!, sizes: pieces[0].sizes, meta });
      if (!r.exported) { setMsg({ tone: 'err', text: r.failed.length ? 'Those prints could not be rendered. Try a smaller print size.' : 'Enter a print width for at least one item first.' }); return; }
      downloadBlobOrUrl(kind === 'zip' ? r.zip : r.pdf, `${fileBase}-${kind === 'zip' ? 'print-files.zip' : 'production-sheet.pdf'}`);
      const extra = [r.skipped.length && `${r.skipped.length} without a size were left out`, r.failed.length && `${r.failed.length} could not be rendered`, r.lowRes.length && `${r.lowRes.length} below 300 DPI`].filter(Boolean).join('; ');
      const split = isSet ? ` (${pieces.map(p => `${ROLE_TITLE[p.role]} ${r.perPiece?.[p.role] ?? 0}`).join(', ')})` : '';
      setMsg({ tone: 'ok', text: `${r.exported} print file${r.exported === 1 ? '' : 's'} ready${split}${extra ? `; ${extra}` : ''}.` });
    } catch { setMsg({ tone: 'err', text: 'Could not build the print files. Please try again.' }); }
    finally { setBusy(null); }
  };

  const ready = plans.reduce((n, p) => n + (p?.ready.length ?? 0), 0);
  const total = plans.reduce((n, p) => n + (p?.items.length ?? 0), 0), loading = plans.some(p => !p), pendingAny = plans.some(p => (p?.pending.length ?? 0) > 0);
  const inp: any = { width: 74, padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--ink)', minHeight: 44, boxSizing: 'border-box' };
  const btn = (primary: boolean): any => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '0 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: busy || !ready ? 'not-allowed' : 'pointer', opacity: !ready ? 0.5 : 1,
    border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--teal, #028090)' : 'transparent', color: primary ? '#fff' : 'var(--ink)', flex: '1 1 160px' });

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 'var(--cx-z-modal)', boxSizing: 'border-box' }} onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="pf-title" tabIndex={-1} onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', color: 'var(--ink)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column', outline: 'none', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="pf-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{isSet ? 'Production print files: top and bottom' : 'Production print files'}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Set the real printed width of each item. Files are transparent PNGs at {PRINT_DPI} DPI, sized exactly as entered ({PRINT_MIN_CM}&ndash;{PRINT_MAX_CM} cm wide).</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', color: 'var(--ink)', cursor: 'pointer' }}><X size={18} aria-hidden="true"/></button>
        </header>

        <div style={{ overflowY: 'auto', padding: '0 20px 8px' }}>
          {loading && <p role="status" style={{ fontSize: 14, color: 'var(--text-muted)' }}>Reading your design&hellip;</p>}
          {!loading && total === 0 && <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nothing to print yet. Add artwork, text, a shape or a drawing in the Studio first. Pockets and hidden layers are not print files.</p>}
          {!loading && pieces.map((pc, pi) => { const plan = plans[pi]!; return (
            <section key={pc.role} aria-label={isSet ? `${ROLE_TITLE[pc.role]}: ${pc.garment}` : undefined} style={{ marginBottom: 14 }}>
              {isSet && <h3 style={{ margin: '4px 0 8px', fontSize: 14, fontWeight: 800 }}>{ROLE_TITLE[pc.role]} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>&middot; {pc.garment}</span></h3>}
              {isSet && plan.items.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No artwork on this piece. It adds no print files.</p>}
              {plan.items.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {plan.items.map(it => { const k = `${pc.role}:${it.id}`; return (
                    <li key={k} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' }}>{it.label}</div>
                        <div style={{ fontSize: 12, color: TONE[it.quality], display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 2 }}>
                          {(it.quality === 'low' || it.quality === 'poor') && <AlertTriangle size={13} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}/>}
                          <span>{it.face === 'front' ? 'Front' : 'Back'} &middot; {qualityNote(it)}</span>
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Width</span>
                        <input style={inp} inputMode="decimal" aria-label={`Print width in cm for ${isSet ? ROLE_TITLE[pc.role] + ' ' : ''}${it.label}`} placeholder="cm" value={draft[k] ?? (it.widthCm ?? '')}
                          aria-invalid={draft[k] ? parsePrintWidth(draft[k]) == null : undefined} onChange={e => setWidth(pc.role, it.id, e.target.value)}/>
                        <span style={{ color: 'var(--text-muted)' }}>cm</span>
                      </label>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 78 }}>{it.heightCm != null ? `\u00d7 ${it.heightCm} cm` : ''}</div>
                    </li>); })}
                </ul>
              )}
            </section>); })}
          {!loading && pendingAny && total > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '10px 0 0' }}>Items without a width are left out of the files. They are listed on the sheet as not exported.</p>}
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '10px 0 4px' }}>Position on the sheet is each print&rsquo;s place on the drawn garment, shown as a percentage. VFRB confirms garment size and exact placement before production.</p>
        </div>

        <footer style={{ padding: '12px 20px 18px', display: 'grid', gap: 10 }}>
          {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} style={{ margin: 0, fontSize: 13, color: msg.tone === 'err' ? '#b91c1c' : '#0a7f5a' }}>{msg.text}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" style={btn(true)} disabled={!ready || !!busy} aria-busy={busy === 'zip'} onClick={() => run('zip')}><Download size={16} aria-hidden="true"/>{busy === 'zip' ? 'Building files\u2026' : `${isSet ? 'Set print files' : 'Print files'} (.zip)${ready ? ` \u00b7 ${ready}` : ''}`}</button>
            <button type="button" style={btn(false)} disabled={!ready || !!busy} aria-busy={busy === 'pdf'} onClick={() => run('pdf')}><FileText size={16} aria-hidden="true"/>{busy === 'pdf' ? 'Building sheet\u2026' : 'Production sheet (.pdf)'}</button>
          </div>
        </footer>
      </div>
    </div>,
    document.querySelector('.cm-shell') ?? document.body);
}
