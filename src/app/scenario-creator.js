/**
 * scenario-creator — Scenario creator.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // ========== Scenario Creator Methods ==========
            openScenarioCreator() {
                this.scenarioCreatorGenres = this.currentProject?.genres?.length
                    ? [...this.currentProject.genres]
                    : ['fantasy'];
                this.scenarioCreatorName = '';
                this.scenarioCreatorNotes = '';
                this.scenarioCreatorInput = '';
                this.scenarioCreatorGenerating = false;
                this.openScenarioCreatorCategories = [];
                this.scenarioCreatorSelectedTraits = {};
                this.scenarioCreatorChatHistory = [];
                this.scenarioCreatorEditingEntryId = null;
                this.showScenarioCreator = true;
                this.scenarioCreatorInstructionTemplates = window.ScenarioCreator.loadInstructionTemplates();
                this.openAllScenarioCreatorCategories();
                try {
                    const saved = localStorage.getItem('ww_scenario_creator_draft');
                    if (saved) {
                        const draft = JSON.parse(saved);
                        if (draft && draft.selectedTraits && Object.keys(draft.selectedTraits).length > 0) {
                            this.scenarioCreatorDraftAlert = draft;
                        }
                    }
                } catch (e) { /* ignore */ }
            },

            closeScenarioCreator() {
                this.saveScenarioCreatorDraft();
                this.showScenarioCreator = false;
            },

            saveScenarioCreatorDraft() {
                if (!this.showScenarioCreator) return;
                const draft = {
                    genre: this.scenarioCreatorGenres,
                    name: this.scenarioCreatorName,
                    notes: this.scenarioCreatorNotes,
                    selectedTraits: JSON.parse(JSON.stringify(this.scenarioCreatorSelectedTraits)),
                    chatHistory: JSON.parse(JSON.stringify(this.scenarioCreatorChatHistory)),
                    savedAt: new Date().toISOString()
                };
                try { localStorage.setItem('ww_scenario_creator_draft', JSON.stringify(draft)); } catch (e) { /* ignore */ }
            },

            discardScenarioCreatorDraft() {
                try { localStorage.removeItem('ww_scenario_creator_draft'); } catch (e) { /* ignore */ }
                this.scenarioCreatorDraftAlert = null;
            },

            restoreScenarioCreatorDraft(draft) {
                if (!draft) return;
                if (draft.genre) this.scenarioCreatorGenres = Array.isArray(draft.genre) ? draft.genre : [draft.genre];
                if (draft.name) this.scenarioCreatorName = draft.name;
                if (draft.notes) this.scenarioCreatorNotes = draft.notes;
                if (draft.selectedTraits) this.scenarioCreatorSelectedTraits = draft.selectedTraits;
                if (draft.chatHistory) this.scenarioCreatorChatHistory = draft.chatHistory;
                this.scenarioCreatorDraftAlert = null;
                this.scenarioCreatorTraitVersion++;
                const cats = window.ScenarioCreator.getFilteredCategories(this.scenarioCreatorGenres);
                this.openScenarioCreatorCategories = cats.map(c => c.id);
            },

            editScenarioInCreator(compEntry) {
                if (!compEntry || !compEntry._scenarioData) return;
                this.discardScenarioCreatorDraft();
                try {
                    const data = typeof compEntry._scenarioData === 'string' ? JSON.parse(compEntry._scenarioData) : compEntry._scenarioData;
                    if (data.genre) this.scenarioCreatorGenres = Array.isArray(data.genre) ? data.genre : [data.genre];
                    this.scenarioCreatorName = data.name || compEntry.title || '';
                    this.scenarioCreatorNotes = data.notes || '';
                    this.scenarioCreatorSelectedTraits = data.selectedTraits || {};
                    this.scenarioCreatorEditingEntryId = compEntry.id || null;
                    this.scenarioCreatorChatHistory = data.chatHistory || [];
                    this.scenarioCreatorInput = '';
                    this.scenarioCreatorGenerating = false;
                    this.scenarioCreatorInstructionTemplates = window.ScenarioCreator.loadInstructionTemplates();
                    this.openScenarioCreatorCategories = window.ScenarioCreator.getFilteredCategories(this.scenarioCreatorGenres).map(c => c.id);
                    this.scenarioCreatorTraitVersion++;
                    this.showScenarioCreator = true;
                } catch (e) { alert('Failed to load scenario data: ' + e.message); }
            },

            openAllScenarioCreatorCategories() {
                const cats = window.ScenarioCreator.getFilteredCategories(this.scenarioCreatorGenres || ['fantasy']);
                this.openScenarioCreatorCategories = cats.map(c => c.id);
            },

            toggleScenarioCreatorGenre(genreId) {
                const idx = this.scenarioCreatorGenres.indexOf(genreId);
                if (idx === -1) this.scenarioCreatorGenres = [...this.scenarioCreatorGenres, genreId];
                else if (this.scenarioCreatorGenres.length > 1) this.scenarioCreatorGenres = this.scenarioCreatorGenres.filter(g => g !== genreId);
                const cats = window.ScenarioCreator.getFilteredCategories(this.scenarioCreatorGenres);
                this.openScenarioCreatorCategories = cats.map(c => c.id);
                this.saveScenarioCreatorDraft();
            },

            toggleScenarioCreatorCategory(id) {
                const idx = this.openScenarioCreatorCategories.indexOf(id);
                if (idx === -1) this.openScenarioCreatorCategories.push(id);
                else this.openScenarioCreatorCategories.splice(idx, 1);
            },

            toggleScenarioCreatorTrait(catId, traitId) {
                if (!this.scenarioCreatorSelectedTraits[catId]) this.scenarioCreatorSelectedTraits[catId] = [];
                const arr = this.scenarioCreatorSelectedTraits[catId];
                const idx = arr.indexOf(traitId);
                if (idx === -1) arr.push(traitId);
                else arr.splice(idx, 1);
                this.scenarioCreatorSelectedTraits = Object.assign({}, this.scenarioCreatorSelectedTraits);
                this.saveScenarioCreatorDraft();
            },

            randomizeScenarioCreator() {
                this.scenarioCreatorSelectedTraits = window.ScenarioCreator.randomTraitsForGenre(this.scenarioCreatorGenres || ['fantasy']);
                this.saveScenarioCreatorDraft();
            },

            clearScenarioCreatorTraits() {
                this.scenarioCreatorSelectedTraits = {};
                this.saveScenarioCreatorDraft();
            },

            getFilteredScenarioCreatorCategories() {
                return window.ScenarioCreator.getFilteredCategories(this.scenarioCreatorGenres || ['fantasy']);
            },

            openScenarioCreatorAddTraitForm(catId, groupLabel) {
                this.scenarioCreatorAddTraitForm = { catId, groupLabel };
                this.scenarioCreatorAddTraitName = '';
                this.scenarioCreatorAddTraitHint = '';
            },

            closeScenarioCreatorAddTraitForm() {
                this.scenarioCreatorAddTraitForm = null;
                this.scenarioCreatorAddTraitName = '';
                this.scenarioCreatorAddTraitHint = '';
            },

            submitScenarioCreatorAddTraitForm() {
                const name = (this.scenarioCreatorAddTraitName || '').trim();
                if (!name) return;
                const hint = (this.scenarioCreatorAddTraitHint || '').trim();
                const form = this.scenarioCreatorAddTraitForm;
                if (!form) return;
                window.ScenarioCreator.addUserTrait(form.catId, form.groupLabel, name, hint);
                this.closeScenarioCreatorAddTraitForm();
                this.scenarioCreatorTraitVersion++;
            },

            removeScenarioCreatorCustomTrait(catId, groupLabel, traitId) {
                window.ScenarioCreator.removeUserTrait(catId, groupLabel, traitId);
                const selected = this.scenarioCreatorSelectedTraits[catId];
                if (selected) {
                    const idx = selected.indexOf(traitId);
                    if (idx !== -1) { selected.splice(idx, 1); this.scenarioCreatorSelectedTraits = Object.assign({}, this.scenarioCreatorSelectedTraits); }
                }
                this.scenarioCreatorTraitVersion++;
            },

            async sendScenarioCreatorMessage(traitOverride) {
                const msg = (this.scenarioCreatorInput || '').trim();
                if (!msg || this.scenarioCreatorGenerating) return;
                this.scenarioCreatorGenerating = true;
                this.scenarioCreatorInput = '';
                this.scenarioCreatorChatHistory.push({ role: 'user', content: msg, timestamp: new Date().toISOString() });
                const assistantIdx = this.scenarioCreatorChatHistory.length;
                this.scenarioCreatorChatHistory.push({ role: 'assistant', content: '', timestamp: new Date().toISOString() });
                this.scenarioCreatorChatHistory = this.scenarioCreatorChatHistory.slice();
                let savedMaxTokens;
                try {
                    const promptMessages = [];
                    let systemPrompt = window.ScenarioCreator.getSystemPrompt();
                    const lang = this.language || this.currentProject?.language || 'English';
                    if (lang !== 'English') systemPrompt += '\n\nIMPORTANT: Write all responses entirely in ' + lang + '.';
                    promptMessages.push({ role: 'system', content: systemPrompt });
                    const traitSource = traitOverride || this.scenarioCreatorSelectedTraits;
                    const traitParts = [];
                    for (const cat of window.ScenarioCreator.SCENARIO_TRAIT_CATEGORIES) {
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
                    if (this.scenarioCreatorName) fullMsg = 'Scenario: ' + this.scenarioCreatorName + '\n\n' + fullMsg;
                    if (this.scenarioCreatorNotes) fullMsg += '\n\nNotes: ' + this.scenarioCreatorNotes;
                    if (traitParts.length > 0) fullMsg += '\n\nTraits: ' + traitParts.join(' | ');
                    promptMessages.push({ role: 'user', content: fullMsg });
                    this.scenarioCreatorAbortController = new AbortController();
                    let fullResponse = '';
                    savedMaxTokens = this.maxTokens;
                    this.maxTokens = this.creatorTokenBudget;
                    await window.Generation.streamGeneration(promptMessages, (token) => {
                        fullResponse += token;
                        this.scenarioCreatorChatHistory[assistantIdx].content = fullResponse;
                        this.scenarioCreatorChatHistory = this.scenarioCreatorChatHistory.slice();
                    }, this, this.scenarioCreatorAbortController.signal);
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        this.scenarioCreatorChatHistory[assistantIdx].content = 'Error: ' + e.message;
                        this.scenarioCreatorChatHistory = this.scenarioCreatorChatHistory.slice();
                    }
                } finally {
                    this.maxTokens = savedMaxTokens;
                    this.scenarioCreatorAbortController = null;
                    this.scenarioCreatorGenerating = false;
                    this.saveScenarioCreatorDraft();
                }
            },

            stopScenarioCreatorGeneration() {
                if (this.scenarioCreatorAbortController) { this.scenarioCreatorAbortController.abort(); this.scenarioCreatorAbortController = null; }
                this.scenarioCreatorGenerating = false;
            },

            deleteScenarioCreatorMessage(idx) {
                if (idx < 0 || idx >= this.scenarioCreatorChatHistory.length) return;
                this.scenarioCreatorChatHistory.splice(idx, 1);
                this.scenarioCreatorChatHistory = this.scenarioCreatorChatHistory.slice();
                this.saveScenarioCreatorDraft();
            },

            async sendScenarioCreatorInstruction(tpl) {
                if (this.scenarioCreatorGenerating) return;
                this.scenarioCreatorInput = tpl.message;
                await this.sendScenarioCreatorMessage();
            },

            previewScenarioCreatorEntry() {
                const entry = window.ScenarioCreator.buildCompendiumEntry(
                    this.scenarioCreatorName, this.scenarioCreatorNotes, this.scenarioCreatorGenres,
                    this.scenarioCreatorSelectedTraits, this.scenarioCreatorChatHistory
                );
                this.scenarioCreatorPreviewHtml = this.markdownToHtml(entry.body || '(empty)');
                this.showScenarioCreatorPreview = true;
            },

            async adoptScenarioCreatorEntry() {
                if (!this.currentProject) { alert('Please open a project first.'); return; }
                const entry = window.ScenarioCreator.buildCompendiumEntry(
                    this.scenarioCreatorName, this.scenarioCreatorNotes, this.scenarioCreatorGenres,
                    this.scenarioCreatorSelectedTraits, this.scenarioCreatorChatHistory
                );
                if (!entry.title.trim()) { alert('Please give the scenario a name.'); return; }
                try {
                    if (this.scenarioCreatorEditingEntryId) {
                        const editingId = this.scenarioCreatorEditingEntryId;
                        await window.Compendium.updateEntry(editingId, { title: entry.title, body: entry.body, _scenarioData: entry._scenarioData });
                        this.scenarioCreatorEditingEntryId = null;
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'scenarios');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            await window.CompendiumManager._doSelectCompendiumEntry(this, editingId);
                        }
                        this.discardScenarioCreatorDraft();
                        this.showScenarioCreator = false;
                        this.showCodexPanel = true;
                        alert('Scenario "' + entry.title + '" updated!');
                    } else {
                        const saved = await window.Compendium.import(this.currentProject.id, [entry]);
                        if (!this.openCompCategories.includes('scenarios')) this.openCompCategories.push('scenarios');
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'scenarios');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            if (saved && saved.length > 0) await window.CompendiumManager._doSelectCompendiumEntry(this, saved[0].id);
                        }
                        this.discardScenarioCreatorDraft();
                        this.showScenarioCreator = false;
                        this.showCodexPanel = true;
                        alert('Scenario "' + entry.title + '" adopted into Compendium!');
                    }
                } catch (err) { alert('Failed to save scenario: ' + err.message); console.error('Scenario creator adopt error:', err); }
            },

            // Scenario Creator instruction editor
            openScenarioCreatorInstructionEditor() {
                this.scenarioCreatorEditorSystemPrompt = window.ScenarioCreator.getSystemPrompt();
                this.scenarioCreatorShowInstructionEditor = true;
            },

            closeScenarioCreatorInstructionEditor() {
                window.ScenarioCreator.saveInstructionTemplates(this.scenarioCreatorInstructionTemplates);
                window.ScenarioCreator.setSystemPrompt(this.scenarioCreatorEditorSystemPrompt);
                this.scenarioCreatorShowInstructionEditor = false;
            },

            addScenarioCreatorInstructionTemplate() {
                const newId = 'custom_' + Date.now();
                this.scenarioCreatorInstructionTemplates.push({ id: newId, label: 'New Instruction', message: '', relevantCategories: [] });
            },

            deleteScenarioCreatorInstructionTemplate(id) {
                const idx = this.scenarioCreatorInstructionTemplates.findIndex(t => t.id === id);
                if (idx !== -1 && this.scenarioCreatorInstructionTemplates[idx].id.startsWith('custom_')) this.scenarioCreatorInstructionTemplates.splice(idx, 1);
            },

            resetScenarioCreatorInstructionTemplates() {
                if (confirm('Reset all instruction templates to defaults?')) { window.ScenarioCreator.resetInstructionTemplates(); this.scenarioCreatorInstructionTemplates = window.ScenarioCreator.loadInstructionTemplates(); }
            },

            resetScenarioCreatorSystemPrompt() {
                if (confirm('Reset the system prompt to its default?')) { window.ScenarioCreator.resetSystemPrompt(); this.scenarioCreatorEditorSystemPrompt = window.ScenarioCreator.getSystemPrompt(); }
            },
});
