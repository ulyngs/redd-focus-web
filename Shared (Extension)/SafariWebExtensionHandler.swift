// SafariWebExtensionHandler.swift
//
// Native messaging handler for the Safari target of the ReDD Focus
// extension. Safari routes `browser.runtime.sendNativeMessage` /
// `browser.runtime.connectNative` to this class inside the
// containing .app bundle (no separate native host binary like
// Chrome/Firefox/Edge use).
//
// Wire format matches what the Rust native host emits
// (src-tauri/src/native_host.rs::send_payload):
//
//   host -> extension: { "blocklist": ["x.com", ...],
//                        "blocks": [ { blocklistId, name, emoji, color,
//                                      mode: "blocklist" | "allowlist",
//                                      domains, source, endsAt,
//                                      startedAt }, ... ] }
//
// `blocklist` keeps the legacy flat semantics: only blocklist-mode
// domains belong there. Allowlist (focus space) sessions ship their
// allowed domains in `blocks[].domains` with mode "allowlist" —
// background.js blocks everything *except* the allowlist union, with
// blocklist hits winning on overlap. Putting allowlist domains into
// the flat `blocklist` would invert enforcement (block exactly the
// allowed sites), so the mode split here must stay in lockstep with
// the Rust `derive_payload`.
//
// On Safari there is no length-prefix framing — each `beginRequest`
// invocation delivers exactly one message and we reply with one
// response via `NSExtensionItem.userInfo`.
//
// --- Data sharing with ReDD Blocker ---
//
// Safari is sandboxed (App Store), so the user-home
// `~/Library/Application Support/com.redd.block/redd-block-data.json`
// path used by Chrome/Firefox isn't directly readable. We use a shared
// App Group container instead. Both ReDD Blocker (Tauri) and ReDD Focus
// (this bundle) declare the
// `com.apple.security.application-groups = group.com.reddblock.shared`
// entitlement; ReDD Blocker writes the JSON into the group container,
// this handler reads it from there.
//
// Fallbacks (for non-sandbox or pre-App-Group builds): the legacy
// shared `/var/lib/redd-block/redd-block-data.json` path, then the
// per-user Application Support path.

import SafariServices
import Foundation
import os.log

