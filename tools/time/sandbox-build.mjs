#!/usr/bin/env node
// Integration check of the CANDIDATE clock bridge with the REAL T0 build system, in a throw-away sandbox (tmp/time/t0sb, git-ignored).
// Nothing under tools/t0, legacy/ or release/ is touched: the T0 tree, legacy/dist and ops/ are COPIED, CLOCK.json is installed there as the
// extension part B+CLOCK.json (group "B", R1c) and `build.py --train R1c` runs against the copy, gates included (parse, unresolved-globals,
// anchors, references, ledger ...). No browser is used.
//
//   node tools/time/sandbox-build.mjs [--train=R1c] [--keep]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { P, readJson, parseArgs } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const train = String(flags.train || 'R1c');
const SB = P('tmp', 'time', 't0sb');
fs.rmSync(SB, { recursive: true, force: true });
fs.mkdirSync(SB, { recursive: true });
const cp = (rel, filter) => fs.cpSync(P(rel), path.join(SB, rel), { recursive: true, filter });
cp('tools/t0', (s) => !/[\\/](__pycache__|node_modules)([\\/]|$)/.test(s));
cp('legacy/dist');
// the T0 build starts from the tree trains.json names (baseline/dist since the 2026-09-30 re-baseline, pinned by tools/t0/baseline.lock.json, which is inside tools/t0)
try { const base = readJson(P('tools', 't0', 'trains.json')).base; if (base && base.dir && fs.existsSync(P(base.dir))) { cp(base.dir); console.log(`sandbox: T0 base ${base.dir} copied`); } } catch { /* an older T0 tree builds from legacy/dist */ }
cp('ops');
for (const f of ['package.json']) if (fs.existsSync(P(f))) fs.copyFileSync(P(f), path.join(SB, f));

const clock = readJson(P('tools', 't0', 'patches-next', 'CLOCK.json'));
const ext = { group: 'B', description: clock.description, patches: clock.patches };
fs.writeFileSync(path.join(SB, 'tools', 't0', 'patches', 'B+CLOCK.json'), JSON.stringify(ext, null, 1) + '\n');

const py = process.platform === 'win32' ? 'python' : 'python3';
const args = [path.join(SB, 'tools', 't0', 'build.py'), '--train', train, '--out', path.join(SB, 'release', train)];
console.log(`sandbox: ${SB}\n${py} ${path.relative(P(), args[0])} --train ${train}`);
const r = spawnSync(py, args, { cwd: SB, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const out = (r.stdout || '') + (r.stderr || '');
console.log(out.split('\n').slice(-40).join('\n'));
const gate = path.join(SB, 'release', train, 'gate.json');
if (fs.existsSync(gate)) { const g = readJson(gate); console.log('gate.json: ' + (g.ok ? 'OK' : 'FAILED') + ' [' + g.checks.map((x) => `${x.id}:${x.ok ? 'ok' : 'FAIL'}`).join(' ') + ']'); }
const anchors = path.join(SB, 'release', train, 'anchors.json');
if (fs.existsSync(anchors)) { const a = readJson(anchors); const list = a.patches || []; console.log(`anchors.json: ${list.length} patch records, ${list.filter((x) => /^CLK-/.test(x.id)).length} CLOCK rows, ${list.filter((x) => !x.ok).length} failed`); }
console.log(`build.py exit code ${r.status}`);
if (!flags.keep) { /* keep the sandbox for inspection: it is git-ignored */ }
process.exit(r.status === 0 ? 0 : 1);
