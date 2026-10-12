import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import MaterialCode from '../../components/admin/MaterialCode';
import { PageHeader, Panel, StatusPill, SearchBox, ErrorBlock, SkeletonRows, useIsMobile } from '../../components/admin/AdminUI';

const UNITS = ['meters', 'kg', 'grams', 'yards', 'pieces', 'rolls', 'packs'];
const CATS  = ['Fabric', 'Thread', 'Accessory', 'Elastic', 'Lining', 'Interfacing', 'Other'];
const INIT  = { material_name: '', unit: 'meters', category: 'Fabric', quantity_in_stock: 0, reorder_threshold: 10, unit_cost: '' };
const peso  = (v) => (v ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—');
const isLow = (m) => Number(m.quantity_in_stock ?? 0) <= Number(m.reorder_threshold ?? 0);

function MaterialModal({ item, onClose, onDone, isMobile }) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? { ...item } : { ...INIT });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.material_name?.trim()) { setErr('Material name required.'); return; }
    setBusy(true); setErr('');
    try {
      isEdit ? await axios.put(`/api/admin/materials/${item.material_id}`, form) : await axios.post('/api/admin/materials', form);
      onDone();
    } catch (e) { setErr(e.response?.data?.message ?? 'Could not save the material.'); }
    finally { setBusy(false); }
  };

  const field = (label, el) => <label><span className="adm-field">{label}</span>{el}</label>;
  return (
    <BottomSheet title={isEdit ? 'Edit material' : 'Add material'} onClose={onClose} isMobile={isMobile} maxWidth={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {field('Material name *', <input className="adm-input" value={form.material_name ?? ''} onChange={(e) => set('material_name', e.target.value)} placeholder="e.g. Cotton Fabric" />)}
        {field('Material code', <input className="adm-input" value={form.material_code ?? ''} onChange={(e) => set('material_code', e.target.value.toUpperCase())} placeholder="Auto, e.g. MAT-FAB-001" maxLength={20} />)}
        <div className="adm-form-grid">
          {field('Unit', <select className="adm-input" value={form.unit ?? 'meters'} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>)}
          {field('Category', <select className="adm-input" value={form.category ?? 'Fabric'} onChange={(e) => set('category', e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>)}
        </div>
        <div className="adm-form-grid mat-grid3">
          {field('In stock', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.quantity_in_stock ?? 0} onChange={(e) => set('quantity_in_stock', Number(e.target.value))} />)}
          {field('Reorder at', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.reorder_threshold ?? 0} onChange={(e) => set('reorder_threshold', Number(e.target.value))} />)}
          {field('Unit cost (₱)', <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={form.unit_cost ?? ''} onChange={(e) => set('unit_cost', e.target.value)} placeholder="0.00" />)}
        </div>
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
  const [modal,   setModal]   = useState(null);
  const isMobile = useIsMobile();

  const load = useCallback(() => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/materials', { params: { per_page: 200 } })
      .then((r) => setMats(r.data?.data ?? r.data ?? []))
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return mats.filter((m) => !q || [m.material_name, m.material_code, m.category].some((v) => v?.toLowerCase().includes(q)));
  }, [mats, search]);
  const lowN = mats.filter(isLow).length;

  const empty = (
    <div className="adm-empty"><NavIcon name="materials" size={30} color="currentColor" />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{search ? `No materials match “${search}”` : 'No materials yet'}</div>
      {search ? <button className="adm-link-btn" onClick={() => setSearch('')}>Clear search</button>
        : <button className="adm-link-btn" onClick={() => setModal('add')}>Add the first material</button>}
    </div>
  );

  return (
    <>
      <style>{`@media(min-width:521px){.mat-grid3{grid-template-columns:1fr 1fr 1fr}}`}</style>
      {modal && <MaterialModal item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} isMobile={isMobile} />}

      <PageHeader title="Materials" sub={loading ? 'Master data' : `${mats.length} materials in master data${lowN ? ` · ${lowN} at or below reorder level` : ''}`}>
        <button className="adm-btn primary" onClick={() => setModal('add')}><NavIcon name="add" size={14} color="currentColor" /> Add material</button>
      </PageHeader>
      <div className="adm-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search name, code or category…" label="Search materials" /></div>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load materials." onRetry={load} /></div>}

      <div className="adm-only-d">
        <Panel flush>
          {loading ? <SkeletonRows rows={6} h={44} /> : loadErr ? null : filtered.length === 0 ? empty : (
            <div className="adm-tbl-scroll">
              <table className="adm-table">
                <thead><tr><th>Material</th><th>Category</th><th>Unit</th><th>In stock</th><th className="adm-hide-t">Reorder at</th><th className="adm-hide-t">Unit cost</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.material_id}>
                      <td style={{ fontWeight: 700 }}>{m.material_name}<MaterialCode code={m.material_code} /></td>
                      <td style={{ color: 'var(--text-subtle)' }}>{m.category ?? '—'}</td>
                      <td style={{ color: 'var(--text-subtle)' }}>{m.unit}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: isLow(m) ? 'var(--danger-text)' : 'var(--ink)', marginRight: 8 }}>{m.quantity_in_stock ?? 0}</span>
                        {isLow(m) && <StatusPill status="cancelled" label="Low" />}
                      </td>
                      <td className="adm-hide-t" style={{ color: 'var(--text-subtle)' }}>{m.reorder_threshold ?? 0}</td>
                      <td className="adm-hide-t" style={{ color: 'var(--text-subtle)' }}>{peso(m.unit_cost)}</td>
                      <td style={{ textAlign: 'right' }}><button className="adm-btn" onClick={() => setModal(m)}><NavIcon name="edit" size={13} color="currentColor" /> Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={search}>
        {loading ? <SkeletonRows rows={3} h={96} /> : loadErr ? null : filtered.length === 0 ? empty : filtered.map((m, i) => (
          <div key={m.material_id} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': isLow(m) ? 'var(--danger)' : 'var(--success)' }}>
            <div className="adm-mrow">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{m.material_name}<MaterialCode code={m.material_code} /></div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{m.category ?? '—'} · {m.unit}</div>
              </div>
              {isLow(m) && <StatusPill status="cancelled" label="Low" />}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' }}>
              <span>Stock <b style={{ color: isLow(m) ? 'var(--danger-text)' : 'var(--ink)' }}>{m.quantity_in_stock ?? 0}</b></span>
              <span>Reorder at {m.reorder_threshold ?? 0}</span>
              <span>{peso(m.unit_cost)}</span>
            </div>
            <div className="adm-mfoot"><button className="adm-btn" onClick={() => setModal(m)}><NavIcon name="edit" size={13} color="currentColor" /> Edit {m.material_name}</button></div>
          </div>
        ))}
      </div>
    </>
  );
}
