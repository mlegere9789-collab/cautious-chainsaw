// R0 acceptance suite (chapter 02 section 2 X1/X2, WP-T0-04/05, appendix A): first visit, upgrade drill, kill drill, loader retry,
// rename drill, timing sanity.  Real Chrome (system), real Mapbox tiles through the Referer-injecting side channel (<= 300 requests per
// session), a Netlify-like static server on 127.0.0.1.
//
//   node tests/t0/r0.mjs                      run against release/R0/dist (build it first: python tools/t0/build.py --train R0)
//   node tests/t0/r0.mjs --dist release/R1a/dist   any later train must keep passing the R0 mechanism tests
//   node tests/t0/r0.mjs --filter 'R0-0[1-3]'      subset by id regex
//   node tests/t0/r0.mjs --dist legacy/dist --expect-red --filter 'R0-0[1-3]'   red-first proof: X1 fails on the legacy tree
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, swState,
  cacheKeys, rootKids, tileBudget, REFERER, Skip, VIEWPORTS,
} from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R0/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');
const KILL = path.join(REPO, 'ops', 'sw-kill.js');
const LEGACY_DIST = path.join(REPO, 'legacy', 'dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R0`); process.exit(2); }
const VERSION = IS_LEGACY ? null : JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
const OLD_ENTRY = 'index-Cg8FAMXN.js';
const resultsDir = IS_LEGACY ? path.join(REPO, 'tmp', 't0-core') : path.dirname(DIST);

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const resetServer = () => { srv.setRoot(DIST); srv.setOverrides({}); srv.setBlocked([]); };
const sessions = [];
const PORT_OF = { 'r0-first': 1, 'r0-upgrade': 2, 'r0-kill': 3, 'r0-loader': 4, 'r0-phone': 5 };   // one CDP port per profile (sessions may overlap)
const open = async (opts) => { const s = await openSession({ cdpPort: PORT_BASE + PORT_OF[opts.profile], ...opts }); sessions.push(s); return s; };
const closeSession = async (s) => { await s.close(); sessions.splice(sessions.indexOf(s), 1); };

// injected before any page script: paint / LCP / CLS / mount-time probes (unthrottled, so only sanity thresholds are asserted)
const probe = () => {
  const P = (window.__t0 = { paint: {}, lcp: null, cls: 0, mountAt: null });
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { P.paint[e.name] = e.startTime; })).observe({ type: 'paint', buffered: true }); } catch { /* no paint timing */ }
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      const el = e.element; P.lcp = { t: e.startTime, tag: el ? el.tagName : null, within: el && el.closest ? ((el.closest('#boot-splash, #seo-content') || {}).id || null) : null };
    })).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* no LCP */ }
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) P.cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch { /* no CLS */ }
  try {
    new MutationObserver(() => {
      if (!P.mountAt && document.getElementById('root') && !document.getElementById('boot-splash') && document.querySelector('#root canvas')) P.mountAt = performance.now();
    }).observe(document, { childList: true, subtree: true });
  } catch { /* observer unavailable */ }
};

// ------------------------------------------------------------------ fixture: one first visit shared by R0-01/02/03/08/09/11
const F = {};
async function firstVisit() {
  if (F.first) return F.first;
  resetServer();
  const S = await open({ profile: 'r0-first', initScripts: [probe] });
  const navs = [];
  S.page.on('framenavigated', (f) => { if (f === S.page.mainFrame()) navs.push(f.url()); });
  const mark = S.net.mark();
  await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitForApp(S.page, 40000);
  const controllerAt = Date.now();
  await waitFor(async () => (await swState(S.page)).controller, { timeout: 25000, label: 'service worker controller (registered at idle, claims without a navigation)' }).catch(() => null);
  await sleep(1500);                                   // let any (unwanted) second navigation or map session show up
  F.first = { S, navs, mark, controllerWaitMs: Date.now() - controllerAt };
  return F.first;
}

const suite = createSuite('r0-acceptance');

suite.test('T0-R0-01', 'first visit: exactly one Document request for / (X1)', async (t) => {
  const { S } = await firstVisit();
  const docs = S.net.documents(ORIGIN).map((e) => e.url);
  const served = srv.requests.filter((r) => r.dest === 'document').map((r) => r.path);
  t.note('browser Document requests', docs); t.note('server document hits', served);
  assertEq(docs, [`${ORIGIN}/`], 'Document requests seen by the browser');
  assertEq(served, ['/'], 'document requests seen by the server');
});

