/**
 * Prompt template rendering.
 *
 * One place for resolving the placeholders the app supports in prompt text:
 *   {length} {pov} {povName} {povCharacter} {tense} {language} {genres} {genreLabels}
 *
 * Applied to both the system and user fields of every prompt category so a
 * placeholder can never leak through to the model again.
 */
(function () {
    const TENSE_MAP = {
        'past': 'past tense',
        'present': 'present tense',
        'future': 'future tense',
        'past perfect': 'past perfect tense',
        'present perfect': 'present perfect tense'
    };

    function asText(value) {
        return typeof value === 'string' ? value : '';
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function genreLabelsFor(genreIds) {
        if (!Array.isArray(genreIds) || genreIds.length === 0 || !window.GenreDefs) return [];
        return genreIds
            .map(id => window.GenreDefs.findGenre(id)?.label || id)
            .filter(Boolean);
    }

    /**
     * Build the placeholder values for a prompt template.
     * @param {Object} app - Alpine app instance
     * @param {Object} [opts] - Optional overrides
     * @param {Array<string>} [opts.genreIds] - Genre ids to describe
     * @param {number} [opts.targetWords] - Word target for {length}
     * @param {string} [opts.pov]
     * @param {string} [opts.povName]
     * @param {string} [opts.tense]
     * @param {string} [opts.language]
     * @returns {Object}
     */
    function buildContext(app, opts = {}) {
        const project = app && app.currentProject ? app.currentProject : null;
        const genreIds = Array.isArray(opts.genreIds)
            ? opts.genreIds
            : (project && Array.isArray(project.genres) ? project.genres : []);

        const labels = genreLabelsFor(genreIds);
        const descriptors = window.GenreDefs
            ? window.GenreDefs.getPromptDescriptor(genreIds)
            : [];

        const genreSentence = labels.length > 0
            ? `This is a ${labels.join(' & ')} story. Write with ${descriptors.join(', and ')}.`
            : '';

        const targetWords = Number(opts.targetWords || (app && app.maxTokens) || 300);
        const povName = asText(opts.povName || (app && app.povCharacter)).trim() || 'the protagonist';
        const pov = asText(opts.pov || (app && app.pov)).trim() || '3rd person limited';
        const tenseKey = asText(opts.tense || (app && app.tense)).trim().toLowerCase();
        const language = asText(opts.language || (app && app.language) || (project && project.language)).trim() || 'English';

        return {
            length: `at least ${targetWords} words`,
            pov,
            povName,
            povCharacter: povName,
            tense: TENSE_MAP[tenseKey] || 'past tense',
            language,
            genres: genreSentence,
            genreLabels: labels.length > 0 ? labels.join(' & ') : 'general fiction',
            targetWords
        };
    }

    /**
     * Replace supported placeholders. Unknown placeholders are left untouched
     * so author-written template syntax is never silently destroyed.
     * @param {string} text
     * @param {Object} context - Result of buildContext()
     * @returns {string}
     */
    function render(text, context) {
        let out = asText(text);
        if (!out || !context) return out;

        const keys = ['length', 'pov', 'povName', 'povCharacter', 'tense', 'language', 'genres', 'genreLabels'];
        for (const key of keys) {
            const value = context[key];
            if (value === undefined || value === null) continue;
            out = out.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'gi'), String(value));
        }
        return out;
    }

    function hasLengthToken(text) {
        return /\{length\}/i.test(asText(text));
    }

    window.PromptRender = {
        buildContext,
        render,
        hasLengthToken,
        TENSE_MAP
    };
})();
