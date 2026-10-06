// The same 157 ticks x 3 zooms x 2 cameras as cover.mjs, with the prototype director instead of the app's cards.
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, REPO } from './h.mjs';
import { install, setTick, setCam, snap, coverage, inter, area, mapArea } from './m.mjs';
const PHONE = process.env.PHONE === '1';
const D = REPO + '/release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
const subjAt = (t) => [...new Set([...ev.filter((e) => e.tick === t).flatMap((e) => e.units_involved || []), ...vg.filter((v) => t >= v.trigger_tick && t <= v.trigger_tick + 2).flatMap((v) => v.units_featured || [])])];
const ticks = [...new Set([...ev.map((e) => e.tick), ...vg.flatMap((v) => [v.trigger_tick, v.trigger_tick + 1, v.trigger_tick + 2])])].filter((t) => t <= 675).sort((a, b) => a - b);
const LIM = +process.env.LIMIT || 1e9; ticks.splice(LIM);
const VP = PHONE ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false };
const ZOOMS = PHONE ? [12, 13, 15] : [12, 13.5, 15.5];
const forceRepaint = async (page, t) => { if (!PHONE) return; await setTick(page, Math.min(675, t + 1)); await sleep(30); };
const b = await boot('R1c', { cdpPort: +process.env.CDP || 9544, profile: PHONE ? 'pcphone' : 'pc', viewport: VP, waitMs: 3000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await page.evaluate(() => window.__store.getState().setTick(675)); await sleep(2500);
await page.evaluate(() => window.__store.getState().setTick(1)); await sleep(400);
s.setTiles('block');
await page.addScriptTag({ content: fs.readFileSync(REPO + '/tools/time/build/gtbg-time.iife.js', 'utf8') });
await page.addScriptTag({ content: fs.readFileSync(REPO + '/docs/pitch/anim/popups-lab/proto.js', 'utf8') });
await page.evaluate(() => { window.__proto.tokens.motion.move = 0; window.__proto.tokens.motion.enter = 0; window.__proto.tokens.motion.exit = 0; return window.__proto.start(); });
const names = new Set(['proto']);
const rows = [];
for (const t of ticks) {
  const ids = subjAt(t);
  for (const cam of ['def', 'follow']) {
    for (const z of ZOOMS) {
      let c0 = [-77.235, 39.812];
      if (cam === 'follow') {
        await page.evaluate(() => window.__proto.clear()); await setCam(page, -77.235, 39.812, z); await setTick(page, Math.max(1, t - 1)); await sleep(60);
        const s0 = await snap(page, ids); const onf = s0.subjects.filter((x) => x.onField); if (!onf.length) continue;
        c0 = [onf.reduce((a, x) => a + x.lng, 0) / onf.length, onf.reduce((a, x) => a + x.lat, 0) / onf.length];
      }
      await page.evaluate(() => window.__proto.clear());
      await setCam(page, c0[0], c0[1], z); await setTick(page, Math.max(1, t - 1)); await sleep(50);
      await page.evaluate(() => { const st = window.__proto.stats; st.ms.length = 0; st.noRoom = 0; st.forms = {}; });
      await setTick(page, t); await sleep(60);
      await page.evaluate(() => window.__proto.settle());
      await sleep(40);
      const sn = await snap(page, ids);
      const cv = coverage(sn, { names });
      const info = await page.evaluate(() => ({ forms: JSON.parse(JSON.stringify(window.__proto.stats.forms || {})), noRoom: window.__proto.stats.noRoom, ms: window.__proto.stats.ms.slice(), n: window.__proto.cards.size }));
      const placed = sn.popups.filter((p) => p.name === 'proto');
      // do two proto cards overlap each other?
      let pairOverlap = 0; for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) { const a = placed[i], b2 = placed[j]; if (a.x < b2.x + b2.w && b2.x < a.x + a.w && a.y < b2.y + b2.h && b2.y < a.y + a.h) pairOverlap++; }
      // do proto cards lie on persistent overlays?
      const A = mapArea(sn); let onOverlay = 0; const onNames = []; for (const p of placed) for (const o of sn.popups) if (['legend', 'minimap', 'hud', 'trailsbtn', 'tourbtn', 'navctrl', 'attrib', 'timeline', 'mlegend', 'mminimap', 'mtop', 'mdays'].includes(o.name)) { if (p.x < o.x + o.w && o.x < p.x + p.w && p.y < o.y + o.h && o.y < p.y + p.h) { onOverlay++; onNames.push(`${o.name}@${Math.round(o.x)},${Math.round(o.y)},${Math.round(o.w)}x${Math.round(o.h)} card@${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.w)}x${Math.round(p.h)}`); } }
      rows.push({ tick: t, cam, zoom: z, cards: placed.length, tilesUnder: cv.anyTiles, half: cv.anyHalf, labelsUnder: cv.anyLabels, subjCovered: cv.subjCovered, subjTotal: cv.subjTotal, pairOverlap, onOverlay, onNames, noRoom: info.noRoom, forms: info.forms, solveMs: info.ms });
    }
  }
  if (rows.length % 60 < 6) console.log('rows', rows.length, 'tick', t);
}
fs.writeFileSync(OUT + `/proto-cover${PHONE ? '-phone' : ''}.json`, JSON.stringify(rows));
const sum = {};
for (const cam of ['def', 'follow']) for (const z of ZOOMS) {
  const r = rows.filter((x) => x.cam === cam && x.zoom === z); if (!r.length) continue;
  const ms = r.flatMap((x) => x.solveMs); ms.sort((a, b) => a - b);
  const forms = {}; r.forEach((x) => Object.entries(x.forms).forEach(([k, v]) => { forms[k] = (forms[k] || 0) + v; }));
  sum[`${cam}@z${z}`] = { snapshots: r.length, cardsMean: +(r.reduce((a, x) => a + x.cards, 0) / r.length).toFixed(2), tilesUnderProtoMax: Math.max(...r.map((x) => x.tilesUnder)), snapshotsWithTileUnder: r.filter((x) => x.tilesUnder > 0).length, labelsUnderMax: Math.max(...r.map((x) => x.labelsUnder)), subjectTilesCovered: r.reduce((a, x) => a + x.subjCovered, 0), subjectTilesTotal: r.reduce((a, x) => a + x.subjTotal, 0), cardPairsOverlapping: r.reduce((a, x) => a + x.pairOverlap, 0), cardsOnPersistentOverlays: r.reduce((a, x) => a + x.onOverlay, 0), noRoom: r.reduce((a, x) => a + (x.noRoom > 0 ? 1 : 0), 0), forms, solveMsP50: ms.length ? +ms[Math.floor(ms.length / 2)].toFixed(2) : null, solveMsP95: ms.length ? +ms[Math.floor(ms.length * .95)].toFixed(2) : null, solveMsMax: ms.length ? +ms[ms.length - 1].toFixed(2) : null };
}
console.log(JSON.stringify(sum, null, 1));
fs.writeFileSync(OUT + `/proto-cover-summary${PHONE ? '-phone' : ''}.json`, JSON.stringify(sum, null, 1));
await b.close();
