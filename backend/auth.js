/**
 * Authentication & Security Manager for Bug-Feed.
 * - PBKDF2 with SHA-512 and unique salt per user (zero insecure external binaries)
 * - HMAC-SHA256 signed stateless tokens with 7-day expiration
 * - Atomic persistence in backend/data/auth.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR, atomicWriteJson } = require('./paths');

const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const MIN_SECRET_LENGTH = 32;
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Load the HMAC signing secret.
 * Order: AUTH_SECRET / JWT_SECRET env var, then backend/data/secret.key,
 * otherwise generate a random 64-byte secret and persist it so sessions survive restarts.
 * There is deliberately no hard-coded fallback: a public default would let anyone forge tokens.
 */
function loadServerSecret() {
    const fromEnv = (process.env.AUTH_SECRET || process.env.JWT_SECRET || '').trim();
    if (fromEnv) {
        if (fromEnv.length < MIN_SECRET_LENGTH) {
            console.warn(`[Auth] Warning: AUTH_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. Use a longer random value.`);
        }
        return fromEnv;
    }

    try {
        const stored = fs.readFileSync(SECRET_FILE, 'utf8').trim();
        if (stored.length >= MIN_SECRET_LENGTH) return stored;
    } catch (e) {
        // No stored secret yet.
    }

    const generated = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    console.log(`[Auth] Generated a new random signing secret in ${SECRET_FILE}`);
    return generated;
}

const SERVER_SECRET = loadServerSecret();

function sign(data) {
    return crypto.createHmac('sha256', SERVER_SECRET).update(data).digest('base64url');
}

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

class AuthManager {
    constructor() {
        this.users = [];
        this.loadUsers();
    }

    loadUsers() {
        if (fs.existsSync(AUTH_FILE)) {
            try {
                const raw = fs.readFileSync(AUTH_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                this.users = Array.isArray(parsed.users) ? parsed.users : [];
            } catch (e) {
                console.error('[Auth] Warning: Could not parse auth.json, initializing empty user store');
                this.users = [];
            }
        } else {
            this.users = [];
        }
    }

    saveUsers() {
        atomicWriteJson(AUTH_FILE, { users: this.users }, { mode: 0o600 });
    }

    /**
     * Check if initial administrator setup has been completed.
     */
    isInitialized() {
        return this.users.length > 0;
    }

    /**
     * Hash password using native PBKDF2 with SHA-512 and unique random salt.
     */
    hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    }

    /**
     * Initialize administrator account (first-time setup only).
     */
    createAdmin(username, password) {
        const cleanUser = (username || '').trim();
        const cleanPass = (password || '').trim();

        if (cleanUser.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        if (cleanPass.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        if (this.isInitialized()) {
            throw new Error('Administrator account already initialized. Please login.');
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = this.hashPassword(cleanPass, salt);

        const newUser = {
            id: 'admin-' + Date.now(),
            username: cleanUser,
            role: 'admin',
            salt,
            hash,
            created_at: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();

        const token = this.generateToken(newUser);
        return {
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role
            },
            token
        };
    }

    /**
     * Authenticate user with credentials and issue token.
     */
    verifyCredentials(username, password) {
        const cleanUser = (username || '').trim();
        const cleanPass = (password || '').trim();

        const user = this.users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
        if (!user) {
            // Spend the same hashing time as a real check so response timing doesn't reveal valid usernames.
            this.hashPassword(cleanPass, 'bugfeed-dummy-salt');
            throw new Error('Invalid username or password');
        }

        const testHash = this.hashPassword(cleanPass, user.salt);
        if (!safeEqual(testHash, user.hash)) {
            throw new Error('Invalid username or password');
        }

        const token = this.generateToken(user);
        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            token
        };
    }

    /**
     * Generate HMAC-SHA256 signed stateless token.
     */
    generateToken(user) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const now = Date.now();
        const payload = Buffer.from(JSON.stringify({
            sub: user.id,
            username: user.username,
            role: user.role || 'user',
            iat: now,
            exp: now + TOKEN_EXPIRY_MS
        })).toString('base64url');

        return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
    }

    /**
     * Verify token signature and expiration.
     */
    verifyToken(token) {
        if (!token || typeof token !== 'string') return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        if (!safeEqual(signature, sign(`${header}.${payload}`))) {
            return null; // Invalid signature
        }

        try {
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
                return null; // Missing or past expiry
            }
            return decoded;
        } catch (e) {
            return null;
        }
    }
}

const authManager = new AuthManager();
module.exports = authManager;
