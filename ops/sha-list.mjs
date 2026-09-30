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
//          --html-warn                a differing .html file is a WARNING, not a failure - but only when it shows a Netlify post-processing signature (RUM snippet
//                                     or re-quoted attributes); an html difference without one stays a DIFF (see below); a file that is identical
//                                     once the injected RUM snippet is removed counts as OK (shown OK*) even without this flag
//          --expect-missing a,b,c     paths that must NOT be served (default: netlify.toml,_headers,_redirects - config files are processed, not served)
//          --concurrency N (default 4)  --delay MS between starts (default 0)  --retries N (default 2)  --timeout MS (default 20000)
//          --out report.json  --verbose
//        exit 0 = every fetched file identical (or expected-missing / warned), 1 = at least one difference or unexpected 404, 2 = could not run
//   node ops/sha-list.mjs stage <dist> <outDir> [--force]
//        copy a built dist to <outDir> (must be under release/ or tmp/) and add `X-Robots-Tag: noindex` to its `_headers` (created if absent).
//        Prints the staging copy's list and states that only `_headers` differs from <dist>.
//
// Post-processing warning (measured 2026-09-30 on the production site): Netlify rewrites the HTML it serves (pretty-URL href rewriting,
// attribute re-quoting, and an injected <script id="netlify-rum-container"> before </body>), so served .html bytes differ from the
// uploaded ones on a site that has those features on. Non-HTML files were expected to be byte-identical. On the staging site the same
// settings must be checked/mirrored (ops/STAGING-SETUP.md section 4) or the html files show up as DIFF here.
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
      if (['json', 'html-warn', 'verbose', 'force'].includes(k)) opt[k] = true;
      else { opt[k] = argv[++i]; if (opt[k] === undefined) { console.error(`option --${k} needs a value`); process.exit(2); } }
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
            else {
              const hints = [];
              if (body.includes('netlify-rum-container')) hints.push('netlify RUM snippet injected');
              if (isHtml && /<a [^>]*href='\//.test(body)) hints.push('single-quoted attributes (HTML re-serialised)');
              if (r.finalUrl !== url.href) hints.push(`redirected to ${new URL(r.finalUrl).pathname}`);
              out = { path: p, result: isHtml && opt['html-warn'] && hints.some((x) => /RUM|single-quoted/.test(x)) ? 'warn-html' : 'differs', bytes: r.buf.length, expectedBytes: exp.bytes, sha256: s, expectedSha256: exp.sha256, hints };
            }
          }
        } catch (e) {
          if (attempt === retries) { netErrors++; out = { path: p, result: 'error', note: String((e && e.cause && e.cause.code) || (e && e.message) || e) }; }
          else await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      res.push(out);
      if (opt.verbose || !['ok', 'ok-not-served', 'ok-rum-only'].includes(out.result)) {
        const tag = { ok: 'OK  ', 'ok-rum-only': 'OK* ', 'ok-not-served': 'OK  ', 'warn-html': 'WARN', differs: 'DIFF', missing: 'MISS', error: 'ERR ', 'served-unexpectedly': 'PUB ' }[out.result];
        const extra = out.result === 'differs' || out.result === 'warn-html' ? ` served ${out.bytes} B ${out.sha256.slice(0, 12)} expected ${out.expectedBytes} B ${out.expectedSha256.slice(0, 12)}${out.hints.length ? ' [' + out.hints.join('; ') + ']' : ''}` : (out.note ? ` ${out.note}` : (out.status ? ` HTTP ${out.status}` : ''));
        console.log(`${tag} ${out.path}${extra}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, todo.length) }, worker));
  res.sort((a, b) => (a.path < b.path ? -1 : 1));
  const count = (k) => res.filter((r) => r.result === k).length;
  const fail = count('differs') + count('missing') + count('error') + count('served-unexpectedly');
  const summary = { base: base.origin, list: pos[0], listTree: L.tree, requested: todo.length, kinds, ok: count('ok'), okRumOnly: count('ok-rum-only'), okNotServed: count('ok-not-served'), warnHtml: count('warn-html'), differs: count('differs'), missing: count('missing'), servedUnexpectedly: count('served-unexpectedly'), errors: count('error') };
  console.log(`\n${base.origin}: ${summary.requested} files checked (${kinds}): ${summary.ok} identical, ${summary.okRumOnly} identical apart from the injected RUM snippet, ${summary.okNotServed} config file(s) correctly not served, ${summary.warnHtml} html warnings, ${summary.differs} differ, ${summary.missing} missing, ${summary.servedUnexpectedly} config file(s) publicly served, ${summary.errors} errors`);
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

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));
const table = { list: cmdList, compare: cmdCompare, 'verify-dir': cmdVerifyDir, 'verify-url': cmdVerifyUrl, stage: cmdStage };
if (!table[cmd]) usage();
await table[cmd](args);
