// Prompts module — exposes window.Prompts with functions that operate on the shared `db` instance
(function () {
    const GLOBAL_PROJECT_ID = '__global__';

    // Fallback original V1 defaults for when PromptPacks isn't loaded
    const DEFAULT_PROMPTS = [
        { category: 'prose', title: 'General Fiction Prose Prompt', content: 'Write the next scene continuing from the provided text. Maintain the established tone, style, POV, and tense. Use sensory details and vivid imagery. Show, don\'t tell. Focus on the beat provided and expand it naturally into about {length}.', systemContent: '' },
        { category: 'rewrite', title: 'General Fiction Rewrite Prompt', content: 'You are a precise line editor. Improve clarity, rhythm, and impact. Preserve the author\'s voice — tighten, sharpen, and strengthen.', systemContent: '' },
        { category: 'summary', title: 'General Fiction Summary Prompt', content: 'You are a continuity editor. Summarize the following text for continuity — who was present, what changed, new facts, and unresolved threads.', systemContent: '' },
        { category: 'workshop', title: 'General Fiction Workshop Prompt', content: 'You are a creative writing workshop assistant. Help the author brainstorm ideas, develop characters, improve prose, and explore narrative possibilities. Be supportive, constructive, and specific in your feedback. Draw on writing craft principles.', systemContent: '' }
    ];

    // V1 content signatures for untouched-prompt detection
    const V1_PROSE_CONTENT = 'Write the next scene continuing from the provided text. Maintain the established tone, style, POV, and tense. Use sensory details and vivid imagery. Show, don\'t tell. Focus on the beat provided and expand it naturally into about {length}.';
    const V1_SUMMARY_CONTENT = 'You are a literary analysis assistant. Analyze the text below in depth — explore character motivations, emotional undercurrents, thematic significance, and narrative craft. Explain why moments matter, what they reveal, and how they serve the larger story. Do not simply recount events. Write as much as needed for a thorough analysis.';
    const V1_WORKSHOP_CONTENT = 'You are a creative writing workshop assistant. Help the author brainstorm ideas, develop characters, improve prose, and explore narrative possibilities. Be supportive, constructive, and specific in your feedback. Draw on writing craft principles.';

    // Simple change-detection hash for seeded builtin prompts.
    function contentHash(content, systemContent) {
        let hash = 0;
        const str = (content || '') + '\n' + (systemContent || '');
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    // A builtin row counts as user-edited when its content no longer matches the
    // hash recorded at seed time. Rows with no contentHash (pre-hash V1 defaults)
    // are treated as untouched so legacy defaults still migrate.
    function isUserEdited(prompt) {
        if (!prompt || !prompt.builtin || !prompt.contentHash) return false;
        return contentHash(prompt.content || '', prompt.systemContent || '') !== prompt.contentHash;
    }

    // One-time snapshot of every prompt row before a pack-version migration.
    async function snapshotPrompts() {
        try {
            const all = await db.prompts.toArray();
            localStorage.setItem('ww_prompt_snapshot_v3', JSON.stringify(all));
            console.log('[Prompts] Snapshot saved:', all.length, 'prompts');
        } catch (e) {
            console.warn('[Prompts] Snapshot failed:', e.message || e);
        }
    }

    async function seedDefaultPrompts(app) {
        if (!app || !app.currentProject) return;
        try {
            if (window.PromptPacks && window.PromptPacks.composeSet) {
                const globalSet = window.PromptPacks.composeSet();
                console.log('[Prompts] Seeding global prompts (general fiction)');
                for (const prompt of Object.values(globalSet)) {
                    const existing = await db.prompts
                        .where({ category: prompt.category, title: prompt.title })
                        .filter(p => p.projectId === GLOBAL_PROJECT_ID)
                        .first();
                    if (!existing || (existing.builtin && (!existing.content || existing.content.trim() === ''))) {
                        const id = existing ? existing.id : Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                        const payload = { category: prompt.category, title: prompt.title, content: prompt.content || '', systemContent: prompt.systemContent || '', builtin: true, packVersion: window.PromptPacks.VERSION || 2, genreIds: Array.isArray(prompt.genreIds) ? prompt.genreIds.slice() : [], defaultFor: prompt.defaultFor || '', contentHash: contentHash(prompt.content || '', prompt.systemContent || ''), modified: new Date() };
                        if (!existing) { payload.id = id; payload.projectId = GLOBAL_PROJECT_ID; payload.created = new Date(); avatar(payload); console.log('[Prompts] Seeded global:', prompt.title); }
                        else { await db.prompts.update(id, payload); console.log('[Prompts] Updated global:', prompt.title); }
                    }
                }
            } else {
                for (const def of DEFAULT_PROMPTS) {
                    const existing = await db.prompts
                        .where({ category: def.category, title: def.title })
                        .filter(p => p.projectId === GLOBAL_PROJECT_ID || p.projectId === app.currentProject.id)
                        .first();
                    if (!existing) {
                        const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                        await db.prompts.add({ id, projectId: GLOBAL_PROJECT_ID, category: def.category, title: def.title, content: def.content || '', systemContent: def.systemContent || '', builtin: true, packVersion: 1, created: new Date(), modified: new Date() });
                    }
                }
            }

            if (app.currentProject.genres?.length && window.PromptPacks && window.PromptPacks.composeSet) {
                const genreSet = window.PromptPacks.composeSet(app.currentProject.genres);
                console.log('[Prompts] Seeding genre prompts for:', app.currentProject.genres);
                for (const prompt of Object.values(genreSet)) {
                    const existing = await db.prompts.where({ projectId: app.currentProject.id, category: prompt.category, title: prompt.title }).first();
                    if (!existing || (existing.builtin && (!existing.content || existing.content.trim() === ''))) {
                        const id = existing ? existing.id : Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                        const payload = { category: prompt.category, title: prompt.title, content: prompt.content || '', systemContent: prompt.systemContent || '', builtin: true, packVersion: window.PromptPacks.VERSION || 2, genreIds: Array.isArray(prompt.genreIds) ? prompt.genreIds.slice() : [], defaultFor: prompt.defaultFor || '', contentHash: contentHash(prompt.content || '', prompt.systemContent || ''), modified: new Date() };
                        if (!existing) { payload.id = id; payload.projectId = app.currentProject.id; payload.created = new Date(); await db.prompts.add(payload); console.log('[Prompts] Seeded:', prompt.title); }
                        else { await db.prompts.update(id, payload); console.log('[Prompts] Updated:', prompt.title); }
                    }
                }
            } else if (window.PromptPacks && window.PromptPacks.composeSet) {
                const generalSet = window.PromptPacks.composeSet([]);
                console.log('[Prompts] No genres set - seeding General Fiction prompts for project');
                for (const prompt of Object.values(generalSet)) {
                    const existing = await db.prompts.where({ projectId: app.currentProject.id, category: prompt.category, title: prompt.title }).first();
                    if (!existing || (existing.builtin && (!existing.content || existing.content.trim() === ''))) {
                        const id = existing ? existing.id : Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                        const payload = { category: prompt.category, title: prompt.title, content: prompt.content || '', systemContent: prompt.systemContent || '', builtin: true, packVersion: window.PromptPacks.VERSION || 2, genreIds: [], defaultFor: prompt.defaultFor || '', contentHash: contentHash(prompt.content || '', prompt.systemContent || ''), modified: new Date() };
                        if (!existing) { payload.id = id; payload.projectId = app.currentProject.id; payload.created = new Date(); await db.prompts.add(payload); console.log('[Prompts] Seeded (general):', prompt.title); }
                        else { await db.prompts.update(id, payload); console.log('[Prompts] Updated (general):', prompt.title); }
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to seed default prompts:', e);
        }
    }

    function isPromptUntouched(prompt) {
        if (!prompt || !prompt.builtin) return false;
        if (prompt.category === 'prose' && prompt.content === V1_PROSE_CONTENT) return true;
        if (prompt.category === 'summary' && prompt.content === V1_SUMMARY_CONTENT) return true;
        if (prompt.category === 'workshop' && prompt.content === V1_WORKSHOP_CONTENT) return true;
        return false;
    }

    async function maybeUpgradePrompts(app) {
        if (!app || !app.currentProject) return;
        try {
            // Snapshot before any migration so the old rows can be recovered.
            await snapshotPrompts();

            const VERSION_NUM = window.PromptPacks?.VERSION || 2;

            const globalPrompts = await db.prompts.where('projectId').equals(GLOBAL_PROJECT_ID).toArray();
            for (const p of globalPrompts) {
                if (p.builtin && (p.packVersion || 1) < VERSION_NUM && !isUserEdited(p)) {
                    const replacement = window.PromptPacks?.compose?.([], p.category);
                    if (replacement) {
                        await db.prompts.update(p.id, {
                            content: replacement.content || '',
                            systemContent: replacement.systemContent || '',
                            packVersion: VERSION_NUM,
                            genreIds: Array.isArray(replacement.genreIds) ? replacement.genreIds.slice() : [],
                            contentHash: contentHash(replacement.content || '', replacement.systemContent || ''),
                            modified: new Date()
                        });
                        console.log('[Prompts] Upgraded global:', p.title, 'v' + (p.packVersion || 1) + ' -> v' + VERSION_NUM);
                    }
                }
            }

            const projectPrompts = await db.prompts.where('projectId').equals(app.currentProject.id).toArray();
            for (const p of projectPrompts) {
                if (p.builtin && (p.packVersion || 1) < VERSION_NUM && !isUserEdited(p)) {
                    const genreSet = window.PromptPacks?.composeSet?.(app.currentProject.genres);
                    if (genreSet) {
                        const replacement = Object.values(genreSet).find(r => r.category === p.category && r.title === p.title);
                        if (replacement) {
                            await db.prompts.update(p.id, {
                                content: replacement.content || '',
                                systemContent: replacement.systemContent || '',
                                packVersion: VERSION_NUM,
                                genreIds: Array.isArray(replacement.genreIds) ? replacement.genreIds.slice() : [],
                                contentHash: contentHash(replacement.content || '', replacement.systemContent || ''),
                                modified: new Date()
                            });
                            console.log('[Prompts] Upgraded project:', p.title, 'v' + (p.packVersion || 1) + ' -> v' + VERSION_NUM);
                        }
                    }
                }
            }

            console.log('[Prompts] Auto-upgrade to v' + VERSION_NUM + ' complete');
        } catch (e) {
            console.warn('Prompt upgrade failed:', e);
        }
    }

    async function loadPrompts(app) {
        if (!app || !app.currentProject) { if (app) app.prompts = []; return; }
        try {
            await seedDefaultPrompts(app);
            await maybeUpgradePrompts(app);
            const projectPrompts = await db.prompts.where('projectId').equals(app.currentProject.id).sortBy('modified');
            const globalPrompts = await db.prompts.where('projectId').equals(GLOBAL_PROJECT_ID).sortBy('modified');
            app.prompts = [...globalPrompts, ...projectPrompts];
            if (app.promptCategories) {
                for (let c of app.promptCategories) {
                    if (app.promptCollapsed && app.promptCollapsed[c] === undefined) app.promptCollapsed[c] = false;
                }
            }
        } catch (e) {
            console.error('Failed to load prompts:', e);
            if (app) app.prompts = [];
        }
    }

    // CRUD implementations
    async function createPrompt(app, category) {
        if (!app || !app.currentProject) return;
        try {
            const len = category === 'prose' ? 400 : (category === 'summary' ? 300 : 250);
            const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
            const now = new Date();
            await db.prompts.add({
                id, projectId: app.currentProject.id, category, title: 'New ' + (category || 'Prompt'),
                content: 'Write the next ' + category + ' continuing from the provided text.',
                systemContent: '', builtin: false, created: now, modified: now
            });
            await loadPrompts(app);
            app.openPrompt(id);
        } catch (e) { console.error('createPrompt error:', e); }
    }

    function openPrompt(app, id) {
        if (!app || !id) return;
        const p = (app.prompts || []).find(x => x.id === id);
        if (p) {
            app.currentPrompt = Object.assign({}, p);
            app.selectedPromptId = id;
            app.promptEditorContent = p.content || '';
            app.promptEditorSystemContent = p.systemContent || '';
        }
    }

    async function savePrompt(app) {
        if (!app || !app.selectedPromptId || !app.currentPrompt) return;
        try {
            await db.prompts.update(app.selectedPromptId, {
                content: app.promptEditorContent || '',
                systemContent: app.promptEditorSystemContent || '',
                title: app.currentPrompt.title || '',
                category: app.currentPrompt.category || '',
                modified: new Date()
            });
            // Keep currentPrompt in sync so the editor stays correct after reload
            const updated = await db.prompts.get(app.selectedPromptId);
            if (updated) app.currentPrompt = Object.assign({}, updated);
            await loadPrompts(app);
        } catch (e) { console.error('savePrompt error:', e); }
    }

    async function deletePrompt(app, id) {
        if (!id || !app.currentProject) return;
        try {
            await db.prompts.delete(id);
            await loadPrompts(app);
        } catch (e) { console.error('deletePrompt error:', e); }
    }

    function toggleGlobal(app, id) {
        if (!id || !app.currentProject) return;
        try {
            const p = (app.prompts || []).find(x => x.id === id);
            if (!p) return;
            const newProjectId = p.projectId === '__global__' ? app.currentProject.id : '__global__';
            db.prompts.update(id, { projectId: newProjectId, modified: new Date() }).then(() => loadPrompts(app));
        } catch (e) { console.error('toggleGlobal error:', e); }
    }

    async function movePromptUp(app, id) {
        if (!id || !app || !app.currentProject) return;
        try { await db.prompts.update(id, { modified: new Date() }); await loadPrompts(app); } catch (e) {}
    }
    async function movePromptDown(app, id) {
        if (!id || !app || !app.currentProject) return;
        try { await db.prompts.update(id, { modified: new Date() }); await loadPrompts(app); } catch (e) {}
    }

    async function renamePrompt(app, id, newTitle) {
        if (!id) return;
        try { await db.prompts.update(id, { title: newTitle || 'Untitled', modified: new Date() }); await loadPrompts(app); } catch (e) {}
    }

    async function exportPrompts(app) {
        try {
            const all = await db.prompts.toArray();
            const data = JSON.stringify(all, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (app && app.currentProject ? app.currentProject.name : 'writingway') + '-prompts.json';
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) { console.error('exportPrompts error:', e); }
    }

    async function importPrompts(app, fileInput) {
        try {
            if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
            const text = await fileInput.files[0].text();
            const arr = JSON.parse(text);
            if (!Array.isArray(arr)) return;
            for (const item of arr) {
                if (!item || !item.title) continue;
                const existing = await db.prompts.where({ category: item.category, title: item.title, projectId: app.currentProject.id }).first();
                if (!existing) {
                    await db.prompts.add({ ...item, id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8), projectId: app.currentProject.id, builtin: false, created: new Date(), modified: new Date() });
                }
            }
            await loadPrompts(app);
        } catch (e) { console.error('importPrompts error:', e); }
    }

    // Helper typo guard
    function avatar(obj) { return db.prompts.add(obj); }

    window.Prompts = {
        seedDefaultPrompts,
        loadPrompts,
        createPrompt,
        openPrompt,
        savePrompt,
        deletePrompt,
        toggleGlobal,
        movePromptUp,
        movePromptDown,
        renamePrompt,
        exportPrompts,
        importPrompts,
        maybeUpgradePrompts,
        isPromptUntouched
    };
})();
