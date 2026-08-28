const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'feeds_store.json');
const REGISTRY_FILE = path.join(DATA_DIR, 'seen_registry.json');
const HISTORY_FILE = path.join(DATA_DIR, 'worker_history.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Storage {
    constructor() {
        this.store = {
            disclosures: [],
            cve: [],
            news: [],
            tips: [],
            last_updated: null
        };
        this.seenRegistry = new Map(); // hash -> { id, url, discovered_at }
        this.history = [];
        this.loadFromDisk();
    }

    /**
     * Compute a unique SHA-256 fingerprint for an item.
     * Uses canonical URL if available, falling back to id + title.
     */
    computeFingerprint(item) {
        let canonical = '';
        if (item.url) {
            try {
                const u = new URL(item.url);
                // Strip common tracking parameters (utm_*, fbclid, etc.)
                const searchParams = new URLSearchParams(u.search);
                const keysToRemove = [];
                for (const key of searchParams.keys()) {
                    if (key.startsWith('utm_') || key === 'fbclid' || key === 'ref_src') {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => searchParams.delete(k));
                u.search = searchParams.toString();
                canonical = u.toString().toLowerCase().replace(/\/+$/, '');
            } catch (e) {
                canonical = String(item.url).toLowerCase().trim();
            }
        }

        const baseString = (canonical || item.id || '') + '|' + (item.title || '').trim().toLowerCase();
        return crypto.createHash('sha256').update(baseString).digest('hex');
    }

    /**
     * Atomic file write using a temporary file and rename.
     * Guarantees zero data corruption during sudden crash or shutdown.
     */
    atomicWriteJson(filePath, data) {
        const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(tmpPath, content, 'utf8');
        fs.renameSync(tmpPath, filePath);
    }

    loadFromDisk() {
        // Load main store
        if (fs.existsSync(STORE_FILE)) {
            try {
                const raw = fs.readFileSync(STORE_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                this.store = {
                    disclosures: Array.isArray(parsed.disclosures) ? parsed.disclosures : [],
                    cve: Array.isArray(parsed.cve) ? parsed.cve : [],
                    news: Array.isArray(parsed.news) ? parsed.news : [],
                    tips: Array.isArray(parsed.tips) ? parsed.tips : [],
                    last_updated: parsed.last_updated || null
                };
            } catch (err) {
                console.error('[Storage] Warning: Failed to parse feeds_store.json, initializing fresh:', err.message);
            }
        }

        // Load seen registry
        if (fs.existsSync(REGISTRY_FILE)) {
            try {
                const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
                const obj = JSON.parse(raw);
                this.seenRegistry = new Map(Object.entries(obj));
            } catch (err) {
                console.error('[Storage] Warning: Failed to parse seen_registry.json:', err.message);
                this.seenRegistry = new Map();
            }
        } else {
            // Seed registry from existing store if registry file doesn't exist
            this.rebuildRegistryFromStore();
        }

        // Load history
        if (fs.existsSync(HISTORY_FILE)) {
            try {
                const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
                this.history = JSON.parse(raw);
                if (!Array.isArray(this.history)) this.history = [];
            } catch (e) {
                this.history = [];
            }
        }
    }

    rebuildRegistryFromStore() {
        const now = new Date().toISOString();
        const allItems = [
            ...(this.store.disclosures || []),
            ...(this.store.cve || []),
            ...(this.store.news || []),
            ...(this.store.tips || [])
        ];

        for (const item of allItems) {
            const hash = this.computeFingerprint(item);
            if (!this.seenRegistry.has(hash)) {
                this.seenRegistry.set(hash, {
                    id: item.id,
                    url: item.url,
                    discovered_at: item.published_at || now
                });
            }
        }
        this.saveRegistry();
    }

    saveRegistry() {
        const obj = Object.fromEntries(this.seenRegistry);
        this.atomicWriteJson(REGISTRY_FILE, obj);
    }

    saveStore() {
        this.store.last_updated = new Date().toISOString();
        this.atomicWriteJson(STORE_FILE, this.store);
    }

    saveHistory(entry) {
        this.history.unshift(entry);
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        this.atomicWriteJson(HISTORY_FILE, this.history);
    }

    /**
     * Ingest a batch of items for a specific category.
     * Performs strict deduplication:
     * - Discards items already existing in registry or current store.
     * - Tags newly discovered items with discovered_at timestamp.
     * - Prepends new items chronologically.
     *
     * @param {string} category - 'disclosures', 'cve', 'news', 'tips'
     * @param {Array} incomingItems - Array of feed items
     * @returns {Object} - { added: number, skipped: number }
     */
    ingest(category, incomingItems) {
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

        for (const item of incomingItems) {
            if (!item || (!item.title && !item.url)) {
                skipped++;
                continue;
            }

            const hash = this.computeFingerprint(item);

            // Deduplication check: hash match or explicit ID match
            if (this.seenRegistry.has(hash)) {
                skipped++;
                continue;
            }

            // Check if item id already exists in this category
            if (item.id && existingIds.has(item.id)) {
                this.seenRegistry.set(hash, {
                    id: item.id,
                    url: item.url,
                    discovered_at: now
                });
                skipped++;
                continue;
            }

            // Brand new item!
            const stampedItem = {
                ...item,
                discovered_at: item.discovered_at || now
            };

            if (item.id) existingIds.add(item.id);

            this.seenRegistry.set(hash, {
                id: item.id || hash,
                url: item.url || '',
                discovered_at: now
            });

            newItems.push(stampedItem);
        }

        if (newItems.length > 0) {
            // Append new items at top, then sort by published date descending
            this.store[category] = [...newItems, ...this.store[category]];
            this.store[category].sort((a, b) => new Date(b.published_at || b.discovered_at) - new Date(a.published_at || a.discovered_at));

            // Cap items per category: 30,000 for cve, 2,000 for other categories
            const maxCap = category === 'cve' ? 30000 : 2000;
            if (this.store[category].length > maxCap) {
                this.store[category] = this.store[category].slice(0, maxCap);
            }

            this.saveStore();
            this.saveRegistry();
        }

        return {
            added: newItems.length,
            skipped
        };
    }

    getCategory(category, limit = 100) {
        const list = this.store[category] || [];
        return limit ? list.slice(0, limit) : list;
    }

    getAllFeeds(limit = 100) {
        const all = [
            ...(this.store.disclosures || []),
            ...(this.store.cve || []),
            ...(this.store.news || []),
            ...(this.store.tips || [])
        ];
        all.sort((a, b) => new Date(b.published_at || b.discovered_at) - new Date(a.published_at || a.discovered_at));
        return limit ? all.slice(0, limit) : all;
    }

    getStats() {
        return {
            total_items: (this.store.disclosures?.length || 0) +
                         (this.store.cve?.length || 0) +
                         (this.store.news?.length || 0) +
                         (this.store.tips?.length || 0),
            disclosures: this.store.disclosures?.length || 0,
            cve: this.store.cve?.length || 0,
            news: this.store.news?.length || 0,
            tips: this.store.tips?.length || 0,
            total_seen_registry: this.seenRegistry.size,
            last_updated: this.store.last_updated
        };
    }

    getHistory(limit = 10) {
        return this.history.slice(0, limit);
    }
}

module.exports = new Storage();
