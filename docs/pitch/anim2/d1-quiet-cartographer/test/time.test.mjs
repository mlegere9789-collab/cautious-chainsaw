// test/time.test.mjs - the continuous fractional-tick clock: fixed timestep with interpolation, eased play/pause/speed, glided seeks, and the candidate clock labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransport } from '../src/time/transport.mjs';
import { createClock, parseLocal } from '../src/time/clock.mjs';
import { createTuning } from '../src/tuning/tuning.mjs';
import { loadDocs } from '../src/headless.mjs';

const { dataset, tokens } = loadDocs();
const mk = (settings = {}, opts = {}) => { const tuning = createTuning(tokens); for (const [k, v] of Object.entries(settings)) tuning.set(k, v); return { tuning, tr: createTransport((id) => tuning.get(id), { tickMax: 675, ...opts }) }; };
const runUs = (tr, frames) => { for (const us of frames) tr.advance(us / 1e6); };

test('the simulation depends on elapsed time, not on how it was cut into frames (integer-microsecond accumulation)', () => {
  const cuts = [Array(200).fill(10000), Array(100).fill(20000), [], Array(50).fill(40000)];
  const irregular = []; let left = 2000000; let i = 0; const pat = [3000, 17000, 8000, 30000, 1000, 26000, 5000, 10000]; while (left > 0) { const v = Math.min(pat[i++ % pat.length], left); irregular.push(v); left -= v; } cuts[2] = irregular;
  const states = cuts.map((c) => { const { tr } = mk(); tr.setSpeed(4); tr.play(); runUs(tr, c); return tr.snapshot(); });
  for (const s of states) { assert.equal(s.simTau, states[0].simTau, 'simulated tick is identical for every way of cutting 2 s'); assert.equal(s.steps, states[0].steps); }
});

test('the rendered tick is the simulation interpolated by the unconsumed step: continuous, monotone while playing, and exact at step boundaries', () => {
  const { tr } = mk({ 'time.speedRampMs': 0 }); tr.setSpeed(8); tr.play();
  let prev = tr.tau; let maxStep = 0;
  for (let i = 0; i < 300; i++) { const t = tr.advance((i % 5 === 0 ? 0.031 : 0.007)); assert.ok(t >= prev - 1e-12, 'never goes backwards'); maxStep = Math.max(maxStep, t - prev); prev = t; }
  const step = 8 * 2 / 120; assert.ok(maxStep < 4 * step + 1e-9, 'a 31 ms frame advances about 4 steps, not a hitch: ' + maxStep);
  const snap = tr.snapshot(); const acc = snap.accUs; assert.ok(acc >= 0 && acc < 8334);
  const { tr: t2 } = mk({ 'time.speedRampMs': 0 }); t2.setSpeed(1); t2.play(); for (let i = 0; i < 5; i++) t2.advance(0.1); assert.ok(Math.abs(t2.tau - (1 + 1)) < 2 / 120 + 1e-9, 'half a second at 1x = 1 tick (2 ticks per second): ' + t2.tau);
});

test('speed and pause are eased, not instant; with ramp 0 they are instant', () => {
  const { tr } = mk(); tr.setSpeed(2); tr.play(); tr.advance(0.016); const s1 = tr.speedEff; assert.ok(s1 > 0 && s1 < 0.5, 'starts gently: ' + s1);
  for (let i = 0; i < 90; i++) tr.advance(1 / 60); assert.ok(Math.abs(tr.speedEff - 2) < 0.01, 'reaches the speed: ' + tr.speedEff);
  tr.pause(); tr.advance(0.016); assert.ok(tr.speedEff > 1.5, 'does not stop dead'); for (let i = 0; i < 120; i++) tr.advance(1 / 60); assert.equal(tr.speedEff, 0); const t = tr.simTau; tr.advance(1); assert.equal(tr.simTau, t, 'paused clock does not move');
  const z = mk({ 'time.speedRampMs': 0 }); z.tr.setSpeed(2); z.tr.play(); z.tr.advance(0.01); assert.equal(z.tr.speedEff, 2);
});

