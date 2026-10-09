#!/usr/bin/env python3
"""Prepare VFRB PNG/GLB assets for the React/Vite frontend public/ directory.

Safe defaults:
- extracts the supplied PNG and GLB ZIPs
- preserves PNG masters under public/garments2d/source/
- creates gallery WebP previews under public/gallery/
- preserves every supplied GLB under public/models/garments/incoming-meshy/
- creates inventory.json and inventory.csv
- does NOT activate GLBs in public/models/garments/ by default
- can optionally copy selected GLBs to the active directory with --activate

Requires: Pillow, trimesh
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
import subprocess
from collections import defaultdict
from pathlib import Path

from PIL import Image
import trimesh


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def slugify(name: str) -> str:
    stem = Path(name).stem.lower().strip()
    stem = stem.replace("&", " and ")
    stem = re.sub(r"[^a-z0-9]+", "-", stem)
    return re.sub(r"^-+|-+$", "", stem)


def safe_extract(zip_path: Path, out_dir: Path) -> None:
    """Extract safely, preferring the native unzip utility when available for speed."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        root = out_dir.resolve()
        for info in zf.infolist():
            target = (root / info.filename).resolve()
            try:
                target.relative_to(root)
            except ValueError:
                raise RuntimeError(f"Unsafe ZIP path: {info.filename}")
    unzip = shutil.which("unzip")
    if unzip:
        subprocess.run([unzip, "-q", str(zip_path), "-d", str(out_dir)], check=True)
    else:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(out_dir)


def unique_name(directory: Path, name: str) -> Path:
    candidate = directory / name
    if not candidate.exists():
        return candidate
    stem = candidate.stem
    suffix = candidate.suffix
    n = 2
    while True:
        candidate = directory / f"{stem}-{n}{suffix}"
        if not candidate.exists():
            return candidate
        n += 1


def glb_stats(path: Path) -> dict:
    try:
        scene = trimesh.load(path, force="scene", process=False)
        geometries = list(scene.geometry.values())
        vertices = 0
        triangles = 0
        uv = False
        materials = 0
        for mesh in geometries:
            vertices += len(mesh.vertices)
            triangles += len(mesh.faces)
            mesh_uv = getattr(mesh.visual, "uv", None)
            if mesh_uv is not None and len(mesh_uv):
                uv = True
            material = getattr(mesh.visual, "material", None)
            if material is not None:
                materials += 1
        bounds = scene.bounds
        dimensions = (bounds[1] - bounds[0]).tolist() if bounds is not None else None
        return {
            "parse_ok": True,
            "mesh_count": len(geometries),
            "vertex_count": int(vertices),
            "triangle_count": int(triangles),
            "has_uv": bool(uv),
            "material_count": int(materials),
            "dimensions": dimensions,
        }
    except Exception as exc:
        return {"parse_ok": False, "error": str(exc)}


def convert_png_to_webp(src: Path, dst: Path, quality: int) -> dict:
    with Image.open(src) as img:
        img.load()
        has_alpha = "A" in img.getbands() or (img.mode == "P" and "transparency" in img.info)
        if has_alpha:
            out = img.convert("RGBA")
        else:
            out = img.convert("RGB")
        dst.parent.mkdir(parents=True, exist_ok=True)
        out.save(dst, "WEBP", quality=quality, method=4, lossless=False)
        return {
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
            "alpha": has_alpha,
            "webp_bytes": dst.stat().st_size,
        }


