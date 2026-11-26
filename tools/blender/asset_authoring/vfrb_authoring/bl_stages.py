"""Blender stages (run inside Blender via blender_entry.py). Geometry is only imported, cleaned, split and UV'd; never generated."""
import json, os, datetime
import bpy, bmesh, mathutils
import numpy as np
from . import MAPPING_VERSION, uv_build, derive_2d, validate
from .mathcore import BLENDER, GLTF
from .glb_io import sha256_file

VIEWS = dict(front=(0, -1, 0), back=(0, 1, 0), wearer_left=(1, 0, 0), wearer_right=(-1, 0, 0), top=(0, 0, 1))


def _dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1)


def _safe_call(op, **kw):
    ok = set(op.get_rna_type().properties.keys())
    skipped = sorted(k for k in kw if k not in ok)
    op(**{k: v for k, v in kw.items() if k in ok})
    return skipped


def _material(name, rgba, rough, metal, viewport=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m.diffuse_color = viewport or rgba
    return m


def _arrays(me):
    V = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", V)
    n = len(me.polygons)
    T = np.empty(n * 3, np.int64)
    if len(me.loops) != 3 * n:
        raise RuntimeError(f"mesh has {len(me.loops) - 3 * n} extra loops: it contains non-triangle faces, but the prepared source was triangles-only, "
                           "so geometry was edited after prepare. Remove the stray faces (Edit Mode > Select > Select All by Trait > Faces by Sides, "
                           "Number of Vertices 3, Type Not Equal To) or undo them. Do NOT rerun prepare: it overwrites the prepared .blend and your face assignments.")
    me.polygons.foreach_get("vertices", T)
    mi = np.empty(n, np.int64)
    me.polygons.foreach_get("material_index", mi)
    return V.reshape(-1, 3), T.reshape(-1, 3), mi


def _smooth_flags(me):
    try:
        return np.array([p.use_smooth for p in me.polygons], bool)
    except AttributeError:
        return np.ones(len(me.polygons), bool)


def _set_smooth(me, flags):
    try:
        me.polygons.foreach_set("use_smooth", flags)
    except (AttributeError, RuntimeError, TypeError):
        pass


def _signed_volume(V, T):
    return float(np.einsum("ij,ij->i", V[T[:, 0]], np.cross(V[T[:, 1]], V[T[:, 2]])).sum() / 6)


def _fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def prepare(cfg, source, out_dir, source_sha256):
    sha = sha256_file(source)
    if sha != source_sha256:
        raise SystemExit(f"SOURCE HASH MISMATCH: {sha} != {source_sha256}. Not the master named in the config.")
    _fresh()
    bpy.ops.import_scene.gltf(filepath=source)
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            continue
        if o.parent:
            bpy.ops.object.select_all(action="DESELECT")
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]:
        bpy.data.objects.remove(o)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "garment_master"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = obj.data
    raw_tris = sum(len(p.vertices) - 2 for p in me.polygons)
    bm = bmesh.new()
    bm.from_mesh(me)
    c = cfg["clean"]
    nv0 = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=c["merge_distance_mu"])
    if c["remove_loose"]:
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    for name, r in sorted(cfg["regions"].items(), key=lambda kv: kv[1]["slot"]):
        me.materials.append(_material(f"region_{name}", (*r["color"], 1), 0.9, 0, (*r["color"], 1)))
    V, T, mi = _arrays(me)
    mi[:] = cfg["regions"]["body"]["slot"]
    for name, box in cfg.get("hint_boxes", {}).items():
        cen = V[T].mean(1)
        lo, hi = np.array(box[0]), np.array(box[1])
        mi[np.all((cen >= lo) & (cen <= hi), 1)] = cfg["regions"][name]["slot"]
    me.polygons.foreach_set("material_index", mi)
    me.update()
    obj["vfrb_source_sha256"] = sha
    obj["vfrb_clean_tris"] = int(len(T))
    bb = V.min(0), V.max(0)
    rep = dict(stage="prepare", source=os.path.basename(source), source_sha256=sha, blender=bpy.app.version_string,
               raw_tris=int(raw_tris), clean_tris=int(len(T)), verts_before=nv0, verts_after=int(len(V)),
               signed_volume=_signed_volume(V, T), bbox_muin=bb[0].tolist(), bbox_muax=bb[1].tolist(),
               extents=(bb[1] - bb[0]).tolist(), orientation="UNCONFIRMED: render and review before build",
               next="Open the .blend, Edit Mode > select faces > Material tab > pick region slot > Assign. Save, then run build.")
    _dump(os.path.join(out_dir, "manifests", "prepare_report.json"), rep)
    path = os.path.join(out_dir, "blend", "scrub_top_pilot01_prepared.blend")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path)
    return rep


