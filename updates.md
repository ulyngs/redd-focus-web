Bug fixes and improvements

- Updated branding copy to Centre for Digital Habits; footer attribution to digitalhabits.org
- Restyled the review prompt and footer, and made the Add/Edit CSS selector editor a full-bleed panel like Settings
- Stabilized popup width and typography across Chrome, Firefox, and Safari (fixed 310px width, consistent root font size)
- Safari: main popup content now scrolls when selectors overflow the popup height (previously clipped with no scroll)
- Safari/Chrome: classic scrollbar gutter so the lock/settings buttons no longer overlap the scrollbar
- iOS: popup sheet scrolls content with a sticky footer that stays visible and does not grow when the sheet is expanded
- Safari: "Leave a review" now ships `review_store_url.js` in the extension bundle and opens the store via `tabs.create` (fixes missing-script errors and iOS popup self-navigation / UUID glitch)
- Extension and internal browser pages are no longer treated as websites (avoids showing the Safari extension UUID as a site name)
- iOS companion app: "Open Safari to get started" always opens in Safari (`x-safari-https`), instead of handing off to the YouTube app when installed

ReDD Blocker integration

- Fixed inverted allowlist enforcement for Safari users on the extension blocking method (allowed sites were blocked; now matches desktop Automation / Rust host behaviour, including one-shot schedules)
