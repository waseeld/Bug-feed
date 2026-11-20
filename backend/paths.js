/**
 * Shared filesystem locations.
 * DATA_DIR can be overridden with the DATA_DIR environment variable (see .env.example).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Write JSON through a temporary file and rename, so a crash never leaves a half-written file.
 */
function atomicWriteJson(filePath, data, options = {}) {
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const content = JSON.stringify(data, null, options.pretty === false ? 0 : 2);
    fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: options.mode });
    fs.renameSync(tmpPath, filePath);
}

module.exports = {
    DATA_DIR,
    atomicWriteJson
};
