#!/usr/bin/env node
// mutants.mjs - shows that the evidence of ver-hist-node can fail: nine wrong ways of spelling out the meridiem pattern (the slips a hand conversion makes) are written as copies of tools/historian/ingest/times.mjs
// under tmp/r1h-cand/ver-hist-node/mutants/, and each is run through (a) differential.mjs against the old text (Node 24) and (b) tests/historian/times-node22.test.mjs in a scratch layout (Node 22).
//   node candidates/r1h/ver-hist-node/mutants.mjs        needs /opt/node24/bin/node; writes candidates/r1h/ver-hist-node/mutants.json; exit 0 when every mutant is caught by both
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const N24 = '/opt/node24/bin/node';
const TIMES = path.join(REPO, 'tools/historian/ingest/times.mjs');
const src = fs.readFileSync(TIMES, 'utf8');
const W = path.join(REPO, 'tmp/r1h-cand/ver-hist-node/mutants'); fs.rmSync(W, { recursive: true, force: true }); fs.mkdirSync(W, { recursive: true });
const MUTANTS = [
  ['the capital-only branch made case-insensitive ("am" and "Am" would be read)', '|[AP]\\.?\\s?M)\\b\\.?`;', '|[aApP]\\.?\\s?[mM])\\b\\.?`;'],
  ['the capital-only branch dropped ("AM" would not be read)', "'(?:' + both(String.raw`[ap]\\s?[.,]\\s?m`) + String.raw`|[AP]\\.?\\s?M)\\b\\.?`;", "'(?:' + both(String.raw`[ap]\\s?[.,]\\s?m`) + String.raw`)\\b\\.?`;"],
  ['the o\'clock class without the c: cl[oe]ck', 'const OCL = both(String.raw`o.{0,2}cl[oec]ck`);', 'const OCL = both(String.raw`o.{0,2}cl[oe]ck`);'],
  ['the number words without twelve', '|eleven|twelve)\');', '|eleven)\');'],
  ['"minutes?" without the optional s', 'minutes?\\s+(?:before|past|to|after))\\s+(\\d{1,2}|${NUMW_RE})', 'minutes\\s+(?:before|past|to|after))\\s+(\\d{1,2}|${NUMW_RE})'],
  ['a comma no longer a stop: [.]', 'both(String.raw`[ap]\\s?[.,]\\s?m`)', 'both(String.raw`[ap]\\s?[.]\\s?m`)'],
  ['white space before the stop dropped', 'both(String.raw`[ap]\\s?[.,]\\s?m`)', 'both(String.raw`[ap][.,]\\s?m`)'],
  ['both() leaves a class alone (its letters stay in one case)', "    return t.replace(/\\\\[\\s\\S]|[A-Za-z]/g, (u) => (u[0] === '\\\\' ? u : u + other(u)));", '    return t;'],
  ['"between|from" left case-sensitive in the range pattern', 'ci`\\b(between|from)\\s+${HM}', 'String.raw`\\b(between|from)\\s+${HM}'],
];
const run = (cmd, args, cwd = REPO) => spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
const out = []; let allCaught = true;
MUTANTS.forEach(([what, from, to], i) => {
  const id = `mut${i + 1}`;
  if (src.split(from).length !== 2) throw new Error(`${id}: the text to replace occurs ${src.split(from).length - 1} times`);
  const file = path.join(W, `${id}.mjs`); fs.writeFileSync(file, src.replace(from, to));
  const d = run(N24, ['candidates/r1h/ver-hist-node/differential.mjs', '--new', file, '--sections', 'fuzz,grammar,claims', '--fuzz', '20000', '--grammar', '20000']);
  const mism = [...d.stdout.matchAll(/(\d+) mismatches against the old text/g)].reduce((n, m) => n + Number(m[1]), 0);
  const calls = [...d.stdout.matchAll(/(\d+) parseClock calls/g)].reduce((n, m) => n + Number(m[1]), 0);
  // the new test in a scratch layout: times.mjs is the mutant (test 1, the scan, is not meaningful in a layout of three files and is left out of the count)
  const lay = path.join(W, id); fs.mkdirSync(path.join(lay, 'tests/historian/lib'), { recursive: true }); fs.mkdirSync(path.join(lay, 'tools/historian/ingest'), { recursive: true });
  fs.copyFileSync(path.join(REPO, 'tests/historian/times-node22.test.mjs'), path.join(lay, 'tests/historian/times-node22.test.mjs')); fs.copyFileSync(path.join(REPO, 'tests/historian/lib/data.mjs'), path.join(lay, 'tests/historian/lib/data.mjs')); fs.copyFileSync(file, path.join(lay, 'tools/historian/ingest/times.mjs'));
  const t = run(process.execPath, ['--test', 'tests/historian/times-node22.test.mjs'], lay);
  const failed = [...t.stdout.matchAll(/^not ok (\d+) - /gm)].map((m) => Number(m[1])).filter((n) => n !== 1);
  const caught = mism > 0 && failed.length > 0; if (!caught) allCaught = false;
  out.push({ id, what, differential_mismatches: mism, differential_calls: calls, new_test_failed_tests: failed, caught });
  console.log(`${id} ${caught ? 'caught' : 'NOT CAUGHT'}: ${mism} mismatches in ${calls} calls; tests ${failed.join(',') || 'none'} of the new file fail under Node ${process.versions.node} - ${what}`);
});
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'mutants.json'), JSON.stringify({ node_differential: '24', node_test: process.version, times_mjs_blob: spawnSync('git', ['hash-object', TIMES], { cwd: REPO, encoding: 'utf8' }).stdout.trim(), all_caught: allCaught, mutants: out }, null, 1) + '\n');
fs.rmSync(W, { recursive: true, force: true });
process.exit(allCaught ? 0 : 1);
