# Master prompt: ReDD Focus add-on store submissions

Copy everything below the line into a new agent chat (or paste as the task brief). Fill in nothing first — the agent should stop and ask clarifying questions before implementing.

---

## Role

You are implementing **browser add-on store auto-submit** for **ReDD Focus** in the repo `ulyngs/reddfocus-open-source` (local path typically `reddfocus-open-source` under the Apps workspace).

**Do not implement until you have asked clarifying questions and received answers.** First: read this prompt + the existing repo workflows/scripts, then ask a short list of blocking questions. After answers, implement fully, with dry-run steps I can run locally, secret-sourcing guides, docs, and a suggested commit order.

---

## Product context

- **Repo:** `reddfocus-open-source` (not `redd-focus-android`).
- **Extension source:** `Shared (Extension)/Resources/` (includes `manifest.json`).
- **Current version:** `6.8.0` (already released on GitHub). There may be **no version bump** for the first store-submit run — the workflow must be runnable **in isolation** against an existing release/tag.
- **Stores to submit to (all three in one path):**
  1. Chrome Web Store
  2. Firefox Add-ons (AMO)
  3. Microsoft Edge Add-ons (via Partner Center **Edge Publish API**, not Windows Store MSIX)

---

## What already exists (reuse; do not reinvent)

### Release build (`\.github\workflows\release.yml`)

- Builds extension zip via `scripts/build-extension-zip.sh` → `for-distribution/redd-focus-v<version>.zip`.
- Optional Mac / iOS App Store submits (checkboxes).
- Optional GitHub Release.
- Comment today: Chrome / Firefox / Edge auto-submit is **out of scope**; zip is for manual upload.

### Retry pattern to mirror (Mac / iOS)

- `mac-app-store-submit.yml` / `ios-app-store-submit.yml` — standalone `workflow_dispatch` that re-submits from an existing GitHub Release asset.
- Release build has optional boolean inputs that gate publish jobs.
- Builds always run; secrets checked **inside** jobs (GitHub forbids `secrets` in job-level `if:`).

### Changelog

- Source of truth: `changelog.md`.
- Sections: `## vX.Y.Z`, optional `> …` headline, shared `###` themes, then `### BY PLATFORM` with `#### Safari (Mac)` / `#### Safari (iOS)` / `#### Chrome` / `#### Firefox` / `#### Edge`.
- Bullets: `- **Short title.** Longer description.`
- Generator: `scripts/changelog-to-store-whats-new.js` already supports `--platform chrome|firefox|edge` (10k char limit), plus macos/ios.
- Skip Version/internal CI bullets; intro + sign-off already baked into the script.
- **Preserve this changelog structure.** Update the “future” table rows for Chrome/Firefox/Edge to reflect that store What’s New / notes are now wired where applicable. Do not invent a new changelog format.

### Manifest (shared MV3)

```json
"background": {
  "service_worker": "background.js",
  "scripts": ["background.js"]
},
"browser_specific_settings": {
  "gecko": {
    "id": "mindshield@example.com",
    ...
  }
}
```

- **Chrome + Firefox:** same zip; dual `background` keys are intentional (Firefox needs `scripts`).
- **Edge Partner Center:** rejects MV3 packages that include `background.scripts` alongside `service_worker` (known validation error). CI must produce an **Edge-specific zip** with `scripts` stripped (and optionally strip `browser_specific_settings.gecko`). **Do not** change the committed source manifest permanently — transform only in the packaging step.

### Known public IDs (not secrets)

| Store | ID | Notes |
| --- | --- | --- |
| Chrome Web Store | `hhblkhfdjijdinijakbmcpkmdfhoadcd` | Extension ID |
| Edge Add-ons listing | `gmjfgjdhnhcegfelcddbdljdffiaepam` | Store listing / install ID — **not** the Partner Center product GUID |
| Firefox / gecko | `mindshield@example.com` | AMO / `browser_specific_settings.gecko.id` |

### Inspiration repos (same Apps workspace)

