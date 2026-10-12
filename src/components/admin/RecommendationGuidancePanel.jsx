// Manager-editable guidance that grounds the AI material recommendation prompt.
// Rules say which materials suit a use or garment; the API rejects quantities and prices.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Panel, SkeletonRows, EmptyBlock, ErrorBlock } from './AdminUI';

const EMPTY = { scope_category: '', scope_garment: '', rule: '' };
const scopeLabel = (g) => [g.scope_category, g.scope_garment].filter(Boolean).join(' · ') || 'All orders';

export default function RecommendationGuidancePanel({ setToast }) {
  const [rules, setRules] = useState(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    return axios.get('/api/admin/recommendation-guidance')
      .then((r) => setRules(r.data?.data ?? []))
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const fail = (e, fallback) => setToast({ type: 'error', msg: e.response?.data?.message ?? fallback });

  const add = async (e) => {
    e.preventDefault();
    if (form.rule.trim().length < 5) return;
    setBusy(true);
    try {
      await axios.post('/api/admin/recommendation-guidance', form);
      setForm(EMPTY);
      setToast({ type: 'success', msg: 'Guidance added. New recommendations will use it.' });
      await load();
    } catch (err) { fail(err, 'Could not add this guidance.'); }
    finally { setBusy(false); }
  };

  const toggle = async (g) => {
    setBusy(true);
    try {
      await axios.put(`/api/admin/recommendation-guidance/${g.guidance_id}`, { ...g, is_active: !g.is_active });
      await load();
    } catch (err) { fail(err, 'Could not update this guidance.'); }
    finally { setBusy(false); }
  };

  return (
    <Panel title="AI material guidance">
      <p className="adm-sub" style={{ marginTop: -6 }}>
        Rules the AI follows when it recommends raw materials, for example what suits medical or hospitality uniforms.
        Describe suitability only. Quantities, prices and formulas are rejected.
      </p>

      {rules === null && !failed ? <SkeletonRows rows={2} h={34} />
        : failed ? <ErrorBlock msg="Could not load guidance." onRetry={load} />
        : rules.length === 0 ? <EmptyBlock>No guidance yet. The AI uses the approved catalog and the design only.</EmptyBlock>
        : (
          <ul className="adm-guide-list">
            {rules.map((g) => (
              <li key={g.guidance_id} className={g.is_active ? '' : 'off'}>
                <div style={{ minWidth: 0 }}>
                  <span className="adm-chip">{scopeLabel(g)}</span>
                  <p>{g.rule}</p>
                </div>
                <button type="button" className="adm-btn" disabled={busy} onClick={() => toggle(g)}>
                  {g.is_active ? 'Retire' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        )}

      <form onSubmit={add} className="adm-guide-form">
        <input className="adm-input" placeholder="Use category (optional), e.g. medical" maxLength={60}
          value={form.scope_category} onChange={(e) => setForm({ ...form, scope_category: e.target.value })} aria-label="Use category" />
        <input className="adm-input" placeholder="Garment (optional), e.g. Scrub Top" maxLength={80}
          value={form.scope_garment} onChange={(e) => setForm({ ...form, scope_garment: e.target.value })} aria-label="Garment" />
        <textarea className="adm-input" rows={2} maxLength={500} required placeholder="e.g. Prefer fluid-resistant poly-cotton for clinical wear."
          value={form.rule} onChange={(e) => setForm({ ...form, rule: e.target.value })} aria-label="Guidance rule" />
        <button type="submit" className="adm-btn primary" disabled={busy || form.rule.trim().length < 5}>Add guidance</button>
      </form>
    </Panel>
  );
}
