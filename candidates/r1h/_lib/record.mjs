#!/usr/bin/env node
// Record the proof of a source-rebuild item (work under src/, historian-src/, data-src/, tools/{data,time,historian}, tests/{data,time,historian}).
//
//   node candidates/r1h/_lib/record.mjs <id> --test "node --test tests/data/embedded.test.mjs" [--test "..."] \
//        --red-cmd "node --test tests/data/embedded.test.mjs" --red-exit 1 --red-log tmp/r1h-cand/<id>/red.log [--files a,b,c]
//   node candidates/r1h/_lib/record.mjs <id> --request-note docs/battle-theatre/GOVERNANCE/horde/requests/main-site-<id>.md
//        (route "release-request": the work is a change in files the release workstream owns; the note must exist and name the exact change)
//   node candidates/r1h/_lib/record.mjs <id> --evidence candidates/r1h/<id>/evidence.json --test "<command>"
//        (route "verification-record": evidence.json = {question, method, outcome: confirmed|refuted|not-found|blocked|mixed, points: [...]}; no red-first record is needed
//         because the result may be a refutation or a failed lookup, which are valid outcomes; the test command re-checks every figure and quotation cited)
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

if (args.includes('--check') && prev.route === 'release-request') {
  const okNote = prev.request_note && fs.existsSync(path.join(REPO, prev.request_note));
  console.log(`${okNote ? 'same' : 'DIFFERENT'}: request note ${prev.request_note}`);
  process.exit(okNote && prev.passes === true ? 0 : 1);
}
if (args.includes('--check')) {
  const cmds = (prev.tests || []).map((t) => t.cmd);
  if (!cmds.length) { console.error(`${id}: no recorded commands in STATUS.json`); process.exit(1); }
  let bad = 0;
  for (const t of prev.tests) { const r = run(t.cmd); const ok = r.exit === t.exit; if (!ok) bad++; console.log(`${ok ? 'same' : 'DIFFERENT'} exit ${r.exit} (recorded ${t.exit}): ${t.cmd}`); }
  process.exit(bad || prev.passes !== true ? 1 : 0);
}

const noteArg = one('--request-note');
if (noteArg) {
  const noteOk = fs.existsSync(path.join(REPO, noteArg)) && fs.statSync(path.join(REPO, noteArg)).size > 200 && /^docs\/battle-theatre\/GOVERNANCE\/horde\/requests\/main-site-[a-z0-9-]+\.md$/.test(noteArg);
  const hand = fs.existsSync(path.join(cdir, 'HANDOFF.md'));
  const pr = [];
  if (!noteOk) pr.push('request note missing, under 200 bytes or not named docs/battle-theatre/GOVERNANCE/horde/requests/main-site-<id>.md');
  if (!hand) pr.push('no HANDOFF.md');
  const o = { ...prev, id, route: 'release-request', checked_at: new Date().toISOString(), request_note: noteArg, handoff_exists: hand, passes: pr.length === 0, problems: pr, state: pr.length === 0 ? 'handed-off' : 'built' };
  fs.mkdirSync(cdir, { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(o, null, 1) + '\n');
  console.log(`${id}: passes=${o.passes}${pr.length ? '\n  ' + pr.join('\n  ') : ''}`);
  process.exit(o.passes ? 0 : 1);
}
const evidenceArg = one('--evidence');
const testCmds = all('--test');
const red = { cmd: one('--red-cmd'), exit: Number(one('--red-exit')), log: one('--red-log') };
const redOk = Boolean(red.cmd) && Number.isInteger(red.exit) && red.exit !== 0 && red.log && fs.existsSync(path.join(REPO, red.log)) && fs.statSync(path.join(REPO, red.log)).size > 0;
const evidenceProblems = [];
const tests = testCmds.map(run);
let evidence = null;
if (evidenceArg) {
  let ev = null;
  try { ev = JSON.parse(fs.readFileSync(path.join(REPO, evidenceArg), 'utf8')); } catch { /* reported below */ }
  const outcomes = ['confirmed', 'refuted', 'not-found', 'blocked', 'mixed'];
  evidence = { file: evidenceArg, outcome: ev?.outcome ?? null, points: Array.isArray(ev?.points) ? ev.points.length : 0 };
  if (!ev || !outcomes.includes(ev.outcome) || !evidence.points) problemsEv(`evidence file unreadable, outcome not one of ${outcomes.join('|')}, or no points[]`);
}
function problemsEv(m) { evidenceProblems.push(m); }
const handoff = fs.existsSync(path.join(cdir, 'HANDOFF.md'));
const problems = [...evidenceProblems];
if (!testCmds.length) problems.push('no --test command');
if (tests.some((t) => t.exit !== 0)) problems.push('a test command failed');
if (!redOk && !evidenceArg) problems.push('no red-first record (need --red-cmd, a non-zero --red-exit and an existing non-empty --red-log)');
if (!handoff) problems.push('no HANDOFF.md');
const files = (one('--files') || '').split(',').map((s) => s.trim()).filter(Boolean);
const missing = files.filter((f) => !fs.existsSync(path.join(REPO, f)));
if (missing.length) problems.push(`listed files missing: ${missing.join(', ')}`);
const out = { ...prev, id, route: evidenceArg ? 'verification-record' : 'source-rebuild', evidence, checked_at: new Date().toISOString(), files: files.length ? files : prev.files || [],
  tests: tests.map(({ cmd, exit, ms, tail: tl }) => ({ cmd, exit, ms, tail: tl })), red_first: red.cmd ? { cmd: red.cmd, exit: red.exit, log: red.log } : prev.red_first || null,
  handoff_exists: handoff, passes: problems.length === 0, problems, state: problems.length === 0 ? 'tested' : 'built' };
fs.mkdirSync(cdir, { recursive: true });
fs.writeFileSync(statusPath, JSON.stringify(out, null, 1) + '\n');
console.log(`${id}: passes=${out.passes}${problems.length ? '\n  ' + problems.join('\n  ') : ''}`);
process.exit(out.passes ? 0 : 1);
