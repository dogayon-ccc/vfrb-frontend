"""Independent validation of a processed GLB against the source contract. No bpy; reads the file itself."""
import json, sys
from collections import Counter
import numpy as np
from . import mathcore as mc
from .glb_io import read_glb, sha256_file, _split


def validate(glb, cfg, source_sha256=None, source_tris=None, derived_dir=None, res=1024):
    checks = []

    def chk(name, ok, detail=""):
        checks.append(dict(check=name, ok=bool(ok), detail=str(detail)))

    j, _ = _split(glb)
    chk("not Draco", "KHR_draco_mesh_compression" not in (j.get("extensionsUsed") or []))
    chk("no embedded textures", not j.get("textures"))
    parts = read_glb(glb)
    req = list(cfg["regions"])
    chk("required parts present", set(req) <= set(parts), sorted(set(req) - set(parts)))
    chk("no unexpected parts", set(parts) <= set(req), sorted(set(parts) - set(req)))
    chk("one material per part, not shared", len({p["material"] for p in parts.values()}) == len(parts))
    tot = sum(len(p["T"]) for p in parts.values())
    if source_tris is not None:
        chk("triangle count equals source", tot == source_tris, f"{tot} vs {source_tris}")
    chk("source hash recorded", all(p["extras"].get("vfrb_source_sha256") == source_sha256 for p in parts.values()) if source_sha256 else True)
    for n, side in (("sleeve_l", 1), ("sleeve_r", -1)):
        if n in parts:
            chk(f"{n} on wearer-{'left' if side > 0 else 'right'} (+X = left)", side * parts[n]["V"][:, 0].mean() > 0)
    uvs, areas = {}, []
    for n, p in parts.items():
        ok = p["uv"] is not None and np.isfinite(p["uv"]).all()
        chk(f"{n}: UV present", ok)
        if not ok:
            continue
        uv = p["uv"].copy()
        uv[:, 1] = 1 - uv[:, 1]
        c = uv[p["T"]]
        chk(f"{n}: UV inside 0..1", c.min() >= -1e-6 and c.max() <= 1 + 1e-6)
        cov = mc.coverage_map(c, res)
        used = max((cov > 0).sum(), 1)
        over = float((cov > 2).sum() / used)   # closed thick shell: exactly 2 layers (outer+inner wall) is expected
        chk(f"{n}: UV layers > 2 at <= {cfg['limits']['max_uv_overlap_pct']}% of texels", 100 * over <= cfg["limits"]["max_uv_overlap_pct"], f"{100 * over:.3f}% (double-wall texels {100 * float((cov == 2).sum() / used):.1f}%)")
        _, a3 = mc.tri_geom(p["V"], p["T"])
        areas.append((n, float(mc.uv_area(c).sum()), float(a3.sum())))
        uvs[n] = c
    if areas:
        d = np.array([np.sqrt(a / b) for _, a, b in areas])
        spread = float(d.max() / d.min())
        chk(f"texel density spread <= {cfg['limits']['max_density_spread']}x", spread <= cfg["limits"]["max_density_spread"], f"{spread:.3f}x " + ", ".join(f"{n}:{x:.3f}" for (n, _, _), x in zip(areas, d)))
        names = [a[0] for a in areas]
        for i, a in enumerate(names):
            for b in names[i + 1:]:
                chk(f"islands {a}/{b} do not share atlas texels", not _share(uvs[a], uvs[b], 512))
    if derived_dir:
        with open(f"{derived_dir}/mapping_manifest.json") as f:
            m = json.load(f)
        chk("2D manifest matches GLB hash", m["processed_sha256"] == sha256_file(glb))
        _check_panels(m, parts, cfg, chk)
        pt = {n: 0 for n in parts}
        for pn in m["panels"]:
            pt[pn["part"]] += pn["tri_count"]
        chk("2D outline faces per part <= part triangles (outlines are NOT a full partition)", all(0 < pt[n] <= len(parts[n]["T"]) for n in parts), {n: f"{pt[n]}/{len(parts[n]['T'])}" for n in parts})
    ok = all(c["ok"] for c in checks)
    return dict(glb=glb, sha256=sha256_file(glb), pass_=ok, checks=checks)


