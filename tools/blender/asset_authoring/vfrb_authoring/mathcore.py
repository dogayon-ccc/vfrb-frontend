"""Pure numpy geometry: UV islands, shared-density packing, rasterising. No bpy."""
from dataclasses import dataclass
import numpy as np

# Axis conventions: (front, up, wearer-left) as unit vectors in each coordinate system.
BLENDER = dict(front=(0, -1, 0), up=(0, 0, 1), left=(1, 0, 0))
GLTF = dict(front=(0, 0, 1), up=(0, 1, 0), left=(1, 0, 0))


@dataclass
class Island:
    part: str
    name: str
    tris: np.ndarray       # (k,) triangle indices into the part's T
    xy: np.ndarray         # (k,3,2) per-corner coords in model units (uncalibrated)


def tri_geom(V, T):
    p0, p1, p2 = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    c = np.cross(p1 - p0, p2 - p0)
    ln = np.linalg.norm(c, axis=1)
    n = np.divide(c, ln[:, None], out=np.zeros_like(c), where=ln[:, None] > 1e-18)
    return n, 0.5 * ln


def _vec(ax, key):
    return np.asarray(ax[key], float)


def _named_dir(ax, tok):
    if isinstance(tok, (list, tuple)):
        v = np.asarray(tok, float)
    else:
        f, u, l = (_vec(ax, k) for k in ("front", "up", "left"))
        v = dict(front=f, back=-f, up=u, down=-u, left=l, right=-l)[tok]
    return v / np.linalg.norm(v)


def front_side_mask(V, T, ax):
    """Closed thick shell: front/back by POSITION relative to the part's depth mid-plane, never by normal sign.
    Inner and outer wall of the same side then share one projection (exact 2-layer UV overlap by design)."""
    d = V @ _vec(ax, "front")
    mid = 0.5 * (d.min() + d.max())
    return d[T].mean(1) >= mid


def panel_masks(V, T, ax, views=("front", "back")):
    """Triangles that OUTLINE each 2D panel: on the view's depth side (position) AND facing the viewer (normal).
    Not a partition: inner-wall triangles and grazing/odd-side triangles belong to no outline (they share UVs by position)."""
    n, _ = tri_geom(V, T)
    facing = n @ _vec(ax, "front")
    side = front_side_mask(V, T, ax)
    m = {"front": side & (facing >= 0), "back": ~side & (facing < 0)}
    return {v: m[v] for v in views}


def shell_contamination(mask, inner_wall):
    """Share of masked triangles that are inner-wall triangles (needs ground truth; tests/offline analysis only)."""
    mask = np.asarray(mask, bool)
    return float(np.asarray(inner_wall, bool)[mask].mean()) if mask.any() else 0.0


def planar_front_back(part, V, T, ax):
    front = front_side_mask(V, T, ax)
    r, u = V @ -_vec(ax, "left"), V @ _vec(ax, "up")   # viewer-right while facing the front
    out = []
    for nm, m, sgn in (("front", front, 1.0), ("back", ~front, -1.0)):
        idx = np.nonzero(m)[0]
        if idx.size:
            xy = np.stack([sgn * r[T[idx]], u[T[idx]]], -1)
            out.append(Island(part, nm, idx, xy))
    return out


def planar_front(part, V, T, ax):
    r, u = V @ -_vec(ax, "left"), V @ _vec(ax, "up")
    return [Island(part, "front", np.arange(len(T)), np.stack([r[T], u[T]], -1))]


def principal_axis(V):
    c = V.mean(0)
    return c, np.linalg.svd(V - c, full_matrices=False)[2][0]


def cylinder(part, V, T, ax, axis="pca", seam="down", point=None):
    if isinstance(axis, str) and axis == "pca":
        c, a = principal_axis(V)
    else:
        a, c = _named_dir(ax, axis), V.mean(0)
    c = c if point is None else np.asarray(point, float)
    s = _named_dir(ax, seam)
    s = s - (s @ a) * a
    e1 = -s / np.linalg.norm(s)                      # theta=+-pi sits on the seam direction
    e2 = np.cross(a, e1)
    rel = V - c
    h = rel @ a
    rv = rel - np.outer(h, a)
    th, r = np.arctan2(rv @ e2, rv @ e1), np.linalg.norm(rv, axis=1)
    t = th[T].copy()
    wrap = (t.max(1) - t.min(1)) > np.pi
    t[wrap[:, None] & (t < 0)] += 2 * np.pi
    r_ref = float(np.median(r))
    xy = np.stack([t * r_ref, h[T]], -1)
    return [Island(part, "wrap", np.arange(len(T)), xy)]


