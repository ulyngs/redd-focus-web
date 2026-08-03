#!/usr/bin/env node
/**
 * Build store "What's new" plain text from changelog.md.
 *
 * Usage:
 *   node scripts/changelog-to-store-whats-new.js <version> --platform macos --out whats_new_mas.txt
 *   node scripts/changelog-to-store-whats-new.js <version> --platform ios --out whats_new_ios.txt
 *   node scripts/changelog-to-store-whats-new.js <version> --platform chrome|firefox|edge --out notes.txt
 *
 * Platform filters:
 *   macos   — shared sections + #### Safari (Mac)  (aliases: Safari (macOS), Safari macOS, macOS)
 *   ios     — shared sections + #### Safari (iOS)  (aliases: Safari iOS, iOS)
 *   chrome  — shared sections + #### Chrome
 *   firefox — shared sections + #### Firefox
 *   edge    — shared sections + #### Edge
 *
 * Shared = any `###` section that is not `### BY PLATFORM`.
 * Character limits: App Store "What's New" 4,000 (Apple platforms); 10,000 for
 * browser stores. Truncates the bullet list (keeps intro + sign-off).
 */

const fs = require('fs');
const path = require('path');

const PLATFORMS = {
  macos: { maxChars: 4000 },
  mac: { maxChars: 4000 },
  ios: { maxChars: 4000 },
  chrome: { maxChars: 10000 },
  firefox: { maxChars: 10000 },
  edge: { maxChars: 10000 },
};

const INTRO = `Hi folks,

This update comes with some helpful improvements!`;

const SIGNOFF = `Please keep suggesting improvements to the app - you can do so at https://github.com/ulyngs/digital-habits-focus

We hope you're enjoying Digital Habits: Focus!

- Ulrik, Tiago, & the Centre for Digital Habits Team
(digitalhabits.org)`;

function usage() {
  console.error(
    'usage: node scripts/changelog-to-store-whats-new.js <version> [changelog.md] --platform macos|ios|chrome|firefox|edge [--empty-ok] [--out file]',
  );
  process.exit(1);
}

function normalizePlatform(raw) {
  const p = (raw || '').toLowerCase().trim();
  if (p === 'mac' || p === 'macos' || p === 'osx' || p === 'safari-mac' || p === 'safari_mac') {
    return 'macos';
  }
  if (p === 'ios' || p === 'safari-ios' || p === 'safari_ios') return 'ios';
  if (p === 'chrome' || p === 'chromium') return 'chrome';
  if (p === 'firefox' || p === 'ff' || p === 'amo') return 'firefox';
  if (p === 'edge' || p === 'msedge') return 'edge';
  return null;
}

function extractSection(changelog, version) {
  const tag = version.startsWith('v') ? version : `v${version}`;
  const lines = changelog.split(/\r?\n/);
  let found = false;
  const section = [];
  for (const line of lines) {
    if (/^## v\d/.test(line)) {
      if (found) break;
      if (line === `## ${tag}` || line.startsWith(`## ${tag} `)) {
        found = true;
        continue;
      }
    }
    if (found) section.push(line);
  }
  if (!found || section.every((l) => !l.trim())) {
    throw new Error(`No changelog section for ${tag} — add ## ${tag} first.`);
  }
  return section;
}

function stripMdInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** True for bullets that belong in the engineering changelog, not Store notes. */
function isInternalBullet(plain) {
  if (/^version:\s*/i.test(plain)) return true;
  if (
    /\b(store submit|partner center|github release|github actions|msstore|release workflow|mac app store submission|app store connect|chrome web store|firefox add-ons|edge add-ons)\b/i.test(
      plain,
    )
  ) {
    return true;
  }
  if (/\bci\b.*\b(submit|publish|release)\b/i.test(plain)) return true;
  return false;
}

/**
 * Format a changelog bullet for Store notes.
 * `**Title.** Body` → `- "Title": Body`
 */
function formatStoreBullet(rawBody) {
  const plain = stripMdInline(rawBody);
  if (!plain || isInternalBullet(plain)) return null;

  const titled = plain.match(/^(.+?)\.\s+(.+)$/s);
  if (titled) {
    const title = titled[1].trim();
    const body = titled[2].trim();
    if (title && body) return `- "${title}": ${body}`;
  }
  return `- ${plain}`;
}

/**
 * Map a heading title to a platform scope, or null if thematic/shared.
 *
 * Canonical: Safari (Mac), Safari (iOS), Chrome, Firefox, Edge
 * Aliases: Safari (macOS), Safari macOS, macOS, Mac, iOS, Safari iOS, …
 */
