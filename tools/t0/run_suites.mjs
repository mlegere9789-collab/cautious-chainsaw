#!/usr/bin/env node
// tools/t0/run_suites.mjs - run every Tranche-0 acceptance suite in one command and write a machine-readable summary.
//
//   node tools/t0/run_suites.mjs                       everything (about 3 hours; needs release/R0..R1c built: python tools/t0/build.py --all)
//   node tools/t0/run_suites.mjs --only r0,headers     subset by suite id prefix (comma list; see --list)
//   node tools/t0/run_suites.mjs --list                print the suite table and exit
//   node tools/t0/run_suites.mjs --json tmp/x.json     where to write the summary (default release/test-summary.json; release/ is git-ignored)
//   node tools/t0/run_suites.mjs --no-red              skip the red-first proofs against legacy/dist
//   node tools/t0/run_suites.mjs --no-network          skip baseline.live (python tools/t0/baseline.py verify-live: ~150 read-only requests to production)
//   node tools/t0/run_suites.mjs --only red.copy --merge   re-run some suites and merge their rows into the existing summary
//   node tools/t0/run_suites.mjs --import-log <log> --merge --only <rest>   a full run that was stopped (a host that kills a command after 2 hours) leaves its console log but no summary: --import-log turns the
//                                                      PASS/FAIL/RED-OK/NOT-RED lines of that log into rows (marked recovered_from_log) before the remaining suites run and merge
// The summary file is rewritten after EVERY suite, so a stopped run leaves a usable partial summary (continue it with --merge --only <the suites that did not run>).
//
// Every suite is a separate process with T0_PORT_BASE (default 8480, uses base..base+9) and its own Chrome profile under tmp/<T0_AGENT>.
// Suites run one after the other (the mobile matrix runs its four slices in parallel, each with its own tile budget and ports); the Mapbox
// tile cap is per run (harness default 300 requests through the Referer-injecting side channel; this runner never raises it).
// A "green" row is a suite whose summary line reads N/N passed (skips are reported, never hidden); a "red-first" row is a run against
// legacy/dist with --expect-red that must FAIL every selected test (proof that the suite discriminates).
//
// Behind an HTTPS proxy (HTTPS_PROXY set) every child process also gets NODE_USE_ENV_PROXY=1 and NODE_EXTRA_CA_CERTS (each only when it is not set
// already), so that Node's own fetch() in a suite reaches the network without any manual environment; with no proxy the children get exactly the
// environment they always got (tools/t0/child_env.mjs).  Where the runner turns NODE_USE_ENV_PROXY on it also appends --disable-warning=UNDICI-EHPA to
// NODE_OPTIONS (Node 22 prints a two-line warning on stderr in every process that has the variable; a test that reads merged output would see it).
// The summary names the variables that were added or extended ("childEnv": added, extended), never their values.
// Every row of the summary carries load1Start and load1End: the 1-minute load average of the machine when the suite started and when it ended
// (null on Windows, which has no load average); the console line shows them as "load a>b".  A timing result is only evidence with its load.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { childEnv, childEnvRecord, describeChildEnv, load1, loadText, machineRecord } from './child_env.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const ONLY = (opt('only', '') || '').split(',').filter(Boolean);
const JSON_OUT = path.resolve(REPO, opt('json', 'release/test-summary.json'));
const NO_RED = !!opt('no-red', false);
const NO_NET = !!opt('no-network', false);
const IMPORT_LOG = opt('import-log', null);
const MERGE = !!opt('merge', false) || !!IMPORT_LOG;          // keep the rows of an earlier summary for suites that are not re-run (rows whose id left the table are dropped)
const PORT_BASE = String(opt('port-base', process.env.T0_PORT_BASE || 8480));
const AGENT = process.env.T0_AGENT || 'integrator';
const ENV_BASE = { ...process.env, T0_PORT_BASE: PORT_BASE, T0_AGENT: AGENT, PYTHONIOENCODING: 'utf-8' };
const ENV = childEnv(ENV_BASE);                     // ENV_BASE itself unless an HTTPS proxy is named and a Node proxy variable is missing (see the header)
const CHILD_ENV = childEnvRecord(ENV_BASE);         // { httpsProxy, added: [names] } for the summary
const NODE = process.execPath;
const PY = process.env.PYTHON || 'python';

