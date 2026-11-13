#!/usr/bin/env node
// tools/t0/tests/runner_selftest.mjs - self-test of the test runners: tools/t0/run_suites.mjs and the acceptance runners of tools/accept (suite id static.runner).
// No browser and no network.  It proves two things on real runs of the real runners:
//
//  A. The child environment (tools/t0/child_env.mjs).  Behind an HTTPS proxy (HTTPS_PROXY or https_proxy set) every child process gets NODE_USE_ENV_PROXY=1 and
//     NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt (the second only where that file exists), each only when it is not set already; with no proxy, and for a variable
//     that is set, NOTHING changes.  The proof is exact: the runner under test is started with NODE_OPTIONS=--require tools/t0/tests/env_probe.cjs, so every Node
//     process below it writes down its environment (names, a hash of every value), and the environment of each child is compared with the runner's own, variable
//     by variable.  Every scenario is built here (the proxy variables of the calling shell are removed first and a dummy proxy address is used that nothing connects
//     to), so the result does not depend on whether the calling shell has HTTPS_PROXY: the self-test passes with it set and with it unset.
//     One variable is extended, not added: where the rule turns NODE_USE_ENV_PROXY on it also appends --disable-warning=UNDICI-EHPA to NODE_OPTIONS (Node 22 prints a
//     two-line warning on stderr in every process that has NODE_USE_ENV_PROXY=1; on 2026-11-13 that broke case 16 of tools/t0/tests/baseline_selftest.py, which parses
//     the last line of a node child's merged output).  RUN-15 proves that a child behind the runners prints nothing extra and that the flag is what silences it.
//  B. The load.  Every row of a run_suites summary has load1Start and load1End (the machine's 1-minute load average; null on Windows), the console line shows them,
//     --merge keeps them and --import-log reads them back; a pass of tools/accept/run_pass.mjs records them for every check, every command and every suite.
//     "Every command" is proven on real passes, not on a sample of one check: RUN-22 (checks 6 and 8: the suite and step commands of check 6, the in-process audit of
//     check 8, on a directory candidate) and RUN-23 (checks 1 and 8 on a zip candidate: the re-pack command of check 1, which runs the real packer) assert, with one
//     helper, that EVERY command record of EVERY check of the pass JSON has load1Start and load1End; RUN-24 reads the source of every check and fails when a
//     `commands.push(` record carries no load, so a path no test executes (check 6 with --full) cannot go without it either.
//
//   node tools/t0/tests/runner_selftest.mjs                 everything except the online test
//   node tools/t0/tests/runner_selftest.mjs --online        also RUN-25: a child started through the acceptance harness fetches the pinned Mapbox GL stylesheet
//                                                           from api.mapbox.com with Node's own fetch() (one request), with a negative control behind a proxy
//   node tools/t0/tests/runner_selftest.mjs --filter 'RUN-0[1-3]'   subset by test id        --keep   keep the scratch directory
//
// Scratch: tmp/<T0_AGENT or runner-selftest>/runner-selftest-<pid>-<random>/ (removed at the end).  Suites that the nested runners start are chosen so that no
// browser starts: a dist directory that does not exist makes them exit at once (their result is not the subject here, their environment is).
// Not covered: Windows (the environment and NODE_OPTIONS quoting code paths for it are written but were never run there), tools/accept/run_eight.mjs end to end
// (it writes the acceptance log; it starts its passes through the same runCmdAsync that RUN-20 proves, and RUN-21 checks that from its source).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROXY_CA_BUNDLE, PROXY_VARS, QUIET_FLAG, honoursEnvProxy, proxyAdditions, childEnv, childEnvRecord, describeChildEnv, httpsProxySet, load1, loadText } from '../child_env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const FILTER = opt('filter', null), KEEP = !!opt('keep', false), ONLINE = !!opt('online', false);
const WIN = process.platform === 'win32';
const RUNNER = path.join(REPO, 'tools', 't0', 'run_suites.mjs');
const PROBE = path.join(HERE, 'env_probe.cjs');
const ACCEPT = path.join(REPO, 'tools', 'accept');
const AGENT = process.env.T0_AGENT || 'runner-selftest';
const SCRATCH = path.join(REPO, 'tmp', AGENT, `runner-selftest-${process.pid}-${crypto.randomBytes(3).toString('hex')}`);
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const NESTED_AGENT = `${rel(SCRATCH).replace(/^tmp\//, '')}/agent`;     // scratch of whatever the nested runners start (T0_AGENT is a path below tmp/)
const NODIST = rel(path.join(SCRATCH, 'no-such-dist'));                 // a dist that does not exist: the suites started on it exit before any browser
const DUMMY_PROXY = 'http://127.0.0.1:9';                               // nothing in this self-test connects to it
const BUNDLE_HERE = fs.existsSync(PROXY_CA_BUNDLE);
const PY = process.env.PYTHON || 'python';
fs.mkdirSync(SCRATCH, { recursive: true });

class Skip extends Error {}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const assertEq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'not equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };
const tests = [];
const test = (id, title, fn) => tests.push({ id, title, fn });

