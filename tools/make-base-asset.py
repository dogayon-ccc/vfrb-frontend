"""Cut one garment out of a transparent product photo and write a 2D base asset.
usage: python tools/make-base-asset.py <src.png> <out.webp> <x0> <x1>   (x0..x1 = column band holding only that garment)
Prints the JSON the garmentAssets.js manifest needs (size + reference luminance of the garment pixels)."""
import sys, json
from PIL import Image
import numpy as np

src, out, x0, x1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGBA').crop((x0, 0, x1, Image.open(src).height))
a = np.array(im)
alpha = a[..., 3]
ys, xs = np.where(alpha > 8)
im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
a = np.array(im).astype(float)
solid = a[..., 3] > 200
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
ref = float(np.median(lum[solid]))
im.save(out, 'WEBP', quality=88, method=6)
print(json.dumps({'w': im.width, 'h': im.height, 'refLum': round(ref, 1), 'coverage': round(float(solid.mean()), 3)}))
