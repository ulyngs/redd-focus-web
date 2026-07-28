#!/usr/bin/env bash
# Build an Edge Add-ons zip from the shared extension Resources tree.
#
# Edge Partner Center rejects MV3 packages that include both
# background.service_worker and background.scripts. The committed source
# keeps both keys (Chrome + Firefox need them); this script transforms a
# copy only — never rewrite Shared (Extension)/Resources/manifest.json.
#
# Also strips browser_specific_settings.gecko (Firefox-only).
#
# Usage:
#   ./scripts/build-edge-extension-zip.sh
#   ./scripts/build-edge-extension-zip.sh 6.8.0
#
# Output: for-distribution/redd-focus-edge-v<version>.zip

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
ZIP_NAME="redd-focus-edge-v${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R "$RESOURCES"/. "$TMP/"

node <<EOF
const fs = require('fs');
const path = require('path');
const manifestPath = path.join(${JSON.stringify("$TMP")}, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!manifest.background || !manifest.background.service_worker) {
  console.error('Edge package requires background.service_worker in source manifest.');
  process.exit(1);
}

manifest.background = { service_worker: manifest.background.service_worker };
delete manifest.browser_specific_settings;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

if (manifest.background.scripts) {
  console.error('Edge transform failed: background.scripts still present.');
  process.exit(1);
}
if (manifest.browser_specific_settings) {
  console.error('Edge transform failed: browser_specific_settings still present.');
  process.exit(1);
}
console.log('Edge manifest transform OK (service_worker only; gecko settings removed).');
EOF

rm -f "$ZIP_PATH"
(
  cd "$TMP"
  zip -r "$ZIP_PATH" . \
    -x "*.DS_Store" \
    -x "**/.DS_Store" \
    -x "manifest-comments.md"
)

node <<EOF
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const zipPath = ${JSON.stringify("$ZIP_PATH")};
const listing = execFileSync('unzip', ['-p', zipPath, 'manifest.json'], { encoding: 'utf8' });
const manifest = JSON.parse(listing);
if (manifest.background && Object.prototype.hasOwnProperty.call(manifest.background, 'scripts')) {
  console.error('Validation failed: Edge zip manifest still has background.scripts');
  process.exit(1);
}
if (manifest.browser_specific_settings) {
  console.error('Validation failed: Edge zip manifest still has browser_specific_settings');
  process.exit(1);
}
if (!manifest.background || manifest.background.service_worker !== 'background.js') {
  console.error('Validation failed: Edge zip missing background.service_worker');
  process.exit(1);
}
console.log('Validated Edge zip manifest.');
EOF

echo "✅ Edge extension zip: $ZIP_PATH"
ls -la "$ZIP_PATH"
