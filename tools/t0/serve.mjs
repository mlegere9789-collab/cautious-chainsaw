#!/usr/bin/env node
// Static file server for built trains and tests.  Netlify-like: pretty URLs (/x -> x.html), 404.html with a 404 status, and the
// caching headers of legacy/dist/netlify.toml (assets immutable, html no-cache, sw.js no-store) so service-worker and HTTP-cache
// behaviour in tests resembles production.  Binds 127.0.0.1 only.
//
//   node tools/t0/serve.mjs [dir=release/R0/dist] [port=8300] [--no-store]
//
// As a module: import { createStaticServer } from './serve.mjs'  ->  {url, port, setRoot(dir), setOverrides({'/sw.js': file}), setBlocked(['/assets/x.js']) (answer 404), requests, close()}
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.toml': 'text/plain; charset=utf-8',
};

function cacheControl(p, mode) {
  if (mode === 'no-store') return 'no-store';
  if (p === '/sw.js') return 'no-cache, no-store, must-revalidate';
  if (p.startsWith('/assets/') || p.startsWith('/icons/')) return 'public, max-age=31536000, immutable';
  if (p.startsWith('/data/') || p === '/manifest.json') return 'public, max-age=3600';
  if (p === '/' || p.endsWith('.html') || !path.extname(p)) return 'no-cache, must-revalidate';
  return 'public, max-age=0, must-revalidate';
}

export function createStaticServer({ root, port = 0, host = '127.0.0.1', cache = 'netlify', overrides = {} } = {}) {
  let rootDir = path.resolve(root);
  let over = { ...overrides };
  let blocked = new Set();
  const requests = [];
  const resolveFile = (p) => {
    if (over[p]) return { file: path.resolve(over[p]), status: 200 };
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    const base = path.resolve(rootDir, rel);
    if (base !== rootDir && !base.startsWith(rootDir + path.sep)) return { status: 403 };
    for (const f of [base, base + '.html', path.join(base, 'index.html')]) {
      try { if (fs.statSync(f).isFile()) return { file: f, status: 200 }; } catch { /* next */ }
    }
    const nf = path.join(rootDir, '404.html');
    return fs.existsSync(nf) ? { file: nf, status: 404 } : { status: 404 };
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = decodeURIComponent(u.pathname);
    const r = blocked.has(p) ? { status: 404 } : resolveFile(p);
    requests.push({ t: Date.now(), method: req.method, path: p, status: r.status, dest: req.headers['sec-fetch-dest'] || '' });
    if (!r.file) { res.writeHead(r.status, { 'content-type': 'text/plain' }); return res.end(String(r.status)); }
    const body = fs.readFileSync(r.file);
    res.writeHead(r.status, {
      'content-type': TYPES[path.extname(r.file).toLowerCase()] || 'application/octet-stream',
      'content-length': body.length, 'cache-control': r.status === 200 ? cacheControl(p, cache) : 'no-store',
      'x-content-type-options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        server, port: actual, url: `http://${host}:${actual}`, requests,
        get root() { return rootDir; },
        setRoot(dir) { rootDir = path.resolve(dir); },
        setOverrides(o) { over = { ...o }; },
        setBlocked(list) { blocked = new Set(list); },
        close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dir = path.resolve(REPO, argv[0] || 'release/R0/dist');
  const port = Number(argv[1] || 8300);
  if (!fs.existsSync(dir)) { console.error(`not found: ${dir} (build it first: python tools/t0/build.py --train R0)`); process.exit(2); }
  const s = await createStaticServer({ root: dir, port, cache: process.argv.includes('--no-store') ? 'no-store' : 'netlify' });
  console.log(`serving ${path.relative(REPO, dir) || '.'} at ${s.url}  (Ctrl+C to stop)`);
}
