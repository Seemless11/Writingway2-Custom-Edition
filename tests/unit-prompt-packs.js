/**
 * Unit tests for PromptPacks module
 * Run with: node tests/unit-prompt-packs.js
 */
const fs = require('fs');
const path = require('path');

const promptPacksCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompt-packs.js'), 'utf8');

const window = {
    PromptPacks: null,
    GenreDefs: {
        GENRES: [
            { id: 'fantasy', label: 'Fantasy' },
            { id: 'modern', label: 'Modern' },
            { id: 'historical', label: 'Historical' },
            { id: 'horror', label: 'Horror' },
            { id: 'romance', label: 'Romance' },
            { id: 'western', label: 'Western' },
            { id: 'cyberpunk', label: 'Cyberpunk' },
            { id: 'superhero', label: 'Superhero' },
            { id: 'dystopian', label: 'Dystopian' },
            { id: 'adventure', label: 'Adventure' },
            { id: 'litrpg', label: 'LitRPG' },
            { id: 'anime', label: 'Anime' },
            { id: 'shonen', label: 'Shonen' },
            { id: 'isekai', label: 'Isekai' },
            { id: 'superpowers', label: 'Superpowers' }
        ],
        getPromptDescriptor: (genres) => {
            const map = {
                'fantasy': ['magic systems and epic scope'],
                'modern': ['contemporary realism and social dynamics'],
                'historical': ['period detail and historical authenticity'],
                'horror': ['dread, atmosphere, and visceral threat'],
                'romance': ['emotional tension and relationship dynamics'],
                'western': ['frontier justice and harsh landscapes'],
                'cyberpunk': ['high tech low life and corporate power'],
                'superhero': ['heroic action and moral complexity'],
                'dystopian': ['oppressive systems and resistance'],
                'adventure': ['exploration and daring exploits'],
                'litrpg': ['game mechanics and progression'],
                'anime': ['visual storytelling and emotional beats'],
                'shonen': ['growth, rivalry, and friendship'],
                'isekai': ['world displacement and adaptation'],
                'superpowers': ['power fantasy and responsibility']
            };
            return genres.flatMap(g => map[g] || []);
        },
        findGenre: (id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) })
    }
};