| Repo | What to copy |
| --- | --- |
| **`redd-2fa`** `.github/workflows/release.yml` | Chrome + Firefox via `npx publish-browser-extension@5.1.0`, `CHROME_API_VERSION=v2`, secret soft-skip pattern, AMO release-notes PATCH after upload (`continue-on-error: true`). Chrome has **no** public release-notes API field. |
| **`redd-block` / `redd-todo`** | Partner Center CI is for **Windows MSIX**, **not** Edge Add-ons. Do **not** reuse `AZURE_AD_*`, `SELLER_ID`, `MS_STORE_PRODUCT_ID`, or `microsoft/microsoft-store-apppublisher` for Edge extensions. |

### Tooling choice

Use **`publish-browser-extension@5.1.0`** (same as 2fa) for Chrome, Firefox, **and** Edge (`--chrome-zip`, `--firefox-zip`, `--edge-zip`). Pin the version.

For Firefox public notes: follow 2fa’s AMO API v5 JWT PATCH of `release_notes`, but feed text from Focus’s `changelog-to-store-whats-new.js --platform firefox` (not raw markdown section).

For Edge: API supports **notes for certification** (reviewer-facing only), not a public What’s New field via the Update API. `publish-browser-extension` may not expose cert notes in its CLI config — if not, either (a) submit Edge with empty notes via the tool, or (b) use a small Node/curl helper / `wdzeng/edge-addon` for publish with notes from `--platform edge`. Prefer one approach; document it. Do not pretend Edge gets public store release notes via API if it does not.

---

## Target UX / workflow design

### Name

**`Submit to add-on stores (Chrome, Firefox, Edge).`**

### Shape (preferred)

1. **One primary workflow YAML** that contains all submit logic (and packaging for Edge transform), invocable via:
   - `workflow_dispatch` (standalone / retry / first run for `v6.8.0`)
   - `workflow_call` from Release build when an optional checkbox is set
2. **Optional Release build input** (default `false` on manual; decide with me whether tag pushes auto-submit — default recommendation: **off** until secrets proven):
   - `submit_addon_stores` — description like: `Submit to Chrome / Firefox / Edge add-on stores`
3. Per-store toggles on the submit workflow (default all true):
   - `submit_chrome`
   - `submit_firefox`
   - `submit_edge`
4. Standalone input:
   - `release_tag` — e.g. `v6.8.0` (normalize `6.8.0` → `v6.8.0`)

### Behaviour for isolation (no bump)

When run standalone with `release_tag=v6.8.0`:

- Checkout that tag (or checkout default branch and verify `manifest.json` version matches the tag), **or** download `redd-focus-v6.8.0.zip` from the GitHub Release and derive Edge zip by unpack → transform manifest → rezip.
- Prefer a path that always applies the **Edge manifest transform** correctly.
- Version must match `manifest.json` / Release asset naming.

### When called from Release build

- Depends on `build-extension` success.
- Uses freshly built shared zip (+ Edge zip built in the same job or submit job).
- Does not require Mac/iOS success.

### Failure / skip policy

- Ask me which I prefer before coding (blocking question):
  - **A:** Soft-skip a store if its secrets are empty (2fa style), even if checkbox is on.
  - **B:** If checkbox is on for a store, missing secrets → fail that store (clearer).
- Firefox notes PATCH must remain **non-fatal** (`continue-on-error: true`) like 2fa.
- One store failing should not silently pretend all succeeded — surface per-store status clearly in logs.

### Artifacts

| Artifact | Used by |
| --- | --- |
| `redd-focus-vX.Y.Z.zip` | Chrome + Firefox (unchanged dual-background manifest) |
| `redd-focus-edge-vX.Y.Z.zip` (or equivalent clear name) | Edge only |

Update GitHub Release notes blurb in `release.yml` once wired (remove “auto-submit is not wired yet” when true). Optionally attach both zips to the Release.

---

## Manifest transform (Edge) — required

Implement something like `scripts/build-edge-extension-zip.sh` (or extend `build-extension-zip.sh` with a mode):

