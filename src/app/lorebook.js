/**
 * lorebook — Lorebook panel.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // ========== Lorebook Panel Methods ==========
            openLorebookPanel() {
                this.showCodexPanel = false;
                this.showLorebookPanel = !this.showLorebookPanel;
                if (this.showLorebookPanel) {
                    window.LorebookManager.loadLorebookEntries(this);
                }
            },

            async selectLorebookEntry(id) {
                await window.LorebookManager.selectLorebookEntry(this, id);
            },

            async saveLorebookEntry() {
                await window.LorebookManager.saveLorebookEntry(this);
            },

            async deleteLorebookEntry(id) {
                await window.LorebookManager.deleteLorebookEntry(this, id);
            },

            async deleteLorebookSource(sourceTag) {
                await window.LorebookManager.deleteLorebookSource(this, sourceTag);
            },

            async setLorebookSourceAlwaysInContext(sourceTag, value) {
                await window.LorebookManager.setLorebookSourceAlwaysInContext(this, sourceTag, value);
            },

            addLorebookTag() {
                window.LorebookManager.addLorebookTag(this);
            },

            removeLorebookTag(index) {
                window.LorebookManager.removeLorebookTag(this, index);
            },

            updateLorebookDirtyFlag() {
                window.LorebookManager.updateLorebookDirtyFlag(this);
            },

            closeLorebookPanel() {
                window.LorebookManager.guardLorebookAction(this, { type: 'close' }, () => {
                    window.LorebookManager._doCloseLorebookPanel(this);
                });
            },

            cancelLorebookAction() {
                window.LorebookManager.cancelLorebookAction(this);
            },

            closeLorebookImport() {
                window.LorebookImporter.closeImport(this);
            },

            confirmLorebookImport() {
                window.LorebookImporter.confirmImport(this);
            },

            async importLorebook() {
                await window.LorebookImporter.importLorebook(this);
            },

            saveAndProceedLorebook() {
                window.LorebookManager.saveLorebookEntry(this).then(() => {
                    window.LorebookManager.executePendingLorebookAction(this);
                });
            },

            discardAndProceedLorebook() {
                this.lorebookDirty = false;
                this.lorebookOriginalEntry = null;
                window.LorebookManager.executePendingLorebookAction(this);
            },
});
