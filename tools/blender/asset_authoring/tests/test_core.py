"""Blender-independent tests: python -m unittest discover -s tests (from asset_authoring/)."""
import json, os, sys, tempfile, unittest
from collections import Counter
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from vfrb_authoring import mathcore as mc, uv_build, derive_2d, validate
from vfrb_authoring.glb_io import write_glb

with open(os.path.join(os.path.dirname(__file__), "..", "config", "scrub_top_pilot_01.json")) as _f:
    CFG = json.load(_f)


def tube(r, h, cx, n=48, m=24, axis="z"):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    V = np.array([[r * np.cos(t), r * np.sin(t), z] for z in np.linspace(0, h, m) for t in th])
    T = []
    for j in range(m - 1):
        for i in range(n):
            a, b, c, d = j * n + i, j * n + (i + 1) % n, (j + 1) * n + i, (j + 1) * n + (i + 1) % n
            T += [[a, b, c], [b, d, c]]
    V = V + np.array([cx, 0, 0])
    if axis == "x":
        V = V[:, [2, 1, 0]] * [1, 1, 1]
    return V, np.array(T)


def ellipsoid_body(n=40, m=30):
    V, T = tube(1, 1, 0, n, m)
    V = V * [0.5, 0.3, 1.6]
    return V - [0, 0, 0.8], T


def outward(V, T):
    """Test-fixture helper: wind a single-sheet tube so face normals point away from its own axis/centroid."""
    n, _ = mc.tri_geom(V, T)
    c = V[T].mean(1)
    return T if float((n * (c - V.mean(0))).sum()) >= 0 else T[:, ::-1]


class Core(unittest.TestCase):
    def setUp(self):
        self.ax = mc.GLTF
        body = ellipsoid_body()
        V = body[0][:, [0, 2, 1]]
        self.parts = {"body": (V, body[1])}
        sl = tube(0.12, 0.5, 0, 24, 14)
        sV = sl[0][:, [2, 1, 0]] * [1, 1, 1] + [0.0, 0.5, 0.0]
        sV = sV[:, [0, 1, 2]]
        self.parts["sleeve_l"] = (sV + [0.5, 0, 0], sl[1])
        self.parts["sleeve_r"] = (sV * [-1, 1, 1] - [0.5, 0, 0], sl[1])
        self.parts = {k: (v, outward(v, t)) for k, (v, t) in self.parts.items()}

    def regions(self):
        r = {k: dict(CFG["regions"][k]) for k in self.parts}
        return r

    def test_density_is_uniform_and_islands_disjoint(self):
        uvs, met = uv_build.author_uvs(self.parts, self.regions(), self.ax)
        self.assertLessEqual(max(u.max() for u in uvs.values()), 1 + 1e-9)
        self.assertGreaterEqual(min(u.min() for u in uvs.values()), -1e-9)
        for k, (V, T) in self.parts.items():
            st = mc.stretch(V, T, uvs[k], met["atlas_size_mu"])
            if k != "body":
                self.assertAlmostEqual(float(np.median(st)), 1.0, delta=0.15)
        cov = {k: mc.coverage_map(uvs[k], 512) > 0 for k in uvs}
        ks = list(cov)
        for i in range(len(ks)):
            for j in range(i + 1, len(ks)):
                self.assertFalse((cov[ks[i]] & cov[ks[j]]).any(), (ks[i], ks[j]))

    def test_front_back_partition(self):
        V, T = self.parts["body"]
        isl = mc.planar_front_back("body", V, T, self.ax)
        self.assertEqual(sum(len(i.tris) for i in isl), len(T))
        self.assertEqual(sorted(i.name for i in isl), ["back", "front"])

    def test_end_to_end_glb_validate_derive(self):
        uvs, met = uv_build.author_uvs(self.parts, self.regions(), self.ax)
        d = tempfile.mkdtemp()
        g = os.path.join(d, "t.glb")
        ex = {k: {"vfrb_source_sha256": "abc"} for k in self.parts}
        flat = {}
        for k, (V, T) in self.parts.items():
            Vv = V[T].reshape(-1, 3)
            u = uvs[k].reshape(-1, 2).copy()
            u[:, 1] = 1 - u[:, 1]
            flat[k] = (Vv, np.arange(len(Vv)).reshape(-1, 3), u)
        write_glb(g, flat, ex)
        man = derive_2d.derive(g, d, "test", "abc")
        cfg = dict(CFG, regions={k: CFG["regions"][k] for k in self.parts})
        cfg["limits"] = dict(CFG["limits"], max_density_spread=1.6)
        rep = validate.validate(g, cfg, "abc", sum(len(T) for _, T in self.parts.values()), d)
        bad = [c for c in rep["checks"] if not c["ok"]]
        self.assertEqual(bad, [])
        self.assertTrue(all(p["tri_count"] > 0 for p in man["panels"]))

    def test_thick_closed_shell_inner_wall_not_mixed_into_wrong_panel(self):
        """Regression: normal-sign partition put the inner back wall (faces +front) into the FRONT panel."""
        V, T = self.parts["body"]
        Vd = np.vstack([V, V * 0.96])
        Td = np.vstack([T, T[:, ::-1] + len(V)])          # inner wall, flipped winding
        isl = {i.name: i for i in mc.planar_front_back("body", Vd, Td, self.ax)}
        inner = np.arange(len(Td)) >= len(T)
        zc = Vd[Td][:, :, 2].mean(1)
        self.assertTrue((zc[isl["front"].tris] >= Vd[:, 2].min() + 0.5 * np.ptp(Vd[:, 2])).all())
        self.assertTrue(inner[isl["back"].tris].any() and inner[isl["front"].tris].any())
        # old rule check: inner back wall faces point +front, so a normal-sign rule would have put them in front
        n, _ = mc.tri_geom(Vd, Td)
        back_inner = inner & (zc < Vd[:, 2].min() + 0.5 * np.ptp(Vd[:, 2]))
        self.assertTrue((n[back_inner][:, 2] > 0).mean() > 0.5)
        self.assertFalse(np.isin(np.nonzero(back_inner)[0], isl["front"].tris).any())
        uvs, met = uv_build.author_uvs({"body": (Vd, Td)}, {"body": self.regions()["body"]}, self.ax)
        cov = mc.coverage_map(uvs["body"], 512)
        self.assertEqual(int((cov > 2).sum()), 0)          # exactly two layers (outer+inner wall), never three

    def test_bake_covers_uv_islands(self):
        uvs, _ = uv_build.author_uvs(self.parts, self.regions(), self.ax)
        V, T = self.parts["body"]
        xy = V[T][:, :, [0, 2]]
        img, cov = mc.bake_from_panel(xy, uvs["body"], lambda p: np.stack([(p[:, 0] % .1 < .05) * 1.0, 0 * p[:, 0], 0 * p[:, 0]], 1), 512)
        self.assertLess(float((cov > 1).sum() / (cov > 0).sum()), 0.01)


