"""Write a separately capped copy of a clipped garment GLB.

Usage: python tools/glb-extract/cap_open_boundaries.py INPUT.glb OUTPUT.glb [--trim-bottom AMOUNT]
"""
import os
import sys
import numpy as np

from cutlib import cap_open_boundaries, save, trim_bottom
from extract import load_mesh


if __name__ == '__main__':
    if len(sys.argv) not in (3, 5) or (len(sys.argv) == 5 and sys.argv[3] != '--trim-bottom'):
        raise SystemExit(__doc__)
    source, destination = sys.argv[1:3]
    if os.path.normcase(os.path.abspath(source)) == os.path.normcase(os.path.abspath(destination)):
        raise SystemExit('Input and output must be different paths; source GLB is never overwritten')
    mesh = load_mesh(source)
    if len(sys.argv) == 5:
        mesh = trim_bottom(mesh, float(sys.argv[4]))
    capped = cap_open_boundaries(mesh)
    faces, vertices = capped.faces, capped.vertices
    edges = np.concatenate((faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]))
    _, edge_id, counts = np.unique(np.sort(edges, axis=1), axis=0, return_inverse=True, return_counts=True)
    winding = np.bincount(edge_id, weights=np.where(edges[:, 0] < edges[:, 1], 1, -1), minlength=len(counts))
    tri = vertices[faces]
    twice_area = np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
    signed_volume = np.einsum('ij,ij->i', tri[:, 0], np.cross(tri[:, 1], tri[:, 2])).sum() / 6
    report = {
        'boundary_edges': int((counts == 1).sum()),
        'nonmanifold_edges': int((counts > 2).sum()),
        'winding_conflicts': int(((counts == 2) & (winding != 0)).sum()),
        'degenerate_faces': int((twice_area < 1e-12).sum()),
        'signed_volume': float(signed_volume),
    }
    if report['boundary_edges'] or report['nonmanifold_edges'] or report['winding_conflicts'] or report['degenerate_faces'] or signed_volume <= 0:
        raise SystemExit(f'Unsafe capped mesh; output not written: {report}')
    os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)
    save(capped, destination)
    print(f'{source}: {len(mesh.faces)} -> {len(capped.faces)} faces; {report}')
