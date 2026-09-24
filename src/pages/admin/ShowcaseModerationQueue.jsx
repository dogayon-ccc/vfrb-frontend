// src/pages/admin/ShowcaseModerationQueue.jsx
// Reuses Suppliers.jsx's card-grid + theme.css token conventions. A
// desktop-table/mobile-card split (as first sketched) isn't needed here —
// design thumbnails are inherently card content, and the auto-fill grid
// already reflows to 1 column under 767px on its own.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, Badge, NavIcon } from '../../components/ui';
import GarmentSilhouette from '../client/design-studio/GarmentSilhouette';

function ActionRow({ design, onDone }) {
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      mode === 'approve'
        ? await axios.post(`/api/admin/designs/${design.id}/showcase-approve`, { showcase_label: text })
        : await axios.post(`/api/admin/designs/${design.id}/showcase-reject`, { note: text || undefined });
      onDone(design.id);
    } catch { setBusy(false); }
  };

  if (mode) {
    return (
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        <input autoFocus value={text} onChange={e => setText(e.target.value)}
          placeholder={mode === 'approve' ? 'Showcase label…' : 'Reason (optional)…'}
          style={{ flex:1, padding:'6px 9px', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', fontSize:12, fontFamily:'var(--font)' }}/>
        <button disabled={busy || (mode === 'approve' && !text.trim())} onClick={submit}
          style={{ padding:'6px 12px', borderRadius:'var(--r-sm)', border:'none', background:'var(--teal)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
          {busy ? '…' : 'Confirm'}
        </button>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', gap:6, marginTop:8 }}>
      <button onClick={() => setMode('approve')}
        style={{ flex:1, padding:'6px 0', borderRadius:'var(--r-sm)', border:'none', background:'var(--teal)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
        Approve
      </button>
      <button onClick={() => setMode('reject')}
        style={{ flex:1, padding:'6px 0', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--ink)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
        Reject
      </button>
    </div>
  );
}

export default function ShowcaseModerationQueue() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/admin/designs/showcase-queue')
      .then(r => setDesigns(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = (id) => setDesigns(list => list.filter(d => d.id !== id)); // optimistic — actioned rows leave the pending queue

  return (
    <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Showcase Queue</h1>
        <p style={{ color:'var(--text-subtle)', fontSize:13 }}>{designs.length} design{designs.length !== 1 ? 's' : ''} pending review</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
        {loading ? [1,2,3].map(i => (
          <Card key={i} padding="md">
            {[70,50,40].map(w => <div key={w} style={{ height:10, width:`${w}%`, borderRadius:'var(--r-xs)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'shq-shimmer 1.4s infinite', marginBottom:10 }}/>)}
          </Card>
        )) : designs.length === 0 ? (
          <div style={{ gridColumn:'1/-1' }}>
            <Card>
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <NavIcon name="ai" size={32} color="var(--text-faint)" style={{ marginBottom:10 }}/>
                <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600 }}>Nothing pending review</p>
              </div>
            </Card>
          </div>
        ) : designs.map(d => (
          <Card key={d.id} padding="md">
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <GarmentSilhouette garment={d.config?.garment} sleeve={d.config?.sleeve} colors={d.config?.colors ?? {}} width={64} height={76}/>
            </div>
            <p style={{ fontSize:13, fontWeight:800, color:'var(--ink)', margin:'0 0 4px', textAlign:'center' }}>{d.label}</p>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <Badge tone="warning">{d.garment}</Badge>
            </div>
            <ActionRow design={d} onDone={remove}/>
          </Card>
        ))}
      </div>

      <style>{`@keyframes shq-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}
