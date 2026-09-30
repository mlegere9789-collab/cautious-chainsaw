// T0-A11Y suite (chapter 02 WP-T0-10, exit criterion X10): the accessibility BRIDGE (group AX: 58 bundle/HTML/CSS patches) proved with
// axe-core (@axe-core/playwright) in real Chrome, plus keyboard, structure, motion, font-floor, target-size and forced-colors checks.
//
// THIS IS A BRIDGE, NOT CONFORMANCE.  app-a11y grades the app D by code (26 of 55 WCAG 2.2 A/AA criteria still fail after the bridge:
// canvas keyboard/SR access, dialog system, colour-only encodings, Data View ...; docs/plan/specialists/app-a11y.md section 4).  axe finds
// roughly a third of WCAG issues; "0 serious/critical" below means "axe finds none in these states", nothing more.  Lighthouse itself is
// not installed here (and is not downloaded): T0-A11Y-08 runs axe with the rule ids of Lighthouse's accessibility category instead.
//
//   node tests/t0/a11y.spec.mjs                            builds R1c into tmp/<agent>/spec-build/R1c and tests it
//   node tests/t0/a11y.spec.mjs --train R1b                same for R1b (AX without CP)
//   node tests/t0/a11y.spec.mjs --dist release/R1c/dist    any built tree (no build)
//   node tests/t0/a11y.spec.mjs --filter 'A11Y-0[1-3]'     test-id subset
//   node tests/t0/a11y.spec.mjs --tiles inject             real Mapbox tiles (production Referer, <= T0_TILE_CAP requests); default: blocked
//   node tests/t0/a11y.spec.mjs --dist legacy/dist --expect-red --filter 'A11Y-0[1-2]'   red-first proof: the legacy tree FAILS
//
// Env: T0_AGENT (scratch dir, default ax), T0_PORT_BASE (static server = base, Chrome CDP = base+1..), T0_TILE_CAP.
process.env.T0_AGENT ||= 'ax';
process.env.T0_PORT_BASE ||= '8360';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const { spawnSync } = await import('node:child_process');
const { AxeBuilder } = await import('@axe-core/playwright');
const { REPO, TMP, PORT_BASE, VIEWPORTS, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, emulateViewport, tileBudget, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const TRAIN = String(opt('train', 'R1c'));
const FILTER = opt('filter', null);
const TILES = String(opt('tiles', 'block'));
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'a11y-results.json')));
let DIST;
if (opt('dist', null)) DIST = path.resolve(REPO, opt('dist'));
else {
  const out = path.join(TMP, 'spec-build', TRAIN);
  console.log(`building ${TRAIN} -> ${path.relative(REPO, out)}`);
  const r = spawnSync('python', ['tools/t0/build.py', '--train', TRAIN, '--out', path.relative(REPO, out).replace(/\\/g, '/')], { cwd: REPO, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) { console.error(r.stdout.slice(-2500), r.stderr.slice(-800)); process.exit(2); }
  DIST = path.join(out, 'dist');
}
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(2); }
const IS_LEGACY = path.resolve(DIST) === path.resolve(REPO, 'legacy/dist');

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = [];
// never load the owner's Google Maps key (Soldier's Eye View / walkthrough Street View): those requests fail locally (not in the real-tiles test)
const GOOGLE = /^https:\/\/(www\.google\.com\/maps|maps\.googleapis\.com|maps\.gstatic\.com|www\.gstatic\.com)/i;
const NOISE = /maps\.googleapis|maps\.gstatic|google\.com\/maps|Permissions policy violation|ERR_BLOCKED_BY_CLIENT/i;
const errs = (S) => S.collector.firstParty.filter((e) => !NOISE.test(e.text) && !NOISE.test(e.url || ''));
const open = async (o) => { const s = await openSession({ tiles: 'block', ...o });        // only the real-tiles test (a11y-14) spends Mapbox requests
   if (o.profile !== 'a11y-14') await s.context.route(GOOGLE, (r) => r.abort('blockedbyclient')); sessions.push(s); return s; };
const closeAll = async () => { for (const s of sessions.splice(0)) await s.close().catch(() => {}); await srv.close(); };
process.on('unhandledRejection', (e) => { console.error(e); });

const PHONE = VIEWPORTS.portrait.find((v) => v.width === 375);
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
// the rule ids of Lighthouse's accessibility category (Lighthouse 12/13 audits; each is an axe-core rule)
const LH_RULES = ['accesskeys', 'aria-allowed-attr', 'aria-allowed-role', 'aria-command-name', 'aria-conditional-attr', 'aria-deprecated-role', 'aria-dialog-name', 'aria-hidden-body',
  'aria-hidden-focus', 'aria-input-field-name', 'aria-meter-name', 'aria-progressbar-name', 'aria-prohibited-attr', 'aria-required-attr', 'aria-required-children', 'aria-required-parent',
  'aria-roles', 'aria-text', 'aria-toggle-field-name', 'aria-tooltip-name', 'aria-treeitem-name', 'aria-valid-attr-value', 'aria-valid-attr', 'button-name', 'bypass', 'color-contrast',
  'definition-list', 'dlitem', 'document-title', 'duplicate-id-aria', 'form-field-multiple-labels', 'frame-title', 'heading-order', 'html-has-lang', 'html-lang-valid', 'html-xml-lang-mismatch',
  'image-alt', 'image-redundant-alt', 'input-button-name', 'input-image-alt', 'label', 'link-in-text-block', 'link-name', 'list', 'listitem', 'meta-refresh', 'meta-viewport', 'object-alt',
  'select-name', 'skip-link', 'tabindex', 'table-duplicate-name', 'table-fake-caption', 'target-size', 'td-has-header', 'td-headers-attr', 'th-has-data-cells', 'valid-lang', 'video-caption'];

