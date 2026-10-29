/**
 * projects — Project CRUD, import and export.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Project Management
            async createProject() {
                await window.ProjectManager.createProject(this, this.newProjectName);
            },

            async createDefaultScene() {
                await window.ProjectManager.createDefaultScene(this);
            },

            async loadProjects() {
                await window.ProjectManager.loadProjects(this);
            },

            // Fix scenes that may have been saved without a projectId (legacy or accidental overwrite).
            // Uses chapter.projectId when available, otherwise assigns the first project in the DB.
            async migrateMissingSceneProjectIds() {
                await window.ProjectManager.migrateMissingSceneProjectIds();
            },

            async selectProject(projectId) {
                await window.ProjectManager.selectProject(this, projectId);
            },

            // Open project from carousel (used in landing page)
            async openProject(projectId) {
                await this.selectProject(projectId);
                localStorage.setItem('writingway:lastProject', projectId);
            },

            // Navigate back to inline project picker
            backToProjects() {
                if (this.writingMode === 'chat') {
                    this.chatCharacterSessionId = null;
                    this.chatCharacterMessages = [];
                    this.chatCharacterId = null;
                    this.chatCharacter = null;
                    window.ChatMode.loadRecentCharacters(this);
                } else {
                    this.currentProject = null;
                    this.writingMode = 'editor';
                    this.chapters = [];
                    this.scenes = [];
                    this.currentScene = null;
                }
            },

            // Delete a project
            async deleteProject(projectId) {
                await window.ProjectManager.deleteProject(this, projectId);
            },

            // Rename a project from carousel
            async renameProject(project) {
                if (!project) return;
                const newName = prompt('Enter new project name:', project.name);
                if (!newName || newName === project.name) return;
                try {
                    await db.projects.update(project.id, { name: newName, modified: new Date() });
                    await this.loadProjects();
                } catch (e) {
                    console.error('Failed to rename project:', e);
                    alert('Failed to rename project.');
                }
            },

            // Update project cover image
            async updateProjectCover(projectId, file) {
                if (!file || !file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }

                // Resize and convert to data URL
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const img = new Image();
                        img.onload = async () => {
                            // Resize to max 400x600 (book cover proportions)
                            const maxWidth = 400;
                            const maxHeight = 600;
                            let width = img.width;
                            let height = img.height;

                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = width * ratio;
                                height = height * ratio;
                            }

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);

                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                            await window.ProjectManager.updateProjectCover(this, projectId, dataUrl);
                            // Force UI update by creating a new array reference
                            const projects = await db.projects.toArray();
                            projects.sort((a, b) => {
                                const aTime = a.modified ? new Date(a.modified).getTime() : (a.created ? new Date(a.created).getTime() : 0);
                                const bTime = b.modified ? new Date(b.modified).getTime() : (b.created ? new Date(b.created).getTime() : 0);
                                return bTime - aTime;
                            });
                            this.projects = projects;
                        };
                        img.src = e.target.result;
                    } catch (err) {
                        console.error('Failed to process cover image:', err);
                        alert('Failed to process image.');
                    }
                };
                reader.readAsDataURL(file);
            },

            // Remove project cover image
            async removeProjectCover(projectId) {
                if (!projectId) return;
                try {
                    await db.projects.update(projectId, { coverImage: null, modified: new Date() });
                    this.projects = await db.projects.orderBy('modified').reverse().toArray();
                } catch (e) {
                    console.error('Failed to remove cover:', e);
                }
            },

            // Import project from Writingway 1
            async importFromW1(event) {
                if (!window.W1Importer) {
                    alert('W1 Importer module not loaded');
                    return;
                }
                await window.W1Importer.importProject(this, event.target.files);
            },

            // Import project from Novelcrafter
            async importFromNovelcrafter(event) {
                if (!window.NovelcrafterImporter) {
                    alert('Novelcrafter Importer module not loaded');
                    return;
                }
                await window.NovelcrafterImporter.importProject(this, event.target.files);
            },

            // Load persisted prose prompt selection for the current project (localStorage key per project)
            async loadSelectedProsePrompt() {
                await window.ProjectManager.loadSelectedProsePrompt(this);
            },

            // Persist selected prose prompt id per project
            saveSelectedProsePrompt(id) {
                window.ProjectManager.saveSelectedProsePrompt(this, id);
            },

            async renameCurrentProject() {
                await window.ProjectManager.renameCurrentProject(this, this.renameProjectName, this.renameProjectTargetId, this.renameProjectPov, this.renameProjectTense, this.renameProjectLanguage, this.renameProjectPovCharacter, this.renameProjectGenres);
            },

            // Show export format selection modal
            async exportProject() {
                this.showExportModal = true;
            },

            async saveProjectToDisk() {
                if (window.FileSystemSave && typeof window.FileSystemSave.saveCurrentProject === 'function') {
                    const result = await window.FileSystemSave.saveCurrentProject(this, { allowReadOnly: true });
                    if (!result || result.ok === false) {
                        alert('Manual save failed: ' + ((result && result.error) || 'Unknown error'));
                    }
                } else {
                    alert('Filesystem save module is not loaded.');
                }
            },

            // Confirm and execute export based on selected format
            async confirmExport() {
                this.showExportModal = false;

                try {
                    // Call appropriate export function based on format
                    switch (this.exportFormat) {
                        case 'zip':
                            await window.ProjectManager.exportAsZip(this);
                            break;
                        case 'epub':
                            await window.ProjectManager.exportAsEpub(this);
                            break;
                        case 'html':
                            await window.ProjectManager.exportAsHtml(this);
                            break;
                        case 'txt':
                            await window.ProjectManager.exportAsTxt(this);
                            break;
                        default:
                            await window.ProjectManager.exportAsZip(this);
                    }

                    // Track last export time
                    if (this.currentProject) {
                        try {
                            const key = `writingway:lastExport:${this.currentProject.id}`;
                            localStorage.setItem(key, new Date().toISOString());
                            this.showExportReminder = false;
                            this.exportReminderDismissed = false;
                        } catch (e) {
                            console.warn('Could not save last export time:', e);
                        }
                    }
                } catch (e) {
                    console.error('Export error:', e);
                    alert('Export failed: ' + (e.message || e));
                }
            },

            checkExportReminder() {
                if (!this.currentProject) return;

                try {
                    const key = `writingway:lastExport:${this.currentProject.id}`;
                    const dismissKey = `writingway:exportReminderDismissed:${this.currentProject.id}`;
                    const lastExportStr = localStorage.getItem(key);
                    const dismissedStr = localStorage.getItem(dismissKey);

                    // If already dismissed for this session, don't show again
                    if (dismissedStr) {
                        const dismissedAt = new Date(dismissedStr);
                        const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceDismiss < 24) {
                            return; // Don't show if dismissed in last 24 hours
                        }
                    }

                    if (!lastExportStr) {
                        // Never exported - show reminder after they've been working for a bit
                        // Check if project has content (more than just default chapter)
                        const hasContent = this.scenes && this.scenes.length > 0 &&
                            this.scenes.some(s => s.wordCount > 100);
                        if (hasContent) {
                            this.showExportReminder = true;
                        }
                    } else {
                        // Check if it's been more than 7 days since last export
                        const lastExport = new Date(lastExportStr);
                        const daysSinceExport = (Date.now() - lastExport.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSinceExport > 7) {
                            this.showExportReminder = true;
                        }
                    }
                } catch (e) {
                    console.warn('Could not check export reminder:', e);
                }
            },

            dismissExportReminder() {
                this.showExportReminder = false;
                this.exportReminderDismissed = true;
                if (this.currentProject) {
                    try {
                        const dismissKey = `writingway:exportReminderDismissed:${this.currentProject.id}`;
                        localStorage.setItem(dismissKey, new Date().toISOString());
                    } catch (e) {
                        console.warn('Could not save reminder dismissal:', e);
                    }
                }
            },

            // Import a project from a ZIP file
            async importProject(e) {
                await window.ProjectManager.importProject(this, e);
            },

            // Prompts management
            async loadPrompts() {
                // Delegate to prompts module
                if (window.Prompts && typeof window.Prompts.loadPrompts === 'function') {
                    await window.Prompts.loadPrompts(this);
                    try { await this.loadSelectedProsePrompt(); } catch (e) { /* ignore */ }
                    return;
                }
                // Fallback: no-op
                this.prompts = [];
            },
});
