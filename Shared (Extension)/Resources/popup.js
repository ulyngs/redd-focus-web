document.addEventListener('DOMContentLoaded', function () {
    initializePopup();

    function initializePopup() {
        console.log("Popup initialized.");

        // hide payment field for now
        const paymentField = document.getElementById('payment-status');
        paymentField.style.display = 'none';

        // ========================================
        // Theme Management
        // ========================================

        // Media query for system preference
        const systemDarkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        /**
         * Apply theme to the document based on preference
         * @param {string} theme - 'system', 'light', or 'dark'
         */
        function applyTheme(theme) {
            const root = document.documentElement;

            if (theme === 'dark') {
                root.classList.add('dark-mode');
            } else if (theme === 'light') {
                root.classList.remove('dark-mode');
            } else {
                // 'system' - match OS/browser preference
                if (systemDarkModeQuery.matches) {
                    root.classList.add('dark-mode');
                } else {
                    root.classList.remove('dark-mode');
                }
            }
        }

        /**
         * Handle system preference change when theme is set to 'system'
         */
        function handleSystemThemeChange(e) {
            chrome.storage.sync.get('themePreference', function (result) {
                if (result.themePreference === 'system' || !result.themePreference) {
                    applyTheme('system');
                }
            });
        }

        // Listen for system theme changes
        systemDarkModeQuery.addEventListener('change', handleSystemThemeChange);

        const THEME_LABELS = { system: 'Auto', light: 'Light', dark: 'Dark' };

        /**
         * Initialize theme from storage and set up the theme selector (custom list: option hover matches FAQ rows)
         */
        function setupTheme() {
            const themeRoot = document.getElementById('themeSelectRoot');
            const themeTrigger = document.getElementById('themeSelectTrigger');
            const themeTriggerText = document.getElementById('themeSelectTriggerText');
            const themeMenu = document.getElementById('themeSelectMenu');
            if (!themeRoot || !themeTrigger || !themeTriggerText || !themeMenu) return;

            // Detect mobile/tablet devices
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            if (isMobile) {
                const generalSection = document.getElementById('general-section');
                if (generalSection) generalSection.style.display = 'none';
                chrome.storage.sync.set({ themePreference: 'system' });
                applyTheme('system');
                return;
            }

            let currentThemeValue = 'system';

            function setTriggerLabel(value) {
                themeTriggerText.textContent = THEME_LABELS[value] || THEME_LABELS.system;
            }

            function syncOptionSelection() {
                themeMenu.querySelectorAll('[role="option"]').forEach(function (opt) {
                    const selected = opt.getAttribute('data-value') === currentThemeValue;
                    opt.setAttribute('aria-selected', selected ? 'true' : 'false');
                });
            }

            function closeThemeMenu() {
                themeMenu.hidden = true;
                themeTrigger.setAttribute('aria-expanded', 'false');
            }

            function openThemeMenu() {
                themeMenu.hidden = false;
                themeTrigger.setAttribute('aria-expanded', 'true');
                syncOptionSelection();
            }

            // Load saved theme preference
            chrome.storage.sync.get('themePreference', function (result) {
                currentThemeValue = result.themePreference || 'system';
                setTriggerLabel(currentThemeValue);
                applyTheme(currentThemeValue);
            });

            themeTrigger.addEventListener('click', function (e) {
                e.stopPropagation();
                const expanded = themeTrigger.getAttribute('aria-expanded') === 'true';
                if (expanded) {
                    closeThemeMenu();
                } else {
                    openThemeMenu();
                }
            });

            themeMenu.querySelectorAll('[role="option"]').forEach(function (option) {
                option.addEventListener('click', function (e) {
                    e.stopPropagation();
                    currentThemeValue = option.getAttribute('data-value') || 'system';
                    chrome.storage.sync.set({ themePreference: currentThemeValue });
                    applyTheme(currentThemeValue);
                    setTriggerLabel(currentThemeValue);
                    syncOptionSelection();
                    closeThemeMenu();
                });
            });

            document.addEventListener('click', function (e) {
                if (!themeRoot.contains(e.target)) {
                    closeThemeMenu();
                }
            });

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && themeTrigger.getAttribute('aria-expanded') === 'true') {
                    closeThemeMenu();
                    themeTrigger.focus();
                }
            });
        }

        // Setup theme immediately
        setupTheme();

        const MANUAL_CSS_SELECTORS_KEY = 'manualCssSelectorsEnabled';

        function applyManualCssSelectorsEnabled(enabled) {
            document.body.classList.toggle('manual-css-enabled', enabled);
        }

        function setupManualCssSelectors() {
            const toggle = document.getElementById('manualCssSelectorsToggle');
            if (!toggle) return;

            chrome.storage.sync.get(MANUAL_CSS_SELECTORS_KEY, function (result) {
                const enabled = result[MANUAL_CSS_SELECTORS_KEY] === true;
                toggle.checked = enabled;
                applyManualCssSelectorsEnabled(enabled);
            });

            toggle.addEventListener('change', function () {
                const enabled = toggle.checked;
                chrome.storage.sync.set({ [MANUAL_CSS_SELECTORS_KEY]: enabled });
                applyManualCssSelectorsEnabled(enabled);
            });
        }

        setupManualCssSelectors();

        // ========================================
        // EULA (ReDD 2FA parity: revision + storage.local)
        // ========================================
        const EULA_STORAGE_KEY = 'reddfocus_eula';
        const CURRENT_EULA_REVISION = 1;

        function showEulaOverlayThen(onAccept) {
            const eulaOverlay = document.getElementById('eula-overlay');
            if (!eulaOverlay) {
                onAccept();
                return;
            }
            const errorContainer = document.getElementById('error-prompt');
            const popupContainer = document.getElementById('popup-content');
            const reviewPrompt = document.getElementById('reviewPrompt');
            const messageContainer = document.getElementById('delay-content');
            const saveFooter = document.getElementById('save-controls');
            if (errorContainer) errorContainer.style.display = 'none';
            if (popupContainer) popupContainer.style.display = 'none';
            if (reviewPrompt) reviewPrompt.style.display = 'none';
            if (messageContainer) {
                messageContainer.style.display = 'none';
                messageContainer.classList.remove('show');
            }
            if (saveFooter) saveFooter.style.display = 'none';
            const foot = document.querySelector('footer');
            if (foot) foot.style.display = 'none';
            document.body.classList.add('eula-gate-active');
            document.documentElement.classList.add('eula-gate-active');
            eulaOverlay.style.display = 'block';
            const checkbox = document.getElementById('eula-agree-checkbox');
            const continueBtn = document.getElementById('eula-continue-btn');
            if (checkbox) checkbox.checked = false;
            if (continueBtn) continueBtn.disabled = true;

            function onCheckboxChange() {
                if (continueBtn) continueBtn.disabled = !checkbox || !checkbox.checked;
            }
            if (checkbox) {
                checkbox.addEventListener('change', onCheckboxChange);
            }
            if (!continueBtn) {
                onAccept();
                return;
            }
            continueBtn.addEventListener('click', function onContinue() {
                if (!checkbox || !checkbox.checked) return;
                continueBtn.removeEventListener('click', onContinue);
                if (checkbox) checkbox.removeEventListener('change', onCheckboxChange);
                const originalText = continueBtn.textContent;
                continueBtn.disabled = true;
                continueBtn.textContent = 'Continuing...';
                const toSet = {};
                toSet[EULA_STORAGE_KEY] = {
                    acceptedRevision: CURRENT_EULA_REVISION,
                    acceptedAt: Date.now()
                };
                chrome.storage.local.set(toSet, function () {
                    eulaOverlay.style.display = 'none';
                    document.body.classList.remove('eula-gate-active');
                    document.documentElement.classList.remove('eula-gate-active');
                    if (foot) foot.style.display = '';
                    continueBtn.textContent = originalText;
                    onAccept();
                });
            });
        }

        function runMain() {
        /*// Check payment status when popup opens"
        checkPaymentStatus();

        function checkPaymentStatus() {
            const paymentText = document.getElementById('payment-text');

            // Send message to check payment status
            chrome.runtime.sendMessage({ type: "checkPurchase" })
                .then(result => {
                    if (result === null) {
                        paymentText.textContent = 'Not available on this browser';
                    } else if (result && result.paid !== undefined) {
                        paymentText.textContent = result.paid ? 'Paid' : 'Not Paid';
                    } else {
                        paymentText.textContent = 'Error';
                    }
                })
                .catch(err => {
                    console.error("Error checking purchase:", err);
                    paymentText.textContent = 'Error';
                });
        }*/

        let isSelectionModeActive = false;
        let currentPlatform = null;
        let currentSiteIdentifier = null;
        let rememberSettingsEnabled = true; // default
        let isSettingsLocked = false;
        let protectedHiddenAtLock = new Set();
        let unlockWaitTime = 10;
        let unlockWaitText = "What's your intention?";

        function updateSaveFooterVisibility() {
            const saveFooterEl = document.getElementById('save-controls');
            if (!saveFooterEl) return;
            const delayEl = document.getElementById('delay-content');
            const isDelayVisible = !!delayEl && delayEl.style.display !== 'none';
            const shouldShow = (rememberSettingsEnabled === false) && !isDelayVisible;
            saveFooterEl.style.display = shouldShow ? 'block' : 'none';
        }

        const reviewLink = document.querySelector('#reviewPrompt .review-link');
        if (reviewLink && typeof window.getReviewStoreUrl === 'function') {
            reviewLink.href = window.getReviewStoreUrl();
        }

        let opensCount = localStorage.getItem('opensCount');
        opensCount = opensCount ? parseInt(opensCount, 10) + 1 : 1;
        localStorage.setItem('opensCount', opensCount);
        let noThanksClicked = localStorage.getItem('noThanksClicked') === 'true';
        if (opensCount % 10 === 0 && !noThanksClicked) {
            var reviewPrompt = document.getElementById('reviewPrompt');
            if (reviewPrompt) reviewPrompt.style.display = 'block';
        }
        document.getElementById('noThanksButton').addEventListener('click', function () {
            localStorage.setItem('noThanksClicked', 'true');
            var reviewPrompt = document.getElementById('reviewPrompt');
            if (reviewPrompt) reviewPrompt.style.display = 'none';
        });

        function setupUnlockSettings(siteIdentifier) {
            if (!siteIdentifier) return;

            const waitTextKey = `${siteIdentifier}WaitText`;
            const waitTimeKey = `${siteIdentifier}WaitTime`;

            chrome.storage.sync.get([waitTextKey, waitTimeKey, "waitText", "waitTime"], function (result) {
                const waitTextBox = document.getElementById("waitText");
                const waitTimeBox = document.getElementById("waitTime");
                const messageBox = document.getElementById("delay-message");
                const countdownBox = document.getElementById("delay-time");

                unlockWaitText = (result[waitTextKey] !== undefined ? result[waitTextKey] : result.waitText) || "What's your intention?";
                unlockWaitTime = (result[waitTimeKey] !== undefined ? result[waitTimeKey] : result.waitTime) || 10;

                if (waitTextBox) waitTextBox.value = unlockWaitText;
                if (waitTimeBox) waitTimeBox.value = unlockWaitTime;
                if (messageBox) messageBox.innerText = unlockWaitText;
                if (countdownBox) countdownBox.innerText = unlockWaitTime;
            });

            const waitTimeInput = document.getElementById("waitTime");
            if (waitTimeInput) {
                waitTimeInput.addEventListener('input', function () {
                    if (isSettingsLocked) return;
                    let waitValue = parseInt(this.value) || 10;
                    const waitTimeKey = `${siteIdentifier}WaitTime`;
                    unlockWaitTime = waitValue;
                    chrome.storage.sync.set({ [waitTimeKey]: waitValue });
                    const countdownBox = document.getElementById("delay-time");
                    if (countdownBox) countdownBox.innerText = waitValue;

                    const savedTextTime = document.getElementById("savedTextTime");
                    const maxLimit = 600;
                    const minLimit = 1;
                    if (isNaN(waitValue) || waitValue < minLimit) {
                        this.value = minLimit;
                    } else if (waitValue > maxLimit) {
                        if (savedTextTime) {
                            savedTextTime.innerText = "Maximum is " + maxLimit;
                            savedTextTime.hidden = false;
                            setTimeout(() => { savedTextTime.hidden = true; }, 2500);
                        }
                        this.value = maxLimit;
                    } else if (savedTextTime) {
                        savedTextTime.hidden = true;
                    }
                });
            }

            const waitTextInput = document.getElementById("waitText");
            if (waitTextInput) {
                waitTextInput.addEventListener('input', function () {
                    if (isSettingsLocked) return;
                    const waitTextKey = `${siteIdentifier}WaitText`;
                    unlockWaitText = this.value;
                    chrome.storage.sync.set({ [waitTextKey]: this.value });
                    const messageBox = document.getElementById("delay-message");
                    if (messageBox) messageBox.innerText = this.value;
                });
            }
        }

        function isElementHidden(elementKey, toggleEl) {
            if (!toggleEl) return false;
            if (toggleEl.tagName === 'BUTTON') {
                return toggleEl.getAttribute('data-state') !== 'On';
            }
            if (toggleEl.type === 'checkbox') {
                return toggleEl.checked;
            }
            return false;
        }

        function captureProtectedHiddenSnapshot() {
            protectedHiddenAtLock.clear();
            if (currentPlatform) {
                elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(function (item) {
                    const toggleEl = document.getElementById(item + 'Toggle');
                    if (isElementHidden(item, toggleEl)) {
                        protectedHiddenAtLock.add(item);
                    }
                });
            }
            if (currentSiteIdentifier) {
                const grayscaleToggle = document.getElementById('grayscaleToggle');
                if (grayscaleToggle && grayscaleToggle.checked) {
                    protectedHiddenAtLock.add(`${currentSiteIdentifier}Grayscale`);
                }
            }
        }

        function updateLockIcon() {
            const lockBtn = document.getElementById('settings-lock-btn');
            const unlockedIcon = document.getElementById('lock-icon-unlocked');
            const lockedIcon = document.getElementById('lock-icon-locked');
            if (!lockBtn || !unlockedIcon || !lockedIcon) return;

            unlockedIcon.style.display = isSettingsLocked ? 'none' : 'block';
            lockedIcon.style.display = isSettingsLocked ? 'block' : 'none';
            lockBtn.title = isSettingsLocked ? 'Unlock settings' : 'Lock settings';
            lockBtn.setAttribute('aria-label', lockBtn.title);
            lockBtn.setAttribute('aria-pressed', isSettingsLocked ? 'true' : 'false');

            const waitTimeInput = document.getElementById('waitTime');
            const waitTextInput = document.getElementById('waitText');
            const frictionCustomisation = document.querySelector('.friction-customisation');
            if (waitTimeInput) waitTimeInput.disabled = isSettingsLocked;
            if (waitTextInput) waitTextInput.disabled = isSettingsLocked;
            if (frictionCustomisation) {
                frictionCustomisation.classList.toggle('lock-protected-settings', isSettingsLocked);
            }
        }

        function updateLockProtectedUI() {
            if (currentPlatform) {
                elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(function (item) {
                    const toggleEl = document.getElementById(item + 'Toggle');
                    const row = toggleEl ? toggleEl.closest('.a-toggle') : null;
                    if (!row) return;
                    const shouldProtect = isSettingsLocked &&
                        protectedHiddenAtLock.has(item) &&
                        isElementHidden(item, toggleEl);
                    row.classList.toggle('lock-protected', shouldProtect);
                });
            }
            if (currentSiteIdentifier) {
                const grayscaleToggle = document.getElementById('grayscaleToggle');
                const grayscaleRow = document.getElementById('grayscale-toggle-row');
                if (grayscaleToggle && grayscaleRow) {
                    const grayscaleKey = `${currentSiteIdentifier}Grayscale`;
                    const shouldProtect = isSettingsLocked &&
                        protectedHiddenAtLock.has(grayscaleKey) &&
                        grayscaleToggle.checked;
                    grayscaleRow.classList.toggle('lock-protected', shouldProtect);
                }
            }
        }

        function persistLockState(siteIdentifier) {
            const lockKey = `${siteIdentifier}SettingsLocked`;
            chrome.storage.sync.set({ [lockKey]: isSettingsLocked });
        }

        function showConfirmDialog(title, message, confirmLabel, onConfirm) {
            const overlay = document.createElement('div');
            overlay.className = 'edit-dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'edit-dialog confirm-dialog';
            dialog.innerHTML = `
                <h3>${title}</h3>
                <p class="confirm-dialog-message">${message}</p>
                <div class="edit-dialog-buttons">
                    <button id="cancel-confirm" class="secondary-btn">Cancel</button>
                    <button id="accept-confirm" class="primary-btn">${confirmLabel}</button>
                </div>`;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.classList.add('modal-open');

            const closeDialog = function () {
                document.body.removeChild(overlay);
                document.body.classList.remove('modal-open');
            };

            document.getElementById('accept-confirm').addEventListener('click', function () {
                closeDialog();
                onConfirm();
            });
            document.getElementById('cancel-confirm').addEventListener('click', closeDialog);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeDialog();
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeDialog();
            });
        }

        function runUnlockCountdown(onComplete) {
            const popupContainer = document.getElementById('popup-content');
            const messageContainer = document.getElementById('delay-content');
            const errorContainer = document.getElementById('error-prompt');
            const messageBox = document.getElementById('delay-message');
            const countdownBox = document.getElementById('delay-time');
            const saveFooter = document.getElementById('save-controls');
            const helpContainer = document.getElementById('help-container');

            if (!popupContainer || !messageContainer || !countdownBox) {
                if (onComplete) onComplete();
                return;
            }

            if (messageBox) messageBox.innerText = unlockWaitText;
            let countdown = parseInt(unlockWaitTime, 10) || 10;
            countdownBox.innerText = countdown;

            popupContainer.style.display = 'none';
            if (helpContainer) helpContainer.style.display = 'none';
            if (errorContainer) errorContainer.style.display = 'none';
            if (saveFooter) saveFooter.style.display = 'none';
            messageContainer.style.display = 'block';
            setTimeout(() => messageContainer.classList.add('show'), 100);

            const timerId = setInterval(function () {
                countdown--;
                if (countdown >= 0) {
                    countdownBox.innerText = countdown;
                } else {
                    clearInterval(timerId);
                    messageContainer.style.display = 'none';
                    messageContainer.classList.remove('show');
                    popupContainer.style.display = 'block';
                    if (helpContainer) helpContainer.style.display = '';
                    if (errorContainer) errorContainer.style.display = 'none';
                    updateSaveFooterVisibility();
                    if (onComplete) onComplete();
                }
            }, 1000);
        }

        function applyToggleStateFromValue(item, value) {
            const toggleEl = document.getElementById(item + 'Toggle');
            if (!toggleEl) return;
            if (item === 'youtubeThumbnails') {
                toggleEl.setAttribute('data-state', value || 'On');
            } else {
                toggleEl.checked = !!value;
            }
        }

        function dismissPopupLoading() {
            document.body.classList.remove('popup-loading', 'lock-state-pending');
        }

        function revealPopupContent() {
            if (isSettingsLocked) {
                captureProtectedHiddenSnapshot();
                updateLockProtectedUI();
            }

            const popupContainer = document.getElementById('popup-content');
            const messageContainer = document.getElementById('delay-content');
            const errorContainer = document.getElementById('error-prompt');
            if (popupContainer) popupContainer.style.display = 'block';
            if (messageContainer) {
                messageContainer.style.display = 'none';
                messageContainer.classList.remove('show');
            }
            if (errorContainer) errorContainer.style.display = 'none';
            updateSaveFooterVisibility();
            dismissPopupLoading();
        }

        function initializePopupUI() {
            const lockKey = `${currentSiteIdentifier}SettingsLocked`;
            const rememberKey = `${currentSiteIdentifier}RememberSettings`;
            const grayscaleKey = `${currentSiteIdentifier}GrayscaleStatus`;
            const storageKeys = [lockKey, rememberKey, grayscaleKey, 'themePreference'];

            if (currentPlatform) {
                elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(function (item) {
                    storageKeys.push(item + 'Status');
                });
            }

            chrome.storage.sync.get(storageKeys, function (result) {
                isSettingsLocked = result[lockKey] === true;
                rememberSettingsEnabled = result[rememberKey] !== false;

                const themePref = result.themePreference || 'system';
                applyTheme(themePref);
                const themeTriggerText = document.getElementById('themeSelectTriggerText');
                if (themeTriggerText) {
                    themeTriggerText.textContent = THEME_LABELS[themePref] || THEME_LABELS.system;
                }

                if (currentPlatform) {
                    elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(function (item) {
                        applyToggleStateFromValue(item, result[item + 'Status']);
                    });
                }

                const grayscaleToggle = document.getElementById('grayscaleToggle');
                if (grayscaleToggle) {
                    grayscaleToggle.checked = result[grayscaleKey] === true;
                }

                const rememberToggle = document.getElementById('rememberSettingsToggle');
                if (rememberToggle) {
                    rememberToggle.checked = rememberSettingsEnabled;
                }

                updateLockIcon();
                updateSaveFooterVisibility();

                if (!rememberSettingsEnabled) {
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        if (!tabs || !tabs[0]) {
                            revealPopupContent();
                            return;
                        }
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'getSessionOverrides' }, function (response) {
                            if (response && response.overrides) {
                                applyOverridesToUI(response.overrides);
                            }
                            if (response && response.customSelectors && Array.isArray(response.customSelectors)) {
                                updateCustomElementsList(currentSiteIdentifier, response.customSelectors);
                            }
                            revealPopupContent();
                        });
                    });
                } else {
                    revealPopupContent();
                }
            });
        }

        function setupSettingsLock(siteIdentifier) {
            const lockBtn = document.getElementById('settings-lock-btn');
            if (!lockBtn || !siteIdentifier) return;

            lockBtn.style.display = currentPlatform ? '' : 'none';

            lockBtn.addEventListener('click', function () {
                if (!isSettingsLocked) {
                    const waitSecs = parseInt(unlockWaitTime, 10) || 10;
                    showConfirmDialog(
                        'Lock settings?',
                        `While locked, you won\u2019t be able to toggle elements that are already hidden on. You can still toggle other elements on and off. To unlock, you\u2019ll need to wait ${waitSecs} seconds.`,
                        'Lock',
                        function () {
                            captureProtectedHiddenSnapshot();
                            isSettingsLocked = true;
                            persistLockState(siteIdentifier);
                            updateLockIcon();
                            updateLockProtectedUI();
                        }
                    );
                } else {
                    runUnlockCountdown(function () {
                        isSettingsLocked = false;
                        protectedHiddenAtLock.clear();
                        persistLockState(siteIdentifier);
                        updateLockIcon();
                        updateLockProtectedUI();
                    });
                }
            });
        }

        function setupFrictionDelay(siteIdentifier) {
            /* replaced by setupUnlockSettings + setupSettingsLock */
            setupUnlockSettings(siteIdentifier);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isSelectionModeActive) {
                e.preventDefault();
                if (currentSiteIdentifier) {
                    chrome.storage.sync.set({ [`${currentSiteIdentifier}SelectionActive`]: false });
                }
                const addButtonId = currentPlatform
                    ? `${currentPlatform}AddElementButton`
                    : 'genericAddElementButton';
                const addButton = document.getElementById(addButtonId);
                if (addButton) {
                    isSelectionModeActive = false;
                    addButton.classList.remove('active');
                    addButton.textContent = 'Click to hide element';
                }
            }
        });

        function isRememberEnabled() {
            return rememberSettingsEnabled === true;
        }

        function applySettingChange(elementKey, value) {
            // elementKey examples: youtubeShorts, youtubeThumbnails, etc. Persist if remembering, else send session override
            const storageKey = elementKey + "Status";
            if (isRememberEnabled()) {
                let obj = {};
                obj[storageKey] = value;
                chrome.storage.sync.set(obj);
            } else {
                // session-only override for the active tab
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (tabs && tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'sessionOverride', key: storageKey, value: value });
                    }
                });
            }
        }

        function setCheckboxState(element_to_check, id_of_toggle) {
            var currentToggle = document.getElementById(id_of_toggle);
            if (!currentToggle) return;

            chrome.storage.sync.get(element_to_check + "Status", function (result) {
                currentToggle.checked = !!result[element_to_check + "Status"];
            });
        }

        function toggleViewStatusCheckbox(element_to_change, id_of_toggle) {
            var currentCheckbox = document.getElementById(id_of_toggle);
            if (!currentCheckbox) return;

            currentCheckbox.addEventListener('click', function () {
                const newValue = currentCheckbox.checked;
                if (isSettingsLocked && protectedHiddenAtLock.has(element_to_change) && !newValue) {
                    currentCheckbox.checked = true;
                    return;
                }
                applySettingChange(element_to_change, newValue);
                currentCheckbox.classList.add('loading');

                setTimeout(() => {
                    currentCheckbox.classList.remove('loading');
                    updateLockProtectedUI();
                }, 800);
            }, false);
        }

        function setButtonStateFour(element_to_check, id_of_toggle) {
            var currentButton = document.getElementById(id_of_toggle);
            if (!currentButton) return;

            chrome.storage.sync.get(element_to_check + "Status", function (result) {
                let state = result[element_to_check + "Status"] || "On";
                currentButton.setAttribute("data-state", state);
            });
        }

        function toggleViewStatusMultiToggle(element_to_change, id_of_toggle) {
            var currentButton = document.getElementById(id_of_toggle);
            if (!currentButton) return;

            currentButton.addEventListener('click', function () {
                let currentState = currentButton.getAttribute("data-state");

                if (isSettingsLocked && protectedHiddenAtLock.has(element_to_change) && currentState !== "On") {
                    return;
                }

                let nextState;

                if (currentState == "On") {
                    nextState = "Off";
                } else if (currentState == "Off") {
                    nextState = "Blur";
                } else if (currentState == "Blur") {
                    nextState = "Black";
                } else {
                    nextState = "On";
                }
                currentButton.setAttribute("data-state", nextState);
                applySettingChange(element_to_change, nextState);
                currentButton.classList.add('loading'); // Add loading class for animation

                setTimeout(() => {
                    currentButton.classList.remove('loading');
                    updateLockProtectedUI();
                }, 800);
            }, false);
        }

        elementsThatCanBeHidden.forEach(function (item) {
            if (item.startsWith('youtube') || item.startsWith('facebook') || item.startsWith('x') ||
                item.startsWith('instagram') || item.startsWith('linkedin') || item.startsWith('whatsapp') ||
                item.startsWith('google') || item.startsWith('reddit')) {
                if (item === "youtubeThumbnails") {
                    setButtonStateFour(item, item + "Toggle");
                    toggleViewStatusMultiToggle(item, item + "Toggle");
                } else {
                    setCheckboxState(item, item + "Toggle");
                    toggleViewStatusCheckbox(item, item + "Toggle");
                }
            }
        });

        function setSwitch() { /* platform-level switch removed */ }

        function setupPlatformSwitchListener() { /* removed */ }

        function showEditDialog(siteIdentifier, selector, name, onSave, options) {
            options = options || {};
            const dialogTitle = options.title || 'Edit Custom Element';
            const saveLabel = options.saveLabel || 'Save';

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'edit-dialog-overlay';

            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'edit-dialog';

            dialog.innerHTML = `
                <h3>${dialogTitle}</h3>
                <div class="edit-dialog-field">
                    <label for="element-name">Name (optional):</label>
                    <input type="text" id="element-name" class="shadcn-input" placeholder="e.g., Reels button" value="${name || ''}">
                </div>
                <div class="edit-dialog-field">
                    <label for="element-selector">
                        CSS Selector:
                        <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics" target="_blank" class="help-icon" title="Learn about CSS selectors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </a>
                    </label>
                    <textarea id="element-selector" class="shadcn-input" rows="3" placeholder="e.g., div.class-name">${selector}</textarea>
                </div>
                <div class="edit-dialog-buttons">
                    <button id="cancel-edit" class="secondary-btn">Cancel</button>
                    <button id="save-edit" class="primary-btn">${saveLabel}</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Expand popup to accommodate dialog - force a specific height
            document.body.classList.add('modal-open');
            document.body.style.minHeight = '350px';

            // Focus the selector field when adding manually, otherwise the name input
            setTimeout(() => {
                const fieldToFocus = document.getElementById(options.focusSelector ? 'element-selector' : 'element-name');
                if (fieldToFocus) {
                    fieldToFocus.focus();
                }
            }, 50);

            const closeDialog = function () {
                document.body.removeChild(overlay);
                document.body.classList.remove('modal-open');
                document.body.style.minHeight = '';
            };

            // Handle save
            document.getElementById('save-edit').addEventListener('click', function () {
                const newName = document.getElementById('element-name').value.trim();
                const newSelector = document.getElementById('element-selector').value.trim();

                if (!newSelector) {
                    alert('CSS Selector cannot be empty');
                    return;
                }

                try {
                    document.querySelector(newSelector);
                } catch (err) {
                    alert('This is not a valid CSS selector');
                    return;
                }

                onSave(newName, newSelector);
                closeDialog();
            });

            // Handle cancel
            document.getElementById('cancel-edit').addEventListener('click', closeDialog);

            // Handle escape key
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    closeDialog();
                }
            });

            // Close on overlay click
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    closeDialog();
                }
            });
        }

        function updateCustomElementsList(siteIdentifier, selectors) {
            console.log('updateCustomElementsList called for', siteIdentifier, 'with selectors:', selectors);
            const containerId = currentPlatform ? `${siteIdentifier}CustomElements` : 'genericCustomElements';
            const container = document.getElementById(containerId);
            if (!container) {
                console.error("Could not find custom elements container:", containerId);
                return;
            }
            container.innerHTML = '';

            if (!Array.isArray(selectors)) {
                console.warn("Selectors is not an array for", siteIdentifier, selectors);
                selectors = [];
            }

            selectors.forEach(item => {
                // Support both old format (string) and new format (object with name and selector)
                let selector, name;
                if (typeof item === 'string') {
                    selector = item;
                    name = '';
                } else {
                    selector = item.selector || item;
                    name = item.name || '';
                }

                const div = document.createElement('div');
                div.className = 'custom-element';

                const span = document.createElement('span');
                span.textContent = name || selector;
                span.title = selector;

                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'custom-element-buttons';

                // Edit button
                const editButton = document.createElement('button');
                editButton.className = 'icon-btn edit-symbol';
                editButton.innerHTML = `
                    <svg width="14px" height="14px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>`;
                editButton.title = 'Edit';
                editButton.addEventListener('click', function () {
                    showEditDialog(siteIdentifier, selector, name, function (newName, newSelector) {
                        // Always edit in BOTH session AND storage (in case data exists in either)
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (!tabs || !tabs[0]) return;

                            // Edit in session memory
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'editSessionSelector',
                                oldSelector: selector,
                                newSelector: newSelector,
                                newName: newName
                            }, function (response) {
                                // Also edit in storage (regardless of rememberSettingsEnabled)
                                const storageKey = `${siteIdentifier}CustomHiddenElements`;
                                chrome.storage.sync.get(storageKey, function (result) {
                                    let currentSelectors = result[storageKey] || [];
                                    const index = currentSelectors.findIndex(s =>
                                        (typeof s === 'string' ? s : s.selector) === selector
                                    );

                                    if (index !== -1) {
                                        // Selector was in storage, update it
                                        currentSelectors[index] = { name: newName, selector: newSelector };
                                        chrome.storage.sync.set({ [storageKey]: currentSelectors }, function () {
                                            // Merge storage with any session selectors
                                            const sessionSelectors = (response && response.customSelectors) || [];
                                            const allItems = [...currentSelectors, ...sessionSelectors];
                                            const uniqueItems = allItems.filter((item, idx) => {
                                                const sel = typeof item === 'string' ? item : item.selector;
                                                return allItems.findIndex(i => (typeof i === 'string' ? i : i.selector) === sel) === idx;
                                            });
                                            updateCustomElementsList(siteIdentifier, uniqueItems);
                                        });
                                    } else {
                                        // Selector was only in session, use response
                                        if (response && response.customSelectors) {
                                            updateCustomElementsList(siteIdentifier, response.customSelectors);
                                        }
                                    }
                                });
                            });
                        });
                    });
                });

                // Remove button
                const removeButton = document.createElement('button');
                removeButton.className = 'icon-btn remove-symbol';
                removeButton.innerHTML = `
                    <svg width="14px" height="14px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>`;
                removeButton.title = 'Remove';
                removeButton.addEventListener('click', function () {
                    // Always remove from BOTH session AND storage (in case data exists in either)
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        if (!tabs || !tabs[0]) return;

                        // First remove from storage
                        const storageKey = `${siteIdentifier}CustomHiddenElements`;
                        chrome.storage.sync.get(storageKey, function (result) {
                            let currentSelectors = result[storageKey] || [];
                            currentSelectors = currentSelectors.filter(s =>
                                (typeof s === 'string' ? s : s.selector) !== selector
                            );

                            chrome.storage.sync.set({ [storageKey]: currentSelectors }, function () {
                                // Then remove from session memory and reapply styles
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    type: 'removeSessionSelector',
                                    selector: selector
                                }, function (response) {
                                    // Use the fresh response from content script
                                    if (response && response.customSelectors) {
                                        updateCustomElementsList(siteIdentifier, response.customSelectors);
                                    } else {
                                        // Fallback to just storage
                                        updateCustomElementsList(siteIdentifier, currentSelectors);
                                    }
                                });
                            });
                        });
                    });
                });

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(removeButton);
                div.appendChild(buttonsContainer);
                div.appendChild(span);

                container.appendChild(div);
            });

            console.log('Updated container content for', containerId, ':', container.innerHTML);
        }

        function setupGrayscaleToggle(siteIdentifier) {
            const platformSpecific = platformsWeTarget.includes(siteIdentifier);
            const anchorContainer = platformSpecific
                ? document.querySelector(`.dropdown.${siteIdentifier} .toggle-group`)
                : document.querySelector('#generic-site-options .toggle-group');
            if (!anchorContainer) return;

            const existing = document.getElementById('grayscale-toggle-row');
            if (existing) existing.remove();

            const wrapper = document.createElement('div');
            wrapper.className = 'hide-checkboxes grayscale-controls';

            const row = document.createElement('div');
            row.id = 'grayscale-toggle-row';
            row.className = 'a-toggle grayscale-toggle';
            row.innerHTML = `
                <input type="checkbox" id="grayscaleToggle" name="grayscaleToggle">
                <label for="grayscaleToggle">Grayscale</label>`;

            wrapper.appendChild(row);

            const customElementsList = anchorContainer.querySelector('.custom-elements');
            if (customElementsList) {
                customElementsList.insertAdjacentElement('afterend', wrapper);
            } else {
                const controls = anchorContainer.querySelector('.custom-elements-controls');
                if (controls) {
                    controls.insertAdjacentElement('afterend', wrapper);
                } else {
                    anchorContainer.prepend(wrapper);
                }
            }

            const toggle = document.getElementById('grayscaleToggle');
            if (!toggle) return;

            const storageKey = `${siteIdentifier}GrayscaleStatus`;
            // Initial checked state is applied in initializePopupUI() before the popup is shown.

            toggle.addEventListener('change', function () {
                const enabled = toggle.checked;
                const protectKey = `${siteIdentifier}Grayscale`;
                if (isSettingsLocked && protectedHiddenAtLock.has(protectKey) && !enabled) {
                    toggle.checked = true;
                    return;
                }
                applySettingChange(`${siteIdentifier}Grayscale`, enabled);
                // Tell the active tab to apply immediately. Relying on storage
                // sync alone is too slow/unreliable from the popup.
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (!tabs || !tabs[0]) return;
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'setGrayscale', enabled: enabled }, function () {
                        // Content script may not be loaded on this tab yet — ignore.
                        void chrome.runtime.lastError;
                    });
                });
                updateLockProtectedUI();
            });
        }

        function addCustomSelector(siteIdentifier, name, selector) {
            const storageKey = `${siteIdentifier}CustomHiddenElements`;
            chrome.storage.sync.get(storageKey, function (result) {
                let currentSelectors = result[storageKey] || [];
                if (!Array.isArray(currentSelectors)) currentSelectors = [];

                const alreadyExists = currentSelectors.some(s =>
                    (typeof s === 'string' ? s : s.selector) === selector
                );
                if (alreadyExists) {
                    alert('This selector is already in the list');
                    return;
                }

                currentSelectors.push({ name: name, selector: selector });
                chrome.storage.sync.set({ [storageKey]: currentSelectors }, function () {
                    // The content script picks up the storage change and hides the
                    // element; ask it for the merged list (storage + session) so the
                    // popup list stays in sync.
                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                        if (!tabs || !tabs[0]) {
                            updateCustomElementsList(siteIdentifier, currentSelectors);
                            return;
                        }
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'getSessionOverrides' }, function (response) {
                            if (chrome.runtime.lastError || !response || !Array.isArray(response.customSelectors)) {
                                updateCustomElementsList(siteIdentifier, currentSelectors);
                            } else {
                                updateCustomElementsList(siteIdentifier, response.customSelectors);
                            }
                        });
                    });
                });
            });
        }

        function setupCustomElementControls(siteIdentifier) {
            const platformSpecific = platformsWeTarget.includes(siteIdentifier);
            const addButtonId = platformSpecific ? `${siteIdentifier}AddElementButton` : 'genericAddElementButton';
            const addButton = document.getElementById(addButtonId);

            if (addButton) {
                addButton.addEventListener('click', function () {
                    if (isSelectionModeActive) {
                        isSelectionModeActive = false;
                        addButton.classList.remove('active');
                        addButton.textContent = 'Click to hide element';
                        chrome.storage.sync.set({ [`${siteIdentifier}SelectionActive`]: false });
                    } else {
                        isSelectionModeActive = true;
                        addButton.classList.add('active');
                        addButton.textContent = 'Click any element';
                        chrome.storage.sync.set({ [`${siteIdentifier}SelectionActive`]: true });
                    }
                });
            } else { console.error("Add button not found:", addButtonId); }

            const manualAddButtonId = platformSpecific ? `${siteIdentifier}ManualAddButton` : 'genericManualAddButton';
            const manualAddButton = document.getElementById(manualAddButtonId);

            if (manualAddButton) {
                manualAddButton.addEventListener('click', function () {
                    showEditDialog(siteIdentifier, '', '', function (newName, newSelector) {
                        addCustomSelector(siteIdentifier, newName, newSelector);
                    }, { title: 'Add Custom Element', saveLabel: 'Add', focusSelector: true });
                });
            } else { console.error("Manual add button not found:", manualAddButtonId); }
        }

        function isBlockedPageUrl(url) {
            if (typeof url !== 'string') return false;
            if (url.startsWith(chrome.runtime.getURL('blocked.html'))) return true;
            try {
                const parsed = new URL(url);
                const isExtensionPage = [
                    'chrome-extension:',
                    'moz-extension:',
                    'safari-web-extension:',
                ].includes(parsed.protocol);
                return isExtensionPage && parsed.pathname.replace(/^\/+/, '') === 'blocked.html';
            } catch {
                return false;
            }
        }

        function normalizeBlockedPageUrl(blockedPageUrl) {
            try {
                const parsed = new URL(blockedPageUrl);
                return chrome.runtime.getURL('blocked.html') + parsed.search;
            } catch {
                return blockedPageUrl;
            }
        }

        function renderBlockedPagePopup(blockedPageUrl) {
            const popupContainer = document.getElementById('popup-content');
            const delayContent = document.getElementById('delay-content');
            const saveFooter = document.getElementById('save-controls');
            const reviewPrompt = document.getElementById('reviewPrompt');
            const errorPrompt = document.getElementById('error-prompt');
            const foot = document.querySelector('footer');
            if (delayContent) delayContent.style.display = 'none';
            if (saveFooter) saveFooter.style.display = 'none';
            if (reviewPrompt) reviewPrompt.style.display = 'none';
            if (errorPrompt) errorPrompt.style.display = 'none';
            if (foot) foot.style.display = 'none';
            document.body.classList.add('popup-showing-blocked-page');

            popupContainer.innerHTML = '';
            popupContainer.classList.add('blocked-page-popup');
            popupContainer.style.display = 'block';

            const frame = document.createElement('iframe');
            frame.className = 'blocked-page-frame';
            frame.title = 'Blocked by ReDD Blocker';
            try {
                const frameUrl = new URL(normalizeBlockedPageUrl(blockedPageUrl));
                frameUrl.searchParams.set('popup', '1');
                frame.src = frameUrl.toString();
            } catch {
                frame.src = blockedPageUrl;
            }
            popupContainer.appendChild(frame);
            dismissPopupLoading();
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
            if (chrome.runtime.lastError || !tab || tab.length === 0 || !tab[0].url) {
                console.error("Could not get active tab information.");
                document.getElementById('popup-content').innerHTML = "<p class='error-message'>Could not get tab information. Try reloading the page.</p>";
                document.getElementById('popup-content').style.display = 'block';
                document.getElementById('delay-content').style.display = 'none';
                dismissPopupLoading();
                return;
            }

            let currentURL;
            try {
                currentURL = new URL(tab[0].url);
            } catch (e) {
                console.warn("Invalid URL:", tab[0].url);
                document.getElementById('popup-content').innerHTML = `<p class='error-message'>Cannot run on this page (${tab[0].url.split('/')[0]}...).</p>`;
                document.getElementById('popup-content').style.display = 'block';
                document.getElementById('delay-content').style.display = 'none';
                dismissPopupLoading();
                return;
            }

            if (isBlockedPageUrl(tab[0].url)) {
                renderBlockedPagePopup(tab[0].url);
                return;
            }

            const currentHost = currentURL.hostname;
            const displayHost = currentHost.replace(/^www\./, '');
            const currentSiteNameEl = document.getElementById('currentSiteName');
            if (currentSiteNameEl) currentSiteNameEl.textContent = displayHost;
            const currentSiteNameModalEl = document.getElementById('currentSiteNameModal');
            if (currentSiteNameModalEl) currentSiteNameModalEl.textContent = displayHost;

            // Precisely identify the platform using the shared platformHostnames map
            for (const platform in platformHostnames) {
                if (platformHostnames[platform].includes(currentHost)) {
                    currentPlatform = platform;
                    break; // Found it
                }
            }

            // If a platform was matched, use its name as the identifier.
            if (currentPlatform) {
                currentSiteIdentifier = currentPlatform;
            }

            if (currentPlatform) {
                document.querySelector('.dropdown.' + currentPlatform).classList.add('shown');
                const websiteToggles = document.getElementById('website-toggles');
                if (websiteToggles) websiteToggles.style.display = 'none';
                document.getElementById('generic-site-options').style.display = 'none';
                document.getElementById('currentSiteInfo').style.display = 'block';

                setSwitch(currentPlatform, currentPlatform + "Switch");
                setupPlatformSwitchListener(currentPlatform);

                setupCustomElementControls(currentPlatform);
                const storageKey = `${currentPlatform}CustomHiddenElements`;
                chrome.storage.sync.get(storageKey, function (result) {
                    updateCustomElementsList(currentPlatform, result[storageKey] || []);
                });

            } else if (currentHost && !currentURL.protocol.startsWith('chrome') && !currentURL.protocol.startsWith('about')) {
                currentSiteIdentifier = currentHost;
                const websiteToggles = document.getElementById('website-toggles');
                if (websiteToggles) websiteToggles.style.display = 'none';
                document.getElementById('generic-site-options').style.display = 'block';
                document.getElementById('currentSiteInfo').style.display = 'block';

                setupCustomElementControls(currentSiteIdentifier);
                const storageKey = `${currentSiteIdentifier}CustomHiddenElements`;
                chrome.storage.sync.get(storageKey, function (result) {
                    updateCustomElementsList(currentSiteIdentifier, result[storageKey] || []);
                });

                platformsWeTarget.forEach(p => {
                    const dropdown = document.querySelector(`.dropdown.${p}`);
                    if (dropdown) dropdown.classList.remove('shown');
                });

            } else {
                document.getElementById('popup-content').innerHTML = `<p class='error-message'>Extension cannot modify this page (${currentURL.protocol}//...).</p>`;
                document.getElementById('popup-content').style.display = 'block';
                document.getElementById('delay-content').style.display = 'none';
                const websiteToggles2 = document.getElementById('website-toggles');
                if (websiteToggles2) websiteToggles2.style.display = 'none';
                document.getElementById('generic-site-options').style.display = 'none';
                document.getElementById('currentSiteInfo').style.display = 'block';
                dismissPopupLoading();
            }

            if (currentSiteIdentifier) {
                setupFrictionDelay(currentSiteIdentifier);
                setupGrayscaleToggle(currentSiteIdentifier);
                setupSettingsLock(currentSiteIdentifier);
                initializePopupUI();
            }

            // Setup Remember settings UI now that we know the site identifier
            const rememberToggle = document.getElementById('rememberSettingsToggle');
            const saveFooter = document.getElementById('save-controls');
            const saveBtn = document.getElementById('saveButton');
            const saveStatus = document.getElementById('saveStatus');
            if (rememberToggle && saveFooter) {
                rememberToggle.addEventListener('change', function () {
                    rememberSettingsEnabled = rememberToggle.checked;
                    updateSaveFooterVisibility();
                    let obj = {};
                    obj[`${currentSiteIdentifier}RememberSettings`] = rememberSettingsEnabled;
                    chrome.storage.sync.set(obj);
                    if (!rememberSettingsEnabled) {
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (!tabs || !tabs[0]) return;
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'getSessionOverrides' }, function (response) {
                                if (response && response.overrides) {
                                    applyOverridesToUI(response.overrides);
                                }
                                if (isSettingsLocked) {
                                    setTimeout(function () {
                                        captureProtectedHiddenSnapshot();
                                        updateLockProtectedUI();
                                    }, 50);
                                }
                                // Also update custom elements list with session selectors
                                if (response && response.customSelectors && Array.isArray(response.customSelectors)) {
                                    updateCustomElementsList(currentSiteIdentifier, response.customSelectors);
                                }
                            });
                        });
                    }
                });
                if (saveBtn) {
                    saveBtn.addEventListener('click', function () {
                        const originalLabel = saveBtn.textContent;
                        saveBtn.textContent = 'Saving...';
                        saveBtn.disabled = true;

                        // Ask content script for current session overrides and persist them
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (!tabs || !tabs[0]) {
                                saveBtn.textContent = 'Save as default';
                                saveBtn.disabled = false;
                                return;
                            }
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'getSessionOverrides' }, function (response) {
                                if (!response) {
                                    saveBtn.textContent = originalLabel;
                                    saveBtn.disabled = false;
                                    return;
                                }
                                const toSet = {};
                                if (response.overrides) {
                                    Object.keys(response.overrides).forEach(k => { toSet[k] = response.overrides[k]; });
                                }
                                const writes = [];
                                if (Object.keys(toSet).length > 0) { writes.push(chrome.storage.sync.set(toSet)); }
                                if (response.customSelectors && Array.isArray(response.customSelectors)) {
                                    const customKey = `${currentSiteIdentifier}CustomHiddenElements`;
                                    const obj = {}; obj[customKey] = response.customSelectors; writes.push(chrome.storage.sync.set(obj));
                                }
                                Promise.all(writes).then(() => {
                                    // Clear session selectors since they're now saved to storage
                                    chrome.tabs.sendMessage(tabs[0].id, { type: 'clearSessionSelectors' });

                                    saveBtn.textContent = 'Saved!';
                                    saveBtn.classList.add('is-success');
                                    setTimeout(() => {
                                        saveBtn.textContent = originalLabel;
                                        saveBtn.classList.remove('is-success');
                                        saveBtn.disabled = false;
                                    }, 1000);
                                }).catch(() => {
                                    saveBtn.textContent = originalLabel;
                                    saveBtn.disabled = false;
                                });
                            });
                        });
                    });
                }
            }
        });

        function applyOverridesToUI(overrides) {
            if (!overrides) return;
            // Apply grayscale override (available on all sites)
            const grayscaleKey = `${currentSiteIdentifier}GrayscaleStatus`;
            if (Object.prototype.hasOwnProperty.call(overrides, grayscaleKey)) {
                const grayscaleToggle = document.getElementById('grayscaleToggle');
                if (grayscaleToggle) grayscaleToggle.checked = overrides[grayscaleKey] === true;
            }
            // Apply platform status override
            if (currentPlatform) {
                const platformKey = `${currentPlatform}Status`;
                if (Object.prototype.hasOwnProperty.call(overrides, platformKey)) {
                    const platformSwitch = document.querySelector('#website-toggles #toggle-' + currentPlatform + ' input');
                    if (platformSwitch) platformSwitch.checked = overrides[platformKey] !== false;
                }
                // Apply element overrides
                elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(item => {
                    const statusKey = item + 'Status';
                    if (!Object.prototype.hasOwnProperty.call(overrides, statusKey)) return;
                    const toggleEl = document.getElementById(item + 'Toggle');
                    if (!toggleEl) return;
                    if (toggleEl.tagName === 'BUTTON') {
                        let state = overrides[statusKey] || 'On';
                        toggleEl.setAttribute('data-state', state);
                    } else if (toggleEl.type === 'checkbox') {
                        toggleEl.checked = !!overrides[statusKey];
                    }
                });
            }
        }

        function delay(time) {
            return new Promise(resolve => setTimeout(resolve, time));
        }

        function setupAccordion(triggerId, contentId, arrowRightId, arrowDownId) {
            const trigger = document.querySelector(triggerId);
            const content = document.querySelector(contentId);
            const arrowRight = document.querySelector(arrowRightId);
            const arrowDown = document.querySelector(arrowDownId);

            if (!trigger || !content || !arrowRight || !arrowDown) return;

            trigger.addEventListener("click", function () {
                const isHidden = content.style.display === "none";
                content.style.display = isHidden ? "block" : "none";
                arrowRight.style.display = isHidden ? "none" : "flex";
                arrowDown.style.display = isHidden ? "flex" : "none";
            });
        }

        function setupHelpAndFAQ() {
            const helpBtn = document.getElementById('help-icon-btn');
            const faqDropdown = document.getElementById('faq-dropdown');
            const faqOverlay = document.getElementById('faq-overlay'); // Get the overlay
            const faqItems = document.querySelectorAll('.faq-item');

            // Make sure all elements exist
            if (!helpBtn || !faqDropdown || !faqOverlay) return;

            const versionEl = document.getElementById('settings-app-version');
            if (versionEl && chrome.runtime.getManifest) {
                versionEl.textContent = 'Version ' + chrome.runtime.getManifest().version;
            }

            // Toggle FAQ dropdown and overlay visibility
            helpBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const isVisible = faqDropdown.style.display === 'block';
                faqDropdown.style.display = isVisible ? 'none' : 'block';
                faqOverlay.style.display = isVisible ? 'none' : 'block';
                document.body.classList.toggle('modal-open', !isVisible);
            });



            // Handle accordion items (no change here)
            faqItems.forEach(item => {
                const trigger = item.querySelector('.faq-trigger');
                if (trigger) {
                    trigger.addEventListener('click', () => {
                        const isOpen = item.dataset.state === 'open';
                        item.dataset.state = isOpen ? 'closed' : 'open';
                    });
                }
            });

            // handle the close button
            const closeBtn = document.getElementById('faq-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    faqDropdown.style.display = 'none';
                    faqOverlay.style.display = 'none';
                    document.body.classList.remove('modal-open');
                });
            }

            // Close dropdown and overlay if clicking outside
            document.addEventListener('click', (event) => {
                if (!faqDropdown.contains(event.target) && !helpBtn.contains(event.target)) {
                    faqDropdown.style.display = 'none';
                    faqOverlay.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            });
        }

        // Setup all interactive elements at the end
        setupHelpAndFAQ();
        setupAccordion('#hide-previews', '#how-to-description', '#how-to-arrow-right', '#how-to-arrow-down');
        setupAccordion('#hide-previews-not-mobile', '#how-to-description-not-mobile', '#how-to-arrow-right-not-mobile', '#how-to-arrow-down-not-mobile');

        // Listen for storage changes to update UI automatically
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            if (namespace === 'sync' && currentSiteIdentifier) {
                // Check for custom element changes
                const customStorageKey = `${currentSiteIdentifier}CustomHiddenElements`;
                if (changes[customStorageKey]) {
                    const newSelectors = changes[customStorageKey].newValue || [];
                    updateCustomElementsList(currentSiteIdentifier, newSelectors);
                }

                // Check for selection state changes
                const selectionKey = `${currentSiteIdentifier}SelectionActive`;
                if (changes[selectionKey]) {
                    const isActive = changes[selectionKey].newValue === true;
                    isSelectionModeActive = isActive;

                    // Update button state
                    const addButtonId = currentPlatform ? `${currentSiteIdentifier}AddElementButton` : 'genericAddElementButton';
                    const addButton = document.getElementById(addButtonId);
                    if (addButton) {
                        if (isActive) {
                            addButton.classList.add('active');
                            addButton.textContent = 'Click any element';
                        } else {
                            addButton.classList.remove('active');
                            addButton.textContent = 'Click to hide element';
                        }
                    }
                }
            }
        });

        // Listen for session-only selector changes from content script
        // This handles the case when auto-save is disabled but elements are being hidden
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            if (message && message.type === 'sessionSelectorsChanged') {
                // Only update if the message is for the current site
                if (currentSiteIdentifier && message.siteIdentifier === currentSiteIdentifier) {
                    console.log('Session selectors changed, updating list:', message.selectors);
                    updateCustomElementsList(currentSiteIdentifier, message.selectors || []);
                }
            }
        });
        }

        chrome.storage.local.get(EULA_STORAGE_KEY, function (result) {
            const data = result[EULA_STORAGE_KEY];
            if (data && data.acceptedRevision === CURRENT_EULA_REVISION) {
                runMain();
            } else {
                showEulaOverlayThen(runMain);
            }
        });
    }
}, false);
