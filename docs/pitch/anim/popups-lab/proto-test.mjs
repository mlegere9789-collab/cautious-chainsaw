import fs from 'node:fs';
import { boot, sleep, TREES, SHOTS, REPO } from './h.mjs';
import { install, setTick, setCam, snap, coverage } from './m.mjs';
const PHONE = process.env.PHONE === '1';
const b = await boot('R1c', { cdpPort: 9543, profile: PHONE ? 'protophone' : 'proto', viewport: PHONE ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false }, waitMs: 5000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2000);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(1500);
s.setTiles('block');
await page.addScriptTag({ content: fs.readFileSync(REPO + '/tools/time/build/gtbg-time.iife.js', 'utf8') });
await page.addScriptTag({ content: fs.readFileSync(REPO + '/docs/pitch/anim/popups-lab/proto.js', 'utf8') });
console.log('clock', await page.evaluate(() => typeof window.GTBGTime));
await page.evaluate(() => window.__proto.start());
const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); console.log('shot', name); };
const names = new Set(['proto']);
for (const [t, z, nm] of PHONE ? [[28, 13, 'p50-proto-tick28'], [553, 13, 'p51-proto-tick553']] : [[28, 13.5, 'd50-proto-tick28-z13.5'], [553, 13.5, 'd51-proto-tick553-z13.5'], [267, 13.5, 'd52-proto-tick267-z13.5'], [302, 15.5, 'd53-proto-tick302-z15.5']]) {
  await page.evaluate(() => window.__proto.clear());
  await setCam(page, -77.235, 39.812, z); await setTick(page, t === 28 ? 27 : t - 1); await sleep(200);
  await setTick(page, t); await sleep(500);
  await page.evaluate(() => window.__proto.settle()); await sleep(500);
  const sn = await snap(page, null);
  const c = coverage(sn, { names });
  console.log(nm, 'cards', sn.popups.filter((p) => p.name === 'proto').map((p) => `${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.w)}x${Math.round(p.h)}`).join(' '), 'tiles under proto', c.anyTiles, 'stats', JSON.stringify(await page.evaluate(() => ({ n: window.__proto.cards.size, noRoom: window.__proto.stats.noRoom }))));
  await shot(nm);
}
console.log('errors', JSON.stringify(s.collector.firstParty.slice(0, 3)));
await b.close();
