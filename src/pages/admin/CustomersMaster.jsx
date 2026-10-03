import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import {
  PageHeader, StatGrid, PillTabs, Panel, SearchBox, Avatar, ErrorBlock, SkeletonRows,
  FilterSheet, FilterButton, useIsMobile,
} from '../../components/admin/AdminUI';

const TYPES = { individual: 'Individual', corporate: 'Corporate', school: 'School', medical: 'Medical' };
const TYPE_TONE = {
  individual: ['var(--bg-surface)', 'var(--text-muted)'], corporate: ['var(--info-bg)', 'var(--info-text)'],
  school: ['var(--teal-50)', 'var(--teal)'], medical: ['var(--success-bg)', 'var(--success-text)'],
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const dash = (v) => (v && String(v).trim() ? v : '—');

const TypePill = ({ type }) => {
  if (!type) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  const [bg, fg] = TYPE_TONE[type] ?? TYPE_TONE.individual;
  return <span className="adm-pill" style={{ background: bg, color: fg }}>{TYPES[type] ?? type}</span>;
};

const OrdersCell = ({ c }) => (
  <span>
    <b>{c.orders_count}</b>
    {Number(c.active_orders) > 0 && <span className="adm-pill" style={{ marginLeft: 6, background: 'var(--teal-50)', color: 'var(--teal)' }}>{c.active_orders} active</span>}
  </span>
);

function DetailDrawer({ c, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="adm-drawer" onClick={onClose}>
      <aside className="adm-drawer-panel" role="dialog" aria-modal="true" aria-label={`Client ${c.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
            <Avatar name={c.name} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              <div style={{ marginTop: 3 }}><TypePill type={c.client_type} /></div>
            </div>
          </div>
          <button ref={closeRef} className="adm-btn" onClick={onClose} aria-label="Close client details"><NavIcon name="close" size={15} color="currentColor" /></button>
        </div>
        <div className="adm-drawer-body">
          <div className="adm-stack">
            <div className="cm-mini">
              <div><b>{c.orders_count}</b><span>Total orders</span></div>
              <div><b style={{ color: Number(c.active_orders) ? 'var(--teal)' : undefined }}>{c.active_orders}</b><span>Active</span></div>
              <div><b style={{ fontSize: 13 }}>{fmt(c.last_order_at)}</b><span>Last order</span></div>
            </div>
            <Panel title="Contact">
              <dl className="adm-kv">
                <dt>Email</dt><dd>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--teal)' }}>{c.email}</a> : '—'}</dd>
                <dt>Phone</dt><dd>{c.contact_number ? <a href={`tel:${c.contact_number}`} style={{ color: 'var(--teal)' }}>{c.contact_number}</a> : '—'}</dd>
                <dt>Address</dt><dd>{dash(c.address)}</dd>
              </dl>
            </Panel>
            <Panel title="Organization & account">
              <dl className="adm-kv">
                <dt>Organization</dt><dd>{dash(c.organization_name)}</dd>
                <dt>Client type</dt><dd>{c.client_type ? TYPES[c.client_type] : '—'}</dd>
                <dt>Email</dt><dd>{c.email_verified_at ? `Verified ${fmt(c.email_verified_at)}` : 'Not verified'}</dd>
                <dt>Joined</dt><dd>{fmt(c.created_at)}</dd>
              </dl>
            </Panel>
            <p className="adm-sub">Read-only master data. Clients update their own profile from the customer portal.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function CustomersMaster() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [sel, setSel] = useState(null);
  const seq = useRef(0);

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true); setLoadErr(false);
    try {
      const r = await axios.get('/api/admin/customers', { params: { page, per_page: 25, search: q || undefined, client_type: type === 'all' ? undefined : type } });
      if (my !== seq.current) return;
      setRows(r.data?.data ?? []);
      setMeta({ current_page: r.data?.current_page ?? 1, last_page: r.data?.last_page ?? 1, total: r.data?.total ?? 0 });
      if (r.data?.summary) setSummary(r.data.summary);
    } catch { if (my === seq.current) setLoadErr(true); }
    finally { if (my === seq.current) setLoading(false); }
  }, [page, q, type]);
  useEffect(() => { load(); }, [load]);

  const tabs = [{ key: 'all', label: 'All', count: summary?.total ?? 0 }, ...Object.entries(TYPES).map(([k, l]) => ({ key: k, label: l, count: summary?.[k] ?? 0 }))];
  const setT = (k) => { setType(k); setPage(1); };
  const filtered = q || type !== 'all';
  const clear = () => { setSearch(''); setQ(''); setType('all'); setPage(1); };

  const pager = meta.last_page > 1 && (
    <div className="cm-pager">
      <span>Page {meta.current_page} of {meta.last_page} · {meta.total} clients</span>
      <div>
        <button className="adm-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}><NavIcon name="back" size={14} color="currentColor" /> Prev</button>
        <button className="adm-btn" disabled={page >= meta.last_page || loading} onClick={() => setPage((p) => p + 1)}>Next <NavIcon name="chevronRight" size={14} color="currentColor" /></button>
      </div>
    </div>
  );

  return (
    <>
      {sel && <DetailDrawer c={sel} onClose={() => setSel(null)} />}
      {sheet && <FilterSheet title="Filter by client type" options={tabs} value={type} onChange={setT} onClose={() => setSheet(false)} isMobile={isMobile} />}
      <PageHeader title="Client Master Data" sub={`${summary?.total ?? '…'} registered clients · read-only`}>
        <button className="adm-btn" onClick={load}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load clients." onRetry={load} /></div>}

      <StatGrid loading={!summary && loading} items={[
        { label: 'All clients', value: summary?.total ?? 0, color: 'var(--teal)', onClick: () => setT('all') },
        ...Object.entries(TYPES).map(([k, l]) => ({ label: l, value: summary?.[k] ?? 0, onClick: () => setT(type === k ? 'all' : k) })),
      ]} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, organization, phone…" label="Search clients" />
        <FilterButton label={`Type: ${tabs.find((t) => t.key === type)?.label}`} onClick={() => setSheet(true)} />
      </div>
      <div className="adm-only-d"><PillTabs value={type} onChange={setT} tabs={tabs} /></div>

      <div className="adm-only-d">
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr><th>Client</th><th>Organization</th><th>Type</th><th>Contact</th><th className="adm-hide-t">Address</th><th>Orders</th><th className="adm-hide-t">Last order</th><th className="adm-hide-t">Joined</th></tr></thead>
              <tbody>
                {!loading && rows.map((c) => (
                  <tr key={c.user_id} className="adm-row" tabIndex={0} onClick={() => setSel(c)} onKeyDown={(e) => e.key === 'Enter' && setSel(c)}>
                    <td><div className="cm-who"><Avatar name={c.name} /><div><div style={{ fontWeight: 700 }}>{c.name}</div><div className="cm-sub">{c.email}</div></div></div></td>
                    <td>{dash(c.organization_name)}</td>
                    <td><TypePill type={c.client_type} /></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{dash(c.contact_number)}</td>
                    <td className="adm-hide-t" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }} title={c.address ?? ''}>{dash(c.address)}</td>
                    <td><OrdersCell c={c} /></td>
                    <td className="adm-hide-t" style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }}>{fmt(c.last_order_at)}</td>
                    <td className="adm-hide-t" style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }}>{fmt(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <SkeletonRows rows={6} h={52} />}
          {!loading && !loadErr && rows.length === 0 && (
            <div className="adm-empty"><NavIcon name="users" size={30} color="currentColor" />
              <div style={{ marginTop: 8, fontWeight: 700 }}>{filtered ? 'No clients match your filters' : 'No registered clients yet'}</div>
              {filtered && <button className="adm-link-btn" onClick={clear}>Clear filters</button>}
            </div>
          )}
          {pager}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={`${type}-${q}-${page}`}>
        {loading ? <SkeletonRows rows={3} h={120} /> : rows.length === 0 ? (
          <div className="adm-empty"><NavIcon name="users" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>{filtered ? 'No clients match' : 'No registered clients yet'}</div>
            {filtered && <button className="adm-link-btn" onClick={clear}>Clear filters</button>}</div>
        ) : rows.map((c, i) => (
          <div key={c.user_id} className="adm-mcard" style={{ '--i': Math.min(i, 8) }} onClick={() => setSel(c)}>
            <div className="adm-mrow">
              <div className="cm-who" style={{ minWidth: 0 }}><Avatar name={c.name} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div><div className="cm-sub">{dash(c.organization_name)}</div></div></div>
              <TypePill type={c.client_type} />
            </div>
            <div className="cm-lines">
              <span><NavIcon name="email" size={13} color="currentColor" /> {dash(c.email)}</span>
              <span><NavIcon name="phone" size={13} color="currentColor" /> {dash(c.contact_number)}</span>
            </div>
            <div className="adm-mfoot" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Orders <OrdersCell c={c} /></span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Last: {fmt(c.last_order_at)}</span>
            </div>
          </div>
        ))}
        {pager}
      </div>
    </>
  );
}
