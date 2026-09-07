# REST API Reference

All API routes are served under the `/api` prefix on port `9600`. Responses are formatted in standard JSON and compressed via Gzip.
Protected endpoints require `Authorization: Bearer <token>` in headers.

---

## 0. Authentication & Security Endpoints

### `GET /api/auth/status` (Public)
Checks whether the application administrator account has been initialized and whether the incoming request possesses a valid session token.
- **Response**:
  ```json
  {
    "status": 200,
    "initialized": true,
    "authenticated": false,
    "user": null
  }
  ```

---

### `POST /api/auth/setup` (Public, First-time only)
Initializes the primary administrator account during the first-time setup wizard. Once initialized, subsequent setup attempts are strictly blocked.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "MasterPassword123!"
  }
  ```
- **Response**:
  ```json
  {
    "status": 200,
    "message": "Administrator account successfully initialized",
    "data": {
      "user": { "id": "admin-12345", "username": "admin", "role": "admin" },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

### `POST /api/auth/login` (Public)
Authenticates user credentials against PBKDF2-SHA512 hashes and returns an HMAC-SHA256 Bearer token.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "MasterPassword123!"
  }
  ```
- **Response**:
  ```json
  {
    "status": 200,
    "message": "Authentication successful",
    "data": {
      "user": { "id": "admin-12345", "username": "admin", "role": "admin" },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

### `GET /api/auth/me` (Protected)
Returns the identity and role of the currently authenticated token.

---

### `POST /api/auth/logout` (Public)
Terminates the client session and advises client to discard stored tokens.

---

## 1. Intelligence Feeds Endpoints (Protected)

### `GET /api/feeds/all`
Returns an aggregated stream across all four intelligence categories.
- **Query Parameters**:
  - `limit` *(optional, integer)*: Maximum items to return. Defaults to 100.
- **Sample Response**:
  ```json
  {
    "status": 200,
    "count": 100,
    "data": [
      {
        "id": "poc-CVE-2026-0303-YonLiud_CVE_2026_0303",
        "title": "CVE-2026-0303: A code execution vulnerability in Palo Alto Networks Checkov...",
        "source": "GitHub PoC",
        "category": "cve",
        "url": "https://github.com/YonLiud/CVE-2026-0303",
        "cve_url": "https://www.cve.org/CVERecord?id=CVE-2026-0303",
        "published_at": "2026-09-10",
        "tags": ["CVE-2026-0303", "PoC", "Exploit"]
      }
    ]
  }
  ```

---

### `GET /api/feeds/cve`
Returns the vulnerability and exploit PoC archive.
- **Query Parameters**:
  - `limit` *(optional, integer)*: Omit to retrieve the complete archive (11,950+ items).
- **Attributes on Item**:
  - `cve_id`: Clean CVE identifier.
  - `cve_url`: Authoritative link to `https://www.cve.org/CVERecord?id={id}`.
  - `nvd_url`: Companion link to `https://nvd.nist.gov/vuln/detail/{id}`.
  - `osv_url`: Link to Open Source Vulnerabilities database (if applicable).
  - `url`: Direct link to GitHub exploit code or bulletin.

---

### `GET /api/feeds/hackerone`
Returns disclosed HackerOne vulnerability reports and PentesterLand writeups.
- **Query Parameters**:
  - `limit` *(optional, integer)*: Default: 100.

---

### `GET /api/feeds/news`
Returns curated cybersecurity news from The Hacker News and BleepingComputer.
- **Query Parameters**:
  - `limit` *(optional, integer)*: Default: 100.

---

### `GET /api/feeds/tips`
Returns curated bug bounty methodologies, tricks, and tweet threads.
- **Query Parameters**:
  - `account` *(optional, string)*: Filter by Twitter handle (e.g. `vxunderground`, `Jhaddix`).
  - `hashtag` *(optional, string)*: Filter by hashtag (e.g. `bugbountytips`, `infosec`).
  - `search` *(optional, string)*: Keyword search across tweet text.

---

## 2. Ingestion Worker & Monitoring Endpoints

### `GET /api/worker/status`
Returns real-time operational metrics of the automated ingestion engine.
- **Response Example**:
  ```json
  {
    "status": 200,
    "data": {
      "worker_active": true,
      "is_currently_syncing": false,
      "interval_minutes": 15,
      "total_runs": 8,
      "last_run_end": "2026-09-13T02:32:30.812Z",
      "last_run_duration_ms": 11200,
      "last_result": {
        "total_added": 12,
        "total_skipped_duplicates": 12040
      },
      "storage_stats": {
        "total_items": 12145,
        "disclosures": 110,
        "cve": 11956,
        "news": 50,
        "tips": 29,
        "total_seen_registry": 12184
      }
    }
  }
  ```

---

### `POST /api/worker/sync`
Triggers an immediate on-demand ingestion and deduplication cycle.
- **Response Example**:
  ```json
  {
    "status": 200,
    "message": "Worker sync cycle executed successfully",
    "data": {
      "status": "success",
      "duration_ms": 9400,
      "total_added": 0,
      "total_skipped_duplicates": 12145
    }
  }
  ```

---

### `GET /api/worker/history`
Returns an audit log of recent sync cycles.
- **Query Parameters**:
  - `limit` *(optional, integer)*: Default: 15.

---

### `POST /api/worker/interval`
Dynamically adjusts the cron schedule without server restart.
- **Request Body**:
  ```json
  { "minutes": 10 }
  ```

---

## 3. Twitter Configuration Endpoints

### `GET /api/twitter/accounts`
Returns the list of tracked infosec researchers and organizations.

### `POST /api/twitter/account`
Adds a new handle to the active tracking rotation.
- **Request Body**: `{ "handle": "alra3ees" }`

### `GET /api/twitter/hashtags`
Returns currently monitored hashtags.

### `POST /api/twitter/hashtag`
Adds a new hashtag to monitor.
- **Request Body**: `{ "tag": "redteam" }`

---

## 4. Metrics Endpoints

### `GET /api/feeds/metrics/todays`
Returns counts for the dashboard overview charts and stat boxes.
- **Response**: `{ "hackerone": 60, "writeups": 50, "cve": 11956, "news": 50, "tips": 29, "total": 12145 }`