// --r1-dist <dir> (or T0_R1_DIST): the Release 1 scratch candidate (python tools/accept/r1_build.py) stands in for release/R1c/dist in every R1c suite, and the suites of the candidate groups (r1.*) are added
const R1 = opt('r1-dist', process.env.T0_R1_DIST || null);
const R1D = R1 && R1 !== true ? R1 : null;
const D = (t) => (t === 'R1c' && R1D ? R1D : `release/${t}/dist`);
const J = 'tests/t0/journeys-desktop.spec.mjs', DLK = 'tests/t0/deeplinks.spec.mjs', MOB = 'tests/t0/mobile-matrix.spec.mjs', A11Y = 'tests/t0/a11y.spec.mjs';
const CPY = 'tests/t0/copy.spec.mjs', PGC = 'tests/t0/pages-core.spec.mjs', PGM = 'tests/t0/pages-maps.spec.mjs', HDR = 'tests/t0/headers.spec.mjs', R0 = 'tests/t0/r0.mjs';
const DFX = 'tests/t0/desktop-fixes.spec.mjs', MFX = 'tests/t0/mobile-fixes.spec.mjs', PGF = 'tests/t0/pages-fixes.spec.mjs', PERF = 'tests/t0/perf-fixes.spec.mjs';
const CTL = (n) => `release/control/${n}/dist`;     // control trees of the red-first proofs: python tools/t0/redtrees.py

