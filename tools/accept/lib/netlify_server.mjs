// tools/accept/lib/netlify_server.mjs - the project's static server (tools/t0/serve.mjs) behind a thin proxy that also honours the candidate's
// _headers and _redirects, so the acceptance run sees what Netlify's edge would add (CSP report-only, Permissions-Policy, Cache-Control per path,
// forced 404s of the developer pages).  Emulation limits are listed in docs/accept/README.md (no compression, no host-based rules, no netlify.toml tables).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createStaticServer } from '../../../tools/t0/serve.mjs';

const esc = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
function pathPattern(p) {
  // Netlify: `*` (splat, matches the rest), `:name` (one path segment)
  const re = '^' + p.split('/').map((seg) => (seg === '*' ? '.*' : seg.includes('*') ? esc(seg).replace(/\*/g, '.*') : seg.startsWith(':') ? '[^/]+' : esc(seg))).join('/') + '/?$';
  return new RegExp(re);
}
export function parseHeaders(text) {
  const blocks = []; let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { cur = { pattern: raw.trim(), re: pathPattern(raw.trim()), headers: [] }; blocks.push(cur); continue; }
    const i = raw.indexOf(':'); if (!cur || i < 0) continue;
    cur.headers.push([raw.slice(0, i).trim(), raw.slice(i + 1).trim()]);
  }
  return blocks;
}
export function parseRedirects(text) {
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const parts = l.split(/\s+/); if (parts.length < 2) continue;
    const [from, to, st] = parts; const m = /^(\d{3})(!?)$/.exec(st || '301') || ['', '301', ''];
    if (/^https?:\/\//i.test(from)) { rules.push({ from, to, status: +m[1], force: !!m[2], hostBased: true }); continue; }
    const splat = from.endsWith('/*');
    const re = new RegExp('^' + (splat ? esc(from.slice(0, -2)) + '(?:/(.*))?' : esc(from)) + '/?$');
    rules.push({ from, to, status: +m[1], force: !!m[2], re, splat });
  }
  return rules;
}

/** startNetlifyServer({root, port, honour:true}) -> { url, port, requests, close(), setOverrides(), applied: {headers:n, redirects:n} } */
export async function startNetlifyServer({ root, port = 0, honour = true, overrides = {} } = {}) {
  const inner = await createStaticServer({ root, port: 0, overrides });
  const hdrFile = path.join(root, '_headers'), redFile = path.join(root, '_redirects');
  const headerBlocks = honour && fs.existsSync(hdrFile) ? parseHeaders(fs.readFileSync(hdrFile, 'utf8')) : [];
  const redirects = honour && fs.existsSync(redFile) ? parseRedirects(fs.readFileSync(redFile, 'utf8')) : [];
  const requests = [];
  const applied = { headerBlocks: headerBlocks.length, redirectRules: redirects.length, redirected: 0, headersAdded: 0 };
  const fileExists = (p) => {
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    const base = path.resolve(root, rel);
    return [base, base + '.html', path.join(base, 'index.html')].some((f) => { try { return fs.statSync(f).isFile(); } catch { return false; } });
  };
  const proxy = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let pathname = decodeURIComponent(u.pathname); let statusOverride = null;
    for (const r of redirects) {
      if (r.hostBased) continue;
      const m = r.re.exec(pathname); if (!m) continue;
      if (!r.force && fileExists(pathname)) continue;
      const to = r.to.replace(':splat', m[1] || '');
      applied.redirected++;
      if (r.status >= 300 && r.status < 400) { requests.push({ t: Date.now(), method: req.method, path: pathname, status: r.status, redirect: to }); res.writeHead(r.status, { location: to + (u.search || '') }); return res.end(); }
      pathname = to; statusOverride = r.status === 200 ? null : r.status; break;
    }
    const opts = { host: '127.0.0.1', port: inner.port, path: encodeURI(pathname) + (statusOverride === null ? u.search : ''), method: req.method, headers: { ...req.headers, 'accept-encoding': 'identity', host: `127.0.0.1:${inner.port}` } };
    const up = http.request(opts, (ur) => {
      const h = { ...ur.headers };
      let n = 0;
      for (const b of headerBlocks) if (b.re.test(u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : u.pathname) || b.re.test(pathname)) for (const [k, v] of b.headers) { delete h[k.toLowerCase()]; h[k.toLowerCase()] = v; n++; }
      applied.headersAdded += n;
      const status = statusOverride || ur.statusCode;
      requests.push({ t: Date.now(), method: req.method, path: u.pathname, status, dest: req.headers['sec-fetch-dest'] || '' });
      res.writeHead(status, h); ur.pipe(res);
    });
    up.on('error', (e) => { res.writeHead(502); res.end(String(e.message)); });
    req.pipe(up);
  });
  await new Promise((resolve, reject) => { proxy.on('error', reject); proxy.listen(port, '127.0.0.1', resolve); });
  const actual = proxy.address().port;
  return {
    url: `http://127.0.0.1:${actual}`, port: actual, root, requests, applied, inner,
    setOverrides: (o) => inner.setOverrides(o),
    close: async () => { await new Promise((r) => { proxy.closeAllConnections?.(); proxy.close(() => r()); }); await inner.close(); },
  };
}
