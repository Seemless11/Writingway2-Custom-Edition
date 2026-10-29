/**
 * compendium — Compendium entries and the project vault.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Compendium methods - delegated to CompendiumManager
            async openCompendium() {
                await window.CompendiumManager.openCompendium(this);
            },

            async loadCompendiumCounts() {
                await window.CompendiumManager.loadCompendiumCounts(this);
            },

            async loadCompendiumCategory(category) {
                await window.CompendiumManager.loadCompendiumCategory(this, category);
            },

            // Get all compendium entries for the current project (for context panel)
            async getAllCompendiumEntries() {
                if (!this.currentProject) return [];
                try {
                    const entries = await db.compendium.where('projectId').equals(this.currentProject.id).toArray();
                    return entries || [];
                } catch (e) {
                    console.error('Failed to load all compendium entries:', e);
                    return [];
                }
            },

            async createCompendiumEntry(category) {
                await window.CompendiumManager.createCompendiumEntry(this, category);
            },

            async importCharacterCard(source) {
                await window.CompendiumManager.importCharacterCard(this, source);
            },

            async selectCompendiumEntry(id) {
                await window.CompendiumManager.selectCompendiumEntry(this, id);
            },

            async saveCompendiumEntry() {
                await window.CompendiumManager.saveCompendiumEntry(this);
            },

            addCompTag() {
                window.CompendiumManager.addCompTag(this);
            },

            removeCompTag(index) {
                window.CompendiumManager.removeCompTag(this, index);
            },

            setCompImageFromFile(e) {
                window.CompendiumManager.setCompImageFromFile(this, e);
            },

            confirmRemoveCompImage() {
                window.CompendiumManager.confirmRemoveCompImage(this);
            },

            async deleteCompendiumEntry(id) {
                await window.CompendiumManager.deleteCompendiumEntry(this, id);
            },

            async moveCompendiumEntryUp(id) {
                await window.CompendiumManager.moveCompendiumEntryUp(this, id);
            },

            async moveCompendiumEntryDown(id) {
                await window.CompendiumManager.moveCompendiumEntryDown(this, id);
            },

            async moveCompendiumEntryToCategory(id, newCategory) {
                await window.CompendiumManager.moveCompendiumEntryToCategory(this, id, newCategory);
            },

            // Compendium unsaved changes guard methods
            closeCompendium() {
                window.CompendiumManager.closeCompendium(this);
            },

            async saveAndProceedCompendium() {
                await window.CompendiumManager.saveAndProceedCompendium(this);
            },

            async discardAndProceedCompendium() {
                await window.CompendiumManager.discardAndProceedCompendium(this);
            },

            cancelCompendiumAction() {
                window.CompendiumManager.cancelCompendiumAction(this);
            },

            updateCompendiumDirtyFlag() {
                window.CompendiumManager.updateCompendiumDirtyFlag(this);
            },

            // Compendium AI generation methods
            async generateCompendiumEntry() {
                await window.CompendiumManager.generateCompendiumEntry(this);
            },

            acceptCompendiumGen() {
                window.CompendiumManager.acceptCompendiumGen(this);
            },

            retryCompendiumGen() {
                window.CompendiumManager.retryCompendiumGen(this);
            },

            discardCompendiumGen() {
                window.CompendiumManager.discardCompendiumGen(this);
            },

            stopCompendiumGeneration() {
                window.CompendiumManager.stopCompendiumGeneration(this);
            },

            // Compendium body editor @mention autocomplete
            async onCompBodyInput(e) {
                await window.CompendiumManager.onCompBodyInput(this, e);
            },

            onCompBodyKey(e) {
                window.CompendiumManager.onCompBodyKey(this, e);
            },

            selectCompBodyMatch(item) {
                window.CompendiumManager.selectCompBodyMatch(this, item);
            },

            async createCompendiumEntryFromSelection(category) {
                await window.CompendiumManager.createEntryFromSelection(this, this.selectedTextForRewrite, category);
            },

            // ========== Compendium Vault ==========
            openCompendiumVault(category) {
                this.vaultCategory = category || 'characters';
                this.vaultEntries = [];
                this.vaultSelected = {};
                this.vaultSearch = '';
                this.vaultLoading = true;
                this.showCompendiumVault = true;
                this.$nextTick(() => this.loadCompendiumVault());
            },

            closeCompendiumVault() {
                this.showCompendiumVault = false;
                this.vaultEntries = [];
                this.vaultSelected = {};
                this.vaultSearch = '';
            },

            async loadCompendiumVault() {
                try {
                    const entries = await window.Compendium.listByCategoryUnscoped(this.vaultCategory);
                    const projectMap = {};
                    for (const p of (this.projects || [])) {
                        projectMap[p.id] = p.name;
                    }
                    this.vaultEntries = entries.map(e => ({
                        ...e,
                        projectName: projectMap[e.projectId] || 'Unknown Project',
                        isCurrentProject: e.projectId === this.currentProject?.id
                    })).sort((a, b) => {
                        if (a.isCurrentProject && !b.isCurrentProject) return -1;
                        if (!a.isCurrentProject && b.isCurrentProject) return 1;
                        return 0;
                    });
                } catch (err) {
                    console.error('Failed to load vault entries:', err);
                    this.vaultEntries = [];
                } finally {
                    this.vaultLoading = false;
                }
            },

            setVaultCategory(category) {
                if (category === this.vaultCategory) return;
                this.vaultCategory = category;
                this.vaultEntries = [];
                this.vaultSelected = {};
                this.vaultLoading = true;
                this.$nextTick(() => this.loadCompendiumVault());
            },

            toggleVaultEntry(id) {
                if (this.vaultSelected[id]) {
                    delete this.vaultSelected[id];
                    this.vaultSelected = { ...this.vaultSelected };
                } else {
                    this.vaultSelected = { ...this.vaultSelected, [id]: true };
                }
            },

            toggleAllVaultEntries() {
                const filtered = this.getFilteredVaultEntries();
                const allSelected = filtered.every(e => this.vaultSelected[e.id]);
                if (allSelected) {
                    this.vaultSelected = {};
                } else {
                    const sel = {};
                    for (const e of filtered) sel[e.id] = true;
                    this.vaultSelected = sel;
                }
            },

            getFilteredVaultEntries() {
                const q = (this.vaultSearch || '').trim().toLowerCase();
                if (!q) return this.vaultEntries;
                return this.vaultEntries.filter(e =>
                    (e.title || '').toLowerCase().includes(q) ||
                    (e.projectName || '').toLowerCase().includes(q)
                );
            },

            vaultSelectedCount() {
                return Object.keys(this.vaultSelected).length;
            },

            async importSelectedVaultEntries() {
                const ids = Object.keys(this.vaultSelected);
                if (ids.length === 0 || !this.currentProject) return;
                const entries = this.vaultEntries
                    .filter(e => ids.includes(e.id) && e.projectId !== this.currentProject.id)
                    .map(e => {
                        const copy = JSON.parse(JSON.stringify(e));
                        // Copy, don't move: drop the original id/timestamps so
                        // Compendium.import() generates a fresh id, and strip
                        // UI-only fields so they aren't persisted on the clone.
                        delete copy.id;
                        delete copy.created;
                        delete copy.modified;
                        delete copy.projectName;
                        delete copy.isCurrentProject;
                        return copy;
                    });
                if (entries.length === 0) {
                    // Only entries already in this project were selected - nothing to copy.
                    this.closeCompendiumVault();
                    return;
                }
                try {
                    await window.Compendium.import(this.currentProject.id, entries);
                    const cat = this.vaultCategory;
                    if (this.compendiumLists[cat]) {
                        await window.CompendiumManager.refreshCategoryList(this, cat);
                    }
                    this.closeCompendiumVault();
                } catch (err) {
                    alert('Failed to import entries: ' + (err.message || err));
                }
            },
});
