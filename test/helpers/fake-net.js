/**
 * Replaces global fetch for the offline suites.
 * Requests to localhost go to the real network (the in-process test server);
 * Mastodon and Bluesky API calls get canned answers; anything else fails like a dead network.
 *
 * Conventions in the canned answers:
 *   - a username or handle starting with "missing" does not exist (404 / 400)
 *   - any host ending in "down.example" is unreachable
 */

const realFetch = globalThis.fetch;
const calls = [];

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mastodonAccount(user, host) {
    return {
        id: `id-${user}`,
        username: user,
        acct: user,
        display_name: `${user} :verified:`,
        note: '<p>Security researcher &amp; <a href="https://example.org">writer</a></p>',
        avatar_static: `https://${host}/avatars/${user}.png`,
        url: `https://${host}/@${user}`,
        last_status_at: '2026-11-19'
    };
}

function mastodonStatus(id, user, host, extra = {}) {
    return {
        id: String(id),
        created_at: '2026-11-19T10:00:00.000Z',
        visibility: 'public',
        language: 'en',
        url: `https://${host}/@${user}/${id}`,
        content: `<p>Post ${id} from ${user}<br>second line &amp; more <a href="https://${host}/tags/infosec">#<span>infosec</span></a></p>`,
        spoiler_text: '',
        favourites_count: 5,
        reblogs_count: 2,
        replies_count: 1,
        tags: [{ name: 'infosec' }],
        account: mastodonAccount(user, host),
        ...extra
    };
}

async function fakeFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    calls.push(url.toString());

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return realFetch(input, init);
    }
    if (url.hostname.endsWith('down.example')) {
        throw new TypeError('fetch failed (offline test network)');
    }

    // Bluesky public AppView
    if (url.hostname === 'public.api.bsky.app') {
        const actor = url.searchParams.get('actor') || '';
        if (actor.startsWith('missing')) return json({ error: 'InvalidRequest', message: 'Profile not found' }, 400);
        if (url.pathname.endsWith('app.bsky.actor.getProfile')) {
            return json({ handle: actor, displayName: `Name of ${actor}`, description: 'Bluesky bio', avatar: `https://cdn.example/${actor}.jpg` });
        }
        if (url.pathname.endsWith('app.bsky.feed.getAuthorFeed')) {
            const post = (n, text) => ({
                uri: `at://did:plc:${actor}/app.bsky.feed.post/rkey${n}`,
                author: { did: `did:plc:${actor}`, handle: actor, displayName: `Name of ${actor}`, avatar: null },
                record: { text, createdAt: `2026-11-1${n}T08:00:00.000Z`, langs: ['en'], facets: [{ features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'recon' }] }] },
                likeCount: 7, repostCount: 3, replyCount: 0, indexedAt: `2026-11-1${n}T08:00:01.000Z`
            });
            return json({
                feed: [
                    { post: post(8, 'Fresh recon tip #recon') },
                    { post: post(7, 'Older note') },
                    { post: post(6, 'Someone else\'s post'), reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }
                ]
            });
        }
    }

    // Mastodon
    if (url.pathname === '/api/v1/accounts/lookup') {
        const user = url.searchParams.get('acct');
        if (!user || user.startsWith('missing')) return json({ error: 'Record not found' }, 404);
        return json(mastodonAccount(user, url.hostname));
    }
    const statuses = url.pathname.match(/^\/api\/v1\/accounts\/id-([^/]+)\/statuses$/);
    if (statuses) {
        const user = decodeURIComponent(statuses[1]);
        return json([
            mastodonStatus(2, user, url.hostname),
            mastodonStatus(1, user, url.hostname, { spoiler_text: 'exploit details' }),
            mastodonStatus(3, user, url.hostname, { visibility: 'unlisted' })
        ]);
    }
    const tag = url.pathname.match(/^\/api\/v1\/timelines\/tag\/([^/]+)$/);
    if (tag) {
        return json([mastodonStatus(`t-${tag[1]}`, 'tagger', url.hostname, { tags: [{ name: tag[1] }] })]);
    }

    throw new TypeError(`fetch failed: no offline answer for ${url.hostname}${url.pathname}`);
}

function install() {
    globalThis.fetch = fakeFetch;
}

module.exports = { install, calls, realFetch };