# ---------------------------------------------------------------- closed double-wall fixture + derive_2d + validation
MAX_PANEL_CONTAMINATION = 0.01   # enforced on this IDEAL synthetic shell only; says nothing about the real scrub top


def thick_closed_tube(rx=0.5, rz=0.3, t=0.02, h=1.2, n=48, m=24):
    """glTF coords (Y up, front +Z). Outer wall + inner wall joined by rims at both ends = ONE closed, watertight surface.
    Returns V, T, inner_wall_mask. Outer normals point away from the axis, inner-wall normals toward it."""
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ys = np.linspace(-h / 2, h / 2, m)
    ring = lambda a, b, y: [[a * np.cos(q), y, b * np.sin(q)] for q in th]
    V = np.array([p for y in ys for p in ring(rx, rz, y)] + [p for y in ys for p in ring(rx - t, rz - t, y)])
    off = n * m
    ax_c = lambda tri: V[tri].mean(1) * [1, 0, 1]
    T_out, T_in, T_rim = [], [], []
    for j in range(m - 1):
        for i in range(n):
            a, b, c, d = j * n + i, j * n + (i + 1) % n, (j + 1) * n + i, (j + 1) * n + (i + 1) % n
            T_out += [[a, b, c], [b, d, c]]
            T_in += [[a + off, b + off, c + off], [b + off, d + off, c + off]]
    for j, sgn in ((0, -1), (m - 1, 1)):
        for i in range(n):
            a, b = j * n + i, j * n + (i + 1) % n
            T_rim += [[a, b, b + off], [a, b + off, a + off]]
    T_out, T_in, T_rim = map(np.array, (T_out, T_in, T_rim))
    nrm = lambda tri: mc.tri_geom(V, tri)[0]
    if (nrm(T_out) * ax_c(T_out)).sum() < 0:
        T_out = T_out[:, ::-1]
    if (nrm(T_in) * ax_c(T_in)).sum() > 0:
        T_in = T_in[:, ::-1]
    rim_y = V[T_rim].mean(1)[:, 1]
    flip = (nrm(T_rim)[:, 1] * np.sign(rim_y)) < 0
    T_rim[flip] = T_rim[flip][:, ::-1]
    T = np.vstack([T_out, T_in, T_rim])
    inner = np.zeros(len(T), bool)
    inner[len(T_out):len(T_out) + len(T_in)] = True
    return V, T, inner


