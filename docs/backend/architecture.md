# Backend Architecture

The **Bug-Feed** backend is an asynchronous, high-performance Node.js service designed for real-time cyber threat intelligence ingestion, deduplication, and low-latency API delivery.

---

## 1. System Overview

```
                      +------------------------------------------+
                      |         External Threat Sources          |
                      |  GitHub PoCs, CISA KEV, CIRCL, NVD,     |
                      |  HackerOne, PentesterLand, News, X/RSS   |
                      +--------------------+---------------------+
                                           |
                                           | Polling / Ingestion (Every 15m)
                                           v
                      +--------------------+---------------------+
                      |    Ingestion Engine (worker.js)          |
                      |  - Concurrency Lock (isRunning)          |
                      |  - 45s Request Timeout Boundaries        |
                      +--------------------+---------------------+
                                           |
                                           | Raw Batches
                                           v
                      +--------------------+---------------------+
                      |    Storage Engine (storage.js)           |
                      |  - Canonical URL Normalization           |
                      |  - SHA-256 Fingerprinting                |
                      |  - O(1) Set Deduplication                |
                      |  - Atomic Temporary-File Persistence     |
                      +----------+--------------------+----------+
                                 |                    |
                                 v                    v
                      +----------+---------+ +--------+----------+
                      |  feeds_store.json  | | seen_registry.json|
                      |  (Categorized Data)| | (Fingerprint Set) |
                      +----------+---------+ +-------------------+
                                 |
                                 | In-Memory Cache (< 20ms read)
                                 v
                      +----------+-------------------------------+
                      |         Express REST API                 |
                      |  - Compression (Gzip)                    |
                      |  - CORS & Static Frontend Assets         |
                      |  - Endpoints (/api/feeds/*, /api/worker/*|
                      +------------------------------------------+
```

---

## 2. Process Execution Models

Bug-Feed provides two modes of running the background ingestion worker:

### A. Integrated Daemon (Default)
When starting the server via `npm start` or `node main.js`:
- The Express HTTP server starts on port `9600`.
- The worker daemon is automatically initialized via `node-cron`.
- Sync interval is controlled by `process.env.SYNC_INTERVAL_MINUTES` (defaults to **15 minutes**).
- Can be disabled by setting `DISABLE_WORKER=true`.

### B. Standalone Worker (Microservice Mode)
For containerized setups or dedicated background jobs:
```bash
npm run worker
# or with custom interval:
node backend/worker.js --interval=10
```
- Operates independently from the HTTP server.
- Shares the same atomic persistence storage (`backend/data/`).

---

## 3. Concurrency Protection & Fault Tolerance

1. **Overlapping Cycle Prevention (`isRunning`)**:
   - If an external source takes longer to respond, subsequent cron triggers detect that a cycle is currently active and skip execution gracefully.
2. **Network Timeouts (`fetchWithTimeout`)**:
   - Every outbound network request is governed by a strict timeout (up to 45 seconds).
   - If a source hangs or times out, `Promise.allSettled` guarantees that other feeds complete unimpeded.
3. **Graceful Fallbacks**:
   - If a remote API returns non-200 HTTP statuses, individual feed parsers log a warning and return cached or empty arrays without terminating the server.

---

## 4. Performance Profile
- **Response Latency**: `/api/feeds/cve` returns 11,950+ items in **~400ms**; other endpoints respond in **< 20ms**.
- **Memory Footprint**: Average RSS memory is under 120MB.
- **Disk Footprint**: `feeds_store.json` occupies ~3.2MB for 12,000 items.
