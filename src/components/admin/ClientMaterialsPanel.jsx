// Client-supplied materials for one order: what the client delivered, what Cutting used, wastage and leftovers returned.
// GET/POST /api/admin/orders/{id}/client-materials. Hidden when the order uses no client-supplied material.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BottomSheet from '../ui/BottomSheet';
import Badge from '../ui/Badge';
import { Panel, Banner, ErrorBlock, SkeletonRows, RecordedBy, useIsMobile } from './AdminUI';

const fmt = (n) => (n == null ? '—' : String(Math.round(Number(n) * 100) / 100));
const KIND = {
  received: { title: 'Record client delivery', verb: 'Record delivery', note: 'e.g. OTG delivery, DR #1234', label: 'Received' },
  wastage:  { title: 'Record wastage', verb: 'Record wastage', note: 'e.g. 2 m stained while cutting', label: 'Wastage' },
  returned: { title: 'Return leftovers to client', verb: 'Record return', note: 'e.g. Returned with delivery, received by OTG', label: 'Returned' },
  issued:   { label: 'Used at cutting' },
};

// Status of one client-material line; shared with Inventory's Client-supplied tab.
export function ClientLineStatus({ line: l }) {
  const [tone, label] = l.short > 0 ? ['danger', `Short ${fmt(l.short)} ${l.unit}`]
    : l.required == null && l.received <= 0 ? ['warning', 'Awaiting delivery']
    : !l.issued_at_cutting ? ['success', 'Ready for Cutting']
    : l.on_hand > 0 ? ['warning', `Return ${fmt(l.on_hand)} ${l.unit}`]
    : l.on_hand < 0 ? ['danger', 'Receipt missing'] : ['neutral', 'Closed'];
  return <Badge tone={tone}>{label}</Badge>;
}

