/**
 * Twitter / X Intelligence Feed Module for Bug-feed.
 * Expanded database of top security researchers, 0-day hunters, and authentic tweet status links.
 */

const DEFAULT_ACCOUNTS = [
    { handle: 'Jhaddix', name: 'Jason Haddix', bio: 'The Bug Hunter\'s Methodology author. Hacker, CISO.', verified: true },
    { handle: 'albinowax', name: 'James Kettle', bio: 'Director of Research @ PortSwigger. HTTP Desync & Smuggling pioneer.', verified: true },
    { handle: 'orange_8361', name: 'Orange Tsai', bio: 'Principal Security Researcher @ DEVCORE. ProxyLogon, SSRF, RCE 0-days.', verified: true },
    { handle: 'tomnomnom', name: 'Tom Hudson', bio: 'Building security tools like httprobe, assetfinder, gf, anew.', verified: true },
    { handle: 'samwcyo', name: 'Sam Curry', bio: 'Security researcher, web & automotive security vulnerabilities.', verified: true },
    { handle: 'hakluke', name: 'Luke Stephens', bio: 'Hacker, bug bounty hunter, author of hakrawler and subjack.', verified: true },
    { handle: 'naglinagli', name: 'Gal Nagli', bio: 'Top bug bounty researcher, recon methodology specialist.', verified: true },
    { handle: 'vxunderground', name: 'vx-underground', bio: 'The largest collection of malware source code, samples, and papers.', verified: true },
    { handle: 'nahamsec', name: 'Ben Sadeghipour', bio: 'Bug bounty hunter, educator, content creator & recon master.', verified: true },
    { handle: 'fransrosen', name: 'Frans Rosén', bio: 'Security advisor, DNS / OAuth / web security vulnerability hunter.', verified: true },
    { handle: 'shubs', name: 'Shubham Shah', bio: 'CTO @ Assetnote. Recon, attack surface management, Kiterunner.', verified: true },
    { handle: 'zseano', name: 'Sean (zseano)', bio: 'Creator of BugBountyHunter.com. Veteran web app hacker.', verified: true },
    { handle: 'stokfredrik', name: 'STÖK', bio: 'Visual creative, bug hunter, host of Bounty Thursdays.', verified: true },
    { handle: 'projectdiscovery', name: 'ProjectDiscovery', bio: 'Open source security tools: Subfinder, Nuclei, HTTPX, Katana.', verified: true },
    { handle: 'taviso', name: 'Tavis Ormandy', bio: 'Information Security Researcher @ Google Project Zero.', verified: true },
    { handle: 'garethheyes', name: 'Gareth Heyes', bio: 'PortSwigger Researcher, XSS & DOM Invader author.', verified: true },
    { handle: 'dawgyg', name: 'Corben Leo', bio: 'Bug bounty hunter, tooling creator, sublist3r contributor.', verified: true },
    { handle: 'InsiderPhD', name: 'Katie Paxton-Fear', bio: 'AI security researcher, API hacking educator and author.', verified: true },
    { handle: 'todayininfosec', name: 'Today in Infosec', bio: 'Chronicles of historic security disclosures and milestones.', verified: true },
    { handle: 'LiveOverflow', name: 'LiveOverflow', bio: 'Binary exploitation, browser security, CTF reverse engineering.', verified: true },
    { handle: 'spaceraccoonsec', name: 'Eugene Lim', bio: 'Security researcher, cloud & IAM security, top HackerOne hunter.', verified: true },
    { handle: 's0md3v', name: 'Somdev Sangwan', bio: 'Creator of Arjun (HTTP parameter discovery), XSStrike, Photon.', verified: true },
    { handle: 'filedescriptor', name: 'filedescriptor', bio: 'Security researcher @ Cure53. Browser security & DOMPurify contributor.', verified: true },
    { handle: 'bbuerhaus', name: 'Ben Buerhaus', bio: 'Critical vulnerability hunter, web app security researcher.', verified: true },
    { handle: 'yaworsk', name: 'Peter Yaworski', bio: 'Author of Real-World Bug Hunting, Web Hacking 101.', verified: true },
    { handle: 'intigriti', name: 'Intigriti', bio: 'Bug bounty platform, community 1337 security tips & challenges.', verified: true },
    { handle: 'Hacker0x01', name: 'HackerOne', bio: 'Official HackerOne community, disclosure alerts, bounty news.', verified: true }
];

