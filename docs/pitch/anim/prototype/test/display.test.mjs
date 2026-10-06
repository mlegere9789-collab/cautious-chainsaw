// test/display.test.mjs - the whole frame pipeline (transport -> interpolation -> certified layout -> display dynamics -> verifier) driven headlessly over the REAL hardest scenes:
// every DISPLAYED frame is overlap-free, every unit is represented, motion is continuous (no solid tile teleports), and the result is deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { verifyFrame } from '../src/layout/geom.mjs';

const { dataset } = loadDocs();
const scene = (id) => dataset.scenes.find((s) => s.id === id);
const mk = (sc, zoom, settings = {}, speed = 1) => { const e = makeEngine({ start: { tick: sc.tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, ...settings } }); e.setViewport(1440, 900); e.transport.setSpeed(speed); e.step(1000 / 60); return e; };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const sig = (f) => { const h = crypto.createHash('sha256'); for (const t of f.tiles) h.update(`${t.key}|${t.x.toFixed(5)}|${t.y.toFixed(5)}|${t.opacity.toFixed(5)}|${t.scale.toFixed(4)};`); return h.digest('hex').slice(0, 14); };

function run(e, frames, dtOf = () => 1000 / 60, onFrame = null) {
  const bad = []; let teleports = 0; let prev = null;
  for (let i = 0; i < frames; i++) {
    const f = e.step(dtOf(i));
    if (f.overlaps) bad.push(`frame ${i}: ${f.overlaps} overlapping pairs`); if (f.unrepresented) bad.push(`frame ${i}: ${f.unrepresented} unrepresented units`);
    for (const t of f.tiles) { if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !(t.opacity >= 0 && t.opacity <= 1.0000001) || !(t.scale > 0)) bad.push(`frame ${i}: bad tile ${t.key} ${t.x} ${t.y} ${t.opacity}`); }
    // independent re-verification of the displayed frame from the frame object alone (not from the display layer's own bookkeeping)
    const items = []; for (const t of f.tiles) { if (!t.solid) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; items.push({ owner: t.key, kind: 'chip', x0: t.x - hw, y0: t.y - hh, x1: t.x + hw, y1: t.y + hh }); if (t.label && t.label.opacity >= 0.5) items.push({ owner: t.key, kind: 'label', x0: t.label.x0, y0: t.label.y0, x1: t.label.x1, y1: t.label.y1 }); if (t.displaced) items.push({ owner: t.key, kind: 'pin', x0: t.ax - 2, y0: t.ay - 2, x1: t.ax + 2, y1: t.ay + 2 }); }
    const v = verifyFrame(items, 0); if (v.overlaps) bad.push(`frame ${i}: independent check found ${v.overlaps} overlaps`);
    if (prev && !f.stats.cut) for (const t of f.tiles) { if (t.life !== 'live' || !t.solid) continue; const p = prev.get(t.key); if (p && Math.hypot((t.x - t.ax) - p[0], (t.y - t.ay) - p[1]) > 30) teleports++; }
    prev = new Map(f.tiles.filter((t) => t.solid && t.life === 'live').map((t) => [t.key, [t.x - t.ax, t.y - t.ay]]));
    if (onFrame) onFrame(f, i);
  }
  return { bad, teleports };
}

for (const [id, zoom, speed, frames] of [['fresh2', 15, 4, 300], ['carry1', 14, 1, 300], ['field', 13.5, 4, 240], ['evening1', 14, 16, 240], ['fresh1', 16, 8, 240], ['carry2', 13, 2, 240]]) {
  test(`playback ${id} z${zoom} x${speed}: every displayed frame overlap-free, every unit represented, no solid teleport (${frames} frames)`, () => {
    const e = mk(scene(id), zoom, {}, speed); e.transport.play();
    const { bad, teleports } = run(e, frames);
    assert.deepEqual(bad.slice(0, 5), []); assert.equal(teleports, 0, 'solid tiles that jumped more than 30 px in one frame');
    const s = e.metrics.summary(); assert.equal(s.overlapPairs, 0); assert.equal(s.unrepresentedUnitFrames, 0); assert.ok(s.tilesMean > 20);
  });
}

test('irregular frame times (5 to 45 ms) cannot produce an overlap or a hole', () => {
  const e = mk(scene('fresh2'), 15, {}, 4); e.transport.play(); const r = rng(5);
  const { bad } = run(e, 300, () => 5 + r() * 40); assert.deepEqual(bad.slice(0, 5), []);
});

test('deterministic: the same frame-time sequence gives bit-identical frames', () => {
  const sigs = []; for (let k = 0; k < 2; k++) { const e = mk(scene('fresh2'), 15, {}, 4); e.transport.play(); const r = rng(9); const list = []; run(e, 120, () => 8 + r() * 20, (f, i) => { if (i % 10 === 0) list.push(sig(f)); }); sigs.push(list.join('|')); }
  assert.equal(sigs[0], sigs[1]);
});

test('a seek with no glide is a CUT: the old tiles fade out, the new ones fade in after them, and no frame has an overlap', () => {
  const e = mk(scene('fresh2'), 15, {}, 1); const base = e.frame.tiles.length; assert.ok(base > 100);
  e.transport.seek(120, { glide: false }); let cuts = 0; let maxTiles = 0; let sawGhost = false;
  const { bad } = run(e, 60, () => 1000 / 60, (f) => { if (f.stats.cut) cuts++; maxTiles = Math.max(maxTiles, f.tiles.length); if (f.tiles.some((t) => t.life === 'dying')) sawGhost = true; });
  assert.deepEqual(bad, []); assert.equal(cuts, 1, 'exactly one cut frame'); assert.ok(sawGhost, 'old tiles fade rather than vanish');
  const f = e.frame; assert.ok(f.tiles.every((t) => t.life === 'live'), 'ghosts are gone after the fade'); assert.ok(f.tiles.every((t) => t.opacity > 0.99), 'everything is fully in');
});

