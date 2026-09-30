#!/usr/bin/env node
// tools/t0/run_suites.mjs - run every Tranche-0 acceptance suite in one command and write a machine-readable summary.
//
//   node tools/t0/run_suites.mjs                       everything (about 45-60 minutes; needs release/R0..R1c built: python tools/t0/build.py --all)
//   node tools/t0/run_suites.mjs --only r0,headers     subset by suite id prefix (comma list; see --list)
//   node tools/t0/run_suites.mjs --list                print the suite table and exit
//   node tools/t0/run_suites.mjs --json tmp/x.json     where to write the summary (default release/test-summary.json; release/ is git-ignored)
//   node tools/t0/run_suites.mjs --no-red              skip the red-first proofs against legacy/dist
//   node tools/t0/run_suites.mjs --no-network          skip baseline.live (python tools/t0/baseline.py verify-live: ~150 read-only requests to production)
//   node tools/t0/run_suites.mjs --only red.copy --merge   re-run some suites and merge their rows into the existing summary
//
// Every suite is a separate process with T0_PORT_BASE (default 8480, uses base..base+9) and its own Chrome profile under tmp/<T0_AGENT>.
// Suites run one after the other (the mobile matrix runs its four slices in parallel, each with its own tile budget and ports); the Mapbox
// tile cap is per run (harness default 300 requests through the Referer-injecting side channel; this runner never raises it).
// A "green" row is a suite whose summary line reads N/N passed (skips are reported, never hidden); a "red-first" row is a run against
// legacy/dist with --expect-red that must FAIL every selected test (proof that the suite discriminates).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const ONLY = (opt('only', '') || '').split(',').filter(Boolean);
const JSON_OUT = path.resolve(REPO, opt('json', 'release/test-summary.json'));
const NO_RED = !!opt('no-red', false);
const NO_NET = !!opt('no-network', false);
const MERGE = !!opt('merge', false);          // keep the rows of an earlier summary for suites that are not re-run (rows whose id left the table are dropped)
const PORT_BASE = String(opt('port-base', process.env.T0_PORT_BASE || 8480));
const AGENT = process.env.T0_AGENT || 'integrator';
const ENV = { ...process.env, T0_PORT_BASE: PORT_BASE, T0_AGENT: AGENT, PYTHONIOENCODING: 'utf-8' };
const NODE = process.execPath;
const PY = process.env.PYTHON || 'python';

const D = (t) => `release/${t}/dist`;
const J = 'tests/t0/journeys-desktop.spec.mjs', DLK = 'tests/t0/deeplinks.spec.mjs', MOB = 'tests/t0/mobile-matrix.spec.mjs', A11Y = 'tests/t0/a11y.spec.mjs';
const CPY = 'tests/t0/copy.spec.mjs', PGC = 'tests/t0/pages-core.spec.mjs', PGM = 'tests/t0/pages-maps.spec.mjs', HDR = 'tests/t0/headers.spec.mjs', R0 = 'tests/t0/r0.mjs';

