/**
 * Live checks against the real upstream sources: `npm run test:live`.
 * Needs internet access. Uses a temporary DATA_DIR so nothing touches backend/data.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugfeed-live-'));
process.env.DATA_DIR = tmpDir;

const { printSummary } = require('./runner');
const runFeedsTests = require('./feeds.test');

(async () => {
    const t0 = Date.now();
    let success = false;
    try {
        await runFeedsTests();
        success = printSummary(Date.now() - t0);
    } catch (err) {
        console.error('\nFatal live test exception:', err);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    process.exit(success ? 0 : 1);
})();