def build_islands(part, V, T, spec, ax):
    k = spec["uv_strategy"]
    if k == "planar_front_back":
        return planar_front_back(part, V, T, ax)
    if k == "planar_front":
        return planar_front(part, V, T, ax)
    if k == "cylinder":
        return cylinder(part, V, T, ax, spec.get("axis", "pca"), spec.get("seam", "down"))
    raise ValueError(f"unknown uv_strategy {k!r} for {part}")


def _shelf(sizes, W, pad):
    x = y = rowh = 0.0
    pos = []
    for w, h in sizes:
        if x + w > W and x > 0:
            x, y, rowh = 0.0, y + rowh + pad, 0.0
        pos.append((x, y))
        x += w + pad
        rowh = max(rowh, h)
    return pos, y + rowh


def pack(islands, tex_px=2048, pad_px=8):
    """Pack islands in one 0..1 atlas with ONE global scale, so texel density is identical everywhere."""
    lo = [i.xy.reshape(-1, 2).min(0) for i in islands]
    sz = [i.xy.reshape(-1, 2).max(0) - l for i, l in zip(islands, lo)]
    order = sorted(range(len(islands)), key=lambda i: -sz[i][1])
    area = sum(float(s[0] * s[1]) for s in sz)
    W = np.sqrt(area) * 1.05
    for _ in range(200):
        S = max(W, max(float(s[0]) for s in sz))
        pad = pad_px * S / tex_px
        pos, H = _shelf([tuple(sz[i]) for i in order], W, pad)
        if H <= W:
            break
        W *= 1.04
    S = max(W, H)
    pad = pad_px * S / tex_px
    pos, H = _shelf([tuple(sz[i]) for i in order], W, pad)
    S = max(W, H)
    place = {i: np.array(p) for i, p in zip(order, pos)}
    for i, isl in enumerate(islands):
        isl.uv = (isl.xy - lo[i] + place[i]) / S
    return dict(atlas_size_mu=float(S), tex_px=tex_px, texel_px_per_mu=float(tex_px / S),
                utilisation=float(area / (S * S)))


def assemble_uv(islands, n_tris):
    uv = np.zeros((n_tris, 3, 2))
    for i in islands:
        uv[i.tris] = i.uv
    return uv


def uv_area(uv):
    a, b, c = uv[:, 0], uv[:, 1], uv[:, 2]
    return 0.5 * np.abs((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (c[:, 0] - a[:, 0]) * (b[:, 1] - a[:, 1]))


def stretch(V, T, uv_corner, atlas_size_mu):
    """Per-triangle ratio of UV-area*S^2 to 3D area (1.0 = no area distortion)."""
    _, a3 = tri_geom(V, T)
    return np.divide(uv_area(uv_corner) * atlas_size_mu ** 2, a3, out=np.ones_like(a3), where=a3 > 1e-12)


def raster_tri(tri, res):
    """Yield pixel (ix,iy) and barycentrics for texel centres inside one triangle (coords in 0..1)."""
    p = tri * res
    lo, hi = np.maximum(np.floor(p.min(0)).astype(int), 0), np.minimum(np.ceil(p.max(0)).astype(int), res)
    if (hi <= lo).any():
        return None
    gx, gy = np.meshgrid(np.arange(lo[0], hi[0]) + .5, np.arange(lo[1], hi[1]) + .5)
    d = (p[1, 1] - p[2, 1]) * (p[0, 0] - p[2, 0]) + (p[2, 0] - p[1, 0]) * (p[0, 1] - p[2, 1])
    if abs(d) < 1e-12:
        return None
    l0 = ((p[1, 1] - p[2, 1]) * (gx - p[2, 0]) + (p[2, 0] - p[1, 0]) * (gy - p[2, 1])) / d
    l1 = ((p[2, 1] - p[0, 1]) * (gx - p[2, 0]) + (p[0, 0] - p[2, 0]) * (gy - p[2, 1])) / d
    m = (l0 >= -1e-9) & (l1 >= -1e-9) & (1 - l0 - l1 >= -1e-9)
    if not m.any():
        return None
    return gx[m].astype(int), gy[m].astype(int), np.stack([l0[m], l1[m], 1 - l0[m] - l1[m]], 1)


def coverage_map(uv_corner, res=1024):
    cnt = np.zeros((res, res), np.int32)
    for t in uv_corner:
        r = raster_tri(t, res)
        if r is not None:
            np.add.at(cnt, (r[1], r[0]), 1)
    return cnt


def bake_from_panel(panel_xy, uv_corner, sampler, res=1024):
    """Bake artwork drawn in 2D panel space into UV space: sampler(xy)->rgb. Returns (image, coverage)."""
    img, cov = np.zeros((res, res, 3)), np.zeros((res, res), np.int32)
    for xy, uv in zip(panel_xy, uv_corner):
        r = raster_tri(uv, res)
        if r is None:
            continue
        ix, iy, bc = r
        img[iy, ix] = sampler(bc @ xy)
        np.add.at(cov, (iy, ix), 1)
    return img, cov
