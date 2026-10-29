/**
 * prompts — Prompt library CRUD.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            async createPrompt(category) {
                if (window.Prompts && typeof window.Prompts.createPrompt === 'function') {
                    return window.Prompts.createPrompt(this, category);
                }
            },

            openPrompt(id) {
                if (window.Prompts && typeof window.Prompts.openPrompt === 'function') {
                    return window.Prompts.openPrompt(this, id);
                }
            },

            async savePrompt() {
                if (window.Prompts && typeof window.Prompts.savePrompt === 'function') {
                    return window.Prompts.savePrompt(this);
                }
            },

            async deletePrompt(id) {
                if (window.Prompts && typeof window.Prompts.deletePrompt === 'function') {
                    return window.Prompts.deletePrompt(this, id);
                }
            },

            async movePromptUp(id) {
                if (!id || !this.currentProject) return;
                try {
                    if (window.Prompts && typeof window.Prompts.movePromptUp === 'function') {
                        await window.Prompts.movePromptUp(this, id);
                    }
                } catch (e) {
                    console.error('Failed to move prompt up:', e);
                }
            },

            async movePromptDown(id) {
                if (!id || !this.currentProject) return;
                try {
                    if (window.Prompts && typeof window.Prompts.movePromptDown === 'function') {
                        await window.Prompts.movePromptDown(this, id);
                    }
                } catch (e) {
                    console.error('Failed to move prompt down:', e);
                }
            },

            async renamePrompt(id) {
                if (!id) return;
                try {
                    if (window.Prompts && typeof window.Prompts.renamePrompt === 'function') {
                        await window.Prompts.renamePrompt(this, id);
                    }
                } catch (e) {
                    console.error('Failed to rename prompt:', e);
                }
            },

            async exportPrompts() {
                if (window.Prompts && typeof window.Prompts.exportPrompts === 'function') {
                    await window.Prompts.exportPrompts(this);
                }
            },

            async importPrompts(fileInput) {
                if (window.Prompts && typeof window.Prompts.importPrompts === 'function') {
                    await window.Prompts.importPrompts(this, fileInput);
                }
            },

            async toggleGlobal(id) {
                if (window.Prompts && typeof window.Prompts.toggleGlobal === 'function') {
                    await window.Prompts.toggleGlobal(this, id);
                }
            },
});
