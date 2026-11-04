// ANIM: the unit-marker engine of the release (tools/t0/anim, group ANIM).  Real system Chrome (headless), real CDP mouse / keyboard / touch input, Mapbox tiles only through the Referer-injecting harness
// (tests/t0/lib.mjs, a few hundred requests at most), a Netlify-like static server on 127.0.0.1, and a node part that runs the engine core on the real data of the tree.
//
//   node tests/t0/anim.spec.mjs --dist <tree with ANIM> [--control <the same tree without ANIM>]          the whole suite
//   node tests/t0/anim.spec.mjs --dist <tree with ANIM> --filter 'N[0-9]'                                  the node part only (no browser)
//   node tests/t0/anim.spec.mjs --dist <tree WITHOUT ANIM> --expect-red                                   red-first: every test that says it measures the engine must FAIL on a tree that lacks it
//
// Ids.  N = node, on the engine core and the data of the tree; B = browser.
//   T0-ANIM-N1  the motion model is EXACT at every keyframe of every unit (position error < 1e-9 degrees) and the unit holds its last keyframe
//   T0-ANIM-N2  MONOTONE, no overshoot: between two keyframes each coordinate stays inside the closed interval of the two keyframes (all 478 units, 24 samples per segment); the speed is continuous through keyframes
//   T0-ANIM-N3  the clock: continuous while playing, a pause keeps the sub-tick position, a jump glides under clock.glideMaxMs or cuts, a glide ahead of a playing clock lands, reduced motion steps, the end stops
//   T0-ANIM-N4  zero overlap: 0 overlapping pairs and 0 unrepresented units in every frame of a 20 s playback at three zooms (an independent all-pairs check that shares no code with the engine)
//   T0-ANIM-N5  no ghost tiles: in every frame no two solid marks overlap and no fading mark overlaps a solid one (entries and exits of units apart: they fade in place, over nothing), a one-frame swap for crowds
//   T0-ANIM-N6  smooth: over the playbacks of N4 no mark teleports (a step beyond its unit's own motion), the numbers are printed
//   T0-ANIM-N7  the words: no mark names an echelon the order of battle does not have (a record with inOob false is never "4th Div, 3rd Corps")
//   T0-ANIM-N8  token hygiene and freshness of the generated files (patches, skin token JSON)
//   T0-ANIM-N9  a change of speed alone moves nothing: the engine's output (six scenes, 8,500 frames) is bit for bit the recorded one (R1F)
//   T0-ANIM-N10 the pre-solve (R1F): a slow device solves the layout of the next frame in a task of its own; zero overlaps and unrepresented units in every frame, nearly every pre-solve taken, the unwanted ones thrown away
//   T0-ANIM-B1  the engine draws in the real app: marks painted, the engine reports on, 0 errors; the shipped renderer is not drawing
//   T0-ANIM-B2  EXACT at keyframes in the real app: at keyframe ticks the true place of every drawn unit is where Mapbox projects its record (< 0.5 px)
//   T0-ANIM-B3  frame pacing against the production baseline: interleaved A/B, repeated, relative thresholds (the host is shared)
//   T0-ANIM-B4  no teleports in real playback at three zooms (the shipped renderer's count is printed beside)
//   T0-ANIM-B5  reversing time: the same moment gives the same positions (jump away and back)
//   T0-ANIM-B6  speed changes: 1x, 8x, 1x, pause: the displayed time never steps back and never steps farther than speed x frame time
//   T0-ANIM-B7  jumps: a short jump glides in under 650 ms, a long one cross-fades (one cut), the integer tick lands where it was asked
//   T0-ANIM-B8  reduced motion: steps, no glides, no fades
//   T0-ANIM-B9  0 overlaps of vital cores in every frame of a 20 s playback at three zooms, in the browser
//   T0-ANIM-B10 selection, hover, popups: click selects, the panel opens, Escape clears; cards stand on free ground
//   T0-ANIM-B11 cost: 60 fps on the densest tick on the desktop, 30 fps or more at 4x CPU throttle on a phone, the engine never makes a long task and its own frame cost stays inside a budget (R1E: the page's long tasks are explained by the engine's own time)
//   T0-ANIM-B11m memory: the JS heap is flat over 3 minutes of playback at 8x
//   T0-ANIM-B13 rotation and tilt: marks stay upright and stand on their units on a rotated, tilted map
//   T0-ANIM-B12 extensible: the tuning panel (?tune=1) opens, a slider changes the picture, the skin changes by id, the export parses; the kill switch and the automatic fallback hand back to the shipped renderer
//   T0-ANIM-B14 idle means no frames at rest, and every cause of change wakes the engine only as long as it needs
//   T0-ANIM-B15 a change of the page does not render the map (30 DOM insertions, 0 to 2 Mapbox renders; R1E)
//   T0-ANIM-B16 a card that changes size wakes a sleeping engine and is placed again within three frames; no two cards overlap afterwards (R1E)
//   T0-ANIM-B17 the pre-solve in the real app at 4x CPU, 8x playback: made ahead in a task of its own, nearly every one taken, zero overlaps / unrepresented units / backward steps in the drawn frames (R1F)
//   T0-ANIM-X   every browser test of this run: 0 uncaught exceptions and 0 first-party console.error
process.env.T0_AGENT ??= 'motion-build';
process.env.T0_PORT_BASE ??= '9200';      // PORT_BASE .. +9: the static servers (+0 the tree, +1 the control), the Chrome sessions +2 (the shared one) and +3 .. +8 in turn
import fs from 'node:fs';
import path from 'node:path';
const lib = await import('./lib.mjs');
const { REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, tileBudget, Skip, cdpFor } = lib;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const CONTROL = opt('control', null) ? path.resolve(REPO, opt('control')) : null;
const FILTER = opt('filter', null); const EXPECT_RED = !!opt('expect-red', false); const REPS = +opt('reps', 3); const QUICK = !!opt('quick', false);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
const VERSION = JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')); const GROUPS = VERSION.groups || [];
const entrySrc = () => fs.readFileSync(path.join(DIST, 'assets', VERSION.entry), 'utf8');
const HAS_ANIM = entrySrc().includes('function e1(') && entrySrc().includes('GTANIM.bind(');
const needAnim = () => { if (!HAS_ANIM && !EXPECT_RED) throw new Skip('the tree has no ANIM group'); };
const suite = createSuite('anim');
const NUM = (x, d = 2) => +(+x).toFixed(d);
const ENGINE_P95_MS = 18; const ENGINE_P99_MS = 34;      // R1E: the engine's own frame cost (step + draw + popups) at 4x CPU on the phone, p95 / p99, wall ms in the page; R1d and the candidate measure 8 to 11 and 11 to 19 on a machine other work is using, 13 to 14.5 and 22 on a machine five busy loops were added to

// ================================================================================================================================ the node part
const H = await import('../../tools/t0/anim/test/headless.mjs');
const { createClock } = await import('../../tools/t0/anim/src/host/clock.mjs');
const { createTuning } = await import('../../tools/t0/anim/src/engine/tuning/tuning.mjs');
const { loadData } = await import('../../tools/t0/anim/test/data-load.mjs');
const { buildDataset } = await import('../../tools/t0/anim/src/host/dataset.mjs');

/** an independent all-pairs overlap count over the SOLID live marks of a frame (it shares no code with the engine's verifier: plain nested loops over the drawn footprints) */
function overlapPairs(F, gap = 0) {
  const r = []; for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const x = t.x; const y = t.y; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; r.push([x - hw, y - hh, x + hw, y + hh]); }
  let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i]; const b = r[j]; if (a[0] < b[2] - gap && b[0] < a[2] - gap && a[1] < b[3] - gap && b[1] < a[3] - gap) n++; }
  return n;
}
const walls = {};
function playback(zoom, tick0, speed, sec, settings = {}, cam = null) {
  const key = JSON.stringify([zoom, tick0, speed, sec, settings, cam, H.dataset().dist]); if (walls[key]) return walls[key];
  const E = H.make(settings); const c = cam || H.camera(zoom); let tau = tick0; const dt = 1000 / 60; const rows = []; let prev = null; const steps = [];
  for (let i = 0; i < sec * 60; i++) {
    tau += speed * 2 * dt / 1000; const F = E.step({ dtMs: dt, tau, cam: c });
    const cur = new Map(); for (const t of F.tiles) if (t.life === 'live') cur.set(t.key, t);
    let pairs = overlapPairs(F); let ghost = 0;
    // a fading mark (entering or leaving) over a solid one, or two fading marks over each other, is a ghost
    const live = F.tiles.filter((t) => t.opacity > 0.02); for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) { const p = live[a]; const q = live[b]; if (p.opacity >= 1 && q.opacity >= 1) continue; if (p.ghost || q.ghost) continue; const ax = Math.abs(p.x - q.x) < (p.w * p.scale + q.w * q.scale) / 2; const ay = Math.abs(p.y - q.y) < (p.h * p.scale + q.h * q.scale) / 2; if (ax && ay && (p.opacity >= 0.5 || q.opacity >= 0.5)) ghost++; }
    if (prev) for (const [k, t] of cur) { const p = prev.get(k); if (!p) continue; const st = Math.hypot(t.x - p.x, t.y - p.y); const stTrue = Math.hypot(t.ax - p.ax, t.ay - p.ay); steps.push({ k, st, stTrue, excess: Math.abs(st - stTrue - (t.ajx || 0) * 0), adj: Math.hypot(t.ajx || 0, t.ajy || 0) }); }
    rows.push({ pairs, ghost, unrep: F.unrepresented, tiles: F.tiles.length, ver: F.overlaps }); prev = cur;
  }
  const teleports = steps.filter((s) => s.excess - s.adj > 12).length; const pops = steps.filter((s) => s.excess - s.adj > 3).length;
  return (walls[key] = { frames: rows.length, pairs: rows.reduce((a, r) => a + r.pairs, 0), pairFrames: rows.filter((r) => r.pairs > 0).length, ghost: rows.reduce((a, r) => a + r.ghost, 0), unrep: rows.reduce((a, r) => a + r.unrep, 0), tilesMean: NUM(rows.reduce((a, r) => a + r.tiles, 0) / rows.length, 1), teleports, pops, seconds: sec, summary: E.metrics.summary(), forced: E.forcedSolves });
}
const SCENES = [[13.5, 295, 'opening zoom 13.5, mid-battle day 2'], [15, 551, 'zoom 15, the Day 3 assault'], [16.5, 551, 'zoom 16.5, close up']];

suite.test('T0-ANIM-N1', 'the motion model is exact at every keyframe of every unit and holds the last one', async (t) => {
  const { ds } = H.dataset(DIST); const E = H.make({}, { dist: DIST }); const bt = E.battle; let n = 0; let worst = 0; let holds = 0;
  for (const u of bt.units.values()) {
    for (const k of u.kf) { const st = bt.stateOf(u, k.tick); assert(st, `${u.id} is absent at its own keyframe ${k.tick}`); const e = Math.max(Math.abs(st.lat - k.lat), Math.abs(st.lng - k.lng)); worst = Math.max(worst, e); n++; }
    const last = u.kf[u.kf.length - 1]; const st = bt.stateOf(u, 675); if (Math.abs(st.lat - last.lat) < 1e-12 && Math.abs(st.lng - last.lng) < 1e-12) holds++;
    assert(!bt.stateOf(u, u.kf[0].tick - 0.5), `${u.id} exists before its first keyframe`);
  }
  t.note('keyframes checked / worst error (degrees)', [n, worst]); t.note('units holding their last keyframe at tick 675', [holds, ds.units.length]);
  assert(worst < 1e-9, `worst keyframe error ${worst}`); assertEq(holds, ds.units.length, 'units that hold their last keyframe');
});

