import os, sys
import numpy as np, trimesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import load_mesh, clean

def cut(mesh, y_lo, y_hi, rules=(), min_comp=0.05):
    """rules: (y_a, y_b, x_max) -> drop vertices with y in [y_a,y_b] and |x|>x_max (arm/hand removal)."""
    v = mesh.vertices
    keep = (v[:,1]>=y_lo)&(v[:,1]<=y_hi)
    for ya,yb,xm in rules:
        keep &= ~((v[:,1]>=ya)&(v[:,1]<=yb)&(np.abs(v[:,0])>xm))
    s = mesh.submesh([keep[mesh.faces].all(axis=1)], append=True)
    s = clean(s, min_component_frac=min_comp)
    s.remove_unreferenced_vertices()
    return s

def save(mesh, path):
    tri = mesh.vertices[mesh.faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    normals = np.zeros_like(mesh.vertices)
    for corner in range(3):
        np.add.at(normals, mesh.faces[:, corner], face_normals)
    lengths = np.linalg.norm(normals, axis=1)
    normals /= np.maximum(lengths[:, None], 1e-12)
    mesh.vertex_normals = normals
    sc = trimesh.Scene(); sc.add_geometry(mesh, node_name='mesh_node', geom_name='mesh'); sc.export(path)


def _clip(mesh, normal, origin):
    """Keep the half-space the normal points into; triangles crossing the plane are split, giving a straight edge."""
    return trimesh.intersections.slice_mesh_plane(mesh, plane_normal=normal, plane_origin=origin, cap=False)

def cut_planes(mesh, x_max, y_min, min_comp=0.05):
    """Remove the region |x| > x_max AND y < y_min (bare arms below a short sleeve) by plane clipping instead of dropping
    vertices, so the sleeve hem and the body side edge are straight cuts rather than ragged triangle boundaries."""
    parts = [_clip(mesh, [-1, 0, 0], [x_max, 0, 0]) ]            # x <= x_max
    parts[0] = _clip(parts[0], [1, 0, 0], [-x_max, 0, 0])         # ... and x >= -x_max  -> middle strip, kept in full
    for sgn in (1, -1):
        outer = _clip(mesh, [sgn, 0, 0], [sgn * x_max, 0, 0])     # the |x| >= x_max slab on this side
        outer = _clip(outer, [0, 1, 0], [0, y_min, 0])            # keep only the part above y_min (the short sleeve)
        if len(outer.faces): parts.append(outer)
    s = trimesh.util.concatenate(parts)
    s.merge_vertices(digits_vertex=5)
    s = clean(s, min_component_frac=min_comp)
    s.remove_unreferenced_vertices()
    return s

def mirror_x(mesh):
    """Flip the garment left<->right (x -> -x) and restore triangle winding so normals still face outward."""
    m = mesh.copy()
    m.vertices = m.vertices * np.array([-1.0, 1.0, 1.0])
    m.faces = m.faces[:, ::-1]
    m.fix_normals()
    return m


def trim_y(mesh, top, bottom, min_comp=0.05):
    """Clip `top` off the highest and `bottom` off the lowest edge with horizontal planes, replacing ragged scan cuts with straight ones."""
    lo, hi = mesh.bounds[0][1], mesh.bounds[1][1]
    s = _clip(mesh, [0, -1, 0], [0, hi - top, 0])
    s = _clip(s, [0, 1, 0], [0, lo + bottom, 0])
    s.merge_vertices(digits_vertex=5)
    s = clean(s, min_component_frac=min_comp)
    s.remove_unreferenced_vertices()
    return s


def trim_bottom(mesh, amount):
    """Clip a short strip from the bottom without scipy, preserving face winding."""
    if amount <= 0:
        return mesh.copy()
    plane_y = float(mesh.bounds[0][1] + amount)
    vertices, faces = [], []
    for face in mesh.faces:
        polygon = [mesh.vertices[int(i)].copy() for i in face]
        clipped = []
        for a, b in zip(polygon, polygon[1:] + polygon[:1]):
            a_in, b_in = a[1] >= plane_y, b[1] >= plane_y
            if a_in and b_in:
                clipped.append(b)
            elif a_in and not b_in:
                t = (plane_y - a[1]) / (b[1] - a[1])
                clipped.append(a + t * (b - a))
            elif not a_in and b_in:
                t = (plane_y - a[1]) / (b[1] - a[1])
                clipped.extend((a + t * (b - a), b))
        if len(clipped) < 3:
            continue
        start = len(vertices)
        vertices.extend(clipped)
        faces.extend([[start, start + i, start + i + 1] for i in range(1, len(clipped) - 1)])
    trimmed = trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=False)
    trimmed.merge_vertices(digits_vertex=7)
    trimmed.remove_unreferenced_vertices()
    return trimmed


