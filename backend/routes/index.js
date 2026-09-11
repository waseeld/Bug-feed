const express = require('express');
const router = express.Router();
const cache = require('../cache');
const storage = require('../storage');
const worker = require('../worker');
const auth = require('../auth');
const authMiddleware = require('../middleware/auth');

const getHackerOneFeed = require('../feed/hackerone');
const getPentesterLandFeed = require('../feed/pentesterland');
const getCveFeed = require('../feed/cve');
const getNewsFeed = require('../feed/news');
const {
    getTweetsFeed,
    getTrackedAccounts,
    getTrackedHashtags,
    addCustomAccount,
    addCustomHashtag
} = require('../feed/tweets');

const TTL = 15 * 60 * 1000; // 15 minutes

// -------------------------------------------------------------
// Public Authentication Endpoints (Unprotected)
// -------------------------------------------------------------

router.get('/auth/status', (req, res) => {
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    }

    const user = token ? auth.verifyToken(token) : null;
    res.json({
        status: 200,
        initialized: auth.isInitialized(),
        authenticated: !!user,
        user: user ? { username: user.username, role: user.role } : null
    });
});

router.post('/auth/setup', (req, res) => {
    try {
        const { username, password } = req.body || {};
        const result = auth.createAdmin(username, password);
        res.json({
            status: 200,
            message: 'Administrator account successfully initialized',
            data: result
        });
    } catch (err) {
        res.status(400).json({ status: 400, error: err.message });
    }
});

router.post('/auth/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        const result = auth.verifyCredentials(username, password);
        res.json({
            status: 200,
            message: 'Authentication successful',
            data: result
        });
    } catch (err) {
        res.status(401).json({ status: 401, error: err.message });
    }
});

router.post('/auth/logout', (req, res) => {
    res.json({ status: 200, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// Security Guard Middleware: Protects all subsequent /api/* routes
// -------------------------------------------------------------
router.use(authMiddleware);

router.get('/auth/me', (req, res) => {
    res.json({ status: 200, user: req.user });
});

// Aggregate Disclosures & Writeups (HackerOne + PentesterLand)
async function fetchDisclosures() {
    const [h1, pl] = await Promise.all([
        getHackerOneFeed(50),
        getPentesterLandFeed(50)
    ]);
    const merged = [...h1, ...pl];
    merged.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return merged;
}

// All feeds combined
async function fetchAllFeeds() {
    const [disclosures, cves, news, tips] = await Promise.all([
        cache.getOrFetch('disclosures', fetchDisclosures, TTL),
        cache.getOrFetch('cve', () => getCveFeed(50), TTL),
        cache.getOrFetch('news', () => getNewsFeed(50), TTL),
        cache.getOrFetch('tips', () => getTweetsFeed({ limit: 40 }), TTL)
    ]);

    const all = [...disclosures, ...cves, ...news, ...tips];
    all.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return all;
}

// Routes
router.get('/feeds/all', async (req, res) => {
    try {
        let data = storage.getAllFeeds(100);
        if (data.length === 0) {
            data = await fetchAllFeeds();
        }
        res.json({ status: 200, count: data.length, data });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message, data: [] });
    }
});

router.get('/feeds/hackerone', async (req, res) => {
    try {
        let data = storage.getCategory('disclosures', 100);
        if (data.length === 0) {
            data = await cache.getOrFetch('disclosures', fetchDisclosures, TTL);
        }
        res.json({ status: 200, count: data.length, data });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message, data: [] });
    }
});

router.get('/feeds/cve', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
        let data = storage.getCategory('cve', limit);
        if (data.length === 0) {
            data = await cache.getOrFetch('cve', () => getCveFeed(Infinity), TTL);
            if (limit) data = data.slice(0, limit);
        }
        res.json({ status: 200, count: data.length, data });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message, data: [] });
    }
});

router.get('/feeds/news', async (req, res) => {
    try {
        let data = storage.getCategory('news', 100);
        if (data.length === 0) {
            data = await cache.getOrFetch('news', () => getNewsFeed(50), TTL);
        }
        res.json({ status: 200, count: data.length, data });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message, data: [] });
    }
});

// Twitter / X feeds with accounts and hashtag filters
router.get('/feeds/tips', async (req, res) => {
    try {
        const { account, hashtag, search } = req.query;
        // If specific account or hashtag filter is requested, query directly
        if (account || hashtag || search) {
            const data = await getTweetsFeed({ account, hashtag, search, limit: 50 });
            return res.json({ status: 200, count: data.length, data });
        }
        let data = storage.getCategory('tips', 60);
        if (data.length === 0) {
            data = await cache.getOrFetch('tips', () => getTweetsFeed({ limit: 50 }), TTL);
        }
        res.json({ status: 200, count: data.length, data });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message, data: [] });
    }
});

