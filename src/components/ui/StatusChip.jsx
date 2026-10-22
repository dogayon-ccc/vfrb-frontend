// src/components/ui/StatusChip.jsx
// The one status chip (U1). Every status renders as label + icon + colour,
// never colour alone. Five groups: pending (amber), in production (blue),
// ready (teal), delivered/done (green), problem/cancelled (red).
// kind="stock" maps stock levels (admin only) onto ok/low/out. Exported as StatusBadge too.
// Styles: .status-chip in styles/theme.css.
import { Clock, Cog, PackageCheck, CheckCircle2, AlertOctagon, Circle, AlertTriangle, PackageX } from 'lucide-react';

const GROUP = {
  pending:  { cls: 'pending',  Icon: Clock },
  progress: { cls: 'progress', Icon: Cog },
  ready:    { cls: 'ready',    Icon: PackageCheck },
  done:     { cls: 'done',     Icon: CheckCircle2 },
  problem:  { cls: 'problem',  Icon: AlertOctagon },
  neutral:  { cls: '',         Icon: Circle },
  'stock-ok':  { cls: 'stock-ok',  Icon: PackageCheck },
  'stock-low': { cls: 'stock-low', Icon: AlertTriangle },
  'stock-out': { cls: 'stock-out', Icon: PackageX },
};

const STOCK_GROUP = {
  ok: 'stock-ok', in_stock: 'stock-ok', low: 'stock-low', low_stock: 'stock-low', out: 'stock-out', out_of_stock: 'stock-out',
};

const STATUS_GROUP = {
  pending: 'pending', preparing: 'pending', draft: 'neutral', awaiting: 'pending', unpaid: 'pending',
  confirmed: 'progress', pattern: 'progress', segregation: 'progress', cutting: 'progress',
  sewing: 'progress', qc: 'progress', pressing: 'progress', packing: 'progress',
  in_production: 'progress', sent: 'progress', approved: 'progress', dispatched: 'progress',
  in_transit: 'progress', out_for_delivery: 'progress', processing: 'progress',
  ready: 'ready', for_delivery: 'ready', ready_for_delivery: 'ready', partial: 'ready',
  completed: 'done', delivered: 'done', received: 'done', reconciled: 'done',
  active: 'done', paid: 'done', accepted: 'done', verified: 'done',
  cancelled: 'problem', canceled: 'problem', returned: 'problem', failed: 'problem',
  rejected: 'problem', inactive: 'problem', flagged: 'problem', overdue: 'problem', problem: 'problem',
  closed: 'neutral',
};

export const statusGroup = (status) => STATUS_GROUP[String(status ?? '').toLowerCase()] ?? 'neutral';

const prettify = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function StatusChip({ status, label, group, kind, size = 14, className = '' }) {
  const key = String(status ?? '').toLowerCase();
  const g = GROUP[group ?? (kind === 'stock' ? STOCK_GROUP[key] : statusGroup(status))] ?? GROUP.neutral;
  const { Icon } = g;
  return (
    <span className={`status-chip ${g.cls} ${className}`.trim()}>
      <Icon size={size} strokeWidth={2.4} aria-hidden="true" />
      {label ?? prettify(status)}
    </span>
  );
}
