import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import MaterialCode from '../../components/admin/MaterialCode';
import Badge from '../../components/ui/Badge';
import { isOwner } from '../../utils/jobAccess';
import { PageHeader, Panel, Banner, SearchBox, ErrorBlock, SkeletonRows, Toast, useToast, useIsMobile } from '../../components/admin/AdminUI';

// Material master data: what a material is and how it is planned and valued. Quantities live in Inventory.
const UNITS = ['meters', 'kg', 'grams', 'yards', 'pieces', 'rolls', 'packs'];
const CATS  = ['Fabric', 'Thread', 'Accessory', 'Elastic', 'Lining', 'Interfacing', 'Other'];
const INIT  = { material_name: '', material_code: '', unit: 'meters', category: 'Fabric', ownership: 'vfrb', reorder_threshold: 10, unit_cost: '', opening_stock: '' };
const MASTER = ['material_name', 'material_code', 'unit', 'category', 'reorder_threshold', 'unit_cost'];
const peso  = (v) => (v ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—');
const errMsg = (e, fb) => e.response?.data?.message ?? Object.values(e.response?.data?.errors ?? {})[0]?.[0] ?? fb;
const isClient = (m) => m?.ownership === 'client';

// ownershipReady: the backend has materials.ownership (client-material ledger migration has run).
function MaterialModal({ item, categories = [], ownershipReady, onClose, onDone, isMobile }) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? { ...INIT, ...item } : { ...INIT });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const client = ownershipReady && isClient(form);

  const submit = async () => {
    if (!form.material_name?.trim()) { setErr('Material name required.'); return; }
    if (!client && (form.unit_cost === '' || Number(form.unit_cost) < 0)) { setErr('Enter the unit cost (₱).'); return; }
    setBusy(true); setErr('');
    const body = Object.fromEntries(MASTER.map((k) => [k, form[k] === '' ? null : form[k]]));
    // Client-supplied material is never valued or reordered by VFRB.
    if (client) Object.assign(body, { reorder_threshold: 0, unit_cost: 0 });
    if (ownershipReady) body.ownership = form.ownership;
    try {
      if (isEdit) await axios.put(`/api/admin/materials/${item.material_id}`, body);
      else await axios.post('/api/admin/materials', { ...body, opening_stock: client ? 0 : Number(form.opening_stock) || 0 });
      onDone(isEdit ? 'Material updated.' : 'Material added.');
    } catch (e) { setErr(errMsg(e, 'Could not save the material.')); }
    finally { setBusy(false); }
  };

  const field = (label, el, hint) => <label><span className="adm-field">{label}</span>{el}{hint && <span className="mat-hint">{hint}</span>}</label>;
  return (
    <BottomSheet title={isEdit ? `Edit ${item.material_name}` : 'Add material'} onClose={onClose} isMobile={isMobile} maxWidth={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="mat-group">Identification</p>
        {field('Material name *', <input className="adm-input" value={form.material_name ?? ''} onChange={(e) => set('material_name', e.target.value)} placeholder="e.g. Cotton Fabric" />)}
        <div className="adm-form-grid">
          {field('Material code', <input className="adm-input" value={form.material_code ?? ''} onChange={(e) => set('material_code', e.target.value.toUpperCase())} placeholder="Auto, e.g. MAT-FAB-001" maxLength={20} />)}
          {field('Category', <select className="adm-input" value={form.category ?? 'Fabric'} onChange={(e) => set('category', e.target.value)}>{[...new Set([...CATS, ...categories, form.category].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}</select>)}
        </div>
        {ownershipReady && <>
          <p className="mat-group">Owned by</p>
          <div className="mat-own" role="radiogroup" aria-label="Owned by">
            {[['vfrb', 'VFRB', 'Bought and stocked by VFRB (e.g. thread, logo patches)'], ['client', 'Client-supplied', 'Delivered by the client per order; leftovers go back']].map(([k, l, d]) => (
              <button key={k} type="button" role="radio" aria-checked={form.ownership === k} className={form.ownership === k ? 'on' : ''} onClick={() => set('ownership', k)}>
                <b>{l}</b><span>{d}</span>
              </button>
            ))}
          </div>
        </>}
        <p className="mat-group">{client ? 'Unit' : 'Unit, planning and cost'}</p>
        <div className={`adm-form-grid${client ? '' : ' mat-grid3'}`}>
          {field('Unit *', <select className="adm-input" value={form.unit ?? 'meters'} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>,
            isEdit ? 'Locked once stock has moved.' : null)}
          {!client && field('Reorder point *', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.reorder_threshold ?? 0} onChange={(e) => set('reorder_threshold', e.target.value)} />,
            'Alerts and RFQ suggestions start here.')}
          {!client && field('Unit cost (₱) *', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.unit_cost ?? ''} onChange={(e) => set('unit_cost', e.target.value)} placeholder="0.00" />)}
        </div>
        {client && <p className="mat-hint" style={{ margin: 0 }}>No reorder point or cost: the client owns it. Each order records what the client delivers, what Cutting uses and what goes back.</p>}
        {!isEdit && !client && <>
          <p className="mat-group">Opening stock</p>
          {field('Quantity on hand today', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.opening_stock} onChange={(e) => set('opening_stock', e.target.value)} placeholder="0" />,
            'Optional. Booked as the first Stock In in Inventory, so the log explains it.')}
        </>}
        {isEdit && !client && <p className="mat-hint" style={{ margin: 0 }}>
          On hand: <b>{item.quantity_in_stock ?? 0} {item.unit}</b>. Stock changes are recorded in <Link to="/admin/inventory">Inventory</Link>, not here.
        </p>}
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add material'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function AdminMaterials() {
  const [mats,    setMats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [search,  setSearch]  = useState('');
  const [cat,     setCat]     = useState('all');
  const [modal,   setModal]   = useState(null);
  const [toast,   setToast]   = useToast();
  const isMobile = useIsMobile();

  const load = useCallback(() => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/materials', { params: { per_page: 200 } })
      .then((r) => setMats(r.data?.data ?? r.data ?? []))
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => [...new Set(mats.map((m) => m.category).filter(Boolean))].sort(), [mats]);
  const ownershipReady = mats.some((m) => 'ownership' in m);
  const ownerTag = (m) => ownershipReady && <Badge tone={isClient(m) ? 'purple' : 'teal'}>{isClient(m) ? 'Client-supplied' : 'VFRB'}</Badge>;
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return mats.filter((m) => (cat === 'all' || m.category === cat)
      && (!q || [m.material_name, m.material_code, m.category].some((v) => v?.toLowerCase().includes(q))));
  }, [mats, search, cat]);

  const empty = (
    <div className="adm-empty"><NavIcon name="materials" size={30} color="currentColor" />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{search || cat !== 'all' ? 'No materials match these filters' : 'No materials yet'}</div>
      {search || cat !== 'all' ? <button className="adm-link-btn" onClick={() => { setSearch(''); setCat('all'); }}>Clear filters</button>
        : !isOwner() && <button className="adm-link-btn" onClick={() => setModal('add')}>Add the first material</button>}
    </div>
  );
  const editBtn = (m, label = 'Edit') => isOwner() ? null : <button className="adm-btn" onClick={() => setModal(m)} aria-label={`Edit ${m.material_name}`}><NavIcon name="edit" size={13} color="currentColor" /> {label}</button>;

  return (
    <>
      <style>{`
        @media(min-width:521px){.mat-grid3{grid-template-columns:1fr 1fr 1fr}}
        .mat-group{margin:4px 0 -4px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-subtle)}
        .mat-hint{display:block;margin-top:5px;font-size:12px;line-height:1.4;color:var(--text-subtle)}
        .mat-hint a{color:var(--teal);font-weight:700}
        .mat-own{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .mat-own button{display:flex;flex-direction:column;gap:2px;align-items:flex-start;text-align:left;min-height:56px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--ink);cursor:pointer;font:inherit}
        .mat-own button span{font-size:12px;color:var(--text-subtle)}
        .mat-own button.on{border-color:var(--teal);background:var(--teal-50);box-shadow:0 0 0 1px var(--teal) inset}
        .mat-own button:focus-visible{outline:2px solid var(--teal-2);outline-offset:2px}
      `}</style>
      <Toast toast={toast} />
      {modal && <MaterialModal item={modal === 'add' ? null : modal} categories={cats} ownershipReady={ownershipReady} onClose={() => setModal(null)} isMobile={isMobile}
        onDone={(msg) => { setModal(null); setToast({ msg, type: 'success' }); load(); }} />}

      <PageHeader title="Materials" sub={loading ? 'Master data' : `Master data · ${mats.length} material${mats.length === 1 ? '' : 's'}`}>
        <Link className="adm-btn" to="/admin/inventory"><NavIcon name="inventory" size={14} color="currentColor" /> Stock levels</Link>
        {!isOwner() && <button className="adm-btn primary" onClick={() => setModal('add')}><NavIcon name="add" size={14} color="currentColor" /> Add material</button>}
      </PageHeader>
      <Banner tone="info" icon="info">
        This list defines each material: code, category, unit, reorder point and cost. Quantities change only in <Link to="/admin/inventory">Inventory</Link>, so every change is logged.
      </Banner>

      <div className="adm-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, code or category…" label="Search materials" />
        {cats.length > 1 && (
          <select className="adm-input" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load materials." onRetry={load} /></div>}

      <div className="adm-only-d">
        <Panel flush>
          {loading ? <SkeletonRows rows={6} h={44} /> : loadErr ? null : filtered.length === 0 ? empty : (
            <div className="adm-tbl-scroll">
              <table className="adm-table">
                <thead><tr><th>Material</th><th>Category</th>{ownershipReady && <th>Owned by</th>}<th>Unit</th><th className="num">Reorder point</th><th className="num">Unit cost</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.material_id}>
                      <td style={{ fontWeight: 700 }}>{m.material_name}<MaterialCode code={m.material_code} /></td>
                      <td style={{ color: 'var(--text-subtle)' }}>{m.category ?? '—'}</td>
                      {ownershipReady && <td>{ownerTag(m)}</td>}
                      <td style={{ color: 'var(--text-subtle)' }}>{m.unit}</td>
                      <td className="num">{isClient(m) ? '—' : <>{m.reorder_threshold ?? 0} <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{m.unit}</span></>}</td>
                      <td className="num">{isClient(m) ? '—' : peso(m.unit_cost)}</td>
                      <td style={{ textAlign: 'right' }}>{editBtn(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={search + cat}>
        {loading ? <SkeletonRows rows={3} h={96} /> : loadErr ? null : filtered.length === 0 ? empty : filtered.map((m, i) => (
          <div key={m.material_id} className="adm-mcard" style={{ '--i': Math.min(i, 8) }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{m.material_name}<MaterialCode code={m.material_code} /></div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{m.category ?? '—'} · {m.unit} {ownerTag(m)}</div>
            {!isClient(m) && <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 13, color: 'var(--text-subtle)' }}>
              <span>Reorder at <b style={{ color: 'var(--ink)' }}>{m.reorder_threshold ?? 0} {m.unit}</b></span>
              <span>Cost <b style={{ color: 'var(--ink)' }}>{peso(m.unit_cost)}</b></span>
            </div>}
            <div className="adm-mfoot">{editBtn(m, `Edit ${m.material_name}`)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
