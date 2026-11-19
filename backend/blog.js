/**
 * Cyber brief blog.
 *
 * Posts are one Markdown file each in /posts. The filename is the slug and
 * the Asia/Riyadh timestamp:
 *
 *   posts/YYYY-MM-DD-HHMM.md
 *
 * The directory is read on each request, so a new file is visible after refresh.
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const FILE_RE = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})\.md$/;
const CVE_RE = /CVE-\d{4}-\d{4,7}/g;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseFrontmatter(raw) {
    const text = raw.replace(/^\uFEFF/, '');
    if (!text.startsWith('---\n')) {
        return { meta: {}, body: text };
    }
    const end = text.indexOf('\n---\n', 4);
    if (end === -1) {
        return { meta: {}, body: text };
    }
    const meta = {};
    text.slice(4, end).split('\n').forEach((line) => {
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!match) return;
        let value = match[2].trim();
        if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        meta[match[1]] = value;
    });
    return { meta, body: text.slice(end + 5) };
}

function renderInline(src) {
    const codes = [];
    const links = [];
    let html = escapeHtml(src);

    html = html.replace(/`([^`]+)`/g, (_, code) => {
        codes.push(code);
        return `\u0000C${codes.length - 1}\u0000`;
    });

    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
        links.push({ text, url });
        return `\u0000L${links.length - 1}\u0000`;
    });

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

    html = html.replace(CVE_RE, (id) => {
        return `<a class="cve-id" href="https://nvd.nist.gov/vuln/detail/${id}" target="_blank" rel="noopener noreferrer">${id}</a>`;
    });

    html = html.replace(/\u0000L(\d+)\u0000/g, (_, index) => {
        const link = links[Number(index)];
        const safeUrl = escapeHtml(link.url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${link.text}</a>`;
    });

    html = html.replace(/\u0000C(\d+)\u0000/g, (_, index) => {
        return `<code>${codes[Number(index)]}</code>`;
    });

    return html;
}

function renderRich(trimmed) {
    const wrappedItalic = trimmed.startsWith('*')
        && trimmed.endsWith('*')
        && !trimmed.startsWith('**')
        && trimmed.length > 2;
    if (wrappedItalic) {
        return `<em>${renderInline(trimmed.slice(1, -1))}</em>`;
    }
    return renderInline(trimmed);
}

function renderMarkdown(markdown) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let list = [];

    function flushList() {
        if (!list.length) return;
        blocks.push('<ul>' + list.map((item) => `<li>${renderRich(item)}</li>`).join('') + '</ul>');
        list = [];
    }

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }
        if (/^(?:---|\*\*\*|___|━+)$/.test(trimmed)) {
            flushList();
            blocks.push('<hr>');
            return;
        }
        if (trimmed.startsWith('- ')) {
            list.push(trimmed.slice(2));
            return;
        }
        flushList();
        blocks.push(`<p>${renderRich(trimmed)}</p>`);
    });

    flushList();
    return blocks.join('\n');
}

function stripInline(value) {
    let text = String(value)
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([\s\S]*?)\*\*/g, '$1');
    if (text.startsWith('*') && text.endsWith('*') && text.length > 1 && !text.startsWith('**')) {
        text = text.slice(1, -1);
    } else {
        text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2');
    }
    return text.trim();
}

function toPlain(body) {
    return stripInline(String(body || '').replace(/\r\n/g, '\n'))
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function clip(text, max) {
    if (text.length <= max) return text;
    const sliced = text.slice(0, max);
    const cut = sliced.replace(/\s+\S*$/, '').trim();
    return (cut.length > max * 0.6 ? cut : sliced.trim()) + '…';
}

function isHeadline(line) {
    return /^\s*(?:[^\p{L}\p{N}*`]+\s*)?\*\*/u.test(line);
}

function makeExcerpt(body) {
    const lines = String(body || '').replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        if (/^---$/.test(line) || isHeadline(line)) continue;
        const plain = stripInline(line.replace(/^- /, ''));
        if (plain) return clip(plain, 180);
    }
    return '';
}

function unique(values) {
    const seen = new Set();
    const result = [];
    values.forEach((value) => {
        if (!seen.has(value)) {
            seen.add(value);
            result.push(value);
        }
    });
    return result;
}

function readPost(filePath) {
    const base = path.basename(filePath);
    const match = base.match(FILE_RE);
    if (!match) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const date = match[1];
    const time = `${match[2]}:${match[3]}`;
    const slug = base.slice(0, -3);
    const text = toPlain(body);
    const title = (meta.title || '').trim() || stripInline(text.split('\n').find(Boolean) || slug);

    return {
        slug,
        title,
        date,
        time,
        timezone: meta.timezone || 'Asia/Riyadh',
        lang: meta.lang || 'ar',
        published_at: `${date}T${time}:00+03:00`,
        excerpt: makeExcerpt(body),
        cves: unique(text.match(CVE_RE) || []),
        text,
        html: renderMarkdown(body)
    };
}

function loadPosts() {
    if (!fs.existsSync(POSTS_DIR)) return [];
    return fs.readdirSync(POSTS_DIR)
        .filter((name) => FILE_RE.test(name))
        .map((name) => readPost(path.join(POSTS_DIR, name)))
        .filter(Boolean)
        .sort((a, b) => b.published_at.localeCompare(a.published_at) || b.slug.localeCompare(a.slug));
}

function summarize(post) {
    return {
        slug: post.slug,
        title: post.title,
        date: post.date,
        time: post.time,
        timezone: post.timezone,
        lang: post.lang,
        published_at: post.published_at,
        excerpt: post.excerpt,
        cves: post.cves,
        text: post.text
    };
}

function listPosts() {
    return loadPosts().map(summarize);
}

function getPost(slug) {
    if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) return null;
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(POSTS_DIR) + path.sep)) return null;
    if (!FILE_RE.test(path.basename(resolved)) || !fs.existsSync(resolved)) return null;
    return readPost(resolved);
}

module.exports = {
    POSTS_DIR,
    listPosts,
    getPost,
    renderMarkdown,
    parseFrontmatter
};