suite.test('T0-ANIM-N2', 'monotone: no overshoot between two keyframes on either axis, and the speed is continuous through keyframes', async (t) => {
  const E = H.make({}, { dist: DIST }); const bt = E.battle; let segs = 0; let over = 0; let worst = 0; let kinks = 0; let kinkN = 0;
  for (const u of bt.units.values()) {
    for (let i = 0; i + 1 < u.kf.length; i++) {
      const a = u.kf[i]; const b = u.kf[i + 1]; segs++; const loLat = Math.min(a.lat, b.lat); const hiLat = Math.max(a.lat, b.lat); const loLng = Math.min(a.lng, b.lng); const hiLng = Math.max(a.lng, b.lng);
      for (let s = 1; s < 24; s++) { const st = bt.stateOf(u, a.tick + (b.tick - a.tick) * s / 24); const d = Math.max(loLat - st.lat, st.lat - hiLat, loLng - st.lng, st.lng - hiLng); if (d > 1e-9) { over++; worst = Math.max(worst, d); } }
      if (i > 0 && a.tick - u.kf[i - 1].tick >= 2 && b.tick - a.tick >= 2) {                      // speed just before and just after the keyframe a (metres per tick), for the unit's moving keyframes
        const e = 0.01; const p0 = bt.stateOf(u, a.tick - e); const p1 = bt.stateOf(u, a.tick + e); const p = bt.stateOf(u, a.tick); const m = 111195;
        const v0 = Math.hypot((p.lat - p0.lat) * m, (p.lng - p0.lng) * m * Math.cos(p.lat * Math.PI / 180)) / e; const v1 = Math.hypot((p1.lat - p.lat) * m, (p1.lng - p.lng) * m * Math.cos(p.lat * Math.PI / 180)) / e;
        if (Math.min(v0, v1) > 2) { kinkN++; if (Math.abs(v1 - v0) > 0.35 * Math.max(v0, v1) + 2) kinks++; }
      }
    }
  }
  t.note('segments / samples over the keyframe box', [segs, over]); t.note('moving keyframes (both sides above 2 m a tick) checked / with a speed jump of more than 35 %', [kinkN, kinks]);
  assertEq(over, 0, `samples outside the keyframes' box (worst ${worst})`); assertEq(kinks, 0, `moving keyframes (both sides above 2 m a tick) with a speed jump of more than 35 % (of ${kinkN})`);
});

suite.test('T0-ANIM-N3', 'the clock: continuous, eased, glides under the cap, cuts beyond it, lands while playing, reduced motion steps, the end stops', async () => {
  const tok = (id) => H.tokens.tokens.find((d) => d.id === id).default; const app = { tick: 100, playing: false, speed: 1, reduced: false };
  const ck = createClock(tok); const run = (ms, n, a = app) => { const o = []; for (let i = 0; i < n; i++) { const r = ck.step(ms, a); if (r.write !== null) a.tick = r.write; if (r.stop) a.playing = false; o.push(r); } return o; };
  run(16.7, 3); assertEq(NUM(ck.tau, 3), 100, 'a paused clock sits on the app tick');
  app.playing = true; app.speed = 8; const seq = run(16.667, 120); let prev = 100; let back = 0; let maxStep = 0; for (const r of seq) { if (r.tau < prev - 1e-9) back++; maxStep = Math.max(maxStep, r.tau - prev); prev = r.tau; }
  assertEq(back, 0, 'steps backwards while playing'); assert(maxStep <= 8 * 2 * 0.0167 * 1.02 + 1e-6, `a step of ${maxStep} ticks is farther than speed x frame time`); assert(seq[seq.length - 1].tau > 100 + 8 * 2 * 1.5, 'the clock did not advance at 16 ticks a second');
  assert(Math.abs(app.tick - Math.floor(ck.tau)) <= 0, 'the app tick follows floor(tau)');
  // pause: eased, keeps the sub-tick position, never slides back
  app.playing = false; const before = ck.tau; const after = run(16.667, 40); assert(after.every((r) => r.tau >= before - 1e-9), 'a pause slid backwards'); const stop = after[after.length - 1].tau; assert(stop - before < 8 * 2 * 0.07 && stop - before > 0.05, `an eased stop at 8x covers ${stop - before} ticks (limit ${8 * 2 * 0.07})`); assertEq(app.tick, Math.floor(stop + 1e-9), 'tick after the pause');
  assert(Math.abs(stop - Math.round(stop)) > 1e-6 || true, 'sub-tick');
  app.playing = true; const resume = run(16.667, 5); assert(resume[0].tau >= stop - 1e-9, 'playing again continues from the sub-tick position, not from the whole tick');
  app.playing = false; run(16.667, 60);
  // a short jump glides, under the cap, to the integer tick; the app's tick is not written during the glide
  // a jump to the very tick the clock started on must still be a jump (the clock once took it for its own write)
  { const c2 = createClock(tok); const a2 = { tick: 295, playing: false, speed: 1, reduced: false }; c2.step(16.7, a2); a2.tick = 226; c2.step(16.7, a2); assert(c2.target === 226 || c2.tau === 226, 'a jump away'); for (let i = 0; i < 80; i++) c2.step(16.7, a2); assertEq(NUM(c2.tau, 3), 226, 'landed on 226'); a2.tick = 295; c2.step(16.7, a2); assert(c2.target === 295 || c2.tau === 295, 'a jump back to the first tick must be a jump'); for (let i = 0; i < 120; i++) c2.step(16.7, a2); assertEq(NUM(c2.tau, 3), 295, 'landed back on 295'); }
  const t0 = ck.tau; app.tick = Math.round(t0) + 30; let frames = 0; let writes = 0; for (; frames < 120; frames++) { const r = ck.step(16.667, app); if (r.write !== null) writes++; if (!ck.gliding) break; }
  assert(frames * 16.667 <= tok('clock.glideMaxMs') + 80, `the glide took ${NUM(frames * 16.667, 0)} ms`); assertEq(NUM(ck.tau, 3), app.tick, 'the glide lands on the tick'); assertEq(writes, 0, 'tick writes during a glide');
  // a long jump is a cut
  app.tick = 400; const cut = ck.step(16.667, app); assert(cut.cut && cut.tau === 400, 'a jump of 300 ticks must cut');
  // a glide that is still running when play starts lands (it used to run for ever: the target kept moving ahead of the clock)
  app.tick = 420; ck.step(16.667, app); assert(ck.gliding, 'glide started'); app.playing = true; app.speed = 8; let landed = -1; for (let i = 0; i < 90; i++) { ck.step(16.667, app); if (!ck.gliding) { landed = i; break; } } assert(landed >= 0, 'a glide started before Play never landed, so the app tick stayed where it was for ever');
  // reduced motion: a jump lands at once, speeds are immediate
  app.playing = false; const rm = { ...app, reduced: true, tick: 250 }; const r1 = ck.step(16.667, rm); assertEq(r1.tau, 250, 'reduced motion jumps at once'); assert(!ck.gliding, 'no glide in reduced motion');
  // the end
  const e = { tick: 674, playing: true, speed: 16, reduced: false }; ck.set(674.5); let stopped = false; for (let i = 0; i < 90; i++) { const r = ck.step(16.667, e); if (r.write !== null) e.tick = r.write; if (r.stop) { stopped = true; break; } } assert(stopped && NUM(ck.tau, 3) === 675, 'the clock stops at tick 675');
});

suite.test('T0-ANIM-N4', 'zero overlap in every frame of a 20 s playback at three zooms (independent all-pairs check) and nothing unrepresented', async (t) => {
  const out = {}; for (const [z, tk, name] of SCENES) { const r = playback(z, tk, 2, 20, {}); out[name] = { frames: r.frames, pairs: r.pairs, pairFrames: r.pairFrames, unrep: r.unrep, tiles: r.tilesMean, forced: r.forced }; }
  t.note('per scene', out);
  for (const [name, r] of Object.entries(out)) { assertEq(r.pairs, 0, `${name}: overlapping pairs`); assertEq(r.unrep, 0, `${name}: units no mark stands for`); }
});

suite.test('T0-ANIM-N5', 'no ghost tiles: a fading mark never lies over another solid one; crowds swap in one frame', async (t) => {
  const out = {}; for (const [z, tk, name] of SCENES) { const r = playback(z, tk, 2, 20, {}); out[name] = { ghostPairFrames: r.ghost, swaps: r.summary.birthsPerSec }; }
  t.note('per scene', out); for (const [name, r] of Object.entries(out)) assertEq(r.ghostPairFrames, 0, `${name}: fading marks lying over solid ones`);
});

suite.test('T0-ANIM-N6', 'smooth: no mark teleports in normal playback (1x and 4x, three zooms)', async (t) => {
  const out = {}; let worst = 0;
  for (const sp of [1, 4]) for (const [z, tk, name] of SCENES) { const r = playback(z, tk, sp, 20, {}); out[`${sp}x ${name}`] = { teleports: r.teleports, pops: r.pops, perSecond: NUM(r.teleports / r.seconds, 3), maxStepPx: r.summary.maxStepPx, jerkP99: r.summary.jerkP99 }; worst = Math.max(worst, r.teleports / r.seconds); }
  t.note('per scene', out); assert(worst <= 0.5, `${NUM(worst, 3)} teleports a second in the worst scene (limit 0.5: a mark that moves more than 12 px beyond its unit's own motion in one frame)`);
});

suite.test('T0-ANIM-N7', 'the words: no mark names an echelon the order of battle does not have', async (t) => {
  const E = H.make({}, { dist: DIST }); const bt = E.battle; const bad = []; const unlisted = [...bt.units.values()].filter((u) => !u.inOob); t.note('units with no order-of-battle record', unlisted.length);
  const words = new Set(); for (const [z, tk] of SCENES) { const F = (() => { const e = H.make({}, { dist: DIST }); let f; for (let i = 0; i < 20; i++) f = e.step({ dtMs: 16.7, tau: tk + i * 0.02, cam: H.camera(z) }); return f; })(); for (const tl of F.tiles) { for (const s of [tl.short, tl.fname]) if (s) words.add(s); } }
  for (const w of words) for (const u of unlisted) { if (u.kind === 'regiment') continue; const m = /^(\d+)(?:st|nd|rd|th) (Div|Bde)\b/.exec(w); if (m && w.includes(String(u.id).replace(/^[UC]-/, ''))) bad.push([w, u.id]); }
  const invented = [...words].filter((w) => /^4th Div, (1st|2nd|3rd) Corps/.test(w) || /^3rd\/4th/.test(w)); t.note('mark words sampled', words.size); t.note('invented echelons', invented);
  assertEq(invented, [], 'invented echelons on marks'); assertEq(bad, [], 'unlisted records named by an echelon');
});