1. Start from the same Resources tree (or unpack shared zip).
2. Rewrite `manifest.json`:
   - Keep `"background": { "service_worker": "background.js" }` only — **remove `scripts`**.
   - Optionally remove `browser_specific_settings` (Firefox-only).
3. Zip to `for-distribution/redd-focus-edge-v<version>.zip`.
4. Validate with a small Node assert that Edge zip’s manifest has no `background.scripts`.
5. **Never** commit the transformed manifest as the source of truth.

Document why in `docs/` (Edge Partner Center package acceptance validation).

---

## Release notes / What’s New matrix

| Store | Public user-facing notes | What to send |
| --- | --- | --- |
| Chrome | **No** | Nothing |
| Firefox | **Yes** | `changelog-to-store-whats-new.js --platform firefox` → AMO `release_notes` (`en-US` or primary locale; match 2fa unless Focus listing uses `en-GB` — **ask**) |
| Edge | **No public via Update API** | Optional **notes for certification** from `--platform edge` text (or a short fixed cert blurb + changelog summary) |

Update `changelog.md` header table so Chrome/Firefox/Edge rows are no longer “future” where applicable.

Dry-run commands the implementer must document and that I can run locally:

```bash
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('Shared (Extension)/Resources/manifest.json','utf8')).version)")"
node scripts/changelog-to-store-whats-new.js "$VERSION" --platform firefox
node scripts/changelog-to-store-whats-new.js "$VERSION" --platform chrome
node scripts/changelog-to-store-whats-new.js "$VERSION" --platform edge
bash ./scripts/build-extension-zip.sh "$VERSION"
# after Edge script exists:
bash ./scripts/build-edge-extension-zip.sh "$VERSION"   # or whatever name you choose
```

If `publish-browser-extension` supports `--dry-run`, document using it with secrets present for auth-only checks.

---

## Secrets — exhaustive sourcing guides

Assume I start with **zero** secrets. Implement docs that walk through every secret end-to-end. Use these **exact GitHub Actions secret names** unless we agree otherwise (match 2fa where overlapping):

### Firefox Add-ons

| Secret | Purpose |
| --- | --- |
| `FIREFOX_EXTENSION_ID` | Add-on id — for Focus: `mindshield@example.com` |
| `FIREFOX_JWT_ISSUER` | Form `user:######:###` |
| `FIREFOX_JWT_SECRET` | JWT secret string |

**How to get them (document step-by-step in the repo docs):**

