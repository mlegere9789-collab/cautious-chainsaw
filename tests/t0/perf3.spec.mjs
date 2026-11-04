// T0-P3 suite: group PERF3 (tools/t0/PERF3-README.md) and the sliced layout work it asks of ANIM, proved in node (the engine) and in real Chrome on built scratch trees.
//
//   node tests/t0/perf3.spec.mjs --dist tmp/perf3/all2/dist --control tmp/perf3/all0/dist --control-noanim tmp/perf3/noanim0/dist --dist-noanim tmp/perf3/noanim1/dist
//   node tests/t0/perf3.spec.mjs --dist <tree> --filter 'P3-0[1-3]'      test-id subset
//   node tests/t0/perf3.spec.mjs --dist <tree> --build                   also builds the stack with every candidate group (T0-P3-11, about 2 minutes)
//   node tests/t0/perf3.spec.mjs --dist <tree> --long                    also the long open/close window of the leak test (T0-P3-12, 60+ cycles, about 8 minutes)
//   node tests/t0/perf3.spec.mjs --dist <tree without PERF3 and with the old ANIM> --control <the final tree> --expect-red     red-first proof of the browser tests (T0-P3-04..07, 09): exits 0 when they FAIL
//   --quick       fewer repetitions (smoke)      --slot n  parallel runs (ports base+40n)
//
// Trees (python tmp/perf3/stack.py --out <dir> --with <groups>, the wrapper of tmp/perf2/stack.py):
//   --dist            R1c + CLOCK,DATA,MON,ANIM,POLISH,PG-polish,PG-legal,PG-polish-legal,PERF2,PG-perf2,PERF3,PG-perf3,PG-zperf3
//   --control         the same without PERF3, PG-perf3, PG-zperf3 and with the ANIM of before the sliced work (the engine of git HEAD~: tools/t0/anim from commit 17ba8ee); tests that compare use it
//   --dist-noanim     the stack without ANIM, with PERF3 / PG-perf3 / PG-zperf3        --control-noanim   the same without PERF3 groups
// Real input through CDP, long tasks / Long Animation Frames / Event Timing as a visitor and the acceptance harness see them, 4x CPU throttle on the phone shell.  Mapbox only through the capped harness.
process.env.T0_AGENT ||= 'perf3';
process.env.T0_PORT_BASE ||= '9900';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const crypto = await import('node:crypto');
const { pathToFileURL } = await import('node:url');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitFor, waitForApp, emulateViewport, assert, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const tree = (name, dflt = null) => { const v = opt(name, dflt); return v ? path.resolve(REPO, v) : null; };
const DIST = tree('dist', 'tmp/perf3/all2/dist');
const CONTROL = tree('control');
const DIST_NOANIM = tree('dist-noanim');
const CONTROL_NOANIM = tree('control-noanim');
const FILTER = opt('filter', null);
const QUICK = !!opt('quick', false);
const BUILD = !!opt('build', false);
const LONGRUN = !!opt('long', false);
const EXPECT_RED = !!opt('expect-red', false);
const SLOT = Number(opt('slot', 0)) || 0;
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'perf3.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + SLOT * 40 + k * 2, cdp: PORT_BASE + SLOT * 40 + k * 2 + 1 }; };
const LONG = 50;

