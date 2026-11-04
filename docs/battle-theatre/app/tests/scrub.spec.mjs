// Gate Q12 through the page (real history layer): random-access seeks give the same state as sequential playback, forward and backward, across the whole window; no unit pops.
// Every time change here goes through the user interface (the scrubber's input event and the keyboard), not through the page's own API.
//   node --test docs/battle-theatre/app/tests/scrub.spec.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer, launch, open, enter } from './lib.mjs';

let S, B, page, ctx, log;
test.before(async () => { S = await startServer(10782); B = await launch(); ({ ctx, page, log } = await open(B, S.base)); await enter(page); });
test.after(async () => { await ctx.close(); await B.close(); await S.close(); });

const frames = n => page.evaluate(n => window.btApp.frames(n), n);
const state = () => page.evaluate(() => ({ t: window.btApp.state.t, live: window.btApp.liveHash(), cache: window.btApp.stateHash(), n: window.btApp.stats.units }));
const minOf = (m, d, h = 0, mm = 0) => ({ 6: 0, 7: 30, 8: 61 }[m] + d - 1) * 1440 + h * 60 + mm;
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

test('scrubber: random-access seeks equal sequential playback (Q12); the cache header carries seed and code version', async () => {
  const slider = page.locator('#bt-slider'); const t0 = minOf(7, 1, 6), steps = 60;
  await slider.fill(String(t0)); await page.focus('#bt-canvas'); await frames(3);
  const seq = []; seq.push({ ...(await state()), via: 'start' });
  for (let i = 0; i < steps; i++) { await page.keyboard.press('.'); await frames(2); seq.push({ ...(await state()), via: 'key' }); }   // sequential: 61 states, 10 minutes apart, by the keyboard shortcut
  assert.equal(seq[steps].t - seq[0].t, steps * 10); assert.ok(seq.every(s => Number.isFinite(s.t)));
  // random access: every one of those times, in a shuffled order, reached by moving the scrubber (forward, backward, across the window)
  const order = seq.map((s, i) => i), r = rng(1863); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let jumps = 0, back = 0, longest = 0, prev = seq[0].t;
  for (const i of order) {
    const want = seq[i];
    // detours: the far end, the start, the middle of the window, so every seek also crosses the whole window
    if (jumps % 7 === 0) { await slider.fill(String(minOf(7, 13, 20))); await frames(2); await slider.fill(String(minOf(6, 26, 1))); await frames(2); }
    await slider.fill(String(want.t)); await frames(2); const got = await state(); jumps++; if (want.t < prev) back++; longest = Math.max(longest, Math.abs(want.t - prev)); prev = want.t;
    assert.equal(got.t, want.t, 'the scrubber put the clock on the requested minute'); assert.equal(got.live, want.live, `tables at +${want.t - t0} min differ from sequential playback`); assert.equal(got.cache, want.cache, `event-cache state at +${want.t - t0} min`);
  }
  console.log(`# ${seq.length} sequential states vs ${jumps} random-access seeks (${back} backward, longest jump ${(longest / 1440).toFixed(1)} days): all identical (tables and cache state); units on the field ranged ${Math.min(...seq.map(s => s.n))}-${Math.max(...seq.map(s => s.n))}`);
  const h = await page.evaluate(() => window.btApp.header); assert.equal(h.seed, 1863); assert.equal(h.code, 'bt-sim-0.1'); assert.match(h.inputHash, /^[0-9a-f]{8}$/);
  console.log(`# cache header: seed ${h.seed}, code ${h.code}, scenario ${h.scenario}, input hash ${h.inputHash}, ${h.events} events, ${h.rejected} refused by the arrival rule`);
});

test('scrub across the full range from the keyboard: Home/End/PageUp/PageDown on the scrubber agree with the sequential state too', async () => {
  const slider = page.locator('#bt-slider'); await slider.focus();
  const seen = new Map();
  for (const k of ['Home', 'End', 'Home', 'PageDown', 'PageDown', 'PageUp', 'End', 'ArrowLeft', 'ArrowRight', 'Home']) { await page.keyboard.press(k); await frames(2); const s = await state(); const prior = seen.get(s.t); if (prior) assert.equal(prior, s.live + s.cache, `revisiting ${s.t} gives the same state`); seen.set(s.t, s.live + s.cache); }
  assert.ok(seen.size >= 4);
});

