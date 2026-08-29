const express = require('express');
const compression = require('compression');
const path = require('path');
const config = require('./backend/config');
const routes = require('./backend/routes/index');

const app = express();

app.use(compression());
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// API Routes
app.use('/api', routes);

// Serve frontend dist or public if available
const frontendDist = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

app.get('/', (req, res) => {
    res.json({
        status: 200,
        name: "Bug-feed API",
        endpoints: [
            "/api/feeds/all",
            "/api/feeds/hackerone",
            "/api/feeds/cve",
            "/api/feeds/news",
            "/api/feeds/tips",
            "/api/feeds/metrics/todays",
            "/api/feeds/metrics/saved"
        ]
    });
});

const PORT = process.env.PORT || config.port || 9600;
const worker = require('./backend/worker');

if (require.main === module) {
    app.listen(PORT, () => {
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