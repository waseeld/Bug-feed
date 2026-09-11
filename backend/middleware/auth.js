/**
 * Security & Authentication Guard Middleware.
 * Protects all /api/* routes except public authentication setup/status endpoints.
 */

const auth = require('../auth');

function authMiddleware(req, res, next) {
    // Allow CORS preflight
    if (req.method === 'OPTIONS') {
        return next();
    }

    // Whitelist public endpoints
    const publicPaths = [
        '/auth/status',
        '/auth/setup',
        '/auth/login'
    ];

    // Normalize path (handle both router relative paths and full URLs)
    const reqPath = req.path || req.url;
    if (publicPaths.some(p => reqPath.endsWith(p) || reqPath.includes(p))) {
        return next();
    }

    // Extract Bearer token
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            status: 401,
            error: 'Unauthorized access. Authentication token required.',
            code: 'AUTH_REQUIRED'
        });
    }

    const decoded = auth.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            status: 401,
            error: 'Invalid or expired authentication token. Please re-login.',
            code: 'TOKEN_INVALID'
        });
    }

    req.user = decoded;
    next();
}

module.exports = authMiddleware;