// In-page text-contrast audit with its own compositing model.  axe reports many nodes as 'incomplete' (background could not be
// determined: the timeline bar sits behind a blurred layer and the map), e.g. white text on pale day buttons was invisible to axe.
// Model: walk up the ancestors compositing backgrounds over #050508 (the app root); fg alpha x element opacity; large text needs 3:1.
// Inactive (opacity < 0.5) buttons are exempt (WCAG 1.4.3 inactive components: the story-card arrows at the ends of a list).
const CONTRAST_AUDIT = () => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => { const a = top.a + bot.a * (1 - top.a); if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const base = { r: 5, g: 5, b: 8, a: 1 };            // the app root is #050508 (map canvas blocked/black in tests)
  const bgOf = (el) => { const chain = []; for (let p = el; p && p.nodeType === 1; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; } } let acc = base; for (let i = chain.length - 1; i >= 0; i--) acc = over(chain[i], acc); return acc; };
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('canvas,svg,.mapboxgl-ctrl,.gt-sr-only,script,style,iframe')) return;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    let op = 1; for (let p = el; p && p.nodeType === 1; p = p.parentElement) op *= +getComputedStyle(p).opacity;
    if (op < 0.5 && el.closest('button')) return;
    const fg0 = parse(cs.color); if (!fg0) return; const bg = bgOf(el);
    const fg = over({ ...fg0, a: fg0.a * op }, bg);
    const fs = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700; const large = fs >= 24 || (fs >= 18.66 && bold);
    const need = large ? 3 : 4.5; const cr = ratio(fg, bg);
    if (cr < need) out.push({ t: (el.textContent || '').trim().slice(0, 28), cr: +cr.toFixed(2), fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, fs, op: +op.toFixed(2), tag: el.tagName.toLowerCase() });
  });
  return out;
};

// ------------------------------------------------------------------ helpers
async function axe(page, { exclude = [], rules = null } = {}) {
  let b = new AxeBuilder({ page });
  b = rules ? b.options({ runOnly: { type: 'rule', values: rules } }) : b.withTags(WCAG_TAGS);
  for (const e of exclude) b = b.exclude(e);
  const r = await b.analyze();
  const sc = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  return { all: r.violations, sc, passes: r.passes.length, incomplete: r.incomplete.map((v) => `${v.id}(${v.nodes.length})`),
    fmt: (list = r.violations) => list.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ') + ' - ' + String(n.failureSummary || '').split('\n').slice(1, 2).join('').trim().slice(0, 140)).join(' | ')}`).join('; ') };
}
const key = async (page, k, ms = 500) => { await page.keyboard.press(k); await sleep(ms); };
const settle = (ms = 700) => sleep(ms);
async function boot(page, layout) {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await chooseLayout(page, layout);
  await waitForApp(page, 45000);
  await settle(2000);
}
const visible = (page, sel, timeout = 8000) => page.locator(sel).first().waitFor({ state: 'visible', timeout });
async function resetDesktop(page) { for (let i = 0; i < 2; i++) await key(page, 'Escape', 250); }
async function resetMobile(page) {
  for (let i = 0; i < 3; i++) {
    await key(page, 'Escape', 200);
    for (const sel of ['[aria-label="Close tools"]', '[aria-label="Close help"]', '[aria-label="Close"]']) {
      const l = page.locator(sel).first();
      if ((await l.count()) && (await l.isVisible().catch(() => false))) { await l.click({ timeout: 2000 }).catch(() => {}); await sleep(300); }
    }
  }
}
const fill = async (page, sel, text) => { await page.locator(sel).first().fill(text); await sleep(900); };

const DESKTOP_STATES = {
  loaded: async () => {},
  help: async (p) => { await key(p, '?', 400); await visible(p, 'text=Keyboard Shortcuts'); },
  search: async (p) => { await resetDesktop(p); await key(p, 's', 400); await visible(p, 'input[placeholder^="Name, state"]'); },
  filter: async (p) => { await resetDesktop(p); await key(p, 'f', 500); },
  roster: async (p) => { await resetDesktop(p); await p.click('button[title="Unit Roster"]'); await settle(900); },
  ancestor: async (p) => { await resetDesktop(p); await p.click('button[title="Follow Your Ancestor"]'); await visible(p, 'input[aria-label="Regiment name"]'); },
  bookmarks: async (p) => { await resetDesktop(p); await key(p, 'b', 500); await visible(p, '[role="dialog"]'); },
  layers: async (p) => { await resetDesktop(p); await p.click('button[title="Map Layers"]'); await settle(700); },
  monuments: async (p) => { await resetDesktop(p); await p.click('button[title="Monuments"]'); await settle(900); },
  soldier: async (p) => { await resetDesktop(p); await p.click('button[title^="Soldier"]'); await settle(900); },
  locations: async (p) => { await resetDesktop(p); await p.click('button[title="Locations"]'); await settle(700); },
  distance: async (p) => { await resetDesktop(p); await p.click('button[title="Distance Tool"]'); await settle(700); },
  findunit: async (p) => { await resetDesktop(p); await p.click('button[title="Find Unit / Location"]'); await settle(900); },
  efmenu: async (p) => { await resetDesktop(p); await p.click('#ef-btn'); await settle(700); },
  searchresults: async (p) => { await resetDesktop(p); await key(p, 's', 400); await fill(p, 'input[aria-label="Search units"]', 'a'); },
  unitpanel: async (p) => { await resetDesktop(p); await key(p, 's', 400); await fill(p, 'input[aria-label="Search units"]', '20th Maine'); await p.getByText('20th Maine').first().click(); await visible(p, 'button[title="Unpin unit"]', 10000).catch(() => {}); await settle(800); },
  ancestorpick: async (p) => { await resetDesktop(p); await p.click('button[title="Follow Your Ancestor"]'); await fill(p, 'input[aria-label="Regiment name"]', '20th Maine'); await p.getByText('20th Maine').first().click(); await settle(1800); },
  legendsides: async (p) => { await resetDesktop(p); await p.getByRole('button', { name: 'Sides' }).click(); await settle(400); },
  walkthrough: async (p) => { await resetDesktop(p); await p.getByText('Virtual Walkthrough').first().click(); await settle(1800); },
};
for (const n of [17, 302, 538]) {
  DESKTOP_STATES['tick' + n] = async (p) => { await resetDesktop(p); await p.goto(`${ORIGIN}/?tick=${n}`, { waitUntil: 'load' }); await chooseLayout(p, 'desktop'); await waitForApp(p, 45000); await settle(3500); };
}
const MOBILE_STATES = {
  loaded: async () => {},
  tools: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(800); },
  help: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(600); await p.getByText('Help', { exact: true }).first().click(); await settle(1300); },
  search: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(600); await p.getByText('Search', { exact: true }).first().click(); await settle(1000); },
  filter: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(600); await p.getByText('Filter', { exact: true }).first().click(); await settle(1000); },
  roster: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(600); await p.getByText('Unit Roster', { exact: true }).first().click(); await settle(1000); },
  legend: async (p) => { await resetMobile(p); await p.getByText('Tools').first().click(); await settle(600); await p.getByText('Legend', { exact: true }).first().click(); await settle(1000); },
};