// kind: 'green' (must pass every selected test) | 'red' (legacy, every selected test must fail) | 'check' (exit code only)
// inverted: a red-first proof whose spec asserts the red state itself under --expect-red (a11y, copy): every selected test must PASS (= red observed)
const S = [];
const add = (id, title, cmd, args, o = {}) => S.push({ id, title, cmd, args, kind: o.kind || 'green', parallel: o.parallel || null, expectExit: o.expectExit ?? 0, inverted: !!o.inverted });
// ---- static
add('static.gates', 'build gates of the four trains (gate.json written by build.py)', 'gates', []);
add('static.overlap', 'geometric overlap audit of the patch set', PY, ['tools/t0/overlap.py'], { kind: 'check' });
add('static.verify', 'verify_release: manifest, static crawl, dev pages, names, identity vs the baseline, cumulative, legacy and baseline pinned', NODE, ['tools/t0/verify_release.mjs', '--port', String(Number(PORT_BASE) + 8), '--json', 'release/verify-all.json'], { kind: 'check' });
add('static.selftest', 'build system self-test (10 properties incl. determinism and ledger)', PY, ['tests/t0/build_selftest.py']);
add('static.baseline', 'baseline machinery self-test (17 cases: Netlify post-processing model, lock and build refusal, CRLF-aware patching, overlay guard, verify-live against a local Netlify fake, mirror -> reconstruct -> prove, JS/Python model parity, compare-zip of a downloaded deploy)', PY, ['tools/t0/tests/baseline_selftest.py']);
add('static.baselinelock', 'baseline/dist matches tools/t0/baseline.lock.json (per-file sha256, no network)', PY, ['tools/t0/baseline.py', 'verify'], { kind: 'check' });
add('static.legal', 'privacy/terms fact base vs the built R1c tree', NODE, ['ops/legal-drafts/verify-facts.mjs', '--dist', D('R1c')], { kind: 'check' });
add('static.lib', 'browser harness self-test', NODE, ['tests/t0/lib_selftest.mjs']);
add('static.runner', 'runner self-test (no browser): behind an HTTPS proxy every child process of this runner and of the tools/accept runners gets NODE_USE_ENV_PROXY and NODE_EXTRA_CA_CERTS unless they are set (and, where it turns the first on, the flag that silences the one Node proxy warning is appended to NODE_OPTIONS), with no proxy the environment is passed on unchanged; the 1-minute load average at the start and end of every suite is in the summary, the console line, --merge and --import-log', NODE, ['tools/t0/tests/runner_selftest.mjs']);
add('static.overlap.selftest', 'overlap audit self-test (6 cases incl. the failing ones: an anchor that no longer matches, an undeclared overwrite, an anchor with no source)', PY, ['tools/t0/tests/overlap_selftest.py'], { kind: 'check' });
add('static.hygiene', 'source hygiene of tools/t0, tests/t0, tools/ship and ops: no stray control bytes (a regex escape that reached the file as BACKSPACE), every script parses, every JSON file is valid', PY, ['tools/t0/hygiene.py'], { kind: 'check' });
add('static.ship', 'pack_zip self-test (tools/ship/pack_zip.py, the Netlify drag-and-drop zip: files at the zip root, byte-identical packs, a changed, extra or missing file or a wrong tree digest against manifest.json is refused, the staging variant differs in _headers only, the real R1c packs)', PY, ['tools/ship/pack_zip.selftest.py']);
add('static.fixes', 'release-verifier fixes self-test (11 cases: failed builds leave nothing deployable, ledger errors, gate cache beside --out, kill switch outside dist, opt-in legal group, stage guard, verify-url exit codes, stale-dist refusal, S5 asks the previous train)', PY, ['ops/release-fixes.selftest.py']);
add('static.determinism', 'determinism: every train rebuilt into release/check/<train> is byte-identical to release/<train> (dist, manifest, anchors, gate, kill-switch copy)', PY, ['tools/t0/determinism.py']);
add('static.controls', 'control trees for the red-first proofs and the opt-in legal variant built (R1c without A2, without the Mapbox precompile, without the mobile + shell fixes, and R1c with PG-legal with its gates on; each differs from the real R1c)', PY, ['tools/t0/redtrees.py'], { kind: 'check' });
// ---- R0 mechanism on every train
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`r0.${t}`, `R0 acceptance (X1/X2) on ${t}`, NODE, [R0, '--dist', D(t)]);
// ---- group A (and B/DL where present): journeys + inputs
for (const t of ['R1a', 'R1b', 'R1c']) add(`journeys.${t}`, `desktop journeys J1-J8, inputs, group A${t === 'R1c' ? ', group B' : ''} on ${t}`, NODE, [J, '--dist', D(t)]);
add('deeplinks.R1c', 'deep links, moments.json, Turning Points (X7)', NODE, [DLK, '--dist', D('R1c')]);
// ---- desktop fixes (group A2; verifier 0): keyboard focus, attribution, cards, repaint, NPS tour
for (const t of ['R1a', 'R1b', 'R1c']) add(`desktop.${t}`, `desktop fixes T0-DF-01..09 (group A2) on ${t}`, NODE, [DFX, '--dist', D(t)]);
// ---- group C mobile: four slices in parallel
for (const t of ['R1b', 'R1c']) add(`mobile.${t}`, `mobile shell matrix (X5) on ${t}: portrait, landscape, misc, touch slices`, NODE, [], {
  parallel: [
    [MOB, '--dist', D(t), '--slot', '0', '--vp', 'portrait', '--filter', 'MOB-0[2-6]|MOB-12', '--out', `tmp/${AGENT}/mob-${t}-portrait.json`, '--shots', `tmp/${AGENT}/shots/${t}-portrait`],
    [MOB, '--dist', D(t), '--slot', '1', '--vp', 'landscape', '--filter', 'MOB-0[2-6]|MOB-12', '--out', `tmp/${AGENT}/mob-${t}-landscape.json`, '--shots', `tmp/${AGENT}/shots/${t}-landscape`],
    [MOB, '--dist', D(t), '--slot', '2', '--filter', 'MOB-01|MOB-07|MOB-11|MOB-13', '--out', `tmp/${AGENT}/mob-${t}-misc.json`, '--shots', `tmp/${AGENT}/shots/${t}-misc`],
    [MOB, '--dist', D(t), '--slot', '3', '--filter', 'MOB-08|MOB-09|MOB-10', '--out', `tmp/${AGENT}/mob-${t}-touch.json`, '--shots', `tmp/${AGENT}/shots/${t}-touch`]] });
