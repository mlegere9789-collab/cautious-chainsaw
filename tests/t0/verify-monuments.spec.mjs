// Independent adversarial verification of the Monuments layer (optional patch group MON: tools/t0/patches-next/MON.json, tools/t0/MON-README.md) on R1c + MON.
// RED BY DESIGN: every test below pins a defect found by real-input attack on a scratch build of R1c with MON; each FAILS on that build today and should pass once the
// defect is fixed (precedent: tests/copy/verify-*.test.mjs).  The builder's own suite is tests/t0/monuments.spec.mjs (not trusted here: nothing of it is reused).
// Real system Chrome (headless), real CDP mouse / keyboard / touch input, Mapbox tiles only through the Referer-injecting harness (tests/t0/lib.mjs), a Netlify-like server on 127.0.0.1.
//
//   python tools/t0/mon/mon_build.py --train R1c --out tmp/verify-monuments/mon-R1c                  build the tree under test (never into release/)
//   python tools/t0/mon/mon_build.py --train R1c --out tmp/verify-monuments/ctl-R1c --without-mon    the same train without MON (control: VMON-13, -14 and -16 are red on it too, they are not MON's)
//   node tests/t0/verify-monuments.spec.mjs                                   all tests against tmp/verify-monuments/mon-R1c/dist (about 250 tile requests; the tiles are cut off at 235)
//                                                                             [2026-10-05, MON verifier fixes: the one numeric change of this file is the tile block of the desktop session, `used > 110` -> `used > 40`:
//                                                                             with defect 01 fixed the list pick really flies to zoom 16 and loads new tiles, so the old threshold used up the 300-request cap before the
//                                                                             phone tests (09, 10, 15) could boot a map; geometry, hit tests and keys need no tiles. No assertion changed; one process: 193 requests, 16 of 16]
//   node tests/t0/verify-monuments.spec.mjs --dist <tree> --filter 'VMON-0[1-4]'     subset by id regex (each invocation has its own tile budget of 300)
//   node tests/t0/verify-monuments.spec.mjs --expect-red                      exit 0 only while every selected test is still red (use it to notice a defect that was fixed)
//
// Ids (severity words are the verifier's; "pre-existing" = the same on the control tree without MON):
//   T0-VMON-01 [medium] Browse monuments, a far monument chosen from the list: the map is meant to fly there at zoom >= 16 (focusMonument), but the card's own pan (ensureVisible) cancels the
//                       flight for every monument south of the view: the map only slides, still at zoom 13.3, the 14 m monument is a dot at the bottom edge of the window
//   T0-VMON-02 [medium] a monument that sits under a control that lives inside the map container (zoom in / out, compass, the four attribution links; the container capture handler only exempts
//                       .gtmon-pop and .gtmon-ctl) swallows the click: a card opens and the control does nothing (7 of 7 controls lose the click)
//   T0-VMON-03 [medium] the Distance Tool: the first click on a monument opens its card instead of placing the measuring point (the capture handler stops the click before the tool sees it)
//   T0-VMON-04 [medium] units cannot be selected with the layer on when they lie within 11 px of a monument: 4 of 4 isolated units selected with the layer off, 0 of 4 with it on (the card
//                       opens); about a quarter of the drawn units in the window are that close at zoom 14.2, and 45-57 % at the default overview zoom 13.3
//   T0-VMON-05 [medium] story card vs the app clock: "Jump to this moment" lands on a tick whose clock (HUD and toolbar) differs by 2.0-9.0 h from the time the card's narrative quotes (9 of 9
//                       narratives that name a time); documented by the builder as owner decision 3 (D-TIME), still an on-screen contradiction
//   T0-VMON-06 [medium] keyboard: Esc on a card that was opened from the Browse list leaves the focus on <body> (README: "Esc closes list or card and returns focus"; the previous focus is the hidden list row)
//   T0-VMON-07 [low]    keyboard: "Jump to this moment" removes the card that holds the focus and the focus falls to <body>
//   T0-VMON-08 [low]    4 of the 20 story cards print a raw unit id ("Linked unit: U-I-1-2W - on the field ...") because the order of battle does not know the unit; Jump selects no unit for them
//   T0-VMON-09 [medium] phone 320x568: the bottom sheet of a tall card (329 px) covers the whole map area including the marker the user tapped (3 of 5 markers end up under the sheet)
//   T0-VMON-10 [low]    phone 320x568 and 812x375: the open sheet covers the Browse monuments control (axe target-size "serious" under WCAG 2.2 AA, the repo's own tag set)
//   T0-VMON-11 [low]    the Browse list keeps its previous search text when it is reopened and focus() does not select it: typing the next name appends to the old one and finds nothing
//   T0-VMON-12          retired (a measurement artifact of the first probes, see the note in the code)
//   T0-VMON-13 [medium, pre-existing] desktop window narrower than about 990 px: the "Virtual Walkthrough" toolbar button lies on top of Search, Filter, Unit Roster, Legend and Monuments, so the
//                       restored Monuments toggle cannot be reached with a mouse in a half-width (960 px) window (control tree: identical)
//   T0-VMON-14 [medium] static: 3 of the 20 story stars lie more than 1.4 km from every one of the 512 monuments (Iron Brigade 2.0 km, Reynolds Death Site 2.1 km, 26th North Carolina 1.5 km);
//                       the stars are drawn where the legacy `mA` array puts them, so they are not on their statues and Jump flies to a place with no monument (data pre-existing, shown by MON)
//   T0-VMON-15 [medium] phone: the open Browse list runs out of the window or under the legend / dock (320x568 bottom 571 > 568 and 0 of 6 shown rows tappable, 375x812 5 of 7, 812x375 bottom 434 > 375 and 1 of 4)
//   T0-VMON-17 [low]    layout round trip: phone on -> Desktop View -> toolbar on -> Phone view -> tile OFF -> Desktop View: the layer is ON again and the toolbar button pressed, the user's last choice
//                       (off) is not kept (the desktop button's own React state wins when the desktop layout is mounted again; the README says button and tile drive the same switch)
//   T0-VMON-16 [medium] static: 5 of the 20 story stars are named after a regiment but link a different brigade of the order of battle (26th North Carolina -> Brockenbrough's, 140th and 83rd
//                       Pennsylvania -> McCandless's, 1st Minnesota -> Smyth's, 72nd Pennsylvania -> Hall's): the card says "Linked unit" with that brigade, Jump selects its panel, the glow follows its presence
process.env.T0_AGENT ??= 'verify-monuments';
process.env.T0_PORT_BASE ??= '8900';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, sleep, waitFor, waitForApp, chooseLayout, mapView, emulateViewport, touchTap, cdpFor, tileBudget, Skip } = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'tmp/verify-monuments/mon-R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/mon/mon_build.py --train R1c --out tmp/verify-monuments/mon-R1c`); process.exit(2); }
const VERSION = fs.existsSync(path.join(DIST, 'version.json')) ? JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')) : { entry: null };
const ENTRY = path.join(DIST, 'assets', VERSION.entry || fs.readdirSync(path.join(DIST, 'assets')).filter((x) => /^index-.*\.js$/.test(x)).sort((a, b) => fs.statSync(path.join(DIST, 'assets', b)).size - fs.statSync(path.join(DIST, 'assets', a)).size)[0]);
const ENTRY_TEXT = fs.readFileSync(ENTRY, 'utf8');
const HAS_MON = ENTRY_TEXT.includes('gtmon-dots');
const NEED_MON = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '15', '17']);          // 13, 14 and 16 are not MON's (toolbar overlap at 960 px, story data): they run on any tree
const HAS_HEADERS = fs.existsSync(path.join(DIST, '_headers')) && fs.existsSync(path.join(DIST, '_redirects')) && fs.existsSync(path.join(DIST, 'netlify.toml'));

