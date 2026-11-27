const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR, atomicWriteJson } = require('./paths');

const CATEGORIES = ['disclosures', 'cve', 'news', 'tips'];
const URL_FIELDS = ['url', 'cve_url', 'nvd_url', 'osv_url'];
const MAX_ITEMS = { cve: 30000, default: 2000 };

/**
 * Keep only http(s) links. Feeds come from third parties, and a `javascript:` URL
 * bound to an <a href> in the UI would run in the user's session.
 */
function sanitizeUrl(value) {
    if (!value || typeof value !== 'string') return null;
    try {
        const u = new URL(value.trim());
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
    } catch (e) {
        return null;
    }
}

function sanitizeItem(item) {
    const clean = { ...item };
    if (typeof clean.title === 'string' && clean.category !== 'tips') {
        // Some GitHub PoC descriptions contain escaped "\n" text; show them as plain spaces.
        clean.title = clean.title.replace(/\\[nrt]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    for (const field of URL_FIELDS) {
        if (field in clean) clean[field] = sanitizeUrl(clean[field]);
    }
    if (clean.author && clean.author.profile_url) {
        clean.author = { ...clean.author, profile_url: sanitizeUrl(clean.author.profile_url) };
    }
    return clean;
}

function itemTime(item) {
    const t = Date.parse(item.published_at || item.discovered_at || '');
    return Number.isNaN(t) ? 0 : t;
}

/** Sort newest first, parsing each date once. */
function sortByDateDesc(items) {
    return items
        .map(item => ({ item, t: itemTime(item) }))
        .sort((a, b) => b.t - a.t)
        .map(entry => entry.item);
}

function isPoc(item) {
    return (item.source || '').toLowerCase().includes('poc');
}

/** Items the old test suite wrote into the real store (ids from test/storage.test.js on example.com). */
function isLeakedTestItem(item) {
    return /^(perf-test-|test-item-)\d+$/.test(item.id || '')
        && /^https:\/\/example\.com\//.test(item.url || '');
}

class Storage {
    /**
     * @param {{ dataDir?: string }} options - dataDir lets tests use an isolated folder.
     */
    constructor({ dataDir = DATA_DIR } = {}) {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this.files = {
            store: path.join(dataDir, 'feeds_store.json'),
            registry: path.join(dataDir, 'seen_registry.json'),
            history: path.join(dataDir, 'worker_history.json')
        };
        this.store = {
            disclosures: [],
            cve: [],
            news: [],
            tips: [],
            last_updated: null
        };
        this.seenRegistry = new Map(); // hash -> { id, url, discovered_at }
        this.history = [];
        this.dirty = false;
        this.loadFromDisk();
    }

    /**
     * Compute a unique SHA-256 fingerprint for an item.
     * Uses the canonical URL if available, falling back to id + title.
     */
    computeFingerprint(item) {
        let canonical = '';
        if (item.url) {
            try {
                const u = new URL(item.url);
                // Strip common tracking parameters (utm_*, fbclid, etc.)
                const searchParams = new URLSearchParams(u.search);
                for (const key of [...searchParams.keys()]) {
                    if (key.startsWith('utm_') || key === 'fbclid' || key === 'ref_src') {
                        searchParams.delete(key);
                    }
                }
                u.search = searchParams.toString();
                // Kept identical to earlier versions so hashes in seen_registry.json still match.
                canonical = u.toString().toLowerCase().replace(/\/+$/, '');
            } catch (e) {
                canonical = String(item.url).toLowerCase().trim();
            }
        }

        const baseString = (canonical || item.id || '') + '|' + (item.title || '').trim().toLowerCase();
        return crypto.createHash('sha256').update(baseString).digest('hex');
    }

    readJson(filePath, fallback) {
        if (!fs.existsSync(filePath)) return fallback;
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.error(`[Storage] Warning: Failed to parse ${path.basename(filePath)}:`, err.message);
            return fallback;
        }
    }

    loadFromDisk() {
        const parsed = this.readJson(this.files.store, null);
        if (parsed) {
            for (const category of CATEGORIES) {
                this.store[category] = Array.isArray(parsed[category])
                    ? parsed[category].map(sanitizeItem)
                    : [];
            }
            this.store.last_updated = parsed.last_updated || null;
        }

        // Older versions stored a fixed list of tweets with rewritten "today" dates.
        // They were never live, so drop them; the community module now serves real posts.
        const before = this.store.tips.length;
        this.store.tips = this.store.tips.filter(item => item.source !== 'Twitter / X');
        if (this.store.tips.length !== before) {
            console.log(`[Storage] Removed ${before - this.store.tips.length} legacy static tweets with synthetic dates.`);
            this.dirty = true;
        }

        // Earlier test runs ingested example.com test items into the real store.
        for (const category of CATEGORIES) {
            const count = this.store[category].length;
            this.store[category] = this.store[category].filter(item => !isLeakedTestItem(item));
            if (this.store[category].length !== count) {
                console.log(`[Storage] Removed ${count - this.store[category].length} leftover test items from "${category}".`);
                this.dirty = true;
            }
        }

        const registry = this.readJson(this.files.registry, null);
        if (registry && typeof registry === 'object') {
            this.seenRegistry = new Map(Object.entries(registry));
        } else {
            this.rebuildRegistryFromStore();
        }

        const history = this.readJson(this.files.history, []);
        this.history = Array.isArray(history) ? history : [];

        if (this.dirty) this.persist();
    }

    rebuildRegistryFromStore() {
        const now = new Date().toISOString();
        for (const category of CATEGORIES) {
            for (const item of this.store[category]) {
                const hash = this.computeFingerprint(item);
                if (!this.seenRegistry.has(hash)) {
                    this.seenRegistry.set(hash, {
                        id: item.id,
                        url: item.url,
                        discovered_at: item.published_at || now
                    });
                }
            }
        }
        this.dirty = true;
    }

    saveRegistry() {
        atomicWriteJson(this.files.registry, Object.fromEntries(this.seenRegistry), { pretty: false });
    }

    saveStore() {
        this.store.last_updated = new Date().toISOString();
        atomicWriteJson(this.files.store, this.store, { pretty: false });
    }

    /** Write the store and registry to disk if anything changed since the last write. */
    persist() {
        if (!this.dirty) return false;
        this.saveStore();
        this.saveRegistry();
        this.dirty = false;
        return true;
    }

    saveHistory(entry) {
        this.history.unshift(entry);
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        atomicWriteJson(this.files.history, this.history);
    }

    /**
     * Ingest a batch of items for a category with strict deduplication.
     * Pass { persist: false } to batch several categories and call persist() once.
     *
     * @returns {{ added: number, skipped: number }}
     */
    ingest(category, incomingItems, { persist = true } = {}) {
        if (!this.store[category]) {
            this.store[category] = [];
        }

        if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
            return { added: 0, skipped: 0 };
        }

        const now = new Date().toISOString();
        const existingIds = new Set(this.store[category].map(e => e.id));
        const newItems = [];
        let skipped = 0;

        for (const raw of incomingItems) {
            if (!raw || (!raw.title && !raw.url)) {
                skipped++;
                continue;
            }

            const item = sanitizeItem(raw);
            const hash = this.computeFingerprint(item);

            if (this.seenRegistry.has(hash)) {
                skipped++;
                continue;
            }

            if (item.id && existingIds.has(item.id)) {
                this.seenRegistry.set(hash, { id: item.id, url: item.url, discovered_at: now });
                this.dirty = true;
                skipped++;
                continue;
            }

            if (item.id) existingIds.add(item.id);
            this.seenRegistry.set(hash, { id: item.id || hash, url: item.url || '', discovered_at: now });
            newItems.push({ ...item, discovered_at: item.discovered_at || now });
        }

        if (newItems.length > 0) {
            const cap = MAX_ITEMS[category] || MAX_ITEMS.default;
            this.store[category] = sortByDateDesc([...newItems, ...this.store[category]]).slice(0, cap);
            this.dirty = true;
        }

        if (persist) this.persist();

        return { added: newItems.length, skipped };
    }

    getCategory(category, limit = 100) {
        const list = this.store[category] || [];
        return limit ? list.slice(0, limit) : list;
    }

    /**
     * Server-side filtering and paging for large categories (CVE has ~12k items).
     * @param {string} category
     * @param {{ page?: number, pageSize?: number, q?: string, filter?: 'all'|'pocs'|'advisories' }} options
     */
    queryCategory(category, { page = 1, pageSize = 50, q = '', filter = 'all' } = {}) {
        const all = this.store[category] || [];
        const pocTotal = all.reduce((n, item) => n + (isPoc(item) ? 1 : 0), 0);

        let result = all;
        if (filter === 'pocs') result = result.filter(isPoc);
        else if (filter === 'advisories') result = result.filter(item => !isPoc(item));

        const query = String(q || '').trim().toLowerCase();
        if (query) {
            result = result.filter(item =>
                (item.title && item.title.toLowerCase().includes(query)) ||
                (item.cve_id && item.cve_id.toLowerCase().includes(query)) ||
                (item.source && item.source.toLowerCase().includes(query)) ||
                (Array.isArray(item.tags) && item.tags.some(t => String(t).toLowerCase().includes(query)))
            );
        }

        const size = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
        const total = result.length;
        const pages = Math.max(1, Math.ceil(total / size));
        const current = Math.min(Math.max(parseInt(page, 10) || 1, 1), pages);
        const start = (current - 1) * size;

        return {
            data: result.slice(start, start + size),
            total,
            page: current,
            pages,
            page_size: size,
            counts: {
                all: all.length,
                pocs: pocTotal,
                advisories: all.length - pocTotal
            }
        };
    }

    getAllFeeds(limit = 100) {
        const all = sortByDateDesc(CATEGORIES.flatMap(category => this.store[category] || []));
        return limit ? all.slice(0, limit) : all;
    }

    getStats() {
        const counts = Object.fromEntries(CATEGORIES.map(c => [c, (this.store[c] || []).length]));
        return {
            total_items: CATEGORIES.reduce((n, c) => n + counts[c], 0),
            ...counts,
            total_seen_registry: this.seenRegistry.size,
            last_updated: this.store.last_updated
        };
    }

    getHistory(limit = 10) {
        return this.history.slice(0, limit);
    }
}

const storage = new Storage();
storage.Storage = Storage;
storage.sanitizeUrl = sanitizeUrl;
storage.sortByDateDesc = sortByDateDesc;
module.exports = storage;