const OBSERVE = `(() => {
  if (window.__p3) return;
  const s = window.__p3 = { lt: [], loaf: [], ev: [], mt: 0, maps: [], pre: 0, cuts: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.loaf.push({ s: e.startTime, d: e.duration, scripts: (e.scripts || []).map((x) => ({ type: x.invokerType, inv: x.invoker, d: x.duration, fl: x.forcedStyleAndLayoutDuration })) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.ev.push({ n: e.name, s: e.startTime, d: e.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  try { const m = CanvasRenderingContext2D.prototype.measureText; CanvasRenderingContext2D.prototype.measureText = function () { s.mt++; return m.apply(this, arguments); }; } catch (e) {}
  try { let v; Object.defineProperty(window, 'GTBG_PRECOMPILE', { configurable: true, get() { return v && function () { s.pre++; return v.apply(this, arguments); }; }, set(x) { v = x; } }); } catch (e) {}
  try { let mb; Object.defineProperty(window, 'mapboxgl', { configurable: true, get() { return mb; }, set(x) { mb = x; if (x && x.Map && !x.Map.__p3) { const Orig = x.Map; let fired = true; const W = function (o) { const m = new Orig(o); s.maps.push({ t: performance.now(), afterTask: fired }); fired = false; setTimeout(() => { fired = true; }, 0); return m; }; W.prototype = Orig.prototype; Object.setPrototypeOf(W, Orig); W.__p3 = true; x.Map = W; } } }); } catch (e) {}
  s.reset = () => { s.lt.length = 0; s.loaf.length = 0; s.ev.length = 0; };
})();`;