eval(promptPacksCode);

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✓ ${message}`);
        passed++;
    } else {
        console.error(`✗ ${message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        console.log(`✓ ${message}`);
        passed++;
    } else {
        console.error(`✗ ${message}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

console.log('=== PromptPacks.VERSION ===');
assertEqual(window.PromptPacks.VERSION, 4, 'VERSION is 4');

console.log('\n=== PromptPacks.GENRE_PACKS ===');
assert(window.PromptPacks.GENRE_PACKS.fantasy !== undefined, 'fantasy pack exists');
assert(window.PromptPacks.GENRE_PACKS.modern !== undefined, 'modern pack exists');
assert(window.PromptPacks.GENRE_PACKS.horror !== undefined, 'horror pack exists');
assert(window.PromptPacks.GENRE_PACKS.romance !== undefined, 'romance pack exists');
assert(window.PromptPacks.GENRE_PACKS.cyberpunk !== undefined, 'cyberpunk pack exists');

const fantasyPack = window.PromptPacks.GENRE_PACKS.fantasy;
assert(fantasyPack.voice !== undefined, 'fantasy pack has voice');
assert(fantasyPack.craftMoves !== undefined, 'fantasy pack has craftMoves');
assert(fantasyPack.avoid !== undefined, 'fantasy pack has avoid');
assert(fantasyPack.rewriteFocus !== undefined, 'fantasy pack has rewriteFocus');
assert(fantasyPack.summaryFocus !== undefined, 'fantasy pack has summaryFocus');
assert(fantasyPack.workshopAgenda !== undefined, 'fantasy pack has workshopAgenda');
assert(Array.isArray(fantasyPack.creation) && fantasyPack.creation.length > 0, 'fantasy pack has creation facts');

// Every pack must carry the full live contract. compose() renders each of these
// into a prompt section, so an empty list becomes an empty section in the app.
const PACK_LIST_FIELDS = ['engines', 'craftMoves', 'imagery', 'avoid', 'rewriteFocus', 'summaryFocus', 'workshopAgenda', 'creation'];
const PACK_TEXT_FIELDS = ['label', 'voice', 'dialogue'];
for (const [id, pack] of Object.entries(window.PromptPacks.GENRE_PACKS)) {
    for (const field of PACK_TEXT_FIELDS) {
        assert(typeof pack[field] === 'string' && pack[field].trim().length > 0, `${id}: ${field} is a non-empty string`);
    }
    for (const field of PACK_LIST_FIELDS) {
        assert(Array.isArray(pack[field]) && pack[field].length > 0, `${id}: ${field} is a non-empty list`);
    }
}

const generalPack = window.PromptPacks.GENERAL_PACK;
for (const field of PACK_TEXT_FIELDS) {
    assert(typeof generalPack[field] === 'string' && generalPack[field].trim().length > 0, `general: ${field} is a non-empty string`);
}
for (const field of PACK_LIST_FIELDS) {
    assert(Array.isArray(generalPack[field]) && generalPack[field].length > 0, `general: ${field} is a non-empty list`);
}

console.log('\n=== PromptPacks.GENERAL_PACK ===');
assert(window.PromptPacks.GENERAL_PACK !== undefined, 'GENERAL_PACK exists');

console.log('\n=== PromptPacks.SHARED_* ===');
assert(window.PromptPacks.SHARED_PROSE_CRAFT !== undefined, 'SHARED_PROSE_CRAFT exists');
assert(window.PromptPacks.SHARED_CONTINUITY !== undefined, 'SHARED_CONTINUITY exists');
assert(window.PromptPacks.SHARED_AVOID !== undefined, 'SHARED_AVOID exists');
assert(window.PromptPacks.SHARED_REWRITE_CRAFT !== undefined, 'SHARED_REWRITE_CRAFT exists');

console.log('\n=== PromptPacks.compose ===');
const composedProse = window.PromptPacks.compose(['fantasy'], 'prose');
assert(composedProse !== undefined, 'compose: returns composed prose prompt');
assert(composedProse.category === 'prose', 'compose: prose category');
assert(composedProse.systemContent !== undefined, 'compose: prose has systemContent');
assert(composedProse.content !== undefined, 'compose: prose has content');
assert(composedProse.title.includes('Fantasy'), 'compose: prose title includes genre');

const composedRewrite = window.PromptPacks.compose(['fantasy'], 'rewrite');
assert(composedRewrite !== undefined, 'compose: returns composed rewrite prompt');
assert(composedRewrite.category === 'rewrite', 'compose: rewrite category');

const composedSummary = window.PromptPacks.compose(['fantasy'], 'summary');
assert(composedSummary !== undefined, 'compose: returns composed summary prompt');
assert(composedSummary.defaultFor === 'summary', 'compose: summary defaultFor');

const composedSummaryAnalysis = window.PromptPacks.compose(['fantasy'], 'summaryAnalysis');
assert(composedSummaryAnalysis !== undefined, 'compose: returns composed summaryAnalysis prompt');
assert(composedSummaryAnalysis.title.includes('Fantasy'), 'compose: summaryAnalysis title includes genre');
// Note: summaryAnalysis doesn't have defaultFor in compose() - only summary does

const composedWorkshop = window.PromptPacks.compose(['fantasy'], 'workshop');
assert(composedWorkshop !== undefined, 'compose: returns composed workshop prompt');
assert(composedWorkshop.category === 'workshop', 'compose: workshop category');

console.log('\n=== PromptPacks.buildPack (equal-weight sections) ===');

// Single genre → one section, fields preserved
const single = window.PromptPacks.buildPack(['fantasy']);
assert(!single.isMulti, 'buildPack: single genre is not multi');
assert(single.sections.length === 1, 'buildPack: single genre has one section');
assert(single.sections[0].voice.length > 0, 'buildPack: single genre section has voice');
assert(single.sections[0].craftMoves.length > 0, 'buildPack: single genre section has craftMoves');
assert(single.sections[0].avoid.length > 0, 'buildPack: single genre section has avoid');
assert(Array.isArray(single.sections[0].creation) && single.sections[0].creation.length > 0, 'buildPack: single genre section has creation');
assert(single.label === 'Fantasy', 'buildPack: single genre label');

// Multi genre → one section per genre, in selection order
const multi = window.PromptPacks.buildPack(['fantasy', 'horror']);
assert(multi.isMulti, 'buildPack: multi-genre isMulti');
assert(multi.sections.length === 2, 'buildPack: multi-genre has one section per genre');
assert(multi.sections.map(s => s.id).join(',') === 'fantasy,horror', 'buildPack: multi-genre preserves selection order');
assert(multi.label === 'Fantasy & Horror', 'buildPack: multi-genre label joins with &');
assert(multi.sections[0].voice.includes('wonder'), 'buildPack: first section keeps its own voice');
assert(multi.sections[1].voice.includes('claustrophobic'), 'buildPack: second section keeps its own voice');

// Equal weight: every genre contributes its full creation payload (no cap)
const fantasyFact = window.PromptPacks.GENRE_PACKS.fantasy.creation[0];
const horrorFact = window.PromptPacks.GENRE_PACKS.horror.creation[0];
assert(multi.creation.includes(fantasyFact), 'buildPack: multi includes first genre creation');
assert(multi.creation.includes(horrorFact), 'buildPack: multi includes second genre creation');
assert(multi.creation.length === new Set(multi.creation).size, 'buildPack: multi creation dedupes');

const three = window.PromptPacks.buildPack(['fantasy', 'horror', 'romance']);
const sumThree = three.sections.reduce((n, s) => n + s.creation.length, 0);
assert(three.sections.length === 3, 'buildPack: three genres has three sections');
assert(three.creation.length === sumThree, `buildPack: no cap — all three genres' creation retained (${three.creation.length})`);
assert(three.creation.length > 8, 'buildPack: three genres exceeds the old cap of 8');

// Unknown / duplicate / empty ids
const unknown = window.PromptPacks.buildPack(['fantasy', 'nope']);
assert(unknown.sections.length === 1 && unknown.label === 'Fantasy', 'buildPack: unknown id dropped');
const dupe = window.PromptPacks.buildPack(['fantasy', 'fantasy']);
assert(dupe.sections.length === 1 && !dupe.isMulti, 'buildPack: duplicate id collapsed');
const none = window.PromptPacks.buildPack([]);
assert(none.sections.length === 1 && none.label === 'General Fiction', 'buildPack: empty falls back to General Fiction');

// Rendering: multi-genre prose is per-genre labeled and carries genreIds
const proseMulti = window.PromptPacks.compose(['fantasy', 'horror'], 'prose');
assert(proseMulti.systemContent.includes('Fantasy:'), 'compose: multi prose system labels first genre');
assert(proseMulti.systemContent.includes('Horror:'), 'compose: multi prose system labels second genre');
assert(Array.isArray(proseMulti.genreIds) && proseMulti.genreIds.length === 2, 'compose: multi stores genreIds');
const proseSingle = window.PromptPacks.compose(['fantasy'], 'prose');
assert(!proseSingle.systemContent.includes('Fantasy:'), 'compose: single prose is not labeled (unchanged shape)');
assert(proseSingle.genreIds.length === 1, 'compose: single stores genreIds');

console.log('\n=== PromptPacks.composeCore ===');
// composeCore uses empty genre array (general fiction)
const core = window.PromptPacks.composeCore('prose');
assert(core !== undefined, 'composeCore: returns core prompt');
assert(core.category === 'prose', 'composeCore: prose category');
assert(core.title === 'Core Prose Prompt', 'composeCore: core title');
assert(core.systemContent !== undefined, 'composeCore: has systemContent');
assert(core.content !== undefined, 'composeCore: has content');

console.log('\n=== PromptPacks.composeSet ===');
const set = window.PromptPacks.composeSet(['fantasy', 'horror']);
assert(set !== undefined, 'composeSet: returns object');
assert(set.prose !== undefined, 'composeSet: includes prose');
assert(set.rewrite !== undefined, 'composeSet: includes rewrite');
assert(set.summary !== undefined, 'composeSet: includes summary');
assert(set.workshop !== undefined, 'composeSet: includes workshop');

// Check builtin and metadata
Object.values(set).forEach(p => {
    assert(p.category !== undefined, `composeSet: ${p.title} has category`);
});

console.log('\n=== PromptPacks.getPack ===');
// getPack returns genre packs, not templates
const genrePack = window.PromptPacks.getPack('fantasy');
assert(genrePack !== undefined, 'getPack: returns fantasy pack');
assert(genrePack.label === 'Fantasy', 'getPack: fantasy pack has label');

const unknownPack = window.PromptPacks.getPack('nonexistent');
assert(unknownPack === null, 'getPack: returns null for unknown genre');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);