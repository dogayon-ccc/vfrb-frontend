"""Derive garment-only, editable pieces from the 23 read-only reference GLBs (public/models/reference, never modified).

python tools/glb-extract/derive_template.py singles|sets|all [reference ids...]   |   reshade (shade maps only)

Per reference: remove non-garment parts by evidence, split sets at REF_SPLIT (referenceColour.js), recentre and scale (height 1.9,
like the Meshy models the Studio already serves), decimate pieces over 50k triangles behind three gates, and write
public/models/vfrb-derived/<id>[-top|-bottom].glb plus front/back shade maps. The front (and back, where it differs) orthographic
silhouette becomes the piece's closed 2D body path. Results go to tools/glb-extract/derived-manifest.json and the generated module
src/pages/client/design-studio/derivedTemplates.generated.js. Originals are hashed before and after; a mismatch aborts.
"""
import hashlib, json, os, re, sys
import numpy as np
import trimesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meshkit as K

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'public', 'models', 'reference')
OUT = os.path.join(ROOT, 'public', 'models', 'vfrb-derived')
MANIFEST = os.path.join(os.path.dirname(__file__), 'derived-manifest.json')
GENERATED = os.path.join(ROOT, 'src', 'pages', 'client', 'design-studio', 'derivedTemplates.generated.js')
MAX_TRIS = 50000

# Single garments: 'top' or 'dress' (full length). Everything else in REF_SPLIT is a set.
SINGLES = {'blazer-open-front-black': 'top', 'blouse-asymmetric-blue': 'top', 'blouse-mandarin-yellow': 'top', 'blouse-pleated-bib-white': 'top',
           'blouse-scarf-cream': 'top', 'blouse-tunic-roundneck-blue': 'top', 'dress-butter-belted': 'dress', 'dress-tunic-maternity-navy': 'dress',
           'jack-shirt-two-tone': 'top'}
# Mannequin neck stubs, fused into the collar surface (one connected mesh): a capped cylinder ~0.13 / ~0.20 wide above the collar.
# Value = depth below the top (fraction of height) where the collar starts, measured from 0.4%-step slice widths and point counts.
NECK = {'set-pinstripe-pants': 0.034, 'set-pinstripe-skirt': 0.042}
TEMPLATE_H = {'top': 400, 'dress': 500, 'bottom': 420}
PAD = 20


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def ref_split():
    """REF_SPLIT read from referenceColour.js (single source of truth)."""
    s = open(os.path.join(ROOT, 'src', 'pages', 'client', 'design-studio', 'referenceColour.js'), encoding='utf-8').read()
    return {m[0]: {'axis': m[1], 'at': float(m[2])} for m in re.findall(r"'([a-z0-9-]+)': \{ axis: '([xy])', at: ([0-9.]+) \}", s)}


def remove_neck(v, f, depth_frac):
    """Faces wholly above the collar start inside the measured neck cylinder. Returns kept faces and evidence."""
    y = v[:, 1]; hi, H = y.max(), np.ptp(y)
    cut = hi - depth_frac * H
    band = v[(y > cut) & (y < hi - 0.012 * H)]
    c = np.median(band[:, [0, 2]], axis=0)
    R = float(np.percentile(np.linalg.norm(band[:, [0, 2]] - c, axis=1), 95)) * 1.1
    r = np.linalg.norm(v[:, [0, 2]] - c, axis=1)
    inside = (y > cut) & (r < R)
    drop = inside[f].all(1)
    return ~drop, {'cut_depth_frac': depth_frac, 'axis_xz': [round(float(c[0]), 4), round(float(c[1]), 4)], 'radius': round(R, 4), 'faces_removed': int(drop.sum())}


def drop_fragments(v, f, frac=0.0005):
    lab = K.face_components(v, f); cnt = np.bincount(lab)
    small = np.where(cnt < frac * len(f))[0]
    return ~np.isin(lab, small), {'components': int(len(cnt)), 'fragments_removed': int(len(small)), 'fragment_faces': int(cnt[small].sum())}


