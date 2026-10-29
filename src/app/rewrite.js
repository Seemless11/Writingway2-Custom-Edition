/**
 * rewrite — Inline selection rewrite flow.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Compute selection coordinates inside a textarea by mirroring styles into a hidden div.
            _getTextareaSelectionCoords(textarea, selectionIndex) {
                return window.Editor ? window.Editor.getTextareaSelectionCoords(textarea, selectionIndex) : null;
            },

            // Handle clicks on the floating Rewrite button: open modal with selected text
            handleRewriteButtonClick() {
                if (window.Editor) window.Editor.handleRewriteButtonClick(this);
            },

            buildRewritePrompt() {
                return window.Editor ? window.Editor.buildRewritePrompt(this) : '';
            },

            async performRewrite() {
                if (window.Editor) await window.Editor.performRewrite(this);
            },

            async acceptRewrite() {
                if (window.Editor) await window.Editor.acceptRewrite(this);
            },

            retryRewrite() {
                if (window.Editor) window.Editor.retryRewrite(this);
            },

            discardRewrite() {
                if (window.Editor) window.Editor.discardRewrite(this);
            },
});
