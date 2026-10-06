// v3g-rest-scan.mjs - does a paused picture come to rest?  For a grid of (tick, zoom) near the hardest places the picture is settled for 700 frames (11.7 s at 60 Hz), then 300 more frames are watched:
// frames in which the engine still asks for a redraw (busy), tile-frames in which a tile's position / size / opacity changes, the largest change, and WHICH tiles keep moving (and whether they oscillate).
//   node v3g-rest-scan.mjs  -> results/v3g-rest-scan.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9722); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'restscan' }); const rows = []; const detail = [];
const PLACES = { angle: [39.8117, -77.2347], cemetery: [39.8189, -77.2262], rose: [39.7994, -77.2417] };
const TICKS = { angle: [546, 548, 550, 552, 554, 556, 558, 560], cemetery: [330, 340, 346, 352, 400], rose: [285, 289, 293, 297, 301] };
try {
  await s.page.evaluate(() => { window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const [place, [lat, lng]] of Object.entries(PLACES)) for (const zoom of [14, 15]) for (const tick of TICKS[place]) {
    const r = await s.page.evaluate(({ lat, lng, zoom, tick }) => {
      const S = window.__studio; const E = S.engine; E.transport.pause(); E.select(null); E.transport.seek(tick, { glide: false }); E.moveTo({ lat, lng, zoom }, { glide: false, safe: true }); for (let i = 0; i < 700; i++) S.step(1, 16.667);
      const snap = (f) => new Map(f.tiles.map((t) => [t.key, [t.x, t.y, t.w, t.opacity]])); let prev = snap(E.frame); let busy = 0; let moved = 0; let maxStep = 0; const movers = new Map(); const trace = new Map();
      for (let i = 0; i < 300; i++) { const f = S.step(1, 16.667); const cur = snap(f); if (E.busy()) busy++; for (const [k, v] of cur) { const p = prev.get(k); if (!p) continue; const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d > 0.001 || Math.abs(v[3] - p[3]) > 1e-4) { moved++; if (d > maxStep) maxStep = d; movers.set(k, (movers.get(k) || 0) + 1); if (!trace.has(k) && trace.size < 3) trace.set(k, []); if (trace.has(k) && trace.get(k).length < 12) trace.get(k).push([+v[0].toFixed(3), +v[1].toFixed(3), +v[3].toFixed(3)]); } } prev = cur; }
      return { tiles: E.frame.tiles.length, busyOf300: busy, movedTileFrames: moved, maxStep: +maxStep.toFixed(3), tilesThatMove: movers.size, top: [...movers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3), trace: [...trace.entries()] };
    }, { lat, lng, zoom, tick });
    rows.push({ place, zoom, tick, ...r }); if (r.busyOf300 > 0) detail.push({ place, zoom, tick, ...r }); console.log(place, 'z' + zoom, 'tick', tick, 'tiles', r.tiles, 'busy', r.busyOf300 + '/300', 'moved tile-frames', r.movedTileFrames, 'max', r.maxStep, 'tiles that move', r.tilesThatMove);
  }
  const bad = rows.filter((r) => r.busyOf300 > 0); console.log('samples', rows.length, 'that do not come to rest within 700 frames:', bad.length);
  writeJson('v3g-rest-scan.json', { generated: new Date().toISOString(), samples: rows.length, notAtRest: bad.length, rows, detail: detail.slice(0, 6) });
} finally { await s.close(); srv.close(); }
