import { getGarmentPaths } from './garmentPaths';

// Extent of the sketch's body panel (torso and legs, no sleeves); overlay coordinates are normalised against it.
export function bodyBounds(garment, sleeve) {
  const n = getGarmentPaths(garment, sleeve).body.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// Saved Fabric overlay objects -> one transparent bitmap each, with its centre and size in sketch space.
export async function renderDecals(objects) {
  if (!objects?.length) return [];
  const mod = await import('fabric');
  const fabric = mod.fabric ?? mod.default ?? mod;
  const live = await fabric.util.enlivenObjects(objects);
  return live.filter(o => o.visible !== false).map(o => {
    const r = o.getBoundingRect();
    return { url: o.toDataURL({ multiplier: 3, enableRetinaScaling: false }), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  });
}
