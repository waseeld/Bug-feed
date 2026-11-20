const express = require('express');
const router = express.Router();
const cache = require('../cache');
const storage = require('../storage');
const worker = require('../worker');
const auth = require('../auth');
const authMiddleware = require('../middleware/auth');
const { extractToken } = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimit');
const blog = require('../blog');

const getHackerOneFeed = require('../feed/hackerone');
const getPentesterLandFeed = require('../feed/pentesterland');
const getCveFeed = require('../feed/cve');
const getNewsFeed = require('../feed/news');
const community = require('../feed/tweets');

const TTL = 15 * 60 * 1000; // 15 minutes
const COMMUNITY_TTL = 5 * 60 * 1000;

// Express 4 does not catch rejected promises from async handlers; forward them to the error handler.
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function toInt(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
}

// -------------------------------------------------------------
// Public Authentication Endpoints (Unprotected)
// -------------------------------------------------------------

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

router.get('/auth/status', (req, res) => {
    const token = extractToken(req);
    const user = token ? auth.verifyToken(token) : null;
    res.json({
        status: 200,
        initialized: auth.isInitialized(),
        authenticated: !!user,
        user: user ? { username: user.username, role: user.role } : null
    });
});

router.post('/auth/setup', loginLimiter, (req, res) => {
    try {
        const { username, password } = req.body || {};
        const result = auth.createAdmin(username, password);
        res.json({
            status: 200,
            message: 'Administrator account successfully initialized',
            data: result
        });
    } catch (err) {
        loginLimiter.fail(req);
        res.status(400).json({ status: 400, error: err.message });
    }
});

router.post('/auth/login', loginLimiter, (req, res) => {
    try {
        const { username, password } = req.body || {};
        const result = auth.verifyCredentials(username, password);
        loginLimiter.reset(req);
        res.json({
            status: 200,
            message: 'Authentication successful',
            data: result
        });
    } catch (err) {
        loginLimiter.fail(req);
        res.status(401).json({ status: 401, error: err.message });
    }
});

router.post('/auth/logout', (req, res) => {
    // Tokens are stateless; the client discards its copy.
    res.json({ status: 200, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// Everything below requires a valid session token
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
    return storage.sortByDateDesc([...h1, ...pl]);
}

async function fetchLiveTips() {
    return community.getTweetsFeed({ limit: 60, liveOnly: true });
}

async function fetchAllFeeds() {
    const [disclosures, cves, news, tips] = await Promise.all([
        cache.getOrFetch('disclosures', fetchDisclosures, TTL),
        cache.getOrFetch('cve', () => getCveFeed(50), TTL),
        cache.getOrFetch('news', () => getNewsFeed(50), TTL),
        cache.getOrFetch('tips', fetchLiveTips, TTL)
    ]);
    return storage.sortByDateDesc([...disclosures, ...cves, ...news, ...tips]);
}

/**
 * Return stored items for a category; on a fresh install (empty store) fetch once and keep them.
 */
async function ensureCategory(category, fetchFn) {
    if ((storage.store[category] || []).length === 0) {
        const fresh = await cache.getOrFetch(category, fetchFn, TTL);
        storage.ingest(category, fresh);
    }
}

router.get('/feeds/all', asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(toInt(req.query.limit, 100), 1), 500);
    let data = storage.getAllFeeds(limit);
    if (data.length === 0) {
        data = (await fetchAllFeeds()).slice(0, limit);
    }
    res.json({ status: 200, count: data.length, data });
}));

router.get('/feeds/hackerone', asyncHandler(async (req, res) => {
    await ensureCategory('disclosures', fetchDisclosures);
    const data = storage.getCategory('disclosures', 100);
    res.json({ status: 200, count: data.length, data });
}));

/**
 * CVEs and PoCs.
 * With any of page / page_size / q / filter the response is one page:
 *   { data, total, page, pages, page_size, counts: { all, pocs, advisories } }
 * Without them it returns the full list (kept for older clients).
 */
