document.addEventListener('DOMContentLoaded', function () {
    initializePopup();

    function initializePopup() {
        console.log("Popup initialized.");

        // hide payment field for now
        const paymentField = document.getElementById('payment-status');
        paymentField.style.display = 'none';

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

        function updateSaveFooterVisibility() {
            const saveFooterEl = document.getElementById('save-controls');
            if (!saveFooterEl) return;
            const delayEl = document.getElementById('delay-content');
            const isDelayVisible = !!delayEl && delayEl.style.display !== 'none';
            const shouldShow = (rememberSettingsEnabled === false) && !isDelayVisible;
            saveFooterEl.style.display = shouldShow ? 'block' : 'none';
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

        function setupFrictionDelay(siteIdentifier) {
            var frictionToggle = document.getElementById("frictionToggle");
            var frictionCustomisationOptions = document.querySelector('.toggle-group.center-align.friction-customisation');

            if (!siteIdentifier) return;

            const addFrictionKey = `${siteIdentifier}AddFriction`;
            const waitTextKey = `${siteIdentifier}WaitText`;
            const waitTimeKey = `${siteIdentifier}WaitTime`;

            chrome.storage.sync.get([addFrictionKey, waitTextKey, waitTimeKey, "addFriction", "waitText", "waitTime"]).then((result) => {
                var popupContainer = document.getElementById("popup-content");
                var messageContainer = document.getElementById("delay-content");
                var errorContainer = document.getElementById("error-prompt");
                var messageBox = document.getElementById("delay-message");
                var waitTextBox = document.getElementById("waitText");
                var waitTimeBox = document.getElementById("waitTime");
                var countdownBox = document.getElementById("delay-time");
                var saveFooter = document.getElementById("save-controls");

                const defaultWaitTime = 10;
                const defaultWaitText = "What's your intention?";

                const storedAddFriction = (result[addFrictionKey] !== undefined) ? result[addFrictionKey] : result.addFriction;
                frictionToggle.checked = storedAddFriction || false;
                frictionCustomisationOptions.style.display = frictionToggle.checked ? "block" : "none";

                let effectiveWaitText = (result[waitTextKey] !== undefined ? result[waitTextKey] : result.waitText) || defaultWaitText;
                waitTextBox.value = effectiveWaitText;
                messageBox.innerText = effectiveWaitText;

                let effectiveWaitTime = (result[waitTimeKey] !== undefined ? result[waitTimeKey] : result.waitTime) || defaultWaitTime;
                waitTimeBox.value = effectiveWaitTime;
                countdownBox.innerText = effectiveWaitTime;

                if (frictionToggle.checked) {
                    popupContainer.style.display = "none";
                    messageContainer.style.display = "block";
                    errorContainer.style.display = "none";
                    if (saveFooter) saveFooter.style.display = "none"; // Hide save button during delay countdown
                    setTimeout(() => messageContainer.classList.add("show"), 100);

                    let countdown = effectiveWaitTime;
                    var timerId = setInterval(() => {
                        countdown--;
                        if (countdown >= 0) {
                            countdownBox.innerText = countdown;
                        } else {
                            messageContainer.style.display = "none";
                            popupContainer.style.display = "block";
                            errorContainer.style.display = "none";
                            updateSaveFooterVisibility();
                            clearInterval(timerId);
                        }
                    }, 1000);
                } else {
                    messageContainer.style.display = "none";
                    messageContainer.classList.remove("show");
                    popupContainer.style.display = "block";
                    errorContainer.style.display = "none";
                    updateSaveFooterVisibility();
                }
            });

            var frictionToggle = document.getElementById("frictionToggle");
            frictionToggle.addEventListener('change', function () {
                const addFrictionKey = `${siteIdentifier}AddFriction`;
                let obj = {}; obj[addFrictionKey] = frictionToggle.checked;
                chrome.storage.sync.set(obj);
                frictionCustomisationOptions.style.display = frictionToggle.checked ? "block" : "none";
            });


            // Auto-save wait time
            document.getElementById("waitTime").addEventListener('input', function () {
                let waitValue = parseInt(this.value) || 10;
                const waitTimeKey = `${siteIdentifier}WaitTime`;
                let obj = {}; obj[waitTimeKey] = waitValue;
                chrome.storage.sync.set(obj);
            });

            // Auto-save wait text
            document.getElementById("waitText").addEventListener('input', function () {
                const waitTextKey = `${siteIdentifier}WaitText`;
                let obj = {}; obj[waitTextKey] = this.value;
                chrome.storage.sync.set(obj);
            })

            var savedTextTime = document.getElementById("savedTextTime");
            let hideTimeOut;
            document.getElementById("waitTime").addEventListener('input', function () {
                clearTimeout(hideTimeOut);
                let waitValue = parseInt(document.getElementById("waitTime").value);
                const maxLimit = 600;
                const minLimit = 1;

                if (isNaN(waitValue) || waitValue < minLimit) {
                    document.getElementById("waitTime").value = minLimit;
                } else if (waitValue > maxLimit) {
                    savedTextTime.innerText = "Maximum is " + maxLimit;
                    document.getElementById("waitTime").value = maxLimit;
                    savedTextTime.style.display = 'block';
                    hideTimeOut = setTimeout(() => savedTextTime.style.display = 'none', 2500);
                } else {
                    savedTextTime.style.display = 'none';
                }
            });

            // at the bottom of initializePopup(), before it returns:
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isSelectionModeActive) {
                    e.preventDefault();
                    // stop selecting by updating storage
                    if (currentSiteIdentifier) {
                        chrome.storage.sync.set({ [`${currentSiteIdentifier}SelectionActive`]: false });
                    }
                    // reset the popup UI
                    const addButtonId = currentPlatform
                        ? `${currentPlatform}AddElementButton`
                        : 'genericAddElementButton';
                    const addButton = document.getElementById(addButtonId);
                    if (addButton) {
                        isSelectionModeActive = false;
                        addButton.classList.remove('active');
                        addButton.textContent = 'Hide custom element';
                    }
                }
            });
        }

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
                currentToggle.checked = result[element_to_check + "Status"] || false;
            });
        }

        function toggleViewStatusCheckbox(element_to_change, id_of_toggle) {
            var currentCheckbox = document.getElementById(id_of_toggle);
            if (!currentCheckbox) return;

            currentCheckbox.addEventListener('click', function () {
                const newValue = currentCheckbox.checked;
                applySettingChange(element_to_change, newValue);
                currentCheckbox.classList.add('loading'); // Add loading class for animation

                setTimeout(() => {
                    currentCheckbox.classList.remove('loading'); // Remove loading class after animation
                }, 800); // 0.8-second animation duration
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
                    currentButton.classList.remove('loading'); // Remove loading class after animation
                }, 800); // 0.8-second animation duration
            }, false);
        }

        elementsThatCanBeHidden.forEach(function (item) {
            if (item.startsWith('youtube') || item.startsWith('facebook') || item.startsWith('x') ||
                item.startsWith('instagram') || item.startsWith('linkedin') || item.startsWith('whatsapp') ||
                item.startsWith('google') || item.startsWith('reddit')) {
                if (item === "youtubeThumbnails" || item === "youtubeNotifications") {
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

        function showEditDialog(siteIdentifier, selector, name, onSave) {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'edit-dialog-overlay';

            // Create dialog
            const dialog = document.createElement('div');
            dialog.className = 'edit-dialog';

            dialog.innerHTML = `
                <h3>Edit Custom Element</h3>
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
                    <button id="save-edit" class="primary-btn">Save</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Expand popup to accommodate dialog - force a specific height
            document.body.classList.add('modal-open');
            document.body.style.minHeight = '350px';

            // Focus name input
            setTimeout(() => {
                const nameInput = document.getElementById('element-name');
                if (nameInput) {
                    nameInput.focus();
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
                        const storageKey = `${siteIdentifier}CustomHiddenElements`;
                        chrome.storage.sync.get(storageKey, function (result) {
                            let currentSelectors = result[storageKey] || [];
                            const index = currentSelectors.findIndex(s =>
                                (typeof s === 'string' ? s : s.selector) === selector
                            );
                            if (index !== -1) {
                                currentSelectors[index] = { name: newName, selector: newSelector };
                                chrome.storage.sync.set({ [storageKey]: currentSelectors }, function () {
                                    updateCustomElementsList(siteIdentifier, currentSelectors);
                                });
                            }
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
                    const storageKey = `${siteIdentifier}CustomHiddenElements`;
                    chrome.storage.sync.get(storageKey, function (result) {
                        let currentSelectors = result[storageKey] || [];
                        currentSelectors = currentSelectors.filter(s =>
                            (typeof s === 'string' ? s : s.selector) !== selector
                        );
                        chrome.storage.sync.set({ [storageKey]: currentSelectors }, function () {
                            updateCustomElementsList(siteIdentifier, currentSelectors);
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

        function setupCustomElementControls(siteIdentifier) {
            const platformSpecific = platformsWeTarget.includes(siteIdentifier);
            const addButtonId = platformSpecific ? `${siteIdentifier}AddElementButton` : 'genericAddElementButton';
            const addButton = document.getElementById(addButtonId);

            if (addButton) {
                addButton.addEventListener('click', function () {
                    if (isSelectionModeActive) {
                        isSelectionModeActive = false;
                        addButton.classList.remove('active');
                        addButton.textContent = 'Hide custom element';
                        chrome.storage.sync.set({ [`${siteIdentifier}SelectionActive`]: false });
                    } else {
                        isSelectionModeActive = true;
                        addButton.classList.add('active');
                        addButton.textContent = 'Click/Tap element to hide';
                        chrome.storage.sync.set({ [`${siteIdentifier}SelectionActive`]: true });
                    }
                });
            } else { console.error("Add button not found:", addButtonId); }
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
            if (chrome.runtime.lastError || !tab || tab.length === 0 || !tab[0].url) {
                console.error("Could not get active tab information.");
                document.getElementById('popup-content').innerHTML = "<p class='error-message'>Could not get tab information. Try reloading the page.</p>";
                document.getElementById('popup-content').style.display = 'block';
                document.getElementById('delay-content').style.display = 'none';
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
            }

            if (currentPlatform) {
                elementsThatCanBeHidden.filter(e => e.startsWith(currentPlatform)).forEach(item => {
                    if (item === "youtubeThumbnails" || item === "youtubeNotifications") {
                        setButtonStateFour(item, item + "Toggle");
                    } else {
                        setCheckboxState(item, item + "Toggle");
                    }
                });
            }

            // Now that we know the site identifier, set up friction delay per-site
            if (currentSiteIdentifier) {
                setupFrictionDelay(currentSiteIdentifier);
            }

            // Setup Remember settings UI now that we know the site identifier
            const rememberToggle = document.getElementById('rememberSettingsToggle');
            const saveFooter = document.getElementById('save-controls');
            const saveBtn = document.getElementById('saveButton');
            const saveStatus = document.getElementById('saveStatus');
            if (rememberToggle && saveFooter) {
                const rememberKey = `${currentSiteIdentifier}RememberSettings`;
                chrome.storage.sync.get(rememberKey, function (result) {
                    rememberSettingsEnabled = result[rememberKey] !== false; // default true
                    rememberToggle.checked = rememberSettingsEnabled;
                    updateSaveFooterVisibility();
                    if (!rememberSettingsEnabled) {
                        // If not remembering, sync UI with current session overrides and session-hidden elements
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (!tabs || !tabs[0]) return;
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'getSessionOverrides' }, function (response) {
                                if (response && response.overrides) {
                                    applyOverridesToUI(response.overrides);
                                }
                                // Also update custom elements list with session selectors
                                if (response && response.customSelectors && Array.isArray(response.customSelectors)) {
                                    updateCustomElementsList(currentSiteIdentifier, response.customSelectors);
                                }
                            });
                        });
                    }
                });
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
                        // Booleans use true => hidden (checked)
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
                arrowRight.style.display = isHidden ? "none" : "inline-block";
                arrowDown.style.display = isHidden ? "inline-block" : "none";
            });
        }

        function setupHelpAndFAQ() {
            const helpBtn = document.getElementById('help-icon-btn');
            const faqDropdown = document.getElementById('faq-dropdown');
            const faqOverlay = document.getElementById('faq-overlay'); // Get the overlay
            const faqItems = document.querySelectorAll('.faq-item');

            // Make sure all elements exist
            if (!helpBtn || !faqDropdown || !faqOverlay) return;

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
                            addButton.textContent = 'Click/Tap element to hide';
                        } else {
                            addButton.classList.remove('active');
                            addButton.textContent = 'Hide custom element';
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
}, false);
