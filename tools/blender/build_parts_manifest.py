"""Blender-verified parts manifest for the VFRB GLB archive.

Usage: python -I build_parts_manifest.py ARCHIVE_DIR OUT.json GLTF_TRANSFORM_BIN REL_GLB [REL_GLB ...]

ARCHIVE_DIR is never written. Draco files are decoded to a temp copy with gltf-transform (Blender's Draco
bridge is missing from the pip `bpy` wheel); both SHA-256 values are recorded. No geometry is created or edited.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from inspect_parts import describe  # noqa: E402

# object name -> VFRB semantic id; only names that exist in the inspected meshes
SEMANTIC = {
    'body': 'body', 'neck_band': 'collar', 'sleeve_l': 'sleeveL', 'sleeve_r': 'sleeveR',
    'chest_pocket': 'pocket', 'lower_pockets': 'pocket', 'side_pockets': 'pocket', 'back_pockets': 'pocket',
    'waistband': 'waistband', 'leg_l': 'leftLeg', 'leg_r': 'rightLeg', 'fly': 'fly', 'cuffs': 'cuff',
    'drawstring': 'drawstring', 'skirt_body': 'body',
}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def entry(archive, rel, gt, tmp):
    src = archive / rel
    dec = Path(tmp) / rel
    dec.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([gt, 'copy', str(src), str(dec)], check=True, capture_output=True)
    d = describe(dec)
    parts = []
    for p in d['parts']:
        uv = p['uv']
        parts.append({
            'object': p['object'], 'semantic': SEMANTIC.get(p['object']), 'triangles': p['triangles'],
            'materials': p['materials'], 'uvLayer': uv and uv['layer'], 'uvIslands': uv and uv['islands'],
            'uvInUnitSquare': uv and uv['inUnitSquare'], 'centerX': p['centerX'],
            # texels per metre at equal texture size scale with sqrt(uvArea / area3d); lets the texture pass equalise density per part
            'uvDensity': uv and round((uv['uvAreaTotal'] / uv['area3d']) ** 0.5, 4),
        })
    return {
        'source': rel, 'sourceSha256': sha(src), 'sourceBytes': src.stat().st_size,
        'decodedSha256': sha(dec), 'blender': d['blender'], 'triangles': d['triangles'], 'parts': parts,
        'unmappedObjects': [p['object'] for p in parts if p['semantic'] is None],
    }


if __name__ == '__main__':
    archive, out, gt, *rels = sys.argv[1:]
    with tempfile.TemporaryDirectory() as tmp:
        data = [entry(Path(archive), r, gt, tmp) for r in rels]
    Path(out).write_text(json.dumps(data, indent=2) + '\n')
    print(f'wrote {out}: {len(data)} assets')
