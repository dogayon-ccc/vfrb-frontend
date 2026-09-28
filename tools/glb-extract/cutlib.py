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
