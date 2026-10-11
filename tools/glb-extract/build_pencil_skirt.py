"""Author a clean, garment-only pencil-skirt GLB (VFRB-authored geometry, no third-party mesh, no scan).

Run:  python tools/glb-extract/build_pencil_skirt.py  [out.glb]
Writes public/models/authored/skirt-pencil-lofted.glb by default and never touches any existing GLB.

Geometry: elliptical rings lofted from waist to hem (pencil profile: fitted waist, hip curve, slight taper to the hem), with shallow
side darts, a centre-back vent hint (crease + a small notch at the hem) and a separate waistband tube. Two nodes, both UV-mapped:
  skirt_body  u = around the body from centre back (seam hidden at the back), v = waist -> hem
  waistband   u = around, v = top -> bottom of the band (outer face; inner face and top rim share the band's UVs)
Orientation and scale follow the served bottoms: y up, front facing +z, about 1.9 units tall, centred on the origin.
"""
import os, sys
import numpy as np, trimesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'public', 'models', 'authored', 'skirt-pencil-lofted.glb')

SEG = 112            # points around each ring
RINGS = 74           # rings from waist to hem
Y_WAIST, Y_HEM = 0.86, -0.95
BAND_TOP, BAND_BOT = 0.95, 0.82
TWO_PI = 2 * np.pi

def smooth(t):
    return t * t * (3 - 2 * t)

def profile(t):
    """Half-widths (x, z) and z-centre of the ring at t (0 waist .. 1 hem)."""
    hip_t = 0.27
    if t <= hip_t:
        k = smooth(t / hip_t)
        rx = 0.36 + (0.505 - 0.36) * k
    else:
        k = smooth((t - hip_t) / (1 - hip_t))
        rx = 0.505 + (0.455 - 0.505) * k          # pencil: tapers back in toward the hem
    rz = rx * 0.70
    seat = 0.035 * np.exp(-((t - 0.3) / 0.14) ** 2)  # seat fullness at the back
    return rx, rz, -seat

def crease(theta, t):
    """Inward offset for the side darts (front and back) and the centre-back vent crease."""
    d = 0.0
    for c in (np.radians(62), np.radians(118), np.radians(242), np.radians(298)):   # darts: about a third in from each side
        ang = np.angle(np.exp(1j * (theta - c)))
        if t < 0.24:
            d += 0.010 * (1 - t / 0.24) * np.exp(-(ang / 0.05) ** 2)
    ang_back = np.angle(np.exp(1j * theta))       # theta = 0 is centre back
    if t > 0.8:
        d += 0.008 * ((t - 0.8) / 0.2) * np.exp(-(ang_back / 0.03) ** 2)
    return d

def ring_points(t, y, inset=0.0, grow=0.0):
    rx, rz, zc = profile(t)
    th = np.linspace(0, TWO_PI, SEG, endpoint=False)
    # theta 0 = centre back (-z), increasing toward the wearer's left; +z is the front.
    off = np.array([crease(a, t) for a in th]) + inset - grow
    x = (rx - off) * np.sin(th)
    z = zc - (rz - off) * np.cos(th)
    return np.stack([x, np.full(SEG, y), z], axis=1), th

def grid_mesh(rings, us, vs):
    """Quads between consecutive rings, with a duplicated seam column so the UVs do not wrap."""
    n = len(rings)
    verts, uvs = [], []
    for i, (pts, th) in enumerate(rings):
        pts = np.vstack([pts, pts[:1]])           # seam duplicate at u = 1
        for j in range(SEG + 1):
            verts.append(pts[j])
            uvs.append([j / SEG, vs[i]])
    verts, uvs = np.array(verts), np.array(uvs)
    faces = []
    w = SEG + 1
    for i in range(n - 1):
        for j in range(SEG):
            a, b, c, d = i * w + j, i * w + j + 1, (i + 1) * w + j, (i + 1) * w + j + 1
            faces += [[a, c, b], [b, c, d]]
    return verts, np.array(faces), uvs

def smooth_normals(verts, faces):
    """Area-weighted vertex normals, welded across the UV seam so the back seam does not shade as a crease."""
    key = np.round(verts, 6)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    tri = verts[faces]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    acc = np.zeros((inv.max() + 1, 3))
    for k in range(3):
        np.add.at(acc, inv[faces[:, k]], fn)
    n = acc[inv]
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)

def body():
    ts = np.linspace(0, 1, RINGS)
    rings = []
    for t in ts:
        y = Y_WAIST + (Y_HEM - Y_WAIST) * t
        pts, th = ring_points(t, y)
        if t == 1.0:                               # vent notch: the hem lifts slightly at centre back
            lift = 0.022 * np.exp(-(np.angle(np.exp(1j * th)) / 0.035) ** 2)
            pts[:, 1] += lift
        rings.append((pts, th))
    return grid_mesh(rings, None, ts)

def waistband():
    """A closed tube: outer face (top -> bottom), inner face, top and bottom rims, sitting just outside the body's waist."""
    def ring(y, grow):
        pts, th = ring_points(0.0, y, grow=grow)
        return pts, th
    outer = [ring(y, 0.012) for y in np.linspace(BAND_TOP, BAND_BOT, 6)]
    inner = [ring(y, 0.0) for y in np.linspace(BAND_BOT, BAND_TOP, 6)]
    loop = outer + inner + [outer[0]]              # outer down, inner up, close over the top rim
    vs = np.linspace(0, 1, len(loop))
    return grid_mesh(loop, None, vs)

def build():
    parts = {}
    for name, (v, f, uv) in (('skirt_body', body()), ('waistband', waistband())):
        # Untextured PBR material (one neutral colour; the Studio paints zones itself), so no image library is needed to export.
        mat = trimesh.visual.material.PBRMaterial(name=name, baseColorFactor=[200, 200, 200, 255], metallicFactor=0.0, roughnessFactor=0.9)
        m = trimesh.Trimesh(vertices=v, faces=f, process=False, visual=trimesh.visual.TextureVisuals(uv=uv, material=mat))
        m.vertex_normals = smooth_normals(v, f)
        parts[name] = m
    scene = trimesh.Scene()
    for name, m in parts.items():
        scene.add_geometry(m, node_name=name, geom_name=name)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    scene.export(OUT)
    tris = sum(len(m.faces) for m in parts.values())
    allv = np.vstack([m.vertices for m in parts.values()])
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {tris} triangles, bounds {allv.min(0).round(3)} .. {allv.max(0).round(3)}')
    for name, m in parts.items():
        print(f'  {name}: {len(m.vertices)} vertices, {len(m.faces)} triangles, uv {m.visual.uv.min(0).round(3)}..{m.visual.uv.max(0).round(3)}')

if __name__ == '__main__':
    build()
