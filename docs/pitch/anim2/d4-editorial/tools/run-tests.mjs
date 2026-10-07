// tools/run-tests.mjs - runs the node tests of the fork (the new editorial tests, and the first prototype's engine tests that still apply) and writes results/tests.json (counts and durations).
//   node tools/run-tests.mjs [--quick]     --quick skips the long ones (fuzz, popups, assemble)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const quick = process.argv.includes('--quick');
const GROUPS = [['editorial (this language: sizing, anchors, layout and played frames with its footprint, names, hull, legend, colour)', ['editorial']], ['engine: layout, display, interpolation, time, data, tuning, extension, production reproduction, build', ['layout', 'display', 'interp', 'time', 'data', 'tuning', 'extend', 'production', 'build']], ...(quick ? [] : [['engine: fuzz (random actions on every API, three seeds), popups, assembled tours', ['fuzz', 'popups', 'assemble']]])];
const lines = []; let failed = 0;
for (const [name, files] of GROUPS) {
  const t0 = Date.now(); const r = spawnSync(process.execPath, ['--test', ...files.map((f) => path.join('test', f + '.test.mjs'))], { cwd: path.join(ROOT, 'studio'), encoding: 'utf8', maxBuffer: 1 << 28 }); const o = (r.stdout || '') + (r.stderr || '');
  const g = (k) => +(new RegExp("\u2139 " + k + " (\\d+)").exec(o) || [0, 0])[1]; const tests = g('tests'); const pass = g('pass'); const fail = g('fail'); failed += fail || (r.status ? 1 : 0);
  lines.push(`${name}: **${pass} of ${tests} pass**${fail ? `, ${fail} FAIL` : ''} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); console.log(lines.at(-1)); if (fail) console.log(o.split('\n').filter((l) => /✖|AssertionError|Error:/.test(l)).slice(0, 12).join('\n'));
}
{ const t0 = Date.now(); const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'contrast-tests.mjs')], { encoding: 'utf8' }); const m = /(\d+) checks, (\d+) failed/.exec(r.stdout || ''); lines.push(`colour tests (tools/contrast-tests.mjs): **${m ? m[1] - m[2] : '?'} of ${m ? m[1] : '?'} pass** (${((Date.now() - t0) / 1000).toFixed(0)} s)`); console.log(lines.at(-1)); failed += +(m ? m[2] : 1); }
fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results', 'tests.json'), JSON.stringify({ quick, lines, failed }, null, 1)); process.exitCode = failed ? 1 : 0;
