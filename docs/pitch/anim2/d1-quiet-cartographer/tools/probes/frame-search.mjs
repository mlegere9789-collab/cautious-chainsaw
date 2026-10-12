// tools/probes/frame-search.mjs - for each scene, the pan (screen px) that keeps every visible mark out of the interface's margin (top bar, dock, rail) while keeping the most marks in view.
// The layout is a function of the tick and the zoom only (not of the camera), so one settled frame gives every mark's footprint and a pan is a plain translation: no re-solve is needed.
//   node tools/probes/frame-search.mjs --scenes=s1a,s2 [--max=140] [--vp=1440x900]
import { open, setScene, args, stopServer } from '../lib.mjs';
const ANGLE = [39.8117, -77.2347];
const SC = { s1a: [551, 39.81592, -77.23677, 13.5], s1b: [556, ANGLE[0], ANGLE[1], 15], s2: [295, 39.7992, -77.2414, 15], s3: [346, 39.8189, -77.2262, 15.5], s4: [551, ANGLE[0], ANGLE[1], 16.5], s6: [28, 39.8278, -77.2528, 14.5], s7: [60, 39.8278, -77.2528, 14.5], s8: [551, ANGLE[0], ANGLE[1], 16], s5: [551, ANGLE[0], ANGLE[1], 14.5] };
const [vw, vh] = (args.vp || '1440x900').split('x').map(Number); const MAX = +(args.max || 140);
const s = await open({ w: vw, h: vh, dpr: 1, profile: 'frame', mobile: vw < 500 });
try {
  for (const id of (args.scenes || 's1a').split(',')) {
    const [tick, lat, lng, zoom] = SC[id]; await setScene(s.page, { tick, lat, lng, zoom, safe: true, steps: 90 });
    const r = await s.page.evaluate(({ MAX }) => {
      const E = window.__studio.engine; const f = E.frame; const W = f.view.w; const H = f.view.h; const CR = E.chromeRects(true); const RAMP = 16;
      const R = f.tiles.filter((t) => t.opacity >= 0.5).map((t) => ({ x: t.x + f.view.dx, y: t.y + f.view.dy, hw: t.w * t.scale / 2, hh: t.h * t.scale / 2 }));
      const score = (dx, dy) => { let inV = 0; let m = 0; let u = 0; for (const c of R) { const x0 = c.x + dx - c.hw; const x1 = c.x + dx + c.hw; const y0 = c.y + dy - c.hh; const y1 = c.y + dy + c.hh; if (!(x1 > 0 && x0 < W && y1 > 0 && y0 < H)) continue; inV++; let dmin = Infinity; for (const r of CR) { const d = Math.max(r.x0 - x1, x0 - r.x1, r.y0 - y1, y0 - r.y1); if (d < dmin) dmin = d; } if (dmin < 0) u++; if (dmin < RAMP) m++; } return { inV, m, u }; };
      const base = score(0, 0); let best = { dx: 0, dy: 0, ...base };
      for (let dx = -MAX; dx <= MAX; dx += 6) for (let dy = -MAX; dy <= MAX; dy += 6) { const q = score(dx, dy); const better = q.u < best.u || (q.u === best.u && q.m < best.m) || (q.u === best.u && q.m === best.m && (q.inV > best.inV || (q.inV === best.inV && Math.hypot(dx, dy) < Math.hypot(best.dx, best.dy)))); if (better) best = { dx, dy, ...q }; }
      return { base, best, rects: CR.length, total: R.length };
    }, { MAX });
    console.log(id, JSON.stringify(r));
  }
} finally { await s.close(); await stopServer(); }
