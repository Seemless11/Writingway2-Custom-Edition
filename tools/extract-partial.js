#!/usr/bin/env node
/**
 * extract-partial.js — move the first N lines of a view partial into a new partial,
 * then verify that main.html is still byte-identical.
 *
 * Usage:
 *   node tools/extract-partial.js <sourceRel> <outRel> <lineCount>
 *   node tools/extract-partial.js --split <sourceRel> <outRelA> <lineCountA>
 *
 * Paths are relative to src/views.
 *
 * The cut is a raw text slice: no parsing, no reindentation, no EOL conversion.
 * The manifest entry for <sourceRel> is replaced by <outRel> followed by <sourceRel>,
 * so output order (and therefore main.html) never changes. If the source is left
 * empty it is removed from the manifest and from disk.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'src', 'views');
const MANIFEST_PATH = path.join(VIEWS, 'manifest.json');
const BUILD = path.join(ROOT, 'tools', 'build-html.js');

function fail(message) {
    console.error('extract-partial: ' + message);
    process.exit(1);
}

function splitLines(text) {
    const lines = [];
    let i = 0;
    while (i < text.length) {
        const j = text.indexOf('\n', i);
        if (j === -1) {
            lines.push(text.slice(i));
            break;
        }
        lines.push(text.slice(i, j + 1));
        i = j + 1;
    }
    return lines;
}

function main() {
    const args = process.argv.slice(2);
    const splitMode = args[0] === '--split';
    if (splitMode) args.shift();

    if (args.length !== 3) {
        fail('usage: extract-partial.js [--split] <sourceRel> <outRel> <lineCount>');
    }

    const [sourceRel, outRel, countText] = args;
    const count = parseInt(countText, 10);
    if (!Number.isInteger(count) || count <= 0) fail('lineCount must be a positive integer');

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const index = manifest.partials.indexOf(sourceRel);
    if (index === -1) fail('not in manifest: ' + sourceRel);
    if (manifest.partials.includes(outRel)) fail('already in manifest: ' + outRel);

    const sourcePath = path.join(VIEWS, sourceRel);
    const outPath = path.join(VIEWS, outRel);
    if (!fs.existsSync(sourcePath)) fail('missing partial: ' + sourceRel);
    if (fs.existsSync(outPath)) fail('output already exists: ' + outRel);

    const text = fs.readFileSync(sourcePath, 'utf8');
    const lines = splitLines(text);
    if (count > lines.length) fail('lineCount ' + count + ' exceeds ' + lines.length + ' lines in ' + sourceRel);

    const head = lines.slice(0, count).join('');
    const tail = lines.slice(count).join('');

    if (!head.endsWith('\n')) fail('cut would not end on a line boundary');

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, head);

    if (tail.length === 0) {
        if (!splitMode) fail('source would be empty; re-run with --split if that is intended');
        fs.rmSync(sourcePath);
        manifest.partials.splice(index, 1, outRel);
    } else {
        fs.writeFileSync(sourcePath, tail);
        manifest.partials.splice(index, 1, outRel, sourceRel);
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

    console.log('extract-partial: ' + sourceRel + ' -> ' + outRel + ' (' + count + ' lines)' +
        (tail.length === 0 ? '; source removed' : '; ' + (lines.length - count) + ' lines left'));

    try {
        execFileSync(process.execPath, [BUILD, '--check'], { stdio: 'inherit' });
    } catch (err) {
        fail('build check failed after extraction — output changed, extraction is lossy');
    }
}

main();
