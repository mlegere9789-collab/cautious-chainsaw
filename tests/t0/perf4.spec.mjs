// T0-P4 suite: group PERF4 + PG-zperf4 (tools/t0/PERF4-README.md): the phone blocking time of the app route.
//
//   node tests/t0/perf4.spec.mjs --dist tmp/r1e/r1e/dist --control release/R1d/dist
//   node tests/t0/perf4.spec.mjs --dist <tree> --filter 'P4-0[1-3]'      test-id subset
//   node tests/t0/perf4.spec.mjs --dist <tree> --build                   also builds train R1e with the registered builder (T0-P4-09, about 1.5 minutes)
//   node tests/t0/perf4.spec.mjs --dist <R1d tree> --expect-red          red-first proof: the browser tests must FAIL on the tree without PERF4 (exit 0 when they do)
//   --quick  fewer repetitions
//
// Phone shell = 390 x 844, touch, CPU 4x like the acceptance harness; blocking time as the harness counts it (long tasks after the first contentful paint, until 3 s after load).
// The machine is shared with other work: timing tests compare the tree with the control in INTERLEAVED cold loads and assert the ordering and loose absolute bounds; the raw numbers are reported with t.note.
process.env.T0_AGENT ||= 'perf4';
process.env.T0_PORT_BASE ||= '9700';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitForApp, emulateViewport, assert, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const tree = (name, dflt = null) => { const v = opt(name, dflt); return v ? path.resolve(REPO, v) : null; };
const DIST = tree('dist', 'tmp/r1e/r1e/dist');
const CONTROL = tree('control', 'release/R1d/dist');
const FILTER = opt('filter', null);
const QUICK = !!opt('quick', false);
const BUILD = !!opt('build', false);
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'perf4.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + k * 2, cdp: PORT_BASE + k * 2 + 1 }; };
const PHONE = { width: 390, height: 844, dpr: 2, mobile: true };
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };

const OBSERVE = `(() => {
  if (window.__p4) return;
  const s = window.__p4 = { fcp: null, lt: [], mt: [], raf: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') s.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { const m = CanvasRenderingContext2D.prototype.measureText; CanvasRenderingContext2D.prototype.measureText = function () { const t0 = performance.now(); const r = m.apply(this, arguments); s.mt.push({ at: t0, d: performance.now() - t0 }); return r; }; } catch (e) {}
})();`;

