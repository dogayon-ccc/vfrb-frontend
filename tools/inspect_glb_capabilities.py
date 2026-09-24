#!/usr/bin/env python3
"""Static GLB capability inspector: python tools/inspect_glb_capabilities.py [dir] > json. Needs numpy + Pillow.
Reports per model: nodes/meshes/materials/textures/UV and UV-welded island counts (cut panels) with centroids."""
import sys, os, json, struct, io
import numpy as np
from PIL import Image

def load(p):
    b = open(p, 'rb').read(); off = 12; j = bn = None
    while off < len(b):
        cl, ct = struct.unpack('<II', b[off:off + 8]); d = b[off + 8:off + 8 + cl]
        if ct == 0x4E4F534A: j = json.loads(d)
        elif ct == 0x004E4942: bn = d
        off += 8 + cl
    return j, bn

def acc(j, bn, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = {'VEC3': 3, 'VEC2': 2, 'VEC4': 4, 'SCALAR': 1}[a['type']]
    dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); cnt = a['count']; st = bv.get('byteStride', 0); isz = n * np.dtype(dt).itemsize
    if st and st != isz:
        raw = np.frombuffer(bn, np.uint8, st * cnt, off).reshape(cnt, st)
        return np.frombuffer(raw[:, :isz].tobytes(), dt).reshape(cnt, n)
    return np.frombuffer(bn, dt, cnt * n, off).reshape(cnt, n)

def uv_islands(uv, idx):
    keys = {}; ids = np.array([keys.setdefault(tuple(p), len(keys)) for p in uv.round(5)])
    par = list(range(len(keys)))
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for t in ids[idx]:
        par[f(t[1])] = f(t[0]); par[f(t[2])] = f(t[0])
    return np.array([f(i) for i in ids])

def inspect(path):
    j, bn = load(path); r = {'file': os.path.basename(path), 'bytes': os.path.getsize(path)}
    r['generator'] = j['asset'].get('generator'); r['extensions'] = j.get('extensionsUsed', [])
    r['nodes'] = [{'i': i, 'name': n.get('name'), 'mesh': n.get('mesh'), 'children': n.get('children'), 'skin': n.get('skin'),
                   **{k: n[k] for k in ('translation', 'rotation', 'scale', 'matrix') if k in n}} for i, n in enumerate(j['nodes'])]
    r['skins'] = len(j.get('skins', [])); r['animations'] = len(j.get('animations', []))
    r['materials'] = [{'name': m.get('name'), 'baseColorFactor': m.get('pbrMetallicRoughness', {}).get('baseColorFactor'),
                       'baseColorTexture': 'baseColorTexture' in m.get('pbrMetallicRoughness', {}),
                       'normalTexture': 'normalTexture' in m, 'alphaMode': m.get('alphaMode'), 'doubleSided': m.get('doubleSided')} for m in j.get('materials', [])]
    imgs = []
    for im in j.get('images', []):
        d = {'mime': im.get('mimeType')}
        if 'bufferView' in im:
            bv = j['bufferViews'][im['bufferView']]; data = bn[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            try: d['size'] = Image.open(io.BytesIO(data)).size
            except Exception as e: d['size'] = str(e)
            d['bytes'] = len(data)
        imgs.append(d)
    r['images'] = imgs; r['meshes'] = []
    for mi, m in enumerate(j['meshes']):
        for k, pr in enumerate(m['primitives']):
            a = pr['attributes']; pos = acc(j, bn, a['POSITION'])
            e = {'mesh': m.get('name'), 'prim': k, 'material': pr.get('material'), 'verts': len(pos), 'indexed': 'indices' in pr,
                 'attrs': sorted(a.keys()), 'min': pos.min(0).round(3).tolist(), 'max': pos.max(0).round(3).tolist()}
            if 'TEXCOORD_0' in a:
                uv = acc(j, bn, a['TEXCOORD_0']); idx = acc(j, bn, pr['indices']).astype(np.int64).ravel().reshape(-1, 3) if 'indices' in pr else np.arange(len(pos)).reshape(-1, 3)
                lab = uv_islands(uv, idx); u, cnt = np.unique(lab, return_counts=True)
                e['uv_range'] = [uv.min(0).round(3).tolist(), uv.max(0).round(3).tolist()]
                isl = []
                for l, c in zip(u, cnt):
                    s = lab == l; isl.append({'n': int(c), 'c': pos[s].mean(0).round(3).tolist(), 'min': pos[s].min(0).round(2).tolist(), 'max': pos[s].max(0).round(2).tolist()})
                isl.sort(key=lambda x: -x['n']); e['islands'] = isl
            r['meshes'].append(e)
    return r

if __name__ == '__main__':
    d = sys.argv[1] if len(sys.argv) > 1 else 'public/models'
    out = [inspect(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.lower().endswith(('.glb',))]
    json.dump(out, sys.stdout, indent=1)
