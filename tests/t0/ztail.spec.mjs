// T0-ZT suite: page group PG-ztail (tools/t0/r1g/gen_ztail.py, docs/accept/ZTAIL-NOTES.md): the cold-load tail of the Mapbox map pages on the phone.
//
//   node tests/t0/ztail.spec.mjs --dist tmp/r1g-ztail/dist-a --control release/R1f/dist
//   node tests/t0/ztail.spec.mjs --dist <tree> --filter 'ZT-0[1-3]'      test-id subset
//   node tests/t0/ztail.spec.mjs --dist <tree> --bench 12                  also the interleaved blocking-time comparison (T0-ZT-08, n loads per tree)
//   node tests/t0/ztail.spec.mjs --dist <R1f tree> --expect-red            red-first proof: the tests about the new behaviour must FAIL on a tree without PG-ztail
//
// What is asserted: the page looks the same (settled picture, tilted, zoomed out, tilted before the map was idle), the style's fog and projection are the style's own again after the first idle,
// the atmosphere's 16,000 star quads are not built before the map is idle, the fog returns at the first movement or in a quiet moment 4.5 s after the idle, and the other pages are byte for byte what the control has.
// (A first version also held the fog / globe shader variants out of the precompile batch in site-nav.js; the three-way run showed no gain beyond the fog, so that patch was dropped: ZTAIL-NOTES.md section 3.)
process.env.T0_AGENT ||= 'ztail';
process.env.T0_PORT_BASE ||= '9700';
process.env.T0_TILE_CAP ||= '20000';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const crypto = await import('node:crypto');
const { REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, emulateViewport, assert, Skip } = L;
const { diffPngs } = await import('../../tools/accept/lib/imgdiff.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const tree = (name, dflt = null) => { const v = opt(name, dflt); return v ? path.resolve(REPO, v) : null; };
const DIST = tree('dist', 'tmp/r1g-ztail/dist-a');
const CONTROL = tree('control', 'release/R1f/dist');
const FILTER = opt('filter', null);
const BENCH = Number(opt('bench', 0)) || 0;
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'ztail.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
let portN = 0;
const nextPorts = () => { const k = portN++; return { http: PORT_BASE + k * 2, cdp: PORT_BASE + k * 2 + 1 }; };
const PHONE = { width: 390, height: 844, dpr: 2, mobile: true };

// every Map the page makes, its 'idle' time, the frames in which the painter had an atmosphere, and the program creations of its painter
// (id, whether it was a fog / terrain / globe / render-to-texture variant, whether the caller was the precompiler, time)
const MAPS = `(() => { Object.defineProperty(window, 'mapboxgl', { configurable: true, set(v) { const M = v.Map; v.Map = class extends M { constructor(o) { super(o); (window.__maps = window.__maps || []).push(this); const m = this, p = m.painter, orig = p.getOrCreateProgram.bind(p); window.__idleAt = null; m.once('idle', () => { window.__idleAt = performance.now(); });
  window.__atm = []; m.on('render', () => { window.__atm.push([Math.round(performance.now()), !!p._atmosphere, !!m.getFog()]); });
  p.getOrCreateProgram = function (id, prm) { const n0 = Object.keys(p.cache || {}).length; const r = orig(id, prm); const q = prm || {}; if (Object.keys(p.cache || {}).length > n0) (window.__prog = window.__prog || []).push({ id, t: Math.round(performance.now()), variant: !!(q.overrideFog || q.overrideTerrain || q.overrideGlobe || q.overrideRtt), pre: !!q.precompiled }); return r; }; } }; Object.defineProperty(window, 'mapboxgl', { value: v, writable: true, configurable: true }); }, get() { return undefined; } }); })();`;
const OBS = `(() => { window.__fcp = null; window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} })();`;

async function session(dist, { cpu = 1, route = '/ground-remembers.html', wait = 0, init = [MAPS] } = {}) {
  const ports = nextPorts();
  const srv = await createStaticServer({ root: dist, port: ports.http });
  const S = await openSession({ profile: `zt-${ports.http}-${Date.now() % 100000}`, cdpPort: ports.cdp, tiles: 'inject', onboarded: true, initScripts: init });
  const page = S.page; const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => warnings.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  await emulateViewport(page, PHONE);
  const cdp = await L.cdpFor(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(`${srv.url}${route}`, { waitUntil: 'load' });
  if (wait) await sleep(wait);
  return { S, srv, page, cdp, warnings, close: async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); } };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let diffPage = null;
async function diff(a, b) { if (!diffPage) { diffPage = await session(CONTROL, { route: '/404.html', init: [] }); } return diffPngs(diffPage.page, a, b, { makeDiff: false }); }
async function shots(dist, steps) {
  const S = await session(dist, { wait: 9000 });
  try {
    const out = {};
    for (const [name, fn, ms] of steps) { if (fn) await S.page.evaluate(fn); await sleep(ms); out[name] = await S.page.screenshot({ type: 'png' }); }
    out.info = await S.page.evaluate(() => { const m = window.__maps[0]; return { fog: JSON.stringify(m.getFog()), proj: m.getProjection().name, layers: m.getStyle().layers.map((l) => l.id).join(','), zoom: +m.getZoom().toFixed(2), pitch: m.getPitch() }; });
    out.warnings = S.warnings;
    return out;
  } finally { await S.close(); }
}
const suite = createSuite('ztail');

suite.test('T0-ZT-01', "/ground-remembers (phone), settled: the default view is pixel-identical to the control, the style's fog and globe projection are the style's own again, the layer list is unchanged, no console error", async (t) => {
  const steps = [['settled', null, 100]];
  const a = await shots(DIST, steps); const c = await shots(CONTROL, steps);
  const d = await diff(c.settled, a.settled);
  t.note('differing pixels', d.diffPixels); t.note('tree', a.info); t.note('control', c.info);
  assert(d.diffPixels === 0, `${d.diffPixels} pixels differ from the control`);
  assert(a.info.fog === c.info.fog && a.info.fog !== 'null', `fog ${a.info.fog} (control ${c.info.fog})`);
  assert(a.info.proj === c.info.proj, `projection ${a.info.proj} (control ${c.info.proj})`);
  assert(a.info.layers === c.info.layers, 'layer list differs from the control');
  assert(!a.warnings.length, `console: ${a.warnings.slice(0, 3).join(' | ')}`);
});

suite.test('T0-ZT-02', '/ground-remembers (phone): tilted to 60 degrees and zoomed out to 3 and to 0.8 the pictures are identical to the control (fog, atmosphere and globe are back)', async (t) => {
  const steps = [['pitched', 'window.__maps[0].jumpTo({ pitch: 60, bearing: 20 })', 4500], ['zoom3', 'window.__maps[0].jumpTo({ pitch: 0, bearing: 0, zoom: 3 })', 5500], ['zoom08', 'window.__maps[0].jumpTo({ zoom: 0.8 })', 4500]];
  const a = await shots(DIST, steps); const c = await shots(CONTROL, steps);
  for (const s of ['pitched', 'zoom3', 'zoom08']) { const d = await diff(c[s], a[s]); t.note(`${s} differing pixels`, d.diffPixels); assert(d.diffPixels === 0, `${s}: ${d.diffPixels} pixels differ from the control`); }
});

suite.test('T0-ZT-03', '/ground-remembers (phone): a visitor who moves the map before it is idle gets the fog back at once (the tilted picture is identical to the control)', async (t) => {
  const S = await session(DIST, { cpu: 1 }); const C = await session(CONTROL, { cpu: 1 });
  try {
    const grab = async (X) => {
      await X.page.waitForFunction(() => window.__maps && window.__maps[0] && window.__maps[0].isStyleLoaded && window.__maps[0].isStyleLoaded(), null, { timeout: 30000 });
      const early = await X.page.evaluate(() => { const m = window.__maps[0]; const before = !!m.getFog(); m.jumpTo({ pitch: 55 }); return { before, after: !!m.getFog(), idle: window.__idleAt }; });
      await sleep(7000); return { early, png: await X.page.screenshot({ type: 'png' }) };
    };
    const a = await grab(S); const c = await grab(C);
    t.note('tree', a.early); t.note('control', c.early);
    assert(a.early.after, 'the fog is not back after the first movement');
    const d = await diff(c.png, a.png); t.note('differing pixels', d.diffPixels);
    assert(d.diffPixels === 0, `${d.diffPixels} pixels differ from the control`);
  } finally { await S.close(); await C.close(); }
});

suite.test('T0-ZT-04', '/ground-remembers (phone): before the first idle the painter has built no atmosphere (the 16,000 star quads); after the idle it has, and the fog is on', async (t) => {
  const R = async (dist) => {
    const S = await session(dist, { cpu: 1, wait: 9000 });
    try {
      return await S.page.evaluate(() => { const idle = window.__idleAt; const prog = window.__prog || []; const atm = window.__atm || []; return { idle: idle && Math.round(idle), variants: prog.filter((p) => p.variant).length, plain: prog.filter((p) => !p.variant).length, atmBefore: atm.filter((r) => (!idle || r[0] < idle) && r[1]).length, atmAfter: atm.some((r) => r[1]), fogAfter: !!window.__maps[0].getFog() }; });
    } finally { await S.close(); }
  };
  const a = await R(DIST); const c = await R(CONTROL);
  t.note('tree', a); t.note('control', c);
  assert(a.idle, 'the map never became idle');
  assert(a.atmBefore === 0, `the atmosphere was built in ${a.atmBefore} frames before the first idle`);
  assert(a.atmAfter && a.fogAfter, `after the idle: atmosphere ${a.atmAfter}, fog ${a.fogAfter}`);
  assert(c.atmBefore > 0, 'the control does not show the cost this group removes (the probe is blind)');
});

suite.test('T0-ZT-05', "the other pages are byte for byte the control's: only /ground-remembers.html differs (and the files that carry the release id)", async (t) => {
  const list = (d) => fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isFile());
  const files = list(CONTROL);
  const changed = files.filter((f) => !fs.existsSync(path.join(DIST, f)) || sha(path.join(DIST, f)) !== sha(path.join(CONTROL, f)));
  t.note('changed top-level files', changed);
  const allowed = new Set(['ground-remembers.html', 'version.json', 'sitemap.xml', 'manifest.json', '_headers']);
  // a tree of a LATER release id differs from the control in the files that carry the release id (sw.js, netlify.toml, the pages that link site-nav.js?v=<id>): those are allowed when the only difference is the id;
  // and the pages / scripts that OTHER registered page groups of the tree change on purpose (train R1g: PG-zperf6 on site-nav.js, PG-zseo on the pages it marks up) are allowed too, named from the registered patch files
  const ver = (d) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8')); } catch { return {}; } };
  const rid = ver(DIST).release, crid = ver(CONTROL).release;
  const carry = (f) => rid && crid && rid !== crid && !fs.statSync(path.join(DIST, f)).isDirectory() && fs.readFileSync(path.join(DIST, f), 'utf8').split(rid).join(crid) === fs.readFileSync(path.join(CONTROL, f), 'utf8');
  const others = new Set();
  for (const g of (ver(DIST).groups || []).filter((x) => /^PG-/.test(x) && x !== 'PG-ztail' && !(ver(CONTROL).groups || []).includes(x))) {
    try { for (const pt of JSON.parse(fs.readFileSync(path.join(REPO, 'tools/t0/patches', g + '.json'), 'utf8')).patches) if (/^[^/]+$/.test(pt.target)) others.add(pt.target); } catch {}
  }
  t.note('files changed on purpose by other page groups of this tree', [...others]);
  const bad = changed.filter((f) => !allowed.has(f) && !others.has(f) && !carry(f));
  assert(!bad.length, `unexpected changes: ${bad.join(', ')}`);
  assert(changed.includes('ground-remembers.html'), 'ground-remembers.html is not changed');
  const a = fs.readFileSync(path.join(DIST, 'ground-remembers.html'), 'utf8');
  assert(a.includes('ZTAIL'), 'no ZTAIL marker in ground-remembers.html');
});

