#!/usr/bin/env node
// Netlify-like static server that APPLIES a dist's own _headers / _redirects / netlify.toml, so the generated rules can be tested locally.
//
//   node tools/t0/config/emulate.mjs <dist> [port=0] [--merge last|first|join]
//   import { createEmulator } from './emulate.mjs'   -> {url, port, conflicts, requests, reload(), close()}
//
// HONESTY: this is an emulation of the DOCUMENTED Netlify rules (docs.netlify.com: custom headers, redirect options), nothing more.
//   modelled     header rules matched on the path AS REQUESTED (verified live for /dashboard vs /dashboard.html), `*` splat and `:placeholder`,
//                empty header values ignored (verified live: they do not unset), host-based redirects (Host header + X-Forwarded-Proto),
//                `!` force vs file shadowing, `404` status redirects serving /404.html, pretty URLs (/x -> x.html), `_redirects` before toml rules,
//                Netlify's default `Cache-Control: public, max-age=0, must-revalidate` on responses that no rule gives a Cache-Control.
//   NOT known    what Netlify does when TWO rules set the SAME header name (undocumented; forum answers conflict).  The generator proves that
//                never happens; if it does happen here the overlap is recorded in `emulator.conflicts` and the response carries
//                X-Emulator-Conflict so a test can fail loudly.  Also not modelled: edge caching, injected RUM script, `Pretty URLs` link rewriting,
//                header application to redirect responses beyond "same rules as any other response".
//   Netlify's actual matching semantics can only be finally verified on a real deploy or staging (gbg-staging).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadDistConfig, resolveHeaders, findRedirect } from './lib.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.toml': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
};
const NOT_SERVED = new Set(['_headers', '_redirects', 'netlify.toml']);   // Netlify consumes these at deploy time; none of the three is ever served (verified on production: HP-13a, verify-url)

export function createEmulator({ dist, port = 0, host = '127.0.0.1', merge = 'last' } = {}) {
  const root = path.resolve(dist);
  let cfg = loadDistConfig(root);
  const conflicts = [];
  const requests = [];

  const resolveFile = (p) => {
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    const base = path.resolve(root, rel);
    if (base !== root && !base.startsWith(root + path.sep)) return null;
    if (NOT_SERVED.has(rel)) return null;
    for (const f of [base, `${base}.html`, path.join(base, 'index.html')]) {
      try { if (fs.statSync(f).isFile()) return f; } catch { /* next */ }
    }
    return null;
  };

  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let p; try { p = decodeURIComponent(u.pathname); } catch { p = u.pathname; }
    const hostHdr = (req.headers.host || '').toLowerCase();
    const scheme = String(req.headers['x-forwarded-proto'] || 'http').toLowerCase() === 'https' ? 'https' : 'http';
    const log = { method: req.method, path: p, host: hostHdr, scheme };
    requests.push(log);

    const respond = (status, file, extra = {}) => {
      const { headers, conflicts: cf } = resolveHeaders(cfg.headerRules, p, merge);
      const out = {};
      for (const { name, value } of headers.values()) out[name.toLowerCase()] = value;
      if (cf.length) { conflicts.push({ path: p, conflicts: cf }); out['x-emulator-conflict'] = cf.map((c) => c.name).join(','); }
      if (!('cache-control' in out)) out['cache-control'] = 'public, max-age=0, must-revalidate';
      let body = Buffer.alloc(0);
      if (file) { body = fs.readFileSync(file); out['content-type'] = out['content-type'] || TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'; }
      out['content-length'] = String(body.length);
      Object.assign(out, extra);
      log.status = status;
      res.writeHead(status, out);
      res.end(req.method === 'HEAD' ? undefined : body);
    };

    const file = resolveFile(p);
    const rd = findRedirect(cfg.redirectRules, { scheme, host: hostHdr, path: p, fileExists: !!file });
    if (rd) {
      if (rd.status === 404) return respond(404, path.join(root, '404.html'));
      if (rd.status === 200) { const f = resolveFile(rd.to.split('?')[0]); return f ? respond(200, f) : respond(404, path.join(root, '404.html')); }
      let loc = rd.to;
      if (u.search && !loc.includes('?')) loc += u.search;                // Netlify forwards the query string on 301/302
      return respond(rd.status, null, { location: loc });
    }
    if (p.length > 1 && p.endsWith('/')) return respond(301, null, { location: p.replace(/\/+$/, '') + u.search });
    if (file) return respond(200, file);
    const nf = path.join(root, '404.html');
    return respond(404, fs.existsSync(nf) ? nf : null);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        server, port: actual, url: `http://${host}:${actual}`, conflicts, requests, root,
        get config() { return cfg; },
        reload() { cfg = loadDistConfig(root); },
        close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2);
  const mi = argv.indexOf('--merge');
  const merge = mi >= 0 ? argv.splice(mi, 2)[1] : 'last';
  const [dist, port] = argv;
  if (!dist || !fs.existsSync(dist)) { console.error('usage: node tools/t0/config/emulate.mjs <dist> [port] [--merge last|first|join]'); process.exit(2); }
  const em = await createEmulator({ dist, port: Number(port || 0), merge });
  console.log(`emulating ${em.root} (sources: ${Object.entries(em.config.sources).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}; ${em.config.headerRules.length} header rules, ${em.config.redirectRules.length} redirect rules) on ${em.url}`);
}
