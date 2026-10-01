#!/usr/bin/env node
// ops/sha-list.mjs - sha256 lists and byte-identity proofs for release trees (chapter 02 WP-T0-02 / WP-T0-19, ops/STAGING-SETUP.md).
// Dependency-free (node >= 18). READ-ONLY on every input: it never writes inside legacy/ or inside a dist it is given; `stage` and
// `--out` write only where you point them (and `stage` refuses anything outside release/ or tmp/).
//
//   node ops/sha-list.mjs list <dir> [--out list.tsv] [--json]
//        one line per file: path <TAB> bytes <TAB> sha256, sorted, forward slashes; footer carries the file count and the TREE digest
//        (sha256 over "path\0sha256\n" lines - the same digest tools/t0 pins: `list legacy/dist` must print 90d819d0...5253905d, 119 files)
//   node ops/sha-list.mjs compare <listA> <listB>            exit 0 identical, 1 different
//   node ops/sha-list.mjs verify-dir <list> <dir>            recompute <dir> and diff it against <list>; exit 0/1
//   node ops/sha-list.mjs verify-url <list> <baseUrl> [options]
//        fetch every path of <list> from a running site and compare the served bytes with the list (the "byte-identity proof")
//          --kinds all|nonhtml|html   which files to fetch (default all)
//          --tree <dir>               the SOURCE tree the list was made from (release/<train>/dist, baseline/dist): a served .html file that equals the model of
//                                     Netlify's post-processing (RUM snippet + pretty-URL link rewriting, see below) applied to its source counts as OK (shown
//                                     OK*); any other html difference is a DIFF, never a warning.  Without --tree only the RUM-only case is explained.
//          --html-warn                REMOVED (accepted, ignored, and said so): it used to demote any html difference that carried a post-processing signature to a
//                                     WARNING, which hid real content drift (release verifier, 2026-09-30).  There is NO warning level: an html difference
//                                     is DIFF and the exit code is 1.  Use --tree instead.  --kinds nonhtml is a quick look, never a deploy gate (it says so).
//          --expect-missing a,b,c     paths that must NOT be served (default: netlify.toml,_headers,_redirects - config files are processed, not served)
//          --concurrency N (default 4)  --delay MS between starts (default 0)  --retries N (default 2)  --timeout MS (default 20000)
//          --out report.json  --verbose
//        exit 0 = every fetched file identical (or expected-missing / warned), 1 = at least one difference or unexpected 404, 2 = could not run
//   node ops/sha-list.mjs stage <dist> <outDir> [--force]
//        copy a built dist to <outDir> (must be under release/ or tmp/) and add `X-Robots-Tag: noindex` to its `_headers` (created if absent).
//        Prints the staging copy's list and states that only `_headers` differs from <dist>.  Refuses a dist of a FAILED build (a BUILD-FAILED.json
//        marker or a gate.json with "ok": false next to it), so a half-built tree can never be staged by mistake.
//
// Post-processing warning (measured 2026-09-30 on the production site): Netlify rewrites the HTML it serves (pretty-URL href rewriting,
// attribute re-quoting, and an injected <script id="netlify-rum-container"> before </body>), so served .html bytes differ from the
// uploaded ones on a site that has those features on. Non-HTML files were expected to be byte-identical. On the staging site the same
// settings must be checked/mirrored (ops/STAGING-SETUP.md section 4) or the html files show up as DIFF here.
// For a check of the live site against baseline/dist (what production is supposed to serve today) use `python tools/t0/baseline.py verify-live`
// (per-file diff, forced-404 and config-file handling, new-file discovery); this tool's verify-url is the per-deploy byte proof of a release dist.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const toPosix = (p) => p.split(path.sep).join('/');
const DEFAULT_EXPECT_MISSING = ['netlify.toml', '_headers', '_redirects'];
// The snippet Netlify appends before </body> on a site with Real User Metrics enabled (measured on production 2026-09-30:
// newline + the script tag + newline, inserted into the original bytes; removing exactly that restores the uploaded file).
const RUM_RE = /\n<script async id="netlify-rum-container"[^>]*><\/script>\n/;
const RUM_EL_RE = /\n(<script async id="netlify-rum-container"[^>]*><\/script>)\n/;

