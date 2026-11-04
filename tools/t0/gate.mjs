#!/usr/bin/env node
// Release gates for a built train (chapter 02 WP-T0-03, section 7).  Machine-readable result: <out>/gate.json, exit code 1 on failure.
//
//   node tools/t0/gate.mjs --train R1a [--dist release/R1a/dist] [--anchors release/R1a/anchors.json] [--out release/R1a/gate.json]
//                          [--legacy baseline/dist] [--ledger ops/used-names.txt] [--cache <dir>]
//   (--legacy = the BASELINE the build started from.  The eslint-scope cache lives in --cache, or next to --out when --out is given, or in
//    release/.cache when neither is given: a run with --out never writes outside the directory it was told to write to.)
//
// Checks: parse (acorn) of every JS asset, sw.js, root scripts and inline HTML scripts (new failures only); unresolved-global delta of
// entry/Help/Bookmark chunks against the legacy bundle (eslint-scope), the four known undefined names must disappear exactly when
// group A is in; anchor-count report from the builder; no reused/colliding asset name (ledger); every /assets/* reference (HTML, JS, CSS,
// SW, manifest, config) and every local script/link/img reference resolves; no legacy asset name left; R0 mechanism invariants
// (sentinel, version.json, sw.js has no skipWaiting/navigation handling, index.html has no controllerchange reload); legacy tree pin;
// no edits/removals of /data/* files (T0 rule 5; additions are reported); total bytes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = (() => {
  const a = { _: [] };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i].startsWith('--')) { const k = v[i].slice(2); a[k] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true; } else a._.push(v[i]);
  }
  return a;
})();

const cfg = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/trains.json'), 'utf8'));
const train = args.train || 'R0';
if (!cfg.train_order.includes(train)) { console.error('unknown train', train); process.exit(2); }
const rp = (p) => path.resolve(REPO, p);
const distDir = rp(args.dist || `release/${train}/dist`);
const outFile = rp(args.out || `release/${train}/gate.json`);
const anchorsFile = rp(args.anchors || `release/${train}/anchors.json`);
// "legacyDir" below is the BASELINE the build started from (trains.json base.dir = baseline/dist since 2026-09-30); legacy/dist itself is
// only checked for being unmodified (check id legacy-pinned).
const legacyDir = rp(args.legacy || cfg.base.dir);
const ledgerFile = rp(args.ledger || 'ops/used-names.txt');
const trainIdx = cfg.train_order.indexOf(train);
const hasA = trainIdx >= cfg.train_order.indexOf(cfg.groups.A.first);

const checks = [];
const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, ...detail }); return ok; };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const walk = (root, base = root) => {
  const out = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const f = path.join(root, e.name);
    if (e.isDirectory()) out.push(...walk(f, base)); else out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out;
};
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const TEXT_EXT = /\.(html|js|mjs|css|json|webmanifest|txt|xml|toml|svg)$/i;
const isText = (rel) => TEXT_EXT.test(rel) || /(^|\/)_(headers|redirects)$/.test(rel);

if (!fs.existsSync(distDir)) { console.error('dist not found:', distDir); process.exit(2); }
const files = walk(distDir);
const legacyFiles = walk(legacyDir);

// ------------------------------------------------------------------ parse
function tryParse(src, mode) {
  try { acorn.parse(src, { ecmaVersion: 'latest', sourceType: mode }); return { ok: true, mode }; } catch (e) { return { ok: false, mode, error: `${e.message}` }; }
}
function parseAny(src, prefer) {
  const order = prefer === 'module' ? ['module', 'script'] : ['script', 'module'];
  let last;
  for (const m of order) { last = tryParse(src, m); if (last.ok) return last; }
  return last;
}
function inlineScripts(html) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m; let i = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    if (/\bsrc\s*=/.test(attrs)) continue;
    const t = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    if (t && !/^(module|text\/javascript|application\/javascript)$/i.test(t[1])) continue;
    if (!m[2].trim()) continue;
    out.push({ idx: i++, module: !!(t && /module/i.test(t[1])), src: m[2] });
  }
  return out;
}
function parseTargets(root, list) {
  const res = {};
  for (const rel of list) {
    if (/\.(js|mjs)$/i.test(rel)) {
      const r = parseAny(read(root, rel), rel.startsWith('assets/') ? 'module' : 'script');
      res[rel] = r;
    } else if (/\.html$/i.test(rel)) {
      for (const s of inlineScripts(read(root, rel))) res[`${rel}#script${s.idx}`] = parseAny(s.src, s.module ? 'module' : 'script');
    }
  }
  return res;
}
{
  const base = parseTargets(legacyDir, legacyFiles);
  const now = parseTargets(distDir, files);
  const known = new Set(Object.entries(base).filter(([, v]) => !v.ok).map(([k]) => k));
  const newFail = Object.entries(now).filter(([k, v]) => !v.ok && !known.has(k)).map(([k, v]) => ({ file: k, error: v.error }));
  check('parse', newFail.length === 0, {
    parsed: Object.keys(now).length, jsFiles: files.filter((f) => /\.(js|mjs)$/i.test(f)).length,
    baselineFailures: [...known], failures: newFail,
  });
}

