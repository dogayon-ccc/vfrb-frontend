"""Author clean, garment-only GLBs for the V-neck scrub top and the trousers (VFRB-authored parametric geometry: no scan, no third-party
mesh, no generation credits).

Run:  python tools/glb-extract/build_authored_garments.py  [out_dir]
Writes into public/models/authored/ by default (new files only; never touches an existing GLB):
  scrub-top-vneck-short.glb, scrub-top-vneck-three-quarter.glb, pants-straight.glb, pants-jogger.glb

Every garment is built from named, independently addressable parts, each a separate node with its own UVs and smooth normals, so the
Studio can colour each part from the same zones as the 2D sketch (body, sleeve, collar, pocket) and hide a pocket the customer hid in 2D:
  scrub top:  body, sleeve_l, sleeve_r, neck_band (collar zone), chest_pocket (pocket zone), lower_pockets (body colour, a 2D detail)
  trousers:   leg_l, leg_r, waistband, fly (straight), side_pockets, back_pockets (straight), cuffs + drawstring (jogger)
UVs: u runs around a tube (seam hidden at the back or the inside leg), v along it; patches are planar (u across, v down).
Orientation and size follow the served models: y up, front facing +z, about 1.9 units tall, centred on the origin.
"""
import os, sys
import numpy as np, trimesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public', 'models', 'authored')
TWO_PI = 2 * np.pi

def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

# ── mesh helpers ─────────────────────────────────────────────────────────────
def loft(rings, vs=None, closed=True):
    """Quads between consecutive rings (each an (N, 3) array). A closed ring gets a duplicated seam column so the UVs do not wrap."""
    n, m = len(rings), len(rings[0])
    vs = np.linspace(0, 1, n) if vs is None else vs
    cols = m + 1 if closed else m
    verts, uvs = [], []
    for i, r in enumerate(rings):
        pts = np.vstack([r, r[:1]]) if closed else r
        for j in range(cols):
            verts.append(pts[j]); uvs.append([j / (cols - 1), vs[i]])
    faces = []
    for i in range(n - 1):
        for j in range(cols - 1):
            a, b, c, d = i * cols + j, i * cols + j + 1, (i + 1) * cols + j, (i + 1) * cols + j + 1
            faces += [[a, c, b], [b, c, d]]
    return np.array(verts, float), np.array(faces, int), np.array(uvs, float)

def smooth_normals(verts, faces):
    """Area-weighted vertex normals, welded across UV seams so a seam never shades as a crease."""
    key = np.round(verts, 5)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    tri = verts[faces]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    acc = np.zeros((inv.max() + 1, 3))
    for k in range(3):
        np.add.at(acc, inv[faces[:, k]], fn)
    nrm = acc[inv]
    return nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)

def merge(*parts):
    vs, fs, us, off = [], [], [], 0
    for v, f, u in parts:
        vs.append(v); fs.append(f + off); us.append(u); off += len(v)
    return np.vstack(vs), np.vstack(fs), np.vstack(us)

def tube_along(path, radius, seg=12, flat=1.0):
    """A small round (or flattened) tube following a polyline: cords, welts, bands."""
    path = np.asarray(path, float)
    rings = []
    for i, p in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        t /= max(np.linalg.norm(t), 1e-9)
        a = np.array([0, 0, 1.0]) if abs(t[2]) < 0.9 else np.array([1.0, 0, 0])
        n1 = np.cross(t, a); n1 /= np.linalg.norm(n1)
        n2 = np.cross(t, n1)
        th = np.linspace(0, TWO_PI, seg, endpoint=False)
        r = radius * (np.cos(th)[:, None] * n1 + flat * np.sin(th)[:, None] * n2)
        rings.append(p + r)
    return loft(rings)

def patch(surface, x0, x1, y0, y1, lift=0.007, nx=10, ny=10, corner=0.25):
    """A patch (pocket) lying on a surface z = surface(x, y): a raised top sheet plus its edge wall down to the cloth."""
    xs, ys = np.linspace(x0, x1, nx), np.linspace(y1, y0, ny)
    top, uv = [], []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            pt = surface(x, y)
            top.append(pt + np.array([0, 0, lift if pt[2] >= 0 else -lift])); uv.append([i / (nx - 1), j / (ny - 1)])
    faces = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            a, b, c, d = j * nx + i, j * nx + i + 1, (j + 1) * nx + i, (j + 1) * nx + i + 1
            faces += [[a, c, b], [b, c, d]]
    sheet = (np.array(top), np.array(faces), np.array(uv))
    edge_idx = [i for i in range(nx)] + [j * nx + nx - 1 for j in range(1, ny)] + [(ny - 1) * nx + i for i in range(nx - 2, -1, -1)] + [j * nx for j in range(ny - 2, 0, -1)]
    upper = np.array([top[k] for k in edge_idx])
    lower = np.array([surface(p[0], p[1]) for p in upper])
    wall = loft([lower, upper])
    return merge(sheet, wall)

