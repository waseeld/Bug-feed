/**
 * Starts the Express app in-process on a random port.
 */

let server = null;
let baseUrl = null;

async function startServer() {
    if (baseUrl) return baseUrl;
    const app = require('../../main');
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    return baseUrl;
}

async function stopServer() {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    server = null;
    baseUrl = null;
}

/**
 * Small request helper. Returns { status, headers, data, text }.
 */
async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
    const url = await startServer();
    const res = await fetch(url + path, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    try {
        data = JSON.parse(text);
    } catch (e) {
        // Not JSON (e.g. the SPA shell).
    }
    return { status: res.status, headers: res.headers, data, text };
}

module.exports = { startServer, stopServer, request };
