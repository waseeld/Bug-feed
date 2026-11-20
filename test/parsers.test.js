/**
 * Offline parser tests for feed modules that the rest of the offline suite stubs out.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { describe, it, assert } = require('./runner');
const { RSS_SAMPLE } = require('./helpers/fixtures');

/** Load the real module even though helpers/setup.js put a stub in require.cache. */
function loadReal(relPath) {
    const file = path.join(__dirname, '..', relPath);
    const mod = new Module(file, module);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    mod._compile(fs.readFileSync(file, 'utf8'), file);
    return mod.exports;
}

async function runParserTests() {
    const { parseRssXml } = loadReal('backend/feed/news.js');

    await describe('News RSS parser (feed/news.js)', async () => {
        await it('should read titles, links, dates and categories', () => {
            const items = parseRssXml(RSS_SAMPLE, 'Example News');
            assert.strictEqual(items.length, 2);
            const first = items[0];
            assert.strictEqual(first.title, 'Critical flaw in Example VPN & gateway', 'CDATA and entities decoded');
            assert.strictEqual(first.url, 'https://news.example.org/vpn-flaw');
            assert.strictEqual(first.published_at, '2026-11-18');
            assert.deepStrictEqual(first.tags, ['Example News', 'Vulnerability', 'VPN']);
            assert.strictEqual(first.category, 'news');
        });

        await it('should give stable ids and survive bad dates', () => {
            const a = parseRssXml(RSS_SAMPLE, 'Example News');
            const b = parseRssXml(RSS_SAMPLE, 'Example News');
            assert.strictEqual(a[0].id, b[0].id, 'Same link, same id');
            assert.notStrictEqual(a[0].id, a[1].id);
            assert.match(a[1].published_at, /^\d{4}-\d{2}-\d{2}$/, 'Bad date falls back to a valid date');
        });

        await it('should return nothing for empty or broken XML', () => {
            assert.deepStrictEqual(parseRssXml('', 'X'), []);
            assert.deepStrictEqual(parseRssXml('<rss><channel></channel></rss>', 'X'), []);
        });
    });
}

module.exports = runParserTests;