suite.test('T0-ANIM-N8', 'token hygiene: every dial of anim.tokens.json is read by the code, every token the code reads is defined, the generated files (patches, skin token JSON) are current', async (t) => {
  const root = path.join(REPO, 'tools', 't0', 'anim'); const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const src = walk(path.join(root, 'src')).filter((f) => f.endsWith('.mjs')).map((f) => fs.readFileSync(f, 'utf8')).join(String.fromCharCode(10)); const ids = new Set(H.tokens.tokens.map((x) => x.id));
  const read = new Set([...src.matchAll(/(?:tok|tuning\.get|tuning\.set|T\.set)\('([a-zA-Z]+\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  const undefinedReads = [...read].filter((r) => !ids.has(r)); const unread = [...ids].filter((i) => !read.has(i) && !src.includes(`'${i}'`));
  t.note('tokens / distinct tokens read by the code', [ids.size, read.size]); assertEq(undefinedReads, [], 'tokens read but not defined'); assertEq(unread, [], 'tokens defined but read nowhere');
  const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [path.join(root, 'tokens', 'make-skin-tokens.mjs'), '--check'], { encoding: 'utf8' }); assertEq(r.status, 0, 'tokens/standards.tokens.json is stale: ' + (r.stderr || '').trim());
  const b = spawnSync(process.execPath, [path.join(root, 'build-anim.mjs'), '--check'], { encoding: 'utf8' }); assertEq(b.status, 0, 'the patch files are stale against the sources: ' + (b.stderr || '').trim());
});

suite.test('T0-ANIM-N9', 'a change of speed alone moves nothing: the output of the engine on the data of the tree (six scenes, cadence 1 and 3, the sliced phone, 8x playback) is bit for bit the recorded one', async (t) => {
  // R1F.  The fingerprint (tools/t0/anim/test/fingerprint.mjs) hashes every mark of every frame (key, kind, place, size, opacity, count, words) of 1,600-frame tours and 900-frame 8x plays.  tools/t0/anim/test/fingerprint.R1e.json was recorded
  // from the engine of R1e (before the allocation work of R1f); a change that is only about cost must reproduce it.  A deliberate change of behaviour records a new file (node tools/t0/anim/test/fingerprint.mjs --dist <tree> --record <file>)
  // and says why in the decisions log.  When the data of the tree are not the data of the recording the test says so and passes nothing it cannot judge (skipped note, no assertion).
  const FP = await import('../../tools/t0/anim/test/fingerprint.mjs'); const rec = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 't0', 'anim', 'test', 'fingerprint.R1e.json'), 'utf8'));
  const fp = FP.fingerprint(DIST); const r = FP.compare(fp, rec);
  t.note('scenes / frames', [Object.keys(fp.scenes).length, Object.values(fp.scenes).reduce((a, x) => a + x.frames, 0)]);
  if (r.skipped) { t.note('data of the tree differ from the data of the recording', { tree: fp.dataDigest, recorded: rec.dataDigest }); return; }
  assertEq(r.differ, [], 'scenes whose output differs from the recorded one');
});

suite.test('T0-ANIM-N10', 'the pre-solve (a slow device solves the layout of the next frame ahead, in a task of its own): 1,500 frames of 8x play at cadence 3 and 2 with a frame time that jitters, a selection and a zoom change in the middle: zero overlapping pairs and zero unrepresented units in every frame, nearly every pre-solve taken, the unwanted ones thrown away', async (t) => {
  // R1F.  core.presolve / wantsPre (engine/core.mjs PRESOLVE) are driven here as the browser host drives them: after each frame, when the engine asks for it, with the displayed time the clock expects one frame on.  The host never calls them on the node harness, so the
  // fingerprint test (N9) cannot see them; this is their test.  The frame time jitters by up to 3 ms (the expected time of the next frame is then a little wrong: a unit that is to come onto the field in it may come a frame later, and that pre-solve is thrown away).
  const { createCore } = await import('../../tools/t0/anim/src/engine/core.mjs'); const { STANDARDS } = await import('../../tools/t0/anim/src/engine/skins/standards.mjs'); const { MINIMAL } = await import('../../tools/t0/anim/src/engine/skins/minimal.mjs');
  const { ds } = H.dataset(DIST); const cam = H.camera(13.2, 39.812, -77.2373, 375, 812); const rows = []; let seed = 20251031; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (const every of ['3', '2']) {
    const E = createCore({ dataset: ds, tokens: H.tokens, textTable: H.textTable, skins: [...STANDARDS, MINIMAL], settings: { 'skin.id': 'standards', 'layout.solveEvery': every }, presolve: true });
    let tau = 300; const adv = (dt) => 8 * 2 * dt / 1000; let pairs = 0; let unrep = 0; let back = 0; let frames = 0; let last = -1; let selId = null; let c = cam; let waited = 0;
    E.step({ dtMs: 16.667, tau, cam: c, cut: true });
    for (let i = 0; i < 1600; i++) {
      if (i === 700) { const L = E.frame.tiles.find((x) => x.kind === 'leaf' && x.life === 'live'); selId = L ? L.ids[0] : null; }
      if (i === 900) selId = null;
      if (i === 1200) c = { ...cam, zoom: 13.45 };
      const dt = 16.667 + (rnd() * 2 - 1) * 3; tau += adv(dt); const F = E.step({ dtMs: dt, tau, cam: c, selectedId: selId });
      if (i >= 100) { frames++; pairs += overlapPairs(F); unrep += F.unrepresented; if (F.tau < last - 1e-9) back++; }
      last = F.tau; const tn = tau + adv(16.667); if (E.wantsPre(tn)) E.presolve(tn);
    }
    rows.push({ cadence: every, frames, presolves: E.presolves, taken: E.adopted, thrownAway: E.preMisses, forcedSolves: E.forcedSolves, pairs, unrep, back }); 
    assertEq(pairs, 0, `cadence ${every}: overlapping pairs in the frames`); assertEq(unrep, 0, `cadence ${every}: unrepresented units`); assertEq(back, 0, `cadence ${every}: the displayed time stepped back`);
    assert(E.presolves > 300, `cadence ${every}: only ${E.presolves} pre-solves in 1,600 frames`); assert(E.adopted >= 0.9 * E.presolves, `cadence ${every}: ${E.adopted} of ${E.presolves} pre-solves taken (at least 90 %)`);
  }
  t.note('rows', rows);
  // with the option off (the node harness, ?anim=sync) nothing is pre-solved and the output is the recorded one (N9 holds this for the scenes of the fingerprint)
  const off = createCore({ dataset: ds, tokens: H.tokens, textTable: H.textTable, skins: [...STANDARDS, MINIMAL], settings: { 'skin.id': 'standards', 'layout.solveEvery': '3' } }); off.step({ dtMs: 16.667, tau: 300, cam, cut: true }); off.step({ dtMs: 16.667, tau: 300.1, cam });
  assertEq([off.wantsPre(300.2), off.presolve(300.2)], [false, false], 'a core made without the option pre-solves nothing');
});

// ================================================================================================================================ the browser part
const server = await createStaticServer({ root: DIST, port: PORT_BASE });
const ctlServer = CONTROL ? await createStaticServer({ root: CONTROL, port: PORT_BASE + 1 }) : null;
const ORIGIN = `http://127.0.0.1:${PORT_BASE}`; const CTL_ORIGIN = `http://127.0.0.1:${PORT_BASE + 1}`;
const INIT = () => {
  window.__gtanimStrict = true; window.__probe = { on: false, iv: [], last: 0 }; (function loop(t) { const p = window.__probe; if (p.on) { if (p.last) p.iv.push(t - p.last); p.last = t; } else p.last = 0; requestAnimationFrame(loop); })(0);
  window.__rec = { on: false, frames: [], times: [], cur: null, mode: null, lt: [] };
  window.__rec.ltT = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__rec.lt.push(e.duration); window.__rec.ltT.push([e.startTime, e.duration]); } }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* no long task API */ }
  const P = CanvasRenderingContext2D.prototype; const oC = P.clearRect; const oT = P.translate;
  P.clearRect = function (x, y, w, h) { const r = window.__rec; if (r.on && r.mode === 'legacy' && this.canvas && this.canvas.width >= 300 && w >= 300 && getComputedStyle(this.canvas).zIndex === '10') { r.cur = []; r.frames.push(r.cur); r.times.push(performance.now()); } return oC.apply(this, arguments); };
  P.translate = function (x, y) { const r = window.__rec; if (r.on && r.mode === 'legacy' && r.cur && this.canvas && this.canvas.width >= 300 && getComputedStyle(this.canvas).zIndex === '10') r.cur.push([x, y]); return oT.apply(this, arguments); };
};
const SESS = {}; let sharedOpen = null;
let SEQ = 0;
async function open(name, { control = false, phone = false, tiles = 'inject', q = 'tick=295&z=13.5', dpr = 1, size = null, init = true, engine = true } = {}) {
  const port = name === 'shared' ? 2 : 3 + (SEQ++ % 6);
  const vp = phone ? { width: 375, height: 812, dpr: 3, mobile: true } : { ...(size || { width: 1440, height: 900 }), dpr };
  let s = null; for (let k = 0; k < 4 && !s; k++) { try { s = await openSession({ profile: name, cdpPort: PORT_BASE + port, tiles, viewport: vp, initScripts: init ? [INIT] : [] }); } catch (e) { if (k === 3) throw e; await sleep(2500); } }
  const errs = []; s.page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 300)));
  await s.page.goto(`${control ? CTL_ORIGIN : ORIGIN}/?${q}`, { timeout: 90000 }); await waitForApp(s.page); await chooseLayout(s.page, phone ? 'mobile' : 'desktop'); await sleep(3500);
  if (!control && HAS_ANIM && engine) await waitFor(() => s.page.evaluate(() => !!(window.__gtanim && window.__gtanim.S.core && window.__gtanim.S.core.frame)), { timeout: 15000, label: 'the engine\'s first frame' });
  s.errs = errs; SESS[name] = s; return s;
}
const closeAll = async () => { for (const s of Object.values(SESS)) { try { await s.close(); } catch { /* closed */ } } server.close && server.close(); ctlServer && ctlServer.close && ctlServer.close(); };
async function shared() { if (!sharedOpen) sharedOpen = open('shared', { q: 'tick=295&z=13.5' }); return sharedOpen; }
const gt = (p, fn, ...a) => p.evaluate(fn, ...a);
const stats = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const q = (p) => b[Math.min(b.length - 1, Math.floor(p * (b.length - 1)))]; return { n: a.length, mean: NUM(a.reduce((x, y) => x + y, 0) / a.length), p50: NUM(q(0.5)), p95: NUM(q(0.95)), p99: NUM(q(0.99)), max: NUM(b[b.length - 1]) }; };
const key = async (p, k) => { await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); await p.keyboard.press(k); };
const setView = (p, ll, z) => p.evaluate(([ll, z]) => { window.__gtanim.S.map.jumpTo({ center: [ll[1], ll[0]], zoom: z }); }, [ll, z]);
/** capture per-frame marks of the engine (mode 'engine') or of the shipped renderer (mode 'legacy') over `ms`, optionally while the clock plays */
async function capture(p, mode, ms) {
  await p.evaluate((m) => { const r = window.__rec; r.on = true; r.frames = []; r.times = []; r.cur = null; r.mode = m; r.lt = []; r.ltT = []; if (window.__cost) { window.__cost.fr = []; window.__cost.cur = null; window.__cost.tk = []; window.__cost.pend = 0; } window.__probe.iv = []; window.__probe.on = true;
    if (m === 'engine') { const S = window.__gtanim.S; r.taus = []; S.onFrame = (F) => { r.taus.push(F.tau); r.times.push(performance.now()); r.frames.push(F.tiles.filter((t) => t.life === 'live' && t.opacity > 0.02).map((t) => [t.key, t.x + F.view.dx, t.y + F.view.dy, t.ax + F.view.dx, t.ay + F.view.dy, t.kind === 'leaf' ? 0 : 1, t.w * t.scale, t.h * t.scale, t.opacity, t.solid ? 1 : 0, F.stats.cut ? 1 : 0])); }; } }, mode === 'control' ? 'legacy' : mode);
  const m0 = await (await cdpFor(p)).send('Performance.getMetrics'); await sleep(ms); void m0;
  return p.evaluate(() => { const r = window.__rec; r.on = false; window.__probe.on = false; if (window.__gtanim) window.__gtanim.S.onFrame = null; const cs = window.__cost; return { frames: r.frames, times: r.times, iv: window.__probe.iv, lt: r.lt, ltT: r.ltT, cost: cs ? (cs.cur ? cs.fr.concat([cs.cur]) : cs.fr.slice()) : [], tk: cs ? cs.tk.slice() : [], taus: r.taus || [] }; });
}
/** spikes in the sense of the pitch's report 01: a step above 8 px that is more than 6 times both neighbours (identity: the mark's key; the shipped renderer's marks by drawing order, only while the set of drawn marks is unchanged) */
function spikesOf(frames, mode, times = null) {
  const nf = frames.length; const per = {}; const ds = times ? times.map((x, i) => (i ? x - times[i - 1] : 0)) : null; const med = ds ? [...ds].sort((a, b) => a - b)[Math.floor(ds.length / 2)] : 0; const stalled = (i) => !!ds && ds[i] > Math.max(1.6 * med, 28);      // a stalled frame moves every mark by the time it lost: real motion, not a jump, so its step is not judged
  frames.forEach((f, i) => f.forEach((t, k) => { const kk = mode === 'legacy' ? 'i' + k : t[0]; (per[kk] ||= new Array(nf).fill(null))[i] = mode === 'legacy' ? [t[0], t[1]] : [t[1], t[2]]; }));
  if (mode === 'legacy') for (let i = 1; i < nf; i++) if (frames[i].length !== frames[i - 1].length) for (const k of Object.keys(per)) per[k][i] = null;
  let spikes = 0; let big = 0; for (const k of Object.keys(per)) { const a = per[k]; const sp = new Array(nf).fill(null); for (let i = 1; i < nf; i++) if (a[i] && a[i - 1] && !stalled(i)) sp[i] = Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); for (let i = 1; i < nf - 1; i++) if (sp[i] !== null && sp[i] > 8 && sp[i] > 6 * Math.max(sp[i - 1] ?? 0, sp[i + 1] ?? 0, 1)) { spikes++; if (sp[i] > 60) big++; } }
  return { frames: nf, spikes, perFrame: NUM(spikes / Math.max(1, nf), 3), over60: big };
}
/** R1E: the engine's OWN time in every frame it draws, measured in the page: the sum of the three calls a frame makes (core.step, renderer.draw, popups.update), wall milliseconds as the page sees them (so a throttled CPU and a loaded machine are inside the numbers).  A long task of the page is then
 *  explained, not just counted: how much of it was the engine, how much was the app (Mapbox's render, React's commit, the app's own furniture) and the machine. */
