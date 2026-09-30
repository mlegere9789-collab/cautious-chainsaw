// Self-test of tests/t0/lib.mjs: the harness other suites rely on must itself be proven (Referer injection for page AND worker requests,
// blocking, budget accounting, error collection, real mouse/touch input, viewport emulation, hit testing, screenshots, map camera probe).
// Uses at most 2 tokenless Mapbox requests (they answer 401; only the interception path matters) plus, for the camera probe, one real
// map load of release/R1a/dist when it exists (about 50 tile requests).
//
//   node tests/t0/lib_selftest.mjs [--no-map]
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO, PORT_BASE, REFERER, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout,
  emulateViewport, mouseDrag, wheel, touchTap, touchSwipe, touchPinch, hitTest, screenshot, mapView, tileBudget, Skip, VIEWPORTS, ALL_VIEWPORTS, TMP,
} from './lib.mjs';

const NO_MAP = process.argv.includes('--no-map');
const dist = path.join(REPO, 'release', 'R0', 'dist');
const srv = await createStaticServer({ root: dist, port: PORT_BASE });
const suite = createSuite('lib-selftest');
let S;

suite.test('LIB-01', 'session opens, page reachable, viewport matrix loaded', async (t) => {
  S = await openSession({ profile: 'lib', cdpPort: PORT_BASE + 5, tiles: 'inject' });
  await S.page.goto(`${srv.url}/robots.txt`);
  assertEq(S.page.url(), `${srv.url}/robots.txt`, 'url');
  t.note('chrome', S.chrome.version); t.note('viewports', ALL_VIEWPORTS.map((v) => v.id));
  assertEq(ALL_VIEWPORTS.length, 9, 'viewport count');
  assertEq(VIEWPORTS.landscape.map((v) => [v.width, v.height]), [[812, 375], [844, 390], [915, 412]], 'landscape set');
});

suite.test('LIB-02', 'Mapbox request from a dedicated WORKER gets the production Referer and is counted; block mode keeps it local', async (t) => {
  const url = 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9';
  const run = () => S.page.evaluate(async (u) => {
    const w = new Worker(URL.createObjectURL(new Blob([`self.onmessage = async (e) => { try { const r = await fetch(e.data); self.postMessage({ status: r.status }); } catch (err) { self.postMessage({ error: String(err) }); } };`], { type: 'text/javascript' })));
    return new Promise((res) => { w.onmessage = (m) => { w.terminate(); res(m.data); }; w.postMessage(u); });
  }, url);
  const before = { ...S.tileStats, referers: [...S.tileStats.referers], budget: tileBudget.used };
  const r1 = await run();
  await waitFor(() => S.tileStats.referers.size > 0, { timeout: 5000, label: 'referer seen on the wire' });
  const fromWorker = S.net.find(/^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/satellite-v9/).filter((e) => e.target === 'worker');
  t.note('worker fetch result', r1); t.note('worker-target entries', fromWorker.length); t.note('referers', [...S.tileStats.referers]);
  assert(fromWorker.length >= 1, 'the worker request was not seen on a worker target session');
  assertEq([...S.tileStats.referers], [REFERER], 'Referer on the wire');
  assertEq(S.tileStats.seen, before.seen + 1, 'intercepted request count');
  assertEq(tileBudget.used, before.budget + 1, 'run budget');
  S.setTiles('block');
  const r2 = await run();
  t.note('blocked fetch result', r2);
  assert(r2.error, 'a blocked request must fail');
  assertEq(S.tileStats.seen, before.seen + 1, 'blocked request must not count as seen');
  assert(S.tileStats.blocked >= 1, 'blocked counter');
  S.setTiles('inject');
});