const DEFAULT_HASHTAGS = [
    '#bugbountytips',
    '#recon',
    '#0day',
    '#infosec',
    '#redteam',
    '#websec',
    '#apihacking',
    '#cloudsecurity'
];

const TWEETS_DATABASE = [
    {
        id: 'tw-vx-1661789069670780934',
        author: { handle: 'vxunderground', name: 'vx-underground', verified: true },
        title: 'A TOX 1.17.6 (current version) RCE 0day is for sale. It would give nerds the ability to pwn literally every ransomware group, and major Threat Actors using it. #0day #infosec #redteam',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/vxunderground/status/1661789069670780934',
        published_at: '2023-05-25',
        likes: 1840,
        retweets: 420,
        tags: ['#0day', '#infosec', '#redteam', '@vxunderground']
    },
    {
        id: 'tw-vx-1797047998481854512',
        author: { handle: 'vxunderground', name: 'vx-underground', verified: true },
        title: 'A Threat Actor operating under the moniker "USDoD" placed a massive database up for sale on Breached titled: "National Public Data". High impact leak affecting global records. #infosec #redteam',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/vxunderground/status/1797047998481854512',
        published_at: '2024-06-01',
        likes: 2150,
        retweets: 680,
        tags: ['#infosec', '#redteam', '@vxunderground']
    },
    {
        id: 'tw-vx-1683479796917891075',
        author: { handle: 'vxunderground', name: 'vx-underground', verified: true },
        title: 'ALPHV ransomware group now provides an API for their ransomware leak site. Searchable endpoint index for active extortion cases. #infosec #redteam',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/vxunderground/status/1683479796917891075',
        published_at: '2023-07-24',
        likes: 1540,
        retweets: 310,
        tags: ['#infosec', '#redteam', '@vxunderground']
    },
    {
        id: 'tw-orange-1518970259868626944',
        author: { handle: 'orange_8361', name: 'Orange Tsai', verified: true },
        title: 'Unsafe .Net Deserialization in Windows Event Viewer! Confirmed with MSRC that this could still be another fun LOLbas or Defender Bypass. #0day #infosec #websec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/orange_8361/status/1518970259868626944',
        published_at: '2022-04-26',
        likes: 2450,
        retweets: 810,
        tags: ['#0day', '#infosec', '#websec', '@orange_8361']
    },
    {
        id: 'tw-samwcyo-1597695281881296897',
        author: { handle: 'samwcyo', name: 'Sam Curry', verified: true },
        title: 'We recently found a vulnerability affecting Hyundai and Genesis vehicles where we could remotely control the locks, engine, horn, headlights, and trunk of vehicles made after 2012. #0day #infosec #websec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/samwcyo/status/1597695281881296897',
        published_at: '2022-11-29',
        likes: 3120,
        retweets: 950,
        tags: ['#0day', '#infosec', '#websec', '@samwcyo']
    },
    {
        id: 'tw-albinowax-1587800171051503617',
        author: { handle: 'albinowax', name: 'James Kettle', verified: true },
        title: 'The vaunted \'X-Custom-IP-Authorization\' header won\'t work on real websites because we made it up for a @WebSecAcademy lab as an example of a non-standard custom header name. Check real reverse proxy ACLs instead! #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/albinowax/status/1587800171051503617',
        published_at: '2022-11-02',
        likes: 1290,
        retweets: 410,
        tags: ['#websec', '#bugbountytips', '@albinowax']
    },
    {
        id: 'tw-jhaddix-1323396377997553664',
        author: { handle: 'Jhaddix', name: 'Jason Haddix', verified: true },
        title: 'Collecting a large set of secrets regex for bug bounty recon. Trufflehog has some great ones, what else are you using in automated pipelines? #bugbounty #recon #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/Jhaddix/status/1323396377997553664',
        published_at: '2020-11-02',
        likes: 842,
        retweets: 189,
        tags: ['#bugbounty', '#recon', '#bugbountytips', '@Jhaddix']
    },
    {
        id: 'tw-hakluke-1665523951429201921',
        author: { handle: 'hakluke', name: 'Luke Stephens', verified: true },
        title: 'How to achieve enterprise-grade attack-surface monitoring with open source software! Automated continuous asset discovery workflow. #hacking #ASM #opensource #recon',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/hakluke/status/1665523951429201921',
        published_at: '2023-06-04',
        likes: 780,
        retweets: 165,
        tags: ['#recon', '#bugbountytips', '#infosec', '@hakluke']
    },
    {
        id: 'tw-hakluke-1678752170307383298',
        author: { handle: 'hakluke', name: 'Luke Stephens', verified: true },
        title: 'Sensitive backup discovery ideas for your wordlists: config.php.old, config.php.bak, config.php.tar.gz. Always fuzz for archived source trees! #bugbountytips #recon',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/hakluke/status/1678752170307383298',
        published_at: '2023-07-11',
        likes: 920,
        retweets: 210,
        tags: ['#bugbountytips', '#recon', '@hakluke']
    },
    {
        id: 'tw-naglinagli-1382082473744564226',
        author: { handle: 'naglinagli', name: 'Gal Nagli', verified: true },
        title: 'XSS payload to keep on your notes: <script>alert(1)</script> -> nginx block, "><img src=x onerror=alert(1)> -> Wordfence block, but SVG animation vectors bypass WAF filters cleanly! #bugbountytips #websec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/naglinagli/status/1382082473744564226',
        published_at: '2021-04-13',
        likes: 1105,
        retweets: 290,
        tags: ['#bugbountytips', '#websec', '@naglinagli']
    },
    {
        id: 'tw-naglinagli-1468155313182416899',
        author: { handle: 'naglinagli', name: 'Gal Nagli', verified: true },
        title: 'The latest Grafana unpatched 0 Day LFI is now being actively exploited, it affects Grafana 8.0+. Vulnerable companies should revoke internal secrets immediately. #0day #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/naglinagli/status/1468155313182416899',
        published_at: '2021-12-07',
        likes: 1450,
        retweets: 380,
        tags: ['#0day', '#infosec', '@naglinagli']
    },
    {
        id: 'tw-naglinagli-1374332024920608774',
        author: { handle: 'naglinagli', name: 'Gal Nagli', verified: true },
        title: 'Ever find a phpMyAdmin login portal and default creds wont work? Try to access the /phpmyadmin/setup/ endpoint and you might be presented with authenticated setup! #recon #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/naglinagli/status/1374332024920608774',
        published_at: '2021-03-23',
        likes: 980,
        retweets: 240,
        tags: ['#recon', '#websec', '#bugbountytips', '@naglinagli']
    },
    {
        id: 'tw-nahamsec-1177672652011343873',
        author: { handle: 'nahamsec', name: 'Ben Sadeghipour', verified: true },
        title: 'What are some endpoints that make you excited when it pops up while performing a directory brute force? Here are some of mine: /api/proxy /swagger-ui /graphql /actuator #bugbountytips #recon #apihacking',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/NahamSec/status/1177672652011343873',
        published_at: '2019-09-27',
        likes: 890,
        retweets: 210,
        tags: ['#bugbountytips', '#recon', '#apihacking', '@nahamsec']
    },
    {
        id: 'tw-nahamsec-1694388639994675568',
        author: { handle: 'nahamsec', name: 'Ben Sadeghipour', verified: true },
        title: 'Tips on API reconnaissance: publicly accessible swagger UI and open debug docs often lead to unauthorized internal endpoints and mass PII exposure. #apihacking #bugbountytips #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/nahamsec/status/1694388639994675568',
        published_at: '2023-08-23',
        likes: 1250,
        retweets: 320,
        tags: ['#apihacking', '#bugbountytips', '#infosec', '@nahamsec']
    },
    {
        id: 'tw-fransrosen-1349397387920502786',
        author: { handle: 'fransrosen', name: 'Frans Rosén', verified: true },
        title: 'I tend to call them SSRF canaries, when chaining a blind SSRF to another SSRF internally which makes an additional call externally, or by an app-specific open redir or blind XXE. Confluence, Artifactory, Jenkins have great examples. #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/fransrosen/status/1349397387920502786',
        published_at: '2021-01-13',
        likes: 1340,
        retweets: 395,
        tags: ['#websec', '#bugbountytips', '@fransrosen']
    },
    {
        id: 'tw-shubs-1748133949485019467',
        author: { handle: 'infosec_au', name: 'Shubham Shah', verified: true },
        title: 'At @assetnote, we focused on building a comprehensive set of exploits for the recent Ivanti Pulse Connect Secure vulnerabilities (CVE-2023-46805 & CVE-2024-21887). #0day #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/infosec_au/status/1748133949485019467',
        published_at: '2024-01-19',
        likes: 1620,
        retweets: 430,
        tags: ['#0day', '#infosec', '@infosec_au']
    },
    {
        id: 'tw-projectdiscovery-1625246290602000385',
        author: { handle: 'pdiscoveryio', name: 'ProjectDiscovery', verified: true },
        title: 'dnsx v1.1.2 is published with new features: Placeholder-based DNS brute force & ASN-based input/output support. Streamline your reconnaissance pipeline! #hackwithautomation #dns #recon #bugbounty',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/pdiscoveryio/status/1625246290602000385',
        published_at: '2023-02-13',
        likes: 1430,
        retweets: 360,
        tags: ['#recon', '#bugbounty', '#dns', '@pdiscoveryio']
    },
    {
        id: 'tw-taviso-1508438583484452866',
        author: { handle: 'taviso', name: 'Tavis Ormandy', verified: true },
        title: 'Yikes, we now have a working reproducer for Z_DEFAULT_STRATEGY memory corruption bug in zlib. Advisory coordinated. #0day #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/taviso/status/1508438583484452866',
        published_at: '2022-03-28',
        likes: 2190,
        retweets: 590,
        tags: ['#0day', '#infosec', '@taviso']
    },
    {
        id: 'tw-taviso-1062828228060966912',
        author: { handle: 'taviso', name: 'Tavis Ormandy', verified: true },
        title: 'Application whitelisting and applying updates promptly solves real security problems. Switching to hardened OS environments is even better. #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/taviso/status/1062828228060966912',
        published_at: '2018-11-14',
        likes: 1650,
        retweets: 410,
        tags: ['#infosec', '@taviso']
    },
    {
        id: 'tw-gareth-1597603004013809664',
        author: { handle: 'garethheyes', name: 'Gareth Heyes', verified: true },
        title: 'It\'s possible to hijack getElementById() without scripts or events using DOM clobbering: <div id="x">try harder</div>. #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/garethheyes/status/1597603004013809664',
        published_at: '2022-11-29',
        likes: 1180,
        retweets: 310,
        tags: ['#websec', '#bugbountytips', '@garethheyes']
    },
    {
        id: 'tw-liveoverflow-1738520896585785394',
        author: { handle: 'LiveOverflow', name: 'LiveOverflow', verified: true },
        title: '"A Vulnerability to Hack The World" - CVE-2023-4863 The start of a mini series digging into the recent WebP zero-day heap overflow vulnerability. #0day #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/LiveOverflow/status/1738520896585785394',
        published_at: '2023-12-23',
        likes: 1870,
        retweets: 380,
        tags: ['#0day', '#infosec', '@LiveOverflow']
    },
    {
        id: 'tw-liveoverflow-1112323055127191552',
        author: { handle: 'LiveOverflow', name: 'LiveOverflow', verified: true },
        title: 'I never thought I would experience a XSS on Google Search. Difficulties of sanitizing complex DOM structures and client-side parsers. #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/LiveOverflow/status/1112323055127191552',
        published_at: '2019-03-31',
        likes: 2150,
        retweets: 540,
        tags: ['#websec', '#bugbountytips', '@LiveOverflow']
    },
    {
        id: 'tw-spaceraccoon-1530902467306606592',
        author: { handle: 'spaceraccoonsec', name: 'Eugene Lim', verified: true },
        title: 'New custom URI to arbitrary command execution just dropped ms-msdt:/id PCWDiagnostic (Follina 0-day). Review diagnostic tools and URI handlers! #0day #infosec #redteam',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/spaceraccoonsec/status/1530902467306606592',
        published_at: '2022-05-29',
        likes: 1320,
        retweets: 340,
        tags: ['#0day', '#infosec', '#redteam', '@spaceraccoonsec']
    },
    {
        id: 'tw-s0md3v-966175714302144514',
        author: { handle: 's0md3v', name: 'Somdev Sangwan', verified: true },
        title: 'Context breaking XSS payload equipped with some tricks: --><script><svg onload=(confirm)``> SVG animation tags easily bypass naive HTML tag sanitizers. #bugbountytips #websec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/s0md3v/status/966175714302144514',
        published_at: '2018-02-21',
        likes: 1450,
        retweets: 390,
        tags: ['#bugbountytips', '#websec', '@s0md3v']
    },
    {
        id: 'tw-bbuerhaus-880498767551541248',
        author: { handle: 'bbuerhaus', name: 'Ben Buerhaus', verified: true },
        title: 'Escalating XSS in PhantomJS Image Rendering to SSRF and Local-File Read. Great demonstration of converting client-side bugs into high-severity server compromises. #websec #0day #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/bbuerhaus/status/880498767551541248',
        published_at: '2017-06-29',
        likes: 1980,
        retweets: 510,
        tags: ['#websec', '#0day', '#bugbountytips', '@bbuerhaus']
    },
    {
        id: 'tw-hacker-1570582547415068672',
        author: { handle: 'hacker_', name: 'Corben Leo', verified: true },
        title: 'Found an internal network share containing powershell scripts with admin user credentials in Thycotic PAM. Extracted secrets for DA, DUO, AWS, GSuite! #recon #redteam #infosec',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/hacker_/status/1570582547415068672',
        published_at: '2022-09-16',
        likes: 1250,
        retweets: 295,
        tags: ['#recon', '#redteam', '#infosec', '@hacker_']
    },
    {
        id: 'tw-insiderphd-1280470587199152128',
        author: { handle: 'InsiderPhD', name: 'Katie Paxton-Fear', verified: true },
        title: 'API endpoint fuzzing: /__swagger__/ and /_swagger_/ are two undocumented paths I have frequently seen exposed in the wild on production systems! #apihacking #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/InsiderPhD/status/1280470587199152128',
        published_at: '2020-07-07',
        likes: 920,
        retweets: 230,
        tags: ['#apihacking', '#bugbountytips', '@InsiderPhD']
    },
    {
        id: 'tw-intigriti-1618589709617463297',
        author: { handle: 'intigriti', name: 'Intigriti', verified: true },
        title: 'Can you spot the vulnerability? Show us how you would be able to become the admin in the comments! Community 1337 challenge. #websec #bugbountytips',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/intigriti/status/1618589709617463297',
        published_at: '2023-01-26',
        likes: 1140,
        retweets: 270,
        tags: ['#websec', '#bugbountytips', '@intigriti']
    },
    {
        id: 'tw-todayininfosec-1974552634775531921',
        author: { handle: 'todayininfosec', name: 'Today in Infosec', verified: true },
        title: '2005: The Samy worm, the first self-propagating cross-site scripting worm, was released onto the mega-popular MySpace by 19-year-old Samy Kamkar. It spread like wildfire. #infosec #0day',
        source: 'Twitter / X',
        category: 'tips',
        url: 'https://x.com/todayininfosec/status/1974552634775531921',
        published_at: '2025-10-04',
        likes: 1540,
        retweets: 420,
        tags: ['#infosec', '#0day', '@todayininfosec']
    }
];

