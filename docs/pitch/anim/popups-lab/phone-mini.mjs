import { boot, sleep, TREES } from './h.mjs';
import { install, setTick } from './m.mjs';
const b = await boot('R1c', { cdpPort: 9546, profile: 'phonemini', viewport: { width: 390, height: 844, dpr: 2, mobile: true }, waitMs: 5000 });
const { page } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
const rows = [];
for (const t of [1, 2, 3, 5, 12, 20, 28, 100, 226, 300, 451, 553, 600]) { await setTick(page, t); await sleep(120); rows.push([t, await page.evaluate(() => { const m = document.querySelector('.gtbg-m-mini'); const box = m && m.children[1]; return box ? box.children.length : -1; }), await page.evaluate((t) => { const g = window.__store.getState(); return (g.placementsByTick[t] || []).length; }, t)]); }
console.log('tick, minimap dots on the phone, keyframes at exactly that tick');
console.log(rows.map((r) => r.join(': ')).join(' | '));
const withKf = await page.evaluate(() => Object.keys(window.__store.getState().placementsByTick).length);
console.log('ticks with keyframes in the store:', withKf);
await b.close();
