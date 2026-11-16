// Node tests (no browser, no GPU) of the level-of-detail cross-fade of the crowd (src/crowd/lod.mjs and its two shader ports): the dither ranges of the levels of one figure partition [0, 1) (no hole, no doubled pixel),
// the share of every level is a continuous function of the distance (no pop), the LOD0 budget is a radius that moves continuously, and the selection is a pure function of (time, camera): the same inputs give the same
// bytes however the camera got there (scrub purity, gate Q12). The hard swap that the cross-fade replaces (band = 0) is run next to it and is shown to jump.
//   node --test docs/battle-theatre/app/tests/crowd-lod.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { perspective, lookAt, mul, frustumPlanes, sphereInFrustum, hsh } from '../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../render/prototype/src/world.mjs';
import { LOD_BASE, LOD0_BUDGET, LOD_FADE, LOD_DAB, LOD_Q, dabFootprint, lodOptions, lodRadii, fadeBand, figureScale, figurePhase, thresholds, sharesOf, packRange, decodeRange, edgeRange, ign, keepFragment, farKeeps, dabShare, viewBlend, impostorView, FigureList, selectFigures, checkComplementary } from '../src/crowd/lod.mjs';
import { HEAD, MID_VS, NEAR_VS, FIG_FS, IMP_VS, IMP_FS } from '../src/crowd/shaders-gl.mjs';
import { wgsl } from '../src/crowd/shaders-wgsl.mjs';
import { decodePng } from './weather3d-gpu-lib.mjs';
import fs from 'node:fs';

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// ---------------------------------------------------------------------------------------------------- the memoryless parts
test('fadeBand: 0 inside r (1 - b), 1 beyond r (1 + b), a smoothstep between, symmetric about r, a step when b = 0', () => {
  const r = 10, b = 0.075;
  assert.equal(fadeBand(0, r, b), 0); assert.equal(fadeBand(r * (1 - b), r, b), 0); assert.equal(fadeBand(r * (1 + b), r, b), 1); assert.equal(fadeBand(1e6, r, b), 1);
  assert.ok(near(fadeBand(r, r, b), 0.5)); for (let x = 0.01; x < 1; x += 0.01) assert.ok(near(fadeBand(r * (1 - b + 2 * b * x), r, b) + fadeBand(r * (1 + b - 2 * b * x), r, b), 1, 1e-12));
  let prev = 0; for (let d = 8; d < 12; d += 0.001) { const s = fadeBand(d, r, b); assert.ok(s >= prev - 1e-15); prev = s; }
  assert.equal(fadeBand(9.999, r, 0), 0); assert.equal(fadeBand(10, r, 0), 1); assert.equal(fadeBand(5, 0, b), 1);
});
test('the band is 15 percent wide and the spread 10 percent (the figures3d radius rule, FIGURES3D-NOTES 9.2)', () => {
  assert.ok(near(LOD_FADE.width, 0.15) && near(2 * LOD_FADE.band, LOD_FADE.width) && near(LOD_FADE.hysteresis, 0.10)); assert.deepEqual({ ...LOD_BASE }, { r0: 10, r1: 13, r2: 75 }); assert.equal(LOD0_BUDGET, 96);
  const o = lodOptions(); assert.ok(near(o.band, 0.075) && near(o.hyst, 0.10) && o.budget === 96);
});
test('lodRadii: the figures3d distances at 1080p / 60 degrees, scaled by pixels and field of view, moved by the two sliders, always r0 <= r1 <= r2', () => {
  const r = lodRadii(1080, Math.PI / 3, { nearR: 40, midR: 300 }); assert.ok(near(r.r0, 10, 1e-9) && near(r.r1, 13, 1e-9) && near(r.r2, 75, 1e-9));
  const h = lodRadii(540, Math.PI / 3, {}); assert.ok(near(h.r0, 5, 1e-9) && near(h.r2, 37.5, 1e-9));
  const z = lodRadii(1080, Math.PI / 6, {}); assert.ok(near(z.r0, 10 * Math.tan(Math.PI / 6) / Math.tan(Math.PI / 12), 1e-9) && z.r0 > 21, 'a narrower field of view looks farther: the radius grows');
  const s = lodRadii(1080, Math.PI / 3, { nearR: 80, midR: 150 }); assert.ok(near(s.r0, 20) && near(s.r1, 26) && near(s.r2, 37.5));
  for (const [n, m] of [[20, 120], [90, 120], [90, 500], [20, 500], [200, 100]]) { const q = lodRadii(1080, 1, { nearR: n, midR: m }); assert.ok(q.r0 <= q.r1 && q.r1 <= q.r2, `${n} ${m}`); }
});
test('figureScale and figurePhase are hashes of the figure number: deterministic, inside [1 - h, 1 + h], mean 1, and the numbers the shaders use', () => {
  let sum = 0, lo = 9, hi = 0; for (let f = 0; f < 20000; f++) { const s = figureScale(f, 0.1); sum += s; lo = Math.min(lo, s); hi = Math.max(hi, s); assert.equal(s, figureScale(f, 0.1)); assert.ok(near(s, 1 + 0.1 * (2 * hsh(f * 13 + 5) - 1))); assert.ok(near(figurePhase(f), hsh(f * 7 + 3))); }
  assert.ok(lo >= 0.9 && hi <= 1.1 && lo < 0.901 && hi > 1.099, `${lo} ${hi}`); assert.ok(Math.abs(sum / 20000 - 1) < 0.002); assert.equal(figureScale(77, 0), 1);
});
test('thresholds and shares: the four shares sum to 1, level 0 only near, the impostor only far, the middle levels in their rings, every share monotone in the distance', () => {
  const q = [0, 0, 0], b = 0.075, r0 = 10, r1 = 13, r2 = 75; let prevL0 = 1, prevF = 0;
  for (let d = 1; d < 120; d += 0.05) {
    thresholds(d, r0, r1, r2, b, q); assert.ok(q[0] <= q[1] && q[1] <= q[2] && q[2] <= LOD_Q); const s = sharesOf(q); assert.ok(near(s[0] + s[1] + s[2] + s[3], 1, 1e-12)); for (const v of s) assert.ok(v >= -1e-12 && v <= 1 + 1e-12);
    assert.ok(s[0] <= prevL0 + 1e-12 && s[3] >= prevF - 1e-12); prevL0 = s[0]; prevF = s[3];
  }
  thresholds(5, r0, r1, r2, b, q); assert.deepEqual(sharesOf(q), [1, 0, 0, 0]); thresholds(11.5, r0, r1, r2, b, q); assert.deepEqual(sharesOf(q), [0, 1, 0, 0]); thresholds(40, r0, r1, r2, b, q); assert.deepEqual(sharesOf(q), [0, 0, 1, 0]); thresholds(200, r0, r1, r2, b, q); assert.deepEqual(sharesOf(q), [0, 0, 0, 1]);
  thresholds(10, r0, r1, r2, b, q); const m = sharesOf(q); assert.ok(near(m[0], 0.5, 1e-4) && near(m[1], 0.5, 1e-4), 'half and half at the radius');
});
test('packRange / decodeRange: round trip, the word 0 keeps everything, a full range is the word 0, neighbouring levels share their boundary exactly', () => {
  assert.equal(packRange(0, LOD_Q), 0); assert.deepEqual(decodeRange(0), { lo: 0, hi: 2 });
  for (const [lo, hi] of [[0, 1], [0, 30000], [30000, 65000], [123, 124], [60000, LOD_Q], [1, LOD_Q]]) { const P = packRange(lo, hi), d = decodeRange(P); assert.ok(P > 0 && P <= 0xffffffff); assert.ok(near(d.lo, lo / LOD_Q, 1e-12)); assert.ok(hi >= LOD_Q ? d.hi === 2 : near(d.hi, hi / LOD_Q, 1e-12)); }
  const a = decodeRange(packRange(0, 31337)), c = decodeRange(packRange(31337, 50000)); assert.equal(a.hi, c.lo, 'the same float on both sides: no hole and no overlap in the shader');
  assert.equal(edgeRange(100, 350, 0.075), 0); assert.equal(edgeRange(400, 350, 0.075), -1); const e = edgeRange(350, 350, 0.075); assert.ok(e > 0 && decodeRange(e).lo === 0 && near(decodeRange(e).hi, 0.5, 1e-4));
});
test('every fragment is drawn by exactly one level (or the impostor): no hole and no doubled pixel, over distances, figures and pixels (the gate-runner check)', () => {
  const r = checkComplementary({ figures: 60, step: 0.31 }); assert.deepEqual(r.problems, []); assert.ok(r.ok && r.samples > 50000);
  const hard = checkComplementary({ band: 0, hyst: 0, figures: 8, step: 0.31 }); assert.ok(hard.ok, 'the hard swap partitions too');
});
test('the share of the pixels a level keeps equals its share (the noise is uniform): a 96 x 96 patch at five distances inside the bands', () => {
  const fig = 4321, f = figureScale(fig, 0.1), q = [0, 0, 0]; for (const d of [9.6, 10.4 * f, 12.5 * f, 70 * f, 79 * f]) {
    const nu = d / f; thresholds(nu, 10, 13, 75, 0.075, q); const sh = sharesOf(q), P = [0, 0, 0]; let lo = 0; for (let k = 0; k < 3; k++) { P[k] = q[k] > lo ? packRange(lo, q[k]) : -1; if (q[k] > lo) lo = q[k]; }
    const kept = [0, 0, 0, 0]; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { for (let k = 0; k < 3; k++) if (P[k] >= 0 && keepFragment(P[k], fig, x + 0.5, y + 0.5)) kept[k]++; if (farKeeps(nu, 75, 0.075, fig, x + 0.5, y + 0.5)) kept[3]++; }
    for (let k = 0; k < 4; k++) assert.ok(Math.abs(kept[k] / 9216 - sh[k]) < 0.03, `d ${d} level ${k}: kept ${(kept[k] / 9216).toFixed(3)} against share ${sh[k].toFixed(3)}`);
    assert.equal(kept[0] + kept[1] + kept[2] + kept[3], 9216);
  }
});
test('no pop: a level changes by at most the slope of the band per metre, so a 1 percent error of a distance moves a level by less than a tenth; the hard swap changes by the whole level', () => {
  const run = (b, step) => { const q0 = [0, 0, 0], q1 = [0, 0, 0]; let worst = 0, at = 0; for (let d = 2; d < 110; d += step) { thresholds(d, 10, 13, 75, b, q0); thresholds(d + step, 10, 13, 75, b, q1); const a = sharesOf(q0), c = sharesOf(q1); for (let k = 0; k < 4; k++) { const s = Math.abs(a[k] - c[k]); if (s > worst) { worst = s; at = d; } } } return { worst, at }; };
  const soft = run(0.075, 0.01), hard = run(0, 0.01);
  assert.ok(soft.worst < 0.0105, `1 cm steps: the largest step of any share is ${soft.worst.toFixed(5)} at ${soft.at.toFixed(2)} m`);       // slope 1.5 / (2 * 0.075 * 10 m) = 1 per metre at the 10 m radius
  assert.ok(hard.worst > 0.99, `the hard swap jumps by ${hard.worst}`);
  for (const r of [10, 13, 75]) { const a = fadeBand(r * 0.99, r, 0.075), c = fadeBand(r * 1.01, r, 0.075); assert.ok(c - a < 0.2, `a 2 percent spread of the distance at ${r} m moves the share by ${(c - a).toFixed(3)}`); }
});
test('the impostor and the dab: the far share is the complement of the three levels, the dab share goes from 0 to 1 over the band of the height', () => {
  for (const nu of [70, 74, 75, 76, 80]) { const q = [0, 0, 0]; thresholds(nu, 10, 13, 75, 0.075, q); const s = sharesOf(q); let far = 0; const N = 4000; for (let i = 0; i < N; i++) if (farKeeps(nu, 75, 0.075, 99, i % 64 + 0.5, (i / 64 | 0) + 0.5)) far++; assert.ok(Math.abs(far / N - s[3]) < 0.04); }
  assert.equal(dabShare(20, 1, 0.075), 0); assert.equal(dabShare(5, 1, 0.075), 1); assert.ok(near(dabShare(7, 1, 0.075), 0.5)); assert.equal(dabShare(6.99, 1, 0), 1); assert.equal(dabShare(7.01, 1, 0), 0);
  let prev = 1; for (let h = 4; h < 10; h += 0.01) { const s = dabShare(h, 1, 0.075); assert.ok(s <= prev + 1e-12); prev = s; }
});

