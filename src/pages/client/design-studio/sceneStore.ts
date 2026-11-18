import { useSyncExternalStore } from 'react';

export const BACKDROPS = [
  { label: 'Stage', bg: null },
  { label: 'White', bg: '#FFFFFF' },
  { label: 'Light grey', bg: '#E6E9E4' },
  { label: 'Charcoal', bg: '#232826' },
] as const;
export const LIGHTING_IDS = ['studio', 'daylight'] as const;
export type LightingId = typeof LIGHTING_IDS[number];

export interface SceneState {
  backdrop: number; lighting: LightingId; spin: boolean; explode: boolean;
  has3D: boolean; canExplode: boolean; // published by the viewport: what the current garment's 3D can really do
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const b = Number(read('ds_backdrop'));
const l = read('ds_lighting') as LightingId;

let state: SceneState = {
  backdrop: b >= 0 && b < BACKDROPS.length ? b : 0,
  lighting: LIGHTING_IDS.includes(l) ? l : 'studio',
  spin: false, explode: false, has3D: false, canExplode: false, // the turntable starts off: no motion nobody asked for
};
const subs = new Set<() => void>();

export const getScene = () => state;
export function setScene(patch: Partial<SceneState>) {
  const next = { ...state, ...patch };
  if ((Object.keys(patch) as (keyof SceneState)[]).every(k => next[k] === state[k])) return;
  state = next;
  if (patch.backdrop !== undefined) write('ds_backdrop', String(state.backdrop));
  if (patch.lighting !== undefined) write('ds_lighting', state.lighting);
  subs.forEach(f => f());
}
export const useScene = () => useSyncExternalStore(
  f => { subs.add(f); return () => { subs.delete(f); }; }, getScene, getScene);
