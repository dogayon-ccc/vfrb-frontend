// Shared actions for a saved design row from GET /api/customer/designs (My Designs, Dashboard, Studio).
import axios from 'axios';
import { setStudioLock } from './studioLock';
import { stashStudioConfig } from './studioHandoff';
import { savedDesignName } from './designName';

// The backend's `locked` decides: locked opens read-only, a copy opens colour-only, any other own design edits its own row.
export const lockFor = d => (d.locked ? { final: true, orderId: d.order_id ?? null, designId: d.id }
  : d.is_copy ? { colorOnly: true, designId: d.id } : { warn: true, designId: d.id });

export function openDesign(d, nav) {
  try { sessionStorage.setItem('studio_config', JSON.stringify(d.config)); } catch { return false; }
  setStudioLock(lockFor(d));
  nav('/design-studio');
  return true;
}

// Reorder: the same design goes to the Order Wizard as a new order; the saved design is not changed.
export function reorderDesign(d, nav) {
  if (!stashStudioConfig(d.config).ok) return false;
  setStudioLock(null);
  nav('/order/create');
  return true;
}

// Creates the copy on the account (POST /copy), named "Copy of …", and returns it as a list row.
export async function duplicateDesign(d) {
  const name = `Copy of ${savedDesignName(d.config) || d.label || 'design'}`.slice(0, 80);
  const { data } = await axios.post(`/api/customer/designs/${d.id}/copy`, { design_name: name, custom_builder_config: { ...d.config, name } });
  return { id: data.id, label: data.label, config: data.config, order_id: d.order_id ?? null, locked: false, is_copy: true };
}
