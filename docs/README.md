# 📚 Bug-Feed Documentation Index

Welcome to the comprehensive technical documentation for **Bug-Feed**, the automated threat intelligence and vulnerability radar platform.

---

## 🧭 Documentation Structure

```
docs/
├── README.md                          # Documentation overview & sitemap (this file)
├── plan.md                            # Historical modernization plan
├── backend/                           # Backend Engine & APIs
│   ├── architecture.md                # System architecture, lifecycle, and concurrency
│   ├── storage-and-deduplication.md   # SHA-256 fingerprinting, O(1) registry, atomic storage
│   ├── feeds-ingestion.md             # Ingestion pipelines (CVEs, HackerOne, News, Twitter)
│   └── api-reference.md               # Complete REST API reference with schemas & examples
└── frontend/                          # Frontend UI & Vue 3 Application
    ├── architecture.md                # Vue 3 architecture, build pipeline, and routing
    ├── components.md                  # Component hierarchy and specification
    ├── pagination-and-search.md       # High-scale 12,000+ item pagination & search
    └── styling-and-theme.md           # Cyberpunk SOC design system, tokens, and themes
```

---

## 🚀 Quick Navigation

### ⚙️ Backend Documentation
1. **[Backend Architecture](backend/architecture.md)**
   - Express server lifecycle, compression, CORS.
   - Background ingestion daemon vs. standalone worker.
   - Concurrency locking and request timeouts.
2. **[Storage & Multi-Tier Deduplication](backend/storage-and-deduplication.md)**
   - SHA-256 URL + Title fingerprinting.
   - $O(1)$ in-memory seen registry (`seen_registry.json`).
   - Atomic file persistence (`feeds_store.json`).
3. **[Feeds Ingestion Pipeline](backend/feeds-ingestion.md)**
   - CSAF v5 / CVE 5.0 and CISA KEV parser.
   - 10,200+ GitHub exploit PoC ingestion.
   - HackerOne disclosures & PentesterLand writeups.
   - Twitter / X RSS feed scraper with handle & hashtag filters.
4. **[REST API Reference](backend/api-reference.md)**
   - All `/api/feeds/*`, `/api/worker/*`, and `/api/twitter/*` endpoints.

---

### 🎨 Frontend Documentation
1. **[Frontend Architecture](frontend/architecture.md)**
   - Vue 3 composition, single-page application lifecycle.
   - Webpack production bundling into `frontend/dist`.
2. **[Component Catalog](frontend/components.md)**
   - `App.vue`: Root layout, theme switching, global navigation.
   - `FeedCard.vue`: Universal cyber feed card with multi-action buttons (GitHub PoC, CVE.org, NVD, OSV).
   - `welcome.vue`: Live SOC radar dashboard and real-time sync control.
   - `CveFeed.vue`: Paginated CVE explorer with filters.
   - `TweetsFeed.vue`: Twitter / X bug bounty tips & hashtag tracker.
   - `HackeroneFeed.vue`: Bug bounty disclosure directory.
   - `NewsFeed.vue`: Infosec news ticker.
   - `SavedFeed.vue`: Offline localStorage bookmarks.
3. **[Pagination & Reactive Search](frontend/pagination-and-search.md)**
   - Handling 11,900+ items smoothly at 60 FPS.
   - Instant client-side search across CVE IDs, titles, and tags.
4. **[Design System & Themes](frontend/styling-and-theme.md)**
   - Cyberpunk SOC dark palette, neon accents, and typography.
   - Dark/Light mode implementation via CSS custom properties.

---

### 🧪 Testing & Verification
- **[Automated Testing Suite](testing.md)**
  - Zero-dependency Node.js test runner.
  - Feed integrity tests (zero `CVE-UNKNOWN`, valid URLs).
  - $O(1)$ deduplication benchmarks and atomic write tests.
  - REST API endpoint integration tests.
  - Running `npm test` and CI/CD setup.
