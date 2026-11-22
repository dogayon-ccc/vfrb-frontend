"""Import GLBs in Blender and report per-object parts, UV coverage and materials as JSON.

Usage: python -I inspect_parts.py OUT.json GLB [GLB ...]   (needs the `bpy` module)
Read-only: never writes a GLB.
"""
import hashlib
import json
import sys
from pathlib import Path

import bpy
import bmesh
import mathutils


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def uv_stats(obj):
    me = obj.data
    if not me.uv_layers:
        return None
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.active
    # island = faces connected through edges whose shared loops carry equal UVs
    parent = list(range(len(bm.faces)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for e in bm.edges:
        if len(e.link_faces) != 2:
            continue
        a, b = e.link_faces
        def edge_uvs(face):
            d = {}
            for l in face.loops:
                if l.edge == e:
                    for ll in (l, l.link_loop_next):
                        d[ll.vert.index] = tuple(round(c, 5) for c in ll[uv].uv)
            return d

        ua, ub = edge_uvs(a), edge_uvs(b)
        if ua == ub:
            parent[find(a.index)] = find(b.index)
    islands = len({find(f.index) for f in bm.faces})
    us = [l[uv].uv[0] for f in bm.faces for l in f.loops]
    vs = [l[uv].uv[1] for f in bm.faces for l in f.loops]
    # UV area vs 3D area: tells whether texels are spent evenly (stretch) and whether islands overlap the unit square
    uv_area = sum(abs(sum(f.loops[i][uv].uv.x * f.loops[(i + 1) % len(f.loops)][uv].uv.y - f.loops[(i + 1) % len(f.loops)][uv].uv.x * f.loops[i][uv].uv.y for i in range(len(f.loops)))) / 2 for f in bm.faces)
    area3d = sum(f.calc_area() for f in bm.faces)
    out = {
        'layer': me.uv_layers.active.name,
        'islands': islands,
        'uMin': min(us), 'uMax': max(us), 'vMin': min(vs), 'vMax': max(vs),
        'uvAreaTotal': round(uv_area, 5),
        'inUnitSquare': min(us) >= -1e-4 and max(us) <= 1 + 1e-4 and min(vs) >= -1e-4 and max(vs) <= 1 + 1e-4,
        'area3d': round(area3d, 5),
    }
    bm.free()
    return out


def describe(path):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(path))
    parts = []
    for o in sorted((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: o.name):
        me = o.data
        me.calc_loop_triangles()
        bb = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
        xs, ys, zs = [v.x for v in bb], [v.y for v in bb], [v.z for v in bb]
        parts.append({
            'object': o.name,
            'vertices': len(me.vertices),
            'triangles': len(me.loop_triangles),
            'materials': [s.material.name if s.material else None for s in o.material_slots],
            'uv': uv_stats(o),
            'bbox': {'min': [round(min(xs), 4), round(min(ys), 4), round(min(zs), 4)], 'max': [round(max(xs), 4), round(max(ys), 4), round(max(zs), 4)]},
            'centerX': round((min(xs) + max(xs)) / 2, 4),
            'location': [round(c, 4) for c in o.location],
            'rotation': [round(c, 4) for c in o.rotation_euler],
            'scale': [round(c, 4) for c in o.scale],
        })
    return {
        'file': str(path),
        'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        'bytes': Path(path).stat().st_size,
        'blender': bpy.app.version_string,
        'parts': parts,
        'triangles': sum(p['triangles'] for p in parts),
    }


if __name__ == '__main__':
    out, files = sys.argv[1], sys.argv[2:]
    Path(out).write_text(json.dumps([describe(f) for f in files], indent=2))
    print(f'wrote {out}')