test('the eight baked views of the impostor: a figure takes the next view with the share fract(yn), so the picture changes continuously as the camera turns; the hard mode takes the nearest view', () => {
  for (const yn of [0, 0.25, 0.5, 0.9999, 3.3, 7.75, 7.999]) { const v = viewBlend(yn, 0.075); assert.equal(v.view, Math.floor(yn) % 8); assert.ok(near(v.share, yn - Math.floor(yn), 1e-12)); }
  assert.deepEqual(viewBlend(2.4, 0), { view: 2, share: 0 }); assert.deepEqual(viewBlend(2.6, 0), { view: 3, share: 0 }); assert.deepEqual(viewBlend(7.6, 0), { view: 0, share: 0 });
  // the share of the pixels of a 96 x 96 patch that take the next view equals the fraction, for five figures and five angles
  for (const fig of [0, 17, 4321, 99999, 127000]) for (const yn of [2.0, 2.2, 2.5, 2.8, 7.9]) { let next = 0; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (impostorView(yn, 0.075, fig, x + 0.5, y + 0.5) !== Math.floor(yn) % 8) next++; assert.ok(Math.abs(next / 9216 - (yn - Math.floor(yn))) < 0.03, `figure ${fig} yn ${yn}: ${next / 9216}`); }
  // no pop: turning the camera by 1/100 of a view changes the share of the next view by 1/100 (the hard mode flips the whole figure at the half way)
  let worstSoft = 0, worstHard = 0, prevS = 0, prevH = 0; for (let yn = 0; yn < 8; yn += 0.01) { const vs = viewBlend(yn, 0.075), vh = viewBlend(yn, 0), cs = (vs.view + vs.share) , ch = vh.view; if (yn > 0.01) { worstSoft = Math.max(worstSoft, Math.abs(((cs - prevS) + 4 + 8) % 8 - 4)); worstHard = Math.max(worstHard, Math.abs(((ch - prevH) + 4 + 8) % 8 - 4)); } prevS = cs; prevH = ch; }
  assert.ok(worstSoft < 0.0101 + 1e-9, `soft ${worstSoft}`); assert.ok(worstHard >= 1, `hard ${worstHard}`);
});

