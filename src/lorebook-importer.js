// Lorebook Importer Module
// Parses SillyTavern lore book JSON exports, maps entries to compendium entries,
// and imports them via the existing Compendium.import() path.
// Each import batch is tagged with ST:{bookName} for grouping and identification.
(function () {
    const TAG_CAP = 10;

    function getFilename(file) {
        const name = file.name || 'lorebook';
        return name.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'lorebook';
    }

    function normalizeFormat(raw, filename) {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Invalid lorebook file: expected a JSON object or array');
        }

        let bookName, entries;

        if (Array.isArray(raw)) {
            bookName = filename;
            entries = raw;
        } else if (raw.entries && Array.isArray(raw.entries)) {
            bookName = (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.trim() : filename;
            entries = raw.entries;
        } else if (raw.entries && typeof raw.entries === 'object') {
            bookName = (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.trim() : filename;
            entries = Object.values(raw.entries);
        } else {
            const keys = Object.keys(raw);
            if (keys.length > 0 && keys.every(k => /^\d+$/.test(k) || !isNaN(Number(k)))) {
                bookName = filename;
                entries = Object.values(raw);
            } else {
                throw new Error('Unrecognized lorebook format: expected an object with an "entries" array or an array of entries');
            }
        }

        if (!Array.isArray(entries) || entries.length === 0) {
            throw new Error('Lorebook contains no entries');
        }

        for (const e of entries) {
            e.name = e.name || e.key || e.id || '';
        }

        return { bookName, entries };
    }

    function buildTags(stEntry, bookName, includeKeys) {
        const sourceTag = 'ST:' + bookName;

        if (!includeKeys) {
            return { tags: [sourceTag], dropped: 0 };
        }

        const keys = (stEntry.keys || []).filter(k => typeof k === 'string' && k.trim());
        const available = TAG_CAP - 1;
        const included = keys.slice(0, available);
        const dropped = Math.max(0, keys.length - available);

        return { tags: [sourceTag, ...included], dropped };
    }

    async function resolveExistingEntry(projectId, title, sourceTag) {
        try {
            const all = await db.compendium.where('projectId').equals(projectId).toArray();
            return all.find(e => e.title === title && e.tags && e.tags.includes(sourceTag)) || null;
        } catch (e) {
            return null;
        }
    }

    function prepareAllEntries(rawEntries, bookName, options) {
        const { projectId, category, includeKeys } = options;
        const sourceTag = 'ST:' + bookName;
        const entries = [];
        const truncations = [];

        for (const st of rawEntries) {
            const title = (typeof st.name === 'string' && st.name.trim())
                ? st.name.trim()
                : (Array.isArray(st.keys) && st.keys[0])
                    ? st.keys[0]
                    : 'Untitled';

            const { tags, dropped } = buildTags(st, bookName, includeKeys);

            if (dropped > 0) {
                truncations.push({ title, dropped });
            }

            entries.push({
                title: title,
                body: (typeof st.content === 'string') ? st.content : '',
                category: category,
                tags: tags,
                summary: '',
                alwaysInContext: false,
                isPovCharacter: false
            });
        }

        return { entries, truncations };
    }

    async function resolveIdsForExisting(projectId, entries, sourceTag) {
        const resolved = [];
        for (const entry of entries) {
            const existing = await resolveExistingEntry(projectId, entry.title, sourceTag);
            if (existing) {
                resolved.push({ ...entry, id: existing.id });
            } else {
                resolved.push(entry);
            }
        }
        return resolved;
    }

    async function importLorebook(app) {
        const pid = app.currentProject?.id || '__chat_global__';

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            if (!file) {
                document.body.removeChild(input);
                return;
            }

            try {
                const text = await file.text();
                const raw = JSON.parse(text);
                const filename = getFilename(file);
                const { bookName, entries: rawEntries } = normalizeFormat(raw, filename);
                const sourceTag = 'ST:' + bookName;

                app.lorebookImportBookName = bookName;
                app.lorebookImportEntryCount = rawEntries.length;
                app.lorebookImportFile = { rawEntries, sourceTag };
                app.lorebookImportTruncations = [];
                app.lorebookImporting = false;
                app.showLorebookImport = true;
            } catch (err) {
                alert('Import failed: ' + err.message);
                console.error('Lorebook import error:', err);
            } finally {
                document.body.removeChild(input);
            }
        });

        input.click();
    }

    async function importLorebookData(app, entries, bookName, options = {}) {
        const pid = app.currentProject?.id || '__chat_global__';

        const category = options.category || 'lore';
        const includeKeys = options.includeKeys !== false;
        const sourceTag = 'ST:' + bookName;

        const { entries: prepared, truncations } = prepareAllEntries(entries, bookName, {
            projectId: pid, category, includeKeys
        });

        const entriesWithIds = await resolveIdsForExisting(pid, prepared, sourceTag);
        const saved = await window.Compendium.import(pid, entriesWithIds);

        if (window.LorebookManager?.loadLorebookEntries) {
            await window.LorebookManager.loadLorebookEntries(app);
        }

        if (!options.silent) {
            let msg = 'Imported ' + saved.length + ' entries from "' + bookName + '"';
            if (truncations.length > 0) {
                msg += '\n\n⚠️ ' + truncations.length + ' entries had keys dropped (max ' + TAG_CAP + ' tags):';
                for (const t of truncations) {
                    msg += '\n  • ' + t.title + ' (' + t.dropped + ' keys dropped)';
                }
            }
            alert(msg);
        }

        if (options.silent && truncations.length > 0) {
            let msg = '⚠️ ' + truncations.length + ' entries had keys dropped (max ' + TAG_CAP + ' tags):';
            for (const t of truncations) {
                msg += '\n  • ' + t.title + ' (' + t.dropped + ' keys dropped)';
            }
            alert(msg);
        }

        return { count: saved.length, truncations };
    }

    async function confirmImport(app) {
        if (!app.lorebookImportFile) return;

        app.lorebookImporting = true;

        try {
            const { rawEntries } = app.lorebookImportFile;

            await importLorebookData(app, rawEntries, app.lorebookImportBookName, {
                category: app.lorebookImportCategory,
                includeKeys: app.lorebookImportIncludeKeys,
                silent: false
            });
        } catch (err) {
            alert('Import failed: ' + err.message);
            console.error('Lorebook import error:', err);
        } finally {
            app.lorebookImporting = false;
            app.showLorebookImport = false;
            app.lorebookImportFile = null;
            app.lorebookImportTruncations = [];
        }
    }

    function closeImport(app) {
        app.showLorebookImport = false;
        app.lorebookImportFile = null;
        app.lorebookImportTruncations = [];
        app.lorebookImporting = false;
    }

    window.LorebookImporter = {
        importLorebook,
        importLorebookData,
        confirmImport,
        closeImport,
        TAG_CAP
    };
})();
