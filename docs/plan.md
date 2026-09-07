# Implementation Plan - Bug-Feed Full-Stack Modernization & Vue 3 Migration

Modernize and complete the migration of **Bug-feed**, replacing fragile scrapers with fast, reliable feeds (HackerOne, Pentester Land, CVE/PoCs, Infosec News, Bug Bounty Tips) backed by an in-memory TTL cache, and completing the Vue 3 frontend with reusable components and local bookmarking.

## Proposed Changes

### 1. Workspace Cleanup & Server Consolidation

- **Delete directory `front/`**: Remove the redundant empty Vue-cli template.
- **Fix root [main.js](file:///c:/Users/dddwa/Documents/Bug-feed/main.js)**:
  - Update paths to `./backend/config` and `./backend/routes/index`.
  - Add Express CORS support and static file serving for `frontend/dist` or public assets.
  - Enable unified error handling and graceful shutdown.
  - Add periodic background cache refresh using `node-cron`.

---

### 2. Backend Feed Pipeline & Unified Normalization (`backend/`)

All feeds will return a standardized schema:
```json
{
  "id": "unique-id",
  "title": "Title of report / CVE / article / tip",
  "source": "HackerOne | Pentester Land | CVE | The Hacker News | Twitter/Reddit",
  "category": "vulnerabilities | writeups | cve | news | tips",
  "url": "https://...",
  "published_at": "ISO-8601 or YYYY-MM-DD",
  "tags": ["XSS", "Bounty", "RCE"]
}
```

#### Cache Manager
#### [NEW] [cache.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/cache.js)
- Fast in-memory cache with configurable TTL (default 15 minutes).
- Automatic periodic background refresh so API responses are near-instantaneous (< 10ms) without hitting rate limits.

#### Feed Ingestion Modules
#### [MODIFY] [hackerone.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/feed/hackerone.js)
- Fetch recent disclosed reports using the `reddelexc/hackerone-reports` dataset with fallback to HackerOne's Hacktivity GraphQL.
- Extract `title`, `program`, `url`, `bounty`, `vuln_type`, and format tags.

#### [NEW] [pentesterland.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/feed/pentesterland.js)
- Ingest writeups from `https://pentester.land/writeups.json` (6,400+ curated community writeups).
- Map authors, target programs, and bug categories to tags.

#### [MODIFY] [cve.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/feed/cve.js)
- Ingest recent PoCs and disclosures from GitHub `nomi-sec/PoC-in-GitHub` latest records + `cve.circl.lu/api/last` with fallback.
- Extract CVE IDs, descriptions, and verified PoC GitHub repository links.

#### [NEW] [news.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/feed/news.js)
- Ingest and parse Infosec RSS feeds (The Hacker News RSS feed `https://feeds.feedburner.com/TheHackersNews`, BleepingComputer).
- Lightweight XML/RSS parsing without external heavy binary dependencies.

#### [NEW] [tweets.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/feed/tweets.js)
- Curated Bug Bounty Tips & Discussions feed using community Atom/RSS (Reddit `r/bugbounty/.rss` tips and public RSSHub/Twitter feeds).

#### Normalized Routes
#### [MODIFY] [routes/index.js](file:///c:/Users/dddwa/Documents/Bug-feed/backend/routes/index.js)
- Endpoints:
  - `GET /api/feeds/all`: All feeds aggregated and sorted by date.
  - `GET /api/feeds/hackerone`: HackerOne reports & Pentester Land writeups.
  - `GET /api/feeds/cve`: Recent CVEs and PoCs.
  - `GET /api/feeds/news`: Security news articles.
  - `GET /api/feeds/tips`: Bug bounty tips & techniques.
  - `GET /api/feeds/metrics/todays` & `metrics/saved`: Retain metric endpoints for welcome charts.
  - `POST /api/feeds/reload`: Trigger manual cache refresh.

---

### 3. Frontend Modernization & Vue 3 Component Migration (`frontend/`)

#### Clean App Container & Layout
#### [MODIFY] [frontend/src/App.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/App.vue)
- Remove all legacy `{% include "fragments/..." %}` tags and inline spaghetti scripts.
- Modern responsive navigation bar with:
  - Brand header with icon
  - Top live-search input (instant reactive search filtering across all feeds)
  - Dark / Light mode toggle switch
  - Tab navigation: **Welcome / Stats**, **Disclosures & Writeups**, **CVEs & PoCs**, **Security News**, **Tips & Tweets**, and **Bookmarks (Saved)**.
- Integrated bookmark manager backed by browser `LocalStorage`.

#### Reusable Feed Card Component
#### [NEW] [frontend/src/components/FeedCard.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/FeedCard.vue)
- Uniform, polished card design supporting:
  - Source badge (HackerOne, PentesterLand, CVE, News, Reddit/Twitter) with distinctive branding colors.
  - Title with external link icon.
  - Publication timestamp / relative time.
  - Category and tag pills (e.g. `RCE`, `XSS`, `Bounty $1,000`).
  - One-click Bookmark / Save button (persisted to LocalStorage).
  - Share / Copy link button.

#### Specialized Feed Tab Components
#### [MODIFY] [frontend/src/components/fragments/welcome.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/welcome.vue)
- Modern stats overview: live feed counts, last sync time, quick action shortcuts, and category distribution.
#### [NEW] [frontend/src/components/fragments/HackeroneFeed.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/HackeroneFeed.vue)
- Disclosed bug reports and community writeups with source filter (HackerOne vs PentesterLand).
#### [NEW] [frontend/src/components/fragments/CveFeed.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/CveFeed.vue)
- Latest CVE disclosures and active PoC repository links.
#### [NEW] [frontend/src/components/fragments/NewsFeed.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/NewsFeed.vue)
- Latest cybersecurity news articles with descriptions and publication dates.
#### [NEW] [frontend/src/components/fragments/TweetsFeed.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/TweetsFeed.vue)
- Bug bounty techniques, community tips, and threads.
#### [NEW] [frontend/src/components/fragments/SavedFeed.vue](file:///c:/Users/dddwa/Documents/Bug-feed/frontend/src/components/fragments/SavedFeed.vue)
- LocalStorage bookmark viewer with clear-all and remove-item controls, searchable and exportable.

---

## Verification Plan

### Automated & Unit Verification
- Run Node verification tests against each feed fetcher (`node -e "..."`) to confirm:
  - `backend/feed/hackerone.js` returns valid normalized objects.
  - `backend/feed/pentesterland.js` parses writeups correctly into schema.
  - `backend/feed/cve.js` parses CVEs and PoCs into schema.
  - `backend/feed/news.js` parses RSS XML into schema.
  - `backend/feed/tweets.js` parses tips into schema.
- Start the Express server on port 9600 and test all endpoints (`/api/feeds/all`, `/api/feeds/hackerone`, `/api/feeds/cve`, `/api/feeds/news`, `/api/feeds/tips`).

### Manual & UI Verification
- Verify that `front/` directory is completely removed.
- Verify `App.vue` compiles cleanly without any `{% include %}` syntax errors.
- Test live search filtering across feeds.
- Test bookmarking: save an item, switch to Saved tab, confirm it is listed, refresh page, confirm persistence in LocalStorage.