// ------------------------------------------------------------------ scenarios: the environment a runner under test is started with
const SCRUB = [...PROXY_VARS, 'HTTPS_PROXY', 'NODE_NO_WARNINGS', 'T0_R1_DIST', 'T0_PORT_BASE', 'PYTHONIOENCODING', 'T0_ENV_PROBE_OUT', 'T0_PROBE_MARK'];
let seq = 0;
/** NODE_OPTIONS of the calling shell without a flag that would silence the warning by itself: the scenarios must start from a shell that does not have one */
const loudNodeOptions = (s) => s.replace(/(?:^|\s)(?:--no-warnings|--disable-warning(?:=|\s+)UNDICI-EHPA)(?=\s|$)/g, ' ').trim();
/** this process's environment without the proxy variables (any spelling) and without what the runners set themselves, plus `set`, plus the probe */
function scenarioEnv(set, probeOut) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!SCRUB.some((n) => n.toUpperCase() === k.toUpperCase())) env[k] = v;
  if (env.NODE_OPTIONS !== undefined) { env.NODE_OPTIONS = loudNodeOptions(env.NODE_OPTIONS); if (!env.NODE_OPTIONS) delete env.NODE_OPTIONS; }
  Object.assign(env, set, { T0_AGENT: NESTED_AGENT });
  if (probeOut) {
    env.T0_ENV_PROBE_OUT = probeOut;
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ` : ''}--require "${PROBE.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return env;
}
const readProbe = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const scriptIs = (p, tail) => !!p.script && p.script.split(path.sep).join('/').endsWith(tail);

/** start tools/t0/run_suites.mjs with a scenario environment; returns its output, its summary and what every Node process below it recorded */
function runRunner(args, set = {}) {
  const n = ++seq, probeOut = path.join(SCRATCH, `probe-${n}.jsonl`), jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : path.join(SCRATCH, `summary-${n}.json`);
  const env = scenarioEnv(set, probeOut);
  const r = spawnSync(process.execPath, [RUNNER, '--port-base', '18480', ...args, ...(args.includes('--json') ? [] : ['--json', jsonOut])], { cwd: REPO, env, encoding: 'utf8', timeout: 600000, windowsHide: true });
  const probe = readProbe(probeOut);
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', probe, runner: probe.find((p) => scriptIs(p, 'tools/t0/run_suites.mjs')), summary: fs.existsSync(jsonOut) ? JSON.parse(fs.readFileSync(jsonOut, 'utf8')) : null, jsonOut };
}
/** names that differ between two recorded environments */
function envDiff(parent, child) {
  const a = parent.hashes, b = child.hashes;
  return { added: Object.keys(b).filter((k) => !(k in a)).sort(), removed: Object.keys(a).filter((k) => !(k in b)).sort(), changed: Object.keys(b).filter((k) => k in a && a[k] !== b[k]).sort() };
}
/** what the rule must add for a scenario (the CA bundle only on a machine that has it) */
const expectAdded = ({ proxy, hasUse, hasCa }) => (proxy ? [...(hasUse ? [] : ['NODE_USE_ENV_PROXY']), ...(hasCa || !BUNDLE_HERE ? [] : ['NODE_EXTRA_CA_CERTS'])] : []);
/** whether the rule must also extend NODE_OPTIONS by QUIET_FLAG: it turned NODE_USE_ENV_PROXY on, on a Node that reads it (every scenario has a NODE_OPTIONS: the probe) */
const NODE_HONOURS = honoursEnvProxy(process.version);
const expectQuiet = ({ proxy, hasUse }) => !!proxy && !hasUse && NODE_HONOURS;
/** the NODE_OPTIONS a child must have, given what its parent recorded */
const childNodeOptions = (parentShow, cfg) => (expectQuiet(cfg) ? `${parentShow.NODE_OPTIONS} ${QUIET_FLAG}` : parentShow.NODE_OPTIONS);
/** a child of run_suites must have the runner's environment, the three variables the runner always set, exactly the variables `cfg` makes the rule add, and NODE_OPTIONS extended or not */
function checkRunnerChild(run, child, cfg, values, label) {
  const added = expectAdded(cfg), quiet = expectQuiet(cfg);
  assert(run.runner, `${label}: the runner process was not recorded by the probe`);
  const d = envDiff(run.runner, child);
  assertEq(d.removed, [], `${label}: variables missing in the child`);
  assertEq(d.changed, quiet ? ['NODE_OPTIONS'] : [], `${label}: variables whose value changed in the child`);
  assertEq(d.added, ['PYTHONIOENCODING', 'T0_PORT_BASE', ...added].sort(), `${label}: variables added for the child`);
  assertEq([child.show.T0_PORT_BASE, child.show.T0_AGENT, child.show.PYTHONIOENCODING], ['18480', NESTED_AGENT, 'utf-8'], `${label}: the runner's own three variables`);
  assertEq([child.show.NODE_USE_ENV_PROXY, child.show.NODE_EXTRA_CA_CERTS], values, `${label}: NODE_USE_ENV_PROXY, NODE_EXTRA_CA_CERTS in the child`);
  assertEq(child.show.NODE_OPTIONS, childNodeOptions(run.runner.show, cfg), `${label}: NODE_OPTIONS in the child (the runner's own${quiet ? `, then ${QUIET_FLAG}` : ', unchanged'})`);
}
const LEGAL = ['--r1-dist', NODIST, '--only', 'static.legal'];      // one or two Node children (ops/legal-drafts/verify-facts.mjs): no browser, no network, under a second
const legalChildren = (run) => run.probe.filter((p) => scriptIs(p, 'ops/legal-drafts/verify-facts.mjs'));
function scenario(label, set, cfg, values, t) {
  const run = runRunner(LEGAL, set);
  const kids = legalChildren(run);
  assert(kids.length >= 1, `${label}: no child process recorded (runner exit ${run.status}): ${run.stderr.slice(-300)}`);
  const added = expectAdded(cfg), extended = expectQuiet(cfg) ? ['NODE_OPTIONS'] : [];
  for (const k of kids) checkRunnerChild(run, k, cfg, values, label);
  assert(run.summary && run.summary.childEnv, `${label}: the summary has no childEnv`);
  assertEq(run.summary.childEnv, { httpsProxy: !!cfg.proxy, added, extended }, `${label}: childEnv in the summary`);
  assert(!JSON.stringify(run.summary).includes(DUMMY_PROXY) && !run.stdout.includes(DUMMY_PROXY), `${label}: the proxy address must not appear in the summary or on the console`);
  t.note(label, { children: kids.length, added, extended, child: values });
  return run;
}
const CA_DEFAULT = BUNDLE_HERE ? PROXY_CA_BUNDLE : null;

