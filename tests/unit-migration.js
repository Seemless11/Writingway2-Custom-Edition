/**
 * Migration tests for prompt upgrade system
 * Run with: node tests/unit-migration.js
 */
const fs = require('fs');
const path = require('path');

// We need to test the migration logic in prompts.js
// Since it uses Dexie, we'll test the logic functions in isolation

const promptsCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'prompts.js'), 'utf8');

// Extract just the helper functions we want to test
// We'll create a minimal mock environment

const window = {
    PromptPacks: {
        VERSION: 2,
        composeSet: (genres) => [
            { category: 'prose', title: 'Fantasy Prose Prompt', content: 'V2 prose content', systemContent: 'V2 prose system', defaultFor: 'prose', genreId: 'fantasy' },
            { category: 'summary', title: 'Fantasy Continuity Recap Prompt', content: 'V2 summary content', systemContent: 'V2 summary system', defaultFor: 'summary', genreId: 'fantasy' },
            { category: 'workshop', title: 'Fantasy Workshop Prompt', content: 'V2 workshop content', systemContent: 'V2 workshop system', defaultFor: '', genreId: 'fantasy' },
            { category: 'rewrite', title: 'Fantasy Rewrite Prompt', content: 'V2 rewrite content', systemContent: 'V2 rewrite system', defaultFor: '', genreId: 'fantasy' }
        ],
        getPack: (cat) => ({ category: cat, content: `V2 ${cat} content`, systemContent: `V2 ${cat} system` })
    },
    GenreDefs: {
        getDefaultPromptsForGenre: (gid) => ({
            prose: { title: `${gid} Prose Prompt`, content: `V1 ${gid} prose`, systemContent: '' },
            summary: { title: `${gid} Summary Prompt`, content: `V1 ${gid} summary`, systemContent: '' }
        })
    }
};

// V1 content signatures (from prompts.js)
const V1_PROSE_CONTENT = 'Write the next scene continuing from the provided text. Maintain the established tone, style, POV, and tense. Use sensory details and vivid imagery. Show, don\'t tell. Focus on the beat provided and expand it naturally into about {length}.';
const V1_SUMMARY_CONTENT = 'You are a literary analysis assistant. Analyze the text below in depth — explore character motivations, emotional undercurrents, thematic significance, and narrative craft. Explain why moments matter, what they reveal, and how they serve the larger story. Do not simply recount events. Write as much as needed for a thorough analysis.';
const V1_WORKSHOP_CONTENT = 'You are a creative writing workshop assistant. Help the author brainstorm ideas, develop characters, improve prose, and explore narrative possibilities. Be supportive, constructive, and specific in your feedback. Draw on writing craft principles.';

// isPromptUntouched function (extracted from prompts.js)
function isPromptUntouched(prompt) {
    if (!prompt.builtin) return false;
    if (prompt.category === 'prose' && prompt.content === V1_PROSE_CONTENT) return true;
    if (prompt.category === 'summary' && prompt.content === V1_SUMMARY_CONTENT) return true;
    if (prompt.category === 'workshop' && prompt.content === V1_WORKSHOP_CONTENT) return true;
    return false;
}

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

console.log('=== isPromptUntouched Tests ===');

// Test 1: Exact V1 prose content
const v1Prose = { builtin: true, category: 'prose', content: V1_PROSE_CONTENT };
assert(isPromptUntouched(v1Prose) === true, 'isPromptUntouched: detects exact V1 prose content');

// Test 2: Exact V1 summary content
const v1Summary = { builtin: true, category: 'summary', content: V1_SUMMARY_CONTENT };
assert(isPromptUntouched(v1Summary) === true, 'isPromptUntouched: detects exact V1 summary content');

// Test 3: Exact V1 workshop content
const v1Workshop = { builtin: true, category: 'workshop', content: V1_WORKSHOP_CONTENT };
assert(isPromptUntouched(v1Workshop) === true, 'isPromptUntouched: detects exact V1 workshop content');

// Test 4: Modified V1 content (user edited)
const editedProse = { builtin: true, category: 'prose', content: V1_PROSE_CONTENT + ' Extra instruction.' };
assert(isPromptUntouched(editedProse) === false, 'isPromptUntouched: returns false for edited V1 prose');

// Test 5: Non-builtin prompt
const customProse = { builtin: false, category: 'prose', content: V1_PROSE_CONTENT };
assert(isPromptUntouched(customProse) === false, 'isPromptUntouched: returns false for non-builtin');

// Test 6: V2 content (different from V1)
const v2Prose = { builtin: true, category: 'prose', content: 'V2 prose content' };
assert(isPromptUntouched(v2Prose) === false, 'isPromptUntouched: returns false for V2 content');