# ── V-neck scrub top ────────────────────────────────────────────────────────
SEG_T = 128
Y_HEM, Y_ARM, Y_SHOULDER, Y_NECK = -0.95, 0.42, 0.80, 0.92
NECK_RX, V_POINT_Y = 0.15, 0.40

def top_profile(t):
    """Ring at t (0 hem .. 1 neck): y, half-width rx, half-depth rz. Boxy scrub cut: nearly straight sides, sloped shoulders."""
    if t <= 0.72:                                  # hem -> armpit
        k = t / 0.72
        y = lerp(Y_HEM, Y_ARM, k)
        rx = 0.52 - 0.02 * np.sin(np.pi * k)       # a hint of waist
        rz = 0.30 + 0.03 * smooth(k)               # deeper at the chest
    elif t <= 0.92:                                # armpit -> shoulder line
        k = (t - 0.72) / 0.20
        y = lerp(Y_ARM, Y_SHOULDER, k)
        rx = lerp(0.52, 0.48, smooth(k))
        rz = lerp(0.33, 0.24, smooth(k))
    else:                                          # shoulder seam sweeping in to the neck
        k = (t - 0.92) / 0.08
        y = lerp(Y_SHOULDER, Y_NECK, k)
        rx = lerp(0.48, NECK_RX, smooth(k))
        rz = lerp(0.24, 0.11, smooth(k))
    return y, rx, rz

def top_point(theta, t):
    """theta 0 = centre back (-z), increasing toward the wearer's left (+x); +z is the front."""
    y, rx, rz = top_profile(t)
    if t > 0.92:                                   # the back neck scoops a little
        y -= 0.03 * smooth((t - 0.92) / 0.08) * np.exp(-(np.angle(np.exp(1j * theta)) / 0.6) ** 2)
    return np.array([rx * np.sin(theta), y, -rz * np.cos(theta)])

def vline(x):
    """V-neck edge: from the neck side (|x| = NECK_RX at the neck) down to the V point at the centre front."""
    return lerp(V_POINT_Y, Y_NECK - 0.02, np.clip(abs(x) / NECK_RX, 0, 1))

def top_body():
    ts = np.concatenate([np.linspace(0, 0.72, 46), np.linspace(0.72, 0.92, 16)[1:], np.linspace(0.92, 1.0, 12)[1:]])
    th = np.linspace(0, TWO_PI, SEG_T, endpoint=False)
    rings = []
    for t in ts:
        ring = []
        for a in th:
            p = top_point(a, t)
            front = np.cos(a) < -0.2                # the front half of the ring (z > 0)
            if front and p[1] > vline(p[0]):
                lo, hi = 0.0, t                     # slide the vertex down its column onto the V edge, on the garment surface
                for _ in range(30):
                    mid = (lo + hi) / 2
                    q = top_point(a, mid)
                    if q[1] > vline(q[0]): hi = mid
                    else: lo = mid
                p = top_point(a, lo)
            ring.append(p)
        rings.append(np.array(ring))
    v, f, uv = loft(rings, vs=ts)
    return v, f, uv, rings[-1]

def front_z(x, y):
    """Front surface of the torso below the armpit (for pockets and logos)."""
    t = (y - Y_HEM) / (Y_ARM - Y_HEM) * 0.72
    _, rx, rz = top_profile(np.clip(t, 0, 0.72))
    return np.array([x, y, rz * np.sqrt(max(0.0, 1 - (x / rx) ** 2))])

def sleeve(side, length, end_r):
    """A sleeve tube from inside the armhole, angled down and out; side -1 = viewer's left (-x)."""
    ang = np.radians(36)
    d = np.array([side * np.cos(ang), -np.sin(ang), 0.0])
    c0 = np.array([side * 0.42, 0.565, -0.01]) - d * 0.05
    up = np.array([0, 0, 1.0])
    n1 = np.cross(d, up); n1 /= np.linalg.norm(n1)
    rings, ks = [], np.linspace(0, 1, 26)
    th = np.linspace(0, TWO_PI, 64, endpoint=False)
    for k in ks:
        c = c0 + d * (length + 0.05) * k
        r = lerp(0.205, end_r, smooth(k * 1.1))
        rz = lerp(0.19, end_r * 0.95, smooth(k * 1.1))
        rings.append(np.array([c + r * np.cos(a) * n1 + rz * np.sin(a) * up for a in th]))
    return loft(rings, vs=ks)

