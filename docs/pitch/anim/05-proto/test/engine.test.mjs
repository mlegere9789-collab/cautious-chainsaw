// Node tests of the DOM-free engine core on the REAL placement data (no browser, no network):
//   node docs/pitch/anim/05-proto/test/engine.test.mjs          prints a JSON report, writes test/results.json, exits 1 on a failed assertion
// Covers: module registry + tuning schema, timeline semantics, motion models (continuity, overshoot), the clock's jump policy, the layout reference strategy, and the ANIMATION METRICS
// (one-frame spikes, units frozen inside a gap, appearances, reversals) of the shipped renderer's semantics (a transcription of y1 / F4 / the Ed accumulator) versus the engine,
// frame by frame at 8x playback.  The shipped semantics is REPLAYED here from its code; the same replay is checked against the real y1 in the browser (see 05-architecture.md).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadByTick } from '../../../../../tmp/pitch-anim/arch/data-load.mjs';
import { makeReplica } from './legacy-replica.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(HERE, '..', 'dist', 'engine.dev.js'), 'utf8');
const ctx = vm.createContext({ window: {}, location: { search: '' }, performance, console, document: { createElement: () => ({ getContext: () => ({}) }) } });
const G = vm.runInContext(code + '\nGTANIM', ctx);
const { Timeline } = G.internal;
const report = { checks: [], metrics: {} };
const ok = (name, fn) => { try { fn(); report.checks.push({ name, pass: true }); } catch (e) { report.checks.push({ name, pass: false, error: String(e.message).slice(0, 400) }); } };

// ------------------------------------------------------------------ data
const { byTick } = loadByTick();
const tl = new Timeline(byTick), lin = G.get('motion', 'linear'), smo = G.get('motion', 'smooth');

ok('registry: built-in modules and schema', () => {
  assert.equal(JSON.stringify(Object.keys(G.mods).sort()), JSON.stringify(['fx', 'layout', 'motion', 'skin']));
  const s = G.schema(); assert.ok(s.kinds.motion.smooth.params.tension.max === 1); assert.ok(s.kinds.skin.classic);
  assert.equal(G.validateTuning({ motion: 'smooth', params: { 'motion.smooth': { tension: 0.5 } } }).length, 0);
  assert.equal(G.validateTuning({ motion: 'nope' }).length, 1);
  assert.equal(G.validateTuning({ params: { 'motion.smooth': { tension: 7 } } }).length, 1);
  assert.equal(G.validateTuning({ params: { 'motion.smooth': { bogus: 1 } } }).length, 1);
});
ok('timeline: 478 units, 1,687 keyframes, absent before the first keyframe, held after the last', () => {
  assert.equal(tl.n, 478); assert.equal(tl.T.length, 1687);
  tl.stateAt(1, lin, 0); assert.equal(tl.nAlive, 71);
  tl.stateAt(675, lin, 0); assert.equal(tl.nAlive, 478);
});

