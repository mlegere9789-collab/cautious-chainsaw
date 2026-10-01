// PERF acceptance.  PF-01..06 (tools/t0/patches/PERF.json, R1a and later): the two stylesheets of index.html stop blocking the first paint, the loader
// switches them on before the app is imported, and the first-paint rules that live in the app stylesheet (AX shim) are inlined.  Real Chrome,
// Netlify-like static server on 127.0.0.1 with per-path delays, Mapbox tiles blocked (nothing there needs a map).
// PF-07..09 (tools/t0/patches/R0+mapbox-precompile.json, every train): the app's own Mapbox layers get their shader programs requested before the first
// frame that draws them (so the GPU process links them while the main thread is free); they run with real, harness-injected tiles (about 40 tile requests).
//
//   node tests/t0/perf-fixes.spec.mjs                         run against release/R1c/dist
//   node tests/t0/perf-fixes.spec.mjs --dist release/R1a/dist  any train that contains the PERF group (version.json "groups")
//   node tests/t0/perf-fixes.spec.mjs --filter 'PF-0[1-3]'     subset by id regex
//   node tests/t0/perf-fixes.spec.mjs --dist release/R0/dist --expect-red --filter 'PF-0[12]'    red-first proof: R0 (no PERF group) keeps the blocking links
//   node tests/t0/perf-fixes.spec.mjs --dist <tree built without R0+mapbox-precompile> --expect-red --filter 'PF-0[789]'    red-first proof of the precompile tests
//   node tests/t0/perf-fixes.spec.mjs --dist <tree built without R0+mapbox-precompile> --expect-red --behavior-only --filter 'PF-07'    the same for the behaviour (compile statistics of a real boot), not just the static check
//
// Tests that need a train without the PERF group skip loudly; a train without it is a valid R0 and the report says so.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { REPO, PORT_BASE, openSession, createSuite, assert, assertEq, sleep, waitFor, waitForApp, Skip, VIEWPORTS } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const BEHAVIOR_ONLY = !!opt('behavior-only', false); // PF-07 without the static check for gtPrecompile: proves the behavioural assertion itself is red on a tree without the patch
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
const VERSION = fs.existsSync(path.join(DIST, 'version.json')) ? JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')) : null;
const HAS_PERF = !!(VERSION && (VERSION.groups || []).includes('PERF'));
const HAS_AX = !!(VERSION && (VERSION.groups || []).includes('AX'));
const HTML = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const APP_CSS = VERSION ? `/assets/${VERSION.css}` : null;
const ENTRY_NAME = VERSION ? VERSION.entry : ((HTML.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/) || [])[1] || null);
const BUNDLE = ENTRY_NAME && fs.existsSync(path.join(DIST, 'assets', ENTRY_NAME)) ? fs.readFileSync(path.join(DIST, 'assets', ENTRY_NAME), 'utf8') : '';
const PRE_SRC = (() => { const a = BUNDLE.indexOf('function gtPrecompile('); const b = BUNDLE.indexOf('let Uc=null;function I4(', a); return a >= 0 && b > a ? BUNDLE.slice(a, b) : null; })();
const PHONE = VIEWPORTS.portrait.find((v) => v.width === 412) || VIEWPORTS.portrait[0];
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };
const needPerf = () => { if (!HAS_PERF && !EXPECT_RED) throw new Skip(`train ${VERSION ? VERSION.train : 'legacy'} has no PERF group (R0 keeps the blocking stylesheet links by design)`); };

