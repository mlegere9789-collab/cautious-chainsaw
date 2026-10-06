import { boot, sleep, TREES, SHOTS } from './h.mjs';
import { install, setTick, setCam, snap } from './m.mjs';
const b = await boot('R1c', { cdpPort: 9541, profile: 'phonerepaint', viewport: { width: 390, height: 844, dpr: 2, mobile: true }, waitMs: 5000 });
const { page, s } = b;
await install(page, TREES.R1c.entry);
await setTick(page, 28); await sleep(800);
const a = await snap(page, null);
await setCam(page, -77.235, 39.812, 15); await sleep(400);
const c = await snap(page, null);
await page.screenshot({ path: SHOTS + '/p09-phone-paused-zoom-stale-canvas.png' });
const proj = await page.evaluate(() => { const m = window.__t0map; return { zoom: m.getZoom() }; });
console.log(JSON.stringify({ before: { zoom: a.zoom, tiles: a.tiles.length }, afterJumpTo15: { zoom: proj.zoom, canvasTilesStillDrawnFromBefore: c.tiles.length, sameFirstTile: JSON.stringify(a.tiles[0]) === JSON.stringify(c.tiles[0]) } }));
// now force a tick repaint
await setTick(page, 29); await sleep(500);
const d = await snap(page, null);
console.log('after tick change tiles', d.tiles.length, 'first tile moved', JSON.stringify(d.tiles[0]) !== JSON.stringify(a.tiles[0]));
await b.close();
