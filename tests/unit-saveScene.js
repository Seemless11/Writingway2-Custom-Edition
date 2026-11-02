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

    // Seed minimal project structure
    const proj = await page.evaluate(async () => await window.__test.seedProject('SaveTest'));
    const chap = await page.evaluate(async (args) => await window.__test.seedChapter(args.pid, 'C1'), { pid: proj.id });
    const scene = await page.evaluate(async (args) => await window.__test.seedScene(args.pid, args.cid, 'S1'), { pid: proj.id, cid: chap.id });

    // Instead of relying on the Alpine app loading UI state in headless runs,
    // call the Save utility directly with a minimal fake app object bound to the same DB.
    await page.evaluate(async (args) => {
      const sid = args.sid;
      const cid = args.cid;
      // create a minimal app-like object expected by Save.saveScene
      const fakeApp = {
        db: db,
        currentScene: {
          id: sid,
          title: 'S1',
          order: 0,
          chapterId: cid,
          content: 'Hello from test save',
          povCharacter: '',
          pov: '',
          tense: ''
        },
        chapters: [],
        scenes: []
      };
      // call the extracted save helper directly
      if (window.Save && typeof window.Save.saveScene === 'function') {
        await window.Save.saveScene(fakeApp);
      } else if (window.__test && typeof window.__test.callSave === 'function') {
        await window.__test.callSave();
      }
    }, { sid: scene.id, cid: chap.id });

    // Verify DB content and wordCount
    const saved = await page.evaluate(async (sid) => {
      const c = await db.content.get(sid);
      return { text: c ? c.text : null, wordCount: c ? c.wordCount : null };
    }, scene.id);

    if (!saved || saved.text !== 'Hello from test save') {
      console.error('Save failed or incorrect text:', saved);
      await browser.close();
      process.exit(2);
    }

    console.log('unit-saveScene test passed.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('unit-saveScene test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();