const suite = createSuite('a11y-bridge');
const extra = () => ({ dist: path.relative(REPO, DIST).replace(/\\/g, '/'), train: IS_LEGACY ? 'legacy' : TRAIN, tiles: TILES, tileBudget: { ...tileBudget }, axeVersion: JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules/axe-core/package.json'), 'utf8')).version });
const F = {};

// each axe test opens its own session so a crash in one state cannot poison the next
async function axeStates(t, { profile, cdpPort, viewport, layout, states, onboarded = true, exclude = {}, label }) {
  const S = await open({ profile, cdpPort, viewport, onboarded });
  try {
    await boot(S.page, layout);
    const report = {}; const bad = [];
    for (const name of states) {
      const fn = (layout === 'mobile' ? MOBILE_STATES : DESKTOP_STATES)[name] || (async () => {});
      try { await fn(S.page); } catch (e) { bad.push(`${name}: state could not be reached (${e.message.split('\n')[0]})`); continue; }
      const r = await axe(S.page, { exclude: exclude[name] || [] });
      report[name] = { violations: r.all.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}`), seriousCritical: r.sc.length, passes: r.passes };
      if (r.sc.length) bad.push(`${name}: ${r.fmt(r.sc)}`);
    }
    t.note(label || 'axe', report);
    if (bad.length && !EXPECT_RED) throw new Error(bad.join(' || '));
    if (EXPECT_RED) { t.note('expect-red', bad.length ? 'RED as expected' : 'unexpectedly green'); assert(bad.length > 0, 'expected axe serious/critical violations on this tree, found none'); }
    return { S, report };
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
}

// ------------------------------------------------------------------ T0-A11Y-01: axe, desktop
suite.test('T0-A11Y-01', 'axe: 0 serious/critical on / desktop 1440x900 - first-visit onboarding modal, loaded, Help open, Search open (X10)', async (t) => {
  await axeStates(t, { profile: 'a11y-01a', cdpPort: PORT_BASE + 1, viewport: DESKTOP, layout: 'desktop', states: ['loaded', 'help', 'search'], label: 'axe desktop (returning visitor)' });
  if (IS_LEGACY) return;                     // legacy shows the layout chooser to first-time visitors: not the onboarding modal
  const S = await open({ profile: 'a11y-01b', cdpPort: PORT_BASE + 2, viewport: DESKTOP, onboarded: false });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitForApp(S.page, 45000); await settle(2000);
    const modal = await S.page.locator('text=How do you want to explore the battle?').count();
    assert(modal > 0, 'first-visit onboarding modal not shown');
    const r = await axe(S.page);
    t.note('axe desktop first visit (onboarding modal)', { violations: r.all.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}`), passes: r.passes });
    if (!EXPECT_RED) assertEq(r.sc.length, 0, `axe serious/critical on the first-visit modal: ${r.fmt(r.sc)}`);
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-02', 'axe: 0 serious/critical in the other desktop panels and dialogs (roster, filter, unit panel, ancestor, layers, distance, bookmarks, walkthrough ...)', async (t) => {
  if (IS_LEGACY) throw new Skip('extended states are only asserted on release trees');
  await axeStates(t, { profile: 'a11y-02', cdpPort: PORT_BASE + 3, viewport: DESKTOP, layout: 'desktop',
    states: ['filter', 'roster', 'ancestor', 'bookmarks', 'layers', 'monuments', 'soldier', 'locations', 'distance', 'findunit', 'efmenu', 'searchresults', 'unitpanel', 'ancestorpick', 'legendsides', 'walkthrough', 'tick17', 'tick302', 'tick538'],
    exclude: { walkthrough: ['iframe'], soldier: ['iframe'] }, label: 'axe desktop panels (Google requests blocked locally; iframes excluded)' });
});

