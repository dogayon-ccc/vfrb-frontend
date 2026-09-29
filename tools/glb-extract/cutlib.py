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
    _ = mesh.vertex_normals
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