// ------------------------------------------------------------------ A0. the rule itself (pure)
test('RUN-01', 'child_env: the rule as a table (no proxy -> nothing; HTTPS_PROXY or https_proxy -> NODE_USE_ENV_PROXY=1, the CA bundle, and with the first the quiet flag appended to NODE_OPTIONS, each only if unset; an empty proxy is no proxy; HTTP_PROXY alone is no reason)', (t) => {
  const V = 'v22.23.4', yes = { exists: () => true, nodeVersion: V }, no = { exists: () => false, nodeVersion: V };
  assertEq(PROXY_CA_BUNDLE, '/root/.ccr/ca-bundle.crt', 'the CA bundle path');
  assertEq(QUIET_FLAG, '--disable-warning=UNDICI-EHPA', 'the flag names the one warning code and nothing else');
  const quiet = { NODE_OPTIONS: QUIET_FLAG };
  const both = { NODE_USE_ENV_PROXY: '1', NODE_EXTRA_CA_CERTS: PROXY_CA_BUNDLE, ...quiet };
  const rows = [
    [{}, {}], [{ PATH: '/bin' }, {}], [{ HTTPS_PROXY: '' }, {}], [{ HTTP_PROXY: 'http://p:1' }, {}], [{ ALL_PROXY: 'http://p:1', NO_PROXY: 'localhost' }, {}],
    [{ HTTPS_PROXY: 'http://p:1' }, both], [{ https_proxy: 'http://p:1' }, both], [{ HTTPS_PROXY: '', https_proxy: 'http://p:1' }, both],
    [{ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '0' }, { NODE_EXTRA_CA_CERTS: PROXY_CA_BUNDLE }],
    [{ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '' }, { NODE_EXTRA_CA_CERTS: PROXY_CA_BUNDLE }],
    [{ HTTPS_PROXY: 'http://p:1', NODE_EXTRA_CA_CERTS: '/other.pem' }, { NODE_USE_ENV_PROXY: '1', ...quiet }],
    [{ HTTPS_PROXY: 'http://p:1', NODE_EXTRA_CA_CERTS: '' }, { NODE_USE_ENV_PROXY: '1', ...quiet }],
    [{ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '1', NODE_EXTRA_CA_CERTS: '/other.pem' }, {}],
    [{ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: undefined }, both],
  ];
  for (const [env, want] of rows) assertEq(proxyAdditions(env, yes), want, `proxyAdditions(${JSON.stringify(env)})`);
  assertEq(proxyAdditions({ HTTPS_PROXY: 'http://p:1' }, no), { NODE_USE_ENV_PROXY: '1', ...quiet }, 'no CA bundle file on the machine: NODE_EXTRA_CA_CERTS is not invented');
  assertEq(proxyAdditions({ HTTPS_PROXY: 'http://p:1' }, { caBundle: '/x/ca.pem', exists: (f) => f === '/x/ca.pem', nodeVersion: V }), { NODE_USE_ENV_PROXY: '1', NODE_EXTRA_CA_CERTS: '/x/ca.pem', ...quiet }, 'the bundle that is tested for is the one that is set');
  assertEq('NODE_EXTRA_CA_CERTS' in proxyAdditions({ HTTPS_PROXY: 'http://p:1' }), BUNDLE_HERE, 'default: the real file decides');
  assertEq([httpsProxySet({}), httpsProxySet({ HTTPS_PROXY: '' }), httpsProxySet({ HTTPS_PROXY: 'x' }), httpsProxySet({ https_proxy: 'x' })], [false, false, true, true], 'httpsProxySet');
  // NODE_OPTIONS: appended and never replaced; left alone when the warning is silenced already or when the user set NODE_USE_ENV_PROXY; the Node version decides
  const P = { HTTPS_PROXY: 'http://p:1' }, CA = { NODE_EXTRA_CA_CERTS: '/other.pem' }, on = { NODE_USE_ENV_PROXY: '1' };
  const optRows = [
    [{ ...P, ...CA, NODE_OPTIONS: '--use-openssl-ca' }, { ...on, NODE_OPTIONS: `--use-openssl-ca ${QUIET_FLAG}` }, 'an existing value stays in front'],
    [{ ...P, ...CA, NODE_OPTIONS: '  --max-old-space-size=512  ' }, { ...on, NODE_OPTIONS: `--max-old-space-size=512 ${QUIET_FLAG}` }, 'blanks around the existing value are trimmed'],
    [{ ...P, ...CA, NODE_OPTIONS: '' }, { ...on, ...quiet }, 'an empty NODE_OPTIONS is extended'],
    [{ ...P, ...CA, NODE_OPTIONS: '--disable-warning=ExperimentalWarning' }, { ...on, NODE_OPTIONS: `--disable-warning=ExperimentalWarning ${QUIET_FLAG}` }, 'silencing another warning code is no reason to skip this one'],
    [{ ...P, ...CA, NODE_OPTIONS: QUIET_FLAG }, on, 'the flag is there already'],
    [{ ...P, ...CA, NODE_OPTIONS: '--use-openssl-ca --disable-warning UNDICI-EHPA' }, on, 'the flag in its two-word spelling'],
    [{ ...P, ...CA, NODE_OPTIONS: '--no-warnings' }, on, '--no-warnings silences it already'],
    [{ ...P, ...CA, NODE_NO_WARNINGS: '1' }, on, 'NODE_NO_WARNINGS=1 silences it already'],
    [{ ...P, ...CA, NODE_NO_WARNINGS: '0' }, { ...on, ...quiet }, 'NODE_NO_WARNINGS=0 silences nothing'],
    [{ ...P, ...CA, NODE_USE_ENV_PROXY: '0', NODE_OPTIONS: '--use-openssl-ca' }, {}, 'a NODE_USE_ENV_PROXY the user set is their choice: NODE_OPTIONS stays as it is'],
    [{ ...P, ...CA, NODE_USE_ENV_PROXY: '1', NODE_OPTIONS: '--use-openssl-ca' }, {}, 'the same when the user set it to 1'],
  ];
  for (const [env, want, why] of optRows) assertEq(proxyAdditions(env, yes), want, `${why}: proxyAdditions(${JSON.stringify(env)})`);
  const versions = [['v20.19.0', false], ['v21.7.3', false], ['v22.0.0', false], ['v22.20.9', false], ['v22.21.0', true], ['v22.23.4', true], ['v23.11.1', false], ['v24.0.0', true], ['v24.12.0', true], ['v25.2.1', true], ['22.21.1', true], ['nonsense', false]];
  for (const [v, want] of versions) {
    assertEq(honoursEnvProxy(v), want, `honoursEnvProxy(${v})`);
    assertEq(proxyAdditions({ ...P, ...CA }, { ...yes, nodeVersion: v }), want ? { ...on, ...quiet } : on, `Node ${v}: NODE_USE_ENV_PROXY is set whatever the version (harmless where it is ignored), the flag only where Node reads it`);
  }
  t.note('rows', rows.length + optRows.length + versions.length + 4); t.note('CA bundle on this machine', BUNDLE_HERE); t.note('this Node reads NODE_USE_ENV_PROXY', NODE_HONOURS);
});
test('RUN-02', 'child_env: with nothing to add the SAME object is passed on; the input is never modified; a summary record never holds the proxy address', () => {
  const plain = Object.freeze({ A: '1', NODE_EXTRA_CA_CERTS: '/keep.pem' });
  assert(childEnv(plain) === plain, 'no proxy: childEnv must return the object it was given');
  const set = Object.freeze({ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '0', NODE_EXTRA_CA_CERTS: '/keep.pem' });
  assert(childEnv(set) === set, 'proxy, both variables set: childEnv must return the object it was given');
  const V = { exists: () => true, nodeVersion: 'v22.23.4' };
  const need = Object.freeze({ HTTPS_PROXY: 'http://user:secret@p:1', B: '2' });
  const out = childEnv(need, V);
  assert(out !== need, 'a copy when something is added');
  assertEq(out, { HTTPS_PROXY: 'http://user:secret@p:1', B: '2', NODE_USE_ENV_PROXY: '1', NODE_EXTRA_CA_CERTS: PROXY_CA_BUNDLE, NODE_OPTIONS: QUIET_FLAG }, 'the copy');
  assertEq(need, { HTTPS_PROXY: 'http://user:secret@p:1', B: '2' }, 'the input is unchanged');
  const rec = childEnvRecord(need, V);
  assertEq(rec, { httpsProxy: true, added: ['NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS', 'NODE_OPTIONS'], extended: [] }, 'record, NODE_OPTIONS was not set');
  assert(!JSON.stringify(rec).includes('secret'), 'the record must not contain the proxy address');
  const withOpts = Object.freeze({ ...need, NODE_OPTIONS: '--use-openssl-ca' });
  assertEq(childEnv(withOpts, V).NODE_OPTIONS, `--use-openssl-ca ${QUIET_FLAG}`, 'an existing NODE_OPTIONS is extended in the copy');
  assertEq(withOpts.NODE_OPTIONS, '--use-openssl-ca', 'and not in the input');
  const rec2 = childEnvRecord(withOpts, V);
  assertEq(rec2, { httpsProxy: true, added: ['NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS'], extended: ['NODE_OPTIONS'] }, 'record, NODE_OPTIONS was set: extended, not added');
  assert(!JSON.stringify(rec2).includes('openssl'), 'the record holds names, never values');
  assertEq(childEnvRecord({}), { httpsProxy: false, added: [], extended: [] }, 'record without a proxy');
  assertEq([describeChildEnv({ httpsProxy: false, added: [], extended: [] }), describeChildEnv({ httpsProxy: true, added: [], extended: [] }), describeChildEnv(rec2), describeChildEnv(rec)],
    ['unchanged (no HTTPS proxy set)', 'unchanged (an HTTPS proxy is set, the Node proxy variables are set already)',
      '+ NODE_USE_ENV_PROXY, NODE_EXTRA_CA_CERTS, NODE_OPTIONS (extended) (an HTTPS proxy is set)', '+ NODE_USE_ENV_PROXY, NODE_EXTRA_CA_CERTS, NODE_OPTIONS (an HTTPS proxy is set)'], 'the console wording');
});
test('RUN-03', 'child_env: load1() is the 1-minute load average with two decimals (null on Windows, never a made-up zero); loadText()', (t) => {
  const v = load1();
  if (WIN) assertEq(v, null, 'Windows has no load average');
  else {
    assert(typeof v === 'number' && Number.isFinite(v) && v >= 0, `load1() = ${v}`);
    assert(Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, `two decimals: ${v}`);
    const os1 = os.loadavg()[0];
    assert(Math.abs(v - os1) < 5, `load1() ${v} is not the machine's load average ${os1}`);
    if (fs.existsSync('/proc/loadavg')) { const p = Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]); assert(Math.abs(v - p) < 5, `load1() ${v} against /proc/loadavg ${p}`); t.note('/proc/loadavg', p); }
  }
  assertEq([loadText(1.25, 3.4), loadText(null, null), loadText(null, 2), loadText(0, 0)], ['1.25>3.4', '', '?>2', '0>0'], 'loadText');
  t.note('load1', v);
});