suite.test('T0-A11Y-03', 'axe: 0 serious/critical on the phone shell 375x812 (touch) - first visit, loaded, Tools, Help, Search, Filter, Roster, Legend (X10 mobile)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy phone shell is group-C territory');
  await axeStates(t, { profile: 'a11y-03', cdpPort: PORT_BASE + 4, viewport: PHONE, layout: 'mobile', states: ['loaded', 'tools', 'help', 'search', 'filter', 'roster', 'legend'], label: 'axe phone 375x812' });
  const S = await open({ profile: 'a11y-03b', cdpPort: PORT_BASE + 5, viewport: PHONE, onboarded: false });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await waitForApp(S.page, 45000); await settle(2000);
    const r = await axe(S.page);
    t.note('axe phone first visit', { violations: r.all.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}`), passes: r.passes });
    if (!EXPECT_RED) assertEq(r.sc.length, 0, `axe serious/critical on the phone first visit: ${r.fmt(r.sc)}`);
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-04', 'axe: 0 serious/critical at 1920/1366/1280/1024 desktop and on a coarse-pointer 1024x768 tablet (header no longer overlaps)', async (t) => {
  if (IS_LEGACY) throw new Skip('viewport sweep is only asserted on release trees');
  const S = await open({ profile: 'a11y-04', cdpPort: PORT_BASE + 6, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const rows = {}; const bad = [];
    for (const vp of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1024, height: 768, mobile: true, dpr: 2, coarse: true }]) {
      await emulateViewport(S.page, { ...vp, dpr: vp.dpr || 1 });
      await S.page.reload({ waitUntil: 'load' });
      await chooseLayout(S.page, 'desktop'); await waitForApp(S.page, 45000); await settle(1500);
      for (const st of ['loaded', 'search']) {
        if (st === 'search') { await key(S.page, 's', 400); await visible(S.page, 'input[aria-label="Search units"]'); }
        const r = await axe(S.page);
        const id = `${vp.width}x${vp.height}${vp.coarse ? ' coarse' : ''} ${st}`;
        rows[id] = r.all.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}`);
        if (r.sc.length) bad.push(`${id}: ${r.fmt(r.sc)}`);
      }
      await resetDesktop(S.page);
    }
    t.note('axe by viewport', rows);
    assertEq(bad, [], 'serious/critical violations');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

// ------------------------------------------------------------------ T0-A11Y-05..: structure, slider, keyboard
suite.test('T0-A11Y-05', 'structure: one h1, main + nav landmarks, first Tab = "Skip to the map", its target exists and takes focus (desktop AND phone)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has no skip link');
  for (const [tag, viewport, layout, port] of [['desktop', DESKTOP, 'desktop', 7], ['phone', PHONE, 'mobile', 8]]) {
    const S = await open({ profile: `a11y-05-${tag}`, cdpPort: PORT_BASE + port, viewport });
    try {
      await boot(S.page, layout);
      const st = await S.page.evaluate(() => ({
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()), main: document.querySelectorAll('main').length, mainIsRoot: !!document.querySelector('main#root'),
        navs: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')), header: document.querySelectorAll('header').length,
        skip: [...document.querySelectorAll('a.gt-skip')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim(), targetExists: !!document.querySelector(a.getAttribute('href')) })),
        lang: document.documentElement.lang, title: document.title,
      }));
      t.note(tag, st);
      assertEq(st.h1.length, 1, `h1 count (${JSON.stringify(st.h1)})`);
      assert(st.main === 1 && st.mainIsRoot, '<main id="root"> landmark missing');
      assert(st.navs.includes('Extra features'), 'nav landmark for #extra-features missing');
      assert(st.skip.length === 2 && st.skip.every((s) => s.targetExists), `skip links / targets: ${JSON.stringify(st.skip)}`);
      assertEq(st.skip[0].href, '#gt-map', 'first skip link target');
      await S.page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
      await key(S.page, 'Tab', 200);
      const first = await S.page.evaluate(() => { const a = document.activeElement; return { text: a.textContent.trim(), href: a.getAttribute('href'), top: Math.round(a.getBoundingClientRect().top), cls: a.className }; });
      t.note(`${tag} first Tab`, first);
      assertEq([first.text, first.href], ['Skip to the map', '#gt-map'], 'first Tab stop');
      assert(first.top >= 0, 'focused skip link is off-screen');
      await key(S.page, 'Enter', 300);
      const landed = await S.page.evaluate(() => ({ id: document.activeElement.id, isMap: document.activeElement === document.getElementById('gt-map') }));
      t.note(`${tag} after Enter`, landed);
      assert(landed.isMap, `Enter on the skip link did not move focus to #gt-map (active: ${landed.id})`);
    } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
  }
});

