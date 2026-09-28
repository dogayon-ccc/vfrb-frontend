"""Rebuilds every processed garment GLB in public/models/processed/ from the untouched Meshy sources.
Offline tooling only (not a runtime service). Needs: pip install trimesh numpy scipy networkx pillow
Usage: python tools/glb-extract/build_processed.py [--sheets]   (--sheets also writes 4-angle render sheets to tools/glb-extract/out/)
Each job is: source GLB, output, keep-band [y_lo, y_hi] in model units, and lateral rules (y_a, y_b, x_max) that drop hand/arm
vertices whose |x| exceeds x_max inside that height band. Values were read off gridded shaded renders of each source."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cutlib import cut, save
from extract import load_mesh

MODELS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'models'))
JOBS = [
    ('Work_Uniform_Shirt with pocket on chest.glb', 'work-shirt-short-sleeve.glb', -10, 10,
     [(-10, 0.02, 0.50), (-10, -0.88, 0.42)]),
    ('Female full set corporate uniform and trousers.glb', 'pants-trousers.glb', -0.81, -0.03, [(-0.32, -0.03, 0.19)]),
    ('Navy_Textured_Short.glb', 'shorts-textured.glb', -0.5, -0.12, [(-0.6, -0.12, 0.215)]),
    ('Navy_Blue_Peplum_Dress.glb', 'skirt-pencil.glb', -0.44, -0.11, [(-0.2, -0.11, 0.205)]),
]

if __name__ == '__main__':
    os.makedirs(os.path.join(MODELS, 'processed'), exist_ok=True)
    for src, out, y_lo, y_hi, rules in JOBS:
        m = load_mesh(os.path.join(MODELS, src))
        s = cut(m, y_lo, y_hi, rules, min_comp=0.05)
        dst = os.path.join(MODELS, 'processed', out)
        save(s, dst)
        print(f'{out}: {len(m.vertices)} -> {len(s.vertices)} vertices')
        if '--sheets' in sys.argv:
            from raster import sheet
            os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
            sheet(dst, os.path.join(HERE, 'out', out.replace('.glb', '_sheet.png')))