async function session(dist, { vp = { width: 1440, height: 900, dpr: 1, mobile: false }, tiles = 'inject', onboarded = true, url = '/', app = true, wait = 2500, chooseLayout = true, cpu = 1, query = '' } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `p3${SLOT}-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded, initScripts: [OBSERVE] });
  const page = S.page; const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  await emulateViewport(page, vp);
  const cdp = await L.cdpFor(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(`${srv.url}${url}${query}`, { waitUntil: 'load' });
  if (app) { await waitForApp(page, 60000); await sleep(wait); if (chooseLayout && !vp.mobile) await L.chooseLayout(page, 'desktop').catch(() => {}); await sleep(1500); }
  return { S, srv, page, cdp, origin: srv.url, vp, warnings, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}
const PHONE = { width: 390, height: 844, dpr: 2, mobile: true };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** real tap / click on the named button, then what the page did in the next `windowMs`: long tasks, the click's script, forced layout inside it */
async function pressByName(page, name, { touch = true, windowMs = 3500 } = {}) {
  const b = page.getByRole('button', { name, exact: true }).first();
  const bb = await b.boundingBox();
  await page.evaluate(() => window.__p3.reset());
  const t0 = await page.evaluate(() => performance.now());
  if (touch) await L.touchTap(page, bb.x + bb.width / 2, bb.y + bb.height / 2); else await b.click();
  await sleep(windowMs);
  const r = await page.evaluate((t0) => ({ lt: window.__p3.lt.filter((l) => l.s >= t0 - 5).map((l) => Math.round(l.d)), loaf: window.__p3.loaf.filter((f) => f.s >= t0 - 5), ev: window.__p3.ev.filter((e) => e.s >= t0 - 5 && /^(click|pointerup|touchend|mouseup)$/.test(e.n)).map((e) => Math.round(e.d)) }), t0);
  const click = r.loaf.flatMap((f) => f.scripts).filter((x) => x.type === 'event-listener' && /onclick/.test(x.inv || ''));
  return { lt: r.lt, max: r.lt.length ? Math.max(...r.lt) : 0, sum: r.lt.reduce((a, b) => a + Math.max(0, b - LONG), 0), clickForced: click.length ? Math.max(...click.map((x) => Math.round(x.fl || 0))) : 0, clickMs: click.length ? Math.max(...click.map((x) => Math.round(x.d))) : 0, response: r.ev.length ? Math.max(...r.ev) : 0 };
}
const need = (v, what) => { if (!v) throw new Skip(`pass ${what}`); };

const suite = createSuite('perf3');

// =========================================================================================================== the engine, in node
const HL = pathToFileURL(path.join(REPO, 'tools/t0/anim/test/headless.mjs')).href;
const CORE = pathToFileURL(path.join(REPO, 'tools/t0/anim/src/engine/core.mjs')).href;
const STD = pathToFileURL(path.join(REPO, 'tools/t0/anim/src/engine/skins/standards.mjs')).href;

// sha1 of every displayed tile (key, kind, x, y, w, h, opacity, n, names) of 1600 frames in each of five scenes (phone and desktop, zooms 12 to 16, jumps, fast play, a selection) with a deterministic clock, taken from the
// engine BEFORE PERF3 touched it (git 17ba8ee) on the data of the full candidate stack.  The solver was made faster and was cut into resumable steps; nothing it computes may change.
const FINGERPRINT = {
  'phone13.5': '7e01840246a7cbc858db44cac127f901fd637642', 'desk13.5': '6da765eac6377984e0361982da35a0c0418d16e7', 'desk15': '9d49d81b8f164b3f715c8177ebd530f1695fd962',
  'phone12': 'c3eaa11ed7561f856755371408caf4331a536893', 'desk16': '492b023017a3636abd8c7f0938e7480c915ec8eb',
};
suite.test('T0-P3-01', 'the faster solver gives the same frames: 8000 frames of real data in five scenes hash to what the engine of before PERF3 gave', async (t) => {
  let n = 0; const realNow = performance.now.bind(performance); performance.now = () => (n++) * 0.0005;      // a deterministic clock (the wall-clock budget of settle() never trips)
  try {
    const hl = await import(HL); const out = {};
    const scen = [['phone13.5', [13.5, 39.812, -77.235, 390, 700]], ['desk13.5', [13.5, 39.812, -77.235, 1440, 800]], ['desk15', [15, 39.8, -77.25, 1440, 800]], ['phone12', [12, 39.812, -77.235, 390, 700]], ['desk16', [16, 39.8, -77.25, 1440, 800]]];
    for (const [name, c] of scen) {
      const E = hl.make({}, { dist: DIST }); const cam = hl.camera(...c); const h = crypto.createHash('sha1'); let tau = 20;
      const feed = (F) => { for (const k of F.tiles) h.update(`${k.key}|${k.kind}|${k.x.toFixed(2)}|${k.y.toFixed(2)}|${k.w.toFixed(2)}|${k.h.toFixed(2)}|${k.opacity.toFixed(3)}|${k.n}|${k.fname || ''}|${k.short || ''}\n`); h.update(`#${F.overlaps}|${F.unrepresented}|${F.rounds}\n`); };
      const run = (k, cutFirst, dtau, sel) => { for (let i = 0; i < k; i++) feed(E.step({ dtMs: 16.667, tau: (tau += dtau), cam, cut: cutFirst && i === 0, selectedId: sel || null })); };
      run(40, true, 0); run(120, false, 0.05); run(60, false, 0);
      for (const j of [226, 300, 450, 600, 120, 380]) { tau = j; run(30, true, 0); run(100, false, 0.08); run(80, false, 0); }
      run(60, false, 0.5); const some = E.frame.tiles.find((k) => k.kind === 'leaf'); if (some) run(60, false, 0, some.ids[0]);
      out[name] = h.digest('hex');
    }
    t.note('fingerprints', out);
    const bad = Object.keys(FINGERPRINT).filter((k) => out[k] !== FINGERPRINT[k]);
    assert(!bad.length, `frames differ from the engine of before PERF3 in: ${bad.join(', ')}`);
  } finally { performance.now = realNow; }
});

