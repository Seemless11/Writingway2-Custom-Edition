/**
 * Unit tests for multi-genre equal-weight prompt composition.
 * Run with: node tests/unit-genre-blend.js
 */
const fs = require('fs');
const path = require('path');

const promptPacksCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompt-packs.js'), 'utf8');
const window = { PromptPacks: null };
eval(promptPacksCode);

const P = window.PromptPacks;
const IDS = ['fantasy', 'horror', 'romance'];

let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) { console.log(`✓ ${message}`); passed++; }
    else { console.error(`✗ ${message}`); failed++; }
}

console.log('=== Equal weight: every genre contributes fully ===');
const prose = P.compose(IDS, 'prose');

for (const id of IDS) {
    const pack = P.GENRE_PACKS[id];
    assert(prose.systemContent.includes(pack.voice), `${id}: voice present in prose system`);
    assert(prose.systemContent.includes(pack.dialogue), `${id}: dialogue present in prose system`);
    assert(pack.engines.every(e => prose.systemContent.includes(e)), `${id}: all engines present`);
    assert(pack.imagery.every(i => prose.systemContent.includes(i)), `${id}: all imagery present`);
    assert(pack.craftMoves.every(c => prose.content.includes(c)), `${id}: all craftMoves present`);
    assert(pack.avoid.every(a => prose.content.includes(a)), `${id}: all avoid entries present (none dropped)`);
}

console.log('\n=== All prompt kinds carry every genre ===');
const focusField = { rewrite: 'rewriteFocus', summary: 'summaryFocus', summaryAnalysis: 'summaryFocus', workshop: 'workshopAgenda' };
for (const [kind, field] of Object.entries(focusField)) {
    const p = P.compose(IDS, kind);
    for (const id of IDS) {
        const pack = P.GENRE_PACKS[id];
        assert(pack[field].every(x => p.content.includes(x)), `${kind}/${id}: all ${field} present`);
    }
}

console.log('\n=== Labels and titles ===');
assert(prose.title === 'Fantasy & Horror & Romance Prose Prompt', 'title joins all three genres');
assert(prose.systemContent.includes('writing a Fantasy & Horror & Romance story'), 'system labels all three genres');
assert(prose.systemContent.includes('Fantasy:') && prose.systemContent.includes('Horror:') && prose.systemContent.includes('Romance:'), 'system labels each genre section');

console.log('\n=== Single genre is unchanged in shape ===');
const single = P.compose(['fantasy'], 'prose');
assert(single.systemContent.includes('Story voice: Clear, sensory, slightly formal prose with room for wonder'), 'single genre voice is unlabeled');
assert(!single.systemContent.includes('Fantasy: Clear'), 'single genre is not prefixed with its own label');
assert(single.title === 'Fantasy Prose Prompt', 'single genre title');

console.log('\n=== No caps ===');
const pack3 = P.buildPack(IDS);
assert(pack3.creation.length === 15, `no cap: 15 creation facts retained (got ${pack3.creation.length})`);
assert(pack3.sections.length === 3, 'one section per genre');
assert(pack3.creation.length === new Set(pack3.creation).size, 'creation deduped');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
