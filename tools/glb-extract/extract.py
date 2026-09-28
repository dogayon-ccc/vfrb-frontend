import numpy as np
import trimesh

def load_mesh(path):
    m = trimesh.load(path, process=False)
    if isinstance(m, trimesh.Scene):
        m = trimesh.util.concatenate([g for g in m.geometry.values()])
    return m

def torso_half_width_at_y(v, y, band=0.015, bins=80, max_gap_bins=3):
    """Walk outward from x=0 in a thin y-slice; stop at the first sustained empty
    gap (a real anatomical gap between torso and a separate limb), return that
    boundary as the torso half-width at this height. Falls back to full slice
    half-width if no gap is found (torso occupies the whole slice)."""
    mask = np.abs(v[:, 1] - y) < band
    xs = v[mask, 0]
    if len(xs) < 15:
        return None
    lo, hi = xs.min(), xs.max()
    edges = np.linspace(min(lo, -0.01), max(hi, 0.01), bins)
    hist, _ = np.histogram(xs, bins=edges)
    centers = (edges[:-1] + edges[1:]) / 2
    zero_idx = np.argmin(np.abs(centers))
    def walk(direction):
        gap = 0
        last_occupied = zero_idx
        i = zero_idx
        while 0 <= i < len(hist):
            if hist[i] == 0:
                gap += 1
                if gap >= max_gap_bins:
                    return centers[last_occupied]
            else:
                gap = 0
                last_occupied = i
            i += direction
        return centers[last_occupied]
    right = walk(1)
    left = walk(-1)
    return max(abs(left), abs(right))

def crop_region(mesh, y_lo, y_hi, sleeve_y_lo=None, hand_y_hi=None, torso_margin=1.15, band=0.02):
    """Keep faces within [y_lo, y_hi]. If sleeve_y_lo is given, vertices below it
    are additionally required to be within the measured torso half-width at their
    height (removes bare forearm/hand hanging below a short sleeve cuff). If
    hand_y_hi is given, vertices above it are required to be within the measured
    core half-width at their height (removes hand/wrist blobs poking up into a
    pants waistband from pockets)."""
    v = mesh.vertices
    keep_v = (v[:, 1] >= y_lo) & (v[:, 1] <= y_hi)

    def _restrict(sel_mask):
        ys_to_check = np.unique(np.round(v[sel_mask, 1] / band) * band) if sel_mask.any() else []
        width_cache = {}
        for yv in ys_to_check:
            w = torso_half_width_at_y(v, yv, band=band)
            if w is not None:
                width_cache[yv] = w * torso_margin
        for i in np.where(sel_mask)[0]:
            yv = round(v[i, 1] / band) * band
            w = width_cache.get(yv)
            if w is not None and abs(v[i, 0]) > w:
                keep_v[i] = False

    if sleeve_y_lo is not None:
        _restrict(keep_v & (v[:, 1] < sleeve_y_lo))
    if hand_y_hi is not None:
        _restrict(keep_v & (v[:, 1] > hand_y_hi))

    face_keep = keep_v[mesh.faces].all(axis=1)
    sub = mesh.submesh([face_keep], append=True)
    return sub

def clean(mesh, min_component_frac=0.02):
    """Drop tiny disconnected fragments left over from cropping (stray triangles)."""
    comps = mesh.split(only_watertight=False)
    if len(comps) <= 1:
        return mesh
    sizes = [len(c.vertices) for c in comps]
    thresh = max(sizes) * min_component_frac
    kept = [c for c, s in zip(comps, sizes) if s >= thresh]
    return trimesh.util.concatenate(kept) if kept else mesh

if __name__ == '__main__':
    import sys
    path = sys.argv[1]
    out = sys.argv[2]
    y_lo, y_hi = float(sys.argv[3]), float(sys.argv[4])
    sleeve_y_lo = float(sys.argv[5]) if len(sys.argv) > 5 else None
    mesh = load_mesh(path)
    result = crop_region(mesh, y_lo, y_hi, sleeve_y_lo=sleeve_y_lo)
    result = clean(result)
    result.export(out)
    print(f"cropped: verts {len(mesh.vertices)} -> {len(result.vertices)}, faces {len(mesh.faces)} -> {len(result.faces)}")
