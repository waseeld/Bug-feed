/**
 * Storage & Deduplication Engine Test Suite.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it, assert } = require('./runner');
const { Storage, sanitizeUrl } = require('../backend/storage');

async function runStorageTests() {
    // Work in a throwaway folder so tests never write into the real backend/data store.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugfeed-storage-test-'));
    const storage = new Storage({ dataDir: tmpDir });

    await describe('Storage Engine & Deduplication (storage.js)', async () => {

        await it('should compute identical SHA-256 fingerprints for tracking-polluted URLs', () => {
            const itemA = {
                title: 'Critical RCE in Apache Struts',
                url: 'https://example.com/advisory?utm_source=twitter&utm_medium=social&fbclid=XYZ123'
            };
            const itemB = {
                title: 'Critical RCE in Apache Struts',
                url: 'https://example.com/advisory'
            };

            const hashA = storage.computeFingerprint(itemA);
            const hashB = storage.computeFingerprint(itemB);

            assert.strictEqual(hashA, hashB, 'Normalized URLs must produce matching hash fingerprints');
            assert.strictEqual(typeof hashA, 'string');
            assert.strictEqual(hashA.length, 64, 'SHA-256 hex digest length must be 64 characters');
        });

        await it('should generate different fingerprints for different items', () => {
            const item1 = { title: 'CVE-2024-0001 XSS', url: 'https://cve.org/CVERecord?id=CVE-2024-0001' };
            const item2 = { title: 'CVE-2024-0002 RCE', url: 'https://cve.org/CVERecord?id=CVE-2024-0002' };

            const hash1 = storage.computeFingerprint(item1);
            const hash2 = storage.computeFingerprint(item2);

            assert.notStrictEqual(hash1, hash2, 'Different items must produce distinct fingerprints');
        });

        await it('should deduplicate incoming items with 100% precision on re-ingestion', () => {
            const testBatch = [
                { id: 'test-item-1', title: 'Test Vulnerability 1', url: 'https://example.com/vuln/1', published_at: '2026-09-01' },
                { id: 'test-item-2', title: 'Test Vulnerability 2', url: 'https://example.com/vuln/2', published_at: '2026-09-02' }
            ];

            // Ingest once
            const firstResult = storage.ingest('news', testBatch);
            assert.strictEqual(typeof firstResult.added, 'number');
            assert.strictEqual(typeof firstResult.skipped, 'number');

            // Ingest identical batch immediately
            const secondResult = storage.ingest('news', testBatch);
            assert.strictEqual(secondResult.added, 0, 'Re-ingesting identical items must result in 0 added');
            assert.strictEqual(secondResult.skipped, testBatch.length, 'All repeated items must be skipped');
        });

        await it('should execute O(1) deduplication lookup across large batches in milliseconds', () => {
            const largeBatch = [];
            for (let i = 0; i < 500; i++) {
                largeBatch.push({
                    id: `perf-test-${i}`,
                    title: `Performance Stress Item ${i}`,
                    url: `https://example.com/perf/${i}`,
                    published_at: '2026-09-10'
                });
            }

            const t0 = Date.now();
            const result = storage.ingest('news', largeBatch);
            const duration = Date.now() - t0;

            assert.ok(duration < 1000, `Ingesting 500 items took ${duration}ms, must be < 1000ms`);
            assert.ok(result.added + result.skipped === 500);
        });

        await it('should cap the news category at 2,000 items, newest first', () => {
            const batch = [];
            for (let i = 0; i < 2100; i++) {
                const day = String(1 + (i % 28)).padStart(2, '0');
                batch.push({ id: `cap-${i}`, title: `Cap item ${i}`, url: `https://example.org/cap/${i}`, published_at: `2026-10-${day}` });
            }
            storage.ingest('news', batch);
            const stats = storage.getStats();
            assert.ok(stats.news <= 2000, `News holds ${stats.news} items, cap is 2,000`);
            const list = storage.getCategory('news', 0);
            assert.ok(Date.parse(list[0].published_at) >= Date.parse(list[list.length - 1].published_at), 'Items must be sorted newest first');
        });

        await it('should drop non-http(s) links from incoming items', () => {
            assert.strictEqual(sanitizeUrl('javascript:alert(1)'), null);
            assert.strictEqual(sanitizeUrl('https://nvd.nist.gov/vuln/detail/CVE-2024-0001'), 'https://nvd.nist.gov/vuln/detail/CVE-2024-0001');
            storage.ingest('cve', [{ id: 'xss-link', title: 'Bad link', url: 'javascript:alert(1)', nvd_url: 'data:text/html,x' }]);
            const stored = storage.getCategory('cve', 0).find(i => i.id === 'xss-link');
            assert.strictEqual(stored.url, null);
            assert.strictEqual(stored.nvd_url, null);
        });

        await it('should page and filter categories on the server', () => {
            const items = [];
            for (let i = 0; i < 120; i++) {
                items.push({ id: `q-${i}`, title: `CVE-2026-${1000 + i} issue`, cve_id: `CVE-2026-${1000 + i}`, url: `https://example.org/q/${i}`, source: i % 3 === 0 ? 'GitHub PoC' : 'CISA KEV', published_at: '2026-11-01' });
            }
            storage.ingest('cve', items);
            const page2 = storage.queryCategory('cve', { page: 2, pageSize: 50 });
            assert.strictEqual(page2.page, 2);
            assert.strictEqual(page2.data.length, 50);
            const pocs = storage.queryCategory('cve', { filter: 'pocs', pageSize: 200 });
            assert.ok(pocs.data.every(i => i.source.includes('PoC')));
            const search = storage.queryCategory('cve', { q: 'cve-2026-1005' });
            assert.strictEqual(search.total, 1);
        });

        await it('should guarantee atomic persistence without throwing', () => {
            assert.doesNotThrow(() => {
                storage.dirty = true;
                storage.persist();
            }, 'persist() must perform atomic write without throwing');
            assert.ok(fs.existsSync(storage.files.store), 'Store file must exist after persist()');
        });
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Run through the runner so the offline environment is set up first: node test/run-all.js storage
module.exports = runStorageTests;
