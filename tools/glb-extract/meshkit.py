"""Mesh and image helpers for derive_template.py: numpy only (plus trimesh for I/O), no scipy, networkx or Pillow."""
import struct, zlib
import numpy as np, trimesh


def load(path):
    sc = trimesh.load(path, process=False)
    geoms = list(sc.geometry.values()) if isinstance(sc, trimesh.Scene) else [sc]
    m = trimesh.util.concatenate(geoms)
    has_uv = any(getattr(g.visual, 'uv', None) is not None for g in geoms)
    return np.asarray(m.vertices, float), np.asarray(m.faces, np.int64), has_uv


def merged_ids(v, tol=1e-6):
    """Vertex id after merging coincident positions (a fused scan often duplicates seam vertices)."""
    return np.unique(np.round(v / tol).astype(np.int64), axis=0, return_inverse=True)[1].reshape(-1)


def union_labels(n, edges):
    """Connected components of n nodes from an (E,2) edge list: vectorised union-find with pointer jumping."""
    parent = np.arange(n)
    def find(x):
        while True:
            p = parent[x]
            if np.array_equal(parent[p], p):
                return p
            parent[x] = parent[p]
            x = parent[x]
    for _ in range(400):
        a, b = find(edges[:, 0]), find(edges[:, 1])
        d = a != b
        if not d.any():
            break
        np.minimum.at(parent, np.maximum(a, b)[d], np.minimum(a, b)[d])
    return np.unique(find(np.arange(n)), return_inverse=True)[1]


def face_components(v, f):
    """Label each face with its vertex-connected component; component 0 is the largest."""
    mf = merged_ids(v)[f]
    vl = union_labels(mf.max() + 1, np.concatenate([mf[:, [0, 1]], mf[:, [1, 2]]]))
    lab = vl[mf[:, 0]]
    rank = np.argsort(np.argsort(-np.bincount(lab), kind='stable'))
    return rank[lab]


def submesh(v, f, keep):
    used, inv = np.unique(f[keep], return_inverse=True)
    return v[used], inv.reshape(-1, 3)


def boundary_length(v, f):
    """Total length of open edges (hems, cuffs, neckline): edges used by exactly one face after merging seams."""
    mid = merged_ids(v); mf = mid[f]
    e = np.sort(np.concatenate([mf[:, [0, 1]], mf[:, [1, 2]], mf[:, [2, 0]]]), axis=1)
    k, c = np.unique(e, axis=0, return_counts=True)
    vm = np.zeros((mid.max() + 1, 3)); vm[mid] = v
    b = k[c == 1]
    return float(np.linalg.norm(vm[b[:, 0]] - vm[b[:, 1]], axis=1).sum())


def save_glb(v, f, path):
    """One node named mesh_node (the Studio zone-mask parts read that name), smooth vertex normals, no UVs or materials."""
    m = trimesh.Trimesh(v, f, process=False)
    tri = v[f]; fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n = np.zeros_like(v)
    for c in range(3):
        np.add.at(n, f[:, c], fn)
    m.vertex_normals = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    sc = trimesh.Scene(); sc.add_geometry(m, node_name='mesh_node', geom_name='mesh'); sc.export(path)


# Orthographic views: (horizontal, vertical, depth toward the viewer). Models face +z.
VIEWS = {
    'front': (lambda p: p[..., 0], lambda p: p[..., 1], lambda p: p[..., 2]),
    'back': (lambda p: -p[..., 0], lambda p: p[..., 1], lambda p: -p[..., 2]),
    'left': (lambda p: p[..., 2], lambda p: p[..., 1], lambda p: -p[..., 0]),
    'right': (lambda p: -p[..., 2], lambda p: p[..., 1], lambda p: p[..., 0]),
    'top': (lambda p: p[..., 0], lambda p: -p[..., 2], lambda p: p[..., 1]),
}


def frame_of(v, view):
    U, V, _ = VIEWS[view]
    return float(U(v).min()), float(U(v).max()), float(V(v).min()), float(V(v).max())


def mapping(frame, W, H, pad):
    """Uniform scale and offsets that fit the frame (u0,u1,v0,v1) into W x H with `pad` pixels of margin, centred."""
    u0, u1, v0, v1 = frame
    s = min((W - 2 * pad) / (u1 - u0), (H - 2 * pad) / (v1 - v0))
    return s, (W - (u1 - u0) * s) / 2 - u0 * s, (H - (v1 - v0) * s) / 2 + v1 * s