router.get('/feeds/cve', asyncHandler(async (req, res) => {
    await ensureCategory('cve', () => getCveFeed(Infinity));

    const { page, page_size: pageSize, q, filter } = req.query;
    if (page !== undefined || pageSize !== undefined || q !== undefined || filter !== undefined) {
        const allowed = ['all', 'pocs', 'advisories'];
        const result = storage.queryCategory('cve', {
            page: toInt(page, 1),
            pageSize: toInt(pageSize, 50),
            q: typeof q === 'string' ? q.slice(0, 200) : '',
            filter: allowed.includes(filter) ? filter : 'all'
        });
        return res.json({ status: 200, count: result.data.length, ...result });
    }

    const limit = req.query.limit !== undefined ? Math.max(toInt(req.query.limit, 0), 0) : 0;
    const data = storage.getCategory('cve', limit);
    res.json({ status: 200, count: data.length, data });
}));

router.get('/feeds/news', asyncHandler(async (req, res) => {
    await ensureCategory('news', () => getNewsFeed(50));
    const data = storage.getCategory('news', 100);
    res.json({ status: 200, count: data.length, data });
}));

/**
 * Community Intel (Mastodon, Bluesky, X archive).
 * Query: account, hashtag, search, source = all | live | archive
 */
router.get('/feeds/tips', asyncHandler(async (req, res) => {
    const { account, hashtag, search } = req.query;
    const source = ['all', 'live', 'archive'].includes(req.query.source) ? req.query.source : 'all';

    if (account || hashtag) {
        const key = `community:${account ? 'a:' + account : 't:' + hashtag}:${source}`;
        const result = await cache.getOrFetch(key, () => community.getCommunityFeed({
            account,
            hashtag,
            limit: 80,
            includeArchive: source !== 'live',
            liveOnly: source === 'live'
        }), COMMUNITY_TTL);
        let items = (result.items || []).filter(i => source !== 'archive' || i.archived);
        if (search) {
            const q = String(search).toLowerCase();
            items = items.filter(i => (i.title || '').toLowerCase().includes(q));
        }
        return res.json({ status: 200, count: items.length, data: items, errors: result.errors || [] });
    }

    let live = [];
    if (source !== 'archive') {
        await ensureCategory('tips', fetchLiveTips);
        live = storage.getCategory('tips', 200);
    }
    // Hashtag streams include busy bot accounts; keep any single author to a few posts in the mixed view.
    const perAuthor = new Map();
    live = storage.sortByDateDesc(live).filter(item => {
        const key = item.author && item.author.handle ? item.author.handle.toLowerCase() : item.id;
        const n = (perAuthor.get(key) || 0) + 1;
        perAuthor.set(key, n);
        return n <= 3;
    });
    const archive = source !== 'live' ? community.getArchiveItems() : [];
    let data = storage.sortByDateDesc([...live, ...archive]);

    if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase();
        data = data.filter(i =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.author && ((i.author.handle || '').toLowerCase().includes(q) || (i.author.name || '').toLowerCase().includes(q))) ||
            (Array.isArray(i.tags) && i.tags.some(t => String(t).toLowerCase().includes(q)))
        );
    }

    res.json({ status: 200, count: data.length, data, errors: [] });
}));

// Tracked community accounts and hashtags
router.get('/twitter/accounts', asyncHandler(async (req, res) => {
    const data = await cache.getOrFetch('community:accounts', community.getTrackedAccountsWithProfiles, 60 * 60 * 1000);
    res.json({ status: 200, data });
}));

router.get('/twitter/hashtags', (req, res) => {
    res.json({ status: 200, data: community.getTrackedHashtags() });
});

router.post('/twitter/account', asyncHandler(async (req, res) => {
    const { handle } = req.body || {};
    if (!handle || typeof handle !== 'string') {
        return res.status(400).json({ status: 400, error: 'handle is required' });
    }
    const result = await community.addCustomAccount(handle);
    if (!result.ok) {
        return res.status(400).json({ status: 400, error: result.error });
    }
    cache.delete('community:accounts');
    res.json({
        status: 200,
        message: result.alreadyTracked ? `${result.account.handle} is already tracked` : `${result.account.handle} added to tracking`,
        account: result.account,
        accounts: await community.getTrackedAccountsWithProfiles()
    });
}));

router.delete('/twitter/account/:handle', (req, res) => {
    if (!community.removeCustomAccount(req.params.handle)) {
        return res.status(404).json({ status: 404, error: 'Only accounts you added can be removed.' });
    }
    cache.delete('community:accounts');
    res.json({ status: 200, accounts: community.getTrackedAccounts() });
});

