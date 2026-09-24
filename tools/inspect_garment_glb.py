"""Checks a candidate garment GLB against the VFRB intake contract (docs/design-studio/GLB-INTAKE.md).

  python tools/inspect_garment_glb.py model.glb [more.glb ...] [--json]

Needs: pip install numpy
Exit code is 1 if any file has a FAIL.
"""
import json
import struct
import sys

import numpy as np

# Proposed budgets; tune once real phones are measured.
MAX_BYTES_WARN, MAX_BYTES_FAIL = 800_000, 2_000_000
MAX_TRIS_WARN, MAX_TRIS_FAIL = 30_000, 60_000
HEIGHT_RANGE_M = (0.25, 2.2)
DECOR_NODES = {'buttons', 'zipper', 'stitching'}
ZONE_NODES = {'body', 'collar', 'sleeve', 'sleeveL', 'sleeveR', 'pocket', 'cuff', 'hem', 'waistband',
              'buttons', 'zipper', 'stitching', 'coat', 'pants', 'skirt', 'shorts', 'blouse', 'tie'}
DTYPE = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
WIDTH = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}


def read_glb(path):
    raw = open(path, 'rb').read()
    if raw[:4] != b'glTF':
        raise ValueError('not a binary glTF (.glb)')
    off, doc, blob = 12, None, b''
    while off < len(raw):
        size, kind = struct.unpack('<I4s', raw[off:off + 8])
        chunk = raw[off + 8:off + 8 + size]
        if kind == b'JSON':
            doc = json.loads(chunk)
        elif kind.startswith(b'BIN'):
            blob = chunk
        off += 8 + size
    return doc, blob, len(raw)


def accessor(doc, blob, idx):
    a = doc['accessors'][idx]
    view = doc['bufferViews'][a['bufferView']]
    n, w = a['count'], WIDTH[a['type']]
    dtype = DTYPE[a['componentType']]
    item = np.dtype(dtype).itemsize
    data = np.ndarray((n, w), dtype, blob, view.get('byteOffset', 0) + a.get('byteOffset', 0),
                      (view.get('byteStride') or w * item, item)).copy()
    if a.get('normalized'):
        data = data / np.iinfo(dtype).max
    return data if w > 1 else data[:, 0]


def node_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix'], float).reshape(4, 4).T
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rot = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    m = np.eye(4)
    m[:3, :3] = rot * np.array(node.get('scale', [1, 1, 1]))
    m[:3, 3] = node.get('translation', [0, 0, 0])
    return m


def world_matrices(doc):
    """World matrix per node index, walking every scene root."""
    out = {}
    def walk(i, parent):
        out[i] = parent @ node_matrix(doc['nodes'][i])
        for c in doc['nodes'][i].get('children', []):
            walk(c, out[i])
    for s in doc.get('scenes', [{'nodes': range(len(doc['nodes']))}]):
        for r in s['nodes']:
            walk(r, np.eye(4))
    return out


def weld(pos, faces):
    _, inv = np.unique(np.round(pos, 5), axis=0, return_inverse=True)
    inv = inv.ravel()
    return inv, inv[faces]


def components(faces_w):
    parent = np.arange(faces_w.max() + 1)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for tri in faces_w:
        for u, v in ((tri[0], tri[1]), (tri[1], tri[2])):
            ru, rv = find(u), find(v)
            if ru != rv:
                parent[ru] = rv
    roots = np.array([find(t[0]) for t in faces_w])
    return np.unique(roots, return_inverse=True)[1]


def boundary_loops(faces_w):
    e = np.sort(np.concatenate([faces_w[:, [0, 1]], faces_w[:, [1, 2]], faces_w[:, [2, 0]]]), axis=1)
    uniq, cnt = np.unique(e, axis=0, return_counts=True)
    bedges = uniq[cnt == 1]
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in bedges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    groups = {}
    for a, b in bedges:
        groups.setdefault(find(a), set()).update((a, b))
    return [np.array(sorted(g)) for g in groups.values()], int((cnt > 2).sum()), len(cnt), len(bedges)


def coverage_guess(pos_w, loops):
    """Heuristic from opening positions; a human confirms."""
    lo, hi = pos_w.min(0), pos_w.max(0)
    height, half = hi[1] - lo[1], (hi[0] - lo[0]) / 2
    top = [l for l in loops if pos_w[l].mean(0)[1] > hi[1] - 0.25 * height]
    bottom = [l for l in loops if pos_w[l].mean(0)[1] < lo[1] + 0.25 * height]
    side = [l for l in loops if abs(pos_w[l].mean(0)[0]) > 0.6 * half and pos_w[l].mean(0)[1] > lo[1] + 0.4 * height]
    if len(bottom) >= 2 and not side:
        return 'lower (pants or shorts)' if top else 'lower'
    if len(bottom) == 1 and not side and len(top) == 1:
        return 'lower (skirt) or upper without sleeves'
    if len(bottom) >= 2 and side:
        return 'one-piece or set'
    return 'upper' + (' with sleeves' if side else '')


