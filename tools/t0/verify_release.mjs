#!/usr/bin/env node
// tools/t0/verify_release.mjs - independent verification of the built release trains (integrator check, separate from gate.mjs).
//
//   node tools/t0/verify_release.mjs                     all four trains (release/R0 .. release/R1c must exist: python tools/t0/build.py --all)
//   node tools/t0/verify_release.mjs --train R1c         one train
//   node tools/t0/verify_release.mjs --release-dir <dir> read <dir>/<train>/dist and manifest.json instead of release/ (used to prove the verifier fails)
//   node tools/t0/verify_release.mjs --port 8489 --json tmp/integrator/verify.json
//
// What it proves (per train, plus across trains):
//   V1 manifest    every file of release/<train>/dist hashes to release/<train>/manifest.json and nothing else is there (no stray file)
//   V2 serve       the dist is served STATICALLY (tools/t0/serve.mjs, Netlify-like pretty URLs + 404.html) and a crawl over HTTP finds NO missing
//                  file: every local reference of every html page (script/link/img/source/iframe/a, srcset, inline style url(), og:image and
//                  twitter:image on the own domain), every css url(), every /assets/ name and "./x.js" import in the entry, chunks, sw.js and
//                  site-nav.js, every absolute "/x.ext" string literal of the bundle, manifest.json icons/screenshots/shortcuts, sitemap.xml <loc>
//                  (own domain) and the GSC file resolve to HTTP 200.  The same crawl runs on the BASELINE (baseline/dist = what production serves, since the
//                  2026-09-30 re-baseline; legacy/dist before): only references that are NEW relative to it (same page -> same target) fail, so a dangling
//                  link the deployed site already had is reported, not blamed.
//   V3 devpages    /diagnostics(.html) and /unit-rendering-reference(.html) answer 404 from R1a on (200 in R0, which ships no page changes)
//   V4 names       "never reuse a file name for different bytes": every assets/ name has ONE sha256 across all trains and legacy, the release-id
//                  names (entry, both chunks) differ between trains, and every name agrees with ops/used-names.txt (same bytes or not in it)
//   V6 identity    chapter 02 rule 5 (no identity change in T0): for every page present in both trees <title>, meta description, canonical, og:title/
//                  og:description/og:url/og:type/og:site_name, twitter:title/twitter:description are byte-identical to the baseline; manifest.json name,
//                  short_name and start_url are unchanged; sitemap.xml lists exactly the baseline URLs minus ar.html; every /data/* file is byte-identical
//   V7 cumulative every patch id of train N (release/<N>/anchors.json) is also in train N+1, every non-asset file path of N exists in N+1 (unless the manifest of N+1 lists it as deleted on purpose), and the
//                  groups recorded in version.json only grow (R0 < R1a < R1b < R1c)
//   V5 legacy      legacy/dist still hashes to the pinned tree digest and the main bundle md5 is 7ef75b95f4c02700430b8aa91e3a7459
//   V8 baseline    baseline/dist matches tools/t0/baseline.lock.json (per-file sha256, tree digest) and differs from legacy/dist in exactly the locked files
//                  (index.html, data/terrain.json: production drift of 2026-09-30, docs/baseline-drift.md); every train's manifest records that baseline tree
// Exit 0 = all green, 1 = at least one failure.  Writes release/<train>/verify.json.  No network access beyond 127.0.0.1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './serve.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const all = (n) => argv.flatMap((a, i) => (a === `--${n}` ? [argv[i + 1]] : []));
const TRAINS = all('train').length ? all('train') : ['R0', 'R1a', 'R1b', 'R1c'];
const PORT = Number(opt('port', 8489));
const JSON_OUT = opt('json', null);
const RELEASE_DIR = path.resolve(REPO, opt('release-dir', 'release'));      // tests point this at a mutated copy
const CFG = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/trains.json'), 'utf8'));
const OWN = /^https:\/\/(www\.)?gettysburginteractivemap\.com/i;

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
function walk(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(root, r)); else out.push(r);
  }
  return out;
}
const get = (port, p, method = 'GET') => new Promise((res) => {
  const req = http.request({ host: '127.0.0.1', port, path: p, method, agent: false, headers: { 'user-agent': 'gbg-verify-release', connection: 'close' } }, (r) => { r.resume(); r.on('end', () => res(r.statusCode)); });
  req.on('error', () => res(0)); req.setTimeout(10000, () => { req.destroy(); res(0); }); req.end();
});
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { for (;;) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k], k); } })); return out; }

