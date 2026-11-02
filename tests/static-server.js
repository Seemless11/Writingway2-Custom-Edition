const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.cwd();
const port = parseInt(process.argv[3] || '8010', 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

// The real backend (tools/writingway-server.py) answers these. Stub them so
// tests can boot the app over plain HTTP without Python, and without the
// console noise of three guaranteed 404s.
const API_STUBS = {
    '/api/runtime-info': {
        ok: true,
        platform: 'test',
        arch: 'x64',
        hasGGUFModels: false,
        ggufModels: [],
        hasLlamaServer: false,
        llamaServerPath: '',
        localAIAvailable: false,
        llamaSetupRecommended: false,
        llamaInstallChoices: []
    },
    '/api/list-snapshots': { ok: true, snapshots: [] },
    '/api/library': { ok: true, projects: [] },
    '/api/secrets': { ok: true, secrets: {} }
};

http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/main.html';

    if (Object.prototype.hasOwnProperty.call(API_STUBS, p)) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(API_STUBS[p]));
        return;
    }
    if (p === '/api/secrets' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    const full = path.join(root, p);
    if (!full.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(full, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
    });
}).listen(port, () => console.log('serving ' + root + ' on http://localhost:' + port));
