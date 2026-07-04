/**
 * Test Helpers Module
 * Provides utilities for automated testing and debugging
 * NOTE: This API is intended for test/dev only. It is safe to leave in the repo
 * for FOSS usage; it exposes no secrets and only manipulates local IndexedDB and
 * the app instance already present on the page.
 */

// Test-only helpers. Exposed to make automated tests deterministic.
(function () {
    try {
        window.__test = window.__test || {};

        window.__test.getApp = function () {
            const el = document.querySelector('[x-data="app"]');
            return (el && el.__x && el.__x.$data) ? el.__x.$data : null;
        };

        window.__test.seedProject = async function (name) {
            const id = Date.now().toString();
            const proj = { id: id, name: name || ('P-' + id), created: new Date(), modified: new Date() };
            await db.projects.add(proj);
            try { localStorage.setItem('writingway:lastProject', proj.id); } catch (e) { }
            return proj;
        };

        window.__test.seedChapter = async function (projectId, title) {
            const id = Date.now().toString() + '-c' + Math.random().toString(36).slice(2, 6);
            const chap = { id: id, projectId: projectId, title: title || 'Chapter', order: (await db.chapters.where('projectId').equals(projectId).count()), created: new Date(), modified: new Date() };
            await db.chapters.add(chap);
            return chap;
        };

        window.__test.seedScene = async function (projectId, chapterId, title) {
            const id = Date.now().toString() + '-s' + Math.random().toString(36).slice(2, 6);
            const scene = { id: id, projectId: projectId, chapterId: chapterId, title: title || 'Scene', order: (await db.scenes.where('projectId').equals(projectId).and(s => s.chapterId === chapterId).count()), created: new Date(), modified: new Date() };
            await db.scenes.add(scene);
            await db.content.add({ sceneId: scene.id, text: '', wordCount: 0 });
            return scene;
        };

        window.__test.selectProject = async function (projectId) {
            const app = window.__test.getApp();
            if (app && typeof app.selectProject === 'function') {
                await app.selectProject(projectId);
                return true;
            }
            return false;
        };

        window.__test.getLastGen = function () {
            const app = window.__test.getApp();
            if (!app) return null;
            return { lastGenStart: app.lastGenStart, lastGenText: app.lastGenText, lastBeat: app.lastBeat };
        };

        window.__test.triggerGenerate = async function (beat) {
            const app = window.__test.getApp();
            if (!app) throw new Error('app not ready');
            // Set beat in legacy mode or append ## beat line in default mode
            if (app.showMiniBeatInput) {
                app.beatInput = beat || app.beatInput || '';
            } else if (beat && app.currentScene) {
                const content = app.currentScene.content || '';
                app.currentScene.content = content + (content ? '\n' : '') + '## ' + beat;
            }
            if (typeof app.generateFromBeat === 'function') {
                await app.generateFromBeat();
                return true;
            }
            return false;
        };

        window.__test.callSave = async function () {
            const app = window.__test.getApp();
            if (!app) throw new Error('app not ready');
            if (typeof app.saveScene === 'function') {
                await app.saveScene();
                return true;
            }
            return false;
        };

        window.__test.normalizeAllOrders = async function () {
            const app = window.__test.getApp();
            if (app && typeof app.normalizeAllOrders === 'function') {
                await app.normalizeAllOrders();
                return true;
            }
            return false;
        };
    } catch (e) {
        // don't break app if test helper fails
        console.warn('Failed to attach __test helpers:', e && e.message ? e.message : e);
    }
})();

// Dev helpers: wait for Alpine app to be attached, force-save current scene, and dump DB
window.__waitForApp = function (timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            try {
                const el = document.querySelector('[x-data="app"]');
                const app = (el && el.__x && el.__x.$data) ? el.__x.$data : null;
                if (app) return resolve(app);
            } catch (e) { /* ignore */ }
            if (Date.now() - start > timeout) return reject(new Error('timeout waiting for app'));
            setTimeout(check, 100);
        })();
    });
};

window.__forceSave = async function () {
    const app = await window.__waitForApp().catch(e => null);
    if (!app) throw new Error('app not ready');
    if (window.Save && typeof window.Save.saveScene === 'function') {
        return await window.Save.saveScene(app);
    }
    if (typeof app.saveScene === 'function') return await app.saveScene();
    throw new Error('no save function available');
};

window.__dumpWritingway = async function () {
    try {
        const d = window.db || new Dexie('WritingwayDB');
        await d.open();
        console.log('projects:', await d.projects.toArray());
        console.log('chapters:', await d.chapters.toArray());
        console.log('scenes:', await d.scenes.toArray());
        console.log('content:', await d.content.toArray());
        d.close();
    } catch (e) {
        console.error('dump err', e);
    }
};
