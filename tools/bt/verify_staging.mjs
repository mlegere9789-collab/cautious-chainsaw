// Real-run check of a packed Battle Theatre staging build. The packer (tools/bt/pack_theatre.mjs) finds what the page loads by reading the code; this tool finds out what the page
// ACTUALLY loads, with a browser (software WebGL2, one at a time), and compares:
//   1. static: the dist matches its MANIFEST.json byte for byte; the zip holds exactly the dist (names, sizes, CRC-32) and its .sha256 file is right; every relative import of the dist exists;
//   2. the packed dist is served the way Netlify serves it (its _headers file applied) and walked: enter the theatre with the figures on, start the sound (what a click does), let the added
//      layers (src/ext) settle, run the scene at 3 July 13:30, fly to a unit, play at 2x and at 60x, go to dawn, dusk and night of 3 July and to 4 July 15:00 (rain), open every drawer, select a unit, switch every added layer
//      on and open every added panel, press Back; then every page of each static section (app/roster when it exists) is visited, its links followed and its controls pressed;
//   3. the same walk is made against the SOURCE tree (a snapshot of it with --pack, so that nobody's edit moves the target during the run);
//   4. verdict: every request to the packed site answers 2xx (zero 404s); every URL the source run loaded exists in the dist; no console error or page error appears only in the dist run;
//      every step that passes at the source passes in the dist; the sound started; the added layers are in the same state in both runs; every page of a static section loads in both.
// What a run cannot show is printed with the verdict (NOT RUN): the real GPU, the WebGPU picture, hearing the sound, other visits (?history=stub, ?api=webgpu, ?ext=off).
//
//   node tools/bt/verify_staging.mjs --pack [--frames 20] [--json report.json]          snapshot the tree, pack it (zip into deliver/, dist in tmp/bt-spec/verify/work), verify the result; a build that
//                                                                                        passes everything also refreshes deliver/bt-staging/dist; deliver/bt-staging/LAST-VERIFY.txt says what happened
//   node tools/bt/verify_staging.mjs --dist deliver/bt-staging/dist [--zip file.zip] [--source docs/battle-theatre] [--frames 20] [--json report.json] [--only dist|source]
//   add --static-only for the checks that need no browser (manifest, zip, links, copy audit); --query a=b for a development shortcut (never the official check)
// Run it through the machine lock (tools/horde/bench.sh): a software frame takes seconds. Exit 0 only when every check passes.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto'; import zlib from 'node:zlib'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { pack, trace, SECTIONS, IMPORT_RE, CSS_URL_RE } from './pack_theatre.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../..'), BT = path.join(REPO, 'docs/battle-theatre');
const posix = p => p.split(path.sep).join('/');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
export const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };

// ---------------------------------------------------------------- the server: the dist as Netlify serves it
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.md': 'text/markdown; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.gz': 'application/gzip' };
/** The rules of a Netlify `_headers` file: a path pattern on its own line, then indented `Name: value` lines. `*` matches anything, `:name` one path segment. */
export function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim() || /^\s*#/.test(raw)) { if (!raw.trim()) cur = null; continue; }
    if (/^\s/.test(raw)) { const m = /^\s+([A-Za-z0-9-]+)\s*:\s*(.*?)\s*$/.exec(raw); if (m && cur) cur.headers[m[1].toLowerCase()] = m[2]; continue; }
    const pattern = raw.trim(); cur = { pattern, headers: {}, regex: new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[A-Za-z_]\w*/g, '[^/]+') + '$') }; rules.push(cur);
  }
  return rules;
}
export const headersFor = (rules, urlPath) => Object.assign({}, ...rules.filter(r => r.regex.test(urlPath)).map(r => r.headers));
/** Serves root on 127.0.0.1:port (0 = any free port) and records every request (method, path, status). */
export function serveDir(root, port = 0) {
  root = path.resolve(root); const events = [], hf = path.join(root, '_headers'), rules = isFile(hf) ? parseHeaders(fs.readFileSync(hf, 'utf8')) : [];
  const srv = http.createServer((q, s) => {
    let u; try { u = decodeURIComponent(q.url.split('?')[0]); } catch { u = '/'; }
    let f = path.join(root, u); if (u.endsWith('/')) f = path.join(f, 'index.html');
    if (!f.startsWith(root + path.sep) || !isFile(f)) { events.push({ m: q.method, p: u, s: 404 }); s.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' }); return s.end('not found'); }
    const b = fs.readFileSync(f), h = { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', ...headersFor(rules, u), 'content-length': b.length };
    events.push({ m: q.method, p: u, s: 200 }); s.writeHead(200, h); s.end(q.method === 'HEAD' ? undefined : b);
  });
  return new Promise(res => srv.listen(port, '127.0.0.1', () => res({ srv, port: srv.address().port, events, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) })));
}
/** Worst status per path from the server's event list: a path that ever answered 4xx is 404. */
export function logOf(events) { const log = {}; for (const e of events) log[e.p] = Math.max(log[e.p] || 0, e.s); return Object.fromEntries(Object.entries(log).sort()); }

// ---------------------------------------------------------------- 1. static checks of the dist and the zip
export function checkManifest(dist) {
  const out = { ok: true, problems: [], version: null, files: 0 }, mf = path.join(dist, 'MANIFEST.json');
  if (!isFile(mf)) return { ok: false, problems: ['MANIFEST.json is missing'], version: null, files: 0 };
  let m; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { return { ok: false, problems: ['MANIFEST.json does not parse: ' + e.message], version: null, files: 0 }; }
  out.version = m.version; const listed = new Set();
  for (const f of m.files || []) { listed.add(f.path); const p = path.join(dist, f.path); if (!isFile(p)) { out.problems.push(`listed but missing: ${f.path}`); continue; } const b = fs.readFileSync(p); if (b.length !== f.bytes) out.problems.push(`size differs: ${f.path} (${b.length}, manifest ${f.bytes})`); else if (sha256(b) !== f.sha256) out.problems.push(`content differs: ${f.path}`); }
  const onDisk = walk(dist).map(f => posix(path.relative(dist, f))).filter(f => f !== 'MANIFEST.json'); out.files = onDisk.length;
  for (const f of onDisk) if (!listed.has(f)) out.problems.push(`on disk but not in the manifest: ${f}`);
  out.ok = out.problems.length === 0; return out;
}
/** The entries of a zip from its central directory: [{ name, crc, size, packed }]. */
export function readZipDirectory(buf) {
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('no end-of-central-directory record: not a zip');
  const n = buf.readUInt16LE(e + 10), off = buf.readUInt32LE(e + 16), out = []; let p = off; Object.defineProperty(out, 'comment', { value: buf.toString('utf8', e + 22, e + 22 + buf.readUInt16LE(e + 20)) });
  for (let i = 0; i < n; i++) { if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('damaged central directory'); const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    out.push({ name: buf.toString('utf8', p + 46, p + 46 + nl), crc: buf.readUInt32LE(p + 16), packed: buf.readUInt32LE(p + 20), size: buf.readUInt32LE(p + 24) }); p += 46 + nl + xl + cl; }
  return out;
}
export function checkZip(zip, dist) {
  const out = { ok: true, problems: [], zip: path.basename(zip), bytes: 0, sha256: null, entries: 0 };
  if (!isFile(zip)) return { ...out, ok: false, problems: ['the zip is not there: ' + zip] };
  const buf = fs.readFileSync(zip); out.bytes = buf.length; out.sha256 = sha256(buf);
  const side = zip + '.sha256'; if (!isFile(side)) out.problems.push('no .sha256 file beside the zip'); else { const w = fs.readFileSync(side, 'utf8').trim().split(/\s+/); if (w[0] !== out.sha256) out.problems.push(`the .sha256 file says ${w[0]}, the zip is ${out.sha256}`); if (w[1] && w[1] !== path.basename(zip)) out.problems.push(`the .sha256 file names ${w[1]}`); }
  let ents = []; try { ents = readZipDirectory(buf); } catch (e) { out.problems.push(e.message); }
  out.entries = ents.length; if (ents.comment) out.problems.push('the zip carries a comment: ' + ents.comment.slice(0, 80)); const byName = new Map(ents.map(x => [x.name, x])), onDisk = walk(dist).map(f => posix(path.relative(dist, f)));
  for (const f of onDisk) { const z = byName.get(f); if (!z) { out.problems.push(`in the dist, not in the zip: ${f}`); continue; } const b = fs.readFileSync(path.join(dist, f)); if (z.size !== b.length) out.problems.push(`size differs in the zip: ${f}`); else if (z.crc !== zlib.crc32(b)) out.problems.push(`content differs in the zip: ${f}`); }
  for (const x of ents) if (!onDisk.includes(x.name)) out.problems.push(`in the zip, not in the dist: ${x.name}`);
  const v = (checkManifest(dist).version || ''); if (v && !new RegExp(`^gettysburg-BT-staging-${v}(-AUDIT-HITS-\\d+)?\\.zip$`).test(path.basename(zip))) out.problems.push(`the zip name does not carry the build version ${v}`);
  try { execFileSync('unzip', ['-tq', zip], { stdio: 'pipe' }); out.unzipTest = 'ok'; } catch (e) { if (e.code === 'ENOENT') out.unzipTest = 'unzip not installed'; else { out.unzipTest = 'FAILED'; out.problems.push('unzip -t failed'); } }
  out.ok = out.problems.length === 0; return out;
}
/** Files that are working notes or build leftovers never belong in a shipped folder (README or notes, source maps, logs, backups, dot files): the copy rules cover "README or notes included in the zip" and source maps. */
export function checkNoNotes(dist) {
  const bad = walk(dist).map(f => posix(path.relative(dist, f))).filter(f => /(^|\/)(readme|notes?|todo|changelog)(\.[a-z]+)?$/i.test(f) || /\.(md|map|log|orig|bak|tmp|rej|swp)$|~$/i.test(f) || /(^|\/)\.[^/]+$/.test(f));
  return { ok: bad.length === 0, problems: bad.map(f => 'a notes or leftover file ships: ' + f) };
}
/** Every relative import, style-sheet address and page link of the dist's own files exists in the dist (a check of the finished folder, not of the trace). */
export function checkInternalLinks(dist) {
  const have = new Set(walk(dist).map(f => posix(path.relative(dist, f)))), problems = [], notes = []; let n = 0;
  const exists = (from, spec) => {
    const s = spec.replace(/[?#].*$/, ''); if (!s) return true; n++; const abs = (s.startsWith('/') ? posix(path.normalize(s.slice(1))) : posix(path.normalize(path.join(path.dirname(from), s)))).replace(/^\.\//, '').replace(/^\.$/, '');
    if (abs.startsWith('../') || abs === '..') { problems.push(`${from}: ${spec} leaves the dist`); return true; }
    return have.has(abs) || have.has((abs === '' ? '' : abs.replace(/\/?$/, '/')) + 'index.html');
  };
  for (const f of have) {
    const abs = path.join(dist, f);
    if (/\.(mjs|js)$/.test(f)) { const src = fs.readFileSync(abs, 'utf8'); for (const m of src.matchAll(IMPORT_RE)) { const s = m[1] ?? m[2]; if ((s.startsWith('./') || s.startsWith('../')) && !exists(f, s)) (m[1] != null ? problems : notes).push(`${f}: ${m[1] != null ? 'import' : 'import() of'} ${s}${m[1] != null ? '' : ' (a guarded optional load)'}`); } }
    else if (/\.css$/.test(f)) { const src = fs.readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); for (const m of src.matchAll(CSS_URL_RE)) { const s = (m[2] ?? m[4] ?? '').trim(); if (s && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(s) && !exists(f, s)) problems.push(`${f}: url(${s})`); } }
    else if (/\.html?$/.test(f)) { const src = fs.readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      for (const m of src.matchAll(/<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) { let j = null; try { j = JSON.parse(m[1]); } catch { problems.push(`${f}: the import map does not parse`); } for (const v of Object.values({ ...(j && j.imports) })) if (typeof v === 'string' && (v.startsWith('./') || v.startsWith('../') || v.startsWith('/')) && !exists(f, v)) problems.push(`${f}: import map target ${v}`); } for (const m of src.matchAll(/<(?:script|img|source|link|audio|video|a)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) { const s = m[1]; if (!/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(s) && !exists(f, s)) problems.push(`${f}: ${s}`); } }
  }
  return { ok: problems.length === 0, checked: n, problems: [...new Set(problems)], notes: [...new Set(notes)] };
}

// ---------------------------------------------------------------- the data side of the theatre's start, in node (no browser, no machine lock, about a second)
// The loaders of the shell (timeline, conflicts, sky tables, bookmarks, terrain, the history data, the real history layer, the structure inputs) are imported FROM THE DIST, so that the
// URLS of config.mjs point into it; fetch() answers 404 for a file the dist does not hold, and every address is logged. A missing data file shows here at once; the browser walk stays the
// arbiter for everything that needs a renderer (effects, sound, added layers). Run in a child process: it replaces fetch().
async function dataProbe(dist) {
  const { pathToFileURL } = await import('node:url'); dist = path.resolve(dist); const log = [], realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const url = new URL(typeof u === 'string' ? u : u.href || String(u)); if (url.protocol !== 'file:') return realFetch(u, o);
    const f = fileURLToPath(url), ok = f.startsWith(dist + path.sep) && isFile(f); log.push({ rel: posix(path.relative(dist, f)), method: (o && o.method) || 'GET', status: ok ? 200 : 404 });
    if (!ok) return new Response('not found', { status: 404 }); const b = fs.readFileSync(f); return new Response(b, { status: 200, headers: { 'content-length': String(b.length) } });
  };
  const imp = rel => import(pathToFileURL(path.join(dist, rel)).href), steps = [];
  const step = async (name, fn) => { const t0 = Date.now(); try { const r = await fn(); steps.push({ name, ok: true, ms: Date.now() - t0, r }); } catch (e) { steps.push({ name, ok: false, ms: Date.now() - t0, error: String((e && e.message) || e).slice(0, 300) }); } };
  let D, W, URLS, raw = null, T = null;
  await step('import the loaders from the dist', async () => { D = await imp('app/src/data.mjs'); W = await imp('render/prototype/src/world.mjs'); ({ URLS } = await imp('app/src/config.mjs')); });
  if (D) {
    await step('timeline, conflicts, sky tables, bookmarks', async () => { const [t, c, e, b] = await Promise.all([D.loadTimeline(), D.loadConflicts(), D.loadEnvironmentFiles(), D.loadBookmarks()]); return { rows: t.length, conflicts: Array.isArray(c) ? c.length : Object.keys(c).length, sky: e.length, bookmarks: Array.isArray(b) ? b.length : Object.keys(b).length }; });
    await step('terrain', async () => { T = await W.loadTerrain(URLS.proto); return { N: T.N ?? null }; });
    await step('history data', async () => { raw = await D.loadHistoryData(); return Object.keys(raw).length + ' parts'; });
    await step('real history layer', async () => { const R = await imp('app/src/history/real.mjs'); const layer = R.createRealHistory({ raw, T, helpers: { civilDawn: () => null } }); return { units: layer.units.length, stub: !!layer.meta.stub }; });
    await step('structure inputs', async () => { const S = await imp('app/src/structures/index.mjs'); const x = await S.loadStructureInputs(raw); return Object.keys(x || {}).length + ' parts'; });
  }
  const by = {}; for (const e of log) { const k = e.rel + (e.method === 'GET' ? '' : ' ' + e.method); by[k] = Math.max(by[k] || 0, e.status); }
  console.log(JSON.stringify({ requests: log.length, distinct: Object.keys(by).length, notFound: Object.entries(by).filter(([, st]) => st !== 200).map(([k]) => k), steps }));
}
export function checkDataPipeline(dist) {
  let out; const run = () => execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--data-probe', path.resolve(dist)], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 });
  try { out = JSON.parse(run().trim().split('\n').pop()); } catch (e) { return { ok: false, problems: ['the data probe did not run: ' + String(e.stderr || e.message).slice(0, 300)], notes: [], steps: [] }; }
  const problems = out.notFound.map(u => `not found when the loaders of the dist ran in node: ${u}`), notes = [];
  for (const st of out.steps) if (!st.ok) (/is not a function|does not provide an export|is not defined|Cannot read properties/.test(st.error) ? notes : problems).push(`data probe step "${st.name}": ${st.error}`);
  return { ok: problems.length === 0, requests: out.requests, distinct: out.distinct, steps: out.steps.map(st => `${st.ok ? 'ok  ' : 'FAIL'} ${st.name}${st.r ? ' ' + JSON.stringify(st.r) : ''}`), problems, notes: notes.map(n => n + ' (the probe may be out of date with the shell: the browser walk decides)') };
}

// ---------------------------------------------------------------- 4. the comparison (pure: tested in tests/bt-pack/verify.test.mjs)
const hasFile = (distFiles, u) => distFiles.has(u) || (u.endsWith('/') && distFiles.has(u + 'index.html'));
const okStatus = s => s >= 200 && s < 400;
const normError = e => String(e.text ?? e).replace(/https?:\/\/127\.0\.0\.1:\d+/g, 'ORIGIN').replace(/\s+/g, ' ').slice(0, 220);
/** A, B: the dist run and the source run, each { log: { path: status }, errors: [{ kind, text }], failed: [..], entered, info: { sound }, steps: [{ name, ok, error }], ext: { index, modules: [{ path, state }] } | null, crawl: { pages: [{ url, status }] } }.
 *  distFiles: Set of '/path' of the dist. Returns { ok, failures, notes, missingInDist, errorsOnlyInDist, errorsInBoth }. */
export function compareRuns(A, B, distFiles) {
  const failures = [], notes = [], hint = l => l.slice(0, 8).join(', ') + (l.length > 8 ? `, and ${l.length - 8} more` : '');
  if (!A.entered) failures.push('the packed site did not enter the theatre (the theatre never reported ready)');
  if (B && !B.entered) notes.push('the source tree did not enter the theatre either: nothing to compare against beyond the 404 check');
  const bad = Object.entries(A.log).filter(([, s]) => !okStatus(s)).map(([u, s]) => `${s} ${u}${B && B.log[u] !== undefined && !okStatus(B.log[u]) ? ' (also at the source: the page asks for a file that is not in the tree)' : ''}`); if (bad.length) failures.push(`${bad.length} request(s) to the packed site did not answer 2xx: ${hint(bad)}`);
  const lost = (A.failed || []).filter(f => !/ERR_ABORTED/.test(f.failure || '')); if (lost.length) failures.push(`${lost.length} request(s) of the packed site failed in the browser: ${hint(lost.map(f => `${f.failure} ${f.url}`))}`);
  const missingInDist = B ? Object.entries(B.log).filter(([u, s]) => okStatus(s) && !hasFile(distFiles, u)).map(([u]) => u) : []; if (missingInDist.length) failures.push(`${missingInDist.length} URL(s) the source run loaded are not in the dist: ${hint(missingInDist)}`);
  const errA = new Set((A.errors || []).map(normError)), errB = new Set(((B && B.errors) || []).map(normError));
  const errorsOnlyInDist = [...errA].filter(e => !errB.has(e)), errorsInBoth = [...errA].filter(e => errB.has(e));
  if (errorsOnlyInDist.length) failures.push(`${errorsOnlyInDist.length} console or page error(s) appear only in the packed site: ${hint(errorsOnlyInDist)}`);
  if (errorsInBoth.length) notes.push(`${errorsInBoth.length} console or page error(s) appear in the source run too (a product matter, not a packaging one): ${hint(errorsInBoth)}`);
  if (A.entered && A.info && A.info.sound !== true) { if (B && B.info && B.info.sound === true) failures.push('the sound did not start in the packed site (it did at the source)'); else notes.push('the sound did not start in either run'); }
  const bs = new Map(((B && B.steps) || []).map(s => [s.name, s]));
  for (const s of A.steps || []) if (!s.ok) { const o = bs.get(s.name); if (o && !o.ok) notes.push(`step "${s.name}" failed in both runs: ${s.error}`); else failures.push(`step "${s.name}" failed in the packed site${o ? ' (passed at the source)' : ''}: ${s.error}`); }
  const mb = new Map((((B && B.ext) || {}).modules || []).map(m => [m.path, m]));
  for (const m of ((A.ext || {}).modules || [])) { const o = mb.get(m.path); if (o && o.state !== m.state) failures.push(`added layer ${m.path}: ${m.state} in the packed site, ${o.state} at the source`); else if (m.state !== 'running' && (!o || o.state !== 'running')) notes.push(`added layer ${m.path} is "${m.state}" in both runs: ${m.error || ''}`); }
  if (A.ext && B && B.ext && A.ext.index !== B.ext.index) failures.push(`the list of added layers is "${A.ext.index}" in the packed site, "${B.ext.index}" at the source`);
  const pa = new Map(((A.crawl || {}).pages || []).map(p => [p.url, p.status])), pb = new Map(((B && B.crawl) || {}).pages ? B.crawl.pages.map(p => [p.url, p.status]) : []);
  for (const [u, s] of pa) if (!okStatus(s)) failures.push(`section page did not load in the packed site (${s}): ${u}`);
  for (const [u, s] of pb) if (okStatus(s) && !pa.has(u)) failures.push(`section page visited at the source and not in the packed site: ${u}`);
  return { ok: failures.length === 0, failures, notes, missingInDist, errorsOnlyInDist, errorsInBoth };
}

// ---------------------------------------------------------------- 3. the snapshot of the source tree
// folders that no page of the shell can load (design notes, raw rosters, terrain sources, tests and tools of the shell): left out so that the copy is small. A request into one of them
// answers 404 in BOTH runs, so the dist run still reports it.
export const SNAPSHOT_EXCLUDE = ['rosters/data', 'rosters/pilot', 'rosters/pipeline', 'rosters/pipeline2', 'terrain', 'library', 'BIBLE', 'fidelity', 'drill', 'assets', 'audio', 'app/tests', 'app/docs', 'app/tools', 'render/shots', 'render/results'];
export function snapshotTree(src, dst, exclude = SNAPSHOT_EXCLUDE) {
  fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true, filter: s => { const r = posix(path.relative(src, s)); return !exclude.some(e => r === e || r.startsWith(e + '/')); } });
  return dst;
}

// ---------------------------------------------------------------- 2. the browser walk
const SW_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
async function launch() {
  const { chromium } = await import('../../node_modules/playwright-core/index.mjs');
  try { return await chromium.launch({ channel: 'chrome', headless: true, args: SW_ARGS }); } catch { return chromium.launch({ headless: true, args: SW_ARGS }); }
}
/** What the page does, run inside the theatre. Every step is logged ("[verify] ...") as it ends, so that a hang shows where; a step that throws is recorded and the walk goes on. */
async function theatreWalk({ frames }) {
  const a = window.btApp, th = a.theatre, steps = [], out = { api: a.api, crowd: !!(th.host && th.host.crowd), fx: !!th.fxOn, steps, ext: null }; window.__verifySteps = steps;
  const { minOf } = await import(new URL('./src/clock.mjs', document.baseURI).href);
  const step = async (name, fn) => { const t0 = performance.now(); let rec; try { const r = await fn(); rec = { name, ok: true, ms: Math.round(performance.now() - t0) }; if (r !== undefined) rec.r = r; } catch (e) { rec = { name, ok: false, ms: Math.round(performance.now() - t0), error: String((e && e.message) || e).slice(0, 240) }; } steps.push(rec); console.info('[verify] ' + JSON.stringify({ name: rec.name, ok: rec.ok, ms: rec.ms, error: rec.error })); };
  const settle = async () => { if (a.ext && a.ext.whenSettled) await a.ext.whenSettled(); };
  const snapshotExt = () => a.ext ? { index: a.ext.index && a.ext.index.state, modules: a.ext.status().map(m => ({ path: m.path, state: m.state, stage: m.stage, error: m.error, late: m.late, panels: m.panels, toggles: m.toggles })), problems: a.ext.problems() } : null;
  await step('added layers settle', async () => { await settle(); out.ext = snapshotExt(); return out.ext && out.ext.modules.map(m => m.path + ':' + m.state); });
  await step('sound starts', async () => { out.sound = th.audio ? await th.audio.start() : null; if (out.sound !== true) throw new Error('audio.start() answered ' + out.sound); });
  await step('3 July 13:30', async () => { a.setTime(minOf(7, 3, 13, 30)); await a.frames(frames); });
  let ui = -1;
  await step('fly to a unit', async () => {
    const L = th.layer, w = th.world, f = w.unitF; for (let i = 0; i < L.units.length; i++) if (a.stage.present[i] && w.units[i].count > 20) { ui = i; break; }
    if (ui < 0) throw new Error('no unit with more than 20 figures is present'); const v = th.viewFor(f[ui * 12], f[ui * 12 + 1], { dist: 30, height: 5, yaw: f[ui * 12 + 2] }); th.cam.set(v.x, v.y, v.z, v.yaw, v.pitch, 55); await a.frames(frames); return ui;
  });
  await step('play at 2x', async () => { a.setPlaying(true); a.setSpeed(2); await a.frames(frames); a.setPlaying(false); });
  await step('play at 60x', async () => { a.setPlaying(true); a.setSpeed(60); await a.frames(Math.max(4, frames >> 1)); a.setPlaying(false); a.setSpeed(1); });
  const few = Math.max(6, frames >> 1);
  await step('3 July 04:30 (dawn)', async () => { a.setTime(minOf(7, 3, 4, 30)); await a.frames(few); });
  await step('3 July 19:30 (dusk)', async () => { a.setTime(minOf(7, 3, 19, 30)); await a.frames(few); });
  await step('3 July 23:00 (night)', async () => { a.setTime(minOf(7, 3, 23, 0)); await a.frames(few); });
  await step('4 July 15:00 (rain)', async () => { a.setTime(minOf(7, 4, 15, 0)); await a.frames(frames); });
  await step('open every drawer', async () => { const done = []; for (const b of [...document.querySelectorAll('[data-panel]')]) { if (b.hidden || b.offsetParent === null) continue; b.click(); await a.frames(2); done.push(b.dataset.panel); b.click(); await a.frames(1); } if (!done.length) throw new Error('no drawer button is visible'); return done; });
  await step('select a unit', async () => { if (ui < 0) throw new Error('no unit was chosen'); a.select(ui); await a.frames(3); a.select(-1); await a.frames(1); });
  await step('added layers: switches and panels', async () => {
    await settle(); const ex = a.ext; if (!ex) return 'no loader'; const st = ex.status(), did = [];
    for (const m of st) for (const id of m.toggles || []) { await ex.setToggle(id, true); await a.frames(3); did.push('switch ' + id); }
    for (const m of st) for (const id of m.panels || []) { ex.openPanel(id); await a.frames(3); ex.closePanel(id); await a.frames(1); did.push('panel ' + id); }
    const tour = th.sitePlaces && th.sitePlaces.tour; if (tour && tour.stops) { const s = tour.stops()[0]; if (s) { tour.flyTo(s.id); await a.frames(frames); did.push('tour stop ' + s.id); } }
    for (const m of st) for (const id of m.toggles || []) { await ex.setToggle(id, false); did.push('switch off ' + id); }
    await a.frames(2); out.ext = snapshotExt(); return did;
  });
  out.soundStarted = th.audio ? th.audio.started : null; out.units = ui; out.perf = (() => { try { const p = a.perf(); return { frames: p.frames, p50: p.p50, entryMs: p.entryMs }; } catch { return null; } })();
  return out;
}
const PAGE_GUARD = (page, tag, sink) => {
  page.on('console', m => { const t = m.text(); if (m.type() === 'error') sink.errors.push({ kind: 'console', text: t.slice(0, 400) }); else if (t.startsWith('[verify] ')) sink.print(`${tag} ${t.slice(9)}`); });
  page.on('pageerror', e => sink.errors.push({ kind: 'pageerror', text: String((e && e.message) || e).slice(0, 400) }));
  page.on('requestfailed', r => { try { const u = new URL(r.url()); if (u.origin === sink.origin) sink.failed.push({ url: u.pathname, failure: r.failure() && r.failure().errorText }); } catch { /* not a URL */ } });
  page.on('dialog', d => d.dismiss().catch(() => { }));
};
/** Visits every page of each section (app/roster, ...), follows links that stay inside the section, presses a few controls, types into a search box. */
export async function crawlSections(ctx, base, sections, sink, { max = 150, pokes = 6 } = {}) {
  const pages = [], interactions = [], queue = sections.flatMap(s => s.pages.map(p => ({ url: base + '/' + p, prefix: '/' + s.path + '/' }))), seen = new Set();
  while (queue.length && seen.size < max) {
    const { url, prefix } = queue.shift(); const key = url.replace(/#.*$/, ''); if (seen.has(key)) continue; seen.add(key);
    const page = await ctx.newPage(); PAGE_GUARD(page, '[section]', sink);
    try {
      const r = await page.goto(key, { waitUntil: 'load', timeout: 180000 }).catch(() => null); await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });
      pages.push({ url: new URL(key).pathname, status: r ? r.status() : 0 });
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href)).catch(() => []);
      for (const l of links) { try { const u = new URL(l); if (u.origin === new URL(base).origin && u.pathname.startsWith(prefix) && /(\.html?|\/)$/.test(u.pathname)) queue.push({ url: u.origin + u.pathname + u.search, prefix }); } catch { /* skip */ } }
      const box = page.locator('input[type=search], input[type=text], input:not([type])').first(); if (await box.count().catch(() => 0)) { await box.fill('a', { timeout: 5000 }).catch(() => { }); await page.waitForTimeout(600); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { }); interactions.push(new URL(key).pathname + ': typed in the search box'); }
      const ctl = page.locator('button:not([disabled]), summary, [role=tab], [role=button], [data-unit], [data-id]'); const n = Math.min(pokes, await ctl.count().catch(() => 0));
      for (let i = 0; i < n; i++) { if (new URL(page.url()).pathname !== new URL(key).pathname) break; await ctl.nth(i).click({ timeout: 5000, noWaitAfter: true }).catch(() => { }); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { }); interactions.push(new URL(key).pathname + ': pressed control ' + (i + 1)); }
    } finally { await page.close().catch(() => { }); }
  }
  return { pages, interactions };
}
/** One walk against a served folder. Returns { log, errors, failed, entered, info, steps, ext, crawl, seconds }. */
export async function runWalk(root, { frames = 20, label = 'run', sections = [], limitMs = 90 * 60 * 1000, query = '', crawlMax = 150, print = s => console.log(s) } = {}) {
  const t0 = Date.now(), server = await serveDir(root), base = `http://127.0.0.1:${server.port}`, sink = { errors: [], failed: [], origin: base, print: s => print(`  [${label} +${Math.round((Date.now() - t0) / 1000)}s] ${s}`) };
  const res = { label, entered: false, info: {}, steps: [], ext: null, crawl: { pages: [], interactions: [] }, errors: sink.errors, failed: sink.failed }; let br, timer, live = null;
  try {
    br = await launch(); const ctx = await br.newContext({ viewport: { width: 640, height: 360 } }); ctx.setDefaultTimeout(600000);
    const guard = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`time limit of ${Math.round(limitMs / 60000)} min reached in the ${label}`)), limitMs); });
    const work = (async () => {
      const page = live = await ctx.newPage(); PAGE_GUARD(page, '[theatre]', sink);
      await page.goto(base + '/app/index.html' + (query ? '?' + query : ''), { waitUntil: 'load' }); await page.click('[data-bt-enter]');
      try { await page.waitForFunction(() => window.btApp && window.btApp.ready, null, { timeout: 900000, polling: 1000 }); res.entered = true; } catch (e) { sink.errors.push({ kind: 'harness', text: 'the theatre did not report ready within 15 min' }); }
      if (res.entered) {
        sink.print('entered'); const info = await page.evaluate(theatreWalk, { frames }); res.info = { api: info.api, crowd: info.crowd, fx: info.fx, sound: info.sound, soundStarted: info.soundStarted, units: info.units, perf: info.perf }; res.steps = info.steps; res.ext = info.ext;
        await page.click('#bt-back').catch(e => sink.errors.push({ kind: 'harness', text: 'Back could not be pressed: ' + e.message })); await page.waitForFunction(() => !window.btApp, null, { timeout: 120000, polling: 500 }).catch(() => sink.errors.push({ kind: 'harness', text: 'the theatre did not release btApp after Back' }));
        res.steps.push({ name: 'Back', ok: !(await page.evaluate(() => !!window.btApp).catch(() => true)) });
      }
      await page.goto('about:blank').catch(() => { }); await page.close().catch(() => { });
      const present = sections.filter(s => fs.existsSync(path.join(root, s.path))); if (present.length) { sink.print('sections: ' + present.map(s => s.path).join(', ')); res.crawl = await crawlSections(ctx, base, present, sink, { max: crawlMax }); }
    })();
    await Promise.race([work, guard]);
  } catch (e) { sink.errors.push({ kind: 'harness', text: String(e.message || e).slice(0, 300) }); res.aborted = String(e.message || e);
    if (live && !res.steps.length) { try { res.steps = await Promise.race([live.evaluate(() => window.__verifySteps || []), new Promise(r => setTimeout(() => r([]), 20000))]); res.steps.push({ name: 'walk', ok: false, error: 'stopped: ' + res.aborted }); } catch { /* the page is gone */ } } }
  finally { clearTimeout(timer); if (br) await br.close().catch(() => { }); await server.close(); }
  res.log = logOf(server.events); res.requests = server.events.length; res.seconds = Math.round((Date.now() - t0) / 1000); return res;
}

