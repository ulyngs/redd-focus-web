#!/usr/bin/env bash
# Build browser extension zip for Chrome / Firefox / Edge (manual store upload).
#
# Usage:
#   ./scripts/build-extension-zip.sh
#   ./scripts/build-extension-zip.sh 6.7.0
#
# Output: for-distribution/redd-focus-v<version>.zip

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
ZIP_NAME="redd-focus-v${VERSION}.zip"
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
