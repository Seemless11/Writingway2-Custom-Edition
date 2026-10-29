// Rebuilds the newest full-database snapshot in project-backups/all/ from the
// newest per-project backups on disk, so the in-app auto-restore can recover
// every project (not just the ones in the latest browser-side snapshot).
//
// Usage: node tools/rebuild-snapshot.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT, 'project-backups');
const ALL_DIR = path.join(BACKUPS_DIR, 'all');
const PROJECTS_DIR = path.join(ROOT, 'projects');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const timeOf = (s) => s.localBackupSavedAt || s.filesystemSavedAt || s.exportedAt || '';
const wordCount = (t) => (t && t.trim()) ? (t.trim().match(/\S+/g) || []).length : 0;

function normalize(snap) {
    const t = snap.tables || {};
    const sceneContents = {};
    for (const row of t.content || []) sceneContents[row.sceneId] = row.text || '';
    return {
        project: snap.project || (t.projects || [])[0] || null,
        chapters: snap.chapters || t.chapters || [],
        scenes: snap.scenes || t.scenes || [],
        sceneContents: snap.sceneContents || sceneContents,
        compendium: snap.compendium || t.compendium || [],
        prompts: snap.prompts || t.prompts || [],
        codex: snap.codex || t.codex || [],
        promptHistory: snap.promptHistory || t.promptHistory || [],
        workshopSessions: snap.workshopSessions || t.workshopSessions || []
    };
}

// 1. Collect the newest backup per project id (per-project folders + projects/ exports).
const candidates = new Map(); // id -> { snap, source }
function addCandidate(id, snap, source) {
    const t = timeOf(snap);
    const cur = candidates.get(id);
    if (!cur || t > cur.time) candidates.set(id, { snap, time: t, source });
}

for (const dirName of fs.readdirSync(BACKUPS_DIR)) {
    const dir = path.join(BACKUPS_DIR, dirName);
    if (dirName === 'all' || !fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    if (!files.length) continue;
    const file = path.join(dir, files[files.length - 1]);
    try {
        const snap = readJson(file);
        const id = snap.project && String(snap.project.id);
        if (id) addCandidate(id, snap, file);
    } catch (e) {
        console.warn('skip', dirName, e.message);
    }
}

for (const f of fs.readdirSync(PROJECTS_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
        const snap = readJson(path.join(PROJECTS_DIR, f));
        const id = snap.project && String(snap.project.id);
        if (id) addCandidate(id, snap, path.join(PROJECTS_DIR, f));
    } catch (e) {
        console.warn('skip projects/', f, e.message);
    }
}

// 2. Newest existing full snapshot. Its per-project rows are preferred because
//    they may be newer than the per-project backups (e.g. the last active project).
const allFiles = fs.existsSync(ALL_DIR)
    ? fs.readdirSync(ALL_DIR).filter((f) => f.endsWith('--all.json')).sort()
    : [];
const newestAll = allFiles.length ? readJson(path.join(ALL_DIR, allFiles[allFiles.length - 1])) : null;

const tables = {
    projects: [], chapters: [], scenes: [], content: [],
    compendium: [], prompts: [], codex: [], promptHistory: [],
    workshopSessions: [], settings: []
};

const seenProjects = new Set();
const seenIds = new Set();
const seenContent = new Set();

function pushRow(table, row) {
    const key = row && row.id != null ? row.id : (row && row.sceneId != null ? row.sceneId : null);
    if (table === tables.content) {
        if (seenContent.has(row.sceneId)) return;
        seenContent.add(row.sceneId);
    } else if (key != null) {
        if (seenIds.has(key)) return;
        seenIds.add(key);
    }
    table.push(row);
}

// opts.filter: restrict rows to this project id (for the merged full-snapshot source).
// opts.project: the project row to push (the full-snapshot source has no top-level project).
function addProject(id, snap, opts = {}) {
    if (seenProjects.has(id)) return;
    seenProjects.add(id);

    const filter = opts.filter ? (r) => r && String(r.projectId) === String(id) : null;
    const pick = (rows) => filter ? (rows || []).filter(filter) : (rows || []);

    const projRow = opts.project || snap.project;
    if (projRow) pushRow(tables.projects, projRow);

    const chapters = pick(snap.chapters);
    const scenes = pick(snap.scenes);
    for (const row of chapters) pushRow(tables.chapters, row);
    for (const row of scenes) pushRow(tables.scenes, row);

    const sceneIds = new Set(scenes.map((s) => String(s.id)));
    const contents = snap.sceneContents || {};
    for (const s of scenes) {
        const sid = String(s.id);
        const text = contents[sid] != null ? String(contents[sid]) : '';
        pushRow(tables.content, { sceneId: sid, text, wordCount: wordCount(text) });
    }

    for (const row of pick(snap.compendium)) pushRow(tables.compendium, row);
    for (const row of pick(snap.prompts)) pushRow(tables.prompts, row);
    for (const row of pick(snap.codex)) pushRow(tables.codex, row);
    for (const row of pick(snap.promptHistory)) pushRow(tables.promptHistory, row);
    for (const row of pick(snap.workshopSessions)) pushRow(tables.workshopSessions, row);
}

// Projects present in the newest full snapshot first (their data is newest).
if (newestAll) {
    const snap = normalize(newestAll);
    for (const p of newestAll.tables.projects || []) {
        const id = String(p.id);
        if (!seenProjects.has(id)) addProject(id, snap, { project: p, filter: true });
    }
}

// Then every project from the per-project backups.
for (const [id, cand] of candidates) {
    if (!seenProjects.has(id)) addProject(id, normalize(cand.snap));
}

tables.projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

const payload = {
    version: '2.1-full',
    exportedAt: new Date().toISOString(),
    snapshotSavedAt: new Date().toISOString(),
    snapshotVersion: 1,
    tables
};

// 3. Filename newer than all existing snapshots (server naming convention).
//    One hour ahead of now so freshly written browser snapshots don't push it
//    out of the auto-restore pick while the user recovers.
function snapName(d) {
    const s = d.toISOString().replace('+00:00', 'Z').replace(/:/g, '-').replace(/\./g, '-');
    return `${s}--all.json`;
}

let name = snapName(new Date(Date.now() + 3600 * 1000));
while (allFiles.length && name <= allFiles[allFiles.length - 1]) {
    name = snapName(new Date(Date.now() + 3600 * 1000 + 60000));
}

const target = path.join(ALL_DIR, name);
fs.mkdirSync(ALL_DIR, { recursive: true });
fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');

const counts = {};
for (const [k, v] of Object.entries(tables)) counts[k] = v.length;
console.log('Wrote', path.relative(ROOT, target));
console.log('Projects:', tables.projects.map((p) => `${p.name} (${p.id})`).join(', '));
console.log('Counts:', JSON.stringify(counts));