def inspect(path):
    doc, blob, size = read_glb(path)
    rep = {'file': path, 'bytes': size, 'checks': [], 'nodes': []}
    check = lambda level, msg: rep['checks'].append((level, msg))

    check('FAIL' if size > MAX_BYTES_FAIL else 'WARN' if size > MAX_BYTES_WARN else 'PASS', f'file size {size / 1000:.0f} KB')
    images = doc.get('images', [])
    tiny = all(doc['bufferViews'][i['bufferView']]['byteLength'] < 500 for i in images if 'bufferView' in i)
    check('PASS' if tiny or not images else 'WARN', f'{len(images)} embedded image(s); textures ship inside the file' if images and not tiny else 'no real embedded textures')
    if doc.get('extensionsRequired'):
        check('WARN', f"requires extensions {doc['extensionsRequired']}; the loader needs local decoders")

    total_tris, all_pos = 0, []
    world = world_matrices(doc)
    for ni, node in enumerate(doc['nodes']):
        if 'mesh' not in node:
            continue
        prim = doc['meshes'][node['mesh']]['primitives'][0]
        attrs = prim['attributes']
        pos = accessor(doc, blob, attrs['POSITION']).astype(np.float64)
        pos = pos @ world[ni][:3, :3].T + world[ni][:3, 3]
        faces = accessor(doc, blob, prim['indices']).reshape(-1, 3).astype(np.int64) if 'indices' in prim else np.arange(len(pos)).reshape(-1, 3)
        inv, fw = weld(pos, faces)
        pos_w = np.zeros((inv.max() + 1, 3))
        pos_w[inv] = pos
        comp = components(fw)
        loops, nonmanifold, _, open_edges = boundary_loops(fw)
        tri = pos[faces]
        area = 0.5 * np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
        name = node.get('name') or '(unnamed)'
        info = {
            'name': name, 'tris': len(faces), 'verts': len(pos), 'normals': 'NORMAL' in attrs, 'uv': 'TEXCOORD_0' in attrs,
            'components': int(comp.max() + 1), 'loops': len(loops), 'nonmanifold_edges': nonmanifold,
            'degenerate_tris': int((area < 1e-12).sum()), 'coverage': coverage_guess(pos_w, loops),
            'size_m': np.round(pos.max(0) - pos.min(0), 3).tolist(),
        }
        rep['nodes'].append(info)
        total_tris += len(faces)
        all_pos.append(pos)
        check('PASS' if name in ZONE_NODES else 'WARN', f'node "{name}": {"known zone name" if name in ZONE_NODES else "not in the zone vocabulary"}')
        check('PASS' if info['normals'] else 'WARN', f'node "{name}": {"has" if info["normals"] else "missing"} normals')
        shells = info['components']
        level = 'PASS' if name in DECOR_NODES or shells <= 6 else 'WARN' if shells <= 20 else 'FAIL'
        check(level, f'node "{name}": {shells} separate shell(s), {info["loops"]} boundary loop(s)')
        if info['degenerate_tris'] or nonmanifold:
            check('WARN', f'node "{name}": {info["degenerate_tris"]} degenerate tris, {nonmanifold} non-manifold edges')

    if not rep['nodes']:
        check('FAIL', 'no mesh nodes')
        return rep
    check('FAIL' if total_tris > MAX_TRIS_FAIL else 'WARN' if total_tris > MAX_TRIS_WARN else 'PASS', f'{total_tris:,} triangles total')
    span = np.vstack(all_pos)
    height = span.max(0)[1] - span.min(0)[1]
    check('PASS' if HEIGHT_RANGE_M[0] <= height <= HEIGHT_RANGE_M[1] else 'FAIL', f'height {height:.2f} m (expected {HEIGHT_RANGE_M[0]} to {HEIGHT_RANGE_M[1]} m, y-up, metres)')
    centre = (span.max(0) + span.min(0)) / 2
    check('PASS' if np.abs(centre).max() < 0.05 * max(height, 1e-6) + 0.02 else 'WARN', f'centred on origin (offset {np.round(centre, 3).tolist()})')
    return rep


def main(argv):
    as_json = '--json' in argv
    reports = [inspect(p) for p in argv if not p.startswith('--')]
    if as_json:
        print(json.dumps(reports, indent=2))
    else:
        for r in reports:
            print(f"\n== {r['file']}")
            for n in r['nodes']:
                print(f"   node {n['name']:12s} tris={n['tris']:6,d} shells={n['components']:2d} loops={n['loops']:2d} size_m={n['size_m']} {'coverage~ ' + n['coverage'] if n['tris'] >= 1000 and n['name'] not in DECOR_NODES else ''}")
            for level, msg in r['checks']:
                print(f'   {level:4s} {msg}')
    return 1 if any(level == 'FAIL' for r in reports for level, _ in r['checks']) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
