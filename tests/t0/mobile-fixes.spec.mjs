// T0-MFIX suite: the mobile-verifier defects D-01..D-08 and D-13 (docs/verification/t0-verifier-findings.json, verifier 1), the WCAG 2.5.3 label of the phone
// speed button (verifier 2) and the desktop shell defects of verifier 0 (Extra Features menu taller than the viewport; pills above modal backdrops / over
// panels), proved in real Chrome with real CDP touch events (Input.dispatchTouchEvent), elementFromPoint geometry checks and screenshots.
//
//   node tests/t0/mobile-fixes.spec.mjs                          run against release/R1c/dist (python tools/t0/build.py --train R1c first)
//   node tests/t0/mobile-fixes.spec.mjs --dist tmp/x/dist        any built tree (the red-first proof runs it on release/R1b..R1c built WITHOUT the fixes)
//   node tests/t0/mobile-fixes.spec.mjs --vp portrait|landscape|all|<id,id>   viewport subset (default all 10: 320x568 360x640 375x812 390x844 412x915
//                                                                430x932 768x1024 812x375 844x390 915x412)
//   node tests/t0/mobile-fixes.spec.mjs --filter 'MFIX-0[1-3]'   test-id subset
//   node tests/t0/mobile-fixes.spec.mjs --shots <dir>            screenshot directory (default tmp/<agent>/shots-fixes)
//   node tests/t0/mobile-fixes.spec.mjs --slot 1                 parallel run: static server = base+2*slot, Chrome CDP = base+2*slot+1 (slot 0..4)
//   node tests/t0/mobile-fixes.spec.mjs --dist <tree without the fixes> --expect-red   exits 0 when tests FAIL (red-first proof)
//
// Env: T0_AGENT (scratch dir under tmp/, default t0-mobile), T0_PORT_BASE (default 8660), T0_TILE_CAP (Mapbox requests per run, default 300; every
// request carries the production Referer through the harness side channel).  Google (Street View, Maps) requests are failed locally.
process.env.T0_AGENT ||= 't0-mobile';
process.env.T0_PORT_BASE ||= '8660';
const L = await import('./lib.mjs');
const fs = await import('node:fs');
const path = await import('node:path');
const {
  REPO, TMP, PORT_BASE, openSession, createStaticServer, createSuite, sleep, waitFor, waitForApp, mapView, touchTap, touchSwipe, emulateViewport,
  cdpFor, tileBudget, Skip,
} = L;

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const VPSEL = String(opt('vp', 'all'));
const EXPECT_RED = !!opt('expect-red', false);
const SLOT = Number(opt('slot', 0)) || 0;
const SHOTS = path.resolve(REPO, opt('shots', path.join(TMP, 'shots-fixes')));
const OUT = path.resolve(REPO, opt('out', path.join(TMP, 'mobile-fixes.json')));
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

const P = (w, h, dpr) => ({ id: `${w}x${h}`, width: w, height: h, dpr, mobile: true, landscape: w > h });
const MATRIX = [P(320, 568, 2), P(360, 640, 3), P(375, 812, 3), P(390, 844, 3), P(412, 915, 2.625), P(430, 932, 3), P(768, 1024, 2),
  P(812, 375, 3), P(844, 390, 3), P(915, 412, 2.625)];
const DESKTOPS = [{ id: '1440x900', width: 1440, height: 900, dpr: 1, mobile: false }, { id: '1280x720', width: 1280, height: 720, dpr: 1, mobile: false },
  { id: '1920x1080', width: 1920, height: 1080, dpr: 1, mobile: false }];
const SEL = VPSEL === 'all' ? MATRIX : VPSEL === 'portrait' ? MATRIX.filter((v) => !v.landscape) : VPSEL === 'landscape' ? MATRIX.filter((v) => v.landscape)
  : MATRIX.filter((v) => VPSEL.split(',').includes(v.id));
const vpById = (id) => MATRIX.find((v) => v.id === id);
const inSel = (id) => SEL.some((v) => v.id === id);
const pick = (...ids) => ids.filter(inSel).map(vpById);

// the deep-link reader (group DL) ships from R1c on; trains without it (R1b) are judged without ?t= / ?u= links (real taps on the scrubber instead)
const { treeHas, loadOracle } = await import('./lib_clock.mjs');
const HAS_CLOCK = treeHas(DIST, 'CLOCK');                    // CLOCK: no "Tick n/675" on the page; the frame is data-gt-frame, the dock label is the clock of the frame (tools/t0/CLOCK-README.md)
const ORACLE = HAS_CLOCK ? await loadOracle() : null;
const HAS_DL = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups.includes('DL'); } catch { return true; } })();
const srv = await createStaticServer({ root: DIST, port: PORT_BASE + 2 * SLOT });
const ORIGIN = srv.url;
const S = await openSession({ profile: `mfix${SLOT}`, cdpPort: PORT_BASE + 2 * SLOT + 1, tiles: 'inject' });
const cleanup = async () => { await S.close().catch(() => {}); await srv.close().catch(() => {}); };
process.on('SIGINT', () => { cleanup().finally(() => process.exit(130)); });

const NOISE = /maps\.googleapis|maps\.gstatic|Permissions policy violation|googleapis\.com\/maps/i;
const openTabs = new Set();
async function newTab(vp, { insets = null, fresh = false } = {}) {
  for (const p of openTabs) { await p.close().catch(() => {}); openTabs.delete(p); }
  const page = await S.newPage();
  openTabs.add(page);
  if (fresh) await page.addInitScript(() => { try { localStorage.removeItem('gtbg_onboarded'); } catch { /* storage blocked */ } });   // runs after the harness seed: first visit
  if (vp) await emulateViewport(page, vp);
  const c = await cdpFor(page);
  if (insets) await c.send('Emulation.setSafeAreaInsetsOverride', { insets }).catch((e) => { throw new Error(`setSafeAreaInsetsOverride: ${e.message}`); });
  await c.send('Fetch.enable', { patterns: ['https://maps.googleapis.com/*', 'https://maps.gstatic.com/*', 'https://www.google.com/*', 'https://*.googleapis.com/*', 'https://*.gstatic.com/*', 'https://*.google.com/*'].map((urlPattern) => ({ urlPattern })) });
  c.on('Fetch.requestPaused', (e) => { c.send('Fetch.failRequest', { requestId: e.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); });
  return page;
}
async function waitMapIdle(page, timeout = 20000) {
  try {
    await waitFor(async () => { await mapView(page); return page.evaluate(() => !!(window.__t0map && window.__t0map.loaded() && window.__t0map.areTilesLoaded())); }, { timeout, interval: 300, label: 'map tiles loaded' });
  } catch { /* tiles capped or slow: the geometry checks do not need them */ }
  await sleep(500);
}
async function loadApp(vp, { query = '', insets = null, idle = true, fresh = false } = {}) {
  const page = await newTab(vp, { insets, fresh });
  await page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(page, 45000);
  if (idle) await waitMapIdle(page); else await sleep(800);
  return page;
}
const shot = async (page, name) => { const f = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: f }); return f; };
const layoutOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-layout'));
// jump to a tick by a REAL touch on the scrubber (works on every train; the 4 px end zones only touch ticks 1 and 675)
const gotoTick = async (page, tick) => {
  const sc = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
  await touchTap(page, sc.x + (sc.w * (tick + 0.4)) / 675, sc.y);
};
const readTick = (page) => page.evaluate(() => {
  const fr = document.querySelector('[data-gt-frame]'); if (fr && Number.isFinite(Number(fr.getAttribute('data-gt-frame')))) return Number(fr.getAttribute('data-gt-frame'));    // CLOCK trees
  const m = document.body.innerText.match(/Tick (\d+)\/675/); if (m) return Number(m[1]);
  const th = document.querySelector('.gtbg-m-scrub > div:last-child'); const pc = th && parseFloat(th.style.left);
  return Number.isFinite(pc) ? Math.round((pc / 100) * 675) : null;
});
const dist = (a, b) => Math.round(Math.hypot((a[0] - b[0]) * Math.cos((a[1] * Math.PI) / 180), a[1] - b[1]) * 111320);
async function tapEl(page, loc, { scroll = true } = {}) {
  if (scroll) await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error('tapEl: element has no box');
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const top = await page.evaluate(([px, py]) => { const t = document.elementFromPoint(px, py); return t ? `${t.tagName.toLowerCase()}.${String(t.className).slice(0, 30)}` : null; }, [x, y]);
  await touchTap(page, x, y);
  return { x, y, top };
}
const tapAt = async (page, x, y) => { await touchTap(page, x, y); };
const toolsBtn = (page) => page.locator('.gtbg-m-top button', { hasText: 'Tools' }).first();
const toolsPanel = (page) => page.locator('.gtbg-m-toolspanel');
const tileBtn = (page, label) => page.locator('.gtbg-m-toolspanel button').filter({ has: page.getByText(label, { exact: true }) }).first();
const openTools = async (page) => { await tapEl(page, toolsBtn(page)); await toolsPanel(page).waitFor({ state: 'visible', timeout: 5000 }); await sleep(250); };
const openTile = async (page, label, wait = 900) => { await openTools(page); await tapEl(page, tileBtn(page, label)); await sleep(wait); };
const ALLERR = [];
const errorsOf = () => { const e = S.collector.firstParty.filter((x) => !NOISE.test(x.text + (x.url || ''))); for (const x of e) if (!ALLERR.some((y) => y.text === x.text && y.kind === x.kind)) ALLERR.push(x); return e; };
const fail = (lines, t) => { if (t) t.note('problems', lines); if (lines.length) { console.log(`      --- ${lines.length} problem(s):\n      ${lines.join('\n      ')}`); throw new Error(`${lines.length} problem(s), listed above`); } };
const suite = createSuite('mobile-fixes');

