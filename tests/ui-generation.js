const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const fileUrl = process.env.APP_URL || ('file:///' + path.join(projectRoot, 'main.html').replace(/\\/g, '/'));

    console.log('Opening:', fileUrl);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    // Accept the file:// storage advisory confirm() so headless boot proceeds (matches unit tests).
    page.on('dialog', async dialog => dialog.accept());

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 15000 });
        await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

        // Ensure there's a scene; seed if necessary
        let hasScene = await page.$('.scene-item');
        if (!hasScene) {
            await page.evaluate(async () => {
                try {
                    const proj = { id: Date.now().toString(), name: 'GenTest', created: new Date(), modified: new Date() };
                    await db.projects.add(proj);
                    const chap = { id: Date.now().toString() + '-c', projectId: proj.id, title: 'Chapter 1', order: 0, created: new Date(), modified: new Date() };
                    await db.chapters.add(chap);
                    const scene = { id: Date.now().toString() + '-s', projectId: proj.id, chapterId: chap.id, title: 'Scene 1', order: 0, created: new Date(), modified: new Date() };
                    await db.scenes.add(scene);
                    await db.content.add({ sceneId: scene.id, text: '', wordCount: 0 });
                    try { localStorage.setItem('writingway:lastProject', proj.id); } catch (e) { }
                } catch (e) { }
            });
            await page.reload({ waitUntil: 'load' });
            // Boot no longer auto-opens the last project (project picker on boot);
            // open it explicitly.
            await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });
            await page.evaluate(async () => {
                const el = document.querySelector('[x-data="app"]');
                const app = el && window.Alpine ? Alpine.$data(el) : null;
                if (app && !app.currentProject && typeof app.loadLastProject === 'function') {
                    await app.loadLastProject();
                }
            });
            await page.waitForSelector('.scene-item', { timeout: 8000 });
        }

        // Alpine 3 compat: these tests use the Alpine v2 `el.__x.$data` API.
        // (Applied after any seed/reload — reloads wipe page state.)
        await page.evaluate(() => {
            Object.defineProperty(Element.prototype, '__x', {
                get() { return this._x_dataStack ? { $data: Alpine.$data(this) } : null; },
                configurable: true,
            });
        });

        // Make app think AI is ready and stub the generation API response.
        // generation.js streams via an internal streamGeneration -> fetch to the
        // provider API, so the old window.Generation.streamGeneration hook no
        // longer exists — stub window.fetch instead (same pattern as unit tests).
        await page.evaluate(() => {
            const el = document.querySelector('[x-data="app"]');
            if (el && el.__x && el.__x.$data) {
                el.__x.$data.aiStatus = 'ready';
            }

            if (!window.__originalFetch) window.__originalFetch = window.fetch;
            const encoder = new TextEncoder();
            window.fetch = async (url, opts) => {
                if (typeof url === 'string' && url.includes('api.anthropic.com')) {
                    const payload = [
                        'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' This' } }) + '\n',
                        'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' is' } }) + '\n',
                        'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' generated.' } }) + '\n',
                        'data: ' + JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' } }) + '\n',
                    ];
                    const stream = new ReadableStream({
                        start(controller) {
                            for (const p of payload) controller.enqueue(encoder.encode(p));
                            controller.close();
                        }
                    });
                    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
                }
                return window.__originalFetch(url, opts);
            };
        });

        // Select the first scene to load into the editor
        const firstScene = await page.$('.scene-item');
        await firstScene.click();
        await page.waitForTimeout(200);

        // Fill beat input and trigger generation
        // The default UI is the floating beat bar (no text input); switch to the
        // legacy beat panel so the test can drive the textarea.
        await page.evaluate(() => {
            const el = document.querySelector('[x-data="app"]');
            const app = el && window.Alpine ? Alpine.$data(el) : null;
            if (app) app.showMiniBeatInput = true;
        });
        await page.waitForSelector('.beat-input', { state: 'visible', timeout: 5000 });
        await page.fill('.beat-input', "She opens the door and steps into the rain.");
        // The old .generate-btn class is gone; the legacy panel's button is the
        // "✨ Generate" button.
        await page.click('.legacy-beat-panel button:has-text("Generate")');

        // Wait for Accept button to appear which indicates generation completed
        // (scoped to the legacy panel — the hidden floating bar has a duplicate).
        await page.waitForSelector('.legacy-beat-panel button:has-text("Accept")', { timeout: 5000 });

        // Verify that generated tokens appear in the editor textarea
        const ta = await page.$('.editor-textarea');
        const value = await ta.evaluate(el => el.value);
        if (!value.includes('generated')) {
            console.error('Generated text not found in editor:', value.slice(0, 200));
            await browser.close();
            process.exit(3);
        }

        // Click Accept and verify actions disappear (wait until hidden)
        await page.click('.legacy-beat-panel button:has-text("Accept")');
        try {
            await page.waitForSelector('.legacy-beat-panel button:has-text("Accept")', { state: 'hidden', timeout: 3000 });
        } catch (e) {
            const isVis = await page.isVisible('.legacy-beat-panel button:has-text("Accept")').catch(() => false);
            if (isVis) {
                console.error('Accept button still visible after accepting');
                await browser.close();
                process.exit(4);
            }
        }

        console.log('UI generation test passed: streaming stub appended text and Accept works.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('UI generation test failed:', err && err.message ? err.message : err);
        await browser.close();
        process.exit(1);
    }
})();