// ------------------------------------------------------------------ ground truth read from the shipped entry (the two inline arrays) and the shipped data files
function grab(start) {
  const i = ENTRY_TEXT.indexOf(start); if (i < 0) throw new Error(`no ${start} in the entry`);
  const j = i + start.length - 1; let d = 0, k = j, str = null, esc = false;
  for (; k < ENTRY_TEXT.length; k++) {
    const c = ENTRY_TEXT[k];
    if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '[') d++; else if (c === ']') { d--; if (d === 0) break; }
  }
  return (0, eval)(`(${ENTRY_TEXT.slice(j, k + 1)})`);
}
let TRUTH = null;
const truth = () => (TRUTH ||= { A: grab('_A=['), MA: grab('mA=[') });
// the app's own data model (the same file lists and merge order as tests/t0/journeys-desktop.spec.mjs: per tick and unit the later file wins, then every unit keeps its latest keyframe at or before the tick)
const DAY_FILES = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json', 'density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json', 'density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json', 'density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
const fileRows = (f) => { const j = JSON.parse(fs.readFileSync(path.join(DIST, 'data', f), 'utf8')); return Array.isArray(j) ? j : j.placements || []; };
/** where the app draws each unit at `tick`: { unit_id -> { unit_id, lng, lat } } */
const unitsAt = (tick) => {
  const days = tick <= 225 ? [1] : tick <= 450 ? [1, 2] : [1, 2, 3]; const m = {}, cur = new Map();
  for (const d of days) for (const f of DAY_FILES[d]) for (const r of fileRows(f)) (m[r.tick] ||= new Map()).set(r.unit_id, r);
  for (let t = 1; t <= tick; t++) if (m[t]) for (const [u, r] of m[t]) cur.set(u, r);
  return [...cur.values()].map((r) => ({ unit_id: r.unit_id, lng: r.lng, lat: r.lat }));
};

// ------------------------------------------------------------------ server + sessions
let srv = null;
async function server() {
  if (srv) return srv;
  if (HAS_HEADERS) { const { createEmulator } = await import(pathToFileURL(path.join(REPO, 'tools/t0/config/emulate.mjs')).href); srv = await createEmulator({ dist: DIST, port: PORT_BASE }); }
  else srv = await createStaticServer({ root: DIST, port: PORT_BASE });
  return srv;
}
const live = [];
let seq = 0;
async function session(viewport, layout) {
  const s = await server();
  const n = ++seq; const cdpPort = PORT_BASE + 1 + (n % 8);
  const S = await openSession({ profile: `vm${n}`, cdpPort, viewport });
  live.push(S); S.origin = s.url;
  const p = S.page;
  await p.goto(`${S.origin}/`, { waitUntil: 'load' });
  await waitForApp(p, 60000);
  if (layout !== 'auto') await chooseLayout(p, layout);
  if (layout === 'desktop') { await waitFor(async () => !!(await mapView(p)), { timeout: 40000, label: 'map instance' }); await waitFor(async () => /Tick \d+\/675/.test(await text(p)), { timeout: 40000, label: 'clock' }).catch(() => {}); }
  await sleep(1500);
  return S;
}
const closeAll = async () => { for (const S of live.splice(0)) await S.close().catch(() => {}); if (srv) { await srv.close().catch(() => {}); srv = null; } };
const F = {};
const desk = async () => {
  if (!F.desk) { F.desk = await session({ width: 1440, height: 900, dpr: 1, mobile: false }, 'desktop'); await monOn(F.desk.page); }
  const S = F.desk;
  if (tileBudget.used > 40 && !S.__blocked) { S.setTiles('block'); S.__blocked = true; }          // geometry, hit tests and keys need no tiles; the budget is kept for the phone sessions
  await tidy(S.page);
  return S;
};
const phone = async (viewport) => {
  const S = await session(viewport, 'mobile'); await waitFor(async () => !!(await mapView(S.page)), { timeout: 40000, label: 'phone map' }).catch(() => {});
  if (tileBudget.used > 150) S.setTiles('block');                                    // geometry and hit tests need no tiles; keep the budget of this process
  await tools(S.page, /Monuments/); await sleep(1000);
  return S;
};

