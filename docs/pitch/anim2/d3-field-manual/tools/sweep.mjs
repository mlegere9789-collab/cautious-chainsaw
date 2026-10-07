// tools/sweep.mjs - the zero-overlap sweep of the fork in REAL CHROME: a ladder of zooms by a spread of ticks (the three hotspots, the densest tick, the three days), the frame the page drew checked by a
// brute-force routine that shares no code with the engine (tools/lib.mjs verify): vital cores (the whole mark, every channel of it lives inside its box) overlapping, a pin lying under another mark, a unit no
// mark stands for, a place name under a mark, ink outside the footprint (checkSkin on the frame's own tiles), the engine's own verifier.
//   node tools/sweep.mjs [--ground=ink|real] [--viewport=1440x900] [--dpr=1] [--zooms=...] [--ticks=...]    -> results/sweep-<viewport>-<ground>.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, settle, verify, ROOT, args } from './lib.mjs';

const [VW, VH] = (args.viewport || '1440x900').split('x').map(Number); const DPR = +(args.dpr || 1); const GROUND = args.ground || 'ink';
const ZOOMS = (args.zooms || '11,12,13,13.5,14,15,16,17,18').split(',').map(Number); const TICKS = (args.ticks || '1,28,64,120,226,293,346,451,538,551,556,600,620,675').split(',').map(Number);
const srv = await startServer(); const s = await launch({ w: VW, h: VH, dpr: DPR, mobile: VW < 760, profile: 'sweep' + VW, query: `manual=1&backdrop=${GROUND === 'real' ? 'real-fm' : 'ink'}` });
const rows = []; const worst = { coreOverlaps: 0, pinCovered: 0, unrepresented: 0, namesUnderMarks: 0, inkOutsideFootprint: 0, engineOverlaps: 0, minClearancePx: Infinity }; const t0 = Date.now();
try {
  await s.page.evaluate(() => { const S = window.__studio; S.engine.tuning.set('popup.enabled', false); S.engine.tuning.set('layout.solveEvery', '1'); });
  for (const zoom of ZOOMS) for (const tick of TICKS) {
    await s.page.evaluate(({ zoom, tick }) => {
      const S = window.__studio; const E = S.engine; E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: false });
      const settleLocal = (max) => { for (let n = 0; n < max; n++) { const f = S.step(1); if (n > 6 && f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !E.busy()) break; } };
      settleLocal(200);
      if (zoom >= 14) {                                                         // centre on the densest part of the field at this tick, then settle again
        const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live'); let best = null; let bc = -1; const R = 90;
        for (const a of live) { let c = 0; for (const b of live) if (Math.abs(a.ax - b.ax) < R && Math.abs(a.ay - b.ay) < R) c++; if (c > bc) { bc = c; best = a; } }
        if (best) { const ll = E.camera.fromScreen(best.x + f.view.dx, best.y + f.view.dy); E.moveTo({ lat: ll[1], lng: ll[0], zoom: E.camera.zoom }, { glide: false, safe: false }); settleLocal(200); }
      }
    }, { zoom, tick });
    if (GROUND === 'real') await settle(s.page, { max: 300, minFrames: 8 });
    const v = await verify(s.page); rows.push({ zoom, tick, ...v });
    for (const k of ['coreOverlaps', 'pinCovered', 'unrepresented', 'namesUnderMarks', 'inkOutsideFootprint']) worst[k] = Math.max(worst[k], v[k]); worst.engineOverlaps = Math.max(worst.engineOverlaps, v.engineOverlaps || 0); if (v.minClearancePx !== null) worst.minClearancePx = Math.min(worst.minClearancePx, v.minClearancePx);
  }
  const eng = await s.page.evaluate(() => { const m = window.__studio.engine.metricsOf('after').summary(); return { frames: m.frames, overlapFrames: m.overlapFrames, overlapPairs: m.overlapPairs, unrepresentedUnitFrames: m.unrepresentedUnitFrames, clearanceViolations: m.clearanceViolations }; });
  const byZoom = ZOOMS.map((z) => { const r = rows.filter((q) => q.zoom === z); return { zoom: z, samples: r.length, mostTiles: Math.max(...r.map((q) => q.tiles)), mostAggregates: Math.max(...r.map((q) => q.aggregates)), mostNamed: Math.max(...r.map((q) => q.named)), violations: r.filter((q) => q.coreOverlaps || q.pinCovered || q.unrepresented || q.namesUnderMarks || q.inkOutsideFootprint || q.engineOverlaps).length }; });
  const out = { generated: new Date().toISOString(), viewport: [VW, VH], dpr: DPR, ground: GROUND, ua: await s.page.evaluate(() => navigator.userAgent), samples: rows.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), worst, engineTotals: eng, byZoom, errors: s.errors, requests: s.requests, rows };
  fs.writeFileSync(path.join(ROOT, 'results', `sweep-${VW}x${VH}-${GROUND}.json`), JSON.stringify(out));
  console.log(JSON.stringify({ samples: rows.length, seconds: out.seconds, worst, engineTotals: eng, errors: s.errors.length, requests: s.requests.length, byZoom }));
  const bad = rows.filter((q) => q.coreOverlaps || q.pinCovered || q.unrepresented || q.namesUnderMarks || q.inkOutsideFootprint || q.engineOverlaps); if (bad.length) { console.error('FAILED', JSON.stringify(bad.slice(0, 4))); process.exitCode = 1; }
} finally { await s.close(); srv.close(); }