async function session(dist, { vp = DESKTOP, cpu = 1, url = '/', app = true, wait = 2500, tiles = 'inject', chooseLayout = true, init = [] } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `p4-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded: true, initScripts: [OBSERVE, ...init] });
  const page = S.page; const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => warnings.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  await emulateViewport(page, vp);
  const cdp = await L.cdpFor(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(`${srv.url}${url}`, { waitUntil: 'load' });
  if (app) { await waitForApp(page, 60000); if (chooseLayout && !vp.mobile) await L.chooseLayout(page, 'desktop').catch(() => {}); }
  await sleep(wait);
  return { S, srv, page, cdp, warnings, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}
/** blocking time as the harness counts it: long tasks from the first contentful paint until 3 s after load */
const tbtOf = (page) => page.evaluate(() => {
  const p = window.__p4; const nav = performance.getEntriesByType('navigation')[0]; const from = p.fcp ?? 0, to = (nav.loadEventEnd || performance.now()) + 3000;
  const win = p.lt.filter((l) => l.s >= from && l.s <= to);
  return { tbt: Math.round(win.reduce((a, l) => a + Math.max(0, l.d - 50), 0)), tasks: win.map((l) => Math.round(l.d)), max: win.length ? Math.round(Math.max(...win.map((l) => l.d))) : 0, fcp: Math.round(from) };
});
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const suite = createSuite('perf4');

suite.test('T0-P4-01', 'the first paint still comes first: no hold of the page, the entry module is imported after the first contentful paint (R0 / perf-cwv-02), no modulepreload, and the frame governor and the early glyph warm are in the page', async (t) => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert(!/gtbg-hold/.test(html), 'index.html holds its first paint');
  assert(!/rel=["']modulepreload/.test(html), 'index.html has a modulepreload');
  assert(/PERF4 frame governor/.test(html) && /PERF4: the same work as warm\(\)/.test(html), 'the governor / the early warm are not in index.html');
  const S = await session(DIST, { vp: PHONE, cpu: 4, wait: 3500, app: false });
  try {
    const r = await S.page.evaluate(() => { const e = performance.getEntriesByType('resource').find((x) => /\/assets\/index-[0-9a-f]+\.js/.test(x.name)); return { fcp: window.__p4.fcp, entry: e ? e.startTime : null }; });
    t.note('phone 4x: first contentful paint / start of the entry module (ms)', r);
    assert(r.fcp != null && r.entry != null && r.entry >= r.fcp, `the entry module started (${r.entry}) before the first contentful paint (${r.fcp})`);
  } finally { await S.close(); }
});

suite.test('T0-P4-02', 'the map library is evaluated in several tasks: no task of the app start-up on the phone at 4x is longer than 400 ms and the first one (the library) is shorter than the 105+ ms single call of before (interleaved with the control)', async (t) => {
  const n = QUICK ? 2 : 3; const a = [], c = [];
  for (let i = 0; i < n; i++) for (const [dist, into] of [[DIST, a], [CONTROL, c]]) { const S = await session(dist, { vp: PHONE, cpu: 4, wait: 3600 }); try { into.push(await tbtOf(S.page)); } finally { await S.close(); } }
  t.note('tree: blocking time / longest task / tasks', a); t.note('control', c);
  assert(Math.max(...a.map((x) => x.max)) <= 400, `a task of ${Math.max(...a.map((x) => x.max))} ms`);
  assert(median(a.map((x) => x.tbt)) < median(c.map((x) => x.tbt)), 'the tree is not faster than the control');
});

suite.test('T0-P4-03', 'phone 4x, cold: the blocking time of / is at most 60 percent of the control (interleaved medians; R1d: 425-575 ms, R1e: 105-225 ms on a shared machine) and each cold load stays under 400 ms', async (t) => {
  if (!CONTROL) throw new Skip('no control');
  const n = QUICK ? 3 : 5; const a = [], c = [];
  for (let i = 0; i < n; i++) for (const [dist, into] of [[DIST, a], [CONTROL, c]]) { const S = await session(dist, { vp: PHONE, cpu: 4, wait: 3600 }); try { into.push(await tbtOf(S.page)); } finally { await S.close(); } }
  const ma = median(a.map((x) => x.tbt)), mc = median(c.map((x) => x.tbt));
  t.note('tree TBT', a.map((x) => x.tbt)); t.note('control TBT', c.map((x) => x.tbt)); t.note('medians (tree, control)', [ma, mc]);
  assert(ma <= 0.6 * mc, `median ${ma} ms is more than 60 percent of the control's ${mc} ms`);
  assert(Math.max(...a.map((x) => x.tbt)) < 400, `a cold load measured ${Math.max(...a.map((x) => x.tbt))} ms`);
});

suite.test('T0-P4-04', 'the map is complete after the sliced start-up: all product layers exist with the visibility BASE1863 gives them, both maps have performanceMetricsCollection off, the engine draws (phone and desktop), no console error or warning', async (t) => {
  for (const [name, vp, cpu] of [['phone', PHONE, 1], ['desktop', DESKTOP, 1]]) {
    const S = await session(DIST, { vp, cpu, wait: 4500 });
    try {
      await L.mapView(S.page);
      const r2 = await S.page.evaluate(() => { const m = window.__t0map; const ids = ['b1863-ground', 'b1863-wide', 'b1863-detail', 'roads-1863-line', 'roads-1863-label', 'rivers-line', 'rivers-label', 'breastworks-line', 'farms-outline', 'farms-label']; const layers = {}; for (const id of ids) layers[id] = m.getLayer(id) ? (m.getLayoutProperty(id, 'visibility') || 'visible') : 'MISSING'; return { layers, pm: m._performanceMetricsCollection, anim: window.__gtanim ? { state: window.__gtanim.state(), frames: window.__gtanim.S.frames, fonts: window.__gtanim.S.fontsReady } : null }; });
      t.note(name, r2);
      const missing = Object.entries(r2.layers).filter(([, v]) => v === 'MISSING').map(([k]) => k);
      assert(!missing.length, `${name}: layers missing: ${missing.join(', ')}`);
      assert(r2.layers['roads-1863-line'] === 'none' && r2.layers['rivers-line'] === 'none' && r2.layers['farms-outline'] === 'none' && r2.layers['farms-label'] === 'none', `${name}: refine() did not hide the lines BASE1863 hides`);
      assert(r2.layers['roads-1863-label'] === 'visible' && r2.layers['rivers-label'] === 'visible' && r2.layers['breastworks-line'] === 'visible', `${name}: labels / breastworks not visible`);
      assert(r2.pm === false, `${name}: performanceMetricsCollection is ${r2.pm}`);
      assert(r2.anim && r2.anim.state === 1 && r2.anim.frames > 5, `${name}: the engine does not draw: ${JSON.stringify(r2.anim)}`);
      assert(!S.warnings.length, `${name}: console: ${S.warnings.slice(0, 4).join(' | ')}`);
    } finally { await S.close(); }
  }
});

