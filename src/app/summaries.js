/**
 * summaries — Scene and chapter summary generation.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Open the summary slide-panel for a scene (foundation - placeholder)
            async openSceneSummary(sceneId) {
                try {
                    const scene = (this.scenes || []).find(s => s.id === sceneId) || (this.currentScene && this.currentScene.id === sceneId ? this.currentScene : null);
                    this.summaryTargetSceneId = sceneId;
                    this.summaryTargetChapterId = null;
                    this.summaryText = (scene && (scene.summary || '')) || '';
                    // Load tags (array to comma-separated string)
                    this.sceneTags = (scene && scene.tags && Array.isArray(scene.tags)) ? scene.tags.join(', ') : '';
                    this.showSummaryPanel = true;
                } catch (e) {
                    console.error('openSceneSummary error', e);
                }
            },

            // Open the summary slide-panel for a chapter
            async openChapterSummary(chapterId) {
                try {
                    const chapter = (this.chapters || []).find(c => c.id === chapterId);
                    this.summaryTargetChapterId = chapterId;
                    this.summaryTargetSceneId = null;
                    this.summaryText = (chapter && (chapter.summary || '')) || '';
                    this.sceneTags = ''; // Clear tags for chapters
                    this.showSummaryPanel = true;
                } catch (e) {
                    console.error('openChapterSummary error', e);
                }
            },

            // Placeholder: generate a quick summary from the scene content (client-side heuristic)
            async summarizeScene() {
                try {
                    const id = this.summaryTargetSceneId;
                    if (!id) return;

                    // Check if we should use AI or heuristic
                    const summaryPrompts = this.prompts.filter(p => p.category === 'summary');
                    const usePrompt = this.selectedSummaryPromptId
                        ? summaryPrompts.find(p => p.id === this.selectedSummaryPromptId)
                        : summaryPrompts[0]; // Use first summary prompt as default

                    // Take the scene text if loaded, fall back to scenes list
                    const scene = (this.scenes || []).find(s => s.id === id) || (this.currentScene && this.currentScene.id === id ? this.currentScene : null);
                    const text = (scene && scene.content) || (this.currentScene && this.currentScene.content) || '';
                    if (!text) {
                        this.summaryText = '';
                        return;
                    }

                    // If we have a summary prompt and AI is ready, use AI
                    if (usePrompt && window.Generation && this.aiStatus === 'ready') {
                        try {
                            this.summaryText = 'Generating summary...';
                            const promptText = usePrompt.content || '';

                            // Build proper messages array with system instruction and user content
                            const summaryLang = this.language || this.currentProject?.language || 'English';
                            const langDirective = summaryLang !== 'English' ? `\n\nWrite entirely in ${summaryLang}.` : '';
                            const messages = [
                                { role: 'system', content: promptText + langDirective },
                                { role: 'user', content: `Analyze the following scene text in depth. Focus on character motivations, emotional arcs, and narrative significance — not just a recap of events:\n\n${text}` }
                            ];

                            // Debug logging to verify which prompt is being used
                            console.log('🎯 Summarizing with prompt:', usePrompt.title);
                            console.log('📝 Prompt content:', promptText.slice(0, 100) + '...');
                            console.log('📄 Scene length:', text.length, 'characters');

                            let result = '';
                            await window.Generation.streamGeneration(messages, (token) => {
                                if (result === '' && this.summaryText === 'Generating summary...') {
                                    this.summaryText = '';
                                }
                                result += token;
                                this.summaryText = result;
                            }, this);
                            return;
                        } catch (aiError) {
                            console.warn('AI summary failed, falling back to heuristic:', aiError);
                            // Fall through to heuristic below
                        }
                    }

                    // Fallback: use a hardcoded summary prompt if AI is available
                    if (window.Generation && this.aiStatus === 'ready') {
                        try {
                            this.summaryText = 'Generating summary...';
                            const hardcodedPrompt = 'You are a literary analysis assistant. Analyze the text below in depth — explore character motivations, emotional undercurrents, thematic significance, and narrative craft. Explain why moments matter, what they reveal, and how they serve the larger story. Do not simply recount events. Write as much as needed for a thorough analysis.';
                            const summaryLang = this.language || this.currentProject?.language || 'English';
                            const langDirective = summaryLang !== 'English' ? `\n\nWrite entirely in ${summaryLang}.` : '';
                            const messages = [
                                { role: 'system', content: hardcodedPrompt + langDirective },
                                { role: 'user', content: `Analyze the following scene text in depth. Focus on character motivations, emotional arcs, and narrative significance — not just a recap of events:\n\n${text}` }
                            ];
                            let result = '';
                            await window.Generation.streamGeneration(messages, (token) => {
                                if (result === '' && this.summaryText === 'Generating summary...') {
                                    this.summaryText = '';
                                }
                                result += token;
                                this.summaryText = result;
                            }, this);
                            return;
                        } catch (aiError) {
                            console.warn('AI summary fallback also failed:', aiError);
                        }
                    }

                    // Last resort: Simple heuristic - take first 2 sentences or first 200 chars
                    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
                    let summary = '';
                    if (sentences.length >= 2) {
                        summary = (sentences[0] + ' ' + sentences[1]).trim();
                    } else {
                        summary = text.replace(/\s+/g, ' ').trim().slice(0, 200);
                        if (text.length > 200) summary += '…';
                    }
                    this.summaryText = summary;
                } catch (e) {
                    console.error('summarizeScene error', e);
                }
            },

            // Save the summary into IndexedDB and update in-memory scene
            async saveSceneSummary() {
                try {
                    const id = this.summaryTargetSceneId;
                    if (!id) return;

                    // Parse tags from comma-separated string to array
                    const tagsArray = this.sceneTags
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);

                    // update DB (create/overwrite summary field and summaryUpdated)
                    // Safe-merge update: read current record, merge summary fields, then put back.
                    try {
                        const cur = await db.scenes.get(id) || {};
                        const merged = Object.assign({}, cur, {
                            summary: this.summaryText,
                            summaryUpdated: new Date().toISOString(),
                            summarySource: 'manual',
                            summaryStale: false,
                            tags: tagsArray,
                            modified: new Date(),
                            id
                        });
                        await db.scenes.put(merged);
                    } catch (e) {
                        console.warn('[App] saveSceneSummary write/readback failed', e);
                    }

                    // (watcher removed)

                    // Update in-memory scenes list
                    const s = (this.scenes || []).find(x => x.id === id);
                    if (s) {
                        s.summary = this.summaryText;
                        s.summaryUpdated = new Date().toISOString();
                        s.summarySource = 'manual';
                        s.summaryStale = false;
                        s.tags = tagsArray;
                    }
                    // Also update chapter-scoped scenes so the sidebar reflects changes immediately
                    try {
                        const sceneObj = (this.scenes || []).find(x => x.id === id) || this.currentScene;
                        if (sceneObj && sceneObj.chapterId) {
                            const ch = (this.chapters || []).find(c => c.id === sceneObj.chapterId);
                            if (ch && Array.isArray(ch.scenes)) {
                                const cs = ch.scenes.find(x => x.id === id);
                                if (cs) {
                                    cs.summary = this.summaryText;
                                    cs.summaryUpdated = new Date().toISOString();
                                    cs.summarySource = 'manual';
                                    cs.summaryStale = false;
                                    cs.tags = tagsArray;
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                    if (this.currentScene && this.currentScene.id === id) {
                        this.currentScene.summary = this.summaryText;
                        this.currentScene.summaryUpdated = new Date().toISOString();
                        this.currentScene.summarySource = 'manual';
                        this.currentScene.summaryStale = false;
                        this.currentScene.tags = tagsArray;
                    }

                    this.showSummaryPanel = false;
                    this.summaryTargetSceneId = null;
                    this.summaryText = '';
                    this.sceneTags = '';
                    this.saveStatus = 'Summary saved';
                    setTimeout(() => { this.saveStatus = 'Saved'; }, 1200);
                } catch (e) {
                    console.error('saveSceneSummary error', e);
                }
            },

            // Generate chapter summary from all scene summaries in the chapter
            async summarizeChapter() {
                try {
                    const id = this.summaryTargetChapterId;
                    if (!id) return;

                    const chapter = (this.chapters || []).find(c => c.id === id);
                    if (!chapter || !chapter.scenes || chapter.scenes.length === 0) {
                        this.summaryText = 'No scenes in this chapter to summarize.';
                        return;
                    }

                    // Check if we should use AI or heuristic
                    const summaryPrompts = this.prompts.filter(p => p.category === 'summary');
                    const usePrompt = this.selectedSummaryPromptId
                        ? summaryPrompts.find(p => p.id === this.selectedSummaryPromptId)
                        : summaryPrompts[0]; // Use first summary prompt as default

                    // Collect all scene summaries
                    const sceneSummaries = chapter.scenes
                        .filter(s => s.summary)
                        .map(s => `${s.title}: ${s.summary}`)
                        .join('\n\n');

                    if (!sceneSummaries) {
                        this.summaryText = 'No scene summaries available. Please summarize individual scenes first.';
                        return;
                    }

                    // If we have a summary prompt and AI is ready, use AI
                    if (usePrompt && window.Generation && this.aiStatus === 'ready') {
                        try {
                            this.summaryText = 'Generating chapter summary...';
                            const promptText = usePrompt.content || '';

                            // Build proper messages array with system instruction and user content
                            const chapterLang = this.language || this.currentProject?.language || 'English';
                            const langDirective = chapterLang !== 'English' ? `\n\nWrite entirely in ${chapterLang}.` : '';
                            const messages = [
                                { role: 'system', content: promptText + langDirective },
                                { role: 'user', content: `Synthesize these scene summaries into a cohesive chapter analysis. Identify overarching character arcs, thematic threads, and narrative momentum that connect the scenes — not just a sequence of events:\n\n${sceneSummaries}` }
                            ];

                            console.log('🎯 Summarizing chapter with prompt:', usePrompt.title);
                            console.log('📝 Chapter:', chapter.title);
                            console.log('📄 Scene summaries count:', chapter.scenes.filter(s => s.summary).length);

                            let result = '';
                            await window.Generation.streamGeneration(messages, (token) => {
                                if (result === '' && this.summaryText === 'Generating chapter summary...') {
                                    this.summaryText = '';
                                }
                                result += token;
                                this.summaryText = result;
                            }, this);
                            return;
                        } catch (aiError) {
                            console.warn('AI chapter summary failed, falling back to heuristic:', aiError);
                            // Fall through to heuristic below
                        }
                    }

                    // Fallback: use a hardcoded summary prompt if AI is available
                    if (window.Generation && this.aiStatus === 'ready') {
                        try {
                            this.summaryText = 'Generating chapter summary...';
                            const hardcodedPrompt = 'You are a literary analysis assistant. Analyze the text below in depth — explore character motivations, emotional undercurrents, thematic significance, and narrative craft. Explain why moments matter, what they reveal, and how they serve the larger story. Do not simply recount events. Write as much as needed for a thorough analysis.';
                            const chapterLang = this.language || this.currentProject?.language || 'English';
                            const langDirective = chapterLang !== 'English' ? `\n\nWrite entirely in ${chapterLang}.` : '';
                            const messages = [
                                { role: 'system', content: hardcodedPrompt + langDirective },
                                { role: 'user', content: `Synthesize these scene summaries into a cohesive chapter analysis. Identify overarching character arcs, thematic threads, and narrative momentum that connect the scenes — not just a sequence of events:\n\n${sceneSummaries}` }
                            ];
                            let result = '';
                            await window.Generation.streamGeneration(messages, (token) => {
                                if (result === '' && this.summaryText === 'Generating chapter summary...') {
                                    this.summaryText = '';
                                }
                                result += token;
                                this.summaryText = result;
                            }, this);
                            return;
                        } catch (aiError) {
                            console.warn('AI chapter summary fallback also failed:', aiError);
                        }
                    }

                    // Last resort: concatenation of scene summaries
                    this.summaryText = sceneSummaries;
                } catch (e) {
                    console.error('summarizeChapter error', e);
                }
            },

            // Save the chapter summary into IndexedDB and update in-memory chapter
            async saveChapterSummary() {
                try {
                    const id = this.summaryTargetChapterId;
                    if (!id) return;

                    // Update DB
                    try {
                        const cur = await db.chapters.get(id) || {};
                        const merged = Object.assign({}, cur, {
                            summary: this.summaryText,
                            summaryUpdated: new Date().toISOString(),
                            summarySource: 'manual',
                            summaryStale: false,
                            modified: new Date(),
                            id
                        });
                        await db.chapters.put(merged);
                    } catch (e) {
                        console.warn('[App] saveChapterSummary write/readback failed', e);
                    }

                    // Update in-memory chapters list
                    const ch = this.chapters.find(c => c.id === id);
                    if (ch) {
                        ch.summary = this.summaryText;
                        ch.summaryUpdated = new Date().toISOString();
                        ch.summarySource = 'manual';
                        ch.summaryStale = false;
                    }

                    this.showSummaryPanel = false;
                    this.summaryTargetChapterId = null;
                    this.summaryText = '';

                    console.log('✅ Chapter summary saved:', id);
                } catch (e) {
                    console.error('saveChapterSummary error', e);
                }
            },
});