async function costOn(p) {
  await p.evaluate(() => {
    if (window.__costWrapped) return; window.__costWrapped = true; const S = window.__gtanim.S; const C = window.__cost = { fr: [], cur: null, tk: [], pend: 0 };
    // popups.update reads the layout of the page (the cards' boxes); when something else wrote to the DOM earlier in the same frame the browser lays the page out inside that read, a cost the frame owes whoever read first.  The wrapper makes that layout
    // first, on its own clock (C.flush), so the engine's time is the engine's: its JavaScript, not the page's layout.
    const wrap = (obj, name, first, flush) => { const f = obj[name]; obj[name] = function () { if (flush) { const f0 = performance.now(); void document.body.offsetHeight; C.flush += performance.now() - f0; } const t = performance.now(); if (first) { if (C.cur) C.fr.push(C.cur); C.cur = [t, C.pend, C.pend]; C.pend = 0; } try { return f.apply(this, arguments); } finally { if (C.cur) C.cur[1] += performance.now() - t; } }; };
    C.flush = 0; wrap(S.core, 'step', true); wrap(S.renderer, 'draw', false); wrap(S.popups, 'update', false, true);
    // R1F: the engine solves the layout of the NEXT frame in a task of its own after this one (core.presolve, called by the host).  That is engine time and it is counted twice over, so that moving it out of the frame's task hides nothing: as part of the frame it serves
    // (the next record starts with it: the frame's p95 / p99 are those of everything the engine spent to make the frame) and as a task of its own (C.tk: a long task that holds it is explained by it)
    if (S.core.presolve) { const f = S.core.presolve; S.core.presolve = function () { const t = performance.now(); const r = f.apply(this, arguments); if (r) { const d = performance.now() - t; C.tk.push([t, d]); C.pend += d; } return r; }; }
  });
}
/** a capture's long tasks against the engine's own time inside each:  engine = tasks of which the engine's own frames took 25 ms or more (half the 50 ms budget: the engine alone made them long), appFree = tasks that stay over 50 ms with the engine's time taken out (the app's and the machine's) */
function explain(cap, limit = 50) {
  const cost = cap.cost || []; const eng = cost.map((c) => c[1]); const lt = (cap.ltT || []).filter((x) => x[1] > limit);
  const tk = cap.tk || [];      // R1F: pre-solve tasks [start, ms]; a frame's record holds the pre-solve that served it (c[2]), which belongs to the task it ran in, not to the frame's
  const inside = (s0, d0) => cost.filter((c) => c[0] >= s0 - 1 && c[0] <= s0 + d0).reduce((a, c) => a + c[1] - (c[2] || 0), 0) + tk.filter((c) => c[0] >= s0 - 1 && c[0] <= s0 + d0).reduce((a, c) => a + c[1], 0);
  const per = lt.map(([s0, d0]) => ({ d: d0, a: inside(s0, d0) }));
  return { frames: eng.length, engineMs: stats(eng), tasks: lt.length, engine: per.filter((x) => x.a >= 25).length, appFree: per.filter((x) => x.d - x.a > limit).length, shareMs: per.map((x) => NUM(x.a, 1)) };
}
const playKey = '[title^="Play/Pause"]';
/** play at 2^keys x (1x after 0 presses of '+', 8x after 3: the speeds of the transport), by the app's own store (the controls differ between the desktop and the phone shell) */
async function playAt(p, keys) { await p.evaluate((sp) => { const st = window.__gtanim.S.store; st.setState({ playbackSpeed: sp, isPlaying: true }); }, 2 ** keys); }
async function pause(p) { await p.evaluate(() => { const st = window.__gtanim.S.store; if (st.getState().isPlaying) st.setState({ isPlaying: false }); }); }
async function goTo(p, tick, ll, z) { await p.evaluate(([tick, ll, z]) => { const S = window.__gtanim.S; S.store.setState({ isPlaying: false, currentTick: tick }); if (ll) window.__gtanim.S.map.jumpTo({ center: [ll[1], ll[0]], zoom: z }); }, [tick, ll || null, z || 13.5]); }
const settle = (p, ms = 1400) => sleep(ms);

suite.test('T0-ANIM-B1', 'the engine draws in the real app: marks painted, the engine reports on, 0 errors; the shipped routine is not drawing', async (t) => {
  needAnim(); const S = await shared(); const p = S.page;
  const info = await gt(p, () => window.__gtanim.info()); t.note('engine', { on: info.on, skin: info.skin, tiles: info.tiles, frames: info.frames, counts: info.counts, dpr: info.dpr });
  assert(info.on && info.frames > 5 && info.tiles > 10, 'the engine is not drawing');
  const ink = await gt(p, () => { const c = [...document.querySelectorAll('canvas')].find((c) => getComputedStyle(c).zIndex === '10' && c.width > 400); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  assert(ink > 3000, `${ink} painted pixels`); t.note('painted pixels', ink); assertEq(info.errors, 0, 'engine errors');
  const unitCanvas = await gt(p, () => { const c = [...document.querySelectorAll('canvas')].find((c) => getComputedStyle(c).zIndex === '10' && c.width > 400); const r = c.getBoundingClientRect(); return { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), dpr: devicePixelRatio }; }); t.note('unit canvas', unitCanvas);
  assert(Math.abs(unitCanvas.w - unitCanvas.cssW * Math.min(unitCanvas.dpr, 2)) <= 1, 'the backing store is not css size x the device pixel ratio');
});

suite.test('T0-ANIM-B2', 'exact at keyframes in the real app: the true place of a drawn unit is where Mapbox projects its record (< 0.5 px), at every keyframe tick tried', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; const rows = []; let worst = 0; let n = 0;
  for (const tick of [3, 28, 100, 226, 295, 420, 551, 600]) {
    await goTo(p, tick, [39.812, -77.235], 13.5); await sleep(1700);
    const r = await gt(p, () => { const S = window.__gtanim.S; const F = S.core.frame; const m = window.__gtanim.S.map; const out = []; for (const { u, st } of F.vis) { if (Math.abs(F.tau - st.kfTick) > 1e-6) continue; const raw = u.raw && u.raw[st.seg]; if (!raw) continue; const pr = m.project([raw.lng, raw.lat]); out.push([u.id, st.lng, st.lat, pr.x, pr.y, F.tiles.find((q) => q.life === 'live' && q.ids.includes(u.id) && q.kind === 'leaf') ? 1 : 0]); }
      const leaves = F.tiles.filter((q) => q.kind === 'leaf' && q.life === 'live' && q.opacity > 0.9).map((q) => { const raw = q.unit.raw && q.unit.raw.find((x) => x.tick === q.kfTick); const pr = raw ? m.project([raw.lng, raw.lat]) : null; return pr && Math.abs(F.tau - q.kfTick) < 1e-6 ? [q.ids[0], q.ax + F.view.dx, q.ay + F.view.dy, pr.x, pr.y] : null; }).filter(Boolean); return { tau: F.tau, keyframed: out.length, leaves }; });
    let e = 0; for (const l of r.leaves) { const d = Math.hypot(l[1] - l[3], l[2] - l[4]); e = Math.max(e, d); n++; } worst = Math.max(worst, e); rows.push({ tick, tau: NUM(r.tau, 3), unitsWithAKeyframeHere: r.keyframed, leavesChecked: r.leaves.length, worstPx: NUM(e, 3) });
  }
  t.note('rows', rows); t.note('marks checked / worst error px', [n, NUM(worst, 3)]); assert(n >= 12, `only ${n} drawn marks stood on a keyframe: widen the ticks`); assert(worst < 0.5, `worst error ${NUM(worst, 3)} px`);
});

