// The one admin nav config: the rail, the mobile bar, the More sheet, the page title and "Jump to a page" all read it.
// `short` puts an entry in the mobile bar under that label. Access is decided by canOpen, never here.
import {
  LayoutDashboard, ClipboardList, Package, MessageSquare, ShoppingCart,
  Truck, Layers, Factory, FileText, ShieldCheck, ScanLine,
  Wallet, BarChart3, Receipt, Building2, Users, MessageCircle, Settings,
  Trophy, Contact, ScrollText,
} from 'lucide-react';

export const NAV_GROUPS = ['Operate', 'Materials', 'Money', 'People', 'System'];

export const NAV = [
  { to:'/admin',                        icon:LayoutDashboard, label:'Dashboard',         group:'Operate',   short:'Home', end:true },
  { to:'/admin/orders',                 icon:ClipboardList,   label:'Orders',            group:'Operate',   short:'Orders' },
  { to:'/admin/production',             icon:Factory,         label:'Production Orders', group:'Operate',   short:'Production' },
  { to:'/admin/output-log',             icon:FileText,        label:'Output Log',        group:'Operate' },
  { to:'/admin/qc',                     icon:ShieldCheck,     label:'QC Checklist',      group:'Operate' },
  { to:'/admin/delivery',               icon:Truck,           label:'Delivery',          group:'Operate' },
  { to:'/admin/messages',               icon:MessageSquare,   label:'Messages',          group:'Operate' },
  { to:'/admin/inventory',              icon:Package,         label:'Inventory',         group:'Materials', short:'Stock' },
  { to:'/admin/materials',              icon:Layers,          label:'Materials',         group:'Materials' },
  { to:'/admin/physical-count',         icon:ScanLine,        label:'Physical Count',    group:'Materials' },
  { to:'/admin/procurement',            icon:ShoppingCart,    label:'Procurement',       group:'Materials' },
  { to:'/admin/suppliers',              icon:Building2,       label:'Suppliers',         group:'Materials' },
  { to:'/admin/transactions',           icon:Wallet,          label:'Sales & Pay',       group:'Money' },
  { to:'/admin/invoice',                icon:Receipt,         label:'Invoice',           group:'Money' },
  { to:'/admin/reports',                icon:BarChart3,       label:'Reports',           group:'Money' },
  { to:'/admin/customers',              icon:Contact,         label:'Customers',         group:'People' },
  { to:'/admin/users',                  icon:Users,           label:'User Management',   group:'People' },
  { to:'/admin/feedback',               icon:MessageCircle,   label:'Feedback',          group:'People' },
  { to:'/admin/designs/showcase-queue', icon:Trophy,          label:'Showcase',          group:'People' },
  { to:'/admin/audit-logs',             icon:ScrollText,      label:'Audit Log',         group:'System' },
  { to:'/admin/settings',               icon:Settings,        label:'Settings',          group:'System' },
];

export function navFor(allowed) {
  const items = NAV.filter(allowed);
  const groups = NAV_GROUPS.map(name => ({ name, items: items.filter(i => i.group === name) })).filter(g => g.items.length);
  return { items, groups, bar: items.filter(i => i.short) };
}

export function searchNav(items, q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const score = (i) => (i.label.toLowerCase().startsWith(s) ? 0 : i.label.toLowerCase().includes(s) ? 1 : i.group.toLowerCase().startsWith(s) ? 2 : 3);
  return items.map(i => [score(i), i]).filter(([n]) => n < 3).sort((a, b) => a[0] - b[0]).map(([, i]) => i).slice(0, 6);
}
