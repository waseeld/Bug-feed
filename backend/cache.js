class Cache {
    constructor(defaultTtlMs = 15 * 60 * 1000) {
        this.cache = new Map();
        this.inFlight = new Map();
        this.defaultTtl = defaultTtlMs;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    set(key, data, ttlMs = this.defaultTtl) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlMs,
            updatedAt: new Date().toISOString()
        });
        return data;
    }

    has(key) {
        return this.get(key) !== null;
    }

    clear() {
        this.cache.clear();
    }

    async getOrFetch(key, fetchFn, ttlMs = this.defaultTtl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        // If a fetch is already in flight for this key, return that promise
        if (this.inFlight.has(key)) {
            return this.inFlight.get(key);
        }

        const promise = (async () => {
            try {
                const data = await fetchFn();
                this.set(key, data, ttlMs);
                return data;
            } catch (err) {
                console.error(`[Cache] Error fetching "${key}":`, err.message);
                // Return expired data if available rather than crashing
                const stale = this.cache.get(key);
                if (stale) {
                    return stale.data;
                }
                return [];
            } finally {
                this.inFlight.delete(key);
            }
        })();

        this.inFlight.set(key, promise);
        return promise;
    }
}

module.exports = new Cache();
