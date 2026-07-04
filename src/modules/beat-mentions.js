// Beat Mentions Module
// Handles @compendium and #scene mention detection, search, selection, and resolution
// Supports both default (inline in editor) and legacy (separate beat input) modes
(function () {
    const BeatMentions = {

        /**
         * Get the active text source and textarea element based on mode
         */
        _getSource(app, e) {
            const legacy = app.showMiniBeatInput;
            if (legacy) {
                return {
                    textarea: document.querySelector('.beat-input'),
                    getText: () => app.beatInput || '',
                    setText: (val) => { app.beatInput = val; },
                    getCursor: (ta) => ta ? ta.selectionStart : 0,
                    setCursor: (ta, pos) => { if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = pos; } }
                };
            }
            // Default mode: use the editor textarea
            const ta = e ? e.target : document.querySelector('.editor-textarea');
            return {
                textarea: ta,
                getText: () => (ta && ta.value) || '',
                setText: (val) => {
                    if (app.currentScene) app.currentScene.content = val;
                },
                getCursor: (_ta) => (_ta || ta) ? (_ta || ta).selectionStart : 0,
                setCursor: (_ta, pos) => {
                    const t = _ta || ta;
                    if (t) { t.focus(); t.selectionStart = t.selectionEnd = pos; }
                }
            };
        },

        /**
         * Handle beat input changes to detect @ and # mentions
         * @param {Object} app - Alpine app instance
         * @param {Event} e - Input event
         */
        async onBeatInput(app, e) {
            try {
                const src = this._getSource(app, e);
                const ta = src.textarea;
                const pos = src.getCursor(ta);
                const text = src.getText();

                // Check for # (scene mentions) - but exclude completed mentions like #[Title]
                const lastHash = text.lastIndexOf('#', pos - 1);
                let isActiveHashSearch = false;

                if (lastHash !== -1 && (lastHash === 0 || /\s/.test(text.charAt(lastHash - 1)))) {
                    const afterHash = text.substring(lastHash, pos);
                    const hasClosingBracket = afterHash.includes(']');

                    if (!hasClosingBracket) {
                        const q = text.substring(lastHash + 1, pos).trim();
                        if (q && q.length >= 1 && !q.startsWith('[')) {
                            await this.handleSceneSearch(app, q);
                            return;
                        } else if (q.startsWith('[')) {
                            const titlePart = q.substring(1);
                            if (titlePart.length >= 1) {
                                await this.handleSceneSearch(app, titlePart);
                                return;
                            }
                        }
                        isActiveHashSearch = true;
                    }
                }

                // Check for @ (compendium mentions)
                const lastAt = text.lastIndexOf('@', pos - 1);

                if (lastAt === -1 && !isActiveHashSearch) {
                    app.showQuickSearch = false;
                    app.quickSearchMatches = [];
                    app.showSceneSearch = false;
                    app.sceneSearchMatches = [];
                    return;
                }

                if (lastAt === -1) {
                    app.showQuickSearch = false;
                    app.quickSearchMatches = [];
                    return;
                }

                const afterAt = text.substring(lastAt, pos);
                const hasClosingBracket = afterAt.includes(']');

                if (hasClosingBracket) {
                    app.showQuickSearch = false;
                    app.quickSearchMatches = [];
                    return;
                }

                if (lastAt > 0 && !/\s/.test(text.charAt(lastAt - 1))) {
                    app.showQuickSearch = false;
                    app.quickSearchMatches = [];
                    app.showSceneSearch = false;
                    app.sceneSearchMatches = [];
                    return;
                }

                const q = text.substring(lastAt + 1, pos).trim();
                const searchQuery = q.startsWith('[') ? q.substring(1) : q;

                if (!searchQuery || searchQuery.length < 1) {
                    app.showQuickSearch = false;
                    app.quickSearchMatches = [];
                    return;
                }

                const pid = app.currentProject ? app.currentProject.id : null;
                if (!pid) return;
                const all = await db.compendium.where('projectId').equals(pid).toArray();
                const lower = searchQuery.toLowerCase();
                const matches = (all || []).filter(it => (it.title || '').toLowerCase().includes(lower));
                app.quickSearchMatches = matches.slice(0, 20);
                app.quickSearchSelectedIndex = 0;
                app.showQuickSearch = app.quickSearchMatches.length > 0;
                app.showSceneSearch = false;
            } catch (err) {
                app.showQuickSearch = false;
                app.quickSearchMatches = [];
                app.showSceneSearch = false;
                app.sceneSearchMatches = [];
            }
        },

        /**
         * Search for scenes matching the query
         * @param {Object} app - Alpine app instance
         * @param {string} query - Search query
         */
        async handleSceneSearch(app, query) {
            try {
                const pid = app.currentProject ? app.currentProject.id : null;
                if (!pid) return;

                const allScenes = await db.scenes.where('projectId').equals(pid).toArray();
                const allChapters = await db.chapters.where('projectId').equals(pid).toArray();

                const chapterMap = {};
                for (const ch of allChapters) {
                    chapterMap[ch.id] = ch.title;
                }

                const lower = query.toLowerCase();

                let matches = allScenes
                    .filter(s => (s.title || '').toLowerCase().includes(lower))
                    .map(s => ({
                        ...s,
                        chapterName: chapterMap[s.chapterId] || 'Unknown Chapter',
                        hasSummary: !!(s.summary && s.summary.length > 0),
                        summaryStale: s.summaryStale === true
                    }));

                const currentChapterId = app.currentChapter?.id;
                matches.sort((a, b) => {
                    const aIsCurrent = a.chapterId === currentChapterId;
                    const bIsCurrent = b.chapterId === currentChapterId;
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    return (a.order || 0) - (b.order || 0);
                });

                app.sceneSearchMatches = matches.slice(0, 15);
                app.sceneSearchSelectedIndex = 0;
                app.showSceneSearch = app.sceneSearchMatches.length > 0;
                app.showQuickSearch = false;
            } catch (err) {
                console.error('Scene search error:', err);
                app.showSceneSearch = false;
                app.sceneSearchMatches = [];
            }
        },

        /**
         * Handle keyboard navigation in mention dropdowns
         * @param {Object} app - Alpine app instance
         * @param {Event} e - Keyboard event
         */
        onBeatKey(app, e) {
            try {
                const isSearching = app.showQuickSearch || app.showSceneSearch;
                if (!isSearching) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (app.showQuickSearch) {
                        app.quickSearchSelectedIndex = Math.min(app.quickSearchSelectedIndex + 1, (app.quickSearchMatches.length - 1));
                    } else if (app.showSceneSearch) {
                        app.sceneSearchSelectedIndex = Math.min(app.sceneSearchSelectedIndex + 1, (app.sceneSearchMatches.length - 1));
                    }
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (app.showQuickSearch) {
                        app.quickSearchSelectedIndex = Math.max(0, app.quickSearchSelectedIndex - 1);
                    } else if (app.showSceneSearch) {
                        app.sceneSearchSelectedIndex = Math.max(0, app.sceneSearchSelectedIndex - 1);
                    }
                    return;
                }
                if (e.key === 'Escape') {
                    app.showQuickSearch = false;
                    app.showSceneSearch = false;
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (app.showQuickSearch && app.quickSearchMatches && app.quickSearchMatches.length > 0) {
                        const sel = app.quickSearchMatches[app.quickSearchSelectedIndex];
                        this.selectQuickMatch(app, sel);
                    } else if (app.showSceneSearch && app.sceneSearchMatches && app.sceneSearchMatches.length > 0) {
                        const sel = app.sceneSearchMatches[app.sceneSearchSelectedIndex];
                        this.selectSceneMatch(app, sel);
                    }
                }
            } catch (err) { /* ignore */ }
        },

        /**
         * Get the active textarea element based on mode
         */
        _getTextarea(app) {
            return app.showMiniBeatInput
                ? document.querySelector('.beat-input')
                : document.querySelector('.editor-textarea');
        },

        /**
         * Select a compendium entry from the dropdown
         * @param {Object} app - Alpine app instance
         * @param {Object} item - Compendium item to insert
         */
        selectQuickMatch(app, item) {
            try {
                if (!item || !item.id) return;
                const ta = this._getTextarea(app);
                if (!ta) return;

                const pos = ta.selectionStart;
                const text = app.showMiniBeatInput ? (app.beatInput || '') : (ta.value || '');
                const lastAt = text.lastIndexOf('@', pos - 1);
                if (lastAt === -1) return;

                const before = text.substring(0, lastAt);
                const after = text.substring(pos);
                const insert = `@[${item.title}] `;
                const newText = before + insert + after;

                if (app.showMiniBeatInput) {
                    app.beatInput = newText;
                } else if (app.currentScene) {
                    app.currentScene.content = newText;
                }

                app.beatCompendiumMap[item.title] = item.id;
                if (!app.quickInsertedCompendium.includes(item.id)) app.quickInsertedCompendium.push(item.id);

                app.showQuickSearch = false;
                app.quickSearchMatches = [];

                app.$nextTick(() => {
                    try {
                        const t = this._getTextarea(app);
                        if (t) { t.focus(); t.selectionStart = t.selectionEnd = (before + insert).length; }
                    } catch (e) { }
                });
            } catch (e) { console.error('selectQuickMatch error', e); }
        },

        /**
         * Select a scene from the dropdown
         * @param {Object} app - Alpine app instance
         * @param {Object} scene - Scene to insert
         */
        selectSceneMatch(app, scene) {
            try {
                if (!scene || !scene.id) return;

                const hasSummary = scene.summary && scene.summary.length > 0;
                const isStale = scene.summaryStale === true;

                if (!hasSummary) {
                    alert(`⚠️ Scene "${scene.title}" has no summary.\n\nPlease create a summary first by:\n1. Opening the scene's menu (...)\n2. Selecting "Summary"\n3. Clicking "Summarize" then "Save"`);
                    app.showSceneSearch = false;
                    return;
                }

                if (isStale) {
                    const proceed = confirm(`⚠️ Scene "${scene.title}" has an outdated summary.\n\nThe summary may not reflect recent changes.\n\nDo you want to use it anyway?\n\n(Tip: Update the summary first for better results)`);
                    if (!proceed) {
                        app.showSceneSearch = false;
                        return;
                    }
                }

                const ta = this._getTextarea(app);
                if (!ta) return;

                const pos = ta.selectionStart;
                const text = app.showMiniBeatInput ? (app.beatInput || '') : (ta.value || '');
                const lastHash = text.lastIndexOf('#', pos - 1);
                if (lastHash === -1) return;

                const before = text.substring(0, lastHash);
                const after = text.substring(pos);
                const insert = `#[${scene.title}] `;
                const newText = before + insert + after;

                if (app.showMiniBeatInput) {
                    app.beatInput = newText;
                } else if (app.currentScene) {
                    app.currentScene.content = newText;
                }

                app.beatSceneMap[scene.title] = scene.id;
                if (!app.quickInsertedScenes.includes(scene.id)) app.quickInsertedScenes.push(scene.id);

                app.showSceneSearch = false;
                app.sceneSearchMatches = [];

                app.$nextTick(() => {
                    try {
                        const t = this._getTextarea(app);
                        if (t) { t.focus(); t.selectionStart = t.selectionEnd = (before + insert).length; }
                    } catch (e) { }
                });
            } catch (e) { console.error('selectSceneMatch error', e); }
        },

        /**
         * Parse beatInput for @[Title] mentions and return resolved compendium rows
         * Also includes entries marked with alwaysInContext flag
         * @param {Object} app - Alpine app instance
         * @param {string} beatText - Beat text to parse
         * @returns {Promise<Array>} Array of compendium entries
         */
        async resolveCompendiumEntriesFromBeat(app, beatText) {
            try {
                const ids = new Set();

                if (app.currentProject && app.currentProject.id) {
                    try {
                        const alwaysInContext = await db.compendium
                            .where('projectId')
                            .equals(app.currentProject.id)
                            .filter(e => e.alwaysInContext === true)
                            .toArray();
                        for (const entry of alwaysInContext) {
                            ids.add(entry.id);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch alwaysInContext entries:', e);
                    }
                }

                if (beatText) {
                    const reMention = /@\[([^\]]+)\]/g;
                    let m;
                    while ((m = reMention.exec(beatText)) !== null) {
                        const title = m[1];
                        if (app.beatCompendiumMap[title]) {
                            ids.add(app.beatCompendiumMap[title]);
                        }
                    }

                    const reLegacy = /\[\[comp:([^\]]+)\]\]/g;
                    while ((m = reLegacy.exec(beatText)) !== null) {
                        if (m[1]) ids.add(m[1]);
                    }
                }

                const out = [];
                for (const id of ids) {
                    try {
                        const row = await db.compendium.get(id);
                        if (row) out.push(row);
                    } catch (e) { /* ignore */ }
                }
                return out;
            } catch (e) { return []; }
        },

        /**
         * Parse beatInput for #[Title] mentions and return resolved scene summaries
         * @param {Object} app - Alpine app instance
         * @param {string} beatText - Beat text to parse
         * @returns {Promise<Array>} Array of scene summary objects
         */
        async resolveSceneSummariesFromBeat(app, beatText) {
            try {
                if (!beatText) return [];
                const ids = new Set();

                const reMention = /#\[([^\]]+)\]/g;
                let m;
                while ((m = reMention.exec(beatText)) !== null) {
                    const title = m[1];
                    if (app.beatSceneMap[title]) {
                        ids.add(app.beatSceneMap[title]);
                    }
                }

                const out = [];
                for (const id of ids) {
                    try {
                        const scene = await db.scenes.get(id);
                        if (scene && scene.summary) {
                            out.push({
                                title: scene.title,
                                summary: scene.summary
                            });
                        }
                    } catch (e) { /* ignore */ }
                }
                return out;
            } catch (e) { return []; }
        }
    };

    window.BeatMentions = BeatMentions;

    window.__test = window.__test || {};
    window.__test.BeatMentions = BeatMentions;
})();