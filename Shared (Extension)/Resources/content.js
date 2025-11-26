(function () {

    // --- All helper functions are defined first, making them available to the entire script ---

    const shadowSelectors = {
        "redditPopular": "left-nav-top-section",
        "redditAll": "left-nav-top-section",
    };

    function createStyleElement(some_style_id, some_css) {
        const elementToHide = some_style_id.replace("Style", "");
        let domRoot = document.head;
        if (elementToHide in shadowSelectors) {
            const shadowHostSelector = shadowSelectors[elementToHide];
            const shadowHost = document.querySelector(shadowHostSelector);
            if (shadowHost && shadowHost.shadowRoot) {
                domRoot = shadowHost.shadowRoot;
            } else {
                return;
            }
        }
        let styleElement = domRoot.querySelector("#" + some_style_id);
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = some_style_id;
            styleElement.textContent = some_css;
            domRoot.appendChild(styleElement);
        } else {
            if (styleElement.textContent !== some_css) {
                styleElement.textContent = some_css;
            }
        }
    }

    function generateCSSSelector(el) {
        if (!(el instanceof Element)) return null;
        if (el.id) {
            const idSelector = `#${CSS.escape(el.id)}`;
            try {
                if (document.querySelectorAll(idSelector).length === 1) return idSelector;
            } catch (e) { }
        }
        let path = [];
        let currentEl = el;
        while (currentEl && currentEl !== document.documentElement && currentEl !== document.body) {
            let selector = currentEl.nodeName.toLowerCase();
            let parent = currentEl.parentElement;
            if (!parent) break;
            let index = 1;
            let sibling = currentEl.previousElementSibling;
            while (sibling) {
                if (sibling.nodeName.toLowerCase() === selector) index++;
                sibling = sibling.previousElementSibling;
            }
            if (index > 1) {
                let ofTypeIndex = 1;
                let ofTypeSibling = currentEl.previousElementSibling;
                while (ofTypeSibling) {
                    if (ofTypeSibling.nodeName.toLowerCase() === selector) ofTypeIndex++;
                    ofTypeSibling = ofTypeSibling.previousElementSibling;
                }
                selector += (ofTypeIndex === index) ? `:nth-of-type(${index})` : `:nth-child(${index})`;
            } else {
                let nextSibling = currentEl.nextElementSibling;
                let hasSimilarNext = false;
                while (nextSibling) {
                    if (nextSibling.nodeName.toLowerCase() === selector) {
                        hasSimilarNext = true;
                        break;
                    }
                    nextSibling = nextSibling.nextElementSibling;
                }
                if (hasSimilarNext) selector += ':nth-of-type(1)';
            }
            path.unshift(selector);
            currentEl = parent;
        }
        if (path.length === 0) return null;
        const fullPath = path.join(' > ');
        try {
            const elements = document.querySelectorAll(fullPath);
            if (elements.length !== 1) {
                const bodyPath = `body > ${fullPath}`;
                if (document.querySelectorAll(bodyPath).length === 1) return bodyPath;
            }
            return fullPath;
        } catch (e) {
            console.error("Error validating generated selector:", fullPath, e);
            return null;
        }
    }

    let isSelecting = false;
    let highlightOverlay = null;
    let selectorDisplay = null;
    let feedbackContainer = null;
    let currentHighlightedElement = null;
    let lastTapTime = 0;
    let sessionHiddenSelectors = [];
    // Expose session-only selectors so other parts can read/merge
    window.__vfSessionCustomSelectors = sessionHiddenSelectors;
    const highlightStyleId = 'mindshield-highlight-style';

    function createHighlightOverlay() {
        if (!highlightOverlay) {
            highlightOverlay = document.createElement('div');
            highlightOverlay.style.position = 'absolute';
            highlightOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            highlightOverlay.style.border = '1px dashed red';
            highlightOverlay.style.zIndex = '2147483646';
            highlightOverlay.style.pointerEvents = 'none';
            highlightOverlay.style.margin = '0';
            highlightOverlay.style.padding = '0';
            highlightOverlay.style.boxSizing = 'border-box';
            document.body.appendChild(highlightOverlay);
        }
    }

    function createSelectorDisplay() {
        if (!selectorDisplay) {
            selectorDisplay = document.createElement('div');
            selectorDisplay.style.position = 'fixed';
            selectorDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
            selectorDisplay.style.color = 'white';
            selectorDisplay.style.padding = '3px 6px';
            selectorDisplay.style.borderRadius = '3px';
            selectorDisplay.style.zIndex = '2147483647';
            selectorDisplay.style.fontSize = '11px';
            selectorDisplay.style.fontFamily = 'monospace';
            selectorDisplay.style.pointerEvents = 'none';
            selectorDisplay.style.maxWidth = '300px';
            selectorDisplay.style.whiteSpace = 'nowrap';
            selectorDisplay.style.overflow = 'hidden';
            selectorDisplay.style.textOverflow = 'ellipsis';
            document.body.appendChild(selectorDisplay);
        }
    }

    function createFeedbackContainer() {
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.id = 'mindshield-feedback-container';
            feedbackContainer.style.position = 'fixed';
            feedbackContainer.style.top = '100px';
            feedbackContainer.style.left = '10px';
            feedbackContainer.style.background = 'rgba(15, 17, 27, 0.92)';
            feedbackContainer.style.color = '#e4e4e7';
            feedbackContainer.style.padding = '10px 14px';
            feedbackContainer.style.borderRadius = '12px';
            feedbackContainer.style.border = '1px solid rgba(39, 39, 42, 0.85)';
            feedbackContainer.style.boxShadow = '0 12px 30px rgba(2, 6, 23, 0.22)';
            feedbackContainer.style.zIndex = '2147483647';
            feedbackContainer.style.fontFamily = '"Arial", sans-serif';
            feedbackContainer.style.fontSize = '13px';
            feedbackContainer.style.display = 'flex';
            feedbackContainer.style.alignItems = 'center';
            feedbackContainer.style.gap = '8px';
            feedbackContainer.style.cursor = 'move';
            feedbackContainer.style.userSelect = 'none';
            feedbackContainer.style.minWidth = '230px';
            feedbackContainer.style.maxWidth = '320px';
            feedbackContainer.style.flexWrap = 'nowrap';
            document.body.appendChild(feedbackContainer);
            // Get initial count if elements are already hidden
            if (currentSiteIdentifier) {
                const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
                chrome.storage.sync.get(customStorageKey, function (result) {
                    let customSelectors = result[customStorageKey] || [];
                    if (!Array.isArray(customSelectors)) customSelectors = [];
                    const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                    updateFeedbackMessage('Click element to hide it', merged.length > 0, merged.length);
                });
            } else {
                updateFeedbackMessage('Click element to hide it');
            }
            setupDragEvents();
        }
    }

    function setupDragEvents() {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        function startDragging(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            initialX = (e.clientX || e.touches[0].clientX) - currentX;
            initialY = (e.clientY || e.touches[0].clientY) - currentY;
            isDragging = true;
            feedbackContainer.style.transition = 'none';
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            let clientX = e.clientX || (e.touches && e.touches[0].clientX);
            let clientY = e.clientY || (e.touches && e.touches[0].clientY);
            currentX = clientX - initialX;
            currentY = clientY - initialY;
            currentX = Math.max(0, Math.min(currentX, window.innerWidth - feedbackContainer.offsetWidth));
            currentY = Math.max(0, Math.min(currentY, window.innerHeight - feedbackContainer.offsetHeight));
            feedbackContainer.style.left = `${currentX}px`;
            feedbackContainer.style.top = `${currentY}px`;
        }

        function stopDragging() {
            isDragging = false;
            feedbackContainer.style.transition = 'all 0.2s ease';
        }

        currentX = parseInt(feedbackContainer.style.left) || 10;
        currentY = parseInt(feedbackContainer.style.top) || 10;
        feedbackContainer.addEventListener('mousedown', startDragging);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDragging);
        feedbackContainer.addEventListener('touchstart', startDragging, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDragging);
    }

    function styleFeedbackButton(button, variant = 'primary') {
        button.style.borderRadius = '9999px';
        button.style.padding = '4px 12px';
        button.style.fontSize = '12px';
        button.style.fontWeight = '600';
        button.style.lineHeight = '1.4';
        button.style.borderWidth = '1px';
        button.style.borderStyle = 'solid';
        button.style.cursor = 'pointer';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.gap = '4px';
        button.style.backgroundClip = 'padding-box';
        button.style.transition = 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease';

        if (variant === 'secondary') {
            button.style.background = 'rgba(228, 228, 231, 0.06)';
            button.style.color = '#d4d4d8';
            button.style.borderColor = 'rgba(63, 63, 70, 0.85)';
        } else {
            button.style.background = '#F1F6FE';
            button.style.color = '#1c2541';
            button.style.borderColor = '#c7d7fb';
        }

        button.addEventListener('mouseenter', () => {
            if (variant === 'secondary') {
                button.style.background = 'rgba(228, 228, 231, 0.14)';
            } else {
                button.style.background = '#e5eeff';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (variant === 'secondary') {
                button.style.background = 'rgba(228, 228, 231, 0.06)';
            } else {
                button.style.background = '#F1F6FE';
            }
        });
    }

    function updateFeedbackMessage(message, showUndo = false, count = null) {
        if (!feedbackContainer) return;
        feedbackContainer.innerHTML = '';

        let displayMessage = message;
        if (count !== null && count > 0) {
            displayMessage = `${count} ${count === 1 ? 'element' : 'elements'} hidden`;
        }

        const messageSpan = document.createElement('span');
        messageSpan.textContent = displayMessage;
        messageSpan.style.fontSize = '14px';
        messageSpan.style.fontWeight = '500';
        messageSpan.style.flex = '1';
        messageSpan.style.minWidth = '100px';
        messageSpan.style.color = '#e4e4e7';
        messageSpan.style.marginRight = showUndo ? '6px' : '4px';
        feedbackContainer.appendChild(messageSpan);

        if (showUndo) {
            const undoButton = document.createElement('button');
            undoButton.textContent = 'Undo';
            styleFeedbackButton(undoButton, 'secondary');
            undoButton.addEventListener('click', handleUndo);
            undoButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUndo();
            });
            feedbackContainer.appendChild(undoButton);
        }

        const doneButton = document.createElement('button');
        doneButton.textContent = 'Done';
        styleFeedbackButton(doneButton, 'primary');
        doneButton.addEventListener('click', () => stopSelecting(false));
        doneButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            stopSelecting(false);
        });
        feedbackContainer.appendChild(doneButton);
    }

    function handleUndo() {
        if (sessionHiddenSelectors.length === 0 || !currentSiteIdentifier) return;
        const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
        const rememberKey = `${currentSiteIdentifier}RememberSettings`;
        chrome.storage.sync.get([customStorageKey, rememberKey], function (result) {
            let customSelectors = result[customStorageKey] || [];
            if (!Array.isArray(customSelectors)) customSelectors = [];
            const selectorToRemove = sessionHiddenSelectors.pop();
            const rememberEnabled = result[rememberKey] !== false; // default true

            if (rememberEnabled) {
                // Remove from persistent storage if present
                customSelectors = customSelectors.filter(s => s !== selectorToRemove);
                chrome.storage.sync.set({ [customStorageKey]: customSelectors }, function () {
                    if (chrome.runtime.lastError) {
                        console.error("Error removing custom selector from storage:", chrome.runtime.lastError);
                    }
                    // Reapply merged (persistent + remaining session)
                    const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                    applyCustomElementStyles(currentSiteIdentifier, merged);
                    updateFeedbackMessage('Click element to hide it', merged.length > 0, merged.length);
                });
            } else {
                // Session-only: just reapply merged without touching storage
                const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                applyCustomElementStyles(currentSiteIdentifier, merged);
                updateFeedbackMessage('Click element to hide it', merged.length > 0, merged.length);
            }
        });
    }

    function startSelecting() {
        if (isSelecting) return;
        isSelecting = true;
        createHighlightOverlay();
        createSelectorDisplay();
        createFeedbackContainer();
        document.addEventListener('mousemove', highlightElement, { capture: true });
        document.addEventListener('touchstart', highlightElement, { capture: true });
        document.addEventListener('click', selectElementOnClick, { capture: true });
        document.addEventListener('touchend', selectElementOnTap, { capture: true });
        document.addEventListener('keydown', handleKeydown, { capture: true });
        
        // Update storage to reflect that selection has started
        if (currentSiteIdentifier) {
            chrome.storage.sync.set({ [`${currentSiteIdentifier}SelectionActive`]: true });
        }
    }

    function stopSelecting(cancelled = false) {
        if (!isSelecting) return;
        isSelecting = false;
        document.removeEventListener('mousemove', highlightElement, { capture: true });
        document.removeEventListener('touchstart', highlightElement, { capture: true });
        document.removeEventListener('click', selectElementOnClick, { capture: true });
        document.removeEventListener('touchend', selectElementOnTap, { capture: true });
        document.removeEventListener('keydown', handleKeydown, { capture: true });
        if (feedbackContainer) feedbackContainer.remove();
        if (highlightOverlay) highlightOverlay.remove();
        if (selectorDisplay) selectorDisplay.remove();
        const tempStyle = document.getElementById(highlightStyleId);
        if (tempStyle) tempStyle.remove();
        feedbackContainer = highlightOverlay = selectorDisplay = currentHighlightedElement = null;
        // Keep sessionHiddenSelectors so session rules persist until refresh
        
        // Update storage to reflect that selection has stopped
        if (currentSiteIdentifier) {
            chrome.storage.sync.set({ [`${currentSiteIdentifier}SelectionActive`]: false });
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && isSelecting) {
            event.preventDefault();
            event.stopImmediatePropagation();
            stopSelecting(true);
        }
    }

    function highlightElement(event) {
        if (!isSelecting) return;
        const el = event.target;
        if (!el || el === highlightOverlay || el === selectorDisplay || el.closest('#mindshield-feedback-container')) {
            if (highlightOverlay) highlightOverlay.style.display = 'none';
            if (selectorDisplay) selectorDisplay.style.display = 'none';
            currentHighlightedElement = null;
            return;
        }
        currentHighlightedElement = el;
        const selector = generateCSSSelector(el);
        let posX, posY;
        if (event.touches && event.touches.length > 0) { posX = event.touches[0].clientX; posY = event.touches[0].clientY; }
        else if (event.clientX !== undefined) { posX = event.clientX; posY = event.clientY; }
        else { return; }
        if (selectorDisplay) {
            selectorDisplay.textContent = selector || "Cannot select this element";
            const displayPosX = posX + 15;
            const displayPosY = posY + 15;
            selectorDisplay.style.left = `${Math.min(displayPosX, window.innerWidth - selectorDisplay.offsetWidth - 10)}px`;
            selectorDisplay.style.top = `${Math.min(displayPosY, window.innerHeight - selectorDisplay.offsetHeight - 10)}px`;
            selectorDisplay.style.display = 'block';
        }
        if (highlightOverlay) {
            const rect = el.getBoundingClientRect();
            highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
            highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
            highlightOverlay.style.width = `${rect.width}px`;
            highlightOverlay.style.height = `${rect.height}px`;
            highlightOverlay.style.display = 'block';
        }
    }

    function selectElementOnClick(event) {
        if (Date.now() - lastTapTime < 500) { event.preventDefault(); event.stopPropagation(); return; }
        if (!isSelecting || event.target.closest('#mindshield-feedback-container') || event.target.tagName === 'BUTTON' || event.target !== currentHighlightedElement) return;
        event.preventDefault();
        event.stopPropagation();
        processSelectedElement(currentHighlightedElement);
    }

    function selectElementOnTap(event) {
        lastTapTime = Date.now();
        if (!isSelecting || event.target.closest('#mindshield-feedback-container') || event.target.tagName === 'BUTTON' || !currentHighlightedElement) return;
        event.preventDefault();
        event.stopPropagation();
        processSelectedElement(currentHighlightedElement);
    }

    function processSelectedElement(el) {
        if (!el || el === document.body || el === document.documentElement) return;
        const selector = generateCSSSelector(el);
        if (!selector || !currentSiteIdentifier) {
            console.warn("Could not generate a reliable selector for the element or site identifier is missing.");
            return;
        }
        const storageKey = `${currentSiteIdentifier}CustomHiddenElements`;
        const rememberKey = `${currentSiteIdentifier}RememberSettings`;
        chrome.storage.sync.get([storageKey, rememberKey], function (result) {
            let customSelectors = result[storageKey] || [];
            if (!Array.isArray(customSelectors)) customSelectors = [];
            const rememberEnabled = result[rememberKey] !== false; // default true
            const alreadyHas = customSelectors.includes(selector) || sessionHiddenSelectors.includes(selector);
            if (alreadyHas) {
                const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                updateFeedbackMessage('Element already hidden', false, merged.length);
                return;
            }
            sessionHiddenSelectors.push(selector);
            if (rememberEnabled) {
                // Persist
                const toSave = Array.from(new Set([...customSelectors, selector]));
                chrome.storage.sync.set({ [storageKey]: toSave }, function () {
                    if (chrome.runtime.lastError) {
                        console.error("Error saving custom selectors:", chrome.runtime.lastError);
                    }
                    // Apply merged to ensure immediate effect
                    const merged = Array.from(new Set([...toSave, ...sessionHiddenSelectors]));
                    applyCustomElementStyles(currentSiteIdentifier, merged);
                    updateFeedbackMessage('Element hidden', true, merged.length);
                });
            } else {
                // Session only — apply without saving
                const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                applyCustomElementStyles(currentSiteIdentifier, merged);
                updateFeedbackMessage('Element hidden (session only)', true, merged.length);
            }
        });
    }

    function applyCustomElementStyles(siteIdentifier, selectors) {
        const styleId = `customHidden_${siteIdentifier.replace(/\./g, '_')}Style`;
        // Support both old format (string) and new format (object with name and selector)
        const css = selectors.length > 0 ? selectors.map(item => {
            const selector = typeof item === 'string' ? item : (item.selector || item);
            return `${selector} { display: none !important; }`;
        }).join('\n') : '';
        createStyleElement(styleId, css);
    }

    // --- Calculate site-specific identifiers ---
    let currentPlatform = null;
    const currentHostname = window.location.hostname;

    for (const platform in platformHostnames) {
        if (platformHostnames[platform].includes(currentHostname)) {
            currentPlatform = platform;
            break;
        }
    }
    const currentSiteIdentifier = currentPlatform || currentHostname;

    // Session-only overrides for this page lifetime
    let sessionOverrides = {};

    // --- Listen for storage changes to apply settings immediately ---
    let lastAppliedSettings = {};
    let lastAppliedCustomElements = {};
    
    function applySettingsFromStorage() {
        if (!chrome.runtime?.id) // don't run if disconnected
            return;

        if (currentPlatform) {
            const platformStatusKey = `${currentPlatform}Status`;
            chrome.storage.sync.get(platformStatusKey, function (platformResult) {
                let platformIsOn = platformResult[platformStatusKey] !== false;
                if (Object.prototype.hasOwnProperty.call(sessionOverrides, platformStatusKey)) {
                    platformIsOn = sessionOverrides[platformStatusKey] !== false;
                }
                
                elementsThatCanBeHidden
                    .filter(element => element.startsWith(currentPlatform))
                    .forEach(function (item) {
                        const styleName = item + "Style";
                        const itemStatusKey = item + "Status";
                        
                        // Check if we need to update this element
                        let currentSetting = platformIsOn ? (lastAppliedSettings[item] || "default") : "platformDisabled";
                        
                        // For multi-state elements, we need to get the actual stored value
                        if (platformIsOn && (item === "youtubeThumbnails" || item === "youtubeNotifications")) {
                            chrome.storage.sync.get(itemStatusKey, function (itemResult) {
                                let statusValue = itemResult[itemStatusKey];
                                if (Object.prototype.hasOwnProperty.call(sessionOverrides, itemStatusKey)) {
                                    statusValue = sessionOverrides[itemStatusKey];
                                }
                                let newSetting = statusValue || "On";
                                
                                if (currentSetting !== newSetting) {
                                    let cssToApply = cssSelectors[item + "Css" + newSetting];
                                    lastAppliedSettings[item] = newSetting;
                                    createStyleElement(styleName, cssToApply);
                                }
                            });
                        } else {
                            let storedDefault = platformResult[itemStatusKey];
                            if (Object.prototype.hasOwnProperty.call(sessionOverrides, itemStatusKey)) {
                                storedDefault = sessionOverrides[itemStatusKey];
                            }
                            let newSetting = platformIsOn ? (storedDefault || "On") : "platformDisabled";
                            
                            if (currentSetting !== newSetting) {
                                if (!platformIsOn) {
                                    // Platform is disabled, show all elements
                                    createStyleElement(styleName, cssSelectors[item + "CssOn"]);
                                    lastAppliedSettings[item] = "platformDisabled";
                                } else {
                                    // Platform is enabled, check individual element status
                                    chrome.storage.sync.get(itemStatusKey, function (itemResult) {
                                        let statusValue = itemResult[itemStatusKey];
                                        if (Object.prototype.hasOwnProperty.call(sessionOverrides, itemStatusKey)) {
                                            statusValue = sessionOverrides[itemStatusKey];
                                        }
                                        let cssToApply;
                                        
                                        if (item === "youtubeThumbnails" || item === "youtubeNotifications") {
                                            let state = statusValue || "On";
                                            cssToApply = cssSelectors[item + "Css" + state];
                                            lastAppliedSettings[item] = state;
                                        } else if (item === "linkedinFeed") {
                                            let isFeedPage = window.location.pathname === '/' || window.location.pathname === '/feed/';
                                            cssToApply = (statusValue === true && isFeedPage) ? cssSelectors[item + "CssOff"] : cssSelectors[item + "CssOn"];
                                            lastAppliedSettings[item] = statusValue === true && isFeedPage ? "hidden" : "visible";
                                        } else {
                                            cssToApply = (statusValue === true) ? cssSelectors[item + "CssOff"] : cssSelectors[item + "CssOn"];
                                            lastAppliedSettings[item] = statusValue === true ? "hidden" : "visible";
                                        }
                                        createStyleElement(styleName, cssToApply);
                                    });
                                }
                            }
                        }
                    });
            });
        }
        
        // Also check for custom element changes
        if (currentSiteIdentifier) {
            const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
            chrome.storage.sync.get(customStorageKey, function (result) {
                let customSelectors = result[customStorageKey] || [];
                if (!Array.isArray(customSelectors)) customSelectors = [];
                // Merge session-only selectors for this page
                const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
                // Check if custom elements have changed
                const currentCustomElements = lastAppliedCustomElements[currentSiteIdentifier] || [];
                if (JSON.stringify(merged) !== JSON.stringify(currentCustomElements)) {
                    applyCustomElementStyles(currentSiteIdentifier, merged);
                    lastAppliedCustomElements[currentSiteIdentifier] = [...merged];
                }
            });
            
            // Check for selection state changes
            const selectionKey = `${currentSiteIdentifier}SelectionActive`;
            chrome.storage.sync.get(selectionKey, function (result) {
                const shouldBeSelecting = result[selectionKey] === true;
                if (shouldBeSelecting && !isSelecting) {
                    startSelecting();
                } else if (!shouldBeSelecting && isSelecting) {
                    stopSelecting(false);
                }
            });
        }
    }
    
    // Listen for storage changes to be responsive
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'sync') {
            let hasRelevantChanges = false;
            
            // Check platform-specific changes
            if (currentPlatform) {
                for (let key in changes) {
                    if (key === `${currentPlatform}Status` || 
                        (key.endsWith('Status') && elementsThatCanBeHidden.some(elem => elem.startsWith(currentPlatform) && elem + 'Status' === key))) {
                        hasRelevantChanges = true;
                        break;
                    }
                }
            }
            
            // Check custom element changes
            if (currentSiteIdentifier) {
                const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
                const selectionKey = `${currentSiteIdentifier}SelectionActive`;
                if (changes[customStorageKey] || changes[selectionKey]) {
                    hasRelevantChanges = true;
                }
            }
            
            if (hasRelevantChanges) {
                // Apply changes immediately
                setTimeout(applySettingsFromStorage, 100);
            }
        }
    });
    
    // Also poll every 1 second as a safety net
    setInterval(applySettingsFromStorage, 1000);

    // --- Handle session override messages and export for Save ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || !message.type) return;
        if (message.type === 'sessionOverride') {
            sessionOverrides[message.key] = message.value;
            setTimeout(applySettingsFromStorage, 50);
        } else if (message.type === 'getSessionOverrides') {
            const customKey = `${currentSiteIdentifier}CustomHiddenElements`;
            chrome.storage.sync.get(customKey, function (result) {
                let baseSelectors = result[customKey] || [];
                if (!Array.isArray(baseSelectors)) baseSelectors = [];
                const mergedSelectors = Array.from(new Set([...baseSelectors, ...sessionHiddenSelectors]));
                sendResponse({ overrides: sessionOverrides, customSelectors: mergedSelectors });
            });
            return true; // async response
        }
    });

    // --- Perform one-time initial setup, protected by the flag ---
    if (window.hasRun) {
        console.log(`ReDD Focus listener re-established for: ${currentSiteIdentifier}. Page already initialized.`);
        return;
    }
    window.hasRun = true;

    console.log(`ReDD Focus running on: ${currentSiteIdentifier}. (Detected Platform: ${currentPlatform || 'None'})`);

    // Initial application of settings (polling will handle subsequent changes)
    if (currentPlatform) {
        const platformStatusKey = `${currentPlatform}Status`;
        chrome.storage.sync.get(platformStatusKey, function (platformResult) {
            let platformIsOn = platformResult[platformStatusKey] !== false;
            elementsThatCanBeHidden
                .filter(element => element.startsWith(currentPlatform))
                .forEach(function (item) {
                    const styleName = item + "Style";
                    const itemStatusKey = item + "Status";
                    if (!platformIsOn) {
                        createStyleElement(styleName, cssSelectors[item + "CssOn"]);
                        lastAppliedSettings[item] = "platformDisabled";
                    } else {
                        chrome.storage.sync.get(itemStatusKey, function (itemResult) {
                            let statusValue = itemResult[itemStatusKey];
                            let cssToApply;
                            if (item === "youtubeThumbnails" || item === "youtubeNotifications") {
                                let state = statusValue || "On";
                                cssToApply = cssSelectors[item + "Css" + state];
                                lastAppliedSettings[item] = state;
                            } else if (item === "linkedinFeed") {
                                let isFeedPage = window.location.pathname === '/' || window.location.pathname === '/feed/';
                                cssToApply = (statusValue === true && isFeedPage) ? cssSelectors[item + "CssOff"] : cssSelectors[item + "CssOn"];
                                lastAppliedSettings[item] = statusValue === true && isFeedPage ? "hidden" : "visible";
                            } else {
                                cssToApply = (statusValue === true) ? cssSelectors[item + "CssOff"] : cssSelectors[item + "CssOn"];
                                lastAppliedSettings[item] = statusValue === true ? "hidden" : "visible";
                            }
                            createStyleElement(styleName, cssToApply);
                        });
                    }
                });
        });
    }

    if (currentSiteIdentifier) {
        const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
        chrome.storage.sync.get(customStorageKey, function (result) {
            if (chrome.runtime.lastError) {
                console.error(`Storage error for ${customStorageKey}:`, chrome.runtime.lastError);
                return;
            }
            let customSelectors = result[customStorageKey] || [];
            if (!Array.isArray(customSelectors)) customSelectors = [];
            const merged = Array.from(new Set([...customSelectors, ...sessionHiddenSelectors]));
            applyCustomElementStyles(currentSiteIdentifier, merged);
            if (merged.length > 0) {
                console.log(`Applied ${merged.length} custom rules for ${currentSiteIdentifier}`);
            }
        });
    }

})();