// ---- mobile fixes (mobile verifier D-01..D-08, D-13, WCAG 2.5.3, desktop shell): one process over the whole viewport matrix exhausts the 300-request Mapbox cap
// (the blocked tile requests then surface as console errors in MFIX-12), so the matrix runs as four slices, each with its own cap, ports and scratch files;
// slices a-c run the viewport tests (07/08 are landscape-only and are not selected elsewhere), slice d the desktop-shell tests 10-12.
const MFXSL = (t) => [
  ['a', '0', '320x568,360x640,375x812,390x844', 'MFIX-0[1-6]|MFIX-09|MFIX-12'],
  ['b', '1', '412x915,430x932,768x1024', 'MFIX-0[1-6]|MFIX-09|MFIX-12'],
  ['c', '2', '812x375,844x390,915x412', 'MFIX-0[1-9]|MFIX-12'],
  ['d', '3', null, 'MFIX-1[0-2]']].map(([tag, slot, vp, filter]) => [MFX, '--dist', D(t), '--slot', slot, ...(vp ? ['--vp', vp] : []), '--filter', filter, '--out', `tmp/${AGENT}/mfix-${t}-${tag}.json`, '--shots', `tmp/${AGENT}/shots/mfix-${t}-${tag}`]);
for (const t of ['R1b', 'R1c']) add(`mobilefix.${t}`, `mobile + shell fixes T0-MFIX-01..12 on ${t}: three viewport slices and the desktop-shell slice`, NODE, [], { parallel: MFXSL(t) });
// ---- perf (PERF stylesheets from R1a, the Mapbox shader precompile on every train)
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`perf.${t}`, `perf PF-01..10 on ${t} (PF-01..06 skip on R0: no PERF group by design)`, NODE, [PERF, '--dist', D(t)]);
// ---- a11y, copy
add('a11y.R1b', 'a11y bridge (axe, keyboard, contrast) on R1b (AX without CP)', NODE, [A11Y, '--dist', D('R1b')]);
add('a11y.R1c', 'a11y bridge on R1c', NODE, [A11Y, '--dist', D('R1c')]);
add('a11y.R1a.chooser', 'a11y: the legacy layout chooser is a keyboard-operable dialog on R1a (A11Y-28, group A extension A+chooser; R0 keeps the legacy chooser by design)', NODE, [A11Y, '--dist', D('R1a'), '--filter', 'A11Y-28']);
add('a11y.R1c.tiles', 'a11y with real tiles (A11Y-14, production Referer, capped)', NODE, [A11Y, '--dist', D('R1c'), '--filter', 'A11Y-14', '--tiles', 'inject']);
add('copy.R1c', 'truthful-copy subset (CP-01..04: copy rows, Help rows, the keyboard-route row)', NODE, [CPY, '--dist', D('R1c')]);
// ---- page groups
for (const t of ['R1a', 'R1b', 'R1c']) add(`pagescore.${t}`, `page defect pack PGC-01..27 on ${t}`, NODE, [PGC, '--dist', D(t)]);
add('pagescore.R1c.real', 'PGC-28 Watch Together + Immersive with the real Mapbox library', NODE, [PGC, '--dist', D('R1c'), '--real-maps', '--filter', 'PGC-28']);
add('pagescore.R1c.full', 'PGC-01 duplicate-id sweep of every page under 0/300/1500/4000 ms data delay (X11)', NODE, [PGC, '--dist', D('R1c'), '--full', '--filter', 'PGC-01']);
for (const t of ['R1a', 'R1b', 'R1c']) add(`pagesmaps.${t}`, `map sub-pages, og card, manifest (PG-01..08) on ${t}`, NODE, [PGM, '--dist', D(t)]);
// sub-page accessibility / touch / layout fixes (PGF-*): 25 pages, axe, overflow, 44/24 px targets, keyboard, the map app's own axe from R1b
for (const t of ['R1a', 'R1b', 'R1c']) add(`pagesfix.${t}`, `sub-page fixes T0-PGF-01..19 on ${t} (axe 0 serious/critical on 25 pages at 1440/375/320, no overflow, targets, focus rings; PGF-14 skips without the opt-in PG-legal table)`, NODE, [PGF, '--dist', D(t)]);
// the opt-in legal text: no default train contains it, so PGF-14 (the privacy table) skips above; this variant (R1c built with --with PG-legal, gates on) runs it
add('pagesfix.R1c.legal', 'T0-PGF-14 on R1c built with the opt-in PG-legal group (the privacy table is keyboard-reachable)', NODE, [PGF, '--dist', CTL('R1c-legal'), '--filter', 'PGF-14']);
add('static.legal.optin', 'privacy/terms fact base vs R1c built with PG-legal (exit 0 = no FAIL: the text matches the headers; the Street View delegation is disclosed, so the WARN of the default build is gone)', NODE, ['ops/legal-drafts/verify-facts.mjs', '--dist', CTL('R1c-legal')], { kind: 'check' });
// ---- Release 1 candidate groups (only with --r1-dist): one suite per group, each against the combined candidate tree
if (R1D) {
  const SP = (f) => `tests/t0/${f}.spec.mjs`;
  add('r1.clock', 'CLOCK: one clock for the whole site (T0-CLK-*) on the Release 1 candidate', NODE, [SP('clock'), '--dist', R1D]);
  add('r1.data', 'DATA: audited displayed data (T0-DATA-*) on the Release 1 candidate', NODE, [SP('data'), '--dist', R1D]);
  add('r1.monuments', 'MON: the Monuments layer (MONL-*) on the Release 1 candidate', NODE, [SP('monuments'), '--dist', R1D]);
  add('r1.verifymon', 'MON verifier tests (VMON-*) on the Release 1 candidate', NODE, [SP('verify-monuments'), '--dist', R1D]);
  add('r1.anim', 'ANIM: continuous unit motion (T0-ANIM-*) on the Release 1 candidate', NODE, [SP('anim'), '--dist', R1D]);
  add('r1.base1863', 'BASE1863: the 1863 reconstruction as the map base (B63-*) on the Release 1 candidate', NODE, [SP('base1863'), '--dist', R1D]);
  add('r1.images', 'IMG: only real images of Gettysburg (T0-RIMG-*) on the Release 1 candidate', NODE, [SP('images'), '--dist', R1D]);
  add('r1.polish', 'POLISH: one name per feature, layout, targets, welcome window, historian scroll (T0-POL-*) on the Release 1 candidate', NODE, [SP('polish'), '--dist', R1D]);
  add('r1.polish.pair', 'POLISH T0-POL-09..12 (the control and the build) on the matched pair of tools/t0/polish_pair.py (R1c + CLOCK,DATA,MON,ANIM without and with POLISH: R1e without POLISH cannot be built)', PY, ['tools/t0/polish_pair_run.py']);
  add('r1.perf2', 'PERF2: compare/precompile/roster performance (T0-P2-*) on the Release 1 candidate', NODE, [SP('perf2'), '--dist', R1D]);
  add('r1.acc', 'ACC: no casualty rate above 100 percent is printed as fact (T0-ACC-*): red on R1d, green from R1e', NODE, [SP('acc'), '--dist', R1D]);
  add('r1.perf4', 'PERF4: app-route blocking time and the sliced start-up (T0-P4-*) on the Release 1 candidate, against release/R1d/dist', NODE, [SP('perf4'), '--dist', R1D, '--control', 'release/R1d/dist']);
  add('r1.perf5', 'PERF5: first frame of the Virtual Walkthrough and of the Monuments layer, heat layer of /ground-remembers (T0-P5-*) on the Release 1 candidate, against release/R1e/dist', NODE, [SP('perf5'), '--dist', R1D, '--control', 'release/R1e/dist']);
  add('r1.wtpeer', 'WTP: /watch-together does not close a Live Sync connection that is still being opened (T0-WTP-*, page group PG-zwt)', NODE, [SP('wtpeer'), '--dist', R1D]);
  add('r1.perf6', 'PERF6: the Unit Roster list is virtualised, 3D Terrain off on a tilted map links no program in a frame (T0-P6-*, group PERF6 + page group PG-zperf6) on the Release 1 candidate, against release/R1f/dist', NODE, [SP('perf6'), '--dist', R1D, '--control', 'release/R1f/dist']);
  add('r1.ztail', 'ZTAIL: the dark style fog of /ground-remembers is off for the first frames (T0-ZT-*, page group PG-ztail) on the Release 1 candidate, against release/R1f/dist', NODE, [SP('ztail'), '--dist', R1D, '--control', 'release/R1f/dist']);
  add('r1.seo', 'SEO: titles, descriptions, canonicals, sitemap, JSON-LD, Open Graph, crawlable links, no build-method wording (T0-SEO-*, page group PG-zseo) on the Release 1 candidate', NODE, [SP('seo'), '--dist', R1D]);
  if (!NO_RED) {
    add('red.perf6', 'release/R1f/dist (without PERF6): the browser tests T0-P6-01/04/06 are RED (the spec asserts it under --expect-red; exit 0 = red observed)', NODE, [SP('perf6'), '--dist', 'release/R1f/dist', '--expect-red'], { kind: 'check' });
    add('red.ztail', 'release/R1f/dist (without PG-ztail): the new-behaviour tests T0-ZT-04 and ZT-07 are RED (exit 0 = red observed)', NODE, [SP('ztail'), '--dist', 'release/R1f/dist', '--expect-red'], { kind: 'check' });
  }
}