suite.test('T0-ZT-07', '/ground-remembers (phone): a visitor who does not move the map gets the fog back in a quiet moment about 4.5 s after the first idle (not before, not while the map moves), and never twice', async (t) => {
  const S = await session(DIST, { cpu: 1 });
  try {
    await S.page.waitForFunction(() => window.__maps && window.__maps[0] && window.__idleAt, null, { timeout: 30000 });
    const t0 = Date.now(); const seen = [];
    await S.page.evaluate(() => { const m = window.__maps[0]; window.__fogSets = []; const o = m.setFog.bind(m); m.setFog = (f) => { window.__fogSets.push([Math.round(performance.now()), f === null ? 'off' : 'on']); return o(f); }; });
    let on = null;
    while (Date.now() - t0 < 12000) { const f = await S.page.evaluate(() => !!window.__maps[0].getFog()); seen.push([Date.now() - t0, f]); if (f && on === null) on = Date.now() - t0; await sleep(250); }
    const sets = await S.page.evaluate(() => window.__fogSets);
    t.note('fog back after (ms since the probe started)', on); t.note('setFog calls', sets);
    assert(on !== null, 'the fog never came back although the visitor did not move the map');
    assert(on >= 3000 && on <= 8000, `the fog came back after ${on} ms (wanted 3 to 8 s after the idle)`);
    assert(sets.length === 1 && sets[0][1] === 'on', `setFog called ${sets.length} times: ${JSON.stringify(sets)}`);
  } finally { await S.close(); }
});