// ------------------------------------------------------------------ projection used for every metric: Web Mercator at zoom 14 (3.7 m per px)
const ZW = 512 * Math.pow(2, 14), mx = (lng) => (lng + 180) / 360, my = (lat) => { const s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
const px = (lng) => mx(lng) * ZW, py = (lat) => my(lat) * ZW;

// ------------------------------------------------------------------ the SHIPPED semantics (group B's y1 + F4 and the Ed accumulator), replayed from the same data (test/legacy-replica.mjs)
const { legacyPos, shippedFrames } = makeReplica(byTick, tl);
const frames = [...shippedFrames()];
report.metrics.frames = { count: frames.length, speed: '8x', frameMs: 16.667, framesWhereTheShippedLoopDrawsAnEarlierTimeThanTheFrameBefore: frames.filter((f, i) => i && f.st + f.ut < frames[i - 1].st + frames[i - 1].ut).length };

function run(posAt) {                                                              // posAt(unitIndex, frame) -> [lng, lat] | null ; frame-to-frame metrics over all units
  const n = tl.n, W = 4;                                                           // spike window: +-4 frames
  const P = Array.from({ length: n }, () => new Array(frames.length).fill(null));
  frames.forEach((fr, fi) => { for (let i = 0; i < n; i++) { const p = posAt(i, fr); P[i][fi] = p && [px(p[0]), py(p[1])]; } });
  let steps = 0, spikes = 0, spikes60 = 0, maxStep = 0, back = 0, appear = 0, sumStep = 0, frozenGapFrames = 0, gapFrames = 0;
  for (let i = 0; i < n; i++) {
    const st = new Array(frames.length).fill(null);
    for (let f = 1; f < frames.length; f++) { const a = P[i][f - 1], b = P[i][f]; if (b && !a) appear++; if (a && b) st[f] = Math.hypot(b[0] - a[0], b[1] - a[1]); }
    for (let f = 1; f < frames.length; f++) {
      if (st[f] === null) continue; steps++; sumStep += st[f]; if (st[f] > maxStep) maxStep = st[f];
      const nb = []; for (let k = -W; k <= W; k++) if (k && st[f + k] != null) nb.push(st[f + k]); nb.sort((x, y) => x - y); const med = nb.length ? nb[nb.length >> 1] : 0;
      if (st[f] > 8 && st[f] > 6 * Math.max(med, 0.5)) { spikes++; if (st[f] > 60) spikes60++; }                      // a displacement that happens inside ONE frame while its neighbours barely move
      if (f > 1 && st[f - 1] != null && st[f] > 1 && st[f - 1] > 1) { const a = P[i][f - 2], b = P[i][f - 1], c = P[i][f]; if (a && b && c && ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) < 0) back++; }
    }
  }
  // frozen-then-jump: inside every keyframe gap whose documented displacement is > 50 m, in how many frames does the unit stand still (< 0.05 px per frame)?
  for (let i = 0; i < n; i++) for (let k = 0; k + 1 < tl.cnt[i]; k++) {
    const o = tl.off[i], t0 = tl.T[o + k], t1 = tl.T[o + k + 1], dm = Math.hypot((tl.LNG[o + k + 1] - tl.LNG[o + k]) * 111320 * 0.77, (tl.LAT[o + k + 1] - tl.LAT[o + k]) * 111320); if (dm < 50 || t1 - t0 < 2) continue;
    frames.forEach((fr, f) => { const T = fr.fresh + fr.ut; if (T > t0 + 0.5 && T < t1 - 0.5 && f > 0 && P[i][f] && P[i][f - 1]) { gapFrames++; if (Math.hypot(P[i][f][0] - P[i][f - 1][0], P[i][f][1] - P[i][f - 1][1]) < 0.05) frozenGapFrames++; } });
  }
  return { frames: frames.length, unitFrameSteps: steps, spikesOver8pxAnd6xNeighbours: spikes, spikesOver60px: spikes60, reversalsAfterMotion: back, appearances: appear, maxStepPx: +maxStep.toFixed(1), meanStepPx: +(sumStep / steps).toFixed(4), gapFrames, frozenShareInGaps: +(frozenGapFrames / gapFrames).toFixed(3) };
}
const ids = tl.ids;
report.metrics.shipped = run((i, fr) => legacyPos(ids[i], fr.st, fr.ut));
const engineAt = (motion) => (i, fr) => { const T = fr.fresh + fr.ut, out = {}; tl.posAt(i, T, motion, out); return T < tl.T[tl.off[i]] ? null : [out.lng, out.lat]; };
report.metrics.engine_linear = run(engineAt(lin));
report.metrics.engine_smooth = run(engineAt(smo));

ok('metrics: the engine has (almost) no one-frame displacement spikes at 8x, the shipped semantics has hundreds; units no longer stand frozen inside a gap; each unit appears once', () => {
  assert.ok(report.metrics.shipped.spikesOver8pxAnd6xNeighbours > 200, JSON.stringify(report.metrics.shipped));
  assert.ok(report.metrics.engine_smooth.spikesOver8pxAnd6xNeighbours < report.metrics.shipped.spikesOver8pxAnd6xNeighbours / 10, JSON.stringify(report.metrics.engine_smooth));
  assert.ok(report.metrics.shipped.frozenShareInGaps > 0.9 && report.metrics.engine_smooth.frozenShareInGaps < 0.25, JSON.stringify([report.metrics.shipped.frozenShareInGaps, report.metrics.engine_smooth.frozenShareInGaps]));
  assert.ok(report.metrics.engine_smooth.appearances <= 477 + 5, 'appearances ' + report.metrics.engine_smooth.appearances);
});

