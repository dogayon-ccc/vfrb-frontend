"""Rebuilds every processed garment GLB in public/models/processed/ from the untouched Meshy sources.
Offline tooling only (not a runtime service). Needs: pip install trimesh numpy scipy networkx pillow
Usage: python tools/glb-extract/build_processed.py [--sheets]   (--sheets also writes 4-angle render sheets to tools/glb-extract/out/)
Each job is: source GLB, output, keep-band [y_lo, y_hi] in model units, and lateral rules (y_a, y_b, x_max) that drop hand/arm
vertices whose |x| exceeds x_max inside that height band. Values were read off gridded shaded renders of each source."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cutlib import cut, cut_planes, mirror_x, trim_y, trim_bottom, cap_open_boundaries, save
from extract import load_mesh

MODELS = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'models'))
JOBS = [
    # Work shirt: the arm removal (|x| > 0.50 below y 0.02) is a PLANE clip (straight sleeve hem + side edge), the hem-level
    # lateral rule is a vertex cut, and the result is mirrored x -> -x so the scanned chest pocket lands on the same side as the
    # 2D Button-Down pocket (viewer's left). See PLANE_JOBS / MIRROR below.
    ('Work_Uniform_Shirt with pocket on chest.glb', 'work-shirt-short-sleeve.glb', -10, 10,
     [(-10, -0.88, 0.42)]),
    ('Female full set corporate uniform and trousers.glb', 'pants-trousers.glb', -0.81, -0.03, [(-0.32, -0.03, 0.19)]),
    ('Navy_Textured_Short.glb', 'shorts-textured.glb', -0.5, -0.12, [(-0.6, -0.12, 0.215)]),
    ('Navy_Blue_Peplum_Dress.glb', 'skirt-pencil.glb', -0.44, -0.11, [(-0.2, -0.11, 0.205)]),
]

PLANE_JOBS = {'work-shirt-short-sleeve.glb': (0.50, 0.02)}  # out -> (x_max, y_min) for cut_planes
MIRROR = {'work-shirt-short-sleeve.glb'}
TRIM_Y = {'pants-trousers.glb': (0.035, 0.03), 'shorts-textured.glb': (0.04, 0.035), 'skirt-pencil.glb': (0.04, 0.04)}  # (top, bottom) in model units
TRIM_BOTTOM = {'work-shirt-short-sleeve.glb': 0.025}

if __name__ == '__main__':
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    os.makedirs(os.path.join(MODELS, 'processed'), exist_ok=True)
    for src, out, y_lo, y_hi, rules in JOBS:
        if only and out not in only:
            continue
        m = load_mesh(os.path.join(MODELS, src))
        s = cut(m, y_lo, y_hi, rules, min_comp=0.05)
        if out in PLANE_JOBS:
            s = cut_planes(s, *PLANE_JOBS[out])
        if out in TRIM_Y:
            s = trim_y(s, *TRIM_Y[out])
        if out in TRIM_BOTTOM:
            s = trim_bottom(s, TRIM_BOTTOM[out])
        if out in MIRROR:
            s = mirror_x(s)
        dst = os.path.join(MODELS, 'processed', out)
        save(s, dst)
        print(f'{out}: {len(m.vertices)} -> {len(s.vertices)} vertices')
        if out == 'work-shirt-short-sleeve.glb':
            capped = cap_open_boundaries(s)
            cap_dst = os.path.join(MODELS, 'processed', 'work-shirt-short-sleeve-capped.glb')
            save(capped, cap_dst)
            print(f'work-shirt-short-sleeve-capped.glb: {len(capped.vertices)} vertices, watertight={capped.is_watertight}')
        if '--sheets' in sys.argv:
            from raster import sheet
            os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
            sheet(dst, os.path.join(HERE, 'out', out.replace('.glb', '_sheet.png')))
