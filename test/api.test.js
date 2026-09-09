/**
 * REST API Endpoints & Security Test Suite.
 */

const { describe, it, assert } = require('./runner');
const auth = require('../backend/auth');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:9600';

// Generate valid test authentication token
const testToken = auth.generateToken({ id: 'test-admin', username: 'admin', role: 'admin' });

async function fetchJson(path, options = {}) {
    const headers = {
        'Authorization': `Bearer ${testToken}`,
        ...(options.headers || {})
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json };
}

async function runApiTests() {
    await describe(`REST API Endpoints & Security (${BASE_URL})`, async () => {

        await it('GET /: should serve frontend HTML index with status 200', async () => {
            const res = await fetch(`${BASE_URL}/`);
            assert.strictEqual(res.status, 200, 'Root must return HTTP 200');
            const contentType = res.headers.get('content-type') || '';
            assert.ok(
                contentType.includes('text/html') || contentType.includes('application/json'),
                'Content type must be text/html or application/json'
            );
        });

        await it('Security Guard: unauthenticated requests to protected endpoints must be rejected with 401', async () => {
            const res = await fetch(`${BASE_URL}/api/feeds/cve`);
            assert.strictEqual(res.status, 401, 'Unauthenticated request must return HTTP 401');
            const json = await res.json();
            assert.strictEqual(json.status, 401);
            assert.strictEqual(json.code, 'AUTH_REQUIRED');
        });

        await it('GET /api/auth/status: should return system initialization status', async () => {
            const res = await fetch(`${BASE_URL}/api/auth/status`);
            assert.strictEqual(res.status, 200);
            const json = await res.json();
            assert.ok(typeof json.initialized === 'boolean');
        });

        await it('GET /api/feeds/all: should return combined feeds array when authorized', async () => {
            const { status, data } = await fetchJson('/api/feeds/all?limit=20');
            assert.strictEqual(status, 200);
            assert.ok(Array.isArray(data.data), 'Payload data must be array');
            assert.ok(data.data.length > 0, 'Must return at least 1 item');
        });

        await it('GET /api/feeds/cve: should return 11,900+ items and no unknown CVEs', async () => {
            const { status, data } = await fetchJson('/api/feeds/cve');
            assert.strictEqual(status, 200);
            assert.ok(Array.isArray(data.data), 'CVE data must be array');
            assert.ok(data.data.length >= 10000, `Expected >= 10,000 CVEs, got ${data.data.length}`);
            
            // Sample test for no UNKNOWN
            const sample = data.data.slice(0, 50);
            const unknowns = sample.filter(x => (x.cve_id && x.cve_id.includes('UNKNOWN')) || (x.url && x.url.includes('UNKNOWN')));
            assert.strictEqual(unknowns.length, 0, 'No CVE-UNKNOWN in sample');
        });

        await it('GET /api/feeds/hackerone: should return disclosures', async () => {
            const { status, data } = await fetchJson('/api/feeds/hackerone?limit=25');
            assert.strictEqual(status, 200);
            assert.ok(Array.isArray(data.data));
            assert.ok(data.data.length > 0);
        });

        await it('GET /api/feeds/news: should return news headlines', async () => {
            const { status, data } = await fetchJson('/api/feeds/news?limit=25');
            assert.strictEqual(status, 200);
            assert.ok(Array.isArray(data.data));
            assert.ok(data.data.length > 0);
        });

        await it('GET /api/feeds/tips: should return bug bounty tips & filter by handle', async () => {
            const { status, data } = await fetchJson('/api/feeds/tips');
            assert.strictEqual(status, 200);
            assert.ok(Array.isArray(data.data));

            // Test filtering
            const filterRes = await fetchJson('/api/feeds/tips?account=vxunderground');
            assert.strictEqual(filterRes.status, 200);
            assert.ok(Array.isArray(filterRes.data.data));
        });

        await it('GET /api/worker/status: should provide active worker and storage stats', async () => {
            const { status, data } = await fetchJson('/api/worker/status');
            assert.strictEqual(status, 200);
            assert.ok(data.data, 'Must return worker data');
            assert.strictEqual(data.data.worker_active, true, 'Worker must be active');
            assert.ok(data.data.storage_stats, 'Must return storage_stats');
            assert.ok(data.data.storage_stats.total_items > 10000, 'Total items should exceed 10k');
        });

        await it('GET /api/twitter/accounts & hashtags: should provide tracked lists', async () => {
            const accRes = await fetchJson('/api/twitter/accounts');
            assert.strictEqual(accRes.status, 200);
            assert.ok(Array.isArray(accRes.data.data));
            assert.ok(accRes.data.data.length > 0);

            const hashRes = await fetchJson('/api/twitter/hashtags');
            assert.strictEqual(hashRes.status, 200);
            assert.ok(Array.isArray(hashRes.data.data));
            assert.ok(hashRes.data.data.length > 0);
        });

        await it('POST /api/twitter/account: should dynamically add custom handle', async () => {
            const testHandle = `tester_${Date.now()}`;
            const res = await fetchJson('/api/twitter/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle: testHandle })
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.data.accounts.some(a => a.handle === testHandle), 'Handle should be present in accounts');
        });

        await it('GET /api/feeds/metrics/todays: should return category metric counts', async () => {
            const { status, data } = await fetchJson('/api/feeds/metrics/todays');
            assert.strictEqual(status, 200);
            assert.ok(typeof data.cve === 'number');
            assert.ok(typeof data.total === 'number');
            assert.ok(data.cve > 10000);
        });
    });
}

module.exports = runApiTests;

if (require.main === module) {
    (async () => {
        const t0 = Date.now();
        await runApiTests();
        const { printSummary } = require('./runner');
        printSummary(Date.now() - t0);
    })();
}