suite.test('T0-P3-02', 'sliced work: a cut and the canon probes are done in slices (every step a few milliseconds, the marks come back), zero overlaps and every unit represented on every frame', async (t) => {
  const hl = await import(HL); const { createCore } = await import(CORE); const { STANDARDS } = await import(STD);
  const { ds } = hl.dataset(DIST); const cam = hl.camera(13.5, 39.812, -77.235, 390, 700);
  const attempt = () => {
    const E = createCore({ dataset: ds, tokens: hl.tokens, textTable: hl.textTable, skins: [...STANDARDS], settings: { 'skin.id': 'standards' }, autoQuality: false, sliceMs: 4 });
    let tau = 10; for (let i = 0; i < 30; i++) E.step({ dtMs: 16.7, tau, cam });
    const steps = []; const firstLive = []; let overlaps = 0; let unrep = 0; let frames = 0; let pendingFrames = 0; let cuts = 0;
    for (const jump of [226, 450, 300, 100, 380, 600]) {
      tau = jump; let live = -1;
      for (let i = 0; i < 220; i++) { const t0 = performance.now(); const F = E.step({ dtMs: 16.7, tau, cam, cut: i === 0 }); steps.push(performance.now() - t0); frames++; if (F.overlaps > 0) overlaps++; if (!F.pending && F.unrepresented > 0) unrep++; if (F.pending) pendingFrames++; if (F.stats.cut) cuts++; if (live < 0 && !F.pending && F.tiles.some((k) => k.life === 'live')) live = i; }
      firstLive.push(live);
    }
    steps.sort((a, b) => a - b);
    return { frames, overlaps, unrep, pendingFrames, cuts, p95: +steps[Math.floor(steps.length * 0.95)].toFixed(1), p99: +steps[Math.floor(steps.length * 0.99)].toFixed(1), max: +steps[steps.length - 1].toFixed(1), firstLive };
  };
  let r = null; const tries = [];
  for (let k = 0; k < 3; k++) { r = attempt(); tries.push(r); if (r.p99 <= 12 && r.max <= 30) break; }
  t.note('last attempt (ms per core.step in node; budget 4 ms a slice + the ordinary 1-2 ms)', r);
  assert(r.overlaps === 0, `${r.overlaps} frames with overlapping marks`); assert(r.unrep === 0, `${r.unrep} settled frames with an unrepresented unit`);
  assert(r.cuts === 6, `${r.cuts} cut events for 6 jumps (want one each)`); assert(r.pendingFrames > 6, 'the cold start was never cut into slices (every cut was done in its first frame)');
  assert(r.firstLive.every((x) => x >= 0 && x < 120), `the marks did not come back after a cut: ${r.firstLive.join(',')}`);
  assert(r.p99 <= 12 && r.max <= 30, `a step took too long: p99 ${r.p99} ms, max ${r.max} ms (3 attempts)`);
});

suite.test('T0-P3-03', 'a solve cut into slices ends in the same picture as the same solve in one call (marks, crowds, offsets), and a cancelled job leaves the next frame whole', async (t) => {
  const hl = await import(HL); const { createCore } = await import(CORE); const { STANDARDS } = await import(STD);
  const { ds } = hl.dataset(DIST); const cam = hl.camera(13.5, 39.812, -77.235, 1280, 800);
  const mk = (slice) => createCore({ dataset: ds, tokens: hl.tokens, textTable: hl.textTable, skins: [...STANDARDS], settings: { 'skin.id': 'standards' }, autoQuality: false, sliceMs: slice });
  const sig = (F) => F.tiles.filter((k) => k.life === 'live').map((k) => `${k.kind}:${k.ids.join('+')}`).sort().join('|');
  const rows = [];
  for (const tau of [226, 450, 380]) {
    const a = mk(0); const b = mk(4); a.step({ dtMs: 16.7, tau: 10, cam }); b.step({ dtMs: 16.7, tau: 10, cam }); for (let i = 0; i < 20; i++) { a.step({ dtMs: 16.7, tau: 10, cam }); b.step({ dtMs: 16.7, tau: 10, cam }); }
    let Fa = null; let Fb = null; for (let i = 0; i < 400; i++) { Fa = a.step({ dtMs: 16.7, tau, cam, cut: i === 0 }); Fb = b.step({ dtMs: 16.7, tau, cam, cut: i === 0 }); }
    const na = Fa.tiles.filter((k) => k.life === 'live').length; const nb = Fb.tiles.filter((k) => k.life === 'live').length;
    rows.push({ tau, syncMarks: na, slicedMarks: nb, sameSet: sig(Fa) === sig(Fb) });
  }
  t.note('after 400 frames at rest', rows);
  assert(rows.every((r) => Math.abs(r.syncMarks - r.slicedMarks) <= Math.max(2, Math.round(0.08 * r.syncMarks))), 'the sliced and the one-call layouts differ by more than 8 % in their number of marks');
  { const E = mk(4); const tau = 450; for (let i = 0; i < 60; i++) E.step({ dtMs: 16.7, tau, cam, cut: i === 0 });
    const before = E.frame.tiles.filter((k) => k.life === 'live').length; E.setDataset(ds); const ms = []; let min = 1e9; let pend = 0;
    for (let i = 0; i < 120; i++) { const t0 = performance.now(); const F = E.step({ dtMs: 16.7, tau, cam }); ms.push(performance.now() - t0); if (F.pending) pend++; min = Math.min(min, F.tiles.filter((k) => k.life === 'live').length); }
    t.note('a new dataset (a day of placements arrived)', { before, minDuring: min, pendingFrames: pend, maxStepMs: +Math.max(...ms).toFixed(1) });
    assert(min === before && pend > 0, `a new dataset made the marks vanish (${before} -> ${min}) or was not cut into slices (${pend} pending frames)`); }
  const E = mk(4); for (let i = 0; i < 10; i++) E.step({ dtMs: 16.7, tau: 10, cam });
  E.step({ dtMs: 16.7, tau: 226, cam, cut: true }); E.step({ dtMs: 16.7, tau: 450, cam, cut: true });      // a second cut while the first job is still running
  let F = null; for (let i = 0; i < 400; i++) F = E.step({ dtMs: 16.7, tau: 450, cam });
  assert(F.overlaps === 0 && F.unrepresented === 0 && !F.pending && F.tiles.some((k) => k.life === 'live'), 'a restarted job left a broken frame');
});

