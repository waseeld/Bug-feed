/**
 * Deterministic sample data for the offline test suites.
 */

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.parse('2026-11-01T12:00:00Z');

function isoDaysAgo(n) {
    return new Date(BASE - n * DAY).toISOString();
}

function cveItems(count = 120, offset = 0) {
    const items = [];
    for (let i = offset; i < offset + count; i++) {
        const cveId = `CVE-2026-${10000 + i}`;
        const poc = i % 3 === 0;
        items.push({
            id: `cve-fixture-${i}`,
            cve_id: cveId,
            title: `${cveId}: ${poc ? 'Proof of concept for' : 'Advisory about'} sample issue ${i}`,
            source: poc ? 'GitHub PoC' : 'CISA KEV',
            category: 'cve',
            url: poc ? `https://github.com/example/poc-${i}` : `https://www.cve.org/CVERecord?id=${cveId}`,
            cve_url: `https://www.cve.org/CVERecord?id=${cveId}`,
            nvd_url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
            published_at: isoDaysAgo(i % 60),
            tags: [cveId, poc ? 'PoC' : 'KEV']
        });
    }
    return items;
}

function disclosureItems() {
    const items = [];
    for (let i = 0; i < 10; i++) {
        const h1 = i % 2 === 0;
        items.push({
            id: `disc-fixture-${i}`,
            title: `${h1 ? 'IDOR' : 'SSRF'} writeup number ${i}`,
            source: h1 ? 'HackerOne' : 'Pentester Land',
            category: 'disclosures',
            url: h1 ? `https://hackerone.com/reports/${9000 + i}` : `https://example.org/writeup/${i}`,
            published_at: isoDaysAgo(i),
            tags: ['web']
        });
    }
    return items;
}

function newsItems() {
    return Array.from({ length: 8 }, (_, i) => ({
        id: `news-fixture-${i}`,
        title: `Security news headline ${i}`,
        source: i % 2 ? 'The Hacker News' : 'BleepingComputer',
        category: 'news',
        url: `https://news.example.org/article-${i}`,
        published_at: isoDaysAgo(i),
        tags: ['news']
    }));
}

/** Live community posts. "busybot" has 6 posts to exercise the per-author cap. */
function tipItems() {
    const items = [];
    for (let i = 0; i < 6; i++) {
        items.push({
            id: `masto-mastodon.social-bot-${i}`,
            platform: 'mastodon',
            source: 'Mastodon',
            category: 'tips',
            title: `Automated threat post ${i} #threatintel`,
            url: `https://mastodon.social/@busybot/${100 + i}`,
            published_at: isoDaysAgo(0.1 * i),
            author: { handle: 'busybot@mastodon.social', name: 'Busy Bot', avatar: null, profile_url: 'https://mastodon.social/@busybot', platform: 'mastodon' },
            likes: 0, reposts: 0, replies: 0,
            tags: ['#threatintel']
        });
    }
    for (let i = 0; i < 4; i++) {
        items.push({
            id: `bsky-researcher-${i}`,
            platform: 'bluesky',
            source: 'Bluesky',
            category: 'tips',
            title: `Researcher note ${i} about recon #bugbounty`,
            url: `https://bsky.app/profile/researcher.example.org/post/${i}`,
            published_at: isoDaysAgo(1 + i),
            author: { handle: 'researcher.example.org', name: 'Researcher', avatar: null, profile_url: 'https://bsky.app/profile/researcher.example.org', platform: 'bluesky' },
            likes: 10 + i, reposts: 2, replies: 1,
            tags: ['#bugbounty']
        });
    }
    return items;
}

function seedStore() {
    return {
        disclosures: disclosureItems(),
        cve: cveItems(),
        news: newsItems(),
        tips: tipItems(),
        last_updated: new Date(BASE).toISOString()
    };
}

const RSS_SAMPLE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<item>
  <title><![CDATA[Critical flaw in Example VPN &amp; gateway]]></title>
  <link>https://news.example.org/vpn-flaw</link>
  <pubDate>Tue, 18 Nov 2026 09:30:00 GMT</pubDate>
  <category>Vulnerability</category>
  <category>VPN</category>
</item>
<item>
  <title>Second story</title>
  <link>https://news.example.org/second</link>
  <pubDate>not a date</pubDate>
</item>
</channel></rss>`;

module.exports = {
    BASE,
    isoDaysAgo,
    cveItems,
    disclosureItems,
    newsItems,
    tipItems,
    seedStore,
    RSS_SAMPLE
};
