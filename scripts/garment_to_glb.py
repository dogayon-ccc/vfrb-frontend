#!/usr/bin/env python3
"""Garment photo -> candidate .glb, fully local.

  python scripts/garment_to_glb.py public/gallery/scrub-set-men-vneck.webp --id scrub-top-men
  python scripts/garment_to_glb.py photo.png --engine triposr --id my-garment

Engines
  relief   (default, CPU, no model download) inflates the silhouette into a front/back shell with the photo as vertex colour.
           It is an approximate volume, not a reconstruction: expect a puffed cut-out. Always lands in candidates/.
  midas    like relief, but the thickness comes from MiDaS depth (needs torch, downloads weights once).
  triposr  TripoSR single-image reconstruction (needs torch and the TripoSR repo on PYTHONPATH).
Output goes to public/models/candidates/<id>.glb. A candidate is never shown to clients until it passes the intake checks.
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path
import numpy as np
from PIL import Image

OUT_DIR = Path("public/models/candidates")


def isolate(img: Image.Image, use_rembg: bool, bg_model: str = "u2net") -> Image.Image:
    """RGBA cut-out of the garment. rembg when available, otherwise a near-white background threshold."""
    img = img.convert("RGBA")
    if use_rembg:
        try:
            from rembg import remove, new_session
            return remove(img, session=new_session(bg_model))
        except Exception as e:  # missing package or model download blocked
            print(f"rembg unavailable ({e}); falling back to a white-background threshold", file=sys.stderr)
    import cv2
    rgb = np.asarray(img.convert("RGB"))
    mask = (rgb.min(axis=2) < 238).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n > 1:
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = ((lab == keep) * 255).astype(np.uint8)
    out = np.dstack([rgb, mask])
    return Image.fromarray(out, "RGBA")


def crop_square_cap(rgba: Image.Image, max_side: int = 220) -> Image.Image:
    a = np.asarray(rgba)[..., 3]
    ys, xs = np.where(a > 16)
    if len(xs) == 0:
        raise SystemExit("No garment found in the image after background removal.")
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    rgba = rgba.crop(box)
    w, h = rgba.size
    s = max_side / max(w, h)
    return rgba.resize((max(8, int(w * s)), max(8, int(h * s))), Image.LANCZOS)


def thickness_map(rgba: Image.Image, engine: str, depth_ratio: float) -> np.ndarray:
    from scipy.ndimage import distance_transform_edt, gaussian_filter
    arr = np.asarray(rgba)
    mask = arr[..., 3] > 16
    dist = distance_transform_edt(mask)
    prof = np.sqrt(dist / max(dist.max(), 1e-6))  # rounded edges, flat middle
    if engine == "midas":
        import torch
        model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small"); model.eval()
        tf = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
        with torch.no_grad():
            d = model(tf(arr[..., :3])).squeeze().numpy()
        d = np.asarray(Image.fromarray(d).resize(rgba.size, Image.BILINEAR), dtype=np.float32)
        d = (d - d[mask].min()) / max(np.ptp(d[mask]), 1e-6)
        prof = prof * (0.6 + 0.4 * np.clip(d, 0, 1))
    prof = gaussian_filter(prof * mask, 1.5)
    return prof * mask * depth_ratio


def relief_mesh(rgba: Image.Image, engine: str, depth_ratio: float):
    import trimesh
    arr = np.asarray(rgba)
    h, w = arr.shape[:2]
    mask = arr[..., 3] > 16
    th = thickness_map(rgba, engine, depth_ratio)
    idx = -np.ones((h, w), dtype=np.int64)
    ys, xs = np.where(mask)
    idx[ys, xs] = np.arange(len(xs))
    n = len(xs)
    sx = 1.0 / h  # unit height
    x = (xs - w / 2) * sx
    y = (h / 2 - ys) * sx
    z = th[ys, xs] * sx * h * 0.5
    front = np.column_stack([x, y, z])
    back = np.column_stack([x, y, -z])
    verts = np.vstack([front, back])
    col = arr[ys, xs, :3]
    colors = np.vstack([col, (col * 0.82).astype(np.uint8)])
    quads = mask[:-1, :-1] & mask[1:, :-1] & mask[:-1, 1:] & mask[1:, 1:]
    qy, qx = np.where(quads)
    a, b, c, d = idx[qy, qx], idx[qy, qx + 1], idx[qy + 1, qx + 1], idx[qy + 1, qx]
    ft = np.vstack([np.column_stack([a, b, c]), np.column_stack([a, c, d])])
    bt = ft[:, ::-1] + n
    faces = [ft, bt]
    # stitch the rim so the shell is closed
    edge = mask & ~(np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1))
    ey, ex = np.where(edge)
    for dy, dx in ((0, 1), (1, 0)):
        ok = (ey + dy < h) & (ex + dx < w)
        i0 = idx[ey[ok], ex[ok]]; i1 = idx[ey[ok] + dy, ex[ok] + dx]
        both = (i0 >= 0) & (i1 >= 0) & edge[ey[ok] + dy, ex[ok] + dx]
        i0, i1 = i0[both], i1[both]
        faces.append(np.vstack([np.column_stack([i0, i1, i1 + n]), np.column_stack([i0, i1 + n, i0 + n])]))
    m = trimesh.Trimesh(vertices=verts, faces=np.vstack(faces), vertex_colors=np.column_stack([colors, np.full(len(colors), 255, np.uint8)]), process=False)
    return m


def triposr_mesh(rgba: Image.Image):
    import torch
    from tsr.system import TSR
    dev = "cuda:0" if torch.cuda.is_available() else "cpu"
    model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
    model.renderer.set_chunk_size(8192); model.to(dev)
    arr = np.asarray(rgba).astype(np.float32) / 255.0
    rgb = arr[..., :3] * arr[..., 3:] + (1 - arr[..., 3:]) * 0.5
    with torch.no_grad():
        codes = model([Image.fromarray((rgb * 255).astype(np.uint8))], device=dev)
    return model.extract_mesh(codes, True, resolution=256)[0]


def finish(mesh, tris: int, height: float):
    import trimesh
    mesh.remove_unreferenced_vertices()
    if len(mesh.faces) > tris:
        try:
            from scipy.spatial import cKDTree
            src_v, src_c = mesh.vertices.copy(), (mesh.visual.vertex_colors.copy() if mesh.visual.kind == "vertex" else None)
            mesh = mesh.simplify_quadric_decimation(face_count=tris)
            if src_c is not None:  # decimation drops vertex colours; copy them from the nearest original vertex
                mesh.visual.vertex_colors = src_c[cKDTree(src_v).query(mesh.vertices)[1]]
        except Exception as e:
            print(f"decimation skipped ({e}); pip install fast-simplification", file=sys.stderr)
    mesh.apply_translation(-mesh.bounds.mean(axis=0))
    ext = mesh.extents
    mesh.apply_scale(height / max(ext[1], 1e-6))
    mesh.apply_translation([0, -mesh.bounds[0][1] - height / 2, 0])
    trimesh.smoothing.filter_taubin(mesh, iterations=6)
    return mesh


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--id", help="output name (defaults to the image name)")
    ap.add_argument("--engine", choices=["relief", "midas", "triposr"], default="relief")
    ap.add_argument("--tris", type=int, default=15000)
    ap.add_argument("--height", type=float, default=1.0, help="garment height in studio units")
    ap.add_argument("--depth", type=float, default=0.22, help="relief thickness as a fraction of height")
    ap.add_argument("--no-rembg", action="store_true")
    ap.add_argument("--bg-model", default="u2net", help="rembg model: u2net (176 MB), u2netp (small), isnet-general-use, bria-rmbg (1 GB)")
    ap.add_argument("--out", type=Path, default=OUT_DIR)
    a = ap.parse_args()

    src = Path(a.image)
    name = a.id or src.stem
    rgba = crop_square_cap(isolate(Image.open(src), not a.no_rembg, a.bg_model))
    mesh = triposr_mesh(rgba) if a.engine == "triposr" else relief_mesh(rgba, a.engine, a.depth)
    mesh = finish(mesh, a.tris, a.height)
    a.out.mkdir(parents=True, exist_ok=True)
    dest = a.out / f"{name}.glb"
    mesh.export(dest)
    print(f"{dest}  {len(mesh.faces)} triangles  extents {np.round(mesh.extents, 3).tolist()}  engine={a.engine}")
    print("Candidate only: check it against the GLB intake rules before wiring it to a slot.")


if __name__ == "__main__":
    main()
