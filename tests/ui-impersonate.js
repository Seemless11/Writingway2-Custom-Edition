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
    // The app shows a confirm() when opened via file:// — accept it so init continues
    page.on('dialog', dialog => dialog.accept());

    // Helper executed inside the browser: resolves the live Alpine app data.
    // Different Alpine versions expose it differently.
    const appData = `(() => {
        const el = document.querySelector('[x-data="app"]');
        if (!el) return null;
        if (el.__x && el.__x.$data) return el.__x.$data;
        return el._x_dataStack ? el._x_dataStack[0] : null;
    })()`;

    try {
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });

        // Wait for ChatMode, db, and the initialized app component
        await page.waitForFunction(() => {
            return window.ChatMode && window.db && (() => {
                const el = document.querySelector('[x-data="app"]');
                return el && (el.__x || (el._x_dataStack && el._x_dataStack.length > 0));
            })();
        });

        // Seed a character card entry
        await page.evaluate(async () => {
            const existing = await window.db.compendium.get('char_test_imp');
            if (existing) return;
            await window.db.compendium.add({
                id: 'char_test_imp',
                projectId: '__chat_global__',
                category: 'characters',
                title: 'Elara',
                body: '## Description\nA fire mage with silver hair.\n\n## Personality\nWarm but guarded.\n\n## First Message\n"Welcome. State your business."',
                tags: ['imported', 'sillytavern'],
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            });
        });

        // Stub streaming and capture the prompt
        await page.evaluate(() => {
            window.__impersonateCapturedPrompt = null;
            window.Generation.streamGeneration = async (prompt, onToken, app, signal) => {
                window.__impersonateCapturedPrompt = JSON.stringify(prompt);
                const tokens = ['I', ' step', ' closer', ',', ' boots', ' echoing', '.'];
                for (const t of tokens) {
                    if (signal && signal.aborted) break;
                    await new Promise(r => setTimeout(r, 25));
                    try { onToken(t); } catch (e) { }
                }
                return { finishReason: 'stop' };
            };
        });

        // Select the character through ChatMode
        await page.evaluate(async (appExpr) => {
            const app = eval(appExpr);
            await window.ChatMode.loadCharacterRoster(app);
            const entry = await window.db.compendium.get('char_test_imp');
            await window.ChatMode.selectCharacter(app, entry);
        }, appData);

        // Chat should be open with the greeting as the only message
        await page.waitForFunction((appExpr) => {
            const data = eval(appExpr);
            return data.chatCharacter && data.chatCharacterMessages.length === 1;
        }, appData);

        // 1) Quick Impersonate button
        const btn = await page.$('.chat-quick-btn');
        if (!btn) {
            throw new Error('Quick Impersonate button not found');
        }
        await btn.click();

        // Wait for the impersonated user message to stream fully and finish
        await page.waitForFunction((appExpr) => {
            const data = eval(appExpr);
            const msgs = data.chatCharacterMessages;
            return msgs.length === 2 && msgs[1].role === 'user' && msgs[1].content.includes('echoing') && !data.chatCharacterIsGenerating;
        }, appData);

        const afterButton = await page.evaluate((appExpr) => {
            const data = eval(appExpr);
            const msgs = data.chatCharacterMessages;
            return {
                count: msgs.length,
                roles: msgs.map(m => m.role),
                names: msgs.map(m => m.name),
                lastContent: msgs[1].content,
                generating: data.chatCharacterIsGenerating
            };
        }, appData);

        const checks = [
            { ok: afterButton.count === 2, msg: 'impersonation should not auto-create an assistant reply' },
            { ok: afterButton.roles[1] === 'user', msg: 'impersonated message is not a user message' },
            { ok: afterButton.names[1] === 'You', msg: 'impersonated message missing persona name' },
            { ok: afterButton.lastContent.includes('echoing'), msg: 'impersonated content not streamed into the user message' },
            { ok: !afterButton.generating, msg: 'generating flag left on after impersonation' }
        ];

        // 2) /impersonate slash command
        await page.fill('.chat-input-textarea', '/impersonate');
        await page.press('.chat-input-textarea', 'Enter');

        await page.waitForFunction((appExpr) => {
            const data = eval(appExpr);
            const msgs = data.chatCharacterMessages;
            return msgs.length === 3 && msgs[2].role === 'user' && msgs[2].content.includes('echoing') && !data.chatCharacterIsGenerating;
        }, appData);

        const afterSlash = await page.evaluate((appExpr) => {
            const data = eval(appExpr);
            const msgs = data.chatCharacterMessages;
            return {
                count: msgs.length,
                roles: msgs.map(m => m.role),
                input: data.chatCharacterInput
            };
        }, appData);
        checks.push({ ok: afterSlash.count === 3 && afterSlash.roles[2] === 'user', msg: '/impersonate did not produce a user message' });
        checks.push({ ok: afterSlash.input === '', msg: 'input not cleared after slash command' });

        // 3) The prompt used for impersonation should instruct writing as the persona
        const prompt = JSON.parse(await page.evaluate(() => window.__impersonateCapturedPrompt || 'null'));
        checks.push({ ok: Array.isArray(prompt) && prompt[0]?.role === 'system' && String(prompt[0].content).includes('You are You, the user in this conversation.'), msg: 'impersonate system prompt missing' });
        checks.push({ ok: String(prompt[0].content).includes('writing style, tone, vocabulary'), msg: 'impersonate style-matching instruction missing' });

        // 4) No auto-reply: the only assistant message should be the initial greeting
        const finalState = await page.evaluate((appExpr) => {
            const msgs = eval(appExpr).chatCharacterMessages;
            return { count: msgs.length, roles: msgs.map(m => m.role) };
        }, appData);
        checks.push({ ok: finalState.count === 3, msg: 'extra message appeared after impersonation' });
        checks.push({ ok: finalState.roles.filter(r => r === 'assistant').length === 1, msg: 'auto assistant reply was generated after impersonation' });

        const failed = checks.filter(c => !c.ok);
        if (failed.length > 0) {
            console.error('UI test failed:');
            for (const f of failed) console.error(' -', f.msg);
            await browser.close();
            process.exit(3);
        }

        console.log('UI impersonate test passed: button and /impersonate command produce user messages, no auto-reply.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('UI impersonate test failed:', err && err.message ? err.message : err);
        await browser.close();
        process.exit(1);
    }
})();