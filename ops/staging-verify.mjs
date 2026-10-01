#!/usr/bin/env node
// ops/staging-verify.mjs - the staging-deploy verification checklist as a script (release verifier 2026-09-30; ops/STAGING-SETUP.md section 7).
//
// What it is: every check that has to be green after a train was deployed to `gbg-staging` and before the same tree goes to production, one step each, with
// the command it runs and the output it expects.  Nothing here changes a site: it only reads (HEAD/GET, local files, local tools) and writes an optional
// JSON report.  There is NO warning level: any step that is not PASS is a ship blocker (exit 1).
//
//   node ops/staging-verify.mjs --train R1c --staging-url https://gbg-staging.netlify.app
//   node ops/staging-verify.mjs --train R1c --checklist                      print the checklist (steps, commands, expected output) and exit 0, runs nothing
//   node ops/staging-verify.mjs --train R1c --local                          REHEARSAL: serve the staging copy and the dist through tools/t0/config/emulate.mjs on
//                                                                            local ports and run every step against those (no network at all)
//
// options
//   --train T            R0 | R1a | R1b | R1c (required)
//   --dist DIR           the built dist (default release/<train>/dist; its sibling manifest.json / gate.json / _ops/ are read)
//   --stage-dir DIR      the staging copy that was deployed (default release/staging/<train>, made by `node ops/sha-list.mjs stage <dist> <dir> --force`)
//   --staging-url URL    the deployed staging site (required unless --local or --checklist)
//   --prod-url URL       production (default https://gettysburginteractivemap.com): header parity (R0-R1b) and the baseline-drift gate
//   --skip-live-drift    skip `python tools/t0/baseline.py verify-live` (S5); it is the only step that needs the PRODUCTION site
//   --expect-release R   the release id staging must report (default: version.json of the dist)
//   --port N             --local: first port of the two emulators (default 8748 and 8749)
//   --json FILE          write the result as JSON
//   --verbose            print the tail of every step's tool output
// exit codes: 0 = every step PASS; 1 = at least one step FAIL (do not deploy to production); 2 = the script could not run (bad options, no network)
//
// What this proves and what it does not: it proves the bytes, the headers/redirects Netlify applied to THAT upload (S6-S9 against the real staging site),
// version.json, noindex and the absence of config/kill files.  It does not prove Netlify's own header-matching semantics when run with --local (the emulator
// is documented in tools/t0/config/README.md, "Emulated rules"), real devices, real tiles (the staging domain gets 403 tiles) or RUM.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const FLAGS = new Set(['local', 'checklist', 'skip-live-drift', 'verbose', 'help']);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { console.error(`unexpected argument ${a}`); process.exit(2); }
  const k = a.slice(2);
  if (FLAGS.has(k)) opt[k] = true; else { opt[k] = argv[++i]; if (opt[k] === undefined) { console.error(`--${k} needs a value`); process.exit(2); } }
}
if (opt.help) { const out = []; for (const l of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) { if (!l.startsWith('//')) break; out.push(l.slice(3)); } console.log(out.join('\n')); process.exit(0); }
const TRAINS = ['R0', 'R1a', 'R1b', 'R1c'];
const TRAIN = opt.train;
if (!TRAINS.includes(TRAIN)) { console.error(`--train must be one of ${TRAINS.join(' | ')}`); process.exit(2); }
const rp = (p) => path.resolve(REPO, p);
const DIST = rp(opt.dist || `release/${TRAIN}/dist`);
const OUTDIR = path.dirname(DIST);
const STAGE = rp(opt['stage-dir'] || `release/staging/${TRAIN}`);
const PROD = String(opt['prod-url'] || 'https://gettysburginteractivemap.com').replace(/\/+$/, '');
const PROFILE = { R0: 'baseline', R1a: 'baseline', R1b: 'baseline', R1c: 't0' }[TRAIN];
const LOCAL = !!opt.local;
if (!opt.checklist && !LOCAL && !opt['staging-url']) { console.error('--staging-url is required (or use --local for a rehearsal, --checklist to print the checklist)'); process.exit(2); }
let STAGING = String(opt['staging-url'] || '<staging url>').replace(/\/+$/, '');
let PRODUCTION = PROD;

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rd = (p) => fs.readFileSync(p, 'utf8');
const jf = (p) => JSON.parse(rd(p));
// child tools run ASYNCHRONOUSLY: with --local the emulators live in this process and must keep answering while a tool waits for them (spawnSync deadlocks)
const sh = (cmd, args, timeout = 600000) => new Promise((resolve) => {
  const c = spawn(cmd, args, { cwd: REPO, windowsHide: true }); let stdout = '', stderr = '';
  const t = setTimeout(() => { c.kill(); stderr += `\n(killed after ${timeout} ms)`; }, timeout);
  c.stdout.on('data', (d) => { stdout += d; }); c.stderr.on('data', (d) => { stderr += d; });
  c.on('error', (e) => { clearTimeout(t); resolve({ status: 2, stdout, stderr: `${stderr}\n${e.message}` }); });
  c.on('close', (code) => { clearTimeout(t); resolve({ status: code, stdout, stderr }); });
});
const node = (args, o = {}) => sh(process.execPath, args, o.timeout);
const py = (args) => sh('python', args);
const tail = (r, n = 6) => `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-n).join('\n');
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

async function head(url, p) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(url + p, { method: 'HEAD', redirect: 'manual', signal: ac.signal, headers: { 'user-agent': 'gbg-staging-verify/1 (release verification; read-only)', 'cache-control': 'no-cache' } });
    const h = {}; r.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
    return { status: r.status, headers: h };
  } finally { clearTimeout(t); }
}

// ------------------------------------------------------------------------------------------------------------------ the checklist
// each step: id, kind (local | net | manual), title, cmd (shown), expected (shown), run() -> {ok, detail}
const S = [];
const step = (id, kind, title, cmd, expected, run) => S.push({ id, kind, title, cmd, expected, run });
const ver = () => jf(path.join(DIST, 'version.json'));

step('S0', 'local', 'the dist is a deployable build: manifest.json + gate.json (ok) beside it, no BUILD-FAILED.json, version.json names this train, the tree matches the manifest',
  `read ${rel(OUTDIR)}/{manifest.json,gate.json,BUILD-FAILED.json} and ${rel(DIST)}/version.json; recompute the tree digest of the dist`,
  'release <rid> train <T>, <N> files, tree <sha256>, gate ok, no failure marker', async () => {
    if (!fs.existsSync(DIST)) return { ok: false, detail: `${rel(DIST)} does not exist: build it (python tools/t0/build.py --train ${TRAIN})` };
    if (fs.existsSync(path.join(OUTDIR, 'BUILD-FAILED.json'))) return { ok: false, detail: `${rel(OUTDIR)}/BUILD-FAILED.json exists: the build failed, this dist is NOT deployable` };
    for (const f of ['manifest.json', 'gate.json']) if (!fs.existsSync(path.join(OUTDIR, f))) return { ok: false, detail: `${rel(OUTDIR)}/${f} is missing (a build that finished writes it)` };
    const g = jf(path.join(OUTDIR, 'gate.json')); if (!g.ok) return { ok: false, detail: `gate.json says the gate FAILED: ${g.checks.filter((c) => !c.ok).map((c) => c.id).join(', ')}` };
    const v = ver(); if (v.train !== TRAIN) return { ok: false, detail: `version.json says train ${v.train}, not ${TRAIN}` };
    const m = jf(path.join(OUTDIR, 'manifest.json'));
    const h = crypto.createHash('sha256'); let n = 0;
    const walk = (d, base = d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/')); } return out; };
    for (const f of walk(DIST).sort()) { h.update(Buffer.concat([Buffer.from(f), Buffer.from([0]), Buffer.from(sha(fs.readFileSync(path.join(DIST, f)))), Buffer.from('\n')])); n++; }
    const tree = h.digest('hex');
    if (tree !== m.tree_sha256 || n !== m.file_count) return { ok: false, detail: `the dist on disk (${n} files, tree ${tree.slice(0, 12)}) is not the build the manifest describes (${m.file_count} files, ${m.tree_sha256.slice(0, 12)}): rebuild instead of editing a dist by hand` };
    return { ok: true, detail: `release ${v.release} train ${v.train}, ${n} files, tree ${tree.slice(0, 12)}..., gate ok, groups: ${v.groups.join(' ')}` };
  });

step('S1', 'local', 'the locked baseline still holds (the trains were built from it)', 'python tools/t0/baseline.py verify', 'exit 0 ("baseline/dist matches tools/t0/baseline.lock.json")', async () => {
  const r = await py(['tools/t0/baseline.py', 'verify']); return { ok: r.status === 0, detail: tail(r, 2) };
});

step('S2', 'local', 'the kill switch is NOT in the public dist; an identical copy sits beside it; _ops/ holds only bookkeeping',
  `list ${rel(DIST)}; compare ${rel(OUTDIR)}/_ops/sw-kill.js with ops/sw-kill.js`, 'no sw-kill file in the dist; copy identical; _ops = asset-manifest.json, used-names.txt (+ config-manifest.json on R1c)', async () => {
    const all = []; const walk = (d, base = d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, base); else all.push(path.relative(base, p).split(path.sep).join('/')); } }; walk(DIST);
    const bad = []; if (all.some((f) => /sw-kill/.test(f))) bad.push('a sw-kill file is inside the dist');
    const copy = path.join(OUTDIR, '_ops', 'sw-kill.js'); const src = path.join(REPO, 'ops', 'sw-kill.js');
    if (!fs.existsSync(src)) bad.push('ops/sw-kill.js is missing'); else if (fs.existsSync(copy) && sha(fs.readFileSync(copy)) !== sha(fs.readFileSync(src))) bad.push('the copy beside the dist differs from ops/sw-kill.js');
    const ops = all.filter((f) => f.startsWith('_ops/')).sort(); const okOps = ['_ops/asset-manifest.json', '_ops/used-names.txt'].every((f) => ops.includes(f)) && ops.every((f) => ['_ops/asset-manifest.json', '_ops/used-names.txt', '_ops/config-manifest.json'].includes(f));
    if (!okOps) bad.push(`unexpected _ops/ content: ${ops.join(', ')}`);
    return { ok: bad.length === 0, detail: bad.join('; ') || `no kill switch in the dist; _ops/: ${ops.map((f) => f.slice(5)).join(', ')}` };
  });

step('S3', 'local', 'the staging copy equals the dist except for the one `_headers` file that adds X-Robots-Tag: noindex',
  `node ops/sha-list.mjs list ${rel(DIST)} ... ; list ${rel(STAGE)} ...; diff`, 'only _headers differs; the staging _headers sets X-Robots-Tag: noindex in /*', async () => {
    if (!fs.existsSync(STAGE)) return { ok: false, detail: `${rel(STAGE)} does not exist: node ops/sha-list.mjs stage ${rel(DIST)} ${rel(STAGE)} --force` };
    const files = (root) => { const m = new Map(); const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else m.set(path.relative(root, p).split(path.sep).join('/'), sha(fs.readFileSync(p))); } }; walk(root); return m; };
    const a = files(DIST), b = files(STAGE); const diff = [...new Set([...a.keys(), ...b.keys()])].filter((f) => a.get(f) !== b.get(f)).sort();
    const hp = path.join(STAGE, '_headers'); const noindex = fs.existsSync(hp) && /^\s*X-Robots-Tag:\s*noindex/im.test(rd(hp));
    const ok = diff.length === 1 && diff[0] === '_headers' && noindex;
    return { ok, detail: ok ? `${b.size} files, only _headers differs (noindex present)` : `differing files: ${diff.join(', ') || '(none)'}; noindex in staging _headers: ${noindex}` };
  });

step('S4', 'local', 'the generated header/redirect rules of the built tree behave (local emulation; R0-R1b ship the legacy netlify.toml)',
  `node ops/headers-probe.mjs --dist ${rel(DIST)} --profile ${PROFILE}`, `exit 0 ("N/N as expected, 0 unexpected FAIL")`, async () => {
    const r = await node(['ops/headers-probe.mjs', '--dist', DIST, '--profile', PROFILE]); return { ok: r.status === 0, detail: tail(r, 1) };
  });

step('S5', 'net', 'production still serves the baseline the train was built from (a deploy would otherwise revert someone else\'s change)',
  'python tools/t0/baseline.py verify-live', 'exit 0 and a line starting "IDENTICAL: live == baseline/dist"', async () => {
    if (opt['skip-live-drift'] || LOCAL) return { ok: true, skipped: true, detail: LOCAL ? 'skipped in --local (needs the production site)' : 'skipped by --skip-live-drift (run it again right before the production deploy: ops/RELEASE-RUNBOOK.md 7.0)' };
    const r = await py(['tools/t0/baseline.py', 'verify-live']); const ident = /^IDENTICAL:/m.test(r.stdout || '');
    return { ok: r.status === 0 && ident, detail: r.status === 0 ? tail(r, 1) : `exit ${r.status}: ${tail(r, 4)}` };
  });

step('S6', 'net', 'staging is noindex on every kind of path and serves no config or kill-switch file',
  `HEAD ${'<staging>'}/ /privacy /assets/<entry> /version.json (X-Robots-Tag) and /_headers /_redirects /netlify.toml /_ops/sw-kill.js /sw-kill.js`, 'X-Robots-Tag: noindex on all four; the five config/kill paths answer 404', async () => {
    const v = ver(); const bad = [];
    for (const p of ['/', '/privacy', `/assets/${v.entry}`, '/version.json']) { const r = await head(STAGING, p); if (r.status !== 200) bad.push(`${p} HTTP ${r.status}`); else if (!/noindex/i.test(r.headers['x-robots-tag'] || '')) bad.push(`${p} has no X-Robots-Tag: noindex`); }
    for (const p of ['/_headers', '/_redirects', '/netlify.toml', '/_ops/sw-kill.js', '/sw-kill.js']) { const r = await head(STAGING, p); if (r.status === 200) bad.push(`${p} is publicly served`); }
    return { ok: bad.length === 0, detail: bad.join('; ') || 'noindex everywhere; config and kill files not served' };
  });

step('S7', 'net', 'every file of the dist arrived intact, HTML included (Netlify\'s RUM snippet and link rewriting are explained by the model; anything else is a DIFF)',
  `node ops/sha-list.mjs list ${rel(DIST)} --out <tmp>.tsv && node ops/sha-list.mjs verify-url <tmp>.tsv ${'<staging>'} --tree ${rel(DIST)} --expect-missing netlify.toml,_headers,_redirects[,diagnostics.html on R0]`,
  'exit 0; "0 differ, 0 missing, 0 config file(s) publicly served, 0 errors"; no DIFF/MISS/PUB/ERR line', async () => {
    const tmp = path.join(REPO, 'tmp', `staging-verify-${TRAIN}.tsv`); fs.mkdirSync(path.dirname(tmp), { recursive: true });
    const l = await node(['ops/sha-list.mjs', 'list', DIST, '--out', tmp]); if (l.status !== 0) return { ok: false, detail: `list failed: ${tail(l, 2)}` };
    // R0 ships the legacy netlify.toml, whose forced redirect answers /diagnostics.html with 404 although the file is in the dist (the dev pages are deleted from R1a on):
    // that 404 is the expected, GOOD answer (ops/STAGING-SETUP.md section 4), so the file is expected-missing there.
    const missing = ['netlify.toml', '_headers', '_redirects', ...(fs.existsSync(path.join(DIST, 'diagnostics.html')) ? ['diagnostics.html'] : [])].join(',');
    const r = await node(['ops/sha-list.mjs', 'verify-url', tmp, STAGING, '--tree', DIST, '--expect-missing', missing, '--concurrency', '4']);
    const out = `${r.stdout}${r.stderr}`; const bad = out.split('\n').filter((x) => /^(DIFF|MISS|PUB |ERR )/.test(x));
    const m = /(\d+) differ, (\d+) missing, (\d+) config file\(s\) publicly served, (\d+) errors/.exec(out);
    const clean = m && m.slice(1).every((x) => x === '0') && bad.length === 0;
    return { ok: r.status === 0 && !!clean, detail: r.status === 0 && clean ? tail(r, 3).split('\n').find((x) => /files checked/.test(x)) || 'identical' : `exit ${r.status}: ${bad.slice(0, 6).join(' | ') || tail(r, 3)}` };
  });

step('S8', 'net', 'the post-deploy probe on staging (HP-01..15, T0-01..08, T0-BYTES, T0-HTML, ops/headers-probe.mjs): no FAIL',
  `node tests/t0/prod-probe.mjs --base ${'<staging>'} --train ${TRAIN} --staging --dist ${rel(DIST)} --expect-release <rid>`, 'exit 0; last line "summary: ... 0 FAIL ... -> GREEN" (KNOWN lines are red on purpose until a later train)', async () => {
    const v = ver(); const r = await node(['tests/t0/prod-probe.mjs', '--base', STAGING, '--train', TRAIN, '--staging', '--dist', DIST, '--expect-release', opt['expect-release'] || v.release]);
    const sum = ((r.stdout || '').split('\n').filter((x) => /^summary:/.test(x)).pop()) || tail(r, 1);
    return { ok: r.status === 0 && /GREEN/.test(sum), detail: r.status === 0 ? sum : `exit ${r.status}: ${((r.stdout || '').split('\n').filter((x) => /^(FAIL|ERROR)/.test(x)).slice(0, 4).join(' | ')) || tail(r, 3)}` };
  });

step('S9', 'net', TRAIN === 'R1c' ? 'header parity with production: not applicable to R1c (it changes headers on purpose; S4/S8 check the generated rules instead)' : 'header parity with production: R0, R1a and R1b change no header, so staging and production must answer identically except X-Robots-Tag',
  `node tests/t0/prod-probe.mjs --base ${'<staging>'} --train ${TRAIN} --staging --parity ${'<production>'} --staging-vs --headers-probe off`, TRAIN === 'R1c' ? 'skipped' : 'PASS PARITY line: "N representative URLs carry identical security/caching headers on both sites"', async () => {
    if (TRAIN === 'R1c') return { ok: true, skipped: true, detail: 'not applicable to R1c' };
    if (opt['skip-live-drift'] && !LOCAL) { /* parity needs production reads; still run it, they are plain HEAD requests */ }
    const r = await node(['tests/t0/prod-probe.mjs', '--base', STAGING, '--train', TRAIN, '--staging', '--parity', PRODUCTION, '--staging-vs', '--headers-probe', 'off', '--no-content']);
    const line = (r.stdout || '').split('\n').find((x) => /PARITY/.test(x)) || tail(r, 1);
    return { ok: /^PASS\s+PARITY/.test(line), detail: line.trim() };      // only the PARITY verdict counts here; the other probes are S8's business
  });

step('S10', 'local', 'the legal text matches what the headers allow (privacy/terms vs built tree; opt-in group reported)',
  `node ops/legal-drafts/verify-facts.mjs --dist ${rel(DIST)}`, 'exit 0 ("no FAIL"); on R1c the INFO line says whether the opt-in legal group is in this build', async () => {
    const r = await node(['ops/legal-drafts/verify-facts.mjs', '--dist', DIST]); const info = (r.stdout || '').split('\n').find((x) => /legal-opt-in/.test(x));
    return { ok: r.status === 0, detail: `${tail(r, 1)}${info ? ` | ${info.trim().slice(0, 150)}` : ''}` };
  });

step('S11', 'manual', 'what no script can check', '(by hand)', 'every item ticked in the log row', async () => ({
  ok: true, manual: true,
  detail: [
    `soak on staging: ${TRAIN === 'R0' ? '48' : '24'} h, then re-run this script once more (a deploy that decays is a finding)`,
    'tests/t0/journeys-manual.md part A on the staging URL (the map is blank there: tiles answer 403 on netlify.app)',
    'owner sign-offs of the train (ops/RELEASE-RUNBOOK.md section 13); credits known (section 7.3)',
    ...(TRAIN === 'R1c' ? ['if the build was made with --with PG-legal: the owner read ops/legal-drafts/preview/*.html and OWNER-SIGNOFF.md, and trains.json legal.effective_date is the production deploy day (verify-facts S10 prints the date it checked)'] : []),
    'python tools/t0/baseline.py verify-live again RIGHT BEFORE the production deploy (S5 is only as fresh as this run)',
  ].join(' | ') }));

// ------------------------------------------------------------------------------------------------------------------ run
if (opt.checklist) {
  console.log(`staging-verify checklist, train ${TRAIN} (dist ${rel(DIST)}, staging copy ${rel(STAGE)}):\n`);
  for (const s of S) console.log(`${s.id.padEnd(4)} [${s.kind}] ${s.title}\n       command:  ${s.cmd}\n       expected: ${s.expected}\n`);
  process.exit(0);
}

const servers = [];
async function main() {
  if (LOCAL) {
    if (!fs.existsSync(STAGE)) { console.error(`--local needs the staging copy ${rel(STAGE)} (node ops/sha-list.mjs stage ${rel(DIST)} ${rel(STAGE)} --force)`); return 2; }
    const { createEmulator } = await import(pathToFileURL(path.join(REPO, 'tools', 't0', 'config', 'emulate.mjs')).href);
    const p0 = Number(opt.port || 8748);
    const a = await createEmulator({ dist: STAGE, port: p0 }); const b = await createEmulator({ dist: DIST, port: p0 + 1 });
    servers.push(a, b); STAGING = a.url; PRODUCTION = b.url;
    console.log(`LOCAL REHEARSAL: staging = emulator on ${STAGING} serving ${rel(STAGE)}, "production" = emulator on ${PRODUCTION} serving ${rel(DIST)}. Proves the tree and this script, NOT Netlify's handling of an upload.\n`);
  }
  console.log(`staging-verify: train ${TRAIN}, dist ${rel(DIST)}, staging ${STAGING}${LOCAL ? ' (local)' : ''}\n`);
  const results = []; let fail = 0;
  for (const s of S) {
    let r;
    try { r = await s.run(); } catch (e) { r = { ok: false, detail: `error: ${e && (e.cause && e.cause.code || e.message) || e}`, error: true }; }
    const tag = r.manual ? 'MANUAL' : r.skipped ? 'SKIP  ' : r.ok ? 'PASS  ' : 'FAIL  ';
    if (!r.ok) fail++;
    results.push({ id: s.id, kind: s.kind, title: s.title, cmd: s.cmd, expected: s.expected, status: r.manual ? 'manual' : r.skipped ? 'skip' : r.ok ? 'pass' : 'fail', detail: r.detail });
    console.log(`${tag} ${s.id.padEnd(4)} ${s.title}\n       expected: ${s.expected}\n       actual:   ${String(r.detail).split('\n').join('\n                 ')}\n`);
  }
  const netErr = results.some((r) => r.status === 'fail' && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|error:/.test(r.detail || ''));
  const verdict = fail ? (netErr ? 'COULD NOT VERIFY (a request failed: check the URL and your connection; this is not a verdict on the site)' : 'RED: do not deploy to production') : 'GREEN: every automatic step passed (the manual list S11 is still yours)';
  console.log(`staging-verify: ${results.filter((r) => r.status === 'pass').length} pass, ${fail} FAIL, ${results.filter((r) => r.status === 'skip').length} skipped, ${results.filter((r) => r.status === 'manual').length} manual  -> ${verdict}`);
  if (opt.json) { fs.mkdirSync(path.dirname(path.resolve(opt.json)), { recursive: true }); fs.writeFileSync(opt.json, JSON.stringify({ train: TRAIN, staging: STAGING, local: LOCAL, release: (() => { try { return ver().release; } catch { return null; } })(), verdict, results }, null, 2) + '\n'); }
  return fail ? (netErr ? 2 : 1) : 0;
}
let code = 2;
try { code = await main(); } finally { for (const s of servers) { try { await s.close(); } catch { /* closed */ } } }
process.exit(code);
