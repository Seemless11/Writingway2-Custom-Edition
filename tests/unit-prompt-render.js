/**
 * Unit tests for PromptRender module
 * Run with: node tests/unit-prompt-render.js
 */
const fs = require('fs');
const path = require('path');

// Load the prompt-render.js file and execute it in a simulated browser environment
const promptRenderCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompt-render.js'), 'utf8');

// Create a mock window object
const window = {
    PromptRender: null,
    GenreDefs: {
        getPromptDescriptor: (genres) => {
            const map = {
                'fantasy': ['magic systems and epic scope'],
                'mystery': ['intrigue, clues, and gradual revelation'],
                'romance': ['emotional tension and relationship dynamics'],
                'sci-fi': ['speculative technology and its human impact'],
                'horror': ['dread, atmosphere, and visceral threat'],
            };
            return genres.flatMap(g => map[g] || []);
        },
        findGenre: (id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) })
    }
};

// Execute the module code
eval(promptRenderCode);

// Helper to run tests
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

// Mock app object
const mockApp = {
    povCharacter: 'Arya',
    pov: '3rd person limited',
    tense: 'past',
    language: 'English',
    currentProject: {
        genres: ['fantasy', 'mystery'],
        language: 'English',
        pov: '3rd person limited',
        tense: 'past',
        povCharacter: 'Arya'
    },
    maxTokens: 300
};

console.log('=== PromptRender.buildContext Tests ===');

// Test 1: Basic context building
const ctx = window.PromptRender.buildContext(mockApp, {
    genreIds: ['fantasy', 'mystery'],
    targetWords: 300,
    pov: '3rd person limited',
    povName: 'Arya',
    tense: 'past',
    language: 'English'
});

assertEqual(ctx.pov, '3rd person limited', 'buildContext: pov');
assertEqual(ctx.povName, 'Arya', 'buildContext: povName');
assertEqual(ctx.povCharacter, 'Arya', 'buildContext: povCharacter');
assertEqual(ctx.tense, 'past tense', 'buildContext: tense');
assertEqual(ctx.language, 'English', 'buildContext: language');
assertEqual(ctx.targetWords, 300, 'buildContext: targetWords');
assert(ctx.length.includes('about 300 words (270-360 words)'), 'buildContext: length instruction');

// Test 2: Genre labels
assertEqual(ctx.genreLabels, 'Fantasy & Mystery', 'buildContext: genreLabels');

// Test 3: Genre sentence
assert(ctx.genres.includes('This is a Fantasy & Mystery story'), 'buildContext: genres sentence');
assert(ctx.genres.includes('magic systems and epic scope'), 'buildContext: fantasy descriptor');
assert(ctx.genres.includes('intrigue, clues, and gradual revelation'), 'buildContext: mystery descriptor');

// Test 4: Fallback when no genreIds
const ctxNoGenre = window.PromptRender.buildContext(mockApp, {
    genreIds: [],
    targetWords: 200,
    pov: '1st person',
    povName: 'John',
    tense: 'present',
    language: 'Spanish'
});
assertEqual(ctxNoGenre.genreLabels, 'general fiction', 'buildContext: empty genreLabels defaults to general fiction');
assertEqual(ctxNoGenre.genres, '', 'buildContext: empty genres');
assertEqual(ctxNoGenre.tense, 'present tense', 'buildContext: present tense');
assertEqual(ctxNoGenre.language, 'Spanish', 'buildContext: Spanish language');