def is_closed_oriented(V, T):
    e = Counter((int(a), int(b)) for tri in T for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])))
    closed = all(c == 1 and e.get((b, a), 0) == 1 for (a, b), c in e.items())
    vol = float(np.einsum("ij,ij->", V[T[:, 0]], np.cross(V[T[:, 1]], V[T[:, 2]])) / 6)
    return closed, vol


class ThickShell(unittest.TestCase):
    def setUp(self):
        self.V, self.T, self.inner = thick_closed_tube()
        self.ax = mc.GLTF
        self.tmp = tempfile.mkdtemp()
        reg = {"body": CFG["regions"]["body"]}
        uvs, _ = uv_build.author_uvs({"body": (self.V, self.T)}, reg, self.ax)
        self.glb = os.path.join(self.tmp, "shell.glb")
        Vv = self.V[self.T].reshape(-1, 3)
        u = uvs["body"].reshape(-1, 2).copy()
        u[:, 1] = 1 - u[:, 1]
        write_glb(self.glb, {"body": (Vv, np.arange(len(Vv)).reshape(-1, 3), u)}, {"body": {"vfrb_source_sha256": "abc"}})
        self.cfg = dict(CFG, regions={"body": dict(CFG["regions"]["body"], views=["front", "back"])},
                        limits=dict(CFG["limits"], max_density_spread=1.6))
        self.man = derive_2d.derive(self.glb, self.tmp, "t", "abc", region_views={"body": ["front", "back"]})

    def test_fixture_is_genuinely_closed_and_outward(self):
        closed, vol = is_closed_oriented(self.V, self.T)
        self.assertTrue(closed)
        self.assertGreater(vol, 0)
        self.assertTrue(self.inner.any() and (~self.inner).any())

    def test_derive_outlines_exclude_inner_wall(self):
        masks = mc.panel_masks(self.V, self.T, self.ax)
        for view in ("front", "back"):
            self.assertGreater(masks[view].sum(), 0)
            self.assertLessEqual(mc.shell_contamination(masks[view], self.inner), MAX_PANEL_CONTAMINATION, view)
            pnl = next(p for p in self.man["panels"] if p["view"] == view)
            self.assertEqual(pnl["tri_count"], int(masks[view].sum()))   # derive_2d uses exactly these triangles
        old_front = mc.tri_geom(self.V, self.T)[0][:, 2] >= 0           # the removed normal-sign rule
        self.assertGreater(mc.shell_contamination(old_front, self.inner), 0.3)

    def test_derive_outline_geometry_matches_silhouette(self):
        for view in ("front", "back"):
            pnl = next(p for p in self.man["panels"] if p["view"] == view)
            x0, y0, x1, y1 = pnl["bbox_mu"]
            self.assertAlmostEqual(x1 - x0, 1.0, delta=0.03)             # 2 * rx
            self.assertAlmostEqual(y1 - y0, 1.2, delta=0.03)             # h
            self.assertTrue(validate.outline_usable(pnl, 0.5)[0])

    def test_valid_manifest_passes_validation(self):
        rep = validate.validate(self.glb, self.cfg, "abc", len(self.T), self.tmp)
        self.assertEqual([c for c in rep["checks"] if not c["ok"]], [])

    # ---- corrected validation behaviour ----
    def _run(self, mutate, views=None):
        man = json.loads(json.dumps(self.man))
        mutate(man)
        d = tempfile.mkdtemp()
        with open(os.path.join(d, "mapping_manifest.json"), "w") as f:
            json.dump(man, f)
        cfg = self.cfg if views is None else dict(self.cfg, regions={"body": dict(self.cfg["regions"]["body"], views=views)})
        rep = validate.validate(self.glb, cfg, "abc", len(self.T), d)
        return {c["check"] for c in rep["checks"] if not c["ok"]}

    def test_missing_view_fails(self):
        bad = self._run(lambda m: m.__setitem__("panels", [p for p in m["panels"] if p["view"] != "back"]))
        self.assertIn("panels: no missing (part, view)", bad)

    def test_duplicate_view_fails(self):
        bad = self._run(lambda m: m["panels"].append(json.loads(json.dumps(m["panels"][0]))))
        self.assertIn("panels: no duplicate (part, view)", bad)

    def test_unexpected_view_fails(self):
        self.assertIn("panels: no unexpected (part, view)", self._run(lambda m: None, views=["front"]))

    def test_one_view_only_is_accepted_when_config_says_front_only(self):
        bad = self._run(lambda m: m.__setitem__("panels", [p for p in m["panels"] if p["view"] == "front"]), views=["front"])
        self.assertNotIn("panels: no missing (part, view)", bad)
        self.assertNotIn("panels: no unexpected (part, view)", bad)

    def test_empty_outline_in_one_panel_fails_even_if_other_panel_has_points(self):
        def mut(m):
            next(p for p in m["panels"] if p["view"] == "back")["outline"] = []
        self.assertIn("panel body.back: usable outline loop", self._run(mut))
        self.assertNotIn("panel body.front: usable outline loop", self._run(mut))

    def test_degenerate_or_nonfinite_outline_fails(self):
        def collinear(m):
            next(p for p in m["panels"] if p["view"] == "front")["outline"] = [[[0, 0], [1, 0], [2, 0]]]
        def two_points(m):
            next(p for p in m["panels"] if p["view"] == "front")["outline"] = [[[0, 0], [1, 1]]]
        def tiny(m):
            next(p for p in m["panels"] if p["view"] == "front")["outline"] = [[[0, 0], [0.001, 0], [0, 0.001]]]
        for mut in (collinear, two_points, tiny):
            self.assertIn("panel body.front: usable outline loop", self._run(mut), mut.__name__)

    def test_tri_count_mismatch_fails(self):
        def mut(m):
            m["panels"][0]["tri_count"] += 1
        self.assertIn(f"panel body.{self.man['panels'][0]['view']}: tri_count > 0 and matches mesh", self._run(mut))

    def test_invalid_view_name_in_config_raises(self):
        with self.assertRaises(ValueError):
            validate.expected_views({"regions": {"body": {"views": ["side"]}}}, "body")



