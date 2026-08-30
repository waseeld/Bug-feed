/**
 * Security News RSS feed parser.
 * Ingests and normalizes articles from Infosec feeds like The Hacker News and BleepingComputer.
 */

function cleanXmlText(str) {
    if (!str) return '';
    return str
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function parseRssXml(xmlText, sourceName) {
    const items = [];
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];

        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i) || itemContent.match(/<link\s+href=["']([^"']+)["']/i);
        const dateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || itemContent.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
        const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);

        const rawTitle = titleMatch ? titleMatch[1] : 'Security Update';
        const title = cleanXmlText(rawTitle);

        let rawLink = linkMatch ? linkMatch[1] : '';
        rawLink = cleanXmlText(rawLink);

        const rawDate = dateMatch ? dateMatch[1].trim() : '';
        let dateStr = new Date().toISOString().split('T')[0];
        if (rawDate) {
            const parsedDate = new Date(rawDate);
            if (!isNaN(parsedDate.getTime())) {
                dateStr = parsedDate.toISOString().split('T')[0];
            }
        }

        // Extract categories / tags
        const tags = [sourceName];
        const catRegex = /<category>([\s\S]*?)<\/category>/gi;
        let catMatch;
        while ((catMatch = catRegex.exec(itemContent)) !== null && tags.length < 4) {
            const cat = cleanXmlText(catMatch[1]);
            if (cat && !tags.includes(cat)) tags.push(cat);
        }

        // Generate id from link
        let hash = 0;
        for (let i = 0; i < rawLink.length; i++) {
            hash = (hash << 5) - hash + rawLink.charCodeAt(i);
            hash |= 0;
        }
        const id = `news-${Math.abs(hash).toString(36)}`;

        items.push({
            id,
            title,
            source: sourceName,
            category: 'news',
            url: rawLink,
            published_at: dateStr,
            tags
        });
    }

    return items;
}

async function fetchRssFeed(url, sourceName) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BugFeed/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
    }

    const xml = await response.text();
    return parseRssXml(xml, sourceName);
}

async function getNewsFeed(limit = 40) {
    const feeds = [
        { url: 'https://feeds.feedburner.com/TheHackersNews', name: 'The Hacker News' },
        { url: 'https://www.bleepingcomputer.com/feed/', name: 'BleepingComputer' }
    ];

    const results = [];

    for (const f of feeds) {
        try {
            const items = await fetchRssFeed(f.url, f.name);
            results.push(...items);
        } catch (err) {
            console.warn(`[News Feed] Failed fetching ${f.name}:`, err.message);
        }
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return results.slice(0, limit);
}

module.exports = getNewsFeed;
