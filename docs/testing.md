# Automated Testing Suite

The **Bug-Feed** repository features a zero-dependency, high-speed automated test suite located in `test/`. It verifies every layer of the platform: data storage, SHA-256 deduplication, remote feed collectors, and REST API endpoints.

---

## 1. Quick Test Commands

Run the full suite or individual test suites directly using `npm` or `node`:

```bash
# Run all test suites
npm test
# (Equivalent to: node test/run-all.js)

# Run specific suites
npm run test:storage    # Storage & O(1) deduplication tests
npm run test:feeds      # Threat intelligence feeds ingestion tests
npm run test:api        # REST API HTTP endpoints tests
```

---

## 2. Test Architecture

```
test/
├── runner.js          # Native zero-dependency test runner with colored CLI reporting
├── storage.test.js    # Multi-tier deduplication, SHA-256, Set registry, atomic write
├── feeds.test.js      # Collectors (CVEs, PoCs, HackerOne, PentesterLand, News, Tweets)
├── api.test.js        # REST API endpoints (/api/feeds/*, /api/worker/*, /api/twitter/*)
└── run-all.js         # Master test orchestrator
```

- **Zero External Test Frameworks**: Built using Node.js native `assert` and async execution, meaning tests run instantly without needing heavy test dependencies like Jest or Mocha.
- **Execution Speed**: All 22 tests execute in **under 3 seconds**.

---

## 3. Test Suites & Assertions

### Suite A: Storage & Deduplication (`test/storage.test.js`)
- **Fingerprint Normalization**: Validates that tracking parameters (`utm_*`, `fbclid`, etc.) are stripped, producing identical 64-character SHA-256 hashes.
- **Unique Item Verification**: Confirms that different vulnerabilities produce distinct cryptographic hashes.
- **100% Duplicate Rejection**: Ingests a batch, then re-ingests the identical batch immediately, asserting that `added === 0` and `skipped === batch.length`.
- **$O(1)$ Performance Benchmark**: Verifies that deduplicating large batches executes in under **150 milliseconds**.
- **Capacity Limits**: Confirms category limits (30,000 for CVE, 2,000 for news).
- **Atomic Swap Safety**: Asserts that `saveStore()` completes atomically without errors.

---

### Suite B: Threat Intelligence Feeds (`test/feeds.test.js`)
- **CVE Feed Zero-Unknown Rule**: Asserts that no CVE record contains `CVE-UNKNOWN` in its title, ID, or URL.
- **URL Destination Validation**: Verifies that GitHub PoC links resolve to `https://github.com/` and companion advisory links resolve to `https://www.cve.org/`.
- **HackerOne Disclosures**: Asserts that disclosed reports contain target programs and bounty amounts.
- **PentesterLand Writeups**: Confirms community writeup parsing.
- **Infosec News**: Asserts headlines from The Hacker News and BleepingComputer.
- **Twitter / X Tips**: Validates that direct status links (`https://x.com/...`) and author handles are formatted correctly.

---

### Suite C: REST API Endpoints (`test/api.test.js`)
- `GET /`: Returns HTTP 200 and frontend HTML content.
- `GET /api/feeds/all`: Returns 200 and combined intelligence stream.
- `GET /api/feeds/cve`: Returns 200 and asserts that the local store contains over 10,000 CVEs.
- `GET /api/feeds/hackerone`: Returns 200 and disclosures.
- `GET /api/feeds/news`: Returns 200 and headlines.
- `GET /api/feeds/tips`: Returns 200 and validates handle filter query (`?account=vxunderground`).
- `GET /api/worker/status`: Asserts `worker_active === true` and total database count.
- `GET /api/twitter/accounts & hashtags`: Returns tracked researchers and hashtags.
- `POST /api/twitter/account`: Tests adding a new handle dynamically.
- `GET /api/feeds/metrics/todays`: Returns live counts for dashboard telemetry.

---

## 4. Continuous Integration (CI/CD)

The test suite is designed for seamless integration with GitHub Actions or any CI runner:

```yaml
name: Bug-Feed CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm test
```
The runner exits with code `0` on 100% pass and code `1` on any failure.
