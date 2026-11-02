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
assertEqual(window.PromptPacks.VERSION, 2, 'VERSION is 2');

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

console.log('\n=== PromptPacks.mergePacks ===');

// Test single genre
const single = window.PromptPacks.mergePacks(['fantasy']);
assert(single.voice.length > 0, 'mergePacks: single genre has voice');
assert(single.craftMoves.length > 0, 'mergePacks: single genre has craftMoves');
assert(single.avoid.length > 0, 'mergePacks: single genre has avoid');

// Test multi-genre
const multi = window.PromptPacks.mergePacks(['fantasy', 'horror']);
assert(multi.voice.includes('wonder'), 'mergePacks: multi-genre uses first pack voice');
assert(multi.craftMoves.length <= 8, 'mergePacks: craftMoves limited to 8 items');
assert(multi.avoid.length <= 8, 'mergePacks: avoid limited to 8 items');
assert(multi.rewriteFocus.length <= 6, 'mergePacks: rewriteFocus limited to 6 items');
assert(multi.summaryFocus.length <= 6, 'mergePacks: summaryFocus limited to 6 items');

// Test deduping
const dupe = window.PromptPacks.mergePacks(['fantasy', 'fantasy']);
assert(dupe.craftMoves.length === new Set(dupe.craftMoves).size, 'mergePacks: dedupes craftMoves');

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