// ------------------------------------------------------------------ unresolved-global delta (eslint-scope)
// the cache lives where the run was told to write: --cache, else beside --out, else (no --out: the default release/<train>/ layout) the shared release/.cache
const cacheDir = args.cache ? rp(String(args.cache)) : (args.out ? path.join(path.dirname(outFile), '.cache') : rp('release/.cache'));
function analyzeThrough(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  return [...new Set(sm.globalScope.through.map((r) => r.identifier.name))].sort();
}
function cachedThrough(root, rel) {
  const src = read(root, rel);
  const key = sha256(src).slice(0, 16);
  const cf = path.join(cacheDir, `through-${key}.json`);
  try { return JSON.parse(fs.readFileSync(cf, 'utf8')); } catch { /* miss */ }
  const names = analyzeThrough(src);
  try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cf, JSON.stringify(names)); } catch { /* cache is optional */ }
  return names;
}
const BROWSER_GLOBALS = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/browser-globals.json'), 'utf8')).names);
let release = null;
try { release = JSON.parse(read(distDir, 'version.json')); } catch { /* reported below */ }
{
  const roles = release ? { entry: [cfg.legacy.entry, `assets/${release.entry}`], help: [cfg.legacy.help, `assets/${release.help}`], bookmark: [cfg.legacy.book, `assets/${release.bookmark}`] } : {};
  const detail = { roles: {} };
  let ok = !!release;
  for (const [role, [lp, np]] of Object.entries(roles)) {
    if (!fs.existsSync(path.join(distDir, np))) { ok = false; detail.roles[role] = { error: `${np} missing` }; continue; }
    const b = cachedThrough(legacyDir, lp);
    const n = cachedThrough(distDir, np);
    const fresh = n.filter((x) => !b.includes(x));
    const added = fresh.filter((x) => !BROWSER_GLOBALS.has(x));
    const removed = b.filter((x) => !n.includes(x));
    detail.roles[role] = { baselineUnresolved: b.length, unresolved: n.length, newUnresolved: added, newStandardGlobals: fresh.filter((x) => BROWSER_GLOBALS.has(x)), removed };
    if (added.length) ok = false;
    if (role === 'entry') {
      const want = hasA ? [...cfg.legacy.removed_globals].sort() : [];
      const removedKnown = removed.filter((x) => cfg.legacy.removed_globals.includes(x)).sort();
      const stillThere = cfg.legacy.removed_globals.filter((x) => n.includes(x));
      detail.knownUndefinedRemoved = removedKnown;
      detail.knownUndefinedStillPresent = stillThere;
      detail.expectRemoved = want;
      if (JSON.stringify(removedKnown) !== JSON.stringify(want)) ok = false;
      if (hasA && stillThere.length) ok = false;
    }
  }
  check('unresolved-globals', ok, detail);
}

// ------------------------------------------------------------------ anchors report
{
  let rep = null;
  try { rep = JSON.parse(fs.readFileSync(anchorsFile, 'utf8')); } catch { /* missing */ }
  if (!rep) check('anchors', false, { error: `anchors report not found: ${path.relative(REPO, anchorsFile)}` });
  else {
    const bad = rep.patches.filter((p) => !p.ok || p.found !== p.expect);
    const byGroup = {};
    for (const p of rep.patches) { const g = (byGroup[p.group] ||= { patches: 0, expectedHits: 0, foundHits: 0 }); g.patches++; g.expectedHits += p.expect; g.foundHits += p.found; }
    check('anchors', bad.length === 0 && rep.patches.length > 0, { total: rep.patches.length, failed: bad.map((p) => ({ id: p.id, expect: p.expect, found: p.found })), byGroup, groups: rep.groups });
  }
}