def _setup_render(size):
    s = bpy.context.scene
    s.render.engine = "BLENDER_WORKBENCH"
    s.render.resolution_x = s.render.resolution_y = size
    s.display.shading.light = "STUDIO"
    s.display.shading.color_type = "MATERIAL"
    s.world = s.world or bpy.data.worlds.new("w")
    s.world.color = (0.92, 0.92, 0.92)
    return s


def render_views(out_dir, tag, size=900, markers=True, color_type="MATERIAL"):
    s = _setup_render(size)
    s.display.shading.color_type = color_type
    objs = [o for o in s.objects if o.type == "MESH" and not o.hide_render]
    pts = np.array([o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box])
    lo, hi = pts.min(0), pts.max(0)
    ctr, dim = mathutils.Vector((lo + hi) / 2), float((hi - lo).max())
    extra = []
    if markers:
        for sign, col in ((1, (1, 0, 0, 1)), (-1, (0, 0.2, 1, 1))):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=dim * 0.04, location=ctr + mathutils.Vector((sign * dim * 0.55, 0, dim * 0.1)))
            m = bpy.context.active_object
            m.data.materials.append(_material(f"mk{sign}", col, 1, 0, col))
            extra.append(m)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.type, cam.data.ortho_scale, cam.data.clip_end = "ORTHO", dim * 1.35, dim * 10
    s.collection.objects.link(cam)
    s.camera = cam
    paths = []
    for name, d in VIEWS.items():
        v = mathutils.Vector(d)
        cam.location = ctr + v * dim * 3
        cam.rotation_euler = (-v).to_track_quat("-Z", "Y").to_euler()
        p = os.path.join(out_dir, f"{tag}_{name}.png")
        s.render.filepath = p
        bpy.ops.render.render(write_still=True)
        paths.append(p)
    for m in extra:
        bpy.data.objects.remove(m)
    bpy.data.objects.remove(cam)
    return paths


def render_blend(cfg, blend, out_dir, tag):
    bpy.ops.wm.open_mainfile(filepath=blend)
    return render_views(os.path.join(out_dir, "renders"), tag)