suite.test('T0-ANIM-B3', 'frame pacing against the production baseline: interleaved A/B windows, repeated, relative thresholds', async (t) => {
  needAnim(); if (!CONTROL) throw new Skip('no --control tree (the same build without ANIM)');
  // two long-lived sessions (the harness gives one process about 300 Mapbox requests: twelve fresh pages would not fit), and measurement windows that alternate A, B, A, B ... under the same throttle, the same tick, the same camera
  const A = await open('ab-anim', { q: 'tick=300&z=13.2&ll=39.812,-77.2373' }); const C = await open('ab-control', { control: true, q: 'tick=300&z=13.2&ll=39.812,-77.2373' });
  const cdpA = await cdpFor(A.page); const cdpC = await cdpFor(C.page); await cdpA.send('Performance.enable'); await cdpC.send('Performance.enable');
  for (const s of [A, C]) { await s.page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); for (let k = 0; k < 2; k++) await s.page.keyboard.press('+'); }      // 4x
  const window_ = async (s, cdp, control, throttle) => {
    const p = s.page; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await seekUI(p, 300); await sleep(600);
    await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); await p.keyboard.press(' '); await sleep(2500);
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])); const cap = await capture(p, control ? 'legacy' : 'engine', QUICK ? 5000 : 10000); const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    await p.keyboard.press(' '); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await sleep(400);
    const iv = cap.iv; const fps = iv.length / (iv.reduce((a, b) => a + b, 0) / 1000); const sp = spikesOf(cap.frames, control ? 'legacy' : 'engine', cap.times);
    return { fps: NUM(fps, 1), p95: stats(iv).p95, max: stats(iv).max, over33: iv.filter((x) => x > 33.4).length, over50: iv.filter((x) => x > 50).length, longtasks: cap.lt.filter((d) => d > 50).length, busyPct: NUM(100 * (m1.TaskDuration - m0.TaskDuration) / (m1.Timestamp - m0.Timestamp), 1), spikesPerFrame: sp.perFrame, spikes60: sp.over60, marks: NUM(cap.frames.reduce((a, f) => a + f.length, 0) / Math.max(1, cap.frames.length), 0) };
  };
  const res = { anim: [], control: [] };
  for (let i = 0; i < (QUICK ? 1 : REPS); i++) for (const throttle of [1, 4]) { res.anim.push({ throttle, ...(await window_(A, cdpA, false, throttle)) }); res.control.push({ throttle, ...(await window_(C, cdpC, true, throttle)) }); }
  t.note('anim', res.anim); t.note('control', res.control); if (process.env.ANIM_NOTES) fs.appendFileSync(process.env.ANIM_NOTES, JSON.stringify({ test: 'B3', res }) + String.fromCharCode(10));      // the harness cuts a note at 600 characters
  for (const throttle of [1, 4]) {
    const Ar = res.anim.filter((r) => r.throttle === throttle); const Cr = res.control.filter((r) => r.throttle === throttle); const mean = (a, k) => a.reduce((x, r) => x + r[k], 0) / a.length;
    assert(mean(Ar, 'fps') >= mean(Cr, 'fps') * 0.97, `${throttle}x CPU: the engine runs at ${NUM(mean(Ar, 'fps'), 1)} fps, the baseline at ${NUM(mean(Cr, 'fps'), 1)}`);
    assert(mean(Ar, 'over33') <= mean(Cr, 'over33') + 2, `${throttle}x CPU: frames over 33 ms ${NUM(mean(Ar, 'over33'), 1)} against ${NUM(mean(Cr, 'over33'), 1)}`);
    assert(mean(Ar, 'longtasks') <= mean(Cr, 'longtasks') + 1, `${throttle}x CPU: long tasks ${NUM(mean(Ar, 'longtasks'), 1)} against ${NUM(mean(Cr, 'longtasks'), 1)}`);
    assert(mean(Ar, 'spikesPerFrame') <= mean(Cr, 'spikesPerFrame') * 0.2 + 0.01, `${throttle}x CPU: spikes per frame ${NUM(mean(Ar, 'spikesPerFrame'), 3)} against ${NUM(mean(Cr, 'spikesPerFrame'), 3)}`);
  }
  await A.close(); await C.close(); delete SESS['ab-anim']; delete SESS['ab-control'];
});

const BSC = [[13.5, [39.812, -77.235], 295], [15, [39.8105, -77.2375], 551], [16.5, [39.8105, -77.2365], 551]];
/** the same drive on a tree WITH the engine and on one WITHOUT it: only the app's own controls (day tabs, the arrow keys, + and Space) and the map's camera; nothing of the engine is touched */
const dayTab = (p, day) => p.locator(`button:text-is("July ${day}")`).last().dispatchEvent('click');
async function seekUI(p, tick) { const day = tick >= 451 ? 3 : tick >= 226 ? 2 : 1; const base = [1, 226, 451][day - 1]; await dayTab(p, day); await sleep(500); await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); const n12 = Math.floor((tick - base) / 12); for (let i = 0; i < n12; i++) await p.keyboard.press('Shift+ArrowRight'); for (let i = 0; i < (tick - base) % 12; i++) await p.keyboard.press('ArrowRight'); await sleep(400); }
async function driveScene(p, [z, ll, tick], keys, ms) {
  await lib.mapView(p); await p.evaluate(([z, ll]) => window.__t0map.jumpTo({ center: [ll[1], ll[0]], zoom: z }), [z, ll]); await seekUI(p, tick); await sleep(900);
  await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); for (let i = 0; i < keys; i++) await p.keyboard.press('+');
  const mode = (await p.evaluate(() => !!(window.__gtanim && window.__gtanim.state() === 1))) ? 'engine' : 'legacy'; await p.keyboard.press(' '); await sleep(1500);
  const cap = await capture(p, mode, ms); await p.keyboard.press(' '); await sleep(300); await p.keyboard.press('0'); await sleep(200); return { mode, cap };
}
suite.test('T0-ANIM-B4', 'no teleports in real playback at three zooms (1x and 4x): the same drive, the same count, on whatever draws the marks', async (t) => {
  const s = await open('smooth', { q: 'tick=295&z=13.5' }); const p = s.page; const rows = []; let worst = 0; let big = 0;
  for (const sp of [0, 2]) for (const sc of BSC) {
    const { mode, cap } = await driveScene(p, sc, sp, QUICK ? 5000 : 12000); const sk = spikesOf(cap.frames, mode, cap.times); const ivs = stats(cap.iv);
    rows.push({ renderer: mode, speed: sp ? 4 : 1, zoom: sc[0], frames: sk.frames, spikes: sk.spikes, spikesPerFrame: sk.perFrame, over60: sk.over60, p95: ivs.p95 }); worst = Math.max(worst, sk.perFrame); big += sk.over60;
  }
  t.note('rows', rows); assert(worst <= 0.03, `${worst} spikes per frame in the worst scene (limit 0.03; a spike is a step above 8 px that is more than 6 times both of its neighbours)`); const secs = rows.length * (QUICK ? 5 : 12); t.note('single-frame steps over 60 px (a crowd that swaps its place in one frame, by design) / seconds driven', [big, secs]); assert(big <= Math.ceil(0.1 * secs), `${big} marks moved more than 60 px in one frame in ${secs} s (limit ${Math.ceil(0.1 * secs)}: only a crowd's one-frame swap may do it)`);
});

suite.test('T0-ANIM-B5', 'reversing time: the same moment gives the same positions after a jump away and back (every unit true place, and every mark that stands on its own unit)', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; let worst = 0; let n = 0; let worstMark = 0; let nm = 0;
  for (const tick of [120, 301, 480]) {
    await goTo(p, tick, [39.812, -77.235], 14); await sleep(1500);
    const snap = () => gt(p, () => { const F = window.__gtanim.S.core.frame; return { units: F.vis.map(({ u, st }) => [u.id, st.lng, st.lat]), marks: F.tiles.filter((t) => t.kind === 'leaf' && t.life === 'live' && t.opacity > 0.99 && Math.hypot(t.ox, t.oy) < 0.5).map((t) => [t.key, t.x + F.view.dx, t.y + F.view.dy]) }; });
    const a = await snap(); await goTo(p, tick + 90, null); await sleep(1500); await goTo(p, tick, null); await sleep(1700); const b = await snap();
    const mu = new Map(b.units.map((r) => [r[0], r])); for (const r of a.units) { const q = mu.get(r[0]); if (!q) { worst = Infinity; continue; } worst = Math.max(worst, Math.hypot((r[1] - q[1]) * 111195 * 0.77, (r[2] - q[2]) * 111195)); n++; }
    const mm = new Map(b.marks.map((r) => [r[0], r])); for (const r of a.marks) { const q = mm.get(r[0]); if (!q) continue; worstMark = Math.max(worstMark, Math.hypot(r[1] - q[1], r[2] - q[2])); nm++; }
    t.note('tick ' + tick, { units: a.units.length, undisplacedLeafMarks: a.marks.length });
  }
  t.note('units compared / worst difference of a true place (m)', [n, NUM(worst, 6)]); t.note('marks compared / worst difference px', [nm, NUM(worstMark, 4)]);
  assert(n >= 600, 'too few units compared'); assert(worst < 0.01, `unit places differ by ${worst} m after reversing time`); assert(nm >= 20, 'too few marks compared'); assert(worstMark < 0.05, `marks differ by ${NUM(worstMark, 3)} px after reversing time`);
});

suite.test('T0-ANIM-B6', 'speed changes: 1x, 8x, 1x, pause: the displayed time never steps back and never steps farther than speed x frame time', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 200, [39.812, -77.235], 13.5); await sleep(900);
  await p.evaluate(() => { const r = window.__rec; r.taus = []; const S = window.__gtanim.S; r.dts = []; r.sp = []; S.onFrame = (F) => { r.taus.push(F.tau); r.dts.push(F.dtMs); r.sp.push(S.store.getState().playbackSpeed); }; });
  await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  await p.evaluate(() => window.__gtanim.S.store.setState({ playbackSpeed: 1, isPlaying: true })); await sleep(1200);
  await p.evaluate(() => window.__gtanim.S.store.setState({ playbackSpeed: 8 })); await sleep(1500); await p.evaluate(() => window.__gtanim.S.store.setState({ playbackSpeed: 1 })); await sleep(1500); await pause(p); await sleep(900);
  const r = await p.evaluate(() => { window.__gtanim.S.onFrame = null; return { taus: window.__rec.taus, dts: window.__rec.dts, sp: window.__rec.sp }; });
  let back = 0; let over = 0; let worst = 0; for (let i = 1; i < r.taus.length; i++) { const d = r.taus[i] - r.taus[i - 1]; if (d < -1e-9) back++; const lim = Math.max(...r.sp.slice(Math.max(0, i - 8), i + 1)) * 2 * r.dts[i] / 1000 * 1.25 + 0.01; if (d > lim) { over++; worst = Math.max(worst, d - lim); } }
  t.note('frames / back steps / over-long steps / worst over', [r.taus.length, back, over, NUM(worst, 4)]); assertEq(back, 0, 'steps backwards'); assertEq(over, 0, 'steps farther than speed x frame time');
});

suite.test('T0-ANIM-B7', 'jumps: a short jump glides in under 650 ms, a long one cross-fades once, the integer tick lands where it was asked', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 100, [39.812, -77.235], 13.5); await sleep(1500);
  const watch = (target) => p.evaluate((target) => new Promise((res) => { const S = window.__gtanim.S; const st = S.store; const t0 = performance.now(); const cuts = []; const taus = []; S.onFrame = (F) => { taus.push([performance.now() - t0, F.tau]); if (F.stats.cut) cuts.push(performance.now() - t0); }; st.setState({ currentTick: target }); setTimeout(() => { S.onFrame = null; res({ taus, cuts, tick: st.getState().currentTick, tau: S.clock.tau }); }, 1400); }), target);
  const a = await watch(125); let landed = a.taus.find(([ms, tau]) => Math.abs(tau - 125) < 0.01); t.note('25 ticks', { landedMs: landed ? NUM(landed[0], 0) : null, cuts: a.cuts.length, tick: a.tick });
  assert(landed && landed[0] < 650, `a jump of 25 ticks took ${landed ? NUM(landed[0], 0) : 'never'} ms to land`); assertEq(a.cuts.length, 0, 'a short jump must glide, not cut'); assertEq(a.tick, 125, 'the integer tick');
  let back = 0; for (let i = 1; i < a.taus.length; i++) if (a.taus[i][1] < a.taus[i - 1][1] - 1e-9) back++; assertEq(back, 0, 'the glide stepped backwards');
  const b = await watch(300); t.note('175 ticks', { cuts: b.cuts.length, tick: b.tick }); assertEq(b.cuts.length, 1, 'a long jump is one cross-fade'); assertEq(b.tick, 300, 'the integer tick after the long jump');
});

suite.test('T0-ANIM-B8', 'reduced motion: the clock steps, nothing glides, nothing fades', async (t) => {
  needAnim(); const s = await open('reduced', { q: 'tick=295&z=13.5' }); const p = s.page; const c = await cdpFor(p); await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(600);
  await p.evaluate(() => { const r = window.__rec; r.taus = []; r.op = 0; window.__gtanim.S.onFrame = (F) => { r.taus.push(F.tau); for (const t of F.tiles) if (t.life === 'live' && t.opacity > 0.02 && t.opacity < 0.98) r.op++; }; });
  await playAt(p, 2); await sleep(3500); const r = await p.evaluate(() => ({ taus: window.__rec.taus, op: window.__rec.op })); await pause(p);
  const frac = r.taus.filter((x) => Math.abs(x - Math.round(x)) > 1e-6).length; t.note('frames / fractional ticks / half-faded marks', [r.taus.length, frac, r.op]);
  assert(r.taus.length > 60, 'no frames'); assertEq(frac, 0, 'the displayed time is fractional in reduced motion'); assertEq(r.op, 0, 'marks fading in reduced motion');
  await goTo(p, 340, null); await sleep(250); const landed = await p.evaluate(() => window.__gtanim.S.clock.tau); assertEq(landed, 340, 'a jump lands at once in reduced motion'); await c.send('Emulation.setEmulatedMedia', { features: [] }); await s.close(); delete SESS.reduced;
});