suite.test('T0-A11Y-06', 'timeline slider: role slider named "Battle time", integer 1..675, aria-valuetext = the on-screen clock, ArrowRight = +1 tick (desktop)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy slider is 0..100 step .01 without a name');
  const S = await open({ profile: 'a11y-06', cdpPort: PORT_BASE + 9, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const read = () => S.page.evaluate(() => { const s = document.querySelector('input[type=range][aria-label="Battle time"]'); const time = s && s.closest('#gt-timeline') && [...s.closest('#gt-timeline').querySelectorAll('div')].find((d) => /^(July|Tick)/.test(d.textContent.trim()) && d.children.length === 0); return s ? { min: s.min, max: s.max, step: s.step, value: Number(s.value), text: s.getAttribute('aria-valuetext'), clock: time && time.textContent.trim(), inGroup: !!s.closest('#gt-timeline[role=group]') } : null; });
    const a = await read(); t.note('slider at load', a);
    assert(a, 'slider "Battle time" not found');
    assertEq([a.min, a.max, a.step], ['1', '675', '1'], 'range domain');
    assert(a.text && a.text === a.clock, `aria-valuetext ${JSON.stringify(a.text)} != on-screen clock ${JSON.stringify(a.clock)}`);
    assert(a.inGroup, 'slider is not inside the labelled #gt-timeline group');
    await S.page.locator('input[type=range][aria-label="Battle time"]').focus();
    await key(S.page, 'ArrowRight', 300); await key(S.page, 'ArrowRight', 300); await key(S.page, 'ArrowRight', 300);
    const b = await read(); t.note('after 3 x ArrowRight', b);
    assertEq(b.value - a.value, 3, 'ArrowRight x3 must advance exactly 3 ticks (the wrapper handler no longer double-fires)');
    assert(b.text === b.clock && b.text !== a.text, `aria-valuetext did not follow the clock: ${JSON.stringify(b)}`);
    await key(S.page, 'End', 300);
    const c = await read(); assertEq(c.value, 675, 'End key -> last tick');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-07', 'keyboard-only smoke: Tab reaches skip link, toolbar, transport; Enter opens Search / Help; Esc closes; focus returns; S types nothing (desktop)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has no skip link');
  const S = await open({ profile: 'a11y-07', cdpPort: PORT_BASE + 1, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    await S.page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    const desc = () => S.page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.title || a.textContent.trim() || a.tagName).slice(0, 40) : ''; });
    const seen = []; let reachedSearch = false, reachedHelp = false, reachedPlay = false;
    for (let i = 0; i < 60 && !(reachedSearch && reachedHelp && reachedPlay); i++) {
      await key(S.page, 'Tab', 60);
      const d = await desc(); seen.push(d);
      if (d === 'Search') reachedSearch = true; if (d === 'Help') reachedHelp = true; if (d === 'Play' || d === 'Pause') reachedPlay = true;
    }
    t.note('tab order (first 40)', seen.slice(0, 40));
    assertEq(seen[0], 'Skip to the map', 'first Tab stop');
    assert(reachedSearch && reachedHelp && reachedPlay, `Tab did not reach Search/Help/Play within 60 stops: ${JSON.stringify({ reachedSearch, reachedHelp, reachedPlay })}`);
    // Enter on Search (Tab back to it), Esc closes
    await S.page.locator('button[title="Search"]').focus();
    await key(S.page, 'Enter', 500);
    await visible(S.page, 'input[aria-label="Search units"]');
    await key(S.page, 'Escape', 500);
    assertEq(await S.page.locator('input[aria-label="Search units"]').count(), 0, 'Esc did not close the Search panel');
    // S opens Search with an EMPTY input
    await S.page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    await key(S.page, 's', 500);
    const v = await S.page.locator('input[aria-label="Search units"]').inputValue();
    assertEq(v, '', 'the S key typed an "s" into the search input');
    await key(S.page, 'Escape', 400);
    // Help: focus the toolbar button, Enter -> dialog, focus inside, Esc -> closes, focus back on the button
    await S.page.locator('button[title="Help"]').focus();
    await key(S.page, 'Enter', 700);
    await visible(S.page, '[role="dialog"]');
    const inDialog = await S.page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return { name: d.getAttribute('aria-label'), focusInside: d.contains(document.activeElement) }; });
    t.note('Help dialog', inDialog);
    assert(inDialog.name && inDialog.focusInside, `Help dialog: ${JSON.stringify(inDialog)}`);
    await key(S.page, 'Escape', 600);
    assertEq(await S.page.locator('[role="dialog"]').count(), 0, 'Esc did not close the Help dialog');
    const back = await desc(); t.note('focus after Esc', back);
    assertEq(back, 'Help', 'focus did not return to the invoker after Esc');
    // Bookmarks dialog + row keyboard operability
    await S.page.locator('button[title="Bookmarks"]').focus();
    await key(S.page, 'Enter', 700); await visible(S.page, '[role="dialog"]');
    const nm = await S.page.evaluate(() => document.querySelector('[role="dialog"]').getAttribute('aria-label'));
    assertEq(nm, 'Bookmarks and sharing', 'Bookmarks dialog name');
    await key(S.page, 'Escape', 500);
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-16', 'Bookmarks by keyboard: named input, saved row is a focusable button that jumps on Enter/Space, delete button names its bookmark, Esc closes', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy bookmark rows are click-only divs');
  const S = await open({ profile: 'a11y-16', cdpPort: PORT_BASE + 2, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const tick = () => S.page.evaluate(() => Number(document.querySelector('input[type=range][aria-label="Battle time"]').value));
    await S.page.locator('input[type=range][aria-label="Battle time"]').focus();
    for (let i = 0; i < 4; i++) await key(S.page, 'ArrowRight', 120);
    const saved = await tick(); assertEq(saved, 5, 'tick before saving');
    await S.page.locator('button[title="Bookmarks"]').focus(); await key(S.page, 'Enter', 600); await visible(S.page, '[role="dialog"][aria-label="Bookmarks and sharing"]');
    await S.page.getByText('+ Bookmark current moment').click(); await sleep(300);
    const input = S.page.locator('input[aria-label="Bookmark name"]'); await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill('Skirmish at dawn'); await key(S.page, 'Enter', 500);              // the form submits on Enter
    const row = S.page.locator('[role="dialog"] [role="button"][tabindex="0"]', { hasText: 'Skirmish at dawn' });
    assertEq(await row.count(), 1, 'saved bookmark row exposed as role=button, tabindex=0');
    const del = await S.page.locator('[role="dialog"] button[title="Remove"]').first().getAttribute('aria-label');
    t.note('delete button name', del); assertEq(del, 'Remove bookmark Skirmish at dawn', 'delete button accessible name');
    assertEq(await S.page.locator('[role="dialog"] button[aria-label="Close bookmarks"]').count(), 1, 'close button name');
    await key(S.page, 'Escape', 500);
    await S.page.locator('input[type=range][aria-label="Battle time"]').focus();
    for (let i = 0; i < 6; i++) await key(S.page, 'ArrowRight', 100);
    assert((await tick()) > saved, 'tick did not move');
    await S.page.locator('button[title="Bookmarks"]').focus(); await key(S.page, 'Enter', 600); await visible(S.page, '[role="dialog"]');
    await S.page.locator('[role="dialog"] [role="button"][tabindex="0"]', { hasText: 'Skirmish at dawn' }).focus();
    await key(S.page, 'Enter', 700);
    assertEq(await tick(), saved, 'Enter on the bookmark row did not jump to the saved tick');
    assertEq(await S.page.locator('[role="dialog"]').count(), 0, 'dialog stayed open after jumping');
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-08','Lighthouse-a11y rule set (axe rule ids of Lighthouse\'s category) on / : 0 violations, desktop + phone, loaded/Help/Search (Lighthouse itself NOT run)', async (t) => {
  const out = {};
  for (const [tag, viewport, layout, port] of [['desktop', DESKTOP, 'desktop', 2], ['phone', PHONE, 'mobile', 3]]) {
    if (IS_LEGACY && tag === 'phone') continue;
    const S = await open({ profile: `a11y-08-${tag}`, cdpPort: PORT_BASE + port, viewport });
    try {
      await boot(S.page, layout);
      const states = layout === 'desktop' ? ['loaded', 'help', 'search'] : ['loaded', 'help', 'search'];
      for (const st of states) {
        await (layout === 'desktop' ? DESKTOP_STATES : MOBILE_STATES)[st](S.page);
        const r = await axe(S.page, { rules: LH_RULES });
        out[`${tag} ${st}`] = { violations: r.all.map((v) => `${v.id}[${v.impact}] x${v.nodes.length}`), rulesPassed: r.passes, needsReview: r.incomplete };
        if (!IS_LEGACY || !EXPECT_RED) { if (r.all.length && !EXPECT_RED) throw new Error(`${tag} ${st}: ${r.fmt()}`); }
      }
    } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
  }
  t.note('Lighthouse-rule axe results', out);
  if (EXPECT_RED) assert(Object.values(out).some((o) => o.violations.length), 'expected violations on the legacy tree');
});

// ------------------------------------------------------------------ T0-A11Y-09..: labels, live region, motion, font floor, targets, forced colors
suite.test('T0-A11Y-09', 'names and states: toolbar buttons labelled + aria-pressed, transport labels, day/speed pressed, battle log role=log aria-live=off (desktop)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has no labels');
  const S = await open({ profile: 'a11y-09', cdpPort: PORT_BASE + 4, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const r = await S.page.evaluate(() => {
      const tb = [...document.querySelectorAll('button[title]')].filter((b) => b.getBoundingClientRect().top < 48);
      const bad = tb.filter((b) => !b.getAttribute('aria-label') || b.getAttribute('aria-label') !== b.title).map((b) => b.title);
      const legend = document.querySelector('button[title="Legend"]');
      const log = document.querySelector('[role=log]');
      const tr = [...document.querySelectorAll('#gt-timeline button')].map((b) => b.getAttribute('aria-label') || b.textContent.trim());
      return { toolbar: tb.length, unlabeled: bad, legendPressed: legend && legend.getAttribute('aria-pressed'), searchPressed: (document.querySelector('button[title="Search"]') || {}).getAttribute && document.querySelector('button[title="Search"]').getAttribute('aria-pressed'),
        log: log ? { live: log.getAttribute('aria-live'), label: log.getAttribute('aria-label'), relevant: log.getAttribute('aria-relevant') } : null, transport: tr,
        day: [...document.querySelectorAll('#gt-timeline button')].filter((b) => /^July \d$/.test(b.textContent.trim())).map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')),
        speed: [...document.querySelectorAll('#gt-timeline button')].filter((b) => /x$/.test(b.textContent.trim())).map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')),
        closeUnlabeled: [...document.querySelectorAll('button')].filter((b) => /^[✕X]$/.test(b.textContent.trim()) && !b.getAttribute('aria-label')).length };
    });
    t.note('names', r);
    assert(r.toolbar >= 13, `toolbar buttons: ${r.toolbar}`);
    assertEq(r.unlabeled, [], 'toolbar buttons without aria-label = title');
    assertEq(r.legendPressed, 'true', 'Legend toggle aria-pressed (legend is open at load)');
    assertEq(r.searchPressed, 'false', 'Search toggle aria-pressed');
    assert(r.log && r.log.live === 'off' && r.log.label === 'Battle events', `battle log region: ${JSON.stringify(r.log)}`);
    for (const n of ['Back one hour', 'Previous step', 'Play', 'Next step', 'Forward one hour']) assert(r.transport.includes(n), `transport button "${n}" missing: ${JSON.stringify(r.transport)}`);
    assert(r.day.includes('July 1:true') && r.day.includes('July 2:false'), `day buttons: ${JSON.stringify(r.day)}`);
    assert(r.speed.includes('1x:true') && r.speed.includes('2x:false'), `speed buttons: ${JSON.stringify(r.speed)}`);
    assertEq(r.closeUnlabeled, 0, 'unlabelled close glyph buttons (X / ✕)');
    await S.page.click('button[aria-label="Play"]'); await sleep(400);
    assert(await S.page.locator('button[aria-label="Pause"]').count() === 1, 'Play button did not become "Pause"');
    await S.page.click('button[aria-label="Pause"]');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-10', 'reduced motion: prefers-reduced-motion sets window.__gtbgReduceMotion (live) and collapses CSS transitions/animations', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has no reduced-motion handling');
  const S = await open({ profile: 'a11y-10', cdpPort: PORT_BASE + 5, viewport: DESKTOP });
  try {
    await S.page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(S.page, 'desktop');
    const on = await S.page.evaluate(() => ({ flag: window.__gtbgReduceMotion, tr: getComputedStyle(document.querySelector('button[title="Search"]')).transitionDuration, boot: getComputedStyle(document.documentElement).scrollBehavior }));
    t.note('reduce', on);
    assertEq(on.flag, true, 'flag with reduce');
    assert(parseFloat(on.tr) < 0.001, `toolbar button transition-duration ${on.tr} (expected ~0.01ms)`);
    await S.page.emulateMedia({ reducedMotion: 'no-preference' }); await sleep(400);
    const off = await S.page.evaluate(() => ({ flag: window.__gtbgReduceMotion, tr: getComputedStyle(document.querySelector('button[title="Search"]')).transitionDuration }));
    t.note('no-preference (live change)', off);
    assertEq(off.flag, false, 'flag follows the media query change');
    assert(parseFloat(off.tr) >= 0.1, `transition restored: ${off.tr}`);
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-11', 'type floor: no visible text below 12 px in the loaded desktop screen and with Help / roster / filter open (canvas and Mapbox attribution excluded)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has 7-11 px text by design');
  const S = await open({ profile: 'a11y-11', cdpPort: PORT_BASE + 6, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const scan = () => S.page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.closest('canvas,svg,.mapboxgl-ctrl,.gt-sr-only,script,style')) return;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!own) return;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
        const fs = parseFloat(cs.fontSize); if (fs < 11.99) bad.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}" ${fs}px`);
      });
      return bad;
    });
    const res = {};
    res.loaded = await scan();
    await DESKTOP_STATES.help(S.page); res.help = await scan();
    await DESKTOP_STATES.roster(S.page); res.roster = await scan();
    await DESKTOP_STATES.filter(S.page); res.filter = await scan();
    t.note('text below 12 px', res);
    const all = Object.entries(res).flatMap(([k, v]) => v.map((x) => `${k}: ${x}`));
    assertEq(all, [], 'visible text smaller than 12 px');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-12', 'touch targets: every visible button/link/select on the phone shell is >= 44 px (phone 375x812, loaded + Tools + Help)', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy phone shell is group-C territory');
  const S = await open({ profile: 'a11y-12', cdpPort: PORT_BASE + 7, viewport: PHONE });
  try {
    await boot(S.page, 'mobile');
    const scan = () => S.page.evaluate(() => [...document.querySelectorAll('#root button,#root a[href],#root select,#root input[type=checkbox]')].filter((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.gt-sr-only');
    }).map((e) => { const r = e.getBoundingClientRect(); return { n: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44));
    const res = { loaded: await scan() };
    await MOBILE_STATES.tools(S.page); res.tools = await scan();
    await MOBILE_STATES.help(S.page); res.help = await scan();
    t.note('targets smaller than 44 px', res);
    const all = Object.entries(res).flatMap(([k, v]) => v.map((x) => `${k}: ${x.n} ${x.w}x${x.h}`));
    assertEq(all, [], 'targets < 44 px on a coarse pointer');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-13', 'forced colors: buttons keep a border and the focus ring switches to Highlight; the skip link is styled', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy has no forced-colors rules');
  const S = await open({ profile: 'a11y-13', cdpPort: PORT_BASE + 8, viewport: DESKTOP });
  try {
    await S.page.emulateMedia({ forcedColors: 'active' });
    await boot(S.page, 'desktop');
    const r = await S.page.evaluate(() => {
      const tb = [...document.querySelectorAll('button[title]')].filter((b) => b.getBoundingClientRect().top < 48);
      const noBorder = tb.filter((b) => parseFloat(getComputedStyle(b).borderTopWidth) === 0).map((b) => b.title);
      return { forced: matchMedia('(forced-colors: active)').matches, tb: tb.length, noBorder };
    });
    t.note('forced colors', r);
    assert(r.forced, 'forced-colors emulation did not apply');
    assertEq(r.noBorder, [], 'toolbar buttons without a border under forced colors');
    await S.page.locator('button[title="Search"]').focus(); await key(S.page, 'Tab', 100); await key(S.page, 'Shift+Tab', 100);
    const ring = await S.page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, shadow: cs.boxShadow }; });
    t.note('focus ring', ring);
    assert(parseFloat(ring.outlineWidth) >= 2 && ring.shadow === 'none', `forced-colors focus ring: ${JSON.stringify(ring)}`);
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

