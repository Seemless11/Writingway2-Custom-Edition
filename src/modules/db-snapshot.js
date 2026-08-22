// Database snapshot module.
// Periodically writes the full IndexedDB contents to disk through the app server,
// so a browser storage wipe (incognito, "clear on exit", disk cleanup) no longer
// means permanent data loss. On startup, an empty database can be restored from
// the newest snapshot with one click.
(function () {
    const SAVE_ALL_ENDPOINT = '/api/save-all';
    const LIST_SNAPSHOTS_ENDPOINT = '/api/list-snapshots';
    const GET_SNAPSHOT_ENDPOINT = '/api/get-snapshot';
    const SNAPSHOT_INTERVAL = 3 * 60 * 1000;
    const INITIAL_SNAPSHOT_DELAY = 8000;
    const DISMISS_KEY = 'writingway:snapshotRestoreDismissed';

    // All app tables, mirroring the schema in src/db.js.
    const TABLES = [
        'projects',
        'chapters',
        'scenes',
        'content',
        'compendium',
        'prompts',
        'codex',
        'promptHistory',
        'workshopSessions',
        'settings'
    ];

    let snapshotTimer = null;
    let appRef = null;
    let saving = false;
    let beforeUnloadRegistered = false;

    async function buildSnapshot() {
        const tables = {};
        for (const name of TABLES) {
            if (!db[name]) continue;
            try {
                tables[name] = await db[name].toArray();
            } catch (e) {
                console.warn(`[DbSnapshot] failed to read table ${name}:`, e);
                tables[name] = [];
            }
        }
        return {
            version: '2.1-full',
            exportedAt: new Date().toISOString(),
            tables
        };
    }

    function isHttpOrigin() {
        return !window.location || window.location.protocol !== 'file:';
    }

    async function hasAnyData() {
        try {
            return (await db.projects.count()) > 0;
        } catch (e) {
            return false;
        }
    }

    async function isServerAvailable() {
        try {
            const response = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    async function saveNow() {
        if (saving) return { ok: false, skipped: true };
        if (!isHttpOrigin()) return { ok: false, skipped: true };
        if (window.TabSync && typeof window.TabSync.isPrimaryTab === 'function' && !window.TabSync.isPrimaryTab()) {
            return { ok: false, skipped: true };
        }

        saving = true;
        try {
            const payload = await buildSnapshot();
            const response = await fetch(SAVE_ALL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) {
                console.warn('[DbSnapshot] save-all rejected:', result.error || `HTTP ${response.status}`);
                return { ok: false, error: result.error || `HTTP ${response.status}` };
            }
            try { localStorage.setItem('writingway:lastSnapshotAt', result.timestamp || payload.exportedAt); } catch (e) { /* ignore */ }
            if (appRef) appRef.lastDbSnapshotAt = result.timestamp || payload.exportedAt;
            return result;
        } catch (e) {
            // Server offline (e.g. file:// or start.bat not running) — silent.
            console.warn('[DbSnapshot] snapshot failed (server unavailable?):', e.message || e);
            return { ok: false, error: e.message || String(e) };
        } finally {
            saving = false;
        }
    }

    async function listSnapshots() {
        if (!isHttpOrigin()) return [];
        try {
            const response = await fetch(LIST_SNAPSHOTS_ENDPOINT, { signal: AbortSignal.timeout(3000) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) return [];
            return result.snapshots || [];
        } catch (e) {
            return [];
        }
    }

    async function getSnapshot(snapshotId) {
        const query = new URLSearchParams({ id: String(snapshotId) });
        const response = await fetch(`${GET_SNAPSHOT_ENDPOINT}?${query.toString()}`, { signal: AbortSignal.timeout(10000) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        return result.snapshot;
    }

    async function restoreSnapshotData(app, snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            throw new Error('Snapshot payload is missing');
        }

        const tables = snapshot.tables || {};
        await db.transaction('rw', ...TABLES, async tx => {
            for (const name of TABLES) {
                try { await tx.table(name).clear(); } catch (e) { /* ignore */ }
            }
            for (const [name, rows] of Object.entries(tables)) {
                if (!Array.isArray(rows)) continue;
                if (rows.length > 0) {
                    try { await tx.table(name).bulkPut(rows); } catch (e) { console.warn(`[DbSnapshot] restore of table ${name} failed:`, e); }
                }
            }
        });

        if (app) {
            app.projects = await db.projects.orderBy('created').reverse().toArray();
        }
        return true;
    }

    async function restoreSnapshot(app, snapshotId) {
        const snapshot = await getSnapshot(snapshotId);
        return await restoreSnapshotData(app, snapshot);
    }

    // Called on startup. Only acts when the projects table is empty (browser
    // storage was cleared) and a disk snapshot exists.
    async function maybeAutoRestore(app) {
        try {
            const count = await db.projects.count();
            if (count > 0) return false;
        } catch (e) {
            return false;
        }

        const snapshots = await listSnapshots();
        if (!snapshots.length) return false;

        const latest = snapshots[0];
        try {
            const dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
            if (dismissed.id === latest.id) return false;
        } catch (e) { /* ignore */ }

        const confirmed = confirm(
            'Writingway detected that your browser data was cleared.\n\n' +
            `A local snapshot from ${latest.timestamp} was found.\n\n` +
            'Click OK to restore your projects, chapters, scenes, compendium, and chats.\n' +
            'Click Cancel to start with an empty database.'
        );
        if (!confirmed) {
            try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ id: latest.id })); } catch (e) { /* ignore */ }
            return false;
        }

        try { localStorage.removeItem(DISMISS_KEY); } catch (e) { /* ignore */ }
        await restoreSnapshot(app, latest.id);
        console.log(`[DbSnapshot] restored from ${latest.id}`);
        return true;
    }

    function startAutoSave(app) {
        stopAutoSave();
        appRef = app;

        if (!beforeUnloadRegistered && typeof window.addEventListener === 'function') {
            beforeUnloadRegistered = true;
            window.addEventListener('beforeunload', () => {
                setTimeout(() => { try { if (hasAnyData()) saveNow(); } catch (e) { /* best-effort */ } }, 0);
            });
        }

        // Baseline snapshot shortly after startup (only if the database has data).
        setTimeout(async () => {
            if (hasAnyData()) await saveNow();
        }, INITIAL_SNAPSHOT_DELAY);

        snapshotTimer = setInterval(async () => {
            if (hasAnyData()) await saveNow();
        }, SNAPSHOT_INTERVAL);
    }

    function stopAutoSave() {
        if (snapshotTimer) {
            clearInterval(snapshotTimer);
            snapshotTimer = null;
        }
    }

    window.DbSnapshot = {
        buildSnapshot,
        saveNow,
        listSnapshots,
        getSnapshot,
        restoreSnapshot,
        restoreSnapshotData,
        maybeAutoRestore,
        startAutoSave,
        stopAutoSave,
        isServerAvailable,
        TABLES
    };
})();