suite.test('LIB-03', 'run-wide budget: once the cap is reached requests are failed, not sent', async (t) => {
  const saved = { ...tileBudget };
  tileBudget.cap = tileBudget.used;                               // exhaust the pool
  const r = await S.page.evaluate(() => fetch('https://api.mapbox.com/styles/v1/mapbox/satellite-v9').then((x) => x.status, (e) => String(e)));
  Object.assign(tileBudget, saved);                               // restore for the remaining tests
  t.note('result with exhausted budget', r);
  assert(typeof r === 'string' && /Failed to fetch/.test(r), 'request should have failed');
});

suite.test('LIB-04', 'collector: page exception, first-party console.error and (dedicated) worker exception are recorded; Mapbox noise is not', async (t) => {
  S.collector.clear();
  await S.page.evaluate(() => { console.error('first-party boom'); setTimeout(() => { throw new Error('uncaught boom'); }, 0); });
  await S.page.evaluate(() => { const w = new Worker(URL.createObjectURL(new Blob(['setTimeout(() => { throw new Error("worker boom"); }, 0);'], { type: 'text/javascript' }))); window.__w = w; });
  await waitFor(() => S.collector.firstParty.length >= 3, { timeout: 8000, label: 'three first-party errors' });
  const kinds = S.collector.firstParty.map((e) => e.kind).sort();
  t.note('recorded', S.collector.firstParty.map((e) => `${e.kind}: ${e.text.slice(0, 40)}`));
  assertEq(kinds, ['console.error', 'pageerror', 'pageerror'], 'error kinds (a dedicated worker exception is reported by the page as a pageerror)');
  const m = { u: 'https://api.mapbox.com/v4/x/1/1/1.vector.pbf' };
  assert(S.collector.tileNoise('Failed to load resource: the server responded with a status of 403 ()', m.u), 'mapbox 403 must be noise');
  assert(!S.collector.tileNoise('TypeError: x is not a function', ''), 'app errors must not be noise');
  S.collector.clear();
});

suite.test('LIB-05', 'real mouse input reaches the page (drag = down+move+up, wheel) and hitTest sees the top element', async (t) => {
  await S.page.evaluate(() => {
    document.body.innerHTML = '<div id="pad" style="position:fixed;left:100px;top:100px;width:300px;height:200px;background:#345"></div><button id="b" style="position:fixed;left:500px;top:100px;width:120px;height:50px">ok</button><button id="hidden" style="position:fixed;left:500px;top:300px;width:100px;height:60px">covered</button><div id="cover" style="position:fixed;left:500px;top:300px;width:100px;height:60px"></div>';
    window.__ev = { mousedown: 0, mouseup: 0, mousemove: 0, wheel: 0 };
    for (const k of Object.keys(window.__ev)) document.getElementById('pad').addEventListener(k, () => window.__ev[k]++);
  });
  await mouseDrag(S.page, [150, 150], [300, 250], { steps: 8 });
  await wheel(S.page, 200, 200, -120);
  const ev = await S.page.evaluate(() => window.__ev);
  t.note('events', ev);
  assert(ev.mousedown === 1 && ev.mouseup === 1 && ev.mousemove >= 8 && ev.wheel === 1, `mouse events: ${JSON.stringify(ev)}`);
  const ok = await hitTest(S.page, '#b'); const covered = await hitTest(S.page, '#hidden');
  t.note('hit tests', { ok, covered });
  assert(ok.hit && ok.w === 120 && ok.h === 50, 'button should be hit-testable');
  assert(covered.hit === false, 'covered button must not be hit-testable');
});

