// Zone geometry for a saved artboard key (`garment|sleeve|fit`) and face, from the same template the canvas draws.
import { getGarmentPaths } from './garmentPaths';
import { zonesOf, type ZoneSet } from './zoneMap';

const cache = new Map<string, ZoneSet | null>();
export function zonesResolver(key: string, face: string): ZoneSet | null {
  const id = `${key}#${face}`;
  if (cache.has(id)) return cache.get(id)!;
  const [garment, sleeve] = key.split('|');
  let zones: ZoneSet | null = null;
  try { const z = zonesOf(getGarmentPaths(garment, sleeve || 'Short', face === 'back' ? 'back' : 'front')); zones = Object.keys(z).length ? z : null; } catch { zones = null; }
  cache.set(id, zones);
  return zones;
}
