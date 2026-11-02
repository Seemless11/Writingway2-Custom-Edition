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

    // Create project
    const proj = await page.evaluate(async () => await window.__test.seedProject('NormTest'));

    // Add chapters with scrambled orders
    await page.evaluate(async (pid) => {
      await db.chapters.add({ id: 'cA', projectId: pid, title: 'A', order: 5, created: new Date(), modified: new Date() });
      await db.chapters.add({ id: 'cB', projectId: pid, title: 'B', order: 2, created: new Date(), modified: new Date() });
      await db.chapters.add({ id: 'cC', projectId: pid, title: 'C', order: 9, created: new Date(), modified: new Date() });

      // Scenes in cA with scrambled order
      await db.scenes.add({ id: 's1', projectId: pid, chapterId: 'cA', title: 's1', order: 3, created: new Date(), modified: new Date() });
      await db.scenes.add({ id: 's2', projectId: pid, chapterId: 'cA', title: 's2', order: 1, created: new Date(), modified: new Date() });
    }, proj.id);

    // Call normalize via test helper
    await page.evaluate(async () => await window.__test.selectProject((await db.projects.orderBy('created').reverse().toArray())[0].id));
    await page.evaluate(async () => await window.__test.normalizeAllOrders());

    // Verify chapter orders are 0..n-1
    const chOrders = await page.evaluate(async (pid) => {
      const chs = await db.chapters.where('projectId').equals(pid).sortBy('order');
      return chs.map(c => c.order);
    }, proj.id);

    if (!(Array.isArray(chOrders) && chOrders.length >= 3 && chOrders[0] === 0 && chOrders[1] === 1 && chOrders[2] === 2)) {
      console.error('Chapter orders not normalized:', chOrders);
      await browser.close();
      process.exit(2);
    }

    const sOrders = await page.evaluate(async () => {
      const scs = await db.scenes.where('chapterId').equals('cA').sortBy('order');
      return scs.map(s => s.order);
    });

    if (!(Array.isArray(sOrders) && sOrders.length >= 2 && sOrders[0] === 0 && sOrders[1] === 1)) {
      console.error('Scene orders not normalized:', sOrders);
      await browser.close();
      process.exit(3);
    }

    console.log('unit-normalizeOrders test passed.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('unit-normalizeOrders test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();