// ---------------------------------------------------------------- what a run leaves in deliver/bt-staging
/** Writes LAST-VERIFY.txt in `home` (what the run found, in every case) and, only when the build passed every check (rep.ok) and publish is on, replaces home/dist with the verified dist
 *  (copy, then swap, so a reader never sees a half-written folder) and copies the trace report beside it. Returns { published }. */
export function recordVerdict({ home, dist, zip, rep, failures = [], publish = true }) {
  fs.mkdirSync(home, { recursive: true }); let published = false;
  if (rep.ok && publish) {
    const fresh = path.join(home, 'dist.new'); fs.rmSync(fresh, { recursive: true, force: true }); fs.cpSync(dist, fresh, { recursive: true }); fs.rmSync(path.join(home, 'dist'), { recursive: true, force: true }); fs.renameSync(fresh, path.join(home, 'dist'));
    const tr = path.join(path.dirname(dist), 'trace-report.json'); if (isFile(tr)) fs.copyFileSync(tr, path.join(home, 'trace-report.json')); published = true; rep.published = path.join(home, 'dist');
  }
  fs.writeFileSync(path.join(home, 'LAST-VERIFY.txt'), [`${rep.when}  build ${rep.static.manifest.version}  zip ${zip ? path.basename(zip) : 'none'}`, `verdict: ${rep.ok ? 'STAGING VERIFIED' : 'NOT ACCEPTABLE'}${rep.official ? '' : ' (development run)'}; walk and comparison: ${rep.walkOk ? 'passed' : 'failed'}; copy audit hits: ${rep.auditHits}`,
    published ? 'deliver/bt-staging/dist was refreshed from this build.' : `deliver/bt-staging/dist was NOT touched (it is older or unverified); this build's folder: ${dist}`, ...(rep.ok ? [] : ['reasons:', ...failures.map(f => '  ' + String(f).slice(0, 300))])].join('\n') + '\n');
  return { published };
}

