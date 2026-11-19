/**
 * Community Intel module tests (backend/feed/tweets.js), against the offline fake network.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, assert } = require('./runner');

async function runCommunityTests() {
    const community = require('../backend/feed/tweets');
    const sourcesFile = path.join(process.env.DATA_DIR, 'community_sources.json');

    await describe('Community Intel: input parsing', async () => {
        const cases = [
            ['user@infosec.exchange', { platform: 'mastodon', handle: 'user@infosec.exchange' }],
            ['@User@Infosec.Exchange', { platform: 'mastodon', handle: 'User@infosec.exchange' }],
            ['https://infosec.exchange/@briankrebs', { platform: 'mastodon', handle: 'briankrebs@infosec.exchange' }],
            ['troyhunt.com', { platform: 'bluesky', handle: 'troyhunt.com' }],
            ['https://bsky.app/profile/name.bsky.social', { platform: 'bluesky', handle: 'name.bsky.social' }]
        ];
        for (const [input, expected] of cases) {
            await it(`should parse "${input}"`, () => {
                assert.deepStrictEqual(community.parseAccountInput(input), expected);
            });
        }

        await it('should reject bare X handles with an explanation', () => {
            const result = community.parseAccountInput('vxunderground');
            assert.ok(result.error && /X API/.test(result.error));
        });

        await it('should refuse local, private and IP hosts', () => {
            for (const input of ['a@localhost', 'a@10.0.0.1', 'a@intranet.corp', 'a@box.local', 'printer.internal', '']) {
                assert.ok(community.parseAccountInput(input).error, `${input} must be rejected`);
            }
        });

        await it('should turn Mastodon HTML into plain text', () => {
            const text = community.htmlToText('<p>Line one<br>line two &amp; <a href="#">link</a></p><p>Para &#39;two&#39; &#x1F512;</p>');
            assert.strictEqual(text, "Line one\nline two & link\n\nPara 'two' 🔒");
        });
    });

    await describe('Community Intel: feeds', async () => {
        await it('should merge live Mastodon and Bluesky posts with real dates and counts', async () => {
            const { items, errors } = await community.getCommunityFeed({ limit: 500, liveOnly: true });
            assert.strictEqual(errors.length, 0, JSON.stringify(errors));
            const platforms = new Set(items.map(i => i.platform));
            assert.ok(platforms.has('mastodon') && platforms.has('bluesky'), 'Both platforms expected');
            assert.ok(items.every(i => !i.archived), 'liveOnly must exclude the archive');
            assert.ok(items.every(i => !Number.isNaN(Date.parse(i.published_at))), 'Every post has a real date');
            for (let i = 1; i < items.length; i++) {
                assert.ok(Date.parse(items[i - 1].published_at) >= Date.parse(items[i].published_at), 'Newest first');
            }
        });

        await it('should skip non-public Mastodon posts and Bluesky reposts', async () => {
            const masto = await community.getCommunityFeed({ account: 'someone@infosec.exchange' });
            assert.strictEqual(masto.items.length, 2, 'The unlisted status must be dropped');
            assert.ok(masto.items.some(i => i.title.startsWith('[CW: exploit details]')), 'Content warnings stay visible');
            assert.ok(!masto.items[0].author.name.includes(':verified:'), 'Emoji shortcodes removed from names');
            assert.strictEqual(masto.items[0].likes, 5);

            const bsky = await community.getCommunityFeed({ account: 'someone.bsky.social' });
            assert.strictEqual(bsky.items.length, 2, 'Reposts must be dropped');
            assert.ok(bsky.items[0].url.startsWith('https://bsky.app/profile/someone.bsky.social/post/'));
            assert.ok(bsky.items[0].tags.includes('#recon'));
        });

        await it('should report unreachable sources instead of failing the whole feed', async () => {
            const { items, errors } = await community.getCommunityFeed({ account: 'user@server.down.example' });
            assert.strictEqual(items.length, 0);
            assert.strictEqual(errors.length, 1);
            assert.strictEqual(errors[0].source, 'user@server.down.example');
        });

        await it('should fetch hashtags and include matching archive posts', async () => {
            const { items } = await community.getCommunityFeed({ hashtag: 'infosec' });
            assert.ok(items.some(i => i.platform === 'mastodon'), 'Live tag results expected');
            assert.ok(items.some(i => i.archived), 'Archived #infosec posts expected');
            const bad = await community.getCommunityFeed({ hashtag: 'bad tag!' });
            assert.strictEqual(bad.items.length, 0);
            assert.ok(bad.errors[0].error);
        });

        await it('should serve archived X posts by handle when the account is an X handle', async () => {
            const { items } = await community.getCommunityFeed({ account: 'vxunderground' });
            assert.ok(items.length > 0);
            assert.ok(items.every(i => i.archived && i.author.handle === 'vxunderground'));
        });

        await it('should keep the X archive honest: real dates from status IDs, no counts', () => {
            const archive = community.getArchiveItems();
            assert.ok(archive.length > 0);
            for (const item of archive) {
                assert.strictEqual(item.archived, true);
                assert.strictEqual(item.likes, null);
                assert.strictEqual(item.reposts, null);
                const id = /\/status\/(\d+)/.exec(item.url);
                if (id) {
                    const fromId = Number((BigInt(id[1]) >> 22n) + 1288834974657n);
                    assert.strictEqual(Date.parse(item.published_at), fromId, item.id);
                }
            }
        });
    });

    await describe('Community Intel: tracked sources', async () => {
        await it('should add an existing account and save it to disk', async () => {
            const result = await community.addCustomAccount('https://infosec.exchange/@newperson');
            assert.ok(result.ok, result.error);
            assert.strictEqual(result.account.handle, 'newperson@infosec.exchange');
            const saved = JSON.parse(fs.readFileSync(sourcesFile, 'utf8'));
            assert.ok(saved.accounts.some(a => a.handle === 'newperson@infosec.exchange'));
            assert.ok(community.getTrackedAccounts().some(a => a.handle === 'newperson@infosec.exchange' && a.custom));
        });

        await it('should not add the same account twice', async () => {
            const before = community.getTrackedAccounts().length;
            const again = await community.addCustomAccount('newperson@infosec.exchange');
            assert.ok(again.ok && again.alreadyTracked);
            assert.strictEqual(community.getTrackedAccounts().length, before);
        });

        await it('should refuse accounts that do not exist or cannot be reached', async () => {
            const missing = await community.addCustomAccount('missinguser@infosec.exchange');
            assert.ok(!missing.ok && /not found/.test(missing.error));
            const down = await community.addCustomAccount('user@host.down.example');
            assert.ok(!down.ok && /Could not reach/.test(down.error));
        });

        await it('should remove only accounts the user added', () => {
            assert.strictEqual(community.removeCustomAccount('newperson@infosec.exchange'), true);
            assert.strictEqual(community.removeCustomAccount('briankrebs@infosec.exchange'), false, 'Defaults stay');
        });

        await it('should add, de-duplicate and remove hashtags', () => {
            assert.deepStrictEqual(community.addCustomHashtag('#CloudSec'), { ok: true, tag: '#cloudsec' });
            community.addCustomHashtag('cloudsec');
            assert.strictEqual(community.getTrackedHashtags().filter(t => t === '#cloudsec').length, 1);
            assert.ok(!community.addCustomHashtag('not valid').ok);
            assert.strictEqual(community.removeCustomHashtag('cloudsec'), true);
            assert.strictEqual(community.removeCustomHashtag('#bugbounty'), false, 'Defaults stay');
        });

        await it('should enrich tracked accounts with live profile data', async () => {
            const accounts = await community.getTrackedAccountsWithProfiles();
            const krebs = accounts.find(a => a.handle === 'briankrebs@infosec.exchange');
            assert.ok(krebs.reachable);
            assert.ok(krebs.avatar && krebs.bio);
        });
    });
}

module.exports = runCommunityTests;
