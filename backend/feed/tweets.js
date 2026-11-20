/**
 * Community Intel feed.
 *
 * Live posts come from public, keyless APIs:
 *   - Mastodon: account statuses from each account's own server, hashtag timelines from mastodon.social
 *   - Bluesky: author feeds from the public AppView (public.api.bsky.app)
 * X/Twitter has no free read API, so older X posts are served only as a clearly labelled archive
 * (backend/feed/data/x-archive.json) with their real publication dates.
 *
 * Every item carries its real date and only the engagement counts the source actually reports.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, atomicWriteJson } = require('../paths');
const X_ARCHIVE = require('./data/x-archive.json');

const SOURCES_FILE = path.join(DATA_DIR, 'community_sources.json');
const TAG_INSTANCE = 'mastodon.social';
const REQUEST_TIMEOUT_MS = 12000;
const PROFILE_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BugFeed/1.0)';

const DEFAULT_ACCOUNTS = [
    { platform: 'mastodon', handle: 'briankrebs@infosec.exchange', name: 'Brian Krebs' },
    { platform: 'mastodon', handle: 'GossiTheDog@cyberplace.social', name: 'Kevin Beaumont' },
    { platform: 'mastodon', handle: 'malwaretech@infosec.exchange', name: 'Marcus Hutchins' },
    { platform: 'mastodon', handle: 'albinowax@infosec.exchange', name: 'James Kettle' },
    { platform: 'mastodon', handle: 'thezdi@infosec.exchange', name: 'Zero Day Initiative' },
    { platform: 'mastodon', handle: 'projectdiscovery@infosec.exchange', name: 'ProjectDiscovery' },
    { platform: 'mastodon', handle: 'tomnomnom@infosec.exchange', name: 'TomNomNom' },
    { platform: 'mastodon', handle: 'mttaggart@infosec.exchange', name: 'Taggart' },
    { platform: 'bluesky', handle: 'troyhunt.com', name: 'Troy Hunt' },
    { platform: 'bluesky', handle: 'zackwhittaker.com', name: 'Zack Whittaker' },
    { platform: 'bluesky', handle: 'campuscodi.risky.biz', name: 'Catalin Cimpanu' }
];

const DEFAULT_HASHTAGS = ['#bugbounty', '#bugbountytips', '#threatintel', '#redteam', '#appsec', '#infosec', '#cve'];

// Hashtags merged into the default "all" stream (the busy ones like #infosec are mostly bots).
const DEFAULT_STREAM_TAGS = ['bugbounty', 'bugbountytips', 'threatintel'];

const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet'];

// ---------------------------------------------------------------------------
// Persistence of user-added sources
// ---------------------------------------------------------------------------

function loadCustomSources() {
    try {
        const parsed = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
        return {
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : []
        };
    } catch (e) {
        return { accounts: [], hashtags: [] };
    }
}

const custom = loadCustomSources();

function saveCustomSources() {
    atomicWriteJson(SOURCES_FILE, custom);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–' };

function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
        if (code[0] === '#') {
            const num = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return Number.isFinite(num) ? String.fromCodePoint(num) : match;
        }
        return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    });
}

/** Convert Mastodon's status HTML to plain text with line breaks preserved. */
function htmlToText(html) {
    if (!html) return '';
    const text = String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
        .replace(/<[^>]+>/g, '');
    return decodeEntities(text).replace(/\n{3,}/g, '\n\n').trim();
}

/** Mastodon display names can contain custom emoji shortcodes like ":verified:"; drop them. */
function cleanDisplayName(name) {
    return String(name || '').replace(/:[A-Za-z0-9_]+:/g, '').replace(/\s+/g, ' ').trim();
}