def inventory_from_files(public_root: Path) -> tuple[list[dict], list[dict]]:
    records = []
    pngs = sorted((public_root / "garments2d" / "source").glob("*.png"))
    webps = sorted((public_root / "gallery").glob("*.webp"))
    incoming = sorted((public_root / "models" / "garments" / "incoming-meshy").glob("*.glb"))

    webp_by_stem = {slugify(p.name): p for p in webps}
    png_by_stem = {slugify(p.name): p for p in pngs}

    all_stems = sorted(set(png_by_stem) | set(webp_by_stem) | {slugify(p.name) for p in incoming})
    for stem in all_stems:
        png = png_by_stem.get(stem)
        webp = webp_by_stem.get(stem)
        glbs = [p for p in incoming if slugify(p.name) == stem]
        for glb in glbs or [None]:
            rec = {
                "proposed_templateId": stem,
                "png_source": str(png.relative_to(public_root).as_posix()) if png else None,
                "webp_preview": str(webp.relative_to(public_root).as_posix()) if webp else None,
                "glb_incoming": str(glb.relative_to(public_root).as_posix()) if glb else None,
                "glb_active": None,
                "mapping_basis": "filename stem match only" if png and glb else "partial asset set",
            }
            if png:
                rec["png_sha256"] = sha256(png)
                with Image.open(png) as im:
                    rec["png_width"] = im.width
                    rec["png_height"] = im.height
            if webp:
                rec["webp_sha256"] = sha256(webp)
            if glb:
                rec["glb_sha256"] = sha256(glb)
                rec["glb_bytes"] = glb.stat().st_size
                rec.update({f"glb_{k}": v for k, v in glb_stats(glb).items()})
            records.append(rec)

    return records, [
        {
            "file": str(p.relative_to(public_root).as_posix()),
            "templateId": slugify(p.name),
            "sha256": sha256(p),
            "bytes": p.stat().st_size,
        }
        for p in incoming
    ]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--png-zip", type=Path, required=True)
    ap.add_argument("--glb-zip", type=Path, required=True)
    ap.add_argument("--frontend-root", type=Path, required=True)
    ap.add_argument("--output", type=Path, default=None, help="Staging directory. Defaults to <frontend>/public-asset-import")
    ap.add_argument("--quality", type=int, default=90)
    ap.add_argument("--activate", nargs="*", default=None, help="Exact GLB stems to copy into public/models/garments/. Omit to keep all GLBs incoming-only.")
    ap.add_argument("--inspect-glb", action="store_true", help="Run trimesh geometry/material inspection for every GLB; slower. Omit for fast import.")
    ap.add_argument("--hash-glb", action="store_true", help="Compute SHA-256 for every GLB; reads the full GLB set and is slower. Omit for fast import.")
    args = ap.parse_args()

    if not (0 <= args.quality <= 100):
        ap.error("--quality must be 0..100")

    frontend = args.frontend_root.resolve()
    out = (args.output or (frontend / "public-asset-import")).resolve()
    if out.exists():
        shutil.rmtree(out)
    public = out / "public"
    source_dir = public / "garments2d" / "source"
    gallery_dir = public / "gallery"
    incoming_dir = public / "models" / "garments" / "incoming-meshy"
    active_dir = public / "models" / "garments"
    source_dir.mkdir(parents=True)
    gallery_dir.mkdir(parents=True)
    incoming_dir.mkdir(parents=True)
    # The active directory may already exist because incoming_dir is nested inside it.
    active_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="vfrb_asset_import_") as tmp:
        tmp = Path(tmp)
        png_extract = tmp / "png"
        glb_extract = tmp / "glb"
        png_extract.mkdir()
        glb_extract.mkdir()
        safe_extract(args.png_zip.resolve(), png_extract)
        safe_extract(args.glb_zip.resolve(), glb_extract)

        png_files = sorted(p for p in png_extract.rglob("*.png") if p.is_file())
        glb_files = sorted(p for p in glb_extract.rglob("*.glb") if p.is_file())
        if not png_files:
            raise RuntimeError("No PNG files found in PNG ZIP")
        if not glb_files:
            raise RuntimeError("No GLB files found in GLB ZIP")

        # Copy PNG masters with normalized filenames. Keep the uploaded filename in metadata.
        png_manifest = []
        for src in png_files:
            stem = slugify(src.name)
            dst = unique_name(source_dir, f"{stem}.png")
            shutil.copy2(src, dst)
            webp_dst = unique_name(gallery_dir, f"{stem}.webp")
            image_info = convert_png_to_webp(dst, webp_dst, args.quality)
            png_manifest.append({
                "uploaded_name": src.name,
                "templateId_candidate": stem,
                "png": dst.name,
                "webp": webp_dst.name,
                **image_info,
                "png_bytes": dst.stat().st_size,
                "png_sha256": sha256(dst),
            })

        # Preserve ALL supplied GLBs; do not imply that presence == verified.
        glb_manifest = []
        by_sha = defaultdict(list)
        for src in glb_files:
            stem = slugify(src.name)
            dst = unique_name(incoming_dir, f"{stem}.glb")
            shutil.copy2(src, dst)
            digest = sha256(dst) if args.hash_glb else None
            if digest:
                by_sha[digest].append(dst.name)
            stats = glb_stats(dst) if args.inspect_glb else {"parse_ok": None, "inspection": "not-run; use --inspect-glb"}
            glb_manifest.append({
                "uploaded_name": src.name,
                "templateId_candidate": stem,
                "glb_incoming": dst.name,
                "bytes": dst.stat().st_size,
                "sha256": digest,
                **stats,
            })

        # Explicit duplicate hashes (important for known bad/duplicate supplied assets).
        duplicates = {sha: names for sha, names in by_sha.items() if len(names) > 1}

        # Only activate explicitly requested GLBs. Default is none.
        activated = []
        if args.activate is not None:
            wanted = {slugify(x) for x in args.activate}
            for rec in glb_manifest:
                stem = rec["templateId_candidate"]
                if stem in wanted:
                    src = incoming_dir / rec["glb_incoming"]
                    dst = active_dir / f"{stem}.glb"
                    if dst.exists():
                        raise RuntimeError(f"Refusing to overwrite active GLB: {dst}")
                    shutil.copy2(src, dst)
                    rec["glb_active"] = dst.name
                    activated.append(stem)

        # Merge simple filename matches; this is a candidate mapping, NOT verified identity.
        png_by = {r["templateId_candidate"]: r for r in png_manifest}
        glb_by = {r["templateId_candidate"]: r for r in glb_manifest}
        mapping = []
        for stem in sorted(set(png_by) | set(glb_by)):
            mapping.append({
                "templateId_candidate": stem,
                "png": png_by.get(stem, {}).get("png"),
                "webp": png_by.get(stem, {}).get("webp"),
                "glb": glb_by.get(stem, {}).get("glb_incoming"),
                "filename_stem_match": stem in png_by and stem in glb_by,
                "activation": glb_by.get(stem, {}).get("glb_active"),
                "WARNING": "Candidate filename mapping only; verify canonical template identity and 3D suitability before activating." if stem in glb_by else None,
            })

        meta = {
            "tool": "prepare_vfrb_public_assets.py",
            "notes": [
                "PNG masters are copied without resizing and remain the authoritative source images.",
                "Gallery WebP files are derived from the PNG masters at the requested quality.",
                "All supplied GLBs are preserved under models/garments/incoming-meshy/.",
                "No GLB is automatically marked verified or activated unless explicitly listed with --activate.",
                "Filename stem matches are candidates only; they do not prove visual/semantic 2D↔3D correspondence.",
            ],
            "counts": {
                "png": len(png_manifest),
                "webp": len(png_manifest),
                "glb": len(glb_manifest),
                "activated_glb": len(activated),
                "duplicate_glb_hash_groups": len(duplicates),
            },
            "png_manifest": png_manifest,
            "glb_manifest": glb_manifest,
            "candidate_mapping": mapping,
            "duplicate_glb_hashes": duplicates,
        }

        (out / "asset-inventory.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
        with (out / "asset-inventory.csv").open("w", newline="", encoding="utf-8") as f:
            fields = ["templateId_candidate", "png", "webp", "glb", "filename_stem_match", "activation", "WARNING"]
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(mapping)

    readme = out / "README.txt"
    readme.write_text(
        """VFRB PUBLIC ASSET IMPORT

Copy the contents of this package's public/ directory into the React/Vite frontend public/ directory.

Directories:
  public/garments2d/source/              PNG masters from the uploaded preview ZIP
  public/gallery/                        WebP previews derived from those PNGs
  public/models/garments/incoming-meshy/ all 39 supplied GLBs, preserved as incoming assets

Important:
  - incoming-meshy is intentionally separate from the active GLB directory.
  - Do not mark every GLB verified just because it exists or parses.
  - Candidate filename mappings are listed in asset-inventory.csv/json.
  - Activate only exact, tested GLB/template mappings in public/models/garments/.

Reusable script:
  python prepare_vfrb_public_assets.py --png-zip <preview.zip> --glb-zip <meshy.zip> --frontend-root <frontend>

To explicitly activate one tested GLB:
  --activate scrub-top-women-short

""",
        encoding="utf-8",
    )

    print(f"Created: {out}")
    print(f"PNG masters : {len(png_manifest)}")
    print(f"WebP previews: {len(png_manifest)}")
    print(f"GLBs incoming : {len(glb_manifest)}")
    print(f"GLBs activated: {len(activated)}")
    if duplicates:
        print("Duplicate GLB SHA-256 groups:")
        for digest, names in duplicates.items():
            print(f"  {digest}: {', '.join(names)}")
    print(f"Inventory     : {out / 'asset-inventory.csv'}")
    print(f"Inventory JSON: {out / 'asset-inventory.json'}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
