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

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });

        // Wait for Generation to be available
        await page.waitForFunction(() => window.Generation && typeof window.Generation.buildPrompt === 'function', { timeout: 5000 });

        const beat = "She grabs her coat and steps into the rain.";
        const sceneContext = "Alice sat by the window, watching the streetlights.";
        const options = { povCharacter: 'Alice', pov: '1st person', tense: 'present', authorsNote: 'Keep a bleak, literary tone; slow sensory prose.' };

        // buildPrompt returns { messages, asString } — evaluate the string form
        // inside the browser since functions are not serialized by page.evaluate.
        const prompt = await page.evaluate(({ b, s, o }) => {
            const r = window.Generation.buildPrompt(b, s, o);
            if (!r || typeof r.asString !== 'function') {
                throw new Error('buildPrompt did not return the expected { messages, asString } result');
            }
            return r.asString();
        }, { b: beat, s: sceneContext, o: options });

        // A prose template containing {authorsNote} must place the note itself,
        // and suppress the automatic pre-beat injection (no double copy).
        const tokenPrompt = await page.evaluate(({ b, s, o }) => {
            const r = window.Generation.buildPrompt(b, s, { ...o, prosePrompt: 'Style direction: {authorsNote}' });
            return r.asString();
        }, { b: beat, s: sceneContext, o: options });

        // Flow builder must inject the note too, and it renders {authorsNote} in
        // its prose template (which it previously did not render at all).
        const flowPrompt = await page.evaluate(({ b, s, o }) => {
            return window.Generation.buildFlowPrompt(b, s, o).asString();
        }, { b: beat, s: sceneContext, o: options });
        const flowTokenPrompt = await page.evaluate(({ b, s, o }) => {
            return window.Generation.buildFlowPrompt(b, s, { ...o, prosePrompt: 'Flow style: {authorsNote}' }).asString();
        }, { b: beat, s: sceneContext, o: options });

        console.log('Generated prompt preview (first 200 chars):', prompt.slice(0, 200).replace(/\n/g, '\\n'));

        const noteText = 'Keep a bleak, literary tone; slow sensory prose.';
        const noteCount = (prompt.match(/AUTHOR'S NOTE/g) || []).length;
        const checks = [
            { ok: prompt.includes('Alice'), msg: 'POV character not found' },
            { ok: prompt.includes('present tense'), msg: 'tense text not found' },
            { ok: prompt.includes('1st person'), msg: 'POV text not found' },
            { ok: prompt.includes('BEAT TO EXPAND') || prompt.includes('BEAT TO EXPAND:'), msg: 'beat marker missing' },
            { ok: prompt.includes('She grabs her coat'), msg: 'beat content not included' },
            { ok: noteCount === 1, msg: `Author's Note should be injected exactly once (found ${noteCount})` },
            { ok: prompt.includes(noteText), msg: 'Author\'s Note text not included' },
            { ok: prompt.indexOf(noteText) < prompt.indexOf('BEAT TO EXPAND'), msg: 'Author\'s Note must appear before the beat' },
            { ok: tokenPrompt.includes('Style direction: ' + noteText), msg: '{authorsNote} placeholder not rendered in prose template' },
            { ok: (tokenPrompt.match(/AUTHOR'S NOTE/g) || []).length === 0, msg: 'note injected twice when template has {authorsNote}' },
            { ok: (flowPrompt.match(/AUTHOR'S NOTE/g) || []).length === 1, msg: `Flow: Author's Note should be injected exactly once (found ${(flowPrompt.match(/AUTHOR'S NOTE/g) || []).length})` },
            { ok: flowPrompt.includes(noteText), msg: 'Flow: Author\'s Note text not included' },
            { ok: flowPrompt.indexOf(noteText) < flowPrompt.indexOf('Continue the story'), msg: 'Flow: Author\'s Note must appear before the continue instruction' },
            { ok: flowTokenPrompt.includes('Flow style: ' + noteText), msg: 'Flow: {authorsNote} placeholder not rendered in prose template' },
            { ok: (flowTokenPrompt.match(/AUTHOR'S NOTE/g) || []).length === 0, msg: 'Flow: note injected twice when template has {authorsNote}' }
        ];

        const failed = checks.filter(c => !c.ok);
        if (failed.length > 0) {
            console.error('Unit test failed:');
            for (const f of failed) console.error(' -', f.msg);
            await browser.close();
            process.exit(2);
        }

        console.log('Generation.buildPrompt unit test passed.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('Unit test failed:', err.message || err);
        await browser.close();
        process.exit(1);
    }
})();