// ---- the Netlify post-processing model (JS mirror of tools/t0/t0build/netlify.py; docs/baseline-drift.md section 2; the two are cross-checked by
// tools/t0/tests/baseline_selftest.py on every page of baseline/dist).  forwardModel(sourceText, rumElement) = what Netlify serves for an uploaded
// html file: (1) every <a> start tag outside script/style/comments whose href is a local path ending in .html is rewritten to the pretty URL
// (/index.html -> /) and re-serialised with its attributes SORTED and single-quoted; (2) "\n" + RUM snippet + "\n" is inserted before </body>.
// Anything the model has no evidence for throws, so a mismatch is loud instead of guessed.
const LOCAL_HTML_HREF = /^\/(?:[^/?#\s]+\/)*[^/?#\s]+\.html$/;
function tagEnd(text, start) {
  let q = null;
  for (let k = start + 1; k < text.length; k++) { const c = text[k]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') return k + 1; }
  return -1;
}
function findStartTags(text, name) {
  const out = []; const n = text.length; let i = 0;
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt < 0) break;
    if (text.startsWith('<!--', lt)) { const e = text.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    const m = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(text.slice(lt, lt + 40));
    if (!m) { i = lt + 1; continue; }
    const tag = m[1].toLowerCase(); const end = tagEnd(text, lt);
    if (end < 0) break;
    if (tag === 'script' || tag === 'style') { const c = new RegExp(`</${tag}`, 'ig'); c.lastIndex = end; const r = c.exec(text); i = r ? r.index : n; continue; }
    if (tag === name) out.push({ off: lt, raw: text.slice(lt, end) });
    i = end;
  }
  return out;
}
function parseAttrs(raw) {
  const m = /^<[A-Za-z][A-Za-z0-9-]*([\s\S]*?)\/?>$/.exec(raw);
  if (!m) throw new Error(`model: cannot parse tag ${raw.slice(0, 80)}`);
  const out = []; const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g; let a;
  while ((a = re.exec(m[1]))) {
    if (a[2] === undefined && a[3] === undefined && a[4] === undefined) throw new Error(`model: bare attribute ${a[1]} in ${raw.slice(0, 80)}`);
    out.push([a[1].toLowerCase(), a[2] ?? a[3] ?? a[4]]);
  }
  if (new Set(out.map((x) => x[0])).size !== out.length) throw new Error(`model: repeated attribute in ${raw.slice(0, 80)}`);
  return out;
}
function rewriteTag(raw) {
  const attrs = parseAttrs(raw);
  const href = (attrs.find((x) => x[0] === 'href') || [])[1];
  if (href === undefined) return null;
  if (/^\/[^?#\s]*\.html[?#]/.test(href) || (!LOCAL_HTML_HREF.test(href) && /^[^/:?#\s]+\.html$/.test(href))) throw new Error(`model: no evidence how Netlify rewrites ${href}`);
  if (!LOCAL_HTML_HREF.test(href)) return null;
  const pretty = href.endsWith('/index.html') ? `${href.slice(0, -'/index.html'.length)}/` : href.slice(0, -'.html'.length);
  for (const [n, v] of attrs) if (/[&'"<>]/.test(v)) throw new Error(`model: no evidence how Netlify escapes ${v} in ${n}`);
  return `<a${[...attrs].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map(([n, v]) => ` ${n}='${n === 'href' ? pretty : v}'`).join('')}>`;
}
export function forwardModel(sourceText, rum) {
  let out = ''; let last = 0;
  for (const t of findStartTags(sourceText, 'a')) { const r = rewriteTag(t.raw); if (r === null) continue; out += sourceText.slice(last, t.off) + r; last = t.off + t.raw.length; }
  out += sourceText.slice(last);
  if (rum) {
    if (out.split('</body>').length !== 2) throw new Error('model: expected exactly one </body>');
    out = out.replace('</body>', () => `\n${rum}\n</body>`);
  }
  return out;
}

function usage(code = 2) {
  const out = []; for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) { if (!l.startsWith('//')) break; out.push(l.slice(3)); }
  console.error(out.join('\n'));
  process.exit(code);
}

function parseArgs(argv) {
  const pos = []; const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (['json', 'html-warn', 'verbose', 'force'].includes(k)) {
        opt[k] = true;
        if (k === 'html-warn') console.error('note: --html-warn is removed and ignored: an html difference is a DIFF (exit 1), never a warning; pass --tree <source dir> so the post-processing model can explain Netlify\'s RUM snippet and link rewriting');
      } else { opt[k] = argv[++i]; if (opt[k] === undefined) { console.error(`option --${k} needs a value`); process.exit(2); } }
    } else pos.push(a);
  }
  return { pos, opt };
}

function walk(root) {
  const out = [];
  const rec = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) rec(full);
      else if (ent.isFile()) out.push(toPosix(path.relative(root, full)));
    }
  };
  rec(root);
  return out.sort();
}

