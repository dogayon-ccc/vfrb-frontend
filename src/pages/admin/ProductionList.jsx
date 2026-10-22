import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import { DataTable, EmptyState } from '../../components/ui';
import useListKeys from '../../hooks/useListKeys';
import ProductionProgress, { useProductionSummaries } from '../../components/admin/ProductionProgress';
import {
  PageHeader, Panel, StatusPill, SearchBox, Banner, ErrorBlock, FilterSheet, FilterButton, useIsMobile,
} from '../../components/admin/AdminUI';

const STAGE_ORDER = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
const LABEL = { pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing' };
const ICON = { pattern: 'pattern', segregation: 'segregation', cutting: 'cutting', sewing: 'garmentType', qc: 'qc', pressing: 'pressing', packing: 'package' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
// qc_required arrives as true from Postgres (1 from MySQL), so compare by number like ProductionTracking does.
const qcHold = (o) => o.status === 'qc' && !!Number(o.qc_required) && !o.qc_passed_at;
const dueOf = (o) => o.target_delivery_date ?? o.deadline;
const isOverdue = (o) => { const d = dueOf(o); return d && new Date(d) < new Date(new Date().toDateString()); };

export default function ProductionList() {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [params, setParams] = useSearchParams();
  // The stage filter lives in the URL so the dashboard stage board can link straight to it.
  const stage = STAGE_ORDER.includes(params.get('stage')) ? params.get('stage') : 'all';
  const setStage = useCallback((k) => setParams(k === 'all' ? {} : { stage: k }, { replace: true }), [setParams]);
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = cacheGet('production_orders_list');
      if (cached) { setOrders(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadError(false);
    try {
      const r = await axios.get('/api/admin/orders?status=production&per_page=100');
      const prod = (r.data?.data ?? r.data ?? []).filter((o) => STAGE_ORDER.includes(o.status));
      setOrders(prod);
      cacheSet('production_orders_list', prod, 30_000);
    } catch { setLoadError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const summaries = useProductionSummaries(useMemo(() => orders.map((o) => o.order_id), [orders]));
  const counts = useMemo(() => orders.reduce((a, o) => { a[o.status] = (a[o.status] ?? 0) + 1; return a; }, {}), [orders]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders
      .filter((o) => (stage === 'all' || o.status === stage)
        && (!q || String(o.order_id).includes(q) || o.garment_type?.toLowerCase().includes(q)
          || o.color?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q)))
      .sort((a, b) => STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status));
  }, [orders, stage, search]);

  const go = (o) => nav(`/admin/production/${o.order_id}`);
  const keys = useListKeys({ count: filtered.length, onOpen: (i) => filtered[i] && go(filtered[i]) });
  const holds = orders.filter(qcHold).length;
  const overdue = orders.filter(isOverdue).length;
  const pieces = orders.reduce((s, o) => s + (Number(o.quantity_ordered) || 0), 0);
  const options = [{ key: 'all', label: 'All stages', count: orders.length }, ...STAGE_ORDER.map((k) => ({ key: k, label: LABEL[k], count: counts[k] ?? 0 }))];
  const stageLabel = options.find((o) => o.key === stage)?.label;

  return (
    <>
      {sheet && <FilterSheet title="Filter by stage" options={options} value={stage} onChange={setStage} onClose={() => setSheet(false)} isMobile={isMobile} />}
      <PageHeader title="Production"
        sub={loading ? 'Loading…' : `${orders.length} orders · ${pieces.toLocaleString()} pcs · ${holds} on QC hold · ${overdue} past deadline`}>
        <button className="adm-btn" onClick={() => nav('/admin/output-log')}><NavIcon name="outputLog" size={14} color="currentColor" /> Output Log</button>
        <button className="adm-btn" onClick={() => load(true)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>

      {holds > 0 && (
        <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => nav('/admin/qc')}>Open QC</button>}>
          {holds} order{holds > 1 ? 's are' : ' is'} on QC hold — a passing QC checklist is required before advancing.
        </Banner>
      )}
      {loadError && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Couldn't load production orders — check your connection." onRetry={() => load(true)} /></div>}

      <Panel title="Stage pipeline" style={{ marginBottom: 16 }}>
        <div className="adm-pipe" role="group" aria-label="Filter by production stage">
          {STAGE_ORDER.map((k, i) => (
            <button key={k} aria-pressed={stage === k} className={`adm-pipe-step${stage === k ? ' on' : ''}${counts[k] ? '' : ' empty'}`}
              onClick={() => setStage(stage === k ? 'all' : k)} style={{ '--i': i }}>
              <NavIcon name={ICON[k]} size={16} color="currentColor" />
              <b>{loading ? '–' : counts[k] ?? 0}</b>
              <span>{LABEL[k]}</span>
            </button>
          ))}
        </div>
      </Panel>

      <DataTable label="Production orders" dense mobileCards loading={loading} rows={6}
        isEmpty={!loadError && filtered.length === 0}
        toolbar={<>
          <SearchBox inputRef={keys.searchRef} value={search} onChange={setSearch} placeholder="Search order, customer, garment, color…" label="Search production orders" />
          <FilterButton label={`Stage: ${stageLabel}`} onClick={() => setSheet(true)} />
        </>}
        empty={<EmptyState title={search ? `No results for “${search}”` : 'No orders in production right now'}
          action={(search || stage !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setStage('all'); }}>Clear filters</button>} />}
        footer={<span>{filtered.length} of {orders.length} orders · Enter opens tracking</span>}>
        <thead><tr><th>Order</th><th>Customer</th><th>Garment</th><th className="num">Pcs</th><th>Stage</th><th>Current stage output</th><th>Deadline</th></tr></thead>
        <tbody ref={keys.listRef}>
          {filtered.map((o, i) => (
            <tr key={o.order_id} {...keys.rowProps(i)} aria-label={`Order ${o.order_id}, ${LABEL[o.status]}`}>
              <td data-label="Order"><b style={{ color: 'var(--teal)' }}>#{o.order_id}</b></td>
              <td data-label="Customer" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name ?? '—'}</td>
              <td data-label="Garment">{o.garment_type ?? 'Custom garment'}{o.color ? <span style={{ color: 'var(--text-subtle)' }}> · {o.color}</span> : null}</td>
              <td data-label="Pcs" className="num">{o.quantity_ordered ?? 0}</td>
              <td data-label="Stage">
                <StatusPill status={o.status} label={LABEL[o.status]} />
                {qcHold(o) && <span style={{ marginLeft: 6 }}><StatusPill status="flagged" label="QC hold" /></span>}
              </td>
              <td data-label="Output"><ProductionProgress compact summary={summaries[o.order_id] ?? null} /></td>
              <td data-label="Deadline" style={{ whiteSpace: 'nowrap', fontSize: 13, color: isOverdue(o) ? 'var(--danger-text)' : 'var(--text-subtle)', fontWeight: isOverdue(o) ? 700 : 400 }}>{fmtDate(dueOf(o))}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
