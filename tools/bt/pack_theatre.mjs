// Packs the Battle Theatre page shell (docs/battle-theatre/app) as a separate, drag-and-drop-able staging site.
//   node tools/bt/pack_theatre.mjs [--out deliver/bt-staging/dist] [--zip-dir deliver] [--no-zip]
// Emits a deterministic dist (same inputs -> same bytes, same zip, same hash): the shell plus exactly the sibling files it loads at runtime,
// found by tracing (1) the ES-module import graph from app/src/main.mjs and (2) every `URLS.<key> + 'file'` literal in the modules of that graph,
// plus the renderer's terrain folder. The directory layout of docs/battle-theatre is kept (the shell resolves its siblings by relative URL), so
// nothing is rewritten except app/index.html (home links, noindex, build stamp). Nothing is uploaded or deployed by this tool.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../..');
export const BT = path.join(REPO, 'docs/battle-theatre');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const posix = p => p.split(path.sep).join('/');

// folder keys of app/src/config.mjs, relative to docs/battle-theatre (checked against config.mjs by the self-test)
export const URL_KEYS = { app: 'app/', proto: 'render/prototype/', gov: 'GOVERNANCE/', env: 'environment/', data: 'app/data/', hist: 'history/', structures: 'structures/', kit: 'kit/' };
// loaded through a base path the literal scan cannot see (renderer: base + 'data/aerial.jpg', world: terrain.json / height.bin)
export const EXTRA_DIRS = ['render/prototype/data'];
// not loaded by the shell today; listed in the manifest so the owner can see they were considered, never shipped
export const NOT_LOADED = ['GOVERNANCE/timeline_verified.jsonl', 'GOVERNANCE/decisions/conflict_defaults.json'];

const IMPORT_RE = /(?:import|export)\s*(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const URLS_RE = /URLS\.([a-z]+)\s*\+\s*'([^']+)'/g;

function walk(dir) { const o = []; for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) { const p = path.join(dir, e.name); if (e.isDirectory()) o.push(...walk(p)); else o.push(p); } return o; }

export function trace() {
  const files = new Set(), problems = [], seen = new Set();
  const add = (abs, why) => { if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { problems.push(`missing: ${posix(path.relative(BT, abs))} (${why})`); return false; } files.add(abs); return true; };
  const queue = [path.join(BT, 'app/src/main.mjs')];
  while (queue.length) {
    const f = queue.pop(); if (seen.has(f)) continue; seen.add(f); if (!add(f, 'module')) continue;
    const src = fs.readFileSync(f, 'utf8'); let m;
    IMPORT_RE.lastIndex = 0; while ((m = IMPORT_RE.exec(src))) { const s = m[1] || m[2]; if (s.startsWith('.')) queue.push(path.resolve(path.dirname(f), s)); }
    URLS_RE.lastIndex = 0; while ((m = URLS_RE.exec(src))) {
      const base = URL_KEYS[m[1]]; if (!base) { problems.push(`unknown URLS key ${m[1]} in ${posix(path.relative(BT, f))}`); continue; }
      const abs = path.join(BT, base, m[2]); add(abs, `URLS.${m[1]} in ${posix(path.relative(BT, f))}`); if (/\.mjs$/.test(abs)) queue.push(abs);
    }
  }
  for (const p of ['app/index.html', 'app/styles.css']) add(path.join(BT, p), 'page');
  for (const d of EXTRA_DIRS) for (const f of walk(path.join(BT, d))) files.add(f);
  return { files: [...files].map(f => posix(path.relative(BT, f))).sort(), problems };
}

// ---- transforms of the one page that differs from the repository copy
const STAMP_STYLE = 'position:fixed;left:8px;bottom:6px;z-index:2147483000;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#c9c9d6;background:rgba(13,13,24,.72);padding:2px 7px;border-radius:4px;pointer-events:none';
export const stampHTML = v => `<div id="bt-build-stamp" style="${STAMP_STYLE}" aria-label="Build version">Battle Theatre staging build ${v}</div>`;
function transformIndex(html, v) {
  let o = html;
  const rep = (a, b) => { if (!o.includes(a)) throw new Error('app/index.html no longer contains ' + a); o = o.replace(a, b); };
  rep('<meta name="bt-home" content="../../../">', '<meta name="bt-home" content="../">');
  rep('id="home-link" href="../../../"', 'id="home-link" href="../"');
  rep('<meta name="color-scheme" content="dark">', '<meta name="color-scheme" content="dark">\n<meta name="robots" content="noindex, nofollow">');
  rep('</body>', stampHTML(v) + '\n</body>');
  return o;
}
const rootIndex = v => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=app/index.html"><link rel="canonical" href="app/index.html">
<title>Battle Theatre (staging)</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d18;color:#e6e6f0;font:16px/1.5 system-ui,sans-serif}main{padding:16px;max-width:34rem}a{color:#8fb8ff}small{color:#9a9ab0}</style></head>
<body><main><h1>Battle Theatre</h1><p>This is a staging copy for testing. <a href="app/index.html">Open the Battle Theatre</a>.</p><small>Staging build ${v}</small></main></body></html>
`;
const HEADERS = `# Staging copy: keep out of search engines, always revalidate (Netlify serves a content ETag, so unchanged files return 304).
/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cache-Control: public, max-age=0, must-revalidate