// ------------------------------------------------------------------ static server with per-path delays and 404s (tools/t0/serve.mjs has neither)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
function serve(root, port) {
  const state = { delays: [], blocked: new Set(), log: [] };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    let file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
    for (const f of [file, file + '.html']) { try { if (fs.statSync(f).isFile()) { file = f; break; } } catch { /* next */ } }
    const rec = { t: Date.now(), path: p, dest: req.headers['sec-fetch-dest'] || '', status: 200, doneAt: null };
    state.log.push(rec);
    const send = () => {
      if (state.blocked.has(p) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { rec.status = 404; res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); rec.doneAt = Date.now(); return; }
      const body = fs.readFileSync(file);
      const cc = p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (p === '/' || p.endsWith('.html')) ? 'no-cache, must-revalidate' : 'public, max-age=3600';
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': body.length, 'cache-control': cc });
      res.end(body); rec.doneAt = Date.now();
    };
    const d = state.delays.find(([re]) => re.test(p));
    if (d) setTimeout(send, d[1]); else send();
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ state, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }) })));
}
const srv = await serve(DIST, PORT_BASE);
const sessions = [];
const reset = () => { srv.state.delays = []; srv.state.blocked = new Set(); srv.state.log.length = 0; };
let port = 0;
const open = async (opts) => { const s = await openSession({ cdpPort: PORT_BASE + 1 + (port++ % 8), tiles: 'block', ...opts }); sessions.push(s); return s; };
const close = async (s) => { await s.close(); sessions.splice(sessions.indexOf(s), 1); };

// paint / CLS probe injected before any page script
const probe = () => {
  const P = (window.__pf = { fcp: null, cls: 0, shifts: [], snaps: [] });
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; })).observe({ type: 'paint', buffered: true }); } catch { /* none */ }
  const sel = (n) => (n && n.tagName ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/)[0] : '') : String(n && n.nodeName));
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.hadRecentInput) return;
      P.cls += e.value;
      P.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources || []).map((x) => `${sel(x.node)} ${[x.previousRect, x.currentRect].map((r) => (r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : '-')).join(' -> ')}`) });
    })).observe({ type: 'layout-shift', buffered: true });
  } catch { /* none */ }
};
const sheetState = (page) => page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => ({ href: l.getAttribute('href'), defer: l.hasAttribute('data-gt-defer'), media: l.media, loaded: !!l.sheet })));
const resources = (page) => page.evaluate(() => performance.getEntriesByType('resource').map((e) => ({ name: e.name.replace(location.origin, ''), start: e.startTime, end: e.responseEnd, rb: e.renderBlockingStatus })));

const suite = createSuite('perf-fixes');