VIEWS = ("front", "back")


def expected_views(cfg, part):
    v = cfg["regions"].get(part, {}).get("views", list(VIEWS))
    bad = [x for x in v if x not in VIEWS]
    if bad or not v:
        raise ValueError(f"{part}: invalid views {v!r}; allowed subset of {VIEWS}")
    return tuple(v)


def outline_usable(panel, min_ratio):
    """True if the panel has at least one finite loop (>=3 points) whose area is a sane fraction of its bbox."""
    loops = panel.get("outline") or []
    bb = panel.get("bbox_mu")
    if not bb or len(bb) != 4:
        return False, "no bbox_mu"
    box = (bb[2] - bb[0]) * (bb[3] - bb[1])
    best = 0.0
    for lp in loops:
        a = np.asarray(lp, float)
        if a.ndim != 2 or a.shape[0] < 3 or a.shape[1] != 2 or not np.isfinite(a).all():
            continue
        x, y = a[:, 0], a[:, 1]
        best = max(best, 0.5 * abs(float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))))
    if best <= 0:
        return False, f"{len(loops)} loop(s), none usable"
    ratio = best / box if box > 0 else 0.0
    return ratio >= min_ratio, f"largest loop area/bbox = {ratio:.3f}"


def _check_panels(m, parts, cfg, chk):
    exp = {(n, v) for n in parts for v in expected_views(cfg, n)}
    seen = Counter((p["part"], p["view"]) for p in m["panels"])
    chk("panels: no missing (part, view)", not (exp - set(seen)), sorted(exp - set(seen)))
    chk("panels: no duplicate (part, view)", all(c == 1 for c in seen.values()), sorted(k for k, c in seen.items() if c > 1))
    chk("panels: no unexpected (part, view)", not (set(seen) - exp), sorted(set(seen) - exp))
    lo = cfg["limits"].get("min_outline_area_ratio", 0.01)
    for p in m["panels"]:
        ok, d = outline_usable(p, lo)
        chk(f"panel {p['part']}.{p['view']}: usable outline loop", ok, d)
        chk(f"panel {p['part']}.{p['view']}: tri_count > 0 and matches mesh", p["tri_count"] > 0 and len(p["mesh"]["xy"]) == p["tri_count"] == len(p["mesh"]["uv"]))


def coverage_bbox(c):
    return c.reshape(-1, 2).min(0), c.reshape(-1, 2).max(0)


def _share(a, b, res):
    ca, cb = mc.coverage_map(a, res) > 0, mc.coverage_map(b, res) > 0
    return bool((ca & cb).any())


if __name__ == "__main__":
    with open(sys.argv[2]) as f:
        cfg = json.load(f)
    r = validate(sys.argv[1], cfg)
    print(json.dumps(r, indent=1))
    sys.exit(0 if r["pass_"] else 1)


def mesh_integrity(expected_tris, T, n_verts, expected_verts=None):
    """Pure check that an edited prepared mesh still matches the source it was prepared from.
    Returns a list of problems (empty = OK). Face assignment must never add, remove, rewire or orphan geometry.
    expected_verts comes from prepare_report.json (verts_after); it catches rewired meshes whose triangle count still matches."""
    T = np.asarray(T)
    problems = []
    if len(T) != int(expected_tris):
        problems.append(f"triangle count is {len(T)} but the prepared source had {int(expected_tris)} ({len(T) - int(expected_tris):+d})")
    used = int(len(np.unique(T))) if len(T) else 0
    if int(n_verts) != used:
        problems.append(f"{int(n_verts) - used} vertices are not used by any face (loose geometry)")
    if expected_verts is not None and int(n_verts) != int(expected_verts):
        problems.append(f"vertex count is {int(n_verts)} but the prepared source had {int(expected_verts)} ({int(n_verts) - int(expected_verts):+d})")
    return problems
