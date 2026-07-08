New features

- Per-site grayscale toggle to desaturate the entire page
- Manual CSS selector entry: add custom hidden elements by typing a selector (enable via Settings > General)
- Per-site settings lock: prevent turning off elements that are already hidden, with a timed unlock flow (replaces the old open-delay friction)

Bug fixes and improvements

- Restyled settings panel with a card-based layout aligned to ReDD Blocker
- Reorganized settings into General (Appearance theme picker and off-by-default manual CSS toggle) and Accountability sections
- Added a Custom section heading grouping custom hide controls and the grayscale toggle
- Grayscale stays protected while settings are locked if it was enabled when locked
- Fixed a flash when opening the popup
- Improved custom element button labels ("Click to hide element" / "Click any element") and styling, including a subtle teal stroke
- Fixed custom hide button layout wrapping on narrow popup widths
- Fixed dark mode styling (theme class is on html, not body)
- Manual CSS selector setting hidden on iOS, consistent with the theme picker
- Clearer confirmation copy when locking settings

ReDD Blocker integration

- Enforces allowlist-mode website blocks from ReDD Blocker via the native host
- Blocked page shows allowlist-specific copy when a site is blocked because it is not on your allowed list
- Improved blocked-page wording with more positive framing (English and Danish)