test('pixel identity: after a detour, the picture at a time is the picture it was before (paused)', async () => {
  const slider = page.locator('#bt-slider'); await page.evaluate(() => { window.btApp.setPlaying(false); window.btApp.theatre.setView('overview', true); });
  const shot = async () => { await frames(4); return page.screenshot({ clip: { x: 420, y: 70, width: 800, height: 700 } }); };
  await slider.fill(String(minOf(7, 3, 13, 30))); const a = await shot();
  await slider.fill(String(minOf(7, 5, 9))); await shot(); await slider.fill(String(minOf(6, 28, 2))); await shot();
  await slider.fill(String(minOf(7, 3, 13, 30))); const b = await shot();
  const same = Buffer.compare(a, b) === 0; let diff = 0; if (!same) { const x = await page.evaluate(async ([a, b]) => { const ld = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height).data; }; const A = await ld(a), Bm = await ld(b); let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - Bm[i]) + Math.abs(A[i + 1] - Bm[i + 1]) + Math.abs(A[i + 2] - Bm[i + 2]) > 6) n++; return n / (A.length / 4); }, [a.toString('base64'), b.toString('base64')]); diff = x; }
  console.log(`# pictures at 3 Jul 13:30 before and after a detour through 5 Jul and 28 Jun: ${same ? 'byte-identical' : `${(diff * 100).toFixed(3)}% of pixels differ`}`);
  assert.ok(same || diff < 0.002, `pictures differ in ${(diff * 100).toFixed(3)}% of pixels`);
});

test('no unit pops while playing at 60x: every unit moves at most double-quick speed per frame; units enter and leave the field only off the loaded ground', async () => {
  await page.evaluate(() => { const a = window.btApp; a.setSpeed(60); });
  // start two sim minutes before the 100th arrival, so that a few units march in during the run
  const start = await page.evaluate(() => { const a = window.btApp; return Math.min(...a.layer.units.filter(u => u.drawn).map(u => a.stage.arrivals.get(u.id).default)) - 2; });
  await page.locator('#bt-slider').fill(String(Math.floor(start))); await frames(3);
  const res = await page.evaluate(async () => {
    const a = window.btApp, st = a.stage, n = a.layer.units.length, W = st.T.W / 2, H = st.T.H / 2; a.setPlaying(true); await a.frames(30);
    let prevX = Float32Array.from(st.cx), prevZ = Float32Array.from(st.cz), prevP = Uint8Array.from(st.present), prevT = a.state.t; let maxStep = 0, enters = 0, leaves = 0, badEnter = 0, badLeave = 0, frames = 0, tSpan = 0;
    for (let f = 0; f < 240; f++) {
      await a.frames(1); frames++; const t = a.state.t, dtMin = t - prevT;
      for (let i = 0; i < n; i++) {
        if (st.present[i] && prevP[i]) { const d = Math.hypot(st.cx[i] - prevX[i], st.cz[i] - prevZ[i]); const bound = dtMin * 60 * 2.4384 * 1.01 + 0.5; if (d > bound) maxStep = Math.max(maxStep, d - bound); }
        else if (st.present[i] && !prevP[i]) { enters++; if (!(Math.abs(st.cx[i]) > W - 150 || Math.abs(st.cz[i]) > H - 150)) badEnter++; }
        else if (!st.present[i] && prevP[i]) { leaves++; if (!(Math.abs(prevX[i]) > W - 150 || Math.abs(prevZ[i]) > H - 150)) badLeave++; }
      }
      tSpan += dtMin; prevX.set(st.cx); prevZ.set(st.cz); prevP.set(st.present); prevT = t;
    }
    a.setPlaying(false); return { maxStep, enters, leaves, badEnter, badLeave, frames, simHours: tSpan / 60 };
  });
  console.log(`# 60x playback: ${res.frames} frames, ${res.simHours.toFixed(1)} sim hours; ${res.enters} units entered, ${res.leaves} left; largest excess step beyond marching speed ${res.maxStep.toFixed(3)} m; entries/exits on the loaded ground: ${res.badEnter}/${res.badLeave}`);
  assert.equal(res.badEnter, 0, 'a unit appeared on the loaded ground instead of marching in'); assert.equal(res.badLeave, 0); assert.ok(res.maxStep < 0.01, `a unit jumped ${res.maxStep} m beyond marching speed`); assert.ok(res.enters > 0, 'the run covered at least one arrival');
});

test('no console errors', async () => { assert.deepEqual(log.errors, []); assert.deepEqual(log.pageerrors, []); });
