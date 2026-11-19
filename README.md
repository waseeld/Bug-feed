# ⚡ BUG-FEED

> **Cyber Threat Intelligence & Bug Bounty Radar Platform**  
> *Automated, real-time aggregation of disclosed bug bounty reports, 11,900+ exploit PoCs, actively exploited zero-days, cybersecurity news, and infosec methodologies.*

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vue.js Version](https://img.shields.io/badge/vue-3.x-4fc08d.svg)](https://vuejs.org/)
[![Express.js](https://img.shields.io/badge/express-4.17-black.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)](Dockerfile)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-24%20passing-success.svg)](#-automated-testing)
[![Status](https://img.shields.io/badge/database-11%2C950%2B%20CVEs-amber.svg)](#)

---

## 🌟 Key Features

### 🔒 1. Mandatory Authentication & First-Time Setup Wizard
- **Zero-Trust Protection**: Every API endpoint and frontend view is strictly guarded behind cryptographic authentication.
- **Auto First-Time Setup**: Launches a cyberpunk setup wizard on fresh installations to initialize the root administrator account.
- **Zero External Fragile Binaries**: Built purely on Node.js native `crypto` using **PBKDF2-SHA512** (100k iterations, 16-byte random salt) and stateless **HMAC-SHA256** session tokens.

### 🛡️ 2. Complete 11,950+ CVE & Exploit PoC Archive
- **10,220+ GitHub Exploit PoCs**: Complete archive ingested from `nomi-sec/PoC-in-GitHub`.
- **1,709 CISA Zero-Days**: All actively exploited vulnerabilities from the official CISA KEV catalog.
- **100% Verified Direct Links**: Direct action buttons to **`[ 📦 GitHub PoC ]`**, **`[ 🛡️ CVE.org ]`**, **`[ 📑 NVD NIST ]`**, and **`[ 🔍 OSV ]`** with zero broken links.
- **High-Performance Pagination**: Browse 12,000 items at 60 FPS (50 items/page) with instant keyword search.

### 📰 3. CyprWana Blog
- Arabic cyber threat briefs, rendered right-to-left, with English terms, links, and CVE identifiers kept as written.
- One Markdown file per brief in [`posts/`](posts/). The server reads that folder on each request, so a new file shows up on refresh.
- List at `/blog` and a page per brief at `/blog/YYYY-MM-DD-HHMM`.

### 🤖 4. Automated Ingestion & $O(1)$ Deduplication Worker
- **Scheduled Auto-Sync**: Background worker polls threat feeds on a configurable schedule (default: **every 15 minutes**).
- **Multi-Tier Deduplication**: Normalizes URLs, strips tracking parameters, and computes SHA-256 fingerprints.
- **$O(1)$ In-Memory Registry**: Constant-time Set lookup handles 12,000+ items in milliseconds.
- **Atomic Persistence**: Uses atomic temporary-file swaps to guarantee zero corruption in `feeds_store.json`.

### 💰 5. HackerOne & Community Writeups
- Aggregates recently disclosed HackerOne bug reports with bounties, programs, and vulnerability types.
- Curates 6,400+ community writeups from PentesterLand (SSRF, IDOR, SQLi, RCE, OAuth).

### 📰 6. Cybersecurity News Radar
- Real-time RSS integration from The Hacker News and BleepingComputer.

### 💡 7. Twitter / X Bug Bounty Tips
- Direct links to specific tweets (`https://x.com/{handle}/status/{id}`).
- Curated threat researchers and hackers (`@vxunderground`, `@Jhaddix`, `@naglinagli`, `@kinugawamasato`).
- Dynamic runtime tracking: add custom accounts and hashtags directly from the UI.

### 🖥️ 8. Cyberpunk SOC Terminal Interface
- Dark & Light mode toggle with local storage persistence.
- Offline Bookmarks: Save reports, PoCs, and tips to read offline.
- Real-time SOC dashboard status bar with one-click **⚡ Sync Now** trigger.

---

## 🏗️ Architecture Overview

```
Bug-Feed
├── backend/
│   ├── data/                      # Persistent stores (feeds_store.json, seen_registry.json)
│   ├── feed/                      # Intelligence collectors (cve, hackerone, pentesterland, news, tweets)
│   ├── routes/                    # Express REST API endpoints
│   ├── blog.js                    # Markdown brief loader
│   ├── cache.js                   # Memory cache with TTL
│   ├── storage.js                 # SHA-256 fingerprinting & O(1) deduplication engine
│   └── worker.js                  # Ingestion cron scheduler & concurrency manager
├── posts/                         # One Markdown file per cyber brief
├── frontend/
│   ├── src/
│   │   ├── components/            # FeedCard, Navbar, and tab fragments
│   │   └── App.vue                # Main application layout
│   └── dist/                      # Webpack production build (served by backend)
├── docs/                          # Comprehensive technical documentation
└── main.js                        # Unified entry point
```

---

## 🚀 Quick Start

### Option A: Docker Compose (Recommended)

Run Bug-feed in an isolated container with a single command:
```bash
# Clone the repository
git clone https://github.com/waseeld/Bug-feed.git
cd Bug-feed

# Copy environment template
cp .env.example .env

# Build and start with Docker Compose
docker compose up -d
```
Open **[http://localhost:9600](http://localhost:9600)** in your browser. On initial launch, the **Setup Wizard** will guide you through creating your admin account.

---

### Option B: Local Node.js Setup

#### 1. Requirements
- **Node.js**: v18.0.0 or later
- **npm**: v8.0.0 or later

#### 2. Installation
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm --prefix frontend install
```

#### 3. Build & Run
```bash
# Build frontend production bundle
npm run build:frontend

# Start the Bug-feed platform
npm start
```
Open **[http://localhost:9600](http://localhost:9600)** in your browser.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `9600` | HTTP port for the web server and API. |
| `SYNC_INTERVAL_MINUTES` | `15` | Ingestion scheduler sync interval in minutes. |
| `DISABLE_WORKER` | `false` | Set to `true` to disable background polling. |

---

## 📖 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/feeds/all` | Combined stream of all feeds. |
| `GET` | `/api/feeds/cve` | Full 11,950+ CVE & PoC database. |
| `GET` | `/api/feeds/hackerone` | Disclosed bug reports & writeups. |
| `GET` | `/api/feeds/news` | Infosec headlines. |
| `GET` | `/api/feeds/tips` | Bug bounty tips & tweet threads. |
| `GET` | `/api/blog` | Cyber brief index (title, Riyadh time, excerpt, CVE ids). |
| `GET` | `/api/blog/:slug` | One brief, rendered to HTML. Slug is the filename without `.md`. |
| `GET` | `/api/worker/status` | Real-time worker and storage metrics. |
| `POST` | `/api/worker/sync` | Trigger an immediate sync cycle. |
| `POST` | `/api/twitter/account`| Add a new Twitter handle to track. |
| `POST` | `/api/twitter/hashtag`| Add a new hashtag to monitor. |

---

## 📝 Adding a blog post

Drop **one file** into `posts/`. No frontend rebuild is required. Save the file and refresh `/blog`.

### Path

```text
posts/YYYY-MM-DD-HHMM.md
```

- `YYYY-MM-DD` is the brief date.
- `HHMM` is the time in **Asia/Riyadh**, 24-hour, with no colon. `0600` is 06:00, `1400` is 14:00, `2200` is 22:00.
- The filename without `.md` is the URL slug. `posts/2026-11-19-1400.md` is served at `/blog/2026-11-19-1400`.
- Files that do not match this name are ignored.

### Format

The title is the lead item (the top story), not the date banner. Keep the author's wording, every item, every source link, and every CVE id. The sample below is shortened so the format is easy to copy. A real file keeps every line of the brief.

```markdown
---
title: "🔴 الأهم : Citrix NetScaler ADC/Gateway - تحديث ثاني لازم (CVE-2026-120868)"
date: 2026-11-19
time: "14:00"
timezone: Asia/Riyadh
lang: ar
---

**🛡️ تحديث سيبر | الخميس 19 نوفمبر - 2 الظهر**
*الجديد بس من بعد تقرير الصبح 🙂*

**🔴 الأهم : Citrix NetScaler ADC/Gateway - تحديث ثاني لازم (CVE-2026-120868)**
- نشرة Citrix (12 نوفمبر) صلّحت 28 ثغرة، أخطرها CVE-2026-120868 بـ CVSS 9.3
*POC : ما شفت كود منشور لين الحين*
[naif_aiydh](https://x.com/naif_aiydh/status/2123301576370495809)

*عموما ، الأولوية اليوم NetScaler و PHP .. 💙 CyprWana*
```

Markdown the page understands:

| Write this | It renders as |
| :--- | :--- |
| `**text**` | Bold item headline |
| `*text*` | Italic note. A line wrapped in single asterisks can contain a literal `*` inside it. |
| `` `code` `` | Monospace code |
| `[label](https://example.com)` | Source link. Use `http` or `https` only. |
| A line starting with `- ` | Bullet item |
| A line that is `---` | Section break |
| `CVE-2026-120868` | The same CVE id, linked to its NVD record |

The article is `lang="ar"` and `dir="rtl"`. English names, URLs, code, and CVE ids stay left-to-right inside the Arabic text.

Date and time in the filename win over the front matter. `timezone` defaults to `Asia/Riyadh` when it is omitted. The body is the full brief, including the original banner, so nothing from the brief is dropped.

---

## 📚 Complete Documentation

Detailed technical documentation is available in the [`docs/`](docs/) directory:

- **[Documentation Index](docs/README.md)**
- **Backend**:
  - [Architecture & Concurrency](docs/backend/architecture.md)
  - [Storage & Deduplication Engine](docs/backend/storage-and-deduplication.md)
  - [Feeds Ingestion Pipelines](docs/backend/feeds-ingestion.md)
  - [REST API Reference](docs/backend/api-reference.md)
- **Frontend**:
  - [Vue 3 Architecture](docs/frontend/architecture.md)
  - [Component Catalog](docs/frontend/components.md)
  - [Pagination & High-Scale Search](docs/frontend/pagination-and-search.md)
  - [Design System & Cyber Theme](docs/frontend/styling-and-theme.md)
- **Testing**:
  - [Automated Testing Suite Guide](docs/testing.md)

---

## 🧪 Automated Testing

Run the full end-to-end automated test suite:
```bash
# Run all tests (storage, feeds, api)
npm test

# Run specific suites
npm run test:storage
npm run test:feeds
npm run test:api
```
All 24 tests execute in under 4 seconds with zero external test dependencies.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