// ------------------------------------------------------------------ reference extraction
const isExternal = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u) && !OWN.test(u);
function resolveRef(u, fromPath) {
  // -> site path ("/x/y.png") or null (external / not a file reference)
  let s = u.trim();
  if (!s || s.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:|blob:|about:)/i.test(s)) return null;
  if (s.includes('${') || s.includes('{{') || s.includes('<%')) return null;
  if (OWN.test(s)) s = s.replace(OWN, '') || '/';
  if (isExternal(s)) return null;
  s = s.split('#')[0].split('?')[0];
  if (!s) return null;
  if (!s.startsWith('/')) s = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), s));
  return s.startsWith('/') ? s : `/${s}`;
}
function htmlRefs(txt, from) {
  const refs = [];
  const add = (u, kind) => { const r = resolveRef(u, from); if (r) refs.push({ from, path: r, kind }); };
  for (const m of txt.matchAll(/<(script|link|img|source|iframe|video|audio|embed|object|a|area|form)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(), attrs = m[2];
    const g = (n) => { const x = new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs); return x ? (x[2] ?? x[3] ?? x[4]) : null; };
    if (tag === 'link') { const rel = (g('rel') || '').toLowerCase(); if (/(stylesheet|icon|manifest|apple-touch-icon|modulepreload|preload|prefetch)/.test(rel) && g('href')) add(g('href'), `link:${rel}`); }
    else if (tag === 'a' || tag === 'area') { if (g('href')) add(g('href'), 'a'); }
    else if (tag === 'form') { if (g('action')) add(g('action'), 'form'); }
    else if (tag === 'object') { if (g('data')) add(g('data'), 'object'); }
    else { if (g('src')) add(g('src'), tag); }
    const ss = g('srcset'); if (ss) for (const part of ss.split(',')) add(part.trim().split(/\s+/)[0], 'srcset');
  }
  for (const m of txt.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    const prop = (/\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(t) || [])[1] || '';
    const content = (/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(t) || []);
    const c = content[1] ?? content[2];
    if (/^(og:image|twitter:image|og:image:url|og:image:secure_url)$/i.test(prop) && c) add(c, `meta:${prop}`);
  }
  for (const m of txt.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)) add(m[1] ?? m[2] ?? m[3], 'css-url');
  for (const m of txt.matchAll(/\b(?:fetch|import)\(\s*["'`]((?:\/|\.\/)[^"'`$]+)["'`]/g)) add(m[1], 'inline-fetch');
  for (const m of txt.matchAll(/\b(?:navigator\.serviceWorker\.register)\(\s*["']([^"']+)["']/g)) add(m[1], 'sw-register');
  return refs;
}
function cssRefs(txt, from) {
  const refs = [];
  for (const m of txt.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)) { const r = resolveRef(m[1] ?? m[2] ?? m[3], from); if (r) refs.push({ from, path: r, kind: 'css-url' }); }
  for (const m of txt.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) { const r = resolveRef(m[1], from); if (r) refs.push({ from, path: r, kind: 'css-import' }); }
  return refs;
}
const LIT_EXT = 'html|json|js|mjs|css|png|jpe?g|webp|svg|ico|pdf|txt|xml|webmanifest|mp3|wav|wasm|woff2?';
function jsRefs(txt, from) {
  const refs = [], seen = new Set();
  const add = (p, kind) => { const k = `${kind}:${p}`; if (seen.has(k)) return; seen.add(k); refs.push({ from, path: p, kind }); };
  for (const m of txt.matchAll(/\/assets\/([A-Za-z0-9._~-]+)/g)) add(`/assets/${m[1].replace(/\.$/, '')}`, 'assets-literal');
  if (/^\/assets\//.test(from)) for (const m of txt.matchAll(/["'`]\.\/([A-Za-z0-9._-]+\.(?:m?js|css))["'`]/g)) add(`/assets/${m[1]}`, 'relative-import');
  const lit = new RegExp(`["'\`](\\/(?:[A-Za-z0-9_.~-]+\\/)*[A-Za-z0-9_.~-]+\\.(?:${LIT_EXT}))(?:[?#][^"'\`]*)?["'\`]`, 'g');
  for (const m of txt.matchAll(lit)) add(m[1], 'path-literal');
  return refs;
}
const manifestRefs = (txt, from) => {
  const refs = []; let j; try { j = JSON.parse(txt); } catch { return refs; }
  const add = (u) => { const r = resolveRef(u, from); if (r) refs.push({ from, path: r, kind: 'manifest' }); };
  for (const it of [...(j.icons || []), ...(j.screenshots || [])]) if (it.src) add(it.src);
  for (const s of j.shortcuts || []) { if (s.url) add(s.url); for (const ic of s.icons || []) if (ic.src) add(ic.src); }
  if (j.start_url) add(j.start_url);
  return refs;
};
const sitemapRefs = (txt, from) => [...txt.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => resolveRef(m[1], from)).filter(Boolean).map((p) => ({ from, path: p, kind: 'sitemap-loc' }));
const robotsRefs = (txt, from) => [...txt.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => resolveRef(m[1], from)).filter(Boolean).map((p) => ({ from, path: p, kind: 'robots-sitemap' }));

function collectRefs(dist) {
  const files = walk(dist);
  const refs = [];
  for (const rel of files) {
    const from = `/${rel}`;
    const ext = path.extname(rel).toLowerCase();
    if (rel.startsWith('_ops/') || rel === '_headers' || rel === '_redirects' || rel === 'netlify.toml' || rel.startsWith('data/')) continue; // not served as app content / datasets
    let txt;
    if (['.html', '.css', '.js', '.mjs', '.xml', '.txt', '.json'].includes(ext)) txt = fs.readFileSync(path.join(dist, rel), 'utf8'); else continue;
    if (ext === '.html') refs.push(...htmlRefs(txt, from));
    else if (ext === '.css') refs.push(...cssRefs(txt, from));
    else if (ext === '.js' || ext === '.mjs') refs.push(...jsRefs(txt, from));
    else if (rel === 'manifest.json' || ext === '.webmanifest') refs.push(...manifestRefs(txt, from));
    else if (rel === 'sitemap.xml') refs.push(...sitemapRefs(txt, from));
    else if (rel === 'robots.txt') refs.push(...robotsRefs(txt, from));
  }
  // Reference-shaped strings that are NOT same-origin file references (each class was checked by hand on legacy/dist: 29 hits, all of these):
  //   - "/mapbox-gl-js/*.wasm|.js" in the bundled Mapbox config (DRACO_URL, MESHOPT_URL, BUILDING_GEN_URL, TILE_PROVIDER_URLS): resolved by Mapbox
  //     against its own CDN base, never against the site origin;
  //   - fetch('/data/' + f) and fetch('/data/oob/' + f): a directory PREFIX that page code concatenates (every real file is crawled via the lists);
  //   - url(blob) / url(url): JS string fragments inside an inline script, not CSS.
  const skipped = [];
  const real = refs.filter((r) => {
    let why = null;
    if (/^\/mapbox-gl-js\//.test(r.path) && r.kind === 'path-literal') why = 'vendor-config';
    else if (r.kind === 'inline-fetch' && /\/$/.test(r.path)) why = 'directory-prefix';
    else if (r.kind === 'css-url' && !/\.[A-Za-z0-9]{2,5}$/.test(r.path) && !/^\/(?:assets|icons|og|screenshots)\//.test(r.path)) why = 'js-fragment';
    if (why) { skipped.push({ from: r.from, path: r.path, why }); return false; }
    return true;
  });
  return { files, refs: real, skipped };
}

// the pages a visitor can land on, in both spellings
function pageUrls(files) {
  const urls = ['/'];
  for (const f of files) if (/^[^/]+\.html$/.test(f) && f !== '404.html' && f !== 'index.html') { urls.push(`/${f}`); urls.push(`/${f.replace(/\.html$/, '')}`); }
  return urls;
}

async function crawl(dist, port) {
  const srv = await createStaticServer({ root: dist, port });
  try {
    const { files, refs, skipped } = collectRefs(dist);
    const uniq = [...new Set(refs.map((r) => r.path))];
    const pages = pageUrls(files);
    const status = {};
    await pool([...new Set([...uniq, ...pages])], 12, async (p) => { status[p] = await get(port, encodeURI(p), 'GET'); });
    const missing = refs.filter((r) => status[r.path] !== 200).map((r) => ({ from: r.from, path: r.path, kind: r.kind, status: status[r.path] }));
    const badPages = pages.filter((p) => status[p] !== 200);
    const notFound = await get(port, '/definitely-not-a-page-xyz', 'GET');
    return { files: files.length, refs: refs.length, skipped: skipped.length, uniqueTargets: uniq.length, pages: pages.length, missing, badPages, notFoundStatus: notFound, status };
  } finally { await srv.close(); }
}

// the hashed file names change per train: compare a reference by the ROLE of the file it lives in (entry / help chunk / bookmark chunk / css)
const role = (p) => p.replace(/\/assets\/(index|HelpModal|BookmarkPanel)-[A-Za-z0-9_-]+\.js$/, '/assets/$1.js').replace(/\/assets\/index-[A-Za-z0-9_-]+\.css$/, '/assets/index.css');
const key = (m) => `${role(m.from)}->${role(m.path)}`;
const results = [];
let failed = 0;
const fail = (t, id, msg, detail) => { failed++; t.failures.push({ id, msg, detail }); };

// ------------------------------------------------------------------ V5 legacy pinned + baseline crawl
const legacyDist = path.join(REPO, CFG.legacy.dir);
const baseDist = path.join(REPO, CFG.base.dir);
const entryMd5 = md5(fs.readFileSync(path.join(legacyDist, CFG.legacy.entry)));
const legacyFiles = walk(legacyDist).sort();
const legacyTree = sha(legacyFiles.map((f) => `${f}\0${sha(fs.readFileSync(path.join(legacyDist, f)))}\n`).join(''));
const legacyAssetShas = {};
for (const f of legacyFiles) if (f.startsWith('assets/')) legacyAssetShas[path.basename(f)] = sha(fs.readFileSync(path.join(legacyDist, f)));
const base = await crawl(baseDist, PORT);
const baselineKeys = new Set(base.missing.map(key));
console.log(`baseline (${CFG.base.dir}): ${base.files} files, ${base.refs} references (${base.uniqueTargets} targets, ${base.skipped} non-reference strings ignored), ${base.missing.length} already-dangling (${baselineKeys.size} distinct), entry md5 ${entryMd5}`);

// ledger
const ledger = {};
const ledgerPath = path.join(REPO, 'ops/used-names.txt');
if (fs.existsSync(ledgerPath)) for (const ln of fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/)) { const c = ln.split('\t'); if (c.length >= 2 && c[1].length === 64) (ledger[c[0].toLowerCase()] ||= new Set()).add(c[1]); }

const acrossNames = {};      // name -> Map(sha -> [trains])
const releaseNames = {};     // train -> [entry, help, book]
for (const t of TRAINS) {
  const T = { train: t, failures: [], checks: {} };
  results.push(T);
  const dist = path.join(RELEASE_DIR, t, 'dist');
  if (!fs.existsSync(dist)) { fail(T, 'V0', `release/${t}/dist does not exist (python tools/t0/build.py --all)`); continue; }
  // V1 manifest
  try {
    const man = JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, t, 'manifest.json'), 'utf8'));
    const want = new Map(Object.entries(man.files || {}).map(([f, r]) => [f, r.sha256]));
    const have = walk(dist);
    const extra = have.filter((f) => !want.has(f)), lost = [...want.keys()].filter((f) => !have.includes(f));
    const bad = have.filter((f) => want.has(f) && sha(fs.readFileSync(path.join(dist, f))) !== want.get(f));
    T.checks.manifest = { files: have.length, listed: want.size, extra, lost, bad, tree: man.tree_sha256 || null, fileCount: man.file_count };
    if (extra.length || lost.length || bad.length || !want.size) fail(T, 'V1', 'dist does not match manifest.json', { extra, lost, bad });
  } catch (e) { fail(T, 'V1', `manifest unreadable: ${e.message}`); }
  // V2 serve + crawl
  const c = await crawl(dist, PORT);
  const newMissing = c.missing.filter((m) => !baselineKeys.has(key(m)));
  T.checks.inheritedList = [...new Set(c.missing.filter((m) => baselineKeys.has(key(m))).map((m) => `${role(m.from)} -> ${m.path} [${m.kind}] ${m.status}`))];
  const inherited = c.missing.filter((m) => baselineKeys.has(key(m)));
  T.checks.crawl = { files: c.files, references: c.refs, nonReferenceStringsIgnored: c.skipped, uniqueTargets: c.uniqueTargets, pagesFetched: c.pages, pagesNot200: c.badPages, newMissing, inheritedMissing: inherited.length, unknownPathStatus: c.notFoundStatus };
  if (newMissing.length) fail(T, 'V2', `${newMissing.length} reference(s) to a missing file that the baseline did not have`, newMissing.slice(0, 20));
  if (c.badPages.length) fail(T, 'V2', `pages that do not answer 200: ${c.badPages.join(', ')}`);
  if (c.notFoundStatus !== 404) fail(T, 'V2', `an unknown path answers ${c.notFoundStatus}, not 404`);
  // V3 dev pages
  {
    const srv = await createStaticServer({ root: dist, port: PORT });
    try {
      const st = {};
      for (const p of ['/diagnostics.html', '/diagnostics', '/unit-rendering-reference.html', '/unit-rendering-reference']) st[p] = await get(PORT, p);
      const want = t === 'R0' ? 200 : 404;
      T.checks.devpages = { status: st, expected: want };
      for (const [p, s] of Object.entries(st)) if (s !== want) fail(T, 'V3', `${p} answers ${s}, expected ${want}`);
    } finally { await srv.close(); }
  }
  // V6 identity (rule 5): head identity of every page, manifest names, sitemap URL set, /data/*
  {
    const id = (txt) => {
      const o = {};
      o.title = ((/<title>([\s\S]*?)<\/title>/i.exec(txt) || [])[1] ?? null);
      o.canonical = ((/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["']/i.exec(txt) || [])[1] ?? null);
      for (const m of txt.matchAll(/<meta\b[^>]*>/gi)) {
        const k = (/\b(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(m[0]) || [])[1];
        if (k && /^(description|og:title|og:description|og:url|og:type|og:site_name|twitter:title|twitter:description|twitter:card)$/i.test(k)) o[k.toLowerCase()] = (/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(m[0]) || []).slice(1).find((x) => x !== undefined) ?? null;
      }
      return o;
    };
    const diffs = [];
    for (const f of walk(baseDist).filter((x) => /^[^/]+\.html$/.test(x))) {
      const np = path.join(dist, f);
      if (!fs.existsSync(np)) { if (!/^(diagnostics|unit-rendering-reference)\.html$/.test(f)) diffs.push(`${f}: page removed`); continue; }
      const a = id(fs.readFileSync(path.join(baseDist, f), 'utf8')), b = id(fs.readFileSync(np, 'utf8'));
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) diffs.push(`${f}: ${k} changed ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`);
    }
    const lm = JSON.parse(fs.readFileSync(path.join(baseDist, 'manifest.json'), 'utf8')), nm = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
    for (const k of ['name', 'short_name', 'start_url']) if (lm[k] !== nm[k]) diffs.push(`manifest.json: ${k} changed ${JSON.stringify(lm[k])} -> ${JSON.stringify(nm[k])}`);
    const locs = (d) => [...fs.readFileSync(path.join(d, 'sitemap.xml'), 'utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).sort();
    const wantLocs = locs(baseDist).filter((u) => !/\/ar(\.html)?$/.test(u)), haveLocs = locs(dist);
    if (t === 'R0' ? JSON.stringify(locs(baseDist)) !== JSON.stringify(haveLocs) : JSON.stringify(wantLocs) !== JSON.stringify(haveLocs)) diffs.push(`sitemap.xml: URL set differs (baseline minus ar: ${wantLocs.length}, here ${haveLocs.length})`);
    const dataDiff = [];
    for (const f of walk(baseDist).filter((x) => x.startsWith('data/'))) { const np = path.join(dist, f); if (!fs.existsSync(np) || sha(fs.readFileSync(np)) !== sha(fs.readFileSync(path.join(baseDist, f)))) dataDiff.push(f); }
    if (dataDiff.length) diffs.push(`data/* changed or removed: ${dataDiff.join(', ')}`);
    T.checks.identity = { pagesCompared: walk(baseDist).filter((x) => /^[^/]+\.html$/.test(x)).length, differences: diffs };
    if (diffs.length) fail(T, 'V6', `${diffs.length} identity difference(s) versus the baseline`, diffs.slice(0, 12));
  }
  // V4 names
  const assets = fs.existsSync(path.join(dist, 'assets')) ? fs.readdirSync(path.join(dist, 'assets')) : [];
  for (const a of assets) {
    const s = sha(fs.readFileSync(path.join(dist, 'assets', a)));
    const m = (acrossNames[a] ||= new Map()); (m.get(s) || m.set(s, []).get(s)).push(t);
    const led = ledger[a.toLowerCase()];
    if (led && !led.has(s)) fail(T, 'V4', `assets/${a} is in ops/used-names.txt with DIFFERENT bytes (name reuse)`);
    if (legacyAssetShas[a] && legacyAssetShas[a] !== s) fail(T, 'V4', `assets/${a} exists in legacy/dist with different bytes (name reuse)`);
  }
  try { const v = JSON.parse(fs.readFileSync(path.join(dist, 'version.json'), 'utf8')); releaseNames[t] = [v.entry, v.help, v.bookmark]; T.checks.release = v.release; } catch { fail(T, 'V4', 'version.json unreadable'); }
  T.checks.assets = assets.length;
}
// V7 cumulative trains
const v7 = { train: 'cumulative', failures: [], checks: {} };
{
  const order = ['R0', 'R1a', 'R1b', 'R1c'].filter((t) => TRAINS.includes(t));
  const info = {};
  for (const t of order) {
    const dist = path.join(RELEASE_DIR, t, 'dist');
    let ids = new Set(), groups = [], deleted = [];
    try { ids = new Set(JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, t, 'anchors.json'), 'utf8')).patches.map((p) => p.id)); } catch { fail(v7, 'V7', `release/${t}/anchors.json unreadable`); }
    try { groups = JSON.parse(fs.readFileSync(path.join(dist, 'version.json'), 'utf8')).groups; } catch { /* reported by V4 */ }
    try { deleted = JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, t, 'manifest.json'), 'utf8')).deleted || []; } catch { /* reported by V1 */ }
    info[t] = { ids, groups, deleted, files: fs.existsSync(dist) ? new Set(walk(dist).filter((f) => !f.startsWith('assets/'))) : new Set() };
  }
  for (let i = 1; i < order.length; i++) {
    const a = info[order[i - 1]], b = info[order[i]];
    const lostIds = [...a.ids].filter((x) => !b.ids.has(x)), lostFiles = [...a.files].filter((x) => !b.files.has(x) && !b.deleted.includes(x)), lostGroups = a.groups.filter((g) => !b.groups.includes(g));
    v7.checks[`${order[i - 1]} -> ${order[i]}`] = { patchesBefore: a.ids.size, patchesAfter: b.ids.size, addedPatches: b.ids.size - a.ids.size, filesBefore: a.files.size, filesAfter: b.files.size, groupsBefore: a.groups, groupsAfter: b.groups, deletedByDesign: b.deleted };
    if (lostIds.length) fail(v7, 'V7', `${order[i]} lacks ${lostIds.length} patch(es) of ${order[i - 1]}`, lostIds.slice(0, 10));
    if (lostFiles.length) fail(v7, 'V7', `${order[i]} lacks ${lostFiles.length} non-asset file(s) of ${order[i - 1]}`, lostFiles.slice(0, 10));
    if (lostGroups.length) fail(v7, 'V7', `${order[i]} lacks group(s) ${lostGroups.join(', ')} of ${order[i - 1]}`);
  }
}
results.push(v7);
const reused = Object.entries(acrossNames).filter(([, m]) => m.size > 1);
const v4 = { train: 'all', failures: [], checks: {} };
v4.checks.namesAcrossTrains = Object.keys(acrossNames).length;
for (const [name, m] of reused) fail(v4, 'V4', `assets/${name} has ${m.size} different byte streams across trains (${[...m.values()].map((x) => x.join('+')).join(' vs ')})`);
{
  const flat = Object.entries(releaseNames).flatMap(([t, n]) => n.map((x) => [x, t]));
  const byName = {};
  for (const [n, t] of flat) (byName[n] ||= []).push(t);
  for (const [n, ts] of Object.entries(byName)) if (ts.length > 1) fail(v4, 'V4', `release-id name ${n} is shipped by more than one train (${ts.join(', ')})`);
  v4.checks.releaseNames = releaseNames;
}
v4.checks.legacy = { treeSha256: legacyTree, pinnedTree: CFG.legacy.tree_sha256 || null, entryMd5, pinnedEntryMd5: CFG.legacy.entry_md5, files: legacyFiles.length };
if (CFG.legacy.tree_sha256 && legacyTree !== CFG.legacy.tree_sha256) fail(v4, 'V5', `legacy tree digest ${legacyTree} != pinned ${CFG.legacy.tree_sha256}`);
if (legacyFiles.length !== CFG.legacy.file_count) fail(v4, 'V5', `legacy has ${legacyFiles.length} files, pinned ${CFG.legacy.file_count}`);
if (entryMd5 !== CFG.legacy.entry_md5) fail(v4, 'V5', `legacy entry md5 ${entryMd5} != ${CFG.legacy.entry_md5}`);
{
  // V8: the baseline the trains were built from is the locked one, and the trains say so
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, CFG.base.lock), 'utf8'));
  const baseFiles = walk(baseDist).sort();
  const bad = [];
  for (const f of new Set([...Object.keys(lock.files), ...baseFiles])) {
    if (!baseFiles.includes(f)) bad.push(`missing: ${f}`);
    else if (!lock.files[f]) bad.push(`extra: ${f}`);
    else if (sha(fs.readFileSync(path.join(baseDist, f))) !== lock.files[f].sha256) bad.push(`changed: ${f}`);
  }
  const baseTree = sha(baseFiles.map((f) => `${f}\0${sha(fs.readFileSync(path.join(baseDist, f)))}\n`).join(''));
  const drift = baseFiles.filter((f) => !legacyFiles.includes(f) || sha(fs.readFileSync(path.join(baseDist, f))) !== sha(fs.readFileSync(path.join(legacyDist, f)))).sort();
  v4.checks.baseline = { tree: baseTree, locked: lock.tree_sha256, files: baseFiles.length, differsFromLegacy: drift, lockedDrift: lock.changed_vs_legacy };
  if (bad.length || baseTree !== lock.tree_sha256) fail(v4, 'V8', `baseline/dist does not match ${CFG.base.lock}`, bad.slice(0, 10));
  if (JSON.stringify(drift) !== JSON.stringify([...(lock.changed_vs_legacy || [])].sort())) fail(v4, 'V8', `baseline/dist differs from legacy/dist in ${JSON.stringify(drift)}, the lock records ${JSON.stringify(lock.changed_vs_legacy)}`);
  for (const t of TRAINS) {
    try {
      const man = JSON.parse(fs.readFileSync(path.join(RELEASE_DIR, t, 'manifest.json'), 'utf8'));
      if (!man.baseline || man.baseline.tree_sha256 !== lock.tree_sha256 || !man.baseline.locked) fail(v4, 'V8', `release/${t}/manifest.json was not built from the locked baseline (${JSON.stringify(man.baseline || null)})`);
    } catch { /* unreadable manifests are reported by V1 */ }
  }
}
results.push(v4);

