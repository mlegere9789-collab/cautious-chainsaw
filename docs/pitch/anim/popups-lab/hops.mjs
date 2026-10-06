// Does the Extra Features cluster hop while the animation plays? Poll its rect every 100 ms during 1x playback of the first 90 ticks of day 1 (default camera).
import fs from 'node:fs';
import { boot, sleep, TREES, OUT } from './h.mjs';
import { install, setTick } from './m.mjs';
const which = process.argv[2] || 'R1c';
const b = await boot(which, { cdpPort: 9539, profile: 'hops', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 3500 });
const { page, s } = b;
await install(page, TREES[which].entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(2500);
s.setTiles('block');
await page.evaluate(() => { const g = window.__store.getState(); g.setSpeed(1); g.setPlaying(true); });
const rows = []; const t0 = Date.now(); let last = '';
for (;;) {
  const r = await page.evaluate(() => { const p = document.getElementById('extra-features'); const q = p.getBoundingClientRect(); const g = window.__store.getState(); return { tick: g.currentTick, x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height), vis: getComputedStyle(p).visibility, op: +getComputedStyle(p).opacity, tr: getComputedStyle(p).transitionProperty }; });
  const key = `${r.x},${r.y},${r.w},${r.h}`; if (key !== last) { rows.push({ ms: Date.now() - t0, ...r }); last = key; }
  if (r.tick >= 95 || Date.now() - t0 > 80000) break;
  await sleep(100);
}
await page.evaluate(() => window.__store.getState().setPlaying(false));
console.log(JSON.stringify(rows));
fs.writeFileSync(OUT + '/hops-R1c.json', JSON.stringify(rows));
console.log('distinct positions', rows.length, 'hops', rows.length - 1, 'wall s', Math.round((Date.now() - t0) / 1000));
await b.close();
