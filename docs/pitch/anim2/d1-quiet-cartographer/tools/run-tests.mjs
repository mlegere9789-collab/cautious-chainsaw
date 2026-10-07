// tools/run-tests.mjs - runs every node test of this fork one file at a time and writes results/tests.json (file, tests, pass, fail, seconds).
//   node tools/run-tests.mjs                 run them all (about 12 minutes: popups.test.mjs alone is 6)
//   node tools/run-tests.mjs --only=rest,layout   run only these and keep the other rows of the existing results/tests.json
//   node tools/run-tests.mjs --parse <dir>   do not run: read the logs <dir>/final-<name>.log of an earlier run (TAP-style summary lines) and write the json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { D1, args } from './lib.mjs';

const NAMES = ['layout', 'display', 'interp', 'time', 'data', 'tuning', 'extend', 'production', 'build', 'skin-d1', 'rest', 'assemble', 'popups', 'fuzz', 'fuzz12'];      // fuzz12 = fuzz.test.mjs with FUZZ_SEEDS=12 FUZZ_ACTIONS=500
const parse = (text) => { const g = (k) => { const m = new RegExp('ℹ ' + k + ' ([0-9.]+)').exec(text); return m ? +m[1] : null; }; return { tests: g('tests'), pass: g('pass'), fail: g('fail'), seconds: g('duration_ms') != null ? +(g('duration_ms') / 1000).toFixed(1) : null }; };
const prev = args.only && fs.existsSync(path.join(D1, 'results', 'tests.json')) ? JSON.parse(fs.readFileSync(path.join(D1, 'results', 'tests.json'), 'utf8')).rows : [];
const rows = [];
for (const n of NAMES) {
  if (args.only && !args.only.split(',').includes(n)) { const old = prev.find((r) => r.file === (n === 'fuzz12' ? 'test/fuzz.test.mjs (12 seeds x 500 actions)' : `test/${n}.test.mjs`)); if (old) rows.push(old); continue; }
  let text;
  if (args.parse) { const f = path.join(args.parse, `final-${n}.log`); if (!fs.existsSync(f)) { rows.push({ file: `test/${n}.test.mjs`, missing: true }); continue; } text = fs.readFileSync(f, 'utf8'); }
  else { const big = n === 'fuzz12'; const r = spawnSync(process.execPath, ['--test', path.join(D1, 'test', `${big ? 'fuzz' : n}.test.mjs`)], { encoding: 'utf8', maxBuffer: 1 << 28, env: big ? { ...process.env, FUZZ_SEEDS: '12', FUZZ_ACTIONS: '500' } : process.env }); text = (r.stdout || '') + (r.stderr || ''); }
  rows.push({ file: n === 'fuzz12' ? 'test/fuzz.test.mjs (12 seeds x 500 actions)' : `test/${n}.test.mjs`, ...parse(text) }); console.log(JSON.stringify(rows.at(-1)));
}
fs.mkdirSync(path.join(D1, 'results'), { recursive: true }); fs.writeFileSync(path.join(D1, 'results', 'tests.json'), JSON.stringify({ generated: new Date().toISOString(), node: process.version, rows }, null, 1));