suite.test('LIB-06', 'viewport emulation + real touch input (tap, swipe, pinch) through CDP', async (t) => {
  const vp = VIEWPORTS.portrait[0];
  await S.page.goto(`${srv.url}/privacy.html`);                   // a page with a viewport meta (mobile emulation honours it)
  await emulateViewport(S.page, vp);
  await S.page.evaluate(() => {
    document.body.innerHTML = '<div id="pad" style="position:fixed;inset:0;touch-action:none"></div>';
    window.__t = { start: 0, move: 0, end: 0, multi: 0 };
    const pad = document.getElementById('pad');
    pad.addEventListener('touchstart', (e) => { window.__t.start++; if (e.touches.length > 1) window.__t.multi++; });
    pad.addEventListener('touchmove', () => window.__t.move++);
    pad.addEventListener('touchend', () => window.__t.end++);
  });
  const dims = await S.page.evaluate(() => ({ w: innerWidth, h: innerHeight, coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio, touch: navigator.maxTouchPoints }));
  t.note('emulated', dims);
  assertEq([dims.w, dims.h, dims.coarse, dims.touch > 0], [375, 812, true, true], 'emulated viewport / pointer');
  await touchTap(S.page, 100, 100); await touchSwipe(S.page, [100, 300], [100, 500]); await touchPinch(S.page, [187, 400], 60, 160);
  const tt = await S.page.evaluate(() => window.__t);
  t.note('touch events', tt);
  assert(tt.start >= 3 && tt.move >= 10 && tt.end >= 3 && tt.multi >= 1, `touch events: ${JSON.stringify(tt)}`);
  await emulateViewport(S.page, VIEWPORTS.portrait[5]);
  assertEq(await S.page.evaluate(() => [innerWidth, matchMedia('(pointer: coarse)').matches]), [1440, false], 'back to desktop');
});

suite.test('LIB-07', 'screenshot helper writes a PNG', async () => {
  const f = await screenshot(S.page, 'lib-selftest', path.join(TMP, 'shots'));
  assert(fs.existsSync(f) && fs.statSync(f).size > 500, 'png missing or empty');
  assertEq(fs.readFileSync(f).subarray(1, 4).toString(), 'PNG', 'png magic');
});

suite.test('LIB-08', 'app helpers on the R1a build: chooseLayout, mapView, real drag/wheel move the camera (and do not on R0)', async (t) => {
  if (NO_MAP) throw new Skip('--no-map');
  const r1a = path.join(REPO, 'release', 'R1a', 'dist');
  if (!fs.existsSync(r1a)) throw new Skip('release/R1a/dist not built');
  const run = async (dir, port) => {
    srv.setRoot(dir);
    const s = await openSession({ profile: 'lib-map', cdpPort: PORT_BASE + 6, tiles: 'inject' });
    try {
      await s.page.goto(`${srv.url}/`, { waitUntil: 'load' });
      await waitForApp(s.page, 40000);
      const lay = await chooseLayout(s.page, 'desktop');
      await sleep(2500);
      const a = await mapView(s.page);
      await mouseDrag(s.page, [700, 450], [500, 350]); await sleep(1000);
      const b = await mapView(s.page);
      await wheel(s.page, 700, 450, -400); await sleep(1200);
      const c = await mapView(s.page);
      return { lay, a, b, c, errors: s.collector.firstParty.length };
    } finally { await s.close(); }
  };
  const on = await run(r1a);
  const off = await run(dist);
  t.note('R1a', { layout: on.lay, dragMoved: JSON.stringify(on.a.center) !== JSON.stringify(on.b.center), zoomChanged: on.c.zoom !== on.b.zoom });
  t.note('R0', { dragMoved: JSON.stringify(off.a.center) !== JSON.stringify(off.b.center), zoomChanged: off.c.zoom !== off.b.zoom });
  assert(on.a && off.a, 'map camera not found through the fiber tree');
  assert(JSON.stringify(on.a.center) !== JSON.stringify(on.b.center) && on.c.zoom !== on.b.zoom, 'R1a: drag/wheel must move the camera');
  assert(JSON.stringify(off.a.center) === JSON.stringify(off.b.center) && off.c.zoom === off.b.zoom, 'R0 keeps the legacy overlay: the camera must NOT move (proves the probe can tell)');
  assertEq([on.errors, off.errors], [0, 0], 'first-party errors');
});

let summary;
try {
  summary = await suite.run({ outFile: path.join(REPO, 'release', 'test-lib.json'), extra: () => ({ mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap}`);
} finally {
  if (S) await S.close();
  await srv.close();
}
process.exit(summary.failed ? 1 : 0);