// ------------------------------------------------------------------ geometry of the modelled path: how far does each model leave the straight chord between two documented keyframes?
const dev = (motion) => { const a = []; const out = {}; for (let i = 0; i < tl.n; i++) for (let k = 0; k + 1 < tl.cnt[i]; k++) { const o = tl.off[i], t0 = tl.T[o + k], t1 = tl.T[o + k + 1], x0 = tl.LNG[o + k], y0 = tl.LAT[o + k], x1 = tl.LNG[o + k + 1], y1 = tl.LAT[o + k + 1]; if (x0 === x1 && y0 === y1) continue; let m = 0; for (let s = 1; s < 20; s++) { tl.posAt(i, t0 + (t1 - t0) * s / 20, motion, out); const ax = (x1 - x0), ay = (y1 - y0), L = Math.hypot(ax, ay), d = Math.abs((out.lng - x0) * ay - (out.lat - y0) * ax) / L; m = Math.max(m, d); } a.push(m * 111320 * 0.77); } a.sort((p, q) => p - q); return { pairs: a.length, medianM: +a[a.length >> 1].toFixed(1), p90M: +a[Math.floor(a.length * .9)].toFixed(1), maxM: +a.at(-1).toFixed(1) }; };
report.metrics.pathDeviationFromChord = { linear: dev(lin), smooth: dev(smo) };

// ------------------------------------------------------------------ velocity continuity at keyframes: one-sided derivatives (px per tick at zoom 14)
function speedJump(motion) {
  let n = 0, big = 0; const rel = []; const o1 = {}, o2 = {}, e = 1e-4;
  for (let i = 0; i < tl.n; i++) for (let k = 1; k + 1 < tl.cnt[i]; k++) {
    const o = tl.off[i], t = tl.T[o + k]; const still = (a, b) => tl.LNG[o + a] === tl.LNG[o + b] && tl.LAT[o + a] === tl.LAT[o + b]; if (still(k - 1, k) && still(k, k + 1)) continue;
    tl.posAt(i, t - e, motion, o1); const l0 = { x: px(o1.lng), y: py(o1.lat) }; tl.posAt(i, t, motion, o1); const m0 = { x: px(o1.lng), y: py(o1.lat) }; tl.posAt(i, t + e, motion, o2); const r1 = { x: px(o2.lng), y: py(o2.lat) };
    const vl = [(m0.x - l0.x) / e, (m0.y - l0.y) / e], vr = [(r1.x - m0.x) / e, (r1.y - m0.y) / e], dv = Math.hypot(vr[0] - vl[0], vr[1] - vl[1]), sp = Math.max(Math.hypot(vl[0], vl[1]), Math.hypot(vr[0], vr[1]), 1e-9);
    n++; if (dv > 0.5) { rel.push(dv / sp); if (dv / sp > 0.2) big++; } else rel.push(0);
  }
  rel.sort((a, b) => a - b); return { keyframesWithMotion: n, velocityJumpOver20PercentOfSpeed: big, medianJumpShareOfSpeed: +rel[rel.length >> 1].toFixed(3), p90JumpShareOfSpeed: +rel[Math.floor(rel.length * .9)].toFixed(3) };
}
report.metrics.velocityContinuity = { linear: speedJump(lin), smooth: speedJump(smo) };
ok('motion: smooth is C1 through keyframes (no velocity jumps), linear is not', () => {
  assert.equal(report.metrics.velocityContinuity.smooth.velocityJumpOver20PercentOfSpeed, 0, JSON.stringify(report.metrics.velocityContinuity));
  assert.ok(report.metrics.velocityContinuity.linear.velocityJumpOver20PercentOfSpeed > 100, JSON.stringify(report.metrics.velocityContinuity));
});
ok('motion: smooth never overshoots a keyframe on either axis (monotone)', () => {
  const out = {};
  for (let i = 0; i < tl.n; i++) for (let k = 0; k + 1 < tl.cnt[i]; k++) {
    const o = tl.off[i], lo = Math.min(tl.LNG[o + k], tl.LNG[o + k + 1]) - 1e-9, hi = Math.max(tl.LNG[o + k], tl.LNG[o + k + 1]) + 1e-9;
    for (let s = 0; s <= 10; s++) { tl.posAt(i, tl.T[o + k] + (tl.T[o + k + 1] - tl.T[o + k]) * s / 10, smo, out); assert.ok(out.lng >= lo && out.lng <= hi, 'unit ' + tl.ids[i]); }
  }
});