// ------------------------------------------------------------------ A1. run_suites.mjs, real runs
test('RUN-04', 'run_suites, NO proxy: the child has exactly the runner\'s environment plus T0_PORT_BASE, T0_AGENT, PYTHONIOENCODING (as always); neither Node proxy variable; the summary says nothing was added', (t) => {
  const run = scenario('no proxy', {}, { proxy: false }, [null, null], t);
  assert(/child environment unchanged \(no HTTPS proxy set\)/.test(run.stdout), 'console line about the child environment');
});
test('RUN-05', 'run_suites, HTTPS_PROXY set, both variables unset: the child gets NODE_USE_ENV_PROXY=1 and NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt (where the file exists), nothing else differs', (t) => {
  const run = scenario('proxy, both unset', { HTTPS_PROXY: DUMMY_PROXY }, { proxy: true }, ['1', CA_DEFAULT], t);
  assert(/child environment \+ NODE_USE_ENV_PROXY/.test(run.stdout), 'console line about the child environment');
  if (!BUNDLE_HERE) t.note('CA bundle', `${PROXY_CA_BUNDLE} does not exist on this machine: NODE_EXTRA_CA_CERTS was correctly left unset (the branch that sets it is proven by RUN-01 only)`);
});
test('RUN-06', 'run_suites, HTTPS_PROXY set, both variables already set (NODE_USE_ENV_PROXY=0, another CA file): the child keeps both values, nothing is added', (t) => {
  const ca = path.join(SCRATCH, 'other-ca.pem'); fs.writeFileSync(ca, '');
  scenario('proxy, both set', { HTTPS_PROXY: DUMMY_PROXY, NODE_USE_ENV_PROXY: '0', NODE_EXTRA_CA_CERTS: ca }, { proxy: true, hasUse: true, hasCa: true }, ['0', ca], t);
  scenario('proxy, both set to the empty string', { HTTPS_PROXY: DUMMY_PROXY, NODE_USE_ENV_PROXY: '', NODE_EXTRA_CA_CERTS: '' }, { proxy: true, hasUse: true, hasCa: true }, ['', ''], t);
});
test('RUN-07', 'run_suites, HTTPS_PROXY set, only one variable set: exactly the other one is added (the cloud machine sets NODE_EXTRA_CA_CERTS itself)', (t) => {
  const ca = path.join(SCRATCH, 'other-ca.pem'); fs.writeFileSync(ca, '');
  scenario('proxy, CA set', { HTTPS_PROXY: DUMMY_PROXY, NODE_EXTRA_CA_CERTS: ca }, { proxy: true, hasCa: true }, ['1', ca], t);
  scenario('proxy, NODE_USE_ENV_PROXY set', { HTTPS_PROXY: DUMMY_PROXY, NODE_USE_ENV_PROXY: '0' }, { proxy: true, hasUse: true }, ['0', CA_DEFAULT], t);
});
test('RUN-08', 'run_suites: the lower-case https_proxy counts as a proxy; an empty HTTPS_PROXY and HTTP_PROXY alone do not', (t) => {
  if (WIN) throw new Skip('environment names are case-insensitive on Windows: https_proxy and HTTPS_PROXY are one variable there');
  scenario('https_proxy (lower case)', { https_proxy: DUMMY_PROXY }, { proxy: true }, ['1', CA_DEFAULT], t);
  scenario('HTTPS_PROXY empty', { HTTPS_PROXY: '' }, { proxy: false }, [null, null], t);
  const env = {}; for (const k of Object.keys(process.env)) if (/^http_proxy$/i.test(k)) env[k] = undefined;
  scenario('HTTP_PROXY only', { ...env, HTTP_PROXY: DUMMY_PROXY }, { proxy: false }, [null, null], t);
});
test('RUN-09', 'run_suites, a suite that runs as four parallel processes (mobile.R1c): every one of the four gets the same environment as a single suite, with and without a proxy', (t) => {
  for (const [label, set, cfg, values] of [['parallel, proxy', { HTTPS_PROXY: DUMMY_PROXY }, { proxy: true }, ['1', CA_DEFAULT]], ['parallel, no proxy', {}, { proxy: false }, [null, null]]]) {
    const run = runRunner(['--r1-dist', NODIST, '--only', 'mobile.R1c'], set);
    const kids = run.probe.filter((p) => scriptIs(p, 'tests/t0/mobile-matrix.spec.mjs'));
    assertEq(kids.length, 4, `${label}: slice processes recorded`);
    assertEq(kids.map((k) => k.args[k.args.indexOf('--slot') + 1]).sort(), ['0', '1', '2', '3'], `${label}: the four slices`);
    for (const k of kids) checkRunnerChild(run, k, cfg, values, label);
    const row = run.summary.results.find((r) => r.id === 'mobile.R1c');
    assert(row && row.parts.length === 4 && row.ok === false, `${label}: the row must be not-ok (the dist does not exist), never a pass`);
    t.note(label, { processes: kids.length, exit: row.parts.map((p) => p.exit) });
  }
});
test('RUN-10', 'run_suites, a Python suite (static.hygiene): the Node processes that Python starts inherit the variables', (t) => {
  if (spawnSync(PY, ['--version'], { encoding: 'utf8' }).status !== 0) throw new Skip(`${PY} is not on the PATH: the Python-to-Node path was NOT run`);
  const run = runRunner(['--only', 'static.hygiene'], { HTTPS_PROXY: DUMMY_PROXY });
  const kids = run.probe.filter((p) => p.execArgv.includes('--check'));
  assert(kids.length >= 20, `Node processes started by tools/t0/hygiene.py: ${kids.length} (runner exit ${run.status}; ${run.stdout.slice(-300)})`);
  const quietOk = (k) => (NODE_HONOURS ? String(k.show.NODE_OPTIONS).endsWith(` ${QUIET_FLAG}`) : true);
  const bad = kids.filter((k) => k.show.NODE_USE_ENV_PROXY !== '1' || k.show.NODE_EXTRA_CA_CERTS !== CA_DEFAULT || k.show.T0_AGENT !== NESTED_AGENT || k.show.PYTHONIOENCODING !== 'utf-8' || !quietOk(k));
  assertEq(bad.length, 0, `Node processes below Python without the expected variables (first: ${JSON.stringify(bad[0] && bad[0].show)})`);
  const row = run.summary.results.find((r) => r.id === 'static.hygiene');
  t.note('node processes below python', kids.length); t.note('row', { ok: row.ok, exit: row.exit, seconds: row.seconds });
});

