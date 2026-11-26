"""blender --background --python blender_entry.py -- <stage> [options]"""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["prepare", "render", "build", "export", "verify", "revalidate"])
    ap.add_argument("--config", default=os.path.join(HERE, "config", "scrub_top_pilot_01.json"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--source")
    ap.add_argument("--blend")
    ap.add_argument("--glb")
    ap.add_argument("--tag", default="review")
    ap.add_argument("--confirm-regions", action="store_true")
    ap.add_argument("--confirm-handedness", action="store_true")
    a = ap.parse_args(argv)
    with open(a.config) as f:
        cfg = json.load(f)
    from vfrb_authoring import bl_stages as B
    if a.stage == "prepare":
        r = B.prepare(cfg, a.source, a.out, cfg["master_source"]["sha256"])
    elif a.stage == "render":
        r = B.render_blend(cfg, a.blend, a.out, a.tag)
    elif a.stage == "build":
        r = B.build(cfg, a.blend, a.out, a.confirm_regions, a.confirm_handedness)
    elif a.stage == "export":
        r = B.export(cfg, a.blend, a.out)
    elif a.stage == "verify":
        r = B.verify(cfg, a.glb, a.out)
    else:
        with open(os.path.join(a.out, "manifests", "authoring_report.json")) as f:
            ar = json.load(f)
        r = B.process_outputs(cfg, a.glb, a.out, ar["source_sha256"], ar["clean_tris"])
    print(json.dumps(r, indent=1, default=str)[:4000])
    if isinstance(r, dict) and r.get("pass_") is False:
        sys.exit(2)


main()
