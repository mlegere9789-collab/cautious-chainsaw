// T0-P5 suite: group PERF5 + PG-zperf5 (tools/t0/PERF5-README.md): the first frame of the Virtual Walkthrough and of the Monuments layer (desktop), the heat layer of /ground-remembers (phone).
//
//   node tests/t0/perf5.spec.mjs --dist tmp/r1f-vw/r1f/dist --control release/R1e/dist
//   node tests/t0/perf5.spec.mjs --dist <tree> --filter 'P5-0[1-4]'      test-id subset
//   node tests/t0/perf5.spec.mjs --dist <tree> --build                   also builds train R1f with the registered builder (T0-P5-09, about 1.5 minutes)
//   node tests/t0/perf5.spec.mjs --dist <R1e tree> --expect-red          red-first proof: the browser tests must FAIL on the tree without PERF5 (exit 0 when they do)
//   --quick  fewer repetitions
//
// The long-task tests use a SLOW SHADER LINK: an init script makes the first read of a program's link status busy-wait 15 ms when the GPU process has not finished the program yet (what a loaded or slow
// driver does by itself; on the machine of the round a link took 5 to 10 ms and the first click on the Walkthrough gave 29 to 45 ms tasks, on the harness machine 53 to 70 ms). Tasks are the renderer's
// RunTask events of a trace of the 450 ms after the click, exactly the window acceptance check 4 judges with its long-task observer.
process.env.T0_AGENT ||= 'perf5';
process.env.T0_PORT_BASE ||= '9800';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const cp = await import('node:child_process');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitForApp, emulateViewport, assert, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const tree = (name, dflt = null) => { const v = opt(name, dflt); return v ? path.resolve(REPO, v) : null; };
const DIST = tree('dist', 'tmp/r1f-vw/r1f/dist');
const CONTROL = tree('control', 'release/R1e/dist');
const FILTER = opt('filter', null);
const QUICK = !!opt('quick', false);
const BUILD = !!opt('build', false);
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'perf5.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + k * 2, cdp: PORT_BASE + k * 2 + 1 }; };
const PHONE = { width: 390, height: 844, dpr: 2, mobile: true };
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };

const SLOWLINK = (ms) => `(() => { const EXTRA = ${ms}; const seen = new WeakSet(); for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) { const o = C.prototype.getProgramParameter; C.prototype.getProgramParameter = function (p, k) { if (k === this.LINK_STATUS && !seen.has(p)) { seen.add(p); let done = false; try { done = !!o.call(this, p, 0x91B1); } catch (e) {} if (!done) { const t = performance.now(); while (performance.now() - t < EXTRA) { /* spin */ } } } return o.call(this, p, k); }; } })();`;
// every map the page makes (for /ground-remembers, where the map is a local of the page's handler); addLayer is recorded with 'was it called inside the load event'
const MAPS = `(() => { let inLoad = false; Object.defineProperty(window, 'mapboxgl', { configurable: true, set(v) { const M = v.Map; v.Map = class extends M { constructor(o) { super(o); (window.__maps = window.__maps || []).push(this); } fire(type, ...r) { if ((typeof type === 'string' ? type : type && type.type) === 'load') { inLoad = true; try { return super.fire(type, ...r); } finally { inLoad = false; } } return super.fire(type, ...r); } addLayer(l, b) { (window.__addLog = window.__addLog || []).push({ id: l && l.id, inLoad, t: performance.now() }); return super.addLayer(l, b); } }; Object.defineProperty(window, 'mapboxgl', { value: v, writable: true, configurable: true }); }, get() { return undefined; } }); })();`;
const FIBER = `(() => { const root = document.getElementById('root'); if (!root) return []; const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$')); if (!key) return []; const host = root[key]; const cur = host && host.stateNode && host.stateNode.current ? host.stateNode.current : host; const stack = [cur]; let n = 0; const out = []; while (stack.length && n++ < 400000) { const f = stack.pop(); if (!f) continue; for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) { const v = h.memoizedState; if (v && typeof v === 'object' && v.current && typeof v.current.getCenter === 'function' && typeof v.current.getZoom === 'function' && !out.includes(v.current)) out.push(v.current); } if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child); } return out; })()`;
const MAPINFO = (kind) => `(() => { const maps = ${FIBER}; const wt = maps.find((m) => { try { return !!m.getSource('wt-stops'); } catch (e) { return false; } }); const main = maps.find((m) => { try { return !m.getSource('wt-stops'); } catch (e) { return false; } });
  const q = (m, l) => { try { return m && m.getLayer(l) ? m.queryRenderedFeatures({ layers: [l] }).length : -1; } catch (e) { return -2; } };
  const zr = (m, l) => { try { const y = m && m.getLayer(l); return y ? [y.minzoom, y.maxzoom] : null; } catch (e) { return null; } };
  const vis = (m, l) => { try { return m && m.getLayer(l) ? (m.getLayoutProperty(l, 'visibility') || 'visible') : null; } catch (e) { return null; } };
  const order = (m, pre) => { try { return m.getStyle().layers.map((y) => y.id).filter((i) => i.startsWith(pre)); } catch (e) { return null; } };
  return ${kind === 'wt'} ? { has: !!wt, order: wt && order(wt, 'wt-'), num: q(wt, 'wt-stops-num'), circle: q(wt, 'wt-stops-circle'), dots: q(wt, 'wt-mons-dots'), range: wt && ['wt-stops-circle', 'wt-stops-num', 'wt-mons-dots'].map((l) => zr(wt, l)), loaded: wt && wt.loaded() }
    : { has: !!main, order: main && order(main, 'gtmon-'), stars: q(main, 'gtmon-stars'), dots: q(main, 'gtmon-dots'), range: main && ['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars'].map((l) => zr(main, l)), vis: main && ['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars'].map((l) => vis(main, l)) }; })()`;

