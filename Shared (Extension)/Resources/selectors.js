//
//  selectors.js
//
//  Created by Ulrik Lyngs on 09/06/2025.
//

// This object holds all CSS selector strings, making them easy to manage and access.
const cssSelectors = {
    // YouTube
    youtubeSearchCssOn: '',
    youtubeSearchCssOff: '#center > yt-searchbox.ytSearchboxComponentHost.ytSearchboxComponentDesktop.ytd-masthead, ytd-searchbox { display: none; } button[aria-label="Search YouTube"] {display: none;}',
    youtubeSearchPredictCssOn: '',
    youtubeSearchPredictCssOff: 'div[role="listbox"].ytSearchboxComponentSuggestionsContainer, div.gstl_50 { display: none !important; }',
    youtubeRecVidsCssOn: 'ytd-browse[page-subtype="home"] { visibility: visible !important; } div[tab-identifier="FEwhat_to_watch"] { visibility: visible !important; }',
    youtubeRecVidsCssOff: 'ytd-browse[page-subtype="home"] { display: none; } div[tab-identifier="FEwhat_to_watch"] { display: none !important; }',
    youtubeThumbnailsCssOn: 'yt-thumbnail-view-model, ytd-thumbnail, ytd-playlist-thumbnail, yt-collection-thumbnail-view-model, a.yt-lockup-view-model-wiz__content-image { display: block !important; } ytd-thumbnail img, ytd-playlist-thumbnail img { filter: none; } /* mobile */ .media-item-thumbnail-container, .video-thumbnail-img { display: block !important; filter: none; } .reel-shelf-items ytm-reel-item-renderer, .reel-shelf-items .reel-item-endpoint, .video-thumbnail-container-vertical { height: auto !important; }',
    youtubeThumbnailsCssOff: '.yt-lockup-view-model__content-image, yt-thumbnail-view-model, ytd-thumbnail, ytd-playlist-thumbnail, yt-collection-thumbnail-view-model, a.yt-lockup-view-model-wiz__content-image { display: none !important; } /* mobile */ .media-item-thumbnail-container, .video-thumbnail-img { display: none !important; } .reel-shelf-items ytm-reel-item-renderer, .reel-shelf-items .reel-item-endpoint, .video-thumbnail-container-vertical { height: 100px !important; }',
    youtubeThumbnailsCssBlur: 'yt-thumbnail-view-model img, ytd-thumbnail img, ytd-playlist-thumbnail img, .yt-thumbnail-view-model__image img { filter: blur(7px) !important; } /* mobile */ .media-item-thumbnail-container, .video-thumbnail-img { filter: blur(7px); } ytd-thumbnail, ytd-playlist-thumbnail { display: block !important; } /* Ensure container is visible for blur */',
    youtubeThumbnailsCssBlack: 'yt-thumbnail-view-model img, ytd-thumbnail img, ytd-playlist-thumbnail img, .yt-thumbnail-view-model__image img { filter: brightness(0) !important; } /* mobile */ .media-item-thumbnail-container, .video-thumbnail-img { filter: brightness(0); } ytd-thumbnail, ytd-playlist-thumbnail { display: block !important; } /* Ensure container is visible for black */',
    youtubeNotificationsCssOn: 'ytd-notification-topbar-button-renderer.ytd-masthead { display: inline-flex !important; } ytd-notification-topbar-button-renderer.ytd-masthead .yt-spec-icon-badge-shape__badge { display: inline-flex; }',
    youtubeNotificationsCssOff: 'ytd-notification-topbar-button-renderer.ytd-masthead { display: none !important; }',
    youtubeNotificationsCssBlur: 'ytd-notification-topbar-button-renderer.ytd-masthead { display: inline-flex !important; } ytd-notification-topbar-button-renderer.ytd-masthead .yt-spec-icon-badge-shape__badge { display: none; }',
    youtubeNotificationsCssBlack: 'ytd-notification-topbar-button-renderer.ytd-masthead { display: none !important; }', // Black state is same as Off
    youtubeProfileImgCssOn: '',
    youtubeProfileImgCssOff: '.yt-lockup-metadata-view-model__avatar, #avatar-link, #avatar-container, #avatar, .yt-lockup-metadata-view-model-wiz--standard .yt-lockup-metadata-view-model-wiz__avatar {display: none !important; visibility: hidden;} .channel-thumbnail-icon, #channel-thumbnail, #avatar-section, #author-thumbnail, ytm-comments-entry-point-teaser-renderer img.ytm-comments-entry-point-teaser-avatar, ytm-profile-icon.slim-owner-profile-icon, ytm-profile-icon.comment-icon {display: none;}  #creator-thumbnail, #expander.ytd-comment-replies-renderer .dot.ytd-comment-replies-renderer, ytm-channel-thumbnail-with-link-renderer {display: none !important;}',
    youtubeShortsCssOn: '',
    youtubeShortsCssOff: 'ytd-mini-guide-entry-renderer:has(a[href="/shorts/"]), #endpoint.yt-simple-endpoint.ytd-guide-entry-renderer[title="Shorts"],ytd-mini-guide-entry-renderer[aria-label="Shorts"], ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], ytm-rich-section-renderer:has(ytm-shorts-lockup-view-model) { display: none; } ytm-pivot-bar-renderer[role="tablist"] ytm-pivot-bar-item-renderer:nth-child(2), ytm-reel-shelf-renderer, ytd-video-renderer:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]), ytm-video-with-context-renderer:has(ytm-thumbnail-overlay-time-status-renderer[data-style="SHORTS"]) { display: none !important; }',
    youtubeSubscriptionsCssOn: 'ytd-guide-section-renderer:has(a[href="/feed/channels"]), a[href="/feed/subscriptions"] { display: flex !important; } ytm-pivot-bar-renderer[role="tablist"] ytm-pivot-bar-item-renderer:nth-child(3) { display: flex !important; } #sections ytd-guide-section-renderer:nth-child(2):not(:has(#guide-section-title[is-empty])) { display: block !important; }',
    youtubeSubscriptionsCssOff: 'ytd-guide-section-renderer:has(a[href="/feed/channels"]), a[href="/feed/subscriptions"] { display: none !important; } ytm-pivot-bar-renderer[role="tablist"] ytm-pivot-bar-item-renderer:nth-child(3) { display: none !important; } #sections ytd-guide-section-renderer:nth-child(2):not(:has(#guide-section-title[is-empty])) { display: none !important; }',
    youtubeHistoryCssOn: '#endpoint[href="/feed/history"] { display: flex !important; }',
    youtubeHistoryCssOff: '#endpoint[href="/feed/history"] { display: none !important; }',
    youtubeExploreCssOn: '#sections ytd-guide-section-renderer:has(a[href="/gaming"]) { display: block !important; }',
    youtubeExploreCssOff: '#sections ytd-guide-section-renderer:has(a[href="/gaming"]) { display: none !important; }',
    youtubeMoreCssOn: '#sections ytd-guide-section-renderer:has(a[href="https://studio.youtube.com/"]) { display: block !important; }',
    youtubeMoreCssOff: '#sections ytd-guide-section-renderer:has(a[href="https://studio.youtube.com/"]) { display: none !important; }',
    youtubeRelatedCssOn: '#related { visibility: visible !important; display: block !important; } #app ytm-item-section-renderer[section-identifier="related-items"] { display: block !important; } ytm-single-column-watch-next-results-renderer .related-chips-slot-wrapper { transform: translateY(0) !important; }',
    youtubeRelatedCssOff: '#related { visibility: hidden !important; display: none !important; } #app ytm-item-section-renderer[section-identifier="related-items"] { display: none !important; } ytm-single-column-watch-next-results-renderer .related-chips-slot-wrapper { transform: none !important; }',
    youtubeSidebarCssOn: '',
    youtubeSidebarCssOff: '#secondary { display: none !important; } video.html5-main-video { width: 100% !important; height: auto !important; }',
    youtubeCommentsCssOn: '',
    youtubeCommentsCssOff: '#comments { visibility: hidden !important; } #app ytm-comments-entry-point-header-renderer, ytm-item-section-renderer:has([aria-label="Comments"]) { display: none !important; }',
    youtubeViewsCssOn: '',
    youtubeViewsCssOff: '/* watch page */ yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row:nth-child(2) span.yt-content-metadata-view-model__metadata-text:nth-child(1), yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row:nth-child(2) .yt-content-metadata-view-model__delimiter, #metadata-line.ytd-video-meta-block > .ytd-video-meta-block:first-of-type {display: none !important; } #metadata-line.ytd-video-meta-block>.ytd-video-meta-block:not(:first-of-type):before, #metadata-line.ytd-grid-video-renderer>.ytd-grid-video-renderer:not(:first-of-type):before { content: ""; margin: 0px; } /* video page */ #info > span:nth-child(1), #info > span:nth-child(2), #info-container > .ytd-watch-metadata > .yt-formatted-string:nth-of-type(1), #info-container > .ytd-watch-metadata > .yt-formatted-string:nth-of-type(2) { display: none; } /* channel page */ ytd-two-column-browse-results-renderer #metadata-line span.ytd-grid-video-renderer:first-of-type { display: none !important; } /* m.youtube.com */ ytm-badge-and-byline-renderer .ytm-badge-and-byline-item-byline:not(:first-of-type):not(:last-of-type), ytm-badge-and-byline-renderer .ytm-badge-and-byline-separator:not(:first-of-type) { display: none; } .slim-video-metadata-header .secondary-text .yt-core-attributed-string {display: none;}',
    youtubeLikesCssOn: '',
    youtubeLikesCssOff: 'ytd-watch-metadata #top-level-buttons-computed like-button-view-model .yt-spec-button-shape-next__button-text-content { display: none !important; } /* m.youtube.com */ ytm-slim-video-metadata-section-renderer like-button-view-model .yt-spec-button-shape-next__button-text-content { display: none !important; }',
    youtubeSubscribersCssOn: '',
    youtubeSubscribersCssOff: '#owner-sub-count, #subscriber-count { display: none !important; } /* m.youtube.com */ .slim-owner-icon-and-title .subhead .yt-core-attributed-string { display: none !important; }',

    // Facebook
    facebookFeedCssOn: '#ssrb_feed_start + div, div.x1hc1fzr.x1unhpq9.x6o7n8i { visibility: visible !important; } #screen-root div > div[data-mcomponent="MContainer"] > div.m.displayed:nth-child(n+6) { display: block !important; }',
    facebookFeedCssOff: '#ssrb_feed_start + div, div.x1hc1fzr.x1unhpq9.x6o7n8i { visibility: hidden !important; } #screen-root div:not([data-adjust-on-keyboard-shown="true"]) > div[data-mcomponent="MContainer"] > div.m.displayed:nth-child(n+7), #screen-root div[data-mcomponent="MContainer"] div[data-mcomponent="MContainer"]:has(div[data-testid^="post-profile"]) { display: none !important; }',
    facebookWatchCssOn: '',
    facebookWatchCssOff: 'a[href$="/watch/"], a[aria-label="Video"], div[aria-label*="video" i] { display: none !important; } /* mobile */ div[role="button"]:has(div[data-hidden-ref-key="videos.jewel.hidden"]) {display: none !important;} div.m.displayed:has(div[data-hidden-ref-key="videos.jewel.hidden"]) {background-color: white !important;} ',
    facebookNotificationsCssOn: '',
    facebookNotificationsCssOff: 'div[aria-label*="Notifications"], div[data-hidden-ref-key="notifications.pill.jewel.hidden"], #screen-root div[data-mcomponent="MScreen"] div[data-mcomponent="MContainer"] div[data-mcomponent="MContainer"]:nth-child(2) div[role="button"]:nth-child(5) div[data-mcomponent="MContainer"]:nth-child(3) {visibility: hidden !important;}',
    facebookChatCssOn: 'div[role="complementary"] div[data-visualcompletion="ignore-dynamic"] > div.x1n2onr6:not([role="cell"]) { visibility: visible !important; }',
    facebookChatCssOff: 'div[role="complementary"] div[data-visualcompletion="ignore-dynamic"] > div.x1n2onr6:not([role="cell"]) { visibility: hidden !important; }',
    facebookStoriesCssOn: 'div[aria-label="Stories"], #screen-root div[data-mcomponent="MContainer"] > div[data-mcomponent="MContainer"]:has(div[aria-label*="story"]) { display: block !important;}',
    facebookStoriesCssOff: 'li.html-li.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl:has(a[href*="/reel/"]), div[aria-label="Stories"] { display: none !important; } #screen-root div[data-mcomponent="MContainer"] > div[data-mcomponent="MContainer"]:has(div[aria-label*="story"]) { display: none !important;}',
    facebookSponsoredCssOn: '',
    facebookSponsoredCssOff: 'a[aria-label="Advertiser"] { display: none !important; }',

    // X (Twitter)
    xExploreCssOn: 'nav[role="navigation"] a[href="/explore"] { display: flex !important; }',
    xExploreCssOff: 'nav[role="navigation"] a[href="/explore"] { display: none !important; }',
    xNotificationsCssOn: 'nav[role="navigation"] a[href="/notifications"] { display: flex !important; }',
    xNotificationsCssOff: 'nav[role="navigation"] a[href="/notifications"] { display: none !important; }',
    xTrendsCssOn: 'div[data-testid="sidebarColumn"] section[role="region"] {display: flex !important;}',
    xTrendsCssOff: 'div[data-testid="sidebarColumn"] section[role="region"] {display: none !important; }',
    xFollowCssOn: 'div[data-testid="sidebarColumn"] div.css-175oi2r.r-1bro5k0:has(aside[role="complementary"]) { display: flex !important;}',
    xFollowCssOff: 'div[data-testid="sidebarColumn"] div.css-175oi2r.r-1bro5k0:has(aside[role="complementary"]) { display: none !important;}',
    xTimelineCssOn: 'div[data-testid="primaryColumn"] section[role="region"] {visibility: visible !important; }',
    xTimelineCssOff: 'div[data-testid="primaryColumn"] section[role="region"] {visibility: hidden !important; }',

    // Instagram
    instagramFeedCssOn: 'main[role="main"] div.xw7yly9 > div.x168nmei, section._aalv._aal_ div._aam1 > div.x9f619, main[role="main"] div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x6s0dn4.x1oa3qoh.x1nhvcw1:has(article) {display: block !important;}',
    instagramFeedCssOff: 'main[role="main"] div.xw7yly9 > div.x168nmei, /* mobile 25 June */ main[role="main"] .x1qjc9v5 .x9f619:has(article), /* mobile */ section._aalv._aal_ div._aam1 > div._aac4, /* mobile 8 Apr 2024 */ main[role="main"] div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x6s0dn4.x1oa3qoh.x1nhvcw1:has(article) {display: none !important;}',
    instagramSearchFeedCssOn: '',
    instagramSearchFeedCssOff: 'main.xvbhtw8 div.x78zum5.xdt5ytf.x11lt19s.x1n2onr6.xph46j.x7x3xai.xsybdxg.x194l6zq, main[role="main"] ._aalg div[data-visualcompletion="loading-state"] {display: none !important;}',
    instagramStoriesCssOn: 'main div.xmnaoh6, section._aalv._aal_ div._aam1 > div._aac4, /* 15 jun 2025 mobile */ div[data-pagelet="story_tray"], main[role="main"] div.x1ixjvfu.x1q0q8m5.xso031l {display: block !important;}',
    instagramStoriesCssOff: 'main div.xmnaoh6, /* mobile */ section._aalv._aal_ div._aam1 > div._aac4, /* mobile 8 Apr 2024 */  main[role="main"] div.x1ixjvfu.x1q0q8m5.xso031l {display: none !important;}',
    instagramMutedStoriesCssOn: 'main[role="main"] div[role="menu"] button[role="menuitem"].xbyyjgo { display: flex !important; }',
    instagramMutedStoriesCssOff: 'main[role="main"] div[role="menu"] button[role="menuitem"].xbyyjgo { display: none !important; }',
    instagramExploreCssOn: 'a[href="/explore/"] { display: flex !important; }',
    instagramExploreCssOff: 'a[href="/explore/"] { display: none !important; }',
    instagramReelsCssOn: 'a[href="/reels/"] { display: flex !important; }',
    instagramReelsCssOff: 'a[href="/reels/"] { display: none !important; }',
    instagramSuggestionsCssOn: 'div.html-div.x14z9mp.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.xqui205.x1e56ztr.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1:has(a[href="/explore/people/"]) { display: block !important; }',
    instagramSuggestionsCssOff: 'div.html-div.x14z9mp.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.xqui205.x1e56ztr.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1:has(a[href="/explore/people/"]) { display: none !important; }',
    instagramCommentsCssOn: 'div.html-div.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1xmf6yo.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1:has(a[href*="/comments/"]) {display: block !important;}',
    instagramCommentsCssOff: 'div.html-div.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.xjbqb8w.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1xmf6yo.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1:has(a[href*="/comments/"]) {display: none !important;}',

    // LinkedIn
    linkedinFeedCssOn: '/* needs to be explicitly shown, otherwise not loaded */ div.scaffold-finite-scroll.scaffold-finite-scroll--infinite, div.scaffold-finite-scroll.scaffold-finite-scroll--finite, #feed-container, .feed-container {display: block !important;}',
    linkedinFeedCssOff: 'div.scaffold-finite-scroll.scaffold-finite-scroll--infinite, div.scaffold-finite-scroll.scaffold-finite-scroll--finite, #feed-container, .feed-container {display: none !important;}',
    linkedinNotificationsCssOn: '',
    linkedinNotificationsCssOff: 'span.notification-badge--show, #nav-notifications-small-badge, #nav-people-small-badge, span[data-badge-source="notificationsCount"] { display: none !important; }',
    linkedinNewsCssOn: '#feed-news-module, .feed-follows-module { display: block !important; }',
    linkedinNewsCssOff: '#feed-news-module, .feed-follows-module { display: none !important; }',
    linkedinAdsCssOn: 'section.ad-banner-container { display: block !important;}',
    linkedinAdsCssOff: 'section.ad-banner-container { display: none !important;}',

    // WhatsApp
    whatsappPreviewCssOn: 'div[data-testid="cell-frame-secondary"] { display: block !important; }',
    whatsappPreviewCssOff: 'div[data-testid="cell-frame-secondary"] { display: none !important; }',
    whatsappNotificationPromptCssOn: 'span[data-testid="chat-butterbar"] { display: block !important; }',
    whatsappNotificationPromptCssOff: 'span[data-testid="chat-butterbar"] { display: none !important; }',

    // Google
    googleBackgroundCssOn: '#tads, #atvcap .ptJHdc.yY236b.c3mZkd, #tads .CnP9N.U3A9Ac.irmCpc,.commercial-unit-mobile-top,.commercial-unit-mobile-top .v7hl4d,.commercial-unit-mobile-bottom .v7hl4d {background-color: transparent !important;}',
    googleBackgroundCssOff: '#tads, #atvcap .ptJHdc.yY236b.c3mZkd, #tads .CnP9N.U3A9Ac.irmCpc,.commercial-unit-mobile-top,.commercial-unit-mobile-top .v7hl4d,.commercial-unit-mobile-bottom .v7hl4d {background-color: #F2E6C3 !important;}',
    googleAIOverviewCssOn: '',
    googleAIOverviewCssOff: '#eKIzJc { display: none !important; }',

    // Reddit
    redditFeedCssOn: 'shreddit-feed { display: block !important; }',
    redditFeedCssOff: 'shreddit-feed { display: none !important; }',
    redditPopularCssOn: 'a[href="/r/popular/"] { display: flex !important; }',
    redditPopularCssOff: 'a[href="/r/popular/"] { display: none !important; }',
    redditAllCssOn: 'a[href="/r/all/"] { display: flex !important; }',
    redditAllCssOff: 'a[href="/r/all/"] { display: none !important; }',
    redditRecentCssOn: 'reddit-recent-pages { display: block !important; }',
    redditRecentCssOff: 'reddit-recent-pages { display: none !important; }',
    redditCommunitiesCssOn: '[aria-controls="communities_section"] + faceplate-auto-height-animator { display: block !important; } [aria-controls="communities_section"] { display: flex !important; }',
    redditCommunitiesCssOff: '[aria-controls="communities_section"] + faceplate-auto-height-animator { display: none !important; } [aria-controls="communities_section"] { display: none !important; }',
    redditNotificationCssOn: '#mini-inbox-tooltip { display: block !important; }',
    redditNotificationCssOff: '#mini-inbox-tooltip { display: none !important; }',
    redditChatCssOn: 'reddit-chat-header-button { display: block !important; }',
    redditChatCssOff: 'reddit-chat-header-button { display: none !important; }',
    redditTrendingCssOn: '[search-telemetry-source="popular_carousel"] { display: block !important; }',
    redditTrendingCssOff: '[search-telemetry-source="popular_carousel"] { display: none !important; }',
    redditPopularCommunitiesCssOn: '#popular-communities-list { display: block !important; } [aria-label="Popular Communities"] { display: block !important; }',
    redditPopularCommunitiesCssOff: '#popular-communities-list { display: none !important; } [aria-label="Popular Communities"] { display: none !important; }'
};
