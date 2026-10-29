/**
 * editor — Editor input, formatting and beat input.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Editor
            onEditorChange(e) {
                // Content automatically updated via x-model
                this.saveStatus = 'Unsaved';
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveScene({ autosave: true });
                }, 2000);
            },

            // Handle paste events
            handlePaste(e) {
                // Default paste behavior is fine for textarea
            },

            // Apply Markdown formatting to selected text in textarea

            applyFormatting(format) {
                const editor = document.querySelector('.editor-textarea');
                if (!editor || !this.currentScene) return;

                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const selectedText = editor.value.substring(start, end);

                if (!selectedText) {
                    // No selection, just return
                    return;
                }

                let replacement = '';

                switch (format) {
                    case 'bold':
                        replacement = `**${selectedText}**`;
                        break;
                    case 'italic':
                        replacement = `*${selectedText}*`;
                        break;
                    case 'underline':
                        // Markdown doesn't have native underline, use HTML
                        replacement = `<u>${selectedText}</u>`;
                        break;
                    case 'strikethrough':
                        replacement = `~~${selectedText}~~`;
                        break;
                    case 'heading':
                        // Add heading at start of line
                        replacement = `## ${selectedText}`;
                        break;
                    case 'quote':
                        // Add blockquote
                        replacement = `> ${selectedText}`;
                        break;
                    default:
                        return;
                }

                // Replace selected text with formatted version
                const newContent =
                    editor.value.substring(0, start) +
                    replacement +
                    editor.value.substring(end);

                this.currentScene.content = newContent;

                // Set cursor position after the inserted text
                this.$nextTick(() => {
                    editor.focus();
                    editor.selectionStart = start + replacement.length;
                    editor.selectionEnd = start + replacement.length;
                });

                // Trigger save
                this.saveStatus = 'Unsaved';
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveScene({ autosave: true });
                }, 2000);
            },

            // Beat quick-search handlers: detect @tokens (compendium) and #tokens (scenes)
            async onBeatInput(e) {
                await window.BeatMentions.onBeatInput(this, e);
            },

            async handleSceneSearch(query) {
                await window.BeatMentions.handleSceneSearch(this, query);
            },

            onBeatKey(e) {
                window.BeatMentions.onBeatKey(this, e);
            },

            selectQuickMatch(item) {
                window.BeatMentions.selectQuickMatch(this, item);
            },

            selectSceneMatch(scene) {
                window.BeatMentions.selectSceneMatch(this, scene);
            },
});
