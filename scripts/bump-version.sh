#!/usr/bin/env bash
# Bump ReDD Focus version across manifest.json and the Xcode project.
#
# Usage:
#   ./scripts/bump-version.sh 6.8.0
#   ./scripts/bump-version.sh 6.8.0 --build 86
#
# Primary source of truth after bump: Shared (Extension)/Resources/manifest.json
# Also stamps MARKETING_VERSION / CURRENT_PROJECT_VERSION in
# ReDD Focus.xcodeproj/project.pbxproj.
#
# If --build is omitted, CURRENT_PROJECT_VERSION is incremented by 1 from the
# highest value currently in the pbxproj.

set -euo pipefail

NEW_VERSION="${1:-}"
BUILD_OVERRIDE=""

if [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: ./scripts/bump-version.sh <version> [--build <number>]" >&2
  exit 1
fi
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      BUILD_OVERRIDE="${2:-}"
      [[ -n "$BUILD_OVERRIDE" ]] || { echo "--build requires a number" >&2; exit 1; }
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)*$ ]]; then
  echo "Version must look like X.Y.Z (got: $NEW_VERSION)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/Shared (Extension)/Resources/manifest.json"
PBXPROJ="$ROOT/ReDD Focus.xcodeproj/project.pbxproj"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Missing manifest: $MANIFEST" >&2
  exit 1
fi
if [[ ! -f "$PBXPROJ" ]]; then
  echo "Missing pbxproj: $PBXPROJ" >&2
  exit 1
fi

OLD_VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).version)" "$MANIFEST")"

if [[ -n "$BUILD_OVERRIDE" ]]; then
  NEW_BUILD="$BUILD_OVERRIDE"
else
  OLD_BUILD="$(
    grep -oE 'CURRENT_PROJECT_VERSION = [0-9]+;' "$PBXPROJ" \
      | sed -E 's/.* = ([0-9]+);/\1/' \
      | sort -n \
      | tail -1
  )"
  if [[ -z "$OLD_BUILD" ]]; then
    echo "Could not find CURRENT_PROJECT_VERSION in pbxproj" >&2
    exit 1
  fi
  NEW_BUILD=$((OLD_BUILD + 1))
fi

echo "Bumping version: ${OLD_VERSION} → ${NEW_VERSION} (build ${NEW_BUILD})"

node -e '
const fs = require("fs");
const path = process.argv[1];
const version = process.argv[2];
const j = JSON.parse(fs.readFileSync(path, "utf8"));
j.version = version;
fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
' "$MANIFEST" "$NEW_VERSION"

# Stamp every MARKETING_VERSION / CURRENT_PROJECT_VERSION occurrence.
if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${NEW_VERSION};/g" "$PBXPROJ"
  sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = ${NEW_BUILD};/g" "$PBXPROJ"
else
  sed -i -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${NEW_VERSION};/g" "$PBXPROJ"
  sed -i -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = ${NEW_BUILD};/g" "$PBXPROJ"
fi

echo ""
echo "✅ Version bumped to ${NEW_VERSION} (build ${NEW_BUILD})"
echo ""
echo "Files updated:"
echo "  - Shared (Extension)/Resources/manifest.json"
echo "  - ReDD Focus.xcodeproj/project.pbxproj"
echo ""
echo "Next: add ## v${NEW_VERSION} to changelog.md, commit, then tag v${NEW_VERSION}"
echo "      or run Actions → Release build."