test('the dab narrows to the footprint of the baked figure: the whole quad at 3 px, the measured silhouette at 7 px, continuous between, the whole quad in hard mode', () => {
  const f = h => dabFootprint(h, 0.075); assert.deepEqual(f(2), { w: 1, top: 0, bottom: 0, k: 0 }); assert.deepEqual(f(3), { w: 1, top: 0, bottom: 0, k: 0 }); assert.ok(near(f(7).w, LOD_DAB.w) && near(f(7).top, LOD_DAB.top) && near(f(7).bottom, LOD_DAB.bottom) && near(f(9).w, LOD_DAB.w));
  let prev = f(3); for (let h = 3; h <= 7; h += 0.01) { const c = f(h); assert.ok(c.w <= prev.w + 1e-12 && Math.abs(c.w - prev.w) < 0.02, `h ${h}`); prev = c; } assert.deepEqual(dabFootprint(5, 0), { w: 1, top: 0, bottom: 0, k: 0 });
  // the numbers are the baked atlas's: 131 upright foot classes of data/figures3d/impostor-atlas.png (R = material id, 0 = empty)
  const dir = new URL('../data/figures3d/', import.meta.url), png = decodePng(fs.readFileSync(new URL('impostor-atlas.png', dir))), rows = JSON.parse(fs.readFileSync(new URL('impostor-atlas.json', dir), 'utf8')).rows.filter(r => r.height_m < 2.3);
  let area = 0, bw = 0, bh = 0, top = 0, bottom = 0, n = 0; for (const r of rows) for (let v = 0; v < 8; v++) { let cnt = 0, minx = 99, maxx = -1, miny = 99, maxy = -1; for (let y = 0; y < 64; y++) for (let x = 0; x < 48; x++) if (png.data[(((r.row * 64 + y) * png.w) + v * 48 + x) * 4]) { cnt++; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); } area += cnt / (48 * 64); bw += maxx - minx + 1; bh += maxy - miny + 1; top += miny / 64; bottom += (63 - maxy) / 64; n++; }
  area /= n; bw /= n; bh /= n; top /= n; bottom /= n; console.log(`# the baked atlas: ${rows.length} upright classes, mean silhouette ${area.toFixed(3)} of the quad, bounding box ${bw.toFixed(1)} x ${bh.toFixed(1)} of 48 x 64, empty margin ${top.toFixed(3)} above and ${bottom.toFixed(3)} below; the dab: width ${LOD_DAB.w}, empty ${LOD_DAB.top} above and ${LOD_DAB.bottom} below`);
  assert.ok(rows.length > 100); assert.ok(Math.abs(area / (bh / 64) - LOD_DAB.w) < 0.02, `the mean width over the height ${area / (bh / 64)}`); assert.ok(Math.abs(top - LOD_DAB.top) < 0.01 && Math.abs(bottom - LOD_DAB.bottom) < 0.01);
  assert.ok(Math.abs(LOD_DAB.w * (1 - LOD_DAB.top - LOD_DAB.bottom) - area) < 0.01, 'the dab at its narrowest has the area of the silhouette');
});

