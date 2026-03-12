const http = require('http');
const https = require('https');

const baseUrl = String(process.env.BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const checks = [
    { path: '/api/health', expected: [200] },
    { path: '/', expected: [200] },
    { path: '/products', expected: [200] },
    { path: '/about', expected: [200] },
    { path: '/shipping', expected: [200] },
    { path: '/returns', expected: [200] },
    { path: '/tracking', expected: [200] },
    { path: '/admin-login', expected: [200] },
    { path: '/admin', expected: [302] }
];

function requestStatus(targetUrl) {
    return new Promise((resolve, reject) => {
        const url = new URL(targetUrl);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(
            url,
            {
                method: 'GET',
                timeout: 8000
            },
            (res) => {
                res.resume();
                resolve(Number(res.statusCode || 0));
            }
        );

        req.on('timeout', () => {
            req.destroy(new Error(`Request timed out for ${url.pathname}`));
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    let failed = false;

    for (const check of checks) {
        const targetUrl = `${baseUrl}${check.path}`;

        try {
            const status = await requestStatus(targetUrl);
            const ok = check.expected.includes(status);
            const label = ok ? 'PASS' : 'FAIL';
            console.log(`${label} ${check.path} -> ${status}`);

            if (!ok) {
                failed = true;
            }
        } catch (error) {
            failed = true;
            console.error(`FAIL ${check.path} -> ${error.message}`);
        }
    }

    if (failed) {
        process.exitCode = 1;
        return;
    }

    console.log(`Smoke checks passed for ${baseUrl}`);
}

main();