class MeshIntegrity(unittest.TestCase):
    def setUp(self):
        self.V, self.T = ellipsoid_body(12, 8)
        self.T = np.asarray(self.T)

    def test_untouched_mesh_passes(self):
        self.assertEqual(validate.mesh_integrity(len(self.T), self.T, len(self.V)), [])

    def test_extra_faces_fail_with_signed_delta(self):
        T2 = np.vstack([self.T, [[0, 1, 2], [1, 2, 3], [2, 3, 4]]])
        p = validate.mesh_integrity(len(self.T), T2, len(self.V))
        self.assertEqual(len(p), 1)
        self.assertIn("+3", p[0])

    def test_missing_faces_fail(self):
        p = validate.mesh_integrity(len(self.T), self.T[:-2], len(self.V))
        self.assertTrue(any("-2" in x for x in p))

    def test_stray_loose_vertex_fails_even_when_face_count_matches(self):
        p = validate.mesh_integrity(len(self.T), self.T, len(self.V) + 1)
        self.assertEqual(len(p), 1)
        self.assertIn("loose", p[0])

    def test_extra_faces_and_loose_vertices_report_both(self):
        T2 = np.vstack([self.T, [[0, 1, 2]]])
        self.assertEqual(len(validate.mesh_integrity(len(self.T), T2, len(self.V) + 4)), 2)

    def test_rewired_mesh_with_matching_triangle_count_is_caught_by_vertex_count(self):
        # same triangles count, but 3 extra vertices that triangles use (a hole patched with a different triangle)
        T2 = self.T.copy()
        T2[0] = [0, 1, len(self.V) + 2]
        p = validate.mesh_integrity(len(self.T), T2, len(self.V) + 3, expected_verts=len(self.V))
        self.assertTrue(any("vertex count is" in x and "+3" in x for x in p))

    def test_expected_verts_matching_passes(self):
        self.assertEqual(validate.mesh_integrity(len(self.T), self.T, len(self.V), expected_verts=len(self.V)), [])

if __name__ == "__main__":
    unittest.main()
