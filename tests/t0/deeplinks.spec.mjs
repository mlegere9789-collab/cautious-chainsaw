// Deep-link acceptance (chapter 02 X7, WP-T0-09, D-URLSTATE T0 subset): the single URL-state reader of group DL, moments.json v0 and the
// repointed Turning Points anchors.  Real system Chrome, real CDP input, Mapbox tiles only through the Referer-injecting harness
// (tests/t0/lib.mjs, <= 300 requests per run), a Netlify-like static server on 127.0.0.1.
//
//   node tests/t0/deeplinks.spec.mjs                          against release/R1c/dist
//   node tests/t0/deeplinks.spec.mjs --dist tmp/t0-ab/R1c/dist --filter 'T0-DL-0[1-3]'
//   node tests/t0/deeplinks.spec.mjs --dist legacy/dist --expect-red --filter 'T0-DL-0[127]'      red-first: the deployed app reads none of these
//
// Ids: T0-DL-01 tick/t/day (and precedence), -02 t+u+z+ll on a real map, -03 ?ancestor=, -04 junk degrades to defaults (blocked map + real map),
// -05 round trip through the app's own share writer and the sub-page emitters, -06 moments.json lint, -07 vignette, -08 onboarding suppression,
// -09 Turning Points links land on the repointed anchors, -10 the same links on the phone shell.
process.env.T0_AGENT ??= 't0-ab';
process.env.T0_PORT_BASE ??= '8320';
import fs from 'node:fs';
import path from 'node:path';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, mapView, tileBudget, VIEWPORTS, Skip,
} = await import('./lib.mjs');

const { readPageState, parseCaptionCollapsed, parseClock } = await import('./lib_clock.mjs');   // CLOCK: the frame is data-gt-frame ("Tick n/675" is not on the page), the caption reads "n units . about 5:00 AM"

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const IS_LEGACY = DIST === path.resolve(REPO, 'legacy/dist');
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
const GROUPS = IS_LEGACY ? [] : (JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups || []);
const needGroup = (g) => { if (!IS_LEGACY && !GROUPS.includes(g)) throw new Skip(`group ${g} is not in this train (${GROUPS.join(', ')})`); };
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

// ------------------------------------------------------------------ helpers (the app's data model, read from the built tree)
const DAY_FILES = {
  1: ['placements_day1_ticks1_50.json', 'placements_day1_ticks51_100.json', 'placements_day1_ticks101_225.json', 'density_day1_ticks1_50.json', 'density_day1_ticks51_100.json', 'density_day1_afternoon.json', 'density_artillery_positions.json', 'density_cavalry_detail.json', 'density_skirmishers.json', 'density_day1_lateafternoon.json', 'density_day1_seminary.json', 'density_day1_opening.json', 'density_day1_iverson.json', 'density_day1_railroadcut.json', 'density_day1_barlowsknoll.json', 'density_day1_ironbrigade.json'],
  2: ['placements_day2_ticks226_300.json', 'placements_day2_ticks301_375.json', 'placements_day2_ticks376_450.json', 'density_day2_lrt.json', 'density_day2_wheatfield.json', 'density_day2_culpshill.json', 'density_day2_overnight.json', 'density_reserves.json', 'density_day2_morning.json', 'density_day2_afternoon.json', 'density_day2_bigelow.json', 'density_day2_culpshill_overnight.json', 'density_day2_cemhill.json', 'density_day2_wright.json', 'density_day2_kershaw.json', 'density_day2_15alabama.json', 'density_day2_devilsden.json'],
  3: ['placements_day3_ticks451_520.json', 'placements_day3_ticks521_600.json', 'placements_day3_ticks601_675.json', 'density_day3_picketts_charge.json', 'density_day3_culpshill.json', 'density_day3_aftermath.json', 'density_day3_cannonade.json', 'density_day3_pettigrew.json', 'density_day3_retreat.json', 'density_day3_morning.json', 'density_day3_cavalry.json', 'density_day3_angle.json', 'density_day3_vermont.json', 'density_day3_hancock.json'],
};
const dataDir = path.join(DIST, 'data');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
const fileRows = (f) => { const j = readJson(f); return Array.isArray(j) ? j : j.placements || []; };
const carryCount = (days, tick) => { const by = {}; for (const d of days) for (const f of DAY_FILES[d]) for (const r of fileRows(f)) (by[r.tick] ||= new Map()).set(r.unit_id, r); const cur = new Map(); for (let t = 1; t <= tick; t++) if (by[t]) for (const [u, r] of by[t]) cur.set(u, r); return cur.size; };
const dayOf = (tick) => (tick <= 225 ? 1 : tick <= 450 ? 2 : 3);
const bodyText = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
async function readState(p) {
  const { text: t, frame } = await readPageState(p);       // frame: data-gt-frame on a CLOCK tree, "Tick n/675" on an older one (one atomic snapshot)
  const x = (re) => re.exec(t); const cap = parseCaptionCollapsed(t), hud = x(/July (\d+), 1863/), clk = parseClock(t);
  return { tick: frame, units: cap ? cap.units : null, hudDay: hud ? +hud[1] : null, clockDay: clk ? clk.day : null, follow: /Change Regiment/i.test(t) || /Follow Your Ancestor Track/i.test(t), onboarding: /Welcome|Choose your|Skip tour|Skip intro|How would you like/i.test(t) && !/Toggle Units/.test(t), text: t };
}
const BAD_DATE = /July\s+[4-9],\s*1863|July\s+[4-9],\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*[AP]M\s+July\s+[4-9]\b/;
const waitState = (p, pred, label, timeout = 10000) => waitFor(async () => { const s = await readState(p); return pred(s) ? s : null; }, { timeout, interval: 120, label });
const unitPanelHas = async (p, id) => (await p.getByText(id, { exact: true }).count()) > 0;
/** load a URL on a session and wait until the app shows its minimap (data loaded) */
async function boot(S, query) {
  await S.page.goto(`${ORIGIN}/${query}`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  await chooseLayout(S.page, 'desktop');       // legacy tree: the chooser; R1b+: no-op
  await waitFor(async () => (await readState(S.page)).units, { timeout: 30000, label: 'minimap (data loaded)' });
}
const HOME = { center: [-77.235, 39.812], zoom: 13.5 };
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 84000, (a[1] - b[1]) * 111000);
const mapReady = (p) => waitFor(() => mapView(p), { timeout: 30000, label: 'map instance' });

// the real-map tests share one session (one Chrome, tiles injected): every page load builds a new map (~50 tile requests), and a run has <= 300
const F = {};
const mapSession = async () => {
  if (F.map) return F.map;
  F.map = await open({ profile: 'map' });
  F.map.page.on('dialog', (d) => { F.prompted = d.defaultValue(); d.accept().catch(() => {}); });
  await F.map.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN }).catch(() => {});
  return F.map;
};

const suite = createSuite('deeplinks');

// ================================================================== T0-DL-01 tick / t / day
suite.test('T0-DL-01', '?tick=451, ?t=451, ?day=2, ?day=3: tick, HUD/toolbar date (July 1-3 only) and the played-through state; tick beats t beats day; all three days requested (X7, X6)', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    const rows = [];
    const cases = [['?tick=451', 451], ['?t=451', 451], ['?tick=100&t=451&day=3', 100], ['?day=2', 226], ['?day=3', 451], ['?t=675', 675], ['?tick=1', 1], ['?t=538&layout=desktop#frag', 538]];
    for (const [q, tick] of cases) {
      const m = S.net.mark();
      await boot(S, q);
      const days = dayOf(tick); const want = carryCount(Array.from({ length: days }, (_, i) => i + 1), tick);
      const s = await waitState(S.page, (x) => x.tick === tick && x.units === want, `${q}: tick ${tick} with ${want} units`);
      const files = new Set(S.net.find(/\/data\/(placements|density)_[^/?]+\.json/, m).map((e) => e.url.replace(/^.*\/data\//, '')));
      const missing = Array.from({ length: days }, (_, i) => DAY_FILES[i + 1]).flat().filter((f) => !files.has(f));
      rows.push({ q, tick: s.tick, hud: s.hudDay, clock: s.clockDay, units: s.units, files: files.size });
      assertEq(s.hudDay, dayOf(tick), `${q}: HUD day`); assertEq(s.clockDay, dayOf(tick), `${q}: toolbar day`);
      assert(!BAD_DATE.test(s.text), `${q}: a July 4-9 date is rendered`);
      assertEq(missing, [], `${q}: data files of days 1..${days} never requested`);
    }
    t.note('cases', rows);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-02 t + u + z + ll on a real map
suite.test('T0-DL-02', '?t=538&u=U-20ME&z=15.5&ll=39.7918,-77.2359 (the app\'s own share-link shape): July 3, tick 538, the 20th Maine panel, camera at ll/z (X7)', async (t) => {
  needGroup('DL');
  const S = await mapSession();
  {
    await boot(S, '?t=538&u=U-20ME&z=15.5&ll=39.7918,-77.2359');
    const s = await waitState(S.page, (x) => x.tick === 538, 'tick 538');
    assertEq(s.hudDay, 3, 'HUD day'); assert(!BAD_DATE.test(s.text), 'a July 4-9 date is rendered');
    await waitFor(() => unitPanelHas(S.page, 'U-20ME'), { timeout: 8000, label: 'unit panel for U-20ME' });
    assert(/20th Maine/.test(await bodyText(S.page)), 'panel does not name the 20th Maine');
    const v = await waitFor(async () => { const m = await mapView(S.page); return m && Math.abs(m.zoom - 15.5) < 0.06 ? m : null; }, { timeout: 25000, label: 'camera jump to z=15.5' });
    t.note('camera', { center: v.center.map((x) => +x.toFixed(4)), zoom: +v.zoom.toFixed(2) }); t.note('unit panel pinned', (await S.page.getByTitle('Unpin unit').count()) > 0);
    assert(metres(v.center, [-77.2359, 39.7918]) < 40, `centre ${v.center} is ${metres(v.center, [-77.2359, 39.7918]).toFixed(0)} m from ll`);
    assert((await S.page.getByTitle('Unpin unit').count()) > 0, 'the linked unit is not pinned');
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
    // the sub-page emitter shape: ?tick=&vignette=&unit=&lat=&lng=  (tick wins; lat+lng jump the camera)
    await boot(S, '?tick=451&vignette=V-022&unit=U-20ME&lat=39.8&lng=-77.25');
    await waitState(S.page, (x) => x.tick === 451, 'tick 451 (sub-page form)');
    const v2 = await waitFor(async () => { const m = await mapView(S.page); return m && metres(m.center, [-77.25, 39.8]) < 40 ? m : null; }, { timeout: 25000, label: 'camera at lat/lng' });
    t.note('lat/lng camera', v2.center.map((x) => +x.toFixed(4)));
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors (sub-page form)');
  }
});

// ================================================================== T0-DL-03 ?ancestor=
suite.test('T0-DL-03', '?ancestor=U-20ME opens Follow Your Ancestor on that regiment (no white screen); an unknown but well-formed id and a hostile one degrade without errors', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await boot(S, '?ancestor=U-20ME');
    await waitFor(async () => /Change Regiment/i.test(await bodyText(S.page)), { timeout: 15000, label: 'Follow timeline for U-20ME' });
    const txt = await bodyText(S.page);
    assert(/20th Maine/.test(txt) && (await S.page.evaluate(() => document.getElementById('root').childElementCount)) > 0, 'white screen or wrong regiment');
    assert(!BAD_DATE.test(txt), 'a July 4-9 date is rendered in the ancestor timeline');
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors for ?ancestor=U-20ME');
    S.collector.clear();
    // a regiment that only exists in the July 2 data: the panel must load every day, or its timeline is truncated (1 position instead of 15)
    await boot(S, '?ancestor=C-15AL');
    const n = await waitFor(async () => { const m = /(\d+) RECORDED POSITIONS/i.exec(await bodyText(S.page)); return m && +m[1] >= 10 ? +m[1] : null; }, { timeout: 10000, label: 'the 15th Alabama timeline with all days loaded' });
    t.note('C-15AL recorded positions', n);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors for ?ancestor=C-15AL');
    S.collector.clear();
    for (const q of ['?ancestor=ZZZ-NOPE', '?ancestor=%3Cscript%3Ewindow.__xss%3D1%3C%2Fscript%3E', '?ancestor=']) {
      await boot(S, q); await sleep(1200);
      const kids = await S.page.evaluate(() => ({ kids: document.getElementById('root').childElementCount, xss: window.__xss }));
      t.note(q, { ...kids, errors: S.collector.firstParty.length });
      assert(kids.kids > 0 && kids.xss === undefined, `${q}: white screen or script ran`);
      assertEq(S.collector.firstParty, [], `${q}: uncaught exceptions / console errors`);
    }
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-04 junk degrades to defaults
const JUNK = [
  '?tick=9999', '?tick=0', '?tick=-4', '?tick=abc', '?tick=1e3', '?tick=', '?t=676', '?tick=abc&unit=<script>window.__xss=1</script>', '?day=7', '?day=0', '?day=abc',
  '?unit=', '?unit=../../etc/passwd', '?unit=%3Cimg%20src%3Dx%20onerror%3Dwindow.__xss%3D1%3E', '?u=%00', '?t=&u=&z=&ll=', '?ll=abc', '?ll=1,2,3', '?ll=,', '?ll=0,0', '?lat=39.8', '?lat=abc&lng=def',
  '?z=abc', '?z=-3', '?vignette=nope', '?v=%3Cb%3E', '?ancestor=%3Cb%3E', '?tick[]=5', '?tick=1&tick=451&tick=abc', `?x=${'A'.repeat(4000)}`, '?%E0%A4%A', '?layout=%00&tick=zzz',
];
suite.test('T0-DL-04', 'junk parameters degrade to the defaults (tick 1, no unit, no Follow panel, home camera) with 0 errors and no script execution (X7)', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    const bad = [];
    for (const q of JUNK) {
      const e0 = S.collector.firstParty.length;
      await boot(S, q); await sleep(500);
      const s = await readState(S.page);
      const extra = await S.page.evaluate(() => ({ xss: window.__xss, kids: document.getElementById('root').childElementCount, panel: !!document.querySelector('[title="Copy share link"]') }));
      const errs = S.collector.firstParty.slice(e0);
      if (s.tick !== 1 || s.units !== carryCount([1], 1) || s.follow || extra.panel || extra.xss !== undefined || extra.kids < 1 || errs.length) bad.push({ q: q.slice(0, 60), tick: s.tick, units: s.units, follow: s.follow, panel: extra.panel, xss: extra.xss, errors: errs.map((x) => x.text.slice(0, 80)) });
    }
    t.note('cases', JUNK.length); t.note('violations', bad);
    assertEq(bad, [], 'junk URLs that did not degrade to the defaults');
  } finally { await closeSession(S); }
});

suite.test('T0-DL-04b', 'junk map parameters leave the camera at home (ll=0,0 with z=abc); z alone moves only the zoom and is clamped to 11..18', async (t) => {
  needGroup('DL');
  const S = await mapSession();
  {
    const seen = {};
    const MAXZ = /GTB63 = /.test(fs.readFileSync(path.join(DIST, 'assets', fs.readdirSync(path.join(DIST, 'assets')).find((f) => /^index-.*\.js$/.test(f))), 'utf8')) ? 17 : 18;
    for (const [q, check] of [
      ['?ll=0,0&z=abc&tick=5', (v) => metres(v.center, HOME.center) < 5 && Math.abs(v.zoom - HOME.zoom) < 0.01],
      ['?z=99', (v) => Math.abs(v.zoom - MAXZ) < 0.05],      // clamped to the map's own ceiling: 18 on the Mapbox satellite base, 17 on group BASE1863's reconstruction (z16 is its native level; z17 is a 2x enlargement and nothing finer is offered)
    ]) {
      await boot(S, q);
      const v = await waitFor(async () => { const m = await mapView(S.page); return m && (check(m) || Math.abs(m.zoom - HOME.zoom) > 0.05) ? m : null; }, { timeout: 25000, label: `camera for ${q}` });
      await sleep(1200); const v2 = await mapView(S.page);
      seen[q] = { center: v2.center.map((x) => +x.toFixed(4)), zoom: +v2.zoom.toFixed(2) };
      assert(check(v2), `${q}: camera ${JSON.stringify(seen[q])}`);
    }
    t.note('cameras', seen);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  }
});

// ================================================================== T0-DL-05 round trip through the app's own share writer
suite.test('T0-DL-05', 'round trip: the unit panel\'s share button writes ?t=&u=&z=&ll=; loading that link reproduces tick, unit, zoom and centre (X7)', async (t) => {
  needGroup('DL');
  const S = await mapSession();
  {
    F.prompted = null;
    await boot(S, '?tick=538&unit=U-20ME');
    await mapReady(S.page);
    await S.page.evaluate(() => { window.__t0map.jumpTo({ center: [-77.2359, 39.7918], zoom: 15.5 }); });
    await sleep(900);
    await waitFor(() => unitPanelHas(S.page, 'U-20ME'), { timeout: 8000, label: 'unit panel' });
    await S.page.locator('button[title="Copy share link"]').click();
    const url = await waitFor(async () => F.prompted || (await S.page.evaluate(() => navigator.clipboard.readText().catch(() => ''))) || null, { timeout: 6000, label: 'the shared link (clipboard or prompt)' });
    const u = new URL(url); const q = Object.fromEntries(u.searchParams);
    t.note('share link', url.replace(ORIGIN, '')); t.note('params', q);
    assertEq(q.t, '538', 'tick param'); assertEq(q.u, 'U-20ME', 'unit param'); assertEq(q.z, '15.5', 'zoom param');
    assert(/^39\.7918,-77\.2359$/.test(q.ll), `ll param ${q.ll}`);
    assertEq(S.collector.firstParty, [], 'errors before the round trip');
    // load the link that the app itself wrote
    await boot(S, `${u.search}`);
    await waitState(S.page, (x) => x.tick === 538, 'tick 538 from the shared link');
    await waitFor(() => unitPanelHas(S.page, 'U-20ME'), { timeout: 8000, label: 'unit panel from the shared link' });
    const v = await waitFor(async () => { const m = await mapView(S.page); return m && Math.abs(m.zoom - 15.5) < 0.06 ? m : null; }, { timeout: 25000, label: 'camera from the shared link' });
    t.note('camera after the round trip', { center: v.center.map((x) => +x.toFixed(4)), zoom: +v.zoom.toFixed(2) });
    assert(metres(v.center, [-77.2359, 39.7918]) < 30, `centre off by ${metres(v.center, [-77.2359, 39.7918]).toFixed(0)} m`);
    assertEq(S.collector.firstParty, [], 'errors after the round trip');
  }
});

suite.test('T0-DL-05b', 'every link shape the site and the app emit is read: ?tick=&vignette= (documentary/education/embed/historian/search), ?unit=&tick= (regiment), ?unit= (search)', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    const rows = [];
    for (const [q, want] of [
      ['/index.html?tick=551&vignette=V-016', { tick: 551, story: 'Armistead at The Angle' }],
      ['/?tick=275&vignette=V-010', { tick: 275, story: "Chamberlain's Charge" }],
      ['/?unit=U-20ME&tick=267', { tick: 267, unit: 'U-20ME' }],
      ['/index.html?unit=U-1MN', { tick: 1, unit: 'U-1MN' }],
    ]) {
      await S.page.goto(`${ORIGIN}${q}`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop');
      await waitFor(async () => (await readState(S.page)).units, { timeout: 30000, label: 'minimap' });
      const s = await waitState(S.page, (x) => x.tick === want.tick, `${q}: tick ${want.tick}`);
      if (want.unit) await waitFor(() => unitPanelHas(S.page, want.unit), { timeout: 8000, label: `${q}: unit panel ${want.unit}` });
      if (want.story) await waitFor(async () => (await bodyText(S.page)).includes(want.story), { timeout: 8000, label: `${q}: story panel "${want.story}"` });
      rows.push({ q, tick: s.tick });
    }
    t.note('links', rows);
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-06 moments.json v0 lint (WP-T0-09: +-3 ticks of a chronology event)
suite.test('T0-DL-06', 'moments.json v0: 9 Turning Points + 8 markers + 5 tour stops, ids unique, every row unreviewed, every tick within +-3 of a chronology event, Ewell/Night Assault provisional', async (t) => {
  needGroup('DL');
  const file = path.join(DIST, 'data', 'moments.json');
  if (IS_LEGACY) throw new Skip('legacy/dist has no moments.json (red-first: the file is absent)');
  assert(fs.existsSync(file), 'data/moments.json is not in the build');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ev = [1, 2, 3].flatMap((d) => readJson(`chronology_day${d}.json`).events);
  const near = (tick) => ev.filter((e) => Math.abs(e.tick - tick) <= 3);
  const kinds = {}; const seen = new Set(); const miss = [];
  for (const m of doc.moments) {
    kinds[m.kind] = (kinds[m.kind] || 0) + 1;
    assert(m.id && !seen.has(m.id), `duplicate or missing id ${m.id}`); seen.add(m.id);
    assert(Number.isInteger(m.tick) && m.tick >= 1 && m.tick <= 675, `${m.id}: tick ${m.tick}`); assertEq(m.review, 'unreviewed', `${m.id}: review`);
    assert(typeof m.title === 'string' && m.title.length > 2, `${m.id}: title`);
    if (!near(m.tick).length) miss.push(`${m.id}@${m.tick}`);
  }
  t.note('kinds', kinds); t.note('rows', doc.moments.length);
  assertEq(kinds, { 'turning-point': 9, marker: 8, 'tour-stop': 5 }, 'row counts by kind');
  assertEq(miss, [], 'moments with no chronology event within +-3 ticks');
  const byId = Object.fromEntries(doc.moments.map((m) => [m.id, m]));
  assertEq([byId['tp-ewell-discretion'].tick, byId['tp-ewell-discretion'].provisional], [75, true], 'Ewell anchor');
  assertEq([byId['tp-night-assault'].tick, byId['tp-night-assault'].provisional], [326, true], 'Night Assault anchor');
  assertEq(doc.moments.filter((m) => m.provisional).length, 2, 'provisional rows');
  // the repointed anchors have a critical chronology event exactly at their tick (except the two documented ones)
  for (const [id, tick] of [['tp-longstreet-delay', 256], ['tp-chamberlain-charge', 275], ['tp-cannonade', 518], ['tp-pickett-charge', 538], ['tp-ewell-discretion', 75], ['tp-night-assault', 326]]) {
    assertEq(byId[id].tick, tick, `${id} tick`);
    assert(ev.some((e) => e.tick === tick && e.significance === 'critical'), `${id}: no critical chronology event at t${tick}`);
  }
});

// ================================================================== T0-DL-07 vignette
suite.test('T0-DL-07', '?vignette=V-016 (and ?v=) without a tick resolves to the vignette\'s trigger tick (551) and shows its story; a tick given with it wins', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    for (const [q, tick, story] of [['?vignette=V-016', 551, 'Armistead at The Angle'], ['?v=V-001', 12, 'The First Shot'], ['?vignette=V-016&tick=300', 300, null]]) {
      await boot(S, q);
      await waitState(S.page, (x) => x.tick === tick, `${q}: tick ${tick}`);
      if (story) await waitFor(async () => (await bodyText(S.page)).includes(story), { timeout: 8000, label: `${q}: story "${story}"` });
    }
    assertEq(S.collector.firstParty, [], 'uncaught exceptions / console errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-08 onboarding
suite.test('T0-DL-08', 'a deep link skips the first-run onboarding modal; a plain first visit still shows it', async (t) => {
  needGroup('DL');
  const S = await open({ profile: 'onboard', tiles: 'block', onboarded: false });
  try {
    await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {}); await sleep(1800);
    const plain = await bodyText(S.page);
    const plainModal = /Welcome|How would you like|Newcomer|New to Gettysburg|History Buff|Power User/i.test(plain);
    S.page.context().clearCookies().catch(() => {});
    await S.page.evaluate(() => { try { localStorage.clear(); } catch { /* blocked */ } });
    await S.page.goto(`${ORIGIN}/?tick=451`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await chooseLayout(S.page, 'desktop').catch(() => {}); await sleep(1800);
    const link = await bodyText(S.page);
    const linkModal = /Welcome|How would you like|Newcomer|New to Gettysburg|History Buff|Power User/i.test(link);
    t.note('modal on plain visit / on deep link', [plainModal, linkModal]);
    assert(plainModal, 'control failed: the plain first visit did not show the onboarding modal (the probe text is stale)');
    assert(!linkModal, 'the onboarding modal covers a deep-linked map');
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-09 Turning Points
suite.test('T0-DL-09', 'turning-points.html: nine anchors match moments.json and each "See this moment on the map" link lands on that tick (Ewell 75, Longstreet 256, Chamberlain 275, Night 326, Cannonade 518, Pickett 538)', async (t) => {
  needGroup('DL');
  if (IS_LEGACY) throw new Skip('legacy/dist keeps the wrong anchors by definition');
  const html = fs.readFileSync(path.join(DIST, 'turning-points.html'), 'utf8');
  // CLOCK adds a `when: '...'` field between title and tick on a card (the Night Assault reads "evening, about 7:00 to 8:30 PM"): match the card's own line
  const ticks = [...html.matchAll(/title: "([^"]+)",[^\n]*?tick: (\d+),/g)].map((m) => ({ title: m[1], tick: +m[2] }));
  const doc = JSON.parse(fs.readFileSync(path.join(DIST, 'data', 'moments.json'), 'utf8'));
  const tp = doc.moments.filter((m) => m.kind === 'turning-point');
  t.note('page anchors', ticks.map((x) => x.tick));
  assertEq(ticks.map((x) => x.tick), tp.map((m) => m.tick), 'page POINTS ticks vs moments.json turning points (same order)');
  assertEq(ticks.map((x) => x.title), tp.map((m) => m.title), 'titles');
  const S = await open({ profile: 'blocked', tiles: 'block' });
  try {
    await S.page.goto(`${ORIGIN}/turning-points`, { waitUntil: 'load' });
    const hrefs = await S.page.evaluate(() => [...document.querySelectorAll('a.tp-link')].map((a) => a.getAttribute('href')));
    assertEq(hrefs, tp.map((m) => `/?tick=${m.tick}`), 'link hrefs');
    for (const href of [hrefs[1], hrefs[5], hrefs[8]]) {
      const want = +/tick=(\d+)/.exec(href)[1];
      await boot(S, href.slice(1)); await waitState(S.page, (x) => x.tick === want, `${href}: tick ${want}`);
    }
    assertEq(S.collector.firstParty, [], 'errors');
  } finally { await closeSession(S); }
});

// ================================================================== T0-DL-10 phone shell
suite.test('T0-DL-10', 'phone 375x812 (mobile shell): ?t=268&u=U-20ME&z=15.5&ll=... lands on tick, unit panel (the phone panel needs a keyframe at the tick: 268) and camera; ?ancestor= opens the Follow panel; a junk link degrades (X7 mobile)', async (t) => {
  needGroup('DL');
  needGroup('C');
  const S = await open({ profile: 'phone', viewport: VIEWPORTS.portrait[0] });
  try {
    await S.page.goto(`${ORIGIN}/?t=268&u=U-20ME&z=15.5&ll=39.7918,-77.2359`, { waitUntil: 'load' }); await waitForApp(S.page, 45000);
    const s = await waitFor(async () => { const x = await readPageState(S.page); return x.frame === 268 ? x.text : null; }, { timeout: 15000, label: 'phone shell at tick 268' });
    assert(/JULY\s+2\s+(?:about\s+)?\d{1,2}:\d{2}/i.test(s), 'phone clock does not read July 2');
    await waitFor(async () => /20th Maine/i.test(await bodyText(S.page)), { timeout: 8000, label: 'unit panel for the 20th Maine on the phone' });
    const v = await waitFor(async () => { const m = await mapView(S.page); return m && Math.abs(m.zoom - 15.5) < 0.06 ? m : null; }, { timeout: 25000, label: 'phone camera jump to z=15.5' });
    t.note('phone camera', { center: v.center.map((x) => +x.toFixed(4)), zoom: +v.zoom.toFixed(2) });
    assert(metres(v.center, [-77.2359, 39.7918]) < 60, `phone centre ${metres(v.center, [-77.2359, 39.7918]).toFixed(0)} m from ll`);
    assertEq(S.collector.firstParty, [], 'errors on the phone deep link');
    S.setTiles('block');
    await S.page.goto(`${ORIGIN}/?ancestor=U-20ME`, { waitUntil: 'load' }); await waitForApp(S.page, 45000);
    const anc = await waitFor(async () => (/Change Regiment/i.test(await bodyText(S.page)) ? true : null), { timeout: 12000, label: 'Follow panel on the phone' }).catch(() => false);
    t.note('?ancestor= opens the Follow panel on the phone', !!anc);
    await S.page.goto(`${ORIGIN}/?tick=9999&unit=%3Cscript%3E&ll=0,0&z=abc`, { waitUntil: 'load' }); await waitForApp(S.page, 45000); await sleep(1200);
    const junkFrame = (await readPageState(S.page)).frame; t.note('junk link tick 1', junkFrame === 1);
    assertEq(junkFrame, 1, 'a junk link moved the phone clock');
    assertEq(S.collector.firstParty, [], 'errors on the phone links');
    assert(anc, '?ancestor= did not open the Follow panel in the mobile shell');
  } finally { await closeSession(S); }
});

// ------------------------------------------------------------------ run
const outFile = path.join(resultsDir, IS_LEGACY ? 'test-deeplinks-legacy.json' : 'test-deeplinks.json');
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