def scrub_top(sleeve_len, sleeve_end):
    body_v, body_f, body_uv, neck = top_body()
    # Neck band: a flattened binding following the opening's edge (the top boundary of the body after the V cut).
    band = tube_along(np.vstack([neck, neck[:1]]), 0.016, seg=10, flat=0.55)
    sx = lambda x, y: front_z(x, y)
    parts = {
        'body': (body_v, body_f, body_uv),
        'sleeve_l': sleeve(-1, sleeve_len, sleeve_end),
        'sleeve_r': sleeve(1, sleeve_len, sleeve_end),
        'neck_band': band,
        'chest_pocket': patch(sx, -0.36, -0.13, 0.06, 0.30),
        'lower_pockets': merge(patch(sx, -0.42, -0.16, -0.62, -0.30), patch(sx, 0.16, 0.42, -0.62, -0.30)),
    }
    return parts

# ── trousers ────────────────────────────────────────────────────────────────
SEG_L = 96
Y_WAIST, Y_BAND_BOT = 0.95, 0.86

def pelvis(y, rise_y):
    """Pelvis half-width/half-depth at y (waist .. crotch), and the seat's extra depth at the back."""
    k = smooth((Y_BAND_BOT - y) / max(Y_BAND_BOT - rise_y, 1e-6))
    rx = lerp(0.37, 0.445, k)
    rz = lerp(0.27, 0.31, k)
    seat = 0.05 * np.exp(-((y - (rise_y + 0.18)) / 0.16) ** 2)
    return rx, rz, seat

def leg_shape(y, rise_y, hem_y, style):
    """Leg centre (|x|), half-width and half-depth below the crotch."""
    k = np.clip((rise_y - y) / (rise_y - hem_y), 0, 1)
    if style == 'jogger':
        r = lerp(0.222, 0.13, smooth(k ** 0.9)); cx = lerp(0.222, 0.19, k)
    else:
        r = lerp(0.222, 0.172, smooth(k ** 0.7)); cx = lerp(0.222, 0.20, k)
    return cx, r, r * 1.04

def leg_ring(side, y, rise_y, hem_y, style):
    """One ring of a leg. Above the crotch it is this leg's half of the pelvis (closed by the centre plane, hidden inside the other leg);
    below it the leg's own ellipse; in between the two blend, which forms the crotch curve. Point 0 is the inside back, so the UV seam
    runs down the inside leg."""
    n_out = int(SEG_L * 0.72)
    out = np.linspace(0, np.pi, n_out, endpoint=False)          # front centre -> outside -> back centre
    inn = np.linspace(np.pi, TWO_PI, SEG_L - n_out, endpoint=False)
    rx, rz, seat = pelvis(max(y, rise_y), rise_y)
    d_shape = [np.array([side * rx * np.sin(a), y, rz * np.cos(a) - (seat if np.cos(a) < 0 else 0) * abs(np.cos(a))]) for a in out]
    d_shape += [np.array([side * 0.0, y, lerp(-rz - seat, rz, (a - np.pi) / np.pi)]) for a in inn]
    cx, r, rzl = leg_shape(y, rise_y, hem_y, style)
    seat_l = seat * smooth((y - (rise_y - 0.12)) / 0.12)
    ell = [np.array([side * (cx + r * np.sin(a)), y, rzl * np.cos(a) - (seat_l if np.cos(a) < 0 else 0) * abs(np.cos(a))]) for a in np.concatenate([out, inn])]
    b = smooth((rise_y + 0.06 - y) / 0.16)                    # 0 above the crotch, 1 just below it
    ring = np.array([lerp(p, q, b) for p, q in zip(d_shape, ell)])
    return np.roll(ring, -int(SEG_L * 0.86), axis=0)

