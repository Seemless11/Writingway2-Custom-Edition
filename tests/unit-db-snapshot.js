// Database snapshot round-trip test
// Verifies: buildSnapshot captures all tables, restoreSnapshotData fully
// rebuilds a wiped database, and maybeAutoRestore is a no-op on non-empty DBs.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const fileUrl = process.env.APP_URL || ('file:///' + path.join(projectRoot, 'main.html').replace(/\\/g, '/'));

    console.log('Opening:', fileUrl);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    await context.route('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js', route => route.fulfill({ path: path.join(__dirname, 'vendor-dexie.min.js') }));
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', route => route.fulfill({ path: path.join(__dirname, 'vendor-jszip.min.js') }));
    const page = await context.newPage();

    page.on('console', msg => { try { console.log(`PAGE LOG [${msg.type()}] ${msg.text()}`); } catch (e) { } });
    page.on('pageerror', err => { console.error('PAGE ERROR', err && err.message ? err.message : err); });

    // Accept confirm dialogs (e.g. the file:// data-location notice), record alerts
    page.on('dialog', async dialog => {
        if (dialog.type() === 'confirm') {
            dialog.accept();
        } else {
            dialog.accept();
        }
    });

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

        // Seed a project with chapters, scenes, content, compendium, and a settings row
        const seeded = await page.evaluate(async () => {
            const proj = await window.__test.seedProject('SnapshotProj');
            const chap = await window.__test.seedChapter(proj.id, 'Chapter 1');
            const scene = await window.__test.seedScene(proj.id, chap.id, 'Scene 1');
            await db.content.put({ sceneId: scene.id, text: 'Hello snapshot world.', wordCount: 3, updatedAt: Date.now() });
            await db.compendium.add({
                id: 'comp-' + Date.now(),
                projectId: proj.id,
                category: 'characters',
                title: 'Ada',
                body: 'A test character.',
                tags: ['imported'],
                modified: new Date()
            });
            await db.settings.put({ key: 'personas', value: [{ name: 'Test', greeting: 'Hi' }] });
            return { projectId: proj.id, chapterId: chap.id, sceneId: scene.id };
        });
        console.log('Seeded:', JSON.stringify(seeded));

        // Phase 1: build a full snapshot and verify contents
        const snapshot = await page.evaluate(() => window.DbSnapshot.buildSnapshot());
        const tableNames = Object.keys(snapshot.tables || {});
        if (!snapshot.tables.projects || snapshot.tables.projects.length !== 1) {
            console.error('Snapshot projects table unexpected:', JSON.stringify(snapshot.tables.projects));
            await browser.close();
            process.exit(2);
        }
        if (!snapshot.tables.chapters || snapshot.tables.chapters.length !== 1 ||
            !snapshot.tables.scenes || snapshot.tables.scenes.length !== 1 ||
            !snapshot.tables.content || snapshot.tables.content.length !== 1) {
            console.error('Snapshot chapters/scenes/content tables unexpected');
            await browser.close();
            process.exit(3);
        }
        const hasCompendium = (snapshot.tables.compendium || []).some(e => e.title === 'Ada');
        const hasPersona = (snapshot.tables.settings || []).some(s => s.key === 'personas');
        if (!hasCompendium || !hasPersona) {
            console.error('Snapshot missing compendium/settings data');
            await browser.close();
            process.exit(4);
        }
        console.log('Snapshot build OK, tables:', JSON.stringify(tableNames));

        // Phase 2: wipe all tables, then restore from the snapshot
        await page.evaluate(() => {
            const names = window.DbSnapshot.TABLES.filter(name => !!db[name]);
            return Promise.all(names.map(async name => {
                try { await db[name].clear(); } catch (e) { /* ignore */ }
            }));
        });

        const emptyCount = await page.evaluate(async () => await db.projects.count());
        if (emptyCount !== 0) {
            console.error('Database wipe failed, projects still present:', emptyCount);
            await browser.close();
            process.exit(4);
        }

        const restored = await page.evaluate(async (snap) => {
            try {
                const app = window.__test.getApp();
                await window.DbSnapshot.restoreSnapshotData(app, snap);
                return {
                    ok: true,
                    projects: await db.projects.count(),
                    chapters: await db.chapters.count(),
                    scenes: await db.scenes.count(),
                    content: await db.content.count(),
                    compendium: await db.compendium.count(),
                    settings: await db.settings.count()
                };
            } catch (e) {
                return { ok: false, error: String(e), stack: e.stack ? String(e.stack) : '', name: e.name || '' };
            }
        }, snapshot);
        console.log('Restored counts:', JSON.stringify(restored));
        if (!restored.ok) {
            console.error('Restore failed in browser:', restored.error, restored.stack);
            await browser.close();
            process.exit(5);
        }

        if (restored.projects !== 1 || restored.chapters !== 1 || restored.scenes !== 1 ||
            restored.content !== 1 || restored.compendium !== 1 || restored.settings !== 1) {
            console.error('Restore did not fully rebuild the database');
            await browser.close();
            process.exit(5);
        }

        // Verify project name and content text survived the round trip
        const verify = await page.evaluate(async () => {
            const proj = await db.projects.toArray();
            const content = await db.content.toArray();
            const comp = await db.compendium.toArray();
            const personas = await db.settings.get('personas');
            return {
                projectName: proj[0] ? proj[0].name : null,
                contentText: content[0] ? content[0].text : null,
                compTitle: comp[0] ? comp[0].title : null,
                personaName: personas && personas.value ? personas.value[0].name : null
            };
        });
        console.log('Round-trip verification:', JSON.stringify(verify));

        if (verify.projectName !== 'SnapshotProj' || verify.contentText !== 'Hello snapshot world.' ||
            verify.compTitle !== 'Ada' || verify.personaName !== 'Test') {
            console.error('Data fidelity lost in snapshot round trip');
            await browser.close();
            process.exit(6);
        }

        // Phase 3: maybeAutoRestore must not run against a non-empty DB
        const noop = await page.evaluate(() => window.DbSnapshot.maybeAutoRestore(window.__test.getApp()));
        if (noop !== false) {
            console.error('maybeAutoRestore should be a no-op with existing projects');
            await browser.close();
            process.exit(7);
        }

        console.log('unit-db-snapshot test passed.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('unit-db-snapshot test failed:', err && err.message ? err.message : err);
        try { console.error('stack:', err.stack); } catch (e) { }
        await browser.close();
        process.exit(1);
    }
})();