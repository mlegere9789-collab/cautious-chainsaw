// test/interp.test.mjs - the motion between keyframes: exact at keyframes, never overshoots, continuous velocity, deterministic; plus the damping primitives.
//   node --test docs/pitch/anim/prototype/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { PchipTrack, ChordTrack, LinearTrack, pchipSlopes, newSample } from '../src/interp/paths.mjs';
import { dampStep, dampStep2, Damper } from '../src/interp/damp.mjs';
import { loadDocs } from '../src/headless.mjs';
import { M_PER_DEG_LAT, mPerDegLng } from '../src/geo/project.mjs';

const { dataset } = loadDocs();
const kfsOf = (r) => r.kf.map((k) => [k[0], k[1], k[2]]);
const MODELS = { pchip: (k, e) => new PchipTrack(k, e), chord: (k, e) => new ChordTrack(k, e), linear: (k) => new LinearTrack(k) };
const EPS = 1e-9;

test('every model is EXACT at every keyframe of every one of the 478 real units', () => {
  let n = 0;
  for (const [name, mk] of Object.entries(MODELS)) for (const endSlopes of ['rest', 'edge']) {
    for (const u of dataset.units) {
      const kfs = kfsOf(u); const tr = mk(kfs, endSlopes); const out = newSample();
      for (const k of kfs) { tr.at(k[0], out); assert.equal(out.present, true); assert.ok(Math.abs(out.lat - k[1]) < 1e-12 && Math.abs(out.lng - k[2]) < 1e-12, `${name}/${endSlopes} ${u.id} tick ${k[0]}`); n++; }
      tr.at(kfs[0][0] - 0.25, out); assert.equal(out.present, false, 'a unit does not exist before its first keyframe');
      const last = kfs[kfs.length - 1]; tr.at(last[0] + 500, out); assert.ok(out.present && out.lat === last[1] && out.lng === last[2] && out.vLat === 0, 'carry-forward holds the last keyframe');
    }
  }
  assert.ok(n > 6000, 'checked ' + n + ' keyframes');
});

test('pchip never overshoots: every sample stays inside the bounding box of its two keyframes, and each axis is monotone inside a segment', () => {
  const out = newSample(); let samples = 0; let segs = 0;
  for (const endSlopes of ['rest', 'edge']) for (const u of dataset.units) {
    const kfs = kfsOf(u); const tr = new PchipTrack(kfs, endSlopes);
    for (let i = 0; i + 1 < kfs.length; i++) {
      segs++;
      const [t0, a0, b0] = kfs[i]; const [t1, a1, b1] = kfs[i + 1];
      const loA = Math.min(a0, a1) - EPS; const hiA = Math.max(a0, a1) + EPS; const loB = Math.min(b0, b1) - EPS; const hiB = Math.max(b0, b1) + EPS;
      const sa = Math.sign(a1 - a0); const sb = Math.sign(b1 - b0);
      let prevLat = a0; let prevLng = b0;
      for (let k = 1; k <= 40; k++) {
        const t = t0 + (t1 - t0) * k / 41; tr.at(t, out); samples++;
        assert.ok(out.lat >= loA && out.lat <= hiA && out.lng >= loB && out.lng <= hiB, `${u.id} segment ${t0}-${t1} left its keyframe box`);
        assert.ok((out.lat - prevLat) * sa >= -EPS && (out.lng - prevLng) * sb >= -EPS, `${u.id} segment ${t0}-${t1} is not monotone`);
        prevLat = out.lat; prevLng = out.lng;
      }
    }
  }
  assert.ok(samples > 40000, `${samples} samples over ${segs} segments`);
});

