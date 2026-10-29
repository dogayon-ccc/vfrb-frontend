// Mock data for the /dev/layouts prototypes only. Nothing here is read by production code.

export const PALETTE = [
  { name: 'Navy', hex: '#1f3a5f' }, { name: 'Charcoal', hex: '#3a3f44' }, { name: 'Teal', hex: '#1f6f6b' },
  { name: 'Maroon', hex: '#6b2737' }, { name: 'Forest', hex: '#2f5d3a' }, { name: 'Sky', hex: '#8fb8d8' },
  { name: 'Cream', hex: '#f4f1ea' }, { name: 'White', hex: '#ffffff' },
];

export const colourName = hex => PALETTE.find(p => p.hex === hex)?.name ?? hex;

// `scheme` groups zones so "Whole set" edits one Main and one Accent colour across every piece.
export const PIECES = {
  top: {
    role: 'top', label: 'Top', garment: 'Polo shirt', choices: ['Polo shirt', 'Scrub top', 'Blouse', 'Jacket'],
    zones: [{ id: 'body', label: 'Body', scheme: 'main' }, { id: 'sleeves', label: 'Sleeves', scheme: 'main' }, { id: 'collar', label: 'Collar', scheme: 'accent' }],
  },
  bottom: {
    role: 'bottom', label: 'Bottom', garment: 'Trousers', choices: ['Trousers', 'Skirt', 'Shorts', 'Scrub pants'],
    zones: [{ id: 'legs', label: 'Main', scheme: 'main' }, { id: 'waist', label: 'Waistband', scheme: 'accent' }],
  },
};

export const START_COLOURS = {
  top: { body: '#1f3a5f', sleeves: '#1f3a5f', collar: '#f4f1ea' },
  bottom: { legs: '#1f3a5f', waist: '#f4f1ea' },
};

export const PLACEMENTS = ['Left chest', 'Right chest', 'Upper back', 'Sleeve'];

// High-level customer statuses only: no stage names, prices or formulas.
const designs = [
  { id: 'd1', name: 'Front desk set', pieces: ['top', 'bottom'], colours: { top: { body: '#1f3a5f', sleeves: '#1f3a5f', collar: '#f4f1ea' }, bottom: { legs: '#1f3a5f', waist: '#f4f1ea' } }, ordered: true, updated: 'Oct 14' },
  { id: 'd2', name: 'Ward nurses scrubs', pieces: ['top', 'bottom'], colours: { top: { body: '#1f6f6b', sleeves: '#1f6f6b', collar: '#1f6f6b' }, bottom: { legs: '#1f6f6b', waist: '#1f6f6b' } }, ordered: false, updated: 'Oct 20' },
  { id: 'd3', name: 'PE shirt 2026', pieces: ['top'], colours: { top: { body: '#6b2737', sleeves: '#f4f1ea', collar: '#f4f1ea' } }, ordered: true, updated: 'Sep 30' },
];

export const SCENARIOS = {
  action: {
    label: 'Action needed',
    actions: [{ title: 'Confirm sizes for order VF-1042', body: 'We need your size list before we can start. It takes about 5 minutes.', cta: 'Confirm sizes' }],
    orders: [{ id: 'VF-1042', name: 'Front desk set', status: 'Waiting on you', step: 0 }, { id: 'VF-1031', name: 'PE shirt 2026', status: 'In production', step: 1 }],
    designs,
  },
  progress: {
    label: 'Order in progress',
    actions: [],
    orders: [{ id: 'VF-1031', name: 'PE shirt 2026', status: 'In production', step: 1 }, { id: 'VF-0998', name: 'Front desk set', status: 'Delivered', step: 3 }],
    designs,
  },
  draft: { label: 'Draft only', actions: [], orders: [{ id: 'VF-0998', name: 'Front desk set', status: 'Delivered', step: 3 }], designs },
  fresh: { label: 'New customer', actions: [], orders: [], designs: [] },
  loading: { label: 'Loading', loading: true },
  error: { label: 'Error', error: true },
};

export const ORDER_STEPS = ['Received', 'In production', 'Ready', 'Delivered'];

// One first action, in priority order: action needed > latest active order > continue draft > start new.
export function pickFirstAction(s) {
  if (s.actions?.length) return { kind: 'action', eyebrow: 'Action needed', ...s.actions[0] };
  const active = s.orders?.find(o => o.step < 3);
  if (active) return { kind: 'status', eyebrow: 'Latest order', title: `${active.name} is ${active.status.toLowerCase()}`, body: `Order ${active.id}. We'll let you know when it's ready.`, cta: 'View order', order: active };
  const draft = s.designs?.find(d => !d.ordered);
  if (draft) return { kind: 'draft', eyebrow: 'Continue where you left off', title: draft.name, body: `Draft saved ${draft.updated}. Finish it and send it for an order.`, cta: 'Continue design', design: draft };
  return { kind: 'start', eyebrow: 'Get started', title: 'Design your first uniform', body: 'Pick a garment, set your colours and add your logo. You can order a single piece or a matching top and bottom.', cta: 'Start a new design' };
}