// ------------------------------------------------------------------ ledger: no reused / colliding asset names
{
  const ledger = {};
  try {
    for (const line of fs.readFileSync(ledgerFile, 'utf8').split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const f = line.split('\t');
      const name = f[0].replace(/^assets\//, '').toLowerCase();
      (ledger[name] ||= {})[f[1]] = f[4];
    }
  } catch { check('ledger', false, { error: `ledger not readable: ${path.relative(REPO, ledgerFile)}` }); }
  if (Object.keys(ledger).length) {
    const legacyNames = new Set(legacyFiles.filter((f) => f.startsWith('assets/')).map((f) => path.basename(f).toLowerCase()));
    const problems = []; const seen = {};
    for (const rel of files.filter((f) => f.startsWith('assets/'))) {
      const name = path.basename(rel); const ln = name.toLowerCase();
      const sha = sha256(fs.readFileSync(path.join(distDir, rel)));
      if (seen[ln]) problems.push(`assets/${seen[ln]} and assets/${name} differ only by case`); seen[ln] = name;
      const prior = ledger[ln];
      if (!prior) continue;
      if (!prior[sha]) problems.push(`assets/${name} reuses a name published with different bytes (${Object.values(prior).join(', ')})`);
      else if (!legacyNames.has(ln) && !Object.values(prior).every((s) => s.startsWith('release:'))) problems.push(`new asset name assets/${name} collides with an archived name (${Object.values(prior).join(', ')})`);
    }
    check('ledger', problems.length === 0, { ledgerNames: Object.keys(ledger).length, assets: files.filter((f) => f.startsWith('assets/')).length, problems });
  }
}

// ------------------------------------------------------------------ references resolve
function refsOf(root, list) {
  const refs = [];
  for (const rel of list) {
    if (!isText(rel) || rel === '_ops/used-names.txt') continue;
    const txt = read(root, rel);
    for (const m of txt.matchAll(/\/assets\/([A-Za-z0-9._~-]+)/g)) refs.push({ from: rel, ref: `assets/${m[1].replace(/\.$/, '')}`, kind: 'abs' });
    if (/^assets\/.*\.(js|mjs)$/.test(rel)) {
      for (const m of txt.matchAll(/["'`]\.\/([A-Za-z0-9._-]+\.(?:m?js|css))["'`]/g)) refs.push({ from: rel, ref: `assets/${m[1]}`, kind: 'rel-import' });
    }
    if (/\.html$/i.test(rel)) {
      for (const m of txt.matchAll(/<(script|link|img|source)\b[^>]*?\b(src|href)\s*=\s*["']([^"'#?]+)[^"']*["'][^>]*>/gi)) {
        const tag = m[1].toLowerCase(); const u = m[3];
        if (tag === 'link' && !/\brel\s*=\s*["'](stylesheet|icon|manifest|apple-touch-icon|modulepreload|preload|shortcut icon)/i.test(m[0])) continue;
        if (/^([a-z]+:|\/\/|data:|blob:)/i.test(u) || u.startsWith('#')) continue;
        const target = u.startsWith('/') ? u.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(rel), u));
        refs.push({ from: rel, ref: target, kind: 'html-local' });
      }
    }
    if (/(^|\/)manifest\.json$|\.webmanifest$/.test(rel)) {
      try {
        const mj = JSON.parse(txt);
        for (const it of [...(mj.icons || []), ...(mj.screenshots || [])]) if (it.src && !/^[a-z]+:/i.test(it.src)) refs.push({ from: rel, ref: it.src.replace(/^\//, ''), kind: 'manifest' });
      } catch { /* parse errors are reported elsewhere */ }
    }
  }
  return refs;
}
{
  const dset = new Set(files);
  const lset = new Set(legacyFiles);
  const legacyDangling = new Set(refsOf(legacyDir, legacyFiles).filter((r) => !lset.has(r.ref)).map((r) => `${r.from}->${r.ref}`));
  const refs = refsOf(distDir, files);
  const dangling = refs.filter((r) => !dset.has(r.ref));
  const newDangling = dangling.filter((r) => !legacyDangling.has(`${r.from}->${r.ref}`));
  const assetRefs = refs.filter((r) => r.ref.startsWith('assets/'));
  check('references', newDangling.length === 0, {
    checked: refs.length, assetRefs: assetRefs.length, uniqueAssetRefs: [...new Set(assetRefs.map((r) => r.ref))].length,
    unresolved: newDangling, baselineUnresolved: dangling.filter((r) => legacyDangling.has(`${r.from}->${r.ref}`)),
  });
  const old = [cfg.legacy.entry, cfg.legacy.help, cfg.legacy.book, cfg.legacy.css, ...(cfg.legacy.orphans || [])].map((p) => path.basename(p));
  const leaks = [];
  for (const rel of files) {
    if (!isText(rel) || rel === '_ops/used-names.txt') continue;
    const t = read(distDir, rel);
    for (const n of old) if (t.includes(n) || t.includes(n.replace(/\.[^.]+$/, ''))) leaks.push({ file: rel, name: n });
  }
  const stillFiles = old.filter((n) => dset.has(`assets/${n}`));
  check('no-legacy-asset-names', leaks.length === 0 && stillFiles.length === 0, { leaks, legacyFilesPresent: stillFiles });
}

// ------------------------------------------------------------------ R0 mechanism invariants
{
  const problems = [];
  const info = {};
  if (!release) problems.push('version.json missing or unreadable');
  else {
    info.release = release;
    const entryRel = `assets/${release.entry}`;
    const ent = fs.existsSync(path.join(distDir, entryRel)) ? read(distDir, entryRel) : '';
    if (!ent.startsWith(`/*t0:${release.release}*/`)) problems.push('entry does not start with the /*t0:<rid>*/ sentinel');
    if ((ent.match(/\/\*t0:/g) || []).length !== 1) problems.push('entry must carry exactly one /*t0: sentinel');
    if (release.entry !== `index-${release.release}.js`) problems.push('version.json entry/release mismatch');
    for (const k of ['help', 'bookmark', 'css']) if (!fs.existsSync(path.join(distDir, 'assets', release[k]))) problems.push(`version.json ${k} asset missing`);
    const h = read(distDir, 'index.html');
    if (!h.includes(`'/assets/${release.entry}'`)) problems.push('index.html loader does not name the release entry');
    if (/controllerchange/.test(h)) problems.push('index.html still has a controllerchange handler');
    if (/rel=["']modulepreload["']/.test(h)) problems.push('index.html still has a modulepreload');
    if (/<script[^>]*type=["']module["'][^>]*src=["']\/assets\/index-/.test(h)) problems.push('index.html still has a parser-inserted module script for the entry');
    if (/animation:\s*boot-fade-in/.test(h)) problems.push('splash entrance animation still present');
    if (!/<script defer src="\/site-nav\.js/.test(h)) problems.push('site-nav.js is not deferred');
    const sw = read(distDir, 'sw.js');
    if (/skipWaiting\s*\(/.test(sw)) problems.push('sw.js calls skipWaiting()');
    if (!/clients\.claim\(\)/.test(sw)) problems.push('sw.js does not claim clients');
    if (!new RegExp(`gbg-r0-${release.release}`).test(sw)) problems.push('sw.js cache name does not carry the release id');
    if (!/r\.mode === 'navigate'/.test(sw)) problems.push('sw.js does not bail out on navigations');
    const nav = read(distDir, 'site-nav.css');
    if (/body\s*\{\s*animation:\s*gtbg-page-in/.test(nav)) problems.push('site-nav.css still animates body');
    const am = fs.existsSync(path.join(distDir, '_ops/asset-manifest.json')) ? JSON.parse(read(distDir, '_ops/asset-manifest.json')) : null;
    if (!am) problems.push('_ops/asset-manifest.json missing');
    else {
      const onDisk = files.filter((f) => f.startsWith('assets/'));
      const listed = Object.keys(am.assets).sort();
      if (JSON.stringify(onDisk) !== JSON.stringify(listed)) problems.push('_ops/asset-manifest.json does not list exactly the files in assets/');
      for (const f of onDisk) if (am.assets[f] && am.assets[f].sha256 !== sha256(fs.readFileSync(path.join(distDir, f)))) problems.push(`asset-manifest sha mismatch: ${f}`);
    }
    // the kill switch is NOT part of the public dist (2026-09-30 release verifier: it was served at /_ops/sw-kill.js).  The build keeps its copy
    // next to the dist, in release/<train>/_ops/sw-kill.js; the canonical source is ops/sw-kill.js (runbook level L2).
    if (files.some((f) => /(^|\/)sw-kill\.js$/.test(f))) problems.push('a sw-kill.js file is inside the public dist (it belongs in <out>/_ops/, outside dist)');
    const killSrc = path.join(REPO, 'ops/sw-kill.js');
    const killCopy = path.join(path.dirname(distDir), '_ops', 'sw-kill.js');
    if (!fs.existsSync(killSrc)) problems.push('ops/sw-kill.js (the kill switch) is missing');
    else if (fs.existsSync(killCopy) && fs.readFileSync(killCopy, 'utf8') !== fs.readFileSync(killSrc, 'utf8')) problems.push('<out>/_ops/sw-kill.js differs from ops/sw-kill.js');
    info.killSwitch = fs.existsSync(killCopy) ? 'copy beside the dist (not public)' : 'no copy beside the dist (canonical: ops/sw-kill.js)';
  }
  for (const f of [path.join(distDir, 'sw.js'), path.join(REPO, 'ops/sw-kill.js')]) {
    if (!fs.existsSync(f)) continue;
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(`node --check ${path.basename(f)}: ${(r.stderr || '').split('\n')[0]}`);
  }
  check('r0-mechanism', problems.length === 0, { problems, ...info });
}

// ------------------------------------------------------------------ no owner-review notes in shipped bytes
// Drafting notes for the owner ("[OWNER TO CONFIRM ...]" in HTML comments) belong in ops/legal-drafts, never in a published page (release verifier 2026-09-30).
{
  const hits = [];
  for (const rel of files) {
    if (!isText(rel)) continue;
    if (/(OWNER[ _-]TO[ _-]CONFIRM|OWNER[ -]REVIEW[ -]REQUIRED|\[\[WHEN SHIPPED\]\])/i.test(read(distDir, rel))) hits.push(rel);
  }
  check('no-owner-notes', hits.length === 0, { problems: hits.map((f) => `${f} carries an owner-review marker`) });
}

// ------------------------------------------------------------------ baseline pin and T0 rule 5 (no /data/* edits)
{
  const treeDigest = (root, list) => {
    const h = crypto.createHash('sha256');
    for (const rel of [...list].sort()) h.update(`${rel}\0${sha256(fs.readFileSync(path.join(root, rel)))}\n`);
    return h.digest('hex');
  };
  if (!args.legacy) {
    // default build: legacy/dist (the downloaded deploy 6aa16d61) must still be byte-exact, and baseline/dist must match its lock
    const legacyRoot = rp(cfg.legacy.dir);
    const lf = walk(legacyRoot);
    const d = treeDigest(legacyRoot, lf);
    check('legacy-pinned', d === cfg.legacy.tree_sha256 && lf.length === cfg.legacy.file_count, { digest: d, pinned: cfg.legacy.tree_sha256, files: lf.length });
    const lock = JSON.parse(fs.readFileSync(rp(cfg.base.lock), 'utf8'));
    const bad = [];
    for (const f of new Set([...Object.keys(lock.files), ...legacyFiles])) {
      if (!legacyFiles.includes(f)) bad.push(`missing: ${f}`);
      else if (!lock.files[f]) bad.push(`extra: ${f}`);
      else if (sha256(fs.readFileSync(path.join(legacyDir, f))) !== lock.files[f].sha256) bad.push(`changed: ${f}`);
    }
    const bd = treeDigest(legacyDir, legacyFiles);
    check('baseline-pinned', bad.length === 0 && bd === lock.tree_sha256 && legacyFiles.length === lock.file_count,
      { digest: bd, pinned: lock.tree_sha256, files: legacyFiles.length, lock: cfg.base.lock, problems: bad.slice(0, 20) });
  }
  const ldata = legacyFiles.filter((f) => f.startsWith('data/'));
  const ddata = new Set(files.filter((f) => f.startsWith('data/')));
  const modified = ldata.filter((f) => ddata.has(f) && sha256(fs.readFileSync(path.join(legacyDir, f))) !== sha256(fs.readFileSync(path.join(distDir, f))));
  const removed = ldata.filter((f) => !ddata.has(f));
  const added = [...ddata].filter((f) => !ldata.includes(f));
  // Owner decision 2026-10-05 (item 3): the optional group DATA corrects served data files. A file may differ from the baseline ONLY when the
  // builder's anchor report shows an applied patch of group DATA that targets exactly that file; any other change, and any removal, still fails.
  let dataTargets = new Set();
  try {
    const rep = JSON.parse(fs.readFileSync(anchorsFile, 'utf8'));
    dataTargets = new Set((rep.patches || []).filter((p) => p.group === 'DATA' && p.ok && p.found > 0 && /^data\//.test(p.target || '')).map((p) => p.target));
  } catch { /* no anchor report: nothing is excused */ }
  const unexplained = modified.filter((f) => !dataTargets.has(f));
  check('data-untouched', unexplained.length === 0 && removed.length === 0, { legacyDataFiles: ldata.length, modified: unexplained, removed, added, changedByGroupDATA: modified.length - unexplained.length });
}

// ------------------------------------------------------------------ bytes
{
  const total = (root, list) => list.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0);
  const byDir = {};
  for (const f of files) { const d = f.includes('/') ? f.split('/')[0] : '(root)'; byDir[d] = (byDir[d] || 0) + fs.statSync(path.join(distDir, f)).size; }
  const biggest = files.map((f) => ({ file: f, bytes: fs.statSync(path.join(distDir, f)).size })).sort((a, b) => b.bytes - a.bytes).slice(0, 12);
  const entryRel = release ? `assets/${release.entry}` : null;
  const legacyTotal = total(legacyDir, legacyFiles);
  const distTotal = total(distDir, files);
  check('bytes', true, {
    files: files.length, totalBytes: distTotal, legacyFiles: legacyFiles.length, legacyTotalBytes: legacyTotal, deltaBytes: distTotal - legacyTotal,
    byTopLevel: byDir, biggest,
    entryBytes: entryRel && fs.existsSync(path.join(distDir, entryRel)) ? fs.statSync(path.join(distDir, entryRel)).size : null,
    entryBrotliBytes: entryRel && fs.existsSync(path.join(distDir, entryRel)) ? zlib.brotliCompressSync(fs.readFileSync(path.join(distDir, entryRel))).length : null,
  });
}

const ok = checks.every((c) => c.ok);
const result = { ok, train, dist: path.relative(REPO, distDir).split(path.sep).join('/'), checks };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
for (const c of checks) {
  const extra = c.id === 'bytes' ? `${c.totalBytes} B in ${c.files} files (delta ${c.deltaBytes >= 0 ? '+' : ''}${c.deltaBytes} vs the baseline)` :
    c.id === 'anchors' ? `${c.total ?? 0} patch records, ${c.failed?.length ?? '?'} failed` :
      c.id === 'references' ? `${c.checked} refs, ${c.uniqueAssetRefs} distinct /assets/ names, ${c.unresolved?.length ?? '?'} new unresolved` :
        c.id === 'unresolved-globals' ? `new: ${JSON.stringify(c.roles?.entry?.newUnresolved ?? '?')}, known removed: ${JSON.stringify(c.knownUndefinedRemoved ?? [])}` :
          c.id === 'parse' ? `${c.parsed} scripts parsed, ${c.failures?.length ?? '?'} new failures` : '';
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id.padEnd(20)} ${extra}`);
  if (!c.ok) console.log('      ', JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => ['problems', 'failures', 'unresolved', 'failed', 'leaks', 'error', 'roles', 'knownUndefinedStillPresent'].includes(k)))).slice(0, 1500));
}
console.log(ok ? `gate OK -> ${path.relative(REPO, outFile)}` : `gate FAILED -> ${path.relative(REPO, outFile)}`);
process.exit(ok ? 0 : 1);