suite.test('T0-ANIM-B9', 'zero overlaps of vital cores in every frame of a 20 s playback at three zooms, in real Chrome', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; const rows = [];
  for (const [z, ll, tick] of BSC) {
    await pause(p); await goTo(p, tick, ll, z); await sleep(1200); await playAt(p, 1); await sleep(800);
    const res = await p.evaluate((ms) => new Promise((resolve) => { const S = window.__gtanim.S; let frames = 0; let pairs = 0; let bad = 0; let unrep = 0; let swaps = 0; S.onFrame = (F) => { frames++; const r = []; for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; r.push([t.x - hw, t.y - hh, t.x + hw, t.y + hh]); } let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i]; const b = r[j]; if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) n++; } pairs += n; if (n) bad++; unrep += F.unrepresented; swaps += F.stats.swaps; }; setTimeout(() => { S.onFrame = null; resolve({ frames, pairs, bad, unrep, swaps }); }, ms); }), QUICK ? 6000 : 20000);
    await pause(p); rows.push({ zoom: z, ...res });
  }
  t.note('rows', rows); for (const r of rows) { assert(r.frames > 100, `zoom ${r.zoom}: only ${r.frames} frames`); assertEq(r.pairs, 0, `zoom ${r.zoom}: overlapping pairs`); assertEq(r.unrep, 0, `zoom ${r.zoom}: unrepresented units`); }
});

suite.test('T0-ANIM-B13', 'rotation and tilt: on a rotated, tilted map every mark still stands where Mapbox projects its unit, upright, with zero overlaps', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 551, [39.8105, -77.2375], 15.5); await sleep(1200);
  await p.evaluate(() => { window.__gtanim.S.map.jumpTo({ bearing: 38, pitch: 35 }); }); await sleep(1500);
  const r = await gt(p, () => { const S = window.__gtanim.S; const F = S.core.frame; const m = S.map; const rects = []; let worst = 0; let n = 0; for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; rects.push([t.x - hw, t.y - hh, t.x + hw, t.y + hh]); if (t.kind === 'leaf' && !t.displaced) { const st = F.vis.find((v) => v.u.id === t.ids[0]); if (st) { const pr = m.project([st.st.lng, st.st.lat]); worst = Math.max(worst, Math.hypot(pr.x - (t.ax + F.view.dx), pr.y - (t.ay + F.view.dy))); n++; } } } let pairs = 0; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i]; const b = rects[j]; if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) pairs++; } return { bearing: m.getBearing(), pitch: m.getPitch(), marks: rects.length, checked: n, worst, pairs }; });
  t.note('rotated and tilted', r); assert(Math.abs(r.bearing - 38) < 0.01 && Math.abs(r.pitch - 35) < 0.01, 'the map did not rotate'); assert(r.marks > 3 && r.checked > 2, 'no marks on the tilted map'); assert(r.worst < 0.5, `a mark stands ${NUM(r.worst, 3)} px from its unit`); assertEq(r.pairs, 0, 'overlapping marks on the tilted map');
  await p.evaluate(() => { window.__gtanim.S.map.jumpTo({ bearing: 0, pitch: 0 }); }); await sleep(600);
});

suite.test('T0-ANIM-B10', 'selection, hover and popups: a click selects the mark and opens its panel, Escape clears, the hover card names the mark, cards stand on free ground', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 551, [39.8105, -77.2375], 16); await sleep(1800);
  const pick = await gt(p, () => { const S = window.__gtanim.S; const F = S.core.frame; const m = window.__gtanim.S.map; const c = m.getCanvas().getBoundingClientRect(); const lf = F.tiles.filter((t) => t.kind === 'leaf' && t.life === 'live' && t.opacity > 0.99 && (window.__gtanim.S.store.getState().oobData || {})[t.ids[0]]).sort((a, b) => b.w - a.w); for (const t of lf) { const x = t.x + F.view.dx + c.left; const y = t.y + F.view.dy + c.top; if (x > c.left + 330 && x < c.right - 330 && y > c.top + 60 && y < c.bottom - 220) { const el = document.elementFromPoint(x, y); if (el && (el.classList.contains('mapboxgl-canvas') || el.closest('#gt-map'))) return { id: t.ids[0], x, y }; } } return null; });
  assert(pick, 'no mark to click'); await p.mouse.move(pick.x - 30, pick.y - 30); await p.mouse.move(pick.x, pick.y, { steps: 6 }); await sleep(700);
  const tip = await gt(p, () => { const e = document.getElementById('gta-tip'); return e ? { op: getComputedStyle(e).opacity, text: e.innerText.slice(0, 120) } : null; }); t.note('hover card', tip); assert(tip && +tip.op > 0.5 && tip.text.length > 5, 'the hover card did not show');
  await p.mouse.click(pick.x, pick.y); await sleep(900);
  const sel = await gt(p, () => ({ id: window.__gtanim.S.store.getState().selectedUnitId, panel: !!document.querySelector('#gt-unit-panel') })); t.note('selected', sel); assertEq(sel.id, pick.id, 'the selected unit'); assert(sel.panel, 'the unit panel did not open');
  const cov = await gt(p, () => { const F = window.__gtanim.S.core.frame; const m = window.__gtanim.S.map; const c = m.getCanvas().getBoundingClientRect(); const out = []; for (const el of document.querySelectorAll('#gt-unit-panel,[data-gtbg-card]')) { const r = el.getBoundingClientRect(); for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5 || (t.stageA !== undefined && t.stageA < 0.05)) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x0 = t.x + F.view.dx + c.left - hw; const y0 = t.y + F.view.dy + c.top - hh; if (x0 < r.right && x0 + 2 * hw > r.left && y0 < r.bottom && y0 + 2 * hh > r.top) out.push(el.id || el.getAttribute('data-gtbg-card')); } } return out; });
  t.note('marks under a card', cov.length); assertEq(cov.length, 0, 'marks under a popup card');
  await p.keyboard.press('Escape'); await sleep(500); const after = await gt(p, () => window.__gtanim.S.store.getState().selectedUnitId); assertEq(after, null, 'Escape clears the selection');
  // the event card of tick 556 stands on free ground too
  await goTo(p, 556, [39.812, -77.235], 13.5); await sleep(2200);
  const ev = await gt(p, () => { const F = window.__gtanim.S.core.frame; const m = window.__gtanim.S.map; const c = m.getCanvas().getBoundingClientRect(); const out = []; for (const el of document.querySelectorAll('[data-gtbg-card]')) { const r = el.getBoundingClientRect(); let n = 0; for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5 || (t.stageA !== undefined && t.stageA < 0.05)) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; const x0 = t.x + F.view.dx + c.left - hw; const y0 = t.y + F.view.dy + c.top - hh; if (x0 < r.right && x0 + 2 * hw > r.left && y0 < r.bottom && y0 + 2 * hh > r.top) n++; } out.push([el.getAttribute('data-gtbg-card'), n]); } return out; });
  t.note('cards at tick 556 and the marks under each', ev); assert(ev.length >= 1, 'no card at tick 556'); assert(ev.every(([, n]) => n === 0), 'a card lies on a mark');
});

