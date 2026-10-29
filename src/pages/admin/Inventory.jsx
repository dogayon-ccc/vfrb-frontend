
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon, DataTable, EmptyState } from '../../components/ui';
import { isAdmin, isStation, canOpen } from '../../utils/jobAccess';
import useListKeys from '../../hooks/useListKeys';
import MaterialCode from '../../components/admin/MaterialCode';
import { ClientLineStatus } from '../../components/admin/ClientMaterialsPanel';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, PillTabs, TabPanel, ErrorBlock, StatusPill, SearchBox, Meter, Banner, Toast, useToast, useIsMobile } from '../../components/admin/AdminUI';

// Movement types as the ERP names them (inventory_logs.type).
const TYPE_CFG = {
  stock_in:   { label:'Goods receipt', color:'var(--success-text)', bg:'var(--success-bg)' },
  stock_out:  { label:'Goods issue',   color:'var(--danger-text)',  bg:'var(--danger-bg)'  },
  adjustment: { label:'Count adjustment', color:'var(--warning-text)', bg:'var(--warning-bg)' },
  wastage:    { label:'Wastage',       color:'var(--purple)',  bg:'var(--purple-50)'  },
};

function StockModal({ type, materials, onClose, onDone, isMobile }) {
  const [matId, setMatId] = useState('');
  const [qty,   setQty]   = useState('');
  const [note,  setNote]  = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [outKind, setOutKind] = useState('issue');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const isIn = type === 'in';
  const waste = !isIn && outKind === 'wastage';
  const sel = materials.find(m => String(m.material_id) === String(matId));

  const submit = async () => {
    if (!matId || !qty || Number(qty) <= 0) { setErr('Material and quantity required.'); return; }
    if (!isIn && !waste && !issuedTo.trim()) { setErr('Enter who received the materials (department or employee).'); return; }
    if (waste && !note.trim()) { setErr('Say what was damaged or scrapped.'); return; }
    setBusy(true); setErr('');
    try {
      if (waste) await axios.post(`/api/admin/materials/${matId}/adjust`, { type: 'wastage', quantity: Number(qty), reason: note.trim() });
      else await axios.post(`/api/admin/inventory/stock-${type}`, {
        material_id: matId, quantity: Number(qty), reason: note,
        ...(isIn ? {} : { issued_to: issuedTo.trim() }),
      });
      onDone(isIn ? 'Goods receipt recorded.' : waste ? 'Wastage recorded.' : 'Goods issue recorded.');
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={isIn ? 'Stock In — record goods receipt' : 'Stock Out — issue or write off'} onClose={onClose} isMobile={isMobile} maxWidth={440}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {!isIn && (
          <div className="inv-kind" role="radiogroup" aria-label="Stock out type">
            {[['issue', 'Issue to production', 'Materials handed to a department'], ['wastage', 'Wastage', 'Damaged, defective or scrapped']].map(([k, l, d]) => (
              <button key={k} type="button" role="radio" aria-checked={outKind === k} className={outKind === k ? 'on' : ''} onClick={() => { setOutKind(k); setErr(''); }}>
                <b>{l}</b><span>{d}</span>
              </button>
            ))}
          </div>
        )}
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
          {sel && (
            <div style={{ fontSize:12, color:'var(--text-subtle)', marginTop:6 }}>
              {sel.quantity_in_stock} {sel.unit} in stock
              {!isIn && Number(qty) > 0 && ` · ${Math.max(0, Number(sel.quantity_in_stock) - Number(qty)).toFixed(2)} ${sel.unit} remaining after ${waste ? 'write-off' : 'issue'}`}
            </div>
          )}
        </div>
        {!isIn && !waste && (
          <div>
            <label className="adm-field" htmlFor="stock-issued-to">Issued to *</label>
            <input id="stock-issued-to" className="adm-input" value={issuedTo} maxLength={120} onChange={e=>setIssuedTo(e.target.value)}
              placeholder="e.g. Cutting dept. — Juan D." />
            <div style={{ fontSize:12, color:'var(--text-subtle)', marginTop:6 }}>Department or employee who received the materials. Kept in the transaction log for accountability.</div>
          </div>
        )}
        <div>
          <label className="adm-field">{waste ? 'What happened *' : 'Reason / Notes'}</label>
          <input className="adm-input" value={note} maxLength={255} onChange={e=>setNote(e.target.value)}
            placeholder={isIn ? 'e.g. Delivery from OTG Company' : waste ? 'e.g. 3 m stained during cutting, Order #45' : 'e.g. For Order #45'} />
        </div>
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : isIn ? 'Record Receipt' : waste ? 'Write Off' : 'Issue Materials'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// Stock flag: out (nothing left), low (at or below reorder point), ok.
const flagOf = (m) => { const q = Number(m.quantity_in_stock) || 0; return q <= 0 ? 'out' : q <= (Number(m.reorder_threshold) || 0) ? 'low' : 'ok'; };
const FLAG_RANK = { out: 0, low: 1, ok: 2 };
const FLAG_LABEL = { out: 'Out of stock', low: 'Reorder', ok: 'In stock' };
// No max-stock field exists, so the bar is full at 2x the reorder point and the tick marks the reorder point.
const stockPct = (m) => { const r = Number(m.reorder_threshold) || 0; return r > 0 ? ((Number(m.quantity_in_stock) || 0) / (r * 2)) * 100 : 100; };
const FILTERS = ['all', 'reorder', 'out'];

export default function AdminInventory() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [allMats,   setAllMats]   = useState([]);
  // VFRB stock only: client-supplied material is held per order (Client-supplied tab), never reordered.
  const materials = useMemo(() => allMats.filter(m => m.ownership !== 'client'), [allMats]);
  const [clientStock, setClientStock] = useState({ ready:false, orders:[] });
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab,       setTab]       = useState('stock');
  const [search,    setSearch]    = useState('');
  const isMobile = useIsMobile();
  const [cat, setCat] = useState('all');
  // ?filter=reorder lets the dashboard's low-stock alert open the flagged list.
  const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
  const setFilter = (f) => setParams(f === 'all' ? {} : { filter: f }, { replace: true });
  const [modal,     setModal]     = useState(null);
  const [exporting, setExporting] = useState(null);
  const [exportErr, setExportErr] = useState('');
  const [counting,  setCounting]  = useState(false);
  const [counted,   setCounted]   = useState({});
  const [saving,    setSaving]    = useState(false);
  const [countMsg,  setCountMsg]  = useState(null);
  const [toast,     setToast]     = useToast();

  // The backend matches search on name only and can't filter the '—' (no category) group,
  // so the export can hold more rows than the page shows.
  const exportStock = async (format) => {
    setExporting(format); setExportErr('');
    const q = { format };
    if (search.trim()) q.search = search.trim();
    if (cat !== 'all' && cat !== '—') q.category = cat;
    try {
      const res = await axios.get('/api/admin/inventory/export', { params: q, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `VFRB-Inventory-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      let msg = 'Export failed.';
      try { msg = JSON.parse(await e.response?.data?.text())?.message ?? msg; } catch { /* not JSON */ }
      setExportErr(msg);
    } finally { setExporting(null); }
  };

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('inventory_full');
      if (cached) {
        setAllMats(cached.materials);
        setLogs(cached.logs);
        setClientStock(cached.client ?? { ready:false, orders:[] });
        setLoading(false);
        return;
      }
    }
    setLoading(true); setLoadError(false);
    Promise.allSettled([
      axios.get('/api/admin/inventory', { params: { per_page: 200 } }),
      axios.get('/api/admin/inventory/logs'),
      axios.get('/api/admin/inventory/client-stock'),
    ]).then(([m,l,c]) => {
      const mats = m.status==='fulfilled' ? (m.value.data?.data ?? m.value.data ?? []) : [];
      const lgList = l.status==='fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : [];
      const client = c.status==='fulfilled' ? { ready: !!c.value.data?.ready, orders: c.value.data?.orders ?? [] } : { ready:false, orders:[] };
      setAllMats(mats);
      setLogs(lgList);
      setClientStock(client);
      // Stock levels are the page's main content: a failed stock fetch is an error even if the log loaded.
      if (m.status==='rejected') setLoadError(true);
      else cacheSet('inventory_full', { materials:mats, logs:lgList, client }, TTL.MATERIALS);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const flagCount = useMemo(() => materials.reduce((a, m) => { a[flagOf(m)] += 1; return a; }, { out: 0, low: 0, ok: 0 }), [materials]);
  const reorderCount = flagCount.out + flagCount.low;
  const categories = useMemo(() => [...new Set(materials.map(m => m.category ?? '—'))].sort(), [materials]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return materials
      .filter(m => (cat === 'all' || (m.category ?? '—') === cat)
        && (filter === 'all' || (filter === 'out' ? flagOf(m) === 'out' : flagOf(m) !== 'ok'))
        && (!q || m.material_name?.toLowerCase().includes(q) || m.material_code?.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q)))
      .sort((a, b) => FLAG_RANK[flagOf(a)] - FLAG_RANK[flagOf(b)] || String(a.material_name).localeCompare(String(b.material_name)));
  }, [materials, search, cat, filter]);
  const keys = useListKeys({ count: tab === 'stock' && !counting ? filtered.length : 0 });

  const entries = Object.entries(counted).filter(([, v]) => v !== '' && Number(v) >= 0);
  const fmtLog = (d) => d ? new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—';

  // Enter in a count field moves to the next one, so a whole sheet can be keyed without the mouse.
  const nextCount = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const all = [...document.querySelectorAll('[data-count]')];
    all[all.indexOf(e.currentTarget) + 1]?.focus();
  };
  const exitCount = () => { setCounting(false); setCounted({}); };
  // One POST per material (the API takes a single reading); reconciliation stays on the Physical Count page.
  const saveCounts = async () => {
    setSaving(true); setCountMsg(null);
    const failed = [];
    for (const [id, v] of entries) {
      try { await axios.post('/api/admin/physical-counts', { material_id: Number(id), counted_qty: Number(v) }); }
      catch (e) { failed.push({ id, msg: e.response?.data?.message ?? 'Failed' }); }
    }
    const ok = entries.length - failed.length;
    setCounted(Object.fromEntries(failed.map(f => [f.id, counted[f.id]])));
    setSaving(false);
    setCountMsg({ ok, failed: failed.map(f => `${materials.find(m => String(m.material_id) === f.id)?.material_name ?? `#${f.id}`}: ${f.msg}`) });
    if (ok) setToast({ msg: `${ok} count${ok === 1 ? '' : 's'} submitted for reconciliation.`, type: 'success' });
    if (!failed.length) setCounting(false);
  };

  return (
    <>
      <Toast toast={toast} />
      <style>{`
        .inv-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .inv-count{width:110px;min-height:40px;text-align:right;font-variant-numeric:tabular-nums}
        .inv-bar{display:flex;align-items:center;gap:8px;min-width:140px}
        .inv-bar .adm-meter{flex:1}
        @media(pointer:coarse){.inv-chips .adm-fchip{min-height:44px}.inv-count{min-height:44px}}
        .inv-kind{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .inv-kind button{display:flex;flex-direction:column;gap:2px;align-items:flex-start;text-align:left;min-height:56px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--ink);cursor:pointer;font:inherit}
        .inv-kind button span{font-size:12px;color:var(--text-subtle)}
        .inv-kind button.on{border-color:var(--teal);background:var(--teal-50);box-shadow:0 0 0 1px var(--teal) inset}
        .inv-kind button:focus-visible{outline:2px solid var(--teal-2);outline-offset:2px}
      `}</style>
      {modal && (
        <StockModal type={modal} materials={materials} isMobile={isMobile}
          onClose={()=>setModal(null)}
          onDone={(msg)=>{ setModal(null); setToast({ msg, type:'success' }); cacheClear('inventory_full'); load(true); }}/>
      )}

      <PageHeader title="Inventory" sub={loading ? 'Loading materials…' : `Stock on hand and every movement · ${reorderCount} to reorder · ${flagCount.out} out of stock`}>
        {canOpen('/admin/materials') && <Link className="adm-btn" to="/admin/materials"><NavIcon name="materials" size={14} color="currentColor" /> Material details</Link>}
        {!isStation() && <>
        <button className="adm-btn" style={{ minHeight:44 }} onClick={()=>exportStock('csv')} disabled={!!exporting}><FileSpreadsheet size={14} aria-hidden="true" /> {exporting==='csv' ? 'Exporting…' : 'Export CSV'}</button>
        <button className="adm-btn" style={{ minHeight:44 }} onClick={()=>exportStock('pdf')} disabled={!!exporting}><FileText size={14} aria-hidden="true" /> {exporting==='pdf' ? 'Exporting…' : 'Export PDF'}</button>
        </>}
        {isAdmin() && <>
        <button className="adm-btn" aria-pressed={counting} onClick={()=>{ if (counting) exitCount(); else { setCounting(true); setTab('stock'); setCountMsg(null); } }}>
          <NavIcon name="physicalCount" size={14} color="currentColor" /> {counting ? (entries.length ? `Discard ${entries.length} & exit` : 'Exit count mode') : 'Count mode'}
        </button>
        <button className="adm-btn" onClick={()=>setModal('out')} style={{ color:'var(--teal)' }}><NavIcon name="stockOut" size={14} color="currentColor" /> Stock Out</button>
        <button className="adm-btn primary" onClick={()=>setModal('in')}><NavIcon name="stockIn" size={14} color="currentColor" /> Stock In</button>
        </>}
      </PageHeader>

      {exportErr && <div style={{ marginBottom:14 }}><ErrorBlock msg={exportErr} /></div>}
      {loadError && !loading && <div style={{ marginBottom:14 }}><ErrorBlock msg="Couldn't load inventory — check your connection." onRetry={()=>load(true)} /></div>}

      {reorderCount > 0 && !counting && (
        <Banner tone="warn" icon="warning"
          action={isAdmin() ? <button className="adm-btn primary" onClick={()=>nav('/admin/procurement')}>Create PO</button> : null}>
          {reorderCount} material{reorderCount!==1?'s':''} at or below reorder point
        </Banner>
      )}
      {counting && (
        <Banner tone="info" icon="physicalCount" title="Count mode">
          Type what is on the shelf. Enter moves to the next row. Saved counts wait for an Administrator (Manager) to reconcile on <Link to="/admin/physical-count">Physical Count</Link>; stock does not change until then.
        </Banner>
      )}
      {countMsg && (countMsg.failed.length > 0) && (
        <div style={{ marginBottom:14 }}><ErrorBlock msg={`${countMsg.ok} saved, ${countMsg.failed.length} failed — ${countMsg.failed.join('; ')}`} /></div>
      )}

      {!counting && <PillTabs value={tab} onChange={setTab} tabs={[
        { key:'stock', label:'VFRB stock', count:materials.length },
        ...(clientStock.ready ? [{ key:'client', label:'Client-supplied', count:clientStock.orders.length }] : []),
        ...(isStation() ? [] : [{ key:'logs', label:'Transaction log', count:logs.length }]),
      ]} />}

      <TabPanel k={tab}>
      {tab==='stock' && (
        <DataTable label="Stock levels" dense mobileCards loading={loading} rows={8}
          isEmpty={!loadError && filtered.length === 0}
          toolbar={<>
            <SearchBox inputRef={keys.searchRef} value={search} onChange={setSearch} placeholder="Search materials…" label="Search materials" />
            <div className="inv-chips" role="group" aria-label="Stock filter">
              {[['all', 'All', materials.length], ['reorder', 'Reorder', reorderCount], ['out', 'Out', flagCount.out]].map(([k, l, n]) => (
                <button key={k} className={`adm-fchip${filter===k?' on':''}`} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l} · {n}</button>
              ))}
              {categories.length > 1 && (
                <select className="adm-input" style={{ width:'auto' }} value={cat} onChange={e=>setCat(e.target.value)} aria-label="Category">
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </>}
          empty={<EmptyState title="No materials found"
            action={(search || cat!=='all' || filter!=='all') && <button className="adm-link-btn" onClick={()=>{ setSearch(''); setCat('all'); setFilter('all'); }}>Clear filters</button>} />}
          footer={counting
            ? <><span>{entries.length} counted of {filtered.length} shown</span>
                <span style={{ display:'flex', gap:8 }}>
                  <button className="adm-btn" onClick={exitCount} disabled={saving}>Cancel</button>
                  <button className="adm-btn primary" onClick={saveCounts} disabled={saving || !entries.length} style={{ minHeight:44 }}>{saving ? 'Saving…' : `Save ${entries.length} count${entries.length===1?'':'s'}`}</button>
                </span></>
            : <span>{filtered.length} of {materials.length} materials · bar full at 2× reorder point, tick = reorder point</span>}>
          <thead><tr>
            <th>Material</th><th className="num">On hand</th><th>Stock</th><th className="num">Reorder at</th><th>Flag</th>
            {counting && <><th className="num">Counted</th><th className="num">Variance</th></>}
          </tr></thead>
          <tbody ref={keys.listRef}>
            {filtered.map((m, i) => {
              const f = flagOf(m);
              const sys = Number(m.quantity_in_stock) || 0;
              const v = counted[m.material_id] ?? '';
              const diff = v === '' ? null : Number(v) - sys;
              return (
                <tr key={m.material_id} {...(counting ? {} : keys.rowProps(i))} style={{ cursor:'default' }}>
                  <td data-label="Material">
                    <div style={{ fontWeight:700 }}>{m.material_name}<MaterialCode code={m.material_code}/></div>
                    <div style={{ fontSize:12, color:'var(--text-subtle)' }}>{m.category ?? '—'}</div>
                  </td>
                  <td data-label="On hand" className="num" style={{ fontWeight:800, color: f !== 'ok' ? 'var(--danger-text)' : 'var(--ink)' }}>{sys} <span style={{ fontSize:12, fontWeight:600, color:'var(--text-faint)' }}>{m.unit}</span></td>
                  <td data-label="Stock"><div className="inv-bar"><Meter pct={stockPct(m)} tone={f === 'ok' ? 'ok' : 'low'} marker={Number(m.reorder_threshold) > 0 ? 50 : undefined} label={`${m.material_name}: ${sys} ${m.unit}, reorder at ${m.reorder_threshold ?? 0}`} /></div></td>
                  <td data-label="Reorder at" className="num" style={{ color:'var(--text-subtle)' }}>{m.reorder_threshold ?? 0} {m.unit}</td>
                  <td data-label="Flag"><StatusPill status={f} group={`stock-${f}`} label={FLAG_LABEL[f]} /></td>
                  {counting && <>
                    <td data-label="Counted" className="num">
                      <input data-count className="adm-input inv-count" type="number" inputMode="decimal" min={0} step={0.01} value={v}
                        aria-label={`Counted ${m.material_name} (${m.unit})`} placeholder={String(sys)} onKeyDown={nextCount}
                        onChange={e=>setCounted(c => ({ ...c, [m.material_id]: e.target.value }))} />
                    </td>
                    <td data-label="Variance" className="num" style={{ fontWeight:700, color: diff == null ? 'var(--text-faint)' : diff === 0 ? 'var(--success-text)' : diff < 0 ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                      {diff == null ? '—' : `${diff > 0 ? '+' : ''}${Math.round(diff * 100) / 100}`}
                    </td>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {tab==='client' && (
        <DataTable label="Client-supplied materials" dense mobileCards loading={loading} rows={4} isEmpty={clientStock.orders.length === 0}
          empty={<EmptyState title="No client materials held">Orders that use client-supplied materials appear here until every leftover is returned.</EmptyState>}
          footer={<span>Owned by the client: counted per order, not valued, not reordered. Record deliveries and returns on each order.</span>}>
          <thead><tr><th>Order</th><th>Material</th><th className="num">Needed</th><th className="num">Received</th><th className="num">Held</th><th>Status</th></tr></thead>
          <tbody>
            {clientStock.orders.flatMap(o => o.lines.map((l) => (
              <tr key={`${o.order_id}-${l.material_id}`} style={{ cursor:'pointer' }} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
                <td data-label="Order"><b style={{ color:'var(--teal)' }}>#{o.order_id}</b> <span style={{ color:'var(--text-subtle)', fontSize:12 }}>{o.organization_name || o.customer_name} · {o.status}</span></td>
                <td data-label="Material" style={{ fontWeight:600 }}>{l.material_name}</td>
                <td data-label="Needed" className="num">{l.required ?? '—'}</td>
                <td data-label="Received" className="num">{l.received}</td>
                <td data-label="Held" className="num" style={{ fontWeight:800 }}>{l.on_hand} <span style={{ fontSize:12, fontWeight:600, color:'var(--text-faint)' }}>{l.unit}</span></td>
                <td data-label="Status"><ClientLineStatus line={l} /></td>
              </tr>
            )))}
          </tbody>
        </DataTable>
      )}

      {tab==='logs' && !isStation() && (
        <DataTable label="Transaction log" dense mobileCards loading={loading} rows={8} isEmpty={logs.length === 0}
          empty={<EmptyState title="No transactions yet" />}
          footer={logs.length > 30 ? <span>Latest 30 of {logs.length}</span> : null}>
          <thead><tr><th>Material</th><th>Type</th><th className="num">Change</th><th>Reason</th><th>Date</th><th>By</th></tr></thead>
          <tbody>
            {logs.slice(0,30).map((l,i)=>{
              const tc = TYPE_CFG[l.type] ?? { color:'var(--text-subtle)', bg:'var(--bg-surface)' };
              return (
                <tr key={l.log_id??i}>
                  <td data-label="Material" style={{ fontWeight:600 }}>{l.material?.material_name??`#${l.material_id}`}</td>
                  <td data-label="Type"><span className="adm-pill" style={{ background:tc.bg, color:tc.color }}>{tc.label ?? (l.type??'—').replace('_',' ')}</span></td>
                  <td data-label="Change" className="num" style={{ fontWeight:800, color:Number(l.change_qty)>=0?'var(--success-text)':'var(--danger-text)' }}>{Number(l.change_qty)>0?'+':''}{l.change_qty} {l.material?.unit??''}</td>
                  <td data-label="Reason" style={{ color:'var(--text-subtle)', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.reason??'—'}</td>
                  <td data-label="Date" style={{ color:'var(--text-faint)', whiteSpace:'nowrap' }}>{fmtLog(l.log_date)}</td>
                  <td data-label="By" style={{ color:'var(--text-subtle)' }}>{l.recorded_by_name ?? l.recorder?.name ?? '—'}</td>
                </tr>);
            })}
          </tbody>
        </DataTable>
      )}
      </TabPanel>
    </>
  );
}
