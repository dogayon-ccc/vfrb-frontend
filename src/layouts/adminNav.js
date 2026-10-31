// The one admin nav config: the sidebar, the breadcrumb, the page search and Quick add read it. Access is decided by canOpen, never here.
import {
  LayoutDashboard, ClipboardList, Package, MessageSquare, ShoppingCart,
  Truck, Layers, Factory, FileText, ShieldCheck, ScanLine,
  Wallet, BarChart3, Receipt, Building2, Users, MessageCircle, Settings,
  Trophy, Contact, ScrollText, Activity, PackagePlus,
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
  { to:'/admin/activity-log',           icon:Activity,        label:'Activity Log',      group:'System' },
  { to:'/admin/audit-logs',             icon:ScrollText,      label:'Audit Log',         group:'System' },
  { to:'/admin/settings',               icon:Settings,        label:'Settings',          group:'System' },
];

// Quick add: each entry opens the existing page that holds the action. `station` lets a station run it too.
export const QUICK_ADD = [
  { to:'/admin/inventory',    icon:PackagePlus,  label:'Stock in',       page:'Inventory' },
  { to:'/admin/materials',    icon:Layers,       label:'Add material',   page:'Materials' },
  { to:'/admin/procurement',  icon:ShoppingCart, label:'Create PO',      page:'Procurement' },
  { to:'/admin/output-log',   icon:FileText,     label:'Log output',     page:'Output Log', station:true },
  { to:'/admin/transactions', icon:Wallet,       label:'Record payment', page:'Sales & Pay' },
  { to:'/admin/suppliers',    icon:Building2,    label:'Add supplier',   page:'Suppliers' },
  { to:'/admin/users',        icon:Users,        label:'Add user',       page:'User Management' },
];

// Longest nav entry for a path; /admin/dashboard is the Dashboard entry.
export function navMatch(path, items = NAV) {
  const hit = (i) => path === i.to || (!i.end && path.startsWith(`${i.to}/`)) || (i.to === '/admin' && path === '/admin/dashboard');
  return [...items].sort((a, b) => b.to.length - a.to.length).find(hit) ?? null;
}

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
