/**
 * generation — Beat generation, prompt preview, scene saving.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            stopBeatGeneration() {
                window.Generation.stopBeatGeneration(this);
            },

            // Parse beatInput for @[Title] mentions and return resolved compendium rows
            async resolveCompendiumEntriesFromBeat(beatText) {
                return window.ContextPanel ? await window.ContextPanel.resolveCompendiumEntriesFromBeat(this, beatText) : [];
            },

            // Parse beatInput for #[Title] mentions and return resolved scene summaries
            async resolveSceneSummariesFromBeat(beatText) {
                return window.ContextPanel ? await window.ContextPanel.resolveSceneSummariesFromBeat(this, beatText) : [];
            },

            // Temporary: build and show the exact prompt that will be sent to the LLM.
            // This honors POV, tense, selected prose prompt, and includes scene context.
            async previewPrompt() {
                const beatText = this.getCurrentBeat();
                if (!beatText) {
                    alert('No beat provided to preview. Type ## your beat or switch to legacy mode.');
                    return;
                }

                try {
                    // Resolve prose prompt text and system prompt (in-memory first, then DB fallback)
                    const proseInfo = await this.resolveProsePromptInfo();
                    const prosePromptText = proseInfo && proseInfo.text ? proseInfo.text : null;
                    const systemPromptText = proseInfo && proseInfo.systemText ? proseInfo.systemText : null;

                    // Get context from context panel
                    const panelContext = await this.buildContextFromPanel();

                    // Resolve compendium entries and scene summaries from beat mentions
                    let beatCompEntries = [];
                    let beatSceneSummaries = [];
                    try { beatCompEntries = await this.resolveCompendiumEntriesFromBeat(beatText); } catch (e) { beatCompEntries = []; }
                    try { beatSceneSummaries = await this.resolveSceneSummariesFromBeat(beatText); } catch (e) { beatSceneSummaries = []; }

                    // Merge context
                    const compMap = new Map();
                    panelContext.compendiumEntries.forEach(e => compMap.set(e.id, e));
                    beatCompEntries.forEach(e => compMap.set(e.id, e));
                    const compEntries = Array.from(compMap.values());

                    const sceneMap = new Map();
                    panelContext.sceneSummaries.forEach(s => sceneMap.set(s.title, s));
                    beatSceneSummaries.forEach(s => sceneMap.set(s.title, s));
                    const sceneSummaries = Array.from(sceneMap.values());

                    let prompt;
                    if (window.Generation && typeof window.Generation.buildPrompt === 'function') {
                        // DEBUG: log resolved prose info and options
                        try { console.debug('[preview] proseInfo=', proseInfo); } catch (e) { }
                        const optsPreview = { povCharacter: this.povCharacter, pov: this.pov, tense: this.tense, language: this.language || this.currentProject?.language || 'English', prosePrompt: prosePromptText, systemPrompt: systemPromptText, compendiumEntries: compEntries, sceneSummaries: sceneSummaries, maxTokens: this.maxTokens, preview: true };
                        try { console.debug('[preview] buildPrompt opts:', { proseType: typeof optsPreview.prosePrompt, len: optsPreview.prosePrompt ? optsPreview.prosePrompt.length : 0 }); } catch (e) { }
                        try { console.debug('[preview] prosePrompt raw:', JSON.stringify(optsPreview.prosePrompt)); } catch (e) { }
                        prompt = window.Generation.buildPrompt(beatText, this.currentScene?.content || '', optsPreview);
                        try { console.debug('[preview] builtPrompt preview:', String(prompt).slice(0, 600).replace(/\n/g, '\\n')); } catch (e) { }
                    } else {
                        // Fallback textual representation if generation module isn't loaded
                        prompt = `=== PREVIEW PROMPT ===\nBEAT:\n${beatText}\n\nPOV CHARACTER: ${this.povCharacter || ''}\nPOV: ${this.pov}\nTENSE: ${this.tense}\nLANGUAGE: ${this.language || this.currentProject?.language || 'English'}\n\n---\n(Scene content below)\n${this.currentScene?.content || ''}\n\n---\n(System prompt)\n${systemPromptText || '(default)'}\n\n---\n(User prompt)\n${prosePromptText || '(none)'}\n`;
                    }

                    // Create a simple overlay showing the prompt in a read-only textarea so the user can inspect/copy it.
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.left = '0';
                    overlay.style.top = '0';
                    overlay.style.right = '0';
                    overlay.style.bottom = '0';
                    overlay.style.background = 'rgba(0,0,0,0.6)';
                    overlay.style.zIndex = 99999;
                    overlay.style.display = 'flex';
                    overlay.style.alignItems = 'center';
                    overlay.style.justifyContent = 'center';

                    const box = document.createElement('div');
                    box.style.width = '80%';
                    box.style.maxWidth = '900px';
                    box.style.maxHeight = '80%';
                    box.style.background = 'var(--bg-primary)';
                    box.style.color = 'var(--text-primary)';
                    box.style.padding = '12px';
                    box.style.borderRadius = '8px';
                    box.style.overflow = 'auto';
                    box.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';

                    // Header showing which prompt id/source was resolved (helps debug why fallback used)
                    const header = document.createElement('div');
                    header.style.fontSize = '13px';
                    header.style.color = 'var(--text-secondary)';
                    header.style.marginBottom = '8px';
                    const resolvedId = (proseInfo && proseInfo.id) ? proseInfo.id : '(none)';
                    const resolvedSource = (proseInfo && proseInfo.source) ? proseInfo.source : 'none';
                    header.textContent = `Resolved prose prompt: ${resolvedId} (${resolvedSource})`;

                    const ta = document.createElement('textarea');
                    ta.readOnly = true;
                    ta.style.width = '100%';
                    ta.style.height = '60vh';
                    ta.style.whiteSpace = 'pre-wrap';
                    ta.style.fontFamily = 'monospace';
                    ta.style.fontSize = '13px';
                    ta.value = typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2);

                    const controls = document.createElement('div');
                    controls.style.display = 'flex';
                    controls.style.justifyContent = 'flex-end';
                    controls.style.marginTop = '8px';

                    const close = document.createElement('button');
                    close.textContent = 'Close';
                    close.className = 'btn btn-primary';
                    close.onclick = () => { overlay.remove(); };

                    const copy = document.createElement('button');
                    copy.textContent = 'Copy';
                    copy.className = 'btn btn-secondary';
                    copy.style.marginRight = '8px';
                    copy.onclick = () => {
                        try {
                            ta.select();
                            document.execCommand('copy');
                        } catch (e) { /* ignore */ }
                        copy.textContent = 'Copied';
                        setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
                    };

                    controls.appendChild(copy);
                    controls.appendChild(close);

                    box.appendChild(header);
                    box.appendChild(ta);
                    box.appendChild(controls);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);

                } catch (e) {
                    console.error('previewPrompt error', e);
                    alert('Failed to build preview prompt: ' + (e && e.message ? e.message : e));
                }
            },

            // Resolve the prose prompt content by id: check in-memory prompts then fall back to DB read.
            async resolveProsePromptText() {
                try {
                    if (this.selectedProsePromptId) {
                        let p = (this.prompts || []).find(x => x.id === this.selectedProsePromptId && x.category === 'prose');
                        if (!p) {
                            try { p = await db.prompts.get(this.selectedProsePromptId); } catch (e) { p = null; }
                        }
                        if (p && p.content) return p.content;
                    }
                } catch (e) {
                    // ignore and fallthrough
                }

                if (this.currentPrompt && this.currentPrompt.content) return this.currentPrompt.content;
                return null;
            },

            // More detailed resolver that returns the prompt text, id and source (memory/db/current/none)
            async resolveProsePromptInfo() {
                return window.ContextPanel ? await window.ContextPanel.resolveProsePromptInfo(this) : { id: null, text: null, source: 'none' };
            },

            async saveScene(opts) {
                opts = opts || {};
                // Delegate to extracted save utility when available
                if (window.Save && typeof window.Save.saveScene === 'function') {
                    try {
                        return await window.Save.saveScene(this, opts);
                    } catch (err) {
                        // If helper fails, fall through to fallback behavior
                        console.error('Save helper failed, falling back to inline save:', err);
                    }
                }

                // Fallback (inlined) save behavior if save-utils is not loaded or failed
                if (!this.currentScene) return;

                this.isSaving = true;
                this.saveStatus = 'Saving...';


                const wordCount = this.countWords(this.currentScene.content);

                // Read previous records to detect content changes and mark summary stale if needed
                let prevContent = null;
                let prevScene = null;
                try {
                    prevContent = await db.content.get(this.currentScene.id);
                } catch (e) { /* ignore */ }
                try {
                    prevScene = await db.scenes.get(this.currentScene.id);
                } catch (e) { /* ignore */ }

                await db.content.put({
                    sceneId: this.currentScene.id,
                    text: this.currentScene.content,
                    wordCount: wordCount
                });

                const scenePatch = { modified: new Date() };
                try {
                    const contentChanged = prevContent && (prevContent.text || '') !== (this.currentScene.content || '');
                    // Only mark summary stale automatically during autosave events
                    if (contentChanged && prevScene && prevScene.summary && opts && opts.autosave) {
                        scenePatch.summaryStale = true;
                    }
                    // (debug log removed)
                } catch (e) { /* ignore */ }

                // Safe-merge update to avoid removing fields like `summary`.
                try {
                    const cur = await db.scenes.get(this.currentScene.id) || {};
                    const merged = Object.assign({}, cur, scenePatch, { id: this.currentScene.id });
                    await db.scenes.put(merged);
                    // (debug log removed)
                } catch (e) {
                    // fallback to update if put fails
                    try { await db.scenes.update(this.currentScene.id, scenePatch); } catch (err) { console.warn('fallback update failed', err); }
                    try {
                        const dbScene = await db.scenes.get(this.currentScene.id);
                    } catch (err) { /* ignore */ }
                }

                // persist generation options per-scene
                try {
                    await db.scenes.update(this.currentScene.id, {
                        povCharacter: this.povCharacter || '',
                        pov: this.pov || '3rd person limited',
                        tense: this.tense || 'past',
                        language: this.language || this.currentProject?.language || 'English'
                    });
                } catch (e) {
                    console.warn('Failed to persist scene generation options:', e);
                }

                const sceneIndex = this.scenes.findIndex(s => s.id === this.currentScene.id);
                if (sceneIndex !== -1) {
                    this.scenes[sceneIndex].wordCount = wordCount;
                    if (scenePatch.summaryStale) this.scenes[sceneIndex].summaryStale = true;
                }

                // Also update in chapter lists
                for (let ch of this.chapters) {
                    if (ch.scenes) {
                        const idx = ch.scenes.findIndex(s => s.id === this.currentScene.id);
                        if (idx !== -1) ch.scenes[idx].wordCount = wordCount;
                        if (scenePatch.summaryStale && idx !== -1) ch.scenes[idx].summaryStale = true;
                    }
                }

                if (scenePatch.summaryStale) {
                    try {
                        if (this.currentScene) this.currentScene.summaryStale = true;
                    } catch (e) { }
                }

                this.isSaving = false;
                this.saveStatus = 'Saved';

                // Periodically check if export reminder should be shown (every 10 saves)
                if (!this._saveCount) this._saveCount = 0;
                this._saveCount++;
                if (this._saveCount % 10 === 0) {
                    this.checkExportReminder();
                }
            },

            // Generation action handlers
            async acceptGeneration() {
            // Accept — nothing to change, just hide actions and clear buffers
            this.showGenActions = false;
            this.showGeneratedHighlight = false;
            this.lastGenStart = null;
            this.lastGenText = '';
            this.lastBeat = '';
            this.lastGenTruncated = false;
                this.lastGenTrimmed = false;
                // ensure scene saved
                await this.saveScene();
            },

            async retryGeneration() {
                // Remove the last generated text and re-run generation with same beat
                // lastGenStart may be 0 (start of content), so only bail when it's null/undefined
                if (!this.currentScene || this.lastGenStart === null || this.lastGenStart === undefined) return;
                const content = this.currentScene.content || '';
                const newContent = content.slice(0, this.lastGenStart);
                this.currentScene.content = newContent;
                this.showGenActions = false;
                this.showGeneratedHighlight = false;
                this.lastGenTruncated = false;
                this.lastGenTrimmed = false;
                // save removal
                await this.saveScene();

                // restore beat and re-run
                if (this.lastBeat) {
                    if (this.showMiniBeatInput) {
                        this.beatInput = this.lastBeat;
                    } else {
                        // In default mode, re-insert the ## beat block
                        const c = this.currentScene.content || '';
                        const beatLines = this.lastBeat.split('\n');
                        const beatInsert = '## ' + beatLines[0] + (beatLines.length > 1 ? '\n' + beatLines.slice(1).join('\n') : '');
                        this.currentScene.content = c + (c ? '\n' : '') + beatInsert;
                    }
                    await this.generateFromBeat();
                }
            },

            async discardGeneration() {
                // Remove generated text and clear beat input
                // lastGenStart may be 0 (start of content), so only bail when it's null/undefined
                if (!this.currentScene || this.lastGenStart === null || this.lastGenStart === undefined) return;
                const content = this.currentScene.content || '';
                const newContent = content.slice(0, this.lastGenStart);
                this.currentScene.content = newContent;
                this.showGenActions = false;
                this.showGeneratedHighlight = false;
                this.lastGenStart = null;
                this.lastGenText = '';
                this.lastBeat = '';
                this.lastGenTruncated = false;
                this.lastGenTrimmed = false;
                if (this.showMiniBeatInput) this.beatInput = '';
                await this.saveScene();
            },

            reuseBeat(beat) {
                if (this.showMiniBeatInput) {
                    this.beatInput = beat;
                } else if (this.currentScene) {
                    const content = this.currentScene.content || '';
                    const beatLines = beat.split('\n');
                    const insert = '## ' + beatLines[0] + (beatLines.length > 1 ? '\n' + beatLines.slice(1).join('\n') : '');
                    this.currentScene.content = content + (content ? '\n' : '') + insert;
                }
                this.showPromptHistory = false;
            },

            countWords(text) {
                return window.Editor ? window.Editor.countWords(text) : 0;
            },

            // Insert special character at cursor position in editor
            insertSpecialChar(char) {
                if (window.Editor) window.Editor.insertSpecialChar(this, char);
            },

            // Handle auto-replacement of -- to em dash
            handleAutoReplace(event) {
                if (window.Editor) window.Editor.handleAutoReplace(this, event);
            },

            // AI Generation (delegates to src/modules/generation.js)
            async loadPromptHistory() {
                if (window.Generation && typeof window.Generation.loadPromptHistory === 'function') {
                    return window.Generation.loadPromptHistory(this);
                }
                // fallback (legacy)
                if (!this.currentProject) {
                    this.promptHistoryList = [];
                    return;
                }
                try {
                    const history = await db.promptHistory
                        .where('projectId')
                        .equals(this.currentProject.id)
                        .reverse()
                        .sortBy('timestamp');
                    this.promptHistoryList = history;
                } catch (e) {
                    console.error('Failed to load prompt history:', e);
                    this.promptHistoryList = [];
                }
            },

            // Build context from context panel settings
            async buildContextFromPanel() {
                return window.ContextPanel ? await window.ContextPanel.buildContextFromPanel(this) : { compendiumEntries: [], sceneSummaries: [] };
            },

            async generateFromBeat() {
                if (window.Generation && typeof window.Generation.generateFromBeat === 'function') {
                    return window.Generation.generateFromBeat(this);
                }
                // fallback: do nothing
            },

            async generateFlowFromBeat() {
                if (window.Generation && typeof window.Generation.generateFlowFromBeat === 'function') {
                    return window.Generation.generateFlowFromBeat(this);
                }
            },

            // Normalize chapter and scene order fields to be consecutive integers.
            async normalizeAllOrders() {
                if (window.DBUtils && typeof window.DBUtils.normalizeAllOrders === 'function') {
                    return window.DBUtils.normalizeAllOrders(this);
                }

                // Fallback: if DBUtils is not available, perform local normalization
                if (!this.currentProject) return;
                const chs = await db.chapters.where('projectId').equals(this.currentProject.id).sortBy('order');
                for (let i = 0; i < chs.length; i++) {
                    if (chs[i].order !== i) {
                        try { await db.chapters.update(chs[i].id, { order: i }); } catch (e) { }
                    }
                }
                for (let ch of chs) {
                    const scenes = await db.scenes.where('projectId').equals(this.currentProject.id).and(s => s.chapterId === ch.id).sortBy('order');
                    for (let j = 0; j < scenes.length; j++) {
                        if (scenes[j].order !== j) {
                            try { await db.scenes.update(scenes[j].id, { order: j }); } catch (e) { }
                        }
                    }
                }
                await this.loadChapters();
            },
});
