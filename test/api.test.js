/**
 * REST API & security tests. The app runs in-process against the offline test environment
 * (temporary DATA_DIR with fixture data, stubbed feeds, fake Mastodon/Bluesky network).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { describe, it, assert } = require('./runner');
const { request, stopServer } = require('./helpers/http');

const ADMIN = { username: 'qa_admin', password: crypto.randomBytes(9).toString('base64url') };

async function runApiTests() {
    const storage = require('../backend/storage');
    let token = null;

    await describe('API: setup & login', async () => {
        await it('GET /api/auth/status: fresh install is not initialized', async () => {
            const res = await request('/api/auth/status');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.initialized, false);
            assert.strictEqual(res.data.authenticated, false);
        });

        await it('POST /api/auth/setup: rejects weak input, then creates the admin once', async () => {
            const weak = await request('/api/auth/setup', { method: 'POST', body: { username: 'qa_admin', password: '123' } });
            assert.strictEqual(weak.status, 400);

            const ok = await request('/api/auth/setup', { method: 'POST', body: ADMIN });
            assert.strictEqual(ok.status, 200, ok.text);
            assert.ok(ok.data.data.token);

            const again = await request('/api/auth/setup', { method: 'POST', body: { username: 'other', password: 'another-pass' } });
            assert.strictEqual(again.status, 400, 'A second admin setup must be refused');
            assert.ok(!fs.readFileSync(path.join(process.env.DATA_DIR, 'auth.json'), 'utf8').includes(ADMIN.password), 'Password must not be stored in plain text');
        });

        await it('POST /api/auth/login: wrong password 401, right password returns a token', async () => {
            const bad = await request('/api/auth/login', { method: 'POST', body: { username: ADMIN.username, password: 'wrong-password' } });
            assert.strictEqual(bad.status, 401);
            const unknown = await request('/api/auth/login', { method: 'POST', body: { username: 'nobody', password: 'wrong-password' } });
            assert.strictEqual(unknown.status, 401);
            assert.strictEqual(unknown.data.error, bad.data.error, 'Same message for unknown user and wrong password');

            const good = await request('/api/auth/login', { method: 'POST', body: { username: 'QA_ADMIN', password: ADMIN.password } });
            assert.strictEqual(good.status, 200, 'Usernames are case-insensitive');
            token = good.data.data.token;

            const status = await request('/api/auth/status', { token });
            assert.strictEqual(status.data.authenticated, true);
            assert.strictEqual(status.data.user.username, ADMIN.username);
        });
    });

    await describe('API: access control & hardening', async () => {
        await it('protected routes reject missing, forged and query-string tokens', async () => {
            assert.strictEqual((await request('/api/feeds/news')).status, 401);
            assert.strictEqual((await request('/api/feeds/news', { token: 'not.a.token' })).status, 401);

            const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
            const body = Buffer.from(JSON.stringify({ sub: 'x', role: 'admin', exp: Date.now() + 1e6 })).toString('base64url');
            const sig = crypto.createHmac('sha256', 'bugfeed_cyber_sec_token_sig_2026_@key').update(`${header}.${body}`).digest('base64url');
            assert.strictEqual((await request('/api/feeds/news', { token: `${header}.${body}.${sig}` })).status, 401, 'Old public secret');

            assert.strictEqual((await request(`/api/feeds/news?token=${token}`)).status, 401, 'Query-string token');
            assert.strictEqual((await request('/api/feeds/news/auth/login', { token: 'x' })).status, 401, 'Path tricks do not bypass auth');
            assert.strictEqual((await request('/api/feeds/news', { headers: { 'X-Auth-Token': token } })).status, 200);
        });

        await it('sends security headers and no wildcard CORS', async () => {
            const res = await request('/api/auth/status');
            assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
            assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
            assert.ok(res.headers.get('referrer-policy'));
            assert.strictEqual(res.headers.get('x-powered-by'), null);
            assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
        });

        await it('unknown API routes return JSON 404', async () => {
            const res = await request('/api/does-not-exist', { token });
            assert.strictEqual(res.status, 404);
            assert.ok(res.data && res.data.error);
        });

        await it('GET /: serves the SPA when frontend/dist exists, otherwise the endpoint list', async () => {
            const res = await request('/');
            assert.strictEqual(res.status, 200);
            const built = fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
            if (built) {
                assert.ok(res.text.includes('<div id="app">'));
                assert.strictEqual(res.headers.get('cache-control'), 'no-cache');
                const deep = await request('/blog/2026-11-19-1400');
                assert.ok(deep.text.includes('<div id="app">'), 'Client routes load the SPA shell');
            } else {
                assert.ok(Array.isArray(res.data.endpoints));
            }
        });
    });

    await describe('API: feeds', async () => {
        await it('GET /api/feeds/all: newest first, limit respected', async () => {
            const res = await request('/api/feeds/all?limit=20', { token });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.data.length, 20);
            const times = res.data.data.map(i => Date.parse(i.published_at || i.discovered_at));
            for (let i = 1; i < times.length; i++) assert.ok(times[i - 1] >= times[i]);
        });

        await it('GET /api/feeds/hackerone and /news return stored items', async () => {
            const h1 = await request('/api/feeds/hackerone', { token });
            assert.strictEqual(h1.data.count, storage.getStats().disclosures);
            const news = await request('/api/feeds/news', { token });
            assert.ok(news.data.count > 0);
            assert.ok(news.data.data.every(i => !/^(perf-test-|test-item-)/.test(i.id)), 'No leaked test items');
        });

        await it('GET /api/feeds/cve without paging keeps the full legacy list', async () => {
            const res = await request('/api/feeds/cve', { token });
            assert.strictEqual(res.data.count, storage.getStats().cve);
            const limited = await request('/api/feeds/cve?limit=5', { token });
            assert.strictEqual(limited.data.data.length, 5);
        });

        await it('GET /api/feeds/cve paging, filters and search', async () => {
            const page2 = await request('/api/feeds/cve?page=2&page_size=25', { token });
            assert.strictEqual(page2.data.page, 2);
            assert.strictEqual(page2.data.data.length, 25);
            assert.strictEqual(page2.data.counts.all, storage.getStats().cve);
            assert.strictEqual(page2.data.counts.pocs + page2.data.counts.advisories, page2.data.counts.all);

            const pocs = await request('/api/feeds/cve?filter=pocs&page_size=200', { token });
            assert.ok(pocs.data.data.every(i => i.source.includes('PoC')));
            const adv = await request('/api/feeds/cve?filter=advisories&page_size=200', { token });
            assert.ok(adv.data.data.every(i => !i.source.includes('PoC')));

            const search = await request('/api/feeds/cve?q=CVE-2026-10042', { token });
            assert.strictEqual(search.data.total, 1);

            const clamped = await request('/api/feeds/cve?page=99999&page_size=5000&filter=bogus', { token });
            assert.strictEqual(clamped.data.page_size, 200, 'Page size is capped');
            assert.strictEqual(clamped.data.page, clamped.data.pages, 'Out-of-range page goes to the last page');
            assert.strictEqual(clamped.data.total, clamped.data.counts.all, 'Unknown filter means all');
        });

        await it('GET /api/feeds/metrics/todays matches storage', async () => {
            const res = await request('/api/feeds/metrics/todays', { token });
            const stats = storage.getStats();
            assert.strictEqual(res.data.cve, stats.cve);
            assert.strictEqual(res.data.total, stats.total_items);
            assert.strictEqual(res.data.hackerone + res.data.writeups, stats.disclosures);
        });
    });

    await describe('API: community intel', async () => {
        await it('GET /api/feeds/tips mixes live posts and the archive, at most 3 per author', async () => {
            const res = await request('/api/feeds/tips', { token });
            assert.strictEqual(res.status, 200);
            const perAuthor = {};
            res.data.data.forEach(i => { perAuthor[i.author.handle] = (perAuthor[i.author.handle] || 0) + 1; });
            assert.ok(perAuthor['busybot@mastodon.social'] <= 3, 'The busy bot is capped');
            assert.ok(res.data.data.some(i => i.archived), 'Archive included by default');
            assert.ok(res.data.data.some(i => !i.archived), 'Live posts included');
        });

        await it('source=live and source=archive filter correctly', async () => {
            const live = await request('/api/feeds/tips?source=live', { token });
            assert.ok(live.data.data.length > 0 && live.data.data.every(i => !i.archived));
            const archive = await request('/api/feeds/tips?source=archive', { token });
            assert.ok(archive.data.data.length > 0 && archive.data.data.every(i => i.archived));
        });

        await it('account, hashtag and search filters', async () => {
            const acc = await request('/api/feeds/tips?account=' + encodeURIComponent('someone@infosec.exchange'), { token });
            assert.ok(acc.data.data.length > 0 && acc.data.data.every(i => i.author.handle === 'someone@infosec.exchange'));
            const tag = await request('/api/feeds/tips?hashtag=infosec&source=live', { token });
            assert.ok(tag.data.data.length > 0 && tag.data.data.every(i => !i.archived));
            const bad = await request('/api/feeds/tips?account=user@x.down.example', { token });
            assert.strictEqual(bad.status, 200);
            assert.strictEqual(bad.data.errors.length, 1, 'Unreachable source is reported');
            const search = await request('/api/feeds/tips?search=recon', { token });
            assert.ok(search.data.data.length > 0 && search.data.data.every(i => /recon/i.test(JSON.stringify(i))));
        });

        await it('accounts: list, add (validated), remove', async () => {
            const list = await request('/api/twitter/accounts', { token });
            assert.ok(list.data.data.length > 0);

            const xHandle = await request('/api/twitter/account', { method: 'POST', token, body: { handle: 'some_x_user' } });
            assert.strictEqual(xHandle.status, 400);
            const missing = await request('/api/twitter/account', { method: 'POST', token, body: { handle: 'missingperson@infosec.exchange' } });
            assert.strictEqual(missing.status, 400);
            const empty = await request('/api/twitter/account', { method: 'POST', token, body: {} });
            assert.strictEqual(empty.status, 400);

            const handle = 'apitester@infosec.exchange';
            const add = await request('/api/twitter/account', { method: 'POST', token, body: { handle } });
            assert.strictEqual(add.status, 200, add.text);
            assert.ok(add.data.accounts.some(a => a.handle === handle));

            const del = await request(`/api/twitter/account/${encodeURIComponent(handle)}`, { method: 'DELETE', token });
            assert.strictEqual(del.status, 200);
            const delDefault = await request(`/api/twitter/account/${encodeURIComponent('briankrebs@infosec.exchange')}`, { method: 'DELETE', token });
            assert.strictEqual(delDefault.status, 404, 'Default accounts cannot be removed');
        });

        await it('hashtags: add (validated), remove', async () => {
            const bad = await request('/api/twitter/hashtag', { method: 'POST', token, body: { tag: 'two words' } });
            assert.strictEqual(bad.status, 400);
            const add = await request('/api/twitter/hashtag', { method: 'POST', token, body: { tag: 'DFIR' } });
            assert.strictEqual(add.status, 200);
            assert.strictEqual(add.data.tag, '#dfir');
            const del = await request('/api/twitter/hashtag/dfir', { method: 'DELETE', token });
            assert.strictEqual(del.status, 200);
            assert.ok(!del.data.hashtags.includes('#dfir'));
        });
    });

    await describe('API: worker & blog', async () => {
        await it('worker status, history and interval validation', async () => {
            const status = await request('/api/worker/status', { token });
            assert.strictEqual(status.status, 200);
            assert.ok(status.data.data.storage_stats.total_items > 0);

            const history = await request('/api/worker/history?limit=500', { token });
            assert.ok(history.data.data.length <= 100);

            for (const minutes of [0, 60, 'abc', undefined]) {
                const res = await request('/api/worker/interval', { method: 'POST', token, body: { minutes } });
                assert.strictEqual(res.status, 400, `minutes=${minutes} must be rejected`);
            }
            const ok = await request('/api/worker/interval', { method: 'POST', token, body: { minutes: 20 } });
            assert.strictEqual(ok.data.data.interval_minutes, 20);
            require('../backend/worker').stopScheduler();
        });

        await it('POST /api/worker/sync runs a cycle', async () => {
            const res = await request('/api/worker/sync', { method: 'POST', token });
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.data.sources);
        });

        await it('blog list, single post and missing post', async () => {
            const list = await request('/api/blog', { token });
            assert.ok(list.data.count >= 22);
            const post = await request('/api/blog/2026-11-19-1400', { token });
            assert.ok(post.data.data.html.includes('CVE-2026-120868'));
            const missing = await request('/api/blog/..%2Fpackage', { token });
            assert.strictEqual(missing.status, 404);
        });
    });

    await describe('API: login rate limit', async () => {
        await it('blocks a client after 10 failed logins', async () => {
            const statuses = [];
            for (let i = 0; i < 11; i++) {
                const res = await request('/api/auth/login', { method: 'POST', body: { username: 'nobody', password: 'wrong-password' } });
                statuses.push(res.status);
            }
            assert.strictEqual(statuses.at(-1), 429, `Got ${statuses.join(',')}`);
        });
    });

    await stopServer();
}

module.exports = runApiTests;
