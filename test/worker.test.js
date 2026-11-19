/**
 * Ingestion worker tests (backend/worker.js) with stubbed feed sources.
 */

const { describe, it, assert } = require('./runner');
const { feedStubs, fixtures } = require('./helpers/setup');

async function runWorkerTests() {
    const worker = require('../backend/worker');
    const storage = require('../backend/storage');

    await describe('Ingestion Worker (worker.js)', async () => {
        await it('should run a cycle, store new items and record history', async () => {
            const before = storage.getStats();
            feedStubs.data.news = [...fixtures.newsItems(), { id: 'news-new-1', title: 'Brand new story', url: 'https://news.example.org/new-1', published_at: new Date().toISOString(), category: 'news', source: 'BleepingComputer' }];
            const summary = await worker.runSyncCycle();

            assert.strictEqual(summary.sources.news.added, 1, 'Only the new story is added');
            assert.strictEqual(summary.sources.news.skipped, fixtures.newsItems().length, 'Seeded stories are duplicates');
            assert.ok(summary.sources.tips.added > 0, 'Live community posts are stored');
            assert.deepStrictEqual(summary.failed_sources, []);
            assert.strictEqual(storage.getStats().news, before.news + 1);
            assert.strictEqual(storage.getHistory(1)[0].id, summary.id, 'Cycle is saved in history');
            assert.ok(storage.getCategory('tips', 0).every(t => !t.archived), 'Archive posts are never stored');
        });

        await it('should add nothing when the sources have not changed', async () => {
            const summary = await worker.runSyncCycle();
            assert.strictEqual(summary.total_added, 0);
            assert.ok(summary.total_skipped_duplicates > 0);
        });

        await it('should report a failing source without stopping the others', async () => {
            feedStubs.fail.cve = true;
            feedStubs.data.news.push({ id: 'news-new-2', title: 'Second new story', url: 'https://news.example.org/new-2', published_at: new Date().toISOString(), category: 'news', source: 'BleepingComputer' });
            try {
                const summary = await worker.runSyncCycle();
                assert.deepStrictEqual(summary.failed_sources, ['cve']);
                assert.ok(/down/.test(summary.sources.cve.error));
                assert.strictEqual(summary.sources.news.added, 1, 'Other sources still ingest');
            } finally {
                feedStubs.fail.cve = false;
            }
        });

        await it('should skip a cycle while another one is still running', async () => {
            const [a, b] = await Promise.all([worker.runSyncCycle(), worker.runSyncCycle()]);
            const statuses = [a.status, b.status];
            assert.ok(statuses.includes('skipped'), `One run must be skipped, got ${statuses}`);
        });

        await it('should time out a hung source', async () => {
            const result = await worker.fetchWithTimeout(() => new Promise(() => {}), 20);
            assert.deepStrictEqual(result.items, []);
            assert.ok(/Timeout/.test(result.error));
        });

        await it('should clamp the schedule to 1-59 minutes and stop cleanly', () => {
            assert.strictEqual(worker.startScheduler(0).interval_minutes, 15, '0 falls back to the default');
            assert.strictEqual(worker.startScheduler(120).interval_minutes, 59);
            assert.strictEqual(worker.startScheduler(10).cron_expression, '*/10 * * * *');
            assert.strictEqual(worker.getStatus().worker_active, true);
            worker.stopScheduler();
            assert.strictEqual(worker.getStatus().worker_active, false);
        });
    });
}

module.exports = runWorkerTests;
