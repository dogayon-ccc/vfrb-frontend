#!/usr/bin/env python3
"""Static GLB inspector: structure, bounds, materials, UVs, triangle count, mesh separation."""
import json, struct, sys, os, hashlib

def load(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, ver, length = struct.unpack('<4sII', data[:12])
    if magic != b'glTF':
        raise ValueError('not a GLB')
    off, js, binchunk = 12, None, None
    while off < len(data):
        clen, ctype = struct.unpack('<II', data[off:off + 8])
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A: js = json.loads(chunk)
        elif ctype == 0x004E4942: binchunk = chunk
        off += 8 + clen
    return js, binchunk, data

def inspect(path):
    js, binchunk, raw = load(path)
    acc = js.get('accessors', []); meshes = js.get('meshes', []); mats = js.get('materials', [])
    out = {'file': os.path.basename(path), 'bytes': len(raw), 'sha1': hashlib.sha1(raw).hexdigest()[:12],
           'nodes': len(js.get('nodes', [])), 'meshes': len(meshes), 'materials': len(mats),
           'textures': len(js.get('textures', [])), 'images': len(js.get('images', [])), 'prims': []}
    mn, mx = [1e9] * 3, [-1e9] * 3
    tris = 0
    for m in meshes:
        for p in m['primitives']:
            a = acc[p['attributes']['POSITION']]
            for i in range(3):
                mn[i] = min(mn[i], a['min'][i]); mx[i] = max(mx[i], a['min'][i] if False else a['max'][i])
            n = acc[p['indices']]['count'] // 3 if 'indices' in p else a['count'] // 3
            tris += n
            out['prims'].append({'mesh': m.get('name'), 'material': p.get('material'), 'tris': n,
                                 'uv': 'TEXCOORD_0' in p['attributes'], 'color': 'COLOR_0' in p['attributes'],
                                 'bmin': [round(v, 3) for v in a['min']], 'bmax': [round(v, 3) for v in a['max']]})
    out['tris'] = tris
    out['bounds'] = {'min': [round(v, 3) for v in mn], 'max': [round(v, 3) for v in mx], 'size': [round(mx[i] - mn[i], 3) for i in range(3)]}
    out['materialInfo'] = [{'name': m.get('name'), 'baseColorTexture': 'baseColorTexture' in m.get('pbrMetallicRoughness', {}),
                            'baseColorFactor': m.get('pbrMetallicRoughness', {}).get('baseColorFactor'),
                            'normalTexture': 'normalTexture' in m, 'alphaMode': m.get('alphaMode'), 'doubleSided': m.get('doubleSided')} for m in mats]
    out['imageInfo'] = [{'mime': i.get('mimeType'), 'bytes': js['bufferViews'][i['bufferView']]['byteLength'] if 'bufferView' in i else None} for i in js.get('images', [])]
    out['extensionsUsed'] = js.get('extensionsUsed', [])
    return out

if __name__ == '__main__':
    rows = [inspect(p) for p in sys.argv[1:]]
    if '--json' in sys.argv: pass
    for r in rows:
        print(f"{r['file']:52s} {r['bytes']/1e6:6.2f}MB nodes={r['nodes']:2d} meshes={r['meshes']:2d} mats={r['materials']:2d} tex={r['textures']} tris={r['tris']:7d} uv={all(p['uv'] for p in r['prims'])} size={r['bounds']['size']} sha={r['sha1']}")
