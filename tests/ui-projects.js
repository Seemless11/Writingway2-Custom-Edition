const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const fileUrl = process.env.APP_URL || ('file:///' + path.join(projectRoot, 'main.html').replace(/\\/g, '/'));

  console.log('Opening:', fileUrl);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  // Accept the file:// storage advisory confirm() so headless boot proceeds.
  page.on('dialog', async dialog => dialog.accept());

  page.on('console', msg => { try { console.log(`PAGE LOG [${msg.type()}] ${msg.text()}`); } catch (e) { } });
  page.on('pageerror', err => { console.error('PAGE ERROR', err && err.message ? err.message : err); });

  try {
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });
    // Alpine 3 compat: this test uses the Alpine v2 el.__x API.
    await page.evaluate(() => {
      Object.defineProperty(Element.prototype, '__x', {
        get() { return this._x_dataStack ? { $data: Alpine.$data(this) } : null; },
        configurable: true,
      });
    });

    // Seed two projects
    const projA = await page.evaluate(async () => await window.__test.seedProject('ProjA'));
    const projB = await page.evaluate(async () => await window.__test.seedProject('ProjB'));

    // Select project B using test helper
    const ok = await page.evaluate(async (id) => await window.__test.selectProject(id), projB.id);
    if (!ok) {
      console.error('selectProject helper failed');
      await browser.close();
      process.exit(2);
    }

    // Verify app state selectedProjectId or currentProject
    const state = await page.evaluate(() => {
      const a = window.__test.getApp();
      return { selectedProjectId: a.selectedProjectId, currentProjectId: a.currentProject ? a.currentProject.id : null, ls: localStorage.getItem('writingway:lastProject') };
    });

    if (state.selectedProjectId !== projB.id && state.currentProjectId !== projB.id && state.ls !== projB.id) {
      console.error('Project selection did not persist:', state);
      await browser.close();
      process.exit(3);
    }

    // Reload page: boot now shows the project picker instead of auto-opening
    // the last project. Verify nothing auto-opens, then select projB the way
    // the picker does and confirm it opens.
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => {
      const el = document.querySelector('[x-data="app"]');
      const d = el && window.Alpine ? Alpine.$data(el) : null;
      if (!d) return { currentProjectId: null, selectedProjectId: null, pickerVisible: false };
      return {
        currentProjectId: d.currentProject ? d.currentProject.id : null,
        selectedProjectId: d.selectedProjectId || null,
        pickerVisible: !!document.querySelector('.welcome-screen')
      };
    });

    if (after.currentProjectId !== null) {
      console.error('Boot should show the picker, not auto-open a project:', after);
      await browser.close();
      process.exit(4);
    }

    // Select projB again (as the picker would) and verify it opens
    const reopened = await page.evaluate(async (id) => await window.__test.selectProject(id), projB.id);
    const opened = await page.evaluate(() => {
      const a = window.__test.getApp();
      return a.currentProject ? a.currentProject.id : null;
    });

    if (!reopened || opened !== projB.id) {
      console.error('Project did not open after re-select:', { reopened, opened });
      await browser.close();
      process.exit(4);
    }

    console.log('ui-projects test passed.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ui-projects test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();
