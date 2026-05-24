//
//  ViewController.swift
//  Shared (App)
//
//  Created by ULRIK LYNGS on 30/11/2021.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "com.ulriklyngs.mind-shield.mind-shield"

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self

#if os(iOS)
        self.webView.scrollView.isScrollEnabled = false
#elseif os(macOS)
        addTitlebarDragArea()
#endif

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

#if os(macOS)
    override func viewDidAppear() {
        super.viewDidAppear()
        configureWindowDragBehavior()
    }

    private func configureWindowDragBehavior() {
        guard let window = view.window else {
            return
        }

        window.isMovableByWindowBackground = true
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
    }

    /// The window uses fullSizeContentView with a transparent titlebar, so the
    /// WKWebView extends behind the traffic-light area and captures mouse events
    /// there — preventing the user from dragging the window. This overlay sits
    /// above the webview in the titlebar strip and reports itself as draggable.
    /// Traffic-light buttons still work because they're rendered at window level.
    private func addTitlebarDragArea() {
        let dragView = TitlebarDragView()
        dragView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dragView, positioned: .above, relativeTo: nil)
        NSLayoutConstraint.activate([
            dragView.topAnchor.constraint(equalTo: view.topAnchor),
            dragView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            dragView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            dragView.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
#endif

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                NSLog("ReDD Focus: getStateOfSafariExtension failed: \(error?.localizedDescription ?? "unknown error")")
                return
            }

            DispatchQueue.main.async {
                webView.evaluateJavaScript("show('mac', \(state.isEnabled))")
            }
        }
#endif
    }

#if os(macOS)
    private final class TitlebarDragView: NSView {
        override var mouseDownCanMoveWindow: Bool { true }

        override func mouseDown(with event: NSEvent) {
            window?.performDrag(with: event)
        }
    }

    /// `SFSafariApplication.showPreferencesForExtension` frequently fails with
    /// `SFErrorDomain` code 1 when Safari hasn't been launched yet (common right
    /// after an App Store install). Launching Safari forces the system to
    /// register installed Safari extensions, after which a single retry usually
    /// succeeds.
    private func openSafariExtensionPreferences(retryCount: Int = 0) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { [weak self] error in
            if let nsError = error as NSError?,
               nsError.domain == "SFErrorDomain",
               nsError.code == 1,
               retryCount == 0 {
                NSLog("ReDD Focus: showPreferencesForExtension failed (\(nsError.localizedDescription)); launching Safari and retrying")
                self?.launchSafari { launched in
                    let delay: DispatchTime = launched ? .now() + 1.5 : .now() + 0.3
                    DispatchQueue.main.asyncAfter(deadline: delay) {
                        self?.openSafariExtensionPreferences(retryCount: retryCount + 1)
                    }
                }
                return
            }

            if let error = error {
                NSLog("ReDD Focus: showPreferencesForExtension failed after retry: \(error.localizedDescription)")
                self?.launchSafari { _ in }
                DispatchQueue.main.async {
                    let alert = NSAlert()
                    alert.messageText = "Open Safari → Settings → Extensions"
                    alert.informativeText = "We couldn't open the Extensions pane automatically. Safari has been launched — please choose Safari → Settings → Extensions and enable ReDD Focus."
                    alert.alertStyle = .informational
                    alert.addButton(withTitle: "OK")
                    alert.runModal()
                }
                return
            }

            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }

    private func launchSafari(completion: @escaping (Bool) -> Void) {
        guard let safariURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Safari") else {
            completion(false)
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = false
        NSWorkspace.shared.openApplication(at: safariURL, configuration: configuration) { _, error in
            completion(error == nil)
        }
    }
#endif

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let messageBody = message.body as? String else {
            NSLog("ReDD Focus: received message with non-string body: \(message.body)")
            return
        }

        NSLog("ReDD Focus: received message from web view: \(messageBody)")

#if os(macOS)
        if (messageBody != "open-preferences") {
            return;
        }

        openSafariExtensionPreferences()
#elseif os(iOS)
        if (messageBody != "open-safari") {
            return;
        }
        
        // Open Safari on iOS by opening a simple URL
        if let safariURL = URL(string: "https://www.youtube.com/") {
            UIApplication.shared.open(safariURL, options: [:], completionHandler: nil)
        }
#endif
    }

}