function listDir(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) { console.error(`not a directory: ${root}`); process.exit(2); }
  const files = new Map();
  const th = crypto.createHash('sha256');
  for (const rel of walk(root)) {
    const buf = fs.readFileSync(path.join(root, rel));
    const s = sha(buf);
    files.set(rel, { bytes: buf.length, sha256: s });
    th.update(Buffer.concat([Buffer.from(rel, 'utf8'), Buffer.from([0]), Buffer.from(s, 'ascii'), Buffer.from('\n')]));
  }
  return { files, tree: th.digest('hex') };
}

function formatList(root, { files, tree }) {
  const lines = ['# sha-list v1', `# root: ${toPosix(path.relative(REPO, path.resolve(root))) || '.'}`];
  for (const [p, v] of files) lines.push(`${p}\t${v.bytes}\t${v.sha256}`);
  lines.push(`# files: ${files.size}`, `# tree: ${tree}`);
  return lines.join('\n') + '\n';
}

function readList(file) {
  if (!fs.existsSync(file)) { console.error(`list not found: ${file}`); process.exit(2); }
  const files = new Map(); let tree = null; let count = null;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith('#')) { const m = line.match(/^# (tree|files): (\S+)/); if (m) { if (m[1] === 'tree') tree = m[2]; else count = Number(m[2]); } continue; }
    const [p, bytes, s] = line.split('\t');
    if (!p || !/^[0-9a-f]{64}$/.test(s || '')) { console.error(`bad list line: ${line.slice(0, 120)}`); process.exit(2); }
    files.set(p, { bytes: Number(bytes), sha256: s });
  }
  if (count !== null && count !== files.size) { console.error(`list says ${count} files but has ${files.size}`); process.exit(2); }
  return { files, tree };
}

function diffMaps(a, b) {
  const added = [], removed = [], changed = [];
  for (const [p, v] of b) { if (!a.has(p)) added.push(p); else if (a.get(p).sha256 !== v.sha256) changed.push(p); }
  for (const p of a.keys()) if (!b.has(p)) removed.push(p);
  return { added, removed, changed };
}

function reportDiff(d, labelA, labelB) {
  for (const p of d.removed) console.log(`ONLY in ${labelA}: ${p}`);
  for (const p of d.added) console.log(`ONLY in ${labelB}: ${p}`);
  for (const p of d.changed) console.log(`CHANGED: ${p}`);
  return d.added.length + d.removed.length + d.changed.length;
}

// ------------------------------------------------------------------ commands
function cmdList({ pos, opt }) {
  if (pos.length !== 1) usage();
  const r = listDir(pos[0]);
  if (opt.json) {
    const obj = { root: pos[0], files: r.files.size, tree: r.tree, entries: Object.fromEntries(r.files) };
    const txt = JSON.stringify(obj, null, 2) + '\n';
    if (opt.out) fs.writeFileSync(opt.out, txt); else process.stdout.write(txt);
  } else {
    const txt = formatList(pos[0], r);
    if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(opt.out, txt); }
    else process.stdout.write(txt);
  }
  console.error(`${r.files.size} files, tree ${r.tree}${opt.out ? `, written to ${opt.out}` : ''}`);
}

