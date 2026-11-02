const { chromium } = require('playwright');
const path = require('path');

// SSE chunk builders for an OpenAI-compatible stream.
const sse = (delta, finish = null) => 'data: ' + JSON.stringify({
    id: 'x',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'm',
    choices: [{ index: 0, delta, finish_reason: finish }]
}) + '\n\n';
const DONE = 'data: [DONE]\n\n';
const rContent = (t) => ({ content: t });
const rReasoningContent = (t) => ({ reasoning_content: t }); // DeepSeek/QwQ style
const rReasoning = (t) => ({ reasoning: t, reasoning_details: [{ type: 'reasoning.text', text: t }] }); // Together/DeepInfra style
const rEmptySentinel = () => ({ content: '', reasoning: '', reasoning_details: [] });

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
  page.on('dialog', async dialog => dialog.accept());

  try {
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.app-container, .welcome-screen', { timeout: 10000 });

    const fail = (msg, code) => {
      console.error('unit-reasoning FAILED:', msg);
      browser.close();
      process.exit(code);
    };

    // Seed a project and configure the app for an OpenAI-compatible provider.
    await page.evaluate(async () => {
      const proj = await window.__test.seedProject('ReasoningTest');
      const chap = await window.__test.seedChapter(proj.id, 'Chapter 1');
      await window.__test.seedScene(proj.id, chap.id, 'Scene 1');
      await window.__test.selectProject(proj.id);
      const app = window.__test.getApp();
      app.aiStatus = 'ready';
      app.aiMode = 'api';
      app.aiProvider = 'openai';
      app.aiModel = 'deepseek-v4.1-flash';
      app.aiApiKey = 'test-key';
      app.maxTokens = 300;
      app.reasoningEffort = 'low';
      app.reasoningBudget = 4000;
    });

    // Serve SSE rounds from a queue and record every request body (JSON).
    // rounds: Array<Array<string>> where each inner array is one stream's chunks.
    const installStub = async (page, rounds, urlPart = 'api.openai.com') => {
      await page.evaluate(({ rounds, urlPart }) => {
        if (!window.__originalFetch) window.__originalFetch = window.fetch;
        window.__reqBodies = [];
        const encoder = new TextEncoder();
        let last = [];
        window.fetch = async (url, opts) => {
          if (typeof url === 'string' && url.includes(urlPart)) {
            try { if (opts && opts.body) window.__reqBodies.push(JSON.parse(opts.body)); } catch (e) { }
            const payload = rounds.length > 0 ? (last = rounds.shift()) : last;
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
      }, { rounds, urlPart });
    };

    const setModel = async (page, model) => {
      await page.evaluate((model) => { const app = window.__test.getApp(); app.aiModel = model; }, model);
    };

    const resetScene = async (page) => {
      await page.evaluate(async () => {
        const app = window.__test.getApp();
        app.currentScene.content = '';
        await app.saveScene();
      });
    };

    const waitForGenActions = async (page) => {
      await page.waitForFunction(() => {
        const app = window.__test.getApp();
        return app && app.showGenActions === true;
      }, { timeout: 8000 });
    };

    // ---- Provider effort mapping: each family has its own vocabulary, and an
    // unsupported level must fall back to the lowest accepted one rather than
    // returning HTTP 400.
    const maps = await page.evaluate(() => {
      const g = window.Generation;
      return {
        o3Off: g.openAiReasoningEffort('o3-mini', 'off'),
        g52Off: g.openAiReasoningEffort('gpt-5.2', 'off'),
        g5Off: g.openAiReasoningEffort('gpt-5-mini', 'off'),
        g5Minimal: g.openAiReasoningEffort('gpt-5-mini', 'minimal'),
        g61Off: g.openAiReasoningEffort('gpt-6.1-sol', 'off'),
        g6AstraOff: g.openAiReasoningEffort('gpt-6-astra', 'off'),
        g52Minimal: g.openAiReasoningEffort('gpt-5.2', 'minimal'),
        auto: g.openAiReasoningEffort('gpt-5.2', 'auto'),
        claudeOff: g.anthropicEffortFor('off'),
        claudeMedium: g.anthropicEffortFor('medium'),
        adaptiveNew: g.isAdaptiveClaudeModel('claude-sonnet-5'),
        adaptiveOld: g.isAdaptiveClaudeModel('claude-3-5-sonnet-20241022'),
        rejectSampling: g.claudeRejectsSamplingParams('claude-opus-4-7'),
        allowSampling46: g.claudeRejectsSamplingParams('claude-sonnet-4-6'),
        gem3ProMedium: g.geminiThinkingLevelFor('gemini-3-pro-preview', 'medium'),
        gem38Medium: g.geminiThinkingLevelFor('gemini-3.8-flash', 'medium'),
        gem3Off: g.geminiThinkingLevelFor('gemini-3.1-pro-preview', 'off')
      };
    });
    const mapExpect = {
      o3Off: 'low', g52Off: 'none', g5Off: 'none', g5Minimal: 'minimal', g61Off: 'low',
      g6AstraOff: 'minimal', g52Minimal: 'none', auto: null,
      claudeOff: 'low', claudeMedium: 'medium',
      adaptiveNew: true, adaptiveOld: false,
      rejectSampling: true, allowSampling46: false,
      gem3ProMedium: 'high', gem38Medium: 'medium', gem3Off: 'low'
    };
    for (const [key, expected] of Object.entries(mapExpect)) {
      if (maps[key] !== expected) fail(`effort mapping ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(maps[key])}`, 30);
    }
    console.log('effort mapping passed: OpenAI families, Claude effort/sampling, Gemini 3 levels.');

    // ---- Scenario A: reasoning (reasoning_content) then content, natural stop.
    // Reasoning must NOT leak into prose; a Thinking… status must appear then clear;
    // the detected reasoning model gets a separate reasoning allowance on top of
    // the prose budget and an explicit low-effort reasoning control.
    await installStub(page, [
      [
        ': OPENROUTER keep-alive comment\n',
        'event: message\n',
        sse(rReasoningContent(' Let me think about')),
        sse(rReasoningContent(' what happens next')),
        sse(rContent(' She ran')),
        sse(rContent(' away.')),
        sse(rEmptySentinel(), 'stop'),
        DONE
      ]
    ]);
    await page.evaluate(async () => {
      const app = window.__test.getApp();
      window.__genStatusLog = [];
      app.$watch('genStatus', v => window.__genStatusLog.push(v));
    });
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    let s = await page.evaluate(() => {
      const app = window.__test.getApp();
      return {
        lastGenText: app.lastGenText,
        lastGenTruncated: app.lastGenTruncated,
        genStatus: app.genStatus,
        genStatusLog: window.__genStatusLog,
        reqBodies: window.__reqBodies
      };
    });
    if (s.lastGenText !== ' She ran away.') fail(`scenario A: reasoning leaked or content wrong, got: ${JSON.stringify(s.lastGenText)}`, 2);
    if ((s.lastGenText || '').includes('Let me think')) fail('scenario A: reasoning_content leaked into visible prose', 3);
    if (!s.genStatusLog.includes('Thinking…')) fail('scenario A: Thinking… status never shown, log: ' + JSON.stringify(s.genStatusLog), 4);
    if (s.genStatus === 'Thinking…') fail('scenario A: Thinking… status not cleared after content', 5);
    if (s.lastGenTruncated !== false) fail('scenario A: natural stop must not set lastGenTruncated', 6);
    if (s.reqBodies.length !== 1) fail(`scenario A: expected 1 request, got ${s.reqBodies.length}`, 7);
    // 300 words -> 750 prose tokens + 4000 reasoning allowance.
    if (s.reqBodies[0].max_completion_tokens !== 4750) fail(`scenario A: reasoning budget should be 4750 max_completion_tokens, got ${JSON.stringify(s.reqBodies[0].max_completion_tokens)}`, 8);
    if (s.reqBodies[0].max_tokens !== undefined) fail('scenario A: max_tokens must not be sent to OpenAI reasoning models', 9);
    if (s.reqBodies[0].reasoning_effort !== 'low') fail(`scenario A: reasoning_effort should default to low, got ${JSON.stringify(s.reqBodies[0].reasoning_effort)}`, 17);
    if (s.reqBodies[0].min_tokens !== undefined) fail('scenario A: min_tokens is an OpenRouter-only parameter', 18);
    if (!s.reqBodies[0].stream_options || s.reqBodies[0].stream_options.include_usage !== true) fail('scenario A: OpenAI streams must request usage', 19);
    console.log('scenario A passed: reasoning hidden, Thinking… status, separate reasoning budget.');

    // ---- Scenario B: reasoning (reasoning/reasoning_details) + short content +
    // length. Auto-resume must be skipped (only one request), truncated flagged.
    await resetScene(page);
    await setModel(page, 'deepseek-v4.1-flash');
    await installStub(page, [
      [
        sse(rReasoning(' I should check the weather first')),
        sse(rContent(' She ran away.')),
        sse(rEmptySentinel(), 'length'),
        DONE
      ]
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await page.evaluate(() => {
      const app = window.__test.getApp();
      return {
        lastGenText: app.lastGenText,
        lastGenTruncated: app.lastGenTruncated,
        reqCount: window.__reqBodies.length
      };
    });
    if (s.lastGenText !== ' She ran away.') fail(`scenario B: reasoning leaked via reasoning/reasoning_details, got: ${JSON.stringify(s.lastGenText)}`, 10);
    if (s.reqCount !== 1) fail(`scenario B: reasoning starvation must NOT auto-resume (expected 1 request, got ${s.reqCount})`, 11);
    if (s.lastGenTruncated !== true) fail('scenario B: length finish must set lastGenTruncated', 12);
    console.log('scenario B passed: reasoning starvation skips auto-resume.');

    // ---- Scenario C: NON-reasoning model, mid-sentence length -> auto-resume
    // must still work (two requests), and no headroom is added.
    await resetScene(page);
    await setModel(page, 'gpt-4o-mini');
    await installStub(page, [
      [
        sse(rContent(' She ran away. And then she')),
        sse(rEmptySentinel(), 'length'),
        DONE
      ],
      [
        sse(rContent(' out the door.')),
        sse(rEmptySentinel(), 'stop'),
        DONE
      ]
    ]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await page.evaluate(() => {
      const app = window.__test.getApp();
      return {
        lastGenText: app.lastGenText,
        lastGenTruncated: app.lastGenTruncated,
        reqCount: window.__reqBodies.length,
        firstMaxTokens: window.__reqBodies[0] ? window.__reqBodies[0].max_tokens : null
      };
    });
    if (s.reqCount !== 2) fail(`scenario C: non-reasoning truncation must resume (expected 2 requests, got ${s.reqCount})`, 13);
    if (s.lastGenText !== ' She ran away. And then she out the door.') fail(`scenario C: resume text wrong, got: ${JSON.stringify(s.lastGenText)}`, 14);
    if (s.lastGenTruncated !== false) fail('scenario C: completed resume must clear lastGenTruncated', 15);
    if (s.firstMaxTokens !== 750) fail(`scenario C: non-reasoning max_tokens should be 750, got ${s.firstMaxTokens}`, 16);
    console.log('scenario C passed: non-reasoning resume intact, no headroom.');

    // ---- Scenario D: Anthropic. The system prompt must travel in the
    // top-level `system` field (a system role inside messages is rejected with
    // a 400), and the final cumulative usage must be reported without
    // double-counting the message_start/message_delta pair.
    await resetScene(page);
    await page.evaluate(() => {
      const app = window.__test.getApp();
      app.aiProvider = 'anthropic';
      app.aiModel = 'claude-3-5-sonnet-20241022';
      app.lastGenUsage = null;
    });
    const anth = (obj) => 'data: ' + JSON.stringify(obj) + '\n\n';
    await installStub(page, [[
      anth({ type: 'message_start', message: { usage: { input_tokens: 25, output_tokens: 1 } } }),
      anth({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' She ran away.' } }),
      anth({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 42 } }),
      anth({ type: 'message_stop' })
    ]], 'api.anthropic.com');
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await page.evaluate(() => {
      const app = window.__test.getApp();
      return {
        lastGenText: app.lastGenText,
        usage: app.lastGenUsage,
        body: window.__reqBodies[0]
      };
    });
    if (s.lastGenText !== ' She ran away.') fail(`scenario D: anthropic text wrong, got: ${JSON.stringify(s.lastGenText)}`, 20);
    if (!s.body || typeof s.body.system !== 'string' || !s.body.system.includes('creative writing assistant')) {
      fail('scenario D: system prompt must be top-level, got: ' + JSON.stringify(s.body && s.body.system), 21);
    }
    if (!Array.isArray(s.body.messages) || s.body.messages.some(m => m.role === 'system')) {
      fail('scenario D: messages must not contain a system role', 22);
    }
    if (s.body.min_tokens !== undefined) fail('scenario D: Anthropic rejects min_tokens', 23);
    if (!s.usage) fail('scenario D: usage was not captured', 24);
    else {
      if (s.usage.completionTokens !== 42) fail(`scenario D: completion tokens must be the final 42, got ${s.usage.completionTokens}`, 25);
      if (s.usage.promptTokens !== 25) fail(`scenario D: prompt tokens should be 25, got ${s.usage.promptTokens}`, 26);
    }
    console.log('scenario D passed: Anthropic system hoisted, no min_tokens, usage captured once.');

    // ---- Scenario E: Claude Sonnet 5 (adaptive thinking on by default).
    // Must get reasoning headroom, `output_config.effort`, and no sampling
    // parameters (4.7+ rejects non-default temperature with a 400).
    await resetScene(page);
    await page.evaluate(() => {
      const app = window.__test.getApp();
      app.aiProvider = 'anthropic';
      app.aiModel = 'claude-sonnet-5';
      app.reasoningEffort = 'off';
      app.lastGenUsage = null;
    });
    await installStub(page, [[
      anth({ type: 'message_start', message: { usage: { input_tokens: 30, output_tokens: 1 } } }),
      anth({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' She ran away.' } }),
      anth({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 20 } }),
      anth({ type: 'message_stop' })
    ]], 'api.anthropic.com');
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);

    s = await page.evaluate(() => ({ body: window.__reqBodies[0] }));
    if (!s.body) fail('scenario E: no Anthropic request captured', 31);
    if (!s.body.output_config || s.body.output_config.effort !== 'low') {
      fail('scenario E: Claude "off" must fall back to effort low, got ' + JSON.stringify(s.body.output_config), 32);
    }
    if (s.body.temperature !== undefined || s.body.top_p !== undefined || s.body.top_k !== undefined) {
      fail('scenario E: Claude 4.7+ must not receive sampling parameters', 33);
    }
    // 300 words -> 750 prose + 4000 reasoning allowance.
    if (s.body.max_tokens !== 4750) fail(`scenario E: Claude 5 headroom should be 4750, got ${s.body.max_tokens}`, 34);
    console.log('scenario E passed: Claude 5 effort low, headroom, no sampling params.');

    // ---- Scenario F: OpenAI GPT-5.2 "off" -> reasoning_effort "none".
    await resetScene(page);
    await page.evaluate(() => {
      const app = window.__test.getApp();
      app.aiProvider = 'openai';
      app.aiModel = 'gpt-5.2';
      app.reasoningEffort = 'off';
    });
    await installStub(page, [[
      sse(rContent(' She ran away.')),
      sse(rEmptySentinel(), 'stop'),
      DONE
    ]]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);
    s = await page.evaluate(() => window.__reqBodies[0]);
    if (!s || s.reasoning_effort !== 'none') fail(`scenario F: GPT-5.2 off should send none, got ${JSON.stringify(s && s.reasoning_effort)}`, 35);
    if (s.max_completion_tokens !== 4750) fail(`scenario F: GPT-5.2 should use max_completion_tokens, got ${s.max_completion_tokens}`, 36);

    // ---- Scenario G: OpenAI o3-mini cannot disable reasoning -> "low".
    await resetScene(page);
    await page.evaluate(() => {
      const app = window.__test.getApp();
      app.aiModel = 'o3-mini';
      app.reasoningEffort = 'off';
    });
    await installStub(page, [[
      sse(rContent(' She ran away.')),
      sse(rEmptySentinel(), 'stop'),
      DONE
    ]]);
    await page.evaluate(async () => { await window.__test.triggerGenerate('She runs out the door.'); });
    await waitForGenActions(page);
    s = await page.evaluate(() => window.__reqBodies[0]);
    if (!s || s.reasoning_effort !== 'low') fail(`scenario G: o3-mini off must fall back to low, got ${JSON.stringify(s && s.reasoning_effort)}`, 37);
    console.log('scenario F/G passed: OpenAI off maps to none when supported, low otherwise.');

    console.log('unit-reasoning test passed: reasoning isolation, status, headroom, resume guard.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('unit-reasoning test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(1);
  }
})();