test('a glided seek flies through the paths (no cut), tiles come and go by fades, and every frame is clean', () => {
  const e = mk(scene('fresh2'), 15, {}, 1); e.transport.seek(300); let cuts = 0;
  const { bad } = run(e, 300, () => 1000 / 60, (f) => { if (f.stats.cut) cuts++; }); assert.deepEqual(bad.slice(0, 5), []); assert.equal(cuts, 0); assert.ok(Math.abs(e.transport.simTau - 300) < 1e-6);
});

test('a zoom animation (13 -> 16 by wheel glide) never overlaps and never cuts', () => {
  const e = mk(scene('field'), 13, {}, 1); e.zoomTo(16, { at: [720, 450] }); let cuts = 0; let minZ = 99; let maxZ = 0;
  const { bad } = run(e, 200, () => 1000 / 60, (f) => { if (f.stats.cut) cuts++; minZ = Math.min(minZ, f.zoom); maxZ = Math.max(maxZ, f.zoom); });
  assert.deepEqual(bad.slice(0, 5), []); assert.equal(cuts, 0); assert.ok(minZ <= 13.1 && maxZ >= 15.99, `zoom ${minZ} .. ${maxZ}`);
});

test('switching motion mode, layout rule or motion model while running keeps every frame clean', () => {
  const e = mk(scene('fresh2'), 15, {}, 4); e.transport.play(); const all = [];
  all.push(run(e, 40).bad); e.tuning.set('motion.mode', 'spring'); all.push(run(e, 40).bad); e.tuning.set('motion.mode', 'snap'); all.push(run(e, 40).bad); e.tuning.set('motion.mode', 'dynamics');
  e.tuning.set('layout.visibility', 'window'); all.push(run(e, 40).bad); e.tuning.set('interp.model', 'chord-smooth'); all.push(run(e, 40).bad); e.tuning.set('layout.visibility', 'snapshot'); all.push(run(e, 40).bad); e.tuning.set('layout.dMaxPx', 24); all.push(run(e, 40).bad);
  assert.deepEqual(all.flat().slice(0, 5), []);
});

test('reduced motion shows the layout as solved (no glide, short fades) and is still overlap-free', () => {
  const e = mk(scene('fresh2'), 15, { 'motion.reduced': 'on' }, 4); e.transport.play(); let dimmed = 0; const { bad } = run(e, 120, () => 1000 / 60, (f) => { dimmed += f.tiles.filter((t) => t.travelling).length; });
  assert.deepEqual(bad, []); assert.equal(dimmed, 0, 'no travelling tile in reduced motion');
});

test('the safety net is what keeps the guarantee when the glide alone is not enough (negative control: net off, pushing off -> overlaps appear)', () => {
  const off = mk(scene('fresh2'), 15, { 'motion.mode': 'spring', 'motion.safetyNet': false, 'motion.travelPx': 120 }, 4); off.transport.play(); run(off, 240);
  assert.ok(off.metrics.summary().overlapPairs > 0, 'without the net the glide alone overlaps: ' + off.metrics.summary().overlapPairs);
  const on = mk(scene('fresh2'), 15, { 'motion.mode': 'spring', 'motion.travelPx': 120 }, 4); on.transport.play(); const { bad } = run(on, 240); assert.deepEqual(bad, []);
  assert.ok(on.metrics.summary().netDimsTotal > 0, 'the net did work');
});

test('snap mode equals the layout: its frames are the certified frames (the lab behaviour, for comparison)', () => {
  const e = mk(scene('fresh2'), 15, { 'motion.mode': 'snap' }, 4); e.transport.play(); const { bad } = run(e, 120); assert.deepEqual(bad, []);
  const f = e.frame; assert.ok(f.tiles.every((t) => t.opacity === 1 && t.scale === 1), 'no fades, no scaling');
});

test('the motion comparison on the real hardest scene: glide + pushing removes the teleports the layout alone makes (numbers printed for the record)', () => {
  const rows = [];
  for (const mode of ['snap', 'spring', 'dynamics']) {
    const e = mk(scene('fresh2'), 15, { 'motion.mode': mode }, 4); e.transport.play(); e.metrics.reset(); const { bad } = run(e, 480); assert.deepEqual(bad.slice(0, 3), []);
    const s = e.metrics.summary(); rows.push({ mode, ...Object.fromEntries(['tilesMean', 'popsPerSec', 'teleportsPerSec', 'maxExcessPx', 'jerkP99', 'travelsPerSec', 'netDimsPerSec', 'birthsPerSec', 'labelTogglesPerSec', 'overlapFrames'].map((k) => [k, s[k]])) });
  }
  console.log('# ' + JSON.stringify(rows));
  const [snap, , dyn] = rows; assert.ok(snap.teleportsPerSec > 3 * Math.max(0.2, dyn.teleportsPerSec), `teleports per second: snap ${snap.teleportsPerSec}, dynamics ${dyn.teleportsPerSec}`); assert.ok(dyn.maxExcessPx < snap.maxExcessPx);
});
