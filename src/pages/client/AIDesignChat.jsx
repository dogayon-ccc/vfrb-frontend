// Studio AI design assistant (approved scope: strict B5 design operations only; no Q&A, prices, quantities, sizing or BOM).
// With a garment: POST /api/ai/design-edits returns operations validated against THIS template. From scratch (no garment yet):
// POST /api/ai/describe-design returns a brief that designEdits.briefToStart maps to one real template plus the same operations.
// Nothing is applied until Preview; the Studio re-checks every operation, applies them to the one DesignState (2D and 3D), and
// Undo restores the exact design from before. Every refusal, skip and failure is shown as it happened.
import { useState } from 'react';
import axios from 'axios';
import { Wand2, Eye, Undo2, Check, Box, Loader2, CircleAlert, Info } from 'lucide-react';
import { ZONE_LABEL, LOGO_PRESETS } from './design-studio/dsShared';
import { templateFacts, describeEdit, briefToStart } from './design-studio/designEdits';

const zoneLabel = (z) => ZONE_LABEL[z] ?? z;
const placementLabel = (id) => LOGO_PRESETS.find((p) => p.id === id)?.label ?? id;
const errText = (e, fallback) => (e.response?.status === 429 ? 'Too many AI requests. Wait a minute and try again.' : e.response?.data?.message ?? fallback);

