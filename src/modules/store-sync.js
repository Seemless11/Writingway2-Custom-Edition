// Folder-based storage sync module.
// Makes the local folder the source of truth: every mutation in IndexedDB is
// written through to `projects/` (debounced), and on boot the library is
// auto-loaded from the folder back into the browser cache. Embedded base64
// images are extracted into `images/` so the browser DB stays small.
(function () {
    'use strict';

    const SAVE_ENDPOINT = '/api/save-project';
    const LIBRARY_ENDPOINT = '/api/library';
    const LOAD_PROJECT_ENDPOINT = '/api/load-project';
    const DELETE_PROJECT_ENDPOINT = '/api/project/delete';
    const UPLOAD_IMAGE_ENDPOINT = '/api/upload-image';

    const SAVE_DEBOUNCE_MS = 2000;
    const SAFETY_INTERVAL_MS = 15000;

    const SYNC_TABLES = [
        'projects', 'chapters', 'scenes', 'content', 'compendium',
        'prompts', 'codex', 'promptHistory', 'workshopSessions'
    ];

    let appRef = null;
    let flushTimer = null;
    let flushing = false;
    let syncing = false;
    let hooksRegistered = false;
    let dirtyProjects = null; // null = "all projects dirty" or uninitialized set
    let deletedProjectIds = null;

    const uploadedImages = new Map(); // data URL -> server URL (per session)

    function isHttpOrigin() {
        return !window.location || window.location.protocol !== 'file:';
    }

    function isPrimaryTab() {
        return !window.TabSync || typeof window.TabSync.isPrimaryTab !== 'function' || window.TabSync.isPrimaryTab();
    }

    function projectIdOf(table, obj) {
        if (!obj) return null;
        if (table === 'projects') return obj.id != null ? String(obj.id) : null;
        if (obj.projectId != null) return String(obj.projectId);
        if (table === 'content' && obj.sceneId != null) {
            const scene = appRef && Array.isArray(appRef.scenes)
                ? appRef.scenes.find((s) => s && s.id === obj.sceneId)
                : null;
            if (scene) return String(scene.projectId);
        }
        return appRef && appRef.currentProject ? String(appRef.currentProject.id) : null;
    }

    function markDirtyFor(event, table, obj, primKey) {
        if (!appRef || appRef.isInitializing) return;
        if (dirtyProjects === null) dirtyProjects = new Set();
        if (table === 'projects' && event === 'deleting') {
            if (deletedProjectIds === null) deletedProjectIds = new Set();
            deletedProjectIds.add(String(primKey));
            if (dirtyProjects) dirtyProjects.delete(String(primKey));
            scheduleFlush();
            return;
        }
        const pid = projectIdOf(table, obj);
        if (pid) dirtyProjects.add(pid);
        scheduleFlush();
    }

    function registerWriteHooks() {
        if (hooksRegistered || !window.db) return;
        hooksRegistered = true;
        try {
            for (const t of SYNC_TABLES) {
                const table = db[t];
                if (!table || typeof table.hook !== 'function') continue;
                table.hook('creating', (pk, obj) => markDirtyFor('creating', t, obj, pk));
                table.hook('updating', (mods, pk, obj) => markDirtyFor('updating', t, obj !== undefined ? obj : mods, pk));
                table.hook('deleting', (pk, obj) => markDirtyFor('deleting', t, obj, pk));
            }
        } catch (e) {
            console.warn('[StoreSync] could not register write hooks:', e);
        }
    }

    // ---- write-through ----

    function scheduleFlush() {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => {
            flushTimer = null;
            void flushNow();
        }, SAVE_DEBOUNCE_MS);
    }

    async function flushNow() {
        if (flushing || !isHttpOrigin() || !isPrimaryTab()) return;
        flushing = true;
        try {
            const toDelete = deletedProjectIds ? Array.from(deletedProjectIds) : [];
            const toSave = new Set(dirtyProjects ? Array.from(dirtyProjects) : []);
            if (appRef && appRef.currentProject && appRef.currentProject.id) {
                toSave.add(String(appRef.currentProject.id));
            }

            if (!toDelete.length && !toSave.size) return;

            for (const pid of toDelete) {
                try {
                    await fetch(DELETE_PROJECT_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: pid }),
                        keepalive: true
                    });
                } catch (e) {
                    console.warn('[StoreSync] failed to delete project file', pid, e);
                }
            }
            if (deletedProjectIds) {
                for (const pid of toDelete) deletedProjectIds.delete(pid);
            }

            for (const pid of toSave) {
                if (deletedProjectIds && deletedProjectIds.has(pid)) continue;
                try {
                    await externalizeProjectImages(pid);
                } catch (e) {
                    console.warn('[StoreSync] image externalization failed', pid, e);
                }
                try {
                    const payload = await buildProjectFile(pid);
                    if (!payload) continue;
                    const response = await fetch(SAVE_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        keepalive: true
                    });
                    const result = await response.json().catch(() => ({}));
                    if (!response.ok || !result.ok) {
                        console.warn('[StoreSync] save failed', pid, result.error || `HTTP ${response.status}`);
                    }
                } catch (e) {
                    console.warn('[StoreSync] save failed', pid, e.message || e);
                }
            }

            if (dirtyProjects) {
                for (const pid of toSave) dirtyProjects.delete(pid);
            }
        } finally {
            flushing = false;
        }
    }

    async function buildProjectFile(projectId) {
        const project = await db.projects.get(projectId);
        if (!project) return null;

        const chapters = await db.chapters.where('projectId').equals(projectId).sortBy('order');
        const scenes = await db.scenes.where('projectId').equals(projectId).sortBy('order');
        const compendium = await db.compendium.where('projectId').equals(projectId).toArray();
        const prompts = await db.prompts.where('projectId').equals(projectId).toArray();
        const codex = await db.codex.where('projectId').equals(projectId).toArray();
        const promptHistory = await db.promptHistory.where('projectId').equals(projectId).toArray();
        const workshopSessions = await db.workshopSessions.where('projectId').equals(projectId).sortBy('updatedAt');

        const sceneContents = {};
        for (const scene of scenes) {
            let content = null;
            try { content = await db.content.get(scene.id); } catch (e) { content = null; }
            if (!content) {
                try { content = await db.content.where('sceneId').equals(scene.id).first(); } catch (e) { content = null; }
            }
            sceneContents[scene.id] = content ? (content.text || '') : '';
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

    // ---- loading files into the browser cache ----

    async function applyProjectToDb(data) {
        const projectId = data && data.project ? String(data.project.id) : null;
        if (!projectId) return false;

        await db.projects.put(data.project);

        await db.chapters.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.chapters) && data.chapters.length) {
            await db.chapters.bulkPut(data.chapters);
        }

        await db.scenes.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.scenes) && data.scenes.length) {
            await db.scenes.bulkPut(data.scenes);
        }

        const sceneContents = data.sceneContents || {};
        if (Array.isArray(data.scenes)) {
            for (const scene of data.scenes) {
                try { await db.content.delete(scene.id); } catch (e) { /* ignore */ }
            }
        }
        for (const [sceneId, text] of Object.entries(sceneContents)) {
            const wordCount = text ? text.trim().split(/\s+/).filter((w) => w.length > 0).length : 0;
            try {
                await db.content.put({ sceneId, text: text || '', wordCount, updatedAt: Date.now() });
            } catch (e) { /* ignore */ }
        }

        await db.compendium.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.compendium) && data.compendium.length) {
            await db.compendium.bulkPut(data.compendium);
        }
        await db.prompts.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.prompts) && data.prompts.length) {
            await db.prompts.bulkPut(data.prompts);
        }
        await db.codex.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.codex) && data.codex.length) {
            await db.codex.bulkPut(data.codex);
        }
        await db.promptHistory.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.promptHistory) && data.promptHistory.length) {
            await db.promptHistory.bulkPut(data.promptHistory);
        }
        await db.workshopSessions.where('projectId').equals(projectId).delete();
        if (Array.isArray(data.workshopSessions) && data.workshopSessions.length) {
            await db.workshopSessions.bulkPut(data.workshopSessions);
        }

        return true;
    }

    // ---- image externalization (embed base64 -> files) ----

    async function sha256Hex(text) {
        try {
            if (window.crypto && typeof window.crypto.subtle === 'object' && typeof window.crypto.subtle.digest === 'function') {
                const data = new TextEncoder().encode(text);
                const digest = await window.crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(digest)).slice(0, 16)
                    .map((b) => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) { /* fall through to random name */ }
        return null;
    }

    async function uploadBase64Image(dataUrl) {
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
        const cached = uploadedImages.get(dataUrl);
        if (cached) return cached;

        const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/s);
        if (!match) return dataUrl;
        const mime = match[1] || 'png';
        const ext = (mime.toLowerCase() === 'jpeg' ? 'jpg' : mime.toLowerCase().replace(/[^a-z0-9]/g, '')) || 'png';
        const b64 = match[2] || '';

        let bytes;
        try {
            const binary = atob(b64);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        } catch (e) {
            return dataUrl;
        }

        const hash = await sha256Hex(dataUrl);
        const name = hash
            ? `img-${hash}.${ext}`
            : `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        try {
            const response = await fetch(`${UPLOAD_IMAGE_ENDPOINT}?name=${encodeURIComponent(name)}&mime=${encodeURIComponent(mime)}`, {
                method: 'POST',
                headers: { 'Content-Type': mime },
                body: bytes
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.ok && result.url) {
                uploadedImages.set(dataUrl, result.url);
                return result.url;
            }
        } catch (e) {
            console.warn('[StoreSync] image upload failed:', e.message || e);
        }
        return dataUrl;
    }

    async function externalizeProjectImages(projectId) {
        const rows = await db.compendium.where('projectId').equals(projectId).toArray();
        for (const row of rows) {
            if (typeof row.imageUrl !== 'string' || !row.imageUrl.startsWith('data:image/')) continue;
            const url = await uploadBase64Image(row.imageUrl);
            if (url !== row.imageUrl) {
                try { await db.compendium.update(row.id, { imageUrl: url }); } catch (e) { /* ignore */ }
            }
        }
    }

    // ---- boot sync ----

    async function getManifest() {
        const response = await fetch(LIBRARY_ENDPOINT, { signal: AbortSignal.timeout(6000) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) return null;
        return Array.isArray(result.projects) ? result.projects : null;
    }

    async function loadProjectFromDisk(projectId) {
        const response = await fetch(`${LOAD_PROJECT_ENDPOINT}?id=${encodeURIComponent(projectId)}`, { signal: AbortSignal.timeout(120000) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok || !result.project) return false;
        return await applyProjectToDb(result.project);
    }

    async function syncBoot(app) {
        if (!isHttpOrigin()) return 0;
        syncing = true;
        let loaded = 0;
        try {
            const manifest = await getManifest();
            const dbProjects = await db.projects.toArray();

            if (manifest && manifest.length) {
                // Pull: any project on disk that the browser cache is missing.
                const dbById = new Map(dbProjects.map((p) => [String(p.id), p]));
                let newAdded = false;
                for (const entry of manifest) {
                    const id = String(entry.id);
                    if (dbById.has(id)) continue;
                    try {
                        if (await loadProjectFromDisk(id)) {
                            loaded++;
                            newAdded = true;
                            if (dirtyProjects === null) dirtyProjects = new Set();
                            dirtyProjects.add(id);
                        }
                    } catch (e) {
                        console.warn('[StoreSync] failed to load project', id, e.message || e);
                    }
                }
                if (newAdded) {
                    try { await app.loadProjects(); } catch (e) { /* ignore */ }
                }

                // Push: write every browser project out to the folder. The folder
                // is the source of truth, and write-through keeps it current; this
                // boot pass guarantees disk matches the browser even if the server
                // was unavailable for a while.
                if (dirtyProjects === null) dirtyProjects = new Set();
                for (const p of dbProjects) {
                    dirtyProjects.add(String(p.id));
                }
            } else if (dbProjects.length) {
                // No library on disk but the browser has data: materialize it.
                if (dirtyProjects === null) dirtyProjects = new Set();
                for (const p of dbProjects) dirtyProjects.add(String(p.id));
            }

            scheduleFlush();
        } finally {
            syncing = false;
        }
        return loaded;
    }

    function initStoreSync(app) {
        appRef = app;
        registerWriteHooks();

        if (!hooksRegistered) return Promise.resolve(0);

        if (!dirtyProjects) dirtyProjects = new Set();
        if (!deletedProjectIds) deletedProjectIds = new Set();

        const onHidden = () => {
            if (document.visibilityState === 'hidden') {
                if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
                void flushNow();
            }
        };
        document.addEventListener('visibilitychange', onHidden);
        window.addEventListener('pagehide', () => { void flushNow(); });

        setInterval(() => {
            if ((dirtyProjects && dirtyProjects.size) || (deletedProjectIds && deletedProjectIds.size)) {
                scheduleFlush();
            }
        }, SAFETY_INTERVAL_MS);

        return syncBoot(app);
    }

    window.StoreSync = {
        initStoreSync,
        syncBoot,
        flushNow,
        scheduleFlush,
        buildProjectFile,
        applyProjectToDb,
        externalizeProjectImages,
        uploadBase64Image,
        isSyncing: () => syncing
    };
})();
