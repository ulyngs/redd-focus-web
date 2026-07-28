# App Store CI submit (Mac + iOS)

One App Store Connect record (`id1660218371`, `com.ulriklyngs.mind-shield`)
covers Mac and iPhone/iPad. Release build can optionally submit each platform
independently; retry workflows re-submit from an existing GitHub Release
without rebuilding.

What's new comes from [`changelog.md`](../changelog.md) via
`scripts/changelog-to-store-whats-new.js`:

- `--platform macos` → shared `###` sections + `#### Safari (Mac)`
- `--platform ios` → shared + `#### Safari (iOS)`

## Secrets (`ulyngs/reddfocus-open-source`)

| Secret | Source |
| --- | --- |
| `APP_STORE_CONNECT_API_KEY_ID` | ASC API Key ID (Admin role for cloud signing) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_P8` | `base64 -i AuthKey_*.p8` |
| `ASC_PRIMARY_LOCALE` | optional; default `en-GB`. Confirm Primary Language in ASC → App Information first |

## Workflows

- [`Release build`](../.github/workflows/release.yml) — extension zip + optional `.pkg` / `.ipa`; checkboxes `submit_mac_app_store` / `submit_ios_app_store` (manual default off). Tag `v*` always attempts both submits when secrets exist. Mac/iOS builds are skipped (not failed) until ASC secrets are configured, unless a submit checkbox is on.
- [`Mac App Store submission`](../.github/workflows/mac-app-store-submit.yml) — retry from Release `.pkg`
- [`iOS App Store submission`](../.github/workflows/ios-app-store-submit.yml) — retry from Release `.ipa`

Build: `scripts/build-appstore.sh ios|macos` (Automatic signing + ASC API key).
Submit: `fastlane/Fastfile` lanes `submit_mac_app_store` / `submit_ios_app_store`
(`deliver`, locale from `ASC_PRIMARY_LOCALE` or `en-GB`, promotional text stamped
every run — confirm live text in ASC and edit Fastfile if needed).

## Local preview

```bash
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('Shared (Extension)/Resources/manifest.json','utf8')).version)")"
node scripts/changelog-to-store-whats-new.js "$VERSION" --platform macos
node scripts/changelog-to-store-whats-new.js "$VERSION" --platform ios
```

Version bump: `./scripts/bump-version.sh X.Y.Z` then add `## vX.Y.Z` to
`changelog.md`. Tag must be `vX.Y.Z` matching `manifest.json`.
