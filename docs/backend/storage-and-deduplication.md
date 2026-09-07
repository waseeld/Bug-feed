# Storage Engine & Multi-Tier Deduplication

The **Storage Engine** (`backend/storage.js`) is responsible for persisting feed data, maintaining a unique item history, and preventing duplicate items from entering the database.

---

## 1. Storage Layout & Directory Structure

All persistent state is stored in `backend/data/`:

| File | Format | Purpose |
| :--- | :--- | :--- |
| `feeds_store.json` | JSON Object | Categorized active feed items (`disclosures`, `cve`, `news`, `tips`). |
| `seen_registry.json` | JSON Key-Value | Persistent lookup table mapping SHA-256 fingerprint hashes to discovery metadata. |
| `worker_history.json` | JSON Array | Audit logs of the last 100 sync cycles with item count deltas and execution timings. |

---

## 2. Multi-Tier Deduplication Pipeline

Every incoming item undergoes a 3-stage validation process before being accepted:

```
Incoming Item
      |
      v
[Stage 1: Canonical URL & Content Normalization]
  - Strip tracking queries (utm_*, fbclid, ref_src)
  - Lowercase hostname and path
  - Concatenate: (canonical_url || item.id) + "|" + normalized_title
      |
      v
[Stage 2: SHA-256 Cryptographic Fingerprint]
  - Hash = crypto.createHash('sha256').update(baseString).digest('hex')
      |
      v
[Stage 3: O(1) Memory Registry & ID Lookup]
  - If seenRegistry.has(hash) === true -> SKIP (Duplicate)
  - If existingIds.has(item.id) === true -> SKIP (Duplicate)
  - Otherwise -> ACCEPT (Brand New Item)
```

### Computational Complexity: $O(1)$
Previously, nested loops using `Array.prototype.some()` resulted in $O(N^2)$ algorithmic complexity, which took seconds for 12,000 items. With the **Set Registry** optimization, ID lookups operate in $O(1)$ constant time, enabling 12,000+ items to be deduplicated in less than **15 milliseconds**.

---

## 3. Atomic File Persistence

To prevent file corruption during sudden server reboots, power interruptions, or concurrent writes, `storage.js` uses **Atomic Swaps**:

```javascript
atomicWriteJson(filePath, data) {
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath); // OS-level atomic filesystem operation
}
```

1. Data is written to an isolated temporary file on disk.
2. Once the write finishes, `fs.renameSync` performs an atomic pointer swap at the filesystem level.
3. The destination file is never left in a half-written or corrupt state.

---

## 4. Category Capacity & Pruning

To keep disk usage controlled, each category enforces a maximum retention cap:
- **`cve`**: Up to **30,000 items** (accommodating complete exploit archives).
- **`disclosures`**: Up to **2,000 items**.
- **`news`**: Up to **2,000 items**.
- **`tips`**: Up to **2,000 items**.

Items are always sorted in descending chronological order by `published_at` or `discovered_at`.
