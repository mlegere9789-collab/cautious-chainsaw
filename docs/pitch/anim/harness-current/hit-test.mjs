// usage: node hit-test.mjs <baseline|r1c>  - real clicks vs the model's prediction of what the app picks
import { serve, open, boot, sleep, PROBE, setTick, camera, mapView, tileBudget, wj, WORK } from './common.mjs';
import { picker } from './hit-model.mjs';
const which = process.argv[2] || 'r1c';
const srv = await serve(which); const S = await open({ vp: 'desktop' }); await S.page.addInitScript(PROBE); const P = S.page;
const out = { build: which, tick: 150, results: [] }; let res0 = null;
const glow = async () => P.evaluate(() => { const f = window.__probe.last(); if (!f) return null; const g = f.tiles.filter((t) => t.shadow === 14); return g.map((t) => [t.x, t.y]); });
const redraw = async () => { await P.evaluate(() => window.__probe.start()); await setTick(P, 149); await sleep(150); await setTick(P, 150); await sleep(450); };
try {
  await boot(S, srv.url); await sleep(1200);
  for (const z of [11, 14, 17]) {
    const center = [-77.2455, 39.822];
    await camera(P, { center, zoom: z }); await sleep(2300); await redraw();
    const mv = await mapView(P); const pk = picker(150, mv.zoom, mv.center); res0 = { camera: mv };
    // isolated tile with room to the right
    const cand = pk.tiles.filter((t) => t.x > 150 && t.x < 900 && t.y > 100 && t.y < 650).map((t) => ({ t, nn: Math.min(...pk.tiles.filter((u) => u !== t).map((u) => Math.hypot(u.x - t.x, u.y - t.y))) })).sort((a, b) => b.nn - a.nn)[0];
    if (!cand) { out.results.push({ zoom: z, error: 'no isolated tile' }); continue; }
    const T = cand.t; const res = { zoom: z, camera: res0.camera, tileId: T.id, tileW: T.w, tileH: T.h, ang: T.ang, nearestOtherPx: Math.round(cand.nn), clicks: [] };
    for (const dx of [0, Math.round(T.w / 2) - 3, 8, 20, 50, 150, 400]) {
      const x = T.x + dx, y = T.y; if (x > 1400) continue;
      const predicted = pk.pick(x, y);
      await P.mouse.click(x, y + 48); await sleep(250); await redraw();
      const g = await glow(); let observed = null;
      if (g && g.length) { const m = pk.tiles.map((t) => ({ id: t.id, d: Math.hypot(t.x - g[0][0], t.y - g[0][1]) })).sort((a, b) => a.d - b.d)[0]; observed = m.d < 2 ? m.id : '(unmatched glow)'; }
      res.clicks.push({ dx, onTile: Math.abs(dx) <= T.w / 2, predicted, observed, modelAgrees: predicted === observed, selectedOwn: observed === T.id });
    }
    out.results.push(res); console.log(JSON.stringify(res));
  }
  wj(`${WORK}/hit-${which}.json`, out); console.log('tiles used', tileBudget.used);
} finally { await S.close(); await srv.close(); }
