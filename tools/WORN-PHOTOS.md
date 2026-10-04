# Worn-photo cutouts
Pipeline for the 15 worn-model photos (October 2026): `worn-photo-segment.py` runs u2net_cloth_seg (rembg release `u2net_cloth_seg.onnx`,
github.com/danielgatis/rembg/releases/download/v0.0.0/) to drop arms, neck, hands, legs and shoes; `worn-photo-cutouts.py` cleans the mask,
bridges thin bands, crops, and for the two editable bases strips neck skin and the "VFRB MANILA" watermark.
Both scripts were run from a scratch directory (paths inside are scratch paths) and are kept for reproducibility.
OPEN: confirm the model's licence/provenance before release. Output quality was checked by eye only.