// ------------------------------------------------------------------ page helpers (all input is real CDP input)
const text = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const readTick = async (p) => { const m = /Tick (\d+)\/675/.exec(await text(p)); return m ? +m[1] : null; };
const monInfo = (p) => p.evaluate(() => (window.__gtmon ? window.__gtmon.info() : null));
const setCam = (p, cam) => p.evaluate((c) => window.__t0map.jumpTo(c), cam);
const pagePoint = (p, lng, lat) => p.evaluate(([lo, la]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const q = m.project([lo, la]); return { x: q.x + c.left, y: q.y + c.top }; }, [lng, lat]);
const placeAt = async (p, lng, lat, x, y, zoom = 15.4) => {
  await setCam(p, { center: [lng, lat], zoom, bearing: 0, pitch: 0 }); await sleep(150);
  await p.evaluate(([cx, cy, lo, la]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const q = m.project([lo, la]); m.panBy([q.x - (cx - c.left), q.y - (cy - c.top)], { duration: 0 }); }, [x, y, lng, lat]);
  await sleep(250);
  return pagePoint(p, lng, lat);
};
const click = async (p, x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); };
const clickEl = async (p, loc) => { const b = await loc.first().boundingBox(); if (!b) throw new Error(`no box for ${loc}`); await click(p, b.x + b.width / 2, b.y + b.height / 2); };
const cardId = (p) => p.evaluate(() => { const c = document.querySelector('[data-gtmon-card]'); return c ? c.getAttribute('data-gtmon-card') : null; });
const active = (p) => p.evaluate(() => { const e = document.activeElement; if (!e) return null; return { tag: e.tagName, cls: String(e.className).slice(0, 40), label: (e.getAttribute('aria-label') || e.title || e.textContent || '').trim().slice(0, 50) }; });
const monOn = async (p) => {
  const btn = p.locator('button[title="Monuments"]').first();
  if (!(await monInfo(p)).on) await clickEl(p, btn);
  await waitFor(async () => { const g = await p.evaluate(() => window.__t0map.getStyle().layers.filter((l) => l.id.startsWith('gtmon')).map((l) => (l.layout && l.layout.visibility) || 'visible')); return g.length === 4 && g.every((v) => v === 'visible'); }, { timeout: 8000, label: 'the layer shown' });
  await sleep(300);
};
/** back to a calm state between tests: no card, no list, no unit panel, focus on the body */
const tidy = async (p) => {
  await p.keyboard.press('Escape'); await sleep(120);
  await p.evaluate(() => { const a = document.activeElement; a && a.blur && a.blur(); });
  await p.keyboard.press('Escape'); await sleep(200);
};
/** keyboard route to a monument: the Browse control, the search box, the first row */
const listPick = async (p, name, { clear = true } = {}) => {
  await p.evaluate(() => document.querySelector('.gtmon-ctl-btn').focus()); await p.keyboard.press('Enter');
  await waitFor(() => p.evaluate(() => !!document.querySelector('.gtmon-panel:not([hidden])')), { timeout: 4000, label: 'the list open' });
  if (clear) await p.keyboard.press('Control+A');
  await p.keyboard.type(name, { delay: 4 }); await sleep(250);
  await p.keyboard.press('ArrowDown'); await sleep(100); await p.keyboard.press('Enter');
};
const tools = async (p, tile) => {
  const tb = p.locator('button', { hasText: /^\s*(\S{1,2}\s*)?Tools\s*$/ }); const b = await tb.first().boundingBox(); await touchTap(p, b.x + b.width / 2, b.y + b.height / 2); await sleep(900);
  const t = p.locator('button', { hasText: tile }).first(); await t.scrollIntoViewIfNeeded().catch(() => {}); const q = await t.boundingBox(); await touchTap(p, q.x + q.width / 2, q.y + q.height / 2);
};

const suite = createSuite('verify-monuments');
const test = (id, title, fn) => suite.test(`T0-VMON-${id}`, title, async (t) => { if (NEED_MON.has(id) && !HAS_MON) throw new Skip('this tree has no MON group (no gtmon in the entry bundle)'); return fn(t); });

// ------------------------------------------------------------------ 01
test('01', '[medium] Browse list: choosing a far monument flies the map there at zoom >= 16 (it only slides at zoom 13.3 for monuments south of the view)', async (t) => {
  const S = await desk(); const p = S.page; const { A } = truth(); const rows = [];
  for (const name of ['Alabama State Monument', 'Pennsylvania State Memorial', '6th Wisconsin Infantry Monument']) {
    const i = A.findIndex((m) => m.name === name); assert(i >= 0, `no monument ${name} in the shipped array`);
    await setCam(p, { center: [-77.2306, 39.8307], zoom: 13.3, bearing: 0, pitch: 0 }); await sleep(600);
    await listPick(p, name); await sleep(3000);
    const v = await mapView(p); const at = await pagePoint(p, A[i].lon, A[i].lat);
    rows.push({ name, zoom: +v.zoom.toFixed(2), card: await cardId(p), markerAtY: Math.round(at.y) });
    await tidy(p);
  }
  t.note('rows', rows);
  const bad = rows.filter((r) => r.zoom < 15.9);
  assert(bad.length === 0, `the list pick must end at zoom >= 16 (the code asks for max(zoom, 16)), but ${bad.length} of ${rows.length} ended zoomed out: ${JSON.stringify(rows)}`);
});

