/**
 * HackerOne feed ingestion.
 * Fetches disclosed bug reports from reddelexc/hackerone-reports data repository
 * with fallback to HackerOne's GraphQL hacktivity endpoint.
 */

function parseCsvLine(text) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

async function fetchFromGithubReports(limit = 100) {
    const url = 'https://raw.githubusercontent.com/reddelexc/hackerone-reports/master/data.csv';
    const response = await fetch(url, {
        headers: { 'User-Agent': 'BugFeed/1.0' }
    });
    if (!response.ok) {
        throw new Error(`GitHub responded with status ${response.status}`);
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    // Header: program,title,link,upvotes,bounty,vuln_type
    // Skip header line
    const dataLines = lines.slice(1, limit + 1);
    const items = [];

    for (let i = 0; i < dataLines.length; i++) {
        const row = parseCsvLine(dataLines[i]);
        if (row.length < 3) continue;

        const program = row[0] || 'Unknown';
        const title = row[1] || 'Disclosed Vulnerability';
        let rawLink = row[2] || '';
        const upvotes = row[3] || '0';
        const bounty = row[4] ? parseFloat(row[4]) : 0;
        const vulnType = row[5] || '';

        if (!rawLink.startsWith('http')) {
            rawLink = 'https://' + rawLink;
        }

        const idMatch = rawLink.match(/reports\/(\d+)/);
        const reportId = idMatch ? `h1-${idMatch[1]}` : `h1-row-${i}`;

        const tags = [program];
        if (vulnType) tags.push(vulnType);
        if (bounty > 0) tags.push(`$${bounty.toLocaleString()}`);
        if (parseInt(upvotes, 10) > 10) tags.push(`🔥 ${upvotes} upvotes`);

        items.push({
            id: reportId,
            title: title.replace(/^"|"$/g, ''),
            source: 'HackerOne',
            category: 'vulnerabilities',
            url: rawLink,
            published_at: new Date(Date.now() - i * 3600 * 1000).toISOString().split('T')[0],
            tags: tags.filter(Boolean)
        });
    }

    return items;
}

async function fetchFromGraphQL(limit = 25) {
    const query = {
        operationName: "HacktivityPageQuery",
        variables: {
            querystring: "",
            where: { report: { disclosed_at: { _is_null: false } } },
            orderBy: { field: "popular", direction: "DESC" },
            count: limit
        },
        query: `query HacktivityPageQuery($querystring: String, $orderBy: HacktivityItemOrderInput, $where: FiltersHacktivityItemFilterInput, $count: Int) {
          hacktivity_items(first: $count, query: $querystring, order_by: $orderBy, where: $where) {
            edges {
              node {
                ... on HacktivityItemInterface {
                  id
                  databaseId: _id
                }
                ... on Disclosed {
                  report {
                    id
                    title
                    url
                  }
                  team {
                    name
                  }
                  total_awarded_amount
                  severity_rating
                  latest_disclosable_activity_at
                }
              }
            }
          }
        }`
    };

    const res = await fetch("https://hackerone.com/graphql", {
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(query)
    });

    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json();
    const edges = json?.data?.hacktivity_items?.edges || [];

    return edges.map((e, idx) => {
        const node = e.node || {};
        const rep = node.report || {};
        const team = node.team || {};
        const tags = [team.name].filter(Boolean);
        if (node.severity_rating) tags.push(node.severity_rating.toUpperCase());
        if (node.total_awarded_amount) tags.push(`$${node.total_awarded_amount}`);

        return {
            id: `h1-${node.databaseId || idx}`,
            title: rep.title || 'HackerOne Disclosed Report',
            source: 'HackerOne',
            category: 'vulnerabilities',
            url: rep.url || `https://hackerone.com/reports/${node.databaseId}`,
            published_at: node.latest_disclosable_activity_at ? node.latest_disclosable_activity_at.split('T')[0] : new Date().toISOString().split('T')[0],
            tags
        };
    });
}

async function getHackerOneFeed(limit = 60) {
    try {
        const items = await fetchFromGithubReports(limit);
        if (items.length > 0) return items;
    } catch (err) {
        console.warn('[HackerOne Feed] GitHub CSV fetch failed, falling back to GraphQL:', err.message);
    }

    try {
        return await fetchFromGraphQL(Math.min(limit, 30));
    } catch (err) {
        console.error('[HackerOne Feed] Both sources failed:', err.message);
        return [];
    }
}

module.exports = getHackerOneFeed;