// ------------------------------------------------------------------ report
let line = '';
for (const T of results) {
  const ok = T.failures.length === 0;
  if (T.train !== 'all' && T.train !== 'cumulative') {
    const c = T.checks.crawl || {};
    line = `${ok ? 'PASS' : 'FAIL'}  ${T.train}  rid ${T.checks.release || '?'}  files ${T.checks.manifest?.files ?? '?'}  refs ${c.references ?? '?'} (${c.uniqueTargets ?? '?'} targets, ${c.pagesFetched ?? '?'} page urls)  new dangling ${c.newMissing ? c.newMissing.length : '?'}  inherited dangling ${c.inheritedMissing ?? '?'}  dev pages ${JSON.stringify(T.checks.devpages?.status || {})}`;
  } else if (T.train === 'cumulative') line = `${ok ? 'PASS' : 'FAIL'}  cumulative  ${Object.entries(T.checks).map(([k, v]) => `${k}: +${v.addedPatches} patches, ${v.filesBefore}->${v.filesAfter} non-asset files`).join('; ')}`;
  else line = `${ok ? 'PASS' : 'FAIL'}  names/legacy/baseline  ${v4.checks.namesAcrossTrains} distinct asset names across trains, reuse with other bytes: ${reused.length}; legacy entry md5 ${entryMd5}; baseline tree ${String(v4.checks.baseline?.tree || '?').slice(0, 12)} (${(v4.checks.baseline?.differsFromLegacy || []).length} file(s) differ from legacy)`;
  console.log(line);
  for (const f of T.failures) console.log(`      ${f.id}: ${f.msg}${f.detail ? ' ' + JSON.stringify(f.detail).slice(0, 600) : ''}`);
  if (T.train !== 'all' && T.train !== 'cumulative' && fs.existsSync(path.join(RELEASE_DIR, T.train))) fs.writeFileSync(path.join(RELEASE_DIR, T.train, 'verify.json'), JSON.stringify({ ok, ...T }, null, 1) + '\n');
}
if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(REPO, JSON_OUT)), { recursive: true }); fs.writeFileSync(path.resolve(REPO, JSON_OUT), JSON.stringify(results, null, 1) + '\n'); }
console.log(failed ? `verify_release: ${failed} FAILURE(S)` : 'verify_release: all checks passed');
process.exit(failed ? 1 : 0);
