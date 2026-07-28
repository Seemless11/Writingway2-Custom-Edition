/**
 * Character Chat Mode Module
 * Provides a SillyTavern-style character chat interface.
 * Fully standalone — no project required.
 */

const CHAT_GLOBAL_PROJECT_ID = '__chat_global__';

function chatProjectId(app) {
    return app.currentProject?.id || CHAT_GLOBAL_PROJECT_ID;
}

window.ChatMode = {
    // Raw data caches (off reactive state for performance)
    _rosterImported: [],
    _rosterCompendium: [],
    _rosterSearchTimer: null,
    _lastUsedMap: {},

    // ========== Character Data Loading ==========

    async loadCharacterRoster(app) {
        app.characterRosterLoading = true;
        app.showCharacterRoster = true;
        app.rosterActiveTab = 'All';
        app.rosterSearchDebounced = '';
        app.characterRosterSearch = '';
        try {
            const allEntries = await db.compendium
                .where('category')
                .equals('characters')
                .toArray();
            const imported = [];
            const compendium = [];
            for (const e of allEntries) {
                const isImported = e.tags?.includes('imported') && e.tags?.includes('sillytavern');
                (isImported ? imported : compendium).push({ ...e });
            }
            this._rosterImported = imported;
            this._rosterCompendium = compendium;

            const sessions = await db.workshopSessions
                .filter(s => s.characterId)
                .toArray();
            this._lastUsedMap = {};
            for (const s of sessions) {
                const cid = s.characterId;
                const t = new Date(s.updatedAt || 0).getTime();
                if (!this._lastUsedMap[cid] || t > this._lastUsedMap[cid]) {
                    this._lastUsedMap[cid] = t;
                }
            }
        } catch (e) {
            console.error('Failed to load character roster:', e);
            this._rosterImported = [];
            this._rosterCompendium = [];
            this._lastUsedMap = {};
        } finally {
            app.characterRosterLoading = false;
            this.recomputeRosterFilter(app);
        }
    },

    setRosterTab(app, tab) {
        app.rosterActiveTab = tab;
        this.recomputeRosterFilter(app);
    },

    setRosterSort(app, sort) {
        app.rosterSortOrder = sort;
        this.recomputeRosterFilter(app);
    },

    _sortEntries(entries, order) {
        const sorted = [...entries];
        sorted.sort((a, b) => {
            if (order === 'name-asc') return (a.title || '').localeCompare(b.title || '');
            if (order === 'name-desc') return (b.title || '').localeCompare(a.title || '');
            if (order === 'created-desc') return new Date(b.created || 0) - new Date(a.created || 0);
            if (order === 'modified-desc') return new Date(b.modified || 0) - new Date(a.modified || 0);
            if (order === 'used-desc') {
                const aUsed = this._lastUsedMap[a.id] || 0;
                const bUsed = this._lastUsedMap[b.id] || 0;
                return bUsed - aUsed;
            }
            return 0;
        });
        return sorted;
    },

    recomputeRosterFilter(app) {
        const q = (app.rosterSearchDebounced || '').toLowerCase();
        const tab = app.rosterActiveTab || 'All';
        let source = [];
        if (tab === 'Imported') {
            source = this._rosterImported;
        } else if (tab === 'Compendium') {
            source = this._rosterCompendium;
        } else {
            source = [...this._rosterImported, ...this._rosterCompendium];
        }
        let filtered = source;
        if (q) {
            filtered = source.filter(e =>
                (e.title || '').toLowerCase().includes(q)
            );
        }
        app.rosterFilteredList = this._sortEntries(filtered, app.rosterSortOrder || 'name-asc');
        app.rosterVirtualStart = 0;
        const end = Math.min(15, app.rosterFilteredList.length);
        app.rosterVirtualEnd = end;
        requestAnimationFrame(() => {
            const el = document.querySelector('.roster-virtual-list');
            if (el) el.scrollTop = 0;
        });
    },

    onRosterSearchInput(app, e) {
        app.characterRosterSearch = e.target.value;
        if (this._rosterSearchTimer) clearTimeout(this._rosterSearchTimer);
        this._rosterSearchTimer = setTimeout(() => {
            app.rosterSearchDebounced = app.characterRosterSearch;
            this.recomputeRosterFilter(app);
        }, 200);
    },

    onRosterScroll(app, scrollEl) {
        if (!scrollEl || !app.rosterFilteredList.length) return;
        const itemHeight = 88;
        const buffer = 4;
        const total = app.rosterFilteredList.length;
        const scrollTop = scrollEl.scrollTop;
        const clientHeight = scrollEl.clientHeight;
        if (scrollEl.scrollHeight <= clientHeight) return;
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const end = Math.min(total, Math.ceil((scrollTop + clientHeight) / itemHeight) + buffer);
        app.rosterVirtualStart = start;
        app.rosterVirtualEnd = end;
    },

    rosterItemOffset(index) {
        return index * 88;
    },

    clearRosterSearch(app) {
        app.characterRosterSearch = '';
        app.rosterSearchDebounced = '';
        this.recomputeRosterFilter(app);
    },

    async loadRecentCharacters(app) {
        try {
            const allSessions = await db.workshopSessions
                .filter(s => s.characterId)
                .toArray();
            if (!allSessions.length) {
                app.recentChatCharacters = [];
                return;
            }
            const latest = {};
            for (const s of allSessions) {
                const cid = s.characterId;
                if (!latest[cid] || s.updatedAt > latest[cid].updatedAt) {
                    latest[cid] = s;
                }
            }
            const sorted = Object.values(latest)
                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            const top = sorted.slice(0, 5);
            const recent = [];
            for (const s of top) {
                try {
                    const entry = await db.compendium.get(s.characterId);
                    if (entry) {
                        recent.push({
                            ...entry,
                            lastUsed: s.updatedAt
                        });
                    }
                } catch (e) { }
            }
            app.recentChatCharacters = recent;
        } catch (e) {
            console.warn('Failed to load recent characters:', e);
            app.recentChatCharacters = [];
        }
    },

    // ========== Character Card Deletion ==========

    async deleteCharacterCard(app, id) {
        if (!id) return;
        const entry = this._rosterImported.find(e => e.id === id) || app.recentChatCharacters.find(e => e.id === id);
        const name = entry?.title || 'this character';
        if (!confirm(`Delete "${name}"? This will remove the character card from the compendium.`)) return;
        try {
            await window.Compendium.deleteEntry(id);
        } catch (e) {
            console.error('Failed to delete character card:', e);
            return;
        }
        app.currentCompEntry = null;
        if (app.showCharacterRoster) await this.loadCharacterRoster(app);
        await this.loadRecentCharacters(app);
        if (typeof app.loadCompendiumCounts === 'function') await app.loadCompendiumCounts();
    },

    // ========== Character Selection ==========

    async selectCharacter(app, entry) {
        if (!entry) return;
        app.chatCharacterId = entry.id;
        await this.loadCharacterCard(app, entry);
        app.characterRosterSearch = '';
        app.rosterSearchDebounced = '';
        app.rosterFilteredList = [];
        app.showCharacterRoster = false;
        app.writingMode = 'chat';

        try {
            localStorage.setItem('ww2_writingMode', 'chat');
        } catch (e) { }

        await this.loadChatSessions(app);
        await this.loadOrCreateCharacterSession(app);
        if (app.chatCharacterMessages.length === 0) {
            if (app.chatCharacter.alternateGreetings && app.chatCharacter.alternateGreetings.length > 0) {
                app.showGreetingPicker = true;
                app.selectedGreetingIndex = 0;
                return;
            }
            if (app.chatCharacter.firstMessage) {
                const firstMsg = app.chatCharacter.firstMessage;
                app.chatCharacterMessages.push({
                    role: 'assistant',
                    content: firstMsg,
                    timestamp: new Date().toISOString(),
                    name: app.chatCharacter.name
                });
                await this.saveCharacterSession(app);
            }
        }
        this.scrollMessagesToBottom(app);
        await this.loadRecentCharacters(app);
    },

    async selectGreeting(app, index) {
        app.showGreetingPicker = false;
        app.selectedGreetingIndex = index;
        const greeting = index === 0
            ? app.chatCharacter.firstMessage
            : (app.chatCharacter.alternateGreetings || [])[index - 1];
        if (greeting) {
            app.chatCharacterMessages.push({
                role: 'assistant',
                content: greeting,
                timestamp: new Date().toISOString(),
                name: app.chatCharacter.name
            });
            await this.saveCharacterSession(app);
        }
        this.scrollMessagesToBottom(app);
        await this.loadRecentCharacters(app);
    },

    cancelGreetingSelection(app) {
        app.showGreetingPicker = false;
    },

    async startNewCharacterChat(app, entry, greetingIndex) {
        if (!entry && app.chatCharacter) {
            const dbEntry = await db.compendium.get(app.chatCharacterId);
            if (dbEntry) entry = dbEntry;
        }
        if (!entry) return;
        app.chatCharacterId = entry.id || entry.title;
        app.chatCharacterSessionId = null;
        app.chatCharacterMessages = [];
        await this.loadCharacterCard(app, entry);
        await this.createCharacterSession(app);
        if (greetingIndex === undefined && app.chatCharacter.alternateGreetings?.length > 0) {
            app.showGreetingPicker = true;
            app.selectedGreetingIndex = 0;
            app.writingMode = 'chat';
            try { localStorage.setItem('ww2_writingMode', 'chat'); } catch (e) {}
            await this.loadChatSessions(app);
            return;
        }
        const greeting = greetingIndex > 0 && app.chatCharacter.alternateGreetings
            ? app.chatCharacter.alternateGreetings[greetingIndex - 1]
            : app.chatCharacter.firstMessage;
        if (greeting) {
            app.chatCharacterMessages.push({
                role: 'assistant',
                content: greeting,
                timestamp: new Date().toISOString(),
                name: app.chatCharacter.name
            });
            await this.saveCharacterSession(app);
        }
        app.writingMode = 'chat';
        try { localStorage.setItem('ww2_writingMode', 'chat'); } catch (e) {}
        await this.loadChatSessions(app);
    },

    async loadCharacterCard(app, entry) {
        app.chatCharacter = {
            id: entry.id,
            name: entry.title || entry.name || 'Unknown',
            description: this.parseCardField(entry.body, 'Description'),
            personality: this.parseCardField(entry.body, 'Personality'),
            scenario: this.parseCardField(entry.body, 'Scenario'),
            firstMessage: this.parseCardField(entry.body, 'First Message'),
            alternateGreetings: this.parseAlternateGreetings(entry.body),
            examples: this.parseCardField(entry.body, 'Example Dialogue'),
            systemPrompt: this.parseCardField(entry.body, 'System Prompt'),
            avatar: entry.imageUrl || null,
            rawBody: entry.body || ''
        };
    },

    // ========== Session Management ==========

    async loadOrCreateCharacterSession(app) {
        if (!app.chatCharacterId) return;
        const pid = chatProjectId(app);
        try {
            const sessions = await db.workshopSessions
                .where('projectId')
                .equals(pid)
                .toArray();
            const existing = sessions
                .filter(s => s.characterId === app.chatCharacterId)
                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
            if (existing) {
                app.chatCharacterSessionId = existing.id;
                app.chatCharacterMessages = (existing.messages || []).map(m => ({
                    ...m,
                    name: m.role === 'assistant' ? (app.chatCharacter?.name || 'Assistant') : (app.userPersona?.name || 'You')
                }));
                return;
            }
        } catch (e) {
            console.warn('Failed to load character sessions:', e);
        }
        await this.createCharacterSession(app);
    },

    async createCharacterSession(app) {
        if (!app.chatCharacterId) return;
        const pid = chatProjectId(app);
        const session = {
            id: `char_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            name: `Chat with ${app.chatCharacter?.name || 'Character'}`,
            characterId: app.chatCharacterId,
            messages: [],
            projectId: pid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        app.chatCharacterSessionId = session.id;
        app.chatCharacterMessages = [];
        try {
            await db.workshopSessions.add(session);
        } catch (e) {
            console.error('Failed to create character session:', e);
        }
    },

    async saveCharacterSession(app) {
        if (!app.chatCharacterSessionId) return;
        const pid = chatProjectId(app);
        try {
            const data = {
                id: app.chatCharacterSessionId,
                name: `Chat with ${app.chatCharacter?.name || 'Character'}`,
                characterId: app.chatCharacterId,
                messages: JSON.parse(JSON.stringify(app.chatCharacterMessages)),
                projectId: pid,
                createdAt: app.chatCharacterMessages[0]?.timestamp || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const existing = await db.workshopSessions.get(app.chatCharacterSessionId);
            if (existing) {
                await db.workshopSessions.put(data);
            } else {
                await db.workshopSessions.add(data);
            }
        } catch (e) {
            console.error('Failed to save character session:', e);
        }
    },

    async deleteCharacterSession(app) {
        if (!app.chatCharacterSessionId) return;
        if (!confirm('Delete this conversation? This cannot be undone.')) return;
        try {
            await db.workshopSessions.delete(app.chatCharacterSessionId);
        } catch (e) {
            console.error('Failed to delete character session:', e);
        }
        app.chatCharacterSessionId = null;
        app.chatCharacterMessages = [];
        await this.loadChatSessions(app);
        if (app.chatSessions.length > 0) {
            await this.switchChatSession(app, app.chatSessions[0]);
        }
    },

    async loadChatSessions(app) {
        if (!app.chatCharacterId) return;
        const pid = chatProjectId(app);
        try {
            const sessions = await db.workshopSessions
                .where('projectId')
                .equals(pid)
                .toArray();
            app.chatSessions = sessions
                .filter(s => s.characterId === app.chatCharacterId)
                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        } catch (e) {
            console.warn('Failed to load chat sessions:', e);
            app.chatSessions = [];
        }
    },

    async switchChatSession(app, session) {
        if (!session || session.id === app.chatCharacterSessionId) return;
        await this.saveCharacterSession(app);
        app.chatCharacterSessionId = session.id;
        app.chatCharacterMessages = (session.messages || []).map(m => ({
            ...m,
            name: m.role === 'assistant' ? (app.chatCharacter?.name || 'Assistant') : (app.userPersona?.name || 'You')
        }));
        this.scrollMessagesToBottom(app);
    },

    // ========== Prompt Building ==========

    async buildCharacterPrompt(app, mode) {
        const char = app.chatCharacter;
        const persona = app.userPersona;
        const responseMode = app.chatResponseMode;
        if (!char) return [];

        const messages = [];

        let systemContent = `You are ${char.name}.`;

        const pid = chatProjectId(app);
        if (pid && window.db) {
            try {
                const ctxEntries = await window.db.compendium
                    .where('projectId').equals(pid)
                    .filter(e => e.alwaysInContext === true)
                    .toArray();
                if (ctxEntries.length > 0) {
                    systemContent += '\n\nRelevant World Information:';
                    for (const e of ctxEntries) {
                        systemContent += `\n\n-- ${e.title} --\n${e.body}`;
                    }
                }
            } catch (e) {
                console.warn('Failed to load alwaysInContext entries:', e);
            }
        }

        if (char.description) {
            systemContent += `\n\n${char.description}`;
        }
        if (char.personality) {
            systemContent += `\n\nPersonality: ${char.personality}`;
        }
        if (char.scenario) {
            systemContent += `\n\nScenario: ${char.scenario}`;
        }
        if (char.systemPrompt) {
            systemContent += `\n\n${char.systemPrompt}`;
        }
        if (char.examples) {
            systemContent += `\n\n${char.examples}`;
        }

        if (responseMode === 'character') {
            systemContent += `\n\nYou must respond entirely in-character as ${char.name}. Speak in first person as ${char.name}. React naturally to the user's messages. Do not write narration or prose about what ${char.name} does — simply be ${char.name} and respond directly. Use *asterisks* around actions or emotes if needed.`;
        } else {
            systemContent += `\n\nYou are writing a story. Write in third person narrative prose describing what happens in the conversation between the user and ${char.name}. Describe actions, emotions, setting, and dialogue naturally like a novel. Do not speak as the character in first person — narrate the scene instead.`;
        }

        const lang = app.language || 'English';
        if (lang !== 'English') {
            systemContent += `\n\nWrite entirely in ${lang}.`;
        }

        const targetWords = app.maxTokens || 300;
        const minWords = Math.round(targetWords * 0.8);
        const maxWords = Math.round(targetWords * 1.3);
        const paragraphCount = targetWords <= 200 ? 2 : targetWords <= 400 ? 3 : targetWords <= 600 ? 4 : 5;
        systemContent += `\n\nRESPONSE LENGTH REQUIREMENTS:
- Write approximately ${targetWords} words
- Structure your response as ${paragraphCount} paragraphs
- Each paragraph should contain 3-5 sentences
- Do NOT write less than ${minWords} words
- Do NOT write more than ${maxWords} words
- This is a hard requirement. Count your paragraphs as you write.`;

        const personaName = persona?.name || 'You';
        if (persona?.description) {
            systemContent += `\n\nThe user is ${personaName}. ${persona.description}`;
        }
        systemContent += `\n\nAlways refer to the user as ${personaName}.`;

        if (mode === 'continue') {
            systemContent += `\n\nContinue the response naturally from where you left off. The conversation continues without a new user message. Extend the last response, adding more detail or advancing the scene. Keep the same tone and style. Do not repeat what has already been said. Do not greet the user or start a new topic.`;
        }

        systemContent = systemContent
            .replace(/\{\{char(_name)?\}\}/gi, char.name || 'Character')
            .replace(/\{\{user(_name)?\}\}/gi, personaName)
            .replace(/\{\{[^}]*\}\}/g, '')
            .replace(/\[(char|user):[^\]]*\]/gi, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ');

        messages.push({ role: 'system', content: systemContent });

        const narrativeTag = `[${char.name}'s response narrative]`;
        const resolveMsgContent = (text) => {
            return text
                .replace(/\{\{char(_name)?\}\}/gi, char.name || 'Character')
                .replace(/\{\{user(_name)?\}\}/gi, personaName)
                .replace(/\{\{[^}]*\}\}/g, '')
                .replace(/\[(char|user):[^\]]*\]/gi, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/[ \t]{2,}/g, ' ')
                .trim();
        };
        for (const msg of app.chatCharacterMessages) {
            if (!msg.content || !msg.content.trim()) continue;
            const resolved = resolveMsgContent(msg.content);
            if (!resolved) continue;
            if (responseMode === 'narrative' && msg.role === 'assistant') {
                const content = resolved.startsWith(narrativeTag)
                    ? resolved
                    : `${narrativeTag}\n${resolved}`;
                messages.push({ role: 'assistant', content });
            } else {
                messages.push({ role: msg.role, content: resolved });
            }
        }

        return messages;
    },

    // ========== Sending Messages ==========

    async _generateAssistantResponse(app, assistantIndex, mode) {
        app.chatCharacterIsGenerating = true;
        app.chatCharacterAbortController = new AbortController();
        try {
            const promptMessages = await this.buildCharacterPrompt(app, mode);
            const existingContent = mode === 'continue' ? (app.chatCharacterMessages[assistantIndex]?.content || '') : '';
            let fullResponse = '';
            await window.Generation.streamGeneration(promptMessages, (token) => {
                fullResponse += token;
                app.chatCharacterMessages[assistantIndex].content = existingContent + fullResponse;
                app.chatCharacterMessages = [...app.chatCharacterMessages];
                this.scrollMessagesToBottom(app, true);
            }, app, app.chatCharacterAbortController.signal);
            await this.saveCharacterSession(app);

            const targetWords = app.maxTokens || 300;
            const wordCount = fullResponse.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < Math.round(targetWords * 0.6) && mode !== 'continue') {
                await this._generateAssistantResponse(app, assistantIndex, 'continue');
                await this.saveCharacterSession(app);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Character chat generation aborted by user');
                return;
            }
            console.error('Character chat error:', error);
            app.chatCharacterMessages[assistantIndex].content = `Error: ${error.message}`;
            app.chatCharacterMessages[assistantIndex].isError = true;
            app.chatCharacterMessages = [...app.chatCharacterMessages];
        } finally {
            app.chatCharacterIsGenerating = false;
            app.chatCharacterAbortController = null;
        }
    },

    stopChatGeneration(app) {
        if (app.chatCharacterAbortController) {
            app.chatCharacterAbortController.abort();
        }
    },

    async sendMessage(app, text) {
        if (app.chatCharacterIsGenerating) {
            this.stopChatGeneration(app);
            return;
        }
        if (!app.chatCharacter) return;
        if (!text || !text.trim()) {
            await this.continueGeneration(app);
            return;
        }

        const message = text.trim();

        app.chatCharacterMessages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            name: app.userPersona?.name || 'You'
        });
        app.chatCharacterInput = '';
        this.scrollMessagesToBottom(app);

        await this.saveCharacterSession(app);

        const assistantIndex = app.chatCharacterMessages.length;
        app.chatCharacterMessages.push({
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            name: app.chatCharacter.name
        });

        await this._generateAssistantResponse(app, assistantIndex);
    },

    async continueGeneration(app) {
        if (!app.chatCharacter) return;
        if (!app.chatCharacterMessages.length) return;

        const assistantIndex = app.chatCharacterMessages.length;
        app.chatCharacterMessages.push({
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            name: app.chatCharacter.name
        });
        app.chatCharacterMessages = [...app.chatCharacterMessages];
        this.scrollMessagesToBottom(app);

        await this._generateAssistantResponse(app, assistantIndex, 'continue');
    },

    // ========== Message Actions ==========

    editMessage(app, idx) {
        const msg = app.chatCharacterMessages[idx];
        if (!msg) return;
        app.editingMessageIndex = idx;
        app.editingMessageContent = msg.content;
    },

    async saveEdit(app) {
        const idx = app.editingMessageIndex;
        if (idx === null || idx === undefined) return;
        const msg = app.chatCharacterMessages[idx];
        if (!msg) return;
        msg.content = app.editingMessageContent;
        app.editingMessageIndex = null;
        app.editingMessageContent = '';
        app.chatCharacterMessages = [...app.chatCharacterMessages];
        await this.saveCharacterSession(app);
    },

    cancelEdit(app) {
        app.editingMessageIndex = null;
        app.editingMessageContent = '';
    },

    async deleteMessage(app, idx) {
        const msg = app.chatCharacterMessages[idx];
        if (!msg) return;
        if (!confirm('Delete this message and all messages after it?')) return;
        app.chatCharacterMessages = app.chatCharacterMessages.slice(0, idx);
        app.chatCharacterMessages = [...app.chatCharacterMessages];
        app.editingMessageIndex = null;
        app.editingMessageContent = '';
        await this.saveCharacterSession(app);
    },

    async retryMessage(app, idx) {
        const msg = app.chatCharacterMessages[idx];
        if (!msg) return;

        if (msg.role === 'assistant') {
            // Retry AI message: remove it, add placeholder, regenerate
            app.chatCharacterMessages = app.chatCharacterMessages.slice(0, idx);
            app.chatCharacterMessages.push({
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                name: app.chatCharacter?.name || 'Assistant'
            });
            app.chatCharacterMessages = [...app.chatCharacterMessages];
            app.editingMessageIndex = null;
            app.editingMessageContent = '';
            await this._generateAssistantResponse(app, idx);
        } else if (msg.role === 'user') {
            // Retry user message: remove it + all after, put content in input
            app.chatCharacterInput = msg.content;
            app.chatCharacterMessages = app.chatCharacterMessages.slice(0, idx);
            app.chatCharacterMessages = [...app.chatCharacterMessages];
            app.editingMessageIndex = null;
            app.editingMessageContent = '';
            await this.saveCharacterSession(app);
        }
    },

    // ========== Character Info/Edit ==========

    showCharacterInfo(app) {
        const char = app.chatCharacter;
        if (!char) return;
        app.characterInfoDraft = {
            name: char.name || '',
            description: char.description || '',
            personality: char.personality || '',
            scenario: char.scenario || '',
            firstMessage: char.firstMessage || '',
            alternateGreetings: (char.alternateGreetings || []).slice(),
            examples: char.examples || '',
            systemPrompt: char.systemPrompt || '',
            _activeGreetingIndex: 0,
            _activeGreetingBuffer: char.firstMessage || ''
        };
        app.showCharacterInfo = true;
    },

    selectGreetingTab(app, index) {
        const draft = app.characterInfoDraft;
        if (index === draft._activeGreetingIndex) return;
        this._flushGreetingBuffer(app);
        draft._activeGreetingIndex = index;
        draft._activeGreetingBuffer = index === 0
            ? draft.firstMessage
            : (draft.alternateGreetings || [])[index - 1] || '';
    },

    addGreetingTab(app) {
        this._flushGreetingBuffer(app);
        const draft = app.characterInfoDraft;
        if (!draft.alternateGreetings) draft.alternateGreetings = [];
        draft.alternateGreetings.push('');
        draft._activeGreetingIndex = draft.alternateGreetings.length;
        draft._activeGreetingBuffer = '';
    },

    removeGreetingTab(app, index) {
        this._flushGreetingBuffer(app);
        const draft = app.characterInfoDraft;
        if (!draft.alternateGreetings || index < 0 || index >= draft.alternateGreetings.length) return;
        const wasActive = draft._activeGreetingIndex === index + 1;
        draft.alternateGreetings.splice(index, 1);
        if (draft._activeGreetingIndex > index + 1) {
            draft._activeGreetingIndex--;
        } else if (wasActive) {
            draft._activeGreetingIndex = Math.min(draft._activeGreetingIndex, draft.alternateGreetings.length);
        }
        draft._activeGreetingBuffer = draft._activeGreetingIndex === 0
            ? draft.firstMessage
            : (draft.alternateGreetings[draft._activeGreetingIndex - 1] || '');
    },

    _flushGreetingBuffer(app) {
        const draft = app.characterInfoDraft;
        if (draft._activeGreetingIndex === 0) {
            draft.firstMessage = draft._activeGreetingBuffer;
        } else {
            const idx = draft._activeGreetingIndex - 1;
            if (draft.alternateGreetings && idx >= 0 && idx < draft.alternateGreetings.length) {
                draft.alternateGreetings[idx] = draft._activeGreetingBuffer;
            }
        }
    },

    async saveCharacterInfo(app) {
        const draft = app.characterInfoDraft;
        if (!draft.name || !app.chatCharacter) return;

        this._flushGreetingBuffer(app);

        const altGreetings = draft.alternateGreetings || [];

        const bodyLines = [];
        if (draft.description) {
            bodyLines.push('## Description', '', draft.description);
        }
        if (draft.personality) {
            bodyLines.push('', '## Personality', '', draft.personality);
        }
        if (draft.scenario) {
            bodyLines.push('', '## Scenario', '', draft.scenario);
        }
        if (draft.firstMessage) {
            bodyLines.push('', '## First Message', '', draft.firstMessage);
        }
        if (altGreetings.length > 0) {
            bodyLines.push('', '## Alternate Greetings', '');
            altGreetings.forEach((g, i) => {
                if (i > 0) bodyLines.push('');
                bodyLines.push('### Greeting ' + (i + 1));
                bodyLines.push('');
                bodyLines.push(g);
            });
        }
        if (draft.examples) {
            bodyLines.push('', '## Example Dialogue', '', draft.examples);
        }
        if (draft.systemPrompt) {
            bodyLines.push('', '## System Prompt', '', draft.systemPrompt);
        }
        const body = bodyLines.join('\n').trim();

        try {
            const entry = await db.compendium.get(app.chatCharacterId);
            if (entry) {
                const updated = { ...entry, title: draft.name, body };
                await db.compendium.put(updated);
            }
        } catch (e) {
            console.error('Failed to save character info:', e);
            alert('Failed to save character info.');
            return;
        }

        // Update in-memory character
        app.chatCharacter = {
            ...app.chatCharacter,
            name: draft.name,
            description: draft.description,
            personality: draft.personality,
            scenario: draft.scenario,
            firstMessage: draft.firstMessage,
            alternateGreetings: altGreetings.slice(),
            examples: draft.examples,
            systemPrompt: draft.systemPrompt,
            rawBody: body
        };

        app.showCharacterInfo = false;
    },

    // ========== Scrolling ==========

    scrollMessagesToBottom(app, auto = false) {
        requestAnimationFrame(() => {
            const el = app.$refs?.chatMessages;
            if (!el) return;
            if (auto) {
                const threshold = 80;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
                if (atBottom) el.scrollTop = el.scrollHeight;
            } else {
                el.scrollTop = el.scrollHeight;
            }
        });
    },

    // ========== Utility ==========

    parseCardField(body, fieldName) {
        if (!body) return '';
        const regex = new RegExp(`##\\s*${fieldName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
        const match = body.match(regex);
        return match ? match[1].trim() : '';
    },

    parseAlternateGreetings(body) {
        if (!body) return [];
        const altSection = body.match(/## Alternate Greetings\n([\s\S]*?)(?=\n## |$)/);
        if (!altSection) return [];
        const greetings = [];
        const greetingRegex = /### Greeting \d+\n([\s\S]*?)(?=\n### Greeting \d+|$)/g;
        let match;
        while ((match = greetingRegex.exec(altSection[1])) !== null) {
            const text = match[1].trim();
            if (text) greetings.push(text);
        }
        return greetings;
    },

    // ========== Persona Management ==========

    async loadPersona(app) {
        try {
            const storedPersonas = await db.settings.get('personas');
            if (storedPersonas && storedPersonas.value && storedPersonas.value.length > 0) {
                app.userPersonas = storedPersonas.value;
                app.activePersonaId = storedPersonas.activeId || app.userPersonas[0].id;
                const active = app.userPersonas.find(p => p.id === app.activePersonaId);
                if (active) {
                    Object.assign(app.userPersona, active);
                } else {
                    app.activePersonaId = app.userPersonas[0].id;
                    Object.assign(app.userPersona, app.userPersonas[0]);
                }
                return;
            }
        } catch (e) {
            console.warn('Failed to load personas from IndexedDB:', e);
        }

        try {
            const saved = localStorage.getItem('ww2_userPersona');
            if (saved) {
                const parsed = JSON.parse(saved);
                const migrated = {
                    id: 'persona_1',
                    name: parsed.name || 'You',
                    description: parsed.description || '',
                    avatar: parsed.avatar || null
                };
                app.userPersonas = [migrated];
                app.activePersonaId = 'persona_1';
                Object.assign(app.userPersona, migrated);
                localStorage.removeItem('ww2_userPersona');
                await this.savePersonas(app);
                return;
            }
        } catch (e) {
            console.warn('Failed to migrate legacy persona:', e);
        }

        const defaultPersona = {
            id: 'persona_' + Date.now(),
            name: 'You',
            description: '',
            avatar: null
        };
        app.userPersonas = [defaultPersona];
        app.activePersonaId = defaultPersona.id;
        Object.assign(app.userPersona, defaultPersona);
    },

    async savePersonas(app) {
        try {
            const stored = await db.settings.get('personas') || { key: 'personas', value: [] };
            stored.value = app.userPersonas;
            stored.activeId = app.activePersonaId;
            await db.settings.put(stored);
        } catch (e) {
            console.warn('Failed to save personas:', e);
        }
    },

    savePersona(app) {
        const active = app.userPersonas.find(p => p.id === app.activePersonaId);
        if (active) {
            active.name = app.userPersona.name;
            active.description = app.userPersona.description;
            active.avatar = app.userPersona.avatar;
        }
        this.savePersonas(app);
    },

    async switchPersona(app, id) {
        if (id === app.activePersonaId) return;
        const current = app.userPersonas.find(p => p.id === app.activePersonaId);
        if (current) {
            current.name = app.userPersona.name;
            current.description = app.userPersona.description;
            current.avatar = app.userPersona.avatar;
        }
        const next = app.userPersonas.find(p => p.id === id);
        if (next) {
            app.activePersonaId = id;
            Object.assign(app.userPersona, next);
            await this.savePersonas(app);
        }
    },

    async createPersona(app) {
        const newPersona = {
            id: 'persona_' + Date.now(),
            name: 'New Persona',
            description: '',
            avatar: null
        };
        app.userPersonas.push(newPersona);
        app.activePersonaId = newPersona.id;
        Object.assign(app.userPersona, newPersona);
        await this.savePersonas(app);
    },

    async deletePersona(app, id) {
        if (app.userPersonas.length <= 1) return;
        if (!confirm('Delete this persona?')) return;
        const idx = app.userPersonas.findIndex(p => p.id === id);
        if (idx === -1) return;
        app.userPersonas.splice(idx, 1);
        if (id === app.activePersonaId) {
            const fallback = app.userPersonas[Math.min(idx, app.userPersonas.length - 1)];
            app.activePersonaId = fallback.id;
            Object.assign(app.userPersona, fallback);
        }
        await this.savePersonas(app);
    },

    // ========== Persona AI Generation ==========

    async generatePersonaDescription(app) {
        if (app.personaDescriptionGenerating || app.aiStatus !== 'ready') return;

        app.personaDescriptionGenerating = true;
        const originalContent = app.userPersona.description || '';

        try {
            const existingText = app.userPersona.description || '';
            let userPrompt;
            if (existingText.trim()) {
                userPrompt = `The user has already written the following description for themselves:\n\n${existingText}\n\nPlease continue and improve this description, keeping what works and expanding on it. Write approximately 100-200 words.`;
            } else {
                userPrompt = `Generate a detailed description for a user named "${app.userPersona.name || 'the user'}". Describe their appearance, personality, mannerisms, and any other relevant details that would help an AI understand who it's talking to. Write approximately 100-200 words.`;
            }

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop user personas for roleplay and creative writing. Write vivid, specific descriptions that capture the essence of the person.'
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.personaDescriptionAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.userPersona.description = generatedText;
            }, app, abortController.signal);

            app.personaDescriptionGenerating = false;
            app.personaDescriptionAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Persona description generation stopped by user');
            } else {
                console.error('Persona description generation error:', e);
                app.userPersona.description = originalContent;
            }
            app.personaDescriptionGenerating = false;
            app.personaDescriptionAbortController = null;
        }
    },

    stopPersonaDescriptionGeneration(app) {
        if (app.personaDescriptionAbortController) {
            app.personaDescriptionAbortController.abort();
            app.personaDescriptionAbortController = null;
        }
    },

    // ========== Writing Mode Persistence ==========

    loadWritingMode(app) {
        try {
            const saved = localStorage.getItem('ww2_writingMode');
            if (saved === 'chat' || saved === 'editor') {
                app.writingMode = saved;
            }
        } catch (e) { }
    },

    async loadChatResponseMode(app) {
        try {
            const saved = localStorage.getItem('ww2_chatResponseMode');
            if (saved === 'character' || saved === 'narrative') {
                app.chatResponseMode = saved;
            }
        } catch (e) { }
    },

    saveChatResponseMode(app) {
        try {
            localStorage.setItem('ww2_chatResponseMode', app.chatResponseMode);
        } catch (e) { }
    },

    // ========== SillyTavern-Style Roleplay Formatting ==========

    roleplayToHtml(text) {
        if (!text) return '';
        text = String(text);

        const inlineMd = str => str
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/~~(.+?)~~/g, '<del>$1</del>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/\n\n+/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Split on roleplay markers, keeping delimiters in result
        const parts = text.split(/(\*(?!\*)(?:[^*]|\*(?!\*))*\*(?!\*)|[\u201c"](?:[^\u201d"]*)[\u201d"])/);

        let html = parts.map(seg => {
            if (seg === '') return '';
            if (/^\*(?!\*).+\*(?!\*)$/.test(seg))
                return `<em class="rp-action">${inlineMd(seg.slice(1, -1))}</em>`;
            if (/^[\u201c"].+[\u201d"]$/.test(seg))
                return `<span class="rp-dialogue">\u201c${inlineMd(seg.slice(1, -1))}\u201d</span>`;
            return inlineMd(seg);
        }).join('');

        if (html && !html.startsWith('<h') && !html.startsWith('<blockquote>') && !html.startsWith('<pre') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<p')) {
            html = `<p>${html}</p>`;
        }
        return html;
    },

    wrapChatText(app, before, after) {
        const el = document.querySelector('.chat-input-textarea');
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const val = app.chatCharacterInput || '';
        const selected = val.substring(start, end);
        const wrapped = before + selected + after;
        app.chatCharacterInput = val.substring(0, start) + wrapped + val.substring(end);
        const newPos = start + wrapped.length;
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(newPos, newPos);
            el.dispatchEvent(new Event('input'));
        });
    },

    wrapFormat(app, format) {
        const pairs = {
            action: ['*', '*'],
            dialogue: ['"', '"'],
            bold: ['**', '**']
        };
        const pair = pairs[format];
        if (pair) this.wrapChatText(app, pair[0], pair[1]);
    },

    toggleChatRoleplayFormatting(app) {
        try {
            localStorage.setItem('ww2_chatRoleplayFormatting', JSON.stringify(app.chatRoleplayFormatting));
        } catch (e) { }
    },

    loadChatRoleplayFormatting(app) {
        try {
            const saved = localStorage.getItem('ww2_chatRoleplayFormatting');
            if (saved !== null) {
                app.chatRoleplayFormatting = JSON.parse(saved);
            }
        } catch (e) { }
    },

    // ========== Character Info AI Generation ==========

    /**
     * Generate character description using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterDescription(app) {
        if (!app.characterInfoDraft || app.characterDescriptionGenerating || app.aiStatus !== 'ready') return;

        app.characterDescriptionGenerating = true;
        const originalContent = app.characterInfoDraft.description || '';

        try {
            // Build context from other character fields
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.personality) context.push(`Personality: ${app.characterInfoDraft.personality}`);
            if (app.characterInfoDraft.scenario) context.push(`Scenario: ${app.characterInfoDraft.scenario}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop detailed character descriptions. Write a vivid physical description including appearance, clothing, and distinguishing features. Be specific and evocative. Write approximately 100-200 words.'
                },
                {
                    role: 'user',
                    content: `Generate a detailed physical description for a character named "${app.characterInfoDraft.name || 'the character'}".${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterDescriptionAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft.description = generatedText;
            }, app, abortController.signal);

            app.characterDescriptionGenerating = false;
            app.characterDescriptionAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character description generation stopped by user');
            } else {
                console.error('Character description generation error:', e);
                app.characterInfoDraft.description = originalContent;
            }
            app.characterDescriptionGenerating = false;
            app.characterDescriptionAbortController = null;
        }
    },

    /**
     * Stop character description generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterDescriptionGeneration(app) {
        if (app.characterDescriptionAbortController) {
            app.characterDescriptionAbortController.abort();
            app.characterDescriptionAbortController = null;
        }
    },

    /**
     * Generate character personality using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterPersonality(app) {
        if (!app.characterInfoDraft || app.characterPersonalityGenerating || app.aiStatus !== 'ready') return;

        app.characterPersonalityGenerating = true;
        const originalContent = app.characterInfoDraft.personality || '';

        try {
            // Build context from other character fields
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.description) context.push(`Description: ${app.characterInfoDraft.description}`);
            if (app.characterInfoDraft.scenario) context.push(`Scenario: ${app.characterInfoDraft.scenario}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop detailed character personalities. Describe personality traits, quirks, mannerisms, behavioral patterns, and psychological characteristics. Be specific and nuanced. Write approximately 150-250 words.'
                },
                {
                    role: 'user',
                    content: `Generate a detailed personality profile for a character named "${app.characterInfoDraft.name || 'the character'}".${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterPersonalityAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft.personality = generatedText;
            }, app, abortController.signal);

            app.characterPersonalityGenerating = false;
            app.characterPersonalityAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character personality generation stopped by user');
            } else {
                console.error('Character personality generation error:', e);
                app.characterInfoDraft.personality = originalContent;
            }
            app.characterPersonalityGenerating = false;
            app.characterPersonalityAbortController = null;
        }
    },

    /**
     * Stop character personality generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterPersonalityGeneration(app) {
        if (app.characterPersonalityAbortController) {
            app.characterPersonalityAbortController.abort();
            app.characterPersonalityAbortController = null;
        }
    },

    /**
     * Generate character scenario using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterScenario(app) {
        if (!app.characterInfoDraft || app.characterScenarioGenerating || app.aiStatus !== 'ready') return;

        app.characterScenarioGenerating = true;
        const originalContent = app.characterInfoDraft.scenario || '';

        try {
            // Build context from other character fields
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.description) context.push(`Description: ${app.characterInfoDraft.description}`);
            if (app.characterInfoDraft.personality) context.push(`Personality: ${app.characterInfoDraft.personality}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop character scenarios. Describe the current situation, setting, or context where the character exists. Include relevant background, circumstances, and what\'s happening in their world. Be specific and engaging. Write approximately 100-200 words.'
                },
                {
                    role: 'user',
                    content: `Generate a scenario or setting for a character named "${app.characterInfoDraft.name || 'the character'}".${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterScenarioAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft.scenario = generatedText;
            }, app, abortController.signal);

            app.characterScenarioGenerating = false;
            app.characterScenarioAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character scenario generation stopped by user');
            } else {
                console.error('Character scenario generation error:', e);
                app.characterInfoDraft.scenario = originalContent;
            }
            app.characterScenarioGenerating = false;
            app.characterScenarioAbortController = null;
        }
    },

    /**
     * Stop character scenario generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterScenarioGeneration(app) {
        if (app.characterScenarioAbortController) {
            app.characterScenarioAbortController.abort();
            app.characterScenarioAbortController = null;
        }
    },

    /**
     * Generate character first message using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterFirstMessage(app) {
        if (!app.characterInfoDraft || app.characterFirstMessageGenerating || app.aiStatus !== 'ready') return;

        app.characterFirstMessageGenerating = true;
        const originalContent = app.characterInfoDraft._activeGreetingBuffer || '';

        try {
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.description) context.push(`Description: ${app.characterInfoDraft.description}`);
            if (app.characterInfoDraft.personality) context.push(`Personality: ${app.characterInfoDraft.personality}`);
            if (app.characterInfoDraft.scenario) context.push(`Scenario: ${app.characterInfoDraft.scenario}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop a character\'s first message in a conversation. Write a natural, character-appropriate opening line or paragraph that the character would say when starting a conversation. Reflect their personality and current situation. Write approximately 50-150 words.'
                },
                {
                    role: 'user',
                    content: `Generate a first message that a character named "${app.characterInfoDraft.name || 'the character'}" would naturally say when starting a conversation.${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterFirstMessageAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft._activeGreetingBuffer = generatedText;
            }, app, abortController.signal);

            app.characterFirstMessageGenerating = false;
            app.characterFirstMessageAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character first message generation stopped by user');
            } else {
                console.error('Character first message generation error:', e);
                app.characterInfoDraft._activeGreetingBuffer = originalContent;
            }
            app.characterFirstMessageGenerating = false;
            app.characterFirstMessageAbortController = null;
        }
    },

    /**
     * Stop character first message generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterFirstMessageGeneration(app) {
        if (app.characterFirstMessageAbortController) {
            app.characterFirstMessageAbortController.abort();
            app.characterFirstMessageAbortController = null;
        }
    },

    /**
     * Generate character example dialogue using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterExamples(app) {
        if (!app.characterInfoDraft || app.characterExamplesGenerating || app.aiStatus !== 'ready') return;

        app.characterExamplesGenerating = true;
        const originalContent = app.characterInfoDraft.examples || '';

        try {
            // Build context from other character fields
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.description) context.push(`Description: ${app.characterInfoDraft.description}`);
            if (app.characterInfoDraft.personality) context.push(`Personality: ${app.characterInfoDraft.personality}`);
            if (app.characterInfoDraft.scenario) context.push(`Scenario: ${app.characterInfoDraft.scenario}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop example dialogues for a character. Create 2-3 short example conversations between the character and a user, showing their speaking style, personality, and interaction patterns. Use the format: User: [message]\nCharacter: [response]\n\nBe authentic to the character\'s voice. Write approximately 200-300 words total.'
                },
                {
                    role: 'user',
                    content: `Generate example dialogues for a character named "${app.characterInfoDraft.name || 'the character'}".${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterExamplesAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft.examples = generatedText;
            }, app, abortController.signal);

            app.characterExamplesGenerating = false;
            app.characterExamplesAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character examples generation stopped by user');
            } else {
                console.error('Character examples generation error:', e);
                app.characterInfoDraft.examples = originalContent;
            }
            app.characterExamplesGenerating = false;
            app.characterExamplesAbortController = null;
        }
    },

    /**
     * Stop character examples generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterExamplesGeneration(app) {
        if (app.characterExamplesAbortController) {
            app.characterExamplesAbortController.abort();
            app.characterExamplesAbortController = null;
        }
    },

    /**
     * Generate character system prompt using AI
     * @param {Object} app - Alpine app instance
     */
    async generateCharacterSystemPrompt(app) {
        if (!app.characterInfoDraft || app.characterSystemPromptGenerating || app.aiStatus !== 'ready') return;

        app.characterSystemPromptGenerating = true;
        const originalContent = app.characterInfoDraft.systemPrompt || '';

        try {
            // Build context from other character fields
            const context = [];
            if (app.characterInfoDraft.name) context.push(`Character Name: ${app.characterInfoDraft.name}`);
            if (app.characterInfoDraft.description) context.push(`Description: ${app.characterInfoDraft.description}`);
            if (app.characterInfoDraft.personality) context.push(`Personality: ${app.characterInfoDraft.personality}`);
            if (app.characterInfoDraft.scenario) context.push(`Scenario: ${app.characterInfoDraft.scenario}`);

            const contextText = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

            const messages = [
                {
                    role: 'system',
                    content: 'You are a creative writing assistant helping to develop system instructions for roleplaying as a character. Create clear, specific guidelines for how an AI should portray this character, including core behaviors, response patterns, boundaries, and special instructions. Be practical and actionable. Write approximately 100-200 words.'
                },
                {
                    role: 'user',
                    content: `Generate system-level instructions for how an AI should roleplay as a character named "${app.characterInfoDraft.name || 'the character'}".${contextText}`
                }
            ];

            let generatedText = '';
            const abortController = new AbortController();
            app.characterSystemPromptAbortController = abortController;

            await window.Generation.streamGeneration(messages, (token) => {
                generatedText += token;
                app.characterInfoDraft.systemPrompt = generatedText;
            }, app, abortController.signal);

            app.characterSystemPromptGenerating = false;
            app.characterSystemPromptAbortController = null;
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Character system prompt generation stopped by user');
            } else {
                console.error('Character system prompt generation error:', e);
                app.characterInfoDraft.systemPrompt = originalContent;
            }
            app.characterSystemPromptGenerating = false;
            app.characterSystemPromptAbortController = null;
        }
    },

    /**
     * Stop character system prompt generation
     * @param {Object} app - Alpine app instance
     */
    stopCharacterSystemPromptGeneration(app) {
        if (app.characterSystemPromptAbortController) {
            app.characterSystemPromptAbortController.abort();
            app.characterSystemPromptAbortController = null;
        }
    },
};

window.renderChatMessage = function(el, msg, useRoleplay, personaName) {
    if (!el || !msg) return;
    let content = msg.content || '';
    if (personaName) {
        content = content.replace(/\{\{user(_name)?\}\}/gi, personaName);
    }
    try {
        const html = useRoleplay
            ? window.ChatMode.roleplayToHtml(content)
            : (window.markdownToHtml ? window.markdownToHtml(content) : content);
        if (el.innerHTML !== html) {
            el.innerHTML = html;
        }
    } catch (e) {
        console.warn('renderChatMessage error:', e);
        el.innerHTML = window.markdownToHtml ? window.markdownToHtml(content) : content;
    }
};
