// test/assemble.test.mjs - the assembled product: styles, tours (the 60-second Showcase and the three hotspot runs), the before/after report and the absolute-step metrics.  Everything runs headless
// through the same engine, popup director and tour director the page uses, on a virtual clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { createMetrics, HOP_PX } from '../src/metrics/metrics.mjs';
import { STYLES, VARIANTS, DEFAULT_STYLE, applyStyle, styleOfSkin, skinIdOf } from '../src/styles/index.mjs';
import { TOURS, HOTSPOTS, FACTS, abSteps, viewReplayTour } from '../src/tours/library.mjs';
import { createDirector } from '../src/tours/director.mjs';
import { createActions } from '../src/tours/actions.mjs';
import { compareReport } from '../src/tours/report.mjs';
import { rig, violations } from './popups-helpers.mjs';

const { dataset, tokens } = loadDocs();
const EV = new Set(['Documented', 'Measured', 'Computed', 'Modelled', 'Contested', 'Unknown', 'Design']);

// ---- styles ---------------------------------------------------------------------------------------------------------------------------------------
test('every style and variant maps to a registered skin; the mapping round-trips; a typo throws', () => {
  const R = rig({ popups: [] });
  for (const s of STYLES) for (const v of VARIANTS) {
    const id = skinIdOf(s, v.id); assert.ok(R.e.kernel.skins.has(id), `skin ${id} is registered`);
    applyStyle(R.e, s.id, v.id); assert.equal(R.e.tuning.get('skin.id'), id); assert.equal(R.e.tuning.get('backdrop.id'), s.backdrop);
    const back = styleOfSkin(id); assert.equal(back.style.id, s.id); assert.equal(back.variant, v.id);
    for (let i = 0; i < 3; i++) R.step(1);
    assert.equal(R.e.frame.overlaps, 0); assert.equal(R.e.frame.unrepresented, 0);
  }
  assert.throws(() => applyStyle(R.e, 'nighht'), /unknown style/); assert.throws(() => applyStyle(R.e, 'glyph', 'cvd-ish'), /unknown variant/);
  assert.equal(styleOfSkin('reference'), null); assert.equal(styleOfSkin('minimal'), null); assert.ok(STYLES.some((s) => s.id === DEFAULT_STYLE));
  assert.ok(STYLES.every((s) => ['look-a', 'look-b'].includes(s.backdrop) && ['dark', 'light'].includes(s.theme)));
});

// ---- the absolute-step metrics ---------------------------------------------------------------------------------------------------------------------
const frameOf = (tiles, zoom = 15) => ({ tiles: tiles.map(([key, x, y, solid = true]) => ({ key, life: 'live', x, y, ax: x, ay: y, w: 20, h: 20, scale: 1, opacity: solid ? 1 : 0.42, solid })), stats: {}, zoom, overlaps: 0, clearanceViolations: 0, unrepresented: 0, onField: 1, solverMs: 0 });
test('metrics: a hold-then-jump is a hop AND a jump; a fast smooth glide is a hop but not a jump; a one-frame blink is counted; a zoom change is not a step', () => {
  const m = createMetrics((id) => ({ 'metrics.historyFrames': 240, 'metrics.popPx': 3 }[id]));
  // tile A holds, then jumps 50 px;  tile B glides with steps 3, 6, 9, 12, 12 (a hop at 9 and 12, never sudden);  tile C vanishes for exactly one frame
  const A = [100, 100, 100, 100, 150, 150]; const B = [0, 3, 9, 18, 30, 42];
  for (let i = 0; i < 6; i++) { const t = [['A', A[i], 0], ['B', B[i], 50]]; if (i !== 3) t.push(['C', 7, 7]); m.record(frameOf(t), { rawDtMs: 16.7 }); }
  const s = m.summary();
  assert.equal(s.maxStepPx, 50, 'the largest step is the jump'); assert.equal(m.jumps, 1, 'only the hold-then-jump is sudden'); assert.equal(m.hops, 4, 'A: 50; B: 9 12 12'); assert.equal(m.blinks, 1, 'C was gone for exactly one frame');
  assert.ok(s.jumpsPerSec > 0 && s.hopsPerSec > s.jumpsPerSec);
  m.reset(); m.record(frameOf([['A', 0, 0]], 15), { rawDtMs: 16.7 }); m.record(frameOf([['A', 400, 0]], 15.5), { rawDtMs: 16.7 }); m.record(frameOf([['A', 400, 0]], 15.5), { rawDtMs: 16.7 });
  assert.equal(m.hops, 0, 'the layout origin changes with the zoom: that frame is not a step'); assert.equal(m.maxStepPx ?? m.stepMax, 0);
  m.reset(); m.record(frameOf([['D', 0, 0, true]]), { rawDtMs: 16.7 }); m.record(frameOf([['D', 40, 0, false]]), { rawDtMs: 16.7 }); assert.equal(m.hops, 1); assert.equal(m.hopsSolid, 0, 'a dimmed tile is a ghost: counted as a hop, not as a solid one'); assert.equal(m.jumpsSolid, 0);
  assert.equal(HOP_PX, 8);
});

