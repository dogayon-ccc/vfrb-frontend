// Layer groups without fabric.Group: each member keeps its own __layerId, zone, blend and place in the stack, and carries a shared __groupId
// (saved with the design through OVERLAY_PROPS). Selecting one member selects them all, so the group moves, scales and rotates as one, while
// zone remapping, Unmapped Artwork recovery, history and print export keep treating every member as its own object.
type O = Record<string, any>;

export const groupIdOf = (o: O | null | undefined): string | null => (o && typeof o.__groupId === 'string' && o.__groupId ? o.__groupId : null);
export const isGroupable = (o: O | null | undefined) => !!o && !o.__garmentBase && !o.__hoverGlow && !o.__locked && !o.__unmapped && !o.__erase;

// The picked objects plus every other member of any group they belong to, in canvas (stack) order.
export function expandSelection(all: O[], picked: O[]): O[] {
  const gids = new Set(picked.map(groupIdOf).filter(Boolean) as string[]), want = new Set(picked);
  return all.filter(o => want.has(o) || (groupIdOf(o) && gids.has(groupIdOf(o)!)));
}
// Two or more groupable objects, and not already exactly one whole group.
export function canGroup(all: O[], picked: O[]): boolean {
  const sel = expandSelection(all, picked).filter(isGroupable);
  if (sel.length < 2) return false;
  const gids = new Set(sel.map(groupIdOf));
  return !(gids.size === 1 && !gids.has(null));
}
export const canUngroup = (picked: O[]) => picked.some(o => groupIdOf(o));

// Groups the picked objects (and any whole group they touch) under one id. Returns the members changed.
export function groupObjects(all: O[], picked: O[], id: string): O[] {
  const sel = expandSelection(all, picked).filter(isGroupable);
  if (sel.length < 2) return [];
  sel.forEach(o => { o.__groupId = id; });
  return sel;
}
// Ungroups every whole group the picked objects belong to. Returns the members changed.
export function ungroupObjects(all: O[], picked: O[]): O[] {
  const sel = expandSelection(all, picked).filter(o => groupIdOf(o));
  sel.forEach(o => { delete o.__groupId; });
  return sel;
}
export const membersOf = (all: O[], gid: string) => all.filter(o => groupIdOf(o) === gid);

// Layer ids that share the clicked layer's group, so visibility, lock and delete from the Layers panel act on the whole group.
export function layerIdsFor(layers: { id: string; groupId?: string | null }[], id: string): string[] {
  const l = layers.find(x => x.id === id); return l?.groupId ? layers.filter(x => x.groupId === l.groupId).map(x => x.id) : [id];
}
// Stable display names in stack order: the first group met is "Group 1".
export function groupLabels(layers: { groupId?: string | null }[]): Map<string, string> {
  const m = new Map<string, string>(); for (const l of layers) if (l.groupId && !m.has(l.groupId)) m.set(l.groupId, `Group ${m.size + 1}`); return m;
}
