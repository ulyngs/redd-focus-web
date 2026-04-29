// Optional redd-block bridge. The extension must keep working on its own
// if this fails — all ReDD Focus features (content scripts, hiding UI)
// are independent of this code path. The only side effect of a successful
// connection is that `blocklist` becomes non-empty and matching URLs get
// redirected to blocked.html.
//
// Native-host payload contract (current):
//   { "blocklist": ["twitter.com", "x.com", ...],
//     "blocks": [
//       { "blocklistId": "...", "name": "No Twitter", "emoji": "🐦",
//         "color": "#A0CED9", "domains": ["twitter.com","x.com"],
//         "source": "schedule", "endsAt": 1745123400000,
//         "startedAt": 1745087400000 }, ...
//     ] }
// `blocks` is optional — older native-host builds that omit it still work,
// the blocked page just falls back to a generic card without metadata.

const NATIVE_HOST = "com.ulriklyngs.mindshield";
let blocklist = [];
let activeBlocks = [];
let port = null;
let backoffMs = 5_000;
const BACKOFF_MAX = 5 * 60_000;

// URL prefix of our blocked page so a sweep can skip tabs that are
// already on it (avoiding a redirect loop that Chrome would flag as
// "too many redirects"). `chrome.runtime.getURL` resolves at runtime
// because the extension ID is only known once the service worker is up.
const BLOCKED_PAGE_PREFIX = chrome.runtime.getURL("blocked.html");
const IS_SAFARI = BLOCKED_PAGE_PREFIX.startsWith("safari-web-extension://");
const IS_IOS = /\b(iPhone|iPad|iPod)\b/i.test(navigator.userAgent || "")
  || (/\bMacintosh\b/i.test(navigator.userAgent || "") && /\bMobile\//i.test(navigator.userAgent || ""));
const USE_REDD_BLOCK_NATIVE = !IS_IOS;

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function domainMatches(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

function isBlocked(url) {
  if (!url || blocklist.length === 0) return false;
  const host = hostnameOf(url);
  if (!host) return false;
  return blocklist.some(d => domainMatches(host, d));
}

// Pick the most salient active block for a given URL. When a domain
// sits in multiple active blocklists, prefer the one ending soonest
// (matches the sort order emitted by the native host) — that's the
// "when do I regain access" the user actually cares about.
function blockInfoForUrl(url) {
  if (!url || activeBlocks.length === 0) return null;
  const host = hostnameOf(url);
  if (!host) return null;
  for (const block of activeBlocks) {
    if (!block || !Array.isArray(block.domains)) continue;
    if (block.domains.some(d => domainMatches(host, d))) {
      return block;
    }
  }
  return null;
}

// Build the blocked-page URL with as much context as the native host
// gave us. blocked.html is defensive about missing fields.
function buildBlockedUrl(originalUrl) {
  const params = new URLSearchParams();
  params.set("u", originalUrl);
  const info = blockInfoForUrl(originalUrl);
  if (info) {
    if (info.blocklistId) params.set("id", info.blocklistId);
    if (info.name) params.set("name", info.name);
    if (info.emoji) params.set("emoji", info.emoji);
    if (info.color) params.set("color", info.color);
    if (info.source) params.set("source", info.source);
    if (Number.isFinite(info.endsAt)) params.set("endsAt", String(info.endsAt));
    if (Number.isFinite(info.startedAt)) params.set("startedAt", String(info.startedAt));
  }
  return chrome.runtime.getURL("blocked.html") + "?" + params.toString();
}

function applyNativePayload(msg) {
  let domainsChanged = false;
  if (msg && Array.isArray(msg.blocklist)) {
    const next = msg.blocklist.map(d => String(d).toLowerCase());
    const before = blocklist.join("|");
    const after = next.join("|");
    if (before !== after) domainsChanged = true;
    blocklist = next;
    backoffMs = 5_000;
  }
  if (msg && Array.isArray(msg.blocks)) {
    activeBlocks = msg.blocks.map(b => ({
      ...b,
      domains: Array.isArray(b.domains)
        ? b.domains.map(d => String(d).toLowerCase())
        : [],
    }));
  }
  if (domainsChanged) {
    sweepAllTabsForBlocks();
  }
}

// Sweep every open tab and redirect any whose current URL matches the
// blocklist. `chrome.tabs.onUpdated` only fires on *navigations*, so a
// tab that was loaded to twitter.com *before* the blocklist arrived
// (e.g. the user had it open, then re-enabled the extension) would
// otherwise stay visible until a manual refresh. Invoked every time the
// blocklist's domain set actually changes — not on every native-host
// frame, because `blocks` carries a live countdown that changes each
// frame without the set of blocked domains changing.
function sweepAllTabsForBlocks() {
  if (blocklist.length === 0) return;
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  chrome.tabs.query({}, tabs => {
    if (chrome.runtime.lastError) {
      console.info("[redd-block] sweep query failed:", chrome.runtime.lastError.message);
      return;
    }
    for (const tab of tabs) {
      const url = tab && tab.url;
      if (!url) continue;
      // Skip non-http(s) schemes (chrome://, about:, file://, etc.) —
      // our blocklist never contains those and `chrome.tabs.update` on
      // some of them is a permissions error anyway.
      if (!/^https?:/i.test(url)) continue;
      // Don't loop on already-redirected tabs.
      if (url.startsWith(BLOCKED_PAGE_PREFIX)) continue;
      if (isBlocked(url)) {
        chrome.tabs.update(tab.id, { url: buildBlockedUrl(url) });
      }
    }
  });
}

async function refreshSafariBlocklist() {
  if (!IS_SAFARI || !USE_REDD_BLOCK_NATIVE) return;
  if (!chrome.runtime || typeof chrome.runtime.sendNativeMessage !== "function") return;
  const payload = {
    type: "reddBlockRefresh",
    version: chrome.runtime.getManifest && chrome.runtime.getManifest().version,
  };
  try {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST,
      payload,
      response => {
        if (chrome.runtime.lastError) {
          console.info("[redd-block] safari native ping failed:", chrome.runtime.lastError.message);
          return;
        }
        applyNativePayload(response);
      }
    );
  } catch (e) {
    console.info("[redd-block] safari native ping threw:", e && e.message);
  }
}

function connectNative() {
  if (!USE_REDD_BLOCK_NATIVE) return;
  // Graceful no-op if native messaging isn't available (e.g., older
  // Safari builds, stripped-down platforms).
  if (!chrome.runtime || typeof chrome.runtime.connectNative !== "function") {
    console.info("[redd-block] native messaging unavailable; standalone mode");
    return;
  }
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
    port.onMessage.addListener(msg => {
      applyNativePayload(msg);
    });
    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError;
      console.info("[redd-block] native disconnected:", err && err.message);
      port = null;
      // redd-block not installed is the common case — back off exponentially.
      setTimeout(connectNative, backoffMs);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
    });
  } catch (e) {
    console.info("[redd-block] native connect failed:", e && e.message);
    setTimeout(connectNative, backoffMs);
    backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  refreshSafariBlocklist();
  // Cheap early-out when standalone (empty blocklist).
  if (blocklist.length === 0) return;
  const url = changeInfo.url || tab.url;
  if (isBlocked(url)) {
    chrome.tabs.update(tabId, { url: buildBlockedUrl(url) });
  }
});

connectNative();
refreshSafariBlocklist();
// Safari's native handler is request/response only, so keep polling
// for ReDD Block payload changes even when the user sits on a single
// tab. Compliance is verified by ReDD Block from Safari's plist, not
// by this refresh.
if (IS_SAFARI && USE_REDD_BLOCK_NATIVE) {
  setInterval(refreshSafariBlocklist, 15 * 1000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "getBlocklist") {
    sendResponse({ blocklist, blocks: activeBlocks });
    return true;
  }
});