def zbuffer(v, f, view, W, H, frame, pad=0):
    """Depth buffer by dense barycentric sampling (sample count scales with the projected triangle size). nan = empty."""
    U, V, D = VIEWS[view]
    s, ou, ov = mapping(frame, W, H, pad)
    tri = v[f]
    edge = np.max(np.hypot(U(tri) - U(tri[:, [1, 2, 0]]), V(tri) - V(tri[:, [1, 2, 0]])), axis=1) * s
    k = int(np.clip(np.ceil(np.percentile(edge, 99) * 2.0) ** 2, 6, 240))
    r = np.random.default_rng(0).random((k, 2)); fl = r.sum(1) > 1; r[fl] = 1 - r[fl]
    w = np.c_[1 - r.sum(1), r]
    depth = np.full(W * H, -np.inf)
    step = max(2000, 6000000 // k)
    for a in range(0, len(f), step):
        t = tri[a:a + step]
        p = np.concatenate([np.einsum('kj,fjd->fkd', w, t).reshape(-1, 3), t.reshape(-1, 3)])
        px = U(p) * s + ou; py = -V(p) * s + ov
        ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
        idx = py[ok].astype(int) * W + px[ok].astype(int)
        np.maximum.at(depth, idx, D(p)[ok])
    depth[np.isinf(depth)] = np.nan
    return depth.reshape(H, W)


def shift(a, dy, dx, fill):
    out = np.full_like(a, fill)
    H, W = a.shape
    out[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = a[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
    return out


def dilate(m, r=1):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r and (dy or dx):
                out |= shift(m, dy, dx, False)
    return out


def erode(m, r=1):
    return ~dilate(~m, r)


def exterior(mask):
    """Background pixels connected to the image border (4-neighbour union-find)."""
    H, W = mask.shape
    bg = ~mask
    idx = np.arange(H * W).reshape(H, W)
    h = bg[:, :-1] & bg[:, 1:]; vv = bg[:-1, :] & bg[1:, :]
    edges = np.concatenate([np.c_[idx[:, :-1][h], idx[:, 1:][h]], np.c_[idx[:-1, :][vv], idx[1:, :][vv]]])
    lab = union_labels(H * W, edges).reshape(H, W)
    border = np.unique(np.concatenate([lab[0][bg[0]], lab[-1][bg[-1]], lab[:, 0][bg[:, 0]], lab[:, -1][bg[:, -1]]]))
    return bg & np.isin(lab, border)


def silhouette(depth, close=2):
    """Solid silhouette: sampled pixels, small gaps closed, interior holes filled (the outer outline only)."""
    m = ~np.isnan(depth)
    m = erode(dilate(m, close), close)
    return ~exterior(m)


def iou(a, b):
    return float((a & b).sum() / max((a | b).sum(), 1))


def outline(mask):
    """Longest closed outline of the mask as pixel-corner points, clockwise in image coordinates (solid on the right)."""
    m = np.pad(mask, 1)
    ys, xs = np.nonzero(m[1:-1, 1:-1]); ys += 1; xs += 1
    segs = []
    for (dy, dx), (a, b) in (((-1, 0), ((0, 0), (1, 0))), ((0, 1), ((1, 0), (1, 1))), ((1, 0), ((1, 1), (0, 1))), ((0, -1), ((0, 1), (0, 0)))):
        sel = ~m[ys + dy, xs + dx]
        y0, x0 = ys[sel], xs[sel]
        segs.append(np.c_[x0 + a[0], y0 + a[1], x0 + b[0], y0 + b[1]])
    segs = np.concatenate(segs)
    nxt = {}
    for i, (x0, y0, _, _) in enumerate(segs.tolist()):
        nxt.setdefault((x0, y0), []).append(i)
    used = np.zeros(len(segs), bool); best = []
    for s0 in range(len(segs)):
        if used[s0]:
            continue
        loop, i = [], s0
        while not used[i]:
            used[i] = True
            x0, y0, x1, y1 = segs[i]
            loop.append((x0, y0))
            cand = [j for j in nxt.get((x1, y1), []) if not used[j]]
            if not cand:
                break
            i = cand[0]
        if len(loop) > len(best):
            best = loop
    return np.array(best, float) - 1  # undo the padding


def simplify(pts, tol):
    """Douglas-Peucker on a closed polygon."""
    n = len(pts)
    if n < 4:
        return pts
    far = int(np.argmax(np.linalg.norm(pts - pts[0], axis=1)))
    keep = np.zeros(n, bool); keep[[0, far]] = True
    stack = [(0, far), (far, n)]
    P = np.vstack([pts, pts[:1]])
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        seg = P[b] - P[a]; L = np.linalg.norm(seg) or 1e-12
        rel = P[a + 1:b] - P[a]
        d = np.abs(seg[0] * rel[:, 1] - seg[1] * rel[:, 0]) / L
        i = int(np.argmax(d))
        if d[i] > tol:
            keep[a + 1 + i] = True
            stack += [(a, a + 1 + i), (a + 1 + i, b)]
    return pts[keep]


def despeckle(depth, thr, r=1):
    """Pixels much deeper than their 3x3 neighbourhood median saw through a sampling gap to the inside or back surface: mark empty."""
    st = np.stack([shift(depth, dy, dx, np.nan) for dy in range(-r, r + 1) for dx in range(-r, r + 1)])
    with np.errstate(all='ignore'):
        med = np.nanmedian(st, axis=0)
    d = depth.copy(); d[(depth < med - thr)] = np.nan
    return d


def fill_depth(depth, mask, iters=12):
    """Fill empty pixels inside the silhouette with the mean of their filled neighbours (sampling gaps)."""
    d = depth.copy()
    for _ in range(iters):
        hole = mask & np.isnan(d)
        if not hole.any():
            break
        acc = np.zeros_like(d); cnt = np.zeros_like(d)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            s = shift(d, dy, dx, np.nan); ok = ~np.isnan(s)
            acc[ok] += s[ok]; cnt[ok] += 1
        upd = hole & (cnt > 0)
        d[upd] = acc[upd] / cnt[upd]
    return d


def box_blur(a, r):
    """Separable box blur via cumulative sums (edges clamp)."""
    out = a
    for axis in (0, 1):
        p = np.pad(out, [(r, r) if i == axis else (0, 0) for i in range(2)], mode='edge')
        c = np.cumsum(p, axis=axis)
        c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
        n = out.shape[axis]
        out = (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)
    return out


def shade_map(depth, mask, px_per_unit):
    """Grayscale fabric shading from a depth buffer: lambert from upper-left-front plus cavity occlusion. 1.0 = no darkening."""
    d = fill_depth(depth, mask)
    d = np.where(mask, d, np.nanmin(d[mask]) if mask.any() else 0)
    d = np.nan_to_num(d, nan=float(np.nanmin(d)))
    z = box_blur(box_blur(d * px_per_unit, 2), 1)  # scan surfaces carry fine noise; normals come from the smoothed depth
    gy, gx = np.gradient(z)
    n = np.dstack([-gx, gy, np.ones_like(z)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.35, 0.5, 0.8]); L /= np.linalg.norm(L)
    lam = np.clip(n @ L, 0, 1)
    cav = np.clip((box_blur(z, 6) - z) / 6.0, 0, 1)   # pixels below their surroundings: folds, seams, under collars
    rim = box_blur(mask.astype(float), 4)               # soft darkening toward the outline (cloth turning away)
    s = 0.55 + 0.45 * lam
    s *= 1 - 0.55 * cav
    s *= 0.82 + 0.18 * np.clip(rim * 2 - 1, 0, 1)
    s = s / np.percentile(s[mask], 92) if mask.any() else s   # the brightest cloth multiplies to ~white
    return np.clip(s, 0.25, 1.0)


def write_png(path, arr):
    """8-bit PNG: (H,W) gray, (H,W,2) gray+alpha, (H,W,3) RGB or (H,W,4) RGBA."""
    a = np.ascontiguousarray(arr.astype(np.uint8))
    h, w = a.shape[:2]; ch = 1 if a.ndim == 2 else a.shape[2]
    ctype = {1: 0, 2: 4, 3: 2, 4: 6}[ch]
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as fh:
        fh.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, ctype, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def clip_y(v, f, yc, keep_above=True):
    """Keep the part of the mesh above (or below) the plane y = yc; crossing triangles are split along the plane (straight edge)."""
    d = (v[:, 1] - yc) * (1 if keep_above else -1)
    inside = d[f] >= 0
    n_in = inside.sum(1)
    out_v, out_f = [v], [f[n_in == 3]]
    base = len(v)
    def cut(a, b):  # point on edge a->b where d = 0
        t = (d[a] / (d[a] - d[b]))[:, None]
        return v[a] + (v[b] - v[a]) * t
    for case in (1, 2):
        sel = f[n_in == case]
        if not len(sel):
            continue
        ins = inside[n_in == case]
        # rotate each triangle so the odd vertex (the one inside for case 1, outside for case 2) comes first, keeping winding
        odd = np.argmax(ins if case == 1 else ~ins, axis=1)
        r = np.stack([sel[np.arange(len(sel)), (odd + k) % 3] for k in range(3)], 1)
        p01, p02 = cut(r[:, 0], r[:, 1]), cut(r[:, 0], r[:, 2])
        i01 = base + np.arange(len(r)); i02 = i01 + len(r); base += 2 * len(r)
        out_v += [p01, p02]
        if case == 1:   # only vertex 0 inside: one triangle
            out_f.append(np.c_[r[:, 0], i01, i02])
        else:           # vertices 1 and 2 inside: a quad as two triangles
            out_f += [np.c_[i01, r[:, 1], r[:, 2]], np.c_[i01, r[:, 2], i02]]
    nv, nf = np.concatenate(out_v), np.concatenate(out_f)
    return submesh(nv, nf, np.ones(len(nf), bool))
