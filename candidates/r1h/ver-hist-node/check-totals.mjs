#!/usr/bin/env node
// check-totals.mjs - reads the two logs of the acceptance run (run-suites.sh) and checks acceptance (2) of ver-hist-node:
//   * under the default Node every file of tests/historian loaded (no file-level failure entry, no "Invalid regular expression" in the log);
//   * the pass, fail, cancelled, skipped and todo totals of the run under the default Node equal those under Node 24 (both logs record the same number of test files);
//   * no log shows a different working-tree state at its start and at its end of the run (a tree that changed while the suites ran proves nothing).
//   node check-totals.mjs [--write]      --write merges the two totals into candidates/r1h/ver-hist-node/STATUS.json (field node_totals)
// Exit 0 when all of it holds. It reads files only; to produce the logs: tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const read = (n) => fs.readFileSync(path.join(DIR, n), 'utf8');
function totals(text) {
  const t = {}; for (const k of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const m = text.match(new RegExp(`^(?:# |ℹ )${k} (\\d+)\\s*$`, 'm')); t[k] = m ? Number(m[1]) : null;
  }
  return t;
}
const info = (text, re) => (text.match(re) || [])[1] || null;
const problems = []; const out = {};
for (const v of ['22', '24']) {
  const name = `suite-node${v}.log`; let text; try { text = read(name); } catch { problems.push(`${name} is missing (run run-suites.sh)`); continue; }
  const t = totals(text); const node = info(text, /^# node: (v[\d.]+)/m);
  const loadFailures = (text.match(/^(?:not ok \d+ - |✖ )tests\/historian\/\S+\.test\.mjs\b/gm) || []).length;
  const regexErrors = (text.match(/Invalid regular expression/g) || []).length;
  const files = Number(info(text, /^# test files: (\d+)/m));
  const startTree = info(text, /at the start: (\w+)/), endTree = info(text, /working tree state at the end: (\w+)/);
  const exit = info(text, /^# exit: (\d+)/m);
  const bad = [];
  if (Object.values(t).some((x) => x === null)) bad.push('no totals in the log (the run did not finish)');
  if (v === '22' && !/^# node: v22\./m.test(text)) bad.push('the first log is not a Node 22 run');
  if (v === '24' && !/^# node: v24\./m.test(text)) bad.push('the second log is not a Node 24 run');
  if (loadFailures) bad.push(`${loadFailures} file-level failures (a file that failed to load, or failed as a whole)`);
  if (regexErrors) bad.push(`${regexErrors} "Invalid regular expression" errors`);
  if (startTree && endTree && startTree !== endTree) bad.push('the working tree changed while the suite ran');
  out[v] = { node, files, exit: exit === null ? null : Number(exit), totals: t, file_level_failures: loadFailures, invalid_regular_expression_errors: regexErrors, tree_at_start: startTree, tree_at_end: endTree, started: info(text, /^# started: (\S+)/m), log: `candidates/r1h/ver-hist-node/${name}` };
  for (const b of bad) problems.push(`Node ${v}: ${b}`);
}
if (out['22'] && out['24']) {
  const a = out['22'].totals, b = out['24'].totals;
  for (const k of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) if (a[k] !== b[k]) problems.push(`totals differ: ${k} ${a[k]} under Node 22, ${b[k]} under Node 24`);
  if (out['22'].files !== out['24'].files) problems.push(`the runs saw ${out['22'].files} and ${out['24'].files} test files`);
  out.equal = ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].every((k) => a[k] === b[k]);
}
out.ok = problems.length === 0; out.problems = problems;
console.log(JSON.stringify(out, null, 1));
if (process.argv.includes('--write') && out.ok) {
  const p = path.join(DIR, 'STATUS.json'); let st = {}; try { st = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* new */ }
  st.node_totals = { checked_by: 'node candidates/r1h/ver-hist-node/check-totals.mjs', command: 'node --test tests/historian/*.test.mjs', node22: out['22'], node24: out['24'], equal: out.equal };
  fs.writeFileSync(p, JSON.stringify(st, null, 1) + '\n');
}
process.exit(out.ok ? 0 : 1);