def split_set(v, f, sp):
    """Two pieces. x: flat-lay pieces lie side by side, assigned whole by component (a straddling component fails).
    y: plane clip at the top's hem; lower-half components that do not reach the bottom garment's lower 75% (sleeve cuffs hanging
    past the hem) go back to the top, so no garment piece is lost or misassigned."""
    lo, hi = v.min(0), v.max(0)
    if sp['axis'] == 'x':
        xc = lo[0] + (hi[0] - lo[0]) * sp['at']
        lab = K.face_components(v, f)
        top, bot, straddle = [], [], []
        for c in range(lab.max() + 1):
            fx = v[np.unique(f[lab == c])][:, 0]
            (straddle if fx.min() < xc < fx.max() else top if fx.max() <= xc else bot).append(c)
        if straddle:
            raise RuntimeError(f'component(s) {straddle} straddle the x split')
        return (v, f[np.isin(lab, top)]), (v, f[np.isin(lab, bot)]), {'method': 'component', 'top_components': top, 'bottom_components': bot}
    yc = lo[1] + (hi[1] - lo[1]) * sp['at']
    tv, tf = K.clip_y(v, f, yc, keep_above=True)
    bv, bf = K.clip_y(v, f, yc, keep_above=False)
    lab = K.face_components(bv, bf); moved = []
    floor = lo[1] + 0.75 * (yc - lo[1])  # the bottom garment's own surface reaches below this height
    for c in range(lab.max() + 1):
        cf = bf[lab == c]
        if bv[np.unique(cf)][:, 1].min() > floor:
            moved.append({'faces': int(len(cf)), 'min_y_frac': round(float((bv[np.unique(cf)][:, 1].min() - lo[1]) / (hi[1] - lo[1])), 3)})
            tf = np.concatenate([tf, cf + len(tv)]); tv = np.concatenate([tv, bv])
    keep = ~np.isin(lab, [i for i in range(lab.max() + 1) if bv[np.unique(bf[lab == i])][:, 1].min() > floor])
    bv2, bf2 = K.submesh(bv, bf, keep)
    tv2, tf2 = K.submesh(tv, tf, np.ones(len(tf), bool))
    return (tv2, tf2), (bv2, bf2), {'method': 'plane', 'y_frac': sp['at'], 'cuff_fragments_to_top': moved}


def weld(v, f):
    mid = merged_ids_first(v)
    uniq, inv = np.unique(mid, return_inverse=True)
    nv = np.zeros((len(uniq), 3)); nv[inv] = v
    nf = inv[f]
    nf = nf[(nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2])]
    return K.submesh(nv, nf, np.ones(len(nf), bool))


def merged_ids_first(v):
    return K.merged_ids(v, tol=1e-6)


def normalise(v):
    lo, hi = v.min(0), v.max(0)
    s = 1.9 / (hi[1] - lo[1])
    return (v - (lo + hi) / 2) * s, float(s)


def neck_cover(v, f):
    """Top-down coverage of a small disc at the centre of the top opening (neckline or waist); low = open hole."""
    y = v[:, 1]; hi, H = y.max(), np.ptp(y)
    ff = f[(y[f] > hi - 0.08 * H).all(1)]
    if not len(ff):
        return 0.0
    top = v[np.unique(ff)]; cx, cz = np.median(top[:, 0]), np.median(top[:, 2])
    d = K.zbuffer(v, ff, 'top', 200, 200, (cx - 0.15, cx + 0.15, -cz - 0.15, -cz + 0.15))
    yy, xx = np.mgrid[:200, :200]
    return round(float((~np.isnan(d))[(xx - 100) ** 2 + (yy - 100) ** 2 < 18 ** 2].mean()), 3)


def view_mask(v, f, view, frame=None, res=768):
    return K.silhouette(K.zbuffer(v, f, view, res, res, frame or K.frame_of(v, view), pad=8))


def decimate(v, f):
    """Quadric edge collapse to <= 50k triangles; kept only if all gates pass (else the undecimated piece is kept and reported)."""
    import fast_simplification
    gates = {}
    if len(f) <= MAX_TRIS:
        return v, f, {'decimated': False, 'reason': 'under cap'}
    dv, df = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=1 - (MAX_TRIS - 200) / len(f))
    dv, df = np.asarray(dv, float), np.asarray(df, np.int64)
    # Front silhouette IoU (the brief's gate); the other four views catch collapsed sleeve ends and hems (the scans are closed shells,
    # so an open-edge length test would measure nothing); the top-view opening cover catches a neckline or waist closing up.
    ious = {vw: round(K.iou(view_mask(v, f, vw), view_mask(dv, df, vw, K.frame_of(v, vw))), 4) for vw in ('front', 'back', 'left', 'right', 'top')}
    gates['front_iou'] = ious['front']; gates['view_iou_min'] = min(ious.values())
    gates['opening_cover_before'], gates['opening_cover_after'] = neck_cover(v, f), neck_cover(dv, df)
    ok = gates['front_iou'] >= 0.98 and gates['view_iou_min'] >= 0.97 and gates['opening_cover_after'] <= gates['opening_cover_before'] + 0.02
    if ok and len(df) <= MAX_TRIS:
        return dv, df, {'decimated': True, 'tris_before': int(len(f)), 'tris_after': int(len(df)), **gates}
    return v, f, {'decimated': False, 'reason': 'gate failed: kept original triangle count', 'tris_before': int(len(f)), **gates}