function extractHashtags(text) {
    const tags = new Set();
    for (const match of String(text || '').matchAll(/(?:^|\s)#([A-Za-z0-9_]{2,50})/g)) {
        tags.add('#' + match[1]);
    }
    return [...tags];
}

async function fetchJson(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

function isSafeHost(host) {
    const h = String(host || '').toLowerCase();
    return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(h) && !BLOCKED_HOST_SUFFIXES.some(s => h.endsWith(s));
}

/**
 * Parse what a user typed into a source descriptor.
 * Accepts: user@server (Mastodon), @user@server, https://server/@user,
 *          name.bsky.social or a custom-domain Bluesky handle, https://bsky.app/profile/handle
 * @returns {{ platform: 'mastodon'|'bluesky', handle: string } | { error: string }}
 */
function parseAccountInput(input) {
    let value = String(input || '').trim();
    if (!value) return { error: 'Enter an account.' };

    const bskyUrl = value.match(/^https?:\/\/bsky\.app\/profile\/([^/?#]+)/i);
    if (bskyUrl) value = bskyUrl[1];

    const mastoUrl = value.match(/^https?:\/\/([^/]+)\/@([A-Za-z0-9_.]+)\/?$/i);
    if (mastoUrl) value = `${mastoUrl[2]}@${mastoUrl[1]}`;

    value = value.replace(/^@/, '');

    const masto = value.match(/^([A-Za-z0-9_.]{1,30})@([A-Za-z0-9.-]+)$/);
    if (masto) {
        if (!isSafeHost(masto[2])) return { error: `"${masto[2]}" is not a public server name.` };
        return { platform: 'mastodon', handle: `${masto[1]}@${masto[2].toLowerCase()}` };
    }

    if (/^([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/.test(value)) {
        if (!isSafeHost(value)) return { error: `"${value}" is not a public handle.` };
        return { platform: 'bluesky', handle: value.toLowerCase() };
    }

    return {
        error: 'Use a Mastodon address like user@infosec.exchange or a Bluesky handle like name.bsky.social. X accounts cannot be read without a paid X API key.'
    };
}

function normalizeTag(input) {
    const match = String(input || '').trim().match(/^#?([A-Za-z0-9_]{1,50})$/);
    return match ? '#' + match[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Mastodon
// ---------------------------------------------------------------------------

const mastodonIds = new Map(); // "user@host" -> account id
const profileCache = new Map(); // "platform:handle" -> { at, profile }

function normalizeMastodonStatus(status, host) {
    const account = status.account || {};
    const acct = account.acct && account.acct.includes('@') ? account.acct : `${account.acct || account.username}@${host}`;
    const text = htmlToText(status.content);
    const title = status.spoiler_text ? `[CW: ${status.spoiler_text}]\n${text}` : text;
    return {
        id: `masto-${host}-${status.id}`,
        platform: 'mastodon',
        source: 'Mastodon',
        category: 'tips',
        title,
        url: status.url || status.uri,
        published_at: status.created_at,
        author: {
            handle: acct,
            name: cleanDisplayName(account.display_name) || account.username || acct,
            avatar: account.avatar_static || account.avatar || null,
            profile_url: account.url || null,
            platform: 'mastodon'
        },
        likes: status.favourites_count ?? null,
        reposts: status.reblogs_count ?? null,
        replies: status.replies_count ?? null,
        tags: (status.tags || []).map(t => '#' + t.name).slice(0, 6),
        language: status.language || null
    };
}

async function lookupMastodonAccount(handle) {
    const [user, host] = handle.split('@');
    const account = await fetchJson(`https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`);
    mastodonIds.set(handle, account.id);
    return account;
}

async function fetchMastodonAccount(handle, limit = 20) {
    const host = handle.split('@')[1];
    let id = mastodonIds.get(handle);
    if (!id) id = (await lookupMastodonAccount(handle)).id;
    const statuses = await fetchJson(
        `https://${host}/api/v1/accounts/${encodeURIComponent(id)}/statuses?limit=${limit}&exclude_replies=true&exclude_reblogs=true`
    );
    return statuses.filter(s => s.visibility === 'public').map(s => normalizeMastodonStatus(s, host));
}

async function fetchMastodonTag(tag, limit = 30) {
    const name = tag.replace(/^#/, '');
    const statuses = await fetchJson(`https://${TAG_INSTANCE}/api/v1/timelines/tag/${encodeURIComponent(name)}?limit=${limit}`);
    return statuses.filter(s => s.visibility === 'public').map(s => normalizeMastodonStatus(s, TAG_INSTANCE));
}

// ---------------------------------------------------------------------------
// Bluesky
// ---------------------------------------------------------------------------

const BSKY_API = 'https://public.api.bsky.app/xrpc';

function normalizeBlueskyPost(post) {
    const record = post.record || {};
    const author = post.author || {};
    const rkey = String(post.uri || '').split('/').pop();
    const facetTags = (record.facets || [])
        .flatMap(f => f.features || [])
        .filter(f => f.$type === 'app.bsky.richtext.facet#tag' && f.tag)
        .map(f => '#' + f.tag);
    return {
        id: `bsky-${author.did || author.handle}-${rkey}`,
        platform: 'bluesky',
        source: 'Bluesky',
        category: 'tips',
        title: record.text || '',
        url: `https://bsky.app/profile/${author.handle}/post/${rkey}`,
        published_at: record.createdAt || post.indexedAt,
        author: {
            handle: author.handle,
            name: author.displayName || author.handle,
            avatar: author.avatar || null,
            profile_url: `https://bsky.app/profile/${author.handle}`,
            platform: 'bluesky'
        },
        likes: post.likeCount ?? null,
        reposts: post.repostCount ?? null,
        replies: post.replyCount ?? null,
        tags: [...new Set([...facetTags, ...extractHashtags(record.text)])].slice(0, 6),
        language: Array.isArray(record.langs) ? record.langs[0] : null
    };
}

async function fetchBlueskyAccount(handle, limit = 20) {
    const json = await fetchJson(
        `${BSKY_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${limit}&filter=posts_no_replies`
    );
    return (json.feed || [])
        .filter(entry => !entry.reason) // skip reposts of other people's posts
        .map(entry => normalizeBlueskyPost(entry.post));
}

// ---------------------------------------------------------------------------
// Profiles (for the account picker)
// ---------------------------------------------------------------------------

async function fetchProfile(account) {
    const key = `${account.platform}:${account.handle}`;
    const cached = profileCache.get(key);
    if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached.profile;

    let profile;
    if (account.platform === 'mastodon') {
        const a = await lookupMastodonAccount(account.handle);
        profile = {
            name: cleanDisplayName(a.display_name) || a.username,
            bio: htmlToText(a.note).slice(0, 140),
            avatar: a.avatar_static || a.avatar || null,
            profile_url: a.url,
            last_post_at: a.last_status_at || null
        };
    } else {
        const p = await fetchJson(`${BSKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(account.handle)}`);
        profile = {
            name: p.displayName || p.handle,
            bio: (p.description || '').slice(0, 140),
            avatar: p.avatar || null,
            profile_url: `https://bsky.app/profile/${p.handle}`,
            last_post_at: null
        };
    }
    profileCache.set(key, { at: Date.now(), profile });
    return profile;
}

// ---------------------------------------------------------------------------
// X archive
// ---------------------------------------------------------------------------

function getArchiveItems() {
    return X_ARCHIVE.map(t => ({
        id: t.id,
        platform: 'x',
        source: 'X archive',
        category: 'tips',
        archived: true,
        title: t.title,
        url: t.url,
        published_at: t.published_at,
        author: {
            handle: t.handle,
            name: t.name,
            avatar: null,
            profile_url: `https://x.com/${t.handle}`,
            platform: 'x'
        },
        likes: null,
        reposts: null,
        replies: null,
        tags: (t.tags || []).filter(tag => tag.startsWith('#'))
    }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function getTrackedAccounts() {
    return [
        ...DEFAULT_ACCOUNTS.map(a => ({ ...a, custom: false })),
        ...custom.accounts.map(a => ({ ...a, name: a.name || a.handle, custom: true }))
    ];
}

/** Tracked accounts enriched with live profile data (avatar, bio). Failures keep the basic entry. */
async function getTrackedAccountsWithProfiles() {
    const accounts = getTrackedAccounts();
    const results = await Promise.allSettled(accounts.map(fetchProfile));
    return accounts.map((account, i) => {
        const profile = results[i].status === 'fulfilled' ? results[i].value : {};
        return { ...account, ...profile, name: profile.name || account.name, reachable: results[i].status === 'fulfilled' };
    });
}

function getTrackedHashtags() {
    return [...new Set([...DEFAULT_HASHTAGS, ...custom.hashtags])];
}

function fetchAccount(account, limit) {
    return account.platform === 'mastodon'
        ? fetchMastodonAccount(account.handle, limit)
        : fetchBlueskyAccount(account.handle, limit);
}

function dedupeAndSort(items) {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
        if (!item || !item.url || seen.has(item.url)) continue;
        seen.add(item.url);
        unique.push(item);
    }
    return unique.sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0));
}

function matchesSearch(item, q) {
    return (item.title && item.title.toLowerCase().includes(q)) ||
        (item.author && item.author.handle && item.author.handle.toLowerCase().includes(q)) ||
        (item.author && item.author.name && item.author.name.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)));
}

/**
 * Fetch community posts.
 * @param {{ account?: string, hashtag?: string, search?: string, limit?: number, includeArchive?: boolean, liveOnly?: boolean }} options
 * @returns {Promise<{ items: Array, errors: Array<{ source: string, error: string }> }>}
 */
async function getCommunityFeed(options = {}) {
    const { account = null, hashtag = null, search = null, limit = 60, includeArchive = true, liveOnly = false } = options;
    const errors = [];
    const tasks = [];

    if (account) {
        const parsed = parseAccountInput(account);
        if (parsed.error) {
            const handle = String(account).replace(/^@/, '').toLowerCase();
            const archived = getArchiveItems().filter(t => t.author.handle.toLowerCase() === handle);
            return { items: archived.slice(0, limit), errors: archived.length ? [] : [{ source: account, error: parsed.error }] };
        }
        tasks.push({ label: parsed.handle, run: () => fetchAccount(parsed, 30) });
    } else if (hashtag) {
        const tag = normalizeTag(hashtag);
        if (!tag) return { items: [], errors: [{ source: hashtag, error: 'Hashtags may only contain letters, digits and _.' }] };
        tasks.push({ label: tag, run: () => fetchMastodonTag(tag, 40) });
    } else {
        for (const acc of getTrackedAccounts()) {
            tasks.push({ label: acc.handle, run: () => fetchAccount(acc, 20) });
        }
        for (const tag of DEFAULT_STREAM_TAGS) {
            tasks.push({ label: '#' + tag, run: () => fetchMastodonTag(tag, 10) });
        }
    }

    const settled = await Promise.allSettled(tasks.map(t => t.run()));
    let items = [];
    settled.forEach((result, i) => {
        if (result.status === 'fulfilled') items.push(...result.value);
        else errors.push({ source: tasks[i].label, error: result.reason && result.reason.message ? result.reason.message : String(result.reason) });
    });

    if (hashtag && includeArchive && !liveOnly) {
        const tag = normalizeTag(hashtag);
        items.push(...getArchiveItems().filter(t => t.tags.some(x => x.toLowerCase() === tag)));
    } else if (!account && !hashtag && includeArchive && !liveOnly) {
        items.push(...getArchiveItems());
    }

    items = dedupeAndSort(items);

    const q = String(search || '').trim().toLowerCase();
    if (q) items = items.filter(item => matchesSearch(item, q));

    if (errors.length) {
        console.warn(`[Community] ${errors.length} source(s) failed: ${errors.map(e => `${e.source} (${e.error})`).join(', ')}`);
    }

    return { items: items.slice(0, limit), errors };
}

/** Backwards-compatible: returns only the item array. */
async function getTweetsFeed(options = {}) {
    const { items } = await getCommunityFeed(options);
    return items;
}

/**
 * Add an account after checking it exists on its platform.
 * @returns {Promise<{ ok: boolean, account?: object, error?: string }>}
 */
async function addCustomAccount(input) {
    const parsed = parseAccountInput(input);
    if (parsed.error) return { ok: false, error: parsed.error };

    const exists = getTrackedAccounts().some(a => a.platform === parsed.platform && a.handle.toLowerCase() === parsed.handle.toLowerCase());
    if (exists) return { ok: true, account: parsed, alreadyTracked: true };

    try {
        const profile = await fetchProfile(parsed);
        const entry = { platform: parsed.platform, handle: parsed.handle, name: profile.name };
        custom.accounts.push(entry);
        saveCustomSources();
        return { ok: true, account: { ...entry, ...profile, custom: true } };
    } catch (err) {
        const notFound = err.status === 404 || err.status === 400;
        return { ok: false, error: notFound ? `Account ${parsed.handle} was not found.` : `Could not reach ${parsed.platform === 'mastodon' ? parsed.handle.split('@')[1] : 'Bluesky'}: ${err.message}` };
    }
}

function removeCustomAccount(handle) {
    const before = custom.accounts.length;
    custom.accounts = custom.accounts.filter(a => a.handle.toLowerCase() !== String(handle || '').toLowerCase());
    if (custom.accounts.length === before) return false;
    saveCustomSources();
    return true;
}

function addCustomHashtag(input) {
    const tag = normalizeTag(input);
    if (!tag) return { ok: false, error: 'Hashtags may only contain letters, digits and _.' };
    if (!getTrackedHashtags().includes(tag)) {
        custom.hashtags.push(tag);
        saveCustomSources();
    }
    return { ok: true, tag };
}

function removeCustomHashtag(input) {
    const tag = normalizeTag(input);
    const before = custom.hashtags.length;
    custom.hashtags = custom.hashtags.filter(t => t !== tag);
    if (custom.hashtags.length === before) return false;
    saveCustomSources();
    return true;
}

module.exports = {
    getTweetsFeed,
    getCommunityFeed,
    getArchiveItems,
    getTrackedAccounts,
    getTrackedAccountsWithProfiles,
    getTrackedHashtags,
    addCustomAccount,
    removeCustomAccount,
    addCustomHashtag,
    removeCustomHashtag,
    parseAccountInput,
    htmlToText
};
