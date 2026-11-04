// tools/probes/dt-rest.mjs - does the layout come to rest at every constant frame time? (round 2: the objective jury found D1 never rests at 22 ms or slower.)
// The engine is stepped at a constant dt after a jump to the field view; after 900 frames the next 120 are measured: how many marks move more than 0.5 px between two frames, and by how much.
//   node tools/probes/dt-rest.mjs [dts=16.667,22,33.333,50] [zoom=13.5]
import { makeEngine, loadDocs } from '../../src/headless.mjs';
import { SKINS } from '../../src/skins/index.mjs';
const arg = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const DTS = (arg.dts || '16.667,20,22,25,33.333,40,50').split(',').map(Number); const ZOOM = +(arg.zoom || 13.5); const VW = +(arg.w || 1440); const VH = +(arg.h || 900);
const { dataset } = loadDocs(); const sc = dataset.scenes.find((x) => x.id === 'field'); const out = [];
for (const dt of DTS) {
  const e = makeEngine({ start: { tick: 551, lat: 39.81592, lng: -77.23677, zoom: ZOOM }, settings: { 'camera.zoom': ZOOM, 'popup.enabled': false }, autoQuality: arg.auto !== '0' }); e.setViewport(VW, VH);
  for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', arg.skin || 'quiet-cartographer-day');
  e.select(null); e.transport.pause(); e.transport.seek(551, { glide: false }); e.moveTo({ lat: 39.81592, lng: -77.23677, zoom: ZOOM }, { glide: false, safe: true });
  for (let k = 0; k < 900; k++) e.step(dt);
  const prev = new Map(); const worst = new Map(); let framesWith = 0; let busy = 0; const N = 120; let overlaps = 0;
  for (let k = 0; k < N; k++) {
    const f = e.step(dt); let any = false; if (e.busy()) busy++; if (f.overlaps) overlaps++;
    for (const t of f.tiles) { if (t.life !== 'live') continue; const x = t.x + f.view.dx; const y = t.y + f.view.dy; const p = prev.get(t.key); if (p) { const d = Math.hypot(x - p[0], y - p[1]); if (d > 0.5) { any = true; const w = worst.get(t.key) || { n: 0, max: 0 }; w.n++; w.max = Math.max(w.max, d); worst.set(t.key, w); } } prev.set(t.key, [x, y]); }
    if (any) framesWith++;
  }
  const a = [...worst.values()]; const r = { dt, fps: +(1000 / dt).toFixed(1), framesMoving: framesWith, marksMoving: a.length, maxStep: a.length ? +Math.max(...a.map((w) => w.max)).toFixed(1) : 0, busyFrames: busy, overlaps, every: e.autoEvery() };
  out.push(r); console.log(JSON.stringify(r));
}
