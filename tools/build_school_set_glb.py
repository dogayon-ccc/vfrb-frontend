"""Normalises the sample 'Female School Uniform.glb' into a studio-ready blouse and skirt set.

  python tools/build_school_set_glb.py "<Female School Uniform.glb>" public/models/school-set-female.glb

Bakes the node transforms (cm, z-up to metres, y-up), centres the set, and splits the blouse
shells into named nodes. Shell picking is specific to this file (checked with inspect_garment_glb.py).
Needs: pip install numpy trimesh
"""
import sys

import numpy as np
import trimesh

from inspect_garment_glb import accessor, components, read_glb, weld, world_matrices


def load_nodes(path):
    doc, blob, _ = read_glb(path)
    world = world_matrices(doc)
    out = {}
    for i, node in enumerate(doc['nodes']):
        if 'mesh' not in node:
            continue
        prim = doc['meshes'][node['mesh']]['primitives'][0]
        m = world[i][:3, :3]
        pos = accessor(doc, blob, prim['attributes']['POSITION']).astype(np.float64) @ m.T + world[i][:3, 3]
        nrm = accessor(doc, blob, prim['attributes']['NORMAL']).astype(np.float64) @ m.T
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        out[node['name']] = (pos, nrm, accessor(doc, blob, prim['indices']).reshape(-1, 3).astype(np.int64))
    return out


def submesh(pos, nrm, faces):
    used, inverse = np.unique(faces, return_inverse=True)
    return trimesh.Trimesh(pos[used], inverse.reshape(-1, 3), vertex_normals=nrm[used], process=False)


def split_blouse(pos, nrm, faces):
    inv, faces_w = weld(pos, faces)
    shell = components(faces_w)
    parts = {'blouse': [], 'collar': [], 'tie': [], 'buttons': []}
    for c in range(shell.max() + 1):
        tri = pos[faces[shell == c]].reshape(-1, 3)
        lo, hi = tri.min(0), tri.max(0)
        size, centre, count = hi - lo, (hi + lo) / 2, int((shell == c).sum())
        if count < 60:
            parts['buttons'].append(c)
        elif size[0] < 0.06 and size[1] > 0.2:
            parts['tie'].append(c)
        elif centre[1] > 0.70:
            parts['collar'].append(c)
        else:
            parts['blouse'].append(c)
    return {name: faces[np.isin(shell, ids)] for name, ids in parts.items() if ids}


if __name__ == '__main__':
    nodes = load_nodes(sys.argv[1])
    blouse_key, skirt_key = sorted(nodes)
    pos_b, nrm_b, f_b = nodes[blouse_key]
    scene = {name: submesh(pos_b, nrm_b, f) for name, f in split_blouse(pos_b, nrm_b, f_b).items()}
    scene['skirt'] = submesh(*nodes[skirt_key])
    bounds = np.vstack([m.bounds for m in scene.values()])
    centre = (bounds[:, :].min(0) + bounds[:, :].max(0)) / 2
    for mesh in scene.values():
        mesh.apply_translation(-centre)
    trimesh.Scene(scene).export(sys.argv[2])
    print({name: len(m.faces) for name, m in scene.items()})
