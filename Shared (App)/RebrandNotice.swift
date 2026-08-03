//
//  RebrandNotice.swift
//  Shared (App)
//
//  One-time announcement for users upgrading from ReDD Focus: the app is now
//  Digital Habits: Focus and the organisation behind it is now the Centre for
//  Digital Habits. Shown in the Mac and iOS companion apps before the setup
//  steps. Never shown in the Safari extension popup, which has its own
//  (separate) onboarding and does not link against this target.
//
//  Gating is version-based rather than inferred: `AppVersionHistory` records
//  the running version on every launch, so from this release onwards the app
//  always knows which version a user came from and future migration notices
//  can gate precisely. Only the first launch after this ships has no recorded
//  version — that one case falls back to comparing the app container's
//  creation date (preserved across updates, fresh on a new install) against
//  the bundle's, which distinguishes an upgrade from a first install.
//

import Foundation

enum AppVersionHistory {
    private static let lastSeenVersionKey = "lastSeenAppVersion"
    private static let rebrandNoticeShownKey = "digitalHabitsRebrandNoticeShown"

    /// First version shipped under the Digital Habits name. Anyone whose
    /// previous version predates this was running ReDD Focus.
    private static let rebrandVersion = "6.9.0"

    private static var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }

    /// Version recorded on the previous launch, or nil on the first launch
    /// after this tracking was introduced (and on a genuinely fresh install).
    private static var lastSeenVersion: String? {
        UserDefaults.standard.string(forKey: lastSeenVersionKey)
    }

    private static var hasSeenRebrandNotice: Bool {
        UserDefaults.standard.bool(forKey: rebrandNoticeShownKey)
    }

    /// Called once the launch is settled: either the notice was not needed, or
    /// the user acknowledged it. Recording it while a notice is still on screen
    /// would suppress that notice on the next launch.
    static func recordCurrentVersion() {
        UserDefaults.standard.set(currentVersion, forKey: lastSeenVersionKey)
    }

    static func markRebrandNoticeShown() {
        UserDefaults.standard.set(true, forKey: rebrandNoticeShownKey)
    }

    static var shouldShowRebrandNotice: Bool {
        guard !hasSeenRebrandNotice else { return false }

        if let lastSeen = lastSeenVersion {
            return lastSeen.compare(rebrandVersion, options: .numeric) == .orderedAscending
        }

        return isUpgradeFromUntrackedVersion
    }

    /// Bootstrap for the single launch where no version has been recorded yet.
    /// The app container is created on first install and survives updates, so
    /// a container meaningfully older than the installed bundle means this
    /// device ran an earlier (ReDD Focus era) version.
    private static var isUpgradeFromUntrackedVersion: Bool {
        // Both apps are containerised (iOS always; the Mac app builds with
        // ENABLE_APP_SANDBOX), so this is the container root rather than the
        // user's home — and unlike Documents/ it always exists.
        let containerURL = URL(fileURLWithPath: NSHomeDirectory())
        guard let containerDate = creationDate(of: containerURL),
              let bundleDate = creationDate(of: Bundle.main.bundleURL) else {
            // Can't tell — treat as a fresh install so new users are not shown
            // a rename they never experienced.
            return false
        }

        // An update rewrites the bundle but leaves the container untouched.
        return bundleDate.timeIntervalSince(containerDate) > untrackedUpgradeThreshold
    }

    /// Installing and first-launching takes seconds; an hour of slack keeps a
    /// slow first launch from reading as an upgrade.
    private static let untrackedUpgradeThreshold: TimeInterval = 3600

    private static func creationDate(of url: URL) -> Date? {
        let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
        return attributes?[.creationDate] as? Date
    }
}
