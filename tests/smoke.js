const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const port = parseInt(process.env.PORT || '8010', 10);
const baseUrl = process.env.APP_URL || ('http://127.0.0.1:' + port + '/main.html');

function waitForServer(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            http.get(url, res => {
                res.resume();
                resolve();
            }).on('error', err => {
                if (Date.now() > deadline) {
                    reject(new Error('static server did not start: ' + err.message));
                } else {
                    setTimeout(attempt, 150);
                }
            });
        };
        attempt();
    });
}

(async () => {
    console.log('Opening:', baseUrl);

    let server = null;
    if (!process.env.APP_URL) {
        server = spawn(process.execPath, [path.join(__dirname, 'static-server.js'), projectRoot, String(port)], {
            stdio: 'ignore'
        });
        await waitForServer(baseUrl, 10000);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Keep the run hermetic: no CDN dependency, no font downloads.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await context.route('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js', route =>
        route.fulfill({ path: path.join(__dirname, 'vendor-dexie.min.js') }));
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', route =>
        route.fulfill({ path: path.join(__dirname, 'vendor-jszip.min.js') }));

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('requestfailed', req => failedRequests.push(req.url() + ' (' + (req.failure() && req.failure().errorText) + ')'));
    page.on('response', res => {
        if (res.status() >= 400) failedRequests.push(res.status() + ' ' + res.url());
    });

    // The app warns when opened over file://; accept so init can continue.
    page.on('dialog', dialog => dialog.accept().catch(() => {}));

    const shutdown = async (code) => {
        await browser.close().catch(() => {});
        if (server) server.kill();
        process.exit(code);
    };

    try {
        await page.goto(baseUrl, { waitUntil: 'load', timeout: 20000 });

        // The app root is an Alpine component; .app-container only exists after init.
        await page.waitForSelector('.app-container', { timeout: 20000 });

        const boot = await page.evaluate(() => {
            const root = document.querySelector('[x-data="app"]');
            return {
                alpineLoaded: typeof window.Alpine !== 'undefined',
                hasRoot: !!root,
                rootInitialized: !!(root && root._x_dataStack && root._x_dataStack.length > 0),
                appContainerVisible: !!document.querySelector('.app-container')
            };
        });

        if (!boot.alpineLoaded || !boot.hasRoot || !boot.rootInitialized || !boot.appContainerVisible) {
            console.error('ERROR: Alpine did not initialize the app root');
            console.error('  ' + JSON.stringify(boot));
            await shutdown(2);
        }

        // Give async init (Dexie, prompt seeding, project load) time to surface errors.
        await page.waitForTimeout(1500);

        if (pageErrors.length > 0) {
            console.error('Uncaught page errors:');
            for (const e of pageErrors) console.error('  -', e);
            await shutdown(4);
        }

        if (consoleErrors.length > 0) {
            console.error('Console errors were detected:');
            for (const e of consoleErrors) console.error('  -', e);
            if (failedRequests.length > 0) {
                console.error('Failed requests:');
                for (const e of failedRequests) console.error('  -', e);
            }
            await shutdown(3);
        }

        console.log('Smoke test passed: app booted, Alpine initialized, no console errors.');
        await shutdown(0);
    } catch (err) {
        console.error('Smoke test failed:', err.message || err);
        if (consoleErrors.length > 0) {
            console.error('Console errors captured before failure:');
            for (const e of consoleErrors) console.error('  -', e);
        }
        await shutdown(1);
    }
})();