// ------------------------------------------------------------------ 02
test('02', '[medium] a monument drawn under a control inside the map (zoom in, zoom out, compass, the four attribution links): the control still receives a real click and no card opens', async (t) => {
  const S = await desk(); const p = S.page; const { A } = truth(); const m = A[300]; const rows = [];
  const targets = [['zoom in', '.mapboxgl-ctrl-zoom-in'], ['zoom out', '.mapboxgl-ctrl-zoom-out'], ['compass', '.mapboxgl-ctrl-compass'], ['attribution link 1', '.mapboxgl-ctrl-attrib-inner a:nth-of-type(1)'], ['attribution link 2', '.mapboxgl-ctrl-attrib-inner a:nth-of-type(2)'], ['attribution link 3', '.mapboxgl-ctrl-attrib-inner a:nth-of-type(3)'], ['attribution link 4', '.mapboxgl-ctrl-attrib-inner a:nth-of-type(4)']];
  for (const [label, sel] of targets) {
    const box = await p.evaluate((s2) => { const e = document.querySelector(s2); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    assert(box, `${label} (${sel}) not found inside the map`);
    // the element counts the clicks that reach it (and cancels the navigation of a link, so no tab is opened)
    await p.evaluate((s2) => { const e = document.querySelector(s2); if (!e.__vmCount) { e.__vmCount = 0; e.addEventListener('click', (ev) => { e.__vmCount++; ev.preventDefault(); }); } }, sel);
    const count = () => p.evaluate((s2) => document.querySelector(s2).__vmCount, sel);
    // precondition: with no monument near it a real click reaches the control (and a zoom control zooms)
    await setCam(p, { center: [m.lon, m.lat], zoom: 15.4, bearing: 0, pitch: 0 }); await sleep(300);
    const z0 = (await mapView(p)).zoom, c0 = await count(); await click(p, box.x, box.y); await sleep(900); const z1 = (await mapView(p)).zoom;
    assert((await count()) === c0 + 1, `precondition: the real click did not reach ${label} even without a monument under it`);
    if (/zoom/.test(label)) assert(Math.abs(z1 - z0) > 0.3, `precondition: the ${label} control does not work even without a monument under it (${z0} -> ${z1})`);
    await tidy(p);
    // the attack: a monument exactly under the control
    await placeAt(p, m.lon, m.lat, box.x, box.y, 15.4);
    const before = (await mapView(p)).zoom, c1 = await count(); await click(p, box.x, box.y); await sleep(900); const after = (await mapView(p)).zoom; const card = await cardId(p);
    rows.push({ label, reached: (await count()) === c1 + 1, zoomBefore: +before.toFixed(2), zoomAfter: +after.toFixed(2), card });
    await tidy(p);
  }
  t.note('rows', rows);
  const bad = rows.filter((r) => !r.reached || r.card);
  assert(bad.length === 0, `${bad.length} of ${rows.length} controls lose a real click to the monument drawn under them (a card opens instead): ${JSON.stringify(bad)}`);
});

// ------------------------------------------------------------------ 03
test('03', '[medium] Distance Tool: the first click on a monument places the measuring point (no card, no swallowed click)', async (t) => {
  const S = await desk(); const p = S.page; const { A, MA } = truth(); const m = A[300];
  const points = () => p.evaluate(() => { const s = window.__t0map.getSource('gbdist'); try { return s ? s.serialize().data.features.length : -1; } catch { return -2; } });
  const dist = p.locator('button[title="Distance Tool"]');
  const bareSpot = async () => {           // a screen point with no marker within 40 px (so the precondition does not depend on the data)
    const pts = await p.evaluate((ms) => { const m2 = window.__t0map, c = m2.getCanvas().getBoundingClientRect(); return ms.map(([lng, lat]) => { const q = m2.project([lng, lat]); return [q.x + c.left, q.y + c.top]; }); }, [...A.map((a) => [a.lon, a.lat]), ...MA.map((s) => [s.lng, s.lat])]);
    for (const [x, y] of [[300, 700], [1100, 700], [250, 300], [1000, 330], [600, 650]]) if (pts.every(([px, py]) => Math.hypot(px - x, py - y) > 40)) return { x, y };
    throw new Skip('no marker-free screen point found');
  };
  await placeAt(p, m.lon, m.lat, 760, 420, 15.4);
  const bare = await bareSpot();
  await clickEl(p, dist); await sleep(600);
  try {
    await click(p, bare.x, bare.y); await sleep(500); const ctrl = await points();
    assert(ctrl === 1, `precondition: the Distance Tool takes a click on bare map (points ${ctrl})`);
    await clickEl(p, dist); await sleep(400); await clickEl(p, dist); await sleep(500);      // off and on again: the measurement starts over
    const before = await points(); const at = await pagePoint(p, m.lon, m.lat); await click(p, at.x, at.y); await sleep(600); const after = await points(); const card = await cardId(p);
    t.note('points before / after the click on a monument, card', [before, after, card]);
    assert(!card && after === 1, `the click on the monument must place the first measuring point: points ${before} -> ${after}, card ${card}`);
  } finally { await tidy(p); if (await p.evaluate(() => !!(window.__gtbgApp && window.__gtbgApp._gbDist))) { await clickEl(p, dist).catch(() => {}); await sleep(300); } }
});

// ------------------------------------------------------------------ 04
test('04', '[medium] units within 11 px of a monument can still be selected with a real click while the layer is on', async (t) => {
  const S = await desk(); const p = S.page; const { A, MA } = truth();
  await clickEl(p, p.locator('button:text-is("July 2")')); await sleep(1800);
  const tick = await readTick(p); assert(tick, 'no clock');
  await setCam(p, { center: [-77.2380, 39.8140], zoom: 14.2, bearing: 0, pitch: 0 }); await sleep(1500);
  const units = await p.evaluate((us) => { const m = window.__t0map, c = m.getCanvas().getBoundingClientRect(); return us.map((u) => { const q = m.project([u.lng, u.lat]); const x = q.x + c.left, y = q.y + c.top; const e = document.elementFromPoint(x, y); return { id: u.unit_id, x, y, onCanvas: !!e && e.tagName === 'CANVAS' }; }); }, unitsAt(tick));
  const marks = await p.evaluate((ms) => { const m = window.__t0map, c = m.getCanvas().getBoundingClientRect(); return ms.map(([lng, lat, k]) => { const q = m.project([lng, lat]); return { k, x: q.x + c.left, y: q.y + c.top }; }); }, [...A.map((a) => [a.lon, a.lat, 'm']), ...MA.map((s) => [s.lng, s.lat, 's'])]);
  const inWin = (q) => q.onCanvas && q.x > 380 && q.x < 1300 && q.y > 130 && q.y < 700;
  const near = (u) => marks.some((m) => Math.hypot(m.x - u.x, m.y - u.y) - (m.k === 's' ? 6 : 0) <= 12);
  t.note('drawn units in the window within the 12 px mouse reach of a monument (zoom 14.2)', `${units.filter((u) => inWin(u) && near(u)).length} of ${units.filter(inWin).length}`);
  const lonely = units.filter((u) => inWin(u) && units.every((o) => o === u || Math.hypot(o.x - u.x, o.y - u.y) >= 40));
  const shadowed = lonely.filter((u) => marks.some((m) => Math.hypot(m.x - u.x, m.y - u.y) - (m.k === 's' ? 6 : 0) <= 11)).slice(0, 5);
  if (shadowed.length < 3) throw new Skip(`only ${shadowed.length} isolated units lie within 11 px of a monument in this view`);
  const pinned = async () => (await p.getByTitle('Unpin unit').count()) > 0;            // the unit panel of a selected unit carries this button (tests/t0/desktop-fixes.spec.mjs: "selects and pins it")
  const reset = async () => { await p.keyboard.press('Escape'); await sleep(150); await p.evaluate(() => { const a = document.activeElement; a && a.blur && a.blur(); }); await p.keyboard.press('Escape'); await sleep(250); };
  const rows = [];
  for (const u of shadowed) { await reset(); const b = await pinned(); await click(p, u.x, u.y); await sleep(800); rows.push({ unit: u.id, selected: !b && await pinned(), card: await cardId(p) }); }
  await reset();
  t.note('rows (layer on)', rows);
  // the same clicks with the layer off select every one of them (precondition)
  await clickEl(p, p.locator('button[title="Monuments"]')); await sleep(600);
  const off = [];
  for (const u of shadowed) { await reset(); const b = await pinned(); await click(p, u.x, u.y); await sleep(800); off.push(!b && await pinned()); }
  await reset(); await clickEl(p, p.locator('button[title="Monuments"]')); await sleep(600);
  t.note('selected with the layer off', off);
  assert(off.every(Boolean), `precondition: with the layer off every one of the ${off.length} units must be selectable (${JSON.stringify(off)})`);
  const lost = rows.filter((r) => !r.selected);
  assert(lost.length === 0, `${lost.length} of ${rows.length} units cannot be selected with the layer on (a monument card opens instead): ${JSON.stringify(rows)}`);
});

// ------------------------------------------------------------------ 05
test('05', '[medium] after "Jump to this moment" the app clock agrees with the clock time the story card quotes (9 of 9 differ by 2.0-9.0 h)', async (t) => {
  const S = await desk(); const p = S.page; const { MA } = truth();
  const TIME = /\b(\d{1,2}):(\d{2})\s?([AP])\.?M/i; const mins = (h, m, ap) => (+h % 12) * 60 + +m + (/p/i.test(ap) ? 720 : 0);
  const rows = [];
  for (let i = 0; i < MA.length; i++) {
    const s = MA[i]; if (!TIME.test(s.label)) continue;
    await setCam(p, { center: [s.lng, s.lat], zoom: 15.4, bearing: 0, pitch: 0 }); await sleep(200);
    const at = await pagePoint(p, s.lng, s.lat); await click(p, at.x, at.y);
    await waitFor(async () => (await cardId(p)) === 's' + i, { timeout: 3000, label: 'the story card' });
    const q = await p.evaluate(() => (document.querySelector('[data-gtmon-card] .gtmon-story') || {}).textContent || '');
    await clickEl(p, p.locator('[data-gtmon-card] .gtmon-jump')); await sleep(1600);
    const hud = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const e = n.parentElement; if (!e || e.closest('.gtmon-pop,.gtmon-sheet')) continue; const m = /July \d, (\d{1,2}:\d{2}\s?[AP]M)/.exec(n.textContent); const r = e.getBoundingClientRect(); if (m && r.width > 0) out.push(m[0]); } return out; });
    const nq = TIME.exec(q), hq = hud.map((h) => TIME.exec(h)).filter(Boolean);
    rows.push({ marker: s.id, tick: s.tick, narrative: nq && nq[0], appClock: hud[0], diffHours: nq && hq.length ? +(Math.abs(mins(hq[0][1], hq[0][2], hq[0][3]) - mins(nq[1], nq[2], nq[3])) / 60).toFixed(1) : null });
    await tidy(p);
  }
  t.note('rows', rows);
  assert(rows.length >= 9, `expected the 9 narratives that name a clock time, found ${rows.length}`);
  const bad = rows.filter((r) => r.diffHours == null || r.diffHours > 0.6);
  assert(bad.length === 0, `${bad.length} of ${rows.length} story cards quote a time that the app clock does not show at the jump target: ${JSON.stringify(bad)}`);
});

