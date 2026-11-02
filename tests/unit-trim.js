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
  page.on('pageerror', err => { console.error('PAGE ERROR', err && err.stack ? err.stack : (err && err.message ? err.message : err)); });
  // A startup dialog (e.g. update/backup notice) blocks Alpine unless handled
  page.on('dialog', async dialog => dialog.accept());

  try {
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

    const fail = (msg, code) => {
      console.error('unit-trim FAILED:', msg);
      browser.close();
      process.exit(code);
    };

    // ---- Unit cases for Editor.trimIncompleteEnding ----
    const cases = [
      // [input, expected]
      ['You\'ll do as I say. And you\'ll refrain from singing unless"', 'You\'ll do as I say.'],
      ['She opened the door.', 'She opened the door.'],
      ['He shouted, "Stop!"', 'He shouted, "Stop!"'],
      ['He said, "Go." Then she ran fast', 'He said, "Go."'],
      ['She trailed off...', 'She trailed off...'],
      ['And then—', 'And then—'],
      ['First para complete.\n\nSecond para cut off midway', 'First para complete.'],
      ['The door creaked open slowly', 'The door creaked open slowly'],
      ['She sang. "Stop it, unless', 'She sang.'],
      ['Go away." Then she ran fast', 'Go away."'],
      ['', ''],
      // Regression: complete responses ending with trailing newlines must
      // NOT lose their last paragraph via the paragraph-break fallback
      ['Mara looked up.\n\n"You are back," she said softly.\n', 'Mara looked up.\n\n"You are back," she said softly.'],
      ['Mara tilted her head. "You are serious?"\n', 'Mara tilted her head. "You are serious?"'],
      // Regression: trailing blank lines after a mid-sentence ending still trim
      ['She reached the door. Her hand shook as\n\n', 'She reached the door.'],
      ['P1 complete.\n\nP2 starts here but ends mid-senten\n', 'P1 complete.'],
      // Regression: unrecognized endings must NOT delete whole paragraphs
      ['She paused. She reached for the handle and said: the time is now:', 'She paused. She reached for the handle and said: the time is now:'],
      ['"I mean it," she said. *she met his eyes*', '"I mean it," she said. *she met his eyes*'],
      ['She closed the book.\n\nShe set it aside and stared out the window at the rain falling on the empty street without seeing any of it and thought about the letter', 'She closed the book.\n\nShe set it aside and stared out the window at the rain falling on the empty street without seeing any of it and thought about the letter'],
      ['她轻轻推开了门。', '她轻轻推开了门。'],
      // CJK: incomplete tail with no spaces (Han boundary) is trimmed
      ['她说了句：我马上来。然后她跑出门', '她说了句：我马上来。'],
      ['她说：「外面下雨了。」然后她望向窗', '她说：「外面下雨了。」'],
      // CJK: tail ending in a comma is not mid-word -> kept
      ['她说完。她站在那里，', '她说完。她站在那里，'],
      // CJK: meaningful multi-sentence tail > 60 chars -> kept
      ['她轻轻推开门。她站在原地，望着窗外，想起了很久以前那个夏天的傍晚，他们一起在海边看日落时说的那些话，还有那天晚上满天都是星星，他们说了很多很多的话，直到夜深了都不舍得回去休息', '她轻轻推开门。她站在原地，望着窗外，想起了很久以前那个夏天的傍晚，他们一起在海边看日落时说的那些话，还有那天晚上满天都是星星，他们说了很多很多的话，直到夜深了都不舍得回去休息'],
      // Regression: compact ASCII with no space after the terminator is NOT
      // treated as a sentence boundary (preserves previous behavior)
      ['He stopped.Then she left', 'He stopped.Then she left']
    ];

    const unitResults = await page.evaluate((caseList) => {
      const trim = window.Editor.trimIncompleteEnding;
      return caseList.map(([input, expected]) => ({ input, expected, actual: trim(input), ok: trim(input) === expected }));
    }, cases);

    let unitFail = false;
    for (const r of unitResults) {
      if (!r.ok) {
        unitFail = true;
        console.error(`  trim(${JSON.stringify(r.input)}) => ${JSON.stringify(r.actual)} (expected ${JSON.stringify(r.expected)})`);
      }
    }
    if (unitFail) fail('trimIncompleteEnding unit cases', 2);
    console.log('trimIncompleteEnding unit cases passed.');

    // ---- Integration: truncation + trimming behavior in the editor ----
    await page.evaluate(async () => {
      const proj = await window.__test.seedProject('TrimTest');
      const chap = await window.__test.seedChapter(proj.id, 'Chapter 1');
      await window.__test.seedScene(proj.id, chap.id, 'Scene 1');
      await window.__test.selectProject(proj.id);
      const app = window.__test.getApp();
      app.aiStatus = 'ready';
      app.aiMode = 'api';
      app.aiProvider = 'anthropic';
      app.aiModel = 'test-model';
    });

    // Install an Anthropic-style SSE stub that serves a queue of rounds, one per
    // fetch. This drives truncation -> continuation chains deterministically.
    // rounds: [[ [textDeltas...], stopReason ], ...]
    const installStreamStub = async (page, rounds) => {
      await page.evaluate((rounds) => {
        if (!window.__originalFetch) window.__originalFetch = window.fetch;
        const encoder = new TextEncoder();
        const queue = rounds.map(([deltas, stopReason]) => {
          const payload = deltas.map(t =>
            'data: ' + JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: t } }) + '\n');
          payload.push('data: ' + JSON.stringify({ type: 'message_delta', delta: { stop_reason: stopReason } }) + '\n');
          return payload;
        });
        let last = [];
        window.fetch = async (url, opts) => {
          if (typeof url === 'string' && url.includes('api.anthropic.com')) {
            const payload = queue.length > 0 ? (last = queue.shift()) : last;
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
      }, rounds);
    };

    const resetScene = async (page) => {
      await page.evaluate(async () => {
        const app = window.__test.getApp();
        app.currentScene.content = '';
        await app.saveScene();
      });
    };

    const snapshot = async (page) => {
      return await page.evaluate(() => {
        const app = window.__test.getApp();
        return { content: app.currentScene.content, truncated: app.lastGenTruncated, trimmed: app.lastGenTrimmed, lastGenText: app.lastGenText };
      });
    };

    const waitForGenActions = async (page) => {
      await page.waitForFunction(() => {
        const app = window.__test.getApp();
        return app && app.showGenActions === true;
      }, { timeout: 8000 });
    };

    // ---- Scenario 1: truncated 3x, tiny dangling tail -> trimmed ----
    await installStreamStub(page, [
      [[' She', ' ran', ' away', '. And', ' then', ' she'], 'max_tokens'],
      [[' out', ' the'], 'max_tokens'],
      [[' door'], 'max_tokens']
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    let s = await snapshot(page);
    // Exact match: the trimmed tail must not be duplicated at the end.
    if (s.content !== ' She ran away.') fail(`scene not trimmed exactly, got: ${JSON.stringify(s.content.slice(-60))}`, 3);
    if (s.truncated !== true) fail('lastGenTruncated not set', 4);
    if (s.trimmed !== true) fail('lastGenTrimmed not set when a tiny fragment was removed', 5);
    if (s.lastGenText !== ' She ran away.') fail(`lastGenText not trimmed in memory, got: ${JSON.stringify(s.lastGenText)}`, 12);

    // Alpine applies x-show asynchronously, so wait for the hint to render
    await page.waitForFunction(() => (document.body.innerText || '').includes('cut off'), { timeout: 3000 });

    // Accept must clear the truncated flag
    await page.evaluate(async () => { await window.__test.getApp().acceptGeneration(); });
    const afterAccept = await page.evaluate(() => window.__test.getApp().lastGenTruncated);
    if (afterAccept !== false) fail('lastGenTruncated not cleared on accept', 6);

    // ---- Scenario 2: truncated 3x, large dangling fragment -> kept ----
    await resetScene(page);
    await installStreamStub(page, [
      [[' She', ' ran', ' away', '. They talked about the weather and planned their weekend trip to the lake'], 'max_tokens'],
      [[' and'], 'max_tokens'],
      [[' more'], 'max_tokens']
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await snapshot(page);
    if (s.content !== ' She ran away. They talked about the weather and planned their weekend trip to the lake and more') {
      fail(`large dangling fragment must be kept, got: ${JSON.stringify(s.content.slice(-60))}`, 7);
    }
    if (s.truncated !== true) fail('lastGenTruncated not set on truncated generation', 8);
    if (s.trimmed !== false) fail('lastGenTrimmed must be false when a large fragment is kept', 9);

    // Alpine applies x-show asynchronously, so wait for the "kept" hint to render
    await page.waitForFunction(() => (document.body.innerText || '').includes('incomplete ending kept'), { timeout: 3000 });

    // ---- Scenario 3: truncated mid-sentence, resume finishes it ----
    await resetScene(page);
    await installStreamStub(page, [
      [[' She', ' ran', ' away', '. She pushed at his shoulders, a gentle but firm directive, and he rolled off her, landing on his back beside'], 'max_tokens'],
      [[' her on the mattress.'], 'end_turn']
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await snapshot(page);
    const expected3 = ' She ran away. She pushed at his shoulders, a gentle but firm directive, and he rolled off her, landing on his back beside her on the mattress.';
    if (s.content !== expected3) fail(`resume must finish the sentence, got: ${JSON.stringify(s.content.slice(-80))}`, 14);
    if (s.truncated !== false) fail('resume completion must clear lastGenTruncated', 15);
    if (s.trimmed !== false) fail('resume completion must not set lastGenTrimmed', 16);

    // ---- Scenario 4: natural stop mid-sentence -> kept, never edited ----
    await resetScene(page);
    await installStreamStub(page, [
      [[' She', ' ran', ' away', '. And', ' then', ' she'], 'end_turn']
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await snapshot(page);
    if (s.content !== ' She ran away. And then she') fail(`natural stop must not be edited, got: ${JSON.stringify(s.content.slice(-60))}`, 10);
    if (s.truncated !== false) fail('natural stop must not set lastGenTruncated', 11);
    if (s.trimmed !== false) fail('natural stop must not set lastGenTrimmed', 13);

    console.log('unit-trim test passed: helper cases + truncation/trimming editor behavior.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('unit-trim test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();