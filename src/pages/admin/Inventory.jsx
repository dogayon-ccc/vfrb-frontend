
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import MaterialCode from '../../components/admin/MaterialCode';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, StatGrid, PillTabs, TabPanel, ErrorBlock, Panel, StatusPill, SearchBox, Meter, Banner, SkeletonRows, useIsMobile } from '../../components/admin/AdminUI';

const TYPE_CFG = {
  stock_in:   { color:'var(--success-text)', bg:'var(--success-bg)' },
  stock_out:  { color:'var(--danger-text)',  bg:'var(--danger-bg)'  },
  adjustment: { color:'var(--warning-text)', bg:'var(--warning-bg)' },
  wastage:    { color:'var(--purple)',  bg:'var(--purple-50)'  },
};

function StockModal({ type, materials, onClose, onDone, isMobile }) {
  const [matId, setMatId] = useState('');
  const [qty,   setQty]   = useState('');
  const [note,  setNote]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const isIn = type === 'in';

  const submit = async () => {
    if (!matId || !qty || Number(qty) <= 0) { setErr('Material and quantity required.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/admin/inventory/stock-${type}`, {
        material_id: matId, quantity: Number(qty), reason: note,
      });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={isIn ? 'Stock In — record goods receipt' : 'Stock Out — issue to production'} onClose={onClose} isMobile={isMobile} maxWidth={440}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label className="adm-field">Material *</label>
          <select className="adm-input" value={matId} onChange={e=>setMatId(e.target.value)}>
            <option value="">Select material…</option>
            {materials.map(m=>(
              <option key={m.material_id} value={m.material_id}>{m.material_name} — {m.quantity_in_stock} {m.unit} in stock</option>
            ))}
          </select>
        </div>
        <div>
          <label className="adm-field">Quantity *</label>
          <input className="adm-input" type="number" inputMode="decimal" min={0.01} step={0.01} value={qty}
            onChange={e=>setQty(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="adm-field">Reason / Notes</label>
          <input className="adm-input" value={note} onChange={e=>setNote(e.target.value)}
            placeholder={isIn ? 'e.g. Delivery from OTG Company' : 'e.g. Issued for Order #45'} />
        </div>
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : isIn ? 'Record Receipt' : 'Issue Materials'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function AdminInventory() {
  const nav = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab,       setTab]       = useState('stock');
  const [search,    setSearch]    = useState('');
  const isMobile = useIsMobile();
  const [cat, setCat] = useState('all');
  const [modal,     setModal]     = useState(null);

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('inventory_full');
      if (cached) {
        setMaterials(cached.materials);
        setLogs(cached.logs);
        setLoading(false);
        return;
      }
    }
    setLoading(true); setLoadError(false);
    Promise.allSettled([
      axios.get('/api/admin/inventory', { params: { per_page: 200 } }),
      axios.get('/api/admin/inventory/logs'),
    ]).then(([m,l]) => {
      const mats = m.status==='fulfilled' ? (m.value.data?.data ?? m.value.data ?? []) : [];
      const lgList = l.status==='fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : [];
      setMaterials(mats);
      setLogs(lgList);
      if (m.status==='rejected' && l.status==='rejected') setLoadError(true);
      else cacheSet('inventory_full', { materials:mats, logs:lgList }, TTL.MATERIALS);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered  = useMemo(() =>
    materials.filter(m =>
      (cat === 'all' || (m.category ?? '—') === cat) &&
      (!search || m.material_name?.toLowerCase().includes(search.toLowerCase()) || m.material_code?.toLowerCase().includes(search.toLowerCase())
               || m.category?.toLowerCase().includes(search.toLowerCase()))
    ), [materials, search, cat]);
  const categories = useMemo(() => [...new Set(materials.map(m => m.category ?? '—'))].sort(), [materials]);

  const lowStock  = useMemo(() =>
    materials.filter(m => m.quantity_in_stock <= (m.reorder_threshold ?? 0)),
  [materials]);

  const totalMats = materials.length;

  const isLow = (m) => Number(m.quantity_in_stock) <= (m.reorder_threshold ?? 0);
  const outCount = materials.filter(m => Number(m.quantity_in_stock) <= 0).length;
  const stockPct = (m) => m.reorder_threshold > 0 ? Math.min(100, Math.round((m.quantity_in_stock / (m.reorder_threshold * 2)) * 100)) : 100;
  const fmtLog = (d) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—';

  return (
    <>
      {modal && (
        <StockModal type={modal} materials={materials} isMobile={isMobile}
          onClose={()=>setModal(null)}
          onDone={()=>{ setModal(null); cacheClear('inventory_full'); load(true); }}/>
      )}

      <PageHeader title="Inventory" sub={`${totalMats} materials · ${lowStock.length} below reorder threshold`}>
        <button className="adm-btn" onClick={()=>nav('/admin/physical-count')}><NavIcon name="physicalCount" size={14} color="currentColor" /> Physical Count</button>
        <button className="adm-btn" onClick={()=>setModal('out')} style={{ color:'var(--teal)' }}><NavIcon name="stockOut" size={14} color="currentColor" /> Stock Out</button>
        <button className="adm-btn primary" onClick={()=>setModal('in')}><NavIcon name="stockIn" size={14} color="currentColor" /> Stock In</button>
      </PageHeader>

      <StatGrid loading={loading} items={[
        { label:'Total Items', value:totalMats },
        { label:'Low Stock', value:lowStock.length, color: lowStock.length ? 'var(--warning-text)' : undefined, chip: lowStock.length ? 'Reorder' : null, chipTone:'warn' },
        { label:'Out of Stock', value:outCount, color: outCount ? 'var(--danger-text)' : undefined, chip: outCount ? 'Action' : null, chipTone:'down' },
      ]} />

      {loadError && !loading && <div style={{ marginBottom:14 }}><ErrorBlock msg="Couldn't load inventory — check your connection." onRetry={()=>load(true)} /></div>}

      {lowStock.length > 0 && (
        <Banner tone="warn" icon="warning"
          action={<button className="adm-btn primary" onClick={()=>nav('/admin/procurement')}>Create PO →</button>}>
          {lowStock.length} material{lowStock.length!==1?'s':''} below reorder threshold — {lowStock.slice(0,3).map(m=>m.material_name).join(', ')}{lowStock.length > 3 ? ` and ${lowStock.length-3} more` : ''}
        </Banner>
      )}

      <PillTabs value={tab} onChange={setTab} tabs={[{ key:'stock', label:'Stock Levels', count:totalMats }, { key:'logs', label:'Transaction Log', count:logs.length }]} />

      <TabPanel k={tab}>
      {tab==='stock' && (
        <>
          <div className="adm-toolbar">
            <SearchBox value={search} onChange={setSearch} placeholder="Search materials…" />
          </div>
          {categories.length > 1 && (
            <div className="adm-chip-row" style={{ marginBottom:12, overflowX:'auto', flexWrap:'nowrap', paddingBottom:2 }}>
              {['all', ...categories].map(c => (
                <button key={c} className={`adm-fchip${cat===c?' on':''}`} onClick={()=>setCat(c)} style={{ whiteSpace:'nowrap' }}>{c==='all' ? 'All categories' : c}</button>
              ))}
            </div>
          )}

          {loading ? <Panel flush><SkeletonRows rows={6} h={44} /></Panel>
          : filtered.length===0 ? (
            <Panel><div className="adm-empty"><NavIcon name="stock" size={30} color="currentColor" /><div style={{ marginTop:8, fontWeight:700 }}>No materials found</div>
              {(search || cat!=='all') && <button className="adm-link-btn" onClick={()=>{ setSearch(''); setCat('all'); }}>Clear filters</button>}</div></Panel>
          ) : (
            <>
              <div className="adm-only-d">
                <Panel flush>
                  <div className="adm-tbl-scroll">
                    <table className="adm-table">
                      <thead><tr><th>Material</th><th className="adm-hide-t">Category</th><th>In Stock</th><th className="adm-hide-t">Reorder at</th><th>Status</th></tr></thead>
                      <tbody>
                        {filtered.map(m => { const low = isLow(m); return (
                          <tr key={m.material_id}>
                            <td><div style={{ fontWeight:700 }}>{m.material_name}<MaterialCode code={m.material_code}/></div><div className="adm-hide-d-t" style={{ fontSize:11, color:'var(--text-subtle)' }}>{m.category ?? '—'}</div></td>
                            <td className="adm-hide-t" style={{ color:'var(--text-subtle)' }}>{m.category ?? '—'}</td>
                            <td style={{ minWidth:150 }}>
                              <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                                <span style={{ fontSize:15, fontWeight:800, color: low ? 'var(--danger-text)' : 'var(--ink)' }}>{m.quantity_in_stock}</span>
                                <span style={{ fontSize:11, color:'var(--text-faint)' }}>{m.unit}</span>
                              </div>
                              <div style={{ marginTop:5, maxWidth:120 }}><Meter pct={stockPct(m)} tone={low ? 'low' : 'ok'} /></div>
                            </td>
                            <td className="adm-hide-t" style={{ color:'var(--text-subtle)' }}>{m.reorder_threshold ?? 0} {m.unit}</td>
                            <td><StatusPill status={low ? 'cancelled' : 'active'} label={low ? 'Low stock' : 'In stock'} /></td>
                          </tr>); })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
              <div className="adm-only-m adm-stagger" key={`${cat}-${search}`}>
                {filtered.map((m, i) => { const low = isLow(m); return (
                  <div key={m.material_id} className="adm-mcard accent" style={{ '--i':Math.min(i,8), '--acc': low ? 'var(--danger)' : 'var(--success)' }}>
                    <div className="adm-mrow">
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:'var(--ink)' }}>{m.material_name}<MaterialCode code={m.material_code}/></div>
                        <div style={{ fontSize:11, color:'var(--text-subtle)', marginTop:2 }}>{m.category ?? '—'} · {m.unit}</div>
                      </div>
                      <StatusPill status={low ? 'cancelled' : 'active'} label={low ? 'Low' : 'OK'} />
                    </div>
                    <div className="adm-mrow" style={{ marginTop:10, alignItems:'baseline' }}>
                      <span style={{ fontSize:20, fontWeight:800, color: low ? 'var(--danger-text)' : 'var(--ink)' }}>{m.quantity_in_stock}<span style={{ fontSize:11, fontWeight:600, color:'var(--text-faint)' }}> {m.unit}</span></span>
                      <span style={{ fontSize:11, color:'var(--text-faint)' }}>reorder @ {m.reorder_threshold ?? 0}</span>
                    </div>
                    <div style={{ marginTop:8 }}><Meter pct={stockPct(m)} tone={low ? 'low' : 'ok'} /></div>
                  </div>); })}
              </div>
            </>
          )}
        </>
      )}

      {tab==='logs' && (
        loading ? <Panel flush><SkeletonRows rows={6} h={44} /></Panel>
        : logs.length===0 ? <Panel><div className="adm-empty">No transactions yet</div></Panel>
        : (
          <>
            <div className="adm-only-d">
              <Panel flush>
                <div className="adm-tbl-scroll">
                  <table className="adm-table">
                    <thead><tr><th>Material</th><th>Type</th><th>Change</th><th className="adm-hide-t">Reason</th><th>Date</th><th className="adm-hide-t">By</th></tr></thead>
                    <tbody>
                      {logs.slice(0,30).map((l,i)=>{
                        const tc = TYPE_CFG[l.type] ?? { color:'var(--text-subtle)', bg:'var(--bg-surface)' };
                        return (
                          <tr key={l.log_id??i}>
                            <td style={{ fontWeight:600 }}>{l.material?.material_name??`#${l.material_id}`}</td>
                            <td><span className="adm-pill" style={{ background:tc.bg, color:tc.color }}>{(l.type??'—').replace('_',' ')}</span></td>
                            <td style={{ fontWeight:800, color:Number(l.change_qty)>=0?'var(--success-text)':'var(--danger-text)' }}>{Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}</td>
                            <td className="adm-hide-t" style={{ color:'var(--text-subtle)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.reason??'—'}</td>
                            <td style={{ color:'var(--text-faint)', whiteSpace:'nowrap' }}>{fmtLog(l.log_date)}</td>
                            <td className="adm-hide-t" style={{ color:'var(--text-subtle)' }}>{l.recorder?.name??'—'}</td>
                          </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
            <div className="adm-only-m adm-stagger">
              {logs.slice(0,30).map((l,i)=>{
                const tc = TYPE_CFG[l.type] ?? { color:'var(--text-subtle)', bg:'var(--bg-surface)' };
                return (
                  <div key={l.log_id??i} className="adm-mcard accent" style={{ '--i':Math.min(i,8), '--acc':tc.color }}>
                    <div className="adm-mrow">
                      <div style={{ fontSize:14, fontWeight:700 }}>{l.material?.material_name??`#${l.material_id}`}</div>
                      <span className="adm-pill" style={{ background:tc.bg, color:tc.color }}>{(l.type??'—').replace('_',' ')}</span>
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, margin:'6px 0 2px', color:Number(l.change_qty)>=0?'var(--success-text)':'var(--danger-text)' }}>
                      {Number(l.change_qty)>0?'+':''}{l.change_qty} <span style={{ fontSize:11, fontWeight:600 }}>{l.material?.unit??''}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-subtle)' }}>{l.reason??'—'}</div>
                    <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:4 }}>{fmtLog(l.log_date)} · {l.recorder?.name??'—'}</div>
                  </div>);
              })}
            </div>
          </>
        )
      )}
      </TabPanel>
    </>
  );
}