// ------------------------------------------------------------------ 06 / 07
test('06', '[medium] keyboard: Esc on a card opened from the Browse list returns the focus to the Browse control (not <body>)', async (t) => {
  const S = await desk(); const p = S.page;
  await setCam(p, { center: [-77.2306, 39.8207], zoom: 14, bearing: 0, pitch: 0 }); await sleep(500);
  await listPick(p, 'Pennsylvania State Memorial'); await waitFor(async () => !!(await cardId(p)), { timeout: 4000, label: 'the card' }); await sleep(900);
  const inCard = await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('[data-gtmon-card]'));
  assert(inCard, 'precondition: focus moves into the card');
  await p.keyboard.press('Escape'); await sleep(300);
  const a = await active(p); t.note('focus after Esc', a);
  assert(!(await cardId(p)), 'precondition: Esc closes the card');
  assert(a && a.tag !== 'BODY' && /Browse monuments|gtmon-ctl-btn/.test(a.label + a.cls), `after Esc the focus is ${JSON.stringify(a)}, expected the Browse monuments button`);
});
test('07', '[low] keyboard: after "Jump to this moment" the focus is not left on <body>', async (t) => {
  const S = await desk(); const p = S.page;
  await setCam(p, { center: [-77.2306, 39.8207], zoom: 14, bearing: 0, pitch: 0 }); await sleep(500);
  await listPick(p, 'Reynolds Death Site'); await waitFor(async () => (await cardId(p)) === 's3', { timeout: 4000, label: 'the story card' }); await sleep(900);
  for (let i = 0; i < 6; i++) { const a = await active(p); if (a && /Jump to this moment/.test(a.label)) break; await p.keyboard.press('Tab'); }
  assert(/Jump to this moment/.test((await active(p)).label), 'precondition: the Jump button took the focus');
  await p.keyboard.press('Enter'); await sleep(1700);
  const a = await active(p); t.note('focus after the jump', a);
  assert(!(await cardId(p)), 'precondition: the card closed');
  assert(a && a.tag !== 'BODY', `the focus fell to <body> after the Jump: ${JSON.stringify(a)}`);
});

