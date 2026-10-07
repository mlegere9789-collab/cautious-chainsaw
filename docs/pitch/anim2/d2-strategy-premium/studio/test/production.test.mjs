// test/production.test.mjs - the BEFORE mode (the production renderer, reproduced) is only worth showing if it IS the production behaviour.  This file checks it against the numbers
// of research report 01 (docs/pitch/anim/01-current-tiles-jitter.md, data/current-metrics.json, "whole battle, 60 Hz, position only", which ran the shipped y1/F4/Ed code extracted from the
// bundle): 833 hops of 8 px or more at zoom 13.5 in 159 frames, 66 snap-backs at the tick boundary, 407 units that vanish for exactly one frame after being pushed in half a tick early.
// It also checks the switch itself: the viewer's settings survive it, the after mode is certified again after it, and the before mode really overlaps.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createKernel } from '../src/kernel/registry.mjs';
import { registerBuiltins } from '../src/builtins.mjs';
import { createTuning } from '../src/tuning/tuning.mjs';
import { createBattle } from '../src/data/model.mjs';
import { createTransport } from '../src/time/transport.mjs';
import { project } from '../src/geo/project.mjs';
import { makeEngine, loadDocs, PROTO, REPO } from '../src/headless.mjs';
import { HOP_PX } from '../src/metrics/metrics.mjs';

const { dataset, tokens } = loadDocs();
const REPORT = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'pitch', 'anim', 'data', 'current-metrics.json'), 'utf8')).motion.whole_battle_60hz_position_only;
const scene = (id) => dataset.scenes.find((s) => s.id === id);

/** the position-only replay of report 01 (harness-current/fast-motion.mjs), run on the Studio's own production clock and production motion model */
function replay(speed, hz = 60, zoom = 13.5) {
  const kernel = registerBuiltins(createKernel()); const tuning = createTuning(tokens);
  tuning.set('time.model', 'production'); tuning.set('interp.model', 'production-step'); tuning.set('layout.visibility', 'carry');
  const tok = (id) => tuning.get(id); const battle = createBattle(dataset, kernel, tok); const tr = createTransport(tok, { tickMax: 675, tick0: 1 });
  const has = new Map(); for (const u of battle.units.values()) has.set(u.id, new Set(u.kf.map((k) => k.tick)));
  tr.setSpeed(speed); tr.play(); tr.advance(0);
  const ev = { hop: [], snap: 0, recover: 0, reappear: 0, reappearAfterOne: 0, appear: 0 }; const hopFrames = new Set();
  const seen = new Set(); const goneAt = new Map(); const recovering = new Set(); let prev = null; let frames = 0;
  while (tr.playing && frames < 400000) {
    const tau = tr.advance(1 / hz); frames++;
    const f = Math.floor(tau); const x = tau - f; const cur = new Map();
    for (const { u, st } of battle.visibleAt(tau)) { const p = project(st.lng, st.lat, zoom); cur.set(u.id, { x: p[0], y: p[1], f, xf: x }); }
    if (prev) {
      for (const [id, c] of cur) {
        const p = prev.get(id);
        if (!p) { if (seen.has(id)) { ev.reappear++; if (goneAt.get(id) === frames - 1) ev.reappearAfterOne++; } else { ev.appear++; seen.add(id); } continue; }
        seen.add(id);
        const step = Math.hypot(c.x - p.x, c.y - p.y); if (step < 0.01) continue;
        const H = has.get(id); const interpNow = c.xf > 0 && H.has(c.f) && H.has(c.f + 1); const interpPrev = p.xf > 0 && H.has(p.f) && H.has(p.f + 1);
        const samePair = interpNow && interpPrev && c.f === p.f;
        if (samePair && c.xf < p.xf) { ev.snap++; recovering.add(id); continue; }
        if (recovering.has(id)) { recovering.delete(id); ev.recover++; continue; }
        if (samePair && c.xf > p.xf) continue;
        if (interpNow || interpPrev) continue;
        if (step >= HOP_PX) { ev.hop.push(step); hopFrames.add(frames); }
      }
      for (const id of prev.keys()) if (!cur.has(id)) goneAt.set(id, frames);
    }
    prev = cur;
  }
  return { hops: ev.hop.length, hopFrames: hopFrames.size, snap: ev.snap, reappear: ev.reappear, reappearAfterOne: ev.reappearAfterOne, firstAppearances: ev.appear, frames, endTick: tr.simTau, hopMedian: ev.hop.slice().sort((a, b) => a - b)[ev.hop.length >> 1], hopMax: Math.max(...ev.hop) };
}

