/**
 * Background Ingestion Engine & Deduplication Worker for Bug-feed.
 * Polls threat intelligence sources on schedule, deduplicates, and persists data.
 */

const cron = require('node-cron');
const storage = require('./storage');

// Feed Fetchers
const getHackerOneFeed = require('./feed/hackerone');
const getPentesterLandFeed = require('./feed/pentesterland');
const getCveFeed = require('./feed/cve');
const getNewsFeed = require('./feed/news');
const { getTweetsFeed } = require('./feed/tweets');

class IngestionWorker {
    constructor() {
        this.cronTask = null;
        this.isRunning = false;
        this.lastRunStart = null;
        this.lastRunEnd = null;
        this.lastRunDurationMs = 0;
        this.lastRunResult = null;
        this.totalRuns = 0;
        this.intervalMinutes = parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 15;
    }

    /**
     * Wrap an async fetcher with a strict timeout to prevent hung requests.
     */
    async fetchWithTimeout(fetchFn, timeoutMs = 25000, fallback = []) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            const result = await Promise.race([fetchFn(), timeoutPromise]);
            return Array.isArray(result) ? result : fallback;
        } catch (err) {
            console.error('[Worker] Source fetch warning:', err.message);
            return fallback;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Executes a full synchronization cycle across all feeds.
     */
    async runSyncCycle() {
        if (this.isRunning) {
            console.log('[Worker] Sync cycle skipped: previous cycle still in progress.');
            return {
                status: 'skipped',
                reason: 'previous_cycle_in_progress',
                timestamp: new Date().toISOString()
            };
        }

        this.isRunning = true;
        this.lastRunStart = new Date().toISOString();
        const startTime = Date.now();
        console.log(`\n======================================================`);
        console.log(`[Worker] Starting Scheduled Data Ingestion Cycle: ${this.lastRunStart}`);
        console.log(`======================================================`);

        const cycleResults = {
            disclosures: { fetched: 0, added: 0, skipped: 0, error: null },
            cve: { fetched: 0, added: 0, skipped: 0, error: null },
            news: { fetched: 0, added: 0, skipped: 0, error: null },
            tips: { fetched: 0, added: 0, skipped: 0, error: null }
        };

        try {
            // Fetch all feeds concurrently with timeouts
            const [h1Res, plRes, cveRes, newsRes, tipsRes] = await Promise.allSettled([
                this.fetchWithTimeout(() => getHackerOneFeed(50)),
                this.fetchWithTimeout(() => getPentesterLandFeed(60)),
                this.fetchWithTimeout(() => getCveFeed(Infinity), 45000),
                this.fetchWithTimeout(() => getNewsFeed(50)),
                this.fetchWithTimeout(() => getTweetsFeed({ limit: 60 }))
            ]);

            // 1. Process Disclosures (HackerOne + PentesterLand)
            const h1Items = h1Res.status === 'fulfilled' ? h1Res.value : [];
            const plItems = plRes.status === 'fulfilled' ? plRes.value : [];
            const mergedDisclosures = [...h1Items, ...plItems];
            cycleResults.disclosures.fetched = mergedDisclosures.length;
            const dRes = storage.ingest('disclosures', mergedDisclosures);
            cycleResults.disclosures.added = dRes.added;
            cycleResults.disclosures.skipped = dRes.skipped;

            // 2. Process CVEs & PoCs
            const cveItems = cveRes.status === 'fulfilled' ? cveRes.value : [];
            cycleResults.cve.fetched = cveItems.length;
            const cRes = storage.ingest('cve', cveItems);
            cycleResults.cve.added = cRes.added;
            cycleResults.cve.skipped = cRes.skipped;

            // 3. Process Security News
            const newsItems = newsRes.status === 'fulfilled' ? newsRes.value : [];
            cycleResults.news.fetched = newsItems.length;
            const nRes = storage.ingest('news', newsItems);
            cycleResults.news.added = nRes.added;
            cycleResults.news.skipped = nRes.skipped;

            // 4. Process Twitter / X Security Intel & Tips
            const tipsItems = tipsRes.status === 'fulfilled' ? tipsRes.value : [];
            cycleResults.tips.fetched = tipsItems.length;
            const tRes = storage.ingest('tips', tipsItems);
            cycleResults.tips.added = tRes.added;
            cycleResults.tips.skipped = tRes.skipped;

        } catch (globalErr) {
            console.error('[Worker] Critical error during ingestion cycle:', globalErr);
        } finally {
            this.lastRunEnd = new Date().toISOString();
            this.lastRunDurationMs = Date.now() - startTime;
            this.isRunning = false;
            this.totalRuns++;

            const totalAdded = cycleResults.disclosures.added +
                               cycleResults.cve.added +
                               cycleResults.news.added +
                               cycleResults.tips.added;

            const totalSkipped = cycleResults.disclosures.skipped +
                                 cycleResults.cve.skipped +
                                 cycleResults.news.skipped +
                                 cycleResults.tips.skipped;

            const summary = {
                id: `sync-${Date.now()}`,
                started_at: this.lastRunStart,
                completed_at: this.lastRunEnd,
                duration_ms: this.lastRunDurationMs,
                total_added: totalAdded,
                total_skipped_duplicates: totalSkipped,
                sources: cycleResults,
                storage_stats: storage.getStats()
            };

            this.lastRunResult = summary;
            storage.saveHistory(summary);

            console.log(`[Worker] Ingestion Cycle Completed in ${(this.lastRunDurationMs / 1000).toFixed(2)}s`);
            console.log(`[Worker] Summary: +${totalAdded} new items added, ${totalSkipped} duplicates skipped.`);
            console.log(`[Worker] Total items in database: ${summary.storage_stats.total_items} across 4 categories.`);
            console.log(`======================================================\n`);

            return summary;
        }
    }

    /**
     * Start the automated cron schedule.
     * @param {number} intervalMinutes - Interval in minutes (e.g. 10 or 15)
     */
    startScheduler(intervalMinutes = this.intervalMinutes) {
        this.intervalMinutes = intervalMinutes;
        if (this.cronTask) {
            this.cronTask.stop();
        }

        // Validate cron range 1-59
        const mins = Math.max(1, Math.min(59, intervalMinutes));
        const cronExpression = `*/${mins} * * * *`;

        console.log(`[Worker] Initializing cron scheduler: "${cronExpression}" (Every ${mins} minutes)`);

        this.cronTask = cron.schedule(cronExpression, () => {
            this.runSyncCycle().catch(err => {
                console.error('[Worker] Scheduled cycle unhandled rejection:', err);
            });
        });

        return {
            status: 'active',
            interval_minutes: mins,
            cron_expression: cronExpression
        };
    }

    stopScheduler() {
        if (this.cronTask) {
            this.cronTask.stop();
            this.cronTask = null;
            console.log('[Worker] Scheduler stopped.');
        }
    }

    getStatus() {
        return {
            worker_active: this.cronTask !== null,
            is_currently_syncing: this.isRunning,
            interval_minutes: this.intervalMinutes,
            total_runs: this.totalRuns,
            last_run_start: this.lastRunStart,
            last_run_end: this.lastRunEnd,
            last_run_duration_ms: this.lastRunDurationMs,
            last_result: this.lastRunResult,
            storage_stats: storage.getStats()
        };
    }
}

const workerInstance = new IngestionWorker();

// Standalone CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    let interval = 15;
    for (const arg of args) {
        if (arg.startsWith('--interval=')) {
            interval = parseInt(arg.split('=')[1], 10) || 15;
        }
    }

    console.log(`[Worker CLI] Starting standalone Bug-feed Ingestion Worker...`);
    workerInstance.startScheduler(interval);

    // Run first cycle immediately on launch
    workerInstance.runSyncCycle().then(() => {
        console.log(`[Worker CLI] Standing by for next cycle in ${interval} minutes. Press Ctrl+C to stop.`);
    });
}

module.exports = workerInstance;