// ---- the Virtual Walkthrough and its Monuments tab must never break (owner decision 3 of 2026-10-04, tests/t0/walkthrough-guard.README.md): the guard pins what they do on
// production today and runs on the baseline and on every train (the baseline row is named baseline.* so the release notes of every train show it)
const WG = 'tests/t0/walkthrough-guard.spec.mjs';
add('baseline.walkguard', 'walkthrough guard T0-WG-01..17 on baseline/dist (what production serves): 16 tour stops, 512 monuments, Monuments tab, Back without leaks, keyboard, phone, layouts, the real Street View embed', NODE, [WG, '--dist', 'baseline/dist']);
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`walkguard.${t}`, `walkthrough guard T0-WG-01..17 on ${t} (every difference from production is a named capability of a group this train has; anything else fails)`, NODE, [WG, '--dist', D(t)]);
// ---- headers
add('headers.R1c', 'R1c generated _headers/_redirects + real-Chrome framing and CSP crawl', NODE, [HDR, '--dist', D('R1c')]);
// ---- the staging checklist (ops/staging-verify.mjs S0-S11) rehearsed against local emulators: stale-dist check (S0 rebuilds the train), baseline, kill switch, staging copy, rules, byte proof, probe, header parity, legal text
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`staging.${t}`, `staging-verify --local rehearsal on ${t} (S0-S10 against local emulators; S5 and the manual S11 are not part of a rehearsal)`, NODE, ['ops/staging-verify.mjs', '--train', t, '--local', '--stage', '--port', String(Number(PORT_BASE) + 6)], { kind: 'check' });
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
  add('red.a11y', 'legacy/dist: axe finds serious/critical violations and failing contrast, the layout chooser cannot be passed by keyboard (A11Y-01, A11Y-15, A11Y-28 assert the red state)', NODE, [A11Y, '--dist', L, '--expect-red', '--filter', 'A11Y-01|A11Y-15|A11Y-28'], { kind: 'red', inverted: true });
  add('red.copy', 'legacy/dist: every shipped copy row is still present (CP-01 asserts the red state)', NODE, [CPY, '--dist', L, '--expect-red', '--filter', 'CP-01'], { kind: 'red', inverted: true });
  add('red.pagescore', 'legacy/dist: page defect pack (every red-able PGC test RED)', NODE, [PGC, '--dist', L, '--expect-red'], { kind: 'red' });
  add('red.pagesmaps', 'legacy/dist: blocking Mapbox, PeerJS eager, corrupt og (PG-01, 02-*, 05*, 06, 08 RED; PG-02b is a guard for our own change and cannot be red)', NODE, [PGM, '--dist', L, '--expect-red', '--filter', 'PG-01|PG-02-|PG-05|PG-06|PG-08'], { kind: 'red' });
  add('red.desktop', 'legacy/dist: story/event card, attribution, repaint, NPS tour and A2 helper tests are RED (DF-02..09; DF-01 is a regression of a train that can pan and has no red state on legacy)', NODE, [DFX, '--dist', L, '--expect-red', '--filter', 'DF-0[2-9]'], { kind: 'red' });
  add('red.desktop.ctl', 'R1c without group A2: T0-DF-01..09 are RED (DF-X, the no-uncaught-exception guard of the shared session, has no red state and is not selected)', NODE, [DFX, '--dist', CTL('R1c-noA2'), '--expect-red', '--filter', 'DF-0[1-9]'], { kind: 'red' });
  add('red.mobilefix.ctl', 'R1c without the mobile + shell fixes (SHELL empty, C.json from before them): T0-MFIX-01..11 are RED on 375x812 + 812x375 and the desktop layouts', NODE, [MFX, '--dist', CTL('R1c-noMobile'), '--expect-red', '--vp', '375x812,812x375', '--filter', 'MFIX-0[1-9]|MFIX-1[01]', '--out', `tmp/${AGENT}/mfix-red.json`, '--shots', `tmp/${AGENT}/shots/mfix-red`], { kind: 'red' });
  add('red.perf', 'R0 has no PERF group: PF-01 and PF-02 (non-blocking stylesheets) are RED on it', NODE, [PERF, '--dist', D('R0'), '--expect-red', '--filter', 'PF-0[12]'], { kind: 'red' });
  add('red.perf.ctl', 'R1c without the Mapbox shader precompile: PF-07..09 are RED', NODE, [PERF, '--dist', CTL('R1c-noPrecompile'), '--expect-red', '--filter', 'PF-0[789]'], { kind: 'red' });
  add('red.perf.beh', 'R1c without the Mapbox shader precompile, behaviour only (compile statistics of a real boot): PF-07 is RED', NODE, [PERF, '--dist', CTL('R1c-noPrecompile'), '--expect-red', '--behavior-only', '--filter', 'PF-07'], { kind: 'red' });
  add('red.pagesfix', 'legacy/dist: the sub-page fixes (every red-able PGF test RED)', NODE, [PGF, '--dist', L, '--expect-red'], { kind: 'red' });
  add('red.walkguard', 'walkthrough guard mutants: deliberately broken copies of baseline/dist (and of R1c for the R1c-only features); the guard must fail on every one (exit 0 = every mutant turned it red)', NODE, ['tests/t0/walkthrough-guard.mutants.mjs', '--r1c', D('R1c')], { kind: 'check' });
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
// rows of an earlier (stopped) run, read from its console log: the lines the runner itself printed ("PASS  id  N/M (+K skipped)  S s  load a>b  tiles c/d  title";
// logs written before the load was recorded have no "load" part: their rows get load1Start and load1End null)
function importLog(file) {
  const rows = [], byId = new Map(S.map((x) => [x.id, x]));
  const re = /^(PASS|FAIL|RED-OK|NOT-RED)\s+(\S+)\s+(.*?)\s+([0-9.]+) s\s+(?:load ([0-9.]+|\?)>([0-9.]+|\?)\s+)?(?:tiles (\d+)\/\d+\s+)?(.*)$/;
  const num = (s) => (s === undefined || s === '?' ? null : Number(s));
  for (const line of fs.readFileSync(path.resolve(REPO, file), 'utf8').split(/\r?\n/)) {
    const m = re.exec(line);
    if (!m || !byId.has(m[2])) continue;
    const def = byId.get(m[2]), res = m[3].trim();
    const rec = { id: def.id, title: def.title, kind: def.kind, inverted: def.inverted, ok: m[1] === 'PASS' || m[1] === 'RED-OK', seconds: Number(m[4]), tiles: m[7] ? Number(m[7]) : null, passed: null, total: null, skipped: 0, failed: 0, exit: null, load1Start: num(m[5]), load1End: num(m[6]), recovered_from_log: path.basename(file) };
    const t = /^(\d+)\/(\d+)(?: \(\+(\d+) skipped\))?(?: (\d+) failed)?/.exec(res), e = /^exit (\S+)/.exec(res);
    if (t) Object.assign(rec, { passed: Number(t[1]), total: Number(t[2]), skipped: Number(t[3] || 0), failed: Number(t[4] || 0), exit: rec.ok ? 0 : 1 });
    else if (e) rec.exit = Number(e[1]);
    rows.push(rec);
  }
  return rows;
}
let base = [];
if (IMPORT_LOG) { base = importLog(IMPORT_LOG); console.log(`run_suites: imported ${base.length} row(s) from ${IMPORT_LOG}`); }
else if (MERGE && fs.existsSync(JSON_OUT)) base = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')).results || [];
function writeSummary(fresh, final) {
  let rows = fresh;
  if (MERGE) {
    const byId = new Map(base.map((r) => [r.id, r]));
    for (const r of fresh) byId.set(r.id, r);
    rows = S.map((s) => byId.get(s.id)).filter(Boolean);
  }
  const green = rows.filter((r) => r.kind !== 'red'), red = rows.filter((r) => r.kind === 'red');
  const summary = {
    finished: final ? 'see file mtime' : 'PARTIAL: the run was still going (or was stopped) when this was written', seconds: MERGE ? Math.round(rows.reduce((a, r) => a + (r.seconds || 0), 0)) : Math.round((Date.now() - tAll) / 1000), portBase: PORT_BASE,
    // of THIS invocation (merged rows of an earlier one keep their own load1Start/load1End): the machine, its 1-minute load average when the run started and when this file was written, and what the children's environment got
    machine: MACHINE, load1: { start: LOAD_START, end: load1() }, childEnv: CHILD_ENV,
    totals: { suites: rows.length, ok: rows.filter((r) => r.ok).length, notOk: rows.filter((r) => !r.ok).length,
      greenTests: green.reduce((a, r) => a + (r.kind === 'green' ? (r.passed || 0) : 0), 0), greenTestsTotal: green.reduce((a, r) => a + (r.kind === 'green' ? (r.total || 0) : 0), 0),
      redProofs: red.length, redProofsOk: red.filter((r) => r.ok).length, redTestsRedAsRequired: red.reduce((a, r) => a + (r.ok ? (r.failed || 0) + (r.inverted ? (r.passed || 0) : 0) : 0), 0) },
    results: rows };
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(summary, null, 1) + '\n');
  return summary;
}

