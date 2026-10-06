// Static coverage study: at every tick where a transient popup exists (event cards, story cards) and at every 5th tick,
// at three zoom levels, how many unit tiles/labels does a popup cover, and do popups cover the tiles the popup is about?
// Tiles come from the real unit canvas (captured draw calls) of the real app in real Chrome; popups from the real DOM.
import fs from 'node:fs';
import { boot, sleep, TREES, OUT, REPO } from './h.mjs';
import { install, setTick, setCam, snap, coverage, inter, area, P2R, mapArea } from './m.mjs';

const which = process.argv[2] || 'R1c';
const D = REPO + '/release/R1c/dist/data/';
const J = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const ev = [1, 2, 3].flatMap((d) => J(`chronology_day${d}.json`).events).filter((e) => e.significance !== 'low');
const vg = [1, 2, 3].flatMap((p) => J(`vignettes_part${p}.json`).vignettes);
const subjAt = (t) => [...new Set([...ev.filter((e) => e.tick === t).flatMap((e) => e.units_involved || []), ...vg.filter((v) => t >= v.trigger_tick && t <= v.trigger_tick + 2).flatMap((v) => v.units_featured || [])])];
const eventTicks = ev.map((e) => e.tick);
const storyTicks = vg.flatMap((v) => [v.trigger_tick, v.trigger_tick + 1, v.trigger_tick + 2]);
const ticks = [...new Set([...eventTicks, ...storyTicks])].filter((t) => t <= 675).sort((a, b) => a - b);
const sample5 = []; for (let t = 1; t <= 675; t += 5) sample5.push(t);
const LIM = +process.env.LIMIT || 1e9; ticks.splice(LIM); sample5.splice(LIM);

const PHONE = process.env.PHONE === '1';
const VP = PHONE ? { width: 390, height: 844, dpr: 2, mobile: true } : { width: 1440, height: 900, dpr: 1, mobile: false };
const PERSIST_NAMES = new Set(PHONE ? ['mlegend', 'mminimap', 'mtop', 'mdays', 'timeline'] : ['hud', 'legend', 'minimap', 'trailsbtn', 'tourbtn', 'navctrl', 'attrib', 'timeline']);
const TRANS_NAMES = new Set(['event', 'story', 'toast']);
const SUF = PHONE ? '-phone' : '';
const forceRepaint = async (page, t) => { if (!PHONE) return; await setTick(page, Math.min(675, t + 1)); await setTick(page, t); await sleep(70); };
const b = await boot(which, { cdpPort: PHONE ? 9534 : 9531, profile: PHONE ? 'coverphone' : 'cover', viewport: VP, waitMs: 3000 });
const { page, s } = b;
await page.waitForFunction(() => { try { return true; } catch { return false; } });
await install(page, TREES[which].entry);
// all three days loaded
await page.evaluate(() => { const g = window.__store.getState(); g.setTick(675); });
await sleep(3000);
await page.evaluate(() => window.__store.getState().setTick(1));
await sleep(500);
s.setTiles('block'); // no further Mapbox requests: unit geometry does not depend on the base-map tiles
const ZOOMS = PHONE ? [12, 13, 15] : [12, 13.5, 15.5];
const DEF = [-77.235, 39.812];
const results = { which, vp: VP, zooms: ZOOMS, event: [], sample5: [] };
const t0 = Date.now();

// ------------- S-A: event + story ticks
for (const t of ticks) {
  await setTick(page, t);
  // wait for the cards that must exist
  const wantEvent = eventTicks.includes(t), wantStory = storyTicks.includes(t);
  for (let i = 0; i < 20; i++) {
    const have = await page.evaluate(() => ({ e: !!document.querySelector('[data-gtbg-card="1"]'), s: !!document.querySelector('[data-gtbg-card="2"]') }));
    if ((!wantEvent || have.e) && (!wantStory || have.s)) break;
    await sleep(60);
  }
  const ids = subjAt(t);
  for (const z of ZOOMS) {
    // default camera
    await setCam(page, DEF[0], DEF[1], z); await forceRepaint(page, t); await sleep(40);
    const sn = await snap(page, ids);
    const c = coverage(sn, { names: TRANS_NAMES });
    const cp = coverage(sn, { names: PERSIST_NAMES });
    const ca = coverage(sn);
    // follow camera: centroid of subject tiles
    let follow = null;
    const onf = sn.subjects.filter((x) => x.onField);
    if (onf.length) {
      const lng = onf.reduce((a, x) => a + x.lng, 0) / onf.length, lat = onf.reduce((a, x) => a + x.lat, 0) / onf.length;
      await setCam(page, lng, lat, z); await forceRepaint(page, t); await sleep(40);
      const sf = await snap(page, ids);
      follow = { transient: coverage(sf, { names: TRANS_NAMES }), persistent: coverage(sf, { names: PERSIST_NAMES }), popups: sf.popups.filter((p) => ['event', 'story', 'toast'].includes(p.name)).map((p) => `${p.name}:${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.w)}x${Math.round(p.h)}`) };
    }
    results.event.push({ tick: t, zoom: z, hasEvent: wantEvent, hasStory: wantStory, nSubj: ids.length, onField: onf.length, def: { transient: c, persistent: cp, all: ca, popups: sn.popups.filter((p) => ['event', 'story', 'toast'].includes(p.name)).map((p) => `${p.name}:${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.w)}x${Math.round(p.h)}`) }, follow });
  }
  if (results.event.length % 60 === 0) console.log('event/story snaps', results.event.length, 'elapsed s', Math.round((Date.now() - t0) / 1000));
}
fs.writeFileSync(OUT + `/cover-event-${which}${SUF}.json`, JSON.stringify(results));

// ------------- S-C: every 5th tick, persistent overlays on the default camera
await page.evaluate(() => window.__t0map.jumpTo({ center: [-77.235, 39.812], zoom: 13.5 }));
for (const z of ZOOMS) {
  await setCam(page, DEF[0], DEF[1], z);
  for (const t of sample5) {
    await setTick(page, t); await sleep(70);
    const sn = await snap(page, null);
    const cp = coverage(sn, { names: PERSIST_NAMES });
    const ca = coverage(sn);
    // would the unit panel (opened by selecting a tile) lie on top of the tile that opened it? panel rect 16..296 x 60..(60+654)
    const panel = { x0: 16, y0: 60, x1: 296, y1: 60 + 654 };
    const A = mapArea(sn);
    const vis = sn.tiles.filter((x) => inter(x, A) > 0);
    const underPanel = vis.filter((x) => { const cx = (x.x0 + x.x1) / 2, cy = (x.y0 + x.y1) / 2; return cx >= panel.x0 && cx <= panel.x1 && cy >= panel.y0 && cy <= panel.y1; }).length;
    results.sample5.push({ tick: t, zoom: z, tiles: cp.tilesVisible, labels: cp.labelsVisible, persistentTiles: cp.anyTiles, persistentHalf: cp.anyHalf, persistentLabels: cp.anyLabels, byPopup: cp.byPopup, underPanel, popupsPresent: [...new Set(sn.popups.map((p) => p.name))] });
  }
  console.log('sample5 zoom', z, 'done; elapsed s', Math.round((Date.now() - t0) / 1000));
}
fs.writeFileSync(OUT + `/cover-${which}${SUF}.json`, JSON.stringify(results));
console.log('tiles used', JSON.stringify({ seen: s.tileStats.seen }), 'errors', JSON.stringify(s.collector.firstParty.slice(0, 3)));
await b.close();