function MoveSheet({ kind, lines, orderId, onClose, onDone, isMobile }) {
  const k = KIND[kind];
  const pickable = kind === 'received' ? lines : lines.filter((l) => l.on_hand > 0);
  const [matId, setMatId] = useState(String(pickable[0]?.material_id ?? ''));
  const sel = lines.find((l) => String(l.material_id) === matId);
  const [qty, setQty] = useState(kind === 'returned' && sel ? fmt(sel.on_hand) : kind === 'received' && sel?.short ? fmt(sel.short) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = (id) => {
    setMatId(id);
    const l = lines.find((x) => String(x.material_id) === id);
    if (kind === 'returned' && l) setQty(fmt(l.on_hand));
    if (kind === 'received' && l?.short) setQty(fmt(l.short));
  };
  const submit = async () => {
    if (!matId || !(Number(qty) > 0)) { setErr('Choose a material and enter a quantity.'); return; }
    if (kind !== 'received' && !note.trim()) { setErr('Add a note; it appears on the client’s slip.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await axios.post(`/api/admin/orders/${orderId}/client-materials`, { type: kind, material_id: Number(matId), qty: Number(qty), note: note.trim() || null });
      onDone(r.data, `${k.label} recorded.`);
    } catch (e) { setErr(e.response?.data?.message ?? Object.values(e.response?.data?.errors ?? {})[0]?.[0] ?? 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={k.title} onClose={onClose} isMobile={isMobile} maxWidth={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label><span className="adm-field">Material *</span>
          <select className="adm-input" value={matId} onChange={(e) => pick(e.target.value)}>
            {pickable.map((l) => <option key={l.material_id} value={l.material_id}>{l.material_name}{kind !== 'received' ? ` — ${fmt(l.on_hand)} ${l.unit} held` : ''}</option>)}
          </select>
        </label>
        <label><span className="adm-field">Quantity{sel ? ` (${sel.unit})` : ''} *</span>
          <input className="adm-input" type="number" inputMode="decimal" min={0.01} step={0.01} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.00" />
          {sel && kind === 'received' && sel.required != null && <span className="cm-hint">Needed {fmt(sel.required)} · received so far {fmt(sel.received)}{sel.short > 0 ? ` · short ${fmt(sel.short)}` : ''}</span>}
        </label>
        <label><span className="adm-field">{kind === 'received' ? 'Note' : 'Note *'}</span>
          <input className="adm-input" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder={k.note} />
        </label>
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : k.verb}</button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function ClientMaterialsPanel({ order, canWrite, canMessage, setToast, style }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(() => {
    setLoadErr(false);
    axios.get(`/api/admin/orders/${order.order_id}/client-materials`).then((r) => setData(r.data)).catch(() => setLoadErr(true));
  }, [order.order_id]);
  useEffect(() => { load(); }, [load]);

  if (loadErr) return <Panel title="Client materials" style={style}><ErrorBlock msg="Couldn't load client materials." onRetry={load} /></Panel>;
  if (!data) return <Panel title="Client materials" style={style}><SkeletonRows rows={2} h={40} /></Panel>;
  if (!data.ready || data.lines.length === 0) return null;

  const { lines, entries, short } = data;
  const open = !['completed', 'cancelled'].includes(order.status);
  const toReturn = lines.filter((l) => l.issued_at_cutting && l.on_hand > 0);
  const anyHeld = lines.some((l) => l.on_hand > 0);

  return (
    <Panel title="Client materials" subtitle="Supplied by the client for this order. Counted, not valued; leftovers go back to the client." style={style}
      action={canWrite && (open || order.status === 'cancelled') ? (
        <div className="cm-actions">
          {open && <button className="adm-btn primary" onClick={() => setSheet('received')}>Record delivery</button>}
          {open && anyHeld && <button className="adm-btn" onClick={() => setSheet('wastage')}>Wastage</button>}
          {anyHeld && <button className="adm-btn" onClick={() => setSheet('returned')}>Return leftovers</button>}
        </div>
      ) : null}>
      <style>{`
        .cm-actions{display:flex;gap:8px;flex-wrap:wrap}
        .cm-hint{display:block;margin-top:5px;font-size:12px;color:var(--text-subtle)}
        .cm-log{list-style:none;margin:0;padding:0}
        .cm-log li{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--border);font-size:13px}
        .cm-cards{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
        .cm-cards li{padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card)}
        .cm-card-top{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
        .cm-card-top b{font-size:14px;overflow-wrap:anywhere}
        .cm-cards dl{margin:10px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .cm-cards dl > div:nth-child(4){grid-column:1/-1}
        .cm-cards dt{font-size:11px;font-weight:800;color:var(--text-subtle)}
        .cm-cards dd{margin:2px 0 0;font-size:14px;font-variant-numeric:tabular-nums}
        @media(max-width:767px){.cm-actions{width:100%}.cm-actions .adm-btn{flex:1 1 auto;justify-content:center}}
      `}</style>

      {short.length > 0 && open && (
        <Banner tone="warn" icon="warning" action={canMessage ? <Link className="adm-btn" to={`/admin/messages?order=${order.order_id}`}>Message client</Link> : null}>
          Cutting is on hold until the client delivers: {short.map((l) => `${l.material_name} (${fmt(l.short)} ${l.unit})`).join(', ')}.
        </Banner>
      )}
      {toReturn.length > 0 && (
        <Banner tone="info" icon="info">
          Return to the client before delivery: {toReturn.map((l) => `${l.material_name} (${fmt(l.on_hand)} ${l.unit})`).join(', ')}.
        </Banner>
      )}

      {isMobile ? (
        <ul className="cm-cards">
          {lines.map((l) => (
            <li key={l.material_id}>
              <div className="cm-card-top"><b>{l.material_name}</b><ClientLineStatus line={l} /></div>
              <dl>
                <div><dt>Needed</dt><dd>{l.required == null ? 'after Pattern' : `${fmt(l.required)} ${l.unit}`}</dd></div>
                <div><dt>Received</dt><dd>{fmt(l.received)}</dd></div>
                <div><dt>Held</dt><dd><b>{fmt(l.on_hand)}</b></dd></div>
                {(l.issued > 0 || l.wastage > 0 || l.returned > 0) && <div><dt>Used · waste · returned</dt><dd>{fmt(l.issued)} · {fmt(l.wastage)} · {fmt(l.returned)}</dd></div>}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
      <div className="adm-tbl-scroll">
        <table className="adm-table" style={{ minWidth: 680 }}>
          <thead><tr><th>Material</th><th className="num">Needed</th><th className="num">Received</th><th className="num">Used</th><th className="num">Wastage</th><th className="num">Returned</th><th className="num">Held</th><th>Status</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.material_id}>
                <td style={{ fontWeight: 700 }}>{l.material_name} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{l.unit}</span></td>
                <td className="num">{l.required == null ? <span style={{ color: 'var(--text-faint)' }} title="Entered at Pattern">after Pattern</span> : fmt(l.required)}</td>
                <td className="num">{fmt(l.received)}</td>
                <td className="num">{fmt(l.issued)}</td>
                <td className="num">{fmt(l.wastage)}</td>
                <td className="num">{fmt(l.returned)}</td>
                <td className="num" style={{ fontWeight: 800 }}>{fmt(l.on_hand)}</td>
                <td><ClientLineStatus line={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button className="adm-link-btn" onClick={() => setShowLog((s) => !s)} aria-expanded={showLog}>{showLog ? 'Hide' : 'Show'} movements ({entries.length})</button>
          {showLog && (
            <ul className="cm-log">
              {entries.map((e) => (
                <li key={e.entry_id}>
                  <span><b>{KIND[e.type]?.label ?? e.type}</b> · {fmt(e.qty)} {e.unit} {e.material_name}{e.note ? ` — ${e.note}` : ''}</span>
                  <RecordedBy name={e.recorded_by_name} at={e.created_at} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sheet && <MoveSheet kind={sheet} lines={lines} orderId={order.order_id} isMobile={isMobile} onClose={() => setSheet(null)}
        onDone={(d, msg) => { setSheet(null); setData(d); setToast?.({ msg, type: 'success' }); }} />}
    </Panel>
  );
}