/*.mjs
  Content-Type: text/javascript; charset=utf-8
/*.jsonl
  Content-Type: application/x-ndjson; charset=utf-8
/*.bin
  Content-Type: application/octet-stream
# No Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy: the shell uses no SharedArrayBuffer and no cross-origin isolation.
`;
const TOML = `# Static site, no build step: drop the folder or the zip.
[build]
  publish = "."
[[redirects]]
  from = "/"
  to = "/app/index.html"
  status = 200
`;

// ---- deterministic zip (stored order = sorted, fixed timestamp 1980-01-01, deflate level 9)
export function makeZip(entries) {   // entries: [{name, data}] sorted by caller
  const parts = [], central = []; let off = 0;
  for (const { name, data } of entries) {
    const nm = Buffer.from(name), raw = data, def = zlib.deflateRawSync(raw, { level: 9 }), useDef = def.length < raw.length, body = useDef ? def : raw, crc = zlib.crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDef ? 8 : 0, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, nm, body);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDef ? 8 : 0, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(0o100644 << 16 >>> 0, 38); ch.writeUInt32LE(off, 42);
    central.push(ch, nm); off += 30 + nm.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

// ---- copy audit: nothing in the shipped files may say how the site was made
export const AUDIT_RE = /\b(claude|anthropic|chatgpt|openai|gpt-?\d|large language model|LLM|subagents?|sub-agents?|artificial intelligence|AI[- ](?:generated|assisted|written|made|built|reviewed)|(?:generated|written|built|made|reviewed|authored) (?:by|with) (?:an? )?(?:AI|automated|machine))\b/i;
export function audit(dist) {
  const hits = [];
  for (const f of walk(dist)) {
    const rel = posix(path.relative(dist, f)); if (AUDIT_RE.test(rel)) hits.push({ file: rel, where: 'name' });
    if (/\.(jpg|png|bin|zip)$/i.test(f)) continue;
    const s = fs.readFileSync(f, 'utf8'); const lines = s.split('\n');
    for (let i = 0; i < lines.length; i++) { const m = AUDIT_RE.exec(lines[i]); if (m) hits.push({ file: rel, line: i + 1, match: m[0], text: lines[i].slice(Math.max(0, m.index - 50), m.index + 80) }); }
  }
  return hits;
}

export function pack({ out = path.join(REPO, 'deliver/bt-staging/dist'), zipDir = path.join(REPO, 'deliver'), zip = true } = {}) {
  const { files, problems } = trace(); if (problems.length) throw new Error('trace problems:\n' + problems.join('\n'));
  const hashes = files.map(r => [r, sha(fs.readFileSync(path.join(BT, r)))]);
  const version = sha(Buffer.from(hashes.map(([r, h]) => r + ' ' + h).join('\n'))).slice(0, 8);   // of the source bytes of every shipped file
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const emitted = new Map();
  for (const r of files) emitted.set(r, r === 'app/index.html' ? Buffer.from(transformIndex(fs.readFileSync(path.join(BT, r), 'utf8'), version)) : fs.readFileSync(path.join(BT, r)));
  emitted.set('index.html', Buffer.from(rootIndex(version))); emitted.set('_headers', Buffer.from(HEADERS)); emitted.set('netlify.toml', Buffer.from(TOML));
  const manifest = { name: 'Battle Theatre staging', version, source: 'docs/battle-theatre', files: [...emitted].filter(([r]) => r !== 'MANIFEST.json').map(([r, b]) => ({ path: r, bytes: b.length, sha256: sha(b) })).sort((a, b) => a.path < b.path ? -1 : 1), notLoadedByShell: NOT_LOADED };
  emitted.set('MANIFEST.json', Buffer.from(JSON.stringify(manifest, null, 1) + '\n'));
  const names = [...emitted.keys()].sort();
  for (const n of names) { const p = path.join(out, n); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, emitted.get(n)); }
  const res = { version, out, files: names.length, bytes: names.reduce((a, n) => a + emitted.get(n).length, 0), traced: files };
  if (zip) {
    const zbuf = makeZip(names.map(name => ({ name, data: emitted.get(name) }))), zn = `gettysburg-BT-staging-${version}.zip`; fs.mkdirSync(zipDir, { recursive: true });
    fs.writeFileSync(path.join(zipDir, zn), zbuf); res.zip = path.join(zipDir, zn); res.zipBytes = zbuf.length; res.zipSha256 = sha(zbuf);
    fs.writeFileSync(res.zip + '.sha256', `${res.zipSha256}  ${zn}\n`);
  }
  res.audit = audit(out); return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? path.resolve(a[i + 1]) : undefined; };
  const r = pack({ out: opt('--out'), zipDir: opt('--zip-dir'), zip: !a.includes('--no-zip') });
  console.log(JSON.stringify({ ...r, traced: undefined, audit: undefined, auditHits: r.audit.length }, null, 1));
  if (r.audit.length) { console.error('COPY AUDIT HITS:'); for (const h of r.audit) console.error(' ', JSON.stringify(h)); process.exit(2); }
}
