# Feeds Ingestion Pipeline

The **Ingestion Pipeline** (`backend/feed/`) is comprised of specialized collectors that continuously retrieve, sanitize, parse, and validate intelligence items from diverse cybersecurity sources.

---

## 1. CVEs & Exploit PoCs (`backend/feed/cve.js`)

This module aggregates three distinct vulnerability intelligence streams:

### A. Full GitHub PoCs (`nomi-sec/PoC-in-GitHub`)
- **Source**: `https://raw.githubusercontent.com/nomi-sec/PoC-in-GitHub/master/README.md`
- **Volume**: **10,220+ exploit repositories**.
- **Parsing**: High-throughput regex extracts:
  - CVE identifier (`CVE-YYYY-NNNN`)
  - Publication timestamp
  - Vulnerability description snippet
  - Exact GitHub repository URL
- **Companion Links**: Injects verified MITRE CVE.org records (`cve_url`) and NVD NIST records (`nvd_url`).

### B. CISA Known Exploited Vulnerabilities Catalog (KEV)
- **Source**: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- **Volume**: **1,709 confirmed zero-days / in-the-wild exploited CVEs**.
- **Metadata**: Includes vendor project, vulnerability name, action date, and tags (`Actively Exploited`, `CISA KEV`).

### C. CIRCL / CVE 5.0 CSAF Feeds
- **Source**: `https://cve.circl.lu/api/last`
- **Volume**: Latest 30–50 vulnerability advisories.
- **Parsing**: Handles CSAF v5 / CVE 5.0 and OSV schemas:
  - Discovers aliases (e.g. mapping `PYSEC-2025-19` to `CVE-2025-1889`).
  - Extracts CVSS v3.1 base scores.
  - Automatically routes ecosystem-specific identifiers (`PYSEC-*`, `GHSA-*`) to `https://osv.dev/vulnerability/{id}`.

---

## 2. Disclosures & Bug Bounty Writeups

### A. HackerOne Hacktivity (`backend/feed/hackerone.js`)
- **Source**: Disclosed reports dataset via `reddelexc/hackerone-reports`.
- **Attributes**: Program name, severity rating, bounty award amount (e.g. `$3,500`), reporter username, and direct disclosure report URL.

### B. PentesterLand Writeups (`backend/feed/pentesterland.js`)
- **Source**: `https://pentester.land/writeups.json`
- **Attributes**: Over 6,400 curated bug bounty community writeups, authors, target programs, and attack classifications (SSRF, IDOR, SQLi, RCE, OAuth bypasses).

---

## 3. Infosec News (`backend/feed/news.js`)

Aggregates breaking cybersecurity headlines via fast XML/RSS streaming without heavy external scrapers:
- **The Hacker News**: `https://feeds.feedburner.com/TheHackersNews`
- **BleepingComputer**: `https://www.bleepingcomputer.com/feed/`
- Sanitizes CDATA blocks, HTML tags, and extracts publication dates.

---

## 4. Twitter / X Bug Bounty Tips (`backend/feed/tweets.js`)

Provides bug bounty methodologies and vulnerability tips without requiring costly Twitter API keys:
- **Direct Tweet URLs**: Every tweet link points directly to the specific status (`https://x.com/{handle}/status/{id}`).
- **Author & Mention Badges**: Extracts verified authors (`@kinugawamasato`, `@naglinagli`, `@Jhaddix`, `@vxunderground`, etc.).
- **Dynamic Tracking**: Allows users to add custom handles and hashtags at runtime via API.
- **Fallback Engine**: Multi-endpoint fallback using public Nitter mirrors and Reddit `r/bugbounty/.rss` tips.