let SFExtensionMessageKey = "message"
#if os(macOS)
private let kAppGroupID = "group.com.reddblock.shared"
#endif

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let incoming = request?.userInfo?[SFExtensionMessageKey]
        os_log(.default, "ReDDFocus native message: %@", String(describing: incoming))

        #if os(macOS)
        // Persist any self-reported extension state (e.g. private-browsing
        // access) into the App Group container so ReDD Blocker can read it
        // back without needing Full Disk Access on Safari's sandboxed
        // Extensions.plist. background.js sends this as
        // `{ type: "reddBlockRefresh", state: { privateBrowsing: bool } }`.
        if let dict = incoming as? [String: Any],
           let state = dict["state"] as? [String: Any] {
            persistExtensionState(state)
        }
        #endif

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: buildPayload()]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

    #if os(macOS)
    /// Write the extension's self-reported state to
    /// `safari-extension-state.json` in the App Group container so
    /// ReDD Blocker's profile_scan can read private-browsing access
    /// without needing FDA. Best-effort and atomic — a failed write
    /// leaves the previous file intact, and the Rust reader treats a
    /// missing or stale file as "unknown" and gracefully falls back
    /// to the existing leniency behaviour.
    private func persistExtensionState(_ state: [String: Any]) {
        let fm = FileManager.default
        guard let group = fm.containerURL(forSecurityApplicationGroupIdentifier: kAppGroupID) else {
            return
        }
        var entry = state
        entry["reportedAtMs"] = NSNumber(value: UInt64(Date().timeIntervalSince1970 * 1000))
        guard let data = try? JSONSerialization.data(withJSONObject: entry, options: []) else {
            return
        }
        let url = group.appendingPathComponent("safari-extension-state.json")
        try? data.write(to: url, options: .atomic)
    }
    #endif

    /// Build `{ blocklist, blocks }` matching the Rust `send_payload`
    /// shape so background.js can render the same metadata in Safari
    /// as in Chrome.
    private func buildPayload() -> [String: Any] {
        #if os(macOS)
        let (domains, blocks) = derivePayload()
        return [
            "blocklist": domains,
            "blocks": blocks,
        ]
        #else
        // iOS ReDD Focus is standalone and does not link to ReDD Blocker.
        return [
            "blocklist": [],
            "blocks": [],
        ]
        #endif
    }

    #if os(macOS)
    private func derivePayload() -> ([String], [[String: Any]]) {
        guard let url = reddBlockDataURL(),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return ([], [])
        }

        let nowMs = UInt64(Date().timeIntervalSince1970 * 1000)
        let blocklists = root["blocklists"] as? [[String: Any]] ?? []
        let active = root["activeBlocks"] as? [[String: Any]] ?? []
        let schedules = root["schedules"] as? [[String: Any]] ?? []

        // (name, emoji, color, websites_lowercased, mode) for the matching id.
        // `mode` is normalized to exactly "blocklist" or "allowlist", the
        // same values background.js switches on.
        func meta(for id: String) -> (String?, String?, String?, [String], String)? {
            guard let b = blocklists.first(where: { ($0["id"] as? String) == id }) else { return nil }
            let name = b["name"] as? String
            let emoji = b["emoji"] as? String
            let color = b["color"] as? String
            let websites = (b["websites"] as? [String] ?? []).map { $0.lowercased() }
            let mode = ((b["mode"] as? String) ?? "blocklist").lowercased() == "allowlist"
                ? "allowlist" : "blocklist"
            return (name, emoji, color, websites, mode)
        }

        var domainSet = Set<String>()
        var blocks: [[String: Any]] = []

        for ab in active {
            let start = (ab["startTime"] as? NSNumber)?.uint64Value ?? 0
            let end = (ab["endTime"] as? NSNumber)?.uint64Value ?? 0
            let paused = ab["isPaused"] as? Bool ?? false
            if paused || nowMs < start || nowMs >= end { continue }
            guard let id = ab["blocklistId"] as? String,
                  let m = meta(for: id) else { continue }
            // Flat blocklist is legacy blacklist semantics — allowlist
            // domains must never land there (see header comment).
            if m.4 != "allowlist" {
                for w in m.3 { domainSet.insert(w) }
            }
            var entry: [String: Any] = [
                "blocklistId": id,
                "mode": m.4,
                "domains": m.3,
                "source": "activeBlock",
                "endsAt": NSNumber(value: end),
                "startedAt": NSNumber(value: start),
            ]
            if let v = m.0 { entry["name"] = v }
            if let v = m.1 { entry["emoji"] = v }
            if let v = m.2 { entry["color"] = v }
            blocks.append(entry)
        }

        for sch in schedules {
            guard let match = matchScheduleNow(sch, nowMs: nowMs) else { continue }
            guard let id = sch["blocklistId"] as? String,
                  let m = meta(for: id) else { continue }
            if m.4 != "allowlist" {
                for w in m.3 { domainSet.insert(w) }
            }
            var entry: [String: Any] = [
                "blocklistId": id,
                "mode": m.4,
                "domains": m.3,
                "source": "schedule",
            ]
            if let s = match.startedAt { entry["startedAt"] = NSNumber(value: s) }
            if let e = match.endsAt { entry["endsAt"] = NSNumber(value: e) }
            if let v = m.0 { entry["name"] = v }
            if let v = m.1 { entry["emoji"] = v }
            if let v = m.2 { entry["color"] = v }
            blocks.append(entry)
        }

        // Sort ascending by endsAt — matches the order background.js
        // iterates when picking the most-salient block per URL.
        blocks.sort { lhs, rhs in
            let l = (lhs["endsAt"] as? NSNumber)?.uint64Value ?? UInt64.max
            let r = (rhs["endsAt"] as? NSNumber)?.uint64Value ?? UInt64.max
            return l < r
        }
        return (Array(domainSet).sorted(), blocks)
    }

    private struct ScheduleMatch {
        var startedAt: UInt64?
        var endsAt: UInt64?
    }

    /// If any segment of `schedule` is active at `nowMs`, return its
    /// absolute start/end epoch-ms. Mirrors the Rust
    /// `match_schedule_now` and the frontend
    /// `isScheduleSegmentActiveNow` exactly — including the
    /// `resolvedSegments` precedence: one-shot ("repeat: no") schedules
    /// carry their absolute enforcement window in
    /// `activeFromTimestampMs` / `activeUntilTimestampMs`, and the
    /// weekly `segments` shape must not be consulted when resolved
    /// segments are present.
    private func matchScheduleNow(_ schedule: [String: Any], nowMs: UInt64) -> ScheduleMatch? {
        let paused = schedule["isPaused"] as? Bool ?? false
        let pauseEnd = (schedule["pauseEndTime"] as? NSNumber)?.uint64Value ?? 0
        if paused && pauseEnd > nowMs { return nil }
        guard let segments = (schedule["resolvedSegments"] as? [[String: Any]])
            ?? (schedule["segments"] as? [[String: Any]]) else { return nil }

        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .current
        let now = Date(timeIntervalSince1970: TimeInterval(nowMs) / 1000)
        let comps = cal.dateComponents([.weekday, .hour, .minute, .second], from: now)
        // Foundation .weekday is 1=Sun..7=Sat. Schedule `days` arrays in
        // redd-block-data.json are authored by `src/app.js` using the JS
        // Mon=0..Sun=6 convention (see `isScheduleSegmentActiveNow`'s
        // `currentDay` mapping), and `native_host::match_schedule_now`
        // honours the same convention. Map Foundation→JS-Mon-zero here so
        // weekday comparisons match Rust + JS exactly.
        //   Sun(1)→6, Mon(2)→0, Tue(3)→1, ... Sat(7)→5
        let wd = UInt8(((comps.weekday ?? 1) + 5) % 7)
        let hour = UInt32(comps.hour ?? 0)
        let minute = UInt32(comps.minute ?? 0)
        let nowMin = hour * 60 + minute

        // Today's local-midnight as epoch ms.
        let todayStart = cal.startOfDay(for: now)
        let midnightTodayMs = UInt64(todayStart.timeIntervalSince1970 * 1000)
        let yesterdayMidnightMs = midnightTodayMs &- 86_400_000

        for seg in segments {
            // Resolved segment: absolute epoch-ms window wins over the
            // hour/minute/day fields (same rule as the Rust matcher).
            if let from = (seg["activeFromTimestampMs"] as? NSNumber)?.uint64Value,
               let until = (seg["activeUntilTimestampMs"] as? NSNumber)?.uint64Value {
                if nowMs >= from && nowMs < until {
                    return ScheduleMatch(startedAt: from, endsAt: until)
                }
                continue
            }

            let sh = (seg["startHour"] as? NSNumber)?.uint32Value ?? 0
            let sm = (seg["startMinute"] as? NSNumber)?.uint32Value ?? 0
            let eh = (seg["endHour"] as? NSNumber)?.uint32Value ?? 0
            let em = (seg["endMinute"] as? NSNumber)?.uint32Value ?? 0
            let startMin = sh * 60 + sm
            let endMin = eh * 60 + em
            let days = (seg["days"] as? [NSNumber])?.map { $0.uint8Value } ?? []
            let allDay = startMin == endMin
            if allDay {
                if days.contains(wd) {
                    return ScheduleMatch(
                        startedAt: midnightTodayMs,
                        endsAt: midnightTodayMs &+ 86_400_000
                    )
                }
                continue
            }
            if startMin < endMin {
                if days.contains(wd) && nowMin >= startMin && nowMin < endMin {
                    return ScheduleMatch(
                        startedAt: midnightTodayMs &+ UInt64(startMin) * 60_000,
                        endsAt: midnightTodayMs &+ UInt64(endMin) * 60_000
                    )
                }
            } else {
                let yesterday = UInt8((wd + 6) % 7)
                if days.contains(wd) && nowMin >= startMin {
                    return ScheduleMatch(
                        startedAt: midnightTodayMs &+ UInt64(startMin) * 60_000,
                        endsAt: midnightTodayMs &+ 86_400_000 &+ UInt64(endMin) * 60_000
                    )
                }
                if days.contains(yesterday) && nowMin < endMin {
                    return ScheduleMatch(
                        startedAt: yesterdayMidnightMs &+ UInt64(startMin) * 60_000,
                        endsAt: midnightTodayMs &+ UInt64(endMin) * 60_000
                    )
                }
            }
        }
        return nil
    }

    /// Locate redd-block-data.json. Order:
    ///   1. App Group container (when both bundles share the entitlement).
    ///   2. Legacy /var/lib/redd-block (helper-era, not written anymore but
    ///      kept for backwards compatibility on installs that still have it).
    ///   3. Per-user ~/Library/Application Support/com.redd.block (used
    ///      when ReDD Blocker is running unsandboxed without an App Group).
    private func reddBlockDataURL() -> URL? {
        let fm = FileManager.default
        if let group = fm.containerURL(forSecurityApplicationGroupIdentifier: kAppGroupID) {
            let url = group.appendingPathComponent("redd-block-data.json")
            if fm.fileExists(atPath: url.path) { return url }
        }
        let shared = URL(fileURLWithPath: "/var/lib/redd-block/redd-block-data.json")
        if fm.fileExists(atPath: shared.path) { return shared }
        let home = fm.homeDirectoryForCurrentUser
        return home
            .appendingPathComponent("Library/Application Support/com.redd.block/redd-block-data.json")
    }
    #endif
}
