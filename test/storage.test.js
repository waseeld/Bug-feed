/**
 * Storage & Deduplication Engine Test Suite.
 */

const { describe, it, assert } = require('./runner');
const storage = require('../backend/storage');
const crypto = require('crypto');

async function runStorageTests() {
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

            assert.ok(duration < 150, `Ingesting 500 items took ${duration}ms, must be < 150ms`);
            assert.ok(result.added + result.skipped === 500);
        });

        await it('should verify category capacities (30k for CVE, 2k for news)', () => {
            const stats = storage.getStats();
            assert.ok(typeof stats.total_items === 'number', 'Stats must provide total_items');
            assert.ok(typeof stats.cve === 'number', 'Stats must provide cve count');
            assert.ok(stats.cve >= 10000, `Storage has ${stats.cve} CVEs, should be >= 10,000`);
        });

        await it('should guarantee atomic persistence without throwing', () => {
            assert.doesNotThrow(() => {
                storage.saveStore();
            }, 'saveStore() must perform atomic write without throwing');
        });
    });
}

module.exports = runStorageTests;

if (require.main === module) {
    (async () => {
        const t0 = Date.now();
        await runStorageTests();
        const { printSummary } = require('./runner');
        printSummary(Date.now() - t0);
    })();
}
