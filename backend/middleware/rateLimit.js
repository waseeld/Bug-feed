/**
 * Small in-memory rate limiter for the login and setup endpoints.
 * Counts failed attempts per client IP inside a sliding window.
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
    const hits = new Map(); // ip -> [timestamps]

    function prune(ip, now) {
        const list = (hits.get(ip) || []).filter(t => now - t < windowMs);
        if (list.length) hits.set(ip, list);
        else hits.delete(ip);
        return list;
    }

    function middleware(req, res, next) {
        const now = Date.now();
        const list = prune(req.ip, now);
        if (list.length >= max) {
            const retryAfter = Math.ceil((windowMs - (now - list[0])) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                status: 429,
                error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`
            });
        }
        next();
    }

    middleware.fail = (req) => {
        const now = Date.now();
        const list = prune(req.ip, now);
        list.push(now);
        hits.set(req.ip, list);
    };

    middleware.reset = (req) => {
        hits.delete(req.ip);
    };

    return middleware;
}

module.exports = createRateLimiter;