// ------------------------------------------------------------------ clock policy
ok('clock: playing follows exactly; scrub glides; day jump cross-fades; reduced motion cuts; pause keeps the sub-tick position; resume never slides backwards', () => {
  const C = G.clock, st = C.state, now = 1000; C.reset();
  C.set(100.4, true, false, now); assert.equal(st.Td, 100.4); C.set(100.7, true, false, now + 16); assert.equal(st.Td, 100.7);
  C.set(100, false, false, now + 32); assert.equal(st.Td, 100.7, 'pause keeps Td');
  C.set(100, true, false, now + 48); assert.equal(st.Td, 100.7, 'resume holds until time catches up'); C.set(100.9, true, false, now + 64); assert.equal(st.Td, 100.9);
  C.set(110, false, false, now + 80); assert.ok(st.g && st.g.kind === 'glide'); C.step(now + 80 + 5000); assert.equal(st.Td, 110); assert.equal(st.fade, 1);
  C.set(300, false, false, now + 6000); assert.ok(st.g && st.g.kind === 'fade'); C.step(now + 6000 + 100); assert.ok(st.fade < 1); C.step(now + 6000 + 5000); assert.equal(st.Td, 300);
  C.set(50, false, true, now + 20000); assert.equal(st.Td, 50); assert.equal(st.g, null);
});

// ------------------------------------------------------------------ layout reference strategy on real positions (1440x852), 90 frames with the camera drifting 0.4 px/frame and the units moving
const relax = G.get('layout', 'relax');
function layoutRun(zoom, nFrames, cw, ch) {
  const n = tl.n, L = { idx: null, X: new Float64Array(n), Y: new Float64Array(n), W: new Float32Array(n).fill(cw), H: new Float32Array(n).fill(ch), DX: new Float32Array(n), DY: new Float32Array(n), TX: new Float32Array(n), TY: new Float32Array(n) };
  const ws = 512 * Math.pow(2, zoom); const prev = new Map(); const over = [], jit = [], ms = [];
  for (let f = 0; f < nFrames; f++) {
    tl.stateAt(600 + f * 0.27, smo, 1.5); const idx = []; const cmx = mx(-77.2373 + f * 0.4 / ws * 360), cmy = my(39.812);
    for (let j = 0; j < tl.nAlive; j++) { const i = tl.alive[j]; const x = (mx(tl.lng[i]) - cmx) * ws + 720, y = (my(tl.lat[i]) - cmy) * ws + 426; if (x > 0 && x < 1440 && y > 0 && y < 852 && tl.alpha[i] >= 1) { L.X[i] = x; L.Y[i] = y; idx.push(i); } }
    L.idx = Int32Array.from(idx); const t0 = performance.now(); relax.solve(L, 16.7); ms.push(performance.now() - t0);
    let o = 0; for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) { const A = idx[a], B = idx[b]; if (Math.abs(L.X[A] + L.DX[A] - L.X[B] - L.DX[B]) < cw - 0.5 && Math.abs(L.Y[A] + L.DY[A] - L.Y[B] - L.DY[B]) < ch - 0.5) o++; }
    over.push(o);
    for (const i of idx) { const p = prev.get(i), X = L.X[i] + L.DX[i], Y = L.Y[i] + L.DY[i]; if (p && f > 3) jit.push(Math.max(0, Math.hypot(X - p.x, Y - p.y) - Math.hypot(L.X[i] - p.ax, L.Y[i] - p.ay))); prev.set(i, { x: X, y: Y, ax: L.X[i], ay: L.Y[i] }); }
  }
  jit.sort((a, b) => a - b); ms.sort((a, b) => a - b);
  return { zoom, tile: cw + 'x' + ch, visible: L.idx.length, overlappingPairsLastFrame: over.at(-1), overlappingPairsMean: +(over.reduce((a, b) => a + b, 0) / over.length).toFixed(1), extraJitterPxPerFrame: { mean: +(jit.reduce((a, b) => a + b, 0) / jit.length).toFixed(3), p95: +jit[Math.floor(jit.length * .95)].toFixed(3), max: +jit.at(-1).toFixed(2) }, solveMs: { p50: +ms[ms.length >> 1].toFixed(2), p95: +ms[Math.floor(ms.length * .95)].toFixed(2) } };
}
report.metrics.layoutRelax = [13.5, 14.5, 15.5, 16.5].map((z) => layoutRun(z, 90, 62, 28));

