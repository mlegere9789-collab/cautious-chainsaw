// usage: node render.mjs <glb url path> <outdir> <jobsJSON>
// jobs: [{name, t, az, dist, tgtY, camY, w,h, fov}] -> PNG each
import {chromium} from '../../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, glb, outdir, jobsJson, speed = '0', w = '900', h = '900', fov = '28'] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsJson, 'utf8'));
fs.mkdirSync(outdir, {recursive: true});
const b = await chromium.launch({channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport: {width: +w, height: +h}});
p.on('console', m => { const t = m.text(); if (!/GPU stall|Failed to load resource: the server responded with a status of 404/.test(t)) console.log('console:', t); });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(`http://127.0.0.1:10760/tooling/viewer.html?glb=${encodeURIComponent(glb)}&speed=${speed}&w=${w}&h=${h}&fov=${fov}`);
await p.waitForFunction('document.title==="done"', null, {timeout: 120000});
console.log('STATS', JSON.stringify(await p.evaluate('window.STATS')));
for (const j of jobs) {
  await p.evaluate(([t, az, o]) => window.renderAt(t, az, o), [j.t ?? 0, j.az ?? 0, {dist: j.dist, tgtY: j.tgtY, camY: j.camY}]);
  const data = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(`${outdir}/${j.name}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
await b.close();
console.log('rendered', jobs.length);
