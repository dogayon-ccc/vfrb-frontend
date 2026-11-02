// What the AI would see for this order if asked now (GET /api/admin/orders/{id}/ai-context). Read-only; loads on first open.
import { useState, useId } from 'react';
import axios from 'axios';
import { Panel, DataTable, SkeletonRows, EmptyBlock, ErrorBlock } from './AdminUI';

const STOCK = { true: 'In stock', false: 'Out of stock', null: 'Not recorded' };
const COLOUR = { body: 'Matches body', near: 'Close to body', any: 'Any colour', other: 'Other colour', null: 'No colour in name' };
const colourLabel = (c) => (c == null ? COLOUR.null : COLOUR[c] ?? `Matches ${String(c).replace(/_/g, ' ')}`);
const stockLabel = (s) => STOCK[s ?? null];

function Section({ title, items, empty, chips }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 className="adm-sub" style={{ margin: '0 0 6px', fontWeight: 600 }}>{title}</h3>
      {items.length === 0 ? <p className="adm-sub" style={{ margin: 0 }}>{empty}</p>
        : chips ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{items.map((t) => <span key={t} className="adm-chip">{t}</span>)}</div>
        : <ul className="adm-guide-list" style={{ marginBottom: 0 }}>{items.map((t) => <li key={t}><p style={{ margin: 0 }}>{t}</p></li>)}</ul>}
    </div>
  );
}

export default function AiContextPanel({ orderId }) {
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    setData(null);
    axios.get(`/api/admin/orders/${orderId}/ai-context`)
      .then((r) => setData(r.data?.data ?? null))
      .catch((e) => setError(e.response?.status === 422 ? { msg: e.response.data?.message, final: true } : { msg: 'Could not load what the AI sees.' }));
  };
  const toggle = () => {
    if (!open && !data && !error) load();
    setOpen(!open);
  };

  return (
    <Panel title="What the AI sees" style={{ order: 8 }}
      action={<button type="button" className="adm-btn" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>{open ? 'Hide' : 'Show'}</button>}>
      <div id={bodyId} hidden={!open}>
        {!open ? null
          : error?.final ? <EmptyBlock>{error.msg}</EmptyBlock>
          : error ? <ErrorBlock msg={error.msg} onRetry={load} />
          : !data ? <SkeletonRows rows={3} h={34} />
          : (
            <>
              <p className="adm-sub" style={{ marginTop: -6 }}>
                {data.scope} {data.garment} ({data.kind}), use: {data.category}.
              </p>
              <Section title="Guidance rules" items={data.guidance} empty="No guidance applies to this order." />
              <Section title="Staff approved for this garment" items={data.staff_approved} empty="None yet." chips />
              <Section title="Staff rejected for this garment" items={data.staff_rejected} empty="None yet." chips />
              <Section title="Staff reasons" items={data.staff_reasons} empty="No reasons written yet." />
              <Section title="Customer's saved preferences" items={data.customer_preferences} empty="None saved." chips />
              <Section title="Construction needs" items={data.needs} empty="Fabric and thread only." chips />
              <h3 className="adm-sub" style={{ margin: '0 0 6px', fontWeight: 600 }}>Materials the AI may choose ({data.catalog.length})</h3>
              <DataTable label="Materials the AI may choose" mobileCards densityToggle={false} className="adm-flush-table"
                isEmpty={data.catalog.length === 0} empty={<EmptyBlock>No eligible materials.</EmptyBlock>}>
                <thead><tr><th>Material</th><th>Code</th><th>Category</th><th>Stock</th><th>Colour fit</th></tr></thead>
                <tbody>
                  {data.catalog.map((m) => (
                    <tr key={m.material_id}>
                      <td data-label="Material" style={{ fontWeight: 600 }}>{m.material_name}</td>
                      <td data-label="Code">{m.material_code || '—'}</td>
                      <td data-label="Category">{m.category || '—'}</td>
                      <td data-label="Stock">{stockLabel(m.in_stock)}</td>
                      <td data-label="Colour fit">{colourLabel(m.colour_match)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </>
          )}
      </div>
    </Panel>
  );
}
