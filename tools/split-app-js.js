#!/usr/bin/env node
/**
 * split-app-js.js — move one module's methods out of src/app.js into src/app/<module>.js.
 *
 * Usage:
 *   node tools/split-app-js.js <module> [--no-check]
 *
 * The member list comes from tools/app-module-map.json. Extraction is a raw line slice:
 * the method text (including its original indentation) is copied verbatim into the module
 * file and deleted from app.js. Indentation is never changed because a method may contain
 * a multi-line template literal whose contents include that leading whitespace.
 *
 * A `//` comment directly above a method (no blank line between) travels with it, so
 * app.js is not left full of dangling descriptions.
 *
 * Guards, in order:
 *   - every listed member must exist exactly once in app.js
 *   - node --check on both files
 *   - the union of app.js + all module files must still contain every original member
 *   - npm run build
 *   - tests/handler-coverage.js (unless --no-check)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const espree = require('espree');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'src', 'app.js');
const MODULE_DIR = path.join(ROOT, 'src', 'app');
const MAP_PATH = path.join(ROOT, 'tools', 'app-module-map.json');

function fail(msg) {
    console.error('split-app-js: ' + msg);
    process.exit(1);
}

function readAppObject(src) {
    const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true });
    let objectExpr = null;
    const walk = (node) => {
        if (!node || typeof node !== 'object' || objectExpr) return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'Alpine' && node.callee.property.name === 'data' &&
            node.arguments[0] && node.arguments[0].value === 'app') {
            const findReturn = (n) => {
                if (!n || typeof n !== 'object' || objectExpr) return;
                if (Array.isArray(n)) { n.forEach(findReturn); return; }
                if (n.type === 'ReturnStatement' && n.argument && n.argument.type === 'ObjectExpression') {
                    objectExpr = n.argument;
                    return;
                }
                for (const k of Object.keys(n)) { if (k !== 'parent') findReturn(n[k]); }
            };
            findReturn(node.arguments[1]);
            return;
        }
        for (const k of Object.keys(node)) { if (k !== 'parent') walk(node[k]); }
    };
    walk(ast);
    if (!objectExpr) throw new Error('app object literal not found');
    return objectExpr;
}

function methodNames(file) {
    const src = fs.readFileSync(file, 'utf8');
    const ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true });
    const names = [];
    const seen = new Set();
    const visit = (node) => {
        if (!node || typeof node !== 'object' || seen.has(node)) return;
        seen.add(node);
        if (node.type === 'ObjectExpression' && node.properties) {
            for (const p of node.properties) {
                if (p.type === 'Property' && p.kind === 'init' &&
                    (p.method || (p.value && (p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression')))) {
                    names.push(p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
                }
            }
        }
        for (const k of Object.keys(node)) { if (k !== 'parent') visit(node[k]); }
    };
    visit(ast);
    return names;
}

const indentOf = (line) => line.match(/^[ \t]*/)[0];

/**
 * Walk upward from `start` and include a contiguous comment block that belongs to the
 * property: either `//` lines at the same indentation, or a `/* ... *​/` block ending on
 * the line directly above. Stops at a blank line.
 */
function commentStart(lines, start, propertyIndent) {
    let i = start;
    while (i > 0) {
        const prev = lines[i - 1];
        const trimmed = prev.trim();
        if (trimmed === '') break;
        if (indentOf(prev) !== propertyIndent) break;

        if (trimmed.startsWith('//')) {
            i--;
            continue;
        }
        if (trimmed.endsWith('*/')) {
            let j = i - 1;
            while (j >= 0 && !lines[j].trim().startsWith('/*')) j--;
            if (j < 0) break;
            i = j;
            continue;
        }
        break;
    }
    return i;
}

