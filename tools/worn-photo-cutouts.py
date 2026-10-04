import numpy as np, os, json
from PIL import Image
from scipy import ndimage as ndi
fs = list(np.load('fs.npy'))
def clean_mask(m, min_area=400):
    m = ndi.binary_opening(m, np.ones((3, 3))); m = ndi.binary_closing(m, np.ones((5, 5))); m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n == 0: return m
    ar = ndi.sum(m, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, a in enumerate(ar) if a >= min_area]); return keep
def cutout(im, m, erode=1):
    m = ndi.binary_erosion(m, np.ones((3, 3)), iterations=erode) if erode else m
    a = ndi.gaussian_filter(m.astype(float), 0.8); a = np.clip((a - 0.25) / 0.6, 0, 1)
    arr = np.array(im.convert('RGBA')); arr[..., 3] = (a * arr[..., 3] * 1).astype(np.uint8)
    out = Image.fromarray(arr); bb = out.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    pad = 6; bb = (max(bb[0] - pad, 0), max(bb[1] - pad, 0), min(bb[2] + pad, out.width), min(bb[3] + pad, out.height))
    return out.crop(bb)
def strip_neck(img, pred, rows=0.28):
    a = np.array(img); h = a.shape[0]; rgb = a[..., :3].astype(float)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sk = pred(r, g, b) & (a[..., 3] > 0); w = sk.shape[1]; sk[:, :int(w * .3)] = False; sk[:, int(w * .7):] = False; sk[int(h * rows):] = False
    sk = ndi.binary_dilation(ndi.binary_opening(sk, np.ones((2, 2))), np.ones((3, 3)), iterations=1)
    sk[int(h * rows):] = False; a[sk, 3] = 0
    m = clean_mask(a[..., 3] > 20, 800); a[~m, 3] = 0
    return Image.fromarray(a)
def unwatermark(img, thr=7, size=7, dil=1):
    # VFRB MANILA watermark = thin brighter/lighter text. Replace pixels brighter than their 7x7 median neighbourhood by that median.
    a = np.array(img).astype(float); rgb = a[..., :3]; alpha = a[..., 3] > 200
    med = np.stack([ndi.median_filter(rgb[..., c], size=size) for c in range(3)], -1)
    lum = rgb @ [0.299, 0.587, 0.114]; mlum = med @ [0.299, 0.587, 0.114]
    wm = (lum - mlum > thr) & alpha; wm = ndi.binary_dilation(wm, np.ones((3, 3)), iterations=dil)
    rgb[wm] = med[wm]; a[..., :3] = rgb; return Image.fromarray(a.astype(np.uint8)), int(wm.sum())
IDS = {0:'bir-blouse-trousers-blue',1:'pantsuit-notch-short-gray',2:'polo-barong-brown',3:'jack-shirt-two-tone',4:'blazer-double-breasted-gray',5:'dress-butter-belted',6:'dress-bir-green-yellow-collar',7:'dress-sheath-denim-blue',8:'blazer-pinstripe-navy',9:'blazer-blouse-blue-short',10:'blouse-roundneck-fuchsia',11:'blouse-roundneck-mustard',12:'polo-red-claremont',13:'shirt-two-tone-gpc',14:'peplum-set-navy'}
os.makedirs('out/gallery', exist_ok=True); os.makedirs('out/base', exist_ok=True)
rep = {}
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGBA'); cls = np.load(f'cls{i}.npy'); alpha = np.array(im)[..., 3] > 20
    fg = np.load(f'fg{i}.npy'); m = ndi.binary_closing((fg > 160) & alpha, structure=np.ones((21, 1))) & alpha; m = clean_mask(m)
    co = cutout(im, m); co.save(f'out/gallery/{IDS[i]}.webp', 'WEBP', quality=92, method=6)
    rep[IDS[i]] = {'size': co.size, 'kept_px': int(m.sum())}
    if i in (0, 10):  # single-garment bases: upper-body class only (no trousers)
        up = clean_mask(ndi.binary_closing((cls == 1) & alpha, structure=np.ones((21, 1))) & alpha, 800)
        b = cutout(im, up)
        if i == 0: b = strip_neck(b, lambda r, g, bl: (r > bl - 10) & (r > 90))          # blue blouse: any warm pixel near the collar is skin
        if i == 10: b = strip_neck(b, lambda r, g, bl: (g > 0.55 * r) & (r > 150))      # fuchsia: skin/cream has far more green than fuchsia
        b, n = unwatermark(b, *( (5, 7, 1) if i == 10 else (7, 7, 1) )); b.save(f'out/base/{IDS[i]}-top-front.webp', 'WEBP', quality=94, method=6)
        arr = np.array(b).astype(float); s = arr[..., 3] > 200; lum = (arr[..., :3] @ [0.299, 0.587, 0.114])[s]
        rep[IDS[i]]['base'] = {'size': b.size, 'refLum': round(float(np.median(lum)), 1), 'wmPx': n}
print(json.dumps(rep, indent=0))
W, H = 150, 230; sheet = Image.new('RGB', (W * 8, H * 2), (200, 200, 215))
for i in range(15):
    g = Image.open(f'out/gallery/{IDS[i]}.webp'); g.thumbnail((W - 6, H - 6)); sheet.paste(g, ((i % 8) * W + 3, (i // 8) * H + 3), g)
sheet.save('cutouts-sheet.png')
