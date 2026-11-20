// Technical specifications of one fabric: view for everyone who can open it, edit and verify for the manager only.
// Unknown stays unknown. Only changed fields are sent; the server clears verification on any value write.
import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import Badge from '../ui/Badge';
import { ErrorBlock } from './AdminUI';
import {
  SPEC_SOURCES, CONSTRUCTIONS, DIRECTIONS, MAX_FIBERS, NUMERIC,
  type SpecRow, type SpecForm, parseFibers, parseProvenance, specState, hasAnySpec, num,
  toForm, changedFields, buildPayload, verifyOnlyPayload, saveBlockers, validate,
} from '../../utils/materialSpecs';

const SOURCE_LABEL = Object.fromEntries(SPEC_SOURCES) as Record<string, string>;
const ATTR_PROV: Record<string, string> = { fibers: 'fiber_composition', gsm: 'gsm', width: 'usable_width_cm', stretch: 'stretch_pct', construction: 'construction', finish: 'finish', shrinkage: 'shrinkage_pct', fastness: 'colourfastness_grade' };
const fmtDate = (iso?: string | null) => { const d = iso ? new Date(iso) : null; return d && !isNaN(+d) ? d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : null; };
const apiMsg = (e: any, fb: string): string => {
  const errs = e?.response?.data?.errors;
  const all = errs ? (Object.values(errs).flat() as string[]) : [];
  return all.length ? all.join(' ') : e?.response?.data?.message ?? fb;
};

export function SpecStateBadge({ row }: { row: SpecRow | null | undefined }) {
  const s = specState(row);
  if (s === 'verified') return <Badge tone="success">Specs verified</Badge>;
  if (s === 'unverified') return <Badge tone="warning">Specs unverified</Badge>;
  return <Badge tone="neutral">Specs not recorded</Badge>;
}

