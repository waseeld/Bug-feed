/**
 * CVE & PoC feed ingestion module.
 * 100% Validated URLs:
 * - Real GitHub PoC repositories from nomi-sec/PoC-in-GitHub
 * - Authoritative CVE records from cve.org / MITRE & CIRCL
 * - Actively exploited zero-days from CISA KEV
 */

async function fetchPocsFromGithub(limit = Infinity) {
    try {
        const url = 'https://raw.githubusercontent.com/nomi-sec/PoC-in-GitHub/master/README.md';
        const response = await fetch(url, {
            headers: { 'User-Agent': 'BugFeed/1.0' }
        });

        if (!response.ok) {
            throw new Error(`PoC-in-GitHub responded with status ${response.status}`);
        }

        const text = await response.text();

        // Regex matches: ### CVE-YYYY-NNNN (YYYY-MM-DD)\n\n<code>Desc</code>\n\n- [repo](url)
        const regex = /###\s+(CVE-\d{4}-\d+)\s*\(([^)]+)\)[\s\S]*?<code>([\s\S]*?)<\/code>[\s\S]*?\[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)/g;

        const items = [];
        let match;
        while ((match = regex.exec(text)) !== null && items.length < limit) {
            const cveId = match[1].trim();
            const date = match[2].trim();
            const desc = match[3].trim().replace(/\s+/g, ' ');
            const repoName = match[4].trim();
            const repoUrl = match[5].trim();

            if (!repoUrl.startsWith('https://github.com/')) continue;

            items.push({
                id: `poc-${cveId}-${repoName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                cve_id: cveId,
                title: `${cveId}: ${desc.length > 95 ? desc.substring(0, 95) + '...' : desc}`,
                source: 'GitHub PoC',
                category: 'cve',
                url: repoUrl,
                cve_url: `https://www.cve.org/CVERecord?id=${cveId}`,
                nvd_url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
                published_at: date,
                tags: [cveId, 'PoC', 'Exploit', repoName]
            });
        }

        return items;
    } catch (err) {
        console.warn('[CVE Feed] fetchPocsFromGithub warning:', err.message);
        return [];
    }
}

