// Generation helpers module
// Exposes window.Generation with:
// - buildPrompt(beat, sceneContext, options) => string
// - streamGeneration(prompt, onToken(token)) => Promise<void>
(function () {
    function buildPrompt(beat, sceneContext, options = {}) {
        try {
            console.debug('[buildPrompt] received prosePrompt:', JSON.stringify(options.prosePrompt));
            console.debug('[buildPrompt] received systemPrompt:', JSON.stringify(options.systemPrompt));
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

        // Build genre descriptor sentence from project genres
        let genreSentence = '';
        if (options.projectGenres && options.projectGenres.length > 0 && window.GenreDefs) {
            const descriptors = window.GenreDefs.getPromptDescriptor(options.projectGenres);
            if (descriptors.length > 0) {
                const labels = options.projectGenres
                    .map(gid => window.GenreDefs.findGenre(gid)?.label || gid)
                    .join(' ');
                genreSentence = `\nThis is a ${labels} story. Write with ${descriptors.join(', and ')}.`;
            }
        }

        // Translate the word-count target into a length instruction for the prompt.
        // The slider/buttons store a word target, not a token limit.
        const targetWords = options.maxTokens || 300;
        const lengthInstruction = `at least ${targetWords} words`;

        // Use custom system prompt if provided, otherwise fall back to default
        let systemPrompt;
        if (options.systemPrompt && typeof options.systemPrompt === 'string' && options.systemPrompt.trim()) {
            // Replace placeholders in custom system prompt
            systemPrompt = options.systemPrompt.trim()
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
            // Default fallback system prompt
            systemPrompt = `${povSentence}${genreSentence} You are a creative writing assistant. The author provides a BEAT (what happens next) and you expand it into vivid, engaging prose. Write ${lengthInstruction} that bring the beat to life. Match the author's tone and style. Use sensory details. Show, don't tell.`;
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
            if (options.preview) {
                proseTemplateText = `\n\n${options.prosePrompt.trim()}`;
            } else {
                // Add explicit markers to make the template visible during debugging/inspection
                proseTemplateText = `\n\n--- PROMPT TEMPLATE START ---\n${options.prosePrompt.trim()}\n--- PROMPT TEMPLATE END ---`;
            }
        }

        // If compendium entries are provided, include them as references before the BEAT.
        let compendiumText = '';
        if (options.compendiumEntries && Array.isArray(options.compendiumEntries) && options.compendiumEntries.length > 0) {
            compendiumText = '\n\nCOMPENDIUM REFERENCES:\n';
            for (const ce of options.compendiumEntries) {
                try {
                    const title = ce.title || ('entry ' + (ce.id || ''));
                    const body = (ce.body || ce.body || ce.description || '') || ce.body || '';
                    compendiumText += `\n-- ${title} --\n${body}\n`;
                } catch (e) { /* ignore */ }
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

        userContent += `\n\nBEAT TO EXPAND:\n${cleanedBeat}\n\nWrite ${lengthInstruction} continuing from here:`;

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

    async function streamGeneration(prompt, onToken, app, abortSignal) {
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
        const maxTokens = app?.maxTokens ?? preset.maxTokens ?? 300;
        const topP = preset.topP ?? app?.topP ?? 0.9;
        const topK = preset.topK ?? app?.topK ?? 40;
        const repetitionPenalty = preset.repetitionPenalty ?? app?.repetitionPenalty ?? 1.0;
        const frequencyPenalty = preset.frequencyPenalty ?? app?.frequencyPenalty ?? 0.0;
        const presencePenalty = preset.presencePenalty ?? app?.presencePenalty ?? 0.0;
        const minP = preset.minP ?? app?.minP ?? 0.0;
        const seed = preset.seed !== undefined ? preset.seed : (app?.seed !== undefined ? app.seed : null);

        // Convert prompt to appropriate format
        let promptStr = prompt;
        let messages = null;

        if (typeof prompt === 'object' && prompt.messages) {
            // buildPrompt() result with messages and asString()
            messages = prompt.messages;
            if (aiMode === 'local') {
                // Use string format for local server
                promptStr = prompt.asString();
            }
        } else if (Array.isArray(prompt)) {
            // Raw messages array (e.g., from workshop chat)
            messages = prompt;
            if (aiMode === 'local') {
                // Convert messages array to ChatML format for local server
                promptStr = messagesToChatML(messages);
            }
        }

        const extraParams = hasPreset ? preset : {};

        if (aiMode === 'api') {
            // API Mode - use configured provider with messages
            return await streamGenerationAPI(messages || promptStr, onToken, aiProvider, aiApiKey, aiModel, aiEndpoint, temperature, maxTokens, app, useProviderDefaults, abortSignal, extraParams);
        } else {
            // Local Mode - use llama-server with string prompt
            return await streamGenerationLocal(promptStr, onToken, aiEndpoint, temperature, maxTokens, useProviderDefaults, abortSignal, extraParams);
        }
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
                            return;
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }
        }
    }

    async function streamGenerationAPI(prompt, onToken, provider, apiKey, model, customEndpoint, temperature, maxTokens, app, useProviderDefaults, abortSignal, extraParams = {}) {
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
        const maxTok = Math.round(rawWordTarget * 2.0);

        // Check if user has explicitly forced non-streaming mode
        const userForcedNonStreaming = app?.forceNonStreaming || false;

        // Detect thinking models that don't support streaming
        // This includes known patterns and can be expanded as new models emerge
        // TODO: Consider adding a user-facing "Force non-streaming" toggle in AI settings
        // for models that aren't auto-detected but still need it
        const modelLower = (model || '').toLowerCase();
        const isThinkingModel = model && (
            // OpenAI o-series (o1, o3, o4, etc.)
            /\bo[0-9][-_]/.test(model) ||
            // Explicit reasoning/thinking indicators
            modelLower.includes('reasoning') ||
            modelLower.includes('think') ||
            modelLower.includes('thought') ||
            // Known thinking model families
            modelLower.includes('deepseek-reasoner') ||
            modelLower.includes('qwq') ||
            modelLower.includes('r1') && modelLower.includes('deepseek')
        );

        const shouldDisableStreaming = userForcedNonStreaming || isThinkingModel;

        if (shouldDisableStreaming) {
            if (userForcedNonStreaming) {
                console.log('🔧 Non-streaming mode forced by user setting');
            }
            if (isThinkingModel) {
                console.log('🧠 Thinking model detected:', model, '- will use non-streaming mode');
            }
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
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
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
            body = {
                model: model || 'claude-3-5-sonnet-20241022',
                messages: messages,
                stream: true // Anthropic models all support streaming
            };
            // Anthropic requires max_tokens — always send it
            body.max_tokens = maxTok;
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
            if (!useProviderDefaults) {
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
            body = {
                model: model || 'gpt-4o-mini',
                messages: messages,
                stream: !shouldDisableStreaming // Disable streaming for thinking models or if forced
            };
            body.max_tokens = maxTok;
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
            if (!useProviderDefaults) {
                body.temperature = temp;
                if (extraParams.topP !== undefined) body.top_p = extraParams.topP;
                if (extraParams.frequencyPenalty !== undefined) body.frequency_penalty = extraParams.frequencyPenalty;
                if (extraParams.presencePenalty !== undefined) body.presence_penalty = extraParams.presencePenalty;
                if (extraParams.seed !== undefined) body.seed = extraParams.seed;
            }
        } else if (provider === 'google') {
            // Google AI uses a different API format - extract text from messages
            const text = messages.map(m => m.content).join('\n\n');
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            body = {
                contents: [{ parts: [{ text: text }] }]
            };
            if (!useProviderDefaults) {
                body.generationConfig = {
                    temperature: temp,
                    maxOutputTokens: maxTok
                };
                if (extraParams.topP !== undefined) body.generationConfig.topP = extraParams.topP;
                if (extraParams.topK !== undefined) body.generationConfig.topK = extraParams.topK;
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
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
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
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
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
            if (rawWordTarget >= 100) body.min_tokens = Math.round(rawWordTarget * 1.0);
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
            if (provider === 'openrouter' || provider === 'openai' || provider === 'nanogpt' || provider === 'lmstudio' || provider === 'custom') {
                content = data.choices?.[0]?.message?.content;
                finishReason = data.choices?.[0]?.finish_reason;

                // For thinking models (o1, o3, etc.) that return encrypted reasoning,
                // check if content is empty but there's a finish_reason
                if (!content && finishReason) {
                    console.warn('⚠️ Thinking model returned empty content. This usually means:');
                    console.warn('   - Max tokens was hit during reasoning phase');
                    console.warn('   - Model never produced final answer');
                    console.warn('   - Try increasing max_tokens significantly (10000+) for thinking models');
                    throw new Error('Thinking model returned empty response. The model likely hit max_tokens during its reasoning phase before generating an answer. Try increasing the target length to a higher value in AI Settings.');
                }
            } else if (provider === 'anthropic') {
                content = data.content?.[0]?.text;
                finishReason = data.stop_reason;
            } else if (provider === 'google') {
                content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                finishReason = data.candidates?.[0]?.finishReason;
            }

            console.log('✅ Extracted content length:', content?.length || 0);
            console.log('🏁 Finish reason:', finishReason);

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
            return { finishReason };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hasReceivedContent = false;
        let finishReason = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;

                try {
                    // Handle different streaming formats
                    let jsonStr = line;
                    if (line.startsWith('data: ')) jsonStr = line.slice(6);
                    if (jsonStr === '[DONE]') {
                        console.log('🏁 Stream finished with [DONE]');
                        if (!hasReceivedContent) {
                            console.warn('⚠️ Stream ended without content - possible thinking model without streaming support');
                        }
                        return { finishReason };
                    }

                    const data = JSON.parse(jsonStr);

                    // Debug: Log every chunk to see what we're receiving
                    if (!hasReceivedContent) {
                        console.log('🔍 First chunk received:', JSON.stringify(data, null, 2));
                    }

                    // Extract token based on provider format
                    let token = null;
                    if (provider === 'openrouter' || provider === 'openai' || provider === 'nanogpt' || provider === 'lmstudio' || provider === 'custom') {
                        // Capture finish_reason if present
                        if (data.choices?.[0]?.finish_reason) {
                            finishReason = data.choices[0].finish_reason;
                        }

                        // For thinking models (o1, o3, etc), reasoning is in a separate field
                        // We want to capture both reasoning and regular content
                        const delta = data.choices?.[0]?.delta;
                        if (delta) {
                            // Try reasoning_content first (for thinking models)
                            token = delta.reasoning_content || delta.content;

                            if (!hasReceivedContent && delta) {
                                console.log('🔍 Delta object:', JSON.stringify(delta, null, 2));
                            }
                        }

                        // Some models put the complete message in the first chunk
                        if (!token && data.choices?.[0]?.message?.content) {
                            token = data.choices[0].message.content;
                            console.log('📝 Found complete message in chunk');
                        }
                    } else if (provider === 'anthropic') {
                        if (data.type === 'content_block_delta') {
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
                        onToken(token);
                    } else if (!hasReceivedContent) {
                        console.log('⚠️ No token extracted from chunk');
                    }
                } catch (e) {
                    // Ignore parse errors for incomplete chunks
                    console.debug('Parse error (likely incomplete chunk):', e.message);
                }
            }
        }

        if (!hasReceivedContent) {
            console.error('⚠️ No content received from stream');
            console.error('This usually happens with thinking models that either:');
            console.error('1. Do not support streaming at all');
            console.error('2. Return content in a different field structure');
            console.error('3. Require stream=false in the API request');
            throw new Error('No content received from API. This model may not support streaming or may require different parameters.');
        }

        console.log('🏁 Final finish reason:', finishReason);
        return { finishReason };
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

        let genreSentence = '';
        if (options.projectGenres && options.projectGenres.length > 0 && window.GenreDefs) {
            const descriptors = window.GenreDefs.getPromptDescriptor(options.projectGenres);
            if (descriptors.length > 0) {
                const labels = options.projectGenres
                    .map(gid => window.GenreDefs.findGenre(gid)?.label || gid)
                    .join(' ');
                genreSentence = `\nThis is a ${labels} story. Write with ${descriptors.join(', and ')}.`;
            }
        }

        const targetWords = options.maxTokens || 300;
        const lengthInstruction = `at least ${targetWords} words`;

        let systemPrompt;
        if (options.systemPrompt && typeof options.systemPrompt === 'string' && options.systemPrompt.trim()) {
            systemPrompt = options.systemPrompt.trim()
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
                    const title = ce.title || ('entry ' + (ce.id || ''));
                    const body = (ce.body || ce.body || ce.description || '') || ce.body || '';
                    compendiumText += `\n-- ${title} --\n${body}\n`;
                } catch (e) { /* ignore */ }
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
            app.beatAbortController = new AbortController();
            app._genFollow = true;
            const ta = document.querySelector('.editor-textarea');
            if (ta) {
                const onScroll = () => {
                    app._genFollow = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 20;
                };
                ta.addEventListener('scroll', onScroll);
                app._genScrollCleanup = () => ta.removeEventListener('scroll', onScroll);
            }
            await streamGeneration(prompt, (token) => {
                app.currentScene.content += token;
                app.lastGenText += token;
                app.$nextTick(() => {
                    const ta = document.querySelector('.editor-textarea');
                    if (ta && app._genFollow) ta.scrollTop = ta.scrollHeight;
                });
            }, app, app.beatAbortController.signal);
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
            await app.saveScene();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Flow generation stopped by user');
                app.showGenActions = true;
            } else {
                console.error('Flow generation error:', error);
                alert('Failed to generate text. Make sure llama-server is running.\n\nError: ' + (error && error.message ? error.message : error));
            }
        } finally {
            if (app._genScrollCleanup) {
                app._genScrollCleanup();
                app._genScrollCleanup = null;
            }
            app.beatAbortController = null;
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
            // Create abort controller for this generation
            app.beatAbortController = new AbortController();
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
            // Stream tokens and append into the current scene
            await streamGeneration(prompt, (token) => {
                app.currentScene.content += token;
                app.lastGenText += token;
                app.$nextTick(() => {
                    const ta = document.querySelector('.editor-textarea');
                    if (ta && app._genFollow) ta.scrollTop = ta.scrollHeight;
                });
            }, app, app.beatAbortController.signal);
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
            // Auto-save after generation
            await app.saveScene();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                app.showGenActions = true;
            } else {
                console.error('Generation error:', error);
                alert('Failed to generate text. Make sure llama-server is running.\n\nError: ' + (error && error.message ? error.message : error));
            }
        } finally {
            if (app._genScrollCleanup) {
                app._genScrollCleanup();
                app._genScrollCleanup = null;
            }
            app.beatAbortController = null;
            app.isGenerating = false;
        }
    }

    /**
     * Stop an in-progress beat generation.
     * @param {Object} app - Alpine app instance
     */
    function stopBeatGeneration(app) {
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
        const systemContent = `You are a creative writing assistant helping to develop a ${genreLabels} story. ${genreSentence} Be thorough, detailed, and consistent with the existing material.${langDirective}`;

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
        loadPromptHistory,
        generateFromBeat,
        generateFlowFromBeat,
        stopBeatGeneration
    };
})();
