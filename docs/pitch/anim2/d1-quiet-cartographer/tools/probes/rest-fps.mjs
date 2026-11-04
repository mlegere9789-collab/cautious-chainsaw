// tools/probes/rest-fps.mjs - does the picture come to rest at a constant frame time other than 16.7 ms?  Headless engine, the page's own skin, the field view and The Angle; for each frame time:
// settle 900 frames, then measure 120 frames: marks that move, the largest step.   node tools/probes/rest-fps.mjs [--dts=16.7,22,33,50] [--views=field,angle]
import { makeEngine } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
const DTS = (args.dts || '16.667,22,33.3,50').split(',').map(Number); const VIEWS = { field: { tick: 551, lat: 39.81592, lng: -77.23677, zoom: 13.5, w: 1440, h: 900 }, angle: { tick: 556, lat: 39.8117, lng: -77.2347, zoom: 15, w: 1440, h: 900 }, phone: { tick: 551, lat: 39.8117, lng: -77.2347, zoom: 14.5, w: 390, h: 844 } };
for (const vn of (args.views || 'field,angle,phone').split(',')) for (const dt of DTS) {
  const v = VIEWS[vn]; const e = makeEngine({ start: { tick: v.tick, lat: v.lat, lng: v.lng, zoom: v.zoom }, settings: { 'camera.zoom': v.zoom, 'popup.enabled': false, 'layout.solveEvery': String(args.every || 1) } }); e.setViewport(v.w, v.h);
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer-day');
  let n = 0; for (; n < 1500; n++) { e.step(dt); if (!e.busy() && n > 60) break; }
  let prev = new Map(e.frame.tiles.map((t) => [t.key, [t.x, t.y]])); let movers = new Set(); let maxStep = 0; let busy = 0; let crowds = 0;
  for (let i = 0; i < 120; i++) { const g = e.step(dt); if (e.busy()) busy++; for (const t of g.tiles) { const p = prev.get(t.key); if (p) { const d = Math.hypot(t.x - p[0], t.y - p[1]); if (d > 0.05) { movers.add(t.key); maxStep = Math.max(maxStep, d); } } prev.set(t.key, [t.x, t.y]); } crowds = g.tiles.filter((t) => t.kind === 'agg').length; }
  console.log(JSON.stringify({ view: vn, dt, settledAt: n, busyFramesOf120: busy, movers: movers.size, maxStep: +maxStep.toFixed(2), crowds }));
}