function main() {
    const args = process.argv.slice(2);
    const noCheck = args.includes('--no-check');
    const name = args.find(a => !a.startsWith('--'));
    if (!name) fail('usage: split-app-js.js <module> [--no-check]');

    const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
    const mod = map.modules.find(m => m.name === name);
    if (!mod) fail('unknown module: ' + name + ' (known: ' + map.modules.map(m => m.name).join(', ') + ')');

    const src = fs.readFileSync(APP, 'utf8');
    const lines = src.split(/(?<=\n)/);

    if (!lines.every(l => l === '' || l.endsWith('\n'))) fail('unexpected line endings');

    const objectExpr = readAppObject(src);
    const byName = new Map();
    for (const p of objectExpr.properties) {
        if (p.type !== 'Property') continue;
        const propName = p.key.type === 'Identifier' ? p.key.name : String(p.key.value);
        if (!byName.has(propName)) byName.set(propName, []);
        byName.get(propName).push(p);
    }

    const ranges = [];   // [startLine, endLine] to delete, 0-based inclusive
    const chunks = [];

    for (const member of mod.members) {
        const matches = byName.get(member) || [];
        if (matches.length !== 1) fail('expected exactly 1 definition of ' + member + ', found ' + matches.length);
        const p = matches[0];
        if (p.kind === 'get') fail(member + ' is a getter; getters must stay in app.js');

        const propStart = p.loc.start.line - 1;
        const propEnd = p.loc.end.line - 1;
        const propIndent = indentOf(lines[propStart]);
        if (propIndent.length === 0) fail('unexpected indentation for ' + member);

        const start = commentStart(lines, propStart, propIndent);
        let end = propEnd;

        // Take one trailing blank line with the method so app.js does not accumulate
        // double blanks, but only when the next line is blank and not the last line.
        if (end + 1 < lines.length && lines[end + 1].trim() === '') end++;

        let text = lines.slice(start, propEnd + 1).join('');
        if (!/[},]\s*$/.test(text)) fail('unexpected tail for ' + member + ': ' + JSON.stringify(text.slice(-25)));
        // Normalise a comma-less final property (defensive; should not happen for moved methods).
        text = text.replace(/\}(\s*)$/, '},$1');

        ranges.push([start, end]);
        chunks.push({ name: member, text });
    }

    // Merge overlapping/adjacent deletion ranges.
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of sorted) {
        const last = merged[merged.length - 1];
        if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
        else merged.push([r[0], r[1]]);
    }

    const outLines = [];
    let cursor = 0;
    for (const [from, to] of merged) {
        outLines.push(...lines.slice(cursor, from));
        cursor = to + 1;
    }
    outLines.push(...lines.slice(cursor));
    const out = outLines.join('');

    const modulePath = path.join(MODULE_DIR, name + '.js');
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    const header =
        '/**' + eol +
        ' * ' + name + ' — ' + mod.description + eol +
        ' *' + eol +
        ' * Methods are merged onto the Alpine app component by src/app.js.' + eol +
        ' *' + eol +
        ' * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.' + eol +
        ' */' + eol +
        'window.AppMethods = window.AppMethods || {};' + eol +
        eol +
        'Object.assign(window.AppMethods, {' + eol;

    fs.writeFileSync(APP, out);
    fs.writeFileSync(modulePath, header + chunks.map(c => c.text).join(eol) + '});' + eol);

    // Verify: no method lost, none duplicated across app.js + modules.
    const expected = new Set();
    for (const p of objectExpr.properties) {
        if (p.type === 'Property' && p.kind !== 'get') {
            expected.add(p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
        }
    }
    const found = new Map();
    const add = (n, file) => { if (!found.has(n)) found.set(n, []); found.get(n).push(file); };
    for (const n of methodNames(APP)) add(n, 'app.js');
    const moduleFiles = fs.readdirSync(MODULE_DIR).filter(f => f.endsWith('.js'));
    for (const file of moduleFiles) {
        for (const n of methodNames(path.join(MODULE_DIR, file))) add(n, file);
    }
    const missing = [...expected].filter(n => !found.has(n));
    const dupes = [...found.entries()].filter(([n, files]) => files.length > 1 && expected.has(n));
    if (missing.length) fail('methods lost: ' + missing.join(', '));
    if (dupes.length) fail('methods duplicated: ' + dupes.map(([n, f]) => n + ' (' + f.join('+') + ')').join(', '));

    console.log('split-app-js: ' + name + ' <- ' + chunks.length + ' methods (' +
        chunks.reduce((a, c) => a + (c.text.match(/\n/g) || []).length, 0) + ' lines), ' +
        (src.split(/\r?\n/).length - out.split(/\r?\n/).length) + ' lines removed from app.js');
    console.log('split-app-js: ' + expected.size + ' methods across app.js + ' + moduleFiles.length + ' modules');

    try {
        execFileSync(process.execPath, ['--check', APP], { stdio: 'inherit' });
        execFileSync(process.execPath, ['--check', modulePath], { stdio: 'inherit' });
        execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-html.js')], { stdio: 'inherit' });
        if (!noCheck) {
            execFileSync(process.execPath, [path.join(ROOT, 'tests', 'handler-coverage.js')], { stdio: 'inherit' });
        }
    } catch (err) {
        fail('post-extraction check failed — revert before committing');
    }
}

main();
