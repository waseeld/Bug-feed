/**
 * Authentication & Security Manager for Bug-Feed.
 * - PBKDF2 with SHA-512 and unique salt per user (zero insecure external binaries)
 * - HMAC-SHA256 signed stateless tokens with 7-day expiration
 * - Atomic persistence in backend/data/auth.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

// Server secret for signing HMAC session tokens (generated or loaded from env)
const SERVER_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'bugfeed_cyber_sec_token_sig_2026_@key';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class AuthManager {
    constructor() {
        this.users = [];
        this.loadUsers();
    }

    loadUsers() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

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
        const tmpPath = `${AUTH_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        const content = JSON.stringify({ users: this.users }, null, 2);
        fs.writeFileSync(tmpPath, content, 'utf8');
        fs.renameSync(tmpPath, AUTH_FILE);
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
            throw new Error('Invalid username or password');
        }

        const testHash = this.hashPassword(cleanPass, user.salt);
        if (!crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(user.hash, 'hex'))) {
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

        const signature = crypto
            .createHmac('sha256', SERVER_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64url');

        return `${header}.${payload}.${signature}`;
    }

    /**
     * Verify token signature and expiration.
     */
    verifyToken(token) {
        if (!token || typeof token !== 'string') return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        const expectedSig = crypto
            .createHmac('sha256', SERVER_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSig) {
            return null; // Invalid signature
        }

        try {
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (decoded.exp && Date.now() > decoded.exp) {
                return null; // Expired
            }
            return decoded;
        } catch (e) {
            return null;
        }
    }
}

const authManager = new AuthManager();
module.exports = authManager;
