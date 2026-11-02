// Character card multi-import test
// Verifies: multiple files imported in one picker, per-file failures skipped,
// duplicate names skipped, embedded lorebooks batch-imported via one confirm.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

    // Record alerts; accept confirms (to exercise the combined lorebook import)
    const alerts = [];
    page.on('dialog', async dialog => {
        if (dialog.type() === 'confirm') {
            dialog.accept();
        } else {
            alerts.push(dialog.message());
            dialog.accept();
        }
    });

    // Build sample card files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww2-cc-'));

    // Build a minimal PNG with a 'ccv3' tEXt chunk holding base64 of a UTF-8 card JSON
    function buildCardPng(card) {
        const b64 = Buffer.from(JSON.stringify(card), 'utf8').toString('base64');
        const chunk = (type, data) => {
            const len = Buffer.alloc(4);
            len.writeUInt32BE(data.length);
            return Buffer.concat([len, Buffer.from(type, 'ascii'), data, Buffer.alloc(4)]);
        };
        const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        const ihdr = chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]));
        const text = Buffer.concat([Buffer.from('ccv3\0', 'ascii'), Buffer.from(b64, 'ascii')]);
        const texT = chunk('tEXt', text);
        return Buffer.concat([sig, ihdr, texT, chunk('IEND', Buffer.alloc(0))]);
    }
    const aliceBook = {
        name: 'alice_book',
        entries: [
            { keys: ['alice'], content: 'Alice owns a magnifying glass.' },
            { keys: ['diary'], content: 'Alice keeps a diary under her bed.' }
        ]
    };
    const aliceCard = {
        spec: 'chara_card_v2', spec_version: '2.0',
        data: {
            name: 'Alice',
            description: 'A cautious detective.',
            personality: 'Observant',
            scenario: 'City noir',
            first_mes: 'Hello, I am Alice.',
            composer: { description: '', character_book: aliceBook }
        }
    };
    const bobCard = { name: 'Bob', description: 'A cheerful baker.', first_mes: 'Fresh bread!' };
    const dupCard = JSON.parse(JSON.stringify(aliceCard));
    const brokenCard = '{ this is not valid json !!!';

    const files = [
        path.join(tmpDir, 'alice.json'),
        path.join(tmpDir, 'bob.json'),
        path.join(tmpDir, 'alice-dup.json'),
        path.join(tmpDir, 'broken.json')
    ];
    fs.writeFileSync(files[0], JSON.stringify(aliceCard));
    fs.writeFileSync(files[1], JSON.stringify(bobCard));
    fs.writeFileSync(files[2], JSON.stringify(dupCard));
    fs.writeFileSync(files[3], brokenCard);

    // PNG card with non-ASCII text (NBSP + accents) to catch UTF-8 mojibake
    const zoeCard = {
        spec: 'chara_card_v2', spec_version: '2.0',
        data: {
            name: 'Zoë',
            description: 'A café\u00A0owner from München.',
            first_mes: 'Hello, I am Zoë from the café\u00A0on Hauptstraße.'
        }
    };
    const pngPath = path.join(tmpDir, 'zoe.png');
    fs.writeFileSync(pngPath, buildCardPng(zoeCard));

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

        // Seed project and select it so we run in project mode
        const proj = await page.evaluate(async () => await window.__test.seedProject('CCImport'));
        const selected = await page.evaluate(async (pid) => {
            const app = window.__test.getApp();
            if (!app) throw new Error('app not ready');
            await app.selectProject(pid);
            return { pid: app.currentProject?.id, name: app.currentProject?.name };
        }, proj.id);
        if (!selected || selected.pid !== proj.id) {
            console.error('Project selection failed:', selected);
            await browser.close();
            process.exit(2);
        }

        // Trigger import with multiple files via the file chooser
        const alertCountBefore = alerts.length;
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 10000 }),
            page.evaluate(() => window.__test.getApp().importCharacterCard())
        ]);
        if (!chooser.isMultiple()) {
            console.error('File input does not allow multiple files');
            await browser.close();
            process.exit(3);
        }
        await chooser.setFiles(files);

        // Wait for the lorebook alert + batch summary alert
        for (let i = 0; i < 200; i++) {
            if (alerts.length >= alertCountBefore + 2) break;
            await page.waitForTimeout(50);
        }

        // Verify DB state: 2 characters (Alice + Bob), 2 lore entries from embedded book
        const result = await page.evaluate(async (pid) => {
            const all = await db.compendium.where('projectId').equals(pid).toArray();
            return {
                titles: all.filter(e => e.category === 'characters').map(e => e.title).sort(),
                lore: all.filter(e => e.category === 'lore').map(e => e.title).sort()
            };
        }, proj.id);

        console.log('Compendium state:', JSON.stringify(result));
        console.log('Summary alerts:', JSON.stringify(alerts.slice(alertCountBefore)));

        const expectedChars = ['Alice', 'Bob'];
        const charsOk = result.titles.length === expectedChars.length &&
            expectedChars.every(t => result.titles.includes(t));
        const loreOk = result.lore.length === 2;
        const summary = alerts.slice(alertCountBefore).join('\n');
        const summaryOk = /Imported 2 characters/.test(summary) &&
            /1 skipped/.test(summary) && /duplicate/i.test(summary) &&
            /1 failed/.test(summary);

        if (!charsOk) { console.error('Unexpected character entries:', result.titles); await browser.close(); process.exit(4); }
        if (!loreOk) { console.error('Unexpected lore entries:', result.lore); await browser.close(); process.exit(5); }
        if (!summaryOk) { console.error('Unexpected summary:', summary); await browser.close(); process.exit(6); }

        // --- Phase 2: PNG card import must not corrupt UTF-8 text ---
        const alertCountBefore2 = alerts.length;
        const [chooser2] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 10000 }),
            page.evaluate(() => window.__test.getApp().importCharacterCard())
        ]);
        await chooser2.setFiles([pngPath]);

        // Wait for the PNG import summary alert
        for (let i = 0; i < 200; i++) {
            if (alerts.length >= alertCountBefore2 + 1) break;
            await page.waitForTimeout(50);
        }

        const zoe = await page.evaluate(async (pid) => {
            const all = await db.compendium.where('projectId').equals(pid).toArray();
            const z = all.find(e => e.title === 'Zoë');
            return z ? { title: z.title, body: z.body } : null;
        }, proj.id);
        if (!zoe) { console.error('PNG card "Zoë" was not imported'); await browser.close(); process.exit(7); }
        if (zoe.title.includes('Â')) { console.error('Mojibake in imported PNG card title:', zoe.title); await browser.close(); process.exit(8); }
        if (zoe.body.includes('Â')) { console.error('Mojibake in imported PNG card body:', zoe.body); await browser.close(); process.exit(9); }
        if (!zoe.body.includes('A café owner from München.')) { console.error('PNG card description corrupted:', zoe.body); await browser.close(); process.exit(10); }
        if (!zoe.body.includes('Hello, I am Zoë from the café on Hauptstraße.')) { console.error('PNG card first message corrupted:', zoe.body); await browser.close(); process.exit(11); }
        console.log('PNG card UTF-8 import OK:', JSON.stringify({ title: zoe.title, body: zoe.body }));

        console.log('unit-charactercard-import test passed.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('unit-charactercard-import test failed:', err && err.message ? err.message : err);
        console.log('Alerts so far:', JSON.stringify(alerts));
        await browser.close();
        process.exit(1);
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { }
    }
})();