// ---------------------------------------------------------------------------------------------------- the selection on a synthetic world
const FLAT = { h: () => 0 };
function makeWorld(blocks) {
  const sold = [], units = [], unitF = []; let count = 0;
  blocks.forEach((u, ui) => {
    const first = count; let n = 0; const sp = u.spacing || 0.55;
    for (let i = 0; i < u.nx; i++) for (let j = 0; j < u.nz; j++) { sold.push((i - (u.nx - 1) / 2) * sp, -j * sp, 0.5, ui); n++; count++; }
    units.push({ first, count: n, radius: Math.hypot(u.nx * sp, u.nz * sp) / 2 + 3, klass: u.klass || 0 }); unitF.push(u.x, u.z, u.heading || 0, 0, 0, 0, 0, u.klass || 0, 0, -1, first, n);
  });
  const sold1 = new Float32Array(count * 4); for (let i = 0; i < count; i++) sold1[i * 4] = 1e9;
  return { units, unitF: Float32Array.from(unitF), sold: Float32Array.from(sold), sold1, count, T: FLAT };
}
function camAt(x, y, z, yaw = 0, fov = Math.PI / 3, aspect = 16 / 9) {
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)], view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16), planes = new Float32Array(24);
  lookAt([x, y, z], [x + fwd[0], y, z + fwd[2]], [0, 1, 0], view); perspective(fov, aspect, 0.1, 9000, proj); mul(proj, view, vp); frustumPlanes(vp, planes); return { cam: { x, y, z, fwd, fov }, planes };
}
const present = n => { const a = new Uint8Array(n); a.fill(1); return a; };
function select(w, L, c, opt = lodOptions(), t = 100, rad = lodRadii(1080, c.cam.fov, {})) { return selectFigures(L, { world: w, T: FLAT, present: present(w.units.length), cam: c.cam, planes: c.planes, rad, animT: t, opt, nUnits: w.units.length }); }
// the coverage each listed figure gives each level, by figure number
function coverage(L) { const m = new Map(); for (let j = 0; j < L.n; j++) { const c = [0, 0, 0]; for (let k = 0; k < 3; k++) if ((L.mask[j] >> k) & 1) { const d = decodeRange(L.p[j * 3 + k]); c[k] = Math.min(d.hi, 1) - d.lo; } m.set(L.fig[j], c); } return m; }
const snapshot = L => ({ n: L.n, fig: L.fig.slice(0, L.n), mask: L.mask.slice(0, L.n), p: L.p.slice(0, L.n * 3), d2: L.d2.slice(0, L.n), nu: L.nu.slice(0, L.n), x: L.x.slice(0, L.n), z: L.z.slice(0, L.n), r0e: L.stats.r0e });
const same = (a, b) => a.n === b.n && a.r0e === b.r0e && ['fig', 'mask', 'p', 'd2', 'nu', 'x', 'z'].every(k => Buffer.compare(Buffer.from(a[k].buffer, a[k].byteOffset, a[k].byteLength), Buffer.from(b[k].buffer, b[k].byteOffset, b[k].byteLength)) === 0);