suite.test('PF-01', 'index.html: both stylesheets are non-blocking (media=print, data-gt-defer) and applied before the app is imported', async (t) => {
  needPerf();
  reset();
  const links = [...HTML.matchAll(/<link rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
  t.note('static links', links);
  assertEq(links.length, 2, 'stylesheet links in index.html');
  for (const l of links) assert(/ media="print"/.test(l) && / data-gt-defer/.test(l), `stylesheet link is render-blocking: ${l}`);
  const S = await open({ profile: 'pf-01', initScripts: [probe] });
  try {
    await S.page.goto(`${srv.url}/`, { waitUntil: 'load' });
    await waitForApp(S.page, 40000);
    const sheets = await sheetState(S.page); const res = await resources(S.page);
    const css = res.filter((r) => /\.css(\?|$)/.test(r.name));
    const entry = res.find((r) => r.name === `/assets/${VERSION.entry}`);
    t.note('stylesheets after boot', sheets); t.note('css resources', css.map((c) => [c.name, Math.round(c.start), Math.round(c.end), c.rb])); t.note('entry', entry && [Math.round(entry.start), Math.round(entry.end)]);
    for (const s of sheets) assert(s.media === 'all' && s.loaded, `stylesheet ${s.href} is not applied after the boot (media=${s.media}, loaded=${s.loaded})`);
    assertEq(css.map((c) => c.rb), ['non-blocking', 'non-blocking'], 'Resource Timing renderBlockingStatus of the two stylesheets');
    assert(entry && css.every((c) => entry.start >= c.end - 1), 'the entry was requested before a stylesheet finished: the map controls would mount unstyled');
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await close(S); }
});

suite.test('PF-02', 'a slow stylesheet (1.5 s) neither delays the first paint nor the boot order: FCP first, then the stylesheets, then the entry', async (t) => {
  needPerf();
  reset();
  srv.state.delays = [[/\.css$/, 1500]];
  const S = await open({ profile: 'pf-02', initScripts: [probe] });
  try {
    await S.page.goto(`${srv.url}/`, { waitUntil: 'commit' });
    await waitForApp(S.page, 40000);
    const m = await S.page.evaluate(() => ({ fcp: window.__pf.fcp, cls: window.__pf.cls }));
    const res = await resources(S.page);
    const css = res.filter((r) => /\.css(\?|$)/.test(r.name)); const entry = res.find((r) => r.name === `/assets/${VERSION.entry}`);
    t.note('fcp', Math.round(m.fcp)); t.note('css', css.map((c) => [c.name, Math.round(c.start), Math.round(c.end)])); t.note('entry start', entry && Math.round(entry.start));
    assert(m.fcp != null && m.fcp < 1200, `first contentful paint ${Math.round(m.fcp)} ms: a 1.5 s stylesheet still blocks it`);
    assert(css.every((c) => c.end >= 1400), 'the delayed stylesheets did not take the injected 1.5 s (test setup)');
    assert(entry.start >= Math.max(...css.map((c) => c.end)) - 1, `the loader imported the entry (${Math.round(entry.start)} ms) before the stylesheets finished`);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await close(S); }
});

suite.test('PF-03', 'a stylesheet that fails (404) or never arrives (6 s) never holds the app back: boots after the 3 s cap, one Document, no exception', async (t) => {
  needPerf();
  for (const mode of ['404', 'slow']) {
    reset();
    if (mode === '404') srv.state.blocked = new Set([APP_CSS]); else srv.state.delays = [[new RegExp(`${APP_CSS.replace(/[.]/g, '\\.')}$`), 6000]];
    const S = await open({ profile: `pf-03-${mode}` });
    try {
      const t0 = Date.now();
      await S.page.goto(`${srv.url}/`, { waitUntil: 'commit' });
      await waitForApp(S.page, 40000);
      const mountMs = Date.now() - t0;
      const docs = srv.state.log.filter((r) => r.dest === 'document').length;
      t.note(mode, { mountMs, docs, pageErrors: S.collector.firstParty.length });
      assert(mountMs < (mode === '404' ? 6000 : 9000), `${mode}: the app mounted after ${mountMs} ms`);
      assertEq(docs, 1, `${mode}: Document requests (a failed stylesheet must not trigger the loader's reload)`);
      assertEq(S.collector.firstParty.filter((e) => !(mode === '404' && e.kind === 'console.error' && String(e.url || '').endsWith(APP_CSS))), [], `${mode}: uncaught exceptions / console errors (the browser's own 404 line for the blocked stylesheet is expected)`);
    } finally { await close(S); }
  }
});

suite.test('PF-04', 'the first-paint rules inlined in index.html are the rules of the app stylesheet (drift guard for the AX shim copy)', async (t) => {
  needPerf();
  if (!HAS_AX) throw new Skip('no AX group on this train: the app stylesheet has no shell rules (the inline copy is dead CSS here)');
  const css = fs.readFileSync(path.join(DIST, 'assets', VERSION.css), 'utf8');
  const style = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  const rules = ['.gt-sr-only{', '.gt-skip{', '.gt-skip:focus{'];
  for (const r of rules) {
    const at = css.indexOf(r); assert(at >= 0, `app stylesheet has no ${r}...}`);
    const rule = css.slice(at, css.indexOf('}', at) + 1);
    assert(style.includes(rule), `inline copy of ${rule.slice(0, 60)}... differs from the app stylesheet (group AX changed it: update PERF-critical-css-inline)`);
  }
  const cap = '#boot-splash .boot-caption{color:#9a9aab!important}';
  assert(style.includes(cap) && css.includes(cap), 'splash caption colour rule differs between index.html and the app stylesheet');
  const coarse = /@media \(pointer:coarse\)\{[^}]*#root a\[href\][^{]*\{min-width:44px;min-height:44px\}/;
  assert(coarse.test(css) && coarse.test(style), 'the touch-target rule for #root a[href] (the SEO links) differs between index.html and the app stylesheet');
  t.note('rules compared', rules.length + 2);
});

suite.test('PF-05', 'with the app stylesheet held back 2 s the static shell is already styled (skip links off-screen, screen-reader h1 clipped, caption colour) and nothing shifts', async (t) => {
  needPerf();
  reset();
  srv.state.delays = [[/\.css$/, 2000]];
  const S = await open({ profile: 'pf-05', onboarded: false, viewport: PHONE, initScripts: [probe] });
  try {
    await S.page.goto(`${srv.url}/`, { waitUntil: 'commit' });
    await waitFor(() => S.page.evaluate(() => window.__pf.fcp != null && document.readyState !== 'loading'), { timeout: 10000, label: 'first paint' });
    const early = await S.page.evaluate(() => {
      const skip = document.querySelector('.gt-skip'), h = document.querySelector('header.gt-sr-only'), cap = document.querySelector('#boot-splash .boot-caption');
      const link = [...document.querySelectorAll('link[data-gt-defer]')].map((l) => l.media);
      return { link, skip: skip ? [getComputedStyle(skip).position, getComputedStyle(skip).top] : null, hdr: h ? [h.getBoundingClientRect().height, getComputedStyle(h).clipPath] : null, cap: cap ? getComputedStyle(cap).color : null, splash: !!document.getElementById('boot-splash') };
    });
    t.note('static shell before the stylesheet arrives', early);
    assert(early.splash, 'the splash was gone before the check (timing)');
    assertEq(early.link, ['print', 'print'], 'stylesheets still deferred at the check');
    if (early.skip) { assertEq(early.skip, ['fixed', '-120px'], 'skip link before the stylesheet'); assert(early.hdr[0] <= 1, `screen-reader heading is ${early.hdr[0]} px tall before the stylesheet`); assertEq(early.cap, 'rgb(154, 154, 171)', 'splash caption colour before the stylesheet'); }
    await waitForApp(S.page, 40000); await sleep(1500);
    const { cls, shifts } = await S.page.evaluate(() => ({ cls: window.__pf.cls, shifts: window.__pf.shifts }));
    t.note('CLS over the whole first visit', { cls: +cls.toFixed(4), shifts });
    assert(cls <= 0.001, `layout shift ${cls.toFixed(4)} while the deferred stylesheets were applied`);
  } finally { await close(S); }
});

suite.test('PF-06', 'first visit on a phone and on a desktop viewport: CLS ~ 0, no preload / missing-CSS warning, no failed request, one Document', async (t) => {
  needPerf();
  for (const [name, vp] of [['phone', PHONE], ['desktop', DESKTOP]]) {
    reset();
    const S = await open({ profile: `pf-06-${name}`, onboarded: false, viewport: vp, initScripts: [probe] });
    try {
      const warnings = [];
      S.page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text().slice(0, 160)); });
      await S.page.goto(`${srv.url}/`, { waitUntil: 'load' });
      await waitForApp(S.page, 40000); await sleep(3000);
      const { cls, shifts } = await S.page.evaluate(() => ({ cls: window.__pf.cls, shifts: window.__pf.shifts }));
      const docs = srv.state.log.filter((r) => r.dest === 'document').length;
      const bad = srv.state.log.filter((r) => r.status >= 400 && !/favicon|apple-touch/.test(r.path)).map((r) => `${r.status} ${r.path}`);
      t.note(name, { cls: +cls.toFixed(4), shifts, docs, warnings, bad });
      assert(cls <= 0.001, `${name}: CLS ${cls.toFixed(4)}`);
      assertEq(warnings.filter((w) => /preload|missing CSS/i.test(w)), [], `${name}: console warnings about preloads or about Mapbox GL created before its stylesheet was applied`);
      assertEq(bad, [], `${name}: failed requests`);
      assertEq(docs, 1, `${name}: Document requests`);
      assertEq(S.collector.firstParty, [], `${name}: uncaught exceptions / console errors`);
    } finally { await close(S); }
  }
});