// ------------------------------------------------------------------ data from the shipped tree (what the app itself loads)
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(DIST, rel), 'utf8'));
const allPlacements = () => fs.readdirSync(path.join(DIST, 'data')).filter((f) => /^placements_.*\.json$/.test(f)).flatMap((f) => readJson(`data/${f}`).placements);
let PL = null;
const placementsOf = (id) => (PL ||= allPlacements()).filter((p) => p.unit_id === id).sort((a, b) => a.tick - b.tick);
const lastAtOrBefore = (id, tick) => { const l = placementsOf(id).filter((p) => p.tick <= tick); return l[l.length - 1] || null; };

// ------------------------------------------------------------------ in-page audit: interactive targets of a scope (>= 44 px short side, unoccluded, on screen)
function auditInPage({ root, selector, ignoreSel }) {
  const sel = selector || 'button, a[href], input, select, textarea, [role="button"], [role="option"], [role="slider"], [role="tab"], [role="checkbox"], summary, [style*="cursor: pointer"]';
  const scope = root ? document.querySelector(root) : document;
  if (!scope) return { missing: true, items: [] };
  const vw = innerWidth, vh = innerHeight;
  const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const label = (e) => (e.getAttribute('aria-label') || e.title || e.innerText || e.value || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const items = [];
  for (const el of scope.querySelectorAll(sel)) {
    if (ignoreSel && el.closest(ignoreSel)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let clip = { l: 0, t: 0, r: vw, b: vh }, scroller = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (/(auto|scroll)/.test(pcs.overflowX + pcs.overflowY)) { scroller = true; const pr = p.getBoundingClientRect(); clip = { l: Math.max(clip.l, pr.left), t: Math.max(clip.t, pr.top), r: Math.min(clip.r, pr.right), b: Math.min(clip.b, pr.bottom) }; }
    }
    const vis = Math.max(0, Math.min(r.right, clip.r) - Math.max(r.left, clip.l)) * Math.max(0, Math.min(r.bottom, clip.b) - Math.max(r.top, clip.t));
    if (scroller && vis / (r.width * r.height) < 0.5) continue;            // scrolled out of its container: not on screen, not judged here
    const issues = [];
    if (Math.min(r.width, r.height) < 43.5) issues.push(`TARGET_SIZE(${Math.round(r.width)}x${Math.round(r.height)})`);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx >= 0 && cy >= 0 && cx <= vw && cy <= vh) { const t = document.elementFromPoint(cx, cy); if (!t || !(t === el || el.contains(t) || t.contains(el))) issues.push(`OCCLUDED(by ${t ? desc(t) : 'nothing'})`); }
    items.push({ el: desc(el), label: label(el), w: Math.round(r.width), h: Math.round(r.height), issues });
  }
  return { items };
}
const audit = (page, opts = {}) => page.evaluate(auditInPage, { ...opts, ignoreSel: [opts.ignoreSel, '.gt-skip', '.mapboxgl-ctrl-logo'].filter(Boolean).join(', ') });
const offenders = (a, tag) => (a.items || []).filter((i) => i.issues.length).map((i) => `${tag}: ${i.el} "${i.label}" ${i.issues.join(' ')}`);

// =====================================================================================================================================================
// T0-MFIX-01  D-01  the way back from the desktop layout
suite.test('T0-MFIX-01', 'D-01: "Desktop View" is reversible: a persistent Phone view control in the desktop layout (touch/narrow), ?layout= is honoured and cleaned, no chooser gate', async (t) => {
  const lines = [], seen = {};
  const vps = pick('375x812', '320x568', '768x1024', '812x375');
  if (!vps.length) throw new Skip('no matching viewport selected');
  S.setTiles('block');
  try {
    for (const vp of vps) {
      const tag = vp.id;
      let page = await loadApp(vp, { idle: false });
      if ((await layoutOf(page)) !== 'mobile') { lines.push(`${tag}: first visit is not the phone layout`); continue; }
      await openTools(page); await tapEl(page, tileBtn(page, 'Desktop View')); await sleep(1200);
      if ((await layoutOf(page)) !== 'desktop') { lines.push(`${tag}: Desktop View did not switch`); continue; }
      const btn = page.locator('#ef-layout');
      try { await btn.waitFor({ state: 'visible', timeout: 12000 }); } catch { lines.push(`${tag}: no visible Phone view control (#ef-layout) in the desktop layout after Desktop View`); await shot(page, `${tag}-mf01-nocontrol`); continue; }
      await sleep(900);                         // the cluster is placed ~60 ms after it is revealed: let it settle before measuring and tapping
      const g = await page.evaluate(() => {
        const e = document.getElementById('ef-layout'); const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const top = document.elementFromPoint(cx, cy); const ov = document.getElementById('extra-features').getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), hit: !!top && (top === e || e.contains(top)), inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, label: e.getAttribute('aria-label'), name: e.textContent.trim(),
          overlay: [Math.round(ov.x), Math.round(ov.y), Math.round(ov.width), Math.round(ov.height)], iw: innerWidth };
      });
      seen[tag] = g;
      if (Math.min(g.w, g.h) < 44) lines.push(`${tag}: Phone view target ${g.w}x${g.h} < 44`);
      if (!g.hit) lines.push(`${tag}: Phone view is occluded at its centre`);
      if (!g.inView) lines.push(`${tag}: Phone view leaves the viewport`);
      if (!/phone/i.test(g.label || '') || !/phone/i.test(g.name)) lines.push(`${tag}: Phone view has no phone label (${g.label} / ${g.name})`);
      await shot(page, `${tag}-mf01-desktop-phoneview`);
      // it survives hiding the other pills (the eye toggle) because it is not inside #ef-controls
      await tapEl(page, page.locator('#ef-toggle')); await sleep(300);
      if (!(await btn.isVisible())) lines.push(`${tag}: Phone view disappears when the Extra Features pills are hidden (it must be persistent)`);
      await tapEl(page, page.locator('#ef-toggle')); await sleep(300);
      await tapEl(page, btn); await sleep(1500);
      const after = { layout: await layoutOf(page), stored: await page.evaluate(() => sessionStorage.getItem('gtbg_layout')), root: await page.evaluate(() => !!document.querySelector('.gtbg-m-root')), maps: await page.evaluate(() => document.querySelectorAll('.mapboxgl-map').length) };
      seen[`${tag} after`] = after;
      if (after.layout !== 'mobile' || !after.root) lines.push(`${tag}: tapping Phone view did not return to the phone layout (${JSON.stringify(after)})`);
      if (after.stored) lines.push(`${tag}: the desktop override is still stored after Phone view (${after.stored})`);
      if (after.maps !== 1) lines.push(`${tag}: ${after.maps} Mapbox maps after switching back (want 1)`);
      await page.reload({ waitUntil: 'load' }); await waitForApp(page, 45000); await sleep(500);
      if ((await layoutOf(page)) !== 'mobile') lines.push(`${tag}: reload after Phone view is not the phone layout`);
      if (await page.getByText('Choose Your Experience').count()) lines.push(`${tag}: the old chooser gate is back`);
      // ?layout=desktop: Phone view works and the parameter is gone afterwards
      page = await loadApp(vp, { query: '?layout=desktop', idle: false });
      if ((await layoutOf(page)) !== 'desktop') { lines.push(`${tag}: ?layout=desktop did not give the desktop layout`); continue; }
      try { await page.locator('#ef-layout').waitFor({ state: 'visible', timeout: 12000 }); } catch { lines.push(`${tag}: no Phone view on ?layout=desktop`); continue; }
      await sleep(900);
      await tapEl(page, page.locator('#ef-layout')); await sleep(1200);
      const u1 = new URL(page.url());
      if ((await layoutOf(page)) !== 'mobile' || u1.searchParams.has('layout')) lines.push(`${tag}: ?layout=desktop then Phone view: layout ${await layoutOf(page)}, url ${page.url()}`);
      await page.reload({ waitUntil: 'load' }); await waitForApp(page, 45000); await sleep(400);
      if ((await layoutOf(page)) !== 'mobile') lines.push(`${tag}: reload after ?layout=desktop + Phone view snaps back to ${await layoutOf(page)}`);
      // ?layout=mobile then Desktop View sticks (the parameter must not win on reload)
      page = await loadApp(vp, { query: '?layout=mobile', idle: false });
      await openTools(page); await tapEl(page, tileBtn(page, 'Desktop View')); await sleep(1000);
      await page.reload({ waitUntil: 'load' }); await waitForApp(page, 45000); await sleep(500);
      const l2 = await layoutOf(page); if (l2 !== 'desktop') lines.push(`${tag}: ?layout=mobile, Desktop View, reload gives ${l2} (the visitor's last choice must win)`);
    }
    // a mouse desktop never sees the control
    const dpage = await loadApp(DESKTOPS[0], { idle: false });
    await sleep(2500);
    const vis = await dpage.evaluate(() => { const e = document.getElementById('ef-layout'); return e ? getComputedStyle(e).display : 'none'; });
    seen.desktopMouse = vis; if (vis !== 'none') lines.push(`1440x900 mouse: Phone view is shown (${vis}); it belongs to touch/narrow devices only`);
  } finally { S.setTiles('inject'); }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-02  D-02  a unit chosen in Search / ?u= opens the popup and the camera flies to it
