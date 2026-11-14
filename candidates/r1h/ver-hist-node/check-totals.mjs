#!/usr/bin/env node
// check-totals.mjs - reads the two logs of the acceptance run (run-suites.sh) and checks acceptance (2) of ver-hist-node:
//   * under the default Node every file of tests/historian loaded (no file-level failure entry, no "Invalid regular expression" in the log);
//   * the pass, fail, cancelled, skipped and todo totals of the run under the default Node equal those under Node 24 (both logs record the same number of test files);
//   * the content hash of the directories the suites read is the same at the start and at the end of both runs (a tree that changed while the suites ran, or between the two runs, proves nothing);
//   * both runs ended with the same exit code. Besides, per_test lists every test whose outcome (pass, fail, skip) differs between the two runs: evidence only, it does not change the exit code.
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
// Every test line of a log, in either reporter format (Node 22 prints TAP when its output is not a terminal, Node 24 prints the spec format), reduced to a name without case and punctuation and an outcome
// (pass, fail, skip, todo). It is the evidence behind the totals: when they differ it names the tests, and when they are equal it shows that the same tests passed and the same tests were skipped under both
// Nodes. It never changes the exit code of this script (the acceptance is the totals); a parse that finds a different number of test lines than the log's own total is reported next to it.
function outcomes(text) {
  const map = new Map(); let lines = 0;
  for (const line of text.split('\n')) {
    if (/^ℹ tests \d+/.test(line)) break;                      // the spec reporter repeats the failing tests after its summary
    let m; let status; let name;
    if ((m = line.match(/^\s*(not ok|ok) \d+ - (.*)$/))) { status = m[1] === 'ok' ? 'pass' : 'fail'; name = m[2]; }
    else if ((m = line.match(/^\s*(✔|✖|﹣)\s+(.*)$/))) { status = m[1] === '✔' ? 'pass' : m[1] === '✖' ? 'fail' : 'skip'; name = m[2]; }
    else continue;
    const d = name.match(/^(.*?)\s+#\s+(SKIP|TODO)\w*\b.*$/); if (d) { name = d[1]; status = d[2] === 'SKIP' ? 'skip' : 'todo'; }
    name = name.replace(/\s+\(\d+(?:\.\d+)?ms\)\s*$/, '');
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const e = map.get(key) || { name, pass: 0, fail: 0, skip: 0, todo: 0 }; e[status]++; map.set(key, e); lines++;
  }
  return { map, lines };
}
const problems = []; const out = {}; const parsed = {};
for (const v of ['22', '24']) {
  const name = `suite-node${v}.log`; let text; try { text = read(name); } catch { problems.push(`${name} is missing (run run-suites.sh)`); continue; }
  try { parsed[v] = outcomes(text); } catch (e) { parsed[v] = { error: String(e && e.message || e) }; }
  const t = totals(text); const node = info(text, /^# node: (v[\d.]+)/m);
  const loadFailures = (text.match(/^(?:not ok \d+ - |✖ )tests\/historian\/\S+\.test\.mjs\b/gm) || []).length;
  const regexErrors = (text.match(/Invalid regular expression/g) || []).length;
  const files = Number(info(text, /^# test files: (\d+)/m));
  const startTree = info(text, /at the start: (\w+)/), endTree = info(text, /content hash at the end: (\w+)/);
  const exit = info(text, /^# exit: (\d+)/m);
  const bad = [];
  if (Object.values(t).some((x) => x === null)) bad.push('no totals in the log (the run did not finish)');
  if (v === '22' && !/^# node: v22\./m.test(text)) bad.push('the first log is not a Node 22 run');
  if (v === '24' && !/^# node: v24\./m.test(text)) bad.push('the second log is not a Node 24 run');
  if (loadFailures) bad.push(`${loadFailures} file-level failures (a file that failed to load, or failed as a whole)`);
  if (regexErrors) bad.push(`${regexErrors} "Invalid regular expression" errors`);
  if (startTree && endTree && startTree !== endTree) bad.push('the working tree changed while the suite ran');
  const dur = info(text, /^(?:# |ℹ )duration_ms ([\d.]+)\s*$/m);
  out[v] = { node, files, exit: exit === null ? null : Number(exit), totals: t, duration_ms: dur === null ? null : Math.round(Number(dur)), file_level_failures: loadFailures, invalid_regular_expression_errors: regexErrors, tree_at_start: startTree, tree_at_end: endTree, started: info(text, /^# started: (\d{4}-\d\d-\d\dT[\d:]+Z)/m), load_average_at_start: info(text, /load average ([\d. ]+)/), log: `candidates/r1h/ver-hist-node/${name}` };
  for (const b of bad) problems.push(`Node ${v}: ${b}`);
}
if (out['22'] && out['24']) {
  const a = out['22'].totals, b = out['24'].totals;
  for (const k of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) if (a[k] !== b[k]) problems.push(`totals differ: ${k} ${a[k]} under Node 22, ${b[k]} under Node 24`);
  if (out['22'].files !== out['24'].files) problems.push(`the runs saw ${out['22'].files} and ${out['24'].files} test files`);
  const hashes = new Set([out['22'].tree_at_start, out['22'].tree_at_end, out['24'].tree_at_start, out['24'].tree_at_end]); if (hashes.size !== 1) problems.push(`the two runs did not see the same tree (content hashes ${[...hashes].join(', ')})`);
  out.equal = ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].every((k) => a[k] === b[k]);
  if (out['22'].exit !== out['24'].exit) problems.push(`the exit codes of the runs differ: ${out['22'].exit} under Node 22, ${out['24'].exit} under Node 24`);
  // per-test outcomes (evidence only, see outcomes())
  const pa = parsed['22'], pb = parsed['24'];
  if (pa && pb && pa.map && pb.map) {
    const differing = [];
    for (const k of new Set([...pa.map.keys(), ...pb.map.keys()])) {
      const x = pa.map.get(k) || {}, y = pb.map.get(k) || {};
      if (['pass', 'fail', 'skip', 'todo'].some((s) => (x[s] || 0) !== (y[s] || 0))) differing.push({ test: (x.name || y.name).slice(0, 160), node22: { pass: x.pass || 0, fail: x.fail || 0, skip: x.skip || 0 }, node24: { pass: y.pass || 0, fail: y.fail || 0, skip: y.skip || 0 } });
    }
    out.per_test = { test_lines_node22: pa.lines, test_lines_node24: pb.lines, distinct_names: pa.map.size, same_outcome_for_every_test: differing.length === 0, differing: differing.slice(0, 20), differing_count: differing.length,
      parse_matches_totals: pa.lines === a.tests && pb.lines === b.tests };
  } else out.per_test = { error: [pa && pa.error, pb && pb.error].filter(Boolean).join('; ') || 'a log could not be read' };
  out.notes = [];
  // the comparison counts as a check only when the parse accounts for every test line the logs claim; then a test with another outcome under the other Node is a failure even when the totals happen to agree
  if (out.per_test.parse_matches_totals === true && out.per_test.same_outcome_for_every_test === false) problems.push(`${out.per_test.differing_count} tests have another outcome under Node 22 than under Node 24 (per_test lists them)`);
  else if (out.per_test.parse_matches_totals !== true) out.notes.push('the per-test comparison is inconclusive here: the test lines found in the logs do not add up to the totals the logs print, so only the totals were compared');
  if (a.fail || b.fail || a.cancelled || b.cancelled) out.notes.push(`failures or cancellations are present in both runs (node 22: fail ${a.fail}, cancelled ${a.cancelled}; node 24: fail ${b.fail}, cancelled ${b.cancelled}): equal totals, but not a clean suite`);
}
out.ok = problems.length === 0; out.problems = problems;
console.log(JSON.stringify(out, null, 1));
if (process.argv.includes('--write') && out.ok) {
  const p = path.join(DIR, 'STATUS.json'); let st = {}; try { st = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* new */ }
  st.node_totals = { checked_by: 'node candidates/r1h/ver-hist-node/check-totals.mjs', command: 'node --test tests/historian/*.test.mjs', node22: out['22'], node24: out['24'], equal: out.equal, per_test: out.per_test, notes: out.notes };
  fs.writeFileSync(p, JSON.stringify(st, null, 1) + '\n');
}
process.exit(out.ok ? 0 : 1);
