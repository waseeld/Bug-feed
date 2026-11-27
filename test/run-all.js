/**
 * Offline test runner for Bug-feed: `npm test`.
 *
 * Needs no running server, no network and no real data: helpers/setup.js points DATA_DIR at a
 * temporary folder with fixture data, stubs the feed sources and fakes Mastodon/Bluesky.
 * Network checks against the real sources live in test/live.js (`npm run test:live`).
 *
 * Run one or more suites by name:  node test/run-all.js api worker
 */

const setup = require('./helpers/setup'); // must come before any backend module
const { printSummary } = require('./runner');

const SUITES = {
    storage: () => require('./storage.test'),
    blog: () => require('./blog.test'),
    auth: () => require('./auth.test'),
    parsers: () => require('./parsers.test'),
    community: () => require('./community.test'),
    worker: () => require('./worker.test'),
    api: () => require('./api.test')
};

async function main() {
    const requested = process.argv.slice(2);
    const unknown = requested.filter(name => !SUITES[name]);
    if (unknown.length) {
        console.error(`Unknown suite(s): ${unknown.join(', ')}. Available: ${Object.keys(SUITES).join(', ')}`);
        process.exit(2);
    }
    const names = requested.length ? requested : Object.keys(SUITES);

    console.log('\n======================================================');
    console.log('      BUG-FEED TEST RUNNER (offline)');
    console.log(`      suites: ${names.join(', ')}`);
    console.log('======================================================');

    const t0 = Date.now();
    let success = false;
    try {
        for (const name of names) {
            await SUITES[name]()();
        }
        success = printSummary(Date.now() - t0);
    } catch (err) {
        console.error('\nFatal test runner exception:', err);
    } finally {
        require('./../backend/worker').stopScheduler();
        setup.cleanup();
    }
    process.exit(success ? 0 : 1);
}

main();
