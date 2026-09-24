"""Builds the web GLBs in public/models from the original OBJ exports.

  python tools/build_garment_models.py <t_shirts.obj> <lab_coat_and_pants.obj> [out_dir]

Needs: pip install numpy trimesh fast-simplification
"""
import sys
import numpy as np
import trimesh
import fast_simplification as fs


def read_obj(path):
    V, VT, VN, groups = [], [], [], {}
    key = ('default', None)
    with open(path, errors='ignore') as f:
        for line in f:
            if line.startswith('v '):    V.append(line.split()[1:4])
            elif line.startswith('vt '): VT.append(line.split()[1:3])
            elif line.startswith('vn '): VN.append(line.split()[1:4])
            elif line.startswith(('g ', 'o ')): key = (line.split(None, 1)[1].strip(), key[1])
            elif line.startswith('usemtl '):    key = (key[0], line.split(None, 1)[1].strip())
            elif line.startswith('f '):
                groups.setdefault(key, []).append([tuple(int(x) if x else 0 for x in (t.split('/') + ['', ''])[:3]) for t in line.split()[1:]])
    return np.array(V, float), np.array(VT, float), np.array(VN, float), groups


def to_mesh(V, VT, VN, faces, scale, center=None):
    def idx(i, n): return i - 1 if i > 0 else n + i
    corners, tris = {}, []
    for face in faces:
        ids = [corners.setdefault(c, len(corners)) for c in face]
        tris += [(ids[0], ids[k], ids[k + 1]) for k in range(1, len(ids) - 1)]
    keys = np.array(list(corners))
    pos = V[[idx(k, len(V)) for k in keys[:, 0]]] * scale
    uv = VT[[idx(k, len(VT)) for k in keys[:, 1]]] if len(VT) and keys[:, 1].all() else np.zeros((len(keys), 2))
    nrm = VN[[idx(k, len(VN)) for k in keys[:, 2]]] if len(VN) and keys[:, 2].all() else None
    mesh = trimesh.Trimesh(pos, np.array(tris), process=False)
    if nrm is None: mesh.vertex_normals
    else: mesh.vertex_normals = nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv)
    return mesh


def recenter(meshes, center):
    for m in meshes: m.apply_translation(-center)


def tees(obj, out):
    V, VT, VN, G = read_obj(obj)
    for name, file in (('T_Shirt_male', 't-shirt-male.glb'), ('T_Shirt_female', 't-shirt-female.glb')):
        faces = next(f for (g, _), f in G.items() if g == name)
        m = to_mesh(V, VT, VN, faces, 0.01)
        b = m.bounds; m.apply_translation(-np.array([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2]))
        trimesh.Scene({'body': m}).export(f'{out}/{file}')
        print(file, len(m.faces), 'tris')


def coverall(obj, out):
    V, VT, VN, G = read_obj(obj)
    parts = {'FABRIC_1_FRONT_1456': 'body', 'Cotton_Heavy_Canvas_FRONT_127117': 'collar', 'Material2883': 'buttons', 'Material3310': 'stitching'}
    meshes = {}
    for (g, mat), faces in G.items():
        if mat in parts: meshes.setdefault(parts[mat], []).extend(faces)
    built = {n: to_mesh(V, VT, VN, f, 0.001) for n, f in meshes.items()}
    s = built['stitching']
    v, f = fs.simplify(np.asarray(s.vertices, np.float32), np.asarray(s.faces, np.uint32), target_reduction=0.93)
    built['stitching'] = trimesh.Trimesh(v, f, process=False)
    b = built['body'].bounds
    c = np.array([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2])
    recenter(built.values(), c)
    trimesh.Scene(built).export(f'{out}/lab-coverall.glb')
    print('lab-coverall.glb', {n: len(m.faces) for n, m in built.items()})


if __name__ == '__main__':
    tee_obj, coat_obj = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else 'public/models'
    tees(tee_obj, out)
    coverall(coat_obj, out)
