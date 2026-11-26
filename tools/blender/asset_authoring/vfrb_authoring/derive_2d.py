"""Derive the editable 2D panel representation from the FINISHED 3D master (processed GLB). No bpy."""
import json, os
import numpy as np
from . import MAPPING_VERSION, mathcore as mc
from .glb_io import read_glb, sha256_file

PALETTE = ["#0e7c86", "#e07a5f", "#81b29a", "#f2cc8f", "#6d597a", "#3d5a80", "#b56576"]


def _weld(V, q=1e-5):
    key = np.round(V / q).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    return inv.ravel()


def trace_outlines(T, xy_of_vertex, weld):
    """Boundary loops of a triangle set (edges used once), as lists of 2D points."""
    edges = {}
    for a, b, c in T:
        for u, v in ((a, b), (b, c), (c, a)):
            wu, wv = weld[u], weld[v]
            if wu == wv:
                continue
            k = (min(wu, wv), max(wu, wv))
            edges.setdefault(k, []).append((wu, wv, u))
    nxt = {}
    for lst in edges.values():
        if len(lst) == 1:
            wu, wv, u = lst[0]
            nxt.setdefault(wu, []).append((wv, u))
    loops = []
    for start in list(nxt):
        while nxt.get(start):
            cur, loop = start, []
            while nxt.get(cur):
                wv, u = nxt[cur].pop()
                loop.append(xy_of_vertex[u])
                cur = wv
                if cur == start:
                    break
            if len(loop) >= 3:
                loops.append(np.array(loop))
    return loops


def _affine(xy, uv):
    A = np.c_[xy, np.ones(len(xy))]
    M, *_ = np.linalg.lstsq(A, uv, rcond=None)
    return M, float(np.abs(A @ M - uv).max())


def derive(glb_path, out_dir, master_id, source_sha256, axes=mc.GLTF, handedness_confirmed=False, region_views=None):
    """region_views: {part: ['front','back']}. Parts not listed get both. A view that yields no outline faces is simply absent
    from the manifest (validate() then fails it as missing); nothing is silently invented."""
    region_views = region_views or {}
    parts = read_glb(glb_path)
    os.makedirs(out_dir, exist_ok=True)
    panels, svg = [], {"front": [], "back": []}
    for pi, (name, p) in enumerate(parts.items()):
        if p["uv"] is None:
            raise ValueError(f"{name}: no TEXCOORD_0; cannot derive mapped panels")
        V, T, uv = p["V"], p["T"], p["uv"]
        n, a3 = mc.tri_geom(V, T)
        right = V @ -np.asarray(axes["left"], float)
        up = V @ np.asarray(axes["up"], float)
        weld = _weld(V)
        want = tuple(region_views.get(name, ("front", "back")))
        masks = mc.panel_masks(V, T, axes, want)
        # Panel outline faces = wall on this side AND facing the viewer. Inner-wall faces are excluded from outlines
        # but share the same UV projection (twins), so artwork covers both walls.
        for view, sgn in (("front", 1.0), ("back", -1.0)):
            if view not in masks:
                continue
            idx = np.nonzero(masks[view])[0]
            if not idx.size:
                continue
            xyv = np.stack([sgn * right, up], 1)
            corner_xy, corner_uv = xyv[T[idx]], uv[T[idx]]
            a2 = mc.uv_area(corner_xy)
            M, err = _affine(corner_xy.reshape(-1, 2), corner_uv.reshape(-1, 2))
            loops = trace_outlines(T[idx], xyv, weld)
            pid = f"{name}.{view}"
            panels.append(dict(
                id=pid, part=name, view=view, material=p["material"], tri_count=int(idx.size),
                outline=[l.round(5).tolist() for l in loops],
                bbox_mu=[*corner_xy.reshape(-1, 2).min(0).round(5).tolist(), *corner_xy.reshape(-1, 2).max(0).round(5).tolist()],
                affine_xy_to_uv=M.round(7).tolist() if err < 2e-3 else None, affine_max_err_uv=round(err, 6),
                projected_area_ratio=round(float(a2.sum() / max(a3[idx].sum(), 1e-12)), 4),
                grazing_pct=round(float((np.abs(n[idx] @ np.asarray(axes["front"], float)) < 0.2).mean() * 100), 2),
                mesh=dict(xy=corner_xy.round(5).tolist(), uv=corner_uv.round(6).tolist())))
            d = " ".join("M" + " L".join(f"{x:.4f},{-y:.4f}" for x, y in l) + " Z" for l in loops)
            svg[view].append(f'<path id="clip-{pid.replace(".", "-")}" data-panel="{pid}" d="{d}" fill="{PALETTE[pi % 7]}" fill-opacity=".35" stroke="#0b3c42" stroke-width=".002"/>')
    for view, paths in svg.items():
        allpts = [pt for pnl in panels if pnl["view"] == view for l in pnl["outline"] for pt in l]
        if not allpts:
            continue   # nothing to draw; validate() reports the missing/empty panel
        a = np.array(allpts)
        x0, y0, x1, y1 = a[:, 0].min(), -a[:, 1].max(), a[:, 0].max(), -a[:, 1].min()
        with open(os.path.join(out_dir, f"panels_{view}.svg"), "w") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.3f} {y0:.3f} {x1 - x0:.3f} {y1 - y0:.3f}">\n' + "\n".join(paths) + "\n</svg>\n")
    man = dict(
        mapping_version=MAPPING_VERSION, master_id=master_id, source_sha256=source_sha256,
        processed_glb=os.path.basename(glb_path), processed_sha256=sha256_file(glb_path),
        conventions=dict(coordinates="glTF (Y up, +Z front)", wearer_left="+X", unit="model_units_uncalibrated", uv_origin="glTF top-left",
                         back_view="x mirrored so artwork reads left-to-right when viewed from behind",
                         handedness_confirmed=bool(handedness_confirmed)),
        notes=["2D panels are orthographic print/design panels derived from the 3D master, NOT factory sewing patterns.",
               "Panel outline faces: depth-side (position) AND viewer-facing normal. Inner-wall faces are not outlined; they share the same UV projection. No physical scale is claimed."],
        parts={n: dict(node=n, material=p["material"], expected_views=list(region_views.get(n, ("front", "back"))), panels=[x["id"] for x in panels if x["part"] == n]) for n, p in parts.items()},
        panels=panels)
    with open(os.path.join(out_dir, "mapping_manifest.json"), "w") as f:
        json.dump(man, f, separators=(",", ":"))
    return man