// ---- tours: data checks ----------------------------------------------------------------------------------------------------------------------------
const KNOWN = new Set(['seek', 'camera', 'play', 'pause', 'speed', 'compare', 'style', 'select', 'metrics', 'panel', 'results', 'popups']);
test('tours are well-formed data: unique ids, positive durations, known actions, captions with a kicker, a title, words and a valid evidence label; the Showcase lasts 46 s', () => {
  const R = rig({ popups: [] }); const ctx = { engine: R.e, dataset, report: { ok: true, rows: [] } }; const ids = new Set();
  const all = [...TOURS, viewReplayTour({ tick: 300, lat: 39.81, lng: -77.23, zoom: 14 })];
  for (const t of all) {
    assert.ok(!ids.has(t.id), 'unique id ' + t.id); ids.add(t.id); assert.ok(t.label && t.group && t.blurb && t.steps.length >= 3);
    for (const st of t.steps) {
      assert.ok(st.ms >= 1000 && st.id, `${t.id}/${st.id}`); for (const a of st.enter || []) assert.ok(KNOWN.has(a.a), `${t.id}/${st.id}: unknown action ${a.a}`);
      const c = typeof st.caption === 'function' ? st.caption(ctx) : st.caption; assert.ok(c && c.kicker && c.title && c.text && c.chips.length >= 1, `${t.id}/${st.id} caption`);
      for (const k of c.chips) assert.ok(EV.has(k.ev), `${t.id}/${st.id}: evidence label ${k.ev}`);
    }
  }
  const show = TOURS.find((t) => t.id === 'showcase'); assert.equal(show.steps.reduce((a, s) => a + s.ms, 0), 46000, 'the showcase is 46 s since the Quiet Cartographer fork (the prototype: 60 s)');
  for (const h of HOTSPOTS) { const t = TOURS.find((x) => x.id === 'hotspot-' + h.id); assert.ok(t, h.id); assert.equal(t.steps.map((s) => s.id).join(), 'intro,before,after,results'); assert.ok(h.lat > 39.7 && h.lat < 39.9 && h.tick > 0 && h.tick <= 675); }
  assert.equal(HOTSPOTS.map((h) => h.tick).join(), '346,293,556', 'the three hotspots of 06-layout.md');
  assert.throws(() => createActions({ engine: R.e })({ a: 'dance' }), /unknown tour action/);
  assert.throws(() => createDirector({ act() {} }).start({ steps: [] }), /at least one step/);
});

