/**
 * Unified Test Suite Runner for Bug-Feed.
 * Runs all suites: storage, feeds, and api.
 */

const { printSummary } = require('./runner');
const runStorageTests = require('./storage.test');
const runFeedsTests = require('./feeds.test');
const runApiTests = require('./api.test');

async function main() {
    console.log(`\n======================================================`);
    console.log(`      🧪 BUG-FEED COMPREHENSIVE TEST RUNNER           `);
    console.log(`======================================================`);

    const t0 = Date.now();

    try {
        // 1. Run Storage & Deduplication Tests
        await runStorageTests();

        // 2. Run Threat Feeds Ingestion Tests
        await runFeedsTests();

        // 3. Run REST API Endpoints Tests
        await runApiTests();

        const duration = Date.now() - t0;
        const success = printSummary(duration);

        if (!success) {
            process.exit(1);
        } else {
            console.log(`🎉 All tests passed successfully! Project is 100% operational.\n`);
            process.exit(0);
        }
    } catch (err) {
        console.error(`\n💥 Fatal Test Runner Exception:`, err);
        process.exit(1);
    }
}

main();
