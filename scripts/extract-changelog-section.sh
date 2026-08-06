#!/usr/bin/env bash
# Print the changelog.md section for a GitHub Release to stdout (markdown kept).
#
# Includes every non-empty ### section for that version — update intro,
# product headings, platform tags, and Internal. Stops before the next ##
# heading (so a "## vX.Y.Z (previous format)" twin is not included).
#
# Store notes are built separately by scripts/changelog-to-store-whats-new.js.
#
# Usage:
#   ./scripts/extract-changelog-section.sh 6.9.1 > release-notes.md

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
  $0 ~ "^## " ver "[[:space:]]*$" { found = 1; next }
  found && /^## / { exit }
  found { print }
' "$CHANGELOG" > "$SECTION"

if [[ ! -s "$SECTION" ]]; then
  echo "No changelog section for ${TAG} in ${CHANGELOG} — add ## ${TAG} first." >&2
  exit 1
fi

awk '
  { lines[NR] = $0 }
  END {
    end = NR
    while (end > 0 && lines[end] ~ /^[[:space:]]*$/) end--
    for (i = 1; i <= end; i++) print lines[i]
  }
' "$SECTION"
