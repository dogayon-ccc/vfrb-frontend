"""Blender cleanup for a Meshy trouser: run with
blender --background --python tools/blender/trouser_cleanup.py -- in.glb out.glb
Centres and scales to a 1.9 unit height, decimates to about 30k triangles, splits the mesh into
waistband / leg_left / leg_right / hem_left / hem_right by height and side, and exports a GLB.
UNVERIFIED: written without Blender available; check the result in the Studio before use."""
import sys
import bpy
import bmesh

src, dst = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.active_object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

cos = [v.co.copy() for v in obj.data.vertices]
lo = [min(c[i] for c in cos) for i in range(3)]
hi = [max(c[i] for c in cos) for i in range(3)]
up = 2 if (hi[2] - lo[2]) > (hi[1] - lo[1]) else 1
k = 1.9 / (hi[up] - lo[up])
mid = [(lo[i] + hi[i]) / 2 for i in range(3)]
for v in obj.data.vertices:
    v.co = [(v.co[i] - mid[i]) * k for i in range(3)]

mod = obj.modifiers.new('dec', 'DECIMATE')
mod.ratio = min(1.0, 30000 / max(1, len(obj.data.polygons) * 1.0))
bpy.ops.object.modifier_apply(modifier='dec')

bm = bmesh.new()
bm.from_mesh(obj.data)
zs = [v.co[up] for v in bm.verts]
zmin, zmax = min(zs), max(zs)
side_axis = 0
for f in bm.faces:
    c = f.calc_center_median()
    t = (c[up] - zmin) / (zmax - zmin)
    if t > 0.9:
        f.material_index = 0
    else:
        left = c[side_axis] > 0
        f.material_index = (3 if left else 4) if t < 0.08 else (1 if left else 2)
bm.to_mesh(obj.data)
bm.free()
obj.data.materials.clear()
for name in ('waistband', 'leg_left', 'leg_right', 'hem_left', 'hem_right'):
    m = bpy.data.materials.new(name)
    obj.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True)
print('wrote', dst)
