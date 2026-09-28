// Simple Compendium module backed by Dexie `db` defined in app.js
(function () {
    try {
        const Compendium = {
            async createEntry(projectId, { category = 'lore', title = '', body = '', tags = [] } = {}) {
                const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
                const now = new Date();
                const entry = { id, projectId, category, title, body, summary: '', tags: (tags || []).slice(0, 10), created: now, modified: now, order: 0, alwaysInContext: false, isPovCharacter: false };
                await db.compendium.add(entry);
                return entry;
            },

            async updateEntry(id, updates) {
                updates.modified = new Date();
                await db.compendium.update(id, updates);
                return db.compendium.get(id);
            },

            async deleteEntry(id) {
                await db.compendium.delete(id);
            },

            async getEntry(id) {
                return db.compendium.get(id);
            },

            async listByCategory(projectId, category) {
                return db.compendium.where({ projectId, category }).sortBy('order');
            },

            async listByCategoryUnscoped(category) {
                return db.compendium.where('category').equals(category).toArray();
            },

            async search(projectId, q, options = {}) {
                q = (q || '').trim().toLowerCase();
                const limit = options.limit || 20;
                if (!q) {
                    return (await db.compendium.where('projectId').equals(projectId).limit(limit).toArray()) || [];
                }
                const all = await db.compendium.where('projectId').equals(projectId).toArray();
                const results = all.filter(e => {
                    const hay = ((e.title || '') + '\n' + (e.tags || []).join(' ') + '\n' + (e.body || '')).toLowerCase();
                    return hay.indexOf(q) !== -1;
                }).slice(0, limit);
                return results;
            },

            async summaries(projectId, ids = []) {
                const out = {};
                for (const id of ids) {
                    const e = await db.compendium.get(id);
                    if (!e) continue;
                    if (e.summary && e.summary.length > 10) out[id] = e.summary;
                    else out[id] = (e.body || '').slice(0, 300) + ((e.body || '').length > 300 ? '…' : '');
                }
                return out;
            },

            async export(projectId) {
                return db.compendium.where('projectId').equals(projectId).toArray();
            },

            async import(projectId, items = [], opts = { merge: true }) {
                const added = [];
                for (const it of items) {
                    const entry = Object.assign({}, it);
                    entry.projectId = projectId;
                    entry.id = entry.id || (Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6));
                    entry.created = entry.created ? new Date(entry.created) : new Date();
                    entry.modified = new Date();
                    await db.compendium.put(entry);
                    added.push(entry);
                }
                return added;
            },

            // Paste import: extract character info from raw text using AI
            PASTE_EXTRACTION_PROMPT: `You are a precise character information extraction tool.

INPUT: Raw text about a character (below).
OUTPUT: A structured character profile in markdown.

STRICT RULES:
- Extract ONLY facts explicitly stated in the input. Do NOT add, infer, embellish, or fabricate any details.
- Treat the provided text as the ONLY source of truth. Do NOT use your internal knowledge about the character or source material.
- Be thorough: extract every character detail the input contains. If the input is brief, the output is brief. If detailed, the output is detailed.
- Do not pad, repeat, or invent — extract cleanly.
- If no character information exists at all, output exactly: NO_CHARACTER_INFO_FOUND

OUTPUT STRUCTURE (first line must be exactly):
TITLE: [Character Name]

Then include ONLY these sections as level-2 headings, and ONLY if the input actually contains relevant information:
## Appearance — physical description, looks, build, clothing
## Personality — traits, temperament, behavior, mannerisms
## Background — history, origin, past events, motivations
## Skills & Abilities — talents, training, expertise
## Relationships — family, friends, allies, enemies, connections
## Notes — any other character details

WITHIN EACH SECTION:
- Use concise bullet points (1-2 sentences each).
- Quote distinctive phrases from the source in "quotes".
- Omit any heading section entirely if the input has no information for it.

{genreContext}

=== INPUT ===
{userText}`,

        async extractCharacterFromText(text, genre, app, instruction, language) {
                if (!text || !text.trim()) return null;
                const genreLabel = (window.GenreDefs?.GENRES || []).find(function (g) { return g.id === genre; });
                const genreContext = genreLabel
                    ? 'Genre context: This character belongs to a ' + genreLabel.label + ' story.'
                    : '';
                var promptText = this.PASTE_EXTRACTION_PROMPT
                    .replace('{genreContext}', genreContext)
                    .replace('{userText}', text);

                if (instruction && instruction.trim()) {
                    promptText += '\n\nUser instruction: ' + instruction.trim() + '\nApply this instruction strictly when extracting. Do not include content that the user asked to exclude.';
                }

                var lang = language || app?.language || app?.currentProject?.language || 'English';
                var systemContent = 'You are a character information extraction tool. Extract only, never create or embellish.';
                if (lang !== 'English') {
                    systemContent += ' Write entirely in ' + lang + '.';
                }

                const messages = [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: promptText }
                ];

                var fullResponse = '';
                try {
                    await window.Generation.streamGeneration(messages, function (token) {
                        fullResponse += token;
                    }, app);
                } catch (e) {
                    console.error('Extraction failed:', e);
                    return { error: e.message || 'Extraction failed' };
                }

                var result = fullResponse.trim();
                if (!result || result === 'NO_CHARACTER_INFO_FOUND') {
                    return null;
                }

                var title = '';
                var body = result;
                var titleMatch = result.match(/^TITLE:\s*(.+?)(?:\n|$)/i);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                    body = result.slice(titleMatch[0].length).trim();
                }

                return { title: title, body: body, raw: result };
            }
        };

        window.Compendium = Compendium;

        // Test helper
        window.__test = window.__test || {};
        window.__test.seedCompendium = async function (projectId, entries) {
            const created = [];
            for (const e of (entries || [])) {
                const en = await Compendium.createEntry(projectId, e);
                created.push(en);
            }
            return created;
        };
    } catch (e) {
        console.warn('Failed to attach Compendium module:', e && e.message ? e.message : e);
    }
})();