def build(cfg, blend_in, out_dir, confirm_regions, confirm_handedness):
    if not (confirm_regions and confirm_handedness):
        raise SystemExit("Refusing to build: pass --confirm-regions and --confirm-handedness after reviewing the renders (wearer-left = red marker side).")
    bpy.ops.wm.open_mainfile(filepath=blend_in)
    src = bpy.data.objects["garment_master"]
    V, T, mi = _arrays(src.data)
    prep_path = os.path.join(out_dir, "manifests", "prepare_report.json")
    if not os.path.isfile(prep_path):
        raise SystemExit(f"Refusing to build: {prep_path} not found, so the mesh cannot be checked against the prepared source.")
    with open(prep_path) as fh:
        expected_verts = json.load(fh)["verts_after"]
    problems = validate.mesh_integrity(src["vfrb_clean_tris"], T, len(V), expected_verts)
    if problems:
        raise SystemExit("Refusing to build: the mesh no longer matches the prepared source: " + "; ".join(problems) +
                         ". Face assignment must not change geometry. Undo or delete the stray elements; do NOT rerun prepare.")
    regs = cfg["regions"]
    parts, smooth = {}, _smooth_flags(src.data)
    for name, r in regs.items():
        f = np.nonzero(mi == r["slot"])[0]
        if len(f) < r["min_tris"]:
            raise SystemExit(f"region {name}: {len(f)} faces < min_tris {r['min_tris']}; assign more faces manually")
        used, inv = np.unique(T[f], return_inverse=True)
        parts[name] = (V[used], inv.reshape(-1, 3), f)
    if sum(len(p[1]) for p in parts.values()) != len(T):
        raise SystemExit("faces lost or duplicated during split")
    for n, sgn in (("sleeve_l", 1), ("sleeve_r", -1)):
        if sgn * parts[n][0][:, 0].mean() <= 0:
            raise SystemExit(f"{n} is on the wrong side: wearer-left is +X in Blender with the front facing -Y. Reassign faces.")
    uvs, met = uv_build.author_uvs({k: (v[0], v[1]) for k, v in parts.items()}, regs, BLENDER, cfg["atlas"]["tex_px"], cfg["atlas"]["pad_px"])
    col = bpy.data.collections.new("VFRB_Garment")
    bpy.context.scene.collection.children.link(col)
    mat = cfg["material"]
    for name, (Vp, Tp, f) in parts.items():
        me = bpy.data.meshes.new(name)
        me.from_pydata(Vp.tolist(), [], Tp.tolist())
        me.update()
        _set_smooth(me, smooth[f])
        me.uv_layers.new(name="UVMap").data.foreach_set("uv", uvs[name].reshape(-1))
        me.materials.append(_material(name, mat["base_color"], mat["roughness"], mat["metallic"]))
        o = bpy.data.objects.new(name, me)
        col.objects.link(o)
        for k, v in dict(vfrb_part=name, vfrb_master_id=cfg["master_id"], vfrb_source_sha256=src["vfrb_source_sha256"],
                         vfrb_mapping_version=MAPPING_VERSION, vfrb_uv_strategy=regs[name]["uv_strategy"]).items():
            o[k] = v
    src.hide_viewport = src.hide_render = True
    src["vfrb_regions_confirmed"] = True
    path = os.path.join(out_dir, "blend", "scrub_top_pilot01_authored.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path)
    rep = dict(stage="build", blender=bpy.app.version_string, source_sha256=src["vfrb_source_sha256"],
               clean_tris=int(src["vfrb_clean_tris"]), regions={k: int(len(v[1])) for k, v in parts.items()}, uv=met,
               confirmed=dict(regions=True, handedness=True),
               utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
    _dump(os.path.join(out_dir, "manifests", "authoring_report.json"), rep)
    return rep


def export(cfg, blend, out_dir):
    bpy.ops.wm.open_mainfile(filepath=blend)
    names = list(cfg["regions"])
    bpy.ops.object.select_all(action="DESELECT")
    for n in names:
        bpy.data.objects[n].select_set(True)
    glb = os.path.join(out_dir, "glb", "scrub-top-pilot01.glb")
    os.makedirs(os.path.dirname(glb), exist_ok=True)
    skipped = _safe_call(bpy.ops.export_scene.gltf, filepath=glb, export_format="GLB", use_selection=True, export_extras=True,
                         export_yup=True, export_apply=False, export_materials="EXPORT", export_image_format="NONE",
                         export_draco_mesh_compression_enable=False, export_cameras=False, export_lights=False,
                         export_texcoords=True, export_normals=True)
    src = bpy.data.objects["garment_master"]
    rep = process_outputs(cfg, glb, out_dir, src["vfrb_source_sha256"], int(src["vfrb_clean_tris"]))
    rep["exporter_options_skipped_by_this_blender"] = skipped
    return rep


def process_outputs(cfg, glb, out_dir, source_sha, source_tris):
    d2 = os.path.join(out_dir, "panels2d")
    derive_2d.derive(glb, d2, cfg["master_id"], source_sha, GLTF, handedness_confirmed=True,
                     region_views={k: r.get("views", ["front", "back"]) for k, r in cfg["regions"].items()})
    rep = validate.validate(glb, cfg, source_sha, source_tris, d2)
    _dump(os.path.join(out_dir, "manifests", "validation_report.json"), rep)
    return rep


def verify(cfg, glb, out_dir):
    """Reimport the exported GLB into a clean scene; every condition must hold or pass_ is False (exit code 2)."""
    _fresh()
    bpy.ops.import_scene.gltf(filepath=glb)
    objs = {o.name.split(".")[0]: o for o in bpy.context.scene.objects if o.type == "MESH"}
    checks = []

    def chk(name, ok, detail=""):
        checks.append(dict(check=name, ok=bool(ok), detail=str(detail)))

    req = list(cfg["regions"])
    chk("all parts reimported", set(req) <= set(objs), sorted(set(req) - set(objs)))
    chk("no unexpected mesh objects", set(objs) <= set(req), sorted(set(objs) - set(req)))
    tris = 0
    for n in req:
        o = objs.get(n)
        if o is None:
            continue
        me = o.data
        me.calc_loop_triangles()
        tris += len(me.loop_triangles)
        chk(f"{n}: UV layer present", len(me.uv_layers) > 0)
        chk(f"{n}: has material", len(me.materials) > 0 and me.materials[0] is not None)
        chk(f"{n}: triangles >= min_tris", len(me.loop_triangles) >= cfg["regions"][n]["min_tris"], len(me.loop_triangles))
    ar = os.path.join(out_dir, "manifests", "authoring_report.json")
    if os.path.exists(ar):
        with open(ar) as f:
            chk("reimported triangle total equals clean source", tris == json.load(f)["clean_tris"], tris)
    else:
        chk("authoring_report.json present", False, ar)
    for n, r in cfg["regions"].items():
        if n in objs:
            objs[n].data.materials.clear()
            objs[n].data.materials.append(_material(f"v_{n}", (*r["color"], 1), 0.9, 0, (*r["color"], 1)))
    rd = os.path.join(out_dir, "renders")
    paths = render_views(rd, "verify_regions")
    img = bpy.data.images.new("chk", 1024, 1024, generated_type="UV_GRID")
    for n, o in objs.items():
        m = bpy.data.materials.new(f"chk_{n}")
        m.use_nodes = True
        t = m.node_tree.nodes.new("ShaderNodeTexImage")
        t.image = img
        m.node_tree.links.new(t.outputs["Color"], m.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
        o.data.materials.clear()
        o.data.materials.append(m)
    paths += render_views(rd, "verify_checker", markers=False, color_type="TEXTURE")
    rep = dict(stage="verify", pass_=all(c["ok"] for c in checks), checks=checks, renders=paths)
    _dump(os.path.join(out_dir, "manifests", "verify_report.json"), rep)
    return rep