test('the director runs steps on engine time: actions on entry, one caption per step, pause freezes it, skip jumps, the end is reported once', () => {
  const log = []; const caps = []; let ended = 0; const d = createDirector({ act: (a) => log.push(a.a), onCaption: (c) => caps.push(c && c.title), onEnd: (by) => { ended++; log.push('end:' + by); } });
  const tour = { id: 't', steps: [{ id: 'a', ms: 1000, enter: [{ a: 'pause' }], caption: { title: 'A' } }, { id: 'b', ms: 2000, enter: [{ a: 'play' }, { a: 'speed' }], caption: () => ({ title: 'B' }) }, { id: 'c', ms: 1000, caption: { title: 'C' } }] };
  d.start(tour); assert.deepEqual(log, ['pause']); d.update(999); assert.equal(caps.length, 1); d.update(2); assert.deepEqual(caps, ['A', 'B']); assert.deepEqual(log, ['pause', 'play', 'speed']);
  d.pause(); d.update(5000); assert.equal(d.state.i, 1, 'paused: nothing moves'); d.resume(); d.skip(1); assert.equal(d.state.i, 2); d.update(1500); assert.equal(ended, 1); assert.equal(log.at(-1), 'end:end'); d.update(1000); assert.equal(ended, 1);
  d.start(tour); d.stop('closed'); assert.equal(log.at(-1), 'end:closed'); assert.equal(d.running, false);
});

// ---- a tour, run end to end, headless ---------------------------------------------------------------------------------------------------------------
/** run a tour on a rig: the app's wiring (the director's end restores the viewer's mode and popups), frame by frame at 60 fps on a virtual clock; returns what was seen */
function runTour(tour, { rigOpts = {}, onFrame = null } = {}) {
  const R = rig({ scene: 'fresh2', tick: 548, zoom: 15, ...rigOpts }); const e = R.e; const ctx = { engine: e, dataset, report: null }; const caps = []; let ended = null;
  const act = createActions({ engine: e });
  const d = createDirector({ act, ctx, onCaption: (c, st) => { caps.push({ id: st.id, ...c }); }, onEnd: (by) => { ended = by; if (e.compare !== 'after') e.tuning.set('compare.mode', 'after'); if (ctx.popupsWas !== undefined) { e.tuning.set('popup.enabled', ctx.popupsWas); ctx.popupsWas = undefined; } e.transport.pause(); } });
  const seen = { frames: 0, afterFrames: 0, badAfter: [], cardViolations: [], cardsSeen: 0, steps: [], styles: new Set(), compareSeen: new Set() };
  d.start(tour); const dt = 1000 / 60; let guard = 0;
  while (d.running && guard++ < 60 * 90) {
    R.step(1, dt); d.update(dt); seen.frames++; const f = e.frame; seen.compareSeen.add(e.compare); seen.styles.add(e.tok('skin.id'));
    if (f.compare === 'after' && f.stats && !f.stats.cut) { seen.afterFrames++; if (f.overlaps || f.unrepresented) seen.badAfter.push(`step ${d.state.i} frame ${seen.frames}: overlaps ${f.overlaps}, unrepresented ${f.unrepresented}`); }
    const cards = R.out.cards.filter((c) => c.rect && c.opacity > 0.5 && !c.lane && c.kind !== 'doc'); if (cards.length && f.compare === 'after') { seen.cardsSeen++; const v = violations(R); if (v.length) seen.cardViolations.push(`step ${d.state.i} frame ${seen.frames}: ${v[0]}`); }
    if (onFrame) onFrame(f, d, R);
  }
  return { R, e, d, caps, ended, seen, ctx };
}