for (const speed of [1, 4]) {
  test(`the production clock and motion model reproduce report 01's whole-battle replay at ${speed}x (hops, snap-backs, one-frame absences)`, () => {
    const r = replay(speed); const R = REPORT.find((q) => q.speed === speed) || REPORT[speed === 1 ? 2 : 4];
    console.log(`# ${speed}x: ${r.frames} frames, hops ${r.hops} in ${r.hopFrames} frames (median ${r.hopMedian.toFixed(1)} px, max ${r.hopMax.toFixed(1)}), snap-backs ${r.snap}, units that vanish for one frame ${r.reappearAfterOne} of ${r.reappear} reappearances; report 01: ${R.hops.count} / ${R.hops.framesWithAHop} / ${R.snapBacks.count} / ${R.reappearedAfterExactlyOneFrameAbsent}`);
    assert.equal(r.hops, R.hops.count, 'hops of 8 px or more');
    assert.equal(r.hopFrames, R.hops.framesWithAHop, 'frames that contain a hop');
    assert.equal(r.snap, R.snapBacks.count, 'snap-backs at the tick boundary (the stale-tick bug)');
    assert.equal(r.reappearAfterOne, R.reappearedAfterExactlyOneFrameAbsent, 'units pushed in half a tick early that are absent for exactly one frame');
    assert.equal(r.endTick, 675);
  });
}

test('the production clock steps the way the shipped loop does: the draw reads the OLD tick with the NEW fraction on the frame the tick advances', () => {
  const kernel = registerBuiltins(createKernel()); const tuning = createTuning(tokens); tuning.set('time.model', 'production'); const tr = createTransport((id) => tuning.get(id), { tickMax: 675, tick0: 100 });
  tr.setSpeed(1); tr.play(); const taus = []; for (let i = 0; i < 40; i++) taus.push(tr.advance(1 / 60));
  // 1x = 500 ms per tick = 30 frames of 16.67 ms: the fraction climbs, then on the frame that crosses it the tick read is still 100 and the fraction restarts
  const back = taus.findIndex((t, i) => i > 0 && t < taus[i - 1]); assert.ok(back > 25 && back < 33, 'a backward step of the draw tick exists around frame 30, found ' + back);
  assert.ok(taus[back] < taus[back - 1] && Math.floor(taus[back]) === 100, 'stale tick: the integer part is still the old tick');
  assert.equal(Math.floor(taus[back + 1]), 101, 'the next frame reads the new tick');
  tr.pause(); assert.equal(tr.advance(1 / 60), 101, 'paused: whole tick, fraction 0');
  tr.seek(300); assert.equal(tr.advance(1 / 60), 300, 'a seek lands at once (no glide)');
});

test('the smooth clock is unchanged by the production model existing: switching back resumes from the same tick', () => {
  const e = makeEngine({ start: { tick: 400, lat: scene('fresh2').lat, lng: scene('fresh2').lng, zoom: 14 } }); e.setViewport(1440, 900); e.transport.setSpeed(2); e.transport.play(); for (let i = 0; i < 30; i++) e.step(1000 / 60);
  const t0 = e.transport.simTau; e.tuning.set('compare.mode', 'before'); e.step(1000 / 60); assert.equal(e.transport.model, 'production'); assert.ok(Math.abs(e.transport.simTau - t0) < 1.5);
  for (let i = 0; i < 60; i++) e.step(1000 / 60); const t1 = e.transport.simTau; e.tuning.set('compare.mode', 'after'); e.step(1000 / 60); assert.equal(e.transport.model, 'smooth'); assert.ok(Math.abs(e.transport.simTau - t1) < 1.5);
  assert.equal(e.transport.playing, true);
});