test('chord-smooth stays ON the straight chord (geography untouched) and linear is a straight chord at constant speed', () => {
  const out = newSample();
  for (const u of dataset.units.slice(0, 200)) {
    const kfs = kfsOf(u); const ch = new ChordTrack(kfs); const li = new LinearTrack(kfs);
    for (let i = 0; i + 1 < kfs.length; i++) {
      const [t0, a0, b0] = kfs[i]; const [t1, a1, b1] = kfs[i + 1];
      for (let k = 1; k < 10; k++) {
        const t = t0 + (t1 - t0) * k / 10; ch.at(t, out);
        const dA = a1 - a0; const dB = b1 - b0; const len2 = dA * dA + dB * dB;
        if (len2 > 0) { const u2 = ((out.lat - a0) * dA + (out.lng - b0) * dB) / len2; assert.ok(u2 >= -1e-9 && u2 <= 1 + 1e-9, 'progress stays within the chord'); assert.ok(Math.abs(a0 + dA * u2 - out.lat) < 1e-9 && Math.abs(b0 + dB * u2 - out.lng) < 1e-9, 'point lies on the chord'); }
        li.at(t, out); assert.ok(Math.abs(out.lat - (a0 + (a1 - a0) * k / 10)) < 1e-12);
      }
    }
  }
});

test('pchip is C1: the velocity is continuous through every interior keyframe (no stop-and-go), unlike linear', () => {
  const o1 = newSample(); const o2 = newSample(); let worstP = 0; let worstL = 0; let checked = 0; let linJumps = 0;
  for (const u of dataset.units) {
    const kfs = kfsOf(u); if (kfs.length < 3) continue; const tr = new PchipTrack(kfs); const li = new LinearTrack(kfs);
    for (let i = 1; i + 1 < kfs.length; i++) {
      const t = kfs[i][0]; const e = 1e-6;
      tr.at(t - e, o1); tr.at(t + e, o2); worstP = Math.max(worstP, Math.abs(o1.vLat - o2.vLat), Math.abs(o1.vLng - o2.vLng)); checked++;
      li.at(t - e, o1); li.at(t + e, o2); const dj = Math.abs(o1.vLat - o2.vLat) + Math.abs(o1.vLng - o2.vLng); worstL = Math.max(worstL, dj); if (dj > 1e-9) linJumps++;
    }
  }
  assert.ok(checked > 600, `${checked} interior keyframes`);
  assert.ok(worstP < 1e-6, `pchip velocity jump at a keyframe: ${worstP}`);
  assert.ok(linJumps > checked / 2, `linear has velocity jumps at ${linJumps} of ${checked} keyframes (the baseline the new model removes)`);
  assert.ok(worstL > 0);
});

test('pchip slopes: zero at a local extremum, harmonic inside monotone runs, rest ends are zero, edge ends obey the shape-preserving rule', () => {
  const t = [0, 1, 2, 3, 4]; const y = [0, 1, 0, 0, 5];
  const m = pchipSlopes(t, y, 'rest');
  assert.equal(m[0], 0); assert.equal(m[4], 0); assert.equal(m[1], 0, 'extremum'); assert.equal(m[2], 0, 'flat neighbour');
  const e = pchipSlopes([0, 1, 2], [0, 1, 2], 'edge'); assert.ok(Math.abs(e[0] - 1) < 1e-12 && Math.abs(e[1] - 1) < 1e-12 && Math.abs(e[2] - 1) < 1e-12, 'linear data keeps slope 1');
  const two = new PchipTrack([[0, 0, 0], [10, 1, 1]], 'rest'); const o = newSample(); two.at(5, o); assert.ok(Math.abs(o.lat - 0.5) < 1e-12, 'two keyframes with rest ends = smoothstep, midpoint 0.5');
  two.at(0.001, o); assert.ok(o.vLat < 1e-4, 'starts at rest');
});

test('rejects non-increasing keyframe ticks; single-keyframe units are a point', () => {
  assert.throws(() => new PchipTrack([[5, 0, 0], [5, 1, 1]]));
  const one = new PchipTrack([[7, 39.8, -77.2]]); const o = newSample(); one.at(7, o); assert.ok(o.present && o.lat === 39.8); one.at(100, o); assert.ok(o.present && o.lat === 39.8 && !o.moving);
});

test('deterministic: two builds of the same data give identical samples', () => {
  const u = dataset.units.find((x) => x.kf.length > 5); const a = new PchipTrack(kfsOf(u)); const b = new PchipTrack(kfsOf(u)); const o1 = newSample(); const o2 = newSample();
  for (let t = u.kf[0][0]; t < u.kf[u.kf.length - 1][0]; t += 0.37) { a.at(t, o1); b.at(t, o2); assert.deepEqual({ ...o1 }, { ...o2 }); }
});

