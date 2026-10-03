import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import {
  PageHeader, StatGrid, Panel, StatusPill, SearchBox, Segments, Banner, ErrorBlock, SkeletonRows,
  FilterSheet, FilterButton, useIsMobile,
} from '../../components/admin/AdminUI';

const STAGE_ORDER = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
const LABEL = { pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing' };
const ICON = { pattern: 'pattern', segregation: 'segregation', cutting: 'cutting', sewing: 'garmentType', qc: 'qc', pressing: 'pressing', packing: 'package' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const qcHold = (o) => o.status === 'qc' && o.qc_required === 1 && !o.qc_passed_at;
const dueOf = (o) => o.target_delivery_date ?? o.deadline;
const isOverdue = (o) => { const d = dueOf(o); return d && new Date(d) < new Date(new Date().toDateString()); };

function Progress({ status }) {
  const idx = STAGE_ORDER.indexOf(status);
  return (
    <div style={{ minWidth: 110 }}>
      <Segments total={STAGE_ORDER.length} index={idx} />
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>Stage {idx + 1} of {STAGE_ORDER.length}</div>
    </div>
  );
}

const Spec = ({ o }) => (
  <>
    <div style={{ fontWeight: 600 }}>{o.garment_type ?? 'Custom garment'}</div>
    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{o.quantity_ordered ?? 0} pcs{o.color ? ` · ${o.color}` : ''}</div>
  </>
);

export default function ProductionList() {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState('all');
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

  const counts = useMemo(() => orders.reduce((a, o) => { a[o.status] = (a[o.status] ?? 0) + 1; return a; }, {}), [orders]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders
      .filter((o) => (stage === 'all' || o.status === stage)
        && (!q || String(o.order_id).includes(q) || o.garment_type?.toLowerCase().includes(q)
          || o.color?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q)))
      .sort((a, b) => STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status));
  }, [orders, stage, search]);

  const holds = orders.filter(qcHold).length;
  const overdue = orders.filter(isOverdue).length;
  const pieces = orders.reduce((s, o) => s + (Number(o.quantity_ordered) || 0), 0);
  const options = [{ key: 'all', label: 'All stages', count: orders.length }, ...STAGE_ORDER.map((k) => ({ key: k, label: LABEL[k], count: counts[k] ?? 0 }))];
  const stageLabel = options.find((o) => o.key === stage)?.label;
  const go = (o) => nav(`/admin/production/${o.order_id}`);

  return (
    <>
      {sheet && <FilterSheet title="Filter by stage" options={options} value={stage} onChange={setStage} onClose={() => setSheet(false)} isMobile={isMobile} />}
      <PageHeader title="Production Tracking" sub={`${orders.length} orders on the floor · ${pieces.toLocaleString()} pcs`}>
        <button className="adm-btn" onClick={() => nav('/admin/output-log')}><NavIcon name="outputLog" size={14} color="currentColor" /> Output Log</button>
        <button className="adm-btn" onClick={() => load(true)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>

      {holds > 0 && (
        <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => nav('/admin/qc')}>Open QC</button>}>
          {holds} order{holds > 1 ? 's are' : ' is'} on QC hold — a passing QC checklist is required before advancing.
        </Banner>
      )}
      {loadError && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Couldn't load production orders — check your connection." onRetry={() => load(true)} /></div>}

      <StatGrid loading={loading} items={[
        { label: 'In production', value: orders.length, color: 'var(--teal)', onClick: () => setStage('all') },
        { label: 'Pieces', value: pieces.toLocaleString() },
        { label: 'QC hold', value: holds, color: holds ? 'var(--danger)' : undefined, onClick: () => setStage('qc') },
        { label: 'Past deadline', value: overdue, color: overdue ? 'var(--warning-text)' : undefined },
      ]} />

      <Panel title="Stage pipeline" style={{ marginBottom: 16 }}>
        <div className="adm-pipe" role="tablist" aria-label="Filter by production stage">
          {STAGE_ORDER.map((k, i) => (
            <button key={k} role="tab" aria-selected={stage === k} className={`adm-pipe-step${stage === k ? ' on' : ''}${counts[k] ? '' : ' empty'}`}
              onClick={() => setStage(stage === k ? 'all' : k)} style={{ '--i': i }}>
              <NavIcon name={ICON[k]} size={16} color="currentColor" />
              <b>{loading ? '–' : counts[k] ?? 0}</b>
              <span>{LABEL[k]}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search order, client, garment, color…" label="Search production orders" />
        <FilterButton label={`Stage: ${stageLabel}`} onClick={() => setSheet(true)} />
      </div>

      <div className="adm-only-d">
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr><th>Order</th><th>Client</th><th>Garment</th><th>Stage</th><th className="adm-hide-t">Deadline</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {!loading && filtered.map((o) => (
                  <tr key={o.order_id} className="adm-row" tabIndex={0} onClick={() => go(o)} onKeyDown={(e) => e.key === 'Enter' && go(o)}>
                    <td><div style={{ fontWeight: 800, color: 'var(--teal)' }}>#{o.order_id}</div></td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name ?? '—'}</td>
                    <td><Spec o={o} /></td>
                    <td>
                      <StatusPill status={o.status} label={LABEL[o.status]} />
                      {qcHold(o) && <span className="adm-pill" style={{ marginLeft: 6, background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>QC hold</span>}
                      <div style={{ marginTop: 8 }}><Progress status={o.status} /></div>
                    </td>
                    <td className="adm-hide-t" style={{ whiteSpace: 'nowrap', fontSize: 12, color: isOverdue(o) ? 'var(--danger)' : 'var(--text-subtle)', fontWeight: isOverdue(o) ? 700 : 400 }}>{fmtDate(dueOf(o))}</td>
                    <td><div className="adm-ra" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="adm-btn primary" onClick={(e) => { e.stopPropagation(); go(o); }}><NavIcon name="production" size={13} color="currentColor" /> Track</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <SkeletonRows rows={6} h={52} />}
          {!loading && !loadError && filtered.length === 0 && (
            <div className="adm-empty"><NavIcon name="production" size={30} color="currentColor" />
              <div style={{ marginTop: 8, fontWeight: 700 }}>{search ? `No results for “${search}”` : 'No orders in production right now'}</div>
              {(search || stage !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setStage('all'); }}>Clear filters</button>}
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={`${stage}-${search}`}>
        {loading ? <SkeletonRows rows={3} h={150} />
          : filtered.length === 0 ? <div className="adm-empty">{search ? `No results for “${search}”` : 'No orders in production right now'}</div>
            : filtered.map((o, i) => (
              <div key={o.order_id} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': qcHold(o) ? 'var(--danger)' : 'var(--teal)' }} onClick={() => go(o)}>
                <div className="adm-mrow">
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>#{o.order_id}</span>
                  <StatusPill status={o.status} label={LABEL[o.status]} />
                </div>
                <div style={{ marginTop: 8 }}><Spec o={o} /></div>
                {o.customer_name && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{o.customer_name}</div>}
                <div style={{ marginTop: 10 }}><Progress status={o.status} /></div>
                {qcHold(o) && <div className="adm-inline-warn"><NavIcon name="warning" size={13} color="currentColor" /> QC hold — complete the QC checklist to advance</div>}
                <div className="adm-mfoot"><button className="adm-btn primary" onClick={(e) => { e.stopPropagation(); go(o); }}>Track order #{o.order_id}</button></div>
              </div>
            ))}
      </div>
    </>
  );
}