// ---------------------------------------------------------------- the CLI
const NOT_RUN = ['a real GPU: no frame time, long task or input delay was measured (software rendering only)', 'the WebGPU picture (?api=webgpu): the default renderer is WebGL2; the WebGPU modules are in the dist (static check) but were not run', 'listening to the sound: the audio started and its graph ran, nobody heard it',
  'other visits: ?history=stub, ?ext=off, ?crowd=off, a phone-sized page, a second entry after Back', 'other browsers (Safari, Firefox) and real phones'];
async function main() {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; }, has = k => a.includes(k);
  if (has('--help') || has('-h')) { const head = []; for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')) { if (!l.startsWith('//')) break; head.push(l.slice(3)); } console.log(head.join('\n')); return; }
  const frames = +opt('--frames') || 20, crawlMax = +opt('--crawl-max') || 150, query = opt('--query') || '', only = opt('--only'), t0 = Date.now(), print = s => console.log(s); let dist = path.resolve(opt('--dist') || path.join(REPO, 'deliver/bt-staging/dist')), zip = opt('--zip') && path.resolve(opt('--zip')), sourceRoot = path.resolve(opt('--source') || BT);
  const save = () => { if (opt('--json')) fs.writeFileSync(path.resolve(opt('--json')), JSON.stringify(rep, null, 1)); };
  const rep = { when: new Date().toISOString(), frames, query, official: !query && frames >= 10, dist, mode: has('--pack') ? 'pack' : 'dist' }; const failures = [], notes = [];
  if (has('--pack')) {
    const snap = path.resolve(opt('--snap-dir') || path.join(REPO, 'tmp/bt-spec/snap/bt')); print('snapshot of the tree: ' + snap); snapshotTree(BT, snap); sourceRoot = snap;
    // the build is made in a private work folder: other jobs may be serving deliver/bt-staging/dist (a spec run against the packed dist), and a pack that is rewritten under them breaks their run.
    // deliver/bt-staging/dist is refreshed only at the end, and only from a build that passed every check.
    dist = path.join(path.resolve(opt('--work-dir') || path.join(REPO, 'tmp/bt-spec/verify/work')), 'dist'); rep.dist = dist;
    const r = pack({ root: snap, out: dist, zipDir: path.resolve(opt('--zip-dir') || path.join(REPO, 'deliver')) }); zip = r.zip;
    rep.pack = { version: r.version, files: r.files, bytes: r.bytes, zip: r.zip && path.basename(r.zip), zipBytes: r.zipBytes, zipSha256: r.zipSha256, counts: r.counts, scrubbed: r.scrubbed.map(x => ({ path: x.path, members: x.removed.length })), audit: r.audit, clean: r.clean, auditReview: Object.fromEntries(Object.entries(r.auditReview).map(([k, v]) => [k, v.count])), notes: r.trace.notes, unshippedLiterals: r.trace.unshippedLiterals, computedImports: r.trace.computedImports.filter(c => c.status !== 'address').map(c => `${c.status}: ${c.file}: ${c.arg}`) };
    print(`packed ${r.version}: ${r.files} files, ${r.bytes} bytes; zip ${path.basename(r.zip)} ${r.zipBytes} bytes sha256 ${r.zipSha256}; copy audit hits: ${r.audit.length}`);
    if (r.scrubbed.length) notes.push(`publication filter: ${r.scrubbed.length} data file(s) ship without ${r.scrubbed.reduce((a, x) => a + x.removed.length, 0)} member(s) that name the program that made them (the working files keep them; the list is in the trace report)`);
    if (r.audit.length) { failures.push(`copy audit: ${r.audit.length} hit(s) in the packed files (the zip is named "-AUDIT-HITS-${r.audit.length}")`); for (const h of r.audit) notes.push(`audit hit ${h.file}:${h.line ?? ''} ${h.match}`); }
  }
  if (!zip) { const v = checkManifest(dist).version; const cand = v && fs.existsSync(path.join(REPO, 'deliver')) ? fs.readdirSync(path.join(REPO, 'deliver')).filter(f => f.startsWith(`gettysburg-BT-staging-${v}`) && f.endsWith('.zip')) : []; if (cand.length) zip = path.join(REPO, 'deliver', cand[0]); }
  rep.static = { manifest: checkManifest(dist), zip: zip ? checkZip(zip, dist) : null, links: checkInternalLinks(dist), notes: checkNoNotes(dist), pipeline: checkDataPipeline(dist) };
  if (!rep.static.pipeline.ok) failures.push('DATA PIPELINE in node: ' + rep.static.pipeline.problems.slice(0, 5).join('; ')); notes.push(...rep.static.pipeline.notes);
  if (!rep.static.notes.ok) failures.push('NOTES in the dist: ' + rep.static.notes.problems.slice(0, 5).join('; '));
  if (!rep.static.manifest.ok) failures.push('MANIFEST: ' + rep.static.manifest.problems.slice(0, 5).join('; '));
  if (!zip) notes.push('no zip was found for this dist: the zip was not checked'); else if (!rep.static.zip.ok) failures.push('ZIP: ' + rep.static.zip.problems.slice(0, 5).join('; '));
  if (!rep.static.links.ok) failures.push('LINKS inside the dist: ' + rep.static.links.problems.slice(0, 5).join('; '));
  print(`static: data pipeline in node ${rep.static.pipeline.ok ? 'ok' : 'FAILED'} (${rep.static.pipeline.requests} requests, ${rep.static.pipeline.distinct} files)`);
  print(`static: manifest ${rep.static.manifest.ok ? 'ok' : 'FAILED'} (${rep.static.manifest.files} files), zip ${zip ? (rep.static.zip.ok ? 'ok' : 'FAILED') : 'not checked'}${zip ? ' (' + path.basename(zip) + ', unzip -t: ' + rep.static.zip.unzipTest + ')' : ''}, links ${rep.static.links.ok ? 'ok' : 'FAILED'} (${rep.static.links.checked} checked)`);
  // the root page of the dist forwards to the shell
  try { const s = await serveDir(dist); const r = await fetch(`http://127.0.0.1:${s.port}/`); const body = await r.text(); await s.close(); if (!(r.status === 200 && /url=app\/index\.html/.test(body))) failures.push('the root page of the dist does not forward to app/index.html'); } catch (e) { failures.push('root page check failed: ' + e.message); }
  if (has('--static-only')) { rep.failures = failures; rep.notes = notes; rep.ok = failures.length === 0; rep.official = false; if (opt('--json')) fs.writeFileSync(path.resolve(opt('--json')), JSON.stringify(rep, null, 1)); for (const n of notes) print('note: ' + n);
    print(rep.ok ? 'STATIC CHECKS PASSED (no browser walk was made: this is NOT the staging verification)' : 'STATIC CHECKS FAILED:\n  ' + failures.join('\n  ')); process.exit(rep.ok ? 0 : 1); }
  const distFiles = new Set(walk(dist).map(f => '/' + posix(path.relative(dist, f)))), sections = trace({ root: sourceRoot }).sections; rep.distFiles = distFiles.size; rep.sections = sections.map(s => `${s.path} (${s.files} files, ${s.pages.length} pages)`);
  let A = null, B = null; rep.failures = failures; rep.notes = notes; save();
  if (only !== 'source') { print(`run 1/2: the packed dist (${frames} frames per step)`); A = await runWalk(dist, { frames, label: 'dist', sections, query, crawlMax, print }); rep.distRun = A; save(); }
  if (only !== 'dist') { print(`run 2/2: the source tree${has('--pack') ? ' (the snapshot)' : ''}`); B = await runWalk(sourceRoot, { frames, label: 'source', sections, query, crawlMax, print }); rep.sourceRun = B; save(); }
  rep.distRun = A; rep.sourceRun = B;
  if (A) {
    const c = compareRuns(A, B, distFiles); failures.push(...c.failures); notes.push(...c.notes); rep.compare = { missingInDist: c.missingInDist, errorsOnlyInDist: c.errorsOnlyInDist, errorsInBoth: c.errorsInBoth };
    const requested = new Set([...Object.keys(A.log), ...Object.keys(B ? B.log : {})]); rep.shippedNeverRequested = [...distFiles].filter(f => !requested.has(f) && !/^\/(index\.html|_headers|netlify\.toml|MANIFEST\.json)$/.test(f)).sort();
    notes.push(`${rep.shippedNeverRequested.length} of ${distFiles.size} shipped files were not requested by this walk (they ship because the trace found a reference; the list is in the JSON report)`);
  } else failures.push('the packed dist was not walked (--only source)');
  if (!rep.official) notes.push(`NOT THE OFFICIAL RUN: ${query ? 'the address carries ?' + query + ' (a development shortcut)' : 'fewer than 10 frames per step'}; do not quote this result as the staging verification`);
  { const again = checkManifest(dist); if (!again.ok || again.version !== rep.static.manifest.version) failures.push('the dist changed while the walk was running (another pack wrote into it): the result belongs to no build; run again'); }
  rep.failures = failures; rep.notes = notes; rep.notRun = NOT_RUN; rep.ok = failures.length === 0 && !!A && !!B; rep.walkOk = failures.filter(f => !/^copy audit:/.test(f)).length === 0 && !!A && !!B; rep.auditHits = rep.pack ? rep.pack.audit.length : null; rep.minutes = Math.round((Date.now() - t0) / 600) / 100;
  if (opt('--json')) fs.writeFileSync(path.resolve(opt('--json')), JSON.stringify(rep, null, 1));
  const brief = r => r && { requests: r.requests, distinctUrls: Object.keys(r.log).length, nonOk: Object.entries(r.log).filter(([, s]) => !okStatus(s)), entered: r.entered, info: r.info, steps: r.steps.map(s => `${s.ok ? 'ok  ' : 'FAIL'} ${s.name}${s.ok ? '' : ': ' + s.error}`), ext: r.ext && r.ext.modules.map(m => `${m.path}: ${m.state}`), crawlPages: r.crawl.pages.length, errors: r.errors.length, seconds: r.seconds, aborted: r.aborted };
  print(JSON.stringify({ dist: dist, version: rep.pack?.version ?? rep.static.manifest.version, sections: rep.sections, distRun: brief(A), sourceRun: brief(B) }, null, 1));
  print('NOT RUN here: ' + NOT_RUN.join('; '));
  for (const n of notes) print('note: ' + n);
  if (!rep.ok && rep.walkOk) print('everything except the copy audit passed: the walk, the comparison, the static checks. The build is not acceptable until the audit hits are gone.');
  print(rep.ok ? 'STAGING VERIFIED' + (rep.official ? '' : ' (development run, not the official check)') + ': the dist and the zip match, zero 404s, every URL the source run loaded is in the dist, sound started, no error only in the dist' : 'STAGING CHECK FAILED:\n  ' + failures.join('\n  '));
  if (has('--pack')) { const q = recordVerdict({ home: path.join(REPO, 'deliver/bt-staging'), dist, zip, rep, failures, publish: !has('--no-publish') && rep.official }); if (q.published) print('published: deliver/bt-staging/dist now holds the verified build ' + rep.static.manifest.version); }
  process.exit(rep.ok ? 0 : 1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { if (process.argv[2] === '--data-probe') dataProbe(process.argv[3]).catch(e => { console.error(e); process.exit(2); }); else main().catch(e => { console.error(e); process.exit(2); }); }
