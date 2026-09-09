/**
 * Lightweight Zero-Dependency Test Runner for Bug-Feed.
 * Built with native Node.js asserts and colored CLI output.
 */

const assert = require('assert');

let currentSuite = '';
let passCount = 0;
let failCount = 0;
const failures = [];

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

async function describe(suiteName, fn) {
    currentSuite = suiteName;
    console.log(`\n${colors.bold}${colors.cyan}▶ Suite: ${suiteName}${colors.reset}`);
    await fn();
}

async function it(testName, testFn) {
    const t0 = Date.now();
    try {
        await testFn();
        const duration = Date.now() - t0;
        passCount++;
        console.log(`  ${colors.green}✔ PASS${colors.reset} ${testName} ${colors.dim}(${duration}ms)${colors.reset}`);
    } catch (err) {
        const duration = Date.now() - t0;
        failCount++;
        console.log(`  ${colors.red}✘ FAIL${colors.reset} ${testName} ${colors.dim}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
        failures.push({
            suite: currentSuite,
            test: testName,
            error: err
        });
    }
}

function getSummary() {
    return {
        passed: passCount,
        failed: failCount,
        total: passCount + failCount,
        failures
    };
}

function printSummary(totalDurationMs) {
    console.log(`\n${colors.bold}======================================================${colors.reset}`);
    console.log(`${colors.bold}Test Execution Summary:${colors.reset}`);
    console.log(`  ${colors.green}Passed:${colors.reset}  ${passCount}`);
    console.log(`  ${colors.red}Failed:${colors.reset}  ${failCount}`);
    console.log(`  ${colors.cyan}Total:${colors.reset}   ${passCount + failCount}`);
    console.log(`  ${colors.yellow}Time:${colors.reset}    ${(totalDurationMs / 1000).toFixed(2)}s`);
    console.log(`${colors.bold}======================================================${colors.reset}\n`);

    if (failCount > 0) {
        console.log(`${colors.bold}${colors.red}Failed Tests Detail:${colors.reset}`);
        failures.forEach((f, i) => {
            console.log(`\n${i + 1}) [${f.suite}] ${f.test}`);
            console.log(`   ${f.error.stack || f.error.message}`);
        });
        return false;
    }
    return true;
}

module.exports = {
    describe,
    it,
    assert,
    getSummary,
    printSummary
};
