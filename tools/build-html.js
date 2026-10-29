#!/usr/bin/env node
/**
 * build-html.js — assemble main.html from src/views partials.
 *
 * Usage:
 *   node tools/build-html.js            write main.html from the manifest
 *   node tools/build-html.js --check    verify main.html matches the manifest (exit 1 on drift)
 *
 * Contract:
 *   - Partials are concatenated in manifest order with no separator.
 *   - Line endings are normalized to LF for comparison, then emitted as manifest.eol.
 *   - Every partial must end with exactly one newline (or be empty).
 *   - The assembled output is scanned for duplicate element ids.
 *
 * The committed main.html is the shipped artifact. Partials are source only.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(ROOT, 'src', 'views');
const MANIFEST_PATH = path.join(VIEWS_DIR, 'manifest.json');

function fail(message) {
    console.error('build-html: ' + message);
    process.exit(2);
}

function readManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        fail('manifest not found at ' + path.relative(ROOT, MANIFEST_PATH));
    }
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (err) {
        fail('manifest is not valid JSON: ' + err.message);
    }
    if (!manifest || !Array.isArray(manifest.partials) || manifest.partials.length === 0) {
        fail('manifest.partials must be a non-empty array');
    }
    const eol = manifest.eol || 'crlf';
    if (eol !== 'crlf' && eol !== 'lf') {
        fail('manifest.eol must be "crlf" or "lf"');
    }
    return {
        output: manifest.output || 'main.html',
        eol,
        partials: manifest.partials.map((entry, index) => {
            const rel = typeof entry === 'string' ? entry : entry && entry.file;
            if (!rel || typeof rel !== 'string') {
                fail('manifest.partials[' + index + '] must be a file path');
            }
            const abs = path.join(VIEWS_DIR, rel);
            if (!abs.startsWith(VIEWS_DIR)) {
                fail('partial escapes src/views: ' + rel);
            }
            if (!fs.existsSync(abs)) {
                fail('missing partial: src/views/' + rel);
            }
            return { rel, abs };
        })
    };
}

function normalize(text, rel) {
    if (text.indexOf('\r') !== -1) {
        // Only \r\n is allowed; a lone \r would silently corrupt output.
        const stripped = text.replace(/\r\n/g, '');
        if (stripped.indexOf('\r') !== -1) {
            fail('bare carriage return in partial: ' + rel);
        }
    }
    return text.replace(/\r\n/g, '\n');
}

function assemble(manifest) {
    const chunks = [];
    for (const partial of manifest.partials) {
        const raw = fs.readFileSync(partial.abs, 'utf8');
        const text = normalize(raw, partial.rel);
        if (text.length > 0 && !text.endsWith('\n')) {
            fail('partial must end with a newline: src/views/' + partial.rel);
        }
        chunks.push(text);
    }
    const normalized = chunks.join('');
    const output = manifest.eol === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized;
    return { normalized, output };
}

function findDuplicateIds(text) {
    const seen = new Map();
    const dupes = [];
    const re = /\sid=["']([A-Za-z0-9_:.-]+)["']/g;
    let match;
    while ((match = re.exec(text)) !== null) {
        const id = match[1];
        const count = (seen.get(id) || 0) + 1;
        seen.set(id, count);
        if (count === 2) dupes.push(id);
    }
    return dupes;
}

function firstDifference(expected, actual) {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const max = Math.max(expectedLines.length, actualLines.length);
    for (let i = 0; i < max; i++) {
        if (expectedLines[i] !== actualLines[i]) {
            return {
                line: i + 1,
                expected: expectedLines[i] === undefined ? '<end of file>' : expectedLines[i],
                actual: actualLines[i] === undefined ? '<end of file>' : actualLines[i]
            };
        }
    }
    return null;
}

function main() {
    const args = process.argv.slice(2);
    const check = args.includes('--check');
    const manifest = readManifest();
    const { normalized, output } = assemble(manifest);
    const outputPath = path.join(ROOT, manifest.output);

    const dupes = findDuplicateIds(normalized);
    if (dupes.length > 0) {
        fail('duplicate element ids: ' + dupes.join(', '));
    }

    const stats = manifest.partials.length + ' partials, ' +
        normalized.split('\n').length + ' lines, ' +
        Buffer.byteLength(normalized) + ' bytes';

    if (check) {
        if (!fs.existsSync(outputPath)) {
            fail(manifest.output + ' does not exist; run without --check to generate it');
        }
        const committed = normalize(fs.readFileSync(outputPath, 'utf8'), manifest.output);
        if (committed === normalized) {
            console.log('build-html: OK (' + stats + ')');
            return;
        }
        const diff = firstDifference(committed, normalized);
        if (diff) {
            console.error('build-html: ' + manifest.output + ' is out of date');
            console.error('  first difference at line ' + diff.line);
            console.error('  committed: ' + JSON.stringify(diff.expected.slice(0, 200)));
            console.error('  rebuilt:   ' + JSON.stringify(diff.actual.slice(0, 200)));
        } else {
            console.error('build-html: ' + manifest.output + ' differs (EOL only)');
        }
        process.exit(1);
    }

    fs.writeFileSync(outputPath, output);
    console.log('build-html: wrote ' + manifest.output + ' (' + stats + ')');
}

main();
