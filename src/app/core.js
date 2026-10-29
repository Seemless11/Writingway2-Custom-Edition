/**
 * core — Startup, loading screen, theme, writing mode, sidebar.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Helper to update loading screen
            updateLoadingScreen(progress, status, tip) {
                try {
                    const screen = document.getElementById('loadingScreen');
                    const bar = document.getElementById('loadingBar');
                    const statusEl = document.getElementById('loadingStatus');
                    const tipEl = document.getElementById('loadingTip');

                    if (bar) bar.style.width = `${progress}%`;
                    if (statusEl && status) statusEl.textContent = status;
                    if (tipEl && tip) tipEl.textContent = tip;

                    this.initProgress = progress;
                } catch (e) {
                    console.warn('Could not update loading screen:', e);
                }
            },

            // Hide loading screen when ready
            hideLoadingScreen() {
                try {
                    const screen = document.getElementById('loadingScreen');
                    if (screen) {
                        screen.style.opacity = '0';
                        setTimeout(() => {
                            screen.style.display = 'none';
                        }, 500);
                    }
                    this.appReady = true;
                } catch (e) {
                    console.warn('Could not hide loading screen:', e);
                }
            },

            // Accent color management
            setAccentColor(color) {
                this.accentColor = color;
                localStorage.setItem('ww-accent-color', color);
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                const darken = (amount) =>
                    `#${[r,g,b].map(c => Math.max(0, c - amount).toString(16).padStart(2, '0')).join('')}`;
                const docEl = document.documentElement;
                docEl.style.setProperty('--color-accent', color);
                docEl.style.setProperty('--color-accent-hover', darken(35));
                docEl.style.setProperty('--color-accent-muted', `rgba(${r},${g},${b},0.12)`);
                docEl.style.setProperty('--color-accent-border', `rgba(${r},${g},${b},0.25)`);
            },

            // Initialize
            async init() {
                if (window.setupWatchers && typeof window.setupWatchers === 'function') {
                    window.setupWatchers(this);
                }
                this.updateLoadingScreen(10, 'Initializing...', 'Checking startup method...');

                // Detect if opened via file:// protocol and warn user
                if (window.location.protocol === 'file:') {
                    const useFileDirect = confirm(
                        '⚠️ IMPORTANT: Data Storage Location\n\n' +
                        'You opened Writingway directly (file://) instead of using start.bat\n\n' +
                        'This means:\n' +
                        '• Your projects are stored in a DIFFERENT database than start.bat\n' +
                        '• Local AI server will NOT be running\n' +
                        '• You cannot use local models without start.bat\n\n' +
                        'RECOMMENDATION: Close this and run start.bat instead.\n\n' +
                        'Click OK to continue anyway (different database)\n' +
                        'Click Cancel to see instructions'
                    );

                    if (!useFileDirect) {
                        document.body.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a1a;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;padding:20px;">
                            <div style="max-width:600px;background:#2a2a2a;border:2px solid #4a9eff;border-radius:12px;padding:32px;">
                                <h1 style="margin:0 0 16px 0;color:#4a9eff;font-size:24px;">🚀 How to Start Writingway</h1>
                                <ol style="line-height:1.8;padding-left:24px;margin:16px 0;">
                                    <li>Close this browser tab</li>
                                    <li>Navigate to your Writingway folder (where this file lives)</li>
                                    <li>Double-click <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;color:#4a9eff;font-weight:600;">start.bat</code></li>
                                </ol>
                                <div style="background:rgba(74,158,255,0.1);border:1px solid rgba(74,158,255,0.3);border-radius:8px;padding:16px;margin-top:20px;">
                                    <p style="margin:0;font-size:14px;"><strong>Why?</strong></p>
                                    <p style="margin:8px 0 0 0;font-size:13px;line-height:1.6;">
                                        start.bat ensures:<br>
                                        • Unified project database (http://localhost:8000)<br>
                                        • Local AI server running with GPU support<br>
                                        • Fast model loading (2-3 seconds vs minutes)<br>
                                        • Proper CORS and security settings
                                    </p>
                                </div>
                                <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#4a9eff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Close This Tab</button>
                            </div>
                        </div>
                    `;
                        return;
                    }
                }

                this.updateLoadingScreen(20, 'Loading projects...', 'Accessing local database...');

                // Load projects and show projects view instead of auto-loading
                try {
                    await this.loadProjects();
                    // projects are now available — show the UI immediately
                } catch (e) {
                    console.error('Failed to load projects:', e);
                }

                // One-time migration: ensure scenes have a projectId so they are discoverable
                // Deferred so the user sees the picker without delay
                try { await this.migrateMissingSceneProjectIds(); } catch (e) { /* ignore */ }

                // Folder-first sync: load anything missing from the local folder and
                // set up write-through so the folder is always the source of truth.
                this.updateLoadingScreen(22, 'Syncing projects from local folder...', 'Checking project files...');
                try {
                    if (window.StoreSync && typeof window.StoreSync.initStoreSync === 'function') {
                        await window.StoreSync.initStoreSync(this);
                    }
                } catch (e) {
                    console.warn('Folder sync failed:', e);
                }

                // Auto-restore: only a last-resort fallback when neither the folder
                // nor the browser has any projects (recovers from old disk snapshots).
                try {
                    if (window.DbSnapshot && typeof window.DbSnapshot.maybeAutoRestore === 'function') {
                        await window.DbSnapshot.maybeAutoRestore(this);
                    }
                } catch (e) {
                    console.warn('Auto-restore from snapshot failed:', e);
                }

                this.updateLoadingScreen(30, 'Checking local AI...', 'Looking for GGUF models and llama.cpp...');
                await this.fetchRuntimeInfo();

                this.updateLoadingScreen(40, 'Loading AI settings...', 'Configuring generation parameters...');

                // Load AI settings from localStorage
                await this.loadAISettings();

                // Apply saved accent color
                const savedColor = localStorage.getItem('ww-accent-color');
                if (savedColor && this.setAccentColor) this.setAccentColor(savedColor);

                this.updateLoadingScreen(50, 'Initializing AI...', 'This may take 2-3 minutes on first run...');

                // Show the app UI — AI init continues in the background
                this.hideLoadingScreen();

                // Initialize tab sync for multi-tab coordination
                if (window.TabSync && typeof window.TabSync.init === 'function') {
                    try {
                        window.TabSync.init(this);
                        console.log('✅ Multi-tab sync initialized');
                    } catch (e) {
                        console.warn('Tab sync init failed:', e);
                    }
                }

                // Initialize AI via extracted module (src/ai.js)
                if (window.AI && typeof window.AI.init === 'function') {
                    try {
                        await window.AI.init(this);
                    } catch (e) {
                        console.error('AI init failed:', e);
                        this.aiStatus = 'error';
                        this.aiStatusText = 'AI init failed';
                        this.showModelLoading = false;
                    }
                } else {
                    // Fallback if ai.js is not loaded
                    this.aiStatus = 'error';
                    this.aiStatusText = 'AI module missing';
                    this.showModelLoading = false;
                }

                if (this.shouldOfferLlamaSetup()) {
                    this.showLlamaSetupWizard = true;
                }

                // Initialize workshop sessions once (with guard to prevent reactivity loop)
                if (!this._workshopInitDone && this.currentProject) {
                    this._workshopInitDone = true;
                    try {
                        await this.loadWorkshopSessions();
                        if (!this.workshopSessions || this.workshopSessions.length === 0) {
                            this.workshopSessions = [window.workshopChat.createNewSession(this)];
                            await this.saveWorkshopSessions();
                        }
                    } catch (e) {
                        console.warn('Workshop init failed:', e);
                    }
                }

                // Global Escape key handler to close slide panels / settings
                // BUT ignore when focus is inside an input/textarea or contenteditable element
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' || e.key === 'Esc') {
                        try {
                            const ae = document.activeElement;
                            const tag = ae && ae.tagName ? ae.tagName.toUpperCase() : null;
                            const isEditable = ae && (ae.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
                            // Allow ESC to close the Summary panel even when its textarea is focused.
                            if (isEditable && this.showSummaryPanel) {
                                this.showSummaryPanel = false;
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            // Otherwise, don't close panels while typing in inputs/textareas
                            if (isEditable) return;
                        } catch (err) {
                            // ignore errors and continue
                        }

                        // Close all modals and slide panels if they're open
                        this.showAISettings = false;
                        this.showPromptsPanel = false;
                        this.showCodexPanel = false;
                        this.showNewProjectModal = false;
                        this.showRenameProjectModal = false;
                        this.showNewSceneModal = false;
                        this.showNewChapterModal = false;
                        this.showSummaryPanel = false;
                        // stop propagation so nested handlers don't re-open
                        e.preventDefault();
                        e.stopPropagation();
                    }


                });

                // Track last mouseup target so we can ignore accidental clicks caused by selection mouseup
                document.addEventListener('mouseup', (ev) => {
                    try {
                        this._lastMouseUpTargetTag = ev && ev.target && ev.target.tagName ? ev.target.tagName.toUpperCase() : null;
                        this._lastMouseUpTime = Date.now();
                    } catch (e) { /* ignore */ }
                }, true);

                this.updateLoadingScreen(70, 'Loading features...', 'Setting up...');

                // Check for updates on startup (silent mode)
                if (window.UpdateChecker) {
                    setTimeout(() => window.UpdateChecker.checkAndNotify(this, true), 2000);
                }

                // Load light mode preference early to avoid flash
                this.loadLightModePreference();

                // Load character creator instruction templates
                this.charCreatorInstructionTemplates = window.CharacterCreator.loadInstructionTemplates();
                this.charCreatorEditorSystemPrompt = window.CharacterCreator.getSystemPrompt();

                window.addEventListener('beforeunload', (e) => {
                    if (this.chatCharacterSessionId && this.chatCharacterMessages?.length) {
                        window.ChatMode.saveCharacterSession(this);
                    }
                    if (localStorage.getItem('ww_char_creator_draft')) {
                        e.preventDefault();
                        e.returnValue = '';
                    }
                });

                this.updateLoadingScreen(85, 'Almost ready...', 'Finalizing setup...');

                // Selection change handler: show Rewrite button when text is selected
                const self = this;
                const handleTextareaSelection = () => {
                    try {
                        const editor = document.querySelector('.editor-textarea');
                        if (!editor || editor.tagName !== 'TEXTAREA') {
                            self.showRewriteBtn = false;
                            self.showCreateCompBtn = false;
                            return;
                        }

                        // Get selected text from textarea
                        const start = editor.selectionStart;
                        const end = editor.selectionEnd;

                        if (start === end) {
                            self.showRewriteBtn = false;
                            self.showCreateCompBtn = false;
                            return;
                        }

                        const selectedText = editor.value.substring(start, end).trim();
                        if (!selectedText) {
                            self.showRewriteBtn = false;
                            self.showCreateCompBtn = false;
                            return;
                        }

                        // Store selection info
                        self.selectedTextForRewrite = selectedText;
                        self.rewriteTextareaStart = start;
                        self.rewriteTextareaEnd = end;
                        self.showRewriteBtn = true;
                        self.showCreateCompBtn = true;
                    } catch (e) {
                        // don't let selection code break the app
                        self.showRewriteBtn = false;
                        self.showCreateCompBtn = false;
                    }
                };

                // Add listeners for selection changes in textarea
                document.addEventListener('mouseup', handleTextareaSelection);
                document.addEventListener('keyup', handleTextareaSelection);
                // Restore legacy beat panel preference
                try {
                    const saved = localStorage.getItem('ww2_showMiniBeatInput');
                    if (saved !== null) this.showMiniBeatInput = saved === 'true';
                } catch (err) { /* ignore */ }

                // Load writing mode preference
                if (window.ChatMode) {
                    window.ChatMode.loadWritingMode(this);
                    await window.ChatMode.loadPersona(this);
                    window.ChatMode.loadChatResponseMode(this);
                    window.ChatMode.loadChatRoleplayFormatting(this);
                    if (this.writingMode === 'chat' && !this.chatCharacter) {
                        window.ChatMode.loadRecentCharacters(this);
                    }
                }

                // Also enforce on focus events
                document.addEventListener('focusin', (e) => {
                    if (e.target && e.target.classList && e.target.classList.contains('editor-textarea')) {
                        e.target.setAttribute('dir', 'ltr');
                        e.target.style.direction = 'ltr';
                        e.target.style.unicodeBidi = 'normal';
                    }
                }, true);

                // Load GitHub backup settings (with error handling to not block initialization)
                try {
                    if (window.GitHubBackup && typeof window.GitHubBackup.loadBackupSettings === 'function') {
                        window.GitHubBackup.loadBackupSettings(this);
                    }
                } catch (e) {
                    console.error('Failed to load backup settings:', e);
                }

                // Full-database snapshots are no longer written: the folder-based
                // store-sync (write-through) is the source of truth. Old snapshots
                // remain readable as a last-resort fallback.

                // Final step: mark initialization complete
                setTimeout(() => {
                    this.isInitializing = false;
                }, 300);
            },

            // Update Checker
            async checkForUpdates() {
                if (window.UpdateChecker) {
                    await window.UpdateChecker.checkAndNotify(this, false, true);
                }
            },

            // Toggle light/dark mode and persist preference
            toggleLightMode() {
                document.documentElement.classList.toggle('light-mode', this.lightMode);
                document.body.classList.toggle('light-mode', this.lightMode);
                localStorage.setItem('writingway:lightMode', this.lightMode ? 'true' : 'false');
            },

            // Load light mode preference from localStorage
            loadLightModePreference() {
                const saved = localStorage.getItem('writingway:lightMode');
                this.lightMode = saved === 'true';
                document.documentElement.classList.toggle('light-mode', this.lightMode);
                document.body.classList.toggle('light-mode', this.lightMode);
            },

            // Get the active beat text: from beatInput in legacy mode, or scan content for last ## line
            // A ## beat spans from the ## marker to the end of content (multi-line support)
            getCurrentBeat() {
                if (this.showMiniBeatInput) {
                    return this.beatInput || '';
                }
                const content = (this.currentScene && this.currentScene.content) || '';
                const lines = content.split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    const trimmed = lines[i].trim();
                    if (trimmed.startsWith('## ')) {
                        const markerPos = lines[i].indexOf('## ');
                        const beat = lines[i].substring(markerPos + 3) + '\n' + lines.slice(i + 1).join('\n');
                        return beat.trim();
                    }
                }
                return '';
            },

            // Switch between editor mode and character chat mode
            switchWritingMode(mode) {
                this.writingMode = mode;
                try { localStorage.setItem('ww2_writingMode', mode); } catch (e) { }
                if (mode === 'chat') {
                    window.ChatMode.loadRecentCharacters(this);
                    if (this.chatCharacter) {
                        if (!this.chatCharacterSessionId) {
                            window.ChatMode.loadOrCreateCharacterSession(this);
                        }
                        window.ChatMode.loadChatSessions(this);
                    }
                }
            },

            // Toggle between floating bar mode and legacy beat panel
            toggleBeatMode() {
                this.showMiniBeatInput = !this.showMiniBeatInput;
                try { localStorage.setItem('ww2_showMiniBeatInput', String(this.showMiniBeatInput)); } catch (err) { /* ignore */ }
            },

            // Toggle sidebar collapse
            toggleSidebar() {
                this.sidebarCollapsed = !this.sidebarCollapsed;
            },

            async loadLastProject() {
                await window.ProjectManager.loadLastProject(this);
            },
});
