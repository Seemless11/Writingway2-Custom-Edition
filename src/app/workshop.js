/**
 * workshop — Workshop chat sessions.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Workshop Chat methods (delegated to src/modules/workshop.js)
            async loadWorkshopSessions() {
                const now = Date.now();
                if (this._lastLoadWorkshopSessions && now - this._lastLoadWorkshopSessions < 2000) return;
                this._lastLoadWorkshopSessions = now;
                return window.Workshop.loadWorkshopSessions(this);
            },

            async saveWorkshopSessions() { return window.Workshop.saveWorkshopSessions(this); },

            createWorkshopSession() { return window.Workshop.createWorkshopSession(this); },

            renameWorkshopSession(index) { return window.Workshop.renameWorkshopSession(this, index); },

            async clearWorkshopSession(index) { return window.Workshop.clearWorkshopSession(this, index); },

            exportWorkshopSession(index) { return window.Workshop.exportWorkshopSession(this, index); },

            async deleteWorkshopSession(index) { return window.Workshop.deleteWorkshopSession(this, index); },

            async loadSelectedWorkshopPrompt() { return window.Workshop.loadSelectedWorkshopPrompt(this); },

            saveSelectedWorkshopPrompt() { return window.Workshop.saveSelectedWorkshopPrompt(this); },
});