// ------------------------------------------------------------------ PF-07..09: the app's Mapbox shader programs are requested before they are drawn
// The Mapbox maps of the app (desktop map `Xe`, phone map `$t` from group C on) are found through React's fiber tree like lib.mapView does.
const mapsInfo = (page) => page.evaluate(() => {
  const root = document.getElementById('root'); if (!root) return [];
  const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$')); if (!key) return [];
  const stack = [root[key]]; const maps = []; let n = 0;
  while (stack.length && n++ < 400000) {
    const f = stack.pop(); if (!f) continue;
    for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) { const v = h.memoizedState; if (v && typeof v === 'object' && v.current && typeof v.current.getCenter === 'function' && !maps.includes(v.current)) maps.push(v.current); }
    if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child);
  }
  return maps.map((map) => {
    const st = map.style; const ids = st && st._order ? st._order : [];
    const layers = ids.map((id) => ({ id, type: (st._layers[id] || {}).type, visible: (st._layers[id] || {}).visibility !== 'none' }));
    const counts = {}; for (const l of layers) { try { counts[l.id] = map.queryRenderedFeatures({ layers: [l.id] }).length; } catch { counts[l.id] = -1; } }
    const ctx = map.painter && map.painter.context; const cs = ctx && ctx._compileStats;
    return { loaded: map.loaded(), layers, counts, parallel: !!(ctx && ctx.extParallelShaderCompile),
      stats: cs ? { precompiled: cs.precompiled, onDemand: cs.onDemand, totalStallMs: cs.totalStallMs, maxStallMs: cs.maxStallMs, stalls: cs.stalls.map((x) => [x.name, +x.ms.toFixed(1)]) } : null };
  });
});
const appMap = (maps) => maps.find((m) => m.layers.some((l) => l.id === 'roads-1863-line')) || null;
const needPre = () => { if (!PRE_SRC && !BEHAVIOR_ONLY) throw new Error(`the entry bundle ${ENTRY_NAME} has no gtPrecompile (patch R0-mapbox-precompile): the app's own layers compile their shaders on first draw, which blocks the main thread`); };