export default function AIDesignChat({ cfg, textItems, ai }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState([]); // { id, ask, plan?: { start, ops, rejected, notes, summary }, error?, done? }
  const scratch = !cfg?.garment;
  const push = (t) => setTurns((l) => [...l.slice(-5), t]);
  const patch = (id, v) => setTurns((l) => l.map((t) => (t.id === id ? { ...t, ...v } : t)));

  const send = async () => {
    const ask = input.trim();
    if (!ask || busy || ai.previewing) return;
    const id = Date.now();
    setBusy(true); setInput('');
    try {
      if (scratch) {
        const { data } = await axios.post('/api/ai/describe-design', { description: ask });
        const s = briefToStart(data?.config, cfg);
        push({ id, ask, plan: { start: s.cfg, ops: s.ops, rejected: s.skipped.map((x) => ({ reason: x.why })), notes: s.notes,
          summary: `Starts from the VFRB ${s.cfg.garment} template${s.cfg.sleeve ? ` (${s.cfg.sleeve.toLowerCase()} sleeve)` : ''}.` } });
      } else {
        const { data } = await axios.post('/api/ai/design-edits', {
          instruction: ask, template: templateFacts(cfg), state: { colors: cfg.colors, patterns: cfg.patterns, texts: textItems() },
        });
        push({ id, ask, plan: { start: null, ops: data.operations ?? [], rejected: data.rejected ?? [], notes: [], summary: data.summary ?? '' } });
      }
    } catch (e) {
      push({ id, ask, error: errText(e, 'The AI request failed. Nothing was changed.') });
    } finally { setBusy(false); }
  };

  const preview = (t) => {
    const r = ai.preview({ start: t.plan.start, ops: t.plan.ops });
    patch(t.id, { done: r.applied || t.plan.start ? 'preview' : 'none', skipped: r.skipped });
  };
  const finish = (t, keep) => { if (keep) ai.keep(); else ai.undo(); patch(t.id, { done: keep ? 'kept' : 'undone' }); };

  return (
    <section className="aic" aria-label="AI design assistant">
      <p className="aic-title"><Wand2 size={14} aria-hidden="true" /> AI design assistant</p>
      <p className="aic-sub">{scratch
        ? 'Describe the uniform. It starts from a real VFRB template, and you preview it before it becomes your design.'
        : `Describe a change. Only this ${cfg.garment}'s own colour zones, patterns and text placements are used.`}</p>

      <ol className="aic-thread" aria-live="polite">
        {turns.map((t) => (
          <li key={t.id} className="aic-turn">
            <p className="aic-ask">{t.ask}</p>
            {t.error && <p className="aic-msg" data-tone="error" role="alert"><CircleAlert size={14} aria-hidden="true" />{t.error}</p>}
            {t.plan && (
              <div className="aic-plan">
                {t.plan.summary && <p className="aic-sub">{t.plan.summary}</p>}
                {t.plan.ops.length > 0
                  ? <ul>{t.plan.ops.map((op, i) => <li key={i}>{describeEdit(op, zoneLabel, placementLabel)}</li>)}</ul>
                  : !t.plan.start && <p className="aic-msg" data-tone="info"><Info size={14} aria-hidden="true" />No change this garment supports was found in that request.</p>}
                {t.plan.notes.map((n, i) => <p key={i} className="aic-msg" data-tone="info"><Info size={14} aria-hidden="true" />{n}</p>)}
                {t.plan.rejected.length > 0 && (
                  <div className="aic-msg" data-tone="warn"><CircleAlert size={14} aria-hidden="true" />
                    <span>Left out ({t.plan.rejected.length}): {t.plan.rejected.map((r) => r.reason).join('; ')}</span></div>
                )}
                {t.skipped?.length > 0 && (
                  <div className="aic-msg" data-tone="warn"><CircleAlert size={14} aria-hidden="true" />
                    <span>Not applied ({t.skipped.length}): {t.skipped.map((s) => s.why).join('; ')}</span></div>
                )}
                {!t.done && (t.plan.ops.length > 0 || t.plan.start) && (
                  <button type="button" className="aic-btn primary" onClick={() => preview(t)} disabled={ai.previewing}>
                    <Eye size={14} aria-hidden="true" /> Preview on the garment</button>
                )}
                {t.done === 'preview' && (
                  <div className="aic-row">
                    <button type="button" className="aic-btn primary" onClick={() => finish(t, true)}><Check size={14} aria-hidden="true" /> Keep</button>
                    <button type="button" className="aic-btn" onClick={() => finish(t, false)}><Undo2 size={14} aria-hidden="true" /> Undo</button>
                    {ai.has3D
                      ? <button type="button" className="aic-btn" onClick={ai.view3D}><Box size={14} aria-hidden="true" /> See it in 3D</button>
                      : <span className="aic-sub">No 3D model for this garment; the 2D design is the preview.</span>}
                  </div>
                )}
                {t.done === 'preview' && ai.editedSince && <p className="aic-msg" data-tone="warn"><CircleAlert size={14} aria-hidden="true" />Undo also removes changes you made after the preview.</p>}
                {t.done === 'kept' && <p className="aic-sub">Kept in your design.</p>}
                {t.done === 'undone' && <p className="aic-sub">Undone. Your design is back to how it was.</p>}
                {t.done === 'none' && <p className="aic-sub">Nothing was applied.</p>}
              </div>
            )}
          </li>
        ))}
      </ol>

      <label htmlFor="aic-input" className="aic-sr">{scratch ? 'Describe the uniform' : 'Change to make'}</label>
      <textarea id="aic-input" className="aic-input" rows={2} maxLength={500} value={input} disabled={busy || ai.previewing}
        placeholder={scratch ? 'e.g. navy school polo with a white collar and SMITH on the chest' : 'e.g. white collar, add SMITH on the back'}
        onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
      {ai.previewing && <p className="aic-sub">Keep or undo the preview before asking for another change.</p>}
      <button type="button" className="aic-btn primary" onClick={send} disabled={busy || ai.previewing || !input.trim()}>
        {busy ? <><Loader2 size={14} className="aic-spin" aria-hidden="true" /> Thinking…</> : <><Wand2 size={14} aria-hidden="true" /> {scratch ? 'Start my design' : 'Suggest edits'}</>}
      </button>

      <style>{`
        .aic{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:var(--cx-r-md);background:var(--cx-thread-tint);border:1px solid var(--cx-line)}
        .aic-title{display:flex;align-items:center;gap:6px;margin:0;font-size:12px;font-weight:700;color:var(--cx-thread-ink)}
        .aic-sub{margin:0;font-size:11px;line-height:1.5;color:var(--cx-ink-2)}
        .aic-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
        .aic-thread{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto}
        .aic-thread:empty{display:none}
        .aic-turn{display:flex;flex-direction:column;gap:6px}
        .aic-ask{margin:0;align-self:flex-end;max-width:90%;padding:6px 10px;border-radius:var(--cx-r-md);background:var(--cx-thread);color:var(--cx-on-thread);font-size:12px;overflow-wrap:anywhere}
        .aic-plan{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:var(--cx-r-sm);background:var(--cx-card);border:1px solid var(--cx-line)}
        .aic-plan ul{margin:0;padding-left:18px;font-size:12px;color:var(--cx-ink);display:flex;flex-direction:column;gap:3px}
        .aic-msg{display:flex;align-items:flex-start;gap:6px;margin:0;font-size:11px;line-height:1.5;color:var(--cx-ink-2)}
        .aic-msg svg{flex-shrink:0;margin-top:2px}
        .aic-msg[data-tone=error]{color:var(--danger-text)}
        .aic-msg[data-tone=warn]{color:var(--warning-text)}
        .aic-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .aic-input{width:100%;box-sizing:border-box;resize:none;padding:8px 10px;border-radius:var(--cx-r-sm);border:1px solid var(--cx-line-strong);background:var(--cx-card);color:var(--cx-ink);font:inherit;font-size:13px}
        .aic-input:focus-visible,.aic-btn:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px}
        .aic-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 12px;border-radius:var(--cx-r-sm);border:1px solid var(--cx-line-strong);background:var(--cx-card);color:var(--cx-ink);font-size:12px;font-weight:700;cursor:pointer}
        .aic-btn.primary{background:var(--cx-thread);border-color:var(--cx-thread);color:var(--cx-on-thread)}
        .aic-btn:disabled{opacity:.55;cursor:not-allowed}
        .aic-spin{animation:dspin .7s linear infinite}
        @media (prefers-reduced-motion: reduce){.aic-spin{animation:none}}
      `}</style>
    </section>
  );
}
