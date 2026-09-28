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
- The input may be copied wiki text containing markup, infoboxes, links, citation markers like [1], or page boilerplate. Ignore the markup and extract the underlying facts about the character.
- Be thorough: extract every character detail the input contains. If the input is brief, the output is brief. If detailed, the output is detailed.
- Do not pad, repeat, or invent — extract cleanly.
- Deliberate only briefly (a few sentences of internal thinking at most); spend your effort on the extracted profile, not on planning it.
- Output ONLY the profile. Never include your thinking, planning, or reasoning process — no meta-commentary, just the TITLE line and sections.
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

            // Max input chars sent to the model, by backend. Wiki pastes can be
            // huge (nav, revision history, reference lists); the lead + infobox
            // carry the character facts. API backends (Gemini, DeepSeek, …)
            // have 128k+ context, so they take far more; local servers often
            // run 4–8k context windows, so they stay conservative — oversized
            // prompts blow up local-server context and squeeze the response.
            MAX_EXTRACTION_INPUT_CHARS_API: 60000,
            MAX_EXTRACTION_INPUT_CHARS_LOCAL: 12000,

            // Effective input cap for the given app's backend.
            capFor: function (app) {
                return (app && app.aiMode === 'api')
                    ? this.MAX_EXTRACTION_INPUT_CHARS_API
                    : this.MAX_EXTRACTION_INPUT_CHARS_LOCAL;
            },

            // Strip wiki/page boilerplate that confuses smaller models and trim
            // the input so it fits comfortably in the backend's context window.
            prepareExtractionInput: function (text, app) {
                var cleaned = (text || '').replace(/\r\n?/g, '\n');
                cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // collapse blank runs
                cleaned = cleaned.replace(/\[\d+(?:\s*[,\-–]\s*\d+)*\]/g, ''); // [1], [2,3]
                cleaned = cleaned.replace(/[ \t]+\n/g, '\n').trim();
                var cap = this.capFor(app);
                var truncated = false;
                if (cleaned.length > cap) {
                    cleaned = cleaned.slice(0, cap).trim();
                    truncated = true;
                }
                return { input: cleaned, truncated: truncated, cap: cap };
            },

            // Parse a raw model response into { title, body, raw } or null when
            // the model reported no character info. Lenient on purpose: models
            // vary (code fences, **TITLE:**, '# Name' headings, sentinel with
            // trailing punctuation), so only a bare sentinel with no other
            // substantive content counts as "nothing found".
            parseExtractionResult: function (raw) {
                var result = (raw || '').trim();
                if (!result) return null;
                // Strip wrapping code fences (```markdown ... ```)
                result = result.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```\s*$/, '').trim();
                if (!result) return null;
                var sentinelRe = /NO[_\s\-]*CHARACTER[_\s\-]*INFO[_\s\-]*FOUND/i;
                if (sentinelRe.test(result)) {
                    // Null only when NOTHING but the sentinel was returned.
                    // Any other substantive text is kept so the user sees what
                    // the model actually said instead of a dead-end error.
                    // A line counts as sentinel-only when its non-sentinel
                    // residue is just filler (< 30 chars after stripping
                    // markdown/punctuation/whitespace).
                    var dropSentinelLine = function (line) {
                        if (!sentinelRe.test(line)) return false;
                        var residue = line.replace(sentinelRe, ' ').replace(/[#*`>"'\-–—.,;:!?()\[\]\s]/g, '');
                        return residue.length < 30;
                    };
                    var kept = result.split('\n').filter(function (line) {
                        return !dropSentinelLine(line);
                    }).join('\n').trim();
                    if (!kept || !kept.replace(/[#*`>\-\s]/g, '')) return null;
                    result = kept;
                }
                var title = '';
                var body = result;
                var titleMatch = result.match(/^\s*(?:\*\*TITLE:\*\*|TITLE:)\s*(.+?)(?:\n|$)/i)
                    || result.match(/^\s*#(?!#)\s*(.+?)(?:\n|$)/);
                if (titleMatch) {
                    title = titleMatch[1].replace(/[*_`#]/g, '').trim();
                    body = result.slice(titleMatch[0].length).trim() || result;
                }
                return { title: title, body: body, raw: raw };
            },

            // Per-call input size for chunked extraction. Reasoning effort grows
            // with input length and some models ignore reasoning caps, so long
            // pastes are split into small parts — each part gives the model
            // little to deliberate about and the answer fits easily.
            EXTRACTION_CHUNK_CHARS_API: 5000,

            // Split input into paragraph-aligned chunks of at most max chars.
            // Oversized single paragraphs are hard-sliced as a fallback.
            splitExtractionChunks: function (input, max) {
                if (!input || input.length <= max) return [input];
                var chunks = [];
                var current = '';
                input.split(/\n\s*\n/).forEach(function (para) {
                    if (para.length > max) {
                        if (current.trim()) { chunks.push(current.trim()); current = ''; }
                        for (var i = 0; i < para.length; i += max) chunks.push(para.slice(i, i + max));
                        return;
                    }
                    var candidate = current ? current + '\n\n' + para : para;
                    if (candidate.length > max && current) { chunks.push(current); current = para; }
                    else current = candidate;
                });
                if (current.trim()) chunks.push(current.trim());
                return chunks.length ? chunks : [input];
            },

            // Merge per-chunk profiles: first title wins, bullets grouped under
            // matching ## headings (case-insensitive), exact duplicates dropped,
            // heading-less lines collected under Notes.
            mergeExtractionResults: function (results) {
                var title = '';
                var sections = {};
                var order = [];
                var ensure = function (name) {
                    var key = (name || 'Notes').toLowerCase();
                    if (!sections[key]) { sections[key] = { heading: name || 'Notes', lines: [] }; order.push(key); }
                    return key;
                };
                (results || []).forEach(function (r) {
                    if (!r) return;
                    if (!title && r.title) title = r.title;
                    var current = null;
                    (r.body || '').split('\n').forEach(function (line) {
                        var h = line.match(/^\s*##\s+(.+?)\s*$/);
                        if (h) { current = ensure(h[1]); return; }
                        if (!line.trim()) return;
                        var bucket = current || ensure('Notes');
                        if (sections[bucket].lines.indexOf(line) === -1) sections[bucket].lines.push(line);
                    });
                });
                if (!order.length) return null;
                var body = order.map(function (k) { return '## ' + sections[k].heading + '\n' + sections[k].lines.join('\n'); }).join('\n\n');
                return { title: title, body: body, raw: (title ? 'TITLE: ' + title + '\n' : '') + body };
            },

        async extractCharacterFromText(text, genre, app, instruction, language) {
                if (!text || !text.trim()) return null;
                const genreLabel = (window.GenreDefs?.GENRES || []).find(function (g) { return g.id === genre; });
                const genreContext = genreLabel
                    ? 'Genre context: This character belongs to a ' + genreLabel.label + ' story.'
                    : '';
                var prepared = this.prepareExtractionInput(text, app);
                var isApi = !!(app && app.aiMode === 'api');
                // Chunk long pastes so each call's reasoning fits its budget.
                // Local backends keep a single call (input already capped).
                var chunks = this.splitExtractionChunks(
                    prepared.input,
                    isApi ? this.EXTRACTION_CHUNK_CHARS_API : prepared.input.length
                );

                var lang = language || app?.language || app?.currentProject?.language || 'English';
                var systemContent = 'You are a character information extraction tool. Extract only, never create or embellish.';
                if (lang !== 'English') {
                    systemContent += ' Write entirely in ' + lang + '.';
                }

                var self = this;
                var buildMessages = function (chunkText, chunkIdx) {
                    var promptText = self.PASTE_EXTRACTION_PROMPT
                        .replace('{genreContext}', function () { return genreContext; })
                        .replace('{userText}', function () { return chunkText; });
                    if (chunks.length > 1) {
                        promptText += '\n\nNote: this is part ' + (chunkIdx + 1) + ' of ' + chunks.length + ' of the source text; extract facts from this part only.';
                    }
                    if (prepared.truncated) {
                        promptText += '\n\nNote: the input was truncated to fit the context window; extract from what is provided.';
                    }
                    if (instruction && instruction.trim()) {
                        promptText += '\n\nUser instruction: ' + instruction.trim() + '\nApply this instruction strictly when extracting. Do not include content that the user asked to exclude.';
                    }
                    return [
                        { role: 'system', content: systemContent },
                        { role: 'user', content: promptText }
                    ];
                };

                // Chunk calls run up to 3 at a time: a 34k paste is ~7 chunks and
                // sequential non-streaming calls are slow. Order is preserved
                // for merging (first title wins). A failure stops new chunks
                // from starting; already-running calls finish harmlessly.
                var PARALLEL_CHUNKS = 3;
                var ordered = new Array(chunks.length);
                var nextIdx = 0;
                var firstError = null;
                var runOneChunk = async function (ci) {
                    var fullResponse = '';
                    try {
                        // A dedicated output budget: this is an extraction task,
                        // not prose, so it must not inherit the story
                        // target-length setting. Temperature stays moderate —
                        // reasoning models can loop under greedy decoding
                        // (temp 0). Non-streaming so reasoning models return
                        // only the final answer (their chain-of-thought stays
                        // in its own field and never pollutes the profile);
                        // reasoning tokens are ignored if the server streams
                        // anyway. The reasoning cap bounds thinking so the
                        // answer fits its budget.
                        await window.Generation.streamGeneration(buildMessages(chunks[ci], ci), function (token) {
                            fullResponse += token;
                        }, app, null, { temperature: 0.7, maxTokens: 1500, noMinTokens: true, nonStreaming: true, ignoreReasoning: true, reasoningCap: 1000 });
                    } catch (e) {
                        console.error('Extraction failed:', e);
                        if (/thinking model/i.test(e && e.message ? e.message : '')) {
                            return { error: 'The model spent its whole output budget thinking about part ' + (ci + 1) + ' of ' + chunks.length + ' instead of answering. Try a shorter paste or a non-reasoning model (e.g. a chat/flash model) for imports.' };
                        }
                        return { error: e.message || 'Extraction failed' };
                    }

                    if (!fullResponse.trim()) {
                        return { error: 'The AI returned an empty response. Check that your provider/model is working (try a normal generation first), and for local servers check the context size — very long pastes can exceed it.' };
                    }
                    return { parsed: self.parseExtractionResult(fullResponse) };
                };
                var worker = async function () {
                    while (firstError === null && nextIdx < chunks.length) {
                        var my = nextIdx++;
                        var outcome = await runOneChunk(my);
                        if (outcome.error) { firstError = outcome.error; return; }
                        ordered[my] = outcome.parsed || null;
                    }
                };
                var workers = [];
                for (var w = 0; w < Math.min(PARALLEL_CHUNKS, chunks.length); w++) workers.push(worker());
                await Promise.all(workers);
                if (firstError !== null) return { error: firstError };
                var results = ordered.filter(function (r) { return !!r; });
                if (!results.length) return null;
                if (results.length === 1) return results[0];
                return this.mergeExtractionResults(results);
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
