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
const community = require('./feed/tweets');

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
     * Run a fetcher with a timeout. Never throws.
     * @returns {Promise<{ items: Array, error: string|null }>}
     */
    async fetchWithTimeout(fetchFn, timeoutMs = 25000) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            const result = await Promise.race([fetchFn(), timeoutPromise]);
            if (!Array.isArray(result)) {
                return { items: [], error: 'Source returned no list' };
            }
            return { items: result, error: null };
        } catch (err) {
            console.error('[Worker] Source fetch warning:', err.message);
            return { items: [], error: err.message };
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
        console.log(`[Worker] Starting data ingestion cycle: ${this.lastRunStart}`);

        const cycleResults = {
            disclosures: { fetched: 0, added: 0, skipped: 0, error: null },
            cve: { fetched: 0, added: 0, skipped: 0, error: null },
            news: { fetched: 0, added: 0, skipped: 0, error: null },
            tips: { fetched: 0, added: 0, skipped: 0, error: null }
        };

        try {
            const [h1, pl, cve, news, tips] = await Promise.all([
                this.fetchWithTimeout(() => getHackerOneFeed(50)),
                this.fetchWithTimeout(() => getPentesterLandFeed(60)),
                this.fetchWithTimeout(() => getCveFeed(Infinity), 45000),
                this.fetchWithTimeout(() => getNewsFeed(50)),
                // Only live Mastodon/Bluesky posts are stored; the X archive is served from its data file.
                this.fetchWithTimeout(() => community.getTweetsFeed({ limit: 200, liveOnly: true }))
            ]);

            const batches = {
                disclosures: { items: [...h1.items, ...pl.items], error: [h1.error && `HackerOne: ${h1.error}`, pl.error && `PentesterLand: ${pl.error}`].filter(Boolean).join('; ') || null },
                cve,
                news,
                tips
            };

            for (const [category, batch] of Object.entries(batches)) {
                const res = storage.ingest(category, batch.items, { persist: false });
                cycleResults[category] = {
                    fetched: batch.items.length,
                    added: res.added,
                    skipped: res.skipped,
                    error: batch.error
                };
            }

            // One write of the store and registry per cycle instead of one per category.
            storage.persist();
        } catch (globalErr) {
            console.error('[Worker] Critical error during ingestion cycle:', globalErr);
        } finally {
            this.lastRunEnd = new Date().toISOString();
            this.lastRunDurationMs = Date.now() - startTime;
            this.isRunning = false;
            this.totalRuns++;
        }

        const totalAdded = Object.values(cycleResults).reduce((n, r) => n + r.added, 0);
        const totalSkipped = Object.values(cycleResults).reduce((n, r) => n + r.skipped, 0);
        const failedSources = Object.entries(cycleResults).filter(([, r]) => r.error).map(([name]) => name);

        const summary = {
            id: `sync-${Date.now()}`,
            started_at: this.lastRunStart,
            completed_at: this.lastRunEnd,
            duration_ms: this.lastRunDurationMs,
            total_added: totalAdded,
            total_skipped_duplicates: totalSkipped,
            failed_sources: failedSources,
            sources: cycleResults,
            storage_stats: storage.getStats()
        };

        this.lastRunResult = summary;
        storage.saveHistory(summary);

        console.log(`[Worker] Cycle done in ${(this.lastRunDurationMs / 1000).toFixed(2)}s: +${totalAdded} new, ${totalSkipped} duplicates skipped${failedSources.length ? `, failed: ${failedSources.join(', ')}` : ''}.`);

        return summary;
    }

    /**
     * Start the automated cron schedule.
     * @param {number} intervalMinutes - 1 to 59. Values that don't divide 60 restart at the top of each hour.
     */
    startScheduler(intervalMinutes = this.intervalMinutes) {
        const mins = Math.max(1, Math.min(59, parseInt(intervalMinutes, 10) || 15));
        this.intervalMinutes = mins;
        if (this.cronTask) {
            this.cronTask.stop();
        }

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

    console.log('[Worker CLI] Starting standalone Bug-feed Ingestion Worker...');
    workerInstance.startScheduler(interval);

    // Run first cycle immediately on launch
    workerInstance.runSyncCycle().then(() => {
        console.log(`[Worker CLI] Standing by for next cycle in ${interval} minutes. Press Ctrl+C to stop.`);
    });
}

module.exports = workerInstance;
