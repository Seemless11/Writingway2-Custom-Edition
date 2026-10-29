/**
 * context-panel — Context panel state and tag toggles.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Get all unique tags from scenes in the current project
            getAllTags() {
                const tagsSet = new Set();
                if (this.scenes && Array.isArray(this.scenes)) {
                    this.scenes.forEach(scene => {
                        if (scene.tags && Array.isArray(scene.tags)) {
                            scene.tags.forEach(tag => {
                                if (tag && tag.trim()) {
                                    tagsSet.add(tag.trim());
                                }
                            });
                        }
                    });
                }
                return Array.from(tagsSet).sort();
            },

            // Get all unique tags from compendium entries in the current project
            async getCompendiumTags() {
                const tagsSet = new Set();
                if (!this.currentProject) return [];
                try {
                    const entries = await db.compendium.where('projectId').equals(this.currentProject.id).toArray();
                    (entries || []).forEach(entry => {
                        if (entry.tags && Array.isArray(entry.tags)) {
                            entry.tags.forEach(tag => {
                                if (tag && tag.trim()) {
                                    tagsSet.add(tag.trim());
                                }
                            });
                        }
                    });
                } catch (e) {
                    console.warn('Failed to get compendium tags:', e);
                }
                return Array.from(tagsSet).sort();
            },

            // Context Panel Management
            toggleContextCompendium(entryId) {
                const index = this.contextPanel.compendiumIds.indexOf(entryId);
                if (index > -1) {
                    this.contextPanel.compendiumIds.splice(index, 1);
                } else {
                    this.contextPanel.compendiumIds.push(entryId);
                }
                this.saveContextPanel();
            },

            setContextChapter(chapterId, mode) {
                // mode: 'full', 'summary', or null
                if (mode === null) {
                    delete this.contextPanel.chapters[chapterId];
                } else {
                    this.contextPanel.chapters[chapterId] = mode;
                }
                this.saveContextPanel();
            },

            setContextScene(sceneId, mode) {
                // mode: 'full', 'summary', or null
                if (mode === null) {
                    delete this.contextPanel.scenes[sceneId];
                } else {
                    this.contextPanel.scenes[sceneId] = mode;
                }
                this.saveContextPanel();
            },

            toggleContextTag(tag) {
                const index = this.contextPanel.tags.indexOf(tag);
                if (index > -1) {
                    this.contextPanel.tags.splice(index, 1);
                } else {
                    this.contextPanel.tags.push(tag);
                }
                this.saveContextPanel();
            },

            toggleContextCompendiumTag(tag) {
                // Ensure compendiumTags array exists (for backwards compatibility)
                if (!this.contextPanel.compendiumTags) {
                    this.contextPanel.compendiumTags = [];
                }
                const index = this.contextPanel.compendiumTags.indexOf(tag);
                if (index > -1) {
                    this.contextPanel.compendiumTags.splice(index, 1);
                } else {
                    this.contextPanel.compendiumTags.push(tag);
                }
                this.saveContextPanel();
            },

            saveContextPanel() {
                if (!this.currentProject) return;
                try {
                    const key = `writingway:contextPanel:${this.currentProject.id}`;
                    localStorage.setItem(key, JSON.stringify(this.contextPanel));
                } catch (e) {
                    console.warn('Failed to save context panel:', e);
                }
            },

            loadContextPanel() {
                if (!this.currentProject) return;
                try {
                    const key = `writingway:contextPanel:${this.currentProject.id}`;
                    const saved = localStorage.getItem(key);
                    if (saved) {
                        this.contextPanel = JSON.parse(saved);
                        // Ensure compendiumTags exists (backwards compatibility)
                        if (!this.contextPanel.compendiumTags) {
                            this.contextPanel.compendiumTags = [];
                        }
                    } else {
                        // Reset to default
                        this.contextPanel = {
                            compendiumIds: [],
                            chapters: {},
                            scenes: {},
                            tags: [],
                            compendiumTags: []
                        };
                    }
                } catch (e) {
                    console.warn('Failed to load context panel:', e);
                    this.contextPanel = {
                        compendiumIds: [],
                        chapters: {},
                        scenes: {},
                        tags: [],
                        compendiumTags: []
                    };
                }
            },
});