suite.test('T0-R0-02', 'first visit: SW controller set without any navigation (X1)', async (t) => {
  const { S, navs } = await firstVisit();
  const st = await swState(S.page);
  t.note('service worker', st); t.note('main-frame navigations', navs);
  assert(st.controller && st.controller.endsWith('/sw.js'), `page is not controlled by /sw.js (controller=${st.controller})`);
  assertEq(navs.length, 1, 'main-frame navigations (the first load only; no controllerchange reload)');
});

suite.test('T0-R0-03', 'first visit: one Mapbox sku, one style request (one map session) (X1)', async (t) => {
  const { S } = await firstVisit();
  const skus = [...S.tileStats.skus];
  // `Cache-Control: max-age=900, stale-while-revalidate=3600` on the style JSON: an expired cached copy is answered from the cache and Chrome adds one
  // background revalidation (resource type 'Other', same frame): not a second map.  Count only the page's own requests.
  const styles = S.net.find(/^https:\/\/api\.mapbox\.com\/styles\/v1\/[^/?]+\/[^/?]+\?/).filter((e) => e.type !== 'Other').length;
  const tileReqs = S.tileStats.seen;
  t.note('skus', skus.length); t.note('style requests', styles); t.note('mapbox requests intercepted', tileReqs);
  t.note('tile statuses', S.tileStats.status); t.note('referer seen on the wire', [...S.tileStats.referers]); t.note('run budget', tileBudget);
  assert(tileReqs > 0, 'no Mapbox requests were observed (the map never loaded)');
  assertEq([...S.tileStats.referers], [REFERER], 'Referer on Mapbox requests');
  assertEq(skus.length, 1, 'distinct Mapbox sku values');
  assertEq(styles, 1, 'style requests');
});

