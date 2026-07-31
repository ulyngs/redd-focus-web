#!/usr/bin/env bash
# Archive + export Digital Habits: Focus for App Store Connect (iOS IPA or Mac App Store pkg).
#
# Requires App Store Connect API key env vars (Admin role recommended for
# automatic provisioning updates):
#   APP_STORE_CONNECT_API_KEY_ID
#   APP_STORE_CONNECT_API_ISSUER_ID
#   APP_STORE_CONNECT_API_KEY_P8   — base64 of AuthKey_*.p8
#   (or APPLE_API_KEY_PATH pointing at a decoded .p8 file)
#
# Usage:
#   ./scripts/build-appstore.sh ios
#   ./scripts/build-appstore.sh macos
#   IOS_BUILD_NUMBER=86 ./scripts/build-appstore.sh ios
#   MAS_BUILD_NUMBER=86 ./scripts/build-appstore.sh macos
#
# Outputs:
#   for-distribution/digital-habits-focus_<version>.ipa
#   for-distribution/digital-habits-focus_<version>.pkg

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "macos" ]]; then
  echo "Usage: $0 ios|macos" >&2
  exit 1
fi

MANIFEST="$ROOT/Shared (Extension)/Resources/manifest.json"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).version)" "$MANIFEST")"
TEAM_ID="${APPLE_DEVELOPMENT_TEAM:-JD647S9RT6}"
PROJECT="Digital Habits Focus.xcodeproj"
BUILD_DIR="$ROOT/build/appstore"
OUT_DIR="$ROOT/for-distribution"
EXPORT_OPTIONS="$ROOT/ci/ExportOptions-AppStore.plist"

mkdir -p "$BUILD_DIR" "$OUT_DIR"

# --- Auth key for -allowProvisioningUpdates ---
KEY_PATH="${APPLE_API_KEY_PATH:-}"
CLEANUP_KEY=0
if [[ -z "$KEY_PATH" ]]; then
  : "${APP_STORE_CONNECT_API_KEY_P8:?Set APP_STORE_CONNECT_API_KEY_P8 (base64) or APPLE_API_KEY_PATH}"
  # macOS mktemp only substitutes trailing Xs, so make a dir and name the key.
  KEY_DIR="$(mktemp -d /tmp/asc-key.XXXXXX)"
  KEY_PATH="$KEY_DIR/AuthKey.p8"
  CLEANUP_KEY=1
  echo "$APP_STORE_CONNECT_API_KEY_P8" | base64 --decode > "$KEY_PATH"
fi
: "${APP_STORE_CONNECT_API_KEY_ID:?Set APP_STORE_CONNECT_API_KEY_ID}"
: "${APP_STORE_CONNECT_API_ISSUER_ID:?Set APP_STORE_CONNECT_API_ISSUER_ID}"

cleanup() {
  if [[ "$CLEANUP_KEY" -eq 1 && -n "${KEY_DIR:-}" ]]; then
    rm -rf "$KEY_DIR"
  fi
}
trap cleanup EXIT

AUTH_ARGS=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$KEY_PATH"
  -authenticationKeyID "$APP_STORE_CONNECT_API_KEY_ID"
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_API_ISSUER_ID"
)

# Optional build-number override (re-upload same marketing version)
BUILD_NUMBER=""
if [[ "$PLATFORM" == "ios" ]]; then
  BUILD_NUMBER="${IOS_BUILD_NUMBER:-}"
else
  BUILD_NUMBER="${MAS_BUILD_NUMBER:-}"
fi

VERSION_ARGS=()
if [[ -n "$BUILD_NUMBER" ]]; then
  VERSION_ARGS+=(CURRENT_PROJECT_VERSION="$BUILD_NUMBER")
  echo "Using CURRENT_PROJECT_VERSION override: $BUILD_NUMBER"
fi

if [[ "$PLATFORM" == "ios" ]]; then
  SCHEME="MindShield (iOS)"
  DESTINATION="generic/platform=iOS"
  ARCHIVE="$BUILD_DIR/DigitalHabitsFocus-iOS.xcarchive"
  EXPORT_DIR="$BUILD_DIR/export-ios"
  ARTIFACT_GLOB="*.ipa"
  STAGED="digital-habits-focus_${VERSION}.ipa"
else
  SCHEME="MindShield (macOS)"
  DESTINATION="generic/platform=macOS"
  ARCHIVE="$BUILD_DIR/DigitalHabitsFocus-macOS.xcarchive"
  EXPORT_DIR="$BUILD_DIR/export-macos"
  ARTIFACT_GLOB="*.pkg"
  STAGED="digital-habits-focus_${VERSION}.pkg"
fi

echo "=== Archiving ${SCHEME} (v${VERSION}) ==="
rm -rf "$ARCHIVE" "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# ${arr[@]+...} guards the empty-array case: macOS ships bash 3.2, where
# "${VERSION_ARGS[@]}" under `set -u` aborts with "unbound variable" — and
# exits 0, silently skipping the build (bit us in CI).
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "$DESTINATION" \
  -archivePath "$ARCHIVE" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  ${VERSION_ARGS[@]+"${VERSION_ARGS[@]}"} \
  "${AUTH_ARGS[@]}"

echo "=== Exporting App Store package ==="
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  "${AUTH_ARGS[@]}"

ARTIFACT="$(find "$EXPORT_DIR" -type f -name "$ARTIFACT_GLOB" | head -1)"
if [[ -z "$ARTIFACT" ]]; then
  echo "No ${ARTIFACT_GLOB} produced in $EXPORT_DIR" >&2
  ls -laR "$EXPORT_DIR" >&2 || true
  exit 1
fi

cp "$ARTIFACT" "$OUT_DIR/$STAGED"
echo "✅ App Store artifact: $OUT_DIR/$STAGED"
ls -la "$OUT_DIR/$STAGED"
