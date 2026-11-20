// What VFRB requires of the fabric for each garment kind. Manager edits; owner sees the same list read-only.
// Saving replaces the whole set for that kind (the API is atomic), so the UI only shows success after the server confirms.
// A required row removes a fabric only on a staff-verified mismatch; unknown values never exclude anything.
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Panel, SkeletonRows, EmptyBlock, ErrorBlock } from './AdminUI';
import Badge from '../ui/Badge';
import {
  GARMENT_KINDS, MAX_ROWS, CONSTRUCTIONS, NUMERIC_ATTRS, TEXT_ATTRS, type GarmentKind, type ReqRow, type ReqDraft,
  groupByKind, toDraft, blankDraft, validateDrafts, buildRequirementsPayload, draftsChanged, draftAttribute, attributeLabel, summarize, isFiber, isText,
} from '../../utils/materialRequirements';

const KIND_LABEL = Object.fromEntries(GARMENT_KINDS) as Record<GarmentKind, string>;
const apiMsg = (e: any, fb: string): string => {
  const errs = e?.response?.data?.errors;
  const all = errs ? (Object.values(errs).flat() as string[]) : [];
  return all.length ? all.join(' ') : e?.response?.data?.message ?? fb;
};
const ATTR_OPTIONS: [string, string][] = [
  ...Object.entries(NUMERIC_ATTRS).map(([k, v]) => [k, `${v.label} (${v.unit})`] as [string, string]),
  ...Object.entries(TEXT_ATTRS).map(([k, v]) => [k, v] as [string, string]),
  ['fiber', 'Fibre content (%)'],
];

