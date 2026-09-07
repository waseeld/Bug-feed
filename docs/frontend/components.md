# Frontend Component Catalog

This document details each Vue 3 component in the Bug-Feed platform, including props, events, and functionality.

---

## 1. `App.vue` (Application Shell)
The root component that anchors the top navigation header, global search bar, bookmarks counter, and tab routing.
- **State**:
  - `activeTab`: `'welcome' | 'disclosures' | 'cve' | 'news' | 'tips' | 'saved'`.
  - `searchQuery`: Bound to the sticky search bar.
  - `savedItems`: Array of bookmarked objects synchronized with `localStorage`.
  - `theme`: `'dark' | 'light'`.
- **Key Methods**:
  - `toggleTheme()`: Flips theme class on `document.body`.
  - `handleToggleSave(item)`: Adds or removes items from bookmarks.

---

## 2. `FeedCard.vue` (Universal Card Component)
Renders individual intelligence records across all categories.
- **Props**:
  - `item` *(Object, required)*: Feed data object.
  - `isSaved` *(Boolean)*: Whether item is bookmarked.
- **Features**:
  - **Dynamic Styling**: Computes card borders and badge classes based on source (`source-cve`, `source-hackerone`, `source-news`, `source-tips`).
  - **Direct External Link**: Card title opens the verified link.
  - **CVE Dedicated Action Buttons**:
    - `[ 📦 GitHub PoC ↗ ]`: Direct link to exploit source code.
    - `[ 🛡️ CVE.org Record ↗ ]`: Authoritative global CVE bulletin.
    - `[ 📑 NVD NIST ↗ ]`: NIST National Vulnerability Database.
    - `[ 🔍 OSV Advisory ↗ ]`: Open Source Vulnerabilities bulletin.
  - **Interactive Actions**: One-click bookmark toggle and clipboard URL copy with animated checkmark.

---

## 3. `welcome.vue` (Live SOC Radar Dashboard)
The primary overview dashboard.
- **Features**:
  - **Hero Threat Banner**: High-level telemetry and live system clock.
  - **SOC Auto-Ingestion Status Bar**: Live pulse indicator, sync interval, last run timing, total items in database, and duplicates rejected.
  - **⚡ Sync Now Button**: Allows triggering an immediate ingestion cycle with reactive UI state.
  - **Interactive Telemetry Boxes**: Clickable category metric boxes with count formatting (`(11,956).toLocaleString()`).

---

## 4. `CveFeed.vue` (Paginated Vulnerability Explorer)
High-performance explorer for over 11,950+ CVE and exploit records.
- **Props**: `searchQuery`, `savedIds`.
- **Features**:
  - Sub-filters: `All CVEs (11,956)`, `GitHub PoCs (10,222)`, `Advisories & KEV (1,734)`.
  - Page size dropdown: 30 / 50 / 100 items per page.
  - Range counter: `Showing 1 – 50 of 11,956 CVE records`.
  - Pagination navigation with smooth scroll back to top.
  - Instant reactive search filtering.

---

## 5. `TweetsFeed.vue` (Twitter / X Bug Bounty Tips)
Curated bug bounty methodologies and tweet threads.
- **Features**:
  - Displays direct links to tweets (`https://x.com/{handle}/status/{id}`).
  - Account and hashtag filter chips (`@kinugawamasato`, `@Jhaddix`, `#bugbountytips`, etc.).
  - Add Custom Account & Hashtag interactive modal dialog.

---

## 6. `HackeroneFeed.vue` & `NewsFeed.vue`
- `HackeroneFeed.vue`: Disclosed bug bounty reports, bounties awarded, programs, and writeups.
- `NewsFeed.vue`: Breaking news headlines from The Hacker News and BleepingComputer.

---

## 7. `SavedFeed.vue` (Bookmarks Manager)
- Displays all bookmarked items saved in local browser storage.
- Search within bookmarks and one-click "Clear All" action.