router.post('/twitter/hashtag', (req, res) => {
    const { tag } = req.body || {};
    const result = community.addCustomHashtag(tag);
    if (!result.ok) {
        return res.status(400).json({ status: 400, error: result.error });
    }
    res.json({
        status: 200,
        message: `Hashtag ${result.tag} added to tracking`,
        tag: result.tag,
        hashtags: community.getTrackedHashtags()
    });
});

router.delete('/twitter/hashtag/:tag', (req, res) => {
    if (!community.removeCustomHashtag(req.params.tag)) {
        return res.status(404).json({ status: 404, error: 'Only hashtags you added can be removed.' });
    }
    res.json({ status: 200, hashtags: community.getTrackedHashtags() });
});

// Metrics for the dashboard
router.get('/feeds/metrics/todays', asyncHandler(async (req, res) => {
    let byCategory = {
        disclosures: storage.store.disclosures || [],
        cve: storage.store.cve || [],
        news: storage.store.news || [],
        tips: storage.store.tips || []
    };
    if (storage.getStats().total_items === 0) {
        // Fresh install: count what the sources return right now.
        const [disclosures, cve, news, tips] = await Promise.all([
            cache.getOrFetch('disclosures', fetchDisclosures, TTL),
            cache.getOrFetch('cve', () => getCveFeed(Infinity), TTL),
            cache.getOrFetch('news', () => getNewsFeed(50), TTL),
            cache.getOrFetch('tips', fetchLiveTips, TTL)
        ]);
        byCategory = { disclosures, cve, news, tips };
    }
    const h1Count = byCategory.disclosures.filter(d => d.source === 'HackerOne').length;
    const plCount = byCategory.disclosures.filter(d => d.source === 'Pentester Land').length;
    res.json({
        status: 200,
        hackerone: h1Count,
        writeups: plCount,
        cve: byCategory.cve.length,
        news: byCategory.news.length,
        tips: byCategory.tips.length,
        total: byCategory.disclosures.length + byCategory.cve.length + byCategory.news.length + byCategory.tips.length
    });
}));

// Cache management
router.post('/feeds/reload', (req, res) => {
    cache.clear();
    res.json({ status: 200, message: 'Cache cleared successfully' });
});

// Automated Ingestion Worker & Deduplication Monitoring API
router.get('/worker/status', (req, res) => {
    res.json({ status: 200, data: worker.getStatus() });
});

router.post('/worker/sync', asyncHandler(async (req, res) => {
    const result = await worker.runSyncCycle();
    res.json({
        status: 200,
        message: result.status === 'skipped' ? 'A sync is already running' : 'Worker sync cycle executed successfully',
        data: result
    });
}));

router.get('/worker/history', (req, res) => {
    const limit = Math.min(Math.max(toInt(req.query.limit, 15), 1), 100);
    res.json({ status: 200, data: storage.getHistory(limit) });
});

router.post('/worker/interval', (req, res) => {
    const mins = toInt((req.body || {}).minutes, NaN);
    if (!Number.isFinite(mins) || mins < 1 || mins > 59) {
        return res.status(400).json({ status: 400, error: 'Interval must be between 1 and 59 minutes' });
    }
    const result = worker.startScheduler(mins);
    res.json({
        status: 200,
        message: `Sync interval updated to every ${mins} minutes`,
        data: result
    });
});

// Cyber brief blog. One Markdown file in /posts per brief.
router.get('/blog', (req, res) => {
    const data = blog.listPosts();
    res.json({ status: 200, count: data.length, data });
});

router.get('/blog/:slug', (req, res) => {
    const post = blog.getPost(req.params.slug);
    if (!post) {
        return res.status(404).json({ status: 404, error: 'Post not found' });
    }
    res.json({ status: 200, data: post });
});

// Legacy endpoint kept for older clients
router.get('/reload/hackerone', asyncHandler(async (req, res) => {
    const data = await cache.getOrFetch('h1_legacy', () => getHackerOneFeed(25), TTL);
    res.json({ status: 200, data });
}));

router.use((req, res) => {
    res.status(404).json({ status: 404, error: `No API route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
    console.error(`[API] ${req.method} ${req.originalUrl} failed:`, err);
    res.status(500).json({ status: 500, error: 'Internal server error', data: [] });
});

module.exports = router;