test('how far does pchip leave the straight chord on the REAL data (reported, bounded by the keyframe box)', () => {
  const out = newSample(); const dev = [];
  for (const u of dataset.units) {
    const kfs = kfsOf(u); const tr = new PchipTrack(kfs);
    for (let i = 0; i + 1 < kfs.length; i++) {
      const [t0, a0, b0] = kfs[i]; const [t1, a1, b1] = kfs[i + 1]; if (a0 === a1 && b0 === b1) continue;
      const mx = mPerDegLng(a0); let worst = 0;
      for (let k = 1; k < 30; k++) { tr.at(t0 + (t1 - t0) * k / 30, out); const dA = (a1 - a0) * M_PER_DEG_LAT; const dB = (b1 - b0) * mx; const pA = (out.lat - a0) * M_PER_DEG_LAT; const pB = (out.lng - b0) * mx; const len = Math.hypot(dA, dB); worst = Math.max(worst, Math.abs(pA * dB - pB * dA) / len); }
      dev.push(worst);
    }
  }
  dev.sort((x, y) => x - y); const q = (p) => dev[Math.floor(p * (dev.length - 1))];
  console.log(`# pchip distance from the straight chord over ${dev.length} moving segments: median ${q(0.5).toFixed(1)} m, p90 ${q(0.9).toFixed(1)} m, max ${dev[dev.length - 1].toFixed(1)} m`);
  assert.ok(dev.length > 800 && Number.isFinite(dev[dev.length - 1]));
});

// ---- critically damped smoothing --------------------------------------------------------------------------------------------------------------------
test('critical damping: converges, never overshoots, and is frame-rate independent (closed form)', () => {
  let x = 0; let v = 0; for (let i = 0; i < 400; i++) { [x, v] = dampStep(x, v, 100, 0.2, 1 / 60); assert.ok(x <= 100 + 1e-9, 'no overshoot'); }
  assert.ok(Math.abs(x - 100) < 0.01, 'converged: ' + x);
  const a = dampStep(0, 0, 50, 0.3, 0.5); let b = [0, 0]; for (let i = 0; i < 500; i++) b = dampStep(b[0], b[1], 50, 0.3, 0.001);
  assert.ok(Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9, 'one 500 ms step = 500 steps of 1 ms');
  const c = dampStep(0, 0, 10, 0.2, 0.2 * 3); assert.ok(c[0] > 9.8, '3 smooth-times covers over 98 %');
});

test('damping with a speed cap never exceeds it; a moving start toward the target still never passes it', () => {
  let x = 0; let v = 0; let peak = 0; for (let i = 0; i < 600; i++) { [x, v] = dampStep(x, v, 1000, 0.1, 1 / 60, 200); peak = Math.max(peak, Math.abs(v)); assert.ok(x <= 1000 + 1e-9); }
  assert.ok(peak <= 200 + 1e-9, 'peak speed ' + peak); assert.ok(Math.abs(x - 1000) < 0.5);
  let y = 99; let w = 5000; for (let i = 0; i < 100; i++) { [y, w] = dampStep(y, w, 100, 0.2, 1 / 60); assert.ok(y <= 100 + 1e-9, 'overshoot guard'); }
});

test('2-D damping equals the scalar damping per axis and obeys the vector speed cap', () => {
  const p = { x: 0, y: 0 }; const vel = { x: 0, y: 0 }; let sx = [0, 0]; let sy = [0, 0];
  for (let i = 0; i < 50; i++) { dampStep2(p, vel, 30, -40, 0.25, 1 / 60); sx = dampStep(sx[0], sx[1], 30, 0.25, 1 / 60); sy = dampStep(sy[0], sy[1], -40, 0.25, 1 / 60); }
  assert.ok(Math.abs(p.x - sx[0]) < 1e-9 && Math.abs(p.y - sy[0]) < 1e-9);
  const q = { x: 0, y: 0 }; const vq = { x: 0, y: 0 }; let peak = 0; for (let i = 0; i < 300; i++) { dampStep2(q, vq, 3000, 4000, 0.1, 1 / 60, 500); peak = Math.max(peak, Math.hypot(vq.x, vq.y)); }
  assert.ok(peak <= 500 + 1e-6, 'vector speed ' + peak);
  const d = new Damper(0, 0.1); d.step(10, 1); assert.ok(Math.abs(d.x - 10) < 0.05);
});
