// test/rest.test.mjs - a picture that is paused comes to rest.  Nine real scenes (the hotspots, the whole field at three zooms, the densest ticks), each played for 4 s at 4x and then paused with the camera
// still: the engine must go idle (nothing moving, fading, dimming or waiting) within 600 frames (10 s), with zero overlaps and zero unrepresented units on every frame on the way.
// What this test does NOT claim: that nothing would move if the loop kept stepping after idle.  The layout relaxes displaced marks toward their true places at layout.relaxPxPerSec (20 px/s) in small
// solves; a mark that has just reached one such step can be idle for the display layer while the next relax step is still to come (measured in an earlier build: carry1 tick 295, one mark, 2.6 px over the next 40 frames).
// The page sleeps at idle, so it shows the rest; a later interaction wakes it and the mark finishes the relax.  (assemble.test.mjs checks the stronger 'never changes' claim for scenes paused from the start.)
// MEASURED (tools/rest-times.mjs, results/rest-times.json): all nine scenes rest within 375 frames (6.3 s) in the final build.  An earlier build had carry1 tick 295 at 1,120 frames (a displaced mark relaxing at
// 20 px/s); that outlier vanished when the 25 crowd names the data had cut with an ellipsis were made whole (their footprints changed by a few pixels), and its cause was never found, so a scene with the same
// trouble may exist that the probe does not cover.  The prototype's own three skins on the same probe: war-room never rests in one scene and takes 450 frames in another, field-manual takes 1,397 and 1,052,
// map-1863 never rests in one.  The bound here (600 frames, 10 s) is a bound that all nine scenes meet with room to spare.
// FORK: this test exists because the prototype's `busy()` stayed true for ever in some scenes (a sub-pixel deadlock between displaced tiles, measured in all three
// prototype skins); the display layer now settles a tile by stagnation (scene/display.mjs, 8b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, loadDocs } from '../src/headless.mjs';
import { SKINS } from '../src/skins/index.mjs';

const { dataset } = loadDocs();
const SCENES = [['fresh2', 548, 14], ['fresh2', 556, 15], ['field', 620, 13.5], ['carry1', 295, 14], ['evening1', 120, 14], ['fresh1', 451, 16], ['field', 226, 13.5], ['field', 538, 14], ['field', 620, 12]];
for (const [scene, tick, zoom] of SCENES) {
  test(`${scene} tick ${tick} zoom ${zoom}: after 4 s of 4x play, a paused picture comes to rest within 600 frames, certified all the way`, () => {
    const sc = dataset.scenes.find((x) => x.id === scene); const e = makeEngine({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
    for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
    e.transport.setSpeed(4); e.transport.play(); let bad = 0; for (let i = 0; i < 240; i++) { const f = e.step(1000 / 60); if (f.overlaps || f.unrepresented) bad++; } e.transport.pause();
    let idleAt = -1; for (let i = 0; i < 600; i++) { const f = e.step(1000 / 60); if (f.overlaps || f.unrepresented) bad++; if (!e.busy()) { idleAt = i; break; } }
    assert.equal(bad, 0, 'overlaps or lost units on the way'); assert.ok(idleAt >= 0, 'the engine never went idle within 600 frames');
    assert.equal(e.frame.overlaps, 0); assert.equal(e.frame.unrepresented, 0);
  });
}

// FORK: selection below the grow zoom is a ring and nothing else (the selected unit used to take the top placement priority, which re-ordered the greedy placement and dissolved crowds all over a dense
// field: 46 to 105 marks moved after one click at zoom 11 to 13.5, 4 marks breathed by 0.7 px at 5 Hz for ever; tools/probes/select-motion.mjs has the full table).
for (const zoom of [12, 14]) {
  test(`selecting a mark at zoom ${zoom} (below the grow zoom) moves no mark, wakes nothing, and a unit inside a crowd is shown by the ring of its standard`, () => {
    const sc = dataset.scenes.find((x) => x.id === 'field'); const e = makeEngine({ start: { tick: 620, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
    for (const s of SKINS) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', 'quiet-cartographer');
    for (let i = 0; i < 400; i++) e.step(1000 / 60);
    const pick = (f, kind) => f.tiles.filter((t) => t.kind === kind && t.solid && t.life === 'live').sort((a, b) => Math.hypot(a.x + f.view.dx - 720, a.y + f.view.dy - 450) - Math.hypot(b.x + f.view.dx - 720, b.y + f.view.dy - 450))[0];
    for (const kind of ['leaf', 'agg']) {
      const f0 = e.frame; const t0 = pick(f0, kind); assert.ok(t0, `a ${kind} to select`); const id = t0.ids[0];
      const before = new Map(f0.tiles.map((t) => [t.key, [t.x, t.y]])); const keys0 = f0.tiles.map((t) => t.key).sort().join('|');
      e.select(id); let maxMove = 0; let last = null; for (let i = 0; i < 120; i++) { last = e.step(1000 / 60); for (const t of last.tiles) { const p = before.get(t.key); if (p) maxMove = Math.max(maxMove, Math.hypot(t.x - p[0], t.y - p[1])); } }
      assert.ok(maxMove < 0.01, `${kind}: a mark moved ${maxMove.toFixed(3)} px after the click`); assert.equal(last.tiles.map((t) => t.key).sort().join('|'), keys0, `${kind}: the set of marks changed`);
      assert.ok(!e.busy(), `${kind}: the engine is awake after a ring-only selection`); assert.ok(last.tiles.some((t) => t.selected && t.ids.includes(id)), `${kind}: nothing carries the selection`);
      assert.equal(last.overlaps, 0); assert.equal(last.unrepresented, 0); e.select(null); for (let i = 0; i < 60; i++) e.step(1000 / 60);
    }
  });
}