suite.test('T0-R0-12', 'phone viewport (375x812, touch emulation): one Document, controller without navigation, no exceptions (X1 mobile; one-sku on phones is a T0-MOB gate)', async (t) => {
  resetServer();
  const S = await open({ profile: 'r0-phone', tiles: 'block', viewport: VIEWPORTS.portrait[0] });   // no map traffic needed for this mechanism check
  try {
    const navs = [];
    S.page.on('framenavigated', (f) => { if (f === S.page.mainFrame()) navs.push(f.url()); });
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitForApp(S.page, 40000);
    await waitFor(async () => (await swState(S.page)).controller, { timeout: 25000, label: 'service worker controller on the phone viewport' });
    await sleep(1500);
    const docs = S.net.documents(ORIGIN).map((e) => e.url);
    const dims = await S.page.evaluate(() => ({ w: innerWidth, h: innerHeight, coarse: matchMedia('(pointer: coarse)').matches }));
    t.note('documents', docs); t.note('navigations', navs); t.note('viewport', dims);
    assertEq(dims.w, 375, 'emulated width');
    assertEq(docs, [`${ORIGIN}/`], 'Document requests');
    assertEq(navs.length, 1, 'main-frame navigations');
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

suite.test('T0-R0-08', 'version.json matches the running entry; entry carries the sentinel', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist (no version.json)');
  const { S } = await firstVisit();
  const r = await S.page.evaluate(async () => {
    const v = await (await fetch('/version.json', { cache: 'no-store' })).json();
    const entryUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/assets\/index-[0-9a-f]{8}\.js$/.test(n));
    const head = (await (await fetch(entryUrl)).text()).slice(0, 40);
    return { v, entryUrl, head, helpLoaded: performance.getEntriesByType('resource').some((e) => /HelpModal/.test(e.name)) };
  });
  t.note('version.json', r.v);
  assertEq(r.v, JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')), 'served version.json equals the built one');
  assert(r.entryUrl && r.entryUrl.endsWith(`/assets/${VERSION.entry}`), `page loaded ${r.entryUrl}, version.json says ${VERSION.entry}`);
  assert(r.head.startsWith(`/*t0:${VERSION.release}*/`), 'entry does not start with the release sentinel');
  assert(!r.helpLoaded, 'HelpModal chunk was fetched before Help was opened');
});

suite.test('T0-R0-09', 'timing sanity (no Lighthouse): paint before app boot, splash is the LCP, no entrance fades, CLS', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  const { S } = await firstVisit();
  const m = await S.page.evaluate(() => {
    const P = window.__t0; const res = performance.getEntriesByType('resource');
    const entry = res.find((e) => /\/assets\/index-[0-9a-f]{8}\.js$/.test(e.name));
    const head = document.head;
    return { fcp: P.paint['first-contentful-paint'], lcp: P.lcp, cls: P.cls, mountAt: P.mountAt, entryStart: entry && entry.startTime, entryEnd: entry && entry.responseEnd,
      bodyAnim: getComputedStyle(document.body).animationName, modulepreload: head.querySelectorAll('link[rel=modulepreload]').length,
      preload: head.querySelectorAll('link[rel=preload]').length, preconnect: [...head.querySelectorAll('link[rel=preconnect],link[rel=dns-prefetch]')].map((l) => l.href),
      cssBlocking: [...head.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')), colorScheme: (head.querySelector('meta[name=color-scheme]') || {}).content };
  });
  t.note('measurements', { ...m, fcp: Math.round(m.fcp), entryStart: Math.round(m.entryStart), mountAt: Math.round(m.mountAt), cls: +m.cls.toFixed(4) });
  assert(m.fcp > 0 && m.fcp < 1500, `FCP ${Math.round(m.fcp)} ms (unthrottled sanity limit 1500)`);
  assert(m.entryStart >= m.fcp, `the 2.3 MB entry started (${Math.round(m.entryStart)} ms) before first contentful paint (${Math.round(m.fcp)} ms)`);
  assert(m.lcp && (m.lcp.within === 'boot-splash' || m.lcp.within === 'seo-content'), `LCP element is not the static splash/SEO text: ${JSON.stringify(m.lcp)}`);
  assert(m.mountAt && m.mountAt < 6000, `app mounted at ${Math.round(m.mountAt)} ms (sanity limit 6000)`);
  assert(m.cls <= 0.1, `CLS ${m.cls.toFixed(3)} > 0.1`);
  assertEq(m.bodyAnim, 'none', 'body animation-name');
  assertEq([m.modulepreload, m.preload], [0, 0], 'modulepreload / preload links');
  assertEq(m.preconnect, ['https://api.mapbox.com/'], 'preconnect / dns-prefetch hints');
  assertEq(m.colorScheme, 'dark', 'color-scheme meta');
  assertEq(m.cssBlocking.length >= 2, true, 'stylesheets linked plainly');
});

suite.test('T0-R0-11', 'rename drill: Help and Bookmarks chunks import the NEW entry; no second app is mounted', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  const { S } = await firstVisit();
  await chooseLayout(S.page, 'desktop');
  await S.page.evaluate(() => { window.__t0canvas = document.querySelector('#root .mapboxgl-canvas'); });
  const m = S.net.mark(); const before = S.collector.errors.length;
  await S.page.keyboard.press('?');
  await S.page.getByText('Keyboard Shortcuts').first().waitFor({ state: 'visible', timeout: 10000 });
  await S.page.keyboard.press('Escape');
  await S.page.click('button[title="Bookmarks"]');
  await S.page.getByText('Bookmarks & Sharing').first().waitFor({ state: 'visible', timeout: 10000 });
  const chunks = S.net.find(/\/assets\/(HelpModal|BookmarkPanel)-/, m).map((e) => e.url.split('/').pop());
  const st = await S.page.evaluate(() => ({ same: window.__t0canvas === document.querySelector('#root .mapboxgl-canvas') && window.__t0canvas.isConnected, kids: document.getElementById('root').childElementCount }));
  t.note('chunks requested', chunks); t.note('state', st);
  assert(chunks.includes(VERSION.help) && chunks.includes(VERSION.bookmark), `expected ${VERSION.help} and ${VERSION.bookmark}, got ${chunks}`);
  assert(S.net.find(new RegExp(OLD_ENTRY), m).length === 0, 'the old entry name was requested');
  assert(st.same && st.kids > 0, 'the map canvas was replaced: a second app instance was mounted');
  assertEq(S.collector.errors.slice(before), [], 'new exceptions / console errors');
});

// ------------------------------------------------------------------ upgrade drill (own profile): Sep-29 bundle + old SW -> R0
suite.test('T0-R0-04', 'upgrade drill: profile seeded with the legacy tree + old SW gets new bytes on the next navigation (X2)', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  resetServer();
  srv.setRoot(LEGACY_DIST);
  const S = await open({ profile: 'r0-upgrade', initScripts: [probe], tiles: 'block' });   // seed phase: no Mapbox traffic needed
  F.upgrade = S;
  await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitFor(async () => (await swState(S.page)).controller, { timeout: 25000, label: 'OLD service worker controlling the legacy page' });
  await sleep(4000);                                   // the old build reloads once on controllerchange; let it settle
  const seeded = { sw: await swState(S.page), caches: await cacheKeys(S.page), oldEntryLoaded: srv.requests.some((r) => r.path.endsWith(OLD_ENTRY)) };
  t.note('seeded profile', seeded);
  assert(seeded.oldEntryLoaded && seeded.caches.includes('gbg-v5'), 'seed failed: legacy build/old worker not in place');
  // "deploy" R0 over it
  srv.setRoot(DIST);
  S.setTiles('inject');                                 // the R0 phase runs on a real map (exceptions in map-ready code paths)
  S.collector.clear();
  const m = S.net.mark();
  await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitForApp(S.page, 40000);
  const docs = S.net.documents(ORIGIN, m).length;
  // the browser's post-navigation update check finds the new sw.js, installs it, and (no skipWaiting) leaves it waiting
  await waitFor(async () => (await swState(S.page)).waiting, { timeout: 25000, label: 'new worker installed and waiting' }).catch(() => null);
  const sw = await swState(S.page);
  const newEntry = S.net.find(new RegExp(`/assets/${VERSION.entry}$`), m).length;
  const oldEntry = S.net.find(new RegExp(OLD_ENTRY), m).length;
  t.note('documents on the upgrade navigation', docs); t.note('service worker', sw); t.note('caches', await cacheKeys(S.page));
  assertEq(docs, 1, 'Document requests on the upgrade navigation (no reload band-aid)');
  assert(newEntry >= 1, `${VERSION.entry} was not requested on the next navigation`);
  assertEq(oldEntry, 0, 'requests for the old entry after the upgrade');
  assert(sw.controller, 'page lost its controller');
  assert(sw.waiting, 'the new worker should be WAITING while the old worker controls the open tab (no skipWaiting)');
  assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors on the upgrade navigation');
});

suite.test('T0-R0-05', 'upgrade drill: Help and Bookmarks open through the new chunks, the old app is not remounted (X2)', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  const S = F.upgrade; assert(S, 'T0-R0-04 must run first');
  await chooseLayout(S.page, 'desktop');
  await S.page.evaluate(() => { window.__t0canvas = document.querySelector('#root .mapboxgl-canvas'); });
  const m = S.net.mark(); const before = S.collector.errors.length;
  await S.page.keyboard.press('?');
  await S.page.getByText('Keyboard Shortcuts').first().waitFor({ state: 'visible', timeout: 10000 });
  await S.page.keyboard.press('Escape');
  await S.page.click('button[title="Bookmarks"]');
  await S.page.getByText('Bookmarks & Sharing').first().waitFor({ state: 'visible', timeout: 10000 });
  const chunks = S.net.find(/\/assets\/(HelpModal|BookmarkPanel)-/, m).map((e) => e.url.split('/').pop());
  const st = await S.page.evaluate(() => ({ same: window.__t0canvas === document.querySelector('#root .mapboxgl-canvas') && window.__t0canvas.isConnected, kids: document.getElementById('root').childElementCount }));
  t.note('chunks', chunks); t.note('state', st);
  assert(chunks.includes(VERSION.help) && chunks.includes(VERSION.bookmark), `expected ${VERSION.help} and ${VERSION.bookmark}, got ${chunks}`);
  assertEq(S.net.find(new RegExp(OLD_ENTRY), m).length, 0, 'old entry requested after the upgrade');
  assert(st.same && st.kids > 0, 'the old app was remounted (canvas replaced)');
  assertEq(S.collector.errors.slice(before), [], 'new exceptions / console errors');
});

