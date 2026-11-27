/**
 * Security & Authentication Guard Middleware.
 * Mounted after the public /auth/status, /auth/setup and /auth/login routes,
 * so every request that reaches it needs a valid token.
 */

const auth = require('../auth');

/**
 * Read the session token from the Authorization header (or X-Auth-Token).
 * Tokens in the query string are not accepted: URLs end up in logs, history and Referer headers.
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    const alt = req.headers['x-auth-token'];
    return typeof alt === 'string' && alt ? alt.trim() : null;
}

function authMiddleware(req, res, next) {
    if (req.method === 'OPTIONS') {
        return next();
    }

    const token = extractToken(req);
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
module.exports.extractToken = extractToken;
