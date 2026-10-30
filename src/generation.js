// Generation helpers module
// Exposes window.Generation with:
// - buildPrompt(beat, sceneContext, options) => string
// - streamGeneration(prompt, onToken(token)) => Promise<void>
(function () {
    // Provider-aware hint for the generic generation failure alert.
    function generationErrorHint(app) {
        if (app?.aiProvider === 'koboldcpp') {
            return 'Check that KoboldCpp is running and a model is loaded.';
        }
        if (app?.aiMode === 'local') {
            return 'Make sure llama-server is running.';
        }
        return 'Check your AI provider connection and settings.';
    }

    // Finish reasons that mean the provider ran out of output budget. Providers
    // disagree on the exact string (OpenAI/OpenRouter "length", Anthropic
    // "max_tokens", Google "MAX_TOKENS", some gateways "max_output_tokens"),
    // and missing one made the app treat a chopped stream as a finished scene.
    const LENGTH_FINISH_REASONS = new Set([
        'length', 'max_tokens', 'max_output_tokens',
        'max_completion_tokens', 'model_length', 'token_limit'
    ]);

    function isTruncated(result) {
        const fr = String(result?.finishReason || '').toLowerCase();
        return LENGTH_FINISH_REASONS.has(fr);
    }

    function countWords(text) {
        const t = String(text || '').trim();
        if (!t) return 0;
        return t.split(/\s+/).filter(Boolean).length;
    }

    // Extra output budget reserved for chain-of-thought. 4000 is enough for the
    // short reasoning pass a prose task needs; it is a ceiling, not a spend.
    const DEFAULT_REASONING_ALLOWANCE = 4000;

    /**
     * Human-readable length instruction shared by every prompt builder.
     * A range is far more reliable than "at least N words": models routinely
     * stopped at ~60% of the target, or rambled until they hit the token cap.
     * @param {number} words - Target word count
     * @returns {string}
     */
    function lengthInstructionFor(words) {
        const target = Math.max(1, Math.round(Number(words) || 300));
        const min = Math.max(1, Math.round(target * 0.9));
        const max = Math.max(min + 1, Math.round(target * 1.2));
        return `about ${target} words (${min}-${max} words)`;
    }

    /**
     * Best-effort reasoning-model detection from the model id. Used only to add
     * output headroom and to decide whether a reasoning-effort control can be
     * sent; a false positive costs nothing because max_tokens is a ceiling.
     * @param {string} model
     * @returns {boolean}
     */
    // Rough context window per model family (tokens). Used to cap max_tokens
    // so that prompt + max_tokens <= context_window.
    const MODEL_CONTEXT_WINDOWS = {
        // OpenAI
        'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4.1': 128000, 'gpt-4.1-mini': 128000, 'gpt-4.1-nano': 128000,
        'gpt-5': 400000, 'gpt-5-mini': 400000, 'gpt-5-nano': 400000,
        'gpt-5.1': 400000, 'gpt-5.2': 400000, 'gpt-5.2-pro': 400000,
        'gpt-6': 1048576, 'gpt-6.1-sol': 1048576, 'gpt-6-astra': 1048576,
        'o1': 200000, 'o1-mini': 128000, 'o3-mini': 200000, 'o4-mini': 200000,
        // Anthropic
        'claude-3.5': 200000, 'claude-3.5-sonnet': 200000, 'claude-3.5-haiku': 200000, 'claude-3.5-opus': 200000,
        'claude-4': 200000, 'claude-4.5': 200000, 'claude-4.6': 200000, 'claude-4.7': 200000, 'claude-4.8': 200000,
        'claude-5': 200000, 'claude-5.5': 200000,
        'claude-sonnet-5': 200000, 'claude-opus-5': 200000, 'claude-haiku-5': 200000,
        'claude-fable': 200000, 'claude-mythos': 200000,
        // Google
        'gemini-2.5': 1048576, 'gemini-2.5-pro': 1048576, 'gemini-2.5-flash': 1048576, 'gemini-2.5-flash-lite': 1048576,
        'gemini-3': 1048576, 'gemini-3.1': 1048576, 'gemini-3.5': 1048576, 'gemini-3.8': 1048576, 'gemini-4': 1048576,
        // DeepSeek
        'deepseek': 128000, 'deepseek-v3': 128000, 'deepseek-v4': 128000, 'deepseek-r1': 128000,
        // Qwen
        'qwen': 131072, 'qwen-3': 131072,
        // Other
        'kimi': 128000, 'grok': 131072, 'glm': 128000,
        // Default fallback
        'default': 32768
    };

    function getModelContextWindow(model) {
        if (!model) return MODEL_CONTEXT_WINDOWS.default;
        const m = String(model).toLowerCase();
        // Try exact match first
        for (const [key, window] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
            if (key === 'default') continue;
            if (m.includes(key)) return window;
        }
        // Family fallbacks
        if (m.includes('gpt-5') || m.includes('gpt-6')) return 400000;
        if (m.includes('gpt-4') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 128000;
        if (m.includes('claude')) return 200000;
        if (m.includes('gemini')) return 1048576;
        if (m.includes('deepseek')) return 128000;
        if (m.includes('qwen')) return 131072;
        if (m.includes('kimi') || m.includes('grok') || m.includes('glm')) return 128000;
        return MODEL_CONTEXT_WINDOWS.default;
    }

    function estimatePromptTokens(messages) {
        // Rough estimation: ~4 chars per token for English text
        let totalChars = 0;
        for (const msg of messages) {
            if (msg.content) totalChars += String(msg.content).length;
            if (msg.system) totalChars += String(msg.system).length;
        }
        return Math.ceil(totalChars / 4);
    }

    function isReasoningModel(model) {
        if (!model) return false;
        const m = String(model).toLowerCase();
        // OpenAI o-series: o1, o3-mini, o4-mini, ...
        if (/(^|[/:])o[1-9]([-_.]|$)/.test(m)) return true;
        // Claude 4.6+ / 5.x: adaptive thinking is on by default from Claude 5
        // onward, so these need the same headroom as any other thinking model.
        if (isAdaptiveClaudeModel(m)) return true;
        return (
            m.includes('reasoning') ||
            m.includes('thinking') ||
            m.includes('thought') ||
            m.includes('qwq') ||
            m.includes('magistral') ||
            m.includes('deepseek-reasoner') ||
            /deepseek[-_.]?r1/.test(m) ||
            /deepseek.*v[34]/.test(m) ||
            /qwen[-_.]?3/.test(m) ||
            m.includes('kimi-k2-thinking') ||
            m.includes('k2-thinking') ||
            /glm[-_.]?(4\.[5-9]|z1)/.test(m) ||
            m.includes('minimax-m2') ||
            /grok[-_.]?[34]/.test(m) ||
            /gemini[-_.]?[23](\.\d)?/.test(m) ||
            /gpt[-_.]?[5-9]/.test(m)
        );
    }

    /**
     * Claude models with adaptive thinking support (4.6 and later, plus the
     * Fable/Mythos families). These accept `output_config.effort`; the rarer
     * extended-thinking models (4.5 and older) do not, so they are excluded.
     * @param {string} model
     * @returns {boolean}
     */
    function isAdaptiveClaudeModel(model) {
        if (!model) return false;
        const m = String(model).toLowerCase();
        if (!m.includes('claude') && !/(^|[/:])(fable|mythos)/.test(m)) return false;
        if (/mythos[-_.]?preview/.test(m)) return true;
        return /(?:opus|sonnet|haiku|fable|mythos)[-_.]?(?:4[-_.](?:6|7|8)|5(?:[-_.]?\d+)*)/.test(m);
    }

    /**
     * Claude 4.7+ rejects non-default sampling parameters with a 400; the
     * default temperature (1.0) or omitting them is the only accepted option.
     * @param {string} model
     * @returns {boolean}
     */
    function claudeRejectsSamplingParams(model) {
        if (!model) return false;
        const m = String(model).toLowerCase();
        if (!m.includes('claude') && !/(^|[/:])(fable|mythos)/.test(m)) return false;
        if (/mythos[-_.]?preview/.test(m)) return true;
        return /(?:opus|sonnet|haiku|fable|mythos)[-_.]?(?:4[-_.](?:7|8)|5(?:[-_.]?\d+)*)/.test(m);
    }

    /**
     * Map the app's effort setting onto OpenAI's `reasoning_effort` vocabulary.
     * Support varies by family: o-series cannot disable, GPT-6.1 rejects both
     * `none` and `minimal`, and some GPT-6 models reject `none`. When a level is
     * unavailable we fall back to the lowest one the model accepts rather than
     * sending a value that returns 400.
     * @param {string} model
     * @param {string} setting
     * @returns {string|null} null means "omit the parameter"
     */
    function openAiReasoningEffort(model, setting) {
        const requested = String(setting || 'low').toLowerCase();
        if (requested === 'auto') return null;
        if (!['off', 'minimal', 'low', 'medium', 'high'].includes(requested)) return 'low';
        if (requested !== 'off' && requested !== 'minimal') return requested;

        const m = String(model || '').toLowerCase();
        // o1/o3 accept only low/medium/high.
        if (/(^|[/:])o[1-9]([-_.]|$)/.test(m)) return 'low';
        // GPT-6.1 Sol: no none, no minimal.
        if (/gpt[-_.]?6\.1/.test(m)) return 'low';

        const isGpt6Family = /gpt[-_.]?6/.test(m);
        const supportsNone = /gpt[-_.]?5/.test(m) ||
            (isGpt6Family && !/astra|6\.1/.test(m));
        // Only the original GPT-5 family (and GPT-6 Astra) still accept minimal.
        const supportsMinimal = /gpt[-_.]?5(?!\.[1-9])/.test(m) ||
            (isGpt6Family && !/6\.1/.test(m));

        if (requested === 'off') {
            return supportsNone ? 'none' : (supportsMinimal ? 'minimal' : 'low');
        }
        return supportsMinimal ? 'minimal' : (supportsNone ? 'none' : 'low');
    }

    /**
     * Map the effort setting onto Claude's `output_config.effort`. Models that
     * cannot disable thinking fall back to `low`, the lowest accepted level.
     * @param {string} setting
     * @returns {string|null}
     */
    function anthropicEffortFor(setting) {
        const s = String(setting || 'low').toLowerCase();
        if (s === 'auto') return null;
        if (s === 'medium') return 'medium';
        if (s === 'high') return 'high';
        return 'low';
    }

    /**
     * Map the effort setting onto Gemini 3's `thinkingLevel`. Not every model
     * accepts `minimal` or `medium` (the 3 Pro previews are low/high only), so
     * unavailable levels fall back to the nearest accepted one.
     * @param {string} model
     * @param {string} setting
     * @returns {string|null}
     */
    function geminiThinkingLevelFor(model, setting) {
        const s = String(setting || 'low').toLowerCase();
        if (s === 'auto') return null;
        if (s === 'off' || s === 'minimal' || s === 'low') return 'low';
        if (s === 'high') return 'high';
        // Gemini 3 Pro preview only accepts low/high.
        if (/gemini[-_.]?3[-_.]?pro[-_.]?preview/.test(String(model || '').toLowerCase())) return 'high';
        return 'medium';
    }

    /**
     * Output-token budget for a word target. Reasoning models get a separate
     * allowance because their thinking tokens share max_tokens with the prose;
     * without it a 300-word request could burn its entire cap before writing a
     * single visible word.
     * @param {number} wordTarget
     * @param {Object} app
     * @param {string} model
     * @returns {{ prose: number, reasoning: number, total: number }}
     */
    function outputTokenBudget(wordTarget, app, model) {
        const words = Math.max(1, Number(wordTarget) || 300);
        // ~2.5 tokens per requested word covers the usual overshoot (1.2x
        // words at ~1.5 tokens/word) with room to finish the last sentence.
        const prose = Math.ceil(words * 2.5);
        let reasoning = 0;
        if (isReasoningModel(model)) {
            const configured = Number(app?.reasoningBudget);
            reasoning = (Number.isFinite(configured) && configured >= 0)
                ? Math.round(configured)
                : DEFAULT_REASONING_ALLOWANCE;
        }
        return { prose, reasoning, total: Math.min(prose + reasoning, 128000) };
    }

    /**
     * Resolve the configured reasoning effort.
     * Values: 'auto' (send nothing), 'off', 'minimal', 'low', 'medium', 'high'.
     * @param {Object} app
     * @returns {string}
     */
    function reasoningEffortSetting(app) {
        const raw = String(app?.reasoningEffort || 'low').toLowerCase();
        const allowed = ['auto', 'off', 'minimal', 'low', 'medium', 'high'];
        return allowed.includes(raw) ? raw : 'low';
    }

    /**
     * Normalise provider usage payloads into one shape.
     * @param {Object|null} usage
     * @returns {Object|null}
     */
    function normalizeUsage(usage) {
        if (!usage || typeof usage !== 'object') return null;
        const details = usage.completion_tokens_details || usage.output_tokens_details || {};
        const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? null;
        const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? null;
        const reasoningTokens = details.reasoning_tokens ?? usage.native_tokens_reasoning ?? null;
        const totalTokens = usage.total_tokens ?? (
            promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null
        );
        const visibleTokens = (completionTokens !== null && reasoningTokens !== null)
            ? Math.max(0, completionTokens - reasoningTokens)
            : null;
        return { promptTokens, completionTokens, reasoningTokens, visibleTokens, totalTokens };
    }

    function mergeUsage(a, b) {
        if (!a) return b || null;
        if (!b) return a;
        const sum = (x, y) => (Number.isFinite(x) && Number.isFinite(y)) ? x + y : (Number.isFinite(x) ? x : y);
        return {
            promptTokens: sum(a.promptTokens, b.promptTokens),
            completionTokens: sum(a.completionTokens, b.completionTokens),
            reasoningTokens: sum(a.reasoningTokens, b.reasoningTokens),
            visibleTokens: sum(a.visibleTokens, b.visibleTokens),
            totalTokens: sum(a.totalTokens, b.totalTokens)
        };
    }

    function describeUsage(usage) {
        if (!usage) return '';
        const out = usage.completionTokens;
        const reason = usage.reasoningTokens;
        if (out === null || out === undefined) return '';
        if (!reason) return `${out} output tokens`;
        const pct = out > 0 ? Math.round((reason / out) * 100) : 0;
        return `${out} output tokens (${reason} reasoning, ${pct}%)`;
    }

    /**
     * Detect whether an OpenAI-compatible chunk's delta/message carries
     * chain-of-thought. Reasoning arrives in provider-specific fields:
     * reasoning_content (DeepSeek/QwQ), reasoning and reasoning_details
     * (Together/DeepInfra), thinking (various). Providers frequently echo empty
     * sentinels (reasoning: "" / reasoning_details: []) on normal content
     * chunks, so empty strings and empty arrays must NOT count as reasoning.
     * @param {Object|null} fields - data.choices[0].delta or .message
     * @returns {boolean} True when the chunk contains real reasoning content
     */
    function hasReasoningFields(fields) {
        if (!fields) return false;
        if (fields.reasoning_content) return true;
        if (fields.reasoning) return true;
        if (fields.thinking) return true;
        if (Array.isArray(fields.reasoning_details)) return fields.reasoning_details.length > 0;
        if (fields.reasoning_details) return true;
        return false;
    }

    /**
     * Remove a trailing incomplete sentence from the last generated chunk.
     * Called only after a truncated generation; edits both the in-memory
     * chunk (app.lastGenText) and the live scene content by removing exactly
     * the trailing characters that got cut.
     * @param {Object} app - Alpine app instance
     * @param {string} targetSceneId - Scene the generation was targeting
     */
    function trimTrailingIncomplete(app, targetSceneId) {
        if (!app.lastGenText || !window.Editor || typeof window.Editor.trimIncompleteEnding !== 'function') return;
        const original = app.lastGenText;
        const trimmed = window.Editor.trimIncompleteEnding(original);
        if (trimmed === original) return;
        const diff = original.length - trimmed.length;
        app.lastGenText = trimmed;
        if (app.currentScene?.id === targetSceneId && app.currentScene && app.currentScene.content && diff > 0) {
            const content = app.currentScene.content;
            // Only tail-remove when the generated chunk is still the exact suffix,
            // so text the user typed mid-generation is never touched.
            if (content.endsWith(original)) {
                app.currentScene.content = content.slice(0, content.length - diff);
            }
        }
    }

    function buildPrompt(beat, sceneContext, options = {}) {
        try {
            console.debug('[buildPrompt] received prosePrompt:', JSON.stringify(options.prosePrompt));
            console.debug('[buildPrompt] received systemPrompt:', JSON.stringify(options.systemPrompt));
        } catch (e) { /* ignore */ }

        const tenseMap = {
            'past': 'past tense',
            'present': 'present tense',
            'future': 'future tense',
            'past perfect': 'past perfect tense',
            'present perfect': 'present perfect tense'
        };

        // Build context with all placeholders using PromptRender
        const ctx = window.PromptRender?.buildContext
            ? window.PromptRender.buildContext(options.app, {
                genreIds: options.projectGenres,
                targetWords: options.maxTokens,
                pov: options.pov,
                povName: options.povCharacter,
                tense: options.tense,
                language: options.language
            })
            : null;

        const targetWords = options.maxTokens || 300;
        const lengthInstruction = lengthInstructionFor(targetWords);
        const genreSentence = ctx?.genres || '';
        const langText = options.language || 'English';
        const povName = (options.povCharacter && options.povCharacter.trim()) ? options.povCharacter.trim() : 'the protagonist';
        const tenseText = tenseMap[options.tense] || 'past tense';
        const povText = options.pov || '3rd person limited';

        // Resolve systemContent using PromptRender (if available) or manual fallback
        let systemPrompt;
        if (options.systemPrompt && typeof options.systemPrompt === 'string' && options.systemPrompt.trim()) {
            systemPrompt = window.PromptRender?.render
                ? window.PromptRender.render(options.systemPrompt.trim(), ctx || { length: lengthInstruction, pov: options.pov, povName: options.povCharacter, tense: tenseMap[options.tense] || 'past tense', language: langText, genres: genreSentence, genreLabels: ctx?.genreLabels || '' })
                : options.systemPrompt.trim()
                    .replace(/\{povName\}/gi, options.povCharacter || 'the protagonist')
                    .replace(/\{tense\}/gi, tenseMap[options.tense] || 'past tense')
                    .replace(/\{pov\}/gi, options.pov || '3rd person limited')
                    .replace(/\{length\}/gi, lengthInstruction)
                    .replace(/\{genres\}/gi, genreSentence)
                    .replace(/\{language\}/gi, langText);
        } else {
            systemPrompt = `${povName} / ${tenseText} / ${povText}${langText !== 'English' ? ` / ${langText}` : ''}${genreSentence} You are a creative writing assistant. The author provides a BEAT (what happens next) and you expand it into vivid, engaging prose. Write ${lengthInstruction} that bring the beat to life. Match the author's tone and style. Use sensory details. Show, don't tell.`;
        }

        // Ensure language directive is always present in the system prompt
        if (langText !== 'English') {
            systemPrompt += `\n\nWrite entirely in ${langText}.`;
        }

        let contextText = '';
        if (sceneContext && sceneContext.length > 0) {
            // Include the full scene context - modern models have large context windows
            contextText = `\n\nCURRENT SCENE SO FAR:\n${sceneContext}`;
        }

        // If a prose prompt template is provided, include it before the BEAT so the model can use it.
        // When `options.preview === true` we avoid adding explicit debug markers so the preview is cleaner.
        let proseTemplateText = '';
        if (options.prosePrompt && typeof options.prosePrompt === 'string' && options.prosePrompt.trim()) {
            const renderedProsePrompt = window.PromptRender?.render
                ? window.PromptRender.render(options.prosePrompt.trim(), ctx || { length: lengthInstruction, pov: options.pov, povName: options.povCharacter, tense: tenseText, language: langText, genres: genreSentence, genreLabels: ctx?.genreLabels || '' })
                : options.prosePrompt.trim()
                    .replace(/\{povName\}/gi, povName)
                    .replace(/\{tense\}/gi, tenseText)
                    .replace(/\{pov\}/gi, povText)
                    .replace(/\{length\}/gi, lengthInstruction)
                    .replace(/\{genres\}/gi, genreSentence ? genreSentence.trim() : '')
                    .replace(/\{language\}/gi, langText);
            if (options.preview) {
                proseTemplateText = `\n\n${renderedProsePrompt}`;
            } else {
                // Add explicit markers to make the template visible during debugging/inspection
                proseTemplateText = `\n\n--- PROMPT TEMPLATE START ---\n${renderedProsePrompt}\n--- PROMPT TEMPLATE END ---`;
            }
        }

        // If compendium entries are provided, include them as references before the BEAT.
        let compendiumText = '';
        if (options.compendiumEntries && Array.isArray(options.compendiumEntries) && options.compendiumEntries.length > 0) {
            compendiumText = '\n\nCOMPENDIUM REFERENCES:\n';
            for (const ce of options.compendiumEntries) {
                try {
                    const title = window.MacroUtils.stripSTMacros(ce.title || '') || ('entry ' + (ce.id || ''));
                    const body = window.MacroUtils.stripSTMacros(ce.body || ce.description || '') || ce.body || '';
                    compendiumText += `\n-- ${title} --\n${body}\n`;
                } catch (e) { console.warn('Skipped compendium entry in prompt:', e); }
            }
        }

        // If scene summaries are provided, include them as context before the BEAT.
        let sceneSummariesText = '';
        if (options.sceneSummaries && Array.isArray(options.sceneSummaries) && options.sceneSummaries.length > 0) {
            sceneSummariesText = '\n\nPREVIOUS SCENES:\n';
            for (const scene of options.sceneSummaries) {
                try {
                    const title = scene.title || 'Untitled Scene';
                    const summary = scene.summary || '';
                    if (summary) {
                        sceneSummariesText += `\n-- ${title} --\n${summary}\n`;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        let userContent = `${contextText}${proseTemplateText}`;
        if (compendiumText) {
            userContent += compendiumText;
        }
        if (sceneSummariesText) {
            userContent += sceneSummariesText;
        }

        // Strip mention tags from beat since they're already resolved and included above
        let cleanedBeat = beat;
        // Remove @[Title] compendium mentions
        cleanedBeat = cleanedBeat.replace(/@\[([^\]]+)\]/g, '');
        // Remove #[Title] scene mentions
        cleanedBeat = cleanedBeat.replace(/#\[([^\]]+)\]/g, '');
        // Clean up extra whitespace
        cleanedBeat = cleanedBeat.replace(/\s+/g, ' ').trim();

        // If the prompt template contains {length}, don't duplicate with our own instruction
        const proseHasLength = window.PromptRender?.hasLengthToken
            ? window.PromptRender.hasLengthToken(options.prosePrompt || '')
            : /\{length\}/i.test(options.prosePrompt || '');
        const appendLength = !proseHasLength;

        userContent += `\n\nBEAT TO EXPAND:\n${cleanedBeat}\n\n` + (appendLength ? `Write ${lengthInstruction} continuing from here:` : 'Continue from here.');

        // Return object with both messages array (for APIs) and string format (for local)
        const result = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            // Legacy string format for local models with chat template
            asString: function () {
                return `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userContent}<|im_end|>\n<|im_start|>assistant\n`;
            }
        };
        return result;
    }

    async function streamGeneration(prompt, onToken, app, abortSignal, opts = {}) {
        // Get AI settings from app if provided
        const aiMode = app?.aiMode || 'local';
        const aiProvider = app?.aiProvider || 'anthropic';
        const aiApiKey = app?.aiApiKey || '';
        const aiModel = app?.aiModel || '';
        const aiEndpoint = app?.aiEndpoint || 'http://localhost:8080';
        const useProviderDefaults = app?.useProviderDefaults || false;
        const hasPreset = aiModel && app?.modelPresets?.[aiModel];
        const preset = hasPreset ? app.modelPresets[aiModel] : {};
        const temperature = preset.temperature ?? app?.temperature ?? 0.8;
        const maxTokens = preset.maxTokens ?? app?.maxTokens ?? 300;
        const topP = preset.topP ?? app?.topP ?? 0.9;
        const topK = preset.topK ?? app?.topK ?? 40;
        const repetitionPenalty = preset.repetitionPenalty ?? app?.repetitionPenalty ?? 1.0;
        const frequencyPenalty = preset.frequencyPenalty ?? app?.frequencyPenalty ?? 0.0;
        const presencePenalty = preset.presencePenalty ?? app?.presencePenalty ?? 0.0;
        const minP = preset.minP ?? app?.minP ?? 0.0;
        const seed = app?.seed !== undefined ? app.seed : (preset.seed !== undefined ? preset.seed : null);

        // Convert prompt to appropriate format
        let promptStr = prompt;
        let messages = null;

        const usesStringPrompt = aiMode === 'local' || aiProvider === 'koboldcpp';

        if (typeof prompt === 'object' && prompt.messages) {
            // buildPrompt() result with messages and asString()
            messages = prompt.messages;
            if (usesStringPrompt) {
                // Use string format for local servers that take a plain text prompt
                promptStr = prompt.asString();
            }
        } else if (Array.isArray(prompt)) {
            // Raw messages array (e.g., from workshop chat)
            messages = prompt;
            if (usesStringPrompt) {
                // Convert messages array to ChatML format for local servers
                promptStr = messagesToChatML(messages);
            }
        }

        // Collect all non-default sampling params the caller configured; with no
        // preset, extraParams is empty and the settings below would otherwise be dropped.
        const extraParams = {};
        if (topP !== 0.9) extraParams.top_p = topP;
        if (topK !== 40) extraParams.top_k = topK;
        if (repetitionPenalty !== 1.0) extraParams.repeat_penalty = repetitionPenalty;
        if (frequencyPenalty !== 0.0) extraParams.frequency_penalty = frequencyPenalty;
        if (presencePenalty !== 0.0) extraParams.presence_penalty = presencePenalty;
        if (minP !== 0.0) extraParams.min_p = minP;
        if (seed !== null && seed !== undefined) extraParams.seed = seed;

        if (aiProvider === 'koboldcpp') {
            // KoboldCpp native KoboldAI API - uses a plain string prompt
            return await streamGenerationKobold(promptStr, onToken, aiEndpoint, temperature, maxTokens, useProviderDefaults, abortSignal, extraParams);
        }

        let result;
        if (aiMode === 'api') {
            // API Mode - use configured provider with messages
            result = await streamGenerationAPI(messages || promptStr, onToken, aiProvider, aiApiKey, aiModel, aiEndpoint, temperature, maxTokens, app, useProviderDefaults, abortSignal, extraParams, opts);
        } else {
            // Local Mode - use llama-server with string prompt
            result = await streamGenerationLocal(promptStr, onToken, aiEndpoint, temperature, maxTokens, useProviderDefaults, abortSignal, extraParams);
        }
        // Direct callers (chat mode, workshop) get the same usage telemetry as
        // the resume loop, so reasoning share is visible everywhere.
        if (app && result && result.usage) app.lastGenUsage = result.usage;
        return result;
    }

    /**
     * Convert messages array to ChatML format string
     * @param {Array} messages - Array of {role, content} objects
     * @returns {string} - Formatted ChatML string
     */
    function messagesToChatML(messages) {
        if (!Array.isArray(messages)) return '';

        let result = '';
        for (const msg of messages) {
            result += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
        }
        // Add assistant start tag for completion
        result += '<|im_start|>assistant\n';
        return result;
    }

    const CONTINUE_INSTRUCTION = 'Continue writing from exactly where you left off. Do not repeat anything that has already been written. Finish the current sentence, then stop at a natural ending point.';

    /**
     * Build a continuation prompt. Two cases:
     * - truncated: finish the sentence that got cut off.
     * - short: the model stopped of its own accord before reaching the word
     *   target, so ask for new prose that advances the scene.
     * @param {Object|Array|string} prompt - The original prompt passed to streamGeneration
     * @param {string} partialText - The text generated so far (app.lastGenText)
     * @param {Object} [opts]
     * @param {boolean} [opts.truncated=true] - Whether the last stream hit the cap
     * @param {number} [opts.remainingWords=0] - Words still needed for the target
     * @returns {Object|Array|string} - A continuation prompt in the same shape
     */
    function buildContinuePrompt(prompt, partialText, opts = {}) {
        const truncated = opts.truncated !== false;
        const remaining = Math.max(40, Math.round(Number(opts.remainingWords) || 0));
        const instruction = truncated
            ? CONTINUE_INSTRUCTION
            : `Continue the scene from exactly where it stopped. Do not repeat anything that has already been written. Add roughly ${remaining} more words of new prose that move the scene forward, then stop at a natural ending point.`;
        let messages = null;
        if (Array.isArray(prompt)) {
            messages = prompt;
        } else if (prompt && Array.isArray(prompt.messages)) {
            messages = prompt.messages;
        }
        if (messages) {
            const next = [
                ...messages,
                { role: 'assistant', content: partialText },
                { role: 'user', content: instruction }
            ];
            if (prompt && !Array.isArray(prompt)) {
                // Keep the buildPrompt() object shape so streamGeneration picks
                // .messages for API and .asString() for local servers.
                return { messages: next, asString: () => messagesToChatML(next) };
            }
            return next;
        }
        const str = typeof prompt === 'string' ? prompt : String(prompt);
        return str + '<|im_end|>\n<|im_start|>user\n' + instruction + '<|im_end|>\n<|im_start|>assistant\n';
    }

    /**
     * Stream a generation, continuing when the model hits the token limit
     * mid-sentence or stops well short of the word target. The partial text is
     * fed back as an assistant turn so the next stream extends it instead of
     * starting over. At most 3 streams total, and only while progress is made.
     * @param {Object|Array|string} prompt - The initial prompt
     * @param {Object} app - Alpine app instance
     * @param {Function} onToken - Token callback (same as streamGeneration)
     * @param {Object} [options]
     * @param {number} [options.targetWords] - Word target (defaults to app.maxTokens)
     * @returns {Promise<Object>} - Result of the final stream in the chain
     */
    async function streamGenerationWithResume(prompt, app, onToken, options = {}) {
        // Claim the current run id up front: if a newer generation starts
        // (run id bumps), this stale loop must exit instead of firing more
        // attempts into the wrong run.
        const myRun = app._genRunId;
        const targetWords = Math.max(1, Number(options.targetWords ?? app?.maxTokens) || 300);
        const minWords = Math.max(1, Math.round(targetWords * 0.8));
        // A wildly short reply (< 40% of target) means the model failed or the
        // request was cut short before it wrote anything useful; topping it up
        // only produces more of the same, so leave it for the user to retry.
        const topUpFloor = Math.round(targetWords * 0.4);
        const RESUME_MIN_WORDS = 60;
        const MAX_ATTEMPTS = 3;
        let currentPrompt = prompt;
        let result;
        let attempt = 0;
        let lastWordCount = 0;
        let usage = null;
        while (true) {
            attempt++;
            if (attempt > MAX_ATTEMPTS) break;
            // Stop must hold across resume attempts. A superseded run, a user
            // abort, or a nulled controller must never fire another request -
            // otherwise the generation becomes unstoppable (abort-vs-resolve
            // race, or an overlapping run's controller overwriting the slot).
            if (myRun !== undefined && myRun !== app._genRunId) break;
            if (app._genAbortLatched) break;
            if (!app.beatAbortController) break;
            if (attempt > 1 && app) {
                app.genStatus = isTruncated(result)
                    ? 'Hit token cap - continuing...'
                    : 'Extending to reach the target length...';
            }
            const signal = app.beatAbortController.signal;
            result = await streamGeneration(currentPrompt, onToken, app, signal, { continuation: attempt > 1 });
            usage = mergeUsage(usage, result?.usage);
            const text = app.lastGenText || '';
            const words = countWords(text);
            const truncated = isTruncated(result);

            // A reasoning model that hits the token cap has usually spent its
            // budget on chain-of-thought, not on prose. Auto-resuming would just
            // start another long thinking pass, so only continue when there is
            // substantial visible prose to finish (a genuine mid-sentence cut).
            if (truncated && result?.sawReasoning && words < RESUME_MIN_WORDS) {
                console.warn('⚠️ Reasoning model hit its token budget during thinking; skipping auto-resume.');
                break;
            }
            const needsTopUp = !truncated && words < minWords && words >= topUpFloor;
            if (!truncated && !needsTopUp) break;
            // No progress since the previous stream: another pass would only
            // repeat text (or spin forever), so stop here.
            if (words <= lastWordCount) break;
            lastWordCount = words;
            currentPrompt = buildContinuePrompt(currentPrompt, text, {
                truncated,
                remainingWords: Math.max(40, targetWords - words)
            });
        }
        if (usage) {
            result = { ...(result || {}), usage };
            if (app) app.lastGenUsage = usage;
            const summary = describeUsage(usage);
            if (summary) console.log('📊 Generation usage:', summary);
        }
        return result;
    }

    async function streamGenerationLocal(prompt, onToken, endpoint, temperature, maxTokens, useProviderDefaults, abortSignal, extraParams) {
        // Local llama-server completion
        const requestBody = {
            prompt: prompt,
            stop: ['<|im_end|>', '<|endoftext|>', '\n\n\n\n', 'USER:', 'HUMAN:'],
            stream: true
        };

        // Only include parameters if not using provider defaults
        if (!useProviderDefaults) {
            const tokenBudget = Math.round((maxTokens || 300) / 0.75 * 2);
            requestBody.n_predict = tokenBudget;
            requestBody.temperature = temperature || 0.8;
            if (extraParams) {
                if (extraParams.topP !== undefined) requestBody.top_p = extraParams.topP;
                if (extraParams.topK !== undefined) requestBody.top_k = extraParams.topK;
                if (extraParams.repetitionPenalty !== undefined) requestBody.repeat_penalty = extraParams.repetitionPenalty;
                if (extraParams.minP !== undefined) requestBody.min_p = extraParams.minP;
                if (extraParams.seed !== undefined) requestBody.seed = extraParams.seed;
            }
        }

        const response = await fetch(endpoint + '/completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortSignal
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                            onToken(data.content);
                        }
                        if (data.stop) {
                            return { finishReason: 'stop' };
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }
        }

        // Stream ended without explicit stop signal — likely hit n_predict token budget
        return { finishReason: 'length' };
    }

    async function streamGenerationKobold(prompt, onToken, endpoint, temperature, maxTokens, useProviderDefaults, abortSignal, extraParams) {
        // KoboldCpp native KoboldAI API streaming
        // Normalize endpoint: strip trailing slashes and any /api or /v1 paths
        let base = (endpoint || 'http://localhost:5001').replace(/\/+$/, '');
        base = base.replace(/(\/api|\/v1)(\/.*)?$/, '');

        const tokenBudget = Math.round((maxTokens || 300) / 0.75 * 2);
        const genparams = {
            prompt: prompt,
            max_length: tokenBudget,
            stop_sequence: ['<|im_end|>', '<|endoftext|>']
        };

        // Only include parameters if not using provider defaults
        if (!useProviderDefaults) {
            genparams.temperature = temperature || 0.8;
            if (extraParams) {
                if (extraParams.topP !== undefined) genparams.top_p = extraParams.topP;
                if (extraParams.topK !== undefined) genparams.top_k = extraParams.topK;
                if (extraParams.repetitionPenalty !== undefined) genparams.rep_pen = extraParams.repetitionPenalty;
                if (extraParams.minP !== undefined) genparams.min_p = extraParams.minP;
                if (extraParams.seed !== undefined) genparams.seed = extraParams.seed;
            }
        }

        // Stream from the KoboldAI SSE endpoint. If the server doesn't support
        // SSE streaming (older builds / 404), fall back to the non-streaming
        // /api/v1/generate endpoint and emit the result in chunks.
        let response = await fetch(base + '/api/extra/generate/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(genparams),
            signal: abortSignal
        });

        if (!response.ok) {
            response = await fetch(base + '/api/v1/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(genparams),
                signal: abortSignal
            });
        }

        if (!response.ok) {
            throw new Error(`KoboldCpp returned ${response.status}`);
        }

        // If the server answered with a complete JSON body instead of an SSE
        // stream, fall back to the non-streaming /api/v1/generate shape.
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            const text = data.results && data.results.length > 0 ? (data.results[0].text || '') : '';
            if (text) {
                const words = text.split(/(\s+)/);
                for (const word of words) {
                    onToken(word);
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for UI
                }
            }
            return { finishReason: 'stop' };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.token) {
                            onToken(data.token);
                        }
                        if (data.finish_reason) {
                            return { finishReason: data.finish_reason };
                        }
                    } catch (e) {
                        // ignore parse errors for incomplete chunks
                    }
                }
            }
        }

        // Stream ended without explicit stop signal — likely hit the token budget
        return { finishReason: 'length' };
    }

    async function streamGenerationAPI(prompt, onToken, provider, apiKey, model, customEndpoint, temperature, maxTokens, app, useProviderDefaults, abortSignal, extraParams = {}, opts = {}) {
        // API Mode - construct request based on provider
        let url, headers, body;

        // Convert prompt to messages if needed
        let messages;
        if (Array.isArray(prompt)) {
            messages = prompt;
        } else if (typeof prompt === 'string') {
            messages = [{ role: 'user', content: prompt }];
        } else {
            messages = [{ role: 'user', content: String(prompt) }];
        }

        const temp = temperature || 0.8;
        const rawWordTarget = maxTokens || 300;
        // Split the output budget into prose + reasoning. Reasoning tokens are
        // billed as output and count against max_tokens on almost every
        // provider, so sending only a prose-sized cap is what made a 300-word
        // request spend its entire budget thinking and return nothing.
        const budget = outputTokenBudget(rawWordTarget, app, model);
        let maxTok = budget.total;

        // Cap max_tokens to fit within the model's context window.
        // Large prompts (scene + compendium + summaries) can exceed the window,
        // leaving no room for output and causing immediate truncation.
        const contextWindow = getModelContextWindow(model);
        const promptTokens = estimatePromptTokens(messages);
        const safetyMargin = 1024; // buffer for response overhead
        const availableForOutput = Math.max(512, contextWindow - promptTokens - safetyMargin);
        if (maxTok > availableForOutput) {
            console.warn(`⚠️ Prompt too large (${promptTokens} tokens) for ${model}'s ${contextWindow} context window; capping max_tokens from ${maxTok} to ${availableForOutput}`);
            maxTok = availableForOutput;
        }

        // Check if user has explicitly forced non-streaming mode
        const userForcedNonStreaming = app?.forceNonStreaming || false;

        // Detect reasoning/thinking models. This is used to (a) add reasoning
        // headroom to max_tokens so chain-of-thought doesn't starve the visible
        // answer, (b) cap reasoning with the provider's own control when the
        // user picked an effort, and (c) skip pointless auto-resumes. It
        // deliberately does NOT force non-streaming — reasoning models stream
        // fine, and the JSON-content-type fallback below still handles
        // providers that return a complete response regardless of stream:true.
        const isThinkingModel = isReasoningModel(model);
        const effortSetting = reasoningEffortSetting(app);
        const wantsReasoningControl = Boolean(isThinkingModel) && effortSetting !== 'auto';
        // Provider-specific effort vocabularies differ; each branch maps the
        // shared setting onto the lowest level the selected model accepts when
        // the requested one is unavailable (e.g. "off" on a model that cannot
        // disable thinking).
        const openAiEffort = openAiReasoningEffort(model, effortSetting);

        const shouldDisableStreaming = userForcedNonStreaming;

        if (shouldDisableStreaming) {
            console.log('🔧 Non-streaming mode forced by user setting');
        } else if (isThinkingModel) {
            console.log('🧠 Reasoning model detected:', model,
                '- budget:', budget.prose, 'prose +', budget.reasoning, 'reasoning tokens',
                '(effort:', effortSetting + ')');
        }

        if (provider === 'openrouter') {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Writingway'
            };
            body = {
                model: model || 'google/gemini-2.5-flash',
                messages: messages,
                stream: !shouldDisableStreaming // Disable streaming for thinking models or if forced
            };
            // Always send max_tokens — output length is a deliberate user choice
            body.max_tokens = maxTok;
            // Reasoning counts against max_tokens: cap it at the source instead
            // of hoping the model stays brief.
            if (wantsReasoningControl) {
                body.reasoning = { effort: effortSetting === 'off' ? 'none' : effortSetting };
            }
            if (!opts.continuation) body.min_tokens = Math.round(rawWordTarget * 1.25);
            // Only include other parameters if not using provider defaults
            if (!useProviderDefaults) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        } else if (provider === 'anthropic') {
            url = 'https://api.anthropic.com/v1/messages';
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            };
            // Anthropic takes the system prompt as a top-level field; sending a
            // "system" role inside messages is rejected with a 400.
            const systemText = messages
                .filter(m => m && m.role === 'system')
                .map(m => m.content)
                .filter(Boolean)
                .join('\n\n');
            const convo = messages.filter(m => m && m.role !== 'system');
            body = {
                model: model || 'claude-3-5-sonnet-20241022',
                messages: convo,
                stream: true // Anthropic models all support streaming
            };
            if (systemText) body.system = systemText;
            // Anthropic requires max_tokens — always send it
            body.max_tokens = maxTok;
            // NOTE: min_tokens is not part of the Anthropic API and used to be
            // sent here, causing 400s on every request.
            // Claude 4.6+ supports effort; on models that cannot disable
            // thinking this falls back to "low". We never send an explicit
            // `thinking` block: 4.6-4.8 default to no thinking (which keeps
            // prose length predictable), and 5.x thinks adaptively anyway.
            if (wantsReasoningControl) {
                const effort = anthropicEffortFor(effortSetting);
                if (effort) body.output_config = { effort };
            }
            // Claude 4.7+ rejects non-default temperature/top_p/top_k with 400.
            if (!useProviderDefaults && !claudeRejectsSamplingParams(model)) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.topK !== undefined) body.top_k = extraParams.topK;
            }
        } else if (provider === 'openai') {
            url = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            // o-series / GPT-5 replaced max_tokens with max_completion_tokens and
            // reject temperature/penalties other than their defaults.
            const usesCompletionTokens = isThinkingModel;
            body = {
                model: model || 'gpt-4o-mini',
                messages: messages,
                stream: !shouldDisableStreaming // Disable streaming for thinking models or if forced
            };
            if (usesCompletionTokens) {
                body.max_completion_tokens = maxTok;
                if (wantsReasoningControl && openAiEffort) body.reasoning_effort = openAiEffort;
            } else {
                body.max_tokens = maxTok;
            }
            if (!shouldDisableStreaming) body.stream_options = { include_usage: true };
            // NOTE: min_tokens is an OpenRouter extension; OpenAI returns 400.
            if (!useProviderDefaults && !usesCompletionTokens) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        } else if (provider === 'google') {
            // Google AI uses a different API format - extract text from messages
            const text = messages.map(m => m.content).join('\n\n');
            // alt=sse makes Gemini emit real "data:" SSE lines; without it the
            // response is a JSON array that the SSE parser cannot read.
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            body = {
                contents: [{ parts: [{ text: text }] }]
            };
            // Target length is always sent, independent of provider defaults.
            body.generationConfig = { maxOutputTokens: maxTok };
            if (!useProviderDefaults) {
                body.generationConfig.temperature = temp;
                if (extraParams.topP !== undefined) body.generationConfig.topP = extraParams.topP;
                if (extraParams.topK !== undefined) body.generationConfig.topK = extraParams.topK;
            }
            if (wantsReasoningControl) {
                const modelLower = (model || '').toLowerCase();
                if (/gemini[-_.]?3/.test(modelLower)) {
                    // Gemini 3 uses thinking levels, not a token budget. The
                    // accepted levels vary by model; unsupported ones fall back
                    // to the nearest accepted level instead of returning 400.
                    body.generationConfig.thinkingConfig = {
                        thinkingLevel: geminiThinkingLevelFor(modelLower, effortSetting)
                    };
                } else {
                    const budgets = { off: 0, minimal: 512, low: 1024, medium: 4096, high: 8192 };
                    let thinkingBudget = budgets[effortSetting] ?? 1024;
                    // 2.5 Pro cannot disable thinking; 128 is its minimum budget.
                    if (/gemini[-_.]?2\.5[-_.]?pro|gemini[-_.]?pro/.test(modelLower)) {
                        thinkingBudget = Math.max(128, thinkingBudget);
                    }
                    body.generationConfig.thinkingConfig = { thinkingBudget };
                }
            }
        } else if (provider === 'nanogpt') {
            // NanoGPT uses OpenAI-compatible API
            // Normalize endpoint: strip trailing slashes
            let endpoint = (customEndpoint || 'https://nano-gpt.com/api').replace(/\/+$/, '');
            url = `${endpoint}/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            body = {
                model: model,
                messages: messages,
                stream: !shouldDisableStreaming
            };
            body.max_tokens = maxTok;
            // NOTE: only OpenRouter documents min_tokens; other gateways reject it.
            if (!useProviderDefaults) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        } else if (provider === 'lmstudio') {
            // LM Studio uses OpenAI-compatible API
            // Normalize endpoint: strip trailing slashes and any /v1/* paths
            let endpoint = (customEndpoint || 'http://localhost:1234').replace(/\/+$/, '');
            endpoint = endpoint.replace(/\/v1(\/.*)?$/, '');
            url = `${endpoint}/v1/chat/completions`;
            headers = {
                'Content-Type': 'application/json'
            };
            body = {
                model: model,
                messages: messages,
                stream: true
            };
            body.max_tokens = maxTok;
            if (!useProviderDefaults) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        } else if (provider === 'custom') {
            url = customEndpoint;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            body = {
                model: model,
                messages: messages,
                stream: true
            };
            body.max_tokens = maxTok;
            if (!useProviderDefaults) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        }

        // Debug logging for API requests
        console.log('🚀 API Request to:', provider);
        console.log('📨 Messages being sent:', JSON.stringify(messages, null, 2));
        if (useProviderDefaults) {
            console.log('⚙️ Using provider defaults (temperature not specified; max_tokens always sent)');
        } else {
            console.log('⚙️ Temperature:', temp, 'Word Target:', rawWordTarget, 'Token Cap:', maxTok);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: abortSignal
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        // Check if response is actually streaming or if it's a complete response
        const contentType = response.headers.get('content-type');
        console.log('📋 Response Content-Type:', contentType);

        // Some thinking models don't support streaming and return complete JSON
        if (contentType?.includes('application/json') && !contentType?.includes('text/event-stream')) {
            console.log('📦 Non-streaming response detected (likely thinking model)');
            const data = await response.json();
            console.log('📄 Full response data:', JSON.stringify(data, null, 2));

            // Extract content and finish_reason from non-streaming response
            let content = null;
            let finishReason = null;
            let sawReasoning = false;
            let usage = null;
            if (provider === 'openrouter' || provider === 'openai' || provider === 'nanogpt' || provider === 'lmstudio' || provider === 'custom') {
                const msg = data.choices?.[0]?.message;
                content = msg?.content;
                finishReason = data.choices?.[0]?.finish_reason;
                sawReasoning = hasReasoningFields(msg);
                usage = normalizeUsage(data.usage);
            } else if (provider === 'anthropic') {
                content = data.content?.[0]?.text;
                finishReason = data.stop_reason;
                usage = normalizeUsage(data.usage);
            } else if (provider === 'google') {
                content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                finishReason = data.candidates?.[0]?.finishReason;
                const meta = data.usageMetadata;
                if (meta) {
                    usage = normalizeUsage({
                        prompt_tokens: meta.promptTokenCount,
                        completion_tokens: meta.candidatesTokenCount,
                        completion_tokens_details: { reasoning_tokens: meta.thoughtsTokenCount }
                    });
                }
            }

            console.log('✅ Extracted content length:', content?.length || 0);
            console.log('🏁 Finish reason:', finishReason);
            if (usage) console.log('📊 Usage:', describeUsage(usage));

            if (!content && sawReasoning) {
                console.warn('⚠️ Thinking model returned no visible content - it spent its budget reasoning');
                throw new Error('The model only produced reasoning and no story text. It likely hit its token budget while thinking - lower the reasoning effort or increase the target length in AI Settings.');
            }

            if (content) {
                // Emit content in chunks to simulate streaming
                const words = content.split(/(\s+)/);
                for (const word of words) {
                    onToken(word);
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for UI
                }
            } else {
                console.error('❌ No content found in non-streaming response');
                throw new Error('No content received from API');
            }
            return { finishReason, sawReasoning, usage };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hasReceivedContent = false;
        let sawReasoning = false;
        let finishReason = null;
        let usage = null;

        // Only touch genStatus when we are the ones who set it, so a caller's
        // status (e.g. "Hit token cap - continuing...") is never clobbered.
        const setThinkingStatus = () => { if (app && !hasReceivedContent && app.genStatus !== 'Thinking…') app.genStatus = 'Thinking…'; };
        const clearThinkingStatus = () => { if (app && app.genStatus === 'Thinking…') app.genStatus = ''; };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                // SSE comment/control lines (": ...", "event:", "id:", "retry:")
                // carry no payload and would fail JSON.parse — only "data:" lines
                // do (e.g. OpenRouter sends ": OPENROUTER..." keep-alives).
                if (!line.startsWith('data:')) continue;

                try {
                    // Handle different streaming formats
                    const jsonStr = line.slice(5).trim();
                    if (jsonStr === '[DONE]') {
                        console.log('🏁 Stream finished with [DONE]');
                        if (!hasReceivedContent) {
                            if (sawReasoning) {
                                console.warn('⚠️ Stream ended with only reasoning and no visible content - the model likely hit its token budget while thinking');
                            } else {
                                console.warn('⚠️ Stream ended without content - possible thinking model without streaming support');
                            }
                        }
                        clearThinkingStatus();
                        return { finishReason, sawReasoning, usage };
                    }

                    const data = JSON.parse(jsonStr);

                    // Usage normally arrives in the final chunk. Capturing it lets
                    // us report how much of the output budget reasoning consumed
                    // instead of leaving the user guessing why text was short.
                    // Anthropic's message_* events are handled separately below
                    // because their usage is split across start/delta.
                    if (data.usage && !String(data.type || '').startsWith('message_')) {
                        usage = normalizeUsage(data.usage);
                    }
                    if (data.usageMetadata) {
                        usage = normalizeUsage({
                            prompt_tokens: data.usageMetadata.promptTokenCount,
                            completion_tokens: data.usageMetadata.candidatesTokenCount,
                            completion_tokens_details: { reasoning_tokens: data.usageMetadata.thoughtsTokenCount }
                        });
                    }
                    if (data.type === 'message_start' && data.message?.usage) {
                        usage = normalizeUsage({
                            prompt_tokens: data.message.usage.input_tokens,
                            completion_tokens: data.message.usage.output_tokens
                        });
                    }
                    // Anthropic reports cumulative output tokens in message_delta,
                    // so replace (not add) the running completion count.
                    if (data.type === 'message_delta' && data.usage) {
                        usage = normalizeUsage({
                            prompt_tokens: usage?.promptTokens ?? null,
                            completion_tokens: data.usage.output_tokens
                        });
                    }

                    // Debug: Log the first chunk to see what we're receiving
                    if (!hasReceivedContent && !sawReasoning) {
                        console.log('🔍 First chunk received:', JSON.stringify(data, null, 2));
                    }

                    // Extract token based on provider format
                    let token = null;
                    if (provider === 'openrouter' || provider === 'openai' || provider === 'nanogpt' || provider === 'lmstudio' || provider === 'custom') {
                        // Capture finish_reason if present
                        if (data.choices?.[0]?.finish_reason) {
                            finishReason = data.choices[0].finish_reason;
                        }

                        const delta = data.choices?.[0]?.delta;
                        const message = data.choices?.[0]?.message;
                        // Chain-of-thought arrives in provider-specific reasoning
                        // fields (reasoning_content on DeepSeek/QwQ, reasoning and
                        // reasoning_details on Together/DeepInfra, thinking on
                        // others). It must NEVER leak into visible prose, so it is
                        // only used to show a "Thinking…" status and to flag that
                        // this stream spent its budget reasoning. Only
                        // delta.content / message.content is emitted.
                        const isReasoningChunk = hasReasoningFields(delta) || hasReasoningFields(message);
                        if (isReasoningChunk) {
                            sawReasoning = true;
                            setThinkingStatus();
                        }
                        if (delta) {
                            token = delta.content || null;
                            if (!hasReceivedContent && delta && !isReasoningChunk) {
                                console.log('🔍 Delta object:', JSON.stringify(delta, null, 2));
                            }
                        }

                        // Some models put the complete message in the first chunk
                        if (!token && message && message.content) {
                            token = message.content;
                            console.log('📝 Found complete message in chunk');
                        }
                    } else if (provider === 'anthropic') {
                        if (data.type === 'content_block_start' && data.content_block?.type === 'thinking') {
                            sawReasoning = true;
                            setThinkingStatus();
                        } else if (data.type === 'content_block_delta') {
                            if (data.delta?.thinking) {
                                sawReasoning = true;
                                setThinkingStatus();
                            }
                            token = data.delta?.text;
                        } else if (data.type === 'message_delta') {
                            finishReason = data.delta?.stop_reason;
                        }
                    } else if (provider === 'google') {
                        token = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (data.candidates?.[0]?.finishReason) {
                            finishReason = data.candidates[0].finishReason;
                        }
                    }

                    if (token) {
                        hasReceivedContent = true;
                        clearThinkingStatus();
                        onToken(token);
                    } else if (!hasReceivedContent && !sawReasoning) {
                        console.log('⚠️ No token extracted from chunk');
                    }
                } catch (e) {
                    // Ignore parse errors for incomplete chunks
                    console.debug('Parse error (likely incomplete chunk):', e.message);
                }
            }
        }

        if (!hasReceivedContent) {
            clearThinkingStatus();
            if (sawReasoning) {
                console.warn('⚠️ No visible content received - the model spent its budget reasoning');
                throw new Error('The model only produced reasoning and no story text. It likely hit its token budget while thinking - lower the reasoning effort or increase the target length in AI Settings.');
            }
            console.error('⚠️ No content received from stream');
            console.error('This usually happens with thinking models that either:');
            console.error('1. Do not support streaming at all');
            console.error('2. Return content in a different field structure');
            console.error('3. Require stream=false in the API request');
            throw new Error('No content received from API. This model may not support streaming or may require different parameters.');
        }

        console.log('🏁 Final finish reason:', finishReason);
        return { finishReason, sawReasoning, usage };
    }

    /**
     * Load prompt history for current project
     * @param {Object} app - Alpine app instance
     */
    async function loadPromptHistory(app) {
        if (!app.currentProject) {
            app.promptHistoryList = [];
            return;
        }
        try {
            const history = await db.promptHistory
                .where('projectId')
                .equals(app.currentProject.id)
                .reverse()
                .sortBy('timestamp');
            app.promptHistoryList = history;
        } catch (e) {
            console.error('Failed to load prompt history:', e);
            app.promptHistoryList = [];
        }
    }

    function buildFlowPrompt(beat, sceneContext, options = {}) {
        try {
            console.debug('[buildFlowPrompt] received prosePrompt:', JSON.stringify(options.prosePrompt));
            console.debug('[buildFlowPrompt] received systemPrompt:', JSON.stringify(options.systemPrompt));
        } catch (e) { /* ignore */ }
        const povName = (options.povCharacter && options.povCharacter.trim()) ? options.povCharacter.trim() : 'the protagonist';
        const tenseMap = {
            'past': 'past tense',
            'present': 'present tense',
            'future': 'future tense',
            'past perfect': 'past perfect tense',
            'present perfect': 'present perfect tense'
        };
        const tenseText = tenseMap[options.tense] || 'past tense';
        const povText = options.pov || '3rd person limited';
        const langText = options.language || 'English';
        const povSentence = `You are a co-author tasked with assisting your partner. You are writing a story from the point of view of ${povName} in ${tenseText}, in ${povText}.${langText !== 'English' ? ` Write in ${langText}.` : ''}`;

        // Build context with all placeholders using PromptRender
        const ctx = window.PromptRender?.buildContext
            ? window.PromptRender.buildContext(options.app, {
                genreIds: options.projectGenres,
                targetWords: options.maxTokens,
                pov: options.pov,
                povName: options.povCharacter,
                tense: options.tense,
                language: options.language
            })
            : null;

        const targetWords = options.maxTokens || 300;
        const lengthInstruction = lengthInstructionFor(targetWords);
        const genreSentence = ctx?.genres || '';

        let systemPrompt;
        if (options.systemPrompt && typeof options.systemPrompt === 'string' && options.systemPrompt.trim()) {
            systemPrompt = window.PromptRender?.render
                ? window.PromptRender.render(options.systemPrompt.trim(), ctx || { length: lengthInstruction, pov: options.pov, povName: options.povCharacter, tense: tenseText, language: langText, genres: genreSentence, genreLabels: ctx?.genreLabels || '' })
                : options.systemPrompt.trim()
                    .replace(/\{povName\}/gi, povName)
                    .replace(/\{tense\}/gi, tenseText)
                    .replace(/\{pov\}/gi, povText)
                    .replace(/\{length\}/gi, lengthInstruction)
                    .replace(/\{genres\}/gi, genreSentence ? genreSentence.trim() : '')
                    .replace(/\{language\}/gi, langText);
            if (genreSentence) {
                systemPrompt += genreSentence;
            }
        } else {
            systemPrompt = `${povSentence}${genreSentence} You are a creative writing partner continuing a story. Write seamless, flowing narrative prose that extends the scene. Maintain the established tone, voice, and pacing. Avoid abrupt transitions, mechanical expansions, or announcing what you are doing. If given a direction, weave it into the narrative organically. Use sensory details and interiority. Show, don't tell. Write ${lengthInstruction}.`;
        }

        if (langText !== 'English') {
            systemPrompt += `\n\nWrite entirely in ${langText}.`;
        }

        let contextText = '';
        if (sceneContext && sceneContext.length > 0) {
            contextText = `\n\nCURRENT SCENE SO FAR:\n${sceneContext}`;
        }

        let proseTemplateText = '';
        if (options.prosePrompt && typeof options.prosePrompt === 'string' && options.prosePrompt.trim()) {
            if (options.preview) {
                proseTemplateText = `\n\n${options.prosePrompt.trim()}`;
            } else {
                proseTemplateText = `\n\n--- PROMPT TEMPLATE START ---\n${options.prosePrompt.trim()}\n--- PROMPT TEMPLATE END ---`;
            }
        }

        let compendiumText = '';
        if (options.compendiumEntries && Array.isArray(options.compendiumEntries) && options.compendiumEntries.length > 0) {
            compendiumText = '\n\nCOMPENDIUM REFERENCES:\n';
            for (const ce of options.compendiumEntries) {
                try {
                    const title = window.MacroUtils.stripSTMacros(ce.title || '') || ('entry ' + (ce.id || ''));
                    const body = window.MacroUtils.stripSTMacros(ce.body || ce.description || '') || ce.body || '';
                    compendiumText += `\n-- ${title} --\n${body}\n`;
                } catch (e) { console.warn('Skipped compendium entry in prompt:', e); }
            }
        }

        let sceneSummariesText = '';
        if (options.sceneSummaries && Array.isArray(options.sceneSummaries) && options.sceneSummaries.length > 0) {
            sceneSummariesText = '\n\nPREVIOUS SCENES:\n';
            for (const scene of options.sceneSummaries) {
                try {
                    const title = scene.title || 'Untitled Scene';
                    const summary = scene.summary || '';
                    if (summary) {
                        sceneSummariesText += `\n-- ${title} --\n${summary}\n`;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        let userContent = `${contextText}${proseTemplateText}`;
        if (compendiumText) {
            userContent += compendiumText;
        }
        if (sceneSummariesText) {
            userContent += sceneSummariesText;
        }

        let cleanedBeat = beat;
        cleanedBeat = cleanedBeat.replace(/@\[([^\]]+)\]/g, '');
        cleanedBeat = cleanedBeat.replace(/#\[([^\]]+)\]/g, '');
        cleanedBeat = cleanedBeat.replace(/\s+/g, ' ').trim();

        if (cleanedBeat) {
            userContent += `\n\nContinue the story from here, weaving the following naturally into the prose — do not announce it or break the flow:\n\n${cleanedBeat}`;
        } else {
            userContent += `\n\nContinue the story from here. Let it flow naturally.`;
        }

        const result = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            asString: function () {
                return `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userContent}<|im_end|>\n<|im_start|>assistant\n`;
            }
        };
        return result;
    }

    /**
     * Generate flowing narrative prose from optional beat input
     * @param {Object} app - Alpine app instance
     */
    async function generateFlowFromBeat(app) {
        const sceneContentRaw = (app.currentScene && app.currentScene.content) || '';
        let beatText = app.getCurrentBeat();
        let sceneContent = sceneContentRaw;
        if (!app.showMiniBeatInput) {
            const lines = sceneContent.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('## ')) {
                    lines.splice(i);
                    break;
                }
            }
            sceneContent = lines.join('\n');
        }
        if (!beatText && app.aiStatus !== 'ready') return;
        if (!beatText && !sceneContent) return;
        app.isGenerating = true;
        // Capture the target scene up front so tokens are never appended to a
        // different scene if the user switches scenes mid-generation.
        const targetSceneId = app.currentScene?.id || null;
        const targetProjectId = app.currentProject?.id || null;
        try {
            if (beatText) app.lastBeat = beatText;

            const proseInfo = await app.resolveProsePromptInfo();
            const prosePromptText = proseInfo && proseInfo.text ? proseInfo.text : null;
            const systemPromptText = proseInfo && proseInfo.systemText ? proseInfo.systemText : null;
            const panelContext = await app.buildContextFromPanel();
            let beatCompEntries = [];
            let beatSceneSummaries = [];
            if (beatText) {
                try { beatCompEntries = await app.resolveCompendiumEntriesFromBeat(beatText); } catch (e) { beatCompEntries = []; }
                try { beatSceneSummaries = await app.resolveSceneSummariesFromBeat(beatText); } catch (e) { beatSceneSummaries = []; }
            }
            const compMap = new Map();
            panelContext.compendiumEntries.forEach(e => compMap.set(e.id, e));
            beatCompEntries.forEach(e => compMap.set(e.id, e));
            const compEntries = Array.from(compMap.values());
            const sceneMap = new Map();
            panelContext.sceneSummaries.forEach(s => sceneMap.set(s.title, s));
            beatSceneSummaries.forEach(s => sceneMap.set(s.title, s));
            const sceneSummaries = Array.from(sceneMap.values());
            const genOpts = { povCharacter: app.povCharacter, pov: app.pov, tense: app.tense, language: app.language || app.currentProject?.language || 'English', prosePrompt: prosePromptText, systemPrompt: systemPromptText, compendiumEntries: compEntries, sceneSummaries: sceneSummaries, maxTokens: app.maxTokens, projectGenres: app.currentProject?.genres };
            let prompt = buildFlowPrompt(beatText || '', sceneContent, genOpts);
            try {
                await db.promptHistory.add({
                    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9),
                    projectId: app.currentProject?.id,
                    sceneId: app.currentScene?.id,
                    timestamp: new Date(),
                    beat: beatText || '(flow)',
                    prompt: typeof prompt === 'object' && prompt.asString ? prompt.asString() : String(prompt)
                });
            } catch (e) {
                console.warn('Failed to save prompt history:', e);
            }

            if (!app.showMiniBeatInput) {
                app.currentScene.content = sceneContent;
            }

            if (app.currentScene && app.currentScene.content && !app.currentScene.content.endsWith('\n')) {
                app.currentScene.content += '\n';
            }
            const prevLen = app.currentScene ? (app.currentScene.content ? app.currentScene.content.length : 0) : 0;
            app.lastGenStart = prevLen;
            app.lastGenText = '';
            app.showGenActions = false;
            app.lastGenTruncated = false;
            app.lastGenTrimmed = false;
            app.beatAbortController = new AbortController();
            // Fresh run: claim a run id (stale resume loops exit), clear any
            // latched abort from a previous run, and clear the resume status.
            app._genRunId = (app._genRunId || 0) + 1;
            app._genAbortLatched = false;
            app.genStatus = '';
            app._genFollow = true;
            const ta = document.querySelector('.editor-textarea');
            if (ta) {
                const onScroll = () => {
                    app._genFollow = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 20;
                };
                ta.addEventListener('scroll', onScroll);
                app._genScrollCleanup = () => ta.removeEventListener('scroll', onScroll);
            }
            const result = await streamGenerationWithResume(prompt, app, (token) => {
                app.lastGenText += token;
                // Only stream into the live editor while the same scene is open;
                // otherwise buffer and flush to the target scene on completion.
                if (app.currentScene?.id === targetSceneId) {
                    app.currentScene.content += token;
                    app.$nextTick(() => {
                        const ta = document.querySelector('.editor-textarea');
                        if (ta && app._genFollow) ta.scrollTop = ta.scrollHeight;
                    });
                }
            }, { targetWords: app.maxTokens });
            // Only ever trim an incomplete ending when the model actually hit the
            // token limit; natural stops are never silently edited. Even then only
            // a genuinely tiny dangling fragment is removed — anything bigger
            // (e.g. an entire unwritten point) is kept so no content is lost.
            if (isTruncated(result)) {
                app.lastGenTruncated = true;
                const beforeTrim = app.lastGenText;
                trimTrailingIncomplete(app, targetSceneId);
                app.lastGenTrimmed = app.lastGenText !== beforeTrim;
                if (app.lastGenTrimmed) {
                    console.warn('⚠️ Flow generation hit the token limit; incomplete ending trimmed');
                } else {
                    console.warn('⚠️ Flow generation hit the token limit; incomplete ending kept as-is');
                }
            }
            app.showGenActions = true;
            app.showGeneratedHighlight = true;
            app.$nextTick(() => {
                try {
                    const ta = document.querySelector('.editor-textarea');
                    if (ta) {
                        if (app._genFollow) {
                            ta.focus();
                            const end = (app.currentScene && app.currentScene.content) ? app.currentScene.content.length : 0;
                            ta.selectionStart = end;
                            ta.selectionEnd = end;
                            ta.scrollTop = ta.scrollHeight;
                        }
                    }
                } catch (e) { }
                setTimeout(() => {
                    app.showGeneratedHighlight = false;
                }, 5000);
            });
            if (app.showMiniBeatInput) app.beatInput = '';

            // If the user switched scenes mid-generation, flush the buffered text
            // straight into the target scene's content row instead of the open scene.
            if (app.currentScene?.id !== targetSceneId && targetSceneId && app.lastGenText) {
                try {
                    const existing = await db.content.get(targetSceneId);
                    if (existing) {
                        const merged = existing.text + app.lastGenText;
                        await db.content.update(targetSceneId, { text: merged, wordCount: merged.split(/\s+/).filter(Boolean).length, updatedAt: Date.now() });
                    } else {
                        await db.content.add({ sceneId: targetSceneId, text: app.lastGenText, wordCount: app.lastGenText.split(/\s+/).filter(Boolean).length, updatedAt: Date.now() });
                    }
                    if (window.TabSync) {
                        window.TabSync.broadcast(window.TabSync.MSG_TYPES.SCENE_UPDATED, {
                            id: targetSceneId,
                            projectId: targetProjectId,
                            updatedAt: Date.now()
                        });
                    }
                } catch (e) {
                    console.error('Failed to flush generated text to background scene:', e);
                }
            } else {
                await app.saveScene();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Flow generation stopped by user');
                app.showGenActions = true;
            } else {
                console.error('Flow generation error:', error);
                alert('Failed to generate text. ' + generationErrorHint(app) + '\n\nError: ' + (error && error.message ? error.message : error));
            }
        } finally {
            if (app._genScrollCleanup) {
                app._genScrollCleanup();
                app._genScrollCleanup = null;
            }
            app.beatAbortController = null;
            app.genStatus = '';
            app.isGenerating = false;
        }
    }

    /**
     * Generate prose from beat input
     * @param {Object} app - Alpine app instance
     */
    async function generateFromBeat(app) {
        const beatText = app.getCurrentBeat();
        if (!beatText || app.aiStatus !== 'ready') return;
        app.isGenerating = true;
        // Capture the target scene up front so tokens are never appended to a
        // different scene if the user switches scenes mid-generation.
        const targetSceneId = app.currentScene?.id || null;
        const targetProjectId = app.currentProject?.id || null;
        try {
            app.lastBeat = beatText;

            // In default mode, strip the ## beat block (from ## marker to end) from content before generating
            let sceneContent = (app.currentScene && app.currentScene.content) || '';
            if (!app.showMiniBeatInput) {
                const lines = sceneContent.split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim().startsWith('## ')) {
                        lines.splice(i);
                        break;
                    }
                }
                sceneContent = lines.join('\n');
            }

            // Resolve prose prompt text and system prompt (in-memory first, then DB fallback)
            const proseInfo = await app.resolveProsePromptInfo();
            const prosePromptText = proseInfo && proseInfo.text ? proseInfo.text : null;
            const systemPromptText = proseInfo && proseInfo.systemText ? proseInfo.systemText : null;
            // Get context from context panel
            const panelContext = await app.buildContextFromPanel();
            // Resolve compendium entries and scene summaries from beat mentions (@/#)
            let beatCompEntries = [];
            let beatSceneSummaries = [];
            try { beatCompEntries = await app.resolveCompendiumEntriesFromBeat(beatText); } catch (e) { beatCompEntries = []; }
            try { beatSceneSummaries = await app.resolveSceneSummariesFromBeat(beatText); } catch (e) { beatSceneSummaries = []; }
            // Merge context: panel context + beat mentions
            // Use Map to deduplicate by ID
            const compMap = new Map();
            panelContext.compendiumEntries.forEach(e => compMap.set(e.id, e));
            beatCompEntries.forEach(e => compMap.set(e.id, e));
            const compEntries = Array.from(compMap.values());
            // Merge scene summaries (deduplicate by title)
            const sceneMap = new Map();
            panelContext.sceneSummaries.forEach(s => sceneMap.set(s.title, s));
            beatSceneSummaries.forEach(s => sceneMap.set(s.title, s));
            const sceneSummaries = Array.from(sceneMap.values());
            const genOpts = { povCharacter: app.povCharacter, pov: app.pov, tense: app.tense, language: app.language || app.currentProject?.language || 'English', prosePrompt: prosePromptText, systemPrompt: systemPromptText, compendiumEntries: compEntries, sceneSummaries: sceneSummaries, maxTokens: app.maxTokens, projectGenres: app.currentProject?.genres };
            let prompt = buildPrompt(beatText, sceneContent, genOpts);
            // Save prompt to history
            try {
                await db.promptHistory.add({
                    id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9),
                    projectId: app.currentProject?.id,
                    sceneId: app.currentScene?.id,
                    timestamp: new Date(),
                    beat: beatText,
                    prompt: typeof prompt === 'object' && prompt.asString ? prompt.asString() : String(prompt)
                });
            } catch (e) {
                console.warn('Failed to save prompt history:', e);
            }

            // Update current scene content to stripped version (beat line removed)
            if (!app.showMiniBeatInput) {
                app.currentScene.content = sceneContent;
            }

            // Ensure generated text starts on a new line
            if (app.currentScene && app.currentScene.content && !app.currentScene.content.endsWith('\n')) {
                app.currentScene.content += '\n';
            }
            // remember where generated text will start
            const prevLen = app.currentScene ? (app.currentScene.content ? app.currentScene.content.length : 0) : 0;
            app.lastGenStart = prevLen;
            app.lastGenText = '';
            app.showGenActions = false;
            app.lastGenTruncated = false;
            app.lastGenTrimmed = false;
            // Create abort controller for this generation
            app.beatAbortController = new AbortController();
            // Fresh run: claim a run id (stale resume loops exit), clear any
            // latched abort from a previous run, and clear the resume status.
            app._genRunId = (app._genRunId || 0) + 1;
            app._genAbortLatched = false;
            app.genStatus = '';
            // Set up scroll follow during streaming
            app._genFollow = true;
            const ta = document.querySelector('.editor-textarea');
            if (ta) {
                const onScroll = () => {
                    app._genFollow = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 20;
                };
                ta.addEventListener('scroll', onScroll);
                app._genScrollCleanup = () => ta.removeEventListener('scroll', onScroll);
            }
            // Stream tokens and append into the current scene. If the model hits the
            // token limit mid-sentence, the stream is resumed so the sentence
            // gets finished instead of leaving a dangling tail.
            const result = await streamGenerationWithResume(prompt, app, (token) => {
                app.lastGenText += token;
                // Only stream into the live editor while the same scene is open;
                // otherwise buffer and flush to the target scene on completion.
                if (app.currentScene?.id === targetSceneId) {
                    app.currentScene.content += token;
                }
                app.$nextTick(() => {
                    const ta = document.querySelector('.editor-textarea');
                    if (ta && app._genFollow) ta.scrollTop = ta.scrollHeight;
                });
            }, { targetWords: app.maxTokens });
            // Only ever trim an incomplete ending when the model actually hit the
            // token limit; natural stops are never silently edited. Even then only
            // a genuinely tiny dangling fragment is removed — anything bigger
            // (e.g. an entire unwritten point) is kept so no content is lost.
            if (isTruncated(result)) {
                app.lastGenTruncated = true;
                const beforeTrim = app.lastGenText;
                trimTrailingIncomplete(app, targetSceneId);
                app.lastGenTrimmed = app.lastGenText !== beforeTrim;
                if (app.lastGenTrimmed) {
                    console.warn('⚠️ Generation hit the token limit; incomplete ending trimmed');
                } else {
                    console.warn('⚠️ Generation hit the token limit; incomplete ending kept as-is');
                }
            }
            // Generation complete — expose accept/retry/discard actions
            app.showGenActions = true;
            app.showGeneratedHighlight = true;
            // Place cursor at end and scroll to bottom (only if user was following)
            app.$nextTick(() => {
                try {
                    const ta = document.querySelector('.editor-textarea');
                    if (ta) {
                        if (app._genFollow) {
                            ta.focus();
                            const end = (app.currentScene && app.currentScene.content) ? app.currentScene.content.length : 0;
                            ta.selectionStart = end;
                            ta.selectionEnd = end;
                            ta.scrollTop = ta.scrollHeight;
                        }
                    }
                } catch (e) { }
                // Auto-hide highlight after 5 seconds
                setTimeout(() => {
                    app.showGeneratedHighlight = false;
                }, 5000);
            });
            // Clear beat input only in legacy mode
            if (app.showMiniBeatInput) app.beatInput = '';

            // If the user switched scenes mid-generation, flush the buffered text
            // straight into the target scene's content row instead of the open scene.
            if (app.currentScene?.id !== targetSceneId && targetSceneId && app.lastGenText) {
                try {
                    const existing = await db.content.get(targetSceneId);
                    if (existing) {
                        const merged = existing.text + app.lastGenText;
                        await db.content.update(targetSceneId, { text: merged, wordCount: merged.split(/\s+/).filter(Boolean).length, updatedAt: Date.now() });
                    } else {
                        await db.content.add({ sceneId: targetSceneId, text: app.lastGenText, wordCount: app.lastGenText.split(/\s+/).filter(Boolean).length, updatedAt: Date.now() });
                    }
                    if (window.TabSync) {
                        window.TabSync.broadcast(window.TabSync.MSG_TYPES.SCENE_UPDATED, {
                            id: targetSceneId,
                            projectId: targetProjectId,
                            updatedAt: Date.now()
                        });
                    }
                } catch (e) {
                    console.error('Failed to flush generated text to background scene:', e);
                }
            } else {
                await app.saveScene();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                app.showGenActions = true;
            } else {
                console.error('Generation error:', error);
                alert('Failed to generate text. ' + generationErrorHint(app) + '\n\nError: ' + (error && error.message ? error.message : error));
            }
        } finally {
            if (app._genScrollCleanup) {
                app._genScrollCleanup();
                app._genScrollCleanup = null;
            }
            app.beatAbortController = null;
            app.genStatus = '';
            app.isGenerating = false;
        }
    }

    /**
     * Stop an in-progress beat generation.
     * @param {Object} app - Alpine app instance
     */
    function stopBeatGeneration(app) {
        // Latch the abort so the resume loop can never fire another attempt
        // after this point, even if the in-flight stream resolves instead of
        // rejecting (abort-vs-resolve race) or the controller was superseded.
        app._genAbortLatched = true;
        if (app.beatAbortController) {
            app.beatAbortController.abort();
            app.beatAbortController = null;
        }
    }

    /**
     * Category-specific generation directives for compendium entries.
     */
    const CATEGORY_DIRECTIVES = {
        'characters': 'Generate a character — appearance, personality, backstory, motivations, flaws, and role in the story.',
        'places': 'Generate a location — physical description, atmosphere, notable features, history, and significance to the narrative.',
        'items': 'Generate an item — appearance, origin, properties or abilities, history, and role in the story.',
        'lore': 'Generate a piece of lore — history, myth or legend, cultural beliefs, and how it influences the present.',
        'notes': 'Generate free-form worldbuilding notes, development ideas, or thematic reflections on this topic.',
        'Magic Systems': 'Generate a magic system — how it works, rules and limitations, costs or trade-offs, who can use it, and its cultural and narrative implications.',
        'Bestiary': 'Generate a creature — appearance, habitat, behavior, diet, abilities, and its role in the story world.',
        'Pantheons': 'Generate a deity or divine being — domains, symbols, myths, worship practices, and relationships with other powers.',
        'Factions': 'Generate a faction or organization — goals, membership, hierarchy, territory, resources, and relationships with other groups.',
        'Races': 'Generate a race or species — physiology, culture, history, homeland, and relations with other races.',
        'Technology': 'Generate a piece of technology — how it works, who uses it, limitations, societal impact, and narrative significance.',
        'Ships & Craft': 'Generate a ship or vehicle — design, capabilities, crew, history, and role in the story.',
        'Planets & Locations': 'Generate a planet, space station, or location — environment, inhabitants, strategic importance, and notable features.',
        'Alien Species': 'Generate an alien species — biology, culture, technology, history, and relationship with other species.',
        'Governments': 'Generate a government or political entity — structure, ideology, territory, leaders, and conflicts or alliances.',
        'Timeline': 'Generate a timeline entry — date or period, key events, causes and consequences, and historical significance.',
        'Historical Figures': 'Generate a historical figure — biography, personality, achievements, relationships, and their impact on the era.',
        'Period Glossary': 'Generate a term definition — period-specific vocabulary, context, and usage notes for authentic writing.',
        'Customs & Society': 'Generate a custom or social norm — origins, practices, significance, and how characters would experience it.',
        'Entities & Creatures': 'Generate a terrifying entity or creature — appearance, origin, abilities or curse, weaknesses, and the dread it inspires.',
        'Tension Trackers': 'Generate a tension or dread tracker — what causes unease, escalation triggers, and safe thresholds for the narrative.',
        'Haunted Locations': 'Generate a haunted or cursed location — history, paranormal phenomena, rules, and why it is dangerous.',
        'Artifacts': 'Generate a cursed or dangerous artifact — appearance, origin, powers, cost of use, and the horror it brings.',
        'Relationship Beats': 'Generate a relationship beat or milestone — emotional significance, character growth, and how it advances the romantic arc.',
        'Chemistry Notes': 'Generate chemistry notes — what draws these characters together, tension points, shared values, and complementary traits.',
        'Tropes': 'Generate a romance trope — how it manifests in this story, subversion or embrace, and character dynamics it creates.',
        'Love Languages': 'Generate a love language profile — how this character gives and receives love, emotional needs, and potential conflicts.',
        'Locations': 'Generate a western location — landscape, climate, notable features, settlements, and the way it shapes the people who live there.',
        'Outlaws': 'Generate an outlaw or desperado — appearance, reputation, crimes, hideout, and the law\'s pursuit.',
        'Cybernetics & Tech': 'Generate cybernetic augmentation or tech — function, manufacturer, side effects, cost, and social status implications.',
        'Corporations': 'Generate a corporation — industry, power structure, products, reputation, and their influence on society.',
        'Districts': 'Generate a city district — atmosphere, architecture, population, economy, and the dangers or opportunities it offers.',
        'Hacker Culture': 'Generate a hacker group or subculture — identity, methods, hideouts, targets, and their relationship with the corps.',
        'Survivors & Factions': 'Generate a survivor group or faction — composition, philosophy, territory, resources, and how they endure.',
        'Hazards': 'Generate a hazard or threat — origin, danger level, avoidance strategies, and stories of those who encountered it.',
        'Ruins & Locations': 'Generate a ruined location — what it was, what it is now, dangers, resources, and stories from the before-times.',
        'Resources': 'Generate a resource — scarcity, uses, who controls it, trade value, and conflicts it sparks.',
        'Powers & Abilities': 'Generate a superpower or ability — how it works, limitations, emotional cost, and how it reflects the character.',
        'Heroes & Villains': 'Generate a hero or villain — identity, origin, powers, motivation, costume or appearance, and key relationships.',
        'Teams & Factions': 'Generate a team or faction — purpose, members, headquarters, history, and dynamics with other groups.',
        'Secret Identities': 'Generate a secret identity — civilian persona, cover story, close contacts who know the truth, and risks of exposure.'
    };

    /**
     * Build a prompt for generating a new compendium entry via AI.
     * Includes genre context, existing entries as reference, and a category-specific directive.
     * @param {Object} entry - The compendium entry being generated (title, category)
     * @param {Array} context - Array of existing entries to include as reference
     * @param {Object} app - Alpine app instance
     * @returns {Object} { messages, asString }
     */
    function buildCompendiumPrompt(entry, context, app) {
        const targetWords = 250;
        const cap = Math.min(targetWords, 400);
        const floor = Math.max(100, Math.round(cap * 0.5));
        const lengthInstruction = `Write approximately ${floor}-${cap} words`;

        const project = app.currentProject;
        const genreLabels = project?.genres?.length
            ? project.genres.map(gid => window.GenreDefs?.findGenre(gid)?.label || gid).join(' + ')
            : 'general';
        const genreDescriptors = window.GenreDefs?.getPromptDescriptor(project?.genres || []) || [];
        const genreSentence = genreDescriptors.length > 0
            ? `The writing should reflect ${genreDescriptors.join(', and ')}.`
            : '';

        const category = entry.category || 'lore';
        const categoryDirective = CATEGORY_DIRECTIVES[category]
            || `Generate content for a compendium entry about ${category}.`;

        const title = (entry.title && entry.title !== 'New Entry') ? entry.title : '';
        const needsTitle = !title;

        let contextText = '';
        if (context && context.length > 0) {
            const lines = [];
            for (const ce of context) {
                const t = ce.title || 'Untitled';
                const b = (ce.body || '').trim();
                if (b) {
                    lines.push(`-- ${t} --\n${b}`);
                }
            }
            if (lines.length > 0) {
                contextText = '\nHere are existing entries from this world for reference:\n\n' + lines.join('\n\n');
            }
        }

        const titleInstruction = needsTitle
            ? '\nFirst, suggest a fitting title for this entry based on the content. Output the title on its own line prefixed with "TITLE:", then a blank line, then the body content.'
            : '';

        const preBody = app?.compGenPreBody || '';
        const bodyInstruction = preBody.trim()
            ? `\nThe user has provided the following notes to guide this entry:\n${preBody.trim()}\nUse these as a starting point and expand into a full entry accordingly.`
            : '';

        const compendiumLang = app?.language || app?.currentProject?.language || 'English';
        const langDirective = compendiumLang !== 'English' ? ` Write entirely in ${compendiumLang}.` : '';
        
        // Use the new COMPENDIUM_SYSTEM_PROMPT from CharacterCreator with genre rendering
        const systemPrompt = window.CharacterCreator?.COMPENDIUM_SYSTEM_PROMPT
            ? (window.PromptRender?.render
                ? window.PromptRender.render(window.CharacterCreator.COMPENDIUM_SYSTEM_PROMPT, { genreLabels, genreIds: project?.genres })
                : String(window.CharacterCreator.COMPENDIUM_SYSTEM_PROMPT)).replace('{genreLabels}', genreLabels)
            : `You are a creative writing assistant helping to develop a ${genreLabels} story. ${genreSentence} Be thorough, detailed, and consistent with the existing material.`;
        
        const systemContent = systemPrompt + langDirective;

        const userContent = `Please create a new compendium entry for the category "${category}".${title ? `\n\nThe entry is titled "${title}".` : ''}

${categoryDirective}${contextText}
Write ${lengthInstruction}, rich with specific details that fit the world.${titleInstruction}${bodyInstruction}`;

        return {
            messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: userContent }
            ],
            asString: function () {
                return `<|im_start|>system\n${systemContent}<|im_end|>\n<|im_start|>user\n${userContent}<|im_end|>\n<|im_start|>assistant\n`;
            }
        };
    }

    window.Generation = {
        buildPrompt,
        buildFlowPrompt,
        buildCompendiumPrompt,
        streamGeneration,
        streamGenerationWithResume,
        loadPromptHistory,
        generateFromBeat,
        generateFlowFromBeat,
        stopBeatGeneration,
        // Shared helpers for other modules and tests
        isTruncated,
        isReasoningModel,
        isAdaptiveClaudeModel,
        claudeRejectsSamplingParams,
        openAiReasoningEffort,
        anthropicEffortFor,
        geminiThinkingLevelFor,
        lengthInstructionFor,
        outputTokenBudget,
        countWords,
        normalizeUsage,
        describeUsage
    };
})();
