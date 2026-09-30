// T0-PGC-* acceptance for WP-T0-11 (shared layer) and WP-T0-12 (page defect pack), patch group tools/t0/patches/PG-core.json.
// Real system Chrome (tests/t0/lib.mjs) against a Netlify-like static server on 127.0.0.1.  The non-map pages never touch Mapbox; the two
// map pages that carry a fix (Watch Together, Immersive) run with a minimal `mapboxgl` stand-in (page logic under test, not tiles) and, once,
// with the real library through the harness Referer injection (--real-maps, <= ~60 Mapbox requests, shared budget of 300 per run).
//
//   node tests/t0/pages-core.spec.mjs                                   release/R1a/dist  (python tools/t0/build.py --train R1a first)
//   node tests/t0/pages-core.spec.mjs --dist tmp/pages-core/r1a/dist    any built tree
//   node tests/t0/pages-core.spec.mjs --filter 'PGC-0[1-3]'             subset by id regex
//   node tests/t0/pages-core.spec.mjs --real-maps                       also run the real-Mapbox smoke tests
//   node tests/t0/pages-core.spec.mjs --full --filter 'PGC-01'          duplicate-id sweep of all 20 pages under 0/300/1500/4000 ms data delay (X11)
//   node tests/t0/pages-core.spec.mjs --dist legacy/dist --expect-red   red-first proof: every red-able test must FAIL on the legacy tree
//
// Scope notes (decisions, not omissions):
//   * Immersive: the fix is Pause -> audioCtx.suspend() only.  The hearing-safety limiter (DynamicsCompressor, fade-in, volume ceiling, content warning)
//     is DEFERRED by owner default O-T0-7 / chapter 02 section 12 item 5; pages-C-26 (corrected to low/medium) simulated the default peak at about -26 dBFS.
//   * Watch Together: XSS fix only (textContent + input validation); Live Sync stays, its privacy text belongs to the legal group.
//   * AR: hidden (menus, sitemap, crawlable list) + noindex + honest notice; the page itself is not repaired.
//   * Nothing here edits /data/*, a URL form, a <title>, a canonical, the product name or a clock label.
// Env: T0_AGENT=pages-core  T0_PORT_BASE=8380 (static server = base, CDP ports base+1..2)  T0_TILE_CAP=300
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