suite.test('T0-P4-05', 'the frame governor: callbacks keep their order, cancelAnimationFrame cancels a deferred callback, a callback is never lost, and after 6 s the page uses the browser function', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, app: false, wait: 200 });
  try {
    const r = await S.page.evaluate(() => new Promise((resolve) => {
      const out = { order: [], cancelledRan: false, ids: [], busyMs: 0 };
      const busy = (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { /* spin */ } };
      requestAnimationFrame(() => { out.order.push('a'); busy(30); });
      const idB = requestAnimationFrame(() => { out.order.push('b'); });
      const idC = requestAnimationFrame(() => { out.order.push('c'); });
      out.ids = [idB, idC]; cancelAnimationFrame(idB);
      setTimeout(() => { out.after = performance.now() > 6000 ? 'late' : 'early'; resolve(out); }, 600);
    }));
    t.note('order / ids', r);
    assert(r.order.join('') === 'ac', `callbacks ran in order ${r.order.join('')} (want ac: b was cancelled, c waited a frame)`);
    assert(typeof r.ids[0] === 'number' && r.ids[0] !== r.ids[1], 'ids are not distinct numbers');
    await S.page.waitForFunction(() => performance.now() > 6500, null, { timeout: 15000 });
    const late = await S.page.evaluate(() => new Promise((res) => { const id = requestAnimationFrame(() => res('ran')); setTimeout(() => res(typeof id === 'number' && id < 1e9 ? 'native-id' : 'wrapped-id'), 300); }));
    assert(late === 'ran' || late === 'native-id', `after 6 s the wrapper still hands out its own ids (${late})`);
  } finally { await S.close(); }
});

suite.test('T0-P4-06', 'the glyph warm runs in slices while the page boots: every measureText step is its own task (26 steps), none longer than 100 ms at 4x CPU, all of them done within 2.5 s', async (t) => {
  const S = await session(DIST, { vp: PHONE, cpu: 4, app: false, wait: 2500 });
  try {
    const r = await S.page.evaluate(() => ({ n: window.__p4.mt.length, max: Math.round(Math.max(0, ...window.__p4.mt.map((x) => x.d))), lastAt: Math.round(Math.max(0, ...window.__p4.mt.map((x) => x.at))) }));
    t.note('measureText calls: count / longest (ms) / last at (ms)', r);
    assert(r.n >= 26, `${r.n} measureText calls (the warm has 26 steps)`);
    assert(r.max <= 100, `a warm step took ${r.max} ms`);
    assert(r.lastAt < 2500, `the warm ended at ${r.lastAt} ms`);
  } finally { await S.close(); }
});