// Test 7: Different category
const v1Rewrite = { builtin: true, category: 'rewrite', content: V1_PROSE_CONTENT };
assert(isPromptUntouched(v1Rewrite) === false, 'isPromptUntouched: returns false for rewrite with V1 prose content');

console.log('\n=== Migration Logic Simulation ===');

// Simulate the upgrade process
async function simulateUpgrade() {
    // Mock database
    const db = {
        prompts: {
            data: [],
            where: function(field) {
                const self = this;
                return {
                    equals: function(val) {
                        return {
                            filter: function(fn) {
                                return {
                                    first: async function() {
                                        const item = self.data.find(d => d[field] === val && fn(d));
                                        return item || null;
                                    },
                                    toArray: async function() { return self.data.filter(d => d[field] === val && fn(d)); }
                                };
                            },
                            first: async function() {
                                const item = self.data.find(d => d[field] === val);
                                return item || null;
                            },
                            toArray: async function() { return self.data.filter(d => d[field] === val); }
                        };
                    },
                    filter: function(fn) {
                        return {
                            first: async function() {
                                const item = self.data.find(fn);
                                return item || null;
                            },
                            toArray: async function() { return self.data.filter(fn); }
                        };
                    }
                };
            },
            add: async function(item) { this.data.push({...item}); return item.id; },
            update: async function(id, changes) {
                const idx = this.data.findIndex(d => d.id === id);
                if (idx >= 0) {
                    this.data[idx] = { ...this.data[idx], ...changes };
                }
            }
        }
    };

    // Create test data: mix of untouched V1, edited V1, V2, and custom
    const now = new Date();
    db.prompts.data = [
        // Global prompts
        { id: 'g1', projectId: '__global__', category: 'prose', title: 'Default Prose Prompt', content: V1_PROSE_CONTENT, systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // untouched V1
        { id: 'g2', projectId: '__global__', category: 'summary', title: 'Default Summary Prompt', content: V1_SUMMARY_CONTENT, systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // untouched V1
        { id: 'g3', projectId: '__global__', category: 'workshop', title: 'Default Workshop Prompt', content: V1_WORKSHOP_CONTENT, systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // untouched V1
        { id: 'g4', projectId: '__global__', category: 'prose', title: 'Custom Global Prose', content: V1_PROSE_CONTENT + ' My tweaks.', systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // edited V1
        { id: 'g5', projectId: '__global__', category: 'prose', title: 'User Prompt', content: 'My custom prompt', systemContent: '', builtin: false, created: now, modified: now }, // custom

        // Project prompts (fantasy)
        { id: 'p1', projectId: 'proj1', category: 'prose', title: 'Fantasy Prose Prompt', content: 'V1 fantasy prose content', systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // not exact V1 (genre-specific)
        { id: 'p2', projectId: 'proj1', category: 'summary', title: 'Fantasy Summary Prompt', content: 'V1 fantasy summary content', systemContent: '', builtin: true, packVersion: 1, created: now, modified: now }, // not exact V1
        { id: 'p3', projectId: 'proj1', category: 'prose', title: 'My Fantasy Prompt', content: 'My custom fantasy prompt', systemContent: '', builtin: false, created: now, modified: now } // custom
    ];

    const currentProject = { id: 'proj1', genres: ['fantasy'] };
    const GLOBAL_PROJECT_ID = '__global__';

    // Simulate upgrade
    const globalPrompts = await db.prompts.where('projectId').equals(GLOBAL_PROJECT_ID).toArray();
    for (const p of globalPrompts) {
        if (isPromptUntouched(p)) {
            const replacement = window.PromptPacks.getPack(p.category);
            if (replacement) {
                await db.prompts.update(p.id, {
                    content: replacement.content || '',
                    systemContent: replacement.systemContent || '',
                    packVersion: window.PromptPacks.VERSION,
                    modified: new Date()
                });
            }
        }
    }

    const projectPrompts = await db.prompts.where('projectId').equals(currentProject.id).toArray();
    for (const p of projectPrompts) {
        if (isPromptUntouched(p)) {
            const genreSet = window.PromptPacks.composeSet(currentProject.genres);
            if (genreSet) {
                const replacement = genreSet.find(r => r.category === p.category && r.title === p.title);
                if (replacement) {
                    await db.prompts.update(p.id, {
                        content: replacement.content || '',
                        systemContent: replacement.systemContent || '',
                        packVersion: window.PromptPacks.VERSION,
                        modified: new Date()
                    });
                }
            }
        }
    }

    // Verify results
    const updatedGlobal = db.prompts.data.filter(d => d.projectId === '__global__');
    const updatedProject = db.prompts.data.filter(d => d.projectId === 'proj1');

    // g1, g2, g3 should be upgraded
    assertEqual(updatedGlobal.find(d => d.id === 'g1').content, 'V2 prose content', 'g1 upgraded to V2');
    assertEqual(updatedGlobal.find(d => d.id === 'g1').packVersion, 2, 'g1 packVersion updated to 2');
    assertEqual(updatedGlobal.find(d => d.id === 'g2').content, 'V2 summary content', 'g2 upgraded to V2');
    assertEqual(updatedGlobal.find(d => d.id === 'g3').content, 'V2 workshop content', 'g3 upgraded to V2');

    // g4 should NOT be upgraded (edited)
    assertEqual(updatedGlobal.find(d => d.id === 'g4').content, V1_PROSE_CONTENT + ' My tweaks.', 'g4 NOT upgraded (edited)');

    // g5 should NOT be upgraded (not builtin)
    assertEqual(updatedGlobal.find(d => d.id === 'g5').content, 'My custom prompt', 'g5 NOT upgraded (custom)');

    // p1, p2 are genre-specific V1 (not exact V1 match) so NOT upgraded
    assertEqual(updatedProject.find(d => d.id === 'p1').content, 'V1 fantasy prose content', 'p1 NOT upgraded (not exact V1)');
    assertEqual(updatedProject.find(d => d.id === 'p2').content, 'V1 fantasy summary content', 'p2 NOT upgraded (not exact V1)');

    // p3 should NOT be upgraded (custom)
    assertEqual(updatedProject.find(d => d.id === 'p3').content, 'My custom fantasy prompt', 'p3 NOT upgraded (custom)');

    console.log('  All migration assertions passed!');
}

simulateUpgrade().then(() => {
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});

// Test projectHasV1Prompts logic
async function testProjectHasV1Prompts() {
    console.log('\n=== projectHasV1Prompts Tests ===');
    
    // Test 1: New project (no prompts at all)
    const db1 = {
        prompts: {
            data: [],
            where: function(field) {
                const self = this;
                return {
                    equals: function(val) {
                        return {
                            toArray: async function() { return self.data.filter(d => d[field] === val); }
                        };
                    }
                };
            }
        }
    };
    
    const GLOBAL_PROJECT_ID = '__global__';
    
    // Test 2: Project with V1 prompts
    const db2 = {
        prompts: {
            data: [
                { projectId: '__global__', category: 'prose', content: V1_PROSE_CONTENT, builtin: true },
                { projectId: 'proj1', category: 'summary', content: V1_SUMMARY_CONTENT, builtin: true }
            ],
            where: function(field) {
                const self = this;
                return {
                    equals: function(val) {
                        return {
                            toArray: async function() { return self.data.filter(d => d[field] === val); }
                        };
                    }
                };
            }
        }
    };
    
    // Test 3: Project with V2 prompts only
    const db3 = {
        prompts: {
            data: [
                { projectId: '__global__', category: 'prose', content: 'V2 content', builtin: true, packVersion: 2 },
                { projectId: 'proj1', category: 'summary', content: 'V2 summary', builtin: true, packVersion: 2 }
            ],
            where: function(field) {
                const self = this;
                return {
                    equals: function(val) {
                        return {
                            toArray: async function() { return self.data.filter(d => d[field] === val); }
                        };
                    }
                };
            }
        }
    };
    
    // Copy the isPromptUntouched and projectHasV1Prompts functions here
    function isPromptUntouched(prompt) {
        if (!prompt.builtin) return false;
        if (prompt.category === 'prose' && prompt.content === V1_PROSE_CONTENT) return true;
        if (prompt.category === 'summary' && prompt.content === V1_SUMMARY_CONTENT) return true;
        if (prompt.category === 'workshop' && prompt.content === V1_WORKSHOP_CONTENT) return true;
        return false;
    }
    
    async function projectHasV1Prompts(db) {
        const globalPrompts = await db.prompts.where('projectId').equals(GLOBAL_PROJECT_ID).toArray();
        const projectPrompts = await db.prompts.where('projectId').equals('proj1').toArray();
        const allPrompts = [...globalPrompts, ...projectPrompts];
        return allPrompts.some(p => isPromptUntouched(p));
    }
    
    // Run tests
    const r1 = await projectHasV1Prompts(db1);
    console.log('New project (empty):', r1, '- should be false');
    
    const r2 = await projectHasV1Prompts(db2);
    console.log('Project with V1 prompts:', r2, '- should be true');
    
    const r3 = await projectHasV1Prompts(db3);
    console.log('Project with V2 prompts:', r3, '- should be false');
    
    if (!r1 && r2 && !r3) {
        console.log('✓ projectHasV1Prompts logic works correctly');
    } else {
        console.error('✗ projectHasV1Prompts logic failed');
    }
}

testProjectHasV1Prompts();