1. Sign in to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Open the ReDD Focus listing (or create API credentials at account level).
3. Go to **API Keys** / **Generate new credentials** (AMO → tools / API credentials — current UI: https://addons.mozilla.org/en-US/developers/addon/api/key/ or account API keys page).
4. Create a key → copy **JWT issuer** (`user:…:…`) and **JWT secret**.
5. Confirm extension id matches `manifest.json` → `browser_specific_settings.gecko.id` (`mindshield@example.com`). If the AMO slug differs from the GUID id, use the id AMO’s API expects (same as 2fa: the extension id used in upload).
6. Add all three as GitHub repo secrets on `ulyngs/reddfocus-open-source`.
7. Local dry-run: `publish-extension init` can help validate, but prefer documenting a minimal `npx publish-browser-extension@5.1.0 --dry-run --firefox-zip …` once zips exist (if dry-run works without uploading).

**Note:** Collaborator may already have issuer + secret; I still need the extension id in secrets (or hardcode with comment — prefer secret for consistency with 2fa).

### Chrome Web Store (API **v2** — required; do not implement retired OAuth-only v1.1 as primary)

| Secret | Purpose |
| --- | --- |
| `CHROME_EXTENSION_ID` | `hhblkhfdjijdinijakbmcpkmdfhoadcd` |
| `CHROME_PUBLISHER_ID` | Publisher / account id from CWS dashboard |
| `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | e.g. `chrome-webstore-publisher@….iam.gserviceaccount.com` |
| `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | PEM private key for that service account |

Also set env in the workflow: `CHROME_API_VERSION: v2`.

**What collaborators sometimes paste by mistake (do NOT treat as v2 complete):**

- OAuth **Client ID** (`….apps.googleusercontent.com`)
- OAuth **Client secret**

Those are for the **old** CWS API v1.1 refresh-token flow (sunset ~Oct 2026). We want **v2 service account** auth like `redd-2fa`.

**How to get Chrome v2 credentials (document exhaustively):**

1. **Chrome Web Store Developer Dashboard**  
   - https://chrome.google.com/webstore/devconsole  
   - Note the **Extension ID** of ReDD Focus.  
   - Note the **Publisher ID** (account settings / dashboard URL / publisher profile — document where it appears in current UI).

2. **Google Cloud project linked to the Web Store publisher**  
   - In the CWS dashboard, follow Google’s current docs for “API access” / linking a Google Cloud project for the Chrome Web Store API.  
   - Enable the **Chrome Web Store API** on that project.

3. **Service account**  
   - Create (or reuse) a service account used for publishing.  
   - Create a JSON key → download once.  
   - From JSON: `client_email` → `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`.  
   - From JSON: `private_key` (including `-----BEGIN PRIVATE KEY-----` …) → `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`.  
   - In GitHub secrets, preserve newlines (GitHub UI accepts multiline; or use `\n` escaped form if the tool requires it — match whatever 2fa / publish-browser-extension expects; document the exact paste format).

4. **Grant the service account access to the Web Store item**  
   - In CWS dashboard → the extension → **Users and permissions** / API access: add the service account email as a publisher user with permission to publish (follow current Google docs for CWS API v2).  
   - Without this step, upload returns 403.

5. Add all four secrets to GitHub.

6. Document that OAuth client id/secret from collaborators are **optional leftovers** and not used by our workflow.

### Edge Add-ons (Partner Center Publish API v1.1)

| Secret | Purpose |
| --- | --- |
| `EDGE_PRODUCT_ID` | Product **GUID** from Partner Center (128-bit), **not** `gmjfgjdhnhcegfelcddbdljdffiaepam` |
| `EDGE_CLIENT_ID` | From Publish API credentials |
| `EDGE_API_KEY` | From Publish API credentials (v1.1 ApiKey auth) |

**How to get them (document exhaustively):**

1. Sign in to [Partner Center](https://partner.microsoft.com/dashboard) with the account that owns the Edge extension.
2. Open the **Microsoft Edge** program (Edge Add-ons), not the Windows apps / MSIX product.
3. Open the existing ReDD Focus Edge product (already published — listing id `gmjfgjdh…`).
4. Find the **Product ID** (GUID) on the product overview / identity page — store as `EDGE_PRODUCT_ID`.
5. Go to **Publish API** (under Microsoft Edge):  
   - Enable the **new experience** / API keys (v1.1) if prompted.  
   - **Create API credentials**.  
   - Copy **Client ID** → `EDGE_CLIENT_ID`.  
   - Copy **API key** immediately (may only show once) → `EDGE_API_KEY`.  
   - Note expiry; document rotation.
6. First-time publish of a *new* extension must be manual; **updates** can use the API (Focus is already published — updates only).
7. Do **not** use Windows Store secrets (`AZURE_AD_TENANT_ID`, `SELLER_ID`, `MS_STORE_PRODUCT_ID`, etc.).

Official refs to cite in docs:

- https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api  
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/addons-api-reference  

### Docs location

Extend `docs/app-store-ci.md` **or** add `docs/addon-store-ci.md` and link from the former. Include:

- Secret tables  
- Step-by-step sourcing (above)  
- Workflow names + inputs  
- Local dry-run commands  
- Edge manifest transform rationale  
- Notes matrix (Chrome none / Firefox AMO / Edge cert-only)  
- Known IDs  

---

## Implementation checklist (after questions answered)

1. Edge zip build script + validation.
2. Workflow: `Submit to add-on stores (Chrome, Firefox, Edge).` with `workflow_dispatch` + `workflow_call`.
3. Wire optional `submit_addon_stores` into `release.yml`; call the reusable workflow / job graph cleanly.
4. Submit steps using `publish-browser-extension@5.1.0` with Chrome v2 + Firefox + Edge flags based on inputs/secrets.
5. Firefox release-notes PATCH using Focus changelog generator.
6. Edge cert notes if feasible.
7. Update Release notes text in `release.yml` (no longer “not wired”).
8. Update `changelog.md` platform table (Chrome/Firefox/Edge status).
9. Docs: full secret guides + dry-runs.
10. Do **not** commit secrets, `.env.submit`, or private keys. Ensure `.gitignore` covers local submit env files (2fa ignores `.env` / `.env.submit*`).

**Out of scope unless I ask:** Opera; changing listing descriptions; first-time store listing creation; Windows MSIX.

---

## Blocking questions — ask me before coding

Ask at least:

1. Soft-skip vs hard-fail when a store checkbox is on but secrets are missing?
2. On `push` tags `v*`, should `submit_addon_stores` default on or stay manual-only?
3. Firefox `release_notes` locale: `en-US` (2fa) vs `en-GB` (Focus ASC default)?
4. Attach Edge zip to GitHub Releases as well as the shared zip?
5. Confirm I will paste Chrome **service account private key** + **publisher id** (not only OAuth client id/secret).
6. Confirm Edge **product GUID** is available in Partner Center (or I need help finding it).
7. Any preference for Edge cert notes: changelog-derived vs short static blurb vs skip?
8. Should standalone workflow rebuild from tag checkout, or download Release zip and transform?

Then implement according to answers.

---

## Suggested commit order (simple messages)

Do **not** commit until I ask — but when I do, prefer small commits in this order:

1. **`Add Edge extension zip packaging that strips background.scripts`**  
   Scripts only + maybe a tiny unit/assert or dry-run note in docs snippet.

2. **`Add Chrome/Firefox/Edge add-on store submit workflow`**  
   Workflow YAML + any small helper for AMO notes / Edge notes. No secret values.

3. **`Optionally submit add-on stores from Release build`**  
   Wire `submit_addon_stores` + update release notes blurb.

4. **`Document add-on store CI secrets and dry-runs`**  
   `docs/addon-store-ci.md` (or extended `app-store-ci.md`) + changelog table status update.

If combining is preferred after review, squash to two commits: (code+workflow) then (docs). Suggested messages stay imperative and “why”-light but clear.

---

## Verification plan (write into PR / handoff)

Local:

- Changelog dry-runs for firefox/chrome/edge for `6.8.0`.
- Build shared zip + Edge zip; unzip Edge and confirm no `background.scripts`.

CI (after secrets):

1. Run **Submit to add-on stores (Chrome, Firefox, Edge).** with `release_tag=v6.8.0`, all stores on (or one store at a time first).
2. Confirm Chrome dashboard shows new upload / pending review for 6.8.0.
3. Confirm AMO shows 6.8.0 + release notes text.
4. Confirm Edge Partner Center shows new submission / InReview.
5. Only then enable the Release build checkbox on a future release.

---

## Coding standards

- Match existing Focus workflow style (ubuntu, Node 20, clear job names, concurrency groups).
- Prefer minimal diff; no drive-by refactors.
- No markdown/docs beyond what’s needed for this feature (except the CI docs requested here).
- Do not push or create PRs unless I ask.
- Do not amend git config; commit only when I explicitly request commits.

---

## First actions when you start

1. Read this prompt fully.
2. Read: `release.yml`, `build-extension-zip.sh`, `changelog-to-store-whats-new.js`, `docs/app-store-ci.md`, `manifest.json`, and `redd-2fa`’s `release.yml` submit + Firefox notes steps.
3. **Stop and ask the blocking questions** (and any other gaps).
4. After my answers: implement, document secret steps exhaustively, give me the local dry-run commands, and propose the commit sequence above when ready to commit.
