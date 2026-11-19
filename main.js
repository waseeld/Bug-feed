const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const config = require('./backend/config');
const routes = require('./backend/routes/index');

const app = express();

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// Basic hardening headers. The API and UI are served from the same origin,
// so no CORS headers are sent (the Vue dev server proxies /api instead).
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    next();
});

// API Routes
app.use('/api', routes);

// Serve the built frontend. index.html is never cached so new builds show up at once;
// hashed JS/CSS bundles are cached for a long time.
const frontendDist = path.join(__dirname, 'frontend', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');

app.use(express.static(frontendDist, {
    index: false,
    setHeaders(res, filePath) {
        if (/[\\/](js|css)[\\/].+\.[0-9a-f]{8}\./.test(filePath)) {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));
app.use(express.static(path.join(__dirname, 'frontend', 'public'), { index: false }));

function sendSpa(res) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(frontendIndex);
}

app.get('/', (req, res) => {
    if (fs.existsSync(frontendIndex)) {
        return sendSpa(res);
    }
    res.json({
        status: 200,
        name: 'Bug-feed API',
        endpoints: [
            '/api/feeds/all',
            '/api/feeds/hackerone',
            '/api/feeds/cve',
            '/api/feeds/news',
            '/api/feeds/tips',
            '/api/blog',
            '/api/blog/:slug',
            '/api/feeds/metrics/todays'
        ]
    });
});

// Client routes such as /blog and /blog/:slug load the SPA shell.
app.get(/^(?!\/api(\/|$)).+/, (req, res, next) => {
    if (fs.existsSync(frontendIndex)) {
        return sendSpa(res);
    }
    next();
});

const PORT = process.env.PORT || config.port || 9600;
// HOST is optional; without it Node listens on every interface (IPv4 and IPv6).
const HOST = process.env.HOST || undefined;
const worker = require('./backend/worker');

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`[Bug-feed] Server running on http://localhost:${PORT}`);
        // Auto-start background ingestion worker if not explicitly disabled
        if (process.env.DISABLE_WORKER !== 'true') {
            const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 15;
            worker.startScheduler(interval);
            console.log(`[Bug-feed] Background Ingestion Engine active (every ${interval} mins).`);
        }
    });
}

module.exports = app;