// kind: 'green' (must pass every selected test) | 'red' (legacy, every selected test must fail) | 'check' (exit code only)
// inverted: a red-first proof whose spec asserts the red state itself under --expect-red (a11y, copy): every selected test must PASS (= red observed)
const S = [];
const add = (id, title, cmd, args, o = {}) => S.push({ id, title, cmd, args, kind: o.kind || 'green', parallel: o.parallel || null, expectExit: o.expectExit ?? 0, inverted: !!o.inverted });
// ---- static
add('static.gates', 'build gates of the four trains (gate.json written by build.py)', 'gates', []);
add('static.overlap', 'geometric overlap audit of the patch set', PY, ['tools/t0/overlap.py'], { kind: 'check' });
add('static.verify', 'verify_release: manifest, static crawl, dev pages, names, identity vs the baseline, cumulative, legacy and baseline pinned', NODE, ['tools/t0/verify_release.mjs', '--json', 'release/verify-all.json'], { kind: 'check' });
add('static.selftest', 'build system self-test (10 properties incl. determinism and ledger)', PY, ['tests/t0/build_selftest.py']);
add('static.baseline', 'baseline machinery self-test (16 cases: Netlify post-processing model, lock and build refusal, CRLF-aware patching, overlay guard, verify-live against a local Netlify fake, mirror -> reconstruct -> prove, JS/Python model parity)', PY, ['tools/t0/tests/baseline_selftest.py']);
add('static.baselinelock', 'baseline/dist matches tools/t0/baseline.lock.json (per-file sha256, no network)', PY, ['tools/t0/baseline.py', 'verify'], { kind: 'check' });
add('static.legal', 'privacy/terms fact base vs the built R1c tree', NODE, ['ops/legal-drafts/verify-facts.mjs', '--dist', D('R1c')], { kind: 'check' });
add('static.lib', 'browser harness self-test', NODE, ['tests/t0/lib_selftest.mjs']);
// ---- R0 mechanism on every train
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`r0.${t}`, `R0 acceptance (X1/X2) on ${t}`, NODE, [R0, '--dist', D(t)]);
// ---- group A (and B/DL where present): journeys + inputs
for (const t of ['R1a', 'R1b', 'R1c']) add(`journeys.${t}`, `desktop journeys J1-J8, inputs, group A${t === 'R1c' ? ', group B' : ''} on ${t}`, NODE, [J, '--dist', D(t)]);
add('deeplinks.R1c', 'deep links, moments.json, Turning Points (X7)', NODE, [DLK, '--dist', D('R1c')]);
// ---- group C mobile: four slices in parallel
for (const t of ['R1b', 'R1c']) add(`mobile.${t}`, `mobile shell matrix (X5) on ${t}: portrait, landscape, misc, touch slices`, NODE, [], {
  parallel: [
    [MOB, '--dist', D(t), '--slot', '0', '--vp', 'portrait', '--filter', 'MOB-0[2-6]|MOB-12', '--out', `tmp/${AGENT}/mob-${t}-portrait.json`, '--shots', `tmp/${AGENT}/shots/${t}-portrait`],
    [MOB, '--dist', D(t), '--slot', '1', '--vp', 'landscape', '--filter', 'MOB-0[2-6]|MOB-12', '--out', `tmp/${AGENT}/mob-${t}-landscape.json`, '--shots', `tmp/${AGENT}/shots/${t}-landscape`],
    [MOB, '--dist', D(t), '--slot', '2', '--filter', 'MOB-01|MOB-07|MOB-11|MOB-13', '--out', `tmp/${AGENT}/mob-${t}-misc.json`, '--shots', `tmp/${AGENT}/shots/${t}-misc`],
    [MOB, '--dist', D(t), '--slot', '3', '--filter', 'MOB-08|MOB-09|MOB-10', '--out', `tmp/${AGENT}/mob-${t}-touch.json`, '--shots', `tmp/${AGENT}/shots/${t}-touch`]] });
// ---- a11y, copy
add('a11y.R1b', 'a11y bridge (axe, keyboard, contrast) on R1b (AX without CP)', NODE, [A11Y, '--dist', D('R1b')]);
add('a11y.R1c', 'a11y bridge on R1c', NODE, [A11Y, '--dist', D('R1c')]);
add('a11y.R1c.tiles', 'a11y with real tiles (A11Y-14, production Referer, capped)', NODE, [A11Y, '--dist', D('R1c'), '--filter', 'A11Y-14', '--tiles', 'inject']);
add('copy.R1c', 'truthful-copy subset (CP-01..03)', NODE, [CPY, '--dist', D('R1c')]);
// ---- page groups
for (const t of ['R1a', 'R1c']) add(`pagescore.${t}`, `page defect pack PGC-01..27 on ${t}`, NODE, [PGC, '--dist', D(t)]);
add('pagescore.R1c.real', 'PGC-28 Watch Together + Immersive with the real Mapbox library', NODE, [PGC, '--dist', D('R1c'), '--real-maps', '--filter', 'PGC-28']);
add('pagescore.R1c.full', 'PGC-01 duplicate-id sweep of every page under 0/300/1500/4000 ms data delay (X11)', NODE, [PGC, '--dist', D('R1c'), '--full', '--filter', 'PGC-01']);
for (const t of ['R1a', 'R1c']) add(`pagesmaps.${t}`, `map sub-pages, og card, manifest (PG-01..08) on ${t}`, NODE, [PGM, '--dist', D(t)]);
// ---- headers
add('headers.R1c', 'R1c generated _headers/_redirects + real-Chrome framing and CSP crawl', NODE, [HDR, '--dist', D('R1c')]);
// ---- live drift of 2026-09-30 (docs/baseline-drift.md)
add('baseline.drift', 'live drift: T0-BL-01..09 (hide-bar block, monuments overlay removed, animationend reveal, hide-bar block superseded in R1b/R1c and kept in R0/R1a, every train keeps the live index.html and terrain.json)', NODE, ['tools/t0/tests/baseline-drift.spec.mjs']);
if (!NO_NET) add('baseline.live', 'verify-live: production still equals baseline/dist (network, read-only, about 150 requests)', PY, ['tools/t0/baseline.py', 'verify-live'], { kind: 'check' });
// ---- red-first proofs against the original deployed tree (legacy/dist; the specs decide "legacy" by that path)
if (!NO_RED) {
  const L = 'legacy/dist';
  add('red.r0', 'legacy/dist: X1 (one Document, controller, one sku) is RED', NODE, [R0, '--dist', L, '--expect-red', '--filter', 'R0-0[1-3]'], { kind: 'red' });
  add('red.journeys', 'legacy/dist: input, sound and C5 tests are RED', NODE, [J, '--dist', L, '--expect-red', '--filter', 'T0-IN-0[1-2]|T0-SND|T0-C5'], { kind: 'red' });
  add('red.deeplinks', 'legacy/dist: the app reads none of tick/u/ancestor links (DL-01,02,07 RED)', NODE, [DLK, '--dist', L, '--expect-red', '--filter', 'T0-DL-0[127]'], { kind: 'red' });
  add('red.mobile', 'legacy/dist: no mobile shell (MOB-02..05 RED)', NODE, [MOB, '--dist', L, '--slot', '0', '--expect-red', '--filter', 'MOB-0[2-5]', '--out', `tmp/${AGENT}/mob-red.json`, '--shots', `tmp/${AGENT}/shots/red`], { kind: 'red' });
  add('red.a11y', 'legacy/dist: axe finds serious/critical violations and failing contrast (A11Y-01, A11Y-15 assert the red state)', NODE, [A11Y, '--dist', L, '--expect-red', '--filter', 'A11Y-01|A11Y-15'], { kind: 'red', inverted: true });
  add('red.copy', 'legacy/dist: every shipped copy row is still present (CP-01 asserts the red state)', NODE, [CPY, '--dist', L, '--expect-red', '--filter', 'CP-01'], { kind: 'red', inverted: true });
  add('red.pagescore', 'legacy/dist: page defect pack (every red-able PGC test RED)', NODE, [PGC, '--dist', L, '--expect-red'], { kind: 'red' });
  add('red.pagesmaps', 'legacy/dist: blocking Mapbox, PeerJS eager, corrupt og (PG-01, 02-*, 05*, 06, 08 RED; PG-02b is a guard for our own change and cannot be red)', NODE, [PGM, '--dist', L, '--expect-red', '--filter', 'PG-01|PG-02-|PG-05|PG-06|PG-08'], { kind: 'red' });
  add('red.legal', 'legacy/dist: privacy/terms fact base fails', NODE, ['ops/legal-drafts/verify-facts.mjs', '--dist', L], { kind: 'check', expectExit: 1 });
}

