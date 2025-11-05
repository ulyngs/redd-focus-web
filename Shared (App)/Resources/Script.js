function show(platform, enabled) {
    document.body.classList.add(`platform-${platform}`);

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

function openSafari() {
    webkit.messageHandlers.controller.postMessage("open-safari");
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