process.env.T0_AGENT ??= 'pages-core';
process.env.T0_PORT_BASE ??= '8380';
const {
  REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, tileBudget, emulateViewport, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1a/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const REAL_MAPS = !!opt('real-maps', false);
const FULL = !!opt('full', false);   // T0-PGC-01: sweep ALL 20 pages under every data delay (default: the 4 collision pages)
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1a`); process.exit(2); }
const LEGACY = path.join(REPO, 'legacy', 'dist');
const readDist = (rel) => fs.readFileSync(path.join(DIST, rel), 'utf8');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(LEGACY, rel), 'utf8'));   // data files are byte-identical in every train (T0 never edits /data/*)

const DESKTOP = { width: 1280, height: 800, dpr: 1, mobile: false };
const PHONE = { width: 375, height: 812, dpr: 2, mobile: true };
const NAV_PAGES = ['aftermath', 'ar', 'camera', 'cinematic-export', 'compare', 'dashboard', 'documentary', 'education', 'find-ancestor', 'ground-remembers',
  'historian', 'immersive', 'living-ledger', 'regiment', 'report', 'sandbox', 'search', 'turning-points', 'viewshed', 'watch-together'];
const PATCHED_12 = ['dashboard', 'report', 'regiment', 'living-ledger', 'historian', 'search', 'ar', 'watch-together', 'immersive', 'compare', 'camera', 'ground-remembers'];
const NON_MAP = ['aftermath', 'ar', 'dashboard', 'documentary', 'education', 'find-ancestor', 'historian', 'living-ledger', 'regiment', 'report', 'search', 'turning-points'];

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = {};
async function session(kind) {
  if (!sessions[kind]) {
    const vp = kind === 'phone' ? PHONE : DESKTOP;
    sessions[kind] = await openSession({ profile: `pgc-${kind}`, cdpPort: PORT_BASE + (kind === 'phone' ? 2 : 1), tiles: 'block', onboarded: false, viewport: vp });
  }
  return sessions[kind];
}
async function freshPage(kind = 'desktop', { init = [] } = {}) {
  const S = await session(kind);
  const page = await S.newPage();
  await emulateViewport(page, kind === 'phone' ? PHONE : DESKTOP);
  for (const f of init) await page.addInitScript(f);
  S.collector.clear();
  return { S, page };
}
/** open /<name> with every /data/** response delayed by `delay` ms; resolves after the load event */
async function open(page, name, { delay = 0, query = '' } = {}) {
  if (delay) await page.route('**/data/**', async (route) => { await sleep(delay); route.continue().catch(() => {}); });
  await page.goto(`${ORIGIN}/${name}${query}`, { waitUntil: 'load' });
}
const dupIds = (page) => page.evaluate(() => {
  const seen = {}; document.querySelectorAll('[id]').forEach((e) => { seen[e.id] = (seen[e.id] || 0) + 1; });
  return Object.entries(seen).filter(([, n]) => n > 1).map(([id, n]) => `${id}x${n}`);
});
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const noJunk = (text, label) => assert(!/undefined|\bNaN\b|\bnull\b/.test(text), `${label}: page text contains undefined/NaN/null: ${JSON.stringify(text.match(/.{0,40}(undefined|\bNaN\b|\bnull\b).{0,40}/)?.[0])}`);
const staticStub = () => {
  class Map {
    constructor(o) { this.opts = o; this._on = {}; this._src = {}; window.__stubMap = this; setTimeout(() => (this._on.load || []).forEach((f) => f()), 20); }
    on(ev, fn) { (this._on[ev] = this._on[ev] || []).push(fn); return this; }
    once(ev, fn) { return this.on(ev, fn); }
    addControl() { return this; }
    addSource(id) { this._src[id] = { setData() {} }; }
    getSource(id) { return this._src[id]; }
    addLayer() {} fitBounds() {} flyTo() {} jumpTo() {} easeTo() {} resize() {} remove() {}
    getCanvas() { return document.createElement('canvas'); }
  }
  window.mapboxgl = { accessToken: '', Map, NavigationControl: class {}, Popup: class { setLngLat() { return this; } setHTML() { return this; } addTo() { return this; } } };
};
const contrastOf = (page, selector) => page.evaluate((sel) => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const el = document.querySelector(sel); if (!el) return null;
  const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); chain.reverse();
  let cur = { r: 10, g: 10, b: 20 };
  for (const e of chain) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) cur = { r: cur.r * (1 - c.a) + c.r * c.a, g: cur.g * (1 - c.a) + c.g * c.a, b: cur.b * (1 - c.a) + c.b * c.a }; }
  const fg = parse(getComputedStyle(el).color); const l1 = lum(fg), l2 = lum(cur);
  return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
}, selector);
const AXE = fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
async function axeViolations(page, { rules } = {}) {
  await page.evaluate(() => { const s = document.getElementById('split'); if (s) s.style.display = 'flex'; });   // compare.html keeps its controls hidden until Mapbox is up
  await page.evaluate(AXE);
  return page.evaluate(async (runOnly) => {
    const r = await axe.run(document, { resultTypes: ['violations'], ...(runOnly ? { runOnly } : {}) });
    return r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, n: v.nodes.length, first: v.nodes[0].target.join(' ') }));
  }, rules || null);
}
const clsProbe = () => {
  window.__cls = 0;
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch { /* no layout-shift entries */ }
};

// data-derived expectations (the data files are the same in every tree)
const OOB = ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps', 'confederate_regiments_first_corps',
  'confederate_regiments_second_corps', 'confederate_regiments_third_corps', 'union_cavalry_artillery', 'confederate_cavalry'];
const REGIMENTS = OOB.flatMap((f) => readJson(`data/oob/${f}.json`).regiments || []);
const CASUALTY = readJson('data/casualty_apportionment.json');
const periodSum = (list) => list.reduce((s, c) => s + c.engagement_periods.reduce((a, p) => a + p.casualties, 0), 0);
const LEDGER = { union: periodSum(CASUALTY.union_corps), conf: periodSum(CASUALTY.confederate_corps) };

const suite = createSuite('pages-core');
const RED = new Set();   // tests that must FAIL on legacy/dist (red-first proof)
const test = (id, title, fn, { red = true } = {}) => { if (red) RED.add(id); suite.test(id, title, fn); };

// ------------------------------------------------------------------------------------------------------------------ shared layer
test('T0-PGC-01', 'no duplicate ids (sprite symbols vs page ids) on 20 pages, and on the 4 collision pages under 0/300/1500/4000 ms data delay (X11)', async (t) => {
  const bad = {};
  for (const name of NAV_PAGES) {
    const { page } = await freshPage();
    await open(page, name);
    await sleep(3000);
    const d = await dupIds(page);
    const uses = await page.evaluate(() => [...document.querySelectorAll('use[href^="#"]')].map((u) => u.getAttribute('href').slice(1)).filter((id) => { const el = document.getElementById(id); return !el || el.tagName.toLowerCase() !== 'symbol'; }));
    if (d.length || uses.length) bad[name] = { dup: d, danglingUse: uses };
    await page.close();
  }
  for (const name of FULL ? NAV_PAGES : ['dashboard', 'report', 'regiment', 'living-ledger']) {
    for (const delay of [0, 300, 1500, 4000]) {
      const { page } = await freshPage();
      await open(page, name, { delay });
      await sleep(Math.min(delay + 1500, 5500));
      const d = await dupIds(page);
      if (d.length) bad[`${name}@${delay}ms`] = { dup: d };
      await page.close();
    }
  }
  t.note('pages with a problem', bad);
  assertEq(bad, {}, 'duplicate ids / dangling <use> references');
});

test('T0-PGC-02', 'icon sprite: 19 symbols, all gtbg-i- prefixed; index.html uses migrated atomically (its 4 <use> resolve)', async (t) => {
  const { page } = await freshPage();
  await open(page, 'search');
  await sleep(2500);
  const ids = await page.evaluate(() => [...document.querySelectorAll('#gtbg-icon-sprite symbol')].map((s) => s.id));
  t.note('symbols', ids.length);
  assertEq(ids.length, 19, 'symbol count');
  assert(ids.every((i) => i.startsWith('gtbg-i-')), `unprefixed symbol ids: ${ids.filter((i) => !i.startsWith('gtbg-i-'))}`);
  const used = await page.evaluate(() => [...document.querySelectorAll('#gtbg-nav use')].map((u) => u.getAttribute('href')));
  assert(used.length > 10 && used.every((h) => h.startsWith('#gtbg-i-')), `nav <use> hrefs must be prefixed: ${used.slice(0, 3)}`);
  await page.close();
  // index.html: the overlay's icons are set by an idle callback; boot the page far enough for it to run (the map app itself is not needed)
  const p2 = (await freshPage()).page;
  await p2.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await sleep(3500);
  const idx = await p2.evaluate(() => [...document.querySelectorAll('use[href^="#"]')].map((u) => u.getAttribute('href').slice(1)).map((id) => ({ id, ok: !!document.getElementById(id) && document.getElementById(id).tagName.toLowerCase() === 'symbol' })));
  t.note('index.html <use> targets', idx);
  assert(idx.length >= 3, `index.html <use> elements found: ${idx.length}`);
  assert(idx.every((x) => x.ok), `index.html <use> targets that do not resolve: ${JSON.stringify(idx.filter((x) => !x.ok))}`);
  await p2.close();
});

test('T0-PGC-03', 'button reset is zero-specificity: chips >= 6:1, Play buttons >= 8:1, Compare toggles keep their designed 10px (C8)', async (t) => {
  const { page } = await freshPage();
  await open(page, 'search');
  await sleep(1200);
  const chips = [];
  for (let i = 0; i < 4; i++) chips.push(await contrastOf(page, `.filter-chip:nth-of-type(${i + 1})`));
  t.note('chip contrast', chips);
  assert(chips.every((c) => c >= 6), `search chip contrast ${chips}`);
  const chipH = await page.evaluate(() => document.querySelector('.filter-chip').getBoundingClientRect().height);
  assert(chipH >= 44, `chip height ${chipH}`);
  const play = {};
  for (const name of ['camera', 'ground-remembers', 'immersive', 'watch-together']) {
    await open(page, name);
    await sleep(600);
    play[name] = await contrastOf(page, '.play-btn');
  }
  t.note('play-btn contrast', play);
  assert(Object.values(play).every((c) => c >= 8), `play button contrast ${JSON.stringify(play)}`);
  await open(page, 'compare');
  await sleep(600);
  const fs = await page.evaluate(() => [...document.querySelectorAll('.toggle-btn')].map((b) => getComputedStyle(b).fontSize));
  assert(fs.length === 8 && fs.every((x) => x === '10px'), `compare toggle font sizes ${fs}`);
  await page.close();
});

test('T0-PGC-04', 'Compare toggle rows wrap inside a 375px phone pane instead of clipping (S4)', async () => {
  const { page } = await freshPage('phone');
  await open(page, 'compare');
  await sleep(800);
  const r = await page.evaluate(() => {
    document.getElementById('split').style.display = 'flex';
    return [...document.querySelectorAll('.pane-controls')].map((pc) => { const b = pc.getBoundingClientRect(); return [...pc.querySelectorAll('.toggle-btn')].every((t) => t.getBoundingClientRect().right <= b.right + 1); });
  });
  assert(r.length === 2 && r.every(Boolean), `toggle buttons overflow their pane controls: ${r}`);
  await page.close();
});

test('T0-PGC-05', 'axe color-contrast = 0 on search, camera, compare, ground-remembers, immersive, watch-together (WP-T0-11 acceptance) and on the 6 other pages that share only the footer', async (t) => {
  const bad = {};
  // the six pages of the WP-T0-11 acceptance, plus the other pages that only share the footer (education's blue palette needed the footer-link colour too)
  for (const name of ['search', 'camera', 'compare', 'ground-remembers', 'immersive', 'watch-together', 'education', 'aftermath', 'documentary', 'turning-points', 'viewshed', 'find-ancestor']) {
    const { page } = await freshPage();
    await open(page, name);
    await sleep(1500);
    const v = await axeViolations(page, { rules: ['color-contrast'] });
    if (v.length) bad[name] = v;
    await page.close();
  }
  t.note('violations', bad);
  assertEq(bad, {}, 'axe color-contrast violations');
});

test('T0-PGC-06', 'axe: 0 serious/critical on the 12 patched sub-pages (X10, desktop) and on dashboard at 375px (scrollable chart region)', async (t) => {
  const bad = {};
  for (const name of PATCHED_12) {
    const { page } = await freshPage();
    await open(page, name);
    await sleep(1800);
    const v = await axeViolations(page);
    if (v.length) bad[name] = v;
    await page.close();
  }
  const { page } = await freshPage('phone');
  await open(page, 'dashboard');
  await sleep(2000);
  const v = await axeViolations(page);
  if (v.length) bad['dashboard@375'] = v;
  await page.close();
  t.note('violations', bad);
  assertEq(bad, {}, 'axe serious/critical violations');
});

test('T0-PGC-07', 'layout shift: CLS <= 0.02 on 6 data pages at 375x812 and 1280x800 with data held back 800 ms (footer/nav reservation)', async (t) => {
  // the reservation itself: the six pages that fill their <main> after a fetch opt in, and the shared rule exists
  for (const name of ['search', 'education', 'documentary', 'living-ledger', 'dashboard', 'historian']) assert(/<main class="gtbg-fill">/.test(readDist(name + '.html')), name + ' is missing main.gtbg-fill');
  assert(/main\.gtbg-fill\s*\{[^}]*min-height/.test(readDist('site-nav.css')), 'site-nav.css has no main.gtbg-fill rule');
  const worst = {};
  for (const kind of ['phone', 'desktop']) {
    for (const name of ['search', 'education', 'documentary', 'living-ledger', 'dashboard', 'historian']) {
      const { page } = await freshPage(kind, { init: [clsProbe] });
      await open(page, name, { delay: 800 });
      await sleep(2600);
      const cls = await page.evaluate(() => +window.__cls.toFixed(3));
      worst[`${name}@${kind}`] = cls;
      await page.close();
    }
  }
  t.note('CLS', worst);
  const over = Object.entries(worst).filter(([, v]) => v > 0.02);
  assert(!over.length, `CLS above 0.02: ${JSON.stringify(over)}`);
});

test('T0-PGC-08', 'Historian pin glow animation is gone (no infinite box-shadow recalcs); nav height reserved = real nav height', async () => {
  const { page } = await freshPage();
  await open(page, 'search');
  await sleep(1500);
  const n = await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === 'gtbg-pin-glow').length);
  assertEq(n, 0, 'running gtbg-pin-glow animations');
  const nav = await page.evaluate(() => document.getElementById('gtbg-nav').getBoundingClientRect().height);
  assertEq(nav, 55, 'nav height (the reserved #gtbg-nav-mount min-height is 55px)');
  assert(/#gtbg-nav-mount\s*\{[^}]*min-height:\s*55px/.test(readDist('site-nav.css')), 'site-nav.css does not reserve the nav height');
  await page.close();
});

test('T0-PGC-09', 'every page links site-nav.css/js with ?v=<release id> and no unversioned link remains (cache-busting)', async (t) => {
  const rid = IS_LEGACY ? null : JSON.parse(readDist('version.json')).release;
  assert(rid, 'version.json release id missing (this tree is not a release)');
  const bad = [];
  for (const name of [...NAV_PAGES, 'index']) {
    const html = readDist(`${name}.html`);
    const css = html.includes(`href="/site-nav.css?v=${rid}"`), js = html.includes(`src="/site-nav.js?v=${rid}"`);
    const unversioned = /(?:href|src)="\/site-nav\.(?:css|js)"/.test(html);
    if (!css || !js || unversioned) bad.push({ name, css, js, unversioned });
  }
  t.note('release id', rid);
  assertEq(bad, [], 'pages with a missing or unversioned shared-layer link');
});

// ------------------------------------------------------------------------------------------------------------------ dashboard
test('T0-PGC-10', 'dashboard: chart draws in svg#strength-chart (>= 24 children, one line per corps) under 0/300/1500/4000 ms data delay (C7)', async (t) => {
  const corps = CASUALTY.union_corps.length + CASUALTY.confederate_corps.length;
  const seen = {};
  for (const delay of [0, 300, 1500, 4000]) {
    const { page, S } = await freshPage();
    await open(page, 'dashboard', { delay });
    await waitFor(() => page.evaluate(() => getComputedStyle(document.getElementById('chart-wrap')).display !== 'none'), { timeout: 12000, label: `chart visible @${delay}` }).catch(() => {});
    await sleep(600);
    const r = await page.evaluate(() => { const s = document.getElementById('strength-chart') || document.getElementById('chart'); return { tag: s && s.tagName.toLowerCase(), kids: s ? s.childElementCount : -1, lines: document.querySelectorAll('path.corps-line').length, visibleLines: [...document.querySelectorAll('#chart-wrap path.corps-line')].length }; });
    seen[`@${delay}ms`] = r;
    assert(r.tag === 'svg' && r.kids >= 24, `@${delay}ms: chart svg has ${r.kids} children (tag ${r.tag})`);
    assertEq(r.visibleLines, corps, `@${delay}ms: corps lines inside the visible chart`);
    assert(!S.collector.firstParty.length, `@${delay}ms: errors ${JSON.stringify(S.collector.firstParty)}`);
    await page.close();
  }
  t.note('chart', seen);
});

test('T0-PGC-11', 'dashboard: notable-intensity cards read as titled Union/Confederate cards; no undefined, raw keys, developer data note or warning glyphs (C7, H7)', async (t) => {
  const { page } = await freshPage();
  await open(page, 'dashboard');
  await waitFor(() => page.evaluate(() => document.querySelectorAll('.stat-card').length >= 5), { timeout: 10000, label: 'stat cards' });
  const r = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.stat-card')].map((c) => ({ num: c.querySelector('.num').textContent, lbl: c.querySelector('.lbl').textContent, note: c.querySelector('.note').textContent })), text: document.body.innerText }));
  t.note('cards', r.cards.map((c) => `${c.lbl}: ${c.num}`));
  noJunk(r.text, 'dashboard');
  assert(!/highest_single_regiment_rate|_/.test(r.cards.map((c) => c.lbl).join(' ')), 'a card label still shows a snake_case key');
  const titles = r.cards.map((c) => c.lbl);
  assert(titles.includes('Highest regimental loss rate, Union') && titles.includes('Highest regimental loss rate, Confederate'), `nested notes must give two labelled cards: ${titles}`);
  const un = r.cards.find((c) => c.lbl === 'Highest regimental loss rate, Union'), cf = r.cards.find((c) => c.lbl === 'Highest regimental loss rate, Confederate');
  assert(un.num === '85.5%' && /1st Minnesota/.test(un.note), `union card ${JSON.stringify(un)}`);
  assert(cf.num === '69.7%' && /26th North Carolina/.test(cf.note), `confederate card ${JSON.stringify(cf)}`);
  assert(!/Data note|reconciled|source data flags/.test(r.text) && !r.text.includes('⚠'), 'developer data note / warning glyph still visible');
  assert(!/ -- /.test(r.cards.map((c) => c.note).join(' ')), 'raw " -- " left in a card note');
  await page.close();
});

test('T0-PGC-12', 'dashboard on a 375px phone: layout viewport stays 375, no page-level horizontal scroll, chart scrolls inside its own region (S4)', async (t) => {
  const { page } = await freshPage('phone');
  await open(page, 'dashboard');
  await waitFor(() => page.evaluate(() => document.querySelectorAll('.stat-card').length >= 5), { timeout: 10000, label: 'stat cards' });
  await sleep(500);
  const r = await page.evaluate(() => { const w = document.getElementById('chart-wrap'); return { innerWidth, scrollWidth: document.documentElement.scrollWidth, wrapScrolls: w.scrollWidth > w.clientWidth, wrapFocusable: w.tabIndex === 0, svgW: Math.round((document.getElementById('strength-chart') || document.body).getBoundingClientRect().width) }; });
  t.note('phone layout', r);
  assertEq(r.innerWidth, 375, 'layout viewport width (446 when the unbreakable card title widens it)');
  assert(r.scrollWidth <= 375, `page scrollWidth ${r.scrollWidth}`);
  assert(r.svgW >= 600, `chart width ${r.svgW}`);
  assert(!r.wrapScrolls || r.wrapFocusable, 'scrolling chart region must be keyboard focusable');
  await page.close();
});

// ------------------------------------------------------------------------------------------------------------------ report / regiment
async function searchBinds(name, inputSel, resultSel) {
  const { page } = await freshPage();
  await open(page, name, { delay: 2500 });
  await sleep(3800);   // the data (and with it the listener) arrives at ~2.5 s
  await page.fill(inputSel, '20th Maine');
  await sleep(500);
  const n = await page.evaluate((s) => document.querySelectorAll(s).length, resultSel);
  await page.close();
  return n;
}
test('T0-PGC-13', 'report and regiment: the search box binds even when the data is slow (S1: sprite <symbol id="search"> used to win getElementById)', async (t) => {
  const r = { report: await searchBinds('report', '#report-search, #search', '.match'), regiment: await searchBinds('regiment', '#regiment-search, #search', '.match-row') };
  t.note('matches for "20th Maine" after a 2.5 s data delay', r);
  assert(r.report >= 1, `report search returned ${r.report} matches`);
  assert(r.regiment >= 1, `regiment search returned ${r.regiment} matches`);
});

test('T0-PGC-14', 'report: Confederate cavalry shows its brigade without "undefined"; alias stub is not offered; computed rate replaces the dash; empty rows are hidden', async (t) => {
  const { page } = await freshPage();
  await open(page, 'report');
  await sleep(1500);
  const input = page.locator('#report-search, #search').first();
  await input.fill('1st South Carolina Cavalry');
  await sleep(300);
  await page.locator('.match').first().click();
  const cav = await page.evaluate(() => ({ corps: document.getElementById('r-corps').textContent, text: document.getElementById('report').innerText }));
  t.note('cavalry report corps row', cav.corps);
  noJunk(cav.text, 'cavalry report');
  assertEq(cav.corps, 'C-CAV-1', 'corps / brigade row');
  await input.fill('14th Brooklyn');
  await sleep(300);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.match')].map((m) => m.textContent));
  t.note('matches for 14th Brooklyn', labels);
  assert(labels.length >= 1 && labels.every((l) => !/alias for/i.test(l)), `alias stub offered: ${labels}`);
  await page.locator('.match').first().click();
  const bk = await page.evaluate(() => ({ title: document.getElementById('r-title').textContent, strength: document.getElementById('r-strength').textContent }));
  assert(/84th New York/.test(bk.title) && bk.strength === '318', `Brooklyn report: ${JSON.stringify(bk)}`);
  // a record with strength + casualties but no casualty_percentage
  const lacking = REGIMENTS.find((r) => r.casualty_percentage == null && r.strength > 0 && r.casualties != null && !r.alias_for && REGIMENTS.filter((x) => x.designation === r.designation).length === 1);
  const want = `${Math.round(lacking.casualties / lacking.strength * 1000) / 10}%`;
  await input.fill(lacking.designation);
  await sleep(300);
  await page.locator('.match', { hasText: lacking.designation }).first().click();
  const rate = await page.evaluate(() => { const el = document.getElementById('r-rate'); return { text: el.textContent, hidden: el.parentElement.style.display === 'none' }; });
  t.note('record without casualty_percentage', { designation: lacking.designation, want, got: rate.text });
  assertEq(rate.text, want, 'computed casualty rate');
  const dashes = await page.evaluate(() => [...document.querySelectorAll('#report .row')].filter((r) => r.style.display !== 'none' && /—/.test(r.innerText)).length);
  assertEq(dashes, 0, 'visible report rows that still print a dash');
  await page.close();
});

test('T0-PGC-15', 'regiment: alias stub is not searchable, ?unit=U-14BK opens the real unit, cavalry shows no "undefined", rate computed instead of a dash', async (t) => {
  const { page } = await freshPage();
  await open(page, 'regiment', { query: '?unit=U-14BK' });
  await waitFor(() => page.evaluate(() => getComputedStyle(document.getElementById('bio')).display !== 'none'), { timeout: 10000, label: 'bio shown' });
  const title = await page.evaluate(() => document.getElementById('b-title').textContent);
  assert(/84th New York/.test(title), `alias link opened "${title}"`);
  const input = page.locator('#regiment-search, #search').first();
  await input.fill('14th Brooklyn');
  await sleep(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.match-row')].map((m) => m.textContent));
  t.note('rows', rows);
  assert(rows.length >= 1 && rows.every((x) => !/alias for/i.test(x)), `alias stub offered: ${rows}`);
  await input.fill('1st South Carolina Cavalry');
  await sleep(300);
  await page.locator('.match-row').first().click();
  noJunk(await page.evaluate(() => document.getElementById('bio').innerText), 'cavalry biography');
  const lacking = REGIMENTS.find((r) => r.casualty_percentage == null && r.strength > 0 && r.casualties != null && !r.alias_for && REGIMENTS.filter((x) => x.designation === r.designation).length === 1);
  await input.fill(lacking.designation);
  await sleep(300);
  await page.locator('.match-row', { hasText: lacking.designation }).first().click();
  const rate = await page.evaluate(() => document.getElementById('b-rate').textContent);
  assertEq(rate, `${Math.round(lacking.casualties / lacking.strength * 1000) / 10}%`, `computed rate for ${lacking.designation}`);
  await page.close();
});

// ------------------------------------------------------------------------------------------------------------------ living ledger
test('T0-PGC-16', 'ledger: opens at 0 (not 4), ends on the dataset total (not +838), and its clock runs (sprite <symbol id="clock">) (pages-C-75)', async (t) => {
  const { page } = await freshPage();
  await open(page, 'living-ledger');
  await waitFor(() => page.evaluate(() => getComputedStyle(document.getElementById('content')).display !== 'none'), { timeout: 10000, label: 'ledger content' });
  const start = await page.evaluate(() => ({ count: document.getElementById('count').textContent, u: document.getElementById('s-union').textContent, c: document.getElementById('s-conf').textContent, clock: document.getElementById('clock').textContent }));
  assertEq([start.count, start.u, start.c], ['0', '0', '0'], 'counts at tick 1');
  await page.selectOption('#speed', '10');
  await page.click('#play-btn');
  await sleep(600);
  const during = await page.evaluate(() => document.getElementById('clock').textContent);
  assert(during !== start.clock, `clock text did not change while playing (${start.clock} -> ${during})`);
  await waitFor(() => page.evaluate(() => /Play/.test(document.getElementById('play-btn').textContent) && !/Pause/.test(document.getElementById('play-btn').textContent)), { timeout: 40000, interval: 250, label: 'ledger reached tick 675' });
  const end = await page.evaluate(() => ({ count: document.getElementById('count').textContent, u: document.getElementById('s-union').textContent, c: document.getElementById('s-conf').textContent }));
  t.note('end of the ledger', end);
  const fmt = (n) => n.toLocaleString('en-US');
  assertEq([end.count, end.u, end.c], [fmt(LEDGER.union + LEDGER.conf), fmt(LEDGER.union), fmt(LEDGER.conf)], 'counts at tick 675 (sum of the engagement periods)');
  await page.close();
});

// ------------------------------------------------------------------------------------------------------------------ historian
test('T0-PGC-17', 'historian: chronology answers print the event (not "undefined"), no raw formation ids in prose, counts computed from the loaded data (pages-C-16)', async (t) => {
  const { page } = await freshPage();
  await open(page, 'historian');
  await waitFor(() => page.evaluate(() => getComputedStyle(document.getElementById('ask-row')).display !== 'none'), { timeout: 10000, label: 'ask row' });
  const ask = async (q) => { await page.fill('#ask', q); await page.press('#ask', 'Enter'); await sleep(400); };
  await ask('Both armies consolidate overnight positions');
  await ask('20th Maine');
  await ask("Devil's Den");
  const msgs = await page.evaluate(() => [...document.querySelectorAll('#transcript .msg.bot')].map((m) => m.innerText));
  const all = msgs.join('\n');
  t.note('answers', msgs.length);
  noJunk(all, 'historian transcript');
  assert(/Both armies consolidate overnight positions/.test(all), 'the chronology answer must print the event text');
  assert(!/\b[UC]-[IVX]+(-\d+)*\b/.test(all), `raw formation ids in prose: ${all.match(/.{0,30}\b[UC]-[IVX]+(-\d+)*\b.{0,10}/)?.[0]}`);
  assert(/Source: chronology, Day \d/.test(all), 'chronology answers name their source');
  const how = await page.evaluate(() => document.getElementById('how').textContent);
  const regs = REGIMENTS.filter((r) => !r.alias_for).length;
  const ev = [1, 2, 3].reduce((s, d) => s + readJson(`data/chronology_day${d}.json`).events.length, 0);
  t.note('intro text', how);
  assert(how.includes(`${regs} regiments`) && how.includes(`${ev} events`) && how.includes('24 stories') && how.includes('30 places'), `intro counts: ${how}`);
  assert(!/traces back to a real row|live AI model/.test(await bodyText(page)), 'over-claiming intro copy is still there');
  await page.close();
});

test('T0-PGC-18', 'historian: the newest answer clears the sticky ask bar after a question (desktop and phone) (pages-C-14)', async (t) => {
  const gaps = {};
  for (const kind of ['desktop', 'phone']) {
    const { page } = await freshPage(kind);
    await open(page, 'historian');
    await waitFor(() => page.evaluate(() => getComputedStyle(document.getElementById('ask-row')).display !== 'none'), { timeout: 10000, label: 'ask row' });
    for (const q of ['Little Round Top', "Pickett's Charge"]) {
      await page.fill('#ask', q);
      await page.press('#ask', 'Enter');
      await sleep(1800);   // smooth scroll settles
    }
    const r = await page.evaluate(() => { const msgs = document.querySelectorAll('#transcript .msg'); const last = msgs[msgs.length - 1].getBoundingClientRect(); const bar = document.getElementById('ask-row').getBoundingClientRect(); return { lastBottom: Math.round(last.bottom), barTop: Math.round(bar.top), scrollable: document.documentElement.scrollHeight > innerHeight }; });
    gaps[kind] = r;
    assert(r.scrollable, `${kind}: page must be scrollable for this check`);
    assert(r.lastBottom <= r.barTop + 1, `${kind}: last answer bottom ${r.lastBottom} is under the ask bar (top ${r.barTop})`);
    await page.close();
  }
  t.note('positions', gaps);
});

// ------------------------------------------------------------------------------------------------------------------ Watch Together / Immersive
const XSS_NOTE = '<img src=x onerror="window.__xss=(window.__xss||0)+1"><script>window.__xss=(window.__xss||0)+1</script>';
/** Watch Together with the mapboxgl stand-in; `seed` (a JSON string) is written to the page's localStorage before any script runs */
async function wtPage(seed) {
  const seedScript = seed ? `try{localStorage.setItem('gtbg_watch_together_tour', ${JSON.stringify(seed)})}catch(e){}` : null;
  return freshPage('desktop', { init: seedScript ? [staticStub, seedScript] : [staticStub] });
}
test('T0-PGC-19', 'Watch Together: a stored tour with markup in a note or tick renders as text and runs nothing (stored XSS, pages-C-46)', async (t) => {
  const seed = JSON.stringify([{ tick: 5, note: XSS_NOTE }, { tick: '<img src=x onerror="window.__xss=9">', note: 'bad tick' }, { tick: 9999, note: 'out of range' }, { tick: 12, note: 'ok' }]);
  const { page } = await wtPage(seed);
  page.on('dialog', (d) => d.dismiss());
  await open(page, 'watch-together');
  await waitFor(() => page.evaluate(() => document.querySelectorAll('#stops .stop-row').length >= 1), { timeout: 10000, label: 'stop rows' });
  await sleep(500);
  const r = await page.evaluate(() => ({ xss: window.__xss || 0, imgs: document.querySelectorAll('#stops img, #stops script').length, rows: [...document.querySelectorAll('#stops .stop-row')].map((x) => x.innerText.replace(/\s+/g, ' ')), stored: JSON.parse(localStorage.getItem('gtbg_watch_together_tour') || '[]').length }));
  t.note('rows', r.rows);
  assertEq(r.xss, 0, 'script executions from a stored note');
  assertEq(r.imgs, 0, 'injected elements inside #stops');
  assert(r.rows.some((x) => x.includes('Tick 5') && x.includes('<img src=x')), 'the note must be shown literally as text');
  assert(r.rows.length === 2, `invalid stops (non-integer tick, tick out of 1..675) must be dropped: ${r.rows.length} rows`);
  await page.close();
});

test('T0-PGC-20', 'Watch Together: an imported tour file is validated (ticks, note length, count, size) and its notes are rendered as text', async (t) => {
  const { page } = await wtPage('[]');
  page.on('dialog', (d) => d.dismiss());
  await open(page, 'watch-together');
  await waitFor(() => page.evaluate(() => !!document.getElementById('import-input')), { timeout: 8000, label: 'page ready' });
  await sleep(500);
  const many = Array.from({ length: 150 }, (_, i) => ({ tick: (i % 675) + 1, note: `stop ${i}` }));
  const file = (obj) => ({ name: 'tour.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)) });
  await page.setInputFiles('#import-input', file({ type: 'gtbg-watch-together-tour', version: 1, stops: [{ tick: 7, note: XSS_NOTE + 'x'.repeat(400) }, { tick: 1e9, note: 'no' }, { tick: 'abc', note: 'no' }, { tick: 0, note: 'no' }] }));
  await sleep(700);
  let r = await page.evaluate(() => ({ xss: window.__xss || 0, rows: document.querySelectorAll('#stops .stop-row').length, imgs: document.querySelectorAll('#stops img, #stops script').length, noteLen: (document.querySelector('#stops .stop-note') || { textContent: '' }).textContent.length, stored: JSON.parse(localStorage.getItem('gtbg_watch_together_tour') || '[]') }));
  t.note('after the first import', { rows: r.rows, noteLen: r.noteLen });
  assertEq(r.xss, 0, 'script executions from an imported note');
  assertEq(r.imgs, 0, 'injected elements inside #stops');
  assertEq(r.rows, 1, 'valid stops kept');
  assert(r.noteLen <= 280, `note kept ${r.noteLen} characters`);
  assert(r.stored.length === 1 && r.stored[0].note.length <= 280, `persisted tour ${JSON.stringify(r.stored).slice(0, 120)}`);
  await page.setInputFiles('#import-input', file({ type: 'gtbg-watch-together-tour', version: 1, stops: many }));
  await sleep(700);
  r = await page.evaluate(() => ({ rows: document.querySelectorAll('#stops .stop-row').length }));
  assertEq(r.rows, 100, 'at most 100 stops are kept');
  await page.close();
});

test('T0-PGC-21', 'Watch Together: "Add stop" with an empty, non-numeric or out-of-range tick adds nothing and says why; a valid tick adds one stop (pages-C-51)', async (t) => {
  const { page } = await wtPage('[]');
  page.on('dialog', (d) => d.dismiss());
  await open(page, 'watch-together');
  await waitFor(() => page.evaluate(() => !!document.getElementById('add-stop')), { timeout: 8000, label: 'page ready' });
  await sleep(500);
  const count = () => page.evaluate(() => document.querySelectorAll('#stops .stop-row').length);
  assertEq(await count(), 0, 'starting stops');
  await page.click('#add-stop');
  assertEq(await count(), 0, 'stops after an EMPTY tick (the old code added tick 1)');
  const msg = await page.evaluate(() => (document.getElementById('add-stop-msg') || { textContent: '' }).textContent);
  assert(/1 to 675/.test(msg), `no explanation shown: "${msg}"`);
  for (const bad of ['abc', '700', '0', '-4', '12.5']) {
    await page.fill('#new-tick', bad);
    await page.click('#add-stop');
    assertEq(await count(), 0, `stops after tick "${bad}"`);
  }
  await page.fill('#new-tick', '226');
  await page.fill('#new-note', 'Second day begins');
  await page.click('#add-stop');
  assertEq(await count(), 1, 'stops after a valid tick');
  const row = await page.evaluate(() => document.querySelector('#stops .stop-row').innerText.replace(/\s+/g, ' '));
  assert(row.includes('Tick 226') && row.includes('Second day begins'), `row "${row}"`);
  await page.close();
});

test('T0-PGC-22', 'Immersive: Pause suspends the audio context (drone stops), Play resumes it (pages-C-24)', async (t) => {
  const hook = () => {
    window.__acs = [];
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig { constructor(...a) { super(...a); window.__acs.push(this); } };
  };
  const { page } = await freshPage('desktop', { init: [staticStub, hook] });
  await open(page, 'immersive');
  await waitFor(() => page.evaluate(() => !!document.getElementById('enable-sound')), { timeout: 8000, label: 'page ready' });
  await sleep(600);
  await page.click('#enable-sound');
  await waitFor(() => page.evaluate(() => window.__acs.length === 1 && window.__acs[0].state === 'running'), { timeout: 8000, label: 'audio running after Enable Sound' });
  await page.click('#play-btn');
  await sleep(500);
  assertEq(await page.evaluate(() => window.__acs[0].state), 'running', 'state while playing');
  await page.click('#play-btn');   // Pause
  await sleep(700);
  const paused = await page.evaluate(() => window.__acs[0].state);
  t.note('state after Pause', paused);
  assertEq(paused, 'suspended', 'audio context after Pause (the 55 Hz drone kept running)');
  await page.click('#play-btn');   // Play again
  await sleep(700);
  assertEq(await page.evaluate(() => window.__acs[0].state), 'running', 'state after Play resumes');
  await page.close();
});

// ------------------------------------------------------------------------------------------------------------------ AR hidden, dev pages
test('T0-PGC-23', 'AR hidden: out of every menu, the sitemap and the crawlable link list; ar.html is noindex, reachable, with an honest notice', async (t) => {
  const menu = await (async () => {
    const { page } = await freshPage();
    await open(page, 'search');
    await sleep(1500);
    await page.click('#gtbg-menu-btn');
    const links = await page.evaluate(() => [...document.querySelectorAll('#gtbg-menu-panel a')].map((a) => a.getAttribute('href')));
    const groups = await page.evaluate(() => window.GTBG_MENU.GROUPS.flatMap((g) => g.items.map((i) => i.id)));
    await page.close();
    return { links, groups };
  })();
  t.note('menu links', menu.links.length);
  assert(!menu.links.includes('/ar.html') && !menu.groups.includes('ar'), 'AR is still in the nav menu');
  assert(menu.links.length === 19, `menu should now list 19 pages, has ${menu.links.length}`);
  const idx = readDist('index.html');
  assert(!/href="\/ar\.html"/.test(idx), 'index.html still links ar.html (crawlable list)');
  const sm = readDist('sitemap.xml');
  assert(!/ar\.html/.test(sm), 'sitemap.xml still lists ar.html');
  assertEq((sm.match(/<loc>/g) || []).length, 20, 'sitemap URL count (21 before, minus ar.html)');
  const robots = readDist('robots.txt');
  assert(!/Disallow:\s*\/ar/i.test(robots), 'robots.txt must not block ar.html (noindex needs a crawl)');
  const ar = readDist('ar.html');
  assert(/<meta name="robots" content="noindex" \/>/.test(ar), 'ar.html has no noindex');
  assert(/<b>Beta\.<\/b>/.test(ar) && !/haven't been able to do from here/.test(ar), 'ar.html notice not replaced');
  const res = await fetch(`${ORIGIN}/ar.html`);
  assertEq(res.status, 200, 'direct link still works');
});

test('T0-PGC-24', 'dev pages retired: /diagnostics, /diagnostics.html, /unit-rendering-reference, /unit-rendering-reference.html answer 404 (with the site 404 page)', async (t) => {
  const seen = {};
  for (const p of ['/diagnostics', '/diagnostics.html', '/unit-rendering-reference', '/unit-rendering-reference.html']) {
    const r = await fetch(`${ORIGIN}${p}`);
    const body = await r.text();
    seen[p] = { status: r.status, is404Page: /This ground isn't on the map/.test(body) };
  }
  t.note('responses', seen);
  for (const [p, v] of Object.entries(seen)) assert(v.status === 404 && v.is404Page, `${p}: ${JSON.stringify(v)}`);
  assert(!fs.existsSync(path.join(DIST, 'diagnostics.html')) && !fs.existsSync(path.join(DIST, 'unit-rendering-reference.html')), 'the files are still in the publish tree');
});

test('T0-PGC-25', 'viewshed and AR carry plain copy: no build narration ("Earlier drafts", "from here")', async () => {
  const v = readDist('viewshed.html'), a = readDist('ar.html');
  assert(!/Earlier drafts|this deployment doesn't have access/.test(v) && /<b>Elevation only\.<\/b>/.test(v), 'viewshed caveat');
  assert(!/we haven't been able to do from here/.test(a), 'ar caveat');
  const d = readDist('dashboard.html');
  assert(!/reads <code>\/data\/casualty_apportionment\.json<\/code> directly/.test(d), 'dashboard error copy still names the data file');
});

// ------------------------------------------------------------------------------------------------------------------ no regressions
test('T0-PGC-26', '0 uncaught exceptions / first-party console errors and no "undefined" on 12 non-map pages (desktop and phone)', async (t) => {
  const bad = {};
  for (const kind of ['desktop', 'phone']) {
    for (const name of NON_MAP) {
      const { page, S } = await freshPage(kind);
      await open(page, name);
      await sleep(2200);
      const text = await bodyText(page);
      const errs = S.collector.firstParty.map((e) => e.text.slice(0, 100));
      const junk = /undefined|\bNaN\b/.test(text);
      if (errs.length || junk) bad[`${name}@${kind}`] = { errs, junk };
      await page.close();
    }
  }
  t.note('problems', bad);
  assertEq(bad, {}, 'pages with errors or "undefined"');
}, { red: true });

test('T0-PGC-27', 'legacy/ untouched: git reports no change under legacy/ and the pinned tree gate passes', async () => {
  const st = spawnSync('git', ['status', '--porcelain', '--', 'legacy'], { cwd: REPO, encoding: 'utf8' });
  assertEq(st.stdout.trim(), '', 'git status of legacy/');
  const md5 = spawnSync('node', ['-e', "const c=require('crypto'),f=require('fs');console.log(c.createHash('md5').update(f.readFileSync('legacy/dist/assets/index-Cg8FAMXN.js')).digest('hex'))"], { cwd: REPO, encoding: 'utf8' });
  assertEq(md5.stdout.trim(), '7ef75b95f4c02700430b8aa91e3a7459', 'pinned main bundle md5');
}, { red: false });

// ------------------------------------------------------------------------------------------------------------------ real Mapbox smoke (opt-in)
if (REAL_MAPS) {
  test('T0-PGC-28', 'real Mapbox (harness Referer, shared budget): Watch Together with a hostile stored tour and Immersive with Pause both work with the real library', async (t) => {
    const S = await openSession({ profile: 'pgc-real', cdpPort: PORT_BASE + 3, tiles: 'inject', onboarded: false, viewport: DESKTOP });
    sessions.real = S;
    const page = S.page;
    page.on('dialog', (d) => d.dismiss());
    await page.addInitScript(`try{localStorage.setItem('gtbg_watch_together_tour', ${JSON.stringify(JSON.stringify([{ tick: 5, note: XSS_NOTE }]))})}catch(e){}`);
    S.collector.clear();
    await page.goto(`${ORIGIN}/watch-together.html`, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => document.querySelectorAll('#stops .stop-row').length === 1 && !!document.querySelector('#map canvas')), { timeout: 30000, label: 'WT stop row + map canvas' });
    const wt = await page.evaluate(() => ({ xss: window.__xss || 0, imgs: document.querySelectorAll('#stops img').length }));
    assertEq(wt, { xss: 0, imgs: 0 }, 'WT with the real library');
    t.note('WT mapbox requests so far', tileBudget.used);
    await page.addInitScript(() => { window.__acs = []; const O = window.AudioContext; window.AudioContext = class extends O { constructor(...a) { super(...a); window.__acs.push(this); } }; });
    await page.goto(`${ORIGIN}/immersive.html`, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => !!document.querySelector('#map canvas')), { timeout: 30000, label: 'immersive map canvas' });
    await page.click('#enable-sound');
    await waitFor(() => page.evaluate(() => window.__acs.length === 1 && window.__acs[0].state === 'running'), { timeout: 8000, label: 'audio running' });
    await page.click('#play-btn'); await sleep(400); await page.click('#play-btn'); await sleep(600);
    assertEq(await page.evaluate(() => window.__acs[0].state), 'suspended', 'state after Pause with the real library');
    assert(!S.collector.firstParty.length, `errors with the real library: ${JSON.stringify(S.collector.firstParty)}`);
    t.note('mapbox requests used', tileBudget.used);
  }, { red: false });
}

// ------------------------------------------------------------------------------------------------------------------ run
const ids = [...RED];
let summary;
try {
  const filter = EXPECT_RED ? `^(${ids.filter((i) => !FILTER || new RegExp(FILTER, 'i').test(i)).join('|')})$` : FILTER;
  const outFile = IS_LEGACY ? path.join(TMP, 'test-pages-core-legacy.json') : path.join(path.dirname(DIST), 'test-pages-core.json');
  summary = await suite.run({ filter, outFile, extra: () => ({ dist: path.relative(REPO, DIST), mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap}`);
} finally {
  for (const s of Object.values(sessions)) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
if (EXPECT_RED) {
  const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
  console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed on this tree: ${summary.results.filter((r) => r.status !== 'fail').map((r) => r.id)}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);
