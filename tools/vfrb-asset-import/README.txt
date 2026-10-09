VFRB PUBLIC ASSET IMPORT

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