// Twitter Tracked Accounts
router.get('/twitter/accounts', (req, res) => {
    res.json({
        status: 200,
        data: getTrackedAccounts()
    });
});

// Twitter Tracked Hashtags
router.get('/twitter/hashtags', (req, res) => {
    res.json({
        status: 200,
        data: getTrackedHashtags()
    });
});

// Add Custom Account
router.post('/twitter/account', (req, res) => {
    const { handle } = req.body || {};
    if (!handle) {
        return res.status(400).json({ status: 400, error: 'handle is required' });
    }
    const success = addCustomAccount(handle);
    res.json({
        status: success ? 200 : 400,
        message: success ? `Account @${handle} added to tracking` : 'Failed to add account',
        accounts: getTrackedAccounts()
    });
});

// Add Custom Hashtag
router.post('/twitter/hashtag', (req, res) => {
    const { tag } = req.body || {};
    if (!tag) {
        return res.status(400).json({ status: 400, error: 'tag is required' });
    }
    const success = addCustomHashtag(tag);
    res.json({
        status: success ? 200 : 400,
        message: success ? `Hashtag ${tag} added to tracking` : 'Failed to add hashtag',
        hashtags: getTrackedHashtags()
    });
});

// Metrics endpoints for dashboard charts
router.get('/feeds/metrics/todays', async (req, res) => {
    try {
        const stats = storage.getStats();
        if (stats && stats.total_items > 0) {
            const disclosures = storage.store.disclosures || [];
            const h1Count = disclosures.filter(d => d.source === 'HackerOne').length;
            const plCount = disclosures.filter(d => d.source === 'Pentester Land').length;
            return res.json({
                status: 200,
                hackerone: h1Count,
                writeups: plCount,
                cve: stats.cve,
                news: stats.news,
                tips: stats.tips,
                total: stats.total_items
            });
        }

        const [disclosures, cves, news, tips] = await Promise.all([
            cache.getOrFetch('disclosures', fetchDisclosures, TTL),
            cache.getOrFetch('cve', () => getCveFeed(Infinity), TTL),
            cache.getOrFetch('news', () => getNewsFeed(50), TTL),
            cache.getOrFetch('tips', () => getTweetsFeed({ limit: 40 }), TTL)
        ]);

        const h1Count = disclosures.filter(d => d.source === 'HackerOne').length;
        const plCount = disclosures.filter(d => d.source === 'Pentester Land').length;

        res.json({
            status: 200,
            hackerone: h1Count,
            writeups: plCount,
            cve: cves.length,
            news: news.length,
            tips: tips.length,
            total: h1Count + plCount + cves.length + news.length + tips.length
        });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message });
    }
});

router.get('/feeds/metrics/saved', (req, res) => {
    res.json({
        status: 200,
        news: 0,
        videos: 0,
        hackerone: 0,
        bugcrowd: 0,
        exploitdb: 0,
        cve: 0,
        exploitdbsp: 0,
        nist: 0,
        oxford: 0
    });
});

// Cache management
router.post('/feeds/reload', (req, res) => {
    cache.clear();
    res.json({ status: 200, message: 'Cache cleared successfully' });
});

// Automated Ingestion Worker & Deduplication Monitoring API
router.get('/worker/status', (req, res) => {
    res.json({
        status: 200,
        data: worker.getStatus()
    });
});

router.post('/worker/sync', async (req, res) => {
    try {
        const result = await worker.runSyncCycle();
        res.json({
            status: 200,
            message: 'Worker sync cycle executed successfully',
            data: result
        });
    } catch (err) {
        res.status(500).json({ status: 500, error: err.message });
    }
});

router.get('/worker/history', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 15;
    res.json({
        status: 200,
        data: storage.getHistory(limit)
    });
});

router.post('/worker/interval', (req, res) => {
    const { minutes } = req.body;
    const mins = parseInt(minutes, 10);
    if (!mins || mins < 1 || mins > 59) {
        return res.status(400).json({ status: 400, error: 'Interval must be between 1 and 59 minutes' });
    }
    const result = worker.startScheduler(mins);
    res.json({
        status: 200,
        message: `Sync interval updated to every ${mins} minutes`,
        data: result
    });
});

// Legacy support
router.get('/reload/hackerone', async (req, res) => {
    const data = await cache.getOrFetch('h1_legacy', () => getHackerOneFeed(25), TTL);
    res.json({ status: 200, data });
});

module.exports = router;