suite.test('T0-MFIX-02', 'D-02: Search-to-unit on the phone shell: popup + fly-to (last known keyframe), highlight, close deselects; ?u= deep links (with and without camera, not-yet-arrived, unknown id)', async (t) => {
  const lines = [], seen = {};
  const vps = SEL.length ? SEL : [];
  if (!vps.length) throw new Skip('no matching viewport selected');
  const maine = placementsOf('U-20ME')[0];
  for (const vp of vps) {
    const tag = vp.id;
    S.collector.clear();
    const page = await loadApp(vp, { query: HAS_DL ? '?t=300' : '' });
    if (!HAS_DL) await gotoTick(page, 300);
    const v0 = await mapView(page);
    await openTile(page, 'Search', 800);
    await tapEl(page, page.locator('input[aria-label="Search units"]').first());
    await page.keyboard.type('20th Maine', { delay: 25 }); await sleep(700);
    const row = await page.evaluate(() => { const d = document.querySelector('[aria-label="Search results"]'); const r0 = d && (d.querySelector('[data-gt-row]') || d.children[0]); if (!r0) return null; const r = r0.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (!row) { lines.push(`${tag}: no search result row for "20th Maine"`); continue; }
    await tapAt(page, row.x, row.y); await sleep(2600);
    const v1 = await mapView(page);
    const pop = await page.evaluate(() => {
      const p = document.querySelector('.gtbg-m-popup'); if (!p) return null;
      const r = p.getBoundingClientRect(); const c = p.querySelector('button'); const cr = c.getBoundingClientRect(); const top = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2);
      return { text: p.innerText.replace(/\s+/g, ' '), x: r.x, y: r.y, w: r.width, h: r.height, closeW: Math.round(cr.width), closeH: Math.round(cr.height), closeHit: !!top && (top === c || c.contains(top)),
        inView: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, vh: innerHeight };
    });
    seen[tag] = { moved: dist(v0.center, v1.center), zoom: [v0.zoom, v1.zoom], tick: await readTick(page), popup: pop && pop.text };
    if (!pop) { lines.push(`${tag}: Search picked 20th Maine but the phone shell shows no unit popup`); await shot(page, `${tag}-mf02-nopopup`); continue; }
    if (!/20th Maine/.test(pop.text)) lines.push(`${tag}: popup is for the wrong unit: ${pop.text.slice(0, 80)}`);
    if (!pop.inView) lines.push(`${tag}: popup leaves the viewport`);
    if (Math.min(pop.closeW, pop.closeH) < 44 || !pop.closeHit) lines.push(`${tag}: popup close ${pop.closeW}x${pop.closeH} hit=${pop.closeHit}`);
    if (dist(v0.center, v1.center) < 300) lines.push(`${tag}: the camera did not fly to the unit (moved ${dist(v0.center, v1.center)} m)`);
    if (v1.zoom < 14.9) lines.push(`${tag}: zoom after fly-to ${v1.zoom.toFixed(2)} < 15`);
    // the unit is on the map zone above the popup, not behind it
    const pos = await page.evaluate(([lng, lat]) => { const m = window.__t0map; const q = m.project([lng, lat]); const c = m.getContainer().getBoundingClientRect(); const pp = document.querySelector('.gtbg-m-popup').getBoundingClientRect(); return { x: c.left + q.x, y: c.top + q.y, mapTop: c.top, popupTop: pp.top, iw: innerWidth }; }, [maine.lng, maine.lat]);
    seen[tag].unit = pos;
    if (pos.x < 0 || pos.x > pos.iw || pos.y < pos.mapTop || pos.y > pos.popupTop) lines.push(`${tag}: the unit is at (${Math.round(pos.x)}, ${Math.round(pos.y)}), outside the visible map above the popup (${Math.round(pos.mapTop)}..${Math.round(pos.popupTop)})`);
    await shot(page, `${tag}-mf02-search-picked`);
    // close deselects; the same search flies again from a panned-away camera
    await tapAt(page, pop.x + pop.w - 22, pop.y + 22); await sleep(500);
    if (await page.evaluate(() => !!document.querySelector('.gtbg-m-popup'))) lines.push(`${tag}: popup close did not close it`);
    await touchSwipe(page, [vp.width * 0.8, vp.height * 0.4], [vp.width * 0.2, vp.height * 0.4], { steps: 10 }); await sleep(900);
    const v2 = await mapView(page);
    await openTile(page, 'Search', 700);
    await tapEl(page, page.locator('input[aria-label="Search units"]').first());
    await page.keyboard.type('20th Maine', { delay: 25 }); await sleep(600);
    const row2 = await page.evaluate(() => { const d = document.querySelector('[aria-label="Search results"]'); const r0 = d && (d.querySelector('[data-gt-row]') || d.children[0]); if (!r0) return null; const r = r0.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (row2) { await tapAt(page, row2.x, row2.y); await sleep(2400); const v3 = await mapView(page); seen[tag].again = { panned: dist(v1.center, v2.center), back: dist(v2.center, v3.center) }; if (dist(v2.center, v3.center) < 100) lines.push(`${tag}: searching the same unit again did not fly back to it (moved ${dist(v2.center, v3.center)} m)`); if (!(await page.evaluate(() => !!document.querySelector('.gtbg-m-popup')))) lines.push(`${tag}: no popup the second time`); }
    const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  // deep links (375x812 and the two extremes that are selected); trains without group DL do not read ?u=
  if (!HAS_DL) t.note('deep links', 'skipped: this tree has no DL group (R1b)');
  for (const vp of HAS_DL ? pick('375x812', '320x568', '812x375') : []) {
    const tag = `${vp.id} deep`;
    S.collector.clear();
    const greene = lastAtOrBefore('U-XII-2-3', 538);
    // with an explicit camera the link's camera wins (no fly)
    let page = await loadApp(vp, { query: `?t=538&u=U-XII-2-3&z=16&ll=${greene.lat},${greene.lng}` });
    await sleep(1500);
    let text = await page.evaluate(() => { const p = document.querySelector('.gtbg-m-popup'); return p ? p.innerText.replace(/\s+/g, ' ') : null; });
    let v = await mapView(page);
    seen[tag] = { withCamera: { popup: text && text.slice(0, 60), off: dist(v.center, [greene.lng, greene.lat]), zoom: v.zoom } };
    if (!text || !/Greene/i.test(text)) lines.push(`${tag}: ?u=U-XII-2-3 with ll/z: popup is ${text ? text.slice(0, 60) : 'missing'} (the same link shows "Greene's Brigade" on the desktop layout)`);
    if (dist(v.center, [greene.lng, greene.lat]) > 80 || Math.abs(v.zoom - 16) > 0.2) lines.push(`${tag}: explicit camera not honoured: ${dist(v.center, [greene.lng, greene.lat])} m off, zoom ${v.zoom.toFixed(2)}`);
    await shot(page, `${tag}-mf02-withcamera`);
    // no camera in the link: fly to the unit's last known position at or before the tick
    page = await loadApp(vp, { query: '?t=538&u=U-XII-2-3' });
    await sleep(2500);
    text = await page.evaluate(() => { const p = document.querySelector('.gtbg-m-popup'); return p ? p.innerText.replace(/\s+/g, ' ') : null; });
    v = await mapView(page);
    seen[tag].noCamera = { popup: text && text.slice(0, 60), off: dist(v.center, [greene.lng, greene.lat]), zoom: v.zoom };
    if (!text || !/Greene/i.test(text)) lines.push(`${tag}: ?u= without camera: popup is ${text ? text.slice(0, 60) : 'missing'}`);
    if (v.zoom < 14.9) lines.push(`${tag}: ?u= without camera did not fly in (zoom ${v.zoom.toFixed(2)})`);
    // the camera is centred in the area above the popup, so the unit's own position is what matters
    const pos = await page.evaluate(([lng, lat]) => { const m = window.__t0map; const q = m.project([lng, lat]); const c = m.getContainer().getBoundingClientRect(); const pp = document.querySelector('.gtbg-m-popup'); return { x: c.left + q.x, y: c.top + q.y, mapTop: c.top, popupTop: pp ? pp.getBoundingClientRect().top : innerHeight, iw: innerWidth }; }, [greene.lng, greene.lat]);
    if (pos.x < 0 || pos.x > pos.iw || pos.y < pos.mapTop || pos.y > pos.popupTop) lines.push(`${tag}: ?u= without camera: the unit is at (${Math.round(pos.x)}, ${Math.round(pos.y)}), outside the visible map above the popup`);
    await shot(page, `${tag}-mf02-nocamera`);
    // a unit that has not arrived yet at tick 1: popup says so and the camera goes to where it first appears
    page = await loadApp(vp, { query: '?t=1&u=U-20ME' });
    await sleep(2500);
    text = await page.evaluate(() => { const p = document.querySelector('.gtbg-m-popup'); return p ? p.innerText.replace(/\s+/g, ' ') : null; });
    v = await mapView(page);
    seen[tag].notArrived = { popup: text && text.slice(0, 80), off: dist(v.center, [maine.lng, maine.lat]) };
    if (!text || !/20th Maine/.test(text) || !/not on the field/i.test(text)) lines.push(`${tag}: ?t=1&u=U-20ME: popup is ${text ? text.slice(0, 80) : 'missing'}; want the unit with a "not on the field" disposition`);
    // an id that does not exist: no popup, no error
    page = await loadApp(vp, { query: '?t=300&u=U-NOPE' });
    await sleep(1500);
    if (await page.evaluate(() => !!document.querySelector('.gtbg-m-popup'))) lines.push(`${tag}: ?u=U-NOPE opened a popup`);
    const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-03  D-03  Help on a phone: header and close stay on screen while the content scrolls
suite.test('T0-MFIX-03', 'D-03: Help modal on the phone shell: the header (tabs + close X) is sticky, the panel fits the viewport, the close X is reachable after scrolling', async (t) => {
  const lines = [], seen = {};
  if (!SEL.length) throw new Skip('no matching viewport selected');
  S.setTiles('block');
  try {
    for (const vp of SEL) {
      const tag = vp.id;
      const page = await loadApp(vp, { idle: false });
      await openTile(page, 'Help', 1000);
      const probe = () => page.evaluate(() => {
        const ov = document.querySelector('.gtbg-modal-overlay'); if (!ov) return null;
        const panel = ov.firstElementChild, head = panel.firstElementChild;
        const close = [...head.querySelectorAll('button')].find((b) => /close/i.test(b.getAttribute('aria-label') || '') || /^[✕×x]$/i.test(b.textContent.trim()));
        const hr = head.getBoundingClientRect(), pr = panel.getBoundingClientRect(), cr = close.getBoundingClientRect();
        const top = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2);
        const tabs = [...head.querySelectorAll('button')].filter((b) => b !== close).map((b) => b.getBoundingClientRect());
        return { headTop: Math.round(hr.top), panelTop: Math.round(pr.top), panelBottom: Math.round(pr.bottom), scrollTop: Math.round(panel.scrollTop), scrollH: [panel.scrollHeight, panel.clientHeight],
          closeBox: [Math.round(cr.x), Math.round(cr.y), Math.round(cr.width), Math.round(cr.height)], closeHit: !!top && (top === close || close.contains(top)), vw: innerWidth, vh: innerHeight, headScroll: [head.scrollWidth, head.clientWidth],
          tabsMinH: Math.round(Math.min(...tabs.map((x) => x.height))), tabsRight: Math.round(Math.max(...tabs.map((x) => x.right))), text: panel.innerText.slice(0, 400) };
      });
      const a = await probe();
      if (!a) { lines.push(`${tag}: Help did not open`); continue; }
      seen[tag] = { before: a };
      await shot(page, `${tag}-mf03-help`);
      if (a.panelBottom > a.vh + 1 || a.panelTop < -1) lines.push(`${tag}: Help panel [${a.panelTop}..${a.panelBottom}] leaves the ${a.vh} px viewport`);
      if (a.headScroll[0] > a.headScroll[1] + 1) lines.push(`${tag}: Help header overflows ${a.headScroll.join(' > ')} (tabs + close do not fit)`);
      if (Math.min(a.closeBox[2], a.closeBox[3]) < 44 || a.tabsMinH < 44) lines.push(`${tag}: Help close ${a.closeBox[2]}x${a.closeBox[3]} / tabs min height ${a.tabsMinH} < 44`);
      // scroll the content by a REAL touch swipe (and by script when the content is short), the header must not move
      const box = await page.evaluate(() => { const p = document.querySelector('.gtbg-modal-overlay').firstElementChild; const r = p.getBoundingClientRect(); return { x: r.x + r.width / 2, y1: r.y + r.height * 0.85, y0: r.y + r.height * 0.3 }; });
      await touchSwipe(page, [box.x, box.y1], [box.x, box.y0], { steps: 14, stepMs: 16 }); await sleep(500);
      let b = await probe();
      if (b.scrollH[0] > b.scrollH[1] + 8 && b.scrollTop < 20) { await page.evaluate(() => { const p = document.querySelector('.gtbg-modal-overlay').firstElementChild; p.scrollTop = Math.round((p.scrollHeight - p.clientHeight) * 0.6); }); await sleep(300); b = await probe(); }
      seen[tag].after = { scrollTop: b.scrollTop, headTop: b.headTop, closeBox: b.closeBox, closeHit: b.closeHit, scrollable: b.scrollH };
      if (b.scrollH[0] > b.scrollH[1] + 8) {
        if (b.scrollTop < 20) lines.push(`${tag}: the Help content did not scroll (scrollTop ${b.scrollTop}, ${b.scrollH.join('/')})`);
        if (Math.abs(b.headTop - a.headTop) > 1) lines.push(`${tag}: Help header scrolled away: top ${a.headTop} -> ${b.headTop} (scrollTop ${b.scrollTop})`);
        if (!b.closeHit || b.closeBox[1] < 0) lines.push(`${tag}: Help close X is not reachable after scrolling: box ${b.closeBox.join(',')}, hit=${b.closeHit}`);
      }
      await shot(page, `${tag}-mf03-help-scrolled`);
      // the phone Help is about touch (content owned by group AX): informational
      seen[tag].touchContent = /pinch|tap/i.test(a.text);
      await tapAt(page, b.closeBox[0] + b.closeBox[2] / 2, b.closeBox[1] + b.closeBox[3] / 2); await sleep(600);
      if (await page.evaluate(() => !!document.querySelector('.gtbg-modal-overlay'))) lines.push(`${tag}: the close X (tapped after scrolling) did not close Help`);
    }
  } finally { S.setTiles('inject'); }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-04  D-04  story + event cards: one expanded, one chip, never the whole map, never over the day tabs
suite.test('T0-MFIX-04', 'D-04: story + event cards stack: exactly one expanded, the other a 44 px chip (tap swaps), the stack clears the day tabs and never covers the map (all viewports)', async (t) => {
  const lines = [], seen = {};
  if (!SEL.length) throw new Skip('no matching viewport selected');
  S.setTiles('block');                      // the cards are React/store driven: no map tiles needed
  for (const vp of SEL) {
    S.collector.clear();
    for (const q of ['?t=556', '?t=12']) {
      const tag = `${vp.id}${q}`;
      const page = await loadApp(vp, { query: HAS_DL ? q : '', idle: false });
      if (!HAS_DL) await gotoTick(page, Number(q.slice(3)));
      await sleep(2800);
      const g = () => page.evaluate(() => {
        const st = document.querySelector('.gtbg-mp-story'); const map = document.querySelector('.gtbg-m-map'); const days = document.querySelector('.gtbg-m-days'); const top = document.querySelector('.gtbg-m-top');
        const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
        const cards = st ? [...st.children].map((c) => { const r = c.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const hitEl = document.elementFromPoint(x, Math.min(Math.max(y, 1), innerHeight - 1));
          const close = [...c.querySelectorAll('button')].find((b) => /close/i.test(b.getAttribute('aria-label') || '')); const cr = close && close.getBoundingClientRect();
          return { kind: /story/.test(c.className) ? 'story' : 'event', collapsed: c.hasAttribute('data-collapsed'), h: Math.round(r.height), w: Math.round(r.width), y: Math.round(r.y), bottom: Math.round(r.bottom), hit: !!hitEl && c.contains(hitEl), role: c.getAttribute('role'), chip: c.getAttribute('data-chip'),
            close: cr ? [Math.round(cr.width), Math.round(cr.height), (() => { const tt = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2); return !!tt && (tt === close || close.contains(tt)); })()] : null }; }) : [];
        const dayHits = days ? [...days.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e && (e === b || b.contains(e)); }) : [];
        return { stack: rect(st), map: rect(map), days: rect(days), top: rect(top), cards, dayHits, vh: innerHeight, vw: innerWidth, landscape: innerWidth > innerHeight };
      });
      const a = await g();
      if (!a.stack || !a.cards.length) { seen[tag] = 'no cards'; await shot(page, `${tag}-mf04`); continue; }
      seen[tag] = { n: a.cards.length, expanded: a.cards.filter((c) => !c.collapsed).map((c) => `${c.kind}:${c.h}`), chips: a.cards.filter((c) => c.collapsed).map((c) => `${c.kind}:${c.h}`), stack: [Math.round(a.stack.y), Math.round(a.stack.b)] };
      await shot(page, `${tag.replace('?', '-')}-mf04-cards`);
      if (a.cards.length >= 2) {
        const exp = a.cards.filter((c) => !c.collapsed);
        if (exp.length !== 1) lines.push(`${tag}: ${exp.length} cards expanded (want exactly one of ${a.cards.length})`);
        for (const c of a.cards.filter((x) => x.collapsed)) {
          if (c.h < 44 || c.h > 48) lines.push(`${tag}: chip height ${c.h} (want 44)`);
          if (!c.hit) lines.push(`${tag}: chip (${c.kind}) is occluded at its centre`);
          if (c.role !== 'button') lines.push(`${tag}: chip (${c.kind}) has role ${c.role}, want button`);
        }
      }
      // geometry: the stack clears the day tabs (portrait) / top bar (landscape) and the map is not covered
      const topLimit = a.landscape ? a.top.b : a.days.b;
      if (a.stack.y < topLimit - 0.5) lines.push(`${tag}: the card stack starts at y=${Math.round(a.stack.y)}, above the ${a.landscape ? 'top bar' : 'day tabs'} bottom (${Math.round(topLimit)})`);
      const mapArea = a.map.w * a.map.h, covered = Math.max(0, Math.min(a.stack.r, a.map.r) - Math.max(a.stack.x, a.map.x)) * Math.max(0, Math.min(a.stack.b, a.map.b) - Math.max(a.stack.y, a.map.y));
      seen[tag].uncovered = Math.round((1 - covered / mapArea) * 100);
      if (1 - covered / mapArea < 0.25) lines.push(`${tag}: the cards cover ${Math.round((covered / mapArea) * 100)}% of the map (want at most 75%)`);
      if (!a.landscape && a.dayHits.some((h) => !h)) lines.push(`${tag}: a day tab is occluded (${JSON.stringify(a.dayHits)})`);
      for (const c of a.cards.filter((x) => !x.collapsed && x.close)) { if (Math.min(c.close[0], c.close[1]) < 44 || !c.close[2]) lines.push(`${tag}: ${c.kind} close ${c.close[0]}x${c.close[1]} hit=${c.close[2]}`); }
      // a tap on the chip swaps which card is expanded
      if (a.cards.length >= 2) {
        const chipIdx = a.cards.findIndex((c) => c.collapsed);
        if (chipIdx < 0) { lines.push(`${tag}: ${a.cards.length} cards and none is collapsed to a chip`); continue; }
        const before = a.cards.map((c) => c.collapsed);
        const pos = await page.evaluate((i) => { const c = document.querySelector('.gtbg-mp-story').children[i]; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, chipIdx);
        await tapAt(page, pos.x, pos.y); await sleep(500);
        const b = await g();
        const after = b.cards.map((c) => c.collapsed);
        if (b.cards.length === a.cards.length && (after[chipIdx] !== false || after.filter(Boolean).length !== 1)) lines.push(`${tag}: tapping the chip did not swap the expanded card (before ${before}, after ${after})`);
        await shot(page, `${tag.replace('?', '-')}-mf04-cards-swapped`);
        // dismissing the expanded card expands the other one
        const closeBtn = await page.evaluate(() => { const c = [...document.querySelector('.gtbg-mp-story').children].find((x) => !x.hasAttribute('data-collapsed')); const b = c && [...c.querySelectorAll('button')].find((x) => /close/i.test(x.getAttribute('aria-label') || '')); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        if (closeBtn) { await tapAt(page, closeBtn.x, closeBtn.y); await sleep(600); const c2 = await g(); if (c2.cards.length && c2.cards.some((c) => c.collapsed) && c2.cards.length === 1) lines.push(`${tag}: the remaining card stayed collapsed after the other was dismissed`); if (c2.cards.length === 1 && c2.cards[0].collapsed) lines.push(`${tag}: single remaining card is a chip`); }
      }
    }
    const errs = errorsOf(); if (errs.length) lines.push(`${vp.id}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  S.setTiles('inject');
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-05  D-05  onboarding: "Tap Play at the bottom" must be possible
suite.test('T0-MFIX-05', 'D-05: onboarding tour on a phone: the dock stays reachable (elementFromPoint at Play, a real tap starts playback), the card still scrolls/advances', async (t) => {
  const lines = [], seen = {};
  const vps = pick('375x812', '320x568', '390x844', '812x375', '768x1024');
  if (!vps.length) throw new Skip('no matching viewport selected');
  S.setTiles('block');
  for (const vp of vps) {
    const tag = vp.id;
    S.collector.clear();
    const page = await loadApp(vp, { fresh: true, idle: false });
    try { await page.getByText('How do you want to explore the battle?').waitFor({ state: 'visible', timeout: 8000 }); } catch { lines.push(`${tag}: no onboarding on a first visit`); continue; }
    await sleep(500);
    await tapEl(page, page.locator('#root button', { hasText: /New to Gettysburg/ }).first()); await sleep(900);
    await shot(page, `${tag}-mf05-tour-step1`);
    const info = await page.evaluate(() => {
      const play = document.querySelector('button[aria-label="Play"]'); if (!play) return { noPlay: true };
      const r = play.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]'); const dr = dlg && dlg.getBoundingClientRect();
      const next = [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Next/.test(b.textContent)); next && next.scrollIntoView({ block: 'nearest' }); const nr = next && next.getBoundingClientRect();
      const nTop = nr && document.elementFromPoint(nr.x + nr.width / 2, nr.y + nr.height / 2);
      const dock = document.querySelector('.gtbg-m-dock').getBoundingClientRect();
      const speed = document.querySelector('.gtbg-m-play > button:nth-child(4)'); const sr = speed.getBoundingClientRect(); const sTop = document.elementFromPoint(sr.x + sr.width / 2, sr.y + sr.height / 2);
      return { playHit: !!top && (top === play || play.contains(top)), playBox: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], dlg: dr && [Math.round(dr.x), Math.round(dr.y), Math.round(dr.width), Math.round(dr.height)],
        dlgBottomOverDock: dr ? dr.bottom > dock.top + 1 : null, nextHit: !!nTop && !!next && (nTop === next || next.contains(nTop)), nextBox: nr && [Math.round(nr.width), Math.round(nr.height)], speedHit: !!sTop && (sTop === speed || speed.contains(sTop)),
        text: dlg ? dlg.innerText.replace(/\s+/g, ' ').slice(0, 200) : null, vh: innerHeight, dockTop: Math.round(dock.top), dlgScroll: dlg ? [dlg.scrollHeight, dlg.clientHeight] : null };
    });
    seen[tag] = info;
    if (info.noPlay) { lines.push(`${tag}: no Play button in the DOM during the tour`); continue; }
    if (!info.playHit) lines.push(`${tag}: step 1 says "Tap Play at the bottom" but the Play button is covered (elementFromPoint returns another element)`);
    if (info.dlgBottomOverDock) lines.push(`${tag}: the tour card [${info.dlg}] overlaps the dock (top ${info.dockTop})`);
    if (!info.nextHit || (info.nextBox && Math.min(...info.nextBox) < 44)) lines.push(`${tag}: tour Next button hit=${info.nextHit} box=${info.nextBox}`);
    if (!info.speedHit) lines.push(`${tag}: the speed button is covered by the tour overlay`);
    const tick0 = await readTick(page);
    const pb = info.playBox; await tapAt(page, pb[0] + pb[2] / 2, pb[1] + pb[3] / 2); await sleep(2200);
    const playing = await page.evaluate(() => !!document.querySelector('button[aria-label="Pause"]'));
    const tick1 = await readTick(page);
    seen[tag].playTap = { playing, tick0, tick1 };
    if (!playing) lines.push(`${tag}: a real tap on Play during the tour did not start playback`);
    if (playing) { await tapAt(page, pb[0] + pb[2] / 2, pb[1] + pb[3] / 2); await sleep(300); }
    // the tour itself still advances and ends by touch
    const next = page.locator('[role="dialog"] button', { hasText: /Next/ }).first();
    if (await next.count()) { await tapEl(page, next); await sleep(500); }
    const still = await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'));
    if (!still) lines.push(`${tag}: the tour closed on Next`);
    await shot(page, `${tag}-mf05-tour-step2`);
    const skip = page.locator('[role="dialog"] button', { hasText: 'Skip tour' }).first();
    if (await skip.count()) { await tapEl(page, skip); await sleep(600); }
    if (await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'))) lines.push(`${tag}: Skip tour did not close the tour`);
    // the phone onboarding rule must not leak to the other modal overlays: Follow Ancestor still dims and blocks the whole screen (dock included)
    await openTile(page, 'Follow Ancestor', 900);
    const anc = await page.evaluate(() => { const t = document.elementFromPoint(innerWidth / 2, innerHeight - 6); const dock = document.querySelector('.gtbg-m-dock'); return { onDock: !!t && (dock.contains(t) || t === dock), tag: t && `${t.tagName.toLowerCase()}.${String(t.className).slice(0, 20)}` }; });
    seen[tag].ancestorOverDock = anc;
    if (anc.onDock) lines.push(`${tag}: the Follow Ancestor overlay no longer covers the dock (${anc.tag}): the tour rule leaks to other modals`);
    const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  S.setTiles('inject');
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-06  D-06  44 px targets inside the re-homed desktop panels
suite.test('T0-MFIX-06', 'D-06: every interactive target inside the re-homed panels (Search rows/quick links/sort, Filter range, Follow Ancestor input, OOB, Soldier, Layers, Legend, Bookmarks, cards) is >= 44 px and unoccluded (all viewports)', async (t) => {
  const lines = [], seen = {};
  if (!SEL.length) throw new Skip('no matching viewport selected');
  const shellIgnore = '.gtbg-m-dock, .gtbg-m-top, .gtbg-m-days, .mapboxgl-map, .gtbg-m-toolspanel';
  const close = async (page) => { await page.evaluate(() => { for (const b of document.querySelectorAll('.gtbg-mp-top button[aria-label="Close"], [aria-label="Close"]')) { b.click(); } }); await sleep(300); };
  S.setTiles('block');
  try {
    for (const vp of SEL) {
      const tag = vp.id;
      let page = await loadApp(vp, { idle: false });
      const found = [];
      const run = async (name, fn) => { try { await fn(); } catch (e) { found.push(`${tag} ${name}: ${String(e.message).split('\n')[0].slice(0, 120)}`); } };
      await run('search', async () => {
        await openTile(page, 'Search', 900);
        found.push(...offenders(await audit(page, { root: '#root', ignoreSel: shellIgnore }), `${tag} search(empty)`));
        await tapEl(page, page.locator('input[aria-label="Search units"]').first()); await page.keyboard.type('Maine', { delay: 25 }); await sleep(700);
        found.push(...offenders(await audit(page, { root: '#root', ignoreSel: shellIgnore }), `${tag} search(typed)`));
        await shot(page, `${tag}-mf06-search`);
      });
      page = await loadApp(vp, { idle: false });
      await run('filter', async () => { await openTile(page, 'Filter', 900); found.push(...offenders(await audit(page, { root: '#root', ignoreSel: shellIgnore }), `${tag} filter`)); await shot(page, `${tag}-mf06-filter`); });
      page = await loadApp(vp, { idle: false });
      await run('ancestor', async () => {
        await openTile(page, 'Follow Ancestor', 900);
        await tapEl(page, page.locator('input[aria-label="Regiment name"]').first()).catch(() => {}); await page.keyboard.type('20', { delay: 25 }); await sleep(700);
        found.push(...offenders(await audit(page, { root: '#root', ignoreSel: shellIgnore }), `${tag} ancestor`)); await shot(page, `${tag}-mf06-ancestor`);
      });
      for (const [tile, label] of [['Order of Battle', 'oob'], ['Unit Roster', 'roster'], ["Soldier's View", 'soldier'], ['Map Layers', 'layers'], ['Legend', 'legend'], ['Bookmarks', 'bookmarks']]) {
        page = await loadApp(vp, { idle: false });
        await run(label, async () => { await openTile(page, tile, 1000); found.push(...offenders(await audit(page, { root: '#root', ignoreSel: shellIgnore }), `${tag} ${label}`)); });
      }
      page = await loadApp(vp, { query: '?t=556', idle: false }); await sleep(2500);
      await run('cards', async () => { found.push(...offenders(await audit(page, { root: '.gtbg-mp-story' }), `${tag} cards`)); });
      const uniq = [...new Set(found)];
      seen[tag] = uniq.length;
      lines.push(...uniq);
      const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
    }
  } finally { S.setTiles('inject'); }
  t.note('offenders per viewport', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-07  D-07  landscape: compact day control, tick label, minimap
suite.test('T0-MFIX-07', 'D-07: landscape phone: the day tabs (compact, in the top bar), the tick label and the minimap are there, >= 44 px, unoccluded, and work by touch', async (t) => {
  const lines = [], seen = {};
  const vps = SEL.filter((v) => v.landscape);
  if (!vps.length) throw new Skip('no landscape viewport selected');
  S.setTiles('block');
  for (const vp of vps) {
    const tag = vp.id;
    const page = await loadApp(vp, { query: '?t=300', idle: false });
    const g = await page.evaluate(() => {
      const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      const days = [...document.querySelectorAll('.gtbg-m-days button')].map((b) => { const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return { text: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height), x: Math.round(q.x), y: Math.round(q.y), hit: !!e && (e === b || b.contains(e)), vis: getComputedStyle(b).display !== 'none' && q.width > 0 }; });
      const tickEl = [...document.querySelectorAll('.gtbg-m-play > div')][0]; const frEl = document.querySelector('[data-gt-frame]'); const tick = tickEl && { text: tickEl.innerText, frame: frEl ? Number(frEl.getAttribute('data-gt-frame')) : null, ...r(tickEl), shown: getComputedStyle(tickEl).display !== 'none' };
      const mini = document.querySelector('.gtbg-m-mini'); const leg = document.querySelector('.gtbg-m-legend'); const map = document.querySelector('.gtbg-m-map'); const dock = document.querySelector('.gtbg-m-dock'); const top = document.querySelector('.gtbg-m-top');
      const clock = document.querySelector('.gtbg-m-top > div'); const tools = [...document.querySelectorAll('.gtbg-m-top button')].find((b) => /Tools/.test(b.textContent));
      return { days, tick, mini: mini && { ...r(mini), shown: getComputedStyle(mini).display !== 'none' }, leg: r(leg), map: r(map), dock: r(dock), top: r(top), clock: r(clock), tools: r(tools), iw: innerWidth, ih: innerHeight };
    });
    seen[tag] = { days: g.days.map((d) => `${d.text}:${d.w}x${d.h}`), tick: g.tick && g.tick.text, mini: g.mini && [Math.round(g.mini.x), Math.round(g.mini.y), Math.round(g.mini.w), Math.round(g.mini.h)] };
    if (g.days.length !== 3 || g.days.some((d) => !d.vis)) { lines.push(`${tag}: no day control in landscape (${g.days.length} tabs, visible ${g.days.filter((d) => d.vis).length})`); await shot(page, `${tag}-mf07-nodays`); continue; }
    for (const d of g.days) { if (Math.min(d.w, d.h) < 44) lines.push(`${tag}: day "${d.text}" ${d.w}x${d.h} < 44`); if (!d.hit) lines.push(`${tag}: day "${d.text}" is occluded`); }
    const dayL = Math.min(...g.days.map((d) => d.x)), dayR = Math.max(...g.days.map((d) => d.x + d.w));
    if (dayL < g.clock.r + 4 || dayR > g.tools.x - 4) lines.push(`${tag}: the day tabs [${dayL}..${dayR}] collide with the clock (right edge ${Math.round(g.clock.r)}) or the Tools button (left ${Math.round(g.tools.x)})`);
    if (g.days.some((d) => d.y + d.h > g.top.b + 1)) lines.push(`${tag}: day tabs run below the top bar (${Math.round(g.top.b)})`);
    // the dock label of the moment: "Tick n/675" on a tree without CLOCK; the clock of the frame the row stands on (the oracle's "about 7:05 PM") on a tree with it
    const labelOk = g.tick && g.tick.shown && (HAS_CLOCK ? g.tick.frame !== null && g.tick.text.replace(/\s+/g, ' ').trim() === ORACLE.fmt(g.tick.frame, 'time') : /Tick \d+\/675/.test(g.tick.text));
    if (!labelOk) lines.push(`${tag}: no tick label in landscape (${g.tick && g.tick.text}${HAS_CLOCK && g.tick ? `, frame ${g.tick.frame} reads ${ORACLE.fmt(g.tick.frame || 1, 'time')}` : ''})`);
    else if (g.tick.x + g.tick.w > g.iw || g.tick.y < g.dock.y - 1) lines.push(`${tag}: tick label leaves the dock`);
    if (!g.mini || !g.mini.shown) lines.push(`${tag}: no minimap in landscape`);
    else {
      if (g.mini.y < g.map.y - 1 || g.mini.b > g.map.b + 1 || g.mini.x < 0 || g.mini.r > g.iw) lines.push(`${tag}: minimap [${Math.round(g.mini.x)},${Math.round(g.mini.y)} ${Math.round(g.mini.w)}x${Math.round(g.mini.h)}] leaves the map zone`);
      if (g.leg && g.mini.x < g.leg.r - 1 && g.mini.r > g.leg.x && g.mini.y < g.leg.b && g.mini.b > g.leg.y) lines.push(`${tag}: minimap overlaps the legend`);
    }
    await shot(page, `${tag}-mf07-landscape`);
    // by touch: July 2 jumps to tick 226, July 3 to 451, July 1 back to 1
    for (const [i, want] of [[1, 226], [2, 451], [0, 1]]) {
      const d = g.days[i]; await tapAt(page, d.x + d.w / 2, d.y + d.h / 2); await sleep(700);
      const tk = await readTick(page); if (tk !== want) lines.push(`${tag}: tapping "${d.text}" gives tick ${tk}, want ${want}`);
      const clockDay = await page.evaluate(() => document.querySelector('.gtbg-m-top').innerText.replace(/\s+/g, ' ')); if (!new RegExp(`JULY ${i + 1}`, 'i').test(clockDay)) lines.push(`${tag}: after "${d.text}" the clock reads "${clockDay}"`);
    }
    // the cards (right column) do not run into the minimap
    const cards = await loadApp(vp, { query: '?t=556', idle: false }); await sleep(2500);
    const ov = await cards.evaluate(() => { const m = document.querySelector('.gtbg-m-mini').getBoundingClientRect(); const st = document.querySelector('.gtbg-mp-story'); const s = st ? st.getBoundingClientRect() : null; return s ? { miniR: m.right, stackL: s.left, hit: s.left < m.right && s.width > 0 } : null; });
    if (ov && ov.hit) lines.push(`${tag}: the card column (left ${Math.round(ov.stackL)}) overlaps the minimap (right ${Math.round(ov.miniR)})`);
    const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  S.setTiles('inject');
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-08  D-08  landscape Tools sheet respects the right safe-area inset
suite.test('T0-MFIX-08', 'D-08: landscape Tools sheet with 44 px side insets: the sheet runs to the edge, its close button and tiles stay inside the inset (emulated safe areas)', async (t) => {
  const lines = [], seen = {};
  const vps = SEL.filter((v) => v.landscape);
  if (!vps.length) throw new Skip('no landscape viewport selected');
  S.setTiles('block');
  try {
    for (const vp of vps) {
      const tag = vp.id;
      const page = await loadApp(vp, { insets: { left: 44, right: 44, top: 0, bottom: 21 }, idle: false });
      const ins = await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:var(--gt-sar);height:var(--gt-sal)'; document.body.appendChild(d); const r = d.getBoundingClientRect(); d.remove(); return [r.width, r.height]; });
      seen[tag] = { insets: ins };
      if (ins[0] < 40) { lines.push(`${tag}: the emulated safe-area inset did not reach the page (${ins})`); continue; }
      await openTools(page);
      const g = await page.evaluate(() => {
        const p = document.querySelector('.gtbg-m-toolspanel'); const pr = p.getBoundingClientRect(); const close = p.querySelector('button[aria-label="Close tools"]').getBoundingClientRect();
        const tiles = [...p.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') !== 'Close tools').map((b) => b.getBoundingClientRect());
        const links = [...p.querySelectorAll('a')].map((a) => a.getBoundingClientRect());
        return { panelR: Math.round(pr.right), panelL: Math.round(pr.left), closeR: Math.round(close.right), tilesR: Math.round(Math.max(...tiles.map((x) => x.right))), linksR: links.length ? Math.round(Math.max(...links.map((x) => x.right))) : null, iw: innerWidth, close: [Math.round(close.width), Math.round(close.height)] };
      });
      seen[tag].sheet = g;
      await shot(page, `${tag}-mf08-tools-insets`);
      if (g.panelR < g.iw - 1) lines.push(`${tag}: the sheet stops at ${g.panelR}, short of the screen edge ${g.iw}`);
      if (g.closeR > g.iw - 44 + 1) lines.push(`${tag}: close button right edge ${g.closeR} is inside the 44 px right inset (limit ${g.iw - 44})`);
      if (g.tilesR > g.iw - 44 + 1) lines.push(`${tag}: tool tiles reach x=${g.tilesR}, inside the right inset (limit ${g.iw - 44})`);
      if (g.linksR && g.linksR > g.iw - 44 + 1) lines.push(`${tag}: Extra Features links reach x=${g.linksR}, inside the right inset`);
      if (Math.min(...g.close) < 44) lines.push(`${tag}: close ${g.close.join('x')} < 44`);
    }
  } finally { S.setTiles('inject'); }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-09  D-13 + WCAG 2.5.3  scrubber end zones; speed button label in name
suite.test('T0-MFIX-09', 'D-13 / WCAG 2.5.3: a tap 1 px inside the scrubber edges gives tick 675 / 1 (never 673 / 0); the speed button name starts with its visible text', async (t) => {
  const lines = [], seen = {};
  if (!SEL.length) throw new Skip('no matching viewport selected');
  S.setTiles('block');
  try {
    for (const vp of SEL) {
      const tag = vp.id;
      const page = await loadApp(vp, { query: '?t=300', idle: false });
      const sc = await page.evaluate(() => { const r = document.querySelector('.gtbg-m-scrub').getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
      const res = {};
      for (const [name, dx, want] of [['right-1', sc.w - 1, 675], ['right-4', sc.w - 4, 675], ['left+1', 1, 1], ['left+3', 3, 1]]) {      // 4 px end zones
        await tapAt(page, sc.x + dx, sc.y); await sleep(350); res[name] = await readTick(page);
        if (res[name] !== want) lines.push(`${tag}: tap at ${name} gives tick ${res[name]}, want ${want}`);
      }
      // linear elsewhere: tick 12 (the first shot) is still reachable by a tap at its own position, as are 300 and 640
      for (const want of [12, 300, 640]) { await tapAt(page, sc.x + (sc.w * want) / 675, sc.y); await sleep(350); res[`t${want}`] = await readTick(page); if (Math.abs(res[`t${want}`] - want) > 2) lines.push(`${tag}: a tap at the linear position of tick ${want} gives tick ${res[`t${want}`]}`); }
      // the middle is still linear (+-3 ticks)
      await tapAt(page, sc.x + sc.w / 2, sc.y); await sleep(350); res.mid = await readTick(page);
      if (Math.abs(res.mid - 338) > 3) lines.push(`${tag}: tap at the middle gives tick ${res.mid}, want 338 +-3`);
      await tapAt(page, sc.x + sc.w * 0.25, sc.y); await sleep(350); res.q1 = await readTick(page);
      if (Math.abs(res.q1 - 169) > 4) lines.push(`${tag}: tap at 25% gives tick ${res.q1}, want 169 +-4`);
      // drag across the whole track ends on 675
      await touchSwipe(page, [sc.x + 20, sc.y], [sc.x + sc.w + 30, sc.y], { steps: 14 }); await sleep(350); res.dragEnd = await readTick(page);
      if (res.dragEnd !== 675) lines.push(`${tag}: dragging past the right end gives tick ${res.dragEnd}`);
      seen[tag] = res;
      // label in name: the accessible name (computed by Chrome through getByRole) starts with the visible text "1x"
      const vis = await page.evaluate(() => { const b = document.querySelector('.gtbg-m-play > button:nth-child(4)'); return { text: b.textContent.trim(), label: b.getAttribute('aria-label') }; });
      seen[tag].speed = vis;
      if (!vis.label || !vis.label.trim().toLowerCase().startsWith(vis.text.toLowerCase())) lines.push(`${tag}: speed button visible text "${vis.text}" is not the start of its accessible name "${vis.label}" (WCAG 2.5.3)`);
      const byRole = await page.getByRole('button', { name: new RegExp('^' + vis.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).count();
      if (byRole < 1) lines.push(`${tag}: no button whose accessible name starts with "${vis.text}"`);
    }
  } finally { S.setTiles('inject'); }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-10  desktop shell: the Extra Features menu fits the viewport and every entry can be reached (also by keyboard)
suite.test('T0-MFIX-10', 'desktop shell: the Extra Features menu has a viewport-sized max-height with internal scrolling: every entry reachable (wheel, keyboard), Escape returns focus', async (t) => {
  const lines = [], seen = {};
  const vps = [...DESKTOPS, { id: '375x812-desktop', width: 375, height: 812, dpr: 3, mobile: true, query: '?layout=desktop' }, { id: '768x1024-desktop', width: 768, height: 1024, dpr: 2, mobile: true, query: '?layout=desktop' }];
  S.setTiles('block');
  try {
    for (const vp of vps) {
      const tag = vp.id;
      const page = await loadApp(vp, { query: vp.query || '', idle: false });
      await sleep(2500);
      const ok = await page.locator('#ef-btn').isVisible().catch(() => false);
      if (!ok) { lines.push(`${tag}: the Extra Features button is not visible`); continue; }
      const open = async () => { await page.evaluate(() => document.getElementById('ef-btn').click()); await sleep(500); };
      await open();
      const m = await page.evaluate(() => {
        const menu = document.getElementById('ef-menu'); const r = menu.getBoundingClientRect(); const items = [...menu.querySelectorAll('.gtbg-item')].filter((x) => x.offsetParent !== null);   // the entries the page shows: links, and (group POLISH, where the toolbar has no room) the Toggle Units button; entries the stylesheet hides are not entries
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth, sh: menu.scrollHeight, ch: menu.clientHeight, n: items.length, maxH: menu.style.maxHeight, overflowY: getComputedStyle(menu).overflowY, role: menu.getAttribute('role'), tabindex: menu.getAttribute('tabindex'), up: menu.classList.contains('gtbg-up') };
      });
      seen[tag] = m;
      if (m.n < 19) lines.push(`${tag}: only ${m.n} menu entries`);
      if (m.top < 0 || m.bottom > m.vh + 1 || m.left < 0 || m.right > m.vw + 1) lines.push(`${tag}: the open menu [${m.left},${m.top} .. ${m.right},${m.bottom}] leaves the ${m.vw}x${m.vh} viewport`);
      if (!/auto|scroll/.test(m.overflowY)) lines.push(`${tag}: menu overflow-y is ${m.overflowY}`);
      await shot(page, `${tag}-mf10-menu`);
      // every entry: scroll it into view inside the menu, it must be within the viewport and hit-testable
      const reach = await page.evaluate(() => {
        const menu = document.getElementById('ef-menu'); const bad = [];
        for (const a of [...menu.querySelectorAll('.gtbg-item')].filter((x) => x.offsetParent !== null)) {
          a.scrollIntoView({ block: 'nearest' }); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          const inVp = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
          if (!(e && (e === a || a.contains(e))) || !inVp) bad.push(`${a.textContent.trim().slice(0, 24)} @${Math.round(r.top)}..${Math.round(r.bottom)} hit=${!!(e && (e === a || a.contains(e)))}`);
        }
        return bad;
      });
      if (reach.length) lines.push(`${tag}: ${reach.length} menu entries cannot be reached by scrolling: ${reach.slice(0, 4).join('; ')}`);
      // the wheel scrolls it (when it is scrollable at this size)
      if (m.sh > m.ch + 4) {
        await page.evaluate(() => { document.getElementById('ef-menu').scrollTop = 0; });
        const c = { x: (m.left + m.right) / 2, y: (m.top + m.bottom) / 2 };
        await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, 400); await sleep(300);
        const st = await page.evaluate(() => document.getElementById('ef-menu').scrollTop); if (st < 50) lines.push(`${tag}: the wheel does not scroll the open menu (scrollTop ${st})`);
      }
      // keyboard: End goes to the last entry, which is then fully visible; Escape closes and returns focus to the button
      await page.evaluate(() => document.getElementById('ef-btn').focus());
      await page.keyboard.press('ArrowDown'); await sleep(200);
      const f1 = await page.evaluate(() => document.activeElement && document.activeElement.className);
      if (!/gtbg-item/.test(String(f1))) lines.push(`${tag}: ArrowDown from the button did not move to an entry (focus on ${f1})`);
      await page.keyboard.press('End'); await sleep(300);
      const last = await page.evaluate(() => { const a = document.activeElement; const items = [...document.querySelectorAll('#ef-menu .gtbg-item')].filter((x) => x.offsetParent !== null); const r = a.getBoundingClientRect(); return { isLast: a === items[items.length - 1], top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, label: a.textContent.trim().slice(0, 30) }; });
      seen[tag].lastFocus = last;
      if (!last.isLast) lines.push(`${tag}: End did not reach the last entry (${last.label})`);
      if (last.top < 0 || last.bottom > last.vh) lines.push(`${tag}: the last entry "${last.label}" is focused but off screen (${last.top}..${last.bottom} of ${last.vh})`);
      await page.keyboard.press('Escape'); await sleep(300);
      const after = await page.evaluate(() => ({ open: document.getElementById('ef-menu').classList.contains('open'), focus: document.activeElement && document.activeElement.id }));
      if (after.open || after.focus !== 'ef-btn') lines.push(`${tag}: Escape: menu open=${after.open}, focus on #${after.focus} (want closed and #ef-btn)`);
      // a keyboard open (Enter on the button) moves focus into the menu
      await page.evaluate(() => document.getElementById('ef-btn').focus()); await page.keyboard.press('Enter'); await sleep(400);
      const kf = await page.evaluate(() => document.activeElement && document.activeElement.className);
      if (!/gtbg-item/.test(String(kf))) lines.push(`${tag}: opening with Enter did not move focus to the first entry (${kf})`);
      await page.keyboard.press('Escape');
    }
  } finally { S.setTiles('inject'); }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-11  desktop shell: the pills hide behind modals and never overlap panels
suite.test('T0-MFIX-11', 'desktop shell: the Ask the Historian / Extra Features pills sit below modal layers, hide while a modal is open (Help, Bookmarks, onboarding, Walkthrough) and never overlap panels or cards', async (t) => {
  const lines = [], seen = {};
  const modalProbe = (page) => page.evaluate(() => {
    const e = document.getElementById('extra-features'); const cs = getComputedStyle(e);
    const layerZ = (m) => { for (let n = m; n && n !== document.body; n = n.parentElement) { const z = parseInt(getComputedStyle(n).zIndex, 10); if (Number.isFinite(z)) return z; } return 0; };
    const modals = [...document.querySelectorAll('.gtbg-modal-overlay, [role="dialog"][aria-modal="true"]')].map(layerZ);
    return { z: parseInt(cs.zIndex, 10), visible: cs.visibility !== 'hidden' && +cs.opacity > 0.01, htmlClass: document.documentElement.classList.contains('gtbg-modal-open'), modalZ: modals };
  });
  const overlapProbe = (page) => page.evaluate(() => {
    const ov = document.getElementById('extra-features').getBoundingClientRect(); const out = [];
    const root = document.getElementById('root');
    for (const el of root.querySelectorAll('*')) {
      const cs = getComputedStyle(el); if (!(cs.position === 'fixed' || cs.position === 'absolute')) continue; if (cs.pointerEvents === 'none' && !/gtbg-mp/.test(el.className)) continue;
      const z = parseInt(cs.zIndex, 10); if (!(z >= 80)) continue;
      const r = el.getBoundingClientRect(); if (r.width < 90 || r.height < 36 || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; if (el.tagName === 'CANVAS') continue;
      if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9) continue;
      if (!(ov.right <= r.left || ov.left >= r.right || ov.bottom <= r.top || ov.top >= r.bottom)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 18)} z${z} ${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}`);
    }
    return { overlay: [Math.round(ov.x), Math.round(ov.y), Math.round(ov.width), Math.round(ov.height)], out };
  });
  S.setTiles('inject');
  for (const vp of [DESKTOPS[0], DESKTOPS[1]]) {
    const tag = vp.id;
    S.collector.clear();
    const page = await loadApp(vp, { query: '?t=10', idle: false });
    await sleep(2500);
    let p = await modalProbe(page);
    seen[tag] = { base: p };
    if (!p.visible) lines.push(`${tag}: the pills are not visible with no modal open`);
    // Help (the ? key), Bookmarks (B)
    for (const [name, key, closeKey] of [['Help', '?', 'Escape'], ['Bookmarks', 'b', 'Escape']]) {
      await page.keyboard.press(key); await sleep(1200);
      p = await modalProbe(page);
      seen[tag][name] = p;
      if (!p.modalZ.length) { lines.push(`${tag}: ${name} did not open`); continue; }
      if (p.visible) lines.push(`${tag}: the pills are visible over the ${name} modal (pills z ${p.z}, modal z ${p.modalZ})`);
      if (!(p.z < Math.min(...p.modalZ))) lines.push(`${tag}: pills z-index ${p.z} is not below the ${name} modal layer ${p.modalZ}`);
      await shot(page, `${tag}-mf11-${name.toLowerCase()}`);
      // close with its own close button (Escape closes it for keyboard users only when the focus is in it)
      await page.evaluate(() => { const b = document.querySelector('.gtbg-modal-overlay button[aria-label^="Close"]'); b && b.click(); }); await sleep(900);
      p = await modalProbe(page); if (p.modalZ.length) { await page.keyboard.press('Escape'); await sleep(500); p = await modalProbe(page); }
      if (!p.visible) lines.push(`${tag}: the pills did not come back after ${name} closed`);
    }
    // Virtual Walkthrough (a full-screen layer)
    const wt = page.locator('#root button', { hasText: /Virtual Walkthrough/ }).first();
    if (await wt.count()) {
      await wt.click(); await sleep(2500);
      p = await modalProbe(page); seen[tag].walkthrough = p;
      if (p.visible) lines.push(`${tag}: the pills are visible over the Virtual Walkthrough layer`);
      await shot(page, `${tag}-mf11-walkthrough`);
      const back = page.locator('#root button', { hasText: /Back to the map|Animated Map/ }).first();
      if (await back.count()) { await back.click(); await sleep(1200); }
      p = await modalProbe(page); if (!p.visible) lines.push(`${tag}: the pills did not come back after the Walkthrough closed`);
    } else lines.push(`${tag}: no Virtual Walkthrough button`);
    // panels: the story card appears while playing (tick ~14); the Layers panel; neither is overlapped
    await page.evaluate(() => { const b = document.querySelector('button[title^="Play"]'); b && b.click(); });
    let worst = null, cardSeen = false;
    for (let i = 0; i < 16; i++) {
      await sleep(900);
      cardSeen = cardSeen || (await page.evaluate(() => !!document.querySelector('[data-gtbg-card], [style*="z-index: 92"]')));
      let o = await overlapProbe(page);
      if (o.out.length) { await sleep(2200); o = await overlapProbe(page); if (o.out.length) { worst = o; break; } }      // re-placement is debounced (<= ~1.3 s): judge the settled state
    }
    seen[tag].cardSeen = cardSeen;
    seen[tag].overlapWhilePlaying = worst || 'none';
    if (worst) lines.push(`${tag}: the pills ${worst.overlay.join(',')} overlap ${worst.out.join(' | ')}`);
    await page.evaluate(() => { const b = document.querySelector('button[title^="Play"]'); b && b.click(); });
    await page.evaluate(() => { const b = [...document.querySelectorAll('#root button')].find((x) => /Map Layers/i.test(x.title || '')); b && b.click(); }); await sleep(1500);
    await sleep(1800);
    const o2 = await overlapProbe(page); seen[tag].withLayers = o2;
    if (o2.out.length) lines.push(`${tag}: with Map Layers open the pills overlap ${o2.out.join(' | ')}`);
    await shot(page, `${tag}-mf11-panels`);
    const errs = errorsOf(); if (errs.length) lines.push(`${tag}: ${errs.length} error(s): ${JSON.stringify(errs.slice(0, 2))}`);
  }
  // the first-visit onboarding dialog on a desktop: the pills must not sit above it
  {
    const vp = DESKTOPS[0], tag = `${vp.id} onboarding`;
    const page = await loadApp(vp, { fresh: true, idle: false });
    try {
      await page.getByText('How do you want to explore the battle?').waitFor({ state: 'visible', timeout: 8000 });
      await sleep(5500);       // past the 5 s CSS force-reveal fallback of the overlay
      const p = await modalProbe(page); seen[tag] = p;
      if (p.visible) lines.push(`${tag}: the pills float above the onboarding dialog (z ${p.z})`);
      await shot(page, `${tag}-mf11`);
    } catch { lines.push(`${tag}: no onboarding on a first visit`); }
  }
  t.note('seen', seen);
  fail(lines, t);
});

// =====================================================================================================================================================
// T0-MFIX-12  no uncaught exceptions anywhere in the flows above
suite.test('T0-MFIX-12', 'zero uncaught exceptions and first-party console errors across the T0-MFIX flows (Mapbox tile noise and blocked Google requests ignored)', async (t) => {
  t.note('mapbox requests this run', `${tileBudget.used} of ${tileBudget.cap} (blocked ${tileBudget.blocked})`);
  errorsOf();
  fail(ALLERR.map((e) => `${e.kind}: ${e.text.slice(0, 160)}`), t);
});

// ------------------------------------------------------------------ run
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile: OUT, extra: () => ({ dist: path.relative(REPO, DIST), viewports: SEL.map((v) => v.id), mapboxRequests: tileBudget.used, mapboxCap: tileBudget.cap }) });
} finally { await cleanup(); }
const failed = summary.failed;
if (EXPECT_RED) { console.log(failed ? 'expect-red: failing as expected' : 'expect-red: UNEXPECTEDLY GREEN'); process.exit(failed ? 0 : 1); }
process.exit(failed ? 1 : 0);