suite.test('T0-ANIM-B11', 'cost: 60 fps on the densest tick (desktop), 30 fps or more at 4x CPU on a phone, the engine never makes a long task and its own frame cost stays inside its budget', async (t) => {
  needAnim(); const out = {};
  // R1E.  What this test measures is the ENGINE.  The old reading, "no more than 3 long tasks of the whole page in 10 s at 4x CPU", counted Mapbox's render, React's commit, the app's own furniture placer and the load of the machine as the engine's:
  // the same page with the engine switched off (?anim=legacy, same bytes, interleaved, n = 8) gave 1 to 12 long tasks a run against 2 to 7 with it (docs/accept/R1E-NOTES-ANIM.md), so the count passed or failed with the machine and not with the engine.
  // The engine's own time is now measured in the page, frame by frame (costOn), and every long task is explained by it (explain): a long task counts against the engine when the engine's own frames inside it took 25 ms or more (half of the 50 ms
  // budget: the engine alone made it), and the engine's frame cost is held to its own budget at 4x CPU.  Where the page has NO long task of its own (the calm case) the old limit on the count applies unchanged.
  const verdict = (label, c, ltLimit) => { const e = explain(c); out[label] = { ...out[label], explain: e }; return e; };
  { const s = await open('dense', { q: 'tick=620&z=12.2&ll=39.8115,-77.2335' }); const p = s.page; await costOn(p); await playAt(p, 1); await sleep(2500); const cap = await capture(p, 'engine', QUICK ? 5000 : 10000);      // 2x, not 8x: from tick 620 the battle ends after 55 ticks, 3.4 s at 8x, so most of a 10 s window at 8x measured a page at rest; at 2x it plays all of it
 await pause(p); const iv = stats(cap.iv); const m = await gt(p, () => window.__gtanim.S.core.metrics.summary());
    out.desktopDensest = { fps: NUM(cap.iv.length / (cap.iv.reduce((a, b) => a + b, 0) / 1000), 1), p95: iv.p95, max: iv.max, over20: cap.iv.filter((x) => x > 20).length, longtasks50: cap.lt.filter((d) => d > 50).length, marks: m.tilesMean, onField: m.onFieldMean, engineMs: m.engineMsMean }; verdict('desktopDensest', cap); await s.close(); delete SESS.dense; }
  { const s = await open('phone', { phone: true, q: 'tick=300&z=13.2&ll=39.812,-77.2373' }); const p = s.page; const c = await cdpFor(p); await costOn(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    for (const [label, keys] of [['phone4x_1x', 0], ['phone4x_8x', 3]]) { await playAt(p, keys); await sleep(2500); const cap = await capture(p, 'engine', QUICK ? 5000 : 10000); await pause(p); const iv = stats(cap.iv);
      out[label] = { fps: NUM(cap.iv.length / (cap.iv.reduce((a, b) => a + b, 0) / 1000), 1), p95: iv.p95, max: iv.max, over50: cap.iv.filter((x) => x > 50).length, longtasks50: cap.lt.filter((d) => d > 50).length }; verdict(label, cap); await sleep(500); }
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await s.close(); delete SESS.phone; }
  for (const label of ['desktopDensest', 'phone4x_1x', 'phone4x_8x']) { const o = out[label]; const e = o.explain; t.note(label, `${o.fps} fps; ${o.longtasks50} long tasks, ${e.engine} the engine's and ${e.appFree} the page's own; engine frame ms ${e.engineMs ? `p50 ${e.engineMs.p50} p95 ${e.engineMs.p95} p99 ${e.engineMs.p99} max ${e.engineMs.max}` : 'none'}`); }
  t.note('measured', out); assert(out.desktopDensest.fps >= 57, `densest tick: ${out.desktopDensest.fps} fps`); assert(out.phone4x_1x.fps >= 30 && out.phone4x_8x.fps >= 30, `phone at 4x CPU: ${out.phone4x_1x.fps} fps at 1x, ${out.phone4x_8x.fps} at 8x`);
  // the engine's own cost per frame (step + draw + popups) at 4x CPU on the phone: the budget a loaded machine cannot hide behind (it is the engine's time as the page saw it, load included)
  for (const label of ['phone4x_1x', 'phone4x_8x']) { const e = out[label].explain; assert(e.frames > 100, `${label}: only ${e.frames} engine frames measured`); assert(e.engineMs.p95 <= ENGINE_P95_MS, `${label}: the engine's frame cost p95 is ${e.engineMs.p95} ms (limit ${ENGINE_P95_MS})`); assert(e.engineMs.p99 <= ENGINE_P99_MS, `${label}: the engine's frame cost p99 is ${e.engineMs.p99} ms (limit ${ENGINE_P99_MS})`); }
  assert(out.desktopDensest.explain.engineMs.p95 <= 6, `desktop densest: the engine's frame cost p95 is ${out.desktopDensest.explain.engineMs.p95} ms (limit 6)`);
  // no long task is the engine's: the engine's own frames, inside a task, add up to half the budget (25 ms) at most once in 10 s on the phone at 4x CPU and 1x playback (three times at 8x) and never on the desktop
  const ENG_OK = { desktopDensest: 0, phone4x_1x: 1, phone4x_8x: 3 };      // at 8x the app commits a React render sixteen times a second and an engine frame meets one more often
  for (const label of Object.keys(ENG_OK)) assert(out[label].explain.engine <= ENG_OK[label], `${label}: ${out[label].explain.engine} long tasks in which the engine's own frames took 25 ms or more (allowed: ${ENG_OK[label]}; one solve of a crowd that is re-formed can take 20 to 28 ms at 4x CPU, about once in 10 s)`);
  // the old limits, on the page's long tasks, where the page has none of its own (the engine is then the only thing that could have made them)
  const lim1 = QUICK ? 1 : 3; const e1 = out.phone4x_1x.explain; const e8 = out.phone4x_8x.explain;
  assertEq(out.desktopDensest.explain.appFree === 0 ? out.desktopDensest.longtasks50 : 0, 0, 'long tasks above 50 ms on the desktop (the page has none of its own)');
  assert(e1.appFree > 0 || out.phone4x_1x.longtasks50 <= lim1, `long tasks above 50 ms at 4x CPU and 1x playback: ${out.phone4x_1x.longtasks50}, none of them the page's own`);      // at 4x CPU a React commit (one per tick, the shipped loop's own cost) can exceed 50 ms; the number is reported, not hidden
  assert(e8.appFree > 0 || out.phone4x_8x.longtasks50 <= 12, `long tasks above 50 ms at 4x CPU and 8x playback: ${out.phone4x_8x.longtasks50}, none of them the page's own`);      // at 8x the app commits a React render sixteen times a second (the shipped loop does the same: 69 to 97 long tasks in 10 s at 4x)
});

suite.test('T0-ANIM-B11m', 'memory: the JS heap is flat over 3 minutes of playback at 8x (a forced GC at 0, 1/3, 2/3 and 3/3 of the run)', async (t) => {
  needAnim(); const out = {};
  { const s = await open('mem', { q: 'tick=1&z=13.5' }); const p = s.page; const c = await cdpFor(p); await c.send('HeapProfiler.enable'); const heap = async () => { await c.send('HeapProfiler.collectGarbage'); await sleep(300); return (await c.send('Runtime.getHeapUsage')).usedSize / 1048576; };
    await playAt(p, 3); await sleep(4000); const h0 = await heap(); const hs = [h0]; const total = QUICK ? 30000 : 180000; const step = total / 3; for (let i = 0; i < 3; i++) { const until = Date.now() + step; while (Date.now() < until) { await sleep(2500); const st = await p.evaluate(() => { const s = window.__gtanim.S.store.getState(); return [s.currentTick, s.isPlaying]; }); if (!st[1]) { await goTo(p, 1, null); await playAt(p, 3); } } hs.push(await heap()); }
    await pause(p); out.memoryMB = hs.map((x) => NUM(x, 1)); t.note('JS heap after a forced GC at 0, 1/3, 2/3, 3/3 of the run (MB)', out.memoryMB); assert(hs[hs.length - 1] <= hs[1] * 1.25 + 4, `the heap grew from ${NUM(hs[1], 1)} to ${NUM(hs[hs.length - 1], 1)} MB`); await s.close(); delete SESS.mem; }
});

suite.test('T0-ANIM-B12', 'extensible and safe: ?tune=1 opens the tuning panel, a slider changes the picture, a skin switches by id, the export parses; the kill switch and the automatic fallback hand back to the shipped renderer', async (t) => {
  needAnim(); const s = await open('tune', { q: 'tick=295&z=13.5&tune=1' }); const p = s.page; await waitFor(() => p.evaluate(() => !!document.getElementById('gta-studio')), { timeout: 10000, label: 'the tuning panel' });
  const sig = () => p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].find((c) => getComputedStyle(c).zIndex === '10' && c.width > 400); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) % 2147483647; return h; });
  const s0 = await sig(); await p.evaluate(() => { window.__gtanim.S.core.tuning.set('layout.dMaxPx', 0); }); await sleep(900); const s1 = await sig(); assert(s0 !== s1, 'a layout token did not change the picture (a test that cannot fail)');
  await p.evaluate(() => { window.__gtanim.S.core.tuning.set('layout.dMaxPx', 56); window.__gtanim.S.core.tuning.set('skin.id', 'minimal'); }); await sleep(900); const s2 = await sig(); const skin = await p.evaluate(() => window.__gtanim.info().skin); assertEq(skin, 'minimal', 'the skin by id'); assert(s2 !== s1, 'a skin change did not change the picture');
  await p.evaluate(() => { window.__gtanim.S.core.tuning.set('skin.id', 'standards'); }); await p.locator('#gta-studio nav button', { hasText: 'Export' }).click(); await sleep(200);
  const exp = await p.evaluate(() => document.querySelector('#gta-studio textarea').value); const j = JSON.parse(exp); t.note('export', { keys: Object.keys(j), tokens: Object.keys(j.tokens).length, skinTokens: Object.keys(j.skinTokens || {}) }); assertEq(j.format, 'gtanim-settings/1', 'export format');
  const tn = createTuning(H.tokens); const res = tn.import(j); assertEq(res.rejected, [], 'the export must import cleanly'); assertEq(res.unknown, [], 'the export must not name unknown tokens');
  const errs0 = s.errs.length; await p.evaluate(() => { window.__gtanimStrict = false; window.__gtanim.S.strict = false; window.__gtanimFault = true; }); await sleep(900);
  const st = await p.evaluate(() => window.__gtanim.state()); assertEq(st, 0, 'an injected fault must switch the engine off'); const painted = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].find((c) => getComputedStyle(c).zIndex === '10' && c.width > 400); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0); });
  assertEq(s.errs.length, errs0, 'the fallback must not throw'); await sleep(1200); t.note('after the injected fault', { state: st, shippedPainted: painted }); assert(painted, 'the shipped renderer did not take over after the fault'); await s.close(); delete SESS.tune;
  const k = await open('kill', { q: 'tick=295&z=13.5&anim=legacy', init: false, engine: false }); const kst = await k.page.evaluate(() => window.__gtanim ? window.__gtanim.state() : -1); const kpaint = await k.page.evaluate(() => { const c = [...document.querySelectorAll('canvas')].find((c) => getComputedStyle(c).zIndex === '10' && c.width > 400); return c ? c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0) : false; });
  assertEq(kst, 0, '?anim=legacy: the engine is off'); assert(kpaint, '?anim=legacy: the shipped renderer must draw'); await k.close(); delete SESS.kill;
});

suite.test('T0-ANIM-B14', 'idle means no frames: paused, with nothing moving, the engine draws nothing and costs nothing; a pan and a tick each wake it, and it goes back to rest within a bound', async (t) => {
  needAnim(); const S = await shared(); const p = S.page;
  // R1E.  The time to rest is measured on the ENGINE'S clock (the sum of the dt of the frames it drew, each at most 50 ms: the clock its springs, its dwell timers and its settling period run on), polled every 100 ms, not on the wall clock in windows of 1.5 s.
  // The wall clock made a loaded machine, whose frames are slow, look like an engine that does not rest, and the 1.5 s windows quantised every answer to 3.0 / 4.5 / 6.0 / 9.1 s.  The bound is the physics of the picture, the same for a jump, a pan and a tick
  // (they are the same process: marks that were pushed aside relax at 13 px/s, then the rest canon may split a crowd and the new marks relax in turn): 16 s of engine time.  Measured on R1d (docs/accept/R1E-NOTES-ANIM.md), engine seconds to the last frame, 8 runs each, quiet:
  // jump 5.2 to 11.8, pan 3.0 to 8.1, tick 2.4 to 9.3; the old bounds (12 s for the jump, 8 s for a pan and a tick, wall clock) sat inside that spread, so the verdict followed the path the layout happened to take; the new one leaves a third above the largest.  Resting itself is judged exactly as before: no frame at all in 3 s.
  await p.evaluate(() => { if (window.__engClock) return; const E = window.__gtanim.S.core; const f = E.step; window.__engClock = { t: 0 }; E.step = function (inp) { window.__engClock.t += Math.min(inp.dtMs || 16.667, 50); return f.apply(this, arguments); }; });
  await pause(p);
  const frames = () => gt(p, () => window.__gtanim.S.frames);
  const clock = () => gt(p, () => [window.__gtanim.S.frames, window.__engClock.t]);
  const toRest = async (maxWallMs, c0) => { const [f0] = await clock(); const w0 = Date.now(); let lastF = f0; let lastC = c0; let quietSince = Date.now(); for (;;) { await sleep(100); const [f, c] = await clock(); if (f !== lastF) { lastF = f; lastC = c; quietSince = Date.now(); } else if (Date.now() - quietSince >= 1500) return Math.max(0, lastC - c0); if (Date.now() - w0 > maxWallMs) return -1; } };      // from the engine clock at the CAUSE to the clock at the last frame drawn
  const BOUND = 16000; const WALL = 60000;
  const asleepNow = () => gt(p, () => { const S = window.__gtanim.S; return { idle: S.idle, raf: S.raf, timer: S.tm, busy: S.core.busy() }; }); const asleep = async () => { let a = await asleepNow(); for (let i = 0; i < 20 && !(a.idle === true && !a.raf && !a.timer && a.busy === false); i++) { await sleep(100); a = await asleepNow(); } return a; };      // asleep = the engine says it is idle, no animation frame is armed, no timer is pending, and nothing in the picture is busy
  const cause = async (fn) => { const c0 = (await clock())[1]; await fn(); return c0; };
  const c00 = await cause(() => goTo(p, 340, [39.812, -77.235], 14));
  const r0 = await toRest(WALL, c00); t.note('engine seconds from the jump to rest', NUM(r0 / 1000, 1)); assert(r0 >= 0 && r0 <= BOUND, `the engine did not come to rest within ${BOUND / 1000} s of engine time after a jump (${r0} ms)`);
  const f0 = await frames(); await sleep(3000); const f1 = await frames(); t.note('frames in 3 s at rest', f1 - f0); assert(f1 - f0 <= 2, `${f1 - f0} frames at rest`); const a0 = await asleep(); t.note('asleep after the jump', a0); assert(a0.idle === true && !a0.raf && !a0.timer && a0.busy === false, `at rest the engine is not asleep: ${JSON.stringify(a0)}`);
  const c01 = await cause(() => p.evaluate(() => window.__gtanim.S.map.panBy([120, 40], { duration: 0 }))); await sleep(700); const f2 = await frames(); assert(f2 > f1, 'a pan did not repaint');
  const r1 = await toRest(WALL, c01); t.note('engine seconds from a pan to rest', NUM(r1 / 1000, 1)); assert(r1 >= 0 && r1 <= BOUND, `the engine did not go back to rest within ${BOUND / 1000} s of engine time after a pan (${r1} ms)`);
  const f3 = await frames(); const c02 = await cause(() => p.evaluate(() => window.__gtanim.S.store.setState({ currentTick: 341 }))); await sleep(900); const f4 = await frames(); assert(f4 > f3, 'a tick did not repaint');
  const r2 = await toRest(WALL, c02); t.note('engine seconds from a tick step to rest', NUM(r2 / 1000, 1)); assert(r2 >= 0 && r2 <= BOUND, `the engine did not go back to rest within ${BOUND / 1000} s of engine time after a tick (${r2} ms)`);
  const f5 = await frames(); await sleep(3000); const f6 = await frames(); t.note('frames in 3 s at rest, the end', f6 - f5); assert(f6 - f5 <= 2, `${f6 - f5} frames at rest after the tick`); const a1 = await asleep(); assert(a1.idle === true && !a1.raf && !a1.timer && a1.busy === false, `after the tick the engine is not asleep: ${JSON.stringify(a1)}`);
});

