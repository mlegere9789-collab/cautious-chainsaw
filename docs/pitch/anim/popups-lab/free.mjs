// Free-space study: at every event/story tick, does a card-sized rectangle exist that touches no tile, label, dot or persistent overlay?
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, REPO } from './h.mjs';
import { install, setTick, setCam, snap, freeSpace } from './m.mjs';
const which = process.argv[2] || 'R1c';
const PHONE = process.env.PHONE === '1';
const D = REPO + '/release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
const subjAt = (t) => [...new Set([...ev.filter((e) => e.tick === t).flatMap((e) => e.units_involved || []), ...vg.filter((v) => t >= v.trigger_tick && t <= v.trigger_tick + 2).flatMap((v) => v.units_featured || [])])];
const ticks = [...new Set([...ev.map((e) => e.tick), ...vg.flatMap((v) => [v.trigger_tick, v.trigger_tick + 1, v.trigger_tick + 2])])].filter((t) => t <= 675).sort((a, b) => a - b);
const VP = PHONE ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false };
const OBST = new Set(PHONE ? ['mlegend', 'mminimap', 'mtop', 'mdays', 'timeline'] : ['hud', 'legend', 'minimap', 'trailsbtn', 'tourbtn', 'navctrl', 'attrib', 'timeline']);
const SIZES = PHONE ? { eventCard: [374, 150], storyCard: [374, 230], toast: [374, 92], chip: [374, 44] } : { eventCard: [460, 150], eventCardTall: [460, 215], storyCard: [340, 500], storyPeek: [340, 160], toast: [300, 92], chip: [240, 44] };
const ZOOMS = PHONE ? [12, 13, 15] : [12, 13.5, 15.5];
const forceRepaint = async (page, t) => { if (!PHONE) return; await setTick(page, Math.min(675, t + 1)); await setTick(page, t); await sleep(70); };
const b = await boot(which, { cdpPort: PHONE ? 9537 : 9531, profile: PHONE ? 'freephone' : 'free', viewport: VP, waitMs: 3000 });
const { page, s } = b;
await install(page, TREES[which].entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(400);
s.setTiles('block');
const rows = [];
for (const t of ticks) {
  await setTick(page, t); await sleep(120);
  const ids = subjAt(t);
  for (const z of ZOOMS) {
    await setCam(page, -77.235, 39.812, z); await forceRepaint(page, t); await sleep(35);
    const sn = await snap(page, ids);
    const fd = freeSpace(sn, { obstacleNames: OBST, sizes: SIZES });
    let ff = null; const onf = sn.subjects.filter((x) => x.onField);
    if (onf.length) {
      await setCam(page, onf.reduce((a, x) => a + x.lng, 0) / onf.length, onf.reduce((a, x) => a + x.lat, 0) / onf.length, z); await forceRepaint(page, t); await sleep(35);
      ff = freeSpace(await snap(page, ids), { obstacleNames: OBST, sizes: SIZES });
    }
    rows.push({ tick: t, zoom: z, def: fd, follow: ff });
  }
}
fs.writeFileSync(OUT + `/free-${which}${PHONE ? '-phone' : ''}.json`, JSON.stringify({ sizes: SIZES, zooms: ZOOMS, rows }));
const sum = {};
for (const cam of ['def', 'follow']) for (const z of ZOOMS) {
  const r = rows.filter((x) => x.zoom === z && x[cam]); const o = { snapshots: r.length, occupiedShareMean: +(r.reduce((a, x) => a + x[cam].occupiedShare, 0) / r.length).toFixed(3), largestFreeMean: Math.round(r.reduce((a, x) => a + x[cam].largest.area * 0, 0)) };
  const areas = r.map((x) => x[cam].largest.w * x[cam].largest.h).sort((a, b) => a - b); o.largestFreeAreaMedianPx2 = areas[Math.floor(areas.length / 2)]; o.largestFreeAreaMinPx2 = areas[0];
  for (const k of Object.keys(SIZES)) o[`${k}Fits`] = r.filter((x) => x[cam][k]).length;
  sum[`${cam}@z${z}`] = o;
}
console.log(JSON.stringify(sum, null, 1));
fs.writeFileSync(OUT + `/free-summary-${which}${PHONE ? '-phone' : ''}.json`, JSON.stringify(sum, null, 1));
await b.close();
