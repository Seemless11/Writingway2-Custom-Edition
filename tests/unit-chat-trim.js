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
  // A startup dialog (e.g. update/backup notice) blocks Alpine unless handled
  page.on('dialog', async dialog => dialog.accept());

  try {
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

    const fail = (msg, code) => {
      console.error('unit-chat-trim FAILED:', msg);
      browser.close();
      process.exit(code);
    };

    // Seed a project so chat context resolution works
    await page.evaluate(async () => {
      const proj = await window.__test.seedProject('ChatTrimTest');
      const chap = await window.__test.seedChapter(proj.id, 'Chapter 1');
      await window.__test.seedScene(proj.id, chap.id, 'Scene 1');
      await window.__test.selectProject(proj.id);
    });

    const prepare = await page.evaluate(() => {
      const app = window.__test.getApp();
      app.aiStatus = 'ready';
      app.aiMode = 'api';
      app.aiProvider = 'anthropic';
      app.aiModel = 'test-model';
      app.maxTokens = 10;
      app.chatCharacter = { id: 'char-trim-1', name: 'Mara' };
      app.chatCharacterId = 'char-trim-1';
      return true;
    });
    if (prepare !== true) fail('app not ready', 2);

    // ---- Test 1: natural stop that still ends mid-sentence is trimmed ----
    const result1 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      window.__chatCalls = 0;
      window.__originalFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          const text = 'She reached the door. Her hand shook as';
          const stop = 'end_turn';
          const encoder = new TextEncoder();
          const lines = [
            `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"${text}"}}`,
            `data: {"type":"message_delta","delta":{"stop_reason":"${stop}"}}`
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return app.chatCharacterMessages[1].content;
    });

    if (result1 !== 'She reached the door.') {
      fail(`test1 content not trimmed: ${JSON.stringify(result1)}`, 3);
    }
    console.log('chat trim test 1 passed (natural stop, mid-sentence ending trimmed).');

    // ---- Test 2: token-limit truncation retries in continue mode, final text trimmed ----
    const result2 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      // Call 1 is too short (below 60% of the target), call 2 continues and finishes cleanly
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          window.__chatCalls = (window.__chatCalls || 0) + 1;
          const call = window.__chatCalls;
          const text = call === 1 ? 'She reached the' : ' door. Her hand shook as';
          const stop = call === 1 ? 'max_tokens' : 'end_turn';
          const encoder = new TextEncoder();
          const lines = [
            `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"${text}"}}`,
            `data: {"type":"message_delta","delta":{"stop_reason":"${stop}"}}`
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return { content: app.chatCharacterMessages[1].content, calls: window.__chatCalls };
    });

    if (result2.content !== 'She reached the door.') {
      fail(`test2 final content not trimmed: ${JSON.stringify(result2.content)}`, 4);
    }
    if (result2.calls < 2) {
      fail(`test2 expected a continue retry, saw ${result2.calls} call(s)`, 5);
    }

    console.log('chat trim test 2 passed (too-short -> continue retry -> final text trimmed).');

    // ---- Test 3: complete multi-paragraph reply ending with a newline is preserved ----
    const result3 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      const text = 'Mara looked up.\n\n"You are back," she said softly.\n';
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          const encoder = new TextEncoder();
          const lines = [
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}`,
            'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}'
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return app.chatCharacterMessages[1].content;
    });

    if (result3 !== 'Mara looked up.\n\n"You are back," she said softly.') {
      fail(`test3 lost output, got: ${JSON.stringify(result3)}`, 6);
    }
    console.log('chat trim test 3 passed (complete reply with trailing newline preserved).');

    // ---- Test 4: adequate-length natural stop does NOT re-stream (chain bug) ----
    const result4 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      window.__chatCalls = 0;
      const text = 'She reached the door and pulled it open. It creaked softly in the quiet hall.';
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          window.__chatCalls = (window.__chatCalls || 0) + 1;
          const encoder = new TextEncoder();
          const lines = [
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}`,
            'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}'
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return { content: app.chatCharacterMessages[1].content, calls: window.__chatCalls };
    });

    if (result4.calls !== 1) {
      fail(`test4 expected exactly 1 stream call, saw ${result4.calls}`, 7);
    }
    if (result4.content !== 'She reached the door and pulled it open. It creaked softly in the quiet hall.') {
      fail(`test4 content altered: ${JSON.stringify(result4.content)}`, 8);
    }
    console.log('chat trim test 4 passed (adequate reply streams exactly once, no auto-continue).');

    // ---- Test 5: continuation that re-emits the narrative header is stripped ----
    const result5 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      window.__chatCalls = 0;
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          window.__chatCalls = (window.__chatCalls || 0) + 1;
          const call = window.__chatCalls;
          const text = call === 1
            ? 'She reached the door. Her'
            : "[Mara's response narrative]\nShe pulled it open and stepped through.";
          const stop = call === 1 ? 'max_tokens' : 'end_turn';
          const encoder = new TextEncoder();
          const lines = [
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}`,
            `data: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: stop } })}`
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return { content: app.chatCharacterMessages[1].content, calls: window.__chatCalls };
    });

    if (result5.calls < 2) {
      fail(`test5 expected a continue retry, saw ${result5.calls} call(s)`, 9);
    }
    if (result5.content.includes("[Mara's response narrative]")) {
      fail(`test5 duplicate narrative header not stripped: ${JSON.stringify(result5.content)}`, 10);
    }
    if (!result5.content.endsWith('stepped through.')) {
      fail(`test5 final content wrong: ${JSON.stringify(result5.content)}`, 11);
    }
    console.log('chat trim test 5 passed (duplicate narrative header stripped from continuation).');

    // ---- Test 6: chatAutoTrim=false keeps output exactly as streamed ----
    const result6 = await page.evaluate(async () => {
      const app = window.__test.getApp();
      app.chatAutoTrim = false;
      app.chatCharacterMessages = [
        { role: 'user', content: 'Hello.', name: 'You' },
        { role: 'assistant', content: '', name: 'Mara' }
      ];
      window.__chatCalls = 0;
      const text = 'She reached the door. Her hand shook as';
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('api.anthropic.com')) {
          window.__chatCalls = (window.__chatCalls || 0) + 1;
          const encoder = new TextEncoder();
          const lines = [
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}`,
            'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}'
          ];
          const stream = new ReadableStream({
            start(controller) {
              for (const l of lines) controller.enqueue(encoder.encode(l + '\n'));
              controller.close();
            }
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
        return window.__originalFetch(url, opts);
      };
      await window.ChatMode._generateAssistantResponse(app, 1);
      return { content: app.chatCharacterMessages[1].content, calls: window.__chatCalls };
    });

    if (result6.content !== 'She reached the door. Her hand shook as') {
      fail(`test6 trim not disabled: ${JSON.stringify(result6.content)}`, 12);
    }
    if (result6.calls !== 1) {
      fail(`test6 expected 1 stream call with trim off, saw ${result6.calls}`, 13);
    }
    console.log('chat trim test 6 passed (chatAutoTrim=false keeps raw output).');
    console.log('unit-chat-trim test passed.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('unit-chat-trim test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();