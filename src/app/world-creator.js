/**
 * world-creator — World creator.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // ========== World Creator Methods ==========
            openWorldCreator() {
                this.worldCreatorGenres = this.currentProject?.genres?.length
                    ? [...this.currentProject.genres]
                    : ['fantasy'];
                this.worldCreatorName = '';
                this.worldCreatorNotes = '';
                this.worldCreatorInput = '';
                this.worldCreatorGenerating = false;
                this.openWorldCreatorCategories = [];
                this.worldCreatorSelectedTraits = {};
                this.worldCreatorChatHistory = [];
                this.worldCreatorEditingEntryId = null;
                this.worldCreatorImageData = null;
                this.worldCreatorImageFileName = '';
                this.worldCreatorImageDescription = '';
                this.worldCreatorImageError = '';
                this.worldCreatorImageDescrLoading = false;
                this.showWorldCreator = true;
                this.worldCreatorInstructionTemplates = window.WorldCreator.loadInstructionTemplates();
                this.openAllWorldCreatorCategories();
                try {
                    const saved = localStorage.getItem('ww_world_creator_draft');
                    if (saved) {
                        const draft = JSON.parse(saved);
                        if (draft && draft.selectedTraits && Object.keys(draft.selectedTraits).length > 0) {
                            this.worldCreatorDraftAlert = draft;
                        }
                    }
                } catch (e) { /* ignore */ }
            },

            closeWorldCreator() {
                this.saveWorldCreatorDraft();
                this.showWorldCreator = false;
            },

            saveWorldCreatorDraft() {
                if (!this.showWorldCreator) return;
                const draft = {
                    genre: this.worldCreatorGenres,
                    name: this.worldCreatorName,
                    notes: this.worldCreatorNotes,
                    selectedTraits: JSON.parse(JSON.stringify(this.worldCreatorSelectedTraits)),
                    chatHistory: JSON.parse(JSON.stringify(this.worldCreatorChatHistory)),
                    imageDescription: this.worldCreatorImageDescription || '',
                    savedAt: new Date().toISOString()
                };
                try { localStorage.setItem('ww_world_creator_draft', JSON.stringify(draft)); } catch (e) { /* ignore */ }
            },

            discardWorldCreatorDraft() {
                try { localStorage.removeItem('ww_world_creator_draft'); } catch (e) { /* ignore */ }
                this.worldCreatorDraftAlert = null;
            },

            restoreWorldCreatorDraft(draft) {
                if (!draft) return;
                if (draft.genre) this.worldCreatorGenres = Array.isArray(draft.genre) ? draft.genre : [draft.genre];
                if (draft.name) this.worldCreatorName = draft.name;
                if (draft.notes) this.worldCreatorNotes = draft.notes;
                if (draft.selectedTraits) this.worldCreatorSelectedTraits = draft.selectedTraits;
                if (draft.chatHistory) this.worldCreatorChatHistory = draft.chatHistory;
                if (draft.imageDescription) this.worldCreatorImageDescription = draft.imageDescription;
                this.worldCreatorDraftAlert = null;
                this.worldCreatorTraitVersion++;
                const cats = window.WorldCreator.getFilteredCategories(this.worldCreatorGenres);
                this.openWorldCreatorCategories = cats.map(c => c.id);
            },

            editWorldInCreator(compEntry) {
                if (!compEntry || !compEntry._worldData) return;
                this.discardWorldCreatorDraft();
                try {
                    const data = typeof compEntry._worldData === 'string' ? JSON.parse(compEntry._worldData) : compEntry._worldData;
                    if (data.genre) this.worldCreatorGenres = Array.isArray(data.genre) ? data.genre : [data.genre];
                    this.worldCreatorName = data.name || compEntry.title || '';
                    this.worldCreatorNotes = data.notes || '';
                    this.worldCreatorSelectedTraits = data.selectedTraits || {};
                    this.worldCreatorEditingEntryId = compEntry.id || null;
                    this.worldCreatorChatHistory = data.chatHistory || [];
                    this.worldCreatorInput = '';
                    this.worldCreatorGenerating = false;
                    this.worldCreatorImageData = null;
                    this.worldCreatorImageFileName = '';
                    this.worldCreatorImageDescription = data.imageDescription || '';
                    this.worldCreatorImageError = '';
                    this.worldCreatorImageDescrLoading = false;
                    this.worldCreatorInstructionTemplates = window.WorldCreator.loadInstructionTemplates();
                    this.openWorldCreatorCategories = window.WorldCreator.getFilteredCategories(this.worldCreatorGenres).map(c => c.id);
                    this.worldCreatorTraitVersion++;
                    this.showWorldCreator = true;
                } catch (e) { alert('Failed to load world data: ' + e.message); }
            },

            openAllWorldCreatorCategories() {
                const cats = window.WorldCreator.getFilteredCategories(this.worldCreatorGenres || ['fantasy']);
                this.openWorldCreatorCategories = cats.map(c => c.id);
            },

            toggleWorldCreatorGenre(genreId) {
                const idx = this.worldCreatorGenres.indexOf(genreId);
                if (idx === -1) {
                    this.worldCreatorGenres = [...this.worldCreatorGenres, genreId];
                } else if (this.worldCreatorGenres.length > 1) {
                    this.worldCreatorGenres = this.worldCreatorGenres.filter(g => g !== genreId);
                }
                const cats = window.WorldCreator.getFilteredCategories(this.worldCreatorGenres);
                this.openWorldCreatorCategories = cats.map(c => c.id);
                this.saveWorldCreatorDraft();
            },

            toggleWorldCreatorCategory(id) {
                const idx = this.openWorldCreatorCategories.indexOf(id);
                if (idx === -1) this.openWorldCreatorCategories.push(id);
                else this.openWorldCreatorCategories.splice(idx, 1);
            },

            toggleWorldCreatorTrait(catId, traitId) {
                if (!this.worldCreatorSelectedTraits[catId]) this.worldCreatorSelectedTraits[catId] = [];
                const arr = this.worldCreatorSelectedTraits[catId];
                const idx = arr.indexOf(traitId);
                if (idx === -1) arr.push(traitId);
                else arr.splice(idx, 1);
                this.worldCreatorSelectedTraits = Object.assign({}, this.worldCreatorSelectedTraits);
                this.saveWorldCreatorDraft();
            },

            randomizeWorldCreator() {
                this.worldCreatorSelectedTraits = window.WorldCreator.randomTraitsForGenre(this.worldCreatorGenres || ['fantasy']);
                this.saveWorldCreatorDraft();
            },

            clearWorldCreatorTraits() {
                this.worldCreatorSelectedTraits = {};
                this.saveWorldCreatorDraft();
            },

            getFilteredWorldCreatorCategories() {
                return window.WorldCreator.getFilteredCategories(this.worldCreatorGenres || ['fantasy']);
            },

            openWorldCreatorAddTraitForm(catId, groupLabel) {
                this.worldCreatorAddTraitForm = { catId, groupLabel };
                this.worldCreatorAddTraitName = '';
                this.worldCreatorAddTraitHint = '';
            },

            closeWorldCreatorAddTraitForm() {
                this.worldCreatorAddTraitForm = null;
                this.worldCreatorAddTraitName = '';
                this.worldCreatorAddTraitHint = '';
            },

            submitWorldCreatorAddTraitForm() {
                const name = (this.worldCreatorAddTraitName || '').trim();
                if (!name) return;
                const hint = (this.worldCreatorAddTraitHint || '').trim();
                const form = this.worldCreatorAddTraitForm;
                if (!form) return;
                window.WorldCreator.addUserTrait(form.catId, form.groupLabel, name, hint);
                this.closeWorldCreatorAddTraitForm();
                this.worldCreatorTraitVersion++;
            },

            removeWorldCreatorCustomTrait(catId, groupLabel, traitId) {
                window.WorldCreator.removeUserTrait(catId, groupLabel, traitId);
                const selected = this.worldCreatorSelectedTraits[catId];
                if (selected) {
                    const idx = selected.indexOf(traitId);
                    if (idx !== -1) {
                        selected.splice(idx, 1);
                        this.worldCreatorSelectedTraits = Object.assign({}, this.worldCreatorSelectedTraits);
                    }
                }
                this.worldCreatorTraitVersion++;
            },

            async sendWorldCreatorMessage(traitOverride) {
                const msg = (this.worldCreatorInput || '').trim();
                if (!msg || this.worldCreatorGenerating) return;
                this.worldCreatorGenerating = true;
                this.worldCreatorInput = '';
                this.worldCreatorChatHistory.push({ role: 'user', content: msg, timestamp: new Date().toISOString() });
                const assistantIdx = this.worldCreatorChatHistory.length;
                this.worldCreatorChatHistory.push({ role: 'assistant', content: '', timestamp: new Date().toISOString() });
                this.worldCreatorChatHistory = this.worldCreatorChatHistory.slice();
                let savedMaxTokens;
                try {
                    const promptMessages = [];
                    let systemPrompt = window.WorldCreator.getSystemPrompt();
                    const lang = this.language || this.currentProject?.language || 'English';
                    if (lang !== 'English') systemPrompt += '\n\nIMPORTANT: Write all responses entirely in ' + lang + '.';
                    promptMessages.push({ role: 'system', content: systemPrompt });
                    const traitSource = traitOverride || this.worldCreatorSelectedTraits;
                    const traitParts = [];
                    for (const cat of window.WorldCreator.WORLD_TRAIT_CATEGORIES) {
                        const ids = traitSource[cat.id] || [];
                        if (ids.length === 0) continue;
                        const labels = [];
                        for (const g of cat.groups) {
                            for (const t of g.traits) {
                                if (ids.includes(t.id)) labels.push(t.label);
                            }
                        }
                        if (labels.length > 0) traitParts.push(cat.label + ': ' + labels.join(', '));
                    }
                    let fullMsg = msg;
                    if (this.worldCreatorName) fullMsg = 'World: ' + this.worldCreatorName + '\n\n' + fullMsg;
                    if (this.worldCreatorNotes) fullMsg += '\n\nNotes: ' + this.worldCreatorNotes;
                    if (traitParts.length > 0) fullMsg += '\n\nTraits: ' + traitParts.join(' | ');
                    if (this.worldCreatorImageDescription) fullMsg += '\n\nImage Reference: ' + this.worldCreatorImageDescription;
                    promptMessages.push({ role: 'user', content: fullMsg });
                    this.worldCreatorAbortController = new AbortController();
                    let fullResponse = '';
                    savedMaxTokens = this.maxTokens;
                    this.maxTokens = this.creatorTokenBudget;
                    await window.Generation.streamGeneration(promptMessages, (token) => {
                        fullResponse += token;
                        this.worldCreatorChatHistory[assistantIdx].content = fullResponse;
                        this.worldCreatorChatHistory = this.worldCreatorChatHistory.slice();
                    }, this, this.worldCreatorAbortController.signal);
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        this.worldCreatorChatHistory[assistantIdx].content = 'Error: ' + e.message;
                        this.worldCreatorChatHistory = this.worldCreatorChatHistory.slice();
                    }
                } finally {
                    this.maxTokens = savedMaxTokens;
                    this.worldCreatorAbortController = null;
                    this.worldCreatorGenerating = false;
                    this.saveWorldCreatorDraft();
                }
            },

            stopWorldCreatorGeneration() {
                if (this.worldCreatorAbortController) {
                    this.worldCreatorAbortController.abort();
                    this.worldCreatorAbortController = null;
                }
                this.worldCreatorGenerating = false;
            },

            deleteWorldCreatorMessage(idx) {
                if (idx < 0 || idx >= this.worldCreatorChatHistory.length) return;
                this.worldCreatorChatHistory.splice(idx, 1);
                this.worldCreatorChatHistory = this.worldCreatorChatHistory.slice();
                this.saveWorldCreatorDraft();
            },

            async sendWorldCreatorInstruction(tpl) {
                if (this.worldCreatorGenerating) return;
                this.worldCreatorInput = tpl.message;
                await this.sendWorldCreatorMessage();
            },

            previewWorldCreatorEntry() {
                const entry = window.WorldCreator.buildCompendiumEntry(
                    this.worldCreatorName, this.worldCreatorNotes, this.worldCreatorGenres,
                    this.worldCreatorSelectedTraits, this.worldCreatorChatHistory, this.worldCreatorImageDescription
                );
                this.worldCreatorPreviewHtml = this.markdownToHtml(entry.body || '(empty)');
                this.showWorldCreatorPreview = true;
            },

            async adoptWorldCreatorEntry() {
                if (!this.currentProject) { alert('Please open a project first.'); return; }
                const entry = window.WorldCreator.buildCompendiumEntry(
                    this.worldCreatorName, this.worldCreatorNotes, this.worldCreatorGenres,
                    this.worldCreatorSelectedTraits, this.worldCreatorChatHistory, this.worldCreatorImageDescription
                );
                if (!entry.title.trim()) { alert('Please give the world a name.'); return; }
                try {
                    if (this.worldCreatorEditingEntryId) {
                        const editingId = this.worldCreatorEditingEntryId;
                        await window.Compendium.updateEntry(editingId, { title: entry.title, body: entry.body, _worldData: entry._worldData });
                        this.worldCreatorEditingEntryId = null;
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'worlds');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            await window.CompendiumManager._doSelectCompendiumEntry(this, editingId);
                        }
                        this.discardWorldCreatorDraft();
                        this.showWorldCreator = false;
                        this.showCodexPanel = true;
                        alert('World "' + entry.title + '" updated!');
                    } else {
                        const saved = await window.Compendium.import(this.currentProject.id, [entry]);
                        if (!this.openCompCategories.includes('worlds')) this.openCompCategories.push('worlds');
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'worlds');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            if (saved && saved.length > 0) await window.CompendiumManager._doSelectCompendiumEntry(this, saved[0].id);
                        }
                        this.discardWorldCreatorDraft();
                        this.showWorldCreator = false;
                        this.showCodexPanel = true;
                        alert('World "' + entry.title + '" adopted into Compendium!');
                    }
                } catch (err) { alert('Failed to save world: ' + err.message); console.error('World creator adopt error:', err); }
            },

            // World Creator image handling
            triggerWorldCreatorImageUpload() { document.getElementById('worldCreatorImageInput')?.click(); },

            onWorldCreatorImageSelected(e) {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => { this.worldCreatorImageData = ev.target?.result || null; this.worldCreatorImageFileName = file.name; this.worldCreatorImageDescription = ''; this.worldCreatorImageError = ''; };
                reader.readAsDataURL(file);
            },

            removeWorldCreatorImage() { this.worldCreatorImageData = null; this.worldCreatorImageFileName = ''; this.worldCreatorImageDescription = ''; this.worldCreatorImageError = ''; },

            async describeWorldCreatorImage() {
                if (!this.worldCreatorImageData) return;
                this.worldCreatorImageDescrLoading = true;
                this.worldCreatorImageError = '';
                try {
                    const desc = await window.ImageDescriber.describe(this.worldCreatorImageData);
                    this.worldCreatorImageDescription = desc || '';
                } catch (e) { this.worldCreatorImageError = 'Failed to describe image: ' + e.message; }
                finally { this.worldCreatorImageDescrLoading = false; }
            },

            // World Creator instruction editor
            openWorldCreatorInstructionEditor() {
                this.worldCreatorEditorSystemPrompt = window.WorldCreator.getSystemPrompt();
                this.worldCreatorShowInstructionEditor = true;
            },

            closeWorldCreatorInstructionEditor() {
                window.WorldCreator.saveInstructionTemplates(this.worldCreatorInstructionTemplates);
                window.WorldCreator.setSystemPrompt(this.worldCreatorEditorSystemPrompt);
                this.worldCreatorShowInstructionEditor = false;
            },

            addWorldCreatorInstructionTemplate() {
                const newId = 'custom_' + Date.now();
                this.worldCreatorInstructionTemplates.push({ id: newId, label: 'New Instruction', message: 'Enter your instruction prompt here...', relevantCategories: [] });
            },

            deleteWorldCreatorInstructionTemplate(id) {
                const idx = this.worldCreatorInstructionTemplates.findIndex(t => t.id === id);
                if (idx !== -1 && this.worldCreatorInstructionTemplates[idx].id.startsWith('custom_')) this.worldCreatorInstructionTemplates.splice(idx, 1);
            },

            resetWorldCreatorInstructionTemplates() {
                if (confirm('Reset all instruction templates to defaults?')) { window.WorldCreator.resetInstructionTemplates(); this.worldCreatorInstructionTemplates = window.WorldCreator.loadInstructionTemplates(); }
            },

            resetWorldCreatorSystemPrompt() {
                if (confirm('Reset the system prompt to its default?')) { window.WorldCreator.resetSystemPrompt(); this.worldCreatorEditorSystemPrompt = window.WorldCreator.getSystemPrompt(); }
            },
});
