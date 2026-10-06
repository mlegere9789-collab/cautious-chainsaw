// usage: node tests-input.mjs <baseline|r1c>
// Input behaviour of the unit layer: does the map still pan / zoom with the mouse, does the layer follow the camera, how large is the click target
// of a tile at each zoom, is there any hover reaction.
import fs from 'node:fs';
import { serve, open, boot, readState, sleep, PROBE, setTick, camera, mapView, tileBudget, wj, WORK, mouseDrag, wheel } from './common.mjs';
const which = process.argv[2] || 'baseline';
const srv = await serve(which);
const S = await open({ vp: 'desktop' });
await S.page.addInitScript(PROBE);
const P = S.page;
const out = { build: which, startedAt: new Date().toISOString() };
const last = () => P.evaluate(() => { const f = window.__probe.last(); return f ? { n: f.tiles.length, t: f.t, tiles: f.tiles.map((t) => [t.x, t.y, t.w, t.h, t.shadow, t.ang]), labels: f.labels.map((l) => l.text) } : null; });
const frames = () => P.evaluate(() => window.__probe.frameCount());
const sel = (f) => (f ? f.tiles.filter((t) => t[4] === 14).length : 0);
try {
  await boot(S, srv.url); await sleep(1500);
  // warm: make sure data of day 1 is on screen; tick 150 has 24 first appearances in day 1
  await P.evaluate(() => window.__probe.start());
  await setTick(P, 150); await sleep(700);
  // 1. mouse pan and wheel zoom (real CDP input)
  const m0 = await mapView(P); const f0 = await frames();
  await mouseDrag(P, [700, 450], [500, 350], { steps: 14 }); await sleep(700);
  const m1 = await mapView(P); const f1 = await frames();
  await wheel(P, 700, 450, -300); await sleep(900);
  const m2 = await mapView(P); const f2 = await frames();
  out.mouse = { dragMovedCamera: Math.hypot(m1.center[0] - m0.center[0], m1.center[1] - m0.center[1]) > 1e-6, centerBefore: m0.center, centerAfterDrag: m1.center, wheelChangedZoom: Math.abs(m2.zoom - m1.zoom) > 1e-3, zoomBeforeWheel: m1.zoom, zoomAfterWheel: m2.zoom, unitRedrawsDuringDrag: f1 - f0, unitRedrawsDuringWheel: f2 - f1 };
  // does the unit layer follow the camera when paused? compare drawn tiles with the camera: re-project known place (Cemetery Hill) is not drawn, so use redraw count + staleness flag
  console.log(JSON.stringify(out.mouse));
  // 2. hit target size by zoom: pick an isolated tile, click at growing screen offsets along +x from its drawn centre
  out.hit = [];
  for (const z of [11, 13, 15, 17]) {
    await camera(P, { center: [-77.2455, 39.822], zoom: z }); await sleep(2200);
    await setTick(P, 149); await sleep(200); await setTick(P, 150); await sleep(600);
    const fr = await last(); if (!fr) { out.hit.push({ zoom: z, error: 'no frame' }); continue; }
    // isolated tile: farthest from every other tile and well inside the view
    let best = null;
    fr.tiles.forEach((t, i) => { if (t[0] < 150 || t[0] > 1290 || t[1] < 80 || t[1] > 700) return; let nn = 1e9; fr.tiles.forEach((u, j) => { if (j !== i) nn = Math.min(nn, Math.hypot(u[0] - t[0], u[1] - t[1])); }); if (!best || nn > best.nn) best = { i, t, nn }; });
    if (!best) { out.hit.push({ zoom: z, error: 'no isolated tile', n: fr.n }); continue; }
    const [x, y, w, h] = best.t; const res = { zoom: z, tilesInView: fr.n, tileW: w, tileH: h, nearestOtherPx: Math.round(best.nn), results: [] };
    for (const dx of [0, w / 2 - 2, 10, 30, 60, 120, 250]) {
      const cx = x + dx, cy = y + 48; // canvas top is at y=48 in the page
      if (cx > 1380) continue;
      await P.evaluate(() => window.__probe.start());
      await P.mouse.click(cx, cy); await sleep(500);
      const after = await last();
      res.results.push({ clickOffsetPx: Math.round(dx), selectedAfterClick: sel(after) > 0 });
      // clear selection by clicking far from any tile (also an app behaviour: click on empty ground deselects)
      await P.mouse.click(1380, 700); await sleep(250);
    }
    out.hit.push(res); console.log(JSON.stringify(res));
  }
  // 3. hover: move over a tile, compare drawn state and DOM overlays
  await camera(P, { center: [-77.2455, 39.822], zoom: 15 }); await sleep(2000); await setTick(P, 149); await setTick(P, 150); await sleep(500);
  const fh = await last(); const t0 = fh.tiles.find((t) => t[0] > 300 && t[0] < 1100 && t[1] > 120 && t[1] < 600);
  const before = await P.evaluate(() => document.querySelectorAll('[style*="position: fixed"]').length);
  await P.mouse.move(t0[0], t0[1] + 48); await sleep(600);
  const cursor = await P.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return { tag: el && el.tagName, cursor: el && getComputedStyle(el).cursor }; }, [t0[0], t0[1] + 48]);
  const after = await P.evaluate(() => document.querySelectorAll('[style*="position: fixed"]').length);
  out.hover = { fixedOverlaysBefore: before, fixedOverlaysAfterHover: after, elementUnderPointer: cursor, tileGlowOnHover: sel(await last()) };
  await P.screenshot({ path: `${WORK}/hover-${which}.png`, clip: { x: Math.max(0, t0[0] - 120), y: Math.max(0, t0[1] + 48 - 80), width: 240, height: 160 } });
  await P.mouse.move(1300, 650); await sleep(300);
  await P.screenshot({ path: `${WORK}/nohover-${which}.png`, clip: { x: Math.max(0, t0[0] - 120), y: Math.max(0, t0[1] + 48 - 80), width: 240, height: 160 } });
  console.log(JSON.stringify(out.hover));
  // 4. canvas backing store vs device pixels
  out.canvas = await P.evaluate(() => { const c = [...document.querySelectorAll('canvas')].filter((c) => c.style.zIndex === '10'); return c.map((c) => ({ width: c.width, height: c.height, cssW: c.getBoundingClientRect().width, cssH: c.getBoundingClientRect().height, dpr: devicePixelRatio, pointerEvents: getComputedStyle(c).pointerEvents })); });
  out.trailCanvas = await P.evaluate(() => [...document.querySelectorAll('canvas')].filter((c) => c.style.zIndex === '8').map((c) => ({ width: c.width, height: c.height, cssW: c.getBoundingClientRect().width, cssH: c.getBoundingClientRect().height })));
  console.log(JSON.stringify(out.canvas), JSON.stringify(out.trailCanvas));
  wj(`${WORK}/input-${which}.json`, out);
  console.log('tiles used', tileBudget.used);
} finally { await S.close(); await srv.close(); }
