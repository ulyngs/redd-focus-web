function show(platform, enabled) {
    document.body.classList.add(`platform-${platform}`);
    
    // Detect iPad vs iPhone on iOS
    if (platform === 'ios') {
        const isIPad = navigator.userAgent.includes('iPad') || 
                      (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
        
        if (isIPad) {
            document.body.classList.add('platform-ipad');
        } else {
            document.body.classList.add('platform-iphone');
        }
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

/// Called from the native side when the rename notice should be shown; see
/// RebrandNotice.swift for the gating. Dismissal is one-way — the native side
/// records it so the notice never appears again.
function showRebrandNotice() {
    document.body.classList.add("show-rebrand-notice");
}

function dismissRebrandNotice() {
    document.body.classList.remove("show-rebrand-notice");
    postToController("rebrand-notice-dismissed");
}

function postToController(message) {
    if (typeof webkit === "undefined" ||
        !webkit.messageHandlers ||
        !webkit.messageHandlers.controller) {
        console.error("ReDD Focus: webkit.messageHandlers.controller is unavailable");
        return;
    }
    webkit.messageHandlers.controller.postMessage(message);
}

function openPreferences() {
    console.log("ReDD Focus: openPreferences clicked");
    postToController("open-preferences");
}

function openSafari() {
    console.log("ReDD Focus: openSafari clicked");
    postToController("open-safari");
}

// Initialize event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    // Open Safari button
    const openSafariBtn = document.querySelector("button.open-safari-btn");
    if (openSafariBtn) {
        openSafariBtn.addEventListener("click", openSafari);
    }

    // Open Preferences button (for macOS)
    const openPreferencesBtn = document.querySelector("button.open-preferences");
    if (openPreferencesBtn) {
        openPreferencesBtn.addEventListener("click", openPreferences);
    }

    // Rename notice continue button
    const rebrandContinueBtn = document.getElementById("rebrand-notice-continue-btn");
    if (rebrandContinueBtn) {
        rebrandContinueBtn.addEventListener("click", dismissRebrandNotice);
    }

    // Optional section toggle
    const optionalToggle = document.getElementById("optional-toggle");
    const optionalSection = document.querySelector(".optional-section");
    const optionalContent = document.getElementById("optional-content");
    
    if (optionalToggle && optionalSection) {
        // Initially collapsed (chevron points down when collapsed)
        optionalSection.classList.add("collapsed");
        
        optionalToggle.addEventListener("click", function() {
            optionalSection.classList.toggle("collapsed");
        });
    }

    // Video preview click to expand
    const videoPreview = document.getElementById("video-preview");
    const videoExpanded = document.getElementById("video-expanded");
    
    if (videoPreview && videoExpanded) {
        videoPreview.addEventListener("click", function() {
            if (videoExpanded.style.display === "none") {
                videoExpanded.style.display = "block";
                videoPreview.style.display = "none";
                // Auto-play video when expanded
                const video = videoExpanded.querySelector("video");
                if (video) {
                    video.play();
                }
            } else {
                videoExpanded.style.display = "none";
                videoPreview.style.display = "flex";
                // Pause video when collapsed
                const video = videoExpanded.querySelector("video");
                if (video) {
                    video.pause();
                }
            }
        });
    }
});
