// usage: node shots.mjs <baseline|r1c> <desktop|phone>
// Screenshot catalogue of how the unit tiles look and behave today. Real Chrome, real input, tiles only through the harness (<= 300 requests per process).
import fs from 'node:fs';
import path from 'node:path';
import { serve, open, boot, readState, sleep, PROBE, setTick, clickSpeed, playPause, tickNow, camera, mapView, tileBudget, wj, WORK, SHOTS, cdpFor } from './common.mjs';
const which = process.argv[2] || 'r1c'; const vp = process.argv[3] || 'desktop';
const tag = which === 'baseline' ? 'baseline' : 'r1c';
const srv = await serve(which);
const S = await open({ vp });
await S.page.addInitScript(PROBE);
const P = S.page;
fs.mkdirSync(SHOTS, { recursive: true });
const manifest = { build: which, vp, shots: [], frames: {}, startedAt: new Date().toISOString() };
const ANGLE = [-77.2364, 39.81343];
const shot = async (name, note, opts = {}) => {
  const f = path.join(SHOTS, `${tag}-${vp}-${name}.jpg`);
  await P.screenshot({ path: f, type: 'jpeg', quality: 90, ...opts });
  manifest.shots.push({ file: `shots/current/${tag}-${vp}-${name}.jpg`, note, tick: await tickNow(P), camera: await mapView(P) });
  console.log('shot', name);
};
const frameOf = () => P.evaluate(() => { const f = window.__probe.last(); return f ? { raf: f.raf, t: f.t, cw: f.cw, ch: f.ch, tick: f.tick, tiles: f.tiles, dots: f.dots, labels: f.labels, leaders: f.leaders, fps: f.fps || null } : null; });
const redraw = async (t) => { await setTick(P, t > 1 ? t - 1 : 2); await sleep(120); await setTick(P, t); await sleep(500); };
const gotoScene = async (t, cam) => { if (cam) { await camera(P, cam); await sleep(2300); } await redraw(t); };
const isPhone = vp === 'phone';
try {
  await boot(S, srv.url, { layout: isPhone ? 'mobile' : 'desktop' });
  await sleep(2500);
  await P.evaluate(() => window.__probe.start());
  await shot('01-load-tick1', 'right after load (baseline: after the fast-forward intro and the layout chooser)');
  manifest.frames['load-t1'] = await frameOf();
  // natural-use warm-up so that baseline has lazily loaded days 2 and 3 (it loads them on the first playback past tick 200 / 420)
  if (!isPhone) { await setTick(P, 421); await sleep(300); await clickSpeed(P, '8x'); await playPause(P); await sleep(2500); await playPause(P); await sleep(600); }
  else { await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /play|▶/i.test(x.title + x.textContent + (x.getAttribute('aria-label') || ''))); if (b) b.click(); }); await sleep(2500); await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /pause|⏸/i.test(x.title + x.textContent + (x.getAttribute('aria-label') || ''))); if (b) b.click(); }); }
  await gotoScene(546, null);
  await shot('02-dense-t546-default-camera', 'tick 546 (Pickett\'s Charge) at the default camera');
  manifest.frames['dense-t546-z13.5'] = await frameOf();
  // zoom ladder at The Angle, tick 556
  const zs = isPhone ? [11, 13, 15, 17, 18] : [11, 12, 13, 14, 15, 16, 17, 18];
  for (const z of zs) {
    await gotoScene(556, { center: ANGLE, zoom: z });
    await shot(`10-zoom-z${z}-the-angle-t556`, `zoom ${z} centred on The Angle (terrain.json key location), tick 556`);
    manifest.frames[`z${z}-angle-t556`] = await frameOf();
  }
  // back to the default camera for popups and interaction
  await gotoScene(556, { center: [-77.235, 39.812], zoom: 14 });
  await shot('20-popups-t556-z14', 'tick 556: vignette card, event toast and unit layer together (z14)');
  manifest.frames['popups-t556-z14'] = await frameOf();
  if (!isPhone) {
    // legend tabs
    await gotoScene(546, { center: [-77.235, 39.812], zoom: 13.5 });
    for (const [lab, name] of [['Sides', '30-legend-sides'], ['Size', '31-legend-size'], ['Disposition', '32-legend-disposition']]) { await P.locator(`button:text-is("${lab}")`).first().click(); await sleep(250); await shot(name, `legend tab ${lab}`, { clip: { x: 0, y: 360, width: 300, height: 400 } }); }
    // filter panel
    await P.keyboard.press('f'); await sleep(400); await shot('33-filter-panel', 'filter panel (key F)'); await P.keyboard.press('f'); await sleep(300);
    // selection: pick an isolated tile in view and click it
    await camera(P, { center: [-77.2455, 39.822], zoom: 15 }); await sleep(2300); await redraw(150);
    const fr = await frameOf(); const t = fr.tiles.filter((x) => x.x > 250 && x.x < 1100 && x.y > 120 && x.y < 600).map((x) => ({ x, nn: Math.min(...fr.tiles.filter((u) => u !== x).map((u) => Math.hypot(u.x - x.x, u.y - x.y))) })).sort((a, b) => b.nn - a.nn)[0];
    await shot('40-before-select-t150-z15', 'before selecting (tick 150, z15)');
    await P.mouse.click(t.x.x, t.x.y + 48); await sleep(900);
    await shot('41-selected-unit-t150-z15', 'after clicking the tile: glow, larger label, info panel');
    manifest.frames['selected-t150-z15'] = await frameOf();
    await P.mouse.move(t.x.x + 40, t.x.y + 48 + 30); await sleep(400);
    await shot('42-hover-over-tile', 'mouse hovering near the selected tile (no hover reaction exists in code)');
    await P.keyboard.press('Escape'); await sleep(300);
    // night tint
    await camera(P, { center: [-77.235, 39.812], zoom: 13.5 }); await sleep(1500); await redraw(220); await sleep(1500);
    await shot('50-night-tint-t220', 'tick 220: the dusk/night tint overlay (multiply blend, 8 s transition)');
    // live playback frames at 1x around tick 548-556 (popups, flashes, glow)
    await redraw(546); await clickSpeed(P, '1x'); await P.evaluate(() => window.__probe.start()); await playPause(P);
    for (let i = 0; i < 4; i++) { await sleep(1500); await shot(`60-playing-1x-${i + 1}`, `playing at 1x, frame ${i + 1} of 4 (tick advances 3 per 1.5 s)`); }
    await playPause(P);
  } else {
    await redraw(150);
    await shot('40-phone-t150-default-camera-z13', 'phone: tick 150, default camera');
  }
  wj(`${WORK}/shots-${tag}-${vp}.json`, manifest);
  console.log('tiles used', tileBudget.used);
} finally { await S.close(); await srv.close(); }
