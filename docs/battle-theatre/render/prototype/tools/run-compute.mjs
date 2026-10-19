// Drives prototype/compute.html (GPU compute microbenchmarks) and writes results/compute-<tag>.json. Usage: node run-compute.mjs [--nvidia]
import fs from 'node:fs'; import path from 'node:path';
import { launch } from './pw.mjs';
const nv = process.argv.includes('--nvidia'); const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const b = await launch({ extra: nv ? ['--force_high_performance_gpu'] : [] }); const p = await b.newPage(); const log = []; p.on('console', m => { if (m.type() === 'error') log.push(m.text().slice(0, 300)); });
await p.goto('http://127.0.0.1:10740/prototype/compute.html'); await p.waitForFunction(() => window.computeResult || window.computeError, null, { timeout: 300000 });
const r = await p.evaluate(() => window.computeResult || { error: window.computeError }); r.log = log.slice(0, 5);
fs.writeFileSync(path.resolve(here, '../../results/compute' + (nv ? '-nvidia' : '') + '.json'), JSON.stringify(r, null, 1));
for (const x of r.results || []) console.log(x.name.padEnd(16), JSON.stringify({ n: x.instances || x.soldiers || x.springs, bones: x.bones, gpuMs: x.gpuMsPerDispatch, wallMs: x.wallMsPerDispatch })); if (r.error) console.log(r.error); await b.close();
