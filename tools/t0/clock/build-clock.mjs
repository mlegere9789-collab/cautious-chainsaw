#!/usr/bin/env node
// ONE command regenerates the optional patch group CLOCK from the anchors:
//
//     node tools/t0/clock/build-clock.mjs            regenerate everything and prove every anchor on the real R1c tree
//     node tools/t0/clock/build-clock.mjs --check    regenerate in memory only: exit 1 when tools/t0/patches-next/CLOCK.json is stale (CI)
//     node tools/t0/clock/build-clock.mjs --no-verify   skip the proof build (only the three generation steps)
//     node tools/t0/clock/build-clock.mjs --stack MON,DATA   also prove the group on a tree that carries those groups (order after CLOCK as given)
//
// Steps (each prints one line):
//   1. node tools/time/build.mjs                       the anchors (data-src/time/time_anchors.json) -> src/lib/time/*.generated.js, golden table, uncertainty.json,
//                                                       tools/time/build/gtbg-time.{inline,iife}.js (the module that CLOCK inlines)
//   2. clock_build.py --without-clock --dump-stage     a build of R1c without CLOCK, only to keep the texts the CLOCK patches have to match (groups A..PERF applied)
//   3. node tools/time/build-clock-patches.mjs         writes tools/t0/patches-next/CLOCK.json (every anchor asserted against the pristine or the staged text)
//   4. clock_build.py (CLOCK in memory, trains.json untouched)   builds R1c WITH the group into tmp/clock-integrate/clock-R1c and reads anchors.json: every CLOCK patch must be ok
// Nothing under release/ is written. legacy/ and baseline/ are only read.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const PY = process.env.PYTHON || 'python';
const STAGE = path.join(ROOT, 'tmp', 'clock-integrate', 'stage');
const OUT = path.join(ROOT, 'tmp', 'clock-integrate');
const NEXT = path.join(ROOT, 'tools', 't0', 'patches-next', 'CLOCK.json');

const run = (label, cmd, args, { allowFail = false } = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tail = (r.stdout || '').trim().split('\n').slice(-3).join(' | ').slice(0, 400);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${label}${tail ? ' :: ' + tail : ''}`);
  if (r.status !== 0 && !allowFail) { console.error((r.stdout || '').slice(-3000) + (r.stderr || '').slice(-3000)); process.exit(r.status || 1); }
  return r;
};

if (flag('check')) {
  const before = fs.existsSync(NEXT) ? fs.readFileSync(NEXT, 'utf8') : '';
  run('node tools/time/build.mjs --check', process.execPath, ['tools/time/build.mjs', '--check']);
  run('node tools/time/build-clock-patches.mjs', process.execPath, ['tools/time/build-clock-patches.mjs']);
  const after = fs.readFileSync(NEXT, 'utf8');
  if (before !== after) { console.error('STALE tools/t0/patches-next/CLOCK.json (it has just been regenerated: commit it)'); process.exit(1); }
  console.log('CLOCK.json is current');
  process.exit(0);
}

run('node tools/time/build.mjs', process.execPath, ['tools/time/build.mjs']);
fs.mkdirSync(STAGE, { recursive: true });
run('stage build (R1c without CLOCK)', PY, ['tools/t0/clock/clock_build.py', '--train', 'R1c', '--out', 'tmp/clock-integrate/stage-build', '--no-gate', '--without-clock', '--dump-stage', STAGE]);
run('node tools/time/build-clock-patches.mjs', process.execPath, ['tools/time/build-clock-patches.mjs']);

if (!flag('no-verify')) {
  const stack = (opt('stack') || '').split(',').filter(Boolean);
  const out = 'tmp/clock-integrate/' + (stack.length ? 'clock-' + stack.join('-').toLowerCase() + '-R1c' : 'clock-R1c');
  const args = ['tools/t0/clock/clock_build.py', '--train', 'R1c', '--out', out, '--no-gate'];
  for (const g of stack) args.push('--also', g);
  const r = run('proof build (R1c with CLOCK' + (stack.length ? ' + ' + stack.join(' + ') : '') + ')', PY, args, { allowFail: true });
  const af = path.join(ROOT, out, 'anchors.json');
  if (!fs.existsSync(af)) { console.error('no anchors.json: the proof build failed before the anchors were checked'); process.exit(2); }
  const a = JSON.parse(fs.readFileSync(af, 'utf8'));
  const clock = a.patches.filter((p) => p.group === 'CLOCK');
  const bad = clock.filter((p) => !p.ok || p.found !== p.expect);
  const spec = JSON.parse(fs.readFileSync(NEXT, 'utf8'));
  console.log(`CLOCK: ${spec.patches.length} patches in the file, ${clock.length} recorded by the builder, ${clock.length - bad.length} applied, ${bad.length} failed`);
  for (const b of bad) console.error(`  ANCHOR FAIL ${b.id}: expected ${b.expect}, found ${b.found}`);
  const other = a.patches.filter((p) => p.group !== 'CLOCK' && (!p.ok || p.found !== p.expect));
  for (const b of other) console.error(`  (not CLOCK) ${b.group} ${b.id}: expected ${b.expect}, found ${b.found}`);
  if (clock.length !== spec.patches.length) { console.error('the builder did not record every CLOCK patch'); process.exit(2); }
  if (bad.length) process.exit(2);
  if (r.status !== 0 && !other.length) process.exit(r.status || 1);
}
console.log('done');