async function session(dist, { vp = DESKTOP, cpu = 1, url = '/', app = true, wait = 2500, tiles = 'inject', chooseLayout = true, init = [] } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `p5-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles, onboarded: true, initScripts: init });
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
async function traceWindow(cdp, action, ms = 450) {
  await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel'] } });
  await action(); await sleep(ms);
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res)); await cdp.send('Tracing.end'); const pp = await done;
  let out = ''; for (;;) { const r = await cdp.send('IO.read', { handle: pp.stream, size: 1 << 20 }); out += r.data; if (r.eof) break; } await cdp.send('IO.close', { handle: pp.stream });
  const ev = JSON.parse(out).traceEvents; const mains = new Set();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain') mains.add(e.pid + ':' + e.tid);
  const tasks = ev.filter((e) => e.ph === 'X' && e.name === 'RunTask' && e.dur && mains.has(e.pid + ':' + e.tid)).map((e) => e.dur / 1000);
  return { max: tasks.length ? Math.max(...tasks) : 0, over8: tasks.filter((d) => d >= 8).length };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const clickWalkthrough = (page) => page.getByRole('button', { name: /Virtual Walkthrough/ }).first().click();
const clickMonuments = (page) => page.locator('button[title="Monuments"]').first().click();
const suite = createSuite('perf5');

suite.test('T0-P5-01', 'Virtual Walkthrough, settled: the map has its three layers in the original order with the default zoom range (0 to 24) and shows the 16 stops with their numbers and the monument dots, no console error', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, cpu: 1, wait: 3000 });
  try {
    await clickWalkthrough(S.page);
    let r = null; const until = Date.now() + 25000;
    do { await sleep(500); r = await S.page.evaluate(MAPINFO('wt')); } while (Date.now() < until && !(r.has && r.circle >= 12 && r.num > 0 && r.dots > 0));
    t.note('Walkthrough map', r);
    assert(r.has, 'no Walkthrough map');
    assert(JSON.stringify(r.order) === JSON.stringify(['wt-stops-circle', 'wt-stops-num', 'wt-mons-dots']), `layer order ${JSON.stringify(r.order)}`);
    assert(JSON.stringify(r.range) === JSON.stringify([[0, 24], [0, 24], [0, 24]]), `zoom ranges ${JSON.stringify(r.range)} (the original layers have none: 0 to 24)`);
    assert(r.circle >= 12 && r.num >= 12 && r.dots > 0, `drawn: circles ${r.circle}, numbers ${r.num}, dots ${r.dots}`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 4).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P5-02', 'Virtual Walkthrough: the overlay is painted before its map exists, the stops (circle + number) appear in one frame and the monument dots in a later one, and Back after a quick open leaves no map behind', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, cpu: 1, wait: 3000 });
  try {
    await S.page.evaluate(`(() => { const FIBER = () => ${FIBER}; const log = window.__wtlog = []; const t0 = performance.now(); const tick = () => { let wt = null; try { wt = FIBER().find((m) => { try { return !!m.getSource('wt-stops'); } catch (e) { return false; } }); } catch (e) {}
      const root = !!document.querySelector('[aria-label="Virtual Walkthrough"]'); const rg = wt ? ['wt-stops-circle', 'wt-stops-num', 'wt-mons-dots'].map((l) => { try { const y = wt.getLayer(l); return y ? y.minzoom : null; } catch (e) { return null; } }) : null;
      log.push({ t: Math.round(performance.now() - t0), root, map: !!wt, rg }); if (performance.now() - t0 < 9000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
    await clickWalkthrough(S.page); await sleep(9500);
    const log = await S.page.evaluate(() => window.__wtlog);
    const firstRoot = log.findIndex((x) => x.root); const firstMap = log.findIndex((x) => x.map);
    const shown = (i) => log.findIndex((x) => x.rg && x.rg[i] === 0);
    const f = [shown(0), shown(1), shown(2)];
    t.note('frame index of: overlay / map / circle / number / dots', [firstRoot, firstMap, ...f]);
    assert(firstRoot >= 0 && firstMap > firstRoot, `the map exists in frame ${firstMap}, the overlay in frame ${firstRoot}: the map must come later`);
    assert(f.every((x) => x > firstMap), `layers revealed before the map's style/load: ${JSON.stringify(f)}`);
    assert(f[0] === f[1], `the circle and the number layer (one source) must be shown in the same task: frames ${f[0]} and ${f[1]}`);
    assert(f[2] > f[0], `the monument dots (frame ${f[2]}) must be shown after the stops (frame ${f[0]})`);
    // open, then Back at once: no map is built after the overlay is gone, no console error
    await S.page.reload({ waitUntil: 'load' }); await waitForApp(S.page, 60000); await L.chooseLayout(S.page, 'desktop').catch(() => {}); await sleep(2500);
    await clickWalkthrough(S.page); await S.page.getByRole('button', { name: /Back to the map/ }).first().click(); await sleep(2500);
    const left = await S.page.evaluate(`(() => { const maps = ${FIBER}; return maps.filter((m) => { try { return !!m.getSource('wt-stops'); } catch (e) { return false; } }).length; })()`);
    assert(left === 0, `${left} Walkthrough map(s) left after Back`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 4).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P5-03', 'Monuments layer: the first toggle adds the four layers in the original order at once (out of view until their programs are queued), shows the dots first and the glow, ring and stars together a step later, all with the default zoom range; 20 stars and the dots are drawn', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, cpu: 1, wait: 3000 });
  try {
    await S.page.evaluate(`(() => { const FIBER = () => ${FIBER}; const log = window.__monlog = []; const t0 = performance.now(); const tick = () => { let m = null; try { m = FIBER().find((x) => { try { return !x.getSource('wt-stops'); } catch (e) { return false; } }); } catch (e) {}
      const zr = m ? ['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars'].map((l) => { try { const y = m.getLayer(l); return y ? y.minzoom : null; } catch (e) { return null; } }) : null; log.push({ t: Math.round(performance.now() - t0), zr }); if (performance.now() - t0 < 6000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
    await clickMonuments(S.page);
    let r = null; const until = Date.now() + 15000;
    do { await sleep(400); r = await S.page.evaluate(MAPINFO('mon')); } while (Date.now() < until && !(r.stars >= 5 && r.dots > 0));
    await sleep(500);
    const log = await S.page.evaluate(() => window.__monlog);
    const firstAdded = log.findIndex((x) => x.zr && x.zr.every((z) => z !== null));
    const shown = (i) => log.findIndex((x) => x.zr && x.zr[i] === 0);
    const f = [shown(0), shown(1), shown(2), shown(3)];
    t.note('settled', r); t.note('frame index of: layers added / dots / glow / ring / stars shown', [firstAdded, ...f]);
    assert(JSON.stringify(r.order) === JSON.stringify(['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars']), `layer order ${JSON.stringify(r.order)}`);
    assert(JSON.stringify(r.range) === JSON.stringify([[0, 24], [0, 24], [0, 24], [0, 24]]) && r.vis.every((v) => v === 'visible'), `zoom ranges ${JSON.stringify(r.range)} visibility ${JSON.stringify(r.vis)}`);
    assert(r.stars >= 5 && r.dots > 0, `drawn: stars ${r.stars}, dots ${r.dots}`);
    assert(firstAdded >= 0 && f[0] >= firstAdded && f[1] === f[2] && f[2] === f[3] && f[1] > f[0], `reveal frames ${JSON.stringify(f)} (added at ${firstAdded}): dots first, then glow + ring + stars together`);
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 4).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P5-04', 'Monuments layer: toggling off and on again in the middle of the first reveal, and again later, always ends with all four layers shown (a layer left out of its zoom range would be invisible for good)', async (t) => {
  const S = await session(DIST, { vp: DESKTOP, cpu: 1, wait: 3000 });
  try {
    const b = S.page.locator('button[title="Monuments"]').first();
    for (const gap of [0, 60, 150, 400]) {
      await S.page.reload({ waitUntil: 'load' }); await waitForApp(S.page, 60000); await L.chooseLayout(S.page, 'desktop').catch(() => {}); await sleep(2500);
      await b.click(); await sleep(gap); await b.click(); await sleep(300); await b.click();
      let r = null; const until = Date.now() + 15000;
      do { await sleep(400); r = await S.page.evaluate(MAPINFO('mon')); } while (Date.now() < until && !(r.stars >= 5 && r.dots > 0));
      t.note(`off/on after ${gap} ms`, r);
      assert(JSON.stringify(r.range) === JSON.stringify([[0, 24], [0, 24], [0, 24], [0, 24]]) && r.vis.every((v) => v === 'visible'), `gap ${gap}: zoom ranges ${JSON.stringify(r.range)} visibility ${JSON.stringify(r.vis)}`);
      assert(r.stars >= 5 && r.dots > 0, `gap ${gap}: stars ${r.stars}, dots ${r.dots} drawn`);
      await b.click(); await sleep(600);
      const off = await S.page.evaluate(MAPINFO('mon'));
      assert(off.vis.every((v) => v === 'none'), `gap ${gap}: layers still shown after the toggle off: ${JSON.stringify(off.vis)}`);
    }
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 4).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P5-05', 'long tasks of the first click on the Virtual Walkthrough with a slow shader link (15 ms): the tree\'s longest task in the 450 ms window is under 50 ms and below the control\'s (interleaved, medians)', async (t) => {
  if (!CONTROL) throw new Skip('no control');
  const n = QUICK ? 3 : 5; const a = [], c = [];
  for (let i = 0; i < n; i++) for (const [dist, into] of (i % 2 ? [[CONTROL, c], [DIST, a]] : [[DIST, a], [CONTROL, c]])) {
    const S = await session(dist, { vp: DESKTOP, cpu: 1, wait: 3500, init: [SLOWLINK(15)] });
    try { const r = await traceWindow(S.cdp, () => clickWalkthrough(S.page)); into.push(r.max); } finally { await S.close(); }
  }
  const ma = median(a), mc = median(c);
  t.note('tree: longest task per load (ms)', a.map((x) => +x.toFixed(1))); t.note('control', c.map((x) => +x.toFixed(1))); t.note('medians (tree, control)', [+ma.toFixed(1), +mc.toFixed(1)]);
  assert(ma < 50, `median longest task ${ma.toFixed(1)} ms (limit 50)`);
  assert(ma < mc, `the tree (${ma.toFixed(1)} ms) is not below the control (${mc.toFixed(1)} ms)`);
});

suite.test('T0-P5-06', 'long tasks of the first click on Monuments with a slow shader link (25 ms): no task over 50 ms in the 450 ms window on the tree (interleaved with the control, reported)', async (t) => {
  const n = QUICK ? 3 : 5; const a = [], c = [];
  for (let i = 0; i < n; i++) for (const [dist, into] of (i % 2 ? [[CONTROL || DIST, c], [DIST, a]] : [[DIST, a], [CONTROL || DIST, c]])) {
    const S = await session(dist, { vp: DESKTOP, cpu: 1, wait: 3500, init: [SLOWLINK(25)] });
    try { const r = await traceWindow(S.cdp, () => clickMonuments(S.page)); into.push(r.max); } finally { await S.close(); }
  }
  t.note('tree: longest task per load (ms)', a.map((x) => +x.toFixed(1))); t.note('control', c.map((x) => +x.toFixed(1)));
  assert(Math.max(...a) < 50, `a task of ${Math.max(...a).toFixed(1)} ms`);
});

suite.test('T0-P5-07', '/ground-remembers (phone): the heat layer is added in a task of its own, after the load event, with the same layer, source and paint as before; the slider and the play button work; no console error', async (t) => {
  const S = await session(DIST, { vp: PHONE, cpu: 1, url: '/ground-remembers', app: false, wait: 200, init: [MAPS] });
  try {
    let r = null; const until = Date.now() + 25000;
    do { await sleep(500); r = await S.page.evaluate(() => { const m = (window.__maps || [])[0]; if (!m) return null; let f = -1; try { const s = m.getSource('scars'); f = s && ((s.serialize && s.serialize().data) || s._data).features.length; } catch (e) { f = -2; } return { layer: !!m.getLayer('scars-heat'), features: f, add: (window.__addLog || []).find((x) => x.id === 'scars-heat') || null, paint: m.getLayer('scars-heat') ? m.getPaintProperty('scars-heat', 'heatmap-opacity') : null }; }); } while (Date.now() < until && !(r && r.layer));
    t.note('heat layer', r);
    assert(r && r.layer && r.features > 100 && r.paint === 0.85, `heat layer ${JSON.stringify(r)}`);
    assert(r.add && r.add.inLoad === false, `the heat layer was added inside the load event (${JSON.stringify(r.add)})`);
    // slider: fewer placements when the reveal is at the first tick
    await S.page.evaluate(() => { const el = document.getElementById('reveal'); el.value = 40; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(500);
    const f2 = await S.page.evaluate(() => { const m = window.__maps[0]; const s = m.getSource('scars'); return ((s.serialize && s.serialize().data) || s._data).features.length; });
    assert(f2 < r.features && f2 > 0, `slider: ${f2} features at tick 40 (all: ${r.features})`);
    await S.page.click('#play-btn'); await sleep(700);
    const playing = await S.page.evaluate(() => document.getElementById('play-btn').classList.contains('playing'));
    assert(playing, 'the play button did not start the build-up'); await S.page.click('#play-btn');
    assert(!S.warnings.length, `console: ${S.warnings.slice(0, 4).join(' | ')}`);
  } finally { await S.close(); }
});

suite.test('T0-P5-08', '/ground-remembers phone 4x, cold, interleaved with the control: blocking time as the harness counts it (reported; the tree must not be worse than the control by more than 40 ms in the median, each load under 400 ms)', async (t) => {
  if (!CONTROL) throw new Skip('no control');
  const n = QUICK ? 5 : 9; const a = [], c = [];
  const tbtOf = (page) => page.evaluate(() => { const p = window.__p5; const nav = performance.getEntriesByType('navigation')[0]; const from = p.fcp ?? 0, to = (nav.loadEventEnd || performance.now()) + 3000; const win = p.lt.filter((l) => l.s >= from && l.s <= to); return { tbt: Math.round(win.reduce((x, l) => x + Math.max(0, l.d - 50), 0)), tasks: win.map((l) => Math.round(l.d)) }; });
  const OBS = `(() => { const s = window.__p5 = { fcp: null, lt: [] }; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') s.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch (e) {} try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })();`;
  for (let i = 0; i < n; i++) for (const [dist, into] of (i % 2 ? [[CONTROL, c], [DIST, a]] : [[DIST, a], [CONTROL, c]])) {
    const S = await session(dist, { vp: PHONE, cpu: 4, url: '/ground-remembers', app: false, wait: 3600, init: [OBS] });
    try { into.push(await tbtOf(S.page)); } finally { await S.close(); }
  }
  const ma = median(a.map((x) => x.tbt)), mc = median(c.map((x) => x.tbt));
  t.note('tree TBT', a.map((x) => x.tbt)); t.note('control TBT', c.map((x) => x.tbt)); t.note('medians (tree, control)', [ma, mc]);
  assert(ma <= mc + 40, `median ${ma} ms is more than 40 ms above the control's ${mc} ms`);
  assert(Math.max(...a.map((x) => x.tbt)) < 400, `a cold load measured ${Math.max(...a.map((x) => x.tbt))} ms`);
});

suite.test('T0-P5-09', 'train R1f builds with the unmodified builder, 0 anchor failures, and the registered copies are in step with patches-next', async () => {
  if (!BUILD) throw new Skip('pass --build (about 1.5 minutes)');
  const out = path.join(TMP, 'perf5-build');
  const sync = cp.spawnSync('python', [path.join(REPO, 'tools/t0/r1f_sync.py'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert(sync.status === 0, `r1f_sync --check: ${sync.stdout}${sync.stderr}`);
  const gen = cp.spawnSync('python', [path.join(REPO, 'tools/t0/perf5/gen_perf5.py'), '--check'], { cwd: REPO, encoding: 'utf8' });
  assert(gen.status === 0, `gen_perf5 --check: ${gen.stdout}${gen.stderr}`);
  const r = cp.spawnSync('python', [path.join(REPO, 'tools/t0/build.py'), '--train', 'R1f', '--out', path.relative(REPO, out)], { cwd: REPO, encoding: 'utf8', timeout: 400000 });
  assert(r.status === 0 && /OK: R1f=/.test(r.stdout), `build failed: ${(r.stdout + r.stderr).slice(-400)}`);
  const anchors = JSON.parse(fs.readFileSync(path.join(out, 'anchors.json'), 'utf8'));
  const bad = anchors.patches.filter((p) => String(p.found) !== String(p.expect));
  assert(!bad.length, `anchor failures: ${bad.map((p) => p.id).join(', ')}`);
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: CONTROL ? path.relative(REPO, CONTROL) : null, minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
// guards (true on any tree): P5-01 and P5-04 are about what must stay as it was, P5-09 about the build
const GUARDS = new Set(['T0-P5-01', 'T0-P5-04', 'T0-P5-06', 'T0-P5-08', 'T0-P5-09']);
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? ' (still green: ' + pass.map((r) => r.id).join(', ') + ')' : ''}`); process.exit(pass.length ? 1 : 0); }
process.exit(summary.failed ? 1 : 0);
