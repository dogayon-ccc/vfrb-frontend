import glob, os, numpy as np, onnxruntime as ort
from PIL import Image
sess = ort.InferenceSession('/tmp/models/cloth.onnx', providers=['CPUExecutionProvider'])
inp = sess.get_inputs()[0].name
def seg(rgba):
    a = rgba.split()[3]
    bg = Image.new('RGB', rgba.size, (255, 255, 255)); bg.paste(rgba.convert('RGB'), mask=a)
    x = np.asarray(bg.resize((768, 768), Image.LANCZOS)).astype(np.float32); x = x / max(x.max(), 1e-6)
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    out = sess.run(None, {inp: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    e = np.exp(out - out.max(0)); p = e / e.sum(0)
    cls = p.argmax(0).astype(np.uint8)
    return np.array(Image.fromarray(cls).resize(rgba.size, Image.NEAREST))
if __name__ == '__main__':
    fs = [f for f in sorted(glob.glob('/mnt/user-data/uploads/*.png')) if not os.path.basename(f).startswith(('Screenshot', 'VFRB-ORD'))]
    np.save('fs.npy', np.array(fs))
    cols = [(255, 255, 255), (255, 0, 255), (0, 200, 255), (255, 200, 0)]
    W, H = 200, 310; sheet = Image.new('RGB', (W * 8, H * 4), 'white')
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGBA'); cls = seg(im); np.save(f'cls{i}.npy', cls)
        a = np.array(im)[..., 3] > 20
        vis = np.zeros(cls.shape + (3,), np.uint8)
        for k, c in enumerate(cols): vis[(cls == k)] = c
        vis[~a] = 255
        o = Image.fromarray(vis); o.thumbnail((W, H)); r = im.convert('RGB'); r.thumbnail((W, H))
        sheet.paste(r, ((i % 4) * 2 * W, (i // 4) * H)); sheet.paste(o, ((i % 4) * 2 * W + W, (i // 4) * H))
        print(i, os.path.basename(f)[:40], [int((cls == k).sum()) for k in (1, 2, 3)])
    sheet.save('seg-sheet.png')