suite.test('T0-ZT-08', 'blocking time of a cold /ground-remembers load (phone, CPU 4x, interleaved with the control): the median is lower, no load above 400 ms', async (t) => {
  if (!BENCH) throw new Skip('pass --bench N (N loads per tree, about 12 s per load)');
  const one = async (dist) => {
    const S = await session(dist, { cpu: 4, init: [OBS], wait: 3600 });
    try { return await S.page.evaluate(() => { const from = window.__fcp || 0, to = performance.getEntriesByType('navigation')[0].loadEventEnd + 3000; return Math.round(window.__lt.filter((l) => l[0] >= from && l[0] <= to).reduce((s, l) => s + Math.max(0, l[1] - 50), 0)); }); } finally { await S.close(); }
  };
  const a = [], c = [];
  for (let i = 0; i < BENCH; i++) for (const [dist, into] of (i % 2 ? [[CONTROL, c], [DIST, a]] : [[DIST, a], [CONTROL, c]])) into.push(await one(dist));
  const ma = median(a), mc = median(c);
  t.note('tree TBT', a); t.note('control TBT', c); t.note('medians (tree, control)', [ma, mc]);
  assert(ma <= mc, `median ${ma} ms is above the control's ${mc} ms`);
  assert(Math.max(...a) < 400, `a cold load measured ${Math.max(...a)} ms`);
});

const t0 = Date.now();
const summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), control: path.relative(REPO, CONTROL), minutes: +((Date.now() - t0) / 60000).toFixed(1) }) });
if (diffPage) await diffPage.close();
// guards (true on any tree): ZT-01, ZT-02, ZT-03 and ZT-05 are about what must stay as it was
const GUARDS = new Set(['T0-ZT-01', 'T0-ZT-02', 'T0-ZT-03', 'T0-ZT-05']);
if (EXPECT_RED) { const ran = summary.results.filter((r) => r.status !== 'skip' && !GUARDS.has(r.id)); const pass = ran.filter((r) => r.status === 'pass'); console.log(`expect-red: ${ran.length - pass.length} of ${ran.length} tests failed${pass.length ? ' (still green: ' + pass.map((r) => r.id).join(', ') + ')' : ''}`); process.exit(pass.length ? 1 : 0); }
process.exit(summary.failed ? 1 : 0);