test('the before mode is the production picture: bars on every unit, hold-then-jump, and thousands of overlaps; the after mode is certified again right after the switch', () => {
  const sc = scene('fresh2'); const e = makeEngine({ start: { tick: 548, lat: sc.lat, lng: sc.lng, zoom: 14 }, settings: { 'camera.zoom': 14, 'layout.dMaxPx': 36, 'skin.id': 'reference' } }); e.setViewport(1440, 900); e.step(1000 / 60);
  const mine = e.tuning.diff();
  e.tuning.set('compare.mode', 'before'); e.transport.setSpeed(4); e.transport.play(); let over = 0; let maxTiles = 0;
  for (let i = 0; i < 120; i++) { const f = e.step(1000 / 60); over += f.overlaps > 0 ? 1 : 0; maxTiles = Math.max(maxTiles, f.tiles.length); assert.ok(f.tiles.every((t) => t.life === 'live' && t.opacity === 1 && t.kind === 'leaf'), 'production tiles: one per unit, always fully drawn, never fading'); }
  assert.equal(over, 120, 'the production picture overlaps on every frame of this scene'); assert.ok(maxTiles > 250);
  assert.equal(e.compare, 'before'); assert.equal(e.tok('skin.id'), 'production'); assert.equal(e.tuning.get('skin.id'), 'reference', "the viewer's own skin is untouched");
  const sb = e.metrics.summary(); assert.ok(sb.hopsPerSec > 20 && sb.overlapFrames === 120, JSON.stringify({ hops: sb.hopsPerSec, of: sb.overlapFrames }));
  e.tuning.set('compare.mode', 'after'); e.transport.pause(); assert.deepEqual(e.tuning.diff(), mine, "the viewer's settings are exactly what they were");
  assert.equal(e.tuning.get('layout.dMaxPx'), 36, "the viewer's displacement budget survived the round trip"); assert.equal(e.tuning.get('skin.id'), 'reference');
  let bad = 0; for (let i = 0; i < 200; i++) { const f = e.step(1000 / 60); if (f.overlaps || f.unrepresented) bad++; }
  assert.equal(bad, 0, 'after the switch every frame is certified again'); assert.equal(e.compare, 'after');
  assert.ok(e.metrics.summary().frames >= 200 && e.metricsOf('before').summary().frames === sb.frames, 'each mode keeps its own numbers');
});

test('same ticks, both modes, one scale: the Studio has no hop where the production reproduction hops (hotspot windows, 60 fps)', () => {
  const rows = [];
  for (const [id, tick, zoom, speed] of [['carry1', 290, 14, 4], ['fresh2', 551, 15, 4], ['evening1', 340, 14, 4]]) {
    const sc = scene(id); const out = {};
    for (const mode of ['before', 'after']) {
      const e = makeEngine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom } }); e.setViewport(1440, 900); e.tuning.set('compare.mode', mode); e.step(1000 / 60); e.transport.setSpeed(speed); e.transport.play();
      for (let i = 0; i < 40; i++) e.step(1000 / 60); e.metrics.reset(); for (let i = 0; i < 480; i++) e.step(1000 / 60); out[mode] = e.metrics.summary();
    }
    rows.push({ id, tick, zoom, speed, before: { jumps: out.before.jumpsPerSec, hops: out.before.hopsPerSec, max: out.before.maxStepPx, over: out.before.overlapFrames, blinks: out.before.blinksPerSec }, after: { jumps: out.after.jumpsPerSec, jumpsSolid: out.after.jumpsSolidPerSec, hops: out.after.hopsPerSec, solid: out.after.hopsSolidPerSec, max: out.after.maxStepPx, over: out.after.overlapFrames } });
    assert.ok(out.after.maxStepPx < out.before.maxStepPx, `${id}: the largest one-frame step shrinks (${out.before.maxStepPx} -> ${out.after.maxStepPx} px)`);
    assert.equal(out.after.overlapFrames, 0); assert.equal(out.after.unrepresentedUnitFrames, 0); assert.ok(out.before.overlapFrames > 400, 'before overlaps almost always');
  }
  console.log('# before vs after, 8 s at 60 fps:', JSON.stringify(rows));
});