suite.test('PF-07', "the shader programs of the app's own layers are requested ahead of the first draw: Mapbox's compile statistics show precompiled programs and the symbol/SDF link no longer stalls the main thread", async (t) => {
  needPre();
  for (const [name, vp] of [['phone', PHONE], ['desktop', DESKTOP]]) {
    reset();
    const S = await open({ profile: `pf-07-${name}`, onboarded: true, viewport: vp, tiles: 'inject' });
    try {
      await S.page.goto(`${srv.url}/`, { waitUntil: 'load' });
      await waitForApp(S.page, 40000);
      let m = null;
      await waitFor(async () => { m = appMap(await mapsInfo(S.page)); return !!(m && m.loaded && m.layers.some((l) => l.type === 'symbol') && (m.counts['roads-1863-line'] || 0) > 0); }, { timeout: 30000, label: `${name}: map with the app layers loaded` });
      await sleep(3000);
      m = appMap(await mapsInfo(S.page));
      t.note(name, { precompiled: m.stats.precompiled, onDemand: m.stats.onDemand, totalStallMs: Math.round(m.stats.totalStallMs), stalls: m.stats.stalls, parallelCompile: m.parallel });
      if (!m.parallel) throw new Skip('this browser has no KHR_parallel_shader_compile: Mapbox creates programs synchronously, there is nothing to overlap');
      assert(m.stats.precompiled >= 2, `${name}: only ${m.stats.precompiled} programs were requested ahead of their first draw (symbol/SDF and line are expected)`);
      const sym = m.stats.stalls.filter(([nm]) => /^symbol\//.test(nm)).map(([, ms]) => ms);
      assert(sym.every((ms) => ms < 60), `${name}: the text/SDF symbol program still blocked the main thread for ${Math.max(...sym)} ms (80-100 ms when it is compiled on demand in a software-GL browser)`);
      assertEq(S.collector.firstParty, [], `${name}: uncaught exceptions / console errors`);
    } finally { await close(S); }
  }
});

suite.test('PF-08', 'the app draws what it drew before: lines and labels of the app layers are rendered (placed features per layer > 0) and nothing throws', async (t) => {
  needPre();
  reset();
  const S = await open({ profile: 'pf-08', onboarded: true, viewport: PHONE, tiles: 'inject' });
  try {
    await S.page.goto(`${srv.url}/`, { waitUntil: 'load' });
    await waitForApp(S.page, 40000);
    let m = null;
    await waitFor(async () => { m = appMap(await mapsInfo(S.page)); return !!(m && m.loaded && (m.counts['roads-1863-line'] || 0) > 0); }, { timeout: 30000, label: 'rendered road lines' });
    await sleep(2500);
    m = appMap(await mapsInfo(S.page));
    const lines = m.layers.filter((l) => l.type === 'line' && l.visible).map((l) => m.counts[l.id]); const labels = m.layers.filter((l) => l.type === 'symbol' && l.visible).map((l) => m.counts[l.id]);
    t.note('rendered features per layer', m.counts);
    assert(lines.some((c) => c > 0), 'no line feature of the app layers is rendered');
    assert(labels.some((c) => c > 0), 'no label (symbol) feature of the app layers is rendered');
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await close(S); }
});

suite.test('PF-09', 'gtPrecompile only touches what it expects: an unknown or failing Mapbox leaves the app alone, a removed or re-styled map is not touched, the symbol program carries the defines and UBO size of the draw code', async (t) => {
  needPre();
  assert((BUNDLE.match(/function gtPrecompile\(/g) || []).length === 1, 'gtPrecompile is defined more than once');
  assert(/"text-halo-width":2\}\}\),gtPrecompile\(c\)\}function gtPrecompile\(/.test(BUNDLE), 'gtPrecompile is not called at the end of T4 (the function that adds the app layers)');
  const S = await open({ profile: 'pf-09', tiles: 'block' });
  try {
    await S.page.goto(`${srv.url}/privacy.html`, { waitUntil: 'load' });
    const res = await S.page.evaluate(async (src) => {
      const gt = new Function(`${src};return gtPrecompile;`)();
      const out = {}; const tick = () => new Promise((r) => setTimeout(r, 25));
      const quiet = (m) => { try { return gt(m) === undefined; } catch (e) { return 'THROWS ' + e; } };
      out.noStyle = quiet({});
      out.noPrecompiler = quiet({ style: { _programPrecompiler: null, _order: [], _layers: {} }, painter: {} });
      out.noPainter = quiet({ style: { _programPrecompiler: {}, _order: [], _layers: {} } });
      out.resetThrows = quiet({ style: { _programPrecompiler: { reset() { throw new Error('x'); } }, _order: [], _layers: {} }, painter: {}, once() {}, triggerRepaint() {} });
      // a fake map: every render event stands for "the style update ran"; it rebuilds the queue unless `stuck`
      const mk = (o = {}) => {
        const st = { calls: [], handlers: [], batches: [], needs: false, stuck: !!o.stuck, queue: [] };
        const pc = { reset() { st.calls.push('reset'); st.queue.length = 0; st.needs = true; }, needsBuild: () => st.needs, _queue: st.queue,
          _executeBatch(d, p, s) { st.batches.push({ deadline: d.timeRemaining() > 1e6, painter: p === painter, style: s === style, queue: st.queue.map((q) => q.programId + ':' + (q.params.defines || []).join(',')) }); if (o.batchThrows) throw new Error('boom'); } };
        const layers = o.noSymbol ? { a: { type: 'line' } } : { a: { type: 'line' }, b: { type: 'symbol' } };
        const style = { _programPrecompiler: pc, _order: Object.keys(layers), _layers: layers };
        const painter = { context: { maxUniformBlockSize: 65536, disableSymbolUBO: !!o.noUbo, extParallelShaderCompile: o.noParallel ? null : {} } };
        const map = { style, painter, _removed: false, once(ev, f) { st.handlers.push(f); }, triggerRepaint() { st.calls.push('repaint'); } };
        st.fire = () => { if (!st.stuck && st.needs) { st.needs = false; st.queue.push({ programId: 'line', params: { defines: [] } }); } st.handlers.splice(0).forEach((f) => f()); };
        return { map, st };
      };
      { const { map, st } = mk(); gt(map); out.start = [st.calls.slice(), st.handlers.length];
        st.fire(); await tick(); await tick(); out.normal = st.batches; }
      { const { map, st } = mk({ stuck: true }); gt(map); st.fire(); out.stuckAfterOneRender = [st.handlers.length, st.batches.length];
        for (let i = 0; i < 14; i++) st.fire(); await tick(); await tick(); out.stuckEventually = st.batches.length; }
      { const { map, st } = mk({ noUbo: true }); gt(map); st.fire(); await tick(); await tick(); out.noUbo = st.batches.map((b) => b.queue); }
      { const { map, st } = mk({ noParallel: true }); gt(map); st.fire(); await tick(); await tick(); out.noParallel = [st.calls.slice(), st.batches.length]; }
      { const { map, st } = mk({ noSymbol: true }); gt(map); st.fire(); await tick(); await tick(); out.noSymbolLayer = st.batches.map((b) => b.queue); }
      { const { map, st } = mk(); gt(map); map._removed = true; st.fire(); await tick(); await tick(); out.removed = st.batches.length; }
      { const { map, st } = mk(); gt(map); map.style = { other: true }; st.fire(); await tick(); await tick(); out.restyled = st.batches.length; }
      { const { map, st } = mk({ batchThrows: true }); let uncaught = false; const h = () => { uncaught = true; }; window.addEventListener('error', h);
        gt(map); st.fire(); await tick(); await tick(); window.removeEventListener('error', h); out.batchThrowsUncaught = uncaught; out.batchThrowsRan = st.batches.length; }
      return out;
    }, PRE_SRC);
    t.note('results', res);
    for (const k of ['noStyle', 'noPrecompiler', 'noPainter', 'resetThrows']) assertEq(res[k], true, `${k}: must return quietly`);
    assertEq(res.start, [['reset', 'repaint'], 1], 'start: one reset, one repaint, one render listener');
    assertEq(res.normal.length, 1, 'the queue is run exactly once');
    assertEq([res.normal[0].deadline, res.normal[0].painter, res.normal[0].style], [true, true, true], 'the batch gets an unbounded deadline, the painter and the style of the map');
    assertEq(res.normal[0].queue, ['symbol:RENDER_SDF,USE_PAINT_PROPERTIES_UBO,MAX_UBO_SIZE_VEC4 4096u', 'line:'], 'symbol program first (defines and UBO size as the draw code builds them for maxUniformBlockSize 65536), then what the precompiler derived');
    assertEq(res.stuckAfterOneRender, [1, 0], 'while the style update has not rebuilt the queue it waits for the next render (no batch yet)');
    assertEq(res.stuckEventually, 1, 'it gives up waiting after 10 renders and still runs the queue once');
    assertEq(res.noUbo, [['line:']], 'with disableSymbolUBO the symbol program (per-bucket configuration) is not precompiled');
    assertEq(res.noParallel, [[], 0], 'without KHR_parallel_shader_compile (synchronous program creation) nothing is touched: Mapbox keeps its own idle-sliced precompiler');
    assertEq(res.noSymbolLayer, [['line:']], 'no symbol layer, no symbol program');
    assertEq(res.removed, 0, 'a removed map is not touched');
    assertEq(res.restyled, 0, 'a map whose style was replaced is not touched');
    assertEq([res.batchThrowsRan, res.batchThrowsUncaught], [1, false], 'an exception inside the batch is swallowed');
  } finally { await close(S); }
});

const outFile = path.join(path.dirname(DIST), 'test-perf-fixes.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile });
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* closed */ } }
  await srv.close();
}
const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
if (EXPECT_RED) { console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : 'expected-red VIOLATED: some tests passed or skipped on this tree'); process.exit(allRed ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