// ------------------------------------------------------------------ a new skin in under 50 lines (skins/skin-minimal.js): loads, validates, draws
const skinSrc = fs.readFileSync(path.join(HERE, '..', 'skins', 'skin-minimal.js'), 'utf8');
ok('extensibility: skins/skin-minimal.js is under 50 lines, registers through G.register and appears in the schema and in the tuning validation', () => {
  assert.ok(skinSrc.split('\n').length < 50, 'lines ' + skinSrc.split('\n').length);
  ctx.G = G; vm.runInContext(skinSrc, ctx);
  assert.ok(G.mods.skin.minimal && G.schema().kinds.skin.minimal.params.corner);
  const calls = []; const g = new Proxy({}, { get: (_, k) => (...a) => { calls.push(String(k)); }, set: () => true });
  const t = { id: 'U-20ME', side: 0, type: 0, disp: 'Line of Battle', doc: 800, str: 800, maxS: 900, bear: 90, zoom: 14, sel: false, flash: false };
  const sz = G.mods.skin.minimal.size(t); G.mods.skin.minimal.draw(g, 1, t, 30, 20, sz.geo); assert.ok(calls.length > 3 && sz.w > 10);
  assert.equal(G.validateTuning({ skin: 'minimal' }).length, 0);
});


const fxSrc = fs.readFileSync(path.join(HERE, '..', 'skins', 'fx-select-glow.js'), 'utf8');
ok('extensibility: skins/fx-select-glow.js (a new effect) is under 50 lines, registers, has its own switch, and glows exactly the selected tile', () => {
  assert.ok(fxSrc.split(/\r?\n/).length < 50, 'lines ' + fxSrc.split(/\r?\n/).length);
  ctx.G = G; vm.runInContext(fxSrc, ctx);
  assert.ok(G.mods.fx.selectGlow && G.T.fx.selectGlow === true && G.schema().kinds.fx.selectGlow.params.hz);
  G.host = { reduced: () => false }; const fx = G.mods.fx.selectGlow, tl2 = new Timeline(byTick); tl2.stateAt(675, lin, 1.5);
  fx.prepare({ sel: null, pin: 'U-20ME', tl: tl2 }, 1000);
  const idx = tl2.index['U-20ME']; assert.ok(fx.glow(idx) > 0 && fx.glow((idx + 1) % tl2.n) === 0);
  fx.prepare({ sel: null, pin: null, tl: tl2 }, 1000); assert.equal(fx.glow(idx), 0);
});

ok('tuning: G.tune reaches module params by "params.<kind>.<name>.<param>" and the value is what the module reads; exported tuning validates', () => {
  G.tune('params.motion.smooth.tension', 0.25); assert.equal(G.P('motion', 'smooth', 'tension'), 0.25);
  G.tune('params.layout.relax.passes', 3); assert.equal(G.P('layout', 'relax', 'passes'), 3);
  const t = G.exportTuning(); assert.equal(G.validateTuning(t).length, 0); assert.equal(t.params['motion.smooth'].tension, 0.25);
  G.tune('params.motion.smooth.tension', 1); G.tune('params.layout.relax.passes', 6);
});

report.pass = report.checks.every((c) => c.pass);
fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(report, null, 1));
for (const c of report.checks) console.log(c.pass ? 'PASS' : 'FAIL', c.name, c.error || '');
console.log(JSON.stringify(report.metrics, null, 1));
process.exit(report.pass ? 0 : 1);