export default function MaterialRequirementsPanel({ readOnly = false, setToast }: { readOnly?: boolean; setToast?: (t: any) => void }) {
  const [saved, setSaved] = useState<Record<GarmentKind, ReqRow[]> | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<GarmentKind>('top');
  const [drafts, setDrafts] = useState<ReqDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [touched, setTouched] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    return axios.get('/api/admin/material-spec-requirements')
      .then((r) => setSaved(groupByKind(r.data?.data ?? [])))
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const savedDrafts = useMemo(() => (saved ? saved[kind].map(toDraft) : []), [saved, kind]);
  useEffect(() => { setDrafts(savedDrafts); setConfirm(false); setServerErr(''); setTouched(false); }, [savedDrafts]);

  const errors = useMemo(() => validateDrafts(drafts), [drafts]);
  const dirty = draftsChanged(drafts, savedDrafts);
  const invalid = Object.keys(errors).length > 0;
  const patch = (key: string, p: Partial<ReqDraft>) => { setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d))); setConfirm(false); setServerErr(''); };

  const save = async () => {
    setBusy(true); setServerErr('');
    try {
      const r = await axios.put(`/api/admin/material-spec-requirements/${kind}`, buildRequirementsPayload(drafts));
      const rows: ReqRow[] = r.data?.data ?? [];
      setSaved((s) => (s ? { ...s, [kind]: rows } : s));
      setConfirm(false);
      setToast?.({ type: 'success', msg: `${KIND_LABEL[kind]} requirements saved.` });
    } catch (e) {
      setServerErr(apiMsg(e, 'Could not save. The previous requirements are unchanged.'));
      setConfirm(false);
    } finally { setBusy(false); }
  };

  const used = new Set(drafts.map((d) => d.attribute).filter((a) => a && a !== 'fiber'));

  return (
    <Panel title="Fabric requirements">
      <p className="adm-sub" style={{ marginTop: -6 }}>
        What the fabric must meet for each kind of garment. A requirement marked <strong>Required</strong> only removes a fabric when its specification is staff-verified and does not meet it.
        Unknown values are shown to customers as not yet confirmed. Nothing here is a price, quantity or formula.
        {readOnly && ' You have read-only access.'}
      </p>

      {saved === null && !failed ? <SkeletonRows rows={3} h={38} />
        : failed ? <ErrorBlock msg="Could not load fabric requirements." onRetry={load} />
        : (
          <>
            <div className="mrq-kinds" role="tablist" aria-label="Garment kind">
              {GARMENT_KINDS.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} className={`adm-btn${kind === k ? ' primary' : ''}`}
                  disabled={busy} onClick={() => setKind(k)}>
                  {label}{saved![k].length > 0 && <span className="mrq-count"> {saved![k].length}</span>}
                </button>
              ))}
            </div>

            {readOnly ? (
              savedDrafts.length === 0 ? <EmptyBlock>No requirements set for {KIND_LABEL[kind].toLowerCase()}. Recommendations use the approved catalog only.</EmptyBlock> : (
                <ul className="mrq-list" aria-label={`${KIND_LABEL[kind]} requirements`}>
                  {savedDrafts.map((d) => (
                    <li key={d.key} className="mrq-ro">
                      <strong>{attributeLabel(draftAttribute(d))}</strong>
                      <span>{summarize(d)}</span>
                      <Badge tone={d.required ? 'warning' : 'neutral'}>{d.required ? 'Required' : 'Preferred'}</Badge>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <>
                {drafts.length === 0 && <EmptyBlock>No requirements for {KIND_LABEL[kind].toLowerCase()} yet. Recommendations use the approved catalog only. Add one to start.</EmptyBlock>}
                <ul className="mrq-list" aria-label={`${KIND_LABEL[kind]} requirements`}>
                  {drafts.map((d, i) => {
                    const err = (touched || d.attribute) && errors[d.key];
                    const eid = `mrq-e-${d.key}`;
                    return (
                      <li key={d.key} className="mrq-row">
                        <div className="mrq-fields">
                          <select className="adm-input" aria-label={`Requirement ${i + 1} type`} aria-describedby={err ? eid : undefined} value={d.attribute}
                            onChange={(e) => patch(d.key, { attribute: e.target.value, min: '', max: '', text: '', fiber: '' })}>
                            <option value="" disabled>Choose…</option>
                            {ATTR_OPTIONS.map(([k, l]) => <option key={k} value={k} disabled={k !== 'fiber' && used.has(k) && d.attribute !== k}>{l}</option>)}
                          </select>
                          {isFiber(d.attribute) && (
                            <input className="adm-input" aria-label="Fibre name" placeholder="e.g. cotton" maxLength={39} value={d.fiber} onChange={(e) => patch(d.key, { fiber: e.target.value })} />
                          )}
                          {d.attribute && !isText(d.attribute) && (
                            <>
                              <input className="adm-input" inputMode="decimal" aria-label="Minimum" placeholder="Min" value={d.min} onChange={(e) => patch(d.key, { min: e.target.value })} />
                              <input className="adm-input" inputMode="decimal" aria-label="Maximum" placeholder="Max" value={d.max} onChange={(e) => patch(d.key, { max: e.target.value })} />
                            </>
                          )}
                          {d.attribute === 'construction' && (
                            <select className="adm-input" aria-label="Construction" value={d.text} onChange={(e) => patch(d.key, { text: e.target.value })}>
                              <option value="" disabled>Choose…</option>
                              {CONSTRUCTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                          {d.attribute === 'finish' && (
                            <input className="adm-input" aria-label="Finish" placeholder="e.g. soil release" maxLength={60} value={d.text} onChange={(e) => patch(d.key, { text: e.target.value })} />
                          )}
                        </div>
                        <label className="mrq-req"><input type="checkbox" checked={d.required} onChange={(e) => patch(d.key, { required: e.target.checked })} /> Required</label>
                        <button type="button" className="adm-btn" aria-label={`Remove requirement ${i + 1}`} onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>Remove</button>
                        {err && <p id={eid} role="alert" className="mrq-err">{err}</p>}
                      </li>
                    );
                  })}
                </ul>

                {errors._all && <p role="alert" className="mrq-err">{errors._all}</p>}
                {serverErr && <p role="alert" className="mrq-err">{serverErr}</p>}

                <div className="mrq-actions">
                  <button type="button" className="adm-btn" disabled={busy || drafts.length >= MAX_ROWS} onClick={() => setDrafts((ds) => [...ds, blankDraft()])}>Add requirement</button>
                  {!confirm && <button type="button" className="adm-btn primary" disabled={busy || !dirty}
                    onClick={() => { setTouched(true); if (!invalid) setConfirm(true); }}>Save {KIND_LABEL[kind].toLowerCase()} requirements</button>}
                  {dirty && !busy && <button type="button" className="adm-btn" onClick={() => { setDrafts(savedDrafts); setConfirm(false); setServerErr(''); setTouched(false); }}>Discard changes</button>}
                </div>

                {confirm && (
                  <div className="mrq-confirm" role="alertdialog" aria-label="Confirm replace">
                    <p>This replaces the entire {KIND_LABEL[kind].toLowerCase()} requirement set ({savedDrafts.length} saved → {drafts.length}). New recommendations use it immediately.</p>
                    <div className="mrq-actions">
                      <button type="button" className="adm-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Replace set'}</button>
                      <button type="button" className="adm-btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      <style>{`
        .mrq-kinds{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}
        .mrq-kinds .adm-btn{min-height:44px}
        .mrq-count{opacity:.75;font-weight:700}
        .mrq-list{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:10px}
        .mrq-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px}
        .mrq-fields{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(2,minmax(0,.8fr));gap:8px;min-width:0}
        .mrq-fields .adm-input{min-width:0;width:100%}
        .mrq-req{display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap;min-height:44px}
        .mrq-ro{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px}
        .mrq-ro span{color:var(--text-muted)}
        .mrq-err{grid-column:1/-1;margin:0;font-size:13px;color:var(--danger-text)}
        .mrq-actions{display:flex;flex-wrap:wrap;gap:8px}
        .mrq-confirm{margin-top:12px;padding:12px;border-radius:10px;background:var(--warning-bg);color:var(--warning-text);font-size:13px}
        .mrq-confirm p{margin:0 0 10px}
        @media(max-width:640px){.mrq-row{grid-template-columns:1fr 1fr}.mrq-fields{grid-column:1/-1;grid-template-columns:1fr 1fr}.mrq-fields>:first-child{grid-column:1/-1}.mrq-actions .adm-btn{flex:1 1 auto;justify-content:center}}
      `}</style>
    </Panel>
  );
}
