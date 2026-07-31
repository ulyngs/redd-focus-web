#!/usr/bin/env bash
# Build the shared browser extension zip (Chrome + Firefox; also used as the
# base for sideload). For Edge Add-ons store upload, use
# scripts/build-edge-extension-zip.sh — Partner Center rejects the dual
# background.service_worker + background.scripts keys in this package.
#
# Usage:
#   ./scripts/build-extension-zip.sh
#   ./scripts/build-extension-zip.sh 6.7.0
#
# Output: for-distribution/digital-habits-focus-v<version>.zip

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES="$ROOT/Shared (Extension)/Resources"
OUT_DIR="$ROOT/for-distribution"

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).version)" "$RESOURCES/manifest.json")"
fi
VERSION="${VERSION#v}"

mkdir -p "$OUT_DIR"
ZIP_NAME="digital-habits-focus-v${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

rm -f "$ZIP_PATH"
(
  cd "$RESOURCES"
  zip -r "$ZIP_PATH" . \
    -x "*.DS_Store" \
    -x "**/.DS_Store" \
    -x "manifest-comments.md"
)

echo "✅ Extension zip: $ZIP_PATH"
ls -la "$ZIP_PATH"
