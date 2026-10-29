// Pure Order Wizard logic: Studio prefill, per-step validation and the POST /api/customer/orders payload.
import { STD_SIZES, MIN_ORDER_QTY, orderQty, qtyShort } from '../../../utils/orderQuantity';

export const STEPS = ['Design', 'Sizes', 'Delivery', 'Review'];
export const FABRIC_TYPES = ['Cotton', 'Sublimation / Dry-fit', 'TC', 'Not sure'];

// Garments a customer can name for an upload-only order (garment_type is free text server-side).
export const GARMENTS = {
  top: ['T-Shirt', 'Polo Shirt', 'Round Neck', 'V-Neck Shirt', 'Button-Down', 'Mandarin Collar', 'Blouse', 'Polo Barong',
    'Scrub Top', 'Lab Coat', 'Lab Coverall', 'Jacket', 'Blazer', 'Collarless Blazer', 'Vest', 'Dress', 'Others'],
  bottom: ['Pants', 'Shorts', 'Skirt', 'Pleated Skirt', 'Scrub Pants'],
};
const BOTTOM_RE = /pant|short|skirt|trouser|slack|jogger/i;
export const garmentKind = (name, role) => (role === 'bottom' || (role !== 'top' && BOTTOM_RE.test(name ?? '')) ? 'bottoms' : 'tops');

// Custom measurements, in inches; keys match the measurements table columns read by customerStore.
export const MEASURES = {
  tops: [['chest', 'Chest'], ['sleeve_length', 'Sleeve length'], ['neck', 'Neck']],
  bottoms: [['waist', 'Waist'], ['hip', 'Hip']],
};

const COLLAR_MAP = { 'V-Neck': 'V-Neck', 'Polo Collar': 'Polo Collar', 'Round Neck': 'Round Neck', Mandarin: 'Mandarin Collar' };
// Keyed on the Studio's sleeve pill values.
const SLEEVE_MAP = { Sleeveless: 'Sleeveless', Short: 'Short Sleeve', '3/4': '3/4 Sleeve', Long: 'Long Sleeve', Raglan: 'Raglan Sleeve' };
// The Studio has no collar picker; these garment names imply exactly one collar.
const IMPLIED_COLLAR = { 'Round Neck': 'Round Neck', 'Mandarin Collar': 'Mandarin Collar', 'Polo Shirt': 'Polo Collar', 'School Polo': 'Polo Collar', 'V-Neck Shirt': 'V-Neck', 'Button-Down': 'Button Down' };
const HEX_NAME = {
  '#028090': 'Teal', '#1E3A5F': 'Navy Blue', '#7F1D1D': 'Dark Red', '#14532D': 'Dark Green', '#F0F0F0': 'White', '#1A1A1A': 'Black',
  '#6B7280': 'Gray', '#DC2626': 'Red', '#2563EB': 'Blue', '#7C3AED': 'Purple', '#DB2777': 'Pink', '#D97706': 'Orange',
  '#1B2A4A': 'Navy Blue', '#2952A3': 'Royal Blue', '#006A4E': 'Bottle Green', '#800000': 'Maroon', '#808080': 'Gray',
  '#FFFFFF': 'White', '#000000': 'Black', '#87CEEB': 'Sky Blue', '#AED6F1': 'Light Blue',
};
export const colorName = hex => (hex ? HEX_NAME[hex.toUpperCase()] ?? hex.toUpperCase() : '');

export const INIT = {
  garment_type: '', collar_type: '', sleeve_type: '', client_design_notes: '', extra_notes: '', design_ref_file: null, color: '',
  fabric_type: '', delivery_method: 'vfrb_deliver', delivery_address: '', po_reference: '', special_notes: '', deadline: '',
  sizing_type: 'standard', sizes: {}, measurements: {}, custom_qty: '',
};
// Delivery fields belong to the whole order, so a set writes them to every piece.
export const SHARED = ['fabric_type', 'delivery_method', 'delivery_address', 'po_reference', 'special_notes', 'deadline'];

export const garmentOf = cfg => cfg?.garmentType ?? cfg?.garment ?? '';

