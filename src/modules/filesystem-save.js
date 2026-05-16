// Filesystem-backed project save module.
(function () {
    const SAVE_ENDPOINT = '/api/save-project';
    const SUCCESS_MESSAGE_DURATION_MS = 2500;

    function clearFilesystemSaveMessage(app) {
        if (!app) return;
        if (app.filesystemSaveTimeout) {
            clearTimeout(app.filesystemSaveTimeout);
            app.filesystemSaveTimeout = null;
        }
    }

    function setFilesystemSaveMessage(app, message, tone = 'success', durationMs = 0) {
        if (!app) return;
        clearFilesystemSaveMessage(app);
        app.filesystemSaveTone = tone;
        app.filesystemSaveStatus = message;

        if (durationMs > 0) {
            app.filesystemSaveTimeout = setTimeout(() => {
                app.filesystemSaveStatus = '';
                app.filesystemSaveTimeout = null;
            }, durationMs);
        }
    }

    async function getSceneContent(sceneId) {
        let content = null;
        try { content = await db.content.get(sceneId); } catch (e) { content = null; }
        if (!content) {
            try { content = await db.content.where('sceneId').equals(sceneId).first(); } catch (e) { content = null; }
        }
        return content ? (content.text || '') : '';
    }

    async function listByProject(tableName, projectId, sortField) {
        try {
            if (!db[tableName]) return [];
            if (sortField) return await db[tableName].where('projectId').equals(projectId).sortBy(sortField);
            return await db[tableName].where('projectId').equals(projectId).toArray();
        } catch (e) {
            console.warn(`Failed to load ${tableName} for filesystem save:`, e);
            return [];
        }
    }

    async function buildProjectSnapshot(app) {
        if (!app || !app.currentProject) {
            throw new Error('No project selected');
        }

        const projectId = app.currentProject.id;
        const project = await db.projects.get(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const chapters = await listByProject('chapters', projectId, 'order');
        const scenes = await listByProject('scenes', projectId, 'order');
        const compendium = await listByProject('compendium', projectId);
        const prompts = await listByProject('prompts', projectId);
        const codex = await listByProject('codex', projectId);
        const promptHistory = await listByProject('promptHistory', projectId);
        const workshopSessions = await listByProject('workshopSessions', projectId, 'updatedAt');

        const sceneContents = {};
        for (const scene of scenes) {
            sceneContents[scene.id] = await getSceneContent(scene.id);
        }

        return {
            version: '2.1-filesystem',
            exportedAt: new Date().toISOString(),
            project,
            chapters,
            scenes,
            sceneContents,
            compendium,
            prompts,
            codex,
            promptHistory,
            workshopSessions
        };
    }

    async function saveCurrentProject(app, options = {}) {
        if (!app || !app.currentProject) {
            return { ok: false, error: 'No project selected' };
        }

        const allowReadOnly = !!options.allowReadOnly;

        if (!allowReadOnly && window.TabSync && !window.TabSync.isPrimaryTab()) {
            return { ok: false, error: 'Cannot save to disk from a read-only tab' };
        }

        app.filesystemSaving = true;
        setFilesystemSaveMessage(app, 'Saving to disk...', 'info');

        try {
            if (window.Save && typeof window.Save.saveScene === 'function' && app.currentScene) {
                const saved = await window.Save.saveScene(app, { autosave: false, allowReadOnly });
                if (!saved) {
                    throw new Error(app.saveStatus || 'Scene save failed');
                }
            }

            const snapshot = await buildProjectSnapshot(app);
            const response = await fetch(SAVE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(snapshot)
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            app.lastFilesystemSavePath = result.path || '';
            setFilesystemSaveMessage(
                app,
                result.path ? `Saved to ${result.path}` : 'Saved to disk',
                'success',
                SUCCESS_MESSAGE_DURATION_MS
            );
            return result;
        } catch (e) {
            console.error('Filesystem save failed:', e);
            setFilesystemSaveMessage(app, `Disk save failed: ${e.message || e}`, 'error');
            return { ok: false, error: e.message || String(e) };
        } finally {
            app.filesystemSaving = false;
        }
    }

    window.FileSystemSave = {
        buildProjectSnapshot,
        saveCurrentProject
    };
})();