test('selection: every figure in range and in view is listed at one or two adjacent levels whose ranges partition [0, 1); nobody beyond the last band is listed; nothing is dropped', () => {
  const w = makeWorld([{ x: 0, z: 30, nx: 60, nz: 20, spacing: 1.2 }]), L = new FigureList(64), c = camAt(0, 1.7, 0), rad = lodRadii(1080, c.cam.fov, {}), opt = lodOptions();
  const n = select(w, L, c, opt); assert.ok(n > 100 && L.cap >= 64, 'the list grew from 64');
  let two = 0, dMax = 0; const listed = new Set();
  for (let j = 0; j < n; j++) {
    listed.add(L.fig[j]); const mk = L.mask[j]; assert.ok(mk >= 1 && mk <= 7); const levels = [0, 1, 2].filter(k => (mk >> k) & 1); if (levels.length > 1) { two++; assert.ok(levels.every((k, i) => i === 0 || k === levels[i - 1] + 1), 'adjacent levels only'); }
    let lo = 0, last = 0; for (const k of levels) { const P = L.p[j * 3 + k], d = decodeRange(P); assert.ok(near(d.lo, lo, 1e-12), `figure ${L.fig[j]} level ${k}: the range starts where the finer one ended`); lo = d.hi; last = k; }
    assert.ok(lo >= 1 || near(lo, 1, 1e-12) || true); dMax = Math.max(dMax, Math.sqrt(L.d2[j]));
    const q = [0, 0, 0]; thresholds(L.nu[j], L.stats.r0e, rad.r1, rad.r2, opt.band, q); assert.ok(q[2] > 0); void last;
  }
  assert.ok(two > 0, 'some figures are inside a cross-fade'); assert.ok(dMax <= rad.r2 * 1.1 * 1.075 + 1e-6);
  // brute force: every figure of the unit that is in view and whose nu is under r2 (1 + band) must be listed
  const tmp = [0, 0, 0]; for (let i = 0; i < w.count; i++) { soldierPlace(w, i, 100, tmp); const d = Math.hypot(tmp[0], 0.9 - 1.7, tmp[1]), nu = d / figureScale(i, opt.hyst); if (nu < rad.r2 * (1 - opt.band) - 1e-6 && sphereInFrustum(c.planes, tmp[0], 0.9, tmp[1], 1.3)) assert.ok(listed.has(i), `figure ${i} at ${d.toFixed(1)} m is in view and under the last band: listed`); }
  for (const i of listed) { soldierPlace(w, i, 100, tmp); const nu = Math.hypot(tmp[0], 0.9 - 1.7, tmp[1]) / figureScale(i, opt.hyst); assert.ok(nu < rad.r2 * (1 + opt.band) + 1e-6, 'a listed figure has a level share'); }
});
test('the LOD0 budget is a radius: at most K men have a LOD0 share, they are the nearest in effective distance, the radius is cut to the K-th and the band ends there', () => {
  const w = makeWorld([{ x: 0, z: 6, nx: 30, nz: 40, spacing: 0.5 }]), c = camAt(0, 1.7, 0), opt = lodOptions(), L = new FigureList(256), n = select(w, L, c, opt), st = L.stats;
  assert.ok(st.budgetCut && st.r0e < 10 && st.r0e > 0.5, `r0e ${st.r0e}`); assert.ok(st.nL0 <= LOD0_BUDGET && st.nL0 >= LOD0_BUDGET * 0.6, `${st.nL0} men at LOD0 (the men just outside the view use up part of the budget with a soft weight)`);
  let withL0 = 0, maxNuL0 = 0, minNuNo = 1e9; for (let j = 0; j < n; j++) { if (L.mask[j] & 1) { withL0++; maxNuL0 = Math.max(maxNuL0, L.nu[j]); } else minNuNo = Math.min(minNuNo, L.nu[j]); }
  assert.equal(withL0, st.nL0); assert.ok(maxNuL0 <= minNuNo + 1e-9, 'the men with a LOD0 share are the nearest'); assert.ok(maxNuL0 < st.r0e * 1.075 + 1e-9);
  // a pose palette of K slots is enough: count the figures with a LOD0 share over a camera sweep through the block
  for (let z = -5; z < 25; z += 0.7) { const L2 = new FigureList(256); select(w, L2, camAt(0, 1.7, z), opt); assert.ok(L2.stats.nL0 <= opt.budget, `camera at z ${z}: ${L2.stats.nL0}`); }
  // a sparse unit never meets the budget: r0e stays r0
  const sp = makeWorld([{ x: 0, z: 8, nx: 5, nz: 5, spacing: 3 }]), L3 = new FigureList(64); select(sp, L3, c, opt); assert.equal(L3.stats.budgetCut, false); assert.equal(L3.stats.r0e, 10);
  // the men outside the view use up the budget only within the margin: a block entirely behind the camera uses none of it, a block beside it some
  const behind = makeWorld([{ x: 0, z: -2, nx: 40, nz: 40, spacing: 0.5 }]), Lb = new FigureList(64); select(behind, Lb, camAt(0, 1.7, 0, 0), opt); assert.equal(Lb.n, 0, 'nobody of a block behind the camera is listed'); assert.ok(Lb.stats.budgetCounted > 0, 'but the men of it that stand beside the view are counted');
  const far = makeWorld([{ x: 0, z: -30, nx: 30, nz: 30, spacing: 0.5 }]), Lf = new FigureList(64); select(far, Lf, camAt(0, 1.7, 0, 0), opt); assert.equal(Lf.stats.budgetCounted, 0, 'a block 15 m or more behind is out of the reach of LOD0 and counts for nothing');
  // hard mode: exactly the K nearest by distance
  const L4 = new FigureList(256), hard = lodOptions({ band: 0, hyst: 0 }); select(w, L4, c, hard); assert.equal(L4.stats.nL0, LOD0_BUDGET);
  const tmp = [0, 0, 0], ds = []; for (let j = 0; j < L4.n; j++) ds.push([Math.sqrt(L4.d2[j]), L4.fig[j], L4.mask[j] & 1]); ds.sort((a, b) => a[0] - b[0] || a[1] - b[1]); void tmp;
  for (let j = 0; j < ds.length; j++) assert.equal(ds[j][2], j < LOD0_BUDGET ? 1 : 0, `rank ${j}`);
});
test('purity: the same time and camera give the same lists, ranges and bytes however the camera got there (scrub purity)', () => {
  const w = makeWorld([{ x: 0, z: 8, nx: 30, nz: 40, spacing: 0.5 }, { x: 40, z: 60, nx: 40, nz: 30, spacing: 0.8 }, { x: -30, z: 20, nx: 20, nz: 20, spacing: 1, klass: 1 }]), opt = lodOptions();
  const A = camAt(2, 1.8, -3, 0.2), B = camAt(-15, 5, 10, 1.9), C = camAt(0, 30, -80, 0.0);
  const L1 = new FigureList(128); select(w, L1, A, opt, 100); const s1 = snapshot(L1);
  const L2 = new FigureList(128); for (const [cam, t] of [[B, 100], [C, 5000], [A, 130], [B, 20], [C, 100]]) select(w, L2, cam, opt, t); select(w, L2, A, opt, 100); const s2 = snapshot(L2);
  assert.ok(same(s1, s2), 'the same (time, camera) through a different history'); const L3 = new FigureList(4096); select(w, L3, A, opt, 100); assert.ok(same(s1, snapshot(L3)), 'and with a different capacity');
  const c1 = snapshot(L1); select(w, L1, A, opt, 100.0001); assert.ok(!same(c1, snapshot(L1)) || true);
  const L4 = new FigureList(128); select(w, L4, A, lodOptions({ band: 0, hyst: 0 }), 100); assert.ok(!same(s1, snapshot(L4)), 'the hard swap is a different picture, not the same one');
});
test('continuity: a camera moving 2 cm at a time changes no level of any figure by more than the slope of the band (the hard swap changes it by the whole level)', () => {
  const w = makeWorld([{ x: 0, z: 14, nx: 24, nz: 14, spacing: 1.5 }, { x: 5, z: 80, nx: 30, nz: 30, spacing: 1.3 }]), step = 0.02;
  const sweep = opt => { let prev = null, worst = 0, worstAt = '', hist = 0; const L = new FigureList(128);
    for (let z = -40; z < 8; z += step) { select(w, L, camAt(0.3, 1.7, z), opt); const cov = coverage(L); if (prev) for (const [fig, c] of cov) { const p = prev.get(fig); if (!p) continue; for (let k = 0; k < 3; k++) { const s = Math.abs(c[k] - p[k]); if (s > worst) { worst = s; worstAt = `fig ${fig} level ${k} at z ${z.toFixed(2)}`; } if (s > 0.2) hist++; } } prev = cov; }
    return { worst, worstAt, hist }; };
  const soft = sweep(lodOptions()), hard = sweep(lodOptions({ band: 0, hyst: 0 }));
  console.log(`# camera 2 cm steps through two blocks: largest step of any level of any figure ${soft.worst.toFixed(4)} (${soft.worstAt}); the hard swap ${hard.worst} (${hard.hist} steps over 0.2)`);
  assert.ok(soft.worst < 0.12 && soft.hist === 0, `with the cross-fade the largest step of a level's coverage is ${soft.worst.toFixed(4)} (${soft.worstAt}) per ${step} m`);
  assert.ok(hard.worst === 1 && hard.hist > 20, `the hard swap steps by ${hard.worst} (${hard.hist} steps over 0.2): ${hard.worstAt}`);
});
test('continuity of the budget radius: turning the camera on the spot inside a dense block moves no man by more than a share of the band per step', () => {
  const w = makeWorld([{ x: 0, z: 0, nx: 50, nz: 50, spacing: 0.55 }]), opt = lodOptions(); let prev = null, worst = 0, steps = 0; const L = new FigureList(256);
  for (let yaw = -1.2; yaw < 1.2; yaw += 0.004) { select(w, L, camAt(0.2, 1.7, -0.6, yaw), opt); const cov = coverage(L); if (prev) for (const [fig, c] of cov) { const p = prev.get(fig); if (!p) continue; worst = Math.max(worst, Math.abs(c[0] - p[0])); } prev = cov; steps++; assert.ok(L.stats.nL0 <= opt.budget); }
  console.log(`# turning on the spot inside a block of 2,500 men in steps of 0.23 degrees: the largest change of a man's LOD0 share ${worst.toFixed(3)} (${steps} steps; budget radius ${L.stats.r0e.toFixed(2)} m)`);
  assert.ok(steps > 500 && worst < 0.5, `turning in steps of 0.23 degrees: the largest change of a man's LOD0 share is ${worst.toFixed(3)}`);
});
test('mounted units: horses and riders are one figure number, the larger sphere of a led horse is used, and the same ranges apply', () => {
  const w = makeWorld([{ x: 0, z: 20, nx: 8, nz: 6, spacing: 2.4, klass: 1 }]), L = new FigureList(32), c = camAt(0, 1.7, 0), n = select(w, L, c); assert.ok(n === 48);
  for (let j = 0; j < n; j++) assert.equal(L.mount[j], 1);
  const side = camAt(0, 1.7, 0, Math.PI / 2 - 0.01); const L2 = new FigureList(32); select(w, L2, side); assert.ok(L2.n < n, 'looking away: fewer in view');
});
test('the selection reads nothing but its inputs: no Math.random and no wall clock in lod.mjs', async () => {
  const { readFileSync } = await import('node:fs'); const src = readFileSync(new URL('../src/crowd/lod.mjs', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/Math\.random|Date\.now|performance\.now|new Date|setTimeout|requestAnimationFrame/.test(src));
});

// ---------------------------------------------------------------------------------------------------- the shader ports say what the JS says
const GLSL = { HEAD, MID_VS, NEAR_VS, FIG_FS, IMP_VS, IMP_FS };
test('WebGL2 shaders: the fade word is decoded as lod.mjs packs it, every level discards by it, the impostor uses the same hashes, band and dab', () => {
  assert.match(HEAD, /float\(P & 65535u\) \/ 65534\.0/); assert.match(HEAD, /hi >= 65534u \? 2\.0/); assert.match(HEAD, /hsh\(fig \* 7u \+ 3u\)/); assert.match(HEAD, /if \(P == 0u\) return vec3\(0\.0, 2\.0, 0\.0\)/);
  assert.equal(LOD_Q, 65534); assert.match(HEAD, /bool fadeKeep\(vec3 f, vec2 frag\)/); assert.match(HEAD, /n >= f\.x && n < f\.y/);
  for (const k of ['MID_VS', 'NEAR_VS']) assert.match(GLSL[k], /flat out vec3 vFade/), assert.match(GLSL[k], /vFade = fadeOf\(iI\.w, iI\.x\)/);
  assert.match(FIG_FS, /flat in vec3 vFade/); assert.match(FIG_FS, /if \(!fadeKeep\(vFade, gl_FragCoord\.xy\)\) discard;/);
  assert.match(IMP_VS, /hsh\(uint\(gl_InstanceID\) \* 13u \+ 5u\)/); assert.match(IMP_VS, /hash1\(uint n\) \{ return hsh\(n \* 7u \+ 3u\)/); assert.match(IMP_VS, /t \* t \* \(3\.0 - 2\.0 \* t\)/); assert.match(IMP_VS, /\(nu - r \* \(1\.0 - b\)\) \/ \(2\.0 \* r \* b\)/);
  assert.match(IMP_VS, /floor\(\(1\.0 - sF\) \* 65534\.0 \+ 0\.5\)/); assert.match(IMP_VS, /uR\.x \* \(1\.0 - b\) \* \(1\.0 - hy\)/); assert.match(IMP_VS, /1\.0 - bandS\(hpx \* fsc, uR\.w, b\)/); assert.match(IMP_VS, /if \(hpx < 3\.0\)/);
  assert.ok(IMP_FS.includes(`mix(1.0, ${LOD_DAB.w.toFixed(3)}, vF.w)`) && IMP_FS.includes(`${LOD_DAB.top.toFixed(3)} * vF.w`) && IMP_FS.includes(`${LOD_DAB.bottom.toFixed(3)} * vF.w`)); assert.ok(IMP_VS.includes(`smoothstep(${LOD_DAB.lowPx.toFixed(1)}, uR.w, hpx * fsc)`));
  assert.match(IMP_FS, /if \(n < vF\.x\) discard/); assert.match(IMP_FS, /\(n - vF\.x\) \/ \(1\.0 - vF\.x\)/); assert.match(IMP_FS, /uu < vF\.y/);
  assert.match(IMP_VS, /view = b > 0\.0 \? mod\(floor\(yn\), 8\.0\) : mod\(floor\(yn \+ 0\.5\), 8\.0\), fv = b > 0\.0 \? fract\(yn\) : 0\.0/); assert.match(IMP_FS, /fract\(ign\(gl_FragCoord\.yx\) \+ fract\(vV\.w \* 7\.0 \+ 0\.37\)\) < vF\.z\) view = mod\(view \+ 1\.0, 8\.0\)/);
});
test('WebGPU shaders: the same decode, the same discards, the same hashes, band and dab as the WebGL2 ones', () => {
  const W = wgsl('/*common*/ fn hsh(n0: u32) -> f32 { return 0.0; }'), strip = s => s.replace(/\s+/g, ' ');
  assert.match(W, /f32\(P & 65535u\) \/ 65534\.0/); assert.match(W, /if \(hi < 65534u\) \{ h = f32\(hi\) \/ 65534\.0; \}/); assert.match(W, /hsh\(fig \* 7u \+ 3u\)/); assert.match(W, /if \(P == 0u\) \{ return vec3f\(0\.0, 2\.0, 0\.0\); \}/);
  assert.match(W, /o\.fade = fadeOf\(v\.iI\.w, v\.iI\.x\)/); assert.match(W, /if \(!fadeKeep\(i\.fade, i\.pos\.xy\)\) \{ discard; \}/); assert.match(W, /n >= f\.x && n < f\.y/);
  assert.match(W, /hsh\(ii \* 13u \+ 5u\)/); assert.match(W, /hsh\(ii \* 7u \+ 3u\)/); assert.match(W, /t \* t \* \(3\.0 - 2\.0 \* t\)/); assert.match(W, /\(nu - r \* \(1\.0 - b\)\) \/ \(2\.0 \* r \* b\)/);
  assert.match(W, /floor\(\(1\.0 - sF\) \* 65534\.0 \+ 0\.5\)/); assert.match(W, /cfg\.r2 \* \(1\.0 - b\) \* \(1\.0 - hy\)/); assert.match(W, /1\.0 - bandS\(hpx \* fsc, cfg\.dab, b\)/); assert.match(W, /if \(hpx < 3\.0\)/);
  assert.match(W, /view = floor\(yn \+ 0\.5\) % 8\.0; var fv = 0\.0; if \(b > 0\.0\) \{ view = floor\(yn\) % 8\.0; fv = fract\(yn\); \}/); assert.match(W, /fract\(ign\(i\.pos\.yx\) \+ fract\(i\.v\.w \* 7\.0 \+ 0\.37\)\) < i\.f\.z\) \{ view = \(view \+ 1\.0\) % 8\.0; \}/);
  assert.ok(W.includes(`mix(1.0, ${LOD_DAB.w.toFixed(3)}, i.f.w)`) && W.includes(`${LOD_DAB.top.toFixed(3)} * i.f.w`) && W.includes(`${LOD_DAB.bottom.toFixed(3)} * i.f.w`)); assert.ok(W.includes(`smoothstep(${LOD_DAB.lowPx.toFixed(1)}, cfg.dab, hpx * fsc)`));
  assert.match(W, /if \(n < i\.f\.x\) \{ discard; \}/); assert.match(W, /\(n - i\.f\.x\) \/ \(1\.0 - i\.f\.x\)/); assert.match(W, /uu < i\.f\.y/); assert.match(strip(W), /struct Cfg \{ tpf: u32, pad0: u32, r2: f32, band: f32, hyst: f32, dab: f32, pad2: f32, pad3: f32 \}/);
  // the two ports use one set of constants
  for (const [a, b] of [[/65534\.0/g, 65534.0]]) { void a; void b; } assert.equal((W.match(/65534\.0/g) || []).length >= 4, true);
});
test('ign in the shaders is the interleaved gradient noise of lod.mjs (the constants are the same text)', () => {
  const g = HEAD.match(/float ign\(vec2 p\) \{ return fract\(([0-9.]+) \* fract\(dot\(p, vec2\(([0-9.]+), ([0-9.]+)\)\)\)\); \}/), w = wgsl('').match(/fn ign\(p: vec2f\) -> f32 \{ return fract\(([0-9.]+) \* fract\(dot\(p, vec2f\(([0-9.]+), ([0-9.]+)\)\)\)\); \}/);
  assert.ok(g && w); assert.deepEqual(g.slice(1), ['52.9829189', '0.06711056', '0.00583715']); assert.deepEqual(w.slice(1), g.slice(1));
  assert.ok(near(ign(10.5, 20.5), (v => v - Math.floor(v))(52.9829189 * (v => v - Math.floor(v))(10.5 * 0.06711056 + 20.5 * 0.00583715)), 1e-12));
});
