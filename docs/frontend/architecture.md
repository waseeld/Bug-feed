# Frontend Architecture

The **Bug-Feed** frontend is a reactive Single Page Application (SPA) built with **Vue 3**, engineered for high rendering performance, real-time threat analysis, and an immersive Cyber SOC terminal experience.

---

## 1. Technology Stack

- **Framework**: Vue 3 (Options API for component stability and clarity)
- **Tooling**: Vue CLI 5 / Webpack 5
- **Styling**: Bootstrap 5 grid + Custom Cyber CSS Design Tokens
- **Icons & Typography**: Inline SVG icons + JetBrains Mono / Inter webfonts
- **Production Asset Serving**: Pre-compiled Webpack production bundle in `frontend/dist/`, served directly by the Express backend.

---

## 2. Directory Structure

```
frontend/
├── src/
│   ├── App.vue                       # Root application shell & global nav
│   ├── main.js                       # Vue 3 application mount
│   ├── components/
│   │   ├── FeedCard.vue              # Universal feed card with direct action buttons
│   │   ├── HelloWorld.vue            # Legacy wrapper
│   │   └── fragments/                # Tab views
│   │       ├── welcome.vue           # SOC Radar Dashboard & Ingestion Bar
│   │       ├── CveFeed.vue           # Paginated CVE & Exploit PoC explorer
│   │       ├── TweetsFeed.vue        # Twitter/X bug bounty tips & filter controls
│   │       ├── HackeroneFeed.vue     # Disclosures & writeups directory
│   │       ├── NewsFeed.vue          # Infosec news feed
│   │       └── SavedFeed.vue         # Local offline bookmarks
│   └── assets/                       # Global css, vendor scripts, and icons
├── public/                           # Static HTML shell & favicons
├── dist/                             # Compiled production build
└── vue.config.js                     # Webpack build configuration
```

---

## 3. Build & Deployment Lifecycle

### Production Build
Running the production build command compiles, minifies, and splits JavaScript/CSS chunks:
```bash
npm --prefix frontend run build
# Or from root:
npm run build:frontend
```
- Compiled assets are generated in `frontend/dist/`.
- The Express backend (`main.js`) statically serves `frontend/dist` on `http://localhost:9600/`.

### Development Server (Hot Reload)
```bash
npm run dev:frontend
```
- Starts the Webpack dev server on port `8080` with proxying to port `9600`.

---

## 4. State Management & Offline Persistence

Bug-Feed maintains lightweight reactive state without requiring heavyweight state libraries:
1. **Global Search (`searchQuery`)**: Propagated from `App.vue` down to active feed components.
2. **Offline Bookmarks (`savedItems`)**: Stored in browser `localStorage` under `bugfeed_saved`. Allows researchers to save reports and PoCs offline.
3. **Theme Preference (`theme`)**: Stored in `localStorage` under `bugfeed_theme` (`dark` or `light`).