const selected = S.filter((s) => !ONLY.length || ONLY.some((p) => s.id === p || s.id.startsWith(p)));
console.log(`run_suites: ${selected.length} suite(s), port base ${PORT_BASE}, agent ${AGENT}`);
const MACHINE = machineRecord(), LOAD_START = load1();
console.log(`run_suites: child environment ${describeChildEnv(CHILD_ENV)}; load average (1 min) ${LOAD_START ?? 'not available on this platform'}, ${MACHINE.cpus} CPUs`);
const tAll = Date.now();
for (const s of selected) {
  let rec = { id: s.id, title: s.title, kind: s.kind, inverted: s.inverted };
  const loadStart = load1();
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
  rec.load1Start = loadStart; rec.load1End = load1();
  results.push(rec);
  writeSummary(results, false);
  const ld = loadText(rec.load1Start, rec.load1End);
  console.log(`${s.kind === 'red' ? (rec.ok ? 'RED-OK ' : 'NOT-RED') : (rec.ok ? 'PASS   ' : 'FAIL   ')} ${s.id.padEnd(22)} ${rec.total !== null && rec.total !== undefined ? `${rec.passed}/${rec.total}${rec.skipped ? ` (+${rec.skipped} skipped)` : ''}${rec.failed ? ` ${rec.failed} failed` : ''}` : 'exit ' + rec.exit}`.padEnd(46) + ` ${String(rec.seconds).padStart(6)} s${ld ? `  load ${ld}` : ''}${rec.tiles ? `  tiles ${rec.tiles}/300` : ''}  ${s.title}`);
  for (const l of rec.failLines || []) console.log(`        ${l.slice(0, 220)}`);
}
const summary = writeSummary(results, true);
if (summary.load1.start !== null || summary.load1.end !== null) console.log(`\nrun_suites: load average (1 min) ${loadText(summary.load1.start, summary.load1.end)} from the start to the end of this run, ${MACHINE.cpus} CPUs`);
console.log(`\nrun_suites: ${summary.totals.ok}/${summary.totals.suites} suites OK; green tests ${summary.totals.greenTests}/${summary.totals.greenTestsTotal}; red-first proofs ${summary.totals.redProofsOk}/${summary.totals.redProofs} (${summary.totals.redTestsRedAsRequired} legacy tests red as required); ${summary.seconds}s -> ${path.relative(REPO, JSON_OUT).replace(/\\/g, '/')}`);
process.exit(summary.totals.notOk ? 1 : 0);