// ------------------------------------------------------------------ 08
test('08', '[low] no story card prints a raw unit id (4 of 20 do: the order of battle does not know the unit)', async (t) => {
  const S = await desk(); const p = S.page; const { MA } = truth();
  const cdp = await cdpFor(p); await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const rows = [];
  try {
    for (let i = 0; i < MA.length; i++) {
      await tidy(p); await listPick(p, MA[i].name);
      if (!(await waitFor(async () => (await cardId(p)) === 's' + i, { timeout: 3000, label: 'card' }).catch(() => false))) { rows.push({ i, why: `no card s${i} (got ${await cardId(p)})` }); continue; }
      rows.push({ i, id: MA[i].unit_id, unit: await p.evaluate(() => (document.querySelector('[data-gtmon-card] .gtmon-unit') || {}).textContent || '') });
    }
  } finally { await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }); }
  t.note('rows', rows.filter((r) => /\b[UC]-[A-Z0-9]/.test(r.unit || '')));
  const raw = rows.filter((r) => r.unit && /\b[UC]-[A-Z0-9]+(-[A-Z0-9]+)*\b/.test(r.unit.replace(/^Linked unit:\s*/, '')));
  assert(rows.filter((r) => r.unit).length >= 18, `only ${rows.filter((r) => r.unit).length} of 20 story cards could be read`);
  assert(raw.length === 0, `${raw.length} story cards print a raw unit id: ${JSON.stringify(raw.map((r) => r.unit))}`);
});

// ------------------------------------------------------------------ 09 / 10 (phone 320x568; the Browse-control hit test also on 812x375)
const sheetGeometry = (p, lng, lat) => p.evaluate(([lo, la]) => {
  const sh = document.querySelector('.gtmon-sheet'); if (!sh) return null; const r = sh.getBoundingClientRect(); const m = window.__t0map, c = m.getCanvas().getBoundingClientRect(), q = m.project([lo, la]);
  const b = document.querySelector('.gtmon-ctl-btn'), br = b && b.getBoundingClientRect(), eb = br && document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
  return { sheetTop: Math.round(r.top), marker: [Math.round(q.x + c.left), Math.round(q.y + c.top)], browseHit: !!eb && (eb === b || b.contains(eb)), browseTop: eb && String(eb.className).slice(0, 30) };
}, [lng, lat]);
const tapAndMeasure = async (p, k, i) => {
  const { A, MA } = truth(); const ll = k === 's' ? [MA[i].lng, MA[i].lat] : [A[i].lon, A[i].lat];
  await setCam(p, { center: ll, zoom: 16.3, bearing: 0, pitch: 0 }); await sleep(900);
  const at = await pagePoint(p, ll[0], ll[1]); await touchTap(p, at.x, at.y); await sleep(1500);
  const g = await sheetGeometry(p, ll[0], ll[1]);
  const xb = await p.locator('[data-gtmon-card] .gtmon-x').first().boundingBox().catch(() => null); if (xb) { await touchTap(p, xb.x + xb.width / 2, xb.y + xb.height / 2); await sleep(500); }
  return g && { k: k + i, ...g };
};
test('09', '[medium] phone 320x568: the bottom sheet leaves the marker the user tapped visible above it', async (t) => {
  const S = await phone({ width: 320, height: 568, dpr: 2, mobile: true }); const p = S.page; const rows = [];
  for (const [k, i] of [['m', 45], ['m', 100], ['m', 300], ['s', 3], ['s', 18]]) rows.push(await tapAndMeasure(p, k, i));
  t.note('rows', rows);
  const bad = rows.filter((r) => !r || !(r.marker[1] < r.sheetTop - 4));
  assert(bad.length === 0, `${bad.length} of ${rows.length} tapped markers end up under the sheet or off the screen: ${JSON.stringify(rows)}`);
});
test('10', '[low] phone 320x568 and 812x375: an open card sheet does not cover the Browse monuments control', async (t) => {
  const rows = [];
  for (const vp of [{ width: 320, height: 568, dpr: 2, mobile: true }, { width: 812, height: 375, dpr: 3, mobile: true }]) {
    const S = await phone(vp); const p = S.page;
    for (const [k, i] of [['m', 45], ['s', 3]]) { const r = await tapAndMeasure(p, k, i); rows.push({ vp: `${vp.width}x${vp.height}`, ...(r || { why: 'no sheet' }) }); }
    await S.close(); live.splice(live.indexOf(S), 1);
  }
  t.note('rows', rows);
  const bad = rows.filter((r) => !r.browseHit);
  assert(bad.length === 0, `${bad.length} of ${rows.length} open sheets lie on top of the Browse control: ${JSON.stringify(rows)}`);
});

// ------------------------------------------------------------------ 11
test('11', '[low] Browse list: reopening it after a pick, the next name typed finds its monument (the old search text must not stay)', async (t) => {
  const S = await desk(); const p = S.page;
  await setCam(p, { center: [-77.2306, 39.8207], zoom: 14, bearing: 0, pitch: 0 }); await sleep(500);
  await listPick(p, 'Reynolds'); await waitFor(async () => !!(await cardId(p)), { timeout: 4000, label: 'card' }); await sleep(700); await tidy(p);
  await listPick(p, 'Armistead', { clear: false }); await sleep(400);
  const st = await p.evaluate(() => ({ value: (document.querySelector('.gtmon-search') || {}).value, status: (document.querySelector('.gtmon-status') || {}).textContent, rows: document.querySelectorAll('.gtmon-row').length }));
  t.note('the list after typing "Armistead" into the reopened panel', st);
  assert(st.rows > 0, `the second search finds nothing because the box still holds the first query: ${JSON.stringify(st)}`);
});