def path_d(pts):
    return 'M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'


def template_2d(v, f, kind):
    """Closed body path (front, and back where it differs) in Studio canvas pixels, plus shade maps at 2x."""
    H2 = TEMPLATE_H[kind]
    fr = K.frame_of(v, 'front')
    W2 = int(np.ceil((fr[1] - fr[0]) / (fr[3] - fr[2]) * (H2 - 2 * PAD) + 2 * PAD))
    out = {'w': W2, 'h': H2}
    masks = {}
    for face in ('front', 'back'):
        fb = K.frame_of(v, face)
        hi_res = K.zbuffer(v, f, face, W2 * 4, H2 * 4, fb, pad=PAD * 4)
        masks[face] = K.silhouette(hi_res, close=3)
        pts = K.simplify(K.outline(masks[face]) / 4.0, 0.6)
        out[face] = path_d(pts)
        out[face + '_points'] = int(len(pts))
        # Shade at 1.5x the canvas, 64 grey levels (keeps each PNG small; the multiply layer is smooth at that depth).
        W3, H3, P3 = int(W2 * 1.5), int(H2 * 1.5), int(PAD * 1.5)
        d2 = K.zbuffer(v, f, face, W3, H3, fb, pad=P3)
        m2 = K.silhouette(d2, close=2)
        s, _, _ = K.mapping(fb, W3, H3, P3)
        d2 = K.despeckle(K.despeckle(K.despeckle(d2, 0.01), 0.01, r=2), 0.01, r=3)
        shade = np.round(K.shade_map(d2, m2, s) * 63) / 63
        alpha = np.where(m2, 255, 0)
        out[face + '_shade'] = np.dstack([np.where(m2, shade * 255, 255), alpha])
    sym = K.iou(masks['front'], masks['back'])
    out['back_iou_vs_front'] = round(sym, 4)
    if sym >= 0.97:
        out['back'] = None  # the back view uses the front outline
    return out


def process(ref, kind, split, log):
    src = os.path.join(SRC, ref + '.glb')
    v, f, has_uv = K.load(src)
    ev = {'source': f'public/models/reference/{ref}.glb', 'source_sha256': sha(src), 'tris_source': int(len(f)), 'uv': has_uv}
    if ref in NECK:
        keep, ev['neck'] = remove_neck(v, f, NECK[ref]); v, f = K.submesh(v, f, keep)
        ev['neck']['opening_cover_after'] = neck_cover(v, f)
    keep, ev['fragments'] = drop_fragments(v, f); v, f = K.submesh(v, f, keep)
    pieces = [(ref, kind, v, f)]
    if split:
        (tv, tf), (bv, bf), ev['split'] = split_set(v, f, split)
        pieces = [(ref + '-top', 'top', tv, tf), (ref + '-bottom', 'bottom', bv, bf)]
    res = []
    for pid, pk, pv, pf in pieces:
        if len(pf) < 0.05 * ev['tris_source']:
            raise RuntimeError(f'{pid}: piece has only {len(pf)} faces; a garment piece would be lost')
        pv, pf = weld(pv, pf)
        pv, scale = normalise(pv)
        pv, pf, dec = decimate(pv, pf)
        glb = os.path.join(OUT, pid + '.glb'); K.save_glb(pv, pf, glb)
        y = pv[:, 1]; top = y.max()
        # The derived 2D body path is the full front silhouette, so 2D pixels map 1:1 to the model when torso = half its width.
        torso = float(np.ptp(pv[:, 0])) / 2
        t2 = template_2d(pv, pf, pk)
        for face in ('front', 'back'):
            K.write_png(os.path.join(OUT, 'shade', f'{pid}-{face}.png'), t2.pop(face + '_shade'))
        lo, hi = pv.min(0), pv.max(0)
        res.append({'id': pid, 'ref': ref, 'piece': pk, 'glb': f'/models/vfrb-derived/{pid}.glb', 'glb_sha256': sha(glb), 'glb_bytes': os.path.getsize(glb),
                    'tris': int(len(pf)), 'scale_from_source': round(scale, 5), 'bounds': [lo.round(3).tolist(), hi.round(3).tolist()],
                    'torso': round(float(torso), 3), 'opening_cover': neck_cover(pv, pf), 'decimation': dec,
                    'shade': {'front': f'/models/vfrb-derived/shade/{pid}-front.png', 'back': f'/models/vfrb-derived/shade/{pid}-back.png'}, **t2})
        log(f"  {pid}: {len(pf)} tris, torso {torso:.3f}, 2D {t2['w']}x{t2['h']} ({t2['front_points']} pts), back {'own' if t2['back'] else 'front'}, dec {dec.get('decimated')} {dec.get('front_iou', '')}")
    return ev, res