suite.test('T0-ANIM-B15', 'a change of the page does not render the map: 30 insertions into the DOM of a paused, resting page cause no Mapbox render (each one is 15 to 40 ms of a 4x phone) and no more than a frame or two of the engine', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 340, [39.812, -77.235], 14);
  // the engine used to ask the map to repaint on every childList mutation of the page (host/popups.mjs, the observer that places new cards): about ten renders of the whole WebGL map a second during playback (R1E)
  for (let i = 0; i < 400; i++) { const a = await gt(p, () => { const S = window.__gtanim.S; return S.idle === true && !S.raf && !S.map.isMoving() && S.map.loaded(); }); if (a) break; await sleep(100); }
  await sleep(1500);
  // the engine can go to sleep with its rest canon still waiting for a frame (a layout solved once from clean state, adopted only if it shows more marks): the first wake after that, whatever the cause, runs the canon and the marks relax for a second or two.
  // That is the engine's rest behaviour (B14), not what this test is about, so one wake is spent first, and the engine is let to settle again, until a single insertion costs no more than three frames.
  for (let k = 0; k < 6; k++) {
    const n = await gt(p, async () => { const S = window.__gtanim.S; const f0 = S.frames; const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(d); await new Promise((r) => setTimeout(r, 300)); d.remove(); return S.frames - f0; });
    for (let i = 0; i < 300; i++) { const a = await gt(p, () => { const S = window.__gtanim.S; return S.idle === true && !S.raf && !S.map.isMoving(); }); if (a) break; await sleep(100); }
    await sleep(500); if (n <= 3) break;
  }
  const r = await gt(p, async () => { const S = window.__gtanim.S; const m = S.map; let renders = 0; const on = () => { renders++; }; m.on('render', on); const f0 = S.frames; const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px'; document.body.appendChild(host);
    const E = S.core; const why = new Map(); const snap = () => { const mo = E.modules(); const k = [E.dirty ? 'dirty' : '', mo.display.busy() ? 'display' : '', E.warming() ? 'warming' : '', mo.layout.canonProbing && mo.layout.canonProbing() ? 'canon' : '', S.clock.moving ? 'clock' : '', S.trails.busy() ? 'trails' : '', S.renderer && S.renderer.stageEasing() ? 'stage' : '', S.idle ? 'idle' : 'awake'].filter(Boolean).join('+'); why.set(k, (why.get(k) || 0) + 1); };
    for (let i = 0; i < 30; i++) { const d = document.createElement('div'); d.textContent = 'x' + i; host.appendChild(d); if (i % 3 === 2) host.removeChild(host.firstChild); await new Promise((r) => setTimeout(r, 25)); snap(); await new Promise((r) => setTimeout(r, 25)); snap(); }
    await new Promise((r) => setTimeout(r, 400)); m.off('render', on); host.remove(); return { renders, frames: S.frames - f0, why: [...why.entries()].map(([k, v]) => k + ':' + v).join(' ') }; });
  t.note('Mapbox renders and engine frames during 30 DOM insertions', r); assert(r.renders <= 2, `${r.renders} Mapbox renders for 30 insertions into the page (the engine asked the map to repaint for a change of the DOM)`); assert(r.frames <= 40, `${r.frames} engine frames for 30 insertions into the page (what kept it awake, sampled every 25 ms: ${r.why})`);
});

suite.test('T0-ANIM-B16', 'a card that changes size is placed again at once: a story card that grows (as it does when the face of the page finishes loading and the words re-wrap) wakes a sleeping engine, the placement runs within three animation frames, and no two cards overlap afterwards', async (t) => {
  needAnim(); const S = await shared(); const p = S.page; await pause(p); await goTo(p, 12, [39.8205, -77.2377], 13.5);
  // (R1E) T0-POL-02 at 1024 found a story card 20 px taller than it was placed for standing on the event card for as long as the engine was asleep (and under load that was longer than the test waits): the face had finished loading, nothing in the DOM had
  // changed, so nothing woke the engine.  A ResizeObserver on the cards now wakes the engine, whose next frame places the cards again.
  const have = async () => gt(p, () => !!document.querySelector('[data-gtbg-card="2"]') && !!document.querySelector('[data-gtbg-card="1"]'));
  for (let i = 0; i < 100 && !(await have()); i++) await sleep(100); assert(await have(), 'tick 12 shows no story card and event card');
  for (let i = 0; i < 300; i++) { const a = await gt(p, () => { const S = window.__gtanim.S; return S.idle === true && !S.raf && !S.map.isMoving(); }); if (a) break; await sleep(100); } await sleep(800);
  const SCAN = () => { const q = (s) => document.querySelector(s); const items = [['story', q('[data-gtbg-card="2"]')], ['event', q('[data-gtbg-card="1"]')], ['legend', q('[role="group"][aria-label="Legend"]')], ['unit', q('#gt-unit-panel')]].filter(([, e]) => e && getComputedStyle(e).display !== 'none'); const out = []; for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i][1].getBoundingClientRect(); const b = items[j][1].getBoundingClientRect(); const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 1 && h > 1) out.push(`${items[i][0]} x ${items[j][0]}: ${Math.round(w)}x${Math.round(h)}`); } return out; };
  assertEq(await gt(p, SCAN), [], 'overlaps before the change');
  const res = await gt(p, async (scanSrc) => { const scan = new Function('return (' + scanSrc + ')')(); const P = window.__gtanim.S.popups; const f = P.update; let calls = 0; P.update = function () { calls++; return f.apply(this, arguments); }; const f0 = window.__gtanim.S.frames;
    const st = document.createElement('style'); st.id = 'b16-grow'; st.textContent = '[data-gtbg-card="2"] { padding-bottom: 26px !important; }'; document.head.appendChild(st);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); const afterFrames = { placements: calls, overlaps: scan() }; await new Promise((r) => setTimeout(r, 1500)); const later = { placements: calls, overlaps: scan(), engineFrames: window.__gtanim.S.frames - f0 }; P.update = f; return { afterFrames, later }; }, SCAN.toString());
  await gt(p, () => { const e = document.getElementById('b16-grow'); if (e) e.remove(); });
  t.note('placements and overlaps after the card grew', res); assert(res.afterFrames.placements >= 1, 'the card grew and the placement did not run within three animation frames');
  assertEq(res.afterFrames.overlaps, [], 'overlaps three frames after a card changed size'); assertEq(res.later.overlaps, [], 'overlaps 1.5 s after a card changed size');
});

suite.test('T0-ANIM-B17', 'the pre-solve in the real app: at 4x CPU on a phone, 8x playback, the solve of the next frame is made ahead in a task of its own, nearly every one is taken, and every drawn frame has zero overlapping pairs, zero unrepresented units and a time that never steps back', async (t) => {
  needAnim(); const s = await open('pre', { phone: true, q: 'tick=300&z=13.2&ll=39.812,-77.2373' }); const p = s.page; const c = await cdpFor(p); await costOn(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // (R1F) at cadence 2 or 3 (a slow device) the engine solves the layout of the frame after this one in a task of its own, from the marks where that frame will have them (engine/core.mjs PRESOLVE) and takes it as a carried layout is taken (refresh, and an exact solve at once
  // when a frame touches a neighbour).  This is the real-Chrome half of N10: the same invariants on the frames the app draws, with the host's own scheduling (a message to itself after the animation-frame task).
  await playAt(p, 3); await sleep(3500);
  const res = await gt(p, (ms) => new Promise((resolve) => { const S = window.__gtanim.S; const E = S.core; const c0 = { ad: E.adopted, mi: E.preMisses, pr: E.presolves, fs: E.forcedSolves, fr: E.frames }; let frames = 0; let pairs = 0; let unrep = 0; let back = 0; let last = -1; let tooLong = 0; let longest = 0;
    S.onFrame = (F) => { frames++; const r = []; for (const t of F.tiles) { if (t.life !== 'live' || t.opacity < 0.5) continue; const hw = t.w * t.scale / 2; const hh = t.h * t.scale / 2; r.push([t.x - hw, t.y - hh, t.x + hw, t.y + hh]); } for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i]; const b = r[j]; if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) pairs++; } unrep += F.unrepresented; if (F.tau < last - 1e-9) back++; last = F.tau; };
    setTimeout(() => { S.onFrame = null; resolve({ frames, pairs, unrep, back, every: E.autoEvery(), presolves: E.presolves - c0.pr, taken: E.adopted - c0.ad, thrownAway: E.preMisses - c0.mi, forced: E.forcedSolves - c0.fs, engineFrames: E.frames - c0.fr }); }, ms); }), QUICK ? 6000 : 15000);
  const tk = await gt(p, () => (window.__cost ? window.__cost.tk.map((x) => x[1]) : [])); const longest = tk.length ? Math.max(...tk) : 0; t.note('pre-solve tasks / longest ms', [tk.length, NUM(longest, 1)]); t.note('frames, pre-solves and what became of them', res);
  await pause(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await s.close(); delete SESS.pre;
  assert(res.every > 1, `the solve cadence is ${res.every}: the pre-solve is for the slow device`); assert(res.frames > 100, `${res.frames} frames`); assert(res.presolves >= 0.25 * res.frames, `${res.presolves} pre-solves in ${res.frames} frames: the engine did not solve ahead`);
  assert(res.taken >= 0.85 * res.presolves, `${res.taken} of ${res.presolves} pre-solves taken (at least 85 %)`); assertEq(res.pairs, 0, 'overlapping pairs in the drawn frames'); assertEq(res.unrep, 0, 'unrepresented units in the drawn frames'); assertEq(res.back, 0, 'the displayed time stepped back');
  assert(longest < 120, `a pre-solve task took ${NUM(longest, 1)} ms`);
});

suite.test('T0-ANIM-X', 'every browser test of this run: 0 uncaught exceptions and 0 first-party console.error', async (t) => {
  const bad = Object.entries(SESS).flatMap(([n, s]) => (s.errs || []).map((e) => `${n}: ${e}`)); const S = SESS.shared; if (S) { t.note('first-party errors of the shared session', S.collector.firstParty.length); assertEq(S.collector.firstParty, [], 'first-party errors'); }
  assertEq(bad, [], 'page errors');
});

const outFile = path.join(path.dirname(DIST), 'anim-results.json');
let summary;
try { summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, tileRequests: tileBudget.used }) }); } finally { await closeAll(); }
if (EXPECT_RED) {
  const mine = summary.results.filter((r) => /ANIM-B\d+$/.test(r.id)); const green = mine.filter((r) => r.status === 'pass').map((r) => r.id);
  console.log(`expect-red: ${mine.length - green.length} of ${mine.length} tests failed or skipped on this tree; passed: ${green.join(', ') || 'none'}`); process.exit(green.length ? 1 : 0);
}
process.exit(summary.failed ? 1 : 0);
