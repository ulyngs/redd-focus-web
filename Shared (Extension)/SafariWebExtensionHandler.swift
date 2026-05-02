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
//                                      domains, source, endsAt,
//                                      startedAt }, ... ] }
//
// On Safari there is no length-prefix framing — each `beginRequest`
// invocation delivers exactly one message and we reply with one
// response via `NSExtensionItem.userInfo`.
//
// --- Data sharing with ReDD Block ---
//
// Safari is sandboxed (App Store), so the user-home
// `~/Library/Application Support/com.redd.block/redd-block-data.json`
// path used by Chrome/Firefox isn't directly readable. We use a shared
// App Group container instead. Both ReDD Block (Tauri) and ReDD Focus
// (this bundle) declare the
// `com.apple.security.application-groups = group.com.reddblock.shared`
// entitlement; ReDD Block writes the JSON into the group container,
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

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: buildPayload()]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

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
        // iOS ReDD Focus is standalone and does not link to ReDD Block.
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

        // (name, emoji, color, websites_lowercased) for the matching id.
        func meta(for id: String) -> (String?, String?, String?, [String])? {
            guard let b = blocklists.first(where: { ($0["id"] as? String) == id }) else { return nil }
            let name = b["name"] as? String
            let emoji = b["emoji"] as? String
            let color = b["color"] as? String
            let websites = (b["websites"] as? [String] ?? []).map { $0.lowercased() }
            return (name, emoji, color, websites)
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
            for w in m.3 { domainSet.insert(w) }
            var entry: [String: Any] = [
                "blocklistId": id,
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
            for w in m.3 { domainSet.insert(w) }
            var entry: [String: Any] = [
                "blocklistId": id,
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
    /// `isScheduleSegmentActiveNow` exactly.
    private func matchScheduleNow(_ schedule: [String: Any], nowMs: UInt64) -> ScheduleMatch? {
        let paused = schedule["isPaused"] as? Bool ?? false
        let pauseEnd = (schedule["pauseEndTime"] as? NSNumber)?.uint64Value ?? 0
        if paused && pauseEnd > nowMs { return nil }
        guard let segments = schedule["segments"] as? [[String: Any]] else { return nil }

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
    ///      when ReDD Block is running unsandboxed without an App Group).
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
