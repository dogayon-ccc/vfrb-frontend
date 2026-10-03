"""Build a clean trim mask for a photo base whose trim is darker than its body.
usage: python tools/make-trim-mask.py <base.webp> <mask.webp> <lum_below> [min_area]
Mask = white where the pixel is trim (collar band, cuffs, welts, buttons). Thin outline shadows and tiny specks are removed,
so the runtime can recolour trim without speckling the silhouette. Prints component stats for review."""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

src, out, below = sys.argv[1], sys.argv[2], float(sys.argv[3])
min_area = int(sys.argv[4]) if len(sys.argv) > 4 else 30
a = np.array(Image.open(src).convert('RGBA')).astype(float)
solid = a[..., 3] > 200
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
raw = solid & (lum < below)
# 1) opening removes outline shadows / 1-3px specks; 2) reconstruction grows survivors back by <=2px inside the raw dark area
core = ndi.binary_opening(raw, structure=np.ones((5, 5)))
grown = ndi.binary_dilation(core, structure=np.ones((3, 3)), iterations=2) & raw
lab, n = ndi.label(grown)
areas = ndi.sum(grown, lab, range(1, n + 1))
keep = np.zeros_like(grown)
for i, ar in enumerate(areas, 1):
    ys, xs = np.where(lab == i)
    print(f'component {i}: area={int(ar)} bbox=({xs.min()},{ys.min()})-({xs.max()},{ys.max()})', 'KEEP' if ar >= min_area else 'drop')
    if ar >= min_area: keep |= lab == i
Image.fromarray((keep * 255).astype(np.uint8), 'L').save(out, 'WEBP', lossless=True)
print('trim px', int(keep.sum()), 'of', int(solid.sum()))