if (opt('list', false)) { for (const s of S) console.log(`${s.id.padEnd(22)} ${s.kind.padEnd(6)} ${s.title}`); process.exit(0); }

const SUMMARY = /^(.*?):\s+(\d+)\/(\d+) passed(?:, (\d+) skipped)?(?:, (\d+) FAILED)?\s*$/m;
function runProc(cmd, args) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(cmd, args, { cwd: REPO, env: ENV, windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('error', (e) => resolve({ code: -1, out: String(e), seconds: 0 }));
    p.on('close', (code) => resolve({ code, out, seconds: Math.round((Date.now() - t0) / 100) / 10 }));
  });
}
function parse(out) {
  const lines = out.split(/\r?\n/);
  let m = null;
  for (let i = lines.length - 1; i >= 0 && !m; i--) m = SUMMARY.exec(lines[i]);
  const tiles = /mapbox requests used this run:\s*(\d+) of (\d+)/.exec(out) || /"mapbox requests this run":"(\d+) of (\d+)/.exec(out);
  const r = { passed: null, total: null, skipped: 0, failed: 0, tiles: tiles ? Number(tiles[1]) : null };
  if (m) { r.passed = Number(m[2]); r.total = Number(m[3]); r.skipped = Number(m[4] || 0); r.failed = Number(m[5] || 0); }
  else {
    const st = /build selftest: all passed/.test(out); if (st) { r.passed = (out.match(/^PASS /gm) || []).length; r.total = r.passed; }
    const pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length;
    if (r.total === null && (pass || fail)) { r.passed = pass; r.total = pass + fail; r.failed = fail; }
  }
  return r;
}

