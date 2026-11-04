// Runs every test file of the page shell one after another (each opens its own Chrome and its own server port) and writes tests/results-summary.json.
//   node docs/battle-theatre/app/tests/run-all.mjs [--skip perf,leak]
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const skip = (process.argv.includes('--skip') ? process.argv[process.argv.indexOf('--skip') + 1] : '').split(',').filter(Boolean);
const files = ['unit.test.mjs', 'history.test.mjs', 'claims.test.mjs', 'daypos.test.mjs', 'sibling.test.mjs', 'casualties.test.mjs', 'manifest.test.mjs', 'structures3d.test.mjs', 'leak.spec.mjs', 'scrub.spec.mjs', 'arrival.spec.mjs', 'real.spec.mjs', 'casualties.spec.mjs', 'ui.spec.mjs', 'sky.spec.mjs', 'webgl2.spec.mjs', 'structures3d.spec.mjs', 'perf.spec.mjs'].filter(f => !skip.some(s => f.startsWith(s)));
const summary = [];
for (const f of files) {
  const t0 = Date.now(), r = spawnSync(process.execPath, ['--test', path.join(here, f)], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 20 * 60 * 1000 });
  const out = (r.stdout || '') + (r.stderr || ''), n = k => +(new RegExp('ℹ ' + k + ' (\\d+)').exec(out) || [0, 0])[1];
  summary.push({ file: f, tests: n('tests'), pass: n('pass'), fail: n('fail'), seconds: Math.round((Date.now() - t0) / 100) / 10 });
  console.log(`${n('fail') || r.status ? 'FAIL' : 'ok  '} ${f}: ${n('pass')}/${n('tests')} passed in ${summary.at(-1).seconds} s`); if (n('fail') || r.status) console.log(out.split('\n').filter(l => /^(✖|# |  AssertionError|  Error)/.test(l)).slice(0, 30).join('\n'));
  else console.log(out.split('\n').filter(l => l.startsWith('# ')).join('\n'));
}
fs.writeFileSync(path.join(here, 'results-summary.json'), JSON.stringify({ when: new Date().toISOString(), node: process.version, summary }, null, 1));
const bad = summary.filter(s => s.fail || s.tests === 0); console.log(bad.length ? `${bad.length} file(s) failed` : 'all green'); process.exit(bad.length ? 1 : 0);
