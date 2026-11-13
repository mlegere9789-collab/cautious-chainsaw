#!/usr/bin/env node
// Red-first proof of one candidate and its STATUS.json.
//
//   node candidates/r1h/_lib/prove.mjs <id>            run, then write candidates/r1h/<id>/STATUS.json
//   node candidates/r1h/_lib/prove.mjs <id> --check    run again and compare with the STATUS.json on disk (exit 1 on any difference); writes nothing
//   options: --base <dir> (default release/R1g/dist)   --test <file> (default candidates/r1h/<id>/test.mjs)
//
// Steps: (1) python3 candidates/r1h/_lib/apply_group.py <id> -> scratch tree tmp/r1h-cand/<id>/green (every anchor asserted);
//        (2) RED:   node --test <test> with R1H_TREE unset (the test reads the untouched base tree)  -> must exit non-zero;
//        (3) GREEN: node --test <test> with R1H_TREE=<scratch tree>                                   -> must exit 0.
// A candidate "passes" only when the anchors all hold, red failed, green passed, test.mjs and HANDOFF.md exist. Nothing here lowers or
// skips a check: if the test cannot fail on the base tree it proves nothing and the run says so.
// Browser tests belong behind the machine lock: tools/horde/bench.sh node candidates/r1h/_lib/prove.mjs <id>.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO } from './tree.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!id || !/^_?[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) { console.error('usage: prove.mjs <id> [--check] [--base DIR] [--test FILE]'); process.exit(64); }
const cdir = path.join(REPO, 'candidates', 'r1h', id);
const base = opt('--base', 'release/R1g/dist');
const testRel = opt('--test', path.join('candidates', 'r1h', id, 'test.mjs')).replace(/\\/g, '/');
const green = path.join('tmp', 'r1h-cand', id, 'green').replace(/\\/g, '/');
const tail = (s, n = 1500) => (s.length > n ? '...' + s.slice(-n) : s);
const run = (cmd, argv, env = {}) => {
  const t0 = Date.now();
  const r = spawnSync(cmd, argv, { cwd: REPO, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  return { cmd: [cmd, ...argv].join(' '), exit: r.status ?? (r.signal ? 128 : 1), ms: Date.now() - t0, out: tail((r.stdout || '') + (r.stderr || '')) };
};

const result = { id, route: 'candidate-group', base, test: testRel, checked_at: new Date().toISOString() };
const hasGroupOrOverlay = fs.existsSync(path.join(cdir, 'group.json')) || fs.existsSync(path.join(cdir, 'overlay'));
if (!hasGroupOrOverlay) { console.error(`${id}: neither group.json nor overlay/ in candidates/r1h/${id}`); process.exit(2); }
const ap = run('python3', ['candidates/r1h/_lib/apply_group.py', id, '--base', base]);
let report = null;
try { report = JSON.parse(fs.readFileSync(path.join(REPO, 'tmp', 'r1h-cand', id, 'report.json'), 'utf8')); } catch { /* reported below */ }
result.anchors = { exit: ap.exit, patches: report?.patches ?? 0, ok: report?.ok === true, failed: (report?.failed ?? []).map((f) => f.id), overlay_files: (report?.overlay_files ?? []).length };
result.test_exists = fs.existsSync(path.join(REPO, testRel));
result.handoff_exists = fs.existsSync(path.join(cdir, 'HANDOFF.md'));
if (result.test_exists) {
  const nodeTest = (env) => run(process.execPath, ['--test', testRel], env);
  const red = nodeTest({ R1H_BASE: base, R1H_TREE: '' });
  const grn = nodeTest({ R1H_BASE: base, R1H_TREE: green });
  result.red = { cmd: `R1H_BASE=${base} node --test ${testRel}`, exit: red.exit, expect: 'non-zero', ms: red.ms, tail: tail(red.out, 800) };
  result.green = { cmd: `R1H_BASE=${base} R1H_TREE=${green} node --test ${testRel}`, exit: grn.exit, expect: 0, ms: grn.ms, tail: tail(grn.out, 800) };
}
result.passes = Boolean(result.anchors.ok && result.test_exists && result.handoff_exists && result.red && result.red.exit !== 0 && result.green && result.green.exit === 0);
const why = [];
if (!result.anchors.ok) why.push(`anchors failed: ${result.anchors.failed.join(', ') || 'see tmp/r1h-cand/' + id + '/report.json'}`);
if (!result.test_exists) why.push(`no ${testRel}`);
if (!result.handoff_exists) why.push('no HANDOFF.md');
if (result.red && result.red.exit === 0) why.push('RED RUN PASSED: the test cannot fail on the untouched tree, so it proves nothing');
if (result.green && result.green.exit !== 0) why.push('green run failed');
result.problems = why;

const statusPath = path.join(cdir, 'STATUS.json');
let prev = {};
try { prev = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch { /* new */ }
if (flag('--check')) {
  const same = prev.passes === result.passes && prev.red?.exit !== 0 === (result.red?.exit !== 0) && prev.green?.exit === result.green?.exit;
  console.log(`${id}: passes=${result.passes} (on disk: ${prev.passes}) ${same ? 'consistent' : 'DIFFERENT'}${why.length ? ' ; ' + why.join('; ') : ''}`);
  process.exit(same && result.passes ? 0 : 1);
}
const out = { ...prev, ...result, state: result.passes ? (prev.state && prev.state !== 'built' ? prev.state : 'tested') : 'built' };
fs.writeFileSync(statusPath, JSON.stringify(out, null, 1) + '\n');
console.log(`${id}: anchors ${result.anchors.ok ? 'ok' : 'FAILED'} (${result.anchors.patches} patches); red exit ${result.red?.exit ?? 'n/a'}; green exit ${result.green?.exit ?? 'n/a'}; passes=${result.passes}${why.length ? '\n  ' + why.join('\n  ') : ''}`);
process.exit(result.passes ? 0 : 1);
