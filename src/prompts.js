// Prompts module — exposes window.Prompts with functions that operate on the shared `db` instance
(function () {
    const GLOBAL_PROJECT_ID = '__global__';

    const DEFAULT_PROMPTS = [
        {
            category: 'prose',
            title: 'Default Prose Prompt',
            content: 'Write the next scene continuing from the provided text. Maintain the established tone, style, POV, and tense. Use sensory details and vivid imagery. Show, don\'t tell. Focus on the beat provided and expand it naturally into about {length}.',
            systemContent: 'You are a creative writing assistant. Write vivid, engaging prose that expands the given beat into a full scene. Match the author\'s style and tone.'
        },
        {
            category: 'summary',
            title: 'Default Summary Prompt',
            content: 'You are a literary analysis assistant. Analyze the text below in depth — explore character motivations, emotional undercurrents, thematic significance, and narrative craft. Explain why moments matter, what they reveal, and how they serve the larger story. Do not simply recount events. Write as much as needed for a thorough analysis.'
        },
        {
            category: 'workshop',
            title: 'Default Workshop Prompt',
            content: 'You are a creative writing workshop assistant. Help the author brainstorm ideas, develop characters, improve prose, and explore narrative possibilities. Be supportive, constructive, and specific in your feedback. Draw on writing craft principles.'
        }
    ];

    async function seedDefaultPrompts(app) {
        if (!app.currentProject) return;
        try {
            for (const def of DEFAULT_PROMPTS) {
                const existing = await db.prompts
                    .where({ category: def.category, title: def.title })
                    .filter(p => p.projectId === GLOBAL_PROJECT_ID || p.projectId === app.currentProject.id)
                    .first();
                if (!existing) {
                    const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                    const now = new Date();
                    await db.prompts.add({
                        id,
                        projectId: GLOBAL_PROJECT_ID,
                        category: def.category,
                        title: def.title,
                        content: def.content || '',
                        systemContent: def.systemContent || '',
                        created: now,
                        modified: now
                    });
                }
            }

            // Seed genre-specific prompts for the current project
            if (app.currentProject.genres?.length && window.GenreDefs) {
                for (const gid of app.currentProject.genres) {
                    const defaults = window.GenreDefs.getDefaultPromptsForGenre(gid);
                    if (!defaults) continue;
                    for (const [category, def] of Object.entries(defaults)) {
                        const existing = await db.prompts
                            .where({ projectId: app.currentProject.id, category, title: def.title })
                            .first();
                        if (!existing) {
                            const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                            await db.prompts.add({
                                id,
                                projectId: app.currentProject.id,
                                category,
                                title: def.title,
                                content: def.content || '',
                                systemContent: def.systemContent || '',
                                created: new Date(),
                                modified: new Date()
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to seed default prompts:', e);
        }
    }

    async function loadPrompts(app) {
        if (!app.currentProject) {
            app.prompts = [];
            return;
        }
        try {
            await seedDefaultPrompts(app);
            const projectPrompts = await db.prompts.where('projectId').equals(app.currentProject.id).sortBy('modified');
            const globalPrompts = await db.prompts.where('projectId').equals(GLOBAL_PROJECT_ID).sortBy('modified');
            app.prompts = [...globalPrompts, ...projectPrompts];
            for (let c of app.promptCategories) {
                if (app.promptCollapsed[c] === undefined) app.promptCollapsed[c] = false;
            }
        } catch (e) {
            console.error('Failed to load prompts:', e);
            app.prompts = [];
        }
    }

    async function createPrompt(app, category) {
        if (!app.currentProject) return;
        const title = app.newPromptTitle && app.newPromptTitle.trim() ? app.newPromptTitle.trim() : 'New Prompt';
        const id = Date.now().toString();
        const now = new Date();
        const prompt = { id, projectId: app.currentProject.id, category, title, content: '', systemContent: '', created: now, modified: now };
        await db.prompts.add(prompt);
        app.newPromptTitle = '';
        await loadPrompts(app);
        openPrompt(app, id);
    }

    function openPrompt(app, id) {
        const p = app.prompts.find(x => x.id === id);
        if (!p) return;
        app.currentPrompt = { ...p };
        app.promptEditorContent = p.content || '';
        app.promptEditorSystemContent = p.systemContent || '';

        if (p.category === 'prose' && app && typeof app.saveSelectedProsePrompt === 'function') {
            try {
                app.saveSelectedProsePrompt(p.id);
            } catch (e) { /* ignore */ }
        }
    }

    async function savePrompt(app) {
        if (!app.currentPrompt) return;
        try {
            const now = new Date();
            await db.prompts.update(app.currentPrompt.id, {
                title: app.currentPrompt.title,
                content: app.promptEditorContent,
                systemContent: app.promptEditorSystemContent,
                category: app.currentPrompt.category,
                modified: now
            });
            await loadPrompts(app);
            app.currentPrompt = await db.prompts.get(app.currentPrompt.id);
            app.promptEditorContent = app.currentPrompt.content || '';
            app.promptEditorSystemContent = app.currentPrompt.systemContent || '';
        } catch (e) {
            console.error('Failed to save prompt:', e);
        }
    }

    async function deletePrompt(app, id) {
        if (!id) return;
        if (!confirm('Delete this prompt?')) return;
        try {
            await db.prompts.delete(id);
            if (app.currentPrompt && app.currentPrompt.id === id) app.currentPrompt = null;
            try {
                if (app && app.selectedProsePromptId === id && typeof app.saveSelectedProsePrompt === 'function') {
                    app.saveSelectedProsePrompt(null);
                }
            } catch (e) { /* ignore */ }
            await loadPrompts(app);
        } catch (e) {
            console.error('Failed to delete prompt:', e);
        }
    }

    async function toggleGlobal(app, id) {
        if (!id || !app.currentProject) return;
        try {
            const p = await db.prompts.get(id);
            if (!p) return;
            const isGlobal = p.projectId === GLOBAL_PROJECT_ID;
            const newProjectId = isGlobal ? app.currentProject.id : GLOBAL_PROJECT_ID;
            await db.prompts.update(id, { projectId: newProjectId });
            await loadPrompts(app);
            if (app.currentPrompt && app.currentPrompt.id === id) {
                app.currentPrompt = await db.prompts.get(id);
            }
        } catch (e) {
            console.error('Failed to toggle global:', e);
        }
    }

    async function renamePrompt(app, id, newTitle) {
        if (!id) return;
        try {
            let title = newTitle;
            if (!title) {
                const p = await db.prompts.get(id);
                title = prompt('Rename prompt:', p && p.title ? p.title : '');
            }
            if (title === null || title === undefined) return;
            title = String(title).trim();
            if (title.length === 0) return;
            const now = new Date();
            await db.prompts.update(id, { title, modified: now });
            await loadPrompts(app);
            if (app.currentPrompt && app.currentPrompt.id === id) {
                app.currentPrompt.title = title;
            }
        } catch (e) {
            console.error('Failed to rename prompt:', e);
        }
    }

    async function movePromptUp(app, id) {
        try {
            const p = await db.prompts.get(id);
            if (!p) return;
            const list = await db.prompts.where('projectId').equals(p.projectId).and(x => x.category === p.category).sortBy('modified');
            const idx = list.findIndex(x => x.id === id);
            if (idx <= 0) return;
            const above = list[idx - 1];
            const aMod = above.modified || new Date();
            const pMod = p.modified || new Date();
            await db.prompts.update(above.id, { modified: pMod });
            await db.prompts.update(p.id, { modified: aMod });
            await loadPrompts(app);
        } catch (e) {
            console.error('Failed to move prompt up:', e);
        }
    }

    async function movePromptDown(app, id) {
        try {
            const p = await db.prompts.get(id);
            if (!p) return;
            const list = await db.prompts.where('projectId').equals(p.projectId).and(x => x.category === p.category).sortBy('modified');
            const idx = list.findIndex(x => x.id === id);
            if (idx === -1 || idx >= list.length - 1) return;
            const below = list[idx + 1];
            const bMod = below.modified || new Date();
            const pMod = p.modified || new Date();
            await db.prompts.update(below.id, { modified: pMod });
            await db.prompts.update(p.id, { modified: bMod });
            await loadPrompts(app);
        } catch (e) {
            console.error('Failed to move prompt down:', e);
        }
    }

    async function exportPrompts(app) {
        if (!app.currentProject) {
            alert('No project selected.');
            return;
        }
        try {
            const prompts = await db.prompts.where('projectId').equals(app.currentProject.id).toArray();
            if (!prompts || prompts.length === 0) {
                alert('No prompts to export.');
                return;
            }
            const exportData = {
                version: '1.0',
                type: 'prompts',
                exportedAt: new Date().toISOString(),
                projectName: app.currentProject.name,
                prompts: prompts.map(p => ({
                    category: p.category,
                    title: p.title,
                    content: p.content || '',
                    systemContent: p.systemContent || '',
                    created: p.created,
                    modified: p.modified
                }))
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${app.currentProject.name.replace(/[^a-z0-9]/gi, '_')}_prompts.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export prompts:', e);
            alert('Failed to export prompts: ' + e.message);
        }
    }

    async function importPrompts(app, fileInput) {
        if (!app.currentProject) {
            alert('No project selected.');
            return;
        }
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.type || data.type !== 'prompts' || !Array.isArray(data.prompts)) {
                alert('Invalid prompts file format.');
                return;
            }
            const count = data.prompts.length;
            if (!confirm(`Import ${count} prompt(s) into the current project?`)) return;
            const now = new Date();
            for (const p of data.prompts) {
                const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);
                await db.prompts.add({
                    id,
                    projectId: app.currentProject.id,
                    category: p.category || 'prose',
                    title: p.title || 'Imported Prompt',
                    content: p.content || '',
                    systemContent: p.systemContent || '',
                    created: now,
                    modified: now
                });
                await new Promise(r => setTimeout(r, 1));
            }
            await loadPrompts(app);
            alert(`Successfully imported ${count} prompt(s).`);
        } catch (e) {
            console.error('Failed to import prompts:', e);
            alert('Failed to import prompts: ' + e.message);
        } finally {
            fileInput.value = '';
        }
    }

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
        importPrompts
    };
})();