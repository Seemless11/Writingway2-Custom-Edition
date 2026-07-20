// Lorebook Manager Module
// Handles the lorebook panel: loading entries grouped by source, CRUD, dirty tracking
(function () {
    const LorebookManager = {

        isLorebookDirty(app) {
            if (!app.currentLorebookEntry || !app.lorebookOriginalEntry) return false;
            const c = app.currentLorebookEntry;
            const o = app.lorebookOriginalEntry;
            if (c.title !== o.title) return true;
            if (c.body !== o.body) return true;
            const ct = c.tags || [];
            const ot = o.tags || [];
            if (ct.length !== ot.length) return true;
            for (let i = 0; i < ct.length; i++) {
                if (ct[i] !== ot[i]) return true;
            }
            return false;
        },

        updateLorebookDirtyFlag(app) {
            app.lorebookDirty = this.isLorebookDirty(app);
        },

        storeLorebookOriginal(app) {
            if (app.currentLorebookEntry) {
                app.lorebookOriginalEntry = JSON.parse(JSON.stringify(app.currentLorebookEntry));
            } else {
                app.lorebookOriginalEntry = null;
            }
            app.lorebookDirty = false;
        },

        guardLorebookAction(app, action, proceed) {
            if (app.lorebookDirty) {
                app.pendingLorebookAction = action;
                app.showLorebookUnsavedModal = true;
            } else {
                proceed();
            }
        },

        async executePendingLorebookAction(app) {
            const action = app.pendingLorebookAction;
            app.pendingLorebookAction = null;
            app.showLorebookUnsavedModal = false;

            if (!action) return;

            if (action.type === 'select') {
                await this._doSelectLorebookEntry(app, action.id);
            } else if (action.type === 'close') {
                this._doCloseLorebookPanel(app);
            }
        },

        async loadLorebookEntries(app) {
            const pid = app.currentProject?.id || '__chat_global__';

            try {
                const all = await db.compendium.where('projectId').equals(pid).toArray();
                const groups = {};

                for (const entry of all) {
                    const sourceTag = (entry.tags || []).find(t => typeof t === 'string' && t.startsWith('ST:'));
                    if (sourceTag) {
                        if (!groups[sourceTag]) groups[sourceTag] = [];
                        groups[sourceTag].push(entry);
                    }
                }

                for (const tag of Object.keys(groups)) {
                    groups[tag].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                }

                app.lorebookSources = groups;
            } catch (e) {
                console.error('Failed to load lorebook entries:', e);
                app.lorebookSources = {};
            }
        },

        async selectLorebookEntry(app, id) {
            if (!id) return;

            if (app.lorebookDirty) {
                app.pendingLorebookAction = { type: 'select', id };
                app.showLorebookUnsavedModal = true;
                return;
            }

            await this._doSelectLorebookEntry(app, id);
        },

        async _doSelectLorebookEntry(app, id) {
            try {
                const entry = await db.compendium.get(id);
                if (entry) {
                    app.currentLorebookEntry = entry;
                    this.storeLorebookOriginal(app);
                }
            } catch (e) {
                console.error('Failed to select lorebook entry:', e);
            }
        },

        async saveLorebookEntry(app) {
            if (!app.currentLorebookEntry || !app.currentLorebookEntry.id) return;
            try {
                app.lorebookSaveStatus = 'Saving...';
                const updates = {
                    title: app.currentLorebookEntry.title || '',
                    body: app.currentLorebookEntry.body || '',
                    tags: JSON.parse(JSON.stringify(app.currentLorebookEntry.tags || [])),
                    alwaysInContext: app.currentLorebookEntry.alwaysInContext || false
                };
                await window.Compendium.updateEntry(app.currentLorebookEntry.id, updates);
                const fresh = await window.Compendium.getEntry(app.currentLorebookEntry.id);
                app.currentLorebookEntry = fresh;
                this.storeLorebookOriginal(app);
                await this.loadLorebookEntries(app);
                app.lorebookSaveStatus = 'Saved';
                setTimeout(() => { app.lorebookSaveStatus = ''; }, 2000);
            } catch (e) {
                console.error('Failed to save lorebook entry:', e);
                app.lorebookSaveStatus = 'Error';
                setTimeout(() => { app.lorebookSaveStatus = ''; }, 3000);
            }
        },

        async deleteLorebookEntry(app, id) {
            if (!id) return;
            if (!confirm('Delete this lorebook entry?')) return;
            try {
                await window.Compendium.deleteEntry(id);
                if (app.currentLorebookEntry && app.currentLorebookEntry.id === id) {
                    app.currentLorebookEntry = null;
                    app.lorebookOriginalEntry = null;
                    app.lorebookDirty = false;
                }
                await this.loadLorebookEntries(app);
                if (window.CompendiumManager && typeof window.CompendiumManager.loadCompendiumCounts === 'function') {
                    await window.CompendiumManager.loadCompendiumCounts(app);
                }
            } catch (e) {
                console.error('Failed to delete lorebook entry:', e);
            }
        },

        async deleteLorebookSource(app, sourceTag) {
            if (!sourceTag) return;
            const bookName = sourceTag.replace('ST:', '');
            if (!confirm('Delete all entries from "' + bookName + '" (' + ((app.lorebookSources[sourceTag] || []).length) + ' entries)?')) return;
            try {
                const entries = app.lorebookSources[sourceTag] || [];
                for (const entry of entries) {
                    await window.Compendium.deleteEntry(entry.id);
                }
                if (app.currentLorebookEntry) {
                    const stillExists = entries.some(e => e.id === app.currentLorebookEntry.id);
                    if (stillExists) {
                        app.currentLorebookEntry = null;
                        app.lorebookOriginalEntry = null;
                        app.lorebookDirty = false;
                    }
                }
                await this.loadLorebookEntries(app);
                if (window.CompendiumManager && typeof window.CompendiumManager.loadCompendiumCounts === 'function') {
                    await window.CompendiumManager.loadCompendiumCounts(app);
                }
            } catch (e) {
                console.error('Failed to delete lorebook source:', e);
            }
        },

        addLorebookTag(app) {
            if (!app.currentLorebookEntry) return;
            const tag = (app.newLorebookTag || '').trim();
            if (!tag) return;
            app.currentLorebookEntry.tags = app.currentLorebookEntry.tags || [];
            if (!app.currentLorebookEntry.tags.includes(tag)) {
                if (app.currentLorebookEntry.tags.length >= 10) {
                    alert('Maximum 10 tags per entry.');
                    return;
                }
                app.currentLorebookEntry.tags.push(tag);
                this.updateLorebookDirtyFlag(app);
            }
            app.newLorebookTag = '';
        },

        removeLorebookTag(app, index) {
            if (!app.currentLorebookEntry || !app.currentLorebookEntry.tags) return;
            app.currentLorebookEntry.tags.splice(index, 1);
            this.updateLorebookDirtyFlag(app);
        },

        cancelLorebookAction(app) {
            app.pendingLorebookAction = null;
            app.showLorebookUnsavedModal = false;
        },

        _doCloseLorebookPanel(app) {
            app.showLorebookPanel = false;
            app.currentLorebookEntry = null;
            app.lorebookOriginalEntry = null;
            app.lorebookDirty = false;
        }
    };

    window.LorebookManager = LorebookManager;
})();