test('the 60-second Showcase runs end to end: every step shows its words, both renderers run, the report is measured, every Studio frame is certified, no card lies on a tile', () => {
  const t0 = Date.now(); const r = runTour(TOURS.find((t) => t.id === 'showcase')); const { e, caps, seen, ctx } = r;
  console.log(`# showcase: ${seen.frames} frames, ${seen.afterFrames} Studio frames, ${seen.cardsSeen} frames with cards, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  assert.equal(r.ended, 'end'); assert.ok(Math.abs(seen.frames / 60 - 46) < 1, 'about 46 s of frames: ' + seen.frames);
  assert.deepEqual(caps.filter((c, i) => i === 0 || c.id !== caps[i - 1].id).map((c) => c.id), ['open', 'after', 'style-standards', 'style-glyph', 'field', 'popups', 'outro']);
  assert.ok(seen.compareSeen.has('after')); assert.deepEqual([...seen.styles].filter((s) => ['standards', 'glyph'].includes(s)).sort(), ['glyph', 'standards']);
  assert.deepEqual(seen.badAfter.slice(0, 3), [], 'no overlap and no lost unit on any Studio frame'); assert.deepEqual(seen.cardViolations.slice(0, 3), [], 'no card on a tile, label or pin'); assert.ok(seen.cardsSeen > 20, 'the popups step shows cards: ' + seen.cardsSeen);
  // FORK (d1 round 2): the Showcase has no Before / After and no measured table any more (those steps were removed with the Before badge)


  assert.equal(e.compare, 'after', 'the tour ends on the Studio'); assert.equal(e.tuning.get('popup.enabled'), true, "the viewer's popups are back"); assert.equal(e.transport.playing, false);
  // (FORK: the measured report of the prototype's Showcase is gone with the Before badge)
  for (const c of caps) { assert.ok(c.title.length > 3 && c.text.length > 30, c.id); assert.ok(!/NaN|undefined|\[object/.test(JSON.stringify(c)), c.id + ' prints a bad value'); }
  const open = caps[0]; assert.match(open.text, /478 units and 1,687 hand-placed keyframes on 188 of 675 ticks/, 'the counts come from the data');
  const fields = caps.filter((c) => c.id === 'field'); assert.ok(fields.length >= 10 && fields[0].refresh === undefined && fields.at(-1).refresh === true, 'the field caption refreshes while it is shown'); assert.doesNotMatch(fields[0].text, /\d+ units stand for/, 'the first caption of a step never quotes a frame drawn before the step began'); const field = fields.at(-1); assert.match(field.text, /\d+ units stand for \d+ marks/); assert.ok(field.chips.some((k) => /0 overlapping pairs in [\d,]+ frames/.test(k.text)), 'the overlap count in the caption is the measured one: ' + JSON.stringify(field.chips));
});

for (const h of HOTSPOTS) {
  test(`hotspot ${h.id} (tick ${h.tick}): the same ticks twice, measured; the Studio frames are certified and its jumps fall`, () => {
    const r = runTour(TOURS.find((t) => t.id === 'hotspot-' + h.id)); const res = r.caps.find((c) => c.id === 'results'); assert.equal(r.ended, 'end'); assert.ok(res.table, 'report');
    const row = (id) => res.table.find((x) => x.id === id); console.log(`# ${h.id}: jumps ${row('jumps').before.toFixed(1)} -> ${row('jumps').after.toFixed(1)} /s, largest step ${row('maxStep').before.toFixed(0)} -> ${row('maxStep').after.toFixed(0)} px, overlapping pairs per frame ${row('overlapPairs').before.toFixed(0)} -> ${row('overlapPairs').after.toFixed(0)}`);
    assert.deepEqual(r.seen.badAfter.slice(0, 3), []); assert.ok(row('jumps').after <= row('jumps').before + 1e-9, 'jumps do not rise'); assert.ok(row('overlapPairs').before > 5 && row('overlapPairs').after === 0); assert.equal(row('overlapFrames').after, 0);
    assert.equal(r.e.tuning.get('compare.mode'), 'after');
  });
}

test('report numbers come from the recorders: reset a lane and its row empties; the report refuses to compare two short runs', () => {
  const R = rig({ popups: [] }); const e = R.e; assert.equal(compareReport(e).ok, false);
  e.tuning.set('compare.mode', 'before'); e.transport.setSpeed(4); e.transport.play(); R.step(60); e.tuning.set('compare.mode', 'after'); R.step(60);
  const rep = compareReport(e); assert.equal(rep.ok, true); assert.equal(rep.frames.before, e.metricsOf('before').summary().frames); assert.equal(rep.rows.length, 6);
  e.metricsOf('before').reset(); assert.equal(compareReport(e).ok, false);
});

