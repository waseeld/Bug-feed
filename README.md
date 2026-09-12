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

### 🤖 2. Automated Ingestion & $O(1)$ Deduplication Worker
- **Scheduled Auto-Sync**: Background worker polls threat feeds on a configurable schedule (default: **every 15 minutes**).
- **Multi-Tier Deduplication**: Normalizes URLs, strips tracking parameters, and computes SHA-256 fingerprints.
- **$O(1)$ In-Memory Registry**: Constant-time Set lookup handles 12,000+ items in milliseconds.
- **Atomic Persistence**: Uses atomic temporary-file swaps to guarantee zero corruption in `feeds_store.json`.

### 💰 3. HackerOne & Community Writeups
- Aggregates recently disclosed HackerOne bug reports with bounties, programs, and vulnerability types.
- Curates 6,400+ community writeups from PentesterLand (SSRF, IDOR, SQLi, RCE, OAuth).

### 📰 4. Cybersecurity News Radar
- Real-time RSS integration from The Hacker News and BleepingComputer.

### 💡 5. Twitter / X Bug Bounty Tips
- Direct links to specific tweets (`https://x.com/{handle}/status/{id}`).
- Curated threat researchers and hackers (`@vxunderground`, `@Jhaddix`, `@naglinagli`, `@kinugawamasato`).
- Dynamic runtime tracking: add custom accounts and hashtags directly from the UI.

### 🖥️ 6. Cyberpunk SOC Terminal Interface
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
│   ├── cache.js                   # Memory cache with TTL
│   ├── storage.js                 # SHA-256 fingerprinting & O(1) deduplication engine
│   └── worker.js                  # Ingestion cron scheduler & concurrency manager
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
| `GET` | `/api/worker/status` | Real-time worker and storage metrics. |
| `POST` | `/api/worker/sync` | Trigger an immediate sync cycle. |
| `POST` | `/api/twitter/account`| Add a new Twitter handle to track. |
| `POST` | `/api/twitter/hashtag`| Add a new hashtag to monitor. |

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
