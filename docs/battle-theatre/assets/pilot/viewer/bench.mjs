import {chromium} from '../../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch({channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync']});
const p = await b.newPage({viewport: {width: 1280, height: 720}});
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://127.0.0.1:10760/tooling/bench.html');
await p.waitForFunction('document.title==="done"', null, {timeout: 120000});
const info = await p.evaluate('window.INFO');
console.log(JSON.stringify(info));
const out = {info, runs: []};
for (const N of [1, 4, 16, 64, 256, 512]) {
  const r = await p.evaluate(n => window.bench(n), N);
  console.log(JSON.stringify(r)); out.runs.push(r);
}
fs.writeFileSync('../out/bench_static_instanced.json', JSON.stringify(out, null, 1));
await b.close();