suite.test('T0-R0-10', 'upgrade drill: after every tab closes the waiting worker activates and purges gbg-v5 only (X2)', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  const S = F.upgrade; assert(S, 'T0-R0-04 must run first');
  S.setTiles('block');
  const keeper = await S.newPage();                     // keep the browser alive; about:blank is not a client of the worker
  await S.page.evaluate(() => caches.open('mapbox-tiles').then((c) => c.put('/t0-marker', new Response('x'))));
  await S.page.close();
  await sleep(1500);
  await keeper.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  const keys = await waitFor(async () => { const k = await cacheKeys(keeper); return !k.includes('gbg-v5') ? k : null; }, { timeout: 30000, label: 'gbg-v5 purged by the new worker' });
  await waitFor(async () => { const s2 = await swState(keeper); return s2.controller && !s2.waiting; }, { timeout: 20000, label: 'new worker in control' });
  const marker = await keeper.evaluate(() => caches.open('mapbox-tiles').then((c) => c.match('/t0-marker')).then((r) => !!r));
  t.note('caches after activation', keys); t.note('mapbox-tiles marker survived', marker);
  assert(!keys.includes('gbg-v5'), 'gbg-v5 still present');
  assert(marker, 'the mapbox-tiles cache was touched');
  await closeSession(S); F.upgrade = null;
});