function cmdCompare({ pos }) {
  if (pos.length !== 2) usage();
  const A = readList(pos[0]), B = readList(pos[1]);
  const n = reportDiff(diffMaps(A.files, B.files), pos[0], pos[1]);
  console.log(n === 0 ? `IDENTICAL: ${A.files.size} files, tree ${A.tree || '(none)'}` : `DIFFERENT: ${n} differences`);
  process.exit(n === 0 ? 0 : 1);
}

function cmdVerifyDir({ pos }) {
  if (pos.length !== 2) usage();
  const A = readList(pos[0]); const B = listDir(pos[1]);
  const n = reportDiff(diffMaps(A.files, B.files), 'list', pos[1]);
  console.log(n === 0 ? `IDENTICAL: ${B.files.size} files, tree ${B.tree}${A.tree && A.tree !== B.tree ? ' (list footer says ' + A.tree + ' - stale footer)' : ''}` : `DIFFERENT: ${n} differences`);
  process.exit(n === 0 ? 0 : 1);
}

async function fetchOnce(url, timeout) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': 'gbg-sha-list/1 (release verification; read-only)', 'Cache-Control': 'no-cache' } });
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf, finalUrl: res.url };
  } finally { clearTimeout(t); }
}

async function cmdVerifyUrl({ pos, opt }) {
  if (pos.length !== 2) usage();
  const L = readList(pos[0]);
  let base;
  try { base = new URL(pos[1]); } catch { console.error(`bad base url: ${pos[1]}`); process.exit(2); }
  if (!/^https?:$/.test(base.protocol)) { console.error('base url must be http(s)'); process.exit(2); }
  const kinds = opt.kinds || 'all';
  if (!['all', 'nonhtml', 'html'].includes(kinds)) usage();
  const expectMissing = new Set((opt['expect-missing'] ? opt['expect-missing'].split(',') : DEFAULT_EXPECT_MISSING).map((s) => s.trim()).filter(Boolean));
  const conc = Math.max(1, Number(opt.concurrency || 4)); const delay = Number(opt.delay || 0);
  const retries = Number(opt.retries ?? 2); const timeout = Number(opt.timeout || 20000);
  const todo = [...L.files].filter(([p]) => kinds === 'all' || (kinds === 'html') === /\.html?$/i.test(p));
  const treeDir = opt.tree ? path.resolve(opt.tree) : null;      // source tree of the html files: lets the post-processing model explain link rewriting, not only the RUM snippet
  if (treeDir && !fs.existsSync(treeDir)) { console.error(`--tree not found: ${treeDir}`); process.exit(2); }
  const res = []; let next = 0; let netErrors = 0;

  async function worker() {
    for (;;) {
      const i = next++; if (i >= todo.length) return;
      const [p, exp] = todo[i];
      const url = new URL(p.split('/').map(encodeURIComponent).join('/'), base.href.endsWith('/') ? base.href : base.href + '/');
      if (delay) await new Promise((r) => setTimeout(r, delay * (i % conc)));
      let out = null;
      for (let attempt = 0; attempt <= retries && !out; attempt++) {
        try {
          const r = await fetchOnce(url.href, timeout);
          if (new URL(r.finalUrl).host !== base.host) { out = { path: p, result: 'error', note: `redirected off-host to ${new URL(r.finalUrl).host}` }; break; }
          const isHtml = /\.html?$/i.test(p);
          if (r.status === 404 || r.status === 410) {
            out = expectMissing.has(p) ? { path: p, result: 'ok-not-served', note: 'expected: config file is processed, not served' } : { path: p, result: 'missing', status: r.status };
          } else if (r.status !== 200) {
            out = { path: p, result: 'error', status: r.status, note: `unexpected HTTP ${r.status}` };
          } else if (expectMissing.has(p)) {
            out = { path: p, result: 'served-unexpectedly', status: 200, note: 'a config file that should not be public answers 200' };
          } else {
            const s = sha(r.buf);
            const body = r.buf.toString('latin1');
            const stripped = isHtml ? body.replace(RUM_RE, '') : body;
            if (s === exp.sha256) out = { path: p, result: 'ok', bytes: r.buf.length };
            else if (isHtml && stripped !== body && sha(Buffer.from(stripped, 'latin1')) === exp.sha256) out = { path: p, result: 'ok-rum-only', bytes: r.buf.length, note: 'identical after removing the injected Netlify RUM snippet' };
            else if (isHtml && treeDir && fs.existsSync(path.join(treeDir, p)) && (() => {
              // the post-processing model (RUM snippet + pretty-URL rewriting) applied to the SOURCE file must give exactly the served bytes
              const srcBuf = fs.readFileSync(path.join(treeDir, p));
              if (sha(srcBuf) !== exp.sha256) return false;                       // the tree is not the tree the list was made from
              const rum = (RUM_EL_RE.exec(r.buf.toString('utf8')) || [])[1] || null;
              try { return Buffer.from(forwardModel(srcBuf.toString('utf8'), rum), 'utf8').equals(r.buf); } catch { return false; }
            })()) out = { path: p, result: 'ok-rum-only', bytes: r.buf.length, note: 'identical to the source after Netlify post-processing (RUM snippet, pretty-URL link rewrite), proven by the model' };
            else {
              const hints = [];
              if (body.includes('netlify-rum-container')) hints.push('netlify RUM snippet injected');
              if (isHtml && /<a [^>]*href='\//.test(body)) hints.push('single-quoted attributes (HTML re-serialised)');
              if (isHtml && !treeDir) hints.push('pass --tree <source dir> to let the post-processing model explain link rewriting; an unexplained html difference is content drift');
              if (r.finalUrl !== url.href) hints.push(`redirected to ${new URL(r.finalUrl).pathname}`);
              out = { path: p, result: 'differs', bytes: r.buf.length, expectedBytes: exp.bytes, sha256: s, expectedSha256: exp.sha256, hints };
            }
          }
        } catch (e) {
          if (attempt === retries) { netErrors++; out = { path: p, result: 'error', note: String((e && e.cause && e.cause.code) || (e && e.message) || e) }; }
          else await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      res.push(out);
      if (opt.verbose || !['ok', 'ok-not-served', 'ok-rum-only'].includes(out.result)) {
        const tag = { ok: 'OK  ', 'ok-rum-only': 'OK* ', 'ok-not-served': 'OK  ', differs: 'DIFF', missing: 'MISS', error: 'ERR ', 'served-unexpectedly': 'PUB ' }[out.result];
        const extra = out.result === 'differs' ? ` served ${out.bytes} B ${out.sha256.slice(0, 12)} expected ${out.expectedBytes} B ${out.expectedSha256.slice(0, 12)}${out.hints.length ? ' [' + out.hints.join('; ') + ']' : ''}` : (out.note ? ` ${out.note}` : (out.status ? ` HTTP ${out.status}` : ''));
        console.log(`${tag} ${out.path}${extra}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, todo.length) }, worker));
  res.sort((a, b) => (a.path < b.path ? -1 : 1));
  const count = (k) => res.filter((r) => r.result === k).length;
  const fail = count('differs') + count('missing') + count('error') + count('served-unexpectedly');
  const summary = { base: base.origin, list: pos[0], listTree: L.tree, requested: todo.length, kinds, ok: count('ok'), okRumOnly: count('ok-rum-only'), okNotServed: count('ok-not-served'), differs: count('differs'), missing: count('missing'), servedUnexpectedly: count('served-unexpectedly'), errors: count('error') };
  console.log(`\n${base.origin}: ${summary.requested} files checked (${kinds}): ${summary.ok} identical, ${summary.okRumOnly} identical apart from the injected RUM snippet, ${summary.okNotServed} config file(s) correctly not served, ${summary.differs} differ, ${summary.missing} missing, ${summary.servedUnexpectedly} config file(s) publicly served, ${summary.errors} errors`);
  if (kinds === 'nonhtml') console.log('NOTE: --kinds nonhtml did not check any html file: this is a quick look, not a deploy gate (html content drift is only caught by --kinds all/html)');
  if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(opt.out, JSON.stringify({ summary, results: res }, null, 2) + '\n'); console.log(`report: ${opt.out}`); }
  if (netErrors && netErrors === todo.length) process.exit(2);
  process.exit(fail === 0 ? 0 : 1);
}

function cmdStage({ pos, opt }) {
  if (pos.length !== 2) usage();
  const src = path.resolve(pos[0]); const out = path.resolve(pos[1]);
  const okRoots = ['release', 'tmp'].map((d) => path.join(REPO, d) + path.sep);
  if (!okRoots.some((r) => (out + path.sep).startsWith(r))) { console.error(`refusing: <outDir> must be inside ${okRoots.join(' or ')}`); process.exit(2); }
  if (out === src || (out + path.sep).startsWith(src + path.sep) || (src + path.sep).startsWith(out + path.sep)) { console.error('refusing: <outDir> and <dist> must be separate directories'); process.exit(2); }
  if (!fs.existsSync(src)) { console.error(`not found: ${src}`); process.exit(2); }
  const side = path.dirname(src);                               // release/<train>/ next to release/<train>/dist (absent for legacy/dist and baseline/dist)
  if (fs.existsSync(path.join(side, 'BUILD-FAILED.json'))) { console.error(`refusing: ${path.join(side, 'BUILD-FAILED.json')} exists: the build of this dist failed, it is not deployable`); process.exit(2); }
  try { const g = JSON.parse(fs.readFileSync(path.join(side, 'gate.json'), 'utf8')); if (g.ok === false) { console.error(`refusing: ${path.join(side, 'gate.json')} says the gate FAILED for this dist`); process.exit(2); } } catch { /* no gate.json next to it: a hand-made or baseline tree */ }
  if (fs.existsSync(out)) { if (!opt.force) { console.error(`refusing: ${out} exists (use --force to replace it)`); process.exit(2); } fs.rmSync(out, { recursive: true, force: true }); }
  fs.cpSync(src, out, { recursive: true });
  const hp = path.join(out, '_headers');
  const LINE = '  X-Robots-Tag: noindex';
  let txt = fs.existsSync(hp) ? fs.readFileSync(hp, 'utf8') : '';
  if (/^\s*x-robots-tag\s*:/im.test(txt)) { console.error('refusing: _headers already sets X-Robots-Tag; edit it by hand'); process.exit(2); }
  const lines = txt ? txt.split(/\r?\n/) : [];
  const at = lines.findIndex((l) => l.trim() === '/*');
  if (at >= 0) lines.splice(at + 1, 0, LINE); else { if (txt && !txt.endsWith('\n')) lines.push(''); lines.push('/*', LINE, ''); }
  txt = lines.join('\n');
  fs.writeFileSync(hp, txt.endsWith('\n') ? txt : txt + '\n');
  const A = listDir(src), B = listDir(out);
  const d = diffMaps(A.files, B.files);
  const other = [...d.added, ...d.removed, ...d.changed].filter((p) => p !== '_headers');
  console.log(`staging copy: ${out}\n  files: ${B.files.size} (source ${A.files.size}); tree ${B.tree}\n  source tree: ${A.tree}`);
  console.log(other.length === 0 ? '  differs from the source ONLY in: _headers (X-Robots-Tag: noindex)' : `  UNEXPECTED differences: ${other.join(', ')}`);
  process.exit(other.length === 0 ? 0 : 1);
}

// main (skipped when the file is imported for forwardModel)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  const table = { list: cmdList, compare: cmdCompare, 'verify-dir': cmdVerifyDir, 'verify-url': cmdVerifyUrl, stage: cmdStage };
  if (!table[cmd]) usage();
  await table[cmd](args);
}