// ── Read-only view ──────────────────────────────────────────────────────────
function SpecView({ row }: { row: SpecRow }) {
  const prov = parseProvenance(row.spec_provenance);
  const fibers = parseFibers(row.fiber_composition);
  const verified = !!row.spec_verified_at;
  const val = (v: unknown, unit: string) => (num(v) === null ? null : `${num(v)} ${unit}`);
  const items: [string, string, string | null][] = [
    ['Fibre composition', 'fibers', fibers.length ? fibers.map((f) => `${f.pct}% ${f.fiber}`).join(', ') : null],
    ['Weight', 'gsm', val(row.gsm, 'gsm')],
    ['Usable width', 'width', val(row.usable_width_cm, 'cm')],
    ['Construction', 'construction', row.construction || null],
    ['Finish', 'finish', row.finish?.trim() || null],
    ['Stretch', 'stretch', num(row.stretch_pct) === null ? null : `${num(row.stretch_pct)}%${row.stretch_direction ? ` · ${row.stretch_direction}` : ''}`],
    ['Shrinkage', 'shrinkage', val(row.shrinkage_pct, '%')],
    ['Colourfastness', 'fastness', val(row.colourfastness_grade, '/ 5')],
  ];
  return (
    <dl className="ms-view">
      {items.map(([label, key, value]) => {
        const p = prov[ATTR_PROV[key]];
        return (
          <div key={key} className="ms-row">
            <dt>{label}</dt>
            <dd>
              {value === null ? <span className="ms-unknown">Not recorded</span> : <>
                <b>{value}</b>
                <span className="ms-meta">
                  {verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
                  {p?.source && <> {SOURCE_LABEL[p.source] ?? p.source}{p.reference ? ` · ${p.reference}` : ''}</>}
                </span>
              </>}
            </dd>
          </div>
        );
      })}
      <div className="ms-row ms-verify">
        <dt>Verification</dt>
        <dd>{verified
          ? <>Checked by manager #{row.spec_verified_by ?? '?'}{fmtDate(row.spec_verified_at) ? ` on ${fmtDate(row.spec_verified_at)}` : ''}. Covers every value above at that time.</>
          : hasAnySpec(row) ? 'Recorded values have not been checked yet.' : 'Nothing recorded yet. The AI treats every property as unknown.'}</dd>
      </div>
    </dl>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────
export default function MaterialSpecSection({ item, canEdit, onSaved, onDirty }: {
  item: SpecRow & { material_id: number; material_name?: string };
  canEdit: boolean;
  onSaved?: (row: SpecRow, message: string) => void;
  onDirty?: (dirty: boolean) => void;
}) {
  const [row, setRow] = useState<SpecRow>(item);
  const stored = useMemo<SpecForm>(() => toForm(row), [row]);
  const [form, setForm] = useState<SpecForm>(stored);
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const changed = useMemo(() => changedFields(form, stored), [form, stored]);
  const dirty = changed.length > 0;
  const blockers = useMemo(() => (dirty ? saveBlockers(form, stored) : []), [form, stored, dirty]);
  const issues = useMemo(() => validate(form), [form]);
  const issue = (f: string) => issues.find((i) => i.field === f)?.message;
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);

  const set = <K extends keyof SpecForm>(k: K, v: SpecForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setFiber = (i: number, k: 'fiber' | 'pct', v: string) => setForm((f) => ({ ...f, fibers: f.fibers.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const fiberTotal = form.fibers.reduce((s, f) => s + (num(f.pct) ?? 0), 0);

  const send = async (payload: Record<string, unknown>, message: string) => {
    setBusy(true); setErr('');
    try {
      const { data } = await axios.put(`/api/admin/materials/${item.material_id}`, payload);
      setRow(data); setForm(toForm(data)); setVerify(false);
      onSaved?.(data, message);
    } catch (e) { setErr(apiMsg(e, 'Could not save the specifications.')); }
    finally { setBusy(false); }
  };
  const save = () => send(buildPayload(form, stored, { verify }), verify ? 'Specifications saved and verified.' : 'Specifications saved. Not verified yet.');
  const verifyStored = () => send(verifyOnlyPayload(), 'Specifications verified.');
  const discard = () => { setForm(stored); setVerify(false); setErr(''); };

  const wasVerified = !!row.spec_verified_at;
  const num_ = (key: 'gsm' | 'usable_width' | 'stretch_pct' | 'shrinkage_pct' | 'colourfastness_grade', label: string, hint: string, issueKey: string, unit?: JSX.Element) => (
    <label className="ms-f">
      <span className="adm-field">{label}</span>
      <span className="ms-inline">
        <input className="adm-input" type="number" inputMode="decimal" step="0.1" value={form[key]} placeholder="Not recorded"
          onChange={(e) => set(key, e.target.value)} aria-invalid={!!issue(issueKey)} />
        {unit}
      </span>
      <span className={`mat-hint${issue(issueKey) ? ' ms-bad' : ''}`}>{issue(issueKey) ?? hint}</span>
    </label>
  );

  return (
    <section className="ms" aria-label="Technical specifications">
      <style>{`
        .ms{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border);border-radius:var(--radius);padding:14px;background:var(--bg-card)}
        .ms-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
        .ms-head h3{margin:0;font-size:14px;font-weight:800;color:var(--ink)}
        .ms-view{margin:0;display:flex;flex-direction:column}
        .ms-row{display:grid;grid-template-columns:130px 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--border)}
        .ms-row:first-child{border-top:0}
        .ms-row dt{font-size:12px;font-weight:700;color:var(--text-subtle)}
        .ms-row dd{margin:0;font-size:13px;color:var(--ink);display:flex;flex-direction:column;gap:3px}
        .ms-meta{font-size:12px;color:var(--text-subtle);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        .ms-unknown{color:var(--text-subtle);font-style:italic}
        .ms-grid{display:grid;gap:12px;grid-template-columns:1fr}
        @media(min-width:521px){.ms-grid{grid-template-columns:1fr 1fr}}
        .ms-f{display:block}
        .ms-inline{display:flex;gap:6px}
        .ms-inline .adm-input{min-width:0;flex:1}
        .ms-inline select.adm-input{flex:0 0 auto;width:auto}
        .ms-bad{color:var(--danger-text)}
        .ms-fiber{display:grid;grid-template-columns:1fr 88px 36px;gap:6px;margin-bottom:6px}
        .ms-note{margin:0;padding:8px 10px;border-radius:var(--radius);background:var(--warning-bg);color:var(--warning-text);font-size:12px;line-height:1.4}
        .ms-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4}
        .ms-check input{margin-top:3px}
        .ms-actions{display:flex;gap:8px;flex-wrap:wrap}
        @media(max-width:520px){.ms-row{grid-template-columns:1fr}.ms-actions .adm-btn{flex:1 1 auto;justify-content:center}}
      `}</style>

      <div className="ms-head">
        <h3>Technical specifications</h3>
        <SpecStateBadge row={row} />
      </div>

      {!canEdit ? <SpecView row={row} /> : <>
        <p className="mat-hint" style={{ margin: 0 }}>
          Enter only what a datasheet or measurement states. Leave a field empty if it is unknown; empty never means zero.
          The AI uses these to compare fabrics. They are not shown to customers.
        </p>

        <div>
          <span className="adm-field">Fibre composition</span>
          {form.fibers.map((f, i) => (
            <div className="ms-fiber" key={i}>
              <input className="adm-input" value={f.fiber} onChange={(e) => setFiber(i, 'fiber', e.target.value)} placeholder="e.g. cotton" aria-label={`Fibre ${i + 1} name`} maxLength={40} />
              <input className="adm-input" type="number" inputMode="decimal" step="0.1" min={0} max={100} value={f.pct} onChange={(e) => setFiber(i, 'pct', e.target.value)} placeholder="%" aria-label={`Fibre ${i + 1} percent`} />
              <button type="button" className="adm-btn" style={{ padding: 0, justifyContent: 'center' }} aria-label={`Remove fibre ${i + 1}`}
                onClick={() => set('fibers', form.fibers.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <div className="ms-actions" style={{ alignItems: 'center' }}>
            <button type="button" className="adm-btn" disabled={form.fibers.length >= MAX_FIBERS} onClick={() => set('fibers', [...form.fibers, { fiber: '', pct: '' }])}>Add fibre</button>
            {form.fibers.length > 0 && <span className={`mat-hint${issue('fiber_composition') ? ' ms-bad' : ''}`} style={{ margin: 0 }} aria-live="polite">
              {issue('fiber_composition') ?? `Total ${Math.round(fiberTotal * 10) / 10}%`}
            </span>}
          </div>
        </div>

        <div className="ms-grid">
          {num_('gsm', 'Weight', `${NUMERIC.gsm.min}–${NUMERIC.gsm.max} gsm. Saved as gsm.`, 'gsm',
            <select className="adm-input" value={form.gsm_unit} onChange={(e) => set('gsm_unit', e.target.value as any)} aria-label="Weight unit"><option value="gsm">gsm</option><option value="oz_yd2">oz/yd²</option></select>)}
          {num_('usable_width', 'Usable width', `${NUMERIC.usable_width_cm.min}–${NUMERIC.usable_width_cm.max} cm. Saved as cm.`, 'usable_width_cm',
            <select className="adm-input" value={form.usable_width_unit} onChange={(e) => set('usable_width_unit', e.target.value as any)} aria-label="Width unit"><option value="cm">cm</option><option value="in">in</option><option value="m">m</option></select>)}
          <label className="ms-f"><span className="adm-field">Construction</span>
            <select className="adm-input" value={form.construction} onChange={(e) => set('construction', e.target.value)}>
              <option value="">Not recorded</option>{CONSTRUCTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label className="ms-f"><span className="adm-field">Finish</span>
            <input className="adm-input" value={form.finish} maxLength={60} placeholder="Not recorded" onChange={(e) => set('finish', e.target.value)} />
            <span className="mat-hint">e.g. soil release, antimicrobial. Up to 60 characters.</span></label>
          {num_('stretch_pct', 'Stretch', `${NUMERIC.stretch_pct.min}–${NUMERIC.stretch_pct.max} %. Clear this and the direction to mark stretch unknown.`, 'stretch_pct')}
          <label className="ms-f"><span className="adm-field">Stretch direction</span>
            <select className="adm-input" value={form.stretch_direction} onChange={(e) => set('stretch_direction', e.target.value)}>
              <option value="">Not recorded</option>{DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {issue('stretch_direction') && <span className="mat-hint ms-bad">{issue('stretch_direction')}</span>}</label>
          {num_('shrinkage_pct', 'Shrinkage', `${NUMERIC.shrinkage_pct.min} to ${NUMERIC.shrinkage_pct.max} %.`, 'shrinkage_pct')}
          {num_('colourfastness_grade', 'Colourfastness', `Grade ${NUMERIC.colourfastness_grade.min}–${NUMERIC.colourfastness_grade.max}.`, 'colourfastness_grade')}
        </div>

        {dirty && <>
          <div className="ms-grid">
            <label className="ms-f"><span className="adm-field">Source of these values *</span>
              <select className="adm-input" value={form.spec_source} onChange={(e) => set('spec_source', e.target.value as any)}>
                <option value="">Choose a source</option>{SPEC_SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></label>
            <label className="ms-f"><span className="adm-field">Document or reference</span>
              <input className="adm-input" value={form.spec_reference} maxLength={200} placeholder="e.g. datasheet number" onChange={(e) => set('spec_reference', e.target.value)} /></label>
          </div>
          <p className="mat-hint" style={{ margin: 0 }}>One source applies to every value changed in this save ({changed.length} changed). Values from different sources need separate saves.</p>
          <label className="ms-check"><input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
            <span>Verify these values. I checked every recorded value on this fabric against its source.</span></label>
          {!verify && wasVerified && <p className="ms-note" role="status">This fabric is verified. Saving without ticking Verify will clear its verification.</p>}
          {blockers.length > 0 && <p className="ms-note" role="status">{blockers.join(' ')}</p>}
        </>}

        {err && <ErrorBlock msg={err} />}
        <div className="ms-actions">
          <button type="button" className="adm-btn primary" onClick={save} disabled={busy || !dirty || blockers.length > 0}>{busy ? 'Saving…' : verify ? 'Save and verify' : 'Save specifications'}</button>
          {!dirty && hasAnySpec(row) && !wasVerified && <button type="button" className="adm-btn" onClick={verifyStored} disabled={busy}>Verify as recorded</button>}
          {dirty && <button type="button" className="adm-btn" onClick={discard} disabled={busy}>Discard changes</button>}
        </div>
        {wasVerified && !dirty && <SpecView row={row} />}
        {!wasVerified && hasAnySpec(row) && !dirty && <SpecView row={row} />}
      </>}
    </section>
  );
}
