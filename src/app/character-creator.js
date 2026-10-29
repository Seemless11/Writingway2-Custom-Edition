/**
 * character-creator — Character creator.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // ========== Character Creator Image Describe ==========
            triggerCharCreatorImageUpload() {
                this.charCreatorImageError = '';
                var el = document.getElementById('charCreatorImageInput');
                if (el) el.click();
            },

            onCharCreatorImageSelected(event) {
                var file = event.target.files?.[0];
                if (!file) return;
                this.charCreatorImageError = '';
                var allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
                if (!allowed.includes(file.type)) {
                    this.charCreatorImageError = 'Unsupported format. Use PNG, JPEG, WebP, or GIF.';
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    this.charCreatorImageError = 'Image too large (max 10MB).';
                    return;
                }
                this.charCreatorImageFileName = file.name;
                var self = this;
                var reader = new FileReader();
                reader.onload = function (e) {
                    self.charCreatorImageData = e.target.result;
                    self.charCreatorImageDescription = '';
                    self.charCreatorImageError = '';
                };
                reader.onerror = function () {
                    self.charCreatorImageError = 'Failed to read file.';
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            },

            removeCharCreatorImage() {
                this.charCreatorImageData = null;
                this.charCreatorImageFileName = '';
                this.charCreatorImageDescription = '';
                this.charCreatorImageError = '';
                this.charCreatorImageDescrLoading = false;
            },

            async describeCharCreatorImage() {
                if (!this.charCreatorImageData) return;
                if (this.charCreatorImageDescrLoading) return;
                if (!this.aiApiKey) {
                    this.charCreatorImageError = 'No API key found. Set your OpenRouter API key in AI Settings.';
                    return;
                }
                this.charCreatorImageDescrLoading = true;
                this.charCreatorImageError = '';
                try {
                    var result = await window.ImageDescriber.describe(
                        this.charCreatorImageData,
                        this.currentProject?.language || 'English',
                        this.aiApiKey
                    );
                    if (result?.error) {
                        this.charCreatorImageError = result.error;
                    } else if (result?.description) {
                        this.charCreatorImageDescription = result.description;
                    } else {
                        this.charCreatorImageError = 'No description could be generated.';
                    }
                } catch (e) {
                    this.charCreatorImageError = e.message || 'Image description failed';
                    console.error('Image description error:', e);
                } finally {
                    this.charCreatorImageDescrLoading = false;
                }
            },

            // ========== Character Creator Methods ==========
            getFilteredCharCreatorCategories() {
                const v = this.charCreatorTraitVersion;
                const genres = this.charCreatorGenres || ['fantasy'];
                return window.CharacterCreator.getFilteredCategories(genres);
            },

            openCharacterCreator() {
                this.charCreatorGenres = this.currentProject?.genres?.length
                    ? [...this.currentProject.genres]
                    : ['fantasy'];
                this.charCreatorName = '';
                this.charCreatorNotes = '';
                this.charCreatorInput = '';
                this.charCreatorGenerating = false;
                this.openCharCreatorCategories = [];
                this.charCreatorSelectedTraits = {};
                this.charCreatorChatHistory = [];
                this.charCreatorEditingEntryId = null;
                this.charCreatorImageData = null;
                this.charCreatorImageFileName = '';
                this.charCreatorImageDescription = '';
                this.charCreatorImageError = '';
                this.charCreatorImageDescrLoading = false;
                this.showCharacterCreator = true;
                this.openAllCharacterCreatorCategories();
                try {
                    const saved = localStorage.getItem('ww_char_creator_draft');
                    if (saved) {
                        const draft = JSON.parse(saved);
                        if (draft && draft.selectedTraits && Object.keys(draft.selectedTraits).length > 0) {
                            this.charCreatorDraftAlert = draft;
                        }
                    }
                } catch (e) { /* ignore */ }
            },

            closeCharacterCreator() {
                this.saveCharCreatorDraft();
                this.showCharacterCreator = false;
            },

            // === Character Creator Draft Persistence ===
            saveCharCreatorDraft() {
                if (!this.showCharacterCreator) return;
                const draft = {
                    genre: this.charCreatorGenres,
                    name: this.charCreatorName,
                    notes: this.charCreatorNotes,
                    selectedTraits: JSON.parse(JSON.stringify(this.charCreatorSelectedTraits)),
                    chatHistory: JSON.parse(JSON.stringify(this.charCreatorChatHistory)),
                    imageDescription: this.charCreatorImageDescription || '',
                    savedAt: new Date().toISOString()
                };
                try {
                    localStorage.setItem('ww_char_creator_draft', JSON.stringify(draft));
                } catch (e) { /* ignore */ }
            },

            discardCharCreatorDraft() {
                try {
                    localStorage.removeItem('ww_char_creator_draft');
                } catch (e) { /* ignore */ }
                this.charCreatorDraftAlert = null;
            },

            restoreCharCreatorDraft(draft) {
                if (!draft) return;
                if (draft.genre) {
                    this.charCreatorGenres = Array.isArray(draft.genre) ? draft.genre : [draft.genre];
                }
                if (draft.name) this.charCreatorName = draft.name;
                if (draft.notes) this.charCreatorNotes = draft.notes;
                if (draft.selectedTraits) this.charCreatorSelectedTraits = draft.selectedTraits;
                if (draft.chatHistory) this.charCreatorChatHistory = draft.chatHistory;
                if (draft.imageDescription) this.charCreatorImageDescription = draft.imageDescription;
                this.charCreatorDraftAlert = null;
                this.charCreatorTraitVersion++;
                const cats = window.CharacterCreator.getFilteredCategories(this.charCreatorGenres);
                this.openCharCreatorCategories = cats.map(c => c.id);
            },

            editCharacterInCreator(compEntry) {
                if (!compEntry) return;
                this.discardCharCreatorDraft();
                try {
                    let data = {};
                    let genres = this.currentProject?.genres?.length
                        ? [...this.currentProject.genres]
                        : ['fantasy'];

                    if (compEntry._charData) {
                        data = typeof compEntry._charData === 'string'
                            ? JSON.parse(compEntry._charData)
                            : compEntry._charData;
                        if (data.genre) {
                            genres = Array.isArray(data.genre) ? data.genre : [data.genre];
                        }
                    } else {
                        const body = compEntry.body || '';
                        const parseField = (fieldName) => {
                            if (!body) return '';
                            const regex = new RegExp(`##\\s*${fieldName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
                            const match = body.match(regex);
                            return match ? match[1].trim() : '';
                        };
                        data.name = compEntry.title || '';
                        data.notes = '';
                        data.selectedTraits = {};
                        data.chatHistory = [];
                        data.imageDescription = '';
                    }

                    this.charCreatorGenres = genres;
                    this.charCreatorName = data.name || compEntry.title || '';
                    this.charCreatorNotes = data.notes || '';
                    this.charCreatorSelectedTraits = data.selectedTraits || {};
                    this.charCreatorEditingEntryId = compEntry.id || null;
                    this.charCreatorChatHistory = data.chatHistory || [];
                    this.charCreatorInput = '';
                    this.charCreatorGenerating = false;
                    this.charCreatorImageData = null;
                    this.charCreatorImageFileName = '';
                    this.charCreatorImageDescription = data.imageDescription || '';
                    this.charCreatorImageError = '';
                    this.charCreatorImageDescrLoading = false;
                    this.openCharCreatorCategories = window.CharacterCreator.getFilteredCategories(this.charCreatorGenres).map(c => c.id);
                    this.charCreatorTraitVersion++;
                    this.showCharacterCreator = true;
                } catch (e) {
                    alert('Failed to load character data: ' + e.message);
                }
            },

            openAllCharacterCreatorCategories() {
                const cats = window.CharacterCreator.getFilteredCategories(this.charCreatorGenres || ['fantasy']);
                this.openCharCreatorCategories = cats.map(c => c.id);
            },

            toggleCharCreatorGenre(genreId) {
                const idx = this.charCreatorGenres.indexOf(genreId);
                if (idx === -1) {
                    this.charCreatorGenres = [...this.charCreatorGenres, genreId];
                } else if (this.charCreatorGenres.length > 1) {
                    this.charCreatorGenres = this.charCreatorGenres.filter(g => g !== genreId);
                }
                const cats = window.CharacterCreator.getFilteredCategories(this.charCreatorGenres);
                this.openCharCreatorCategories = cats.map(c => c.id);
                this.saveCharCreatorDraft();
            },

            toggleCharCreatorCategory(id) {
                const idx = this.openCharCreatorCategories.indexOf(id);
                if (idx === -1) {
                    this.openCharCreatorCategories.push(id);
                } else {
                    this.openCharCreatorCategories.splice(idx, 1);
                }
            },

            toggleCharCreatorTrait(catId, traitId) {
                if (!this.charCreatorSelectedTraits[catId]) {
                    this.charCreatorSelectedTraits[catId] = [];
                }
                const arr = this.charCreatorSelectedTraits[catId];
                const idx = arr.indexOf(traitId);
                if (idx === -1) {
                    arr.push(traitId);
                } else {
                    arr.splice(idx, 1);
                }
                this.charCreatorSelectedTraits = Object.assign({}, this.charCreatorSelectedTraits);
                this.saveCharCreatorDraft();
            },

            randomizeCharCreator() {
                this.charCreatorSelectedTraits = window.CharacterCreator.randomTraitsForGenre(this.charCreatorGenres || ['fantasy']);
                this.saveCharCreatorDraft();
            },

            clearCharCreatorTraits() {
                this.charCreatorSelectedTraits = {};
                this.saveCharCreatorDraft();
            },

            openAddTraitForm(catId, groupLabel) {
                this.charCreatorAddTraitForm = { catId, groupLabel };
                this.charCreatorAddTraitName = '';
                this.charCreatorAddTraitHint = '';
            },

            closeAddTraitForm() {
                this.charCreatorAddTraitForm = null;
                this.charCreatorAddTraitName = '';
                this.charCreatorAddTraitHint = '';
            },

            submitAddTraitForm() {
                const name = (this.charCreatorAddTraitName || '').trim();
                if (!name) return;
                const hint = (this.charCreatorAddTraitHint || '').trim();
                const form = this.charCreatorAddTraitForm;
                if (!form) return;
                const traitId = window.CharacterCreator.addUserTrait(form.catId, form.groupLabel, name, hint);
                this.closeAddTraitForm();
                this.charCreatorTraitVersion++;
            },

            removeCustomTrait(catId, groupLabel, traitId) {
                window.CharacterCreator.removeUserTrait(catId, groupLabel, traitId);
                const selected = this.charCreatorSelectedTraits[catId];
                if (selected) {
                    const idx = selected.indexOf(traitId);
                    if (idx !== -1) {
                        selected.splice(idx, 1);
                        this.charCreatorSelectedTraits = Object.assign({}, this.charCreatorSelectedTraits);
                    }
                }
                this.charCreatorTraitVersion++;
            },

            async sendCharCreatorMessage(traitOverride) {
                const msg = (this.charCreatorInput || '').trim();
                if (!msg || this.charCreatorGenerating) return;
                this.charCreatorGenerating = true;
                this.charCreatorInput = '';

                this.charCreatorChatHistory.push({ role: 'user', content: msg, timestamp: new Date().toISOString() });
                const assistantIdx = this.charCreatorChatHistory.length;
                this.charCreatorChatHistory.push({ role: 'assistant', content: '', timestamp: new Date().toISOString() });
                this.charCreatorChatHistory = this.charCreatorChatHistory.slice();

                let savedMaxTokens;
                try {
                    const promptMessages = [];
                    let charCreatorSystemPrompt = window.CharacterCreator.CHARACTER_SYSTEM_PROMPT;
                    const charCreatorLang = this.language || this.currentProject?.language || 'English';
                    if (charCreatorLang !== 'English') {
                        charCreatorSystemPrompt += '\n\nIMPORTANT: Write all responses entirely in ' + charCreatorLang + '.';
                    }
                    promptMessages.push({ role: 'system', content: charCreatorSystemPrompt });

                    const traitSource = traitOverride || this.charCreatorSelectedTraits;
                    const traitParts = [];
                    for (const cat of window.CharacterCreator.TRAIT_CATEGORIES) {
                        const ids = traitSource[cat.id] || [];
                        if (ids.length === 0) continue;
                        const labels = [];
                        for (const g of cat.groups) {
                            for (const t of g.traits) {
                                if (ids.includes(t.id)) {
                                    labels.push(g.label + ': ' + t.label);
                                }
                            }
                        }
                        if (labels.length > 0) {
                            traitParts.push('  - ' + cat.label + ': ' + labels.join(', '));
                        }
                    }
                    if (traitParts.length > 0) {
                        promptMessages.push({ role: 'system', content: 'The character has the following selected traits:\n' + traitParts.join('\n') });
                    }
                    if (this.charCreatorName) {
                        promptMessages.push({ role: 'system', content: 'The character\'s name is "' + this.charCreatorName + '".' });
                    }
                    if (this.charCreatorNotes) {
                        promptMessages.push({ role: 'system', content: 'Additional notes about the character:\n' + this.charCreatorNotes });
                    }

                    const activeGenres = (this.charCreatorGenres || ['fantasy'])
                        .map(id => (window.CharacterCreator.GENRES || []).find(g => g.id === id))
                        .filter(Boolean);
                    if (activeGenres.length > 0) {
                        const labels = activeGenres.map(g => g.label);
                        const descs = activeGenres.map(g => {
                            const d = window.GenreDefs ? window.GenreDefs.getCharDescription(g.id) : '';
                            return d || 'Tailor descriptions to fit this genre.';
                        });
                        promptMessages.push({ role: 'system', content: 'The story genre' + (activeGenres.length > 1 ? 's are ' : ' is ') + labels.join(' + ') + '. ' + descs.join(' ') });
                    }

                    const recentHistory = this.charCreatorChatHistory.slice(0, -1);
                    for (const m of recentHistory) {
                        promptMessages.push({ role: m.role, content: m.content });
                    }

                    this.charCreatorAbortController = new AbortController();
                    let fullResponse = '';
                    savedMaxTokens = this.maxTokens;
                    this.maxTokens = this.creatorTokenBudget;
                    await window.Generation.streamGeneration(promptMessages, (token) => {
                        fullResponse += token;
                        this.charCreatorChatHistory[assistantIdx].content = fullResponse;
                        this.charCreatorChatHistory = this.charCreatorChatHistory.slice();
                    }, this, this.charCreatorAbortController.signal);
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log('Character creator generation stopped by user');
                    } else {
                        this.charCreatorChatHistory[assistantIdx].content = 'Error: ' + (err.message || err);
                        this.charCreatorChatHistory[assistantIdx].isError = true;
                        this.charCreatorChatHistory = this.charCreatorChatHistory.slice();
                    }
                } finally {
                    this.maxTokens = savedMaxTokens;
                    this.charCreatorAbortController = null;
                    this.charCreatorGenerating = false;
                    this.saveCharCreatorDraft();
                    this.$nextTick(() => {
                        const chat = document.getElementById('charCreatorChat');
                        if (chat) chat.scrollTop = chat.scrollHeight;
                    });
                }
            },

            deleteCharCreatorMessage(idx) {
                this.charCreatorChatHistory.splice(idx, 1);
                this.charCreatorChatHistory = this.charCreatorChatHistory.slice();
                this.saveCharCreatorDraft();
            },

            stopCharCreatorGeneration() {
                if (this.charCreatorAbortController) {
                    this.charCreatorAbortController.abort();
                    this.charCreatorAbortController = null;
                }
            },

            sendCharCreatorInstruction(tpl) {
                if (this.charCreatorGenerating) return;
                if (!tpl.message || !tpl.message.trim()) {
                    const activeGenres = (this.charCreatorGenres || ['fantasy'])
                        .map(id => (window.GenreDefs?.GENRES || []).find(g => g.id === id))
                        .filter(Boolean);
                    const genreSuffix = activeGenres.length > 0
                        ? ' (This character is from a ' + activeGenres.map(g => g.label).join(' + ') + ' world.)'
                        : '';
                    this.charCreatorInput = tpl.message + genreSuffix;
                    return;
                }
                this.openCharCreatorTraitPicker(tpl);
            },

            // ========== Trait Picker for Instructions ==========
            getCharCreatorTraitPickerItems() {
                const tpl = this.charCreatorTraitPickerTemplate;
                if (!tpl || !tpl.relevantCategories || tpl.relevantCategories.length === 0) return [];
                const items = [];
                for (const cat of window.CharacterCreator.TRAIT_CATEGORIES) {
                    if (!tpl.relevantCategories.includes(cat.id)) continue;
                    const ids = this.charCreatorSelectedTraits[cat.id] || [];
                    if (ids.length === 0) continue;
                    const catEntry = { catId: cat.id, catLabel: cat.label, groups: [] };
                    for (const g of cat.groups) {
                        const groupTraits = [];
                        for (const t of g.traits) {
                            if (ids.includes(t.id)) {
                                groupTraits.push({ traitId: t.id, traitLabel: t.label });
                            }
                        }
                        if (groupTraits.length > 0) {
                            catEntry.groups.push({ groupLabel: g.label, traits: groupTraits });
                        }
                    }
                    if (catEntry.groups.length > 0) {
                        items.push(catEntry);
                    }
                }
                return items;
            },

            openCharCreatorTraitPicker(tpl) {
                const selections = {};
                if (tpl.relevantCategories && tpl.relevantCategories.length > 0) {
                    for (const cat of window.CharacterCreator.TRAIT_CATEGORIES) {
                        if (!tpl.relevantCategories.includes(cat.id)) continue;
                        const ids = this.charCreatorSelectedTraits[cat.id] || [];
                        for (const g of cat.groups) {
                            for (const t of g.traits) {
                                if (ids.includes(t.id)) {
                                    selections[t.id] = true;
                                }
                            }
                        }
                    }
                }
                this.charCreatorTraitPickerSelections = selections;
                this.charCreatorTraitPickerTemplate = tpl;
                this.charCreatorTraitPickerVisible = true;
            },

            toggleCharCreatorTraitPickerTrait(traitId) {
                if (this.charCreatorTraitPickerSelections[traitId]) {
                    this.charCreatorTraitPickerSelections[traitId] = false;
                } else {
                    this.charCreatorTraitPickerSelections[traitId] = true;
                }
                this.charCreatorTraitPickerSelections = Object.assign({}, this.charCreatorTraitPickerSelections);
            },

            confirmCharCreatorTraitPicker() {
                const tpl = this.charCreatorTraitPickerTemplate;
                if (!tpl) { this.cancelCharCreatorTraitPicker(); return; }
                const activeGenres = (this.charCreatorGenres || ['fantasy'])
                    .map(id => (window.GenreDefs?.GENRES || []).find(g => g.id === id))
                    .filter(Boolean);
                const genreSuffix = activeGenres.length > 0
                    ? ' (This character is from a ' + activeGenres.map(g => g.label).join(' + ') + ' world.)'
                    : '';
                let fullMsg = tpl.message + genreSuffix;
                const selectedIds = Object.keys(this.charCreatorTraitPickerSelections)
                    .filter(id => this.charCreatorTraitPickerSelections[id]);
                if (selectedIds.length > 0) {
                    const traitParts = [];
                    for (const cat of window.CharacterCreator.TRAIT_CATEGORIES) {
                        const ids = this.charCreatorSelectedTraits[cat.id] || [];
                        const active = ids.filter(id => selectedIds.includes(id));
                        if (active.length === 0) continue;
                        const labels = [];
                        for (const g of cat.groups) {
                            for (const t of g.traits) {
                                if (active.includes(t.id)) {
                                    labels.push(t.label);
                                }
                            }
                        }
                        if (labels.length > 0) {
                            traitParts.push(cat.label + ': ' + labels.join(', '));
                        }
                    }
                    if (traitParts.length > 0) {
                        fullMsg += '\n\nRelevant traits to weave in: ' + traitParts.join(' | ');
                    }
                }
                const traitOverride = {};
                for (const cat of window.CharacterCreator.TRAIT_CATEGORIES) {
                    const ids = this.charCreatorSelectedTraits[cat.id] || [];
                    const active = ids.filter(id => selectedIds.includes(id));
                    if (active.length > 0) {
                        traitOverride[cat.id] = active;
                    }
                }
                this.charCreatorTraitPickerVisible = false;
                this.charCreatorTraitPickerTemplate = null;
                this.charCreatorTraitPickerSelections = {};
                this.charCreatorInput = fullMsg;
                this.sendCharCreatorMessage(Object.keys(traitOverride).length > 0 ? traitOverride : null);
            },

            cancelCharCreatorTraitPicker() {
                this.charCreatorTraitPickerVisible = false;
                this.charCreatorTraitPickerTemplate = null;
                this.charCreatorTraitPickerSelections = {};
            },

            toggleTemplateCategory(idx, catId) {
                const tpl = this.charCreatorInstructionTemplates[idx];
                if (!tpl) return;
                const arr = tpl.relevantCategories;
                const pos = arr.indexOf(catId);
                if (pos === -1) {
                    arr.push(catId);
                } else {
                    arr.splice(pos, 1);
                }
                this.charCreatorInstructionTemplates = this.charCreatorInstructionTemplates.slice();
                window.CharacterCreator.saveInstructionTemplates(this.charCreatorInstructionTemplates);
            },

            // ========== Instruction Template Editor ==========
            openInstructionEditor() {
                this.charCreatorEditorSystemPrompt = window.CharacterCreator.getSystemPrompt();
                this.charCreatorShowInstructionEditor = true;
            },

            closeInstructionEditor() {
                window.CharacterCreator.saveInstructionTemplates(this.charCreatorInstructionTemplates);
                window.CharacterCreator.setSystemPrompt(this.charCreatorEditorSystemPrompt);
                this.charCreatorShowInstructionEditor = false;
            },

            addInstructionTemplate() {
                var newId = 'custom_' + Date.now();
                var newTpl = {
                    id: newId,
                    label: 'New Instruction',
                    message: 'Enter your instruction prompt here...',
                    relevantCategories: []
                };
                this.charCreatorInstructionTemplates.push(newTpl);
            },

            deleteInstructionTemplate(id) {
                var idx = this.charCreatorInstructionTemplates.findIndex(function (t) { return t.id === id; });
                if (idx !== -1 && this.charCreatorInstructionTemplates[idx].id.startsWith('custom_')) {
                    this.charCreatorInstructionTemplates.splice(idx, 1);
                }
            },

            resetInstructionTemplates() {
                if (confirm('Reset all instruction templates to defaults? This will remove any custom templates you\'ve added.')) {
                    window.CharacterCreator.resetInstructionTemplates();
                    this.charCreatorInstructionTemplates = window.CharacterCreator.loadInstructionTemplates();
                }
            },

            resetCharCreatorSystemPrompt() {
                if (confirm('Reset the system prompt to its default?')) {
                    window.CharacterCreator.resetSystemPrompt();
                    this.charCreatorEditorSystemPrompt = window.CharacterCreator.getSystemPrompt();
                }
            },

            previewCharCreatorEntry() {
                const entry = window.CharacterCreator.buildCompendiumEntry(
                    this.charCreatorName,
                    this.charCreatorNotes,
                    this.charCreatorGenres,
                    this.charCreatorSelectedTraits,
                    this.charCreatorChatHistory,
                    this.charCreatorImageDescription
                );
                this.charCreatorPreviewHtml = this.markdownToHtml(entry.body || '(empty)');
                this.showCharCreatorPreview = true;
            },

            async adoptCharCreatorEntry() {
                if (!this.currentProject) {
                    alert('Please open a project first.');
                    return;
                }
                const entry = window.CharacterCreator.buildCompendiumEntry(
                    this.charCreatorName,
                    this.charCreatorNotes,
                    this.charCreatorGenres,
                    this.charCreatorSelectedTraits,
                    this.charCreatorChatHistory,
                    this.charCreatorImageDescription
                );
                if (!entry.title.trim()) {
                    alert('Please give the character a name.');
                    return;
                }
                try {
                    if (this.charCreatorEditingEntryId) {
                        const editingId = this.charCreatorEditingEntryId;

                        // Helper: extract a ## Section from body
                        function extractSection(body, sectionName) {
                            if (!body) return null;
                            const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
                            const match = body.match(regex);
                            return match ? match[1].trim() : null;
                        }

                        // Helper: remove ## Sections from body
                        function stripSections(body, sectionNames) {
                            if (!body) return '';
                            let result = body;
                            for (const name of sectionNames) {
                                const regex = new RegExp(`\\n##\\s*${name}\\s*\\n[\\s\\S]*?(?=\\n##\\s|$)`, 'gi');
                                result = result.replace(regex, '');
                            }
                            return result.trim().replace(/\n{3,}/g, '\n\n');
                        }

                        // Fetch existing entry to preserve its body
                        const existingEntry = await db.compendium.get(editingId);
                        const originalBody = existingEntry?.body || '';

                        // Extract new sections from creator output
                        const newTraits = extractSection(entry.body, 'Traits');
                        const newDescription = extractSection(entry.body, 'Description');

                        // Remove old Traits/Description from original, keep everything else
                        let mergedBody = stripSections(originalBody, ['Traits', 'Description']);

                        // Append new Traits (replaces)
                        if (newTraits) {
                            mergedBody += '\n\n## Traits\n\n' + newTraits;
                        }

                        // Append new Description (appends with --- separator)
                        if (newDescription) {
                            const origDesc = extractSection(originalBody, 'Description');
                            if (origDesc) {
                                mergedBody += '\n\n## Description\n\n' + origDesc + '\n\n---\n\n' + newDescription;
                            } else {
                                mergedBody += '\n\n## Description\n\n' + newDescription;
                            }
                        }

                        await window.Compendium.updateEntry(editingId, {
                            title: entry.title,
                            body: mergedBody,
                            _charData: entry._charData
                        });
                        this.charCreatorEditingEntryId = null;
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'characters');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            await window.CompendiumManager._doSelectCompendiumEntry(this, editingId);
                        }
                        this.discardCharCreatorDraft();
                        this.showCharacterCreator = false;
                        this.showCodexPanel = true;
                        alert('Character "' + entry.title + '" updated!');
                    } else {
                        const saved = await window.Compendium.import(this.currentProject.id, [entry]);
                        if (!this.openCompCategories.includes('characters')) {
                            this.openCompCategories.push('characters');
                        }
                        if (window.CompendiumManager) {
                            await window.CompendiumManager.refreshCategoryList(this, 'characters');
                            await window.CompendiumManager.loadCompendiumCounts(this);
                            if (saved && saved.length > 0) {
                                await window.CompendiumManager._doSelectCompendiumEntry(this, saved[0].id);
                            }
                        }
                        this.discardCharCreatorDraft();
                        this.showCharacterCreator = false;
                        this.showCodexPanel = true;
                        alert('Character "' + entry.title + '" adopted into Compendium!');
                    }
                } catch (err) {
                    alert('Failed to save character: ' + err.message);
                    console.error('Character creator adopt error:', err);
                }
            },
});
