"""Config-driven UV authoring for all garment parts (pure numpy; used by the Blender build stage)."""
import numpy as np
from . import mathcore as mc


def author_uvs(parts, regions, axes, tex_px=2048, pad_px=8):
    """parts={name:(V,T)} -> ({name: uv(n,3,2)}, metrics). One shared atlas, one global texel density."""
    islands = []
    for name, (V, T) in parts.items():
        islands += mc.build_islands(name, V, T, regions[name], axes)
    pk = mc.pack(islands, tex_px, pad_px)
    out, per = {}, {}
    for name, (V, T) in parts.items():
        uv = mc.assemble_uv([i for i in islands if i.part == name], len(T))
        st = mc.stretch(V, T, uv, pk["atlas_size_mu"])
        n, a3 = mc.tri_geom(V, T)
        graze = float((np.abs(n @ np.asarray(axes["front"], float)) < 0.2).mean())
        out[name] = uv
        per[name] = dict(islands=[i.name for i in islands if i.part == name], tris=int(len(T)),
                         stretch_p05=float(np.percentile(st, 5)), stretch_p95=float(np.percentile(st, 95)),
                         grazing_front_pct=round(100 * graze, 2))
    return out, dict(pk, parts=per)