// ------------------------------------------------------------------ B1. run_suites.mjs: the load in the summary, on the console, in --merge and --import-log
const LINE = /^(PASS|FAIL|RED-OK|NOT-RED)\s+(\S+)\s+(.*?)\s+([0-9.]+) s\s+(?:load ([0-9.]+|\?)>([0-9.]+|\?)\s+)?(?:tiles (\d+)\/\d+\s+)?(.*)$/;
const isLoad = (v) => (WIN ? v === null : typeof v === 'number' && Number.isFinite(v) && v >= 0);
test('RUN-11', 'summary: every row (a process suite and the in-process static.gates) has load1Start and load1End, the summary has machine, load1 {start,end} and childEnv, and the console line shows the same numbers', (t) => {
  const before = load1();
  const run = runRunner(['--r1-dist', NODIST, '--only', 'static.gates,static.legal'], {});
  const after = load1(), s = run.summary;
  assert(s && s.results.length >= 2, `rows: ${s && s.results.length}`);
  assertEq(s.machine, { platform: process.platform, cpus: os.cpus().length, node: process.version }, 'machine');
  assert(isLoad(s.load1.start) && isLoad(s.load1.end), `load1 of the run: ${JSON.stringify(s.load1)}`);
  const lines = new Map(run.stdout.split(/\r?\n/).map((l) => LINE.exec(l)).filter(Boolean).map((m) => [m[2], m]));
  for (const r of s.results) {
    assert('load1Start' in r && 'load1End' in r && isLoad(r.load1Start) && isLoad(r.load1End), `row ${r.id}: load1Start ${r.load1Start}, load1End ${r.load1End}`);
    const m = lines.get(r.id); assert(m, `no console line for ${r.id}`);
    if (WIN) assertEq([m[5], m[6]], [undefined, undefined], `console line of ${r.id} must not show a load on Windows`);
    else {
      assertEq([Number(m[5]), Number(m[6])], [r.load1Start, r.load1End], `console line of ${r.id}`);
      const lo = Math.min(before, after) - 5, hi = Math.max(before, after) + 5;
      assert(r.load1Start >= lo && r.load1Start <= hi && r.load1End >= lo && r.load1End <= hi, `row ${r.id}: ${r.load1Start}>${r.load1End} is not near the load measured here (${before}..${after})`);
    }
  }
  assert(s.results.some((r) => r.id === 'static.gates' && r.gates), 'the in-process gates row is among them');
  t.note('rows', s.results.map((r) => `${r.id} ${loadText(r.load1Start, r.load1End)}`)); t.note('run', s.load1); t.note('measured here', [before, after]);
});
test('RUN-12', '--import-log: rows of a stopped run come back with their load; lines of logs written before the load was recorded still parse (load null), tiles and counts as before', (t) => {
  const log = path.join(SCRATCH, 'old-run.log');
  fs.writeFileSync(log, [
    'run_suites: 79 suite(s), port base 8480, agent integrator',
    'PASS    static.overlap         exit 0            31.1 s  load 1.25>2.5  geometric overlap audit of the patch set',
    'FAIL    r0.R0                  11/13 (+1 skipped) 1 failed   49.5 s  load 3.01>4.2  tiles 104/300  R0 acceptance (X1/X2) on R0',
    '        FAIL  T0-R0-09     timing sanity (no Lighthouse)',
    'PASS    static.baselinelock    exit 0             0.1 s  baseline/dist matches tools/t0/baseline.lock.json (per-file sha256, no network)',
    'PASS    r0.R1a                 13/13             50.5 s  tiles 104/300  R0 acceptance (X1/X2) on R1a',
    'PASS    journeys.R1a           30/41 (+11 skipped)    233 s  load ?>7  tiles 153/300  desktop journeys J1-J8, inputs, group A on R1a', ''].join('\n'));
  const run = runRunner(['--import-log', log, '--merge', '--only', 'static.gates'], {});
  const by = new Map(run.summary.results.map((r) => [r.id, r]));
  const pick = (id) => { const r = by.get(id); return r && [r.ok, r.passed, r.total, r.skipped, r.failed, r.seconds, r.tiles, r.load1Start, r.load1End, r.recovered_from_log || null]; };
  assertEq(pick('static.overlap'), [true, null, null, 0, 0, 31.1, null, 1.25, 2.5, 'old-run.log'], 'static.overlap (new line format)');
  assertEq(pick('r0.R0'), [false, 11, 13, 1, 1, 49.5, 104, 3.01, 4.2, 'old-run.log'], 'r0.R0 (new line format with tiles)');
  assertEq(pick('static.baselinelock'), [true, null, null, 0, 0, 0.1, null, null, null, 'old-run.log'], 'static.baselinelock (line of an older log)');
  assertEq(pick('r0.R1a'), [true, 13, 13, 0, 0, 50.5, 104, null, null, 'old-run.log'], 'r0.R1a (line of an older log with tiles)');
  assertEq(pick('journeys.R1a'), [true, 30, 41, 11, 0, 233, 153, null, 7, 'old-run.log'], 'journeys.R1a (a load that was not available at the start)');
  const fresh = by.get('static.gates'); assert(fresh && !fresh.recovered_from_log && isLoad(fresh.load1Start), 'the suite that ran now has its own load');
  assertEq(run.summary.results.length, 6, 'rows in the merged summary');
});
test('RUN-13', '--merge: the rows of the earlier run keep their load1Start and load1End untouched, the rows of this run get their own', () => {
  const out = path.join(SCRATCH, 'merge.json');
  const a = runRunner(['--r1-dist', NODIST, '--only', 'static.gates', '--json', out], {});
  const first = a.summary.results.find((r) => r.id === 'static.gates');
  assert(first && isLoad(first.load1Start), 'first run');
  // make the earlier row recognisable: a load no machine has
  const j = JSON.parse(fs.readFileSync(out, 'utf8')); j.results[0].load1Start = 123.45; j.results[0].load1End = 234.56; fs.writeFileSync(out, JSON.stringify(j));
  const b = runRunner(['--r1-dist', NODIST, '--only', 'static.legal', '--merge', '--json', out], {});
  const kept = b.summary.results.find((r) => r.id === 'static.gates'), now = b.summary.results.find((r) => r.id === 'static.legal');
  assertEq([kept.load1Start, kept.load1End], [123.45, 234.56], 'the merged row');
  assert(now && isLoad(now.load1Start) && isLoad(now.load1End) && now.load1Start !== 123.45, 'the row of this run');
});
test('RUN-14', 'run_suites source: there is ONE place where a process is started and it uses the checked environment; the self-test row is in the table and no nested run selects it', () => {
  const src = fs.readFileSync(RUNNER, 'utf8');
  const starts = src.match(/(?<![.\w$])(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\(/g) || [];      // a call, not a method such as re.exec(
  assertEq(starts, ['spawn('], 'process starts in run_suites.mjs');
  assert(src.includes('const p = spawn(cmd, args, { cwd: REPO, env: ENV, windowsHide: true });'), 'the one spawn passes ENV');
  assert(src.includes('const ENV = childEnv(ENV_BASE);') && src.includes("const ENV_BASE = { ...process.env, T0_PORT_BASE: PORT_BASE, T0_AGENT: AGENT, PYTHONIOENCODING: 'utf-8' };"), 'ENV is childEnv(the environment the runner always passed)');
  const list = spawnSync(process.execPath, [RUNNER, '--list'], { cwd: REPO, encoding: 'utf8' });
  assert(/^static\.runner\s+green\s/m.test(list.stdout), 'static.runner is a row of the table');
  const me = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const only = [...me.matchAll(/'--only', '([^']+)'/g)].flatMap((m) => m[1].split(','));
  assert(only.length >= 5 && only.every((p) => !'static.runner'.startsWith(p)), `a nested run would select static.runner: ${only.join(' ')}`);
});

test('RUN-15', 'quiet: behind a proxy a Node child of the runners prints nothing extra on stderr (Node 22 writes two warning lines in every process that has NODE_USE_ENV_PROXY=1: case 16 of baseline_selftest broke on them); another warning code stays visible; controls: the same child with the variable set by hand prints the warning', (t) => {
  if (!NODE_HONOURS) throw new Skip(`Node ${process.version} does not read NODE_USE_ENV_PROXY: there is no warning to silence`);
  const child = path.join(SCRATCH, 'quiet-child.mjs'), driver = path.join(SCRATCH, 'quiet-driver.mjs');
  fs.writeFileSync(child, "process.emitWarning('visible on purpose', 'T0SelfTestWarning');\nconsole.log('out');\n");
  fs.writeFileSync(driver, `import { runCmd, runCmdAsync } from ${JSON.stringify(pathToFileURL(path.join(ACCEPT, 'lib', 'util.mjs')).href)};
const child = process.argv[2], pick = (r) => ({ exit: r.exit, status: r.exit, stdout: r.stdout, stderr: r.stderr });
const a = pick(runCmd(process.execPath, [child])), b = pick(await runCmdAsync(process.execPath, [child]));
const c = pick(runCmd(process.execPath, [child], { env: { NODE_USE_ENV_PROXY: '1' } }));
console.log(JSON.stringify({ a, b, c }));
`);
  const base = scenarioEnv({ HTTPS_PROXY: DUMMY_PROXY }, null);            // the calling shell, a proxy, no probe
  const spawnChild = (env) => spawnSync(process.execPath, [child], { cwd: REPO, env, encoding: 'utf8', timeout: 60000, windowsHide: true });
  const control = spawnChild({ ...base, NODE_USE_ENV_PROXY: '1' });        // set by hand: no flag
  if (!/UNDICI-EHPA/.test(control.stderr)) throw new Skip(`Node ${process.version} prints no UNDICI-EHPA warning with NODE_USE_ENV_PROXY=1 (stderr: ${JSON.stringify(control.stderr.slice(0, 200))}): nothing to silence, the flag cannot be tested here`);
  const loud = (r) => /UNDICI-EHPA|EnvHttpProxyAgent/.test(r.stderr);
  const clean = (label, r) => {
    assertEq(r.status, 0, `${label}: exit`);
    assertEq(r.stdout.trim(), 'out', `${label}: stdout`);
    assert(/T0SelfTestWarning/.test(r.stderr), `${label}: another warning must stay visible, stderr ${JSON.stringify(r.stderr)}`);
    assert(!loud(r), `${label}: the proxy warning is on stderr: ${JSON.stringify(r.stderr)}`);
  };
  clean('through run_suites\' childEnv()', spawnChild(childEnv(base)));
  const d = spawnSync(process.execPath, [driver, child], { cwd: REPO, env: base, encoding: 'utf8', timeout: 120000, windowsHide: true });
  let out = null; try { out = JSON.parse((d.stdout || '').trim().split('\n').pop()); } catch { /* reported below */ }
  assert(d.status === 0 && out, `driver exit ${d.status}: ${(d.stderr || '').slice(-300)}`);
  clean('tools/accept runCmd', out.a);
  clean('tools/accept runCmdAsync', out.b);
  assert(loud(out.c) && out.c.stdout.trim() === 'out', `a caller that sets NODE_USE_ENV_PROXY itself keeps its choice, warning included: ${JSON.stringify(out.c.stderr)}`);
  assert(loud(control), 'control: the warning is there without the flag');
  t.note('control (variable set by hand, no flag): stderr', control.stderr.trim().split('\n').map((l) => l.replace(/\(node:\d+\) /, '')));
  t.note('through the runners: stderr', out.a.stderr.trim().split('\n').map((l) => l.replace(/\(node:\d+\) /, '')));
});

// ------------------------------------------------------------------ A2 + B2. the acceptance runners (tools/accept)
const UTIL = pathToFileURL(path.join(ACCEPT, 'lib', 'util.mjs')).href;
function runDriver(set) {
  const n = ++seq, probeOut = path.join(SCRATCH, `probe-${n}.jsonl`);
  const child = path.join(SCRATCH, 'accept-child.mjs'), driver = path.join(SCRATCH, 'accept-driver.mjs');
  fs.writeFileSync(child, "console.log('child ' + process.argv[2]);\n");
  fs.writeFileSync(driver, `import { runCmd, runCmdAsync } from ${JSON.stringify(UTIL)};
const child = process.argv[2], pick = (r) => ({ exit: r.exit, out: r.stdout.trim(), load1Start: r.load1Start, load1End: r.load1End, has: 'load1Start' in r && 'load1End' in r });
const a = runCmd(process.execPath, [child, 'sync']);
const b = await runCmdAsync(process.execPath, [child, 'async']);
const c = runCmd(process.execPath, [child, 'caller'], { env: { NODE_USE_ENV_PROXY: '0', T0_PROBE_MARK: 'caller' } });
const d = await runCmdAsync(process.execPath, [child, 'missing-binary-follows']);
const e = await runCmdAsync('no-such-binary-runner-selftest', []);
console.log(JSON.stringify({ a: pick(a), b: pick(b), c: pick(c), d: pick(d), e: { exit: e.exit, error: !!e.error, has: 'load1Start' in e && 'load1End' in e } }));
`);
  const r = spawnSync(process.execPath, [driver, child], { cwd: REPO, env: scenarioEnv(set, probeOut), encoding: 'utf8', timeout: 120000, windowsHide: true });
  const probe = readProbe(probeOut);
  let out = null; try { out = JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { /* reported below */ }
  return { status: r.status, stderr: r.stderr || '', out, parent: probe.find((p) => scriptIs(p, 'accept-driver.mjs')), kids: probe.filter((p) => scriptIs(p, 'accept-child.mjs')) };
}
test('RUN-20', 'tools/accept (runCmd and runCmdAsync, the start of every acceptance child): same rule, proven the same way; a value the caller passes is kept; every result has load1Start and load1End', (t) => {
  for (const [label, set, cfg, values] of [
    ['no proxy', {}, { proxy: false }, [null, null]],
    ['proxy, both unset', { HTTPS_PROXY: DUMMY_PROXY }, { proxy: true }, ['1', CA_DEFAULT]],
    ['proxy, both set', { HTTPS_PROXY: DUMMY_PROXY, NODE_USE_ENV_PROXY: '0', NODE_EXTRA_CA_CERTS: '' }, { proxy: true, hasUse: true, hasCa: true }, ['0', '']]]) {
    const run = runDriver(set);
    assert(run.status === 0 && run.out && run.parent, `${label}: driver exit ${run.status}: ${run.stderr.slice(-400)}`);
    assertEq(run.kids.map((k) => k.args[0]), ['sync', 'async', 'caller', 'missing-binary-follows'], `${label}: children recorded`);
    const added = expectAdded(cfg), quiet = expectQuiet(cfg);
    for (const k of run.kids.filter((x) => x.args[0] !== 'caller')) {
      const d = envDiff(run.parent, k);
      assertEq([d.removed, d.changed, d.added], [[], quiet ? ['NODE_OPTIONS'] : [], ['PYTHONIOENCODING', ...added].sort()], `${label}, ${k.args[0]}: difference between the harness process and its child`);
      assertEq([k.show.NODE_USE_ENV_PROXY, k.show.NODE_EXTRA_CA_CERTS, k.show.PYTHONIOENCODING], [...values, 'utf-8'], `${label}, ${k.args[0]}: values`);
      assertEq(k.show.NODE_OPTIONS, childNodeOptions(run.parent.show, cfg), `${label}, ${k.args[0]}: NODE_OPTIONS (the harness process's own${quiet ? `, then ${QUIET_FLAG}` : ', unchanged'})`);
    }
    const c = run.kids.find((x) => x.args[0] === 'caller');
    assertEq([c.show.NODE_USE_ENV_PROXY, c.show.T0_PROBE_MARK], ['0', 'caller'], `${label}: the caller's own env option wins and is never overwritten`);
    assertEq(c.show.NODE_OPTIONS, run.parent.show.NODE_OPTIONS, `${label}: with the caller's own NODE_USE_ENV_PROXY the rule leaves NODE_OPTIONS alone`);
    for (const k of ['a', 'b', 'c', 'd']) assert(run.out[k].exit === 0 && run.out[k].has && isLoad(run.out[k].load1Start) && isLoad(run.out[k].load1End), `${label}: result ${k} ${JSON.stringify(run.out[k])}`);
    assert(run.out.e.exit === null && run.out.e.error && run.out.e.has, `${label}: a command that cannot start still returns its load: ${JSON.stringify(run.out.e)}`);
    t.note(label, { added, child: values });
  }
});
test('RUN-21', 'tools/accept source: only lib/util.mjs starts processes (r1_config_hook.mjs hands its own environment on unchanged); run_eight starts each pass through runCmdAsync and stores its load', () => {
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(mjs|js|cjs)$/.test(e.name)) files.push(p); } };
  walk(ACCEPT);
  const users = files.filter((f) => /child_process/.test(fs.readFileSync(f, 'utf8'))).map((f) => rel(f)).sort();
  assertEq(users, ['tools/accept/lib/util.mjs', 'tools/accept/r1_config_hook.mjs'], 'files of tools/accept that use child_process');
  const util = fs.readFileSync(path.join(ACCEPT, 'lib', 'util.mjs'), 'utf8');
  assertEq((util.match(/env: childEnv\(\{ \.\.\.process\.env, PYTHONIOENCODING: 'utf-8', \.\.\.env \}\)/g) || []).length, 2, 'runCmd and runCmdAsync pass childEnv(...)');
  assertEq((util.match(/\bspawn(?:Sync)?\(cmd, args,/g) || []).length, 2, 'starts of a caller\'s command in util.mjs');
  assert(/spawnSync\('node', \[[^\]]*\], \{ encoding: 'utf8', env: process\.env \}\)/.test(fs.readFileSync(path.join(ACCEPT, 'r1_config_hook.mjs'), 'utf8')), 'r1_config_hook.mjs passes process.env on');
  const eight = fs.readFileSync(path.join(ACCEPT, 'run_eight.mjs'), 'utf8');
  assert(eight.includes("await runCmdAsync(process.execPath, ['tools/accept/run_pass.mjs',") && eight.includes('load1Start: r.load1Start ?? null, load1End: r.load1End ?? null'), 'run_eight.mjs');
  const digest = fs.readFileSync(path.join(ACCEPT, 'lib', 'harness_digest.mjs'), 'utf8');
  assert(digest.includes("'tools/t0/child_env.mjs'"), 'tools/t0/child_env.mjs is part of the harness digest (a change to it aborts an acceptance run in progress)');
});
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
/** EVERY command record of EVERY check of a pass JSON has load1Start and load1End (numbers; null on Windows), and, given `near` = [lowest, highest] load this process measured
 *  around the run, numbers within 5 of it (RUN-11's margin: a constant or invented value would not be). Returns one line per command for the notes. */