// Test 4b: Author's Note — explicit opt, project fallback, disabled, and blank
assertEqual(ctx.authorsNote, '', 'buildContext: no authorsNote by default');
const ctxNote = window.PromptRender.buildContext(mockApp, { authorsNote: '  Bleak and literary.  ' });
assertEqual(ctxNote.authorsNote, 'Bleak and literary.', 'buildContext: authorsNote from opts is trimmed');
const appWithNote = { ...mockApp, currentProject: { ...mockApp.currentProject, authorsNote: 'Slow, sensory prose.', authorsNoteEnabled: true } };
assertEqual(window.PromptRender.buildContext(appWithNote, {}).authorsNote, 'Slow, sensory prose.', 'buildContext: authorsNote from project record');
const appNoteDisabled = { ...mockApp, currentProject: { ...mockApp.currentProject, authorsNote: 'Ignored.', authorsNoteEnabled: false } };
assertEqual(window.PromptRender.buildContext(appNoteDisabled, {}).authorsNote, '', 'buildContext: disabled project authorsNote is empty');

console.log('\n=== PromptRender.render Tests ===');

// Test 5: Basic placeholder resolution
const template1 = 'Write in {tense} from {povName}\'s POV using {pov}. Target: {length}. Language: {language}. Genres: {genreLabels}';
const result1 = window.PromptRender.render(template1, ctx);
assertEqual(result1, "Write in past tense from Arya's POV using 3rd person limited. Target: about 300 words (270-360 words). Language: English. Genres: Fantasy & Mystery", 'render: all placeholders resolved');

// Test 6: {povCharacter} alias
const template2 = 'Character: {povCharacter}';
const result2 = window.PromptRender.render(template2, ctx);
assertEqual(result2, 'Character: Arya', 'render: povCharacter alias');

// Test 7: Unknown placeholders left untouched
const template3 = 'Known: {tense}, Unknown: {foo}, Also unknown: {bar}';
const result3 = window.PromptRender.render(template3, ctx);
assertEqual(result3, 'Known: past tense, Unknown: {foo}, Also unknown: {bar}', 'render: unknown placeholders untouched');

// Test 8: Case insensitive
const template4 = '{LENGTH} and {Length} and {length}';
const result4 = window.PromptRender.render(template4, ctx);
assert(result4.includes('about 300 words (270-360 words)'), 'render: case insensitive');

// Test 9: Empty context (fallback)
const result5 = window.PromptRender.render('Tense: {tense}', {});
assertEqual(result5, 'Tense: {tense}', 'render: empty context leaves placeholder');

// Test 9b: {authorsNote} placeholder
assertEqual(window.PromptRender.render('Note: {authorsNote}', ctxNote), 'Note: Bleak and literary.', 'render: authorsNote placeholder');
assertEqual(window.PromptRender.render('Note: {authorsNote}', {}), 'Note: {authorsNote}', 'render: missing authorsNote leaves placeholder');

console.log('\n=== PromptRender.hasLengthToken Tests ===');

// Test 10: hasLengthToken detection
assert(window.PromptRender.hasLengthToken('Write {length} words') === true, 'hasLengthToken: detects {length}');
assert(window.PromptRender.hasLengthToken('Write {LENGTH} words') === true, 'hasLengthToken: detects {LENGTH}');
assert(window.PromptRender.hasLengthToken('Write at least 300 words') === false, 'hasLengthToken: no false positive');
assert(window.PromptRender.hasLengthToken('') === false, 'hasLengthToken: empty string');
assert(window.PromptRender.hasLengthToken(null) === false, 'hasLengthToken: null');

console.log('\n=== PromptRender.TENSE_MAP Tests ===');

// Test 11: Tense map
assertEqual(window.PromptRender.TENSE_MAP.past, 'past tense', 'TENSE_MAP: past');
assertEqual(window.PromptRender.TENSE_MAP.present, 'present tense', 'TENSE_MAP: present');
assertEqual(window.PromptRender.TENSE_MAP.future, 'future tense', 'TENSE_MAP: future');
assertEqual(window.PromptRender.TENSE_MAP['past perfect'], 'past perfect tense', 'TENSE_MAP: past perfect');
assertEqual(window.PromptRender.TENSE_MAP['present perfect'], 'present perfect tense', 'TENSE_MAP: present perfect');
assertEqual(window.PromptRender.TENSE_MAP.unknown, undefined, 'TENSE_MAP: unknown returns undefined');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);