def cap_open_boundaries(mesh):
    """Cap simple closed boundary loops created by plane clipping.

    Each loop receives a subdivided, smoothed patch. Boundary edges are
    followed in their existing face winding, so patch triangles use the
    reverse winding. The interior rings soften the large non-planar armhole
    loops instead of spanning them with a single flat centre fan. This is
    intended for the clipped short-sleeve work-shirt loops, not arbitrary scan holes.
    """
    edge_faces = {}
    directed = {}
    for face in mesh.faces:
        for a, b in zip(face, np.roll(face, -1)):
            key = (min(int(a), int(b)), max(int(a), int(b)))
            edge_faces[key] = edge_faces.get(key, 0) + 1
            directed.setdefault(key, []).append((int(a), int(b)))

    # Existing face-oriented boundary edges form directed, closed loops.
    outgoing = {}
    for edge, count in edge_faces.items():
        if count == 1:
            a, b = directed[edge][0]
            outgoing.setdefault(a, []).append(b)
    if not outgoing:
        return mesh
    if any(len(v) != 1 for v in outgoing.values()):
        raise ValueError('Boundary is branched; refusing to create unsafe caps')

    loops, remaining = [], set(outgoing)
    while remaining:
        start = min(remaining)
        loop, current = [], start
        while current not in loop:
            if current not in outgoing:
                raise ValueError('Boundary loop is open; refusing to create unsafe caps')
            loop.append(current)
            current = outgoing[current][0]
        if current != start or len(loop) < 3:
            raise ValueError('Boundary is not a simple loop; refusing to create unsafe caps')
        loops.append(loop)
        remaining.difference_update(loop)

    vertices = mesh.vertices.tolist()
    faces = mesh.faces.tolist()
    smooth_groups = []
    for loop in loops:
        points = np.asarray(mesh.vertices[loop], dtype=np.float64)
        centre = points.mean(axis=0)
        outer = loop
        interior = []
        for fraction in (2 / 3, 1 / 3):
            inner = list(range(len(vertices), len(vertices) + len(loop)))
            vertices.extend((centre + (points - centre) * fraction).tolist())
            interior.extend(inner)
            # Reverse each quad's winding so its outer boundary opposes the
            # directed edge on the original clipped mesh.
            for i in range(len(loop)):
                j = (i + 1) % len(loop)
                faces.extend([[outer[i], inner[j], outer[j]], [outer[i], inner[i], inner[j]]])
            outer = inner
        centre_idx = len(vertices)
        vertices.append(centre.tolist())
        interior.append(centre_idx)
        for i in range(len(loop)):
            faces.append([centre_idx, outer[(i + 1) % len(loop)], outer[i]])
        smooth_groups.append((set(interior), set(loop)))

    # Laplacian relaxation only moves interior patch points; the seam remains
    # exactly welded to the original shell. A modest number of iterations
    # softens scan-shaped armholes while retaining the clipped outline.
    patch_edges = [set() for _ in vertices]
    for face in faces[len(mesh.faces):]:
        a, b, c = face
        patch_edges[a].update((b, c)); patch_edges[b].update((a, c)); patch_edges[c].update((a, b))
    movable = set().union(*(group for group, _ in smooth_groups))
    coords = np.asarray(vertices, dtype=np.float64)
    for _ in range(24):
        updated = coords.copy()
        for index in sorted(movable):
            if patch_edges[index]:
                updated[index] = coords[sorted(patch_edges[index])].mean(axis=0)
        coords = updated

    capped = trimesh.Trimesh(vertices=coords, faces=np.asarray(faces), process=False)
    return capped