suite.test('T0-P4-07', 'days 2 and 3 arrive on the phone by themselves and a jump to day 3 straight after the load works (the idle request does not lose the day)', async (t) => {
  const S = await session(DIST, { vp: PHONE, cpu: 1, wait: 600 });
  try {
    const have = () => S.page.evaluate(() => { const st = window.__gtanim && window.__gtanim.S.store ? window.__gtanim.S.store.getState() : null; return st ? [...st.loadedDays] : null; });
    const early = await have();
    const b = S.page.getByRole('button', { name: 'July 3', exact: true }).first();
    await b.waitFor({ timeout: 10000 }); await b.click();
    await L.waitFor(async () => { const d = await have(); return d && d.includes(3); }, { timeout: 15000, label: 'day 3 loaded after the jump' });
    t.note('loaded days: 0.6 s after load / after the jump', [early, await have()]);
    await sleep(3500);
    const d = await have(); assert(d.includes(1) && d.includes(2) && d.includes(3), `days ${d} loaded`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 3).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P4-08', 'the Virtual Walkthrough and the Monuments layer are untouched by the library change: the main map has performance metrics off and the Monuments button draws', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, cpu: 1, wait: 3000 });
  try {
    await L.mapView(S.page);
    const r = await S.page.evaluate(() => ({ main: window.__t0map && window.__t0map._performanceMetricsCollection, mon: !!document.querySelector('button[title="Monuments"]'), mb: typeof window.mapboxgl }));
    t.note('main map / monuments button', r);
    assert(r.main === false && r.mon, `main ${r.main} monuments button ${r.mon}`);
    const b = S.page.locator('button[title="Monuments"]').first(); await b.click(); await sleep(1500);
    const on = await S.page.evaluate(() => !!document.querySelector('[class*="gtmon"], [data-gtmon]'));
    assert(on, 'the Monuments layer did not draw anything after the click');
  } finally { await S.close(); }
});

suite.test('T0-P4-10', 'the road names are placed in every load: with the product layers added in timer slices, refine() of BASE1863 must not change a layer of a source that is already loading (Mapbox then keeps no symbol bucket and the 10 road names never appear): roads-1863-label has rendered features in each of 6 cold phone loads', async (t) => {
  const counts = [];
  for (let i = 0; i < (QUICK ? 3 : 6); i++) {
    const S = await session(DIST, { vp: PHONE, cpu: 1, wait: 3500 });
    try {
      await L.mapView(S.page);
      let n = 0; const until = Date.now() + 12000;
      do { n = await S.page.evaluate(() => { const m = window.__t0map; try { return m.queryRenderedFeatures({ layers: ['roads-1863-label'] }).length; } catch (e) { return -1; } }); if (n > 0) break; await sleep(500); } while (Date.now() < until);
      counts.push(n);
    } finally { await S.close(); }
  }
  t.note('rendered road-name features per load (3.5 s + up to 12 s wait)', counts);
  assert(counts.every((n) => n > 0), `the road names were not placed in ${counts.filter((n) => !(n > 0)).length} of ${counts.length} loads: ${counts.join(', ')}`);
});

suite.test('T0-P4-11', 'the first day jump on the phone is not slower than the next one: the card style of the animation layer is rendered once at idle (event time of the first tap on July 2, no CPU throttle like the INP of the harness; before: 144-232 ms, the same tap with the card already rendered 64-96 ms), and the warm-up element is gone again', async (t) => {
  const ms = []; const residue = [];
  for (let i = 0; i < (QUICK ? 3 : 5); i++) {
    const S = await session(DIST, { vp: PHONE, cpu: 1, wait: 3500 });
    try {
      await S.page.evaluate(() => { window.__ev = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push(e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: false }); });
      const btn = S.page.getByRole('button', { name: 'July 2', exact: true }).first();
      const box = await btn.boundingBox();
      await L.touchTap(S.page, box.x + box.width / 2, box.y + box.height / 2);
      await sleep(900);
      ms.push(Math.max(0, ...(await S.page.evaluate(() => window.__ev))));
      residue.push(await S.page.evaluate(() => [...document.querySelectorAll('[data-gta="warm"]')].filter((e) => getComputedStyle(e).visibility !== 'hidden').length));
    } finally { await S.close(); }
  }
  const med = [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)];
  t.note('event time of the first tap on July 2 per fresh load (ms)', ms);
  assert(residue.every((n) => n === 0), `the warm-up element is still visible after the tap in ${residue.filter((n) => n).length} loads (it is shown for 400 ms at 3.3 s and hidden again)`);
  assert(med <= 136, `median event time of the first day jump ${med} ms > 136 ms (${ms.join(', ')}); the first card of the animation layer is rendered for the first time inside the tap`);
});

suite.test('T0-P4-12', 'the phone shell is not changed by the card warm-up between 2.2 s and 8 s after load: the warm-up element is in the page from the start and is shown by a Web Animation, not added and removed at 3.3 s (R9; before: a DOM change in the shell 300-400 ms after load + 3 s, which the input matrix counted as the response of a tap on a link that opens a new tab, 340-370 ms)', async (t) => {
  const counts = [];
  for (let i = 0; i < (QUICK ? 2 : 3); i++) {
    const S = await session(DIST, { vp: PHONE, cpu: 1, wait: 2200 });
    try {
      await S.page.evaluate(() => { window.__mu = []; new MutationObserver((l) => { for (const m of l) { const inShell = m.target.closest && m.target.closest('.gtbg-m-root'); const warm = [...m.addedNodes, ...m.removedNodes].some((n) => n.getAttribute && n.getAttribute('data-gta') === 'warm') || (m.target.getAttribute && m.target.getAttribute('data-gta') === 'warm'); if (inShell || warm) window.__mu.push(`${m.type} ${m.target.nodeName}${m.target.className && typeof m.target.className === 'string' ? '.' + m.target.className.slice(0, 30) : ''} ${m.attributeName || ''}`); } }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); });
      await sleep(5800);
      counts.push(await S.page.evaluate(() => window.__mu.slice(0, 6)));
      assert(await S.page.evaluate(() => !!document.querySelector('[data-gta="warm"]')), 'the warm-up element is not in the page (the card style is not warmed)');
    } finally { await S.close(); }
  }
  t.note('DOM changes in the shell 2.2-8 s after load per fresh load', counts);
  assert(counts.every((c) => c.length === 0), `DOM changes in the phone shell without user input between 2.2 s and 8 s after load: ${JSON.stringify(counts)}`);
});

