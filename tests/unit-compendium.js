const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const fileUrl = process.env.APP_URL || ('file:///' + path.join(projectRoot, 'main.html').replace(/\\/g, '/'));

    console.log('Opening:', fileUrl);
    const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Block slow/offline Google Fonts so the load event does not stall in headless runs
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    // Use vendored copies of CDN libs so tests run without a reliable network
    await context.route('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js', route => route.fulfill({ path: path.join(__dirname, 'vendor-dexie.min.js') }));
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', route => route.fulfill({ path: path.join(__dirname, 'vendor-jszip.min.js') }));
  const page = await context.newPage();
  // Accept the file:// storage advisory confirm() so headless boot proceeds.
  page.on('dialog', async dialog => dialog.accept());

    page.on('console', msg => { try { console.log(`PAGE LOG [${msg.type()}] ${msg.text()}`); } catch (e) { } });
    page.on('pageerror', err => { console.error('PAGE ERROR', err && err.message ? err.message : err); });

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });
        // Alpine 3 compat: these tests may use the Alpine v2 el.__x API.
        await page.evaluate(() => {
            Object.defineProperty(Element.prototype, '__x', {
                get() { return this._x_dataStack ? { $data: Alpine.$data(this) } : null; },
                configurable: true,
            });
        });

        // Seed project
        const proj = await page.evaluate(async () => await window.__test.seedProject('CompTest'));

        // Seed compendium entries via API
        const entries = await page.evaluate(async (pid) => {
            return await window.__test.seedCompendium(pid, [
                { category: 'character', title: 'Alice', body: 'Alice is a cautious detective.' },
                { category: 'location', title: 'Old Harbor', body: 'The Old Harbor smells of salt and diesel.' }
            ]);
        }, proj.id);

        if (!Array.isArray(entries) || entries.length < 2) {
            console.error('Compendium seed failed:', entries);
            await browser.close();
            process.exit(2);
        }

        // Test search
        const search = await page.evaluate(async (pid) => {
            return await window.Compendium.search(pid, 'Alice');
        }, proj.id);

        if (!(Array.isArray(search) && search.length >= 1 && search[0].title === 'Alice')) {
            console.error('Compendium search failed:', search);
            await browser.close();
            process.exit(3);
        }

        // Test getEntry
        const fetched = await page.evaluate(async (id) => await window.Compendium.getEntry(id), entries[0].id);
        if (!fetched || fetched.title !== 'Alice') {
            console.error('Compendium getEntry failed:', fetched);
            await browser.close();
            process.exit(4);
        }

        console.log('unit-compendium test passed.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('unit-compendium test failed:', err && err.message ? err.message : err);
        await browser.close();
        process.exit(1);
    }
})();
