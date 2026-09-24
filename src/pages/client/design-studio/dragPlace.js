// src/pages/client/design-studio/dragPlace.js
// Shared "drop zone" registration for the panel-to-canvas drag system.
// Panel items (garment cards, logo preview, text preview, shapes) live
// under ToolDrawer; the canvas pane lives under CanvasViewport, several
// components away with the 2D/3D pane split in between. A module-level
// registry avoids threading a ref through DesignStudio -> ToolDrawer ->
// every panel AND DesignStudio -> CanvasViewport just for this — a real
// design-studio session only ever has one canvas pane mounted at a time,
// so a single mutable slot is safe here.
const zone = { paneEl: null, wrapEl: null, zoom: 1, fit: 1 };

export function registerDropZone(paneEl, wrapEl) {
  zone.paneEl = paneEl;
  zone.wrapEl = wrapEl;
}

export function setDropTransform(zoom, fit) {
  zone.zoom = zoom || 1;
  zone.fit = fit || 1;
}

export function unregisterDropZone() {
  zone.paneEl = null;
  zone.wrapEl = null;
}

// True while a screen point sits over the live canvas pane — drives the
// "you can drop here" highlight while the ghost is in flight.
export function isOverDropZone(clientX, clientY) {
  const r = zone.paneEl?.getBoundingClientRect();
  if (!r) return false;
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}

// Converts a screen point to canvas-logical coordinates (the same pixel
// space getGarmentPaths()/Fabric objects already use), undoing the
// zoom*fit CSS transform CanvasViewport applies to the wrapper. Returns
// null when the point isn't over the canvas at all.
const SNAP = 14; // px, in canvas-logical space — snaps a drop near dead-center
export function hitTestDropZone(clientX, clientY, garmentW, garmentH) {
  if (!isOverDropZone(clientX, clientY)) return null;
  const wrapRect = zone.wrapEl?.getBoundingClientRect();
  if (!wrapRect) return null;
  const scale = (zone.zoom || 1) * (zone.fit || 1) || 1;
  let x = (clientX - wrapRect.left) / scale;
  let y = (clientY - wrapRect.top) / scale;
  if (garmentW && Math.abs(x - garmentW / 2) < SNAP) x = garmentW / 2;
  if (garmentH && Math.abs(y - garmentH / 2) < SNAP) y = garmentH / 2;
  return { x, y };
}
