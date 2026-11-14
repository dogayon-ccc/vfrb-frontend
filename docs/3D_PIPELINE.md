# Photo to GLB, locally

```
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r scripts/requirements-3d.txt
python scripts/garment_to_glb.py public/gallery/scrub-set-men-vneck.webp --id scrub-top-men
```

Output: `public/models/candidates/<id>.glb`, about 15,000 triangles, pivot centred, 1 unit tall, photo colours as vertex colour.

| Engine | Needs | What you get |
|---|---|---|
| `relief` (default) | CPU only | The silhouette inflated into a closed front/back shell. An approximate volume, not a reconstruction. |
| `midas` | `torch` (weights download once) | Same shell, thickness shaped by MiDaS depth. |
| `triposr` | `torch` + the TripoSR repo on `PYTHONPATH` | A real single-image reconstruction. Not run in this repo's checks. |

Background removal uses rembg. `--bg-model u2net` (default, 176 MB), `u2netp` (small, low RAM), `bria-rmbg` (1 GB, needs RAM).

Checked here: relief with and without rembg (u2netp) on `scrub-set-men-vneck.webp` produced a 15,000-triangle GLB that reloads with vertex colours. Not checked: TripoSR, MiDaS, and how any output looks in the Studio viewer.

Photos of garments worn on a person produce a body-shaped cut-out. Use flat-lay or ghost-mannequin photos. A candidate stays hidden from clients until it passes the intake checks in `src/pages/client/design-studio/glbSlots.ts`.
