#!/usr/bin/env node
// Local preview of the candidate pages (trust pages, user guide). Serves one or more candidate folders and, for the shared assets
// every sub-page of the site links (/site-nav.css, /site-nav.js, /icons.svg) and for /privacy.html and /terms.html, the files of
// release train R1c computed in memory from baseline/dist plus the patches (nothing is read from or written to release/).
//
//   node tools/copy/preview-server.mjs [--port 9101] [--dir candidates/trust-pages] [--dir candidates/user-guide] [--train R1c]
// Pages are available with and without their .html extension. 127.0.0.1 only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO } from './lib/lint.mjs';
import { applyTarget } from '../guide/lib/t0src.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' };

export function sharedAsset(url, train = 'R1c') {
  const base = (f) => fs.readFileSync(path.join(REPO, 'baseline', 'dist', f), 'utf8');
  if (url === '/site-nav.css') return { type: TYPES['.css'], body: applyTarget({ root: REPO, train, target: 'site-nav.css', text: base('site-nav.css') }).text };
  if (url === '/site-nav.js') return { type: TYPES['.js'], body: applyTarget({ root: REPO, train, target: 'site-nav.js', text: base('site-nav.js') }).text };
  if (url === '/icons.svg') return { type: TYPES['.svg'], body: base('icons.svg') };
  if (url === '/privacy.html' || url === '/terms.html') return { type: TYPES['.html'], body: base(url.slice(1)) };
  return null;
}

export function createServer({ dirs, train = 'R1c' }) {
  const cache = new Map();
  return http.createServer((req, res) => {
    try {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url.endsWith('/')) url += 'index.html';
      for (const d of dirs) {
        for (const cand of [url, `${url}.html`]) {
          const p = path.join(d, cand);
          if (p.startsWith(d) && fs.existsSync(p) && fs.statSync(p).isFile()) {
            res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
            return res.end(fs.readFileSync(p));
          }
        }
      }
      if (!cache.has(url)) cache.set(url, sharedAsset(url, train));
      const a = cache.get(url);
      if (a) { res.writeHead(200, { 'content-type': a.type, 'cache-control': 'no-store' }); return res.end(a.body); }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(e.message)); }
  });
}

export function listen(server, port) {
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server.address().port)); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const get = (n) => argv.flatMap((a, i) => (a === `--${n}` ? [argv[i + 1]] : []));
  const dirs = (get('dir').length ? get('dir') : ['candidates/trust-pages']).map((d) => path.resolve(REPO, d));
  const port = Number(get('port')[0] ?? 9101);
  const server = createServer({ dirs, train: get('train')[0] ?? 'R1c' });
  listen(server, port).then((p) => console.log(`preview on http://127.0.0.1:${p}/ serving ${dirs.map((d) => path.relative(REPO, d)).join(', ')}`));
}