// Everything the order needs from one Studio design; the customer never re-enters it.
export function prefillFrom(cfg) {
  const garment = garmentOf(cfg);
  const collar = COLLAR_MAP[cfg.collarType ?? cfg.collar] ?? IMPLIED_COLLAR[garment] ?? '';
  const sleeve = SLEEVE_MAP[cfg.sleeveType ?? cfg.sleeve] ?? '';
  const color = colorName(cfg.colors?.body);
  const notes = [cfg.category && `${cfg.category} uniform.`, garment && `${garment} style.`, collar && `${collar} collar.`,
    sleeve && `${sleeve}.`, color && `Primary color: ${color}.`, 'Designed in the VFRB Design Studio.'].filter(Boolean).join(' ');
  return { garment_type: garment, collar_type: collar, sleeve_type: sleeve, color, client_design_notes: notes };
}

const LEAD_DAYS = 7; // backend: vfrb.min_promised_days
export function minDeadline(now = new Date()) {
  const d = new Date(now); d.setDate(d.getDate() + LEAD_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Errors for one piece at one step; an empty object means the step is complete.
export function validateStep(step, f, studio, today = new Date()) {
  const e = {};
  if (step === 0 && !studio) {
    if (!f.garment_type) e.garment_type = 'Choose the garment in your reference.';
    if (!f.design_ref_file) e.design_ref_file = 'Upload a reference image or PDF, or design it in the Studio.';
    const n = f.client_design_notes.trim().length;
    if (n < 15) e.client_design_notes = n ? 'Add a little more detail (at least 15 characters).' : 'Describe what VFRB should make.';
  }
  if (step === 1) {
    if (!studio?.colors?.body && !f.color.trim()) e.color = 'Enter the main color.';
    const short = qtyShort(f);
    if (short) e.sizes = `Minimum ${MIN_ORDER_QTY} pieces: add ${short} more.`;
  }
  if (step === 2) {
    if (!f.fabric_type) e.fabric_type = 'Choose a fabric, or "Not sure".';
    if (f.delivery_method !== 'pickup' && !f.delivery_address.trim()) e.delivery_address = 'Enter where VFRB should deliver.';
    if (f.deadline && f.deadline < minDeadline(today)) e.deadline = `Pick ${minDeadline(today)} or later.`;
  }
  return e;
}

// Plain fields for one order's FormData; files and the preview blob are appended by the caller.
export function orderFields(f, studioCfg, setLine = '') {
  const custom = f.sizing_type === 'custom';
  const sizes = Object.fromEntries(STD_SIZES.filter(s => Number(f.sizes[s]) > 0).map(s => [s, Number(f.sizes[s])]));
  const meas = Object.fromEntries(Object.entries(f.measurements).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  const notes = [setLine, custom && Object.keys(meas).length ? 'Custom measurements are in inches.' : '', f.special_notes.trim()].filter(Boolean).join('\n');
  const design = [f.client_design_notes.trim(), f.extra_notes.trim()].filter(Boolean).join('\n');
  return Object.fromEntries(Object.entries({
    garment_type: f.garment_type, collar_type: f.collar_type, sleeve_type: f.sleeve_type, color: f.color.trim(),
    client_design_notes: design, order_type: 'direct', quantity_ordered: orderQty(f), fabric_type: f.fabric_type,
    delivery_method: f.delivery_method, delivery_address: f.delivery_method === 'pickup' ? '' : f.delivery_address.trim(), preferred_date: f.deadline, po_reference: f.po_reference.trim(),
    special_notes: notes, sizing_type: f.sizing_type,
    sizes: !custom && Object.keys(sizes).length ? JSON.stringify(sizes) : '',
    measurements: custom && Object.keys(meas).length ? JSON.stringify(meas) : '',
    custom_qty: custom ? orderQty(f) : '',
    studio_config: studioCfg ? JSON.stringify(studioCfg) : '',
    studio_color: studioCfg?.colors?.body ?? '',
  }).filter(([, v]) => v !== '' && v != null));
}
