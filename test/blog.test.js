/**
 * Blog loader tests.
 * Confirms every brief file is published with its filename timestamp,
 * lead title, CVE identifiers, and source links intact.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, assert } = require('./runner');
const blog = require('../backend/blog');

const EXPECTED = [
    ['2026-11-07-0600', 'SonicWall SSL-VPN', 'CVE-2026-19868'],
    ['2026-11-13-0600', 'Operation Endgame', null],
    ['2026-11-13-1400', 'Microsoft 365', null],
    ['2026-11-13-2200', 'Check Point', null],
    ['2026-11-14-0600', 'Expedia', null],
    ['2026-11-14-1400', 'Outlook', null],
    ['2026-11-14-2200', 'Chrome', null],
    ['2026-11-15-0600', '46.3 مليون', null],
    ['2026-11-15-1400', 'OpenSSH', 'CVE-2026-123158'],
    ['2026-11-15-2200', 'FreeSWITCH', 'CVE-2026-116779'],
    ['2026-11-16-0600', 'Exchange', 'CVE-2026-62911'],
    ['2026-11-16-1400', 'React Server Components', 'CVE-2026-126187'],
    ['2026-11-16-2200', 'exploit', null],
    ['2026-11-17-0600', 'Confluence', null],
    ['2026-11-17-1400', 'Infoblox', null],
    ['2026-11-17-2200', 'Apache Roller', 'CVE-2026-129448'],
    ['2026-11-18-0600', 'Java4Shell', 'CVE-2026-114938'],
    ['2026-11-18-1400', 'Puppet Server', 'CVE-2026-115731'],
    ['2026-11-18-2200', 'nginx2root', null],
    ['2026-11-19-0600', 'REDCap', null],
    ['2026-11-19-1400', 'Citrix NetScaler', 'CVE-2026-120868'],
    ['2026-11-19-2200', 'Ruby', 'CVE-2026-132825']
];

async function runBlogTests() {
    await describe('Cyber Brief Blog', async () => {
        await it('should publish every dated brief (at least the 22 known ones), newest first', () => {
            const posts = blog.listPosts();
            const files = fs.readdirSync(blog.POSTS_DIR).filter((name) => /^\d{4}-\d{2}-\d{2}-\d{4}\.md$/.test(name));
            assert.strictEqual(posts.length, files.length, `expected ${files.length} posts, got ${posts.length}`);
            assert.ok(posts.length >= EXPECTED.length);
            const slugs = posts.map((post) => post.slug);
            EXPECTED.forEach(([slug]) => {
                assert.ok(slugs.includes(slug), `missing ${slug}`);
            });
            for (let i = 1; i < posts.length; i++) {
                assert.ok(
                    posts[i - 1].published_at >= posts[i].published_at,
                    'posts must be sorted newest first'
                );
            }
        });

        await it('should take the title from the lead item and the time from the filename', () => {
            EXPECTED.forEach(([slug, titlePart, cve]) => {
                const post = blog.getPost(slug);
                assert.ok(post, `missing post ${slug}`);
                assert.ok(post.title.includes(titlePart), `${slug} title: ${post.title}`);
                const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/);
                assert.strictEqual(post.date, match[1]);
                assert.strictEqual(post.time, `${match[2]}:${match[3]}`);
                assert.strictEqual(post.timezone, 'Asia/Riyadh');
                assert.strictEqual(post.published_at, `${post.date}T${post.time}:00+03:00`);
                assert.strictEqual(post.lang, 'ar');
                if (cve) {
                    assert.ok(post.title.includes(cve) || post.cves.includes(cve), `${slug} lost ${cve}`);
                    assert.ok(post.html.includes(cve), `${slug} html lost ${cve}`);
                    assert.ok(
                        post.html.includes(`https://nvd.nist.gov/vuln/detail/${cve}`),
                        `${slug} should link ${cve} without changing its id`
                    );
                }
            });
        });

        await it('should keep source links, code, and the author asterisk in the Citrix and OpenSSH briefs', () => {
            const citrix = blog.getPost('2026-11-19-1400');
            assert.ok(citrix.html.includes('https://x.com/naif_aiydh/status/2123301576370495809'));
            assert.ok(citrix.html.includes('Smith &amp; Green') || citrix.text.includes('Smith & Green'));
            assert.ok(citrix.text.includes('CyprWana'));

            const openssh = blog.getPost('2026-11-15-1400');
            assert.ok(openssh.html.includes('«*»'), 'the musl asterisk in the OpenSSH note must stay');
            assert.ok(openssh.html.includes('https://x.com/packetninjas/status/2121206440623026601'));

            const nginx = blog.getPost('2026-11-18-2200');
            assert.ok(nginx.html.includes('<code>*{7*7}</code>'));
        });

        await it('should escape raw HTML and reject path traversal', () => {
            const html = blog.renderMarkdown('<script>alert(1)</script>\n**bold**\n[ok](https://example.com/a)');
            assert.ok(html.includes('&lt;script&gt;'));
            assert.ok(!html.includes('<script>'));
            assert.ok(html.includes('<strong>bold</strong>'));
            assert.ok(html.includes('href="https://example.com/a"'));
            assert.strictEqual(blog.getPost('../package'), null);
            assert.strictEqual(blog.getPost('..%2Fpackage'), null);
            assert.strictEqual(blog.getPost('no-such-brief'), null);
        });

        await it('should ignore files that are not a dated brief', () => {
            const names = fs.readdirSync(blog.POSTS_DIR);
            names.forEach((name) => {
                assert.ok(/^\d{4}-\d{2}-\d{2}-\d{4}\.md$/.test(name), `unexpected file in posts/: ${name}`);
            });
        });

        await it('should read front matter the same with Windows (CRLF) line endings', () => {
            const sample = fs.readFileSync(path.join(blog.POSTS_DIR, '2026-11-19-1400.md'), 'utf8');
            const lf = sample.replace(/\r\n/g, '\n');
            const crlf = lf.replace(/\n/g, '\r\n');
            const meta = blog.parseFrontmatter(lf).meta;
            assert.ok(Object.keys(meta).length > 0, 'sample post has front matter');
            assert.deepStrictEqual(blog.parseFrontmatter(crlf).meta, meta);
        });
    });
}

module.exports = runBlogTests;

if (require.main === module) {
    (async () => {
        const t0 = Date.now();
        await runBlogTests();
        const ok = require('./runner').printSummary(Date.now() - t0);
        process.exit(ok ? 0 : 1);
    })();
}
