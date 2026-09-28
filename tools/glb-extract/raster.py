import numpy as np
import trimesh
from PIL import Image

def load_mesh(path):
    m = trimesh.load(path, process=False)
    if isinstance(m, trimesh.Scene):
        m = trimesh.util.concatenate([g for g in m.geometry.values()])
    return m

def render_ortho(mesh, axis='front', size=900, pad=0.08, light=(0.4, 0.6, 0.7), yaw=0.0, frame=None, face_colors=None):
    mesh = mesh.copy()
    if yaw:
        c, s_ = np.cos(np.radians(yaw)), np.sin(np.radians(yaw))
        R = np.array([[c,0,s_],[0,1,0],[-s_,0,c]])
        mesh.vertices = mesh.vertices @ R.T
    v = mesh.vertices.copy()
    f = mesh.faces
    # face normals (world space) for flat shading
    fn = mesh.face_normals
    if axis == 'front':   # look along -z, project (x,y)
        proj = v[:, [0, 1]]; depth = -v[:, 2]; nrm = fn
    elif axis == 'back':  # look along +z
        proj = v[:, [0, 1]] * np.array([-1, 1]); depth = v[:, 2]; nrm = fn * np.array([-1, 1, 1])
    elif axis == 'side':  # look along -x, project (z,y)
        proj = v[:, [2, 1]] * np.array([-1, 1]); depth = -v[:, 0]; nrm = fn
    else:
        raise ValueError(axis)
    lo = proj.min(axis=0); hi = proj.max(axis=0)
    if frame is not None:
        lo, hi = np.array(frame[0]), np.array(frame[1])
    span = (hi - lo).max() * (1 + pad)
    ctr = (hi + lo) / 2
    def to_px(p):
        return ((p - ctr) / span + 0.5) * size
    px = to_px(proj)
    depth_buf = np.full((size, size), -1e9, dtype=np.float32)
    color_buf = np.zeros((size, size, 3), dtype=np.uint8)
    light = np.array(light) / np.linalg.norm(light)
    base = np.array([120, 170, 190])  # neutral teal-ish garment tone for legibility
    tri_px = px[f]        # (F,3,2)
    tri_depth = depth[f]  # (F,3)
    # backface cull-ish: shade by |dot| so both sides visible, but darken back-facing
    ndotl = nrm @ light
    shade = np.clip(np.abs(ndotl) * 0.85 + 0.15, 0.15, 1.0)
    order = np.argsort(tri_depth.mean(axis=1))  # painter's algorithm, far→near
    for i in order:
        tri = tri_px[i]; d = tri_depth[i].mean()
        x0, y0 = tri.min(axis=0); x1, y1 = tri.max(axis=0)
        xi0, xi1 = max(int(x0), 0), min(int(np.ceil(x1)) + 1, size)
        yi0, yi1 = max(int(y0), 0), min(int(np.ceil(y1)) + 1, size)
        if xi1 <= xi0 or yi1 <= yi0:
            continue
        xs, ys = np.meshgrid(np.arange(xi0, xi1), np.arange(yi0, yi1))
        p = np.stack([xs, ys], axis=-1).reshape(-1, 2).astype(np.float32)
        a, b, c = tri
        v0, v1 = b - a, c - a
        v2 = p - a
        d00 = v0 @ v0; d01 = v0 @ v1; d11 = v1 @ v1
        d20 = v2 @ v0; d21 = v2 @ v1
        denom = d00 * d11 - d01 * d01
        if abs(denom) < 1e-9:
            continue
        u = (d11 * d20 - d01 * d21) / denom
        w = (d00 * d21 - d01 * d20) / denom
        inside = (u >= -0.01) & (w >= -0.01) & (u + w <= 1.01)
        if not inside.any():
            continue
        xs_in = xs.reshape(-1)[inside]; ys_in = ys.reshape(-1)[inside]
        col = ((face_colors[i] if face_colors is not None else base) * shade[i]).astype(np.uint8)
        color_buf[size - 1 - ys_in, xs_in] = col  # flip y for image coords
        depth_buf[size - 1 - ys_in, xs_in] = d
    bg = color_buf.sum(axis=-1) == 0
    color_buf[bg] = 245
    return Image.fromarray(color_buf)

if __name__ == '__main__':
    import sys
    path, outbase = sys.argv[1], sys.argv[2]
    mesh = load_mesh(path)
    for ax in ['front', 'side', 'back']:
        img = render_ortho(mesh, axis=ax)
        img.save(f'/home/claude/renders/{outbase}_{ax}.png')
    print('done', outbase)

def sheet(path, out, yaws=(0, 45, 90, 180), size=520, base_axis='back'):
    from PIL import Image
    mesh = load_mesh(path)
    # fixed frame from the unrotated bbox so all views share scale
    b = mesh.bounds
    r = float(max(b[1]-b[0])) / 2 * 1.15
    c = (b[0]+b[1])/2
    frame = ((c[0]-r, c[1]-r), (c[0]+r, c[1]+r))
    tiles = [render_ortho(mesh, axis=base_axis, size=size, yaw=y, frame=frame) for y in yaws]
    W = Image.new('RGB', (size*len(tiles), size), (245,245,245))
    for i,t in enumerate(tiles): W.paste(t, (i*size, 0))
    W.save(out)