suite.test('T0-P4-13', '/immersive: the AudioContext is built before the click on "Enable Sound & Start", so the click is not one long task however long the browser takes to start the audio service (R9; the constructor is made to take 250 ms here; before: the click was one task of 250+ ms)', async (t) => {
  const SLOW = `(() => { const AC = window.AudioContext; window.__acBuilt = []; if (!AC) return; window.AudioContext = function (...a) { const t = performance.now(); while (performance.now() - t < 250) {} const c = new AC(...a); window.__acBuilt.push(performance.now()); return c; }; window.AudioContext.prototype = AC.prototype; })();`;
  for (const [name, vp, touch] of [['desktop', DESKTOP, false], ['phone', PHONE, true]]) {
    const S = await session(DIST, { vp, cpu: 1, url: '/immersive', app: false, wait: 3000, init: [SLOW] });
    try {
      const built = await S.page.evaluate(() => window.__acBuilt.length);
      assert(built === 1, `${name}: the AudioContext was built ${built} time(s) before the click (expected 1)`);
      const box = await S.page.locator('#enable-sound').boundingBox();
      const t0 = await S.page.evaluate(() => performance.now());
      if (touch) await L.touchTap(S.page, box.x + box.width / 2, box.y + box.height / 2); else await S.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(900);
      const r = await S.page.evaluate((t0) => ({ lt: window.__p4.lt.filter((l) => l.s >= t0 - 5).map((l) => Math.round(l.d)), built: window.__acBuilt.length, gate: getComputedStyle(document.getElementById('sound-gate')).display, play: !document.getElementById('play-btn').disabled }), t0);
      t.note(`${name}: long tasks after the click (ms)`, r.lt);
      assert(r.built === 1, `${name}: a second AudioContext was built inside the click`);
      assert(r.lt.every((d) => d <= 50), `${name}: long task(s) ${JSON.stringify(r.lt)} ms after the click on Enable Sound & Start (limit 50)`);
      assert(r.gate === 'none' && r.play, `${name}: the sound gate is still shown or Play is disabled after the click`);
    } finally { await S.close(); }
  }
});

suite.test('T0-P4-09', 'train R1e builds with the unmodified builder, 0 anchor failures, and the registered copies are in step with patches-next', async () => {
  if (!BUILD) throw new Skip('pass --build (about 1.5 minutes)');
  const out = path.join(TMP, 'perf4-build');
  const sync = cp.spawnSync('python', [path.join(REPO, 'tools/t0/r1e_sync.py'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert(sync.status === 0, `r1e_sync --check: ${sync.stdout}${sync.stderr}`);
  const r = cp.spawnSync('python', [path.join(REPO, 'tools/t0/build.py'), '--train', 'R1e', '--out', path.relative(REPO, out)], { cwd: REPO, encoding: 'utf8', timeout: 400000 });
  assert(r.status === 0 && /OK: R1e=/.test(r.stdout), `build failed: ${(r.stdout + r.stderr).slice(-400)}`);
  const anchors = JSON.parse(fs.readFileSync(path.join(out, 'anchors.json'), 'utf8'));
  const bad = anchors.patches.filter((p) => String(p.found) !== String(p.expect));
  assert(!bad.length, `anchor failures: ${bad.map((p) => p.id).join(', ')}`);
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
// guards (true on any tree): P4-01 is about what the page must NOT do, P4-08 about the Walkthrough/Monuments, P4-09 about the build
const GUARDS = new Set(['T0-P4-01', 'T0-P4-08', 'T0-P4-09', 'T0-P4-07', 'T0-P4-10']);
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? ' (still green: ' + pass.map((r) => r.id).join(', ') + ')' : ''}`); process.exit(pass.length ? 1 : 0); }
process.exit(summary.failed ? 1 : 0);
