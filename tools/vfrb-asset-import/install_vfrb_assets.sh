#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-$HOME/Downloads/VFRB-public-assets-ready-to-copy.zip}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$REPO_ROOT" ]]; then
  echo "ERROR: Run this from inside the vfrb-frontend Git repository."
  exit 1
fi

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ERROR: Asset package not found: $ZIP_PATH"
  echo "Usage: bash install_vfrb_assets.sh /path/to/VFRB-public-assets-ready-to-copy.zip"
  exit 1
fi

cd "$REPO_ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/tmp/vfrb-public-backup-$STAMP"
TMP="$(mktemp -d /tmp/vfrb-asset-import.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

echo "VFRB FRONTEND: $REPO_ROOT"
echo "Asset ZIP:      $ZIP_PATH"
echo

echo "[1/5] Backing up current public/ to $BACKUP"
cp -a public "$BACKUP"

echo "[2/5] Extracting asset package"
unzip -q "$ZIP_PATH" -d "$TMP"

if [[ ! -d "$TMP/public" ]]; then
  echo "ERROR: Package does not contain a public/ directory."
  exit 1
fi

echo "[3/5] Copying assets into the repository public/"
cp -a "$TMP/public/." "$REPO_ROOT/public/"

echo "[4/5] Checking imported asset counts"
PNG_COUNT="$(find public/garments2d/source -type f -iname '*.png' | wc -l | tr -d ' ')"
WEBP_COUNT="$(find public/gallery -maxdepth 1 -type f -iname '*.webp' | wc -l | tr -d ' ')"
INCOMING_GLB_COUNT="$(find public/models/garments/incoming-meshy -type f -iname '*.glb' | wc -l | tr -d ' ')"

printf 'PNG masters:        %s\n' "$PNG_COUNT"
printf 'Gallery WebP files: %s\n' "$WEBP_COUNT"
printf 'Incoming Meshy GLBs:%s\n' "$INCOMING_GLB_COUNT"

echo "[5/5] Checking the existing active scrub GLBs (must already exist)"
for f in \
  public/models/garments/scrub-top-women-short.glb \
  public/models/garments/scrub-top-men-short.glb; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Missing existing active GLB: $f"
    echo "Restore the backup or stop here; do not create a fallback model."
    exit 1
  fi
  printf 'OK: %s (%s bytes)\n' "$f" "$(wc -c < "$f" | tr -d ' ')"
done

echo
echo "IMPORT COMPLETE"
echo "Backup: $BACKUP"
echo
cat <<'MSG'
IMPORTANT:
- This installs assets only. It does NOT edit the React manifest/resolver.
- The 39 Meshy GLBs remain under public/models/garments/incoming-meshy/.
- Do not activate all GLBs blindly.
- The next coding step is to wire exact templateId -> 2D asset -> GLB mappings in the existing code.
- Keep the existing scrub GLB files; they are already part of the current frontend asset path.
MSG
