// How many tiles does the Extra Features cluster lie on while Day 1 plays (it settles where the script puts it)?
import fs from 'node:fs';
import { boot, sleep, TREES, OUT } from './h.mjs';
import { install, setTick, setCam, snap, coverage } from './m.mjs';
const b = await boot('R1c', { cdpPort: 9542, profile: 'pill', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 5000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2000);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(2500);
s.setTiles('block');
const rows = [];
for (const z of [12, 13.5, 15.5]) {
  await setCam(page, -77.235, 39.812, z);
  for (let t = 1; t <= 675; t += 5) {
    await setTick(page, t); await sleep(60);
    const sn = await snap(page, null); const p = sn.popups.find((x) => x.name === 'extrafeatures');
    const c = coverage(sn, { names: new Set(['extrafeatures']) });
    rows.push({ z, tick: t, pill: p ? [Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h)] : null, tiles: c.anyTiles, half: c.anyHalf, labels: c.anyLabels, vis: c.tilesVisible });
  }
}
fs.writeFileSync(OUT + '/pillcover.json', JSON.stringify(rows));
for (const z of [12, 13.5, 15.5]) { const r = rows.filter((x) => x.z === z); console.log('z', z, 'mean tiles under pill', (r.reduce((a, x) => a + x.tiles, 0) / r.length).toFixed(2), 'max', Math.max(...r.map((x) => x.tiles)), 'samples with >=1', r.filter((x) => x.tiles > 0).length, '/', r.length, 'labels mean', (r.reduce((a, x) => a + x.labels, 0) / r.length).toFixed(2), 'pill positions', [...new Set(r.map((x) => String(x.pill)))].length); }
await b.close();
