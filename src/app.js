/**
 * Main Application
 * Database and test helpers have been moved to separate modules (db.js, test-helpers.js)
 * See REFACTORING.md for the complete refactoring plan
 */

// Alpine.js App
document.addEventListener('alpine:init', () => {

    // Standalone safe markdown renderer used by x-html bindings and chat rendering.
    // Raw HTML is escaped so AI/user content cannot inject markup; only a small set
    // of formatting tags (u/em/strong/b/i/br/p/span/small/sub/sup/hr/s) survives.
    // Pre-compile regex patterns once (performance fix)
    const SAFE_TAGS = ['u', 'em', 'strong', 'b', 'i', 'br', 'p', 'span', 'small', 'sub', 'sup', 'hr', 's'];
    const safeTagRe = new RegExp('&lt;/?(' + SAFE_TAGS.join('|') + ')&gt;', 'gi');

    // Pre-compile static regex patterns (performance fix)
    const RE_H3 = /^### (.*$)/gim;
    const RE_H2 = /^## (.*$)/gim;
    const RE_H1 = /^# (.*$)/gim;
    const RE_HR_DASH = /^---+$/gim;
    const RE_HR_STAR = /^\*\*\*+$/gim;
    const RE_BLOCKQUOTE = /^> (.+$)/gim;
    const RE_UL = /^[\-\*] (.+$)/gim;
    const RE_OL = /^\d+\. (.+$)/gim;
    const RE_BOLD = /\*\*(.+?)\*\*/g;
    const RE_ITALIC = /\*(.+?)\*/g;
    const RE_STRIKE = /~~(.+?)~~/g;
    const RE_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
    const RE_DBL_BREAK = /\n\n+/g;
    const RE_BREAK = /\n/g;

    function markdownToHtmlSafe(text) {
        if (!text) return '';
        text = String(text);

        // Store fenced code blocks to prevent processing their contents
        const codeBlocks = [];
        text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const idx = codeBlocks.length;
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            codeBlocks.push(`<pre class="md-code-block"><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`);
            return `__CODE_BLOCK_${idx}__`;
        });

        // Escape any remaining raw HTML so it renders as inert text
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Re-allow only a safe set of formatting tags (attribute-free; nothing else passes)
        html = html.replace(safeTagRe, (m, tag) => (m.charAt(4) === '/' ? '</' : '<') + tag.toLowerCase() + '>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<code class="md-inline-code">${escapedCode}</code>`;
        });

        html = html
            // Headers (must be processed before paragraphs)
            .replace(RE_H3, '<h3>$1</h3>')
            .replace(RE_H2, '<h2>$1</h2>')
            .replace(RE_H1, '<h1>$1</h1>')
            // Horizontal rules
            .replace(RE_HR_DASH, '<hr>')
            .replace(RE_HR_STAR, '<hr>')
            // Blockquotes (must be before paragraphs)
            .replace(RE_BLOCKQUOTE, '<blockquote>$1</blockquote>')
            // Unordered lists (basic support)
            .replace(RE_UL, '<li class="md-ul">$1</li>')
            // Ordered lists (basic support)
            .replace(RE_OL, '<li class="md-ol">$1</li>')
            // Bold (process before paragraphs)
            .replace(RE_BOLD, '<strong>$1</strong>')
            // Italic (process before paragraphs)
            .replace(RE_ITALIC, '<em>$1</em>')
            // Strikethrough (process before paragraphs)
            .replace(RE_STRIKE, '<del>$1</del>')
            // Links [text](url) — only allow safe schemes, escape quotes/ampersands
            .replace(RE_LINK, (match, label, url) => {
                const href = url.trim();
                const scheme = href.toLowerCase();
                if (/^(https?|mailto):/.test(scheme) || href.startsWith('/') || href.startsWith('#')) {
                    const safeUrl = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                    return `<a href="${safeUrl}" target="_blank" rel="noopener">${label}</a>`;
                }
                return label; // drop javascript:, data:, vbscript:, etc.
            })
            // Convert double line breaks to paragraph breaks
            .replace(RE_DBL_BREAK, '</p><p>')
            // Convert single line breaks to <br>
            .replace(RE_BREAK, '<br>');

        // Wrap consecutive list items in ul/ol tags
        html = html.replace(/(<li class="md-ul">.+?<\/li>(?:<br>)?)+/g, (match) => {
            const items = match.replace(/<br>/g, '');
            return `<ul>${items}</ul>`;
        });
        html = html.replace(/(<li class="md-ol">.+?<\/li>(?:<br>)?)+/g, (match) => {
            const items = match.replace(/<br>/g, '');
            return `<ol>${items}</ol>`;
        });
        // Clean up list item classes
        html = html.replace(/ class="md-ul"/g, '').replace(/ class="md-ol"/g, '');

        // Restore code blocks
        codeBlocks.forEach((block, idx) => {
            html = html.replace(`__CODE_BLOCK_${idx}__`, block);
        });

        // Wrap in paragraphs if not already wrapped in block elements
        if (!html.startsWith('<h') && !html.startsWith('<blockquote>') && !html.startsWith('<pre') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
            html = `<p>${html}</p>`;
        }

        return html;
    }

    // Expose for chat-mode rendering (renderChatMessage) and other modules
    window.markdownToHtml = markdownToHtmlSafe;

    Alpine.data('app', () => {
        // Create initial state using factory (Phase 2 refactoring)
        const state = window.createAppState ? window.createAppState() : {};

        // Add Alpine lifecycle methods and app logic
        return {
            ...state,

            // Feature modules attach their methods to window.AppMethods.
            // Getters below must stay in this object literal: a spread would evaluate
            // them once and freeze their value.
            ...(window.AppMethods || {}),

            // Re-define computed getters that were lost during object spread
            // (spreading an object evaluates getters and copies static values, not the getter itself)
            get currentSceneWords() {
                if (!this.currentScene || !this.currentScene.content) return 0;
                return this.countWords(this.currentScene.content);
            },

            get totalWords() {
                // Sum word counts by unique scene id to avoid double-counting duplicates
                const seen = new Set();
                let total = 0;
                for (const s of (this.scenes || [])) {
                    if (!s || !s.id) continue;
                    if (seen.has(s.id)) continue;
                    seen.add(s.id);
                    total += (s.wordCount || 0);
                }
                return total;
            },
            get sortedProjects() {
                const projects = this.projects || [];
                const sortMode = this.sortMode || 'date-desc';
                const sorted = [...projects].sort((a, b) => {
                    switch (sortMode) {
                        case 'date-desc': return new Date(b.modified) - new Date(a.modified);
                        case 'date-asc': return new Date(a.modified) - new Date(b.modified);
                        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
                        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
                        default: return new Date(b.modified) - new Date(a.modified);
                    }
                });
                return sorted;
            },

            get compendiumCategories() {
                const base = ['worlds', 'scenarios', 'characters', 'places', 'items', 'lore', 'notes'];
                if (this.currentProject?.genres?.length && window.GenreDefs) {
                    const extra = window.GenreDefs.getExtraCompendiumCategories(this.currentProject.genres);
                    return [...base, ...extra.filter(c => !base.includes(c))];
                }
                return base;
            },

            get hasWorkshopSessions() {
                return this.workshopSessions && this.workshopSessions.length > 0;
            },

            // ========== Compendium world/scenario entries for character info ==========
            get worldCreatorCompendiumEntries() {
                return this.compendiumLists?.['worlds'] || [];
            },
            get scenarioCreatorCompendiumEntries() {
                return this.compendiumLists?.['scenarios'] || [];
            },

            // Convert Markdown to HTML for preview (safe renderer, escapes raw HTML)
            markdownToHtml(text) {
                return markdownToHtmlSafe(text);
            },

        }; // End of app state + methods
    });
});
