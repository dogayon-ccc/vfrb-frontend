#!/usr/bin/env python3
"""Connected-component split / extract for single-mesh position-only GLBs (Meshy exports)."""
import argparse, json, struct, sys
import numpy as np

def read_mesh(path):
    data = open(path, 'rb').read()
    off, js, bn = 12, None, None
    while off < len(data):
        clen, ctype = struct.unpack('<II', data[off:off + 8])
        chunk = data[off + 8:off + 8 + clen]
        if ctype == 0x4E4F534A: js = json.loads(chunk)
        elif ctype == 0x004E4942: bn = chunk
        off += 8 + clen
    prim = js['meshes'][0]['primitives'][0]
    def acc(i):
        a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
        n = {'SCALAR': 1, 'VEC3': 3, 'VEC2': 2}[a['type']]
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        arr = np.frombuffer(bn, dtype=dt, count=a['count'] * n, offset=start)
        return arr.reshape(-1, n) if n > 1 else arr
    pos = acc(prim['attributes']['POSITION']).astype(np.float64)
    idx = acc(prim['indices']).astype(np.int64).reshape(-1, 3) if 'indices' in prim else np.arange(len(pos)).reshape(-1, 3)
    return pos, idx

def weld(pos, idx, tol=1e-5):
    key = np.round(pos / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return pos[first], inv[idx]

def components(npos, tris):
    parent = np.arange(npos)
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for a, b, c in tris:
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra; parent[find(c)] = ra
    roots = np.array([find(t[0]) for t in tris])
    uniq, lab = np.unique(roots, return_inverse=True)
    return lab, len(uniq)

def smooth_normals(pos, tris):
    n = np.zeros_like(pos)
    p0, p1, p2 = pos[tris[:, 0]], pos[tris[:, 1]], pos[tris[:, 2]]
    fn = np.cross(p1 - p0, p2 - p0)
    for k in range(3): np.add.at(n, tris[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True); ln[ln == 0] = 1
    return n / ln

def write_glb(path, pos, tris, normals, name='mesh_node', generator='vfrb-glb-intake'):
    pos32 = pos.astype(np.float32); nrm32 = normals.astype(np.float32)
    idt = np.uint16 if len(pos) < 65535 else np.uint32
    ib = tris.astype(idt).reshape(-1).tobytes(); pb = pos32.tobytes(); nb = nrm32.tobytes()
    pad = lambda b: b + b'\x00' * ((4 - len(b) % 4) % 4)
    ib, pb, nb = pad(ib), pad(pb), pad(nb)
    blob = ib + pb + nb
    js = {'asset': {'version': '2.0', 'generator': generator},
          'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': name}],
          'meshes': [{'primitives': [{'attributes': {'POSITION': 1, 'NORMAL': 2}, 'indices': 0, 'mode': 4}]}],
          'accessors': [
              {'bufferView': 0, 'componentType': 5125 if idt == np.uint32 else 5123, 'count': int(tris.size), 'type': 'SCALAR', 'max': [int(tris.max())], 'min': [0]},
              {'bufferView': 1, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'max': pos32.max(0).tolist(), 'min': pos32.min(0).tolist()},
              {'bufferView': 2, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3'}],
          'bufferViews': [
              {'buffer': 0, 'byteOffset': 0, 'byteLength': len(ib), 'target': 34963},
              {'buffer': 0, 'byteOffset': len(ib), 'byteLength': len(pb), 'target': 34962},
              {'buffer': 0, 'byteOffset': len(ib) + len(pb), 'byteLength': len(nb), 'target': 34962}],
          'buffers': [{'byteLength': len(blob)}]}
    jb = json.dumps(js, separators=(',', ':')).encode(); jb += b' ' * ((4 - len(jb) % 4) % 4)
    total = 12 + 8 + len(jb) + 8 + len(blob)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A)); f.write(jb)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)

def report(path):
    pos, idx = read_mesh(path)
    wp, wt = weld(pos, idx)
    lab, n = components(len(wp), wt)
    comps = []
    for c in range(n):
        m = lab == c; t = wt[m]; v = np.unique(t)
        mn, mx = wp[v].min(0), wp[v].max(0)
        comps.append({'id': c, 'tris': int(m.sum()), 'min': mn.round(3).tolist(), 'max': mx.round(3).tolist(), 'size': (mx - mn).round(3).tolist()})
    comps.sort(key=lambda c: -c['tris'])
    return wp, wt, lab, comps

def extract(path, comp_ids, out, center=True, scale=None):
    wp, wt, lab, comps = report(path)
    keep = np.isin(lab, comp_ids); t = wt[keep]
    used = np.unique(t); remap = -np.ones(len(wp), dtype=np.int64); remap[used] = np.arange(len(used))
    p = wp[used]; t = remap[t]
    if center:
        mn, mx = p.min(0), p.max(0)
        p = p - np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2])
    if scale: p = p * scale
    write_glb(out, p, t, smooth_normals(p, t))
    return {'tris': int(len(t)), 'verts': int(len(p)), 'size': (p.max(0) - p.min(0)).round(4).tolist()}

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('glb'); ap.add_argument('--extract', help='comma list of component ids'); ap.add_argument('--out')
    ap.add_argument('--no-center', action='store_true')
    a = ap.parse_args()
    if a.extract:
        print(json.dumps(extract(a.glb, [int(x) for x in a.extract.split(',')], a.out, not a.no_center)))
    else:
        _, _, _, comps = report(a.glb)
        print(a.glb, 'components:', len(comps))
        for c in comps[:8]: print('  ', c)