function platformFromTitle(title) {
  const t = title.trim();

  // Safari (Mac) / Safari (macOS) / Safari macOS — before bare "mac"
  if (/safari\s*\(\s*mac/i.test(t) || /safari\s+mac/i.test(t)) return 'macos';
  if (/safari\s*\(\s*ios/i.test(t) || /safari\s+ios/i.test(t)) return 'ios';

  if (/^chrome$/i.test(t) || /\bchrome\b/i.test(t)) return 'chrome';
  if (/^firefox$/i.test(t) || /\bfirefox\b/i.test(t)) return 'firefox';
  if (/^edge$/i.test(t) || /\bedge\b/i.test(t)) return 'edge';

  // Bare platform names under BY PLATFORM
  if (/^macos$|^mac$|\bmacos\b/i.test(t)) return 'macos';
  if (/^ios$|\bios\b/i.test(t)) return 'ios';

  return null;
}

/**
 *   ### POPUP …          → shared
 *   ### BY PLATFORM      → by-platform (scaffold)
 *   #### Safari (Mac)    → macos
 *   #### Safari (iOS)    → ios
 *   #### Chrome/…        → that browser
 */
function scopeForHeading(level, title, current) {
  const platform = platformFromTitle(title);
  if (platform) return platform;

  if (level === 3) {
    return /by platform/i.test(title) ? 'by-platform' : 'shared';
  }
  if (current === 'by-platform') return 'by-platform';
  return 'shared';
}

function scopeMatchesPlatform(scope, platform) {
  if (scope === 'shared') return true;
  if (scope === 'by-platform') return false;
  return scope === platform;
}

function collectStoreBullets(sectionLines, platform) {
  const bullets = [];
  let scope = 'shared';
  for (let i = 0; i < sectionLines.length; i += 1) {
    const raw = sectionLines[i];
    const line = raw.replace(/\s+$/, '');

    if (/^>\s*/.test(line)) continue; // summary blockquote — intro covers this

    const heading = line.match(/^(#{3,6})\s+(.*)$/);
    if (heading) {
      scope = scopeForHeading(heading[1].length, heading[2], scope);
      continue;
    }
    if (/^#{2,6}\s+/.test(line)) continue;

    if (!scopeMatchesPlatform(scope, platform)) continue;

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (!bullet) continue;

    let body = bullet[1];
    while (i + 1 < sectionLines.length) {
      const next = sectionLines[i + 1];
      if (/^\s{2,}\S/.test(next) && !/^\s*[-*]\s+/.test(next) && !/^#{2,6}\s+/.test(next.trim())) {
        body = `${body} ${next.trim()}`;
        i += 1;
        continue;
      }
      break;
    }

    const formatted = formatStoreBullet(body);
    if (formatted) bullets.push(formatted);
  }
  return bullets;
}

function buildWhatsNew(bullets, maxChars, emptyOk) {
  if (!bullets.length) {
    if (emptyOk) return '';
    throw new Error(
      'No user-facing changelog bullets for Store notes (only Version / other-platform / internal lines?).',
    );
  }

  const intro = INTRO;
  const signoff = SIGNOFF;
  // No blank line between intro and first bullet; blank line before sign-off.
  const afterIntro = '\n';
  const beforeSignoff = '\n\n';
  const fixedLen = intro.length + signoff.length + afterIntro.length + beforeSignoff.length;

  let list = bullets.join('\n');
  if (fixedLen + list.length > maxChars) {
    const budget = maxChars - fixedLen - '\n…'.length;
    const kept = [];
    let used = 0;
    for (const b of bullets) {
      const add = (kept.length ? 1 : 0) + b.length;
      if (used + add > budget) break;
      kept.push(b);
      used += add;
    }
    if (!kept.length) {
      kept.push(`${bullets[0].slice(0, Math.max(40, budget - 1))}…`);
    }
    list = `${kept.join('\n')}\n…`;
  }

  return `${intro}${afterIntro}${list}${beforeSignoff}${signoff}`.trim();
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) usage();

  let outPath = null;
  let platform = null;
  let emptyOk = false;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') {
      outPath = args[++i];
      if (!outPath) usage();
    } else if (args[i] === '--empty-ok') {
      emptyOk = true;
    } else if (args[i] === '--platform') {
      platform = normalizePlatform(args[++i]);
      if (!platform) usage();
    } else {
      positional.push(args[i]);
    }
  }

  if (!platform) usage();

  const version = positional[0];
  if (!version) usage();
  const changelogPath = path.resolve(positional[1] || 'changelog.md');
  const maxChars = PLATFORMS[platform].maxChars;

  const markdown = fs.readFileSync(changelogPath, 'utf8');
  const sectionLines = extractSection(markdown, version);
  const bullets = collectStoreBullets(sectionLines, platform);
  const text = buildWhatsNew(bullets, maxChars, emptyOk);

  if (outPath) {
    fs.writeFileSync(outPath, text ? `${text}\n` : '', 'utf8');
    console.error(
      text
        ? `Wrote ${outPath} (${text.length} chars, platform=${platform})`
        : `Wrote ${outPath} (empty — no ${platform}-facing changes)`,
    );
  } else {
    process.stdout.write(text ? `${text}\n` : '');
  }
}

main();
