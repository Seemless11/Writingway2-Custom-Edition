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

        // Wait for ChatMode to be available
        await page.waitForFunction(() => window.ChatMode && typeof window.ChatMode.buildCharacterPrompt === 'function', { timeout: 5000 });

        const characterMode = await page.evaluate(async () => {
            const fakeApp = {
                currentProject: null,
                chatCharacter: {
                    name: 'Elara',
                    description: 'A fire mage with silver hair.',
                    personality: 'Warm but guarded.',
                    scenario: 'A rainy tavern in the capital.',
                    systemPrompt: 'CHARACTER_SYSTEM_PROMPT_MARKER',
                    examples: 'CHARACTER_EXAMPLES_MARKER',
                    firstMessage: ''
                },
                userPersona: { name: 'Alex', description: 'A weary traveler.' },
                chatResponseMode: 'character',
                chatCharacterMessages: [
                    { role: 'assistant', content: 'The door creaks open. "You look half-drowned," Elara says.' },
                    { role: 'user', content: 'Rain does that.' },
                    { role: 'assistant', content: 'She slides a mug toward you. "Then drink."' }
                ],
                maxTokens: 300,
                language: 'English',
                activeWorldEntry: null,
                activeScenarioEntry: null
            };
            const messages = await window.ChatMode.buildCharacterPrompt(fakeApp, 'impersonate');
            return {
                systemContent: messages[0]?.content || '',
                rest: messages.slice(1).map(m => ({ role: m.role, content: m.content }))
            };
        });

        const sys = characterMode.systemContent;
        const checks = [
            { ok: sys.includes('You are Alex, the user in this conversation.'), msg: 'system prompt does not set the persona as the speaker' },
            { ok: !sys.includes('You are Elara.'), msg: 'system prompt still speaks as the character' },
            { ok: sys.includes('writing style, tone, vocabulary'), msg: 'style-matching instruction missing' },
            { ok: sys.includes('Do NOT continue, extend, or repeat the last message'), msg: 'no-continue instruction missing' },
            { ok: sys.includes('Write approximately 150 words'), msg: 'length-aware target missing (maxTokens 300 -> 150)' },
            { ok: !sys.includes('CHARACTER_SYSTEM_PROMPT_MARKER'), msg: 'character system prompt should be excluded for impersonation' },
            { ok: !sys.includes('CHARACTER_EXAMPLES_MARKER'), msg: 'character example dialogue should be excluded for impersonation' },
            { ok: !sys.includes('RESPONSE LENGTH REQUIREMENTS'), msg: 'hard length requirements should not apply to impersonation' },
            { ok: !sys.includes('Always refer to the user'), msg: 'refer-to-user instruction should not apply to impersonation' },
            { ok: characterMode.rest.length === 3 && characterMode.rest[1].role === 'user' && characterMode.rest[1].content === 'Rain does that.', msg: 'chat history not passed through' }
        ];

        // Case: the last message belongs to the persona — impersonation must write a
        // new follow-up message instead of continuing it.
        const lastUserCase = await page.evaluate(async () => {
            const fakeApp = {
                currentProject: null,
                chatCharacter: {
                    name: 'Elara',
                    description: 'A fire mage with silver hair.',
                    personality: '',
                    scenario: '',
                    systemPrompt: '',
                    examples: '',
                    firstMessage: ''
                },
                userPersona: { name: 'Alex', description: '' },
                chatResponseMode: 'character',
                chatCharacterMessages: [
                    { role: 'assistant', content: 'Then drink.' },
                    { role: 'user', content: 'Thanks.' }
                ],
                maxTokens: 200,
                language: 'English',
                activeWorldEntry: null,
                activeScenarioEntry: null
            };
            const messages = await window.ChatMode.buildCharacterPrompt(fakeApp, 'impersonate');
            return messages[0]?.content || '';
        });
        checks.push({ ok: lastUserCase.includes('do not continue it'), msg: 'user-last follow-up instruction missing' });
        checks.push({ ok: lastUserCase.includes('Write approximately 100 words'), msg: 'length-aware target wrong for maxTokens 200' });

        const narrativeMode = await page.evaluate(async () => {
            const fakeApp = {
                currentProject: null,
                chatCharacter: {
                    name: 'Elara',
                    description: 'A fire mage with silver hair.',
                    personality: 'Warm but guarded.',
                    scenario: '',
                    systemPrompt: '',
                    examples: '',
                    firstMessage: ''
                },
                userPersona: { name: 'Alex', description: 'A weary traveler.' },
                chatResponseMode: 'narrative',
                chatCharacterMessages: [
                    { role: 'assistant', content: 'Elara studies the stranger by the fire.' }
                ],
                maxTokens: 300,
                language: 'English',
                activeWorldEntry: null,
                activeScenarioEntry: null
            };
            const messages = await window.ChatMode.buildCharacterPrompt(fakeApp, 'impersonate');
            return messages[0]?.content || '';
        });
        checks.push({ ok: narrativeMode.includes('third-person narrative prose'), msg: 'narrative mode variant missing' });

        const failed = checks.filter(c => !c.ok);
        if (failed.length > 0) {
            console.error('Unit test failed:');
            for (const f of failed) console.error(' -', f.msg);
            console.error('System prompt was:', sys.slice(0, 600));
            await browser.close();
            process.exit(2);
        }

        console.log('ChatMode.buildCharacterPrompt impersonate unit test passed.');
        await browser.close();
        process.exit(0);
    } catch (err) {
        console.error('Unit test failed:', err.message || err);
        await browser.close();
        process.exit(1);
    }
})();