// ------------------------------------------------------------------ 12 retired: the +2,400 DOM nodes per Walkthrough open/Back cycle that the first probes measured came from the probe itself (element handles kept alive by locator.elementHandle()); with the handles released the cycle leaks nothing, as T0-WG-07 also says

// ------------------------------------------------------------------ 13 (pre-existing)
test('13', '[medium, pre-existing] desktop window 960 px wide: the Monuments toolbar button is not covered by another toolbar button', async (t) => {
  const S = await desk(); const p = S.page; const rows = [];
  try {
    for (const w of [1100, 960]) {
      await emulateViewport(p, { width: w, height: 800, dpr: 1, mobile: false }); await sleep(900);
      const r = await p.evaluate(() => { const b = document.querySelector('button[title="Monuments"]'); const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return { hit: e === b || b.contains(e), coveredBy: e && e.textContent ? e.textContent.trim().slice(0, 30) : String(e && e.className) }; });
      rows.push({ width: w, ...r });
    }
  } finally { await emulateViewport(p, { width: 1440, height: 900, dpr: 1, mobile: false }); await sleep(600); }
  t.note('rows', rows);
  assert(rows.every((r) => r.hit), `the Monuments button cannot be clicked at: ${JSON.stringify(rows.filter((r) => !r.hit))}`);
});

// ------------------------------------------------------------------ 14 (static; the data the restore draws)
test('14', '[medium] every story star lies within 500 m of one of the 512 monuments (3 of 20 do not: Iron Brigade 2.0 km, Reynolds Death Site 2.1 km, 26th North Carolina 1.5 km)', async (t) => {
  const { A, MA } = truth(); const km = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lon - b.lon) * 85000);
  const rows = MA.map((s, i) => { let best = null; for (const m of A) { const d = km({ lat: s.lat, lon: s.lng }, m); if (!best || d < best.d) best = { d: Math.round(d), name: m.name, no: m.no }; } return { i, id: s.id, name: s.name, nearestM: best.d, nearest: best.name }; });
  t.note('story star -> nearest monument', rows.map((r) => `${r.id}: ${r.nearestM} m (${r.nearest.slice(0, 40)})`));
  const far = rows.filter((r) => r.nearestM > 500);
  // the same three stars against the monument records that carry their name: the Reynolds Killed Marker (no 85), the 24th Michigan "Iron Brigade" monument (no 220), the 26th North Carolina monument at Herbst Woods (no 37)
  const named = [['mon_reynolds', 85], ['mon_iron_brig', 220], ['mon_26nc', 37]].map(([id, no]) => { const s = MA.find((x) => x.id === id), m = A.find((x) => x.no === no); return { id, record: m && m.name, apartM: m ? Math.round(km({ lat: s.lat, lon: s.lng }, m)) : null }; });
  t.note('the stars against the monument records of the same name', named);
  assert(far.length === 0, `${far.length} of ${rows.length} story stars are more than 500 m from every monument, so the star is not on its statue and "Jump to this moment" flies to a place with no monument: ${JSON.stringify(far.map((r) => [r.id, r.nearestM]))}; against the records of the same name: ${JSON.stringify(named)}`);
});

// ------------------------------------------------------------------ 15 (phone: the Browse list)
test('15', '[medium] phone: the open Browse monuments list lies inside the window and the rows it shows can be tapped (320x568: bottom 571 > 568 and 0 of 6 shown rows tappable; 375x812: 5 of 7; 812x375: bottom 434 > 375 and 1 of 4)', async (t) => {
  const rows = [];
  for (const vp of [{ width: 320, height: 568, dpr: 2, mobile: true }, { width: 375, height: 812, dpr: 3, mobile: true }, { width: 812, height: 375, dpr: 3, mobile: true }]) {
    const S = await phone(vp); const p = S.page;
    const bb = await p.locator('.gtmon-ctl-btn').first().boundingBox(); await touchTap(p, bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(800);
    const g = await p.evaluate(() => {
      const pn = document.querySelector('.gtmon-panel:not([hidden])'); if (!pn) return null; const r = pn.getBoundingClientRect();
      const ur = pn.querySelector('.gtmon-list').getBoundingClientRect();           // the rows the list shows: those whose centre lies inside the scrolling list box
      const rs = [...pn.querySelectorAll('.gtmon-row')].map((b) => { const q = b.getBoundingClientRect(); const cy = q.y + q.height / 2; const e = document.elementFromPoint(q.x + q.width / 2, cy); return { shown: cy >= ur.top && cy <= ur.bottom, tappable: e === b || b.contains(e) }; });
      return { panelBottom: Math.round(r.bottom), win: [innerWidth, innerHeight], rowsShown: rs.filter((x) => x.shown).length, tappableShown: rs.filter((x) => x.shown && x.tappable).length };
    });
    rows.push({ vp: `${vp.width}x${vp.height}`, ...(g || { why: 'the list did not open' }) });
    await S.close(); live.splice(live.indexOf(S), 1);
  }
  t.note('rows', rows);
  const bad = rows.filter((r) => !r.win || r.panelBottom > r.win[1] || r.tappableShown < r.rowsShown);
  assert(bad.length === 0, `${bad.length} of ${rows.length} phone windows show a Browse list that runs out of the window or under the legend / dock: ${JSON.stringify(rows)}`);
});

// ------------------------------------------------------------------ 16 (static; the unit each story card links to)
test('16', '[medium] a story star that is named after a regiment links the unit that regiment belongs to in the order of battle (5 of 20 link another brigade: 26th North Carolina -> Brockenbrough, 140th and 83rd Pennsylvania -> McCandless, 1st Minnesota -> Smyth, 72nd Pennsylvania -> Hall)', async (t) => {
  const { MA } = truth(); const dir = path.join(DIST, 'data', 'oob'); const units = {}, regs = [];
  for (const f of fs.readdirSync(dir)) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const arr of Object.values(j)) { if (!Array.isArray(arr)) continue; for (const r of arr) { if (!r || typeof r !== 'object') continue; const id = r.regiment_id || r.brigade_id || r.division_id || r.corps_id || r.battery_id || r.unit_id; if (!id) continue; units[id] = { designation: r.designation || r.name, parent: r.parent_brigade_id || r.parent_division_id || r.parent_corps_id || null }; if (r.regiment_id) regs.push({ id, designation: r.designation, brigade: r.parent_brigade_id }); } }
  }
  const chain = (id) => { const out = []; let cur = id; for (let i = 0; i < 6 && cur; i++) { out.push(cur); const u = units[cur]; if (!u) break; cur = u.parent; } return out; };
  const norm = (x) => String(x).toLowerCase().replace(/\(.*?\)/g, '').replace(/\bvolunteer\b|\binfantry\b|\bmonument\b|\bmarker\b/g, '').replace(/\s+/g, ' ').trim();
  const rows = MA.map((s2) => { const reg = regs.find((r) => norm(r.designation) === norm(s2.name)); const u = units[s2.unit_id]; return { star: s2.name, unit_id: s2.unit_id, unit: u && u.designation, regiment: reg && reg.id, regimentBrigade: reg && reg.brigade, resolvable: !!u, ok: !reg || !u || chain(reg.id).includes(s2.unit_id) || chain(s2.unit_id).includes(reg.brigade) }; });
  t.note('stars named after a regiment: the unit they link and the brigade of the regiment', rows.filter((r) => r.regiment).map((r) => `${r.star}: links ${r.unit_id} (${r.unit || 'not in the order of battle'}), ${r.regiment} belongs to ${r.regimentBrigade}${r.ok ? '' : '  <-- other brigade'}`));
  const wrong = rows.filter((r) => !r.ok);
  assert(rows.filter((r) => r.regiment).length >= 8, `the check found only ${rows.filter((r) => r.regiment).length} stars that name a regiment of the order of battle`);
  assert(wrong.length === 0, `${wrong.length} story cards say "Linked unit: ..." for a brigade the star's own regiment does not belong to (and Jump selects that brigade's panel, and the gold glow follows its presence): ${JSON.stringify(wrong.map((r) => [r.star, r.unit_id, r.unit, 'regiment ' + r.regiment + ' is in ' + r.regimentBrigade]))}`);
});

// ------------------------------------------------------------------ 17 (layout round trip)
test('17', '[low] after the phone tile switches the layer OFF it stays off when the user goes back to the desktop layout (it switches itself on again: phone on -> Desktop View -> button on -> Phone view -> tile off -> Desktop View)', async (t) => {
  const S = await phone({ width: 375, height: 812, dpr: 3, mobile: true }); const p = S.page;          // phone(): the layer is switched on through the Tools tile
  const tapText = async (re) => { const l = p.locator('button', { hasText: re }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); const b = await l.boundingBox(); if (!b) throw new Error(`no box for ${re}`); await touchTap(p, b.x + b.width / 2, b.y + b.height / 2); await sleep(700); };
  const toolsTile = async (re) => { await tapText(/^\s*(\S{1,2}\s*)?Tools\s*$/); await tapText(re); };
  const shell = () => p.evaluate(() => (document.querySelector('.gtbg-m-root') ? 'phone' : 'desktop'));
  const rows = [];
  const snap = async (label) => { const i = await monInfo(p); const pressed = await p.evaluate(() => { const b = document.querySelector('button[title="Monuments"]'); return b ? b.getAttribute('aria-pressed') : null; }); rows.push({ label, shell: await shell(), layerOn: i && i.on, toolbarPressed: pressed }); };
  try {
    await snap('phone, layer on through the tile');
    await toolsTile(/Desktop View/); await sleep(3000); await waitFor(async () => !!(await mapView(p)), { timeout: 30000, label: 'desktop map' }).catch(() => {});
    await snap('Desktop View');
    await p.locator('button[title="Monuments"]').first().focus(); await p.keyboard.press('Enter'); await sleep(1200);          // keyboard: at 375 px the Walkthrough button lies on top of it
    await snap('desktop layout, toolbar Monuments on (keyboard)');
    await tapText(/Extra Features/); await p.locator('#ef-layout').first().waitFor({ state: 'visible', timeout: 8000 });
    const pb = await p.locator('#ef-layout').first().boundingBox(); await touchTap(p, pb.x + pb.width / 2, pb.y + pb.height / 2); await sleep(3000);
    await waitFor(async () => (await shell()) === 'phone', { timeout: 15000, label: 'phone shell' });
    await snap('Phone view');
    await toolsTile(/Monuments/); await sleep(800);                                                  // the user switches the layer OFF on the phone
    await snap('phone, tile toggled (the user turns it off)');
    await toolsTile(/Desktop View/); await sleep(3000); await waitFor(async () => !!(await mapView(p)), { timeout: 30000, label: 'desktop map' }).catch(() => {});
    await snap('Desktop View again');
  } finally { t.note('rows', rows); await S.close(); live.splice(live.indexOf(S), 1); }
  const last = rows[rows.length - 1];
  assert(rows.length === 6 && rows[4].layerOn === false, `precondition: the tile did not switch the layer off (${JSON.stringify(rows)})`);
  assert(last.layerOn === false && last.toolbarPressed === 'false', `the user turned the layer OFF on the phone, and back on the desktop layout it is ${last.layerOn ? 'ON' : 'off'} again (toolbar aria-pressed=${last.toolbarPressed}): ${JSON.stringify(rows)}`);
});

// ------------------------------------------------------------------ run
const results = await suite.run({ filter: FILTER, outFile: path.join(REPO, 'tmp', process.env.T0_AGENT, 'verify-monuments.result.json'), extra: () => ({ dist: path.relative(REPO, DIST), hasMon: HAS_MON, tileRequests: tileBudget.used }) });
await closeAll();
const ran = results.results.filter((r) => r.status !== 'skip');
if (EXPECT_RED) {
  const green = ran.filter((r) => r.status === 'pass');
  if (green.length) { console.error(`--expect-red: ${green.length} test(s) are green now (defect fixed?): ${green.map((r) => r.id).join(', ')}`); process.exit(1); }
  process.exit(0);
}
process.exit(results.failed ? 1 : 0);