suite.test('T0-A11Y-15', 'text contrast, own compositing audit (covers what axe reports as "incomplete"): 0 failing text nodes across 20 desktop and 8 phone states', async (t) => {
  if (IS_LEGACY && !EXPECT_RED) throw new Skip('legacy fails by design (run with --expect-red)');
  const res = {}; let total = 0;
  for (const [tag, viewport, layout, port, states] of [
    ['desktop', DESKTOP, 'desktop', 1, ['loaded', 'help', 'search', 'searchresults', 'filter', 'roster', 'unitpanel', 'ancestor', 'ancestorpick', 'bookmarks', 'layers', 'monuments', 'soldier', 'locations', 'distance', 'findunit', 'efmenu', 'legendsides', 'walkthrough', 'tick17', 'tick302', 'tick538']],
    ['phone', PHONE, 'mobile', 2, ['loaded', 'tools', 'help', 'search', 'filter', 'roster', 'legend']],
  ]) {
    if (IS_LEGACY && tag === 'phone') continue;
    const S = await open({ profile: `a11y-15-${tag}`, cdpPort: PORT_BASE + port, viewport });
    try {
      await boot(S.page, layout);
      const table = layout === 'mobile' ? MOBILE_STATES : DESKTOP_STATES;
      for (const st of states) {
        if (IS_LEGACY && !['loaded', 'help', 'search'].includes(st)) continue;
        try { await table[st](S.page); } catch (e) { res[`${tag} ${st}`] = [`state unreachable: ${e.message.split('\n')[0]}`]; total++; continue; }
        const bad = await S.page.evaluate(CONTRAST_AUDIT);
        res[`${tag} ${st}`] = bad.map((x) => `${x.t}|${x.cr}:1|${x.fg} on ${x.bg}|${x.fs}px`); total += bad.length;
      }
    } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
  }
  t.note('failing text nodes per state', Object.fromEntries(Object.entries(res).filter(([, v]) => v.length)));
  t.note('states audited', Object.keys(res).length);
  if (EXPECT_RED) assert(total > 0, 'expected contrast failures on the legacy tree'); else assertEq(total, 0, `failing text nodes: ${JSON.stringify(Object.entries(res).filter(([, v]) => v.length))}`);
});

