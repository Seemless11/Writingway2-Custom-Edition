/**
 * method-coverage.js — every `this.foo()` call inside src/app.js or src/app/*.js must
 * resolve to a method defined on the Alpine app component.
 *
 * handler-coverage.js guards names referenced from HTML. This guard covers calls made
 * from JavaScript: if a method is moved to the wrong module, renamed, or dropped, the
 * button still renders and the template still resolves, but the call fails at runtime.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const espree = require('espree');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'src', 'app.js');
const MODULE_DIR = path.join(ROOT, 'src', 'app');

const parse = (src) => espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true });

function appObject(src) {
    let objectExpr = null;
    const walk = (n) => {
        if (!n || typeof n !== 'object' || objectExpr) return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
            n.callee.object.name === 'Alpine' && n.callee.property.name === 'data' &&
            n.arguments[0] && n.arguments[0].value === 'app') {
            const find = (x) => {
                if (!x || typeof x !== 'object' || objectExpr) return;
                if (Array.isArray(x)) { x.forEach(find); return; }
                if (x.type === 'ReturnStatement' && x.argument && x.argument.type === 'ObjectExpression') {
                    objectExpr = x.argument; return;
                }
                for (const k of Object.keys(x)) if (k !== 'parent') find(x[k]);
            };
            find(n.arguments[1]);
            return;
        }
        for (const k of Object.keys(n)) if (k !== 'parent') walk(n[k]);
    };
    walk(parse(src));
    if (!objectExpr) throw new Error('Alpine.data app object not found in src/app.js');
    return objectExpr;
}

function methodsObject(src, file) {
    let objectExpr = null;
    const walk = (n) => {
        if (!n || typeof n !== 'object' || objectExpr) return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
            n.callee.object.name === 'Object' && n.callee.property.name === 'assign' &&
            n.arguments[0] && n.arguments[0].type === 'MemberExpression' &&
            n.arguments[0].object.name === 'window' && n.arguments[0].property.name === 'AppMethods' &&
            n.arguments[1] && n.arguments[1].type === 'ObjectExpression') {
            objectExpr = n.arguments[1];
            return;
        }
        for (const k of Object.keys(n)) if (k !== 'parent') walk(n[k]);
    };
    walk(parse(src));
    if (!objectExpr) throw new Error('Object.assign(window.AppMethods, {...}) not found in ' + file);
    return objectExpr;
}

const propName = (p) => (p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
const isFunctionProp = (p) =>
    p.kind === 'init' &&
    (p.method || (p.value && (p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression')));

function collectDefined(objectExpr, defined) {
    for (const p of objectExpr.properties) {
        if (p.type !== 'Property') continue;
        if (isFunctionProp(p)) {
            const name = propName(p);
            if (!defined.has(name)) defined.set(name, []);
            defined.get(name).push(p);
        }
    }
}

function collectCalls(src, file, calls) {
    const seen = new Set();
    const visit = (n) => {
        if (!n || typeof n !== 'object' || seen.has(n)) return;
        seen.add(n);
        if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
            n.callee.object.type === 'ThisExpression' &&
            !n.callee.computed && n.callee.property.type === 'Identifier') {
            calls.push({ name: n.callee.property.name, file, line: n.loc.start.line });
        }
        for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k]);
    };
    visit(parse(src));
}

const defined = new Map();
const calls = [];
const files = [APP];
for (const f of fs.readdirSync(MODULE_DIR).filter(f => f.endsWith('.js'))) {
    files.push(path.join(MODULE_DIR, f));
}

const appSrc = fs.readFileSync(APP, 'utf8');
collectDefined(appObject(appSrc), defined);
collectCalls(appSrc, 'src/app.js', calls);

for (const file of files.slice(1)) {
    const src = fs.readFileSync(file, 'utf8');
    collectDefined(methodsObject(src, file), defined);
    collectCalls(src, 'src/app/' + path.basename(file), calls);
}

const IGNORED = new Set([
    '$nextTick', '$watch', '$dispatch', '$root', '$data', '$refs', '$el',
    'console', 'window', 'document', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'requestAnimationFrame', 'fetch',
    'JSON', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'
]);

const missing = new Map();
for (const call of calls) {
    if (IGNORED.has(call.name)) continue;
    if (defined.has(call.name)) continue;
    if (!missing.has(call.name)) missing.set(call.name, []);
    const list = missing.get(call.name);
    if (list.length < 3) list.push(call.file + ':' + call.line);
}

if (missing.size > 0) {
    console.error('method-coverage: ' + missing.size + ' this.<name>() call(s) resolve to no defined method:');
    for (const [name, where] of missing) console.error('  this.' + name + '()  <- ' + where.join(', '));
    process.exit(1);
}

console.log('method-coverage passed: ' + calls.length + ' this.*() calls across ' + files.length +
    ' files resolve to ' + defined.size + ' defined methods.');
