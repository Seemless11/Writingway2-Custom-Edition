// src/modules/generation.js
// Extracted generation logic from app.js

const Generation = {
    // Build the prompt for AI generation
    buildPrompt(beatInput, sceneContent, opts) {
        // This is a placeholder. Actual logic should be copied from app.js
        // and may use opts: { povCharacter, pov, tense, prosePrompt, compendiumEntries, sceneSummaries }
        // For now, just concatenate for demonstration:
        let prompt = '';
        if (opts && opts.prosePrompt) prompt += opts.prosePrompt + '\n';
        if (beatInput) prompt += 'Beat: ' + beatInput + '\n';
        if (sceneContent) prompt += 'Scene: ' + sceneContent + '\n';
        // Add compendium and scene summaries if present
        if (opts && opts.compendiumEntries && opts.compendiumEntries.length) {
            prompt += '\nCompendium:\n';
            opts.compendiumEntries.forEach(e => {
                prompt += `- ${e.title || e.id}: ${e.content || ''}\n`;
            });
        }
        if (opts && opts.sceneSummaries && opts.sceneSummaries.length) {
            prompt += '\nScene Summaries:\n';
            opts.sceneSummaries.forEach(s => {
                prompt += `- ${s.title}: ${s.summary || ''}\n`;
            });
        }
        // Add POV and tense
        if (opts && opts.povCharacter) prompt += `POV Character: ${opts.povCharacter}\n`;
        if (opts && opts.pov) prompt += `POV: ${opts.pov}\n`;
        if (opts && opts.tense) prompt += `Tense: ${opts.tense}\n`;
        return prompt;
    },

    // Stream generation tokens from the AI server
    async streamGeneration(prompt, onToken, appContext) {
        // This is a placeholder for actual streaming logic.
        // In production, this would call the backend (e.g., llama-server) and stream tokens.
        // For now, simulate streaming with a timeout.
        const fakeResponse = 'This is a generated response from the AI model.';
        for (let i = 0; i < fakeResponse.length; i++) {
            await new Promise(res => setTimeout(res, 10));
            onToken(fakeResponse[i]);
        }
    }
};

Generation.loadPromptHistory = async function (app) {
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
};

Generation.generateFromBeat = async function (app) {
    const beatText = app.getCurrentBeat();
    if (!beatText || app.aiStatus !== 'ready') return;
    app.isGenerating = true;
    try {
        app.lastBeat = beatText;

        // In default mode, strip the last ##  beat line from content before generating
        let sceneContent = (app.currentScene && app.currentScene.content) || '';
        if (!app.showMiniBeatInput) {
            const lines = sceneContent.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('## ')) {
                    lines.splice(i, 1);
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
        const genOpts = { povCharacter: app.povCharacter, pov: app.pov, tense: app.tense, prosePrompt: prosePromptText, systemPrompt: systemPromptText, compendiumEntries: compEntries, sceneSummaries: sceneSummaries };
        let prompt = Generation.buildPrompt(beatText, sceneContent, genOpts);
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
        // Stream tokens and append into the current scene
        await Generation.streamGeneration(prompt, (token) => {
            app.currentScene.content += token;
            app.lastGenText += token;
            app.$nextTick(() => {
                const ta = document.querySelector('.editor-textarea');
                if (ta) ta.scrollTop = ta.scrollHeight;
            });
        }, app);
        // Generation complete — expose accept/retry/discard actions
        app.showGenActions = true;
        app.showGeneratedHighlight = true;
        // Place cursor at end and scroll to bottom
        app.$nextTick(() => {
            try {
                const ta = document.querySelector('.editor-textarea');
                if (ta) {
                    ta.focus();
                    const end = (app.currentScene && app.currentScene.content) ? app.currentScene.content.length : 0;
                    ta.selectionStart = end;
                    ta.selectionEnd = end;
                    ta.scrollTop = ta.scrollHeight;
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
        console.error('Generation error:', error);
        alert('Failed to generate text. Make sure llama-server is running.\n\nError: ' + (error && error.message ? error.message : error));
    } finally {
        app.isGenerating = false;
    }
};

window.Generation = Generation;
