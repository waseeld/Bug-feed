/**
 * Authentication & session token tests (backend/auth.js, middleware, rate limiter).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { describe, it, assert } = require('./runner');

function forge(secret, payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

async function runAuthTests() {
    const auth = require('../backend/auth');
    const createRateLimiter = require('../backend/middleware/rateLimit');
    const { extractToken } = require('../backend/middleware/auth');

    await describe('Authentication & Sessions (auth.js)', async () => {
        await it('should issue tokens that verify and carry the user', () => {
            const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'admin' });
            const decoded = auth.verifyToken(token);
            assert.ok(decoded, 'Token must verify');
            assert.strictEqual(decoded.username, 'alice');
            assert.strictEqual(decoded.role, 'admin');
            assert.ok(decoded.exp > Date.now(), 'Token must expire in the future');
        });

        await it('should reject tampered, malformed and empty tokens', () => {
            const token = auth.generateToken({ id: 'u1', username: 'alice', role: 'user' });
            const [h, , s] = token.split('.');
            const elevated = Buffer.from(JSON.stringify({ sub: 'u1', username: 'alice', role: 'admin', exp: Date.now() + 1e6 })).toString('base64url');
            assert.strictEqual(auth.verifyToken(`${h}.${elevated}.${s}`), null, 'Changed payload must fail');
            assert.strictEqual(auth.verifyToken(token + 'x'), null, 'Changed signature must fail');
            assert.strictEqual(auth.verifyToken('a.b'), null);
            assert.strictEqual(auth.verifyToken(''), null);
            assert.strictEqual(auth.verifyToken(null), null);
        });

        await it('should reject tokens signed with the old public default secret', () => {
            const forged = forge('bugfeed_cyber_sec_token_sig_2026_@key', { sub: 'x', username: 'evil', role: 'admin', exp: Date.now() + 1e6 });
            assert.strictEqual(auth.verifyToken(forged), null);
        });

        await it('should reject expired tokens and tokens without an expiry', () => {
            const secret = process.env.AUTH_SECRET;
            assert.strictEqual(auth.verifyToken(forge(secret, { sub: 'u', exp: Date.now() - 1000 })), null, 'Expired');
            assert.strictEqual(auth.verifyToken(forge(secret, { sub: 'u' })), null, 'No exp');
            assert.ok(auth.verifyToken(forge(secret, { sub: 'u', exp: Date.now() + 60000 })), 'Valid control token');
        });

        await it('should generate a random secret file when AUTH_SECRET is not set, and reuse it', () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bugfeed-secret-'));
            const env = { ...process.env, DATA_DIR: dir };
            delete env.AUTH_SECRET;
            delete env.JWT_SECRET;
            const script = "process.stdout.write(require('./backend/auth').generateToken({id:'a',username:'a'}))";
            const root = path.join(__dirname, '..');
            // The first run also logs "[Auth] Generated ..."; the token is the last line.
            const first = execFileSync(process.execPath, ['-e', script], { cwd: root, env }).toString().trim().split('\n').pop();
            const secretFile = path.join(dir, 'secret.key');
            assert.ok(fs.existsSync(secretFile), 'secret.key must be created');
            assert.ok(fs.readFileSync(secretFile, 'utf8').length >= 64, 'Secret must be long');

            const verify = `process.stdout.write(String(!!require('./backend/auth').verifyToken(${JSON.stringify(first)})))`;
            const second = execFileSync(process.execPath, ['-e', verify], { cwd: root, env }).toString();
            assert.strictEqual(second, 'true', 'A restart must keep the same secret');
            fs.rmSync(dir, { recursive: true, force: true });
        });

        await it('should validate admin setup input and allow only one setup', () => {
            assert.throws(() => auth.createAdmin('ab', 'longenough'), /at least 3/);
            assert.throws(() => auth.createAdmin('admin', '123'), /at least 6/);
        });

        await it('should take tokens from headers only, never the query string', () => {
            assert.strictEqual(extractToken({ headers: { authorization: 'Bearer abc' } }), 'abc');
            assert.strictEqual(extractToken({ headers: { 'x-auth-token': 'def' } }), 'def');
            assert.strictEqual(extractToken({ headers: {}, query: { token: 'ghi' } }), null);
            assert.strictEqual(extractToken({ headers: { authorization: 'Basic xyz' } }), null);
        });
    });

    await describe('Login Rate Limiter (middleware/rateLimit.js)', async () => {
        function run(limiter, ip) {
            let status = 200;
            const res = { set() {}, status(code) { status = code; return { json() {} }; } };
            let passed = false;
            limiter({ ip }, res, () => { passed = true; });
            return passed ? 200 : status;
        }

        await it('should block an IP after max failures and leave other IPs alone', () => {
            const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
            for (let i = 0; i < 3; i++) {
                assert.strictEqual(run(limiter, '1.1.1.1'), 200);
                limiter.fail({ ip: '1.1.1.1' });
            }
            assert.strictEqual(run(limiter, '1.1.1.1'), 429);
            assert.strictEqual(run(limiter, '2.2.2.2'), 200, 'Other clients must not be affected');
        });

        await it('should clear the count after a successful login', () => {
            const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
            limiter.fail({ ip: '3.3.3.3' });
            limiter.reset({ ip: '3.3.3.3' });
            limiter.fail({ ip: '3.3.3.3' });
            assert.strictEqual(run(limiter, '3.3.3.3'), 200);
        });

        await it('should forget failures once the window has passed', () => {
            const limiter = createRateLimiter({ windowMs: 1, max: 1 });
            limiter.fail({ ip: '4.4.4.4' });
            const until = Date.now() + 5;
            while (Date.now() < until) { /* wait past the 1 ms window */ }
            assert.strictEqual(run(limiter, '4.4.4.4'), 200);
        });
    });
}

module.exports = runAuthTests;