const results = [];
const selected = S.filter((s) => !ONLY.length || ONLY.some((p) => s.id === p || s.id.startsWith(p)));
console.log(`run_suites: ${selected.length} suite(s), port base ${PORT_BASE}, agent ${AGENT}`);
const tAll = Date.now();
for (const s of selected) {
  let rec = { id: s.id, title: s.title, kind: s.kind, inverted: s.inverted };
  if (s.cmd === 'gates') {
    const gates = ['R0', 'R1a', 'R1b', 'R1c'].map((t) => { try { const g = JSON.parse(fs.readFileSync(path.join(REPO, 'release', t, 'gate.json'), 'utf8')); return { train: t, ok: !!g.ok, checks: (g.checks || []).length, failed: (g.checks || []).filter((c) => !c.ok).map((c) => c.id) }; } catch (e) { return { train: t, ok: false, error: String(e.message) }; } });
    Object.assign(rec, { exit: gates.every((g) => g.ok) ? 0 : 1, gates, seconds: 0, ok: gates.every((g) => g.ok), passed: gates.filter((g) => g.ok).length, total: gates.length, skipped: 0, failed: gates.filter((g) => !g.ok).length, tiles: 0 });
  } else if (s.parallel) {
    const runs = await Promise.all(s.parallel.map((a) => runProc(s.cmd, a)));
    const parts = runs.map((r) => ({ exit: r.code, seconds: r.seconds, ...parse(r.out), tail: r.out.split(/\r?\n/).filter((l) => /^FAIL /.test(l)).slice(0, 6) }));
    const sum = (k) => parts.reduce((a, p) => a + (p[k] || 0), 0);
    Object.assign(rec, { parts, exit: Math.max(...runs.map((r) => r.code)), seconds: Math.max(...runs.map((r) => r.seconds)), passed: sum('passed'), total: sum('total'), skipped: sum('skipped'), failed: sum('failed'), tiles: Math.max(...parts.map((p) => p.tiles || 0)) });
    rec.ok = rec.exit === 0 && rec.failed === 0 && rec.passed === rec.total - rec.skipped;
    rec.failLines = parts.flatMap((p) => p.tail);
  } else {
    const r = await runProc(s.cmd, s.args);
    const p = parse(r.out);
    Object.assign(rec, { exit: r.code, seconds: r.seconds, ...p });
    rec.failLines = r.out.split(/\r?\n/).filter((l) => /^(FAIL|\s+ANCHOR FAIL)/.test(l)).slice(0, 8);
    if (s.kind === 'check') rec.ok = r.code === s.expectExit;
    else if (s.kind === 'red') rec.ok = s.inverted ? (r.code === 0 && p.passed > 0 && p.failed === 0) : (r.code === 0 && p.total > 0 && p.passed === 0 && p.failed > 0 && p.skipped === 0);
    else rec.ok = r.code === 0 && p.total !== null && p.failed === 0 && p.passed === p.total - p.skipped;
    rec.tail = r.out.split(/\r?\n/).filter(Boolean).slice(-3).map((l) => l.slice(0, 200));
  }
  results.push(rec);
  console.log(`${s.kind === 'red' ? (rec.ok ? 'RED-OK ' : 'NOT-RED') : (rec.ok ? 'PASS   ' : 'FAIL   ')} ${s.id.padEnd(22)} ${rec.total !== null && rec.total !== undefined ? `${rec.passed}/${rec.total}${rec.skipped ? ` (+${rec.skipped} skipped)` : ''}${rec.failed ? ` ${rec.failed} failed` : ''}` : 'exit ' + rec.exit}`.padEnd(46) + ` ${String(rec.seconds).padStart(6)} s${rec.tiles ? `  tiles ${rec.tiles}/300` : ''}  ${s.title}`);
  for (const l of rec.failLines || []) console.log(`        ${l.slice(0, 220)}`);
}
let rows = results;
if (MERGE && fs.existsSync(JSON_OUT)) {
  const prev = (JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')).results || []);
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const r of results) byId.set(r.id, r);
  rows = S.map((s) => byId.get(s.id)).filter(Boolean);
}
const green = rows.filter((r) => r.kind !== 'red'), red = rows.filter((r) => r.kind === 'red');
const summary = {
  finished: 'see file mtime', seconds: MERGE ? Math.round(rows.reduce((a, r) => a + (r.seconds || 0), 0)) : Math.round((Date.now() - tAll) / 1000), portBase: PORT_BASE,
  totals: { suites: rows.length, ok: rows.filter((r) => r.ok).length, notOk: rows.filter((r) => !r.ok).length,
    greenTests: green.reduce((a, r) => a + (r.kind === 'green' ? (r.passed || 0) : 0), 0), greenTestsTotal: green.reduce((a, r) => a + (r.kind === 'green' ? (r.total || 0) : 0), 0),
    redProofs: red.length, redProofsOk: red.filter((r) => r.ok).length, redTestsRedAsRequired: red.reduce((a, r) => a + (r.ok ? (r.failed || 0) + (r.inverted ? (r.passed || 0) : 0) : 0), 0) },
  results: rows };
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify(summary, null, 1) + '\n');
console.log(`\nrun_suites: ${summary.totals.ok}/${summary.totals.suites} suites OK; green tests ${summary.totals.greenTests}/${summary.totals.greenTestsTotal}; red-first proofs ${summary.totals.redProofsOk}/${summary.totals.redProofs} (${summary.totals.redTestsRedAsRequired} legacy tests red as required); ${summary.seconds}s -> ${path.relative(REPO, JSON_OUT).replace(/\\/g, '/')}`);
process.exit(summary.totals.notOk ? 1 : 0);
