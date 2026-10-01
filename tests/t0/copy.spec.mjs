// T0-CP suite (chapter 02 WP-T0-16, T0-CP-01): the truthful-copy subset (group CP: 16 bundle rows + 2 Help rows + the mobile Tools footer +
// the dead onboarding banner in index.html), proved two ways:
//   CP-01  string level, exact: build the SAME patch set twice (with CP, and with CP replaced by an empty group) and show that
//          (a) every shipped row's find string is present exactly `expect` times before and 0 times after (unless the replacement contains it),
//          (b) applying the CP rows to the without-CP text reproduces the with-CP text BYTE FOR BYTE (CP changes nothing else),
//          (c) every HELD row of docs-copy's 64-row table is unchanged by CP, "445+" is gone, no replacement adds "undefined",
//          (d) the heatmap row/key is gone from Help and the tour quick reference (group A removes them, D-HEATMAP).
//   CP-02  rendered, desktop: Help About text + Sources heading, no heatmap row, Street View subtitle (8 viewpoints), "1x (base speed)",
//          "User Guide (PDF)", Size legend tilde/thousands rows, minimap title, walkthrough back link, ancestor "Copy link".
//   CP-03  rendered, phone: the Tools footer has Privacy, Terms and the credit (no mailto) and both links are >= 44 px.
//
//   node tests/t0/copy.spec.mjs                             builds R1c twice into tmp/<agent>/spec-build and tests it
//   node tests/t0/copy.spec.mjs --dist release/R1c/dist     rendered tests (CP-02/03) against any built tree; CP-01 still builds its own pair
//   node tests/t0/copy.spec.mjs --filter 'CP-01'            subset
//   node tests/t0/copy.spec.mjs --dist legacy/dist --expect-red --filter 'CP-01'   red-first: the shipped strings are all still there on legacy
//
// Env: T0_AGENT (scratch dir, default ax), T0_PORT_BASE (static server = base, Chrome CDP = base+1..).  No Mapbox tiles are requested (blocked).
process.env.T0_AGENT ||= 'ax';
process.env.T0_PORT_BASE ||= '8360';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const { spawnSync } = await import('node:child_process');
const { REPO, TMP, PORT_BASE, VIEWPORTS, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitForApp, chooseLayout, Skip } = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'copy-results.json')));
const BUILD_ROOT = path.join(TMP, 'spec-build', 'cp');
const sh = (cmd, args, extra = {}) => spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, ...extra });
const rel = (p) => path.relative(REPO, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(p, 'utf8');
const count = (text, needle) => { let n = 0, i = -1; while ((i = text.indexOf(needle, i + 1)) >= 0) n++; return n; };

// ------------------------------------------------------------------ the two builds (CP-01) -- lazy, shared
const B = {};
function buildPair() {
  if (B.done) return B;
  fs.rmSync(BUILD_ROOT, { recursive: true, force: true });
  const patchesWith = path.join(BUILD_ROOT, 'patches-with'), patchesWithout = path.join(BUILD_ROOT, 'patches-without');
  fs.mkdirSync(BUILD_ROOT, { recursive: true });
  fs.cpSync(path.join(REPO, 'tools/t0/patches'), patchesWith, { recursive: true });
  fs.cpSync(path.join(REPO, 'tools/t0/patches'), patchesWithout, { recursive: true });
  fs.writeFileSync(path.join(patchesWithout, 'CP.json'), JSON.stringify({ group: 'CP', patches: [] }));
  for (const [tag, patches] of [['with', patchesWith], ['without', patchesWithout]]) {
    const out = path.join(BUILD_ROOT, tag);
    const r = sh('python', ['tools/t0/build.py', '--train', 'R1c', '--out', rel(out), '--patches', rel(patches), '--dump-stage', rel(path.join(BUILD_ROOT, `stage-${tag}`))]);
    if (r.status !== 0) throw new Error(`build ${tag} failed (exit ${r.status}): ${r.stdout.slice(-1500)} ${r.stderr.slice(-500)}`);
    B[tag] = { dist: path.join(out, 'dist'), stage: path.join(BUILD_ROOT, `stage-${tag}`) };
  }
  B.cp = JSON.parse(read(path.join(patchesWith, 'CP.json'))).patches;
  B.done = true;
  return B;
}

// ------------------------------------------------------------------ helpers for the rendered tests
let DIST, srv, ORIGIN;
const sessions = [];
// never load the owner's Google Maps key (Soldier's Eye View / walkthrough Street View): those requests fail locally
const GOOGLE = /^https:\/\/(www\.google\.com\/maps|maps\.googleapis\.com|maps\.gstatic\.com|www\.gstatic\.com)/i;
const NOISE = /maps\.googleapis|maps\.gstatic|google\.com\/maps|Permissions policy violation|ERR_BLOCKED_BY_CLIENT/i;
const errs = (S) => S.collector.firstParty.filter((e) => !NOISE.test(e.text) && !NOISE.test(e.url || ''));
const open = async (o) => { const s = await openSession({ tiles: 'block', ...o }); await s.context.route(GOOGLE, (r) => r.abort('blockedbyclient')); sessions.push(s); return s; };
async function closeAll() { for (const s of sessions.splice(0)) await s.close().catch(() => {}); if (srv) await srv.close(); }
async function ensureServer() {
  if (srv) return;
  if (opt('dist', null)) DIST = path.resolve(REPO, opt('dist'));
  else { buildPair(); DIST = B.with.dist; }
  if (!fs.existsSync(DIST)) throw new Error(`dist not found: ${DIST}`);
  srv = await createStaticServer({ root: DIST, port: PORT_BASE });
  ORIGIN = srv.url;
}
const key = async (page, k, ms = 500) => { await page.keyboard.press(k); await sleep(ms); };
async function boot(page, layout) { await page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await chooseLayout(page, layout); await waitForApp(page, 45000); await sleep(2000); }
const DESKTOP = { width: 1440, height: 900, dpr: 1, mobile: false };
const PHONE = VIEWPORTS.portrait.find((v) => v.width === 375);
const IS_LEGACY = !!opt('dist', null) && path.resolve(REPO, opt('dist')) === path.resolve(REPO, 'legacy/dist');

const suite = createSuite('copy-truthful-subset');

// ------------------------------------------------------------------ CP-01
suite.test('T0-CP-01', 'string level: each shipped row present once before / gone after, CP == exactly those replacements, held rows unchanged, no 445+, no heatmap row, no new "undefined"', async (t) => {
  const table = JSON.parse(read(path.join(REPO, 'tools/t0/inputs/copy_patch_table.json')));
  const legacy = { js: read(path.join(REPO, 'legacy/dist/assets/index-Cg8FAMXN.js')), help: read(path.join(REPO, 'legacy/dist/assets/HelpModal-CFV9T0zH.js')) };
  const SHIPPED = ['b01', 'b10', 'b11', 'b13', 'b14', 'b15', 'b16', 'b17', 'b18', 'b41', 'b43', 'b44', 'b49', 'b50', 'b51', 'b52', 'h01', 'h03'];
  const SUPERSEDED = { h09: 'deleted with the H key by group A (D-HEATMAP)', b42: 'replaced by group A bug:A4 (true caption)', b53: 'no replacement (dedication is in the Help rows section)' };
  const shippedRows = SHIPPED.map((id) => table.find((r) => r.id === id));
  const held = table.filter((r) => !SHIPPED.includes(r.id) && !SUPERSEDED[r.id]);
  t.note('shipped rows', SHIPPED.length); t.note('held rows', held.map((r) => r.id).join(' ')); t.note('superseded', SUPERSEDED);

  if (IS_LEGACY && EXPECT_RED) {                       // red-first: on the legacy tree every shipped find string is still present (nothing shipped yet)
    const bad = shippedRows.filter((r) => count(r.file === 'help' ? legacy.help : legacy.js, r.find) === 0).map((r) => r.id);
    t.note('shipped strings missing from legacy (should be none: they are all still to be replaced)', bad);
    assertEq(bad, [], 'legacy is missing shipped find strings');
    const notReplaced = shippedRows.filter((r) => count(r.file === 'help' ? legacy.help : legacy.js, r.find) > 0).length;
    assert(notReplaced === SHIPPED.length, 'expected all shipped strings to be present on legacy (RED: copy not yet fixed)');
    return;
  }
  const P = buildPair();
  const w = { js: read(path.join(P.with.stage, 'js.txt')), help: read(path.join(P.with.stage, 'help.txt')), book: read(path.join(P.with.stage, 'book.txt')), css: read(path.join(P.with.stage, 'css.txt')) };
  const wo = { js: read(path.join(P.without.stage, 'js.txt')), help: read(path.join(P.without.stage, 'help.txt')), book: read(path.join(P.without.stage, 'book.txt')), css: read(path.join(P.without.stage, 'css.txt')) };
  const cpRows = P.cp.filter((p) => ['js', 'help'].includes(p.target));
  const cpPage = P.cp.filter((p) => p.target === 'index.html');
  t.note('CP patches', { total: P.cp.length, bundle: cpRows.length, page: cpPage.length });

  // (a) each patch: find present exactly `expect` times in the without-CP text, absent (or only inside its own replacement) in the with-CP text
  const problems = [];
  for (const p of cpRows) {
    const before = count(wo[p.target], p.find), after = count(w[p.target], p.find);
    if (before !== p.expect) problems.push(`${p.id}: ${before} occurrences before (expected ${p.expect})`);
    const reIn = count(p.repl, p.find) * p.expect;
    if (after !== reIn) problems.push(`${p.id}: ${after} occurrences after (expected ${reIn})`);
  }
  assertEq(problems, [], 'per-row occurrence counts');
  // (b) exact reproduction: applying the CP rows to the without-CP text gives the with-CP text, byte for byte
  const applied = { js: wo.js, help: wo.help };
  for (const p of cpRows) applied[p.target] = applied[p.target].split(p.find).join(p.repl);
  assert(applied.js === w.js, `entry text differs from "without CP + CP rows" (lengths ${applied.js.length} vs ${w.js.length})`);
  assert(applied.help === w.help, 'Help chunk text differs from "without CP + CP rows"');
  assert(w.book === wo.book && w.css === wo.css, 'CP touched the Bookmarks chunk or the app stylesheet');
  // the page patch (banner): index.html differs only by the banner text (asset names carry the release id: normalise)
  const norm = (s) => s.replace(/-[0-9a-f]{8}\.(js|css)/g, '-RID.$1').replace(/\?v=[0-9a-f]{8}/g, '?v=RID');
  let idxWithout = norm(read(path.join(P.without.dist, 'index.html')));
  for (const p of cpPage) { assertEq(count(idxWithout, p.find), p.expect, `${p.id} anchor count in index.html`); idxWithout = idxWithout.split(p.find).join(p.repl); }
  assert(idxWithout === norm(read(path.join(P.with.dist, 'index.html'))), 'index.html differs from "without CP + banner row"');
  // (c) held rows unchanged by CP; superseded rows are not CP's business
  const moved = held.filter((r) => { const tx = r.file === 'help' ? 'help' : 'js'; return count(w[tx], r.find) !== count(wo[tx], r.find); }).map((r) => r.id);
  assertEq(moved, [], 'held rows whose occurrence count CP changed');
  const touchedByOthers = held.filter((r) => { const tx = r.file === 'help' ? 'help' : 'js'; return count(wo[tx], r.find) !== count(legacy[tx], r.find); }).map((r) => `${r.id} (${count(legacy[r.file === 'help' ? 'help' : 'js'], r.find)}->${count(wo[r.file === 'help' ? 'help' : 'js'], r.find)})`);
  t.note('held rows already changed by OTHER groups (A/B/C/AX), informational', touchedByOthers);
  // no new "undefined" / debug words; no replacement contains one
  // (the footer row carries code, `buildGroupsHtml(null)`; every other row is copy)
  const badRx = (p) => (p.id.startsWith('cp:mobile-tools-footer') ? /undefined|\[object|NaN/ : /undefined|\bnull\b|\[object|NaN/);
  const bad = cpRows.concat(cpPage).filter((p) => badRx(p).test(p.repl)).map((p) => p.id);
  assertEq(bad, [], 'replacements containing undefined/null/[object/NaN');
  assertEq([count(w.js, 'undefined'), count(w.help, 'undefined')], [count(wo.js, 'undefined'), count(wo.help, 'undefined')], '"undefined" occurrences with vs without CP');
  // (d) "445+" and the heatmap row
  const facts = { '445+ in Help': count(w.help, '445+'), '445+ in entry': count(w.js, '445+'), 'legacy 445+ in Help': count(legacy.help, '445+'),
    'Toggle heatmap in Help': count(w.help, 'Toggle heatmap'), 'heatmap key row in entry tour': count(w.js, '["H","Heatmap"]'), 'case "h" heatmap key': count(w.js, 'case"h":case"H":'),
    'Primary Sources in Help': count(w.help, 'Primary Sources'), 'AI-style in index.html': count(read(path.join(P.with.dist, 'index.html')), 'AI-style'), 'live sound in index.html': count(read(path.join(P.with.dist, 'index.html')), 'live sound'),
    '"20 more tools" in index.html': count(read(path.join(P.with.dist, 'index.html')), '20 more tools'), 'hundreds of Union and Confederate regiments and batteries in Help': count(w.help, 'hundreds of Union and Confederate regiments and batteries'),
    'Sources heading in Help': count(w.help, 'children:"Sources"'), 'mobile footer links': count(w.js, 'href:"/privacy.html"') + count(w.js, 'href:"/terms.html"') };
  t.note('facts', facts);
  assertEq([facts['445+ in Help'], facts['445+ in entry'], facts['Toggle heatmap in Help'], facts['heatmap key row in entry tour'], facts['case "h" heatmap key'], facts['Primary Sources in Help'], facts['AI-style in index.html'], facts['live sound in index.html'], facts['"20 more tools" in index.html']], [0, 0, 0, 0, 0, 0, 0, 0, 0], 'strings that must be gone');
  assertEq([facts['legacy 445+ in Help'], facts['hundreds of Union and Confederate regiments and batteries in Help'], facts['Sources heading in Help'], facts['mobile footer links']], [1, 1, 1, 2], 'strings that must be present');
});

// ------------------------------------------------------------------ CP-02 (desktop, rendered)
suite.test('T0-CP-02', 'rendered desktop: Help About/Sources, no heatmap row, Street View subtitle (8 viewpoints), speed label, guide link, size legend, minimap title, walkthrough link, "Copy link"', async (t) => {
  if (IS_LEGACY) throw new Skip('the shipped copy is only asserted on release trees');
  await ensureServer();
  const S = await open({ profile: 'cp-02', cdpPort: PORT_BASE + 1, viewport: DESKTOP });
  try {
    await boot(S.page, 'desktop');
    const p = S.page;
    const seen = {};
    seen.speed = await p.locator('text=1x (base speed)').count();
    seen.realTime = await p.locator('text=1x (real time)').count();
    seen.guide = await p.locator('a[href="/user-guide.pdf"]').first().textContent();
    seen.minimapTitle = await p.locator('canvas[title]').evaluateAll((els) => els.map((e) => e.title));
    // legend Size tab
    await p.getByRole('button', { name: 'Size' }).click(); await sleep(300);
    seen.size = await p.locator('text=/^(Regiment|Brigade|Division) \\(/').allTextContents();
    // Help: shortcuts tab (no H row), About tab (counts, Sources)
    await key(p, '?', 700);
    await p.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 8000 });
    seen.helpKeys = await p.locator('[role="dialog"] kbd').allTextContents();
    seen.helpHeatmap = await p.locator('[role="dialog"] >> text=/heatmap/i').count();          // scoped: the closed Extra Features menu mentions the Ground Remembers heat map
    await p.getByRole('button', { name: 'About' }).click(); await sleep(300);
    seen.about = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"]'); const tx = d.innerText; const heads = [...d.querySelectorAll('div')].filter((e) => e.children.length === 0).map((e) => e.textContent.trim());
      return { has445: /445\+/.test(tx), hundreds: /hundreds of Union and Confederate regiments and batteries/.test(tx), sourcesHeading: heads.includes('Sources'), primaryHeading: heads.includes('Primary Sources'), vignettes24: /The 24 narrative vignettes/.test(tx),
        paragraphStillSaysPrimary: /derived from primary sources/.test(tx) };
    });
    await key(p, 'Escape', 400);
    // Street View panel
    await p.click('button[title^="Soldier"]'); await sleep(700);
    seen.streetView = { sub: await p.locator('text=/^Stand where history happened/').first().textContent(), rows: await p.locator('text=/^(Little Round Top|The Angle|McPherson.s Ridge|Devil.s Den|The Wheatfield|Cemetery Hill|Culp.s Hill|Peach Orchard)/').count() };
    await key(p, 'Escape', 400);
    // Walkthrough back link
    await p.getByText('Virtual Walkthrough').first().click(); await sleep(1500);
    seen.walkBack = await p.locator('text=/Back to the map/').count();
    seen.walkOld = await p.locator('text=/Animated Map/').count();
    await key(p, 'Escape', 300);
    if (await p.locator('text=/Back to the map/').count()) await p.locator('text=/Back to the map/').first().click().catch(() => {});
    await sleep(700);
    // Follow Your Ancestor: share button label
    await p.click('button[title="Follow Your Ancestor"]'); await sleep(500);
    await p.locator('input[aria-label="Regiment name"]').fill('20th Maine'); await sleep(900);
    await p.getByText('20th Maine').first().click(); await sleep(1800);
    seen.copyLink = await p.locator('button:has-text("Copy link")').count();
    seen.copyOld = await p.locator('text=/Copy Shareable Link/').count();
    t.note('rendered', seen);
    assertEq(seen.speed, 1, '"1x (base speed)" count'); assertEq(seen.realTime, 0, '"1x (real time)" count');
    assertEq(seen.guide.trim(), 'User Guide (PDF)', 'guide link label');
    assert(seen.minimapTitle.includes('Click to move the map'), `minimap title: ${JSON.stringify(seen.minimapTitle)}`);
    assertEq(seen.size, ['Regiment (about 400)', 'Brigade (about 2,000)', 'Division (about 6,000)'], 'Size legend rows');
    assert(!seen.helpKeys.includes('H'), `Help still lists an H key: ${JSON.stringify(seen.helpKeys)}`); assertEq(seen.helpHeatmap, 0, 'heatmap mentions in Help');
    assertEq({ ...seen.about, paragraphStillSaysPrimary: undefined }, { has445: false, hundreds: true, sourcesHeading: true, primaryHeading: false, vignettes24: true, paragraphStillSaysPrimary: undefined }, 'Help About content');
    assertEq(seen.streetView.sub.trim(), 'Stand where history happened. Eight viewpoints open in Google Street View.', 'Street View subtitle');
    assertEq(seen.streetView.rows, 8, 'Street View viewpoints listed (the subtitle says eight)');
    assert(seen.walkBack >= 1 && seen.walkOld === 0, `walkthrough links: back ${seen.walkBack}, old ${seen.walkOld}`);
    assertEq([seen.copyLink, seen.copyOld], [1, 0], 'Follow Your Ancestor share button');
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

// ------------------------------------------------------------------ CP-03 (phone, rendered)
suite.test('T0-CP-03', 'rendered phone 375x812: the Tools footer shows Privacy, Terms and the credit (no mailto), links >= 44 px and pointing at /privacy.html and /terms.html', async (t) => {
  if (IS_LEGACY) throw new Skip('phone shell is a release-tree feature');
  await ensureServer();
  const S = await open({ profile: 'cp-03', cdpPort: PORT_BASE + 2, viewport: PHONE });
  try {
    await boot(S.page, 'mobile');
    await S.page.getByText('Tools').first().click(); await sleep(900);
    const r = await S.page.evaluate(() => {
      const panel = document.querySelector('.gtbg-m-toolspanel');
      const sc = panel && [...panel.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto'); if (sc) sc.scrollTop = sc.scrollHeight;
      const links = [...document.querySelectorAll('a[href="/privacy.html"],a[href="/terms.html"]')].filter((a) => panel && panel.contains(a));
      const credit = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent.trim() === 'Created by Mike Legere');
      const foot = credit && credit.parentElement;
      return { links: links.map((a) => { const b = a.getBoundingClientRect(); return { t: a.textContent, href: a.getAttribute('href'), w: Math.round(b.width), h: Math.round(b.height) }; }), credit: !!credit, mailtoInFooter: !!(foot && foot.querySelector('a[href^="mailto:"]')), inViewport: credit ? credit.getBoundingClientRect().bottom <= innerHeight + 1 : false };
    });
    t.note('footer', r);
    assertEq(r.links.map((l) => l.t + ' ' + l.href), ['Privacy /privacy.html', 'Terms /terms.html'], 'footer links');
    assert(r.links.every((l) => l.w >= 44 && l.h >= 44), `footer link sizes: ${JSON.stringify(r.links)}`);
    assert(r.credit && !r.mailtoInFooter, `credit line / mailto: ${JSON.stringify(r)}`);
    assert(r.inViewport, 'the footer is not reachable by scrolling the Tools sheet');
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
});

// ------------------------------------------------------------------ CP-04 (desktop + phone, rendered): the Help text after the keyboard-focus decision (integrator notes)
suite.test('T0-CP-04', 'Help text: the desktop list keeps the held arrow and Esc rows and adds "Tab to the map" (arrows pan once the map has keyboard focus); the phone shell shows touch controls, not the keyboard list', async (t) => {
  if (IS_LEGACY) throw new Skip('the shipped copy is only asserted on release trees');
  await ensureServer();
  const S = await open({ profile: 'cp-04', cdpPort: PORT_BASE + 3, viewport: DESKTOP });
  const seen = {};
  try {
    await boot(S.page, 'desktop');
    await key(S.page, '?', 800);
    await S.page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 8000 });
    seen.desktop = await S.page.evaluate(() => [...document.querySelectorAll('[role="dialog"] kbd')].map((k) => [k.textContent.trim(), (k.nextElementSibling || {}).textContent]));
    await key(S.page, 'Escape', 400);
    assertEq(errs(S), [], 'uncaught exceptions / console errors');
  } finally { await S.close().catch(() => {}); sessions.splice(sessions.indexOf(S), 1); }
  const rows = Object.fromEntries(seen.desktop);
  t.note('desktop Help rows', rows);
  // held (D-TIME) rows are untouched by this work
  assertEq([rows['→'], rows['←'], rows['Shift + →']], ['Advance one tick (5 minutes)', 'Go back one tick', 'Advance one hour (12 ticks)'], 'held arrow rows');
  assertEq(rows['Tab to the map'], 'Arrow keys then pan it instead of stepping the clock, + / - zoom it, Shift + arrows rotate and tilt it; Esc gives the keys back', 'map keyboard row');
  assertEq(rows['Esc'], 'Dismiss panel / deselect unit', 'the Esc row is a held row (h04) and stays as it was');
  const P = await open({ profile: 'cp-04p', cdpPort: PORT_BASE + 4, viewport: PHONE });
  try {
    await boot(P.page, 'mobile');
    await P.page.getByText('Tools').first().click(); await sleep(700);
    await P.page.getByText('Help', { exact: true }).first().click(); await sleep(1200);
    seen.phone = await P.page.evaluate(() => [...document.querySelectorAll('[role="dialog"] kbd')].map((k) => k.textContent.trim()));
    t.note('phone Help keys', seen.phone);
    for (const k of ['Drag', 'Pinch', 'Tap a unit', 'Tools']) assert(seen.phone.includes(k), `phone Help is missing "${k}"`);
    for (const k of ['Space', 'Shift + →', 'Scroll', 'Click unit', 'Esc', 'Tab to the map']) assert(!seen.phone.includes(k), `phone Help still shows "${k}"`);
    assertEq(errs(P), [], 'uncaught exceptions / console errors');
  } finally { await P.close().catch(() => {}); sessions.splice(sessions.indexOf(P), 1); }
});

let summary;
try { summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: DIST ? rel(DIST) : null }) }); } finally { await closeAll(); }
process.exit(summary.failed ? 1 : 0);