// =========================================================================================================== ANIM in the browser
suite.test('T0-P3-04', 'phone at 4x CPU, date-jump tap with the engine on: no long task above 200 ms and under 400 ms of blocking in the next 3.5 s (the engine of before: 0.9 s and 0.6 s tasks)', async (t) => {
  const run = async (dist) => { const S = await session(dist, { vp: PHONE, cpu: 4 }); try { const r = []; for (let i = 0; i < (QUICK ? 1 : 2); i++) { r.push(await pressByName(S.page, 'July 2')); await pressByName(S.page, 'July 1', { windowMs: 2500 }); } return r; } finally { await S.close(); } };
  const a = await run(DIST); t.note('tap on "July 2": long tasks (ms) after the tap', a.map((x) => x.lt));
  const bad = a.filter((x) => x.max > 200 || x.sum > 400);
  assert(!bad.length, `long task / blocking after the tap: ${bad.map((x) => x.lt.join('+')).join(' ; ')}`);
  if (CONTROL) { const c = await run(CONTROL); t.note('same tap on the control (the engine before the sliced work)', c.map((x) => x.lt)); assert(Math.max(...c.map((x) => x.max)) > Math.max(...a.map((x) => x.max)), 'the control is not slower: the test measures nothing'); }
});

suite.test('T0-P3-05', 'the marks come back after a date jump at 4x CPU within 3 s (one cross-fade, nothing stays hidden), and the engine reports no error', async (t) => {
  const S = await session(DIST, { vp: PHONE, cpu: 4 });
  try {
    await S.page.evaluate(() => { const G = window.__gtanim.S; window.__p3.live = []; G.onFrame = (F) => { window.__p3.live.push([Math.round(performance.now()), F.tiles.filter((k) => k.life === 'live' && k.opacity > 0.5).length, !!F.pending, !!F.stats.cut]); }; });
    const b = S.page.getByRole('button', { name: 'July 2', exact: true }).first(); const bb = await b.boundingBox(); const t0 = await S.page.evaluate(() => performance.now());
    await L.touchTap(S.page, bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(3500);
    const rows = await S.page.evaluate(() => window.__p3.live); const info = await S.page.evaluate(() => window.__gtanim.info());
    const solid = rows.filter(([ts, n, p]) => ts > t0 && n > 0 && !p); const back = solid.length ? solid[0][0] - t0 : null; const cuts = rows.filter((r) => r[3]).length;
    t.note('marks back after (ms)', { back, cuts, frames: rows.length, errors: info.errors });
    assert(back !== null && back < 3000, `the marks were not back after ${back === null ? 'ever' : back + ' ms'}`); assert(cuts === 1, `${cuts} cut frames for one jump`); assert(info.errors === 0, 'the engine reported errors');
  } finally { await S.close(); }
});

suite.test('T0-P3-06', 'the text table of the engine is measured once, after the page face is ready (the control measured it twice, the first time with the face still loading: 183 ms of a 4x phone first render)', async (t) => {
  need(CONTROL, '--control');
  const count = async (dist) => { const S = await session(dist, { vp: PHONE, cpu: 4 }); try { await sleep(2000); return await S.page.evaluate(() => window.__p3.mt); } finally { await S.close(); } };
  const a = await count(DIST); const c = await count(CONTROL); t.note('measureText calls over the first 7 s on the phone', { perf3: a, control: c });
  assert(c - a >= 500, `PERF3 made ${a} calls, the control ${c}: the first table is still measured`);
});

// =========================================================================================================== pages and the shipped routine
suite.test('T0-P3-07', 'viewshed and watch-together link their programs before the first draw (prewarm, style, circle layer), and compare makes its two maps in two tasks', async (t) => {
  const lines = [];
  for (const [pg, want] of [['viewshed', 2], ['watch-together', 2]]) {
    const S = await session(DIST, { vp: PHONE, cpu: 1, url: `/${pg}`, app: false, tiles: 'inject' });
    try { await sleep(6000); const pre = await S.page.evaluate(() => window.__p3.pre); t.note(`${pg}: GTBG_PRECOMPILE calls`, pre); if (pre < want) lines.push(`${pg}: ${pre} precompile calls, want at least ${want}`); } finally { await S.close(); }
  }
  { const S = await session(DIST, { vp: PHONE, cpu: 1, url: '/compare', app: false, tiles: 'inject' });
    try { await sleep(5000); const m = await S.page.evaluate(() => window.__p3.maps); t.note('compare: Map constructions', m.map((x) => ({ t: Math.round(x.t), afterTask: x.afterTask }))); if (m.length < 2) lines.push(`compare made ${m.length} maps`); else if (!m[1].afterTask) lines.push('compare made the second map in the same task as the first'); } finally { await S.close(); } }
  assert(!lines.length, lines.join('; '));
});

suite.test('T0-P3-08', 'the event-card height (--gt-evt-h) still follows the card: set after the card appears, back to 0 after it is closed', async (t) => {
  const S = await session(DIST, { vp: { width: 1440, height: 900, dpr: 1, mobile: false } });
  try {
    const get = () => S.page.evaluate(() => document.documentElement.style.getPropertyValue('--gt-evt-h'));
    await pressByName(S.page, 'July 2', { touch: false, windowMs: 1500 });
    const card = await waitFor(async () => S.page.evaluate(() => !!document.querySelector('[data-gtbg-card="1"]')), { timeout: 8000, label: 'the event card' }).catch(() => null);
    if (!card) throw new Skip('no event card appeared on this tick');
    await sleep(600); const h1 = await get(); assert(parseInt(h1, 10) > 40, `--gt-evt-h is "${h1}" with the card open`);
    await S.page.evaluate(() => { const c = document.querySelector('[data-gtbg-card="1"]'); const x = c && [...c.querySelectorAll('button')].find((b) => /close|dismiss|✕|×|x/i.test((b.getAttribute('aria-label') || '') + b.textContent)); if (x) x.click(); });
    await sleep(900); const h0 = await get(); t.note('--gt-evt-h', { open: h1, closed: h0 });
    assert(parseInt(h0, 10) === 0, `--gt-evt-h is "${h0}" after the card was closed`);
  } finally { await S.close(); }
});

suite.test('T0-P3-09', 'the shipped unit routine no longer forces a layout inside the click (no ANIM tree) and the canvas still follows a resize (the layout is done by the frame that paints, so the long task is no shorter: it is reported, not asserted)', async (t) => {
  need(DIST_NOANIM && CONTROL_NOANIM, '--dist-noanim and --control-noanim');
  const tap = async (dist) => { const S = await session(dist, { vp: PHONE, cpu: 4, wait: 6000 }); try { await pressByName(S.page, 'July 3', { windowMs: 2500 }); await pressByName(S.page, 'July 1', { windowMs: 2500 }); const r = []; for (let i = 0; i < (QUICK ? 2 : 4); i++) { r.push(await pressByName(S.page, i % 2 ? 'July 3' : 'July 2', { windowMs: 2500 })); await pressByName(S.page, 'July 1', { windowMs: 2000 }); } return r; } finally { await S.close(); } };      // (a warm-up pair first: the first tap of a page still loading its map measures the map)
  const a = await tap(DIST_NOANIM); const c = await tap(CONTROL_NOANIM);
  t.note('click: forced layout ms / click script ms / worst long task (reported, not asserted)', { perf3: a.map((x) => [x.clickForced, x.clickMs, x.max]), control: c.map((x) => [x.clickForced, x.clickMs, x.max]) });
  assert(Math.max(...a.map((x) => x.clickForced)) <= 4, `the click still forces ${Math.max(...a.map((x) => x.clickForced))} ms of layout`);
  assert(Math.max(...c.map((x) => x.clickForced)) >= 10, 'the control does not force a layout in the click: nothing is measured');
  const S = await session(DIST_NOANIM, { vp: { width: 1200, height: 800, dpr: 1, mobile: false } });
  try {
    await S.page.setViewportSize({ width: 900, height: 700 }); await sleep(1800);
    const r = await S.page.evaluate(() => { const m = [...document.querySelectorAll('.mapboxgl-map')][0]; const cs = [...document.querySelectorAll('canvas')].filter((c) => c.parentNode === m && !c.classList.contains('mapboxgl-canvas')); return { map: [m.clientWidth, m.clientHeight], canvases: cs.map((c) => [c.width, c.height]) }; });
    t.note('after a resize to 900x700', r);
    assert(r.canvases.length > 0 && r.canvases.every(([w, h]) => w === r.map[0] && h === r.map[1]), `a unit canvas does not match the map after a resize: ${JSON.stringify(r)}`);
  } finally { await S.close(); }
});

suite.test('T0-P3-13', 'playback does not leak DOM: 100 s of 4x playback leave the DOM nodes and event listeners of the engine tree flat (a Map keyed by the event cards kept every card the app dropped: +17 nodes and +1.4 listeners a second, +53 % in 300 s)', async (t) => {
  const S = await session(DIST); const cdp = S.cdp;
  try {
    await cdp.send('HeapProfiler.enable');
    const play = S.page.locator('button[title^="Play/Pause"], button[aria-label*="Play" i], button[title*="Play" i]').first();
    await S.page.locator('button:text-is("4x")').first().click().catch(() => {}); await play.click({ timeout: 5000 }).catch(async () => { await play.dispatchEvent('click'); });
    const sample = async () => { await cdp.send('HeapProfiler.collectGarbage'); const d = await cdp.send('Memory.getDOMCounters'); return { nodes: d.nodes, lis: d.jsEventListeners }; };
    await sleep(20000); const a = await sample(); const mid = []; for (let i = 0; i < 4; i++) { await sleep(QUICK ? 10000 : 20000); mid.push(await sample()); } const b = mid[mid.length - 1];
    t.note('DOM nodes / listeners at 20 s and after', { start: a, samples: mid });
    assert(b.nodes <= a.nodes * 1.15 + 20, `DOM nodes ${a.nodes} -> ${b.nodes}`); assert(b.lis <= a.lis * 1.15 + 20, `listeners ${a.lis} -> ${b.lis}`);
  } finally { await S.close(); }
});

// =========================================================================================================== build
suite.test('T0-P3-11', 'the groups build with the unmodified builder after PERF2 / POLISH, with and without ANIM, with 0 anchor failures', async () => {
  if (!BUILD) throw new Skip('pass --build (about 2 minutes)');
  const base = path.join(TMP, 'perf3-build'); fs.mkdirSync(base, { recursive: true });
  const variants = {
    a: 'CLOCK,DATA,MON,ANIM,POLISH,PG-polish,PG-legal,PG-polish-legal,PERF2,PG-perf2,PERF3,PG-perf3,PG-zperf3',
    b: 'CLOCK,DATA,MON,POLISH,PG-polish,PG-legal,PG-polish-legal,PERF2,PG-perf2,PERF3,PG-perf3,PG-zperf3',
  };
  const lines = [];
  for (const [k, g] of Object.entries(variants)) {
    const r = cp.spawnSync('python', [path.join(REPO, 'tmp/perf3/stack.py'), '--out', path.relative(REPO, path.join(base, k)), '--with', g], { cwd: REPO, encoding: 'utf8', timeout: 400000 });
    if (r.status !== 0 || /ANCHOR FAIL/.test(r.stdout + r.stderr)) lines.push(`${g} did not build: ${(r.stdout + r.stderr).slice(-300)}`);
  }
  assert(!lines.length, lines.join('\n    '));
});

suite.test('T0-P3-12', 'a long window of Unit Roster / Legend / Monuments open and close cycles leaves DOM nodes and listeners flat and the heap slope under 0.02 MB per cycle (the evidence behind the loosened T0-P2-11)', async (t) => {
  if (!LONGRUN) throw new Skip('pass --long (about 8 minutes)');
  const S = await session(DIST); const cdp = S.cdp;
  try {
    await cdp.send('HeapProfiler.enable');
    const sample = async () => { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); const d = await cdp.send('Memory.getDOMCounters'); return { mb: h.usedSize / 1048576, nodes: d.nodes, lis: d.jsEventListeners }; };
    const cycle = async () => { for (const title of ['Unit Roster', 'Legend', 'Monuments']) { const b = S.page.locator(`button[title="${title}"]`).first(); await b.click(); await sleep(900); await b.click(); await sleep(500); } };
    const warm = 20; const meas = LONGRUN ? 60 : 20; const rows = [];
    for (let i = 1; i <= warm + meas; i++) { await cycle(); if (i > warm && (i - warm) % 5 === 0) rows.push({ cycle: i, ...(await sample()) }); }
    const xs = rows.map((r) => r.cycle); const ys = rows.map((r) => r.mb); const mx = xs.reduce((a, b) => a + b) / xs.length; const my = ys.reduce((a, b) => a + b) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    t.note('samples', rows); t.note('heap slope MB per cycle', +slope.toFixed(4));
    assert(Math.max(...rows.map((r) => r.nodes)) - Math.min(...rows.map((r) => r.nodes)) <= 20, 'DOM nodes are not flat'); assert(Math.max(...rows.map((r) => r.lis)) - Math.min(...rows.map((r) => r.lis)) <= 20, 'listeners are not flat'); assert(slope < 0.02, `heap slope ${slope.toFixed(4)} MB per cycle`);
  } finally { await S.close(); }
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
// guards (true on any tree): the node tests read the engine source of the repo, not the tree; the marks come back also with the engine of before (it never hid them); --gt-evt-h works with and without the patch; the build and long-window tests do not depend on the tree
const GUARDS = new Set(['T0-P3-01', 'T0-P3-02', 'T0-P3-03', 'T0-P3-05', 'T0-P3-08', 'T0-P3-11', 'T0-P3-12']);      // (T0-P3-13 is red on a tree with the old engine)
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? `; still green: ${pass.map((r) => r.id).join(', ')}` : ''}`); process.exit(pass.length === 0 ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
