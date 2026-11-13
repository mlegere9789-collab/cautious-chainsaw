#!/usr/bin/env node
// Record the proof of a source-rebuild item (work under src/, historian-src/, data-src/, tools/{data,time,historian}, tests/{data,time,historian}).
//
//   node candidates/r1h/_lib/record.mjs <id> --test "node --test tests/data/embedded.test.mjs" [--test "..."] \
//        --red-cmd "node --test tests/data/embedded.test.mjs" --red-exit 1 --red-log tmp/r1h-cand/<id>/red.log [--files a,b,c]
//   node candidates/r1h/_lib/record.mjs <id> --check      re-run every recorded command and compare exit codes with STATUS.json; writes nothing
//
// Writes candidates/r1h/<id>/STATUS.json (route "source-rebuild"): every --test command is run here (through bash, from the repository root)
// and must exit 0; the red-first record is the failing run you captured BEFORE the implementation (a log file that exists and is not empty,
// with the command and the non-zero exit). passes needs: all test commands 0, a red-first record, HANDOFF.md present.
// Heavy jobs (browser, more than about 30 s of CPU) go behind the lock: tools/horde/bench.sh node candidates/r1h/_lib/record.mjs <id> ...
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO } from './tree.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const all = (n) => args.flatMap((a, i) => (a === n ? [args[i + 1]] : []));
const one = (n) => all(n)[0];
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) { console.error('usage: record.mjs <id> --test CMD [--test CMD] --red-cmd CMD --red-exit N --red-log FILE [--files a,b] | --check'); process.exit(64); }
const cdir = path.join(REPO, 'candidates', 'r1h', id);
const statusPath = path.join(cdir, 'STATUS.json');
const tail = (s, n = 800) => (s.length > n ? '...' + s.slice(-n) : s);
const run = (cmd) => {
  const t0 = Date.now();
  const r = spawnSync('bash', ['-lc', cmd], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { cmd, exit: r.status ?? 1, ms: Date.now() - t0, tail: tail((r.stdout || '') + (r.stderr || '')) };
};
let prev = {};
try { prev = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch { /* new */ }

if (args.includes('--check')) {
  const cmds = (prev.tests || []).map((t) => t.cmd);
  if (!cmds.length) { console.error(`${id}: no recorded commands in STATUS.json`); process.exit(1); }
  let bad = 0;
  for (const t of prev.tests) { const r = run(t.cmd); const ok = r.exit === t.exit; if (!ok) bad++; console.log(`${ok ? 'same' : 'DIFFERENT'} exit ${r.exit} (recorded ${t.exit}): ${t.cmd}`); }
  process.exit(bad || prev.passes !== true ? 1 : 0);
}

const testCmds = all('--test');
const red = { cmd: one('--red-cmd'), exit: Number(one('--red-exit')), log: one('--red-log') };
const redOk = Boolean(red.cmd) && Number.isInteger(red.exit) && red.exit !== 0 && red.log && fs.existsSync(path.join(REPO, red.log)) && fs.statSync(path.join(REPO, red.log)).size > 0;
const tests = testCmds.map(run);
const handoff = fs.existsSync(path.join(cdir, 'HANDOFF.md'));
const problems = [];
if (!testCmds.length) problems.push('no --test command');
if (tests.some((t) => t.exit !== 0)) problems.push('a test command failed');
if (!redOk) problems.push('no red-first record (need --red-cmd, a non-zero --red-exit and an existing non-empty --red-log)');
if (!handoff) problems.push('no HANDOFF.md');
const files = (one('--files') || '').split(',').map((s) => s.trim()).filter(Boolean);
const missing = files.filter((f) => !fs.existsSync(path.join(REPO, f)));
if (missing.length) problems.push(`listed files missing: ${missing.join(', ')}`);
const out = { ...prev, id, route: 'source-rebuild', checked_at: new Date().toISOString(), files: files.length ? files : prev.files || [],
  tests: tests.map(({ cmd, exit, ms, tail: tl }) => ({ cmd, exit, ms, tail: tl })), red_first: red.cmd ? { cmd: red.cmd, exit: red.exit, log: red.log } : prev.red_first || null,
  handoff_exists: handoff, passes: problems.length === 0, problems, state: problems.length === 0 ? 'tested' : 'built' };
fs.mkdirSync(cdir, { recursive: true });
fs.writeFileSync(statusPath, JSON.stringify(out, null, 1) + '\n');
console.log(`${id}: passes=${out.passes}${problems.length ? '\n  ' + problems.join('\n  ') : ''}`);
process.exit(out.passes ? 0 : 1);