def generated_js(manifest):
    rows = []
    for e in manifest['pieces']:
        rows.append(f"  '{e['id']}': {{ ref: '{e['ref']}', piece: '{e['piece']}', glb: '{e['glb']}', torso: {e['torso']}, tris: {e['tris']}, w: {e['w']}, h: {e['h']},\n"
                    f"    shade: {json.dumps(e['shade'])},\n    body: '{e['front']}',\n    back: {json.dumps(e['back'])} }},")
    return ('// GENERATED by tools/glb-extract/derive_template.py from public/models/reference (read-only). Do not edit by hand: rerun the tool.\n'
            '// Per derived piece: its garment-only GLB, torso half-width (model units), shade maps, and the closed 2D body path traced from the\n'
            "// cleaned model's orthographic front silhouette (back: its own outline only where it differs from the front, else null).\n"
            'export const DERIVED_GEOMETRY = {\n' + '\n'.join(rows) + '\n};\n')


def reshade():
    """Rebuild shade maps (and the identical outlines) from the derived GLBs already written; GLBs are not touched."""
    manifest = json.load(open(MANIFEST))
    for p in manifest['pieces']:
        v, f, _ = K.load(os.path.join(ROOT, 'public', p['glb'].lstrip('/')))
        t2 = template_2d(v, f, p['piece'])
        for face in ('front', 'back'):
            K.write_png(os.path.join(OUT, 'shade', f"{p['id']}-{face}.png"), t2.pop(face + '_shade'))
        p.update({k: t2[k] for k in ('w', 'h', 'front', 'back', 'front_points', 'back_points', 'back_iou_vs_front')})
        print('  reshaded', p['id'], flush=True)
    json.dump(manifest, open(MANIFEST, 'w'), indent=1)
    open(GENERATED, 'w', encoding='utf-8', newline='
').write(generated_js(manifest))


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if which == 'reshade':
        return reshade()
    os.makedirs(os.path.join(OUT, 'shade'), exist_ok=True)
    splits = ref_split()
    refs = sorted(os.path.basename(p)[:-4] for p in os.listdir(SRC) if p.endswith('.glb'))
    before = {r: sha(os.path.join(SRC, r + '.glb')) for r in refs}
    batch = [r for r in refs if (which in ('singles', 'all') and r in SINGLES) or (which in ('sets', 'all') and r in splits)]
    if len(sys.argv) > 2:  # optional: only these references
        batch = [r for r in batch if r in sys.argv[2:]]
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {'tool': 'tools/glb-extract/derive_template.py', 'decimator': 'fast-simplification==0.2.0', 'references': {}, 'pieces': []}
    log = lambda s: print(s, flush=True)
    for r in batch:
        log(f'{r}')
        ev, pieces = process(r, SINGLES.get(r), splits.get(r), log)
        manifest['references'][r] = ev
        manifest['pieces'] = [p for p in manifest['pieces'] if p['ref'] != r] + pieces
    after = {r: sha(os.path.join(SRC, r + '.glb')) for r in refs}
    if before != after:
        raise SystemExit('ABORT: a reference GLB changed on disk')
    manifest['pieces'].sort(key=lambda p: p['id'])
    manifest['originals_sha256'] = after
    json.dump(manifest, open(MANIFEST, 'w'), indent=1)
    open(GENERATED, 'w', encoding='utf-8', newline='\n').write(generated_js(manifest))
    log(f'originals unchanged ({len(after)} hashed); {len(manifest["pieces"])} pieces in the manifest')


if __name__ == '__main__':
    main()