test('the viewer\'s own view replay starts where the camera is and keeps the same ticks for both renderers', () => {
  const t = viewReplayTour({ tick: 321.4, lat: 39.8, lng: -77.2, zoom: 14.5 }); const seeks = t.steps.flatMap((s) => (s.enter || []).filter((a) => a.a === 'seek').map((a) => a.tick));
  assert.ok(seeks.length >= 3 && seeks.every((k) => k === 321), 'every segment starts at the same tick: ' + seeks.join());
  const abs = abSteps({ tick: 100, lat: 39.8, lng: -77.2, zoom: 14, label: 'x', intro: { kicker: 'k', title: 't', text: 'x', chips: [{ ev: 'Modelled' }] } }); assert.deepEqual(abs.map((s) => s.id), ['intro', 'before', 'after', 'results']);
});

// ---- a still picture comes to rest ---------------------------------------------------------------------------------------------------------------------
// Measured before the rest latch, the split look-ahead, the target hold and the arrival snap (tmp/pitch-anim/assemble): The Angle at zoom 14, paused, changed its set of aggregates 347 times in 60 s
// (a limit cycle), the whole field needed about 40 s to quiet down, and 150 to 200 tiles never stopped creeping, so the engine never went idle.
for (const [id, zoom, tick] of [['fresh2', 15, 551], ['fresh2', 14, 556], ['field', 13.5, 620], ['carry1', 14, 295], ['evening1', 14, 120], ['fresh1', 16, 451]]) {
  test(`${id} z${zoom} tick ${tick}: paused with the camera still, the picture comes to rest in under 3 s and then never changes (no aggregate flips, no creeping tile, the engine goes idle)`, () => {
    const sc = dataset.scenes.find((x) => x.id === id); const e = makeEngine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
    let idleAt = -1; for (let i = 0; i < 180; i++) { e.step(1000 / 60); if (!e.busy()) { idleAt = i; break; } }
    assert.ok(idleAt >= 0, 'the engine never went idle'); assert.ok(idleAt < 180);
    const sig = (f) => f.tiles.map((t) => `${t.key}|${t.x.toFixed(3)}|${t.y.toFixed(3)}|${t.opacity.toFixed(3)}|${t.label ? t.label.opacity.toFixed(2) : 0}`).join(';');
    const a = sig(e.frame); const L = e.modules().layout; const stamp0 = L.stamp;
    for (let i = 0; i < 1200; i++) e.step(1000 / 60);                                                  // 20 s more, forced to keep stepping
    assert.equal(sig(e.frame), a, 'a still picture is a still picture: not one tile moved, faded or changed label'); assert.equal(L.stamp, stamp0, 'the set of aggregates did not change');
    assert.equal(e.frame.overlaps, 0); assert.equal(e.frame.unrepresented, 0);
  });
}

test('pausing a running battle brings the picture to rest within a few seconds, certified all the way', () => {
  const sc = dataset.scenes.find((x) => x.id === 'fresh2'); const e = makeEngine({ start: { tick: 548, lat: sc.lat, lng: sc.lng, zoom: 14 }, settings: { 'camera.zoom': 14, 'popup.enabled': false } }); e.setViewport(1440, 900);
  e.transport.setSpeed(4); e.transport.play(); for (let i = 0; i < 240; i++) e.step(1000 / 60); e.transport.pause();
  let idleAt = -1; let bad = 0; for (let i = 0; i < 600; i++) { const f = e.step(1000 / 60); if (f.overlaps || f.unrepresented) bad++; if (!e.busy()) { idleAt = i; break; } }
  assert.equal(bad, 0); assert.ok(idleAt >= 0 && idleAt < 420, 'came to rest after ' + idleAt + ' frames');
});

