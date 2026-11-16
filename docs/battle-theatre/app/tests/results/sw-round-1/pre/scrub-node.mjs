// RECORD COPY. The imports below are relative to tmp/bt-spec/pre/ (a scratch folder, not committed): to run it, copy it there first.
// Pre-check (node only, no browser) of the state parts of scrub.spec.mjs: test 1 (random-access seeks equal sequential playback: liveHash and the event-cache hash) and test 4 (no unit pops at 60x: the largest
// step beyond marching speed, units entering and leaving only off the loaded ground), with stage.apply(t) in place of a frame. The browser run adds the page: the scrubber, the keys, the pictures. Not a spec.
//   node tmp/bt-spec/pre/scrub-node.mjs
import { nodeWorld } from '../../../docs/battle-theatre/app/tests/node-world.mjs';
import { makeGeo } from '../../../docs/battle-theatre/app/src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../../../docs/battle-theatre/app/tools/history-report.mjs';
import { createRealHistory } from '../../../docs/battle-theatre/app/src/history/real.mjs';
import { worldFromUnits } from '../../../docs/battle-theatre/app/src/world-from-units.mjs';
import { Stage } from '../../../docs/battle-theatre/app/src/stage.mjs';
import { loadConflicts, DEFAULT_SCENARIO } from '../../../docs/battle-theatre/app/src/data.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), world = worldFromUnits(T, geo, L), st = new Stage({ layer: L, world, T, geo });
const conf = await loadConflicts(), sc = DEFAULT_SCENARIO(conf), byId = new Map(conf.map(c => [c.id, c]));
sc.optionText = {}; for (const id of (L.meta.linkedConflicts || [])) { const c = byId.get(id); if (!c) continue; const key = sc.choices[id] || 'recommended', opt = c.options.find(o => o.key === key); sc.optionText[id] = opt ? opt.text : ''; }
st.loadScenario(sc);
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm, ok = (c, m) => console.log((c ? 'OK   ' : 'FAIL ') + m);
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// test 1
const t0 = minOf(7, 1, 6), steps = 60, seq = []; st.apply(t0); seq.push({ t: t0, live: st.liveHash(), cache: st.stateHash(t0), n: st.stats?.units });
for (let i = 0; i < steps; i++) { const t = t0 + (i + 1) * 10; st.apply(t); seq.push({ t, live: st.liveHash(), cache: st.stateHash(t) }); }
const order = seq.map((s, i) => i), r = rng(1863); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
let jumps = 0, bad = 0;
for (const i of order) { const want = seq[i]; if (jumps % 7 === 0) { st.apply(minOf(7, 13, 20)); st.apply(minOf(6, 26, 1)); } st.apply(want.t); jumps++; if (st.liveHash() !== want.live || st.stateHash(want.t) !== want.cache) bad++; }
ok(bad === 0, `test 1: ${seq.length} sequential states vs ${jumps} random-access seeks: ${bad} differ (spec: 0)`);
const h = st.header(); ok(h.seed === 1863 && h.code === 'bt-sim-0.1' && /^[0-9a-f]{8}$/.test(h.inputHash), `header seed ${h.seed} code ${h.code} input hash ${h.inputHash}`);
// test 4 as the page runs it: the clock of a frame is t += dt * rate / 60 (minutes) with dt = min(0.1 s, frame time) and the rate easing toward the speed with time constant 0.16 s (theatre.mjs loop).
// Two frame times: a real GPU (16.7 ms: dt 1/60 s) and this machine (a frame takes seconds: dt is capped at 0.1 s). The spec runs 30 frames, takes the states, then measures 240 frames.
const n = st.layer.units.length, W = st.T.W / 2, H = st.T.H / 2, start = Math.min(...st.layer.units.filter(u => u.drawn).map(u => st.arrivals.get(u.id).default)) - 2;
function run4(dt, label, spanMin, pageMs) {
  let t = Math.floor(start), rate = 0; const speed = 60; st.apply(t);
  const frame = () => { rate += (speed - rate) * (1 - Math.exp(-dt / .16)); if (Math.abs(rate - speed) < 0.02) rate = speed; t += dt * rate / 60; st.apply(t); };
  if (pageMs) { for (let acc = 0; acc < pageMs.warm; acc += dt * 1000) frame(); } else for (let k = 0; k < 30; k++) frame();
  const t1 = t; let prevX = Float32Array.from(st.cx), prevZ = Float32Array.from(st.cz), prevP = Uint8Array.from(st.present), prevT = t, maxStep = 0, enters = 0, leaves = 0, badEnter = 0, badLeave = 0, frames = 0;
  for (let acc = 0, f = 0; pageMs ? acc < pageMs.meas : spanMin == null ? f < 240 : t - t1 < spanMin; f++, acc += dt * 1000) {
    frame(); frames++; const dtMin = t - prevT;
    for (let i = 0; i < n; i++) {
      if (st.present[i] && prevP[i]) { const d = Math.hypot(st.cx[i] - prevX[i], st.cz[i] - prevZ[i]); const bound = dtMin * 60 * 2.4384 * 1.01 + 0.5; if (d > bound) maxStep = Math.max(maxStep, d - bound); }
      else if (st.present[i] && !prevP[i]) { enters++; if (!(Math.abs(st.cx[i]) > W - 150 || Math.abs(st.cz[i]) > H - 150)) badEnter++; }
      else if (!st.present[i] && prevP[i]) { leaves++; if (!(Math.abs(prevX[i]) > W - 150 || Math.abs(prevZ[i]) > H - 150)) badLeave++; }
    }
    prevX.set(st.cx); prevZ.set(st.cz); prevP.set(st.present); prevT = t;
  }
  ok(badEnter === 0 && badLeave === 0 && maxStep < 0.01 && enters > 0, `test 4, ${label}: warm-up ended ${(t1 - Math.floor(start)).toFixed(2)} sim min after the start (earliest arrival at +2), ${frames} measured frames covering ${(t - t1).toFixed(2)} sim min; enters ${enters}, leaves ${leaves}, bad enters ${badEnter}, bad leaves ${badLeave}, largest excess step ${maxStep.toFixed(4)} m (spec: 0, 0, < 0.01 m, enters > 0)`);
}
run4(1 / 60, 'real GPU, 240 frames');
run4(0.1, 'software renderer (dt capped at 0.1 s), 240 frames as the spec has it');
run4(0.1, 'software renderer, measuring until the clock has advanced 4 sim minutes (the span 240 frames cover at 60 frames per second)', 4);
run4(1 / 60, 'real GPU, spans of the page clock as the fixed spec will take them (0.5 s warm-up, 4 s measured)', null, { warm: 500, meas: 4000 });
run4(0.1, 'software renderer, spans of the page clock as the fixed spec will take them (0.5 s warm-up, 4 s measured)', null, { warm: 500, meas: 4000 });
