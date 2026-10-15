import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import GarmentSilhouette from '../client/design-studio/GarmentSilhouette';
import { PageHeader, Panel, StatusPill, ErrorBlock, SkeletonRows, PillTabs } from '../../components/admin/AdminUI';

// Pending: approve with a public label or reject with a reason the customer sees. Published: take it down.
function ActionRow({ design, onDone, published }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      if (mode === 'approve') await axios.post(`/api/admin/designs/${design.id}/showcase-approve`, { showcase_label: text.trim() });
      else if (mode === 'remove') await axios.post(`/api/admin/designs/${design.id}/showcase-remove`);
      else await axios.post(`/api/admin/designs/${design.id}/showcase-reject`, { note: text || undefined });
      onDone(design.id);
    } catch (e) { setErr(e.response?.data?.message ?? 'That did not go through. Please retry.'); setBusy(false); }
  };

  if (published) {
    return (
      <div style={{ marginTop: 10 }}>
        {err && <div style={{ marginBottom: 8 }}><ErrorBlock msg={err} /></div>}
        <div className="adm-mfoot">
          {mode === 'remove'
            ? <><button className="adm-btn" onClick={() => setMode(null)} disabled={busy}>Cancel</button>
                <button className="adm-btn primary danger-solid" disabled={busy} onClick={submit}>{busy ? 'Removing…' : 'Remove from showcase'}</button></>
            : <button className="adm-btn" onClick={() => setMode('remove')}>Remove from showcase</button>}
        </div>
      </div>
    );
  }
  if (!mode) {
    return (
      <div className="adm-mfoot">
        <button className="adm-btn primary" onClick={() => setMode('approve')}><NavIcon name="success" size={13} color="currentColor" /> Approve</button>
        <button className="adm-btn" onClick={() => setMode('reject')}>Reject</button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <label><span className="adm-field">{mode === 'approve' ? 'Showcase label *' : 'Reason (optional)'}</span>
        <input className="adm-input" autoFocus maxLength={mode === 'approve' ? 80 : 255} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'approve' ? 'e.g. Nursing scrubs set' : 'Shown to the customer'} />
      </label>
      {mode === 'approve' && <p className="adm-sub" style={{ margin: '6px 0 0' }}>Every client sees this label. Describe the garment; never use a person's, school's or company's name.</p>}
      {err && <div style={{ marginTop: 8 }}><ErrorBlock msg={err} /></div>}
      <div className="adm-mfoot">
        <button className="adm-btn" onClick={() => { setMode(null); setText(''); setErr(''); }} disabled={busy}>Cancel</button>
        <button className={`adm-btn primary${mode === 'approve' ? '' : ' danger-solid'}`} disabled={busy || (mode === 'approve' && !text.trim())} onClick={submit}>
          {busy ? 'Saving…' : mode === 'approve' ? 'Approve' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export default function ShowcaseModerationQueue() {
  const [tab, setTab] = useState('pending');
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/designs/showcase-queue', { params: tab === 'published' ? { status: 'approved' } : {} })
      .then((r) => setDesigns(r.data?.data ?? r.data ?? []))
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const remove = (id) => setDesigns((list) => list.filter((d) => d.id !== id));

  return (
    <>
      <PageHeader title="Showcase" sub={loading ? 'Designs customers asked to feature' : `${designs.length} design${designs.length !== 1 ? 's' : ''} ${tab === 'published' ? 'published' : 'pending review'}`}>
        <button className="adm-btn" onClick={load}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>
      <PillTabs value={tab} onChange={setTab} tabs={[{ key: 'pending', label: 'Pending review' }, { key: 'published', label: 'Published' }]} />
      <p className="adm-sub" style={{ margin: '0 0 12px' }}>The preview is exactly what clients see: garment, colours, patterns and details. Names, logos, printed text and order details are never published.</p>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load the showcase queue." onRetry={load} /></div>}

      {loading ? <div className="adm-cards-grid">{[1, 2, 3].map((i) => <Panel key={i} flush><SkeletonRows rows={3} h={18} /></Panel>)}</div>
        : loadErr ? null : designs.length === 0 ? (
          <Panel><div className="adm-empty"><NavIcon name="ai" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>{tab === 'published' ? 'Nothing published yet' : 'Nothing pending review'}</div></div></Panel>
        ) : (
          <div className="adm-cards-grid adm-stagger">
            {designs.map((d, i) => (
              <div key={d.id} className="adm-mcard" style={{ '--i': Math.min(i, 8), marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <GarmentSilhouette garment={d.config?.garment} sleeve={d.config?.sleeve ?? 'Short'} fit={d.config?.fit} custom={d.config?.custom} colors={d.config?.colors ?? {}} patterns={d.config?.patterns} patternParams={d.config?.patternParams} details={d.config?.details} width={72} height={86} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', overflowWrap: 'anywhere' }}>{d.label}</div>
                {d.garment && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><StatusPill status={tab === 'published' ? 'completed' : 'pending'} label={d.garment} /></div>}
                <ActionRow key={tab} design={d} onDone={remove} published={tab === 'published'} />
              </div>
            ))}
          </div>
        )}
    </>
  );
}