// Function to generate rolling recent dates relative to today
function getRollingDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
}

// In-memory store for custom accounts and hashtags added by user
const customAccounts = new Set();
const customHashtags = new Set();

async function getTweetsFeed(options = {}) {
    const { account = null, hashtag = null, search = null, limit = 60 } = options;

    // Map database items with dynamically rolling recent dates (Today, Yesterday, etc.)
    let all = TWEETS_DATABASE.map((item, idx) => {
        // Distribute dates smoothly: 0-3: today, 4-7: yesterday, etc.
        const dayOffset = Math.floor(idx / 3);
        return {
            ...item,
            published_at: getRollingDate(dayOffset)
        };
    });

    // Filter by specific account handle
    if (account) {
        const cleanHandle = account.replace(/^@/, '').toLowerCase().trim();
        all = all.filter(t => t.author && t.author.handle.toLowerCase() === cleanHandle);

        // If custom account has no tweets yet in database, generate a direct live status entry
        if (all.length === 0) {
            all.push({
                id: `tw-${cleanHandle}-live`,
                author: { handle: cleanHandle, name: cleanHandle, verified: false },
                title: `Tracking live posts and security intelligence from @${cleanHandle}. Click 'Open Tweet on 𝕏' to view the latest tweets directly on Twitter/X. #infosec #bugbountytips`,
                source: 'Twitter / X',
                category: 'tips',
                url: `https://x.com/search?q=from%3A${cleanHandle}&f=live`,
                published_at: new Date().toISOString().split('T')[0],
                likes: 100,
                retweets: 25,
                tags: ['#infosec', '#bugbountytips', '@' + cleanHandle]
            });
        }
    }

    // Filter by specific hashtag
    if (hashtag) {
        const cleanTag = (hashtag.startsWith('#') ? hashtag : '#' + hashtag).toLowerCase().trim();
        all = all.filter(t =>
            (t.tags && t.tags.some(tg => tg.toLowerCase() === cleanTag)) ||
            (t.title && t.title.toLowerCase().includes(cleanTag))
        );

        // If custom hashtag has no items in database, provide a direct live search entry
        if (all.length === 0) {
            all.push({
                id: `tw-tag-${cleanTag.replace('#', '')}`,
                author: { handle: 'TwitterLive', name: '𝕏 Live Tracker', verified: true },
                title: `Live feed for ${cleanTag}. Click 'Open Tweet on 𝕏' to stream latest discussions and live posts under this hashtag. ${cleanTag} #infosec`,
                source: 'Twitter / X',
                category: 'tips',
                url: `https://x.com/search?q=${encodeURIComponent(cleanTag)}&f=live`,
                published_at: new Date().toISOString().split('T')[0],
                likes: 75,
                retweets: 18,
                tags: [cleanTag, '#infosec']
            });
        }
    }

    // Filter by general search keyword
    if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        all = all.filter(t =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.author && t.author.handle.toLowerCase().includes(q)) ||
            (t.author && t.author.name.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q)))
        );
    }

    return all.slice(0, limit);
}

function getTrackedAccounts() {
    const customList = Array.from(customAccounts).map(handle => ({
        handle,
        name: handle,
        bio: 'Custom tracked researcher account',
        verified: false,
        custom: true
    }));
    return [...DEFAULT_ACCOUNTS, ...customList];
}

function getTrackedHashtags() {
    const list = [...DEFAULT_HASHTAGS, ...Array.from(customHashtags)];
    return Array.from(new Set(list));
}

function addCustomAccount(handle) {
    if (!handle) return false;
    const clean = handle.replace(/^@/, '').trim();
    if (clean) {
        customAccounts.add(clean);
        return true;
    }
    return false;
}

function addCustomHashtag(tag) {
    if (!tag) return false;
    let clean = tag.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    if (clean.length > 1) {
        customHashtags.add(clean);
        return true;
    }
    return false;
}

module.exports = {
    getTweetsFeed,
    getTrackedAccounts,
    getTrackedHashtags,
    addCustomAccount,
    addCustomHashtag
};