function everyCommandHasLoad(j, label, near = null) {
  const lines = [];
  for (const c of j.checks) {
    for (const cm of c.commands || []) {
      const what = `${label}: check ${c.id}, command ${JSON.stringify(String(cm.cmd).slice(0, 100))}`;
      assert('load1Start' in cm && 'load1End' in cm && isLoad(cm.load1Start) && isLoad(cm.load1End), `${what}: load1Start ${JSON.stringify(cm.load1Start)}, load1End ${JSON.stringify(cm.load1End)} (keys: ${Object.keys(cm).join(', ')})`);
      if (near && !WIN) assert([cm.load1Start, cm.load1End].every((v) => v >= near[0] - 5 && v <= near[1] + 5), `${what}: ${cm.load1Start}>${cm.load1End} is not near the load measured here (${near[0]}..${near[1]})`);
      lines.push(`check ${c.id}: ${String(cm.cmd).slice(0, 60)} load ${loadText(cm.load1Start, cm.load1End) || 'n/a'}`);
    }
  }
  return lines;
}
/** the pass-N.md line of a command record carries its numbers (", load a>b"; nothing on Windows) */
function mdShowsCommandLoad(md, cm, label) {
  if (WIN) return;
  const want = loadText(cm.load1Start, cm.load1End);
  assert(want, `${label}: no load text for ${JSON.stringify(cm)}`);
  const line = md.split('\n').find((l) => l.startsWith('- `') && l.includes(String(cm.cmd).slice(0, 60)));
  assert(line, `${label}: pass-1.md has no line for the command ${JSON.stringify(String(cm.cmd).slice(0, 60))}`);
  assert(line.includes(`, load ${want}`), `${label}: pass-1.md line of the command lacks ", load ${want}": ${line.slice(0, 240)}`);
}
test('RUN-22', 'tools/accept/run_pass.mjs, a real (two-check, incomplete) pass behind a proxy: the suite process of check 6 has the variables; the pass JSON has the load for the pass, every check, every command (the commands of check 6 and the in-process audit of check 8) and every suite; the report shows it', async (t) => {
  const cand = path.join(SCRATCH, 'cand'); fs.mkdirSync(cand, { recursive: true });
  fs.writeFileSync(path.join(cand, 'index.html'), '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Runner self-test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p>Nothing here.</p></body></html>\n');
  const outDir = path.join(SCRATCH, 'passes'), probeOut = path.join(SCRATCH, `probe-${++seq}.jsonl`);
  let port = 0; for (let i = 0; i < 20 && !(port > 1024 && port < 60000); i++) port = await freePort();
  const before = load1();
  const r = spawnSync(process.execPath, [path.join(ACCEPT, 'run_pass.mjs'), '--candidate', cand, '--pass', '1', '--only', '6,8', '--accuracy-filter', '^headers$', '--out-dir', outDir, '--port-base', String(port)],
    { cwd: REPO, env: scenarioEnv({ HTTPS_PROXY: DUMMY_PROXY }, probeOut), encoding: 'utf8', timeout: 600000, windowsHide: true });
  const after = load1();
  const file = path.join(outDir, 'pass-1.json');
  assert(fs.existsSync(file), `run_pass wrote no pass-1.json (exit ${r.status}): ${(r.stderr || r.stdout || '').slice(-600)}`);
  assert(r.status === 1 || r.status === 3, `exit ${r.status}: a pass with --only is never clean`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(j.verdict !== 'CLEAN' && j.countsTowardAcceptance === false, `verdict ${j.verdict}`);
  assert(isLoad(j.env.load1Start) && isLoad(j.env.load1End), `env load ${j.env.load1Start} ${j.env.load1End}`);
  assertEq(j.checks.map((c) => c.id), ['6', '8'], 'checks that ran');
  for (const c of j.checks) assert('load1Start' in c && 'load1End' in c && isLoad(c.load1Start) && isLoad(c.load1End), `check ${c.id}: load ${c.load1Start} ${c.load1End}`);
  const c6 = j.checks[0], suite = (c6.raw.suites || [])[0], cmd = c6.commands.find((c) => /headers\.spec\.mjs/.test(c.cmd));
  assert(suite && suite.id === 'headers' && isLoad(suite.load1Start) && isLoad(suite.load1End), `check 6 suite record: ${JSON.stringify(suite && { id: suite.id, a: suite.load1Start, b: suite.load1End })}`);
  assert(cmd && isLoad(cmd.load1Start) && isLoad(cmd.load1End), `check 6 command record: ${JSON.stringify(cmd)}`);
  const c8 = j.checks[1];
  assertEq(c8.commands.length, 1, 'check 8 records one command: its audit, which runs inside the pass process');
  assert(c8.commands[0].exit === null && /\(in-process\)/.test(c8.commands[0].cmd) && typeof c8.commands[0].ms === 'number', `check 8 command record: ${JSON.stringify(c8.commands[0])}`);
  const everyCmd = everyCommandHasLoad(j, 'directory candidate', [Math.min(before, after), Math.max(before, after)]);
  assert(everyCmd.length >= 2, `commands in this pass: ${everyCmd.length}`);
  const kid = readProbe(probeOut).find((p) => scriptIs(p, 'tests/t0/headers.spec.mjs'));
  assert(kid, 'the suite process of check 6 was not recorded');
  assertEq([kid.show.NODE_USE_ENV_PROXY, kid.show.NODE_EXTRA_CA_CERTS, kid.show.PYTHONIOENCODING], ['1', CA_DEFAULT, 'utf-8'], 'environment of the suite process');
  if (NODE_HONOURS) assert(String(kid.show.NODE_OPTIONS).endsWith(` ${QUIET_FLAG}`), `NODE_OPTIONS of the suite process ends with the quiet flag: ${kid.show.NODE_OPTIONS}`);
  const md = fs.readFileSync(path.join(outDir, 'pass-1.md'), 'utf8');
  assert(md.includes('| Load average (1 min) |') && md.includes('| # | Check | Status | Defects | Notes | Time | Load (1 min) start > end |'), 'pass-1.md shows the load');
  if (!WIN) assert(md.includes(`| ${loadText(c6.load1Start, c6.load1End)} |`) && new RegExp(`, load ${String(loadText(cmd.load1Start, cmd.load1End)).replace(/[.?]/g, '\\$&')}`).test(md), 'pass-1.md: the numbers of check 6 and of its command');
  for (const cm of j.checks.flatMap((c) => c.commands)) mdShowsCommandLoad(md, cm, 'directory candidate');
  t.note('pass', { verdict: j.verdict, exit: r.status, load: [j.env.load1Start, j.env.load1End], check6: [c6.load1Start, c6.load1End], suite: [suite.load1Start, suite.load1End] });
  t.note('commands', everyCmd);
});
test('RUN-23', 'tools/accept/run_pass.mjs, a real (two-check, incomplete) pass of a ZIP candidate: check 1 re-packs its train with the real packer and records that command with its load, check 8 records its audit with its load; every command record of the pass JSON has load1Start and load1End and the report shows them', async (t) => {
  if (spawnSync('python', ['--version'], { encoding: 'utf8' }).status !== 0) throw new Skip('python is not on the PATH: check 1 re-packs with tools/ship/pack_zip.py (check 1 calls "python"), so the re-pack command was NOT run');
  // A throw-away train and the zip the real packer makes of it.  Check 1 re-packs release/<train>/dist; the train name "../tmp/..." makes that path this scratch directory
  // (release/../tmp/<scratch>/train/dist), so nothing is written below release/ and the test does not depend on a built train.
  const trainDir = path.join(SCRATCH, 'train'), dist = path.join(trainDir, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Runner self-test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p>Nothing here.</p></body></html>\n');
  fs.writeFileSync(path.join(dist, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  const zip = path.join(SCRATCH, 'gettysburg-runner-selftest-PRODUCTION.zip');
  const pack = spawnSync('python', [path.join(REPO, 'tools', 'ship', 'pack_zip.py'), '--dist', dist, '--out', zip], { cwd: REPO, encoding: 'utf8', timeout: 120000, windowsHide: true });
  assert(pack.status === 0 && fs.existsSync(zip), `tools/ship/pack_zip.py exit ${pack.status}: ${(pack.stdout + pack.stderr).slice(-400)}`);
  const train = path.relative(path.join(REPO, 'release'), trainDir);
  assertEq(path.resolve(REPO, 'release', train, 'dist'), dist, 'release/<train>/dist as check 1 builds the path');
  const outDir = path.join(SCRATCH, 'passes-zip');
  let port = 0; for (let i = 0; i < 20 && !(port > 1024 && port < 60000); i++) port = await freePort();
  const before = load1();
  const r = spawnSync(process.execPath, [path.join(ACCEPT, 'run_pass.mjs'), '--candidate', zip, '--pass', '1', '--only', '1,8', '--repack', train, '--out-dir', outDir, '--port-base', String(port)],
    { cwd: REPO, env: scenarioEnv({}, null), encoding: 'utf8', timeout: 600000, windowsHide: true });
  const after = load1();
  const file = path.join(outDir, 'pass-1.json');
  assert(fs.existsSync(file), `run_pass wrote no pass-1.json (exit ${r.status}): ${(r.stderr || r.stdout || '').slice(-600)}`);
  assert(r.status === 1 || r.status === 3, `exit ${r.status}: a pass with --only is never clean`);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(j.verdict !== 'CLEAN' && j.countsTowardAcceptance === false, `verdict ${j.verdict}`);
  assertEq(j.checks.map((c) => c.id), ['1', '8'], 'checks that ran');
  const c1 = j.checks[0], c8 = j.checks[1];
  assert(c1.status === 'RAN' && c1.defectCount === 0, `check 1 on a zip made by the packer: status ${c1.status}, defects ${JSON.stringify(c1.defects)}`);
  assertEq(c1.commands.length, 1, 'check 1 records one command: the re-pack');
  const repack = c1.commands[0];
  assert(/tools\/ship\/pack_zip\.py --train \S+ --out \S+/.test(repack.cmd) && repack.exit === 0 && typeof repack.ms === 'number', `check 1 command record: ${JSON.stringify(repack)}`);
  assert('load1Start' in repack && 'load1End' in repack && isLoad(repack.load1Start) && isLoad(repack.load1End), `check 1: the re-pack command has no load (keys: ${Object.keys(repack).join(', ')})`);
  assert(c1.metrics.repackSha256 && c1.metrics.repackSha256 === c1.metrics.candidateSha256, `the re-pack is byte-identical to the candidate: ${c1.metrics.repackSha256} against ${c1.metrics.candidateSha256}`);
  assertEq(c8.commands.length, 1, 'check 8 records one command: its audit, which runs inside the pass process');
  const audit = c8.commands[0];
  assert(audit.exit === null && /\(in-process\)/.test(audit.cmd) && typeof audit.ms === 'number' && audit.ms >= 0, `check 8 command record: ${JSON.stringify(audit)}`);
  const lines = everyCommandHasLoad(j, 'zip candidate', [Math.min(before, after), Math.max(before, after)]);
  assertEq(lines.length, 2, 'commands in this pass');
  const md = fs.readFileSync(path.join(outDir, 'pass-1.md'), 'utf8');
  for (const cm of [repack, audit]) mdShowsCommandLoad(md, cm, 'zip candidate');
  t.note('pass', { verdict: j.verdict, exit: r.status, train });
  t.note('commands', lines);
});
test('RUN-24', 'tools/accept source: every command record a check pushes (commands.push) carries the load, so a path no test executes (check 6 with --full, a re-pack variant) cannot go without it; the scanner has a negative control', (t) => {
  /** the text of the call whose "(" is src[open], up to its matching ")"; string and template literals are skipped (a parenthesis inside one does not count) */
  const callText = (src, open) => {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      const ch = src[i];
      if (ch === "'" || ch === '"' || ch === '`') { for (i++; i < src.length && src[i] !== ch; i++) if (src[i] === '\\') i++; continue; }
      if (ch === '(') depth++; else if (ch === ')' && --depth === 0) return src.slice(open, i + 1);
    }
    throw new Error(`unbalanced call: ${src.slice(open, open + 80)}`);
  };
  const pushesIn = (src) => [...src.matchAll(/\bcommands\.push\(/g)].map((m) => callText(src, m.index + m[0].length - 1));
  const hasLoad = (text) => /\.\.\.loadOf\(\s*\w+\s*\)|\bload1Start\s*[:,}]/.test(text) && /\bload1End\b|\.\.\.loadOf\(/.test(text);
  // negative control: the scanner finds a record without the load (the shape c1_hash.mjs had) and a parenthesis inside a literal does not end the call early
  const bad = "c.commands.push({ cmd: r.cmd, exit: r.exit, ms: r.ms });", ok1 = "c.commands.push({ cmd: r.cmd, exit: r.exit, ms: r.ms, ...loadOf(r) });", ok2 = "c.commands.push({ cmd: `node x (in-process) ${p.basename(q)}`, exit: null, ms, load1Start, load1End: load1() });";
  assertEq([pushesIn(bad).map(hasLoad), pushesIn(ok1).map(hasLoad), pushesIn(ok2).map(hasLoad)], [[false], [true], [true]], 'negative control of the scanner');
  assertEq(pushesIn("c.commands.push({ cmd: 'a (b', exit: 1, ms: 2 }); c.commands.push({ cmd: 'c)', ...loadOf(r) });").map(hasLoad), [false, true], 'parentheses inside string literals');
  const dir = path.join(ACCEPT, 'checks'), found = {};
  for (const f of fs.readdirSync(dir).filter((n) => /\.mjs$/.test(n)).sort()) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const text of pushesIn(src)) {
      (found[f] ||= []).push(text.length);
      assert(hasLoad(text), `tools/accept/checks/${f}: a command record without load1Start/load1End (use ...loadOf(r) for a started command, load1() before and after for in-process work): ${text.slice(0, 160)}`);
    }
  }
  for (const f of ['c1_hash.mjs', 'c6_accuracy.mjs', 'c8_copy.mjs']) assert(found[f] && found[f].length >= 1, `the scanner found no commands.push in ${f}: it would pass for the wrong reason`);
  t.note('command records per check file', Object.fromEntries(Object.entries(found).map(([f, a]) => [f, a.length])));
});
test('RUN-25', 'ONLINE (--online): through the acceptance harness a child fetches the pinned Mapbox GL stylesheet with Node\'s own fetch() and gets the pinned bytes; behind a proxy the same child without the added variable fails (negative control)', (t) => {
  if (!ONLINE) throw new Skip('--online not given (one request to api.mapbox.com)');
  const sri = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 't0', 'assets-src', 'sri.json'), 'utf8'))['mapbox-gl.css'];
  const fetcher = path.join(SCRATCH, 'fetch-child.mjs'), driver = path.join(SCRATCH, 'fetch-driver.mjs');
  fs.writeFileSync(fetcher, `import crypto from 'node:crypto';
try { const r = await fetch(process.argv[2]); const b = Buffer.from(await r.arrayBuffer()); console.log(JSON.stringify({ status: r.status, sri: 'sha384-' + crypto.createHash('sha384').update(b).digest('base64'), bytes: b.length })); }
catch (e) { console.log(JSON.stringify({ error: String(e && e.message), cause: String(e && e.cause && (e.cause.code || e.cause.message)) })); }
`);
  fs.writeFileSync(driver, `import { runCmd } from ${JSON.stringify(UTIL)};
const r = runCmd(process.execPath, [process.argv[2], process.argv[3]], { timeoutMs: 90000 });
console.log(r.stdout.trim().split('\\n').pop());
`);
  // the calling shell's own environment, minus NODE_USE_ENV_PROXY: "no manual environment"
  const env = {}; for (const [k, v] of Object.entries(process.env)) if (k.toUpperCase() !== 'NODE_USE_ENV_PROXY') env[k] = v;
  const last = (r) => { try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { error: `no output (exit ${r.status}): ${(r.stderr || '').slice(-200)}` }; } };
  const via = last(spawnSync(process.execPath, [driver, fetcher, sri.url], { cwd: REPO, env, encoding: 'utf8', timeout: 120000 }));
  t.note('through the harness', via);
  assertEq([via.status, via.sri], [200, sri.integrity], 'fetched through the harness');
  if (httpsProxySet(env)) {
    const direct = last(spawnSync(process.execPath, [fetcher, sri.url], { cwd: REPO, env, encoding: 'utf8', timeout: 120000 }));
    t.note('negative control (same child, started without the harness)', direct);
    assert(direct.error && direct.status === undefined, 'behind a proxy the child without NODE_USE_ENV_PROXY must fail: otherwise this test proves nothing about the added variable');
  } else t.note('negative control', 'not applicable: this shell has no HTTPS proxy, Node reaches the network directly');
});