test('a seek is a GLIDE: monotone, no overshoot, never faster than the cap, and it lands exactly on the target', () => {
  const { tr } = mk({ 'time.glideMs': 400, 'time.glideMaxTps': 100 }); tr.seek(200, { glide: false }); assert.equal(tr.simTau, 200);
  tr.seek(426); assert.equal(tr.gliding, true); let prev = tr.simTau; let peak = 0; let frames = 0;
  while (tr.gliding && frames < 2000) { tr.advance(1 / 60); frames++; assert.ok(tr.simTau >= prev - 1e-12 && tr.simTau <= 426 + 1e-9, 'monotone, no overshoot'); peak = Math.max(peak, (tr.simTau - prev) * 60); prev = tr.simTau; }
  assert.equal(tr.simTau, 426); assert.ok(!tr.gliding && frames > 30 && frames < 600, 'frames to land: ' + frames); assert.ok(peak <= 100 + 1.5, 'peak ticks/s ' + peak);
  tr.seek(10); for (let i = 0; i < 600; i++) tr.advance(1 / 60); assert.equal(tr.simTau, 10, 'backwards too');
});

test('seek with glide:false lands at once; reduced motion turns every glide into an instant landing', () => {
  const { tr } = mk(); tr.seek(300, { glide: false }); assert.equal(tr.simTau, 300); assert.equal(tr.tau, 300);
  const r = mk({}, { reduced: () => true }); r.tr.seek(500); assert.equal(r.tr.simTau, 500); assert.equal(r.tr.gliding, false);
});

test('playing while gliding keeps the target moving with the clock; the end stops (or loops) and a long stall cannot fast-forward', () => {
  const { tr } = mk({ 'time.speedRampMs': 0 }); tr.setSpeed(1); tr.play(); tr.seek(100); const t0 = tr.target; tr.advance(0.1); assert.ok(tr.target > t0, 'target advances with playback');
  const e = mk({ 'time.speedRampMs': 0 }); e.tr.seek(674.5, { glide: false }); e.tr.setSpeed(8); e.tr.play(); let ended = false; e.tr.on((type) => { if (type === 'end') ended = true; }); for (let i = 0; i < 60; i++) e.tr.advance(1 / 60);
  assert.equal(e.tr.simTau, 675); assert.ok(ended && !e.tr.playing);
  const l = mk({ 'time.speedRampMs': 0, 'time.endBehavior': 'loop' }); l.tr.seek(674.9, { glide: false }); l.tr.setSpeed(8); l.tr.play(); for (let i = 0; i < 30; i++) l.tr.advance(1 / 60); assert.ok(l.tr.playing && l.tr.simTau < 50, 'looped: ' + l.tr.simTau);
  const s = mk({ 'time.speedRampMs': 0 }); s.tr.setSpeed(1); s.tr.play(); s.tr.advance(10); assert.ok(s.tr.simTau - 1 <= 0.1 * 2 + 0.05, 'a 10 s stall advances at most maxFrameMs (100 ms): ' + s.tr.simTau);
});

test('the clock: exact at every anchor, strictly monotone over all 675 ticks, always labelled Modelled and candidate', () => {
  const c = createClock(dataset.clock);
  for (const a of c.anchors) { assert.equal(c.minutesAt(a.tick), parseLocal(a.t), 'anchor ' + a.tick); }
  let prev = -1; for (let t = 1; t <= 675; t++) { const m = c.minutesAt(t); assert.ok(m > prev, 'monotone at ' + t); prev = m; }
  const d = c.describe(12); assert.equal(d.evidence, 'Modelled'); assert.equal(d.candidate, true); assert.match(d.text, /^7:30 AM$/); assert.equal(d.date, 'July 1'); assert.match(d.badge, /candidate/);
  assert.equal(c.describe(538).text, '3:00 PM'); assert.equal(c.describe(675).text, '8:00 PM'); assert.equal(c.describe(451).date, 'July 3'); assert.equal(c.dayOf(226), 2);
  assert.ok(c.describe(100.5).sigmaMin >= 5 && c.describe(100.5).sigmaMin <= 30, 'uncertainty stays within the anchors\' own sigma range');
  assert.ok(dataset.clock.release === 'candidate' && /CANDIDATE/.test(dataset.clock.notice));
  assert.throws(() => createClock({ ...dataset.clock, anchors: [...dataset.clock.anchors].reverse() }), /increasing/);
});