suite.test('T0-A11Y-14', 'real tiles: axe on the loaded desktop map with the production Referer (<= T0_TILE_CAP Mapbox requests) - 0 serious/critical; playback with reduced motion ON and OFF draws and advances (J2/J3 paths), no exceptions', async (t) => {
  if (TILES !== 'inject' || IS_LEGACY) throw new Skip('run with --tiles inject to spend Mapbox requests (default: blocked; without the style the draw loop never starts)');
  const S = await open({ profile: 'a11y-14', cdpPort: PORT_BASE + 9, viewport: DESKTOP, tiles: 'inject' });
  try {
    await boot(S.page, 'desktop'); await sleep(6000);
    const r1 = await axe(S.page); await DESKTOP_STATES.help(S.page); const r2 = await axe(S.page); await DESKTOP_STATES.search(S.page); const r3 = await axe(S.page);
    t.note('tiles', { seen: S.tileStats.seen, statuses: S.tileStats.status, referers: [...S.tileStats.referers] });
    t.note('axe with map', { loaded: r1.all.map((v) => v.id), help: r2.all.map((v) => v.id), search: r3.all.map((v) => v.id) });
    assertEq([r1.sc.length, r2.sc.length, r3.sc.length], [0, 0, 0], `serious/critical: ${r1.fmt(r1.sc)} ${r2.fmt(r2.sc)} ${r3.fmt(r3.sc)}`);
    await resetDesktop(S.page);
    const tick = () => S.page.evaluate(() => Number(document.querySelector('input[type=range][aria-label="Battle time"]').value));
    const runFor = async (mode) => {
      await S.page.emulateMedia({ reducedMotion: mode }); await sleep(300);
      const flag = await S.page.evaluate(() => window.__gtbgReduceMotion);
      const t0 = await tick(); await S.page.click('button[aria-label="Play"]'); await sleep(3000); await S.page.click('button[aria-label="Pause"]');
      return { mode, flag, t0, t1: await tick() };
    };
    const rm = await runFor('reduce'); const nm = await runFor('no-preference');
    t.note('playback 3 s at 1x', { reduce: rm, noPreference: nm });
    assertEq([rm.flag, nm.flag], [true, false], 'flag');
    assert(rm.t1 > rm.t0 && nm.t1 > nm.t0, `playback did not advance: ${JSON.stringify({ rm, nm })}`);
    assertEq(errs(S), [], 'uncaught exceptions / console errors (unit draw loop with the J2/J3 patches)');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

let summary;
try { summary = await suite.run({ filter: FILTER, outFile: OUT, extra }); } finally { await closeAll(); }
process.exit(summary.failed ? 1 : 0);