// ------------------------------------------------------------------ kill drill (own profile)
suite.test('T0-R0-06', 'kill drill: /sw.js swapped for ops/sw-kill.js -> 0 registrations, 0 gbg-* caches, mapbox-tiles untouched after one navigation (X2)', async (t) => {
  resetServer();
  const S = await open({ profile: 'r0-kill', tiles: 'block' });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitFor(async () => (await swState(S.page)).controller, { timeout: 25000, label: 'worker controlling before the kill' });
    await S.page.evaluate(() => caches.open('mapbox-tiles').then((c) => c.put('/t0-marker', new Response('x'))));
    await S.page.evaluate(() => caches.open('gbg-old-test').then((c) => c.put('/x', new Response('x'))));
    const before = { sw: await swState(S.page), caches: await cacheKeys(S.page) };
    t.note('before', before);
    assert(before.caches.includes('gbg-old-test'), 'test cache not created');
    srv.setOverrides({ '/sw.js': KILL });
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitFor(async () => { try { return (await S.page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))) === 0; } catch { return false; } }, { timeout: 30000, label: '0 service worker registrations' });
    await sleep(1500);
    const docsAt = () => S.net.documents(ORIGIN).length;
    const d1 = docsAt(); await sleep(12000); const d2 = docsAt();
    t.note('documents right after / 12 s later (no reload loop)', [d1, d2]);
    assertEq(d2, d1, 'the kill switch must not keep reloading the page (re-registration of the kill worker must not navigate an uncontrolled page)');
    const after = { regs: await S.page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)), caches: await cacheKeys(S.page),
      marker: await S.page.evaluate(() => caches.open('mapbox-tiles').then((c) => c.match('/t0-marker')).then((r) => !!r)) };
    t.note('after one navigation', after);
    assertEq(after.regs, 0, 'registrations');
    assertEq(after.caches.filter((k) => k.startsWith('gbg-')), [], 'gbg-* caches');
    assert(after.caches.includes('mapbox-tiles') && after.marker, 'mapbox-tiles cache was touched');
    await S.page.waitForLoadState('load');
    assert(await waitFor(async () => (await S.page.evaluate(() => !!document.getElementById('root'))), { timeout: 10000 }), 'page not usable after the kill');
  } finally { resetServer(); await closeSession(S); }
});

// ------------------------------------------------------------------ boot loader failure path (own profile)
suite.test('T0-R0-07', 'loader: entry 404 -> one automatic reload, then a visible "Try again"; the button recovers once the file is back', async (t) => {
  if (IS_LEGACY) throw new Skip('not applicable to legacy/dist');
  resetServer();
  const S = await open({ profile: 'r0-loader', tiles: 'block' });
  try {
    srv.setBlocked([`/assets/${VERSION.entry}`]);
    const m = S.net.mark();
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    const btn = S.page.locator('#boot-splash button');
    await btn.waitFor({ state: 'visible', timeout: 25000 });
    const docs = S.net.documents(ORIGIN, m).length;
    const caption = await S.page.locator('#boot-splash .boot-caption').innerText();
    t.note('documents (first load + one reload)', docs); t.note('caption', caption);
    assertEq(docs, 2, 'Document requests: the first load plus exactly one automatic reload');
    assertEq(caption, 'The map could not be loaded.', 'caption');
    srv.setBlocked([]);
    await btn.click();
    await waitForApp(S.page, 40000);
    assert((await rootKids(S.page)) > 0, 'app did not boot after Try again');
  } finally { resetServer(); await closeSession(S); }
});

// ------------------------------------------------------------------ run
const outFile = path.join(resultsDir, IS_LEGACY ? 'test-r0-legacy.json' : 'test-r0.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
if (EXPECT_RED) { console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : 'expected-red VIOLATED: some tests passed on this tree'); process.exit(allRed ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
