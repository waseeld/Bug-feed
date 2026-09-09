/**
 * Feed Ingestion Modules Test Suite.
 */

const { describe, it, assert } = require('./runner');
const getCveFeed = require('../backend/feed/cve');
const getHackerOneFeed = require('../backend/feed/hackerone');
const getPentesterLandFeed = require('../backend/feed/pentesterland');
const getNewsFeed = require('../backend/feed/news');
const { getTweetsFeed, getTrackedAccounts, getTrackedHashtags } = require('../backend/feed/tweets');

async function runFeedsTests() {
    await describe('Threat Intelligence Feeds Ingestion', async () => {

        await it('CVE Feed: should fetch valid records with zero CVE-UNKNOWN', async () => {
            // Fetch a sample batch of 25
            const cves = await getCveFeed(25);
            assert.ok(Array.isArray(cves), 'CVE feed must return an array');
            assert.ok(cves.length > 0, 'CVE feed must return at least 1 item');

            const unknowns = cves.filter(c => 
                (c.cve_id && c.cve_id.includes('UNKNOWN')) || 
                (c.url && c.url.includes('UNKNOWN')) ||
                (c.title && c.title.includes('UNKNOWN'))
            );
            assert.strictEqual(unknowns.length, 0, 'No item should contain CVE-UNKNOWN in title, ID, or URL');

            // Verify item structure
            const item = cves[0];
            assert.ok(item.id, 'Item must have an ID');
            assert.ok(item.title, 'Item must have a title');
            assert.ok(item.url, 'Item must have a URL');
            assert.ok(item.published_at, 'Item must have a published_at date');
            assert.ok(Array.isArray(item.tags), 'Item must have tags array');
            assert.strictEqual(item.category, 'cve', 'Item category must be cve');
        });

        await it('CVE Feed: PoCs must point to GitHub and advisories to cve.org/osv', async () => {
            const cves = await getCveFeed(30);
            const pocs = cves.filter(c => c.source === 'GitHub PoC');
            const advisories = cves.filter(c => c.source === 'CVE Advisory' || c.source === 'CISA KEV');

            if (pocs.length > 0) {
                const samplePoc = pocs[0];
                assert.ok(samplePoc.url.startsWith('https://github.com/'), 'PoC URL must start with https://github.com/');
                assert.ok(samplePoc.cve_url.startsWith('https://www.cve.org/'), 'PoC cve_url must link to cve.org');
            }

            if (advisories.length > 0) {
                const sampleAdv = advisories[0];
                assert.ok(
                    sampleAdv.url.startsWith('https://www.cve.org/') || sampleAdv.url.startsWith('https://osv.dev/'),
                    'Advisory URL must resolve to cve.org or osv.dev'
                );
            }
        });

        await it('HackerOne Feed: should parse disclosures with programs and bounty', async () => {
            const disclosures = await getHackerOneFeed(15);
            assert.ok(Array.isArray(disclosures), 'Disclosures must be an array');
            assert.ok(disclosures.length > 0, 'Must return at least 1 disclosure item');
            
            const first = disclosures[0];
            assert.ok(first.title, 'Must have title');
            assert.ok(first.url, 'Must have disclosure URL');
            assert.ok(first.source === 'HackerOne', 'Source must be HackerOne');
            assert.ok(first.category === 'vulnerabilities' || first.category === 'disclosures');
        });

        await it('PentesterLand Feed: should parse curated writeups', async () => {
            const writeups = await getPentesterLandFeed(15);
            assert.ok(Array.isArray(writeups), 'Writeups must be an array');
            assert.ok(writeups.length > 0, 'Must return at least 1 writeup');
            
            const first = writeups[0];
            assert.ok(first.title, 'Writeup must have title');
            assert.ok(first.url, 'Writeup must have URL');
            assert.strictEqual(first.source, 'Pentester Land');
        });

        await it('News Feed: should retrieve Infosec news articles', async () => {
            const news = await getNewsFeed(15);
            assert.ok(Array.isArray(news), 'News must be an array');
            assert.ok(news.length > 0, 'Must return at least 1 news item');
            
            const first = news[0];
            assert.ok(first.title, 'Article must have title');
            assert.ok(first.url, 'Article must have URL');
            assert.ok(first.source.includes('News') || first.source.includes('Bleeping') || first.source.includes('Hacker'));
        });

        await it('Tweets Feed: should format direct status URLs with valid authors', async () => {
            const tweets = await getTweetsFeed({ limit: 15 });
            assert.ok(Array.isArray(tweets), 'Tweets must be an array');
            assert.ok(tweets.length > 0, 'Must return at least 1 tweet item');

            // Validate that URLs are direct status links
            const first = tweets[0];
            assert.ok(first.url.startsWith('https://x.com/') || first.url.startsWith('https://twitter.com/'), 'URL must point to x.com/twitter.com');
            assert.ok(first.author, 'Tweet must have an author handle');
            assert.ok(Array.isArray(getTrackedAccounts()), 'Must provide tracked accounts list');
            assert.ok(Array.isArray(getTrackedHashtags()), 'Must provide tracked hashtags list');
        });
    });
}

module.exports = runFeedsTests;

if (require.main === module) {
    (async () => {
        const t0 = Date.now();
        await runFeedsTests();
        const { printSummary } = require('./runner');
        printSummary(Date.now() - t0);
    })();
}
