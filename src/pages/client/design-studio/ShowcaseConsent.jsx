// Showcase opt-in for one of the customer's finished designs: explicit consent (what is and is not shared), status, withdraw.
// POST /api/customer/designs/{id}/submit-showcase | withdraw-showcase. Nothing is public until a VFRB manager approves it.
import { useState } from 'react';
import axios from 'axios';
import { Sparkles, EyeOff, Clock, CircleCheck, CircleAlert, Loader2 } from 'lucide-react';

export const SHOWCASE_SHARED = 'The garment, its colours, patterns and details.';
export const SHOWCASE_NOT_SHARED = 'Your design name, logos, printed text, order details, and anything that identifies you or your organisation.';

export default function ShowcaseConsent({ id, status = 'none', note = null, onStatus }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const call = async (action, next) => {
    setBusy(true); setErr('');
    try { await axios.post(`/api/customer/designs/${id}/${action}`); onStatus(id, next); setAsking(false); }
    catch (e) { setErr(e.response?.data?.message ?? 'That did not go through. Nothing changed; try again.'); }
    finally { setBusy(false); }
  };
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const live = status === 'submitted' || status === 'approved';

  return (
    <div className="ds-sc" onClick={(e) => e.stopPropagation()}>
      {status === 'submitted' && <p className="ds-sc-st"><Clock size={13} aria-hidden="true" />Waiting for VFRB review</p>}
      {status === 'approved' && <p className="ds-sc-st" data-tone="ok"><CircleCheck size={13} aria-hidden="true" />In the showcase</p>}
      {status === 'rejected' && <p className="ds-sc-st" data-tone="warn"><CircleAlert size={13} aria-hidden="true" />Not approved{note ? `: ${note}` : ''}</p>}

      {live ? (
        <button type="button" className="ds-sc-btn" disabled={busy} onClick={stop(() => call('withdraw-showcase', 'none'))}>
          {busy ? <Loader2 size={13} className="ds-sc-spin" aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />} Withdraw
        </button>
      ) : !asking ? (
        <button type="button" className="ds-sc-btn" onClick={stop(() => setAsking(true))}>
          <Sparkles size={13} aria-hidden="true" /> {status === 'rejected' ? 'Share again' : 'Share in showcase'}
        </button>
      ) : (
        <div className="ds-sc-ask" role="group" aria-label="Share this design in the showcase">
          <p><b>Shared:</b> {SHOWCASE_SHARED}</p>
          <p><b>Never shared:</b> {SHOWCASE_NOT_SHARED}</p>
          <p>A VFRB manager reviews it first. You can withdraw it at any time.</p>
          <div className="ds-sc-row">
            <button type="button" className="ds-sc-btn primary" disabled={busy} onClick={stop(() => call('submit-showcase', 'submitted'))}>
              {busy ? <Loader2 size={13} className="ds-sc-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />} Share
            </button>
            <button type="button" className="ds-sc-btn" disabled={busy} onClick={stop(() => setAsking(false))}>Cancel</button>
          </div>
        </div>
      )}
      {err && <p className="ds-sc-st" data-tone="error" role="alert"><CircleAlert size={13} aria-hidden="true" />{err}</p>}
      <style>{`
        .ds-sc{display:flex;flex-direction:column;gap:6px;width:100%}
        .ds-sc-st{display:flex;align-items:flex-start;gap:5px;margin:0;font-size:11px;line-height:1.4;color:var(--cx-ink-2)}
        .ds-sc-st svg{flex-shrink:0;margin-top:1px}
        .ds-sc-st[data-tone=ok]{color:var(--cx-thread-ink);font-weight:700}
        .ds-sc-st[data-tone=warn]{color:var(--warning-text)}
        .ds-sc-st[data-tone=error]{color:var(--danger-text)}
        .ds-sc-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:0 10px;border-radius:var(--cx-r-sm);
          border:1px solid var(--cx-line-strong);background:var(--cx-card);color:var(--cx-ink);font-size:11px;font-weight:700;cursor:pointer}
        .ds-sc-btn.primary{background:var(--cx-thread);border-color:var(--cx-thread);color:var(--cx-on-thread)}
        .ds-sc-btn:disabled{opacity:.55;cursor:not-allowed}
        .ds-sc-btn:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px}
        .ds-sc-ask{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:var(--cx-r-sm);background:var(--cx-card);border:1px solid var(--cx-line);text-align:left}
        .ds-sc-ask p{margin:0;font-size:11px;line-height:1.45;color:var(--cx-ink-2)}
        .ds-sc-ask b{color:var(--cx-ink)}
        .ds-sc-row{display:flex;gap:6px;flex-wrap:wrap}
        .ds-sc-spin{animation:dspin .7s linear infinite}
        @media (prefers-reduced-motion: reduce){.ds-sc-spin{animation:none}}
      `}</style>
    </div>
  );
}