// ------------------------------------------------------------------ run
const results = [];
for (const tc of tests) {
  if (FILTER && !new RegExp(FILTER, 'i').test(tc.id)) continue;
  const notes = {}, t0 = Date.now();
  let status = 'pass', error = null;
  try { await tc.fn({ note: (k, v) => { notes[k] = v; } }); } catch (e) {
    if (e instanceof Skip) { status = 'skip'; error = e.message; } else { status = 'fail'; error = String(e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
  }
  results.push({ id: tc.id, status, ms: Date.now() - t0 });
  console.log(`${status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL'}  ${tc.id.padEnd(12)} ${tc.title}${status === 'pass' ? '' : `\n      ${error}`}`);
  if (Object.keys(notes).length) console.log(`      ${JSON.stringify(notes).slice(0, 900)}`);
}
const failed = results.filter((r) => r.status === 'fail').length, skipped = results.filter((r) => r.status === 'skip').length;
if (!KEEP && !failed) { try { fs.rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* scratch stays */ } } else console.log(`scratch kept: ${rel(SCRATCH)}`);
console.log(`calling shell: HTTPS proxy ${httpsProxySet() ? 'set' : 'not set'}; load average (1 min) ${load1() ?? 'not available'}; ${os.cpus().length} CPUs; ${Math.round(results.reduce((a, r) => a + r.ms, 0) / 100) / 10} s`);
console.log(`runner-selftest: ${results.length - failed - skipped}/${results.length} passed${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
