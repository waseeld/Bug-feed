/**
 * Offline test environment. Require this BEFORE any backend module:
 *   - DATA_DIR points at a fresh temporary folder seeded with fixture data
 *   - AUTH_SECRET is a random per-run value
 *   - the four network feed modules are replaced with controllable stubs
 *   - global fetch answers Mastodon/Bluesky calls from canned data (see fake-net.js)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const fixtures = require('./fixtures');
const fakeNet = require('./fake-net');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugfeed-test-'));
process.env.DATA_DIR = tmpDir;
process.env.AUTH_SECRET = crypto.randomBytes(48).toString('hex');
process.env.DISABLE_WORKER = 'true';

fs.writeFileSync(path.join(tmpDir, 'feeds_store.json'), JSON.stringify(fixtures.seedStore()));

/**
 * Stubbed feed sources. Tests can change `feedStubs.data.<name>` or set
 * `feedStubs.fail.<name> = true` to make a source throw.
 */
const feedStubs = {
    data: {
        cve: fixtures.cveItems(),
        hackerone: fixtures.disclosureItems().filter(d => d.source === 'HackerOne'),
        pentesterland: fixtures.disclosureItems().filter(d => d.source === 'Pentester Land'),
        news: fixtures.newsItems()
    },
    fail: { cve: false, hackerone: false, pentesterland: false, news: false },
    calls: { cve: 0, hackerone: 0, pentesterland: 0, news: 0 }
};

function stubModule(relPath, name) {
    const filename = require.resolve(path.join('..', '..', relPath));
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.loaded = true;
    mod.exports = async (limit = Infinity) => {
        feedStubs.calls[name]++;
        if (feedStubs.fail[name]) throw new Error(`${name} source is down (test)`);
        return feedStubs.data[name].slice(0, limit === Infinity ? undefined : limit);
    };
    require.cache[filename] = mod;
}

stubModule('backend/feed/cve', 'cve');
stubModule('backend/feed/hackerone', 'hackerone');
stubModule('backend/feed/pentesterland', 'pentesterland');
stubModule('backend/feed/news', 'news');

fakeNet.install();

function cleanup() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { tmpDir, feedStubs, fakeNet, fixtures, cleanup };
