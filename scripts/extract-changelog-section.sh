#!/usr/bin/env bash
# Print the changelog.md section for a release version to stdout.
#
# Usage:
#   ./scripts/extract-changelog-section.sh 6.7.0 > release-notes.md
#
# Expects a heading like "## v6.7.0" in changelog.md.

set -euo pipefail

VERSION="${1:?usage: $0 <version> [changelog.md]}"
CHANGELOG="${2:-changelog.md}"
TAG="v${VERSION#v}"

if [[ ! -f "$CHANGELOG" ]]; then
  echo "Missing ${CHANGELOG}" >&2
  exit 1
fi

SECTION="$(mktemp)"
trap 'rm -f "$SECTION"' EXIT

awk -v ver="$TAG" '
  BEGIN { found = 0 }
  $0 ~ "^## " ver "([[:space:]]|$)" { found = 1; next }
  found && /^## v[0-9]/ { exit }
  found { print }
' "$CHANGELOG" > "$SECTION"

if [[ ! -s "$SECTION" ]]; then
  echo "No changelog section for ${TAG} in ${CHANGELOG} — add ## ${TAG} first." >&2
  exit 1
fi

cat "$SECTION"