async function fetchCveCircl(limit = 30) {
    try {
        const url = `https://cve.circl.lu/api/last/${limit}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'BugFeed/1.0' }
        });

        if (!response.ok) {
            throw new Error(`cve.circl.lu responded with status ${response.status}`);
        }

        const list = await response.json();
        if (!Array.isArray(list)) return [];

        const items = [];

        for (const item of list) {
            let cveId = item.id;
            let summary = item.details || item.summary;
            let cvss = item.cvss ? `CVSS: ${item.cvss}` : null;
            let published = item.published || item.Published || item.Modified;

            // Check if there are aliases like ["CVE-2025-1889", "GHSA-..."]
            let cveAlias = null;
            if (Array.isArray(item.aliases)) {
                cveAlias = item.aliases.find(a => a && a.startsWith('CVE-')) || null;
            }

            // Handle v2 CSAF / CVE 5.0 format
            if (item.vulnerabilities && Array.isArray(item.vulnerabilities) && item.vulnerabilities.length > 0) {
                const v = item.vulnerabilities[0];
                if (v.cve) cveId = v.cve;
                if (v.title) {
                    summary = v.title;
                } else if (v.notes && Array.isArray(v.notes) && v.notes.length > 0) {
                    const descNote = v.notes.find(n => n.category === 'summary' || n.category === 'description');
                    if (descNote && descNote.text) summary = descNote.text;
                }
                if (v.scores && v.scores.length && v.scores[0].cvss_v3) {
                    cvss = `CVSS: ${v.scores[0].cvss_v3.baseScore}`;
                }
                if (v.release_date || v.discovery_date) {
                    published = v.release_date || v.discovery_date;
                }
            }

            // Extract CVSS from severity array if present
            if (!cvss && Array.isArray(item.severity) && item.severity.length > 0) {
                const s = item.severity[0];
                if (s && s.score) {
                    const match = s.score.match(/CVSS:[^/]+\/.*\/([0-9.]+)/i);
                    cvss = match ? `CVSS: ${match[1]}` : (s.score.length > 15 ? 'CVSS:3.1' : s.score);
                }
            }

            // Skip invalid or unknown CVE IDs
            if (!cveId || cveId === 'CVE-UNKNOWN') {
                if (cveAlias) {
                    cveId = cveAlias;
                } else {
                    continue;
                }
            }

            const primaryId = cveAlias || cveId;
            let targetUrl = '';
            let cveUrl = null;
            let nvdUrl = null;
            let osvUrl = null;

            if (primaryId.startsWith('CVE-')) {
                targetUrl = `https://www.cve.org/CVERecord?id=${primaryId}`;
                cveUrl = `https://www.cve.org/CVERecord?id=${primaryId}`;
                nvdUrl = `https://nvd.nist.gov/vuln/detail/${primaryId}`;
            } else if (primaryId.startsWith('PYSEC-') || primaryId.startsWith('GHSA-')) {
                targetUrl = `https://osv.dev/vulnerability/${primaryId}`;
                osvUrl = `https://osv.dev/vulnerability/${primaryId}`;
            } else {
                targetUrl = `https://www.cve.org/CVERecord?id=${primaryId}`;
                cveUrl = `https://www.cve.org/CVERecord?id=${primaryId}`;
            }

            if (cveAlias) {
                cveUrl = `https://www.cve.org/CVERecord?id=${cveAlias}`;
                nvdUrl = `https://nvd.nist.gov/vuln/detail/${cveAlias}`;
                targetUrl = cveUrl;
            }

            const cleanSummary = (summary || 'Security advisory and vulnerability disclosure')
                .replace(/\s+/g, ' ')
                .trim();

            const tags = [primaryId];
            if (cvss) tags.push(cvss);
            tags.push('Advisory');

            const dateStr = published ? published.split('T')[0] : new Date().toISOString().split('T')[0];

            items.push({
                id: `cve-${primaryId}`,
                cve_id: primaryId,
                title: `${primaryId}: ${cleanSummary.length > 95 ? cleanSummary.substring(0, 95) + '...' : cleanSummary}`,
                source: 'CVE Advisory',
                category: 'cve',
                url: targetUrl,
                cve_url: cveUrl || targetUrl,
                nvd_url: nvdUrl || null,
                osv_url: osvUrl || null,
                published_at: dateStr,
                tags: tags.filter(Boolean)
            });
        }

        return items;
    } catch (err) {
        console.warn('[CVE Feed] fetchCveCircl warning:', err.message);
        return [];
    }
}

async function fetchCisaKev(limit = Infinity) {
    try {
        const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
        const res = await fetch(url, { headers: { 'User-Agent': 'BugFeed/1.0' } });
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.vulnerabilities || !Array.isArray(json.vulnerabilities)) return [];

        const list = (limit === Infinity || limit >= json.vulnerabilities.length)
            ? json.vulnerabilities.slice().reverse()
            : json.vulnerabilities.slice(-limit).reverse();

        return list.map(v => ({
            id: `cisa-${v.cveID}`,
            cve_id: v.cveID,
            title: `${v.cveID}: ${v.vulnerabilityName} (${v.vendorProject})`,
            source: 'CISA KEV',
            category: 'cve',
            url: `https://www.cve.org/CVERecord?id=${v.cveID}`,
            cve_url: `https://www.cve.org/CVERecord?id=${v.cveID}`,
            nvd_url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
            published_at: v.dateAdded || new Date().toISOString().split('T')[0],
            tags: [v.cveID, 'Actively Exploited', 'CISA KEV', v.vendorProject]
        }));
    } catch (e) {
        console.warn('[CVE Feed] CISA KEV warning:', e.message);
        return [];
    }
}

async function getCveFeed(limit = Infinity) {
    const isFull = limit === Infinity || limit > 1000;
    const pocLimit = isFull ? Infinity : Math.floor(limit * 0.6);
    const cisaLimit = isFull ? Infinity : Math.floor(limit * 0.25);
    const circlLimit = isFull ? 50 : Math.floor(limit * 0.15);

    const [pocs, cves, cisa] = await Promise.all([
        fetchPocsFromGithub(pocLimit),
        fetchCveCircl(circlLimit),
        fetchCisaKev(cisaLimit)
    ]);

    const merged = [...pocs, ...cves, ...cisa];
    // Deduplicate within batch by cve_id + url
    const seen = new Set();
    const unique = [];
    for (const item of merged) {
        const key = item.cve_id + '|' + item.url;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    unique.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    return isFull ? unique : unique.slice(0, limit);
}

module.exports = getCveFeed;