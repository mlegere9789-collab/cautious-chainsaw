// Desktop journeys and group A/B acceptance (chapter 02 X3, X4, X6; WP-T0-06 group A "crash and input", WP-T0-07 group B "clock and data").
// Real system Chrome (headless), real CDP mouse / wheel / touch input, Mapbox tiles only through the Referer-injecting harness
// (tests/t0/lib.mjs, <= 300 requests per run), a Netlify-like static server on 127.0.0.1.
//
//   node tests/t0/journeys-desktop.spec.mjs                          against release/R1c/dist (build it first: python tools/t0/build.py --train R1c)
//   node tests/t0/journeys-desktop.spec.mjs --dist tmp/t0-ab/R1c/dist
//   node tests/t0/journeys-desktop.spec.mjs --filter '^T0-J'         subset by id regex (each invocation has its own tile budget)
//   node tests/t0/journeys-desktop.spec.mjs --dist legacy/dist --expect-red --filter 'T0-IN-0[1-2]|T0-SND|T0-C5'    red-first proof on the deployed tree
//
// Ids: T0-J1..J8 (X3 journeys: load, play 30 ticks, pan + wheel + pinch, select unit, search, Help + Tools, day 2/3 jump, ?ancestor=),
// T0-IN-01..05 (X4 input: drag, wheel, click-select + Toggle Units, overlay pointer-events + zoom button + Distance, phone touch),
// group A: T0-C5-01/02, T0-SND-01, T0-KEY-01..07, T0-DT-01, T0-MON-01, T0-TOUR-01, T0-ST-01, T0-ONB-01, T0-EB-01, T0-ATTR-01, T0-A-STATIC,
// group B (X6): T0-CLK-01..03, T0-DATA-01..04, T0-MM-01;  T0-X3 = the whole shared session: 0 uncaught exceptions, 0 first-party console.error.
// Trains: tests that belong to a group the train does not contain are skipped (B, DL and C are not in R1a; A is proven on R1a, R1b and R1c).
// Mapbox budget: the shared session uses ~215 requests, the phone session ~45 (T0-IN-05 skips itself when fewer than 90 remain: run it alone with
// --filter T0-IN-05); every invocation has its own budget of 300.
process.env.T0_AGENT ??= 't0-ab';
process.env.T0_PORT_BASE ??= '8320';
import fs from 'node:fs';
import path from 'node:path';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, mapView,
  mouseDrag, wheel, touchPinch, touchSwipe, touchTap, cdpFor, hitTest, tileBudget, VIEWPORTS, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const IS_LEGACY = DIST === path.resolve(REPO, 'legacy/dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
const GROUPS = IS_LEGACY ? [] : (JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups || []);
/** run a group-specific assertion on legacy/dist (to prove it red) and on trains that contain the group; skip it on trains that do not (e.g. B on R1a) */
const NEED = (g) => IS_LEGACY || GROUPS.includes(g);
const needGroup = (g) => { if (!NEED(g)) throw new Skip(`group ${g} is not in this train (${GROUPS.join(', ')})`); };
const resultsDir = IS_LEGACY ? path.join(REPO, 'tmp', 't0-ab') : path.dirname(DIST);

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = [];
let seq = 0;
/** every session gets its own profile directory and one of nine CDP ports: on Windows a just-killed Chrome still holds its profile dir for a moment (EPERM on the next rmSync) */
const open = async (opts) => {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq;
    const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 1 + (n % 9); while (live.has(port)) port = PORT_BASE + 1 + ((port - PORT_BASE) % 9);      // never a port of a session that is still open
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}` }); sessions.push(s); return s; }
    catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
};
const closeSession = async (s) => { await s.close(); const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };

// ------------------------------------------------------------------ page / data helpers
const DAY_FILES = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json', 'density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json', 'density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json', 'density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
const dataDir = path.join(DIST, 'data');
const fileRows = (f) => { const j = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); return Array.isArray(j) ? j : j.placements || []; };
/** the app's own data model: rows per tick, merged by unit_id across the loaded days (what group B's addPlacementsForDay must produce) */
function modelByTick(days) {
  const m = {};
  for (const d of days) for (const f of DAY_FILES[d]) for (const r of fileRows(f)) (m[r.tick] ||= new Map()).set(r.unit_id, r);
  return m;
}
/** "played-through state" (O-T0-3 carry-forward): each unit's latest keyframe at or before `tick` */
function carryForward(days, tick) {
  const m = modelByTick(days); const cur = new Map();
  for (let t = 1; t <= tick; t++) if (m[t]) for (const [u, r] of m[t]) cur.set(u, r);
  return cur;
}
const DAYS_FOR = (tick) => (tick <= 225 ? [1] : tick <= 450 ? [1, 2] : [1, 2, 3]);

const bodyText = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const rx = (t, re) => { const m = re.exec(t); return m ? m : null; };
/** what the user can read: tick, minimap unit count, HUD date, toolbar clock */
async function readState(p) {
  const t = await bodyText(p);
  const tick = rx(t, /Tick (\d+)\/675/), mm = rx(t, /(\d+) units · tick (\d+)/), hud = rx(t, /July (\d+), 1863/), clock = rx(t, /July (\d+), (\d{1,2}:\d{2} [AP]M)/);
  return { tick: tick ? +tick[1] : null, units: mm ? +mm[1] : null, mmTick: mm ? +mm[2] : null, hudDay: hud ? +hud[1] : null, clockDay: clock ? +clock[1] : null, clock: clock ? clock[2] : null, text: t };
}
/** any rendered date that reads July 4..9 in one of the formats the app prints (HUD, clock, monument tooltip, ancestor timeline) */
const BAD_DATE = /July\s+[4-9],\s*1863|July\s+[4-9],\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*[AP]M\s+July\s+[4-9]\b|\d{1,2}\s+July\s+[4-9]\b/;
const stateOf = (p) => readState(p);
const waitState = (p, pred, label, timeout = 8000) => waitFor(async () => { const s = await readState(p); return pred(s) ? s : null; }, { timeout, interval: 100, label });
const appReady = async (p) => { await waitForApp(p, 45000); await waitFor(async () => (await readState(p)).units, { timeout: 30000, label: 'minimap unit count (data loaded)' }); };

async function openApp(S, query = '', { chooser = true } = {}) {
  await S.page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  if (chooser) await chooseLayout(S.page, 'desktop');       // the legacy tree still asks; R1b+ auto-detects (no-op)
  await waitFor(async () => (await readState(S.page)).units, { timeout: 30000, label: 'minimap unit count (data loaded)' });
  await S.page.evaluate(() => { window.__t0map = null; });
  return S;
}
/** the Mapbox map (needs tiles: the app only stores the map after `load`) */
const mapReady = async (p) => waitFor(async () => (await mapView(p)), { timeout: 30000, label: 'map instance (style loaded)' });
const setCamera = (p, cam) => p.evaluate((c) => { window.__t0map.jumpTo(c); }, cam);
const playBtn = (p) => p.locator('button[title^="Play/Pause"]');
/** the day tab at the bottom of the screen; `real:false` dispatches the click to the element (the group B state tests do not test the input path,
 *  and on legacy/dist the full-size overlay canvas would swallow a real click, which would mask the data/clock verdicts) */
const clickDayTab = (p, day, real = true) => { const l = p.locator(`button:text-is("July ${day}")`).last(); return real ? l.click() : l.dispatchEvent('click'); };
/** a unit drawn at `tick` in the current viewport whose point is not covered by any panel: { id, x, y } (page coordinates) */
async function pickVisibleUnit(p, tick = 1, days = [1]) {
  const rows = [...carryForward(days, tick).values()].map((r) => ({ unit_id: r.unit_id, lng: r.lng, lat: r.lat }));
  const cands = await p.evaluate((rows) => {
    const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const out = [];
    for (const r of rows) {
      const q = m.project([r.lng, r.lat]); const x = q.x + c.left, y = q.y + c.top;
      if (x < c.left + 30 || x > c.right - 90 || y < c.top + 40 || y > c.bottom - 130) continue;
      const el = document.elementFromPoint(x, y); if (!el || el.tagName !== 'CANVAS') continue;
      let nn = 9; for (const o of rows) if (o !== r) nn = Math.min(nn, Math.hypot(o.lng - r.lng, o.lat - r.lat));
      out.push({ id: r.unit_id, x, y, nn });
    }
    return out.sort((a, b) => b.nn - a.nn);
  }, rows);
  return cands;
}
const unitPanelHas = async (p, id) => (await bodyText(p)).includes(` ${id} `) || (await p.getByText(id, { exact: true }).count()) > 0;
/** click a toolbar button with a real mouse click; when a neighbouring toolbar element overlaps it at this window width (legacy top bar, R1a/R1b)
 *  fall back to dispatching the click to the element (these tests are about what the button does, the input path is tested by T0-IN-*) */
async function clickTool(loc) {
  try { await loc.click({ timeout: 2500 }); } catch { await loc.dispatchEvent('click'); }
}
/** the unit overlay canvas (z-index 10): number of painted (alpha > 0) pixels; the minimap canvas is opaque, so for it: a checksum of its pixels */
const inkCount = (p, which = 'units') => p.evaluate((w) => {
  const cs = [...document.querySelectorAll('canvas')].filter((c) => (w === 'minimap' ? c.title === 'Click to move the map' || c.title === 'Click to navigate' : getComputedStyle(c).zIndex === '10' && c.width > 400));
  const c = cs[0]; if (!c) return -1;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
  if (w === 'minimap') { for (let i = 0; i < d.length; i++) n = (n * 31 + d[i]) % 2147483647; return n; }
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
}, which);
const HOME = { center: [-77.235, 39.812], zoom: 13.5 };
// the a11y bridge (group AX) adds aria-labels to these inputs; the placeholders exist on every train
const SEARCH_INPUT = (p) => p.locator('input[placeholder^="Name, state"], input[aria-label="Search units"]').first();
const REGIMENT_INPUT = (p) => p.locator('input[placeholder*="egiment name"], input[aria-label="Regiment name"]').first();
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 84000, (a[1] - b[1]) * 111000);
const mv = (a, b) => Math.hypot((a.center[0] - b.center[0]) * 84000, (a.center[1] - b.center[1]) * 111000);     // metres, at this latitude

// React commit counter + key/default-prevented recorder, injected before any app script
const hooks = () => {
  window.__t0c = 0;
  // background-tab time leap: every rAF callback sees `t + offset`; window.__t0leap(ms) adds to the offset once
  let off = 0; const raf = window.requestAnimationFrame.bind(window); window.__t0leap = (ms) => { off += ms; }; window.requestAnimationFrame = (cb) => raf((t) => cb(t + off));
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), isDisabled: false, inject() { return 1; }, onCommitFiberRoot() { window.__t0c++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {} };
};

// ------------------------------------------------------------------ shared session (one map session, tiles injected)
const F = {};
async function shared() {
  if (F.S) { await calm(F.S); return F.S; }
  const S = await open({ profile: 'shared', initScripts: [hooks] });
  F.S = S;
  await openApp(S);
  await mapReady(S.page);
  await sleep(1500);
  F.marks = { errors: 0 };
  return S;
}
const errorsSince = (S, from) => S.collector.firstParty.slice(from);
/** start a test on the shared page from a quiet UI: no open modal/panel left behind by an earlier (failed) test */
async function calm(S) {
  const p = S.page;
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await sleep(120); if (!/Change Regiment|Follow Your Ancestor Track|SEARCH UNITS/i.test(await bodyText(p))) break; }
}

const suite = createSuite('journeys-desktop');
{ const add = suite.test.bind(suite);                                     // per-test Mapbox accounting (the run has a hard budget)
  suite.test = (id, title, fn) => add(id, title, async (t) => { const u0 = tileBudget.used; try { return await fn(t); } finally { if (tileBudget.used > u0) t.note('mapbox requests', tileBudget.used - u0); } }); }

// ================================================================== X3 journeys (one desktop session; every journey must leave 0 first-party errors)
suite.test('T0-J1', 'J1 load: app mounts, HUD/toolbar/minimap present, units drawn, one map, no exceptions', async (t) => {
  const S = await shared();
  const s = await readState(S.page);
  const cnv = await S.page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, pe: getComputedStyle(c).pointerEvents })));
  t.note('state', { tick: s.tick, units: s.units, hud: s.hudDay, clock: s.clock }); t.note('canvases', cnv.length);
  assertEq(s.tick, 1, 'tick after load'); assert(s.units >= 70, `minimap unit count ${s.units}`); if (NEED('B')) assertEq(s.hudDay, 1, 'HUD day');
  assertEq([...S.tileStats.skus].length, 1, 'one Mapbox sku (one map session)');
  const locs = await waitFor(() => S.page.evaluate(() => !!window.__t0map && !!window.__t0map.getLayer('gtbg-locs-lbl')), { timeout: 6000, label: 'Locations labels layer (default on, no double toggle)' }).catch(() => false);
  t.note('locations layer present', !!locs); assert(locs, 'the Locations labels layer is missing on a fresh load (G1/G2)');
  assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
});

suite.test('T0-J2', 'J2 play 30 ticks at 8x: tick advances, minimap follows, pause stops it', async (t) => {
  const S = await shared(); const p = S.page;
  await p.locator('button:text-is("8x")').click();
  await playBtn(p).click();
  const s1 = await waitState(p, (s) => s.tick >= 31, 'tick >= 31 while playing', 15000);
  await playBtn(p).click();
  await sleep(400);
  const a = await readState(p); await sleep(800); const b = await readState(p);
  t.note('tick at pause', a.tick); t.note('minimap', { units: s1.units, mmTick: s1.mmTick });
  if (NEED('B')) assertEq(s1.units, carryForward([1], s1.mmTick).size, `minimap unit count at tick ${s1.mmTick} (played-through state)`);
  assert(a.tick >= 31, `tick ${a.tick}`); assertEq(a.tick, b.tick, 'tick still advancing after pause');
  await p.locator('button:text-is("1x")').click();
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1 && s.units, 'back to tick 1');
  assertEq(S.collector.firstParty, [], 'errors after J2');
});

suite.test('T0-J3', 'J3 pan by real mouse drag, wheel zoom, pinch zoom (CDP touch): camera changes each time (X4)', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(500);
  const v0 = await mapView(p);
  await mouseDrag(p, [760, 420], [640, 370]); await sleep(700);
  const v1 = await mapView(p);
  await wheel(p, 700, 420, -350); await sleep(1000);
  const v2 = await mapView(p);
  // pinch: CDP touch events need touch emulation on the page (the desktop layout stays: the viewport is 1422 wide)
  const c = await cdpFor(p); await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await touchPinch(p, [700, 420], 80, 150); await sleep(900);
  const v3 = await mapView(p);
  await touchSwipe(p, [900, 520], [800, 470]); await sleep(900);
  const v4 = await mapView(p);
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  t.note('drag moved (m)', Math.round(mv(v0, v1))); t.note('zoom after wheel', +v2.zoom.toFixed(2)); t.note('zoom after pinch', +v3.zoom.toFixed(2)); t.note('swipe moved (m)', Math.round(mv(v3, v4)));
  assert(mv(v0, v1) > 100, `mouse drag did not pan the map (moved ${mv(v0, v1).toFixed(1)} m)`);
  assert(v2.zoom - v1.zoom > 0.2, `wheel did not zoom (${v1.zoom} -> ${v2.zoom})`);
  assert(v3.zoom - v2.zoom > 0.2, `pinch did not zoom (${v2.zoom} -> ${v3.zoom})`);
  assert(mv(v3, v4) > 50, `touch swipe did not pan (moved ${mv(v3, v4).toFixed(1)} m)`);
  assertEq(S.collector.firstParty, [], 'errors after J3');
  await setCamera(p, HOME); await sleep(400);
});

suite.test('T0-J4', 'J4 select a unit by real click: panel opens for exactly that unit; Escape closes it (X4)', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(600);
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  const cands = await pickVisibleUnit(p, 1, [1]);
  assert(cands.length > 0, 'no unit is visible and uncovered at the home view');
  const u = cands[0]; t.note('unit', u.id);
  await p.mouse.click(u.x, u.y);
  await waitFor(() => unitPanelHas(p, u.id), { timeout: 4000, label: `unit panel for ${u.id}` });
  await p.keyboard.press('Escape');
  await waitFor(async () => !(await unitPanelHas(p, u.id)), { timeout: 3000, label: 'unit panel closed by Escape' });
  assertEq(S.collector.firstParty, [], 'errors after J4');
});

suite.test('T0-J5', 'J5 search: type a unit name, pick the result, the unit panel opens for it; Escape closes', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(400);
  await clickTool(p.locator('button[title="Search"]'));
  const input = SEARCH_INPUT(p);
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill('1st Minnesota'); await sleep(500);
  await p.getByText('U-1MN', { exact: true }).first().click();
  await waitFor(() => unitPanelHas(p, 'U-1MN'), { timeout: 5000, label: 'unit panel for U-1MN' });
  t.note('view', await mapView(p));
  await p.keyboard.press('Escape'); await sleep(300);
  assertEq(S.collector.firstParty, [], 'errors after J5');
});

suite.test('T0-J6', 'J6 Help (? key and button) and every desktop Tools button toggle open/closed without errors', async (t) => {
  const S = await shared(); const p = S.page;
  await p.keyboard.press('Shift+?');
  await waitFor(async () => /Keyboard|Shortcuts|shortcut/i.test(await bodyText(p)), { timeout: 8000, label: 'Help modal text' });
  const help = await bodyText(p);
  t.note('help mentions heatmap', /heatmap/i.test(help));
  await p.keyboard.press('Escape'); await sleep(400);
  await clickTool(p.locator('button[title="Help"]')); await sleep(800); await p.keyboard.press('Escape'); await sleep(300);
  const tools = ['Legend', 'Filter', 'Unit Roster', 'Monuments', 'Map Layers', 'Locations', 'Bookmarks', 'Distance Tool', "Soldier's Eye View (Street View)"];
  for (const title of tools) {
    const b = p.locator(`button[title="${title}"]`); if (!(await b.count())) { t.note(`missing ${title}`, true); continue; }
    await clickTool(b); await sleep(350); await clickTool(b).catch(() => {}); await sleep(250);
    await p.keyboard.press('Escape'); await sleep(150);
  }
  await p.locator('button:has-text("Extra Features")').click().catch(() => {}); await sleep(300);
  await p.locator('button:has-text("Extra Features")').click().catch(() => {}); await sleep(300);
  assertEq(S.collector.firstParty, [], 'errors after J6');
});

suite.test('T0-J7', 'J7 day 2/3 jump by tab and by keys 2/3: data loads within 2 s, minimap follows, dates stay July 1-3 (X6)', async (t) => {
  needGroup('B');
  const S = await shared(); const p = S.page;
  const timings = {}, ink = {}; let loaded = 1;                       // day 1 is loaded at boot; every jump loads the days up to its own (cumulative)
  const want = (tick) => { loaded = Math.max(loaded, DAYS_FOR(tick).length); return carryForward([...Array(loaded).keys()].map((i) => i + 1), tick).size; };
  for (const [day, tick, key] of [[2, 226, '2'], [3, 451, '3']]) {
    const t0 = Date.now(); const n = want(tick);
    await clickDayTab(p, day);
    await waitState(p, (s) => s.tick === tick && s.units === n, `day ${day} tab: tick ${tick} with ${n} units`, 2500);
    timings[`tab${day}`] = Date.now() - t0;
    assert(!BAD_DATE.test(await bodyText(p)), `day ${day}: a July 4-9 date is rendered`);
    await sleep(500); ink[day] = await inkCount(p);                                       // paused map: it must have been redrawn when the data arrived (J4)
    assert(ink[day] > 2000, `day ${day}: the paused unit canvas is blank (${ink[day]} painted pixels) - no redraw when the data arrived`);
    await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
    const t1 = Date.now(); await p.keyboard.press(key);
    await waitState(p, (s) => s.tick === tick && s.units === n, `key ${key}: tick ${tick} with ${n} units`, 2500);
    timings[`key${key}`] = Date.now() - t1;
  }
  await clickDayTab(p, 1); const back = await waitState(p, (s) => s.tick === 1, 'back to tick 1');
  t.note('ms to full data', timings); t.note('unit-canvas ink after each paused jump', ink); t.note('tick-1 units once all days are loaded', back.units);
  assert(Object.values(timings).every((ms) => ms <= 2000), `a day jump took longer than 2 s: ${JSON.stringify(timings)}`);
  assert(back.units >= 71, `tick 1 shows ${back.units} units after the day 2/3 data loaded (need >= 71)`);
  assertEq(S.collector.firstParty, [], 'errors after J7');
});

suite.test('T0-J8', 'J8 /?ancestor=U-20ME on a fresh load: no white screen, the Follow panel opens on the regiment timeline, Escape closes it, the map underneath is intact (C5, DL)', async (t) => {
  needGroup('DL');
  const S = await shared(); const e0 = S.collector.firstParty.length;
  // a second page of the same session with Mapbox blocked: a full-load journey that costs no tile requests (the white screen of C5 did not depend on the map)
  S.setTiles('block'); const p = await S.newPage();
  try {
    await p.goto(`${ORIGIN}/?ancestor=U-20ME`, { waitUntil: 'load' });
    await waitForApp(p, 45000); await chooseLayout(p, 'desktop').catch(() => {});
    await waitFor(async () => /Change Regiment/i.test(await bodyText(p)), { timeout: 15000, label: 'Follow Your Ancestor timeline for U-20ME' });
    const txt = await bodyText(p); const kids = await p.evaluate(() => document.getElementById('root').childElementCount);
    t.note('root children', kids); t.note('timeline dates', [...new Set([...txt.matchAll(/July (\d), \d{1,2}:\d{2} [AP]M/g)].map((m) => +m[1]))]);
    assert(kids > 0 && /20th Maine/i.test(txt), 'white screen or wrong regiment');
    assert(!BAD_DATE.test(txt), 'a July 4-9 date is rendered in the ancestor timeline');
    await p.keyboard.press('Escape'); await waitFor(async () => !/Change Regiment/i.test(await bodyText(p)), { timeout: 3000, label: 'Escape closes the Follow modal' });
    assert((await p.locator('button[title="Help"]').count()) > 0 && (await p.locator('#root canvas').count()) > 0, 'toolbar or map canvas missing after closing the Follow modal');
  } finally { await p.close().catch(() => {}); S.setTiles('inject'); }
  assertEq(S.collector.firstParty.slice(e0), [], 'exceptions during the ?ancestor= boot');
});

// ================================================================== X4 input (group A)
suite.test('T0-IN-01', 'real mouse drag on the map changes getCenter()', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(500);
  const v0 = await mapView(p);
  await mouseDrag(p, [900, 500], [600, 380], { steps: 14 }); await sleep(800);
  const v1 = await mapView(p);
  t.note('moved (m)', Math.round(mv(v0, v1)));
  assert(mv(v0, v1) > 200, `center moved only ${mv(v0, v1).toFixed(1)} m`);
  await setCamera(p, HOME);
});

suite.test('T0-IN-02', 'real wheel on the map changes zoom in both directions', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(400);
  const z0 = (await mapView(p)).zoom; await wheel(p, 700, 420, -500); await sleep(1000);
  const z1 = (await mapView(p)).zoom; await wheel(p, 700, 420, 700); await sleep(1000);
  const z2 = (await mapView(p)).zoom;
  t.note('zoom', [z0, z1, z2].map((z) => +z.toFixed(2)));
  assert(z1 - z0 > 0.2, `wheel up did not zoom in (${z0} -> ${z1})`); assert(z1 - z2 > 0.2, `wheel down did not zoom out (${z1} -> ${z2})`);
  await setCamera(p, HOME);
});

suite.test('T0-IN-03', 'click selects a unit (nearest within the hit radius) and clicking empty ground clears; Toggle Units off blocks selection', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(500);
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  const [u] = await pickVisibleUnit(p, 1, [1]); assert(u, 'no clickable unit');
  await p.mouse.click(u.x, u.y);
  await waitFor(() => unitPanelHas(p, u.id), { timeout: 4000, label: `panel for ${u.id}` });
  await p.keyboard.press('Escape'); await sleep(300);
  await clickTool(p.locator('button:text-is("Toggle Units")')); await sleep(400);
  await p.mouse.click(u.x, u.y); await sleep(900);
  const selectedWhileHidden = await unitPanelHas(p, u.id);
  await clickTool(p.locator('button:text-is("Toggle Units")')); await sleep(400);
  t.note('selected while units hidden', selectedWhileHidden);
  assert(!selectedWhileHidden, 'a click selected a unit while the units layer is toggled off');
  await p.mouse.click(u.x, u.y);
  await waitFor(() => unitPanelHas(p, u.id), { timeout: 4000, label: 'selection works again once units are shown' });
  await p.keyboard.press('Escape');
});

suite.test('T0-IN-04', 'no full-size overlay canvas has pointer-events:auto; zoom-in button and the Distance tool (two clicks) work', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(500);
  const bad = await p.evaluate(() => [...document.querySelectorAll('canvas')].filter((c) => { const r = c.getBoundingClientRect(); return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.6 && !c.classList.contains('mapboxgl-canvas') && getComputedStyle(c).pointerEvents !== 'none'; }).map((c) => c.getAttribute('style')));
  assertEq(bad, [], 'full-size overlay canvases that receive pointer events');
  const topAtCentre = await p.evaluate(() => { const e = document.elementFromPoint(700, 420); return e && e.className; });
  assert(/mapboxgl-canvas/.test(topAtCentre), `the element under the map centre is ${topAtCentre}, not the Mapbox canvas`);
  const z0 = (await mapView(p)).zoom; await p.locator('button[aria-label="Zoom in"]').click(); await sleep(900);
  const z1 = (await mapView(p)).zoom; assert(z1 - z0 > 0.5, `zoom-in button: ${z0} -> ${z1}`);
  await p.locator('button[aria-label="Zoom out"]').click(); await sleep(900);
  await clickTool(p.locator('button[title="Distance Tool"]')); await sleep(300);
  await p.mouse.click(600, 400); await sleep(250); await p.mouse.click(800, 450);
  await waitFor(async () => /\d[\d,]* ft/.test(await bodyText(p)), { timeout: 4000, label: 'distance readout after two map clicks' });
  const d = /(\d[\d,]* ft \d[\d,]* yd \d[\d,]* m)/.exec(await bodyText(p)); t.note('distance', d && d[1]);
  await clickTool(p.locator('button[title="Distance Tool"]')); await sleep(300);
  await setCamera(p, HOME);
});

suite.test('T0-IN-05', 'phone 375x812 (mobile shell, real CDP touch): swipe pans, pinch zooms, a tap selects a unit and its panel opens (X4 mobile)', async (t) => {
  needGroup('C');
  if (tileBudget.used > tileBudget.cap - 90) throw new Skip(`tile budget: ${tileBudget.used} of ${tileBudget.cap} used in this run; run this test on its own: --filter T0-IN-05`);
  const S = await open({ profile: 'phone', viewport: VIEWPORTS.portrait[0] });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'mobile');
    await mapReady(S.page); await sleep(1200);
    const layout = await S.page.evaluate(() => document.documentElement.getAttribute('data-layout'));
    const v0 = await mapView(S.page);
    await touchSwipe(S.page, [250, 380], [110, 320]); await sleep(900);
    const v1 = await mapView(S.page);
    await touchPinch(S.page, [190, 380], 60, 220); await sleep(900);
    const v2 = await mapView(S.page);
    await S.page.evaluate(() => window.__t0map.jumpTo({ center: [-77.235, 39.812], zoom: 13 })); await sleep(700);
    const rows = [...carryForward([1], 1).values()].map((r) => ({ unit_id: r.unit_id, lng: r.lng, lat: r.lat, disposition: r.disposition, strength: r.strength }));
    const cands = await S.page.evaluate((rows) => {
      const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const out = [];
      for (const r of rows) {
        const q = m.project([r.lng, r.lat]); const x = q.x + c.left, y = q.y + c.top;
        if (x < 20 || x > innerWidth - 20 || y < 110 || y > innerHeight - 220) continue;
        const el = document.elementFromPoint(x, y); if (!el || el.tagName !== 'CANVAS') continue;
        let nn = 9; for (const o of rows) if (o !== r) nn = Math.min(nn, Math.hypot(o.lng - r.lng, o.lat - r.lat));
        out.push({ ...r, x, y, nn });
      }
      return out.sort((a, b) => b.nn - a.nn);
    }, rows);
    assert(cands.length > 0, 'no unit is visible and uncovered in the phone shell');
    const u = cands[0]; await touchTap(S.page, u.x, u.y); await sleep(900);
    const txt = await bodyText(S.page);
    t.note('layout', layout); t.note('swipe moved (m)', Math.round(mv(v0, v1))); t.note('zoom after pinch', +v2.zoom.toFixed(2)); t.note('tapped', u.unit_id);
    assertEq(layout, 'mobile', 'data-layout'); assert(mv(v0, v1) > 100, `touch swipe did not pan (${mv(v0, v1).toFixed(1)} m)`); assert(v2.zoom - v1.zoom > 0.3, `pinch did not zoom (${v1.zoom} -> ${v2.zoom})`);
    assert(txt.includes(`${u.disposition} · ${u.strength} men`), `tapping ${u.unit_id} did not open its panel`);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors on the phone viewport');
  } finally { await closeSession(S); }
});

// ================================================================== group A behaviours
suite.test('T0-C5-01', 'Follow Your Ancestor: pick a regiment -> timeline, camera flies to it, Change Regiment works, 0 exceptions (C5, ref-of-ref)', async (t) => {
  const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await setCamera(p, HOME); await sleep(500);
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  const v0 = await mapView(p);
  await clickTool(p.locator('button[title="Follow Your Ancestor"]'));
  const inp = REGIMENT_INPUT(p); await inp.waitFor({ state: 'visible', timeout: 5000 });
  await inp.fill('20th Maine'); await sleep(500);
  await p.getByText('U-20ME', { exact: false }).first().click();
  await sleep(2500);
  const txt = await bodyText(p); const v1 = await mapView(p);
  t.note('flew (m)', Math.round(mv(v0, v1))); t.note('zoom', +v1.zoom.toFixed(2));
  assert(mv(v0, v1) > 300 || Math.abs(v1.zoom - v0.zoom) > 0.5, 'the map did not fly to the regiment');
  assert(/Change Regiment/i.test(txt), 'no timeline view after picking the regiment');
  assert(/Every recorded position for this regiment, in order/.test(txt), 'true caption missing');
  assert(!/Gold trail active/.test(txt), 'the false gold-trail caption is still shown');
  if (NEED('B')) assert(!BAD_DATE.test(txt), 'a July 4-9 date is rendered in the ancestor timeline');
  const dates = [...txt.matchAll(/July (\d), \d{1,2}:\d{2} [AP]M/g)].map((m) => +m[1]);
  t.note('timeline day numbers', [...new Set(dates)]);
  await p.getByText('Change Regiment', { exact: false }).first().click(); await sleep(500);
  assert(!/Change Regiment/i.test(await bodyText(p)), 'Change Regiment did not return to the search view');
  await p.keyboard.press('Escape'); await sleep(300);
  assertEq(S.collector.firstParty.slice(e0), [], 'exceptions during the ancestor flow');
  await setCamera(p, HOME);
});

suite.test('T0-C5-02', 'C5 without a map: picking a regiment and Change Regiment (DOM-dispatched clicks) throw nothing and show the true caption', async (t) => {
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await openApp(S);
    await S.page.locator('button[title="Follow Your Ancestor"]').dispatchEvent('click');
    const inp = REGIMENT_INPUT(S.page); await inp.waitFor({ state: 'visible', timeout: 5000 });
    await inp.fill('15th Alabama');           // only in the July 2 data: found only if the panel loads every day
    await waitFor(async () => (await bodyText(S.page)).includes('C-15AL'), { timeout: 4000, label: 'the 15th Alabama in the Follow list (days 2 and 3 loaded by the panel)' });
    await inp.fill('20th Maine'); await sleep(400);
    await S.page.evaluate(() => { const el = [...document.querySelectorAll('div')].find((e) => /cursor: pointer/.test(e.getAttribute('style') || '') && /U-20ME/.test(e.innerText) && e.innerText.length < 80); el.click(); });
    await waitFor(async () => /Change Regiment/i.test(await bodyText(S.page)), { timeout: 5000, label: 'timeline view' });
    assertEq(S.collector.firstParty, [], 'uncaught exceptions after picking the regiment (legacy: "setGoldUnit is not defined")');
    const txt = await bodyText(S.page);
    assert(/Every recorded position for this regiment, in order/.test(txt) && !/Gold trail active/.test(txt), 'caption is not the true one');
    if (NEED('B')) assert(!BAD_DATE.test(txt), 'a July 4-9 date is rendered in the ancestor timeline');
    await S.page.getByText('Change Regiment', { exact: false }).first().dispatchEvent('click'); await sleep(400);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions (legacy: "setGoldUnit is not defined")');
  } finally { await closeSession(S); }
});

suite.test('T0-SND-01', 'no in-app sound control (D-SOUND): no button, title or label mentions sound/audio/mute', async (t) => {
  const S = await shared(); const p = S.page;
  const hits = await p.evaluate(() => [...document.querySelectorAll('button,[role=button],a,input')].filter((e) => /sound|audio|mute|volume|🔊|🔇|🔈/i.test(`${e.innerText || ''} ${e.getAttribute('title') || ''} ${e.getAttribute('aria-label') || ''}`)).map((e) => (e.getAttribute('title') || e.innerText || '').slice(0, 30)));
  t.note('sound-like controls', hits); assertEq(hits, [], 'sound controls present');
});

suite.test('T0-KEY-01', 'Escape inside the Search box closes the panel; typing a space/digits there does not drive playback (E1)', async (t) => {
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await clickTool(p.locator('button[title="Search"]'));
  const input = SEARCH_INPUT(p); await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.click(); await p.keyboard.type('2 3 h', { delay: 30 }); await sleep(300);
  const s = await readState(p);
  assertEq(s.tick, 1, 'typing "2 3 h" in the search box moved the clock');
  await p.keyboard.press('Escape'); await sleep(400);
  assert((await SEARCH_INPUT(p).count()) === 0, 'Escape in the Search box did not close the panel');
});

suite.test('T0-KEY-02', 'Escape clears the pinned unit (panel closes), not just the hover selection (E2)', async (t) => {
  const S = await shared(); const p = S.page;
  await setCamera(p, HOME); await sleep(500);
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  const [u] = await pickVisibleUnit(p, 1, [1]); assert(u, 'no clickable unit');
  await p.mouse.click(u.x, u.y); await waitFor(() => unitPanelHas(p, u.id), { timeout: 4000, label: 'panel' });
  assert((await p.getByTitle('Unpin unit').count()) > 0, 'a click did not pin the unit');
  await p.keyboard.press('Escape');
  await waitFor(async () => !(await unitPanelHas(p, u.id)) && (await p.getByTitle('Unpin unit').count()) === 0, { timeout: 3000, label: 'panel closed and unit unpinned' });
});

suite.test('T0-KEY-03', 'Ctrl/Meta/Alt combinations are inert (no preventDefault, no speed or tick change): Ctrl+F, Ctrl+=, Ctrl+-, Alt+2', async (t) => {
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await p.evaluate(() => { window.__t0kd = []; window.addEventListener('keydown', (e) => window.__t0kd.push({ k: e.key, ctrl: e.ctrlKey, alt: e.altKey, dp: e.defaultPrevented })); });
  const before = (await bodyText(p)).match(/\b(1\/4x|1\/2x|1x|2x|4x|8x) \((?:[a-z ]+)\)/);
  for (const combo of ['Control+f', 'Control+=', 'Control+-', 'Control+0', 'Alt+2', 'Control+ArrowRight']) { await p.keyboard.press(combo); await sleep(80); }
  await sleep(300);
  const kd = await p.evaluate(() => window.__t0kd); const after = (await bodyText(p)).match(/\b(1\/4x|1\/2x|1x|2x|4x|8x) \((?:[a-z ]+)\)/);
  const s = await readState(p);
  t.note('keydown default prevented', kd.filter((k) => k.dp).map((k) => k.k)); t.note('speed label', [before && before[0], after && after[0]]);
  assertEq(kd.filter((k) => k.dp), [], 'the app called preventDefault on a modifier combination');
  assertEq(s.tick, 1, 'tick moved'); assertEq(after && after[0], before && before[0], 'speed label changed');
});

suite.test('T0-KEY-04', 'start playback, focus the Play button, press Space: pauses exactly once (button focus + window handler no longer double-toggle)', async (t) => {
  const S = await shared(); const p = S.page;
  await p.locator('button:text-is("8x")').dispatchEvent('click');
  await clickDayTab(p, 1, false); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await playBtn(p).click({ timeout: 2500 }).catch(() => playBtn(p).dispatchEvent('click'));
  const a = await waitState(p, (s) => s.tick >= 10, 'playing', 10000);
  await playBtn(p).focus(); await p.keyboard.press(' ');
  await sleep(500); const b = await readState(p); await sleep(1200); const c = await readState(p);
  t.note('ticks', [a.tick, b.tick, c.tick]);
  assertEq(b.tick, c.tick, 'playback still running after Space (double toggle)');
  await p.keyboard.press(' '); const d = await waitState(p, (s) => s.tick > c.tick, 'Space resumes', 6000);
  await p.keyboard.press(' '); await sleep(400);
  await p.locator('button:text-is("1x")').dispatchEvent('click');
  await clickDayTab(p, 1, false); await waitState(p, (s) => s.tick === 1, 'tick 1');
});

suite.test('T0-KEY-05', 'keys 2 and 3 jump to day 2 / day 3 and load its data; the H (heatmap) key is gone from the key map and the Help modal', async (t) => {
  const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await p.keyboard.press('2'); await waitState(p, (s) => s.tick === 226 && (!NEED('B') || s.units === carryForward([1, 2], 226).size), 'key 2', 2500);
  await p.keyboard.press('3'); await waitState(p, (s) => s.tick === 451 && (!NEED('B') || s.units === carryForward([1, 2, 3], 451).size), 'key 3', 2500);
  await p.keyboard.press('h'); await p.keyboard.press('H'); await sleep(300);
  await p.keyboard.press('Shift+?'); await waitFor(async () => /Keyboard|Shortcuts|shortcut/i.test(await bodyText(p)), { timeout: 8000, label: 'Help' });
  const help = await bodyText(p); await p.keyboard.press('Escape'); await sleep(300);
  assert(!/heatmap/i.test(help), 'the Help modal still lists a heatmap key');
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  assertEq(S.collector.firstParty.slice(e0), [], 'errors from keys');
});

suite.test('T0-MON-01', 'idle React commits per second == 0 with a paused map (dead monuments rAF loop, 45-59 commits/s before)', async (t) => {
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1'); await sleep(1500);
  const c0 = await p.evaluate(() => window.__t0c); await sleep(4000); const c1 = await p.evaluate(() => window.__t0c);
  const total = await p.evaluate(() => window.__t0c);
  t.note('commits in 4 s idle', c1 - c0); t.note('commits since load (hook is live)', total);
  assert(total > 0, 'the React commit hook never fired (the probe is dead)');
  assertEq(c1 - c0, 0, 'React commits while idle');
});

suite.test('T0-ATTR-01', 'the walkthrough map keeps its Mapbox attribution control (ToS); the main map has one too', async (t) => {
  const S = await shared(); const p = S.page;
  const main = await p.locator('.mapboxgl-ctrl-attrib').count();
  assert(main >= 1, 'no attribution control on the main map');
  await clickTool(p.getByText('Virtual Walkthrough', { exact: false }).first());
  await waitFor(async () => (await p.locator('.mapboxgl-ctrl-attrib').count()) >= 2, { timeout: 25000, label: 'second attribution control (walkthrough map)' });
  t.note('attribution controls', await p.locator('.mapboxgl-ctrl-attrib').count());
  await p.keyboard.press('Escape'); await sleep(500);
});

suite.test('T0-TOUR-01', 'NPS Auto Tour works once the map ref is a map (ref-of-ref fix): stop 1 flies to McPherson Ridge, sets tick 12, opens the stop panel; close stops it', async (t) => {
  const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await setCamera(p, HOME); await sleep(500);
  const v0 = await mapView(p);
  await p.locator('button:has-text("NPS Auto Tour")').dispatchEvent('click');          // not an input-path test: dispatched so that legacy/dist fails for the map-ref reason, not for the overlay canvas
  await waitFor(async () => /Stop 1 of \d+/i.test(await bodyText(p)), { timeout: 5000, label: 'tour stop panel' });
  const v1 = await waitFor(async () => { const m = await mapView(p); return m && metres(m.center, [-77.2622, 39.8306]) < 60 && Math.abs(m.zoom - 14) < 0.1 ? m : null; }, { timeout: 8000, label: 'flyTo McPherson Ridge (z14)' });
  const s = await readState(p);
  t.note('flew from (m)', Math.round(mv(v0, v1))); t.note('tick', s.tick);
  assert(s.tick >= 12, `tick ${s.tick}: the tour did not jump to stop 1 (tick 12)`);
  await p.evaluate(() => { const n = [...document.querySelectorAll('div')].find((d) => /^Stop \d+ of \d+$/i.test(d.textContent.trim())); n.parentElement.querySelector('button').click(); });
  await waitFor(async () => !/Stop 1 of \d+/i.test(await bodyText(p)), { timeout: 3000, label: 'tour panel closed' });
  await setCamera(p, HOME); await clickDayTab(p, 1); await waitState(p, (x) => x.tick === 1, 'back at tick 1', 4000);
  assertEq(S.collector.firstParty.slice(e0), [], 'exceptions during the tour');
});

suite.test('T0-KEY-06', 'Escape also closes Map Layers and the Distance tool (E2)', async (t) => {
  const S = await shared(); const p = S.page;
  await clickTool(p.locator('button[title="Map Layers"]')); await waitFor(async () => /Map Layers/.test(await bodyText(p)), { timeout: 4000, label: 'Map Layers panel' });
  await p.keyboard.press('Escape'); await waitFor(async () => !/Map Layers/.test(await bodyText(p)), { timeout: 3000, label: 'Escape closes Map Layers' });
  await clickTool(p.locator('button[title="Distance Tool"]')); await sleep(400);
  const on = await p.evaluate(() => window.__t0map.getCanvas().style.cursor);
  await p.keyboard.press('Escape'); await sleep(500);
  const off = await p.evaluate(() => window.__t0map.getCanvas().style.cursor);
  t.note('map cursor with Distance on / after Escape', [on, off]);
  assertEq(on, 'crosshair', 'Distance tool did not activate'); assert(off !== 'crosshair', 'Escape did not close the Distance tool');
});

suite.test('T0-KEY-07', 'the transport bar has no second key handler: ArrowRight with focus on a timeline button steps exactly one tick; the wrapper is a labelled group, not a tab stop', async (t) => {
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1, false); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await p.locator('button:text-is("July 1")').last().focus(); await p.keyboard.press('ArrowRight'); await sleep(300);
  const s = await readState(p);
  const wrap = await p.evaluate(() => { const w = document.getElementById('gt-timeline'); return w && { role: w.getAttribute('role'), tabindex: w.getAttribute('tabindex'), label: w.getAttribute('aria-label') }; });
  t.note('tick after one ArrowRight', s.tick); t.note('wrapper', wrap);
  assertEq(s.tick, 2, 'ArrowRight moved the clock by more or less than one tick');
  assertEq(wrap, { role: 'group', tabindex: '-1', label: 'Battle timeline controls' }, '#gt-timeline wrapper');
  await clickDayTab(p, 1, false); await waitState(p, (x) => x.tick === 1, 'tick 1');
});

suite.test('T0-DT-01', 'a background-tab time leap moves the clock by at most a couple of ticks (frame delta capped at 100 ms)', async (t) => {
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1, false); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await p.locator('button:text-is("8x")').dispatchEvent('click'); await playBtn(p).dispatchEvent('click');
  const a = await waitState(p, (s) => s.tick >= 8, 'playing', 8000);
  await p.evaluate(() => window.__t0leap(15000)); await sleep(60);
  const b = await readState(p); await sleep(250); const c = await readState(p);
  await playBtn(p).dispatchEvent('click'); await p.locator('button:text-is("1x")').dispatchEvent('click');
  t.note('ticks before / right after a 15 s leap / 250 ms later', [a.tick, b.tick, c.tick]);
  assert(c.tick - a.tick < 25, `the clock jumped ${c.tick - a.tick} ticks across one leaped frame (uncapped dt)`);
  await clickDayTab(p, 1, false); await waitState(p, (x) => x.tick === 1, 'tick 1');
});

suite.test('T0-ONB-01', 'onboarding: "Skip tour" from step 4 (tick 267) returns to tick 1; the Power User quick reference lists no Heatmap key', async (t) => {
  const S = await open({ profile: 'storage', tiles: 'block', onboarded: false });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {});
    await S.page.getByText('Power User', { exact: false }).first().waitFor({ timeout: 15000 });
    await S.page.getByText('Power User', { exact: false }).first().click();
    await waitFor(async () => /Quick Reference/i.test(await bodyText(S.page)), { timeout: 5000, label: 'Quick Reference' });
    const ref = await bodyText(S.page); t.note('quick reference mentions heatmap', /heatmap/i.test(ref));
    assert(!/heatmap/i.test(ref), 'the onboarding quick reference still lists the Heatmap key');
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {});
    await S.page.getByText('New to Gettysburg', { exact: false }).first().click();
    for (let i = 0; i < 3; i++) { await S.page.getByText(/^Next/, { exact: false }).first().click(); await sleep(250); }
    const at = await waitState(S.page, (x) => x.tick === 267, 'tick 267 at tour step 4', 4000).catch(() => null);
    await S.page.getByText('Skip tour', { exact: false }).first().click(); await sleep(500);
    const after = await readState(S.page);
    t.note('tick at step 4 / after Skip tour', [at && at.tick, after.tick]);
    assertEq(after.tick, 1, 'tick after Skip tour');
    assert(!/Skip tour/.test(after.text), 'the tour is still open');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

suite.test('T0-A-STATIC', 'static: the removed code is gone from the built entry and Help chunk (undefined identifiers, sound button, heatmap key/rows) and the app root is wrapped', async (t) => {
  const version = IS_LEGACY ? null : JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
  const entry = fs.readFileSync(path.join(DIST, 'assets', IS_LEGACY ? 'index-Cg8FAMXN.js' : version.entry), 'utf8');
  const help = fs.readFileSync(path.join(DIST, 'assets', IS_LEGACY ? 'HelpModal-CFV9T0zH.js' : version.help), 'utf8');
  const bad = [];
  for (const [what, re, where] of [['setGoldUnit', /\bsetGoldUnit\b/, entry], ['clearGoldTrail', /\bclearGoldTrail\b/, entry], ['drawGoldTrailSegment', /\bdrawGoldTrailSegment\b/, entry], ['CanvasRenderer', /\bCanvasRenderer\b/, entry],
    ['heatmap key case', /case"h":case"H":/, entry], ['tour heatmap row', /\["H","Heatmap"\]/, entry], ['help heatmap row', /Toggle heatmap/, help], ['gold-trail caption', /Gold trail active/, entry]]) {
    if (re.test(where)) bad.push(`still present: ${what}`);
  }
  if (!/function yO\(\)\{return null\}/.test(entry)) bad.push('the sound button yO does not return null');
  if (!IS_LEGACY && !(/class GtbgEB extends pt\.Component/.test(entry) && /V\.jsx\(GtbgEB,\{children:V\.jsx\(AO,\{\}\)\}\)/.test(entry))) bad.push('the error boundary is not wrapped around AO');
  t.note('problems', bad);
  assertEq(bad, [], 'static checks');
});

// ================================================================== group B (X6): clock and data
suite.test('T0-CLK-01', 'ticks 1 / 226 / 451 / 675 print July 1 / 2 / 3 / 3 in HUD, toolbar and day chip; never July 4-9; HUD == toolbar (X6)', async (t) => {
  needGroup('B');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await openApp(S);
    const seen = {};
    for (const [tick, day] of [[1, 1], [226, 2], [451, 3], [675, 3]]) {
      if (tick === 675) { await p_slider(S.page, 675); } else if (tick === 1) { await clickDayTab(S.page, 1, false); } else { await clickDayTab(S.page, day, false); }
      const s = await waitState(S.page, (x) => x.tick === tick, `tick ${tick}`, 5000);
      seen[tick] = { hud: s.hudDay, clock: s.clockDay, bad: BAD_DATE.test(s.text) };
      assertEq(s.hudDay, day, `HUD day at tick ${tick}`); assertEq(s.clockDay, day, `toolbar day at tick ${tick}`); assertEq(s.hudDay, s.clockDay, `HUD vs toolbar at tick ${tick}`);
      assert(!BAD_DATE.test(s.text), `a July 4-9 date is rendered at tick ${tick}`);
    }
    t.note('dates by tick', seen);
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});
const p_slider = async (p, v) => { const sl = p.locator('input[type=range][aria-label="Battle time"]'); await sl.fill(String(v)); };

suite.test('T0-CLK-02', 'phone shell: ticks 1 / 226 / 451 / 675 read JULY 1 / 2 / 3 / 3 (X6 mobile); no July 4-9 date anywhere', async (t) => {
  needGroup('C');
  needGroup('B');
  const S = await open({ profile: 'phone', tiles: 'block', viewport: VIEWPORTS.portrait[0] });
  try {
    const seen = {};
    for (const [tick, day] of [[1, 1], [226, 2], [451, 3], [675, 3]]) {
      await S.page.goto(`${ORIGIN}/?tick=${tick}`, { waitUntil: 'load' }); await waitForApp(S.page, 45000);
      const txt = await waitFor(async () => { const x = await bodyText(S.page); return new RegExp(`Tick ${tick}/675`).test(x) ? x : null; }, { timeout: 15000, label: `phone shell at tick ${tick}` });
      const m = /JULY\s+(\d)\s+\d{1,2}:\d{2}\s*[AP]M/i.exec(txt);
      seen[tick] = m && +m[1];
      assertEq(seen[tick], day, `phone clock day at tick ${tick}`);
      assert(!/July\s+[4-9],\s*1863|July\s+[4-9]\s+\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*[AP]M\s+July\s+[4-9]/i.test(txt), `a July 4-9 date is rendered at tick ${tick}`);
    }
    t.note('clock day by tick', seen);
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

suite.test('T0-CLK-03', 'static: the built entry keeps none of the three "+2" day formulas (HUD, monument tooltip, ancestor timeline)', async (t) => {
  needGroup('B');
  const version = IS_LEGACY ? null : JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
  const entry = fs.readFileSync(IS_LEGACY ? path.join(DIST, 'assets', 'index-Cg8FAMXN.js') : path.join(DIST, 'assets', version.entry), 'utf8');
  const hits = [...entry.matchAll(/July \$\{\w+\+2\}|\$\{\w+\+2\}, 1863|July \$\{\w+\+2\}, /g)].map((m) => m[0]);
  t.note('"+2" formulas found', hits);
  assertEq(hits, [], 'entry still contains the +2 date formulas');
  assert(/`July \$\{l\}, 1863`/.test(entry) && /\$\{l\} July \$\{f\}`/.test(entry) && /`July \$\{f\}, \$\{R\}:/.test(entry), 'the three corrected formulas are not in the entry');
});

suite.test('T0-DATA-01', 'a first load straight onto tick 451 requests all three days of data (47 files) and shows the played-through state', async (t) => {
  needGroup('B');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    const m = S.net.mark(); const t0 = Date.now();
    await S.page.goto(`${ORIGIN}/?tick=451`, { waitUntil: 'load' });
    await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop');
    const want = carryForward([1, 2, 3], 451).size;
    const s = await waitState(S.page, (x) => x.tick === 451 && x.units === want, `tick 451 with ${want} units`, 10000);
    const files = new Set(S.net.find(/\/data\/(placements|density)_[^/?]+\.json/, m).map((e) => e.url.replace(/^.*\/data\//, '')));
    const missing = Object.values(DAY_FILES).flat().filter((f) => !files.has(f));
    t.note('data files requested', files.size); t.note('ms to full state', Date.now() - t0); t.note('missing', missing);
    assertEq(missing, [], 'placement/density files of the three days that were never requested');
    assertEq(s.units, want, 'minimap units');
  } finally { await closeSession(S); }
});

suite.test('T0-DATA-02', 'tick 1 keeps >= 71 units after day 2 (and day 3) data loads: per-tick merge, not overwrite', async (t) => {
  needGroup('B');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await openApp(S);
    const s0 = await readState(S.page);
    await clickDayTab(S.page, 2, false); await waitState(S.page, (s) => s.tick === 226 && s.units >= 1, 'day 2 tab', 4000);
    await sleep(600);
    await clickDayTab(S.page, 1, false); const s1 = await waitState(S.page, (s) => s.tick === 1 && s.units >= 1, 'back at tick 1', 3000);
    await clickDayTab(S.page, 3, false); await waitState(S.page, (s) => s.tick === 451 && s.units >= 1, 'day 3 tab', 4000);
    await sleep(600);
    await clickDayTab(S.page, 1, false); const s2 = await waitState(S.page, (s) => s.tick === 1 && s.units >= 1, 'tick 1 again', 3000);
    t.note('tick-1 units: day1 only / after day 2 / after day 3', [s0.units, s1.units, s2.units]);
    assert(s1.units >= 71, `tick 1 shows ${s1.units} units after day 2 loaded (need >= 71)`);
    assert(s2.units >= 71, `tick 1 shows ${s2.units} units after day 3 loaded (need >= 71)`);
    assertEq(s0.units, carryForward([1], 1).size, 'day 1 only: tick 1 units (70 have a keyframe; the intro-primed ghosts are gone)');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

suite.test('T0-DATA-03', 'seeking backwards 300 -> 100 draws no unit whose first keyframe is later than 100 (stateless carry-forward, O-T0-3)', async (t) => {
  needGroup('B');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await openApp(S);
    await clickDayTab(S.page, 3, false); await waitState(S.page, (s) => s.tick === 451 && s.units === carryForward([1, 2, 3], 451).size, 'all days loaded', 3000);
    const seq = {};
    for (const tick of [300, 100, 226, 100, 1]) {
      await p_slider(S.page, tick);
      const want = carryForward([1, 2, 3], tick).size;
      const s = await waitState(S.page, (x) => x.tick === tick && x.units === want, `tick ${tick} with ${want} units`, 4000);
      seq[tick] = s.units;
    }
    t.note('units by tick after 300 -> 100 -> 226 -> 100 -> 1', seq);
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

suite.test('T0-DATA-04', 'a day whose every file fails to load is not marked loaded: no exception, and a later jump retries and fills it (J3)', async (t) => {
  needGroup('B');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await openApp(S);
    srv.setBlocked(DAY_FILES[2].map((f) => `/data/${f}`));
    await clickDayTab(S.page, 2, false); await waitState(S.page, (s) => s.tick === 226, 'day 2 tab with its files blocked', 4000); await sleep(1200);
    const failed = await readState(S.page);
    const hard = S.collector.firstParty.filter((e) => e.kind !== 'console.error' || !/Failed to load resource/.test(e.text));
    t.note('units at tick 226 with day 2 unavailable', failed.units); t.note('other errors', hard.map((e) => e.text.slice(0, 80)));
    assertEq(hard, [], 'exceptions while a whole day failed to load');
    srv.setBlocked([]);
    await clickDayTab(S.page, 1, false); await waitState(S.page, (s) => s.tick === 1, 'tick 1');
    await clickDayTab(S.page, 2, false);
    const want = carryForward([1, 2], 226).size;
    const ok = await waitState(S.page, (s) => s.tick === 226 && s.units === want, `day 2 retried: ${want} units`, 4000);
    t.note('units after the retry', ok.units);
  } finally { srv.setBlocked([]); await closeSession(S); }
});

suite.test('T0-MM-01', 'the minimap footer (unit count and tick) follows the ticks during play (subscribe fix)', async (t) => {
  needGroup('B');
  const S = await shared(); const p = S.page;
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
  await p.locator('button:text-is("8x")').click(); await playBtn(p).click();
  const a = await waitState(p, (s) => s.mmTick >= 20, 'minimap tick >= 20', 10000);
  await sleep(600); const b = await readState(p);
  await playBtn(p).click(); await sleep(300);
  await p.locator('button:text-is("1x")').click();
  t.note('minimap', [[a.units, a.mmTick], [b.units, b.mmTick]]);
  const inkPlay = await inkCount(p, 'minimap');
  await clickDayTab(p, 3); await waitState(p, (s) => s.tick === 451, 'tick 451'); await sleep(600);
  const ink3 = await inkCount(p, 'minimap'); t.note('minimap canvas pixel checksum (tick ~30 / tick 451)', [inkPlay, ink3]);
  assert(inkPlay > 0 && ink3 > 0 && ink3 !== inkPlay, 'the minimap canvas did not redraw when the tick changed (frozen at tick 1)');
  assert(b.mmTick > a.mmTick, 'the minimap tick did not advance'); assert(a.units > 70, `minimap count did not change from the tick-1 value (${a.units})`);
  assertEq(b.mmTick, b.tick, 'minimap tick == toolbar tick');
  await clickDayTab(p, 1); await waitState(p, (s) => s.tick === 1, 'tick 1');
});

// ================================================================== own sessions: storage guards, error boundary
suite.test('T0-ST-01', 'blocked or throwing storage still boots (onboarding guard, try/catch on the write); the app renders and the modal can be dismissed', async (t) => {
  for (const [name, script] of [
    ['localStorage getter throws', () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); }],
    ['setItem throws (quota)', () => { Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); }; }],
  ]) {
    const S = await open({ profile: 'storage', tiles: 'block', onboarded: false, initScripts: [script] });
    try {
      await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
      await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {});
      await sleep(2500);
      const txt = await bodyText(S.page);
      t.note(name, { toolbar: /GETTYSBURG/.test(txt), onboarding: /Skip|Welcome|Get started|Begin/i.test(txt), errors: S.collector.firstParty.length });
      assert(/GETTYSBURG/.test(txt) && (await S.page.locator('button[title="Help"]').count()) > 0, `${name}: the app toolbar never rendered`);
      const skip = S.page.getByText(/^(Skip|Skip tour|Got it|Start exploring|Begin)/i).first();
      if (await skip.count()) { await skip.click().catch(() => {}); await sleep(600); }
      assertEq(S.collector.firstParty, [], `${name}: uncaught exceptions`);
    } finally { await closeSession(S); }
  }
});

suite.test('T0-EB-01', 'AMD-T0-1 error boundary: a render error in the app root AND a throw inside a useEffect of Zk (Follow Ancestor) show "Something went wrong" + Reload instead of a blank page', async (t) => {
  if (IS_LEGACY) throw new Skip('legacy/dist has no boundary by definition (red-first: see --expect-red)');
  const version = JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
  const entryPath = path.join(DIST, 'assets', version.entry);
  const src = fs.readFileSync(entryPath, 'utf8');
  const A1 = 'function AO(){', A2 = 'const Xe=new URLSearchParams(window.location.search).get("ancestor");Xe&&(l(Xe),st(Xe))';
  assertEq(src.split(A1).length - 1, 1, 'anchor count of the app root component'); assertEq(src.split(A2).length - 1, 1, 'anchor count of the Zk mount effect');
  const mutated = path.join(REPO, 'tmp', process.env.T0_AGENT, 'eb-entry.js');
  fs.mkdirSync(path.dirname(mutated), { recursive: true });
  fs.writeFileSync(mutated, src.replace(A1, `${A1}if(/[?&]__t0throw=1/.test(location.search))throw new Error("t0 forced render error");`)
    .replace(A2, `if(/[?&]__t0throw=2/.test(location.search))throw new Error("t0 forced effect error in Zk");${A2}`));
  srv.setOverrides({ [`/assets/${version.entry}`]: mutated });
  const S = await open({ profile: 'eb', tiles: 'block' });
  try {
    for (const [name, q, open] of [['render error in AO', '?__t0throw=1', false], ['useEffect throw in Zk (opening Follow Your Ancestor)', '?__t0throw=2', true]]) {
      await S.page.goto(`${ORIGIN}/${q}`, { waitUntil: 'load' });
      if (open) { await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {}); await S.page.locator('button[title="Follow Your Ancestor"]').dispatchEvent('click'); }
      await waitFor(async () => /Something went wrong/.test(await bodyText(S.page)), { timeout: 30000, label: `error boundary fallback for ${name}` });
      const btn = await S.page.locator('button:text-is("Reload")').count();
      const blank = await S.page.evaluate(() => document.getElementById('root').innerText.trim().length === 0);
      t.note(name, { reloadButton: btn, blank, consoleErrors: S.collector.firstParty.length });
      assert(btn === 1 && !blank, `${name}: fallback UI not rendered`);
      S.collector.clear();
    }
    srv.setOverrides({});
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(S.page, 45000);
    assert(!/Something went wrong/.test(await bodyText(S.page)), 'boundary shown on a healthy load');
    assertEq(S.collector.firstParty, [], 'errors on the healthy load after the drills');
  } finally { srv.setOverrides({}); await closeSession(S); }
});

// ================================================================== X3 verdict
suite.test('T0-X3', 'X3: across every journey and input test of this run, 0 uncaught exceptions and 0 first-party console.error', async (t) => {
  const S = F.S; if (!S) throw new Skip('no shared session in this run');
  t.note('tile requests in the shared session', S.tileStats.seen); t.note('ignored tile noise', S.collector.ignored);
  assertEq(S.collector.firstParty, [], 'first-party errors in the shared desktop session');
});

// ------------------------------------------------------------------ run
const outFile = path.join(resultsDir, IS_LEGACY ? 'test-journeys-desktop-legacy.json' : 'test-journeys-desktop.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST), mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
const allRed = summary.results.length > 0 && summary.results.every((r) => r.status === 'fail');
if (EXPECT_RED) { console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed on this tree: ${summary.results.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`); process.exit(allRed ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