def trousers(style):
    rise_y = 0.30 if style == 'straight' else 0.28
    hem_y = -0.95 if style == 'straight' else -0.88
    ys = np.concatenate([np.linspace(Y_BAND_BOT, rise_y + 0.1, 16), np.linspace(rise_y + 0.1, rise_y - 0.12, 18)[1:], np.linspace(rise_y - 0.12, hem_y, 40)[1:]])
    legs = {name: loft([leg_ring(side, y, rise_y, hem_y, style) for y in ys], vs=(Y_BAND_BOT - ys) / (Y_BAND_BOT - hem_y)) for name, side in (('leg_l', -1), ('leg_r', 1))}
    def band_ring(y, grow):
        rx, rz, _ = pelvis(Y_BAND_BOT, rise_y)
        th = np.linspace(0, TWO_PI, SEG_L, endpoint=False)
        return np.array([[(rx + grow) * np.sin(a), y, -(rz + grow) * np.cos(a)] for a in th])
    outer = [band_ring(y, 0.012) for y in np.linspace(Y_WAIST, Y_BAND_BOT - 0.005, 6)]
    inner = [band_ring(y, -0.004) for y in np.linspace(Y_BAND_BOT - 0.005, Y_WAIST, 6)]
    parts = {**legs, 'waistband': loft(outer + inner + [outer[0]])}
    def surf(x, y, back=False):
        rx, rz, seat = pelvis(y, rise_y)
        z = (rz + (seat if back else 0)) * np.sqrt(max(0.0, 1 - (x / rx) ** 2))
        return np.array([x, y, -z if back else z])
    # Slant side-pocket openings: a welt from the waistband down and out to the side seam, each side.
    welt = lambda s: [surf(s * lerp(0.22, 0.425, k), lerp(Y_BAND_BOT - 0.01, 0.60, k)) + np.array([0, 0, 0.006]) for k in np.linspace(0, 1, 16)]
    parts['side_pockets'] = merge(tube_along(welt(-1), 0.007, seg=8, flat=0.5), tube_along(welt(1), 0.007, seg=8, flat=0.5))
    if style == 'straight':
        fly = [surf(-0.035, y) + np.array([0, 0, 0.004]) for y in np.linspace(Y_BAND_BOT - 0.01, rise_y + 0.16, 14)]
        parts['fly'] = tube_along(fly, 0.022, seg=12, flat=0.22)
        back = lambda x, y: surf(x, y, back=True)
        parts['back_pockets'] = merge(patch(back, -0.28, -0.08, 0.56, 0.78, lift=0.006), patch(back, 0.08, 0.28, 0.56, 0.78, lift=0.006))
    else:
        # Rib cuffs at the hem and a drawstring tied at the front of the waistband.
        cuffs = []
        for side in (-1, 1):
            cx, r, rzl = leg_shape(hem_y, rise_y, hem_y, style)
            th = np.linspace(0, TWO_PI, 48, endpoint=False)
            ring = lambda y, g: np.array([[side * (cx + (r + g) * np.sin(a)), y, (rzl + g) * np.cos(a)] for a in th])
            cuffs.append(loft([ring(y, 0.006) for y in np.linspace(hem_y, hem_y + 0.08, 6)] + [ring(hem_y + 0.08, -0.002), ring(hem_y, -0.002), ring(hem_y, 0.006)]))
        parts['cuffs'] = merge(*cuffs)
        _, rz_w, _ = pelvis(Y_BAND_BOT, rise_y)
        cord = lambda s: [np.array([s * lerp(0.025, 0.06, k), lerp(Y_BAND_BOT + 0.03, 0.66, k), rz_w + 0.02 + 0.01 * np.sin(np.pi * k)]) for k in np.linspace(0, 1, 18)]
        parts['drawstring'] = merge(tube_along(cord(-1), 0.008, seg=8), tube_along(cord(1), 0.008, seg=8))
    return parts

# ── export ──────────────────────────────────────────────────────────────────
def export(parts, name):
    scene = trimesh.Scene()
    allv, tris = [], 0
    for node, (v, f, uv) in parts.items():
        mat = trimesh.visual.material.PBRMaterial(name=node, baseColorFactor=[200, 200, 200, 255], metallicFactor=0.0, roughnessFactor=0.9)
        m = trimesh.Trimesh(vertices=v, faces=f, process=False, visual=trimesh.visual.TextureVisuals(uv=uv, material=mat))
        m.vertex_normals = smooth_normals(v, f)
        scene.add_geometry(m, node_name=node, geom_name=node)
        allv.append(v); tris += len(f)
    allv = np.vstack(allv)
    out = os.path.join(OUT_DIR, name)
    os.makedirs(OUT_DIR, exist_ok=True)
    scene.export(out)
    print(f'wrote {os.path.relpath(out, ROOT)}: {len(parts)} parts {sorted(parts)}, {tris} triangles, bounds {allv.min(0).round(3)} .. {allv.max(0).round(3)}')

if __name__ == '__main__':
    export(scrub_top(0.36, 0.165), 'scrub-top-vneck-short.glb')
    export(scrub_top(0.74, 0.118), 'scrub-top-vneck-three-quarter.glb')
    export(trousers('straight'), 'pants-straight.glb')
    export(trousers('jogger'), 'pants-jogger.glb')
