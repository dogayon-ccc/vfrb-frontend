"""Pure-Python GLB reader/writer (uncompressed only; no bpy, numpy only)."""
import json, struct, hashlib
import numpy as np

_CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
_NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _split(path):
    with open(path, "rb") as f:
        b = f.read()
    if b[:4] != b"glTF":
        raise ValueError(f"{path}: not a GLB")
    off, j, bin_ = 12, None, b""
    while off < len(b):
        ln, kind = struct.unpack("<II", b[off:off + 8])
        body = b[off + 8:off + 8 + ln]
        if kind == 0x4E4F534A:
            j = json.loads(body)
        elif kind == 0x004E4942:
            bin_ = body
        off += 8 + ln
    return j, bin_


def _acc(j, bin_, i):
    a = j["accessors"][i]
    bv = j["bufferViews"][a["bufferView"]]
    nc, dt = _NC[a["type"]], np.dtype(_CT[a["componentType"]])
    stride = bv.get("byteStride") or nc * dt.itemsize
    base = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    raw = np.frombuffer(bin_, dtype=np.uint8, count=stride * (a["count"] - 1) + nc * dt.itemsize, offset=base)
    out = np.lib.stride_tricks.as_strided(raw, (a["count"], nc * dt.itemsize), (stride, 1)).copy()
    out = out.view(dt).reshape(a["count"], nc)
    return out[:, 0] if nc == 1 else out


def _world(j, idx, cache):
    if idx in cache:
        return cache[idx]
    n = j["nodes"][idx]
    if "matrix" in n:
        m = np.array(n["matrix"], float).reshape(4, 4).T
    else:
        t, r, s = n.get("translation", [0, 0, 0]), n.get("rotation", [0, 0, 0, 1]), n.get("scale", [1, 1, 1])
        x, y, z, w = r
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        m = np.eye(4)
        m[:3, :3] = R * np.array(s)
        m[:3, 3] = t
    parent = next((i for i, p in enumerate(j["nodes"]) if idx in p.get("children", [])), None)
    cache[idx] = (_world(j, parent, cache) @ m) if parent is not None else m
    return cache[idx]


def read_glb(path):
    """Return {node_name: dict(V, T, uv, material, extras)}; world transforms applied."""
    j, bin_ = _split(path)
    if "KHR_draco_mesh_compression" in (j.get("extensionsUsed") or []):
        raise ValueError(f"{path}: Draco-compressed; export an uncompressed authoring GLB first")
    parts, cache = {}, {}
    for ni, n in enumerate(j["nodes"]):
        if "mesh" not in n:
            continue
        M = _world(j, ni, cache)
        for pi, prim in enumerate(j["meshes"][n["mesh"]]["primitives"]):
            at = prim["attributes"]
            V = _acc(j, bin_, at["POSITION"]).astype(float)
            V = V @ M[:3, :3].T + M[:3, 3]
            T = _acc(j, bin_, prim["indices"]).astype(np.int64).reshape(-1, 3)
            uv = _acc(j, bin_, at["TEXCOORD_0"]).astype(float) if "TEXCOORD_0" in at else None
            mat = j["materials"][prim["material"]].get("name") if "material" in prim else None
            name = n.get("name", f"node{ni}") + (f"#{pi}" if pi else "")
            parts[name] = dict(V=V, T=T, uv=uv, material=mat, extras=n.get("extras", {}))
    return parts


def write_glb(path, parts, extras=None):
    """Minimal writer for tests: parts = {name: (V, T, uv_or_None)}; one node/mesh/material each."""
    buf, views, accs, nodes, meshes, mats = bytearray(), [], [], [], [], []

    def add(arr, target, typ, cnt_comp, bounds=False):
        arr = np.ascontiguousarray(arr)
        while len(buf) % 4:
            buf.append(0)
        views.append(dict(buffer=0, byteOffset=len(buf), byteLength=arr.nbytes, target=target))
        buf.extend(arr.tobytes())
        a = dict(bufferView=len(views) - 1, componentType=5126 if arr.dtype == np.float32 else 5125,
                 count=int(arr.shape[0]) if arr.ndim > 1 else int(arr.size), type=typ)
        if bounds:
            a["min"], a["max"] = arr.min(0).tolist(), arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1

    for i, (name, (V, T, uv)) in enumerate(parts.items()):
        at = {"POSITION": add(np.asarray(V, np.float32), 34962, "VEC3", 3, True)}
        if uv is not None:
            at["TEXCOORD_0"] = add(np.asarray(uv, np.float32), 34962, "VEC2", 2)
        ix = add(np.asarray(T, np.uint32).ravel(), 34963, "SCALAR", 1)
        mats.append(dict(name=f"vfrb_{name}", pbrMetallicRoughness=dict(baseColorFactor=[.8, .8, .8, 1])))
        meshes.append(dict(name=name, primitives=[dict(attributes=at, indices=ix, material=i)]))
        nodes.append(dict(name=name, mesh=i, extras=(extras or {}).get(name, {})))
    j = dict(asset=dict(version="2.0", generator="vfrb-test-writer"), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
             nodes=nodes, meshes=meshes, materials=mats, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(buf))])
    jb = json.dumps(j).encode()
    jb += b" " * (-len(jb) % 4)
    bb = bytes(buf) + b"\0" * (-len(buf) % 4)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bb)))
        f.write(struct.pack("<II", len(jb), 0x4E4F534A) + jb + struct.pack("<II", len(bb), 0x004E4942) + bb)
