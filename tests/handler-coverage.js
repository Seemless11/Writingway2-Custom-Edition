/**
 * handler-coverage.js — every method referenced from an Alpine event handler must exist
 * on the app component.
 *
 * Alpine resolves handler expressions by name at click time, so a renamed or missing
 * method produces no error until the user clicks the button. This test collects every
 * `@event`, `x-on:*` and `x-init` expression from the rendered page and resolves each
 * called identifier against the live Alpine data object.
 */
'use strict';

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const port = parseInt(process.env.PORT || '8011', 10);
const baseUrl = process.env.APP_URL || ('http://127.0.0.1:' + port + '/main.html');

const IGNORED = new Set([
    // JavaScript keywords and operators that can appear before a parenthesis
    'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'async', 'await',
    'function', 'new', 'delete', 'void', 'do', 'else', 'in', 'of', 'instanceof',
    // Globals
    'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
    'Map', 'Set', 'Promise', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'encodeURIComponent', 'decodeURIComponent', 'structuredClone', 'fetch',
    'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout',
    'clearInterval', 'requestAnimationFrame', 'console',
    // Alpine magics
    '$event', '$el', '$refs', '$nextTick', '$dispatch', '$watch', '$data', '$root'
]);

function waitForServer(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            http.get(url, res => { res.resume(); resolve(); }).on('error', err => {
                if (Date.now() > deadline) reject(new Error('static server did not start: ' + err.message));
                else setTimeout(attempt, 150);
            });
        };
        attempt();
    });
}

(async () => {
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

    await context.route(/fonts\.(googleapis|gstatic)\.com/, route =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await context.route('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js', route =>
        route.fulfill({ path: path.join(__dirname, 'vendor-dexie.min.js') }));
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', route =>
        route.fulfill({ path: path.join(__dirname, 'vendor-jszip.min.js') }));
    page.on('dialog', dialog => dialog.accept().catch(() => {}));

    try {
        await page.goto(baseUrl, { waitUntil: 'load', timeout: 20000 });
        await page.waitForSelector('.app-container', { timeout: 20000 });

        const result = await page.evaluate((ignoredList) => {
            const ignored = new Set(ignoredList);
            const root = document.querySelector('[x-data="app"]');
            if (!root || !window.Alpine || typeof window.Alpine.$data !== 'function') {
                return { error: 'Alpine app root not initialized' };
            }
            const data = window.Alpine.$data(root);

            const HANDLER_ATTR = /^(@|x-on:)/;
            const CALL = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;

            const expressions = [];
            const visit = (node) => {
                if (node.nodeType === 1) {
                    for (const attr of node.attributes) {
                        if (HANDLER_ATTR.test(attr.name) || attr.name === 'x-init') {
                            expressions.push({ name: attr.name, value: attr.value });
                        }
                    }
                    // <template> content is inert and never matches querySelectorAll,
                    // but its handlers still run once the template is instantiated.
                    if (node.tagName === 'TEMPLATE' && node.content) visit(node.content);
                }
                for (const child of node.childNodes) visit(child);
            };
            visit(root);

            const missing = new Map();
            let checked = 0;
            for (const expr of expressions) {
                // Strip string and template literals so `rgba(...)` / `var(...)` inside
                // style strings are not mistaken for method calls.
                const code = expr.value
                    .replace(/'(?:\\.|[^'\\])*'/g, "''")
                    .replace(/"(?:\\.|[^"\\])*"/g, '""')
                    .replace(/`(?:\\.|[^`\\])*`/g, '``');
                CALL.lastIndex = 0;
                let match;
                while ((match = CALL.exec(code)) !== null) {
                    const name = match[2];
                    if (ignored.has(name)) continue;
                    checked++;
                    if (typeof data[name] !== 'function') {
                        const key = name;
                        if (!missing.has(key)) missing.set(key, []);
                        const list = missing.get(key);
                        if (list.length < 3) list.push(expr.name);
                    }
                }
            }

            return {
                expressions: expressions.length,
                calls: checked,
                missing: Array.from(missing.entries()).map(([name, attrs]) => ({ name, attrs }))
            };
        }, Array.from(IGNORED));

        if (result.error) {
            console.error('handler-coverage: ' + result.error);
            await browser.close();
            if (server) server.kill();
            process.exit(2);
        }

        if (result.missing.length > 0) {
            console.error('handler-coverage: ' + result.missing.length + ' handler(s) reference a method that does not exist on the app component:');
            for (const entry of result.missing) {
                console.error('  ' + entry.name + '  <- ' + entry.attrs.join(', '));
            }
            await browser.close();
            if (server) server.kill();
            process.exit(1);
        }

        console.log('handler-coverage passed: ' + result.calls + ' calls across ' +
            result.expressions + ' handler expressions all resolve.');
        await browser.close();
        if (server) server.kill();
        process.exit(0);
    } catch (err) {
        console.error('handler-coverage failed:', err.message || err);
        await browser.close().catch(() => {});
        if (server) server.kill();
        process.exit(1);
    }
})();
