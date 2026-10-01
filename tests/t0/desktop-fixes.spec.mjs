// Desktop fixes after the verifier round (group A2; docs/verification/t0-verifier-findings.json verifier 0).  Real system Chrome (headless), real CDP mouse / wheel /
// keyboard input, Mapbox tiles only through the Referer-injecting harness (tests/t0/lib.mjs, <= 300 requests per run), a Netlify-like static server on 127.0.0.1.
//
//   node tests/t0/desktop-fixes.spec.mjs                              against release/R1c/dist
//   node tests/t0/desktop-fixes.spec.mjs --dist tmp/desktop-fix/R1c/dist
//   node tests/t0/desktop-fixes.spec.mjs --filter 'DF-0[1-3]'         subset by id regex (each invocation has its own tile budget)
//   node tests/t0/desktop-fixes.spec.mjs --dist <tree without A2> --expect-red      red-first proof: every selected test must FAIL on a tree that lacks the group
//
// Ids (each one is a verifier defect; the number in brackets is the letter used in the task):
//   T0-DF-01 (a) a click, a drag or a unit selection on the map does not leave keyboard focus on the map canvas: the documented keys (arrows = tick, Shift+arrows = hour,
//                +/-/0 = speed, Space = play) keep working; the map is not moved by them.
//   T0-DF-02 (a) a keyboard user who Tabs to the map still pans and zooms it (Mapbox keys, only while the canvas holds focus); Esc hands focus back and the arrows step time again.
//   T0-DF-03 (b) the unit canvas follows the map while paused (drag, wheel zoom, flyTo); the trail canvas does not keep stale screen-space lines; no screen-fixed monument
//                overlay exists that could go stale (the star overlay of legacy/dist is not in the baseline-built trains).
//   T0-DF-04 (c) the Mapbox wordmark and the attribution links are on top (elementFromPoint), above the transport dock and clear of the credit line and the minimap, at 1280x720,
//                1440x900, 1920x1080 and 2560x1440.
//   T0-DF-05 (d) story / event cards: they do not cover the zoom buttons, the Trails toggle or the minimap, nor the dock; Esc dismisses the topmost card (story, then event),
//                but only after panels / modals / a selected unit have been closed by their own Esc.
//   T0-DF-06 (e) a filter change on a paused map is painted at once.
//   T0-DF-07 (f) a window resize repaints the units at once and resizes the z-index 8 and 9 overlay canvases.
//   T0-DF-08 (g) NPS Auto Tour: the progress dots sit inside the panel (not over the text), the panel leaves the day tabs and the attribution strip free, closing it (X or Esc)
//                gives back the speed the viewer had.
//   T0-DF-09 static: the built entry carries the A2 helpers once and the A-group key guard still lets Mapbox have the arrows only while its canvas holds focus.
//   T0-DF-X  every test above ran with 0 uncaught exceptions and 0 first-party console.error.
// Decisions recorded here (the patch notes in tools/t0/patches/A.json and A2.json carry the same text):
//   (a) Keyboard focus.  Mapbox puts tabindex=0 on its canvas and the browser focuses it on a mouse press, so after any click or drag Mapbox's own key handler (arrows pan, + - zoom,
//       Shift+arrows rotate / tilt) took the keys Help documents for the clock (arrows = tick, Shift+arrows = hour, + - 0 = speed).  Chosen: a pointer press hands focus back (group A2,
//       GtbgMapSetup), the map's own keys stay for a keyboard user who Tabs to the canvas (Esc gives focus back), and the group-A key guard keeps leaving the arrows to Mapbox only while the
//       canvas holds focus.  Rejected for T0: keyboard:false + Shift+arrows pan (docs/plan/specialists/app-a11y.md 6.3) - Shift+arrows is the documented 12-tick step and WASD collides with S/B/L/M/F,
//       so that model needs the shortcut registry of the rebuild.  Help carries one row for the Tab route (CP: cp:h-map-keys).
//   (b) Monument stars.  The overlay the verifier saw (index.html, projected from the default view only) is not in the trains built from baseline/dist: production removed it
//       (docs/baseline-drift.md section 5, T0-BL-02); the Monuments toolbar button is inert there.  Nothing to reproject; DF-03 guards that no screen-fixed overlay comes back unnoticed.
//   (h) Permissions-Policy accelerometer=(): configuration (tools/t0/config, ops/header-decisions.md), not a bundle patch; reported to the config owner.
// Trains: group A2 is in R1a, R1b and R1c.  `--expect-red` runs the A2 tests on a tree that lacks the group (a build from before A2, or legacy/dist) and requires every
// one of them to fail.
process.env.T0_AGENT ??= 'desktop-fix';
process.env.T0_PORT_BASE ??= '8640';
import fs from 'node:fs';
import path from 'node:path';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, mapView,
  mouseDrag, wheel, emulateViewport, tileBudget, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/build.py --train R1c`); process.exit(2); }
const IS_LEGACY = DIST === path.resolve(REPO, 'legacy/dist');
const VERSION = IS_LEGACY ? { groups: [] } : JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
const GROUPS = VERSION.groups || [];
const HAS_A2 = GROUPS.includes('A2');
const HAS_B = GROUPS.includes('B') || IS_LEGACY;
/** an A2 test runs on a train that has the group, or on any tree under --expect-red (the proof that it fails without it) */
const needA2 = () => { if (!HAS_A2 && !EXPECT_RED) throw new Skip(`group A2 is not in this tree (${GROUPS.join(', ') || 'legacy'})`); };
const resultsDir = IS_LEGACY ? path.join(REPO, 'tmp', process.env.T0_AGENT) : path.dirname(DIST);

const srv = await createStaticServer({ root: DIST, port: PORT_BASE });
const ORIGIN = srv.url;
const sessions = [];
let seq = 0;
const open = async (opts) => {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq;
    const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 1 + (n % 9); while (live.has(port)) port = PORT_BASE + 1 + ((port - PORT_BASE) % 9);
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}` }); sessions.push(s); return s; }
    catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
};
const closeSession = async (s) => { await s.close(); const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };

// ------------------------------------------------------------------ page helpers
const bodyText = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const rx = (t, re) => { const m = re.exec(t); return m || null; };
async function readState(p) {
  const t = await bodyText(p);
  const tick = rx(t, /Tick (\d+)\/675/), mm = rx(t, /(\d+) units · tick (\d+)/), sp = rx(t, /\b(\d+(?:\.\d+)?x) \((?:slow|base speed|real time|fast)\)/);
  return { tick: tick ? +tick[1] : null, units: mm ? +mm[1] : null, speed: sp ? sp[1] : null, text: t };
}
const waitState = (p, pred, label, timeout = 8000) => waitFor(async () => { const s = await readState(p); return pred(s) ? s : null; }, { timeout, interval: 100, label });
const HOME = { center: [-77.235, 39.812], zoom: 13.5, bearing: 0, pitch: 0 };
const mapReady = async (p) => waitFor(async () => (await mapView(p)), { timeout: 30000, label: 'map instance (style loaded)' });
const setCamera = (p, cam) => p.evaluate((c) => { window.__t0map.jumpTo(c); }, cam);
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 84000, (a[1] - b[1]) * 111000);
const mv = (a, b) => metres(a.center, b.center);
const clickDayTab = (p, day, real = true) => { const l = p.locator(`button:text-is("July ${day}")`).last(); return real ? l.click() : l.dispatchEvent('click'); };
async function clickTool(loc) { try { await loc.click({ timeout: 2500 }); } catch { await loc.dispatchEvent('click'); } }
const blurActive = (p) => p.evaluate(() => { const a = document.activeElement; a && a !== document.body && a.blur && a.blur(); });
const activeDesc = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}.${String(a.className).split(' ')[0]}` : null; });
const intersects = (a, b, tol = 1) => a && b && a.x < b.x + b.w - tol && b.x < a.x + a.w - tol && a.y < b.y + b.h - tol && b.y < a.y + a.h - tol;
const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };

/** painted pixels (alpha > 0) of the unit canvas (z-index 10) and of the trail canvas (z-index 8) */
const inkCount = (p, z = '10') => p.evaluate((zi) => {
  const c = [...document.querySelectorAll('canvas')].find((cv) => getComputedStyle(cv).zIndex === zi && (zi !== '10' || cv.width > 400)); if (!c) return -1;
  if (!c.width || !c.height) return 0;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
}, z);
/** alpha > 0 pixels of the unit canvas inside a (2r+1) square around a page point */
const inkAt = (p, x, y, r = 5) => p.evaluate(([px, py, rr]) => {
  const c = [...document.querySelectorAll('canvas')].find((cv) => getComputedStyle(cv).zIndex === '10' && cv.width > 400); if (!c) return -1;
  const b = c.getBoundingClientRect(); const x0 = Math.round(px - b.left - rr), y0 = Math.round(py - b.top - rr), w = 2 * rr + 1;
  if (x0 < 0 || y0 < 0 || x0 + w > c.width || y0 + w > c.height) return -2;
  const d = c.getContext('2d').getImageData(x0, y0, w, w).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
}, [x, y, r]);
/** units drawn at tick 1 (data of this tree) that sit isolated in the open view: { id, lng, lat } */
const DAY1 = (() => { try { const j = JSON.parse(fs.readFileSync(path.join(DIST, 'data', 'placements_day1_ticks1_50.json'), 'utf8')); return (Array.isArray(j) ? j : j.placements).filter((r) => r.tick === 1); } catch { return []; } })();
async function isolatedUnits(p, margin = { l: 60, r: 120, t: 80, b: 180 }) {
  return p.evaluate(([rows, m]) => {
    const map = window.__t0map; const c = map.getCanvas().getBoundingClientRect(); const out = [];
    for (const r of rows) {
      const q = map.project([r.lng, r.lat]); const x = q.x + c.left, y = q.y + c.top;
      if (x < c.left + m.l || x > c.right - m.r || y < c.top + m.t || y > c.bottom - m.b) continue;
      let nn = 9; for (const o of rows) if (o !== r) nn = Math.min(nn, Math.hypot(o.lng - r.lng, o.lat - r.lat));
      out.push({ id: r.unit_id, lng: r.lng, lat: r.lat, nn });
    }
    return out.filter((u) => u.nn > 0.004).sort((a, b) => b.nn - a.nn).slice(0, 6);
  }, [DAY1, margin]);
}
const pagePoint = (p, lng, lat) => p.evaluate(([lo, la]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const q = m.project([lo, la]); return { x: q.x + c.left, y: q.y + c.top }; }, [lng, lat]);

const F = {};
async function shared() {
  if (F.S) { await calm(F.S); return F.S; }
  const S = await open({ profile: 'shared', viewport: { width: 1440, height: 900, dpr: 1, mobile: false } });
  F.S = S;
  await S.page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitForApp(S.page, 45000);
  await chooseLayout(S.page, 'desktop');
  await waitFor(async () => (await readState(S.page)).units, { timeout: 30000, label: 'minimap unit count (data loaded)' });
  await mapReady(S.page);
  await sleep(1200);
  return S;
}
async function reload(S) {
  const p = S.page;
  await p.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitForApp(p, 45000); await chooseLayout(p, 'desktop');
  await waitFor(async () => (await readState(p)).units, { timeout: 30000, label: 'minimap unit count (data loaded)' });
  await mapReady(p); await sleep(1200);
}
/** a quiet UI: nothing open, nothing selected, nothing focused, tick 1, 1x, paused, home camera */
async function calm(S) {
  const p = S.page;
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await sleep(100); }
  await blurActive(p);
  const s = await readState(p);
  if (s.speed && s.speed !== '1x') await p.locator('button:text-is("1x")').dispatchEvent('click');
  await clickDayTab(p, 1, false); await waitState(p, (x) => x.tick === 1, 'tick 1', 4000).catch(() => {});
  await blurActive(p); await setCamera(p, HOME); await sleep(500);
}
const suite = createSuite('desktop-fixes');
{ const add = suite.test.bind(suite);
  suite.test = (id, title, fn) => add(id, title, async (t) => { const u0 = tileBudget.used; try { return await fn(t); } finally { if (tileBudget.used > u0) t.note('mapbox requests', tileBudget.used - u0); } }); }

// ================================================================== (a) keyboard focus
suite.test('T0-DF-01', '(a) after a click, a drag and a unit selection on the map the documented keys work (ArrowRight +1, Shift+ArrowRight +12, +/-/0 speed, Space play) and do not move the map', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  const cands = await isolatedUnits(p); assert(cands.length > 0, 'no isolated unit in view');
  const u = await pagePoint(p, cands[0].lng, cands[0].lat);
  const steps = [['click on empty ground', async () => { await p.mouse.click(760, 420); }],
    ['drag', async () => { await mouseDrag(p, [760, 420], [700, 400]); await sleep(900); }],
    ['click on a unit (selects and pins it)', async () => { await p.mouse.click(u.x, u.y); await sleep(500); }]];
  const report = [];
  for (const [name, act] of steps) {
    await calm(S); await act(); await sleep(300);
    const focus = await activeDesc(p);
    const v0 = await mapView(p), s0 = await readState(p);
    await p.keyboard.press('ArrowRight'); await sleep(250); const s1 = await readState(p);
    await p.keyboard.press('Shift+ArrowRight'); await sleep(250); const s2 = await readState(p);
    await p.keyboard.press('ArrowLeft'); await sleep(250); const s3 = await readState(p);
    await p.keyboard.press('=');  await sleep(200); const s4 = await readState(p);
    await p.keyboard.press('-');  await sleep(200); await p.keyboard.press('-'); await sleep(200); const s5 = await readState(p);
    await p.keyboard.press('0');  await sleep(200); const s6 = await readState(p);
    const v1 = await mapView(p);
    report.push({ name, focus, ticks: [s0.tick, s1.tick, s2.tick, s3.tick], speeds: [s0.speed, s4.speed, s5.speed, s6.speed], mapMovedM: Math.round(mv(v0, v1)), zoomChange: +(v1.zoom - v0.zoom).toFixed(2) });
    assert(!/canvas/i.test(focus || ''), `${name}: the map canvas holds keyboard focus (${focus})`);
    assertEq([s1.tick - s0.tick, s2.tick - s1.tick, s3.tick - s2.tick], [1, 12, -1], `${name}: ArrowRight / Shift+ArrowRight / ArrowLeft tick steps`);
    assertEq([s0.speed, s4.speed, s5.speed, s6.speed], ['1x', '2x', '0.5x', '1x'], `${name}: = then - - then 0 speed labels`);
    assert(mv(v0, v1) < 3 && Math.abs(v1.zoom - v0.zoom) < 0.01, `${name}: the keys moved or zoomed the map (${mv(v0, v1).toFixed(0)} m, ${(v1.zoom - v0.zoom).toFixed(2)} zoom)`);
  }
  t.note('per step', report);
  // Space: play, then pause, exactly once each
  await calm(S); await p.mouse.click(760, 420); await sleep(300);
  await p.keyboard.press(' '); const a = await waitState(p, (s) => s.tick >= 3, 'Space starts playback after a map click', 6000);
  await p.keyboard.press(' '); await sleep(500); const b = await readState(p); await sleep(900); const c = await readState(p);
  t.note('Space play/pause ticks', [a.tick, b.tick, c.tick]); assertEq(b.tick, c.tick, 'playback still running after the second Space');
  await calm(S);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-01');
});

suite.test('T0-DF-02', '(a) keyboard route: Tab reaches the map, arrows pan, = / - zoom it (Mapbox keys, tick and speed untouched); Esc gives focus back and the arrows step time again', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await calm(S);
  let tabs = 0; let d = '';
  for (; tabs < 90; tabs++) { await p.keyboard.press('Tab'); d = await activeDesc(p); if (/mapboxgl-canvas/.test(d)) break; }
  assert(/mapboxgl-canvas/.test(d), `Tab never reached the map canvas in 90 presses (last: ${d})`);
  t.note('tab presses to the map', tabs + 1);
  const v0 = await mapView(p), s0 = await readState(p);
  await p.keyboard.press('ArrowRight'); await sleep(700); const v1 = await mapView(p), s1 = await readState(p);
  await p.keyboard.press('=');          await sleep(900); const v2 = await mapView(p), s2 = await readState(p);
  await p.keyboard.press('-');          await sleep(900); const v2b = await mapView(p);
  await p.keyboard.press('Shift+ArrowRight'); await sleep(900); const v2c = await mapView(p), s2c = await readState(p);   // what the Help row for the map's keyboard route promises: Shift + arrows rotate and tilt
  await p.keyboard.press('Shift+ArrowUp');    await sleep(900); const v2d = await mapView(p), s2d = await readState(p);
  t.note('canvas focused', { panM: Math.round(mv(v0, v1)), zoom: [+v1.zoom.toFixed(2), +v2.zoom.toFixed(2), +v2b.zoom.toFixed(2)], bearing: [v2b.bearing, v2c.bearing], pitch: [v2c.pitch, v2d.pitch], ticks: [s0.tick, s1.tick, s2.tick, s2c.tick, s2d.tick], speeds: [s0.speed, s2.speed] });
  assert(mv(v0, v1) > 100, `ArrowRight with the map focused did not pan it (${mv(v0, v1).toFixed(0)} m)`);
  assert(v2.zoom - v1.zoom > 0.3, `"=" with the map focused did not zoom it (${v1.zoom} -> ${v2.zoom})`);
  assert(v2.zoom - v2b.zoom > 0.3, `"-" with the map focused did not zoom out (${v2.zoom} -> ${v2b.zoom})`);
  assert(Math.abs(v2c.bearing - v2b.bearing) > 5, `Shift+ArrowRight with the map focused did not rotate it (bearing ${v2b.bearing} -> ${v2c.bearing})`);
  assert(v2d.pitch - v2c.pitch > 3, `Shift+ArrowUp with the map focused did not tilt it (pitch ${v2c.pitch} -> ${v2d.pitch})`);
  assertEq([s1.tick, s2.tick, s2c.tick, s2d.tick], [s0.tick, s0.tick, s0.tick, s0.tick], 'the map keys moved the clock'); assertEq(s2d.speed, s0.speed, 'the map key changed the playback speed');
  await p.keyboard.press('Escape'); await sleep(250);
  const after = await activeDesc(p); assert(!/canvas/i.test(after || ''), `Escape left focus on the map (${after})`);
  const v3 = await mapView(p); await p.keyboard.press('ArrowRight'); await sleep(300); const s3 = await readState(p); await p.keyboard.press('Shift+ArrowRight'); await sleep(300); const s4 = await readState(p), v4 = await mapView(p);
  t.note('after Escape', { tick: [s2d.tick, s3.tick, s4.tick], panM: Math.round(mv(v3, v4)), bearing: [v3.bearing, v4.bearing] });
  assertEq([s3.tick - s2d.tick, s4.tick - s3.tick], [1, 12], 'after Escape ArrowRight / Shift+ArrowRight did not step the clock by 1 / 12');
  assert(mv(v3, v4) < 3 && Math.abs(v4.bearing - v3.bearing) < 0.5, 'the arrows after Escape still moved or rotated the map');
  await setCamera(p, HOME); await sleep(300);
  await calm(S);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-02');
});

// ================================================================== (b) overlays follow the map
suite.test('T0-DF-03', '(b) paused: the unit canvas follows a mouse drag and a wheel zoom (a unit stays under its place); trail canvas is empty after a move; no stale screen-fixed monument overlay', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await calm(S);
  const cands = await isolatedUnits(p, { l: 380, r: 480, t: 160, b: 320 }); assert(cands.length > 0, 'no isolated unit near the middle of the view');
  const U = cands[0]; t.note('unit', U.id);
  const p0 = await pagePoint(p, U.lng, U.lat);
  await p.keyboard.press('ArrowRight'); await sleep(200); await p.keyboard.press('ArrowLeft'); await sleep(400);          // a tick step and back: a repaint, whatever the camera jump above did
  const ink0 = await inkAt(p, p0.x, p0.y); assert(ink0 > 5, `the unit is not drawn at its place before the test (${ink0} px)`);
  await mouseDrag(p, [760, 430], [690, 380]); await sleep(1500);
  const p1 = await pagePoint(p, U.lng, U.lat);
  const ink1 = await inkAt(p, p1.x, p1.y), inkOld = await inkAt(p, p0.x, p0.y);
  t.note('after drag: unit moved on screen (px)', [Math.round(p1.x - p0.x), Math.round(p1.y - p0.y)]); t.note('ink at the new place / at the old place', [ink1, inkOld]);
  assert(Math.abs(p1.x - p0.x) > 40, 'the drag did not move the map');
  assert(ink1 > 5, `after a drag the unit is not drawn at its new place (ink ${ink1}): the unit canvas does not follow the map`);
  await wheel(p, p1.x + 160, p1.y + 70, -380); await sleep(1800);
  const p2 = await pagePoint(p, U.lng, U.lat); const ink2 = await inkAt(p, p2.x, p2.y);
  t.note('after wheel zoom: ink at the unit', ink2); assert(ink2 > 5, `after a wheel zoom the unit is not drawn at its place (ink ${ink2})`);
  // flyTo (what Follow Your Ancestor / the tour do) repaints too
  await p.evaluate((u) => window.__t0map.flyTo({ center: [u.lng + 0.0015, u.lat + 0.001], zoom: 14.2, duration: 700 }), U); await sleep(1500);
  const p3 = await pagePoint(p, U.lng, U.lat); const ink3 = await inkAt(p, p3.x, p3.y);
  const inView = p3.x > 40 && p3.x < 1300 && p3.y > 70 && p3.y < 700;
  t.note('after flyTo: unit on screen / ink', [inView, ink3]); assert(inView, 'the unit is not on screen after flyTo (test geometry)'); assert(ink3 > 5, `after flyTo the unit is not drawn at its place (ink ${ink3})`);
  // trails: draw some (the canvas is sized by the resize observer), play, then move the map: nothing stale may stay
  await calm(S);
  await emulateViewport(p, { width: 1439, height: 899, dpr: 1, mobile: false }); await sleep(500); await emulateViewport(p, { width: 1440, height: 900, dpr: 1, mobile: false }); await sleep(600);
  await p.locator('button:text-is("8x")').dispatchEvent('click');
  await clickTool(p.locator('button[title="Play/Pause (Space)"]')); await waitState(p, (s) => s.tick >= 40, 'playing', 12000);
  await clickTool(p.locator('button[title="Play/Pause (Space)"]')); await sleep(500);
  const trailInk = await inkCount(p, '8'); t.note('trail canvas ink after 40 ticks at 8x', trailInk); assert(trailInk > 0, 'no trail lines were drawn at all: the probe is dead');
  await mouseDrag(p, [760, 430], [700, 400]); await sleep(1500);
  const trailAfter = await inkCount(p, '8'); t.note('trail canvas ink after a drag', trailAfter);
  assertEq(trailAfter, 0, 'trail lines stayed on the screen after the map moved');
  await p.locator('button:text-is("1x")').dispatchEvent('click');
  // no screen-fixed monument overlay (the star overlay of legacy/dist is not in the baseline-built trains; if one ever returns it must track the map: see T0-BL-02)
  await clickTool(p.locator('button[title="Monuments"]')); await sleep(600);
  const mon = await p.evaluate(() => ({ overlay: !!document.getElementById('gtbg-monuments-overlay'), fixedMarkers: [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /^\u{1F3DB}/u.test((e.textContent || '').trim())).length }));
  await clickTool(p.locator('button[title="Monuments"]'));
  t.note('monument overlay / markers', mon);
  if (!IS_LEGACY) { assertEq(mon.overlay, false, 'a screen-fixed monument star overlay is mounted'); }
  await calm(S);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-03');
});

// ================================================================== (c) attribution above the dock
suite.test('T0-DF-04', '(c) Mapbox wordmark + attribution links are on top, above the dock and clear of the credit line and minimap at 1024x768, 1280x720, 1440x900, 1920x1080, 2560x1440', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  const rows = [];
  for (const [w, h] of [[1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await emulateViewport(p, { width: w, height: h, dpr: 1, mobile: false });
    await waitFor(async () => (await p.evaluate(() => { const a = document.querySelector('.mapboxgl-ctrl-attrib'); return !!a && a.querySelectorAll('a').length >= 2 && a.getBoundingClientRect().width > 40; })), { timeout: 20000, label: `attribution links at ${w}x${h}` });
    await sleep(500);
    const r = await p.evaluate(({ w, h }) => {
      const R = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
      const hit = (e) => { const b = e.getBoundingClientRect(); if (!b.width || !b.height) return 'zero-size'; const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!top && (top === e || e.contains(top)); };
      const links = [...document.querySelectorAll('.mapboxgl-ctrl-attrib a')].map((a) => ({ text: a.textContent.trim().slice(0, 22), hit: hit(a), rect: R(a) }));
      const logo = document.querySelector('.mapboxgl-ctrl-logo');
      const dock = document.getElementById('gt-timeline'), credit = document.querySelector('a[href^="mailto:gettysburginteractivemap"]');
      const mini = document.querySelector('canvas[title="Click to move the map"], canvas[title="Click to navigate"]');
      const attrib = document.querySelector('.mapboxgl-ctrl-attrib');
      return { w, h, innerW: innerWidth, innerH: innerHeight, links, logo: logo ? { hit: hit(logo), rect: R(logo) } : null, dock: dock && R(dock), credit: credit && R(credit),
        minimap: mini && R(mini.parentElement), attrib: attrib && R(attrib), overflowX: document.documentElement.scrollWidth > innerWidth };
    }, { w, h });
    rows.push({ vp: `${w}x${h}`, links: r.links.map((l) => `${l.text}:${l.hit}`), logo: r.logo && (r.logo.rect.w > 0 ? r.logo.hit : 'not shown by Mapbox'), attrib: r.attrib, dock: r.dock, credit: r.credit, minimap: r.minimap });
    assert(r.links.length >= 3, `${w}x${h}: expected at least 3 attribution links, found ${r.links.length}`);
    const bad = r.links.filter((l) => l.hit !== true); assertEq(bad.map((l) => `${l.text}:${l.hit}`), [], `${w}x${h}: attribution links covered by another element`);
    // Mapbox GL decides itself whether the wordmark is shown (a style source with mapbox_logo:false hides it: display:none); when it is shown it must be on top
    if (r.logo && r.logo.rect.w > 0) assert(r.logo.hit === true, `${w}x${h}: the Mapbox wordmark is covered`);
    assert(r.attrib.y + r.attrib.h <= r.dock.y + 1, `${w}x${h}: the attribution (bottom ${r.attrib.y + r.attrib.h}) is not above the dock (top ${r.dock.y})`);
    assert(!intersects(r.attrib, r.credit), `${w}x${h}: the attribution overlaps the credit line`);
    if (r.minimap) assert(!intersects(r.attrib, r.minimap), `${w}x${h}: the attribution overlaps the minimap`);
    assert(!r.overflowX, `${w}x${h}: horizontal page scroll`);
  }
  t.note('rows', rows);
  await emulateViewport(p, { width: 1440, height: 900, dpr: 1, mobile: false }); await sleep(700);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-04');
});

// ================================================================== (d) cards
/** the three card kinds by z-index (92 story, 85 event, 300 tour): { x, y, w, h } or null; works on trains without the data attribute (red-first) */
const cardBox = (p, rank) => p.evaluate((rk) => {
  const z = { 2: '92', 1: '85', 3: '300' }[rk];
  const e = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).zIndex === z && getComputedStyle(d).position === 'absolute' && [...d.querySelectorAll('button')].some((b) => /^Close/.test(b.getAttribute('aria-label') || '') || b.textContent.trim() === '✕'));
  if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}, rank);
const controlBoxes = (p) => p.evaluate(() => {
  const R = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const mini = document.querySelector('canvas[title="Click to move the map"], canvas[title="Click to navigate"]');
  return { zoom: R(document.querySelector('.mapboxgl-ctrl-top-right .mapboxgl-ctrl-group')), trails: R([...document.querySelectorAll('button')].find((b) => /Trails (ON|OFF)/.test(b.textContent))), minimap: R(mini && mini.parentElement), dock: R(document.getElementById('gt-timeline')) };
});
/** step the clock to tick n with the documented keys (Shift+arrow = 12 ticks, arrow = 1): real keyboard input, the same on every train */
async function goToTick(p, n) {
  await blurActive(p);
  for (let i = 0; i < 80; i++) {
    const cur = (await readState(p)).tick; const d = n - cur; if (d === 0) break;
    const key = d > 0 ? (d >= 12 ? 'Shift+ArrowRight' : 'ArrowRight') : (d <= -12 ? 'Shift+ArrowLeft' : 'ArrowLeft');
    await p.keyboard.press(key); await sleep(70);
  }
  await waitState(p, (s) => s.tick === n, `tick ${n}`, 4000);
}
async function showCards(p, n) {
  await goToTick(p, n);
  await waitFor(async () => !!(await cardBox(p, 2)) && !!(await cardBox(p, 1)), { timeout: 8000, label: `story card and event card at tick ${n}` });
}
suite.test('T0-DF-05', '(d) the story and event cards leave the zoom buttons, the Trails toggle, the minimap and the dock free; Esc dismisses the topmost card, panels and a selected unit go first', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await reload(S);                 // earlier tests dismissed the tick-14 vignette; a dismissed card stays dismissed for the life of the page
  // geometry at two window sizes (tick 14: "The First Shot" + the 6:10 am event)
  await calm(S); await showCards(p, 14);
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    await emulateViewport(p, { width: w, height: h, dpr: 1, mobile: false }); await sleep(800);
    const story = await cardBox(p, 2), event = await cardBox(p, 1), c = await controlBoxes(p);
    t.note(`${w}x${h}`, { story, event, controls: c });
    assert(story && event, `${w}x${h}: cards not found`);
    for (const [name, card] of [['story card', story], ['event card', event]]) {
      for (const k of ['zoom', 'trails', 'minimap', 'dock']) assert(!c[k] || !intersects(card, c[k]), `${w}x${h}: the ${name} covers the ${k} (${JSON.stringify(card)} vs ${JSON.stringify(c[k])})`);
    }
  }
  await emulateViewport(p, { width: 1440, height: 900, dpr: 1, mobile: false }); await sleep(800);
  // Esc order: story, then event, then nothing (and no error)
  await blurActive(p); await p.keyboard.press('Escape'); await sleep(350);
  assert(!(await cardBox(p, 2)), 'the first Escape did not dismiss the story card'); assert(!!(await cardBox(p, 1)), 'the first Escape also dismissed the event card');
  await p.keyboard.press('Escape'); await sleep(350);
  assert(!(await cardBox(p, 1)), 'the second Escape did not dismiss the event card');
  await p.keyboard.press('Escape'); await sleep(250);
  // a pinned unit goes first (tick 28: "Reynolds Falls" + the critical event)
  await calm(S);
  const cands = await isolatedUnits(p); const u = await pagePoint(p, cands[0].lng, cands[0].lat);
  await p.mouse.click(u.x, u.y); await sleep(500);
  const pinned = (await p.getByTitle('Unpin unit').count()) > 0; t.note('unit pinned by the click', pinned); assert(pinned, 'the click did not pin a unit');
  await showCards(p, 28);
  await blurActive(p); await p.keyboard.press('Escape'); await sleep(450);
  assert((await p.getByTitle('Unpin unit').count()) === 0, 'Escape did not close the unit panel');
  assert(!!(await cardBox(p, 2)) && !!(await cardBox(p, 1)), 'Escape that closed the unit panel also dismissed a card');
  await p.keyboard.press('Escape'); await sleep(350); assert(!(await cardBox(p, 2)), 'the next Escape did not dismiss the story card');
  await p.keyboard.press('Escape'); await sleep(350); assert(!(await cardBox(p, 1)), 'the Escape after that did not dismiss the event card');
  // a modal goes first: Help over a card (tick 36: "The Railroad Cut")
  await calm(S); await showCards(p, 36);
  await blurActive(p); await p.keyboard.press('Shift+?'); await waitFor(async () => /Keyboard Shortcuts/.test(await bodyText(p)), { timeout: 8000, label: 'Help' });
  await p.keyboard.press('Escape'); await sleep(600);
  assert(!/Keyboard Shortcuts/.test(await bodyText(p)), 'Escape did not close Help'); assert(!!(await cardBox(p, 2)), 'Escape that closed Help also dismissed the story card');
  await p.keyboard.press('Escape'); await sleep(350); assert(!(await cardBox(p, 2)), 'the next Escape did not dismiss the story card');
  await calm(S);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-05');
});

// ================================================================== (e) filter repaint, (f) resize
suite.test('T0-DF-06', '(e) a filter change on a paused map is painted at once (no tick needed), and so is its reset', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await calm(S);
  const a = await inkCount(p); assert(a > 1000, `the unit canvas is nearly empty before the test (${a})`);
  await clickTool(p.locator('button[title="Filter"]')); await waitFor(async () => (await p.locator('button:text-is("Union")').count()) > 0, { timeout: 4000, label: 'Filter panel' });
  await p.locator('button:text-is("Union")').first().click(); await sleep(700);
  const b = await inkCount(p);
  await p.locator('button:text-is("Union")').first().click(); await sleep(700);
  const c = await inkCount(p);
  t.note('ink: both sides / Union hidden / both again', [a, b, c]);
  assert(b < a * 0.85, `hiding the Union side did not repaint the paused canvas (${a} -> ${b})`);
  assert(c > b * 1.2 && Math.abs(c - a) < a * 0.1, `showing the Union side again did not repaint (${b} -> ${c}, was ${a})`);
  await p.keyboard.press('Escape'); await sleep(300);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-06');
});

suite.test('T0-DF-07', '(f) a window resize repaints the units at once and resizes the z-index 8 and 9 overlay canvases to the map', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  await calm(S);
  const a = await inkCount(p); assert(a > 1000, `the unit canvas is nearly empty before the test (${a})`);
  const sizes = () => p.evaluate(() => { const g = document.querySelector('.mapboxgl-map'); const by = (z) => { const c = [...document.querySelectorAll('canvas')].find((cv) => getComputedStyle(cv).zIndex === z && (z !== '10' || cv.width > 400)); return c ? [c.width, c.height] : null; }; return { 8: by('8'), 9: by('9'), 10: by('10'), map: g ? [g.clientWidth, g.clientHeight] : null }; });
  const rows = [];
  for (const [w, h] of [[1280, 720], [1920, 1080], [1440, 900]]) {
    await emulateViewport(p, { width: w, height: h, dpr: 1, mobile: false }); await sleep(900);
    const ink = await inkCount(p), sz = await sizes(); rows.push({ vp: `${w}x${h}`, ink, sizes: sz });
    assert(ink > 300, `${w}x${h}: the unit canvas is blank after the resize (${ink} px)`);
    assertEq(sz['10'], sz.map, `${w}x${h}: unit canvas size vs map`); assertEq(sz['9'], sz.map, `${w}x${h}: z-index 9 canvas size vs map`); assertEq(sz['8'], sz.map, `${w}x${h}: z-index 8 canvas size vs map`);
  }
  t.note('rows', rows);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-07');
});

// ================================================================== (g) NPS tour
suite.test('T0-DF-08', '(g) NPS Auto Tour: dots inside the panel and clear of the text, day tabs and attribution free, X and Esc give the speed back', async (t) => {
  needA2(); const S = await shared(); const p = S.page; const e0 = S.collector.firstParty.length;
  for (const via of ['X', 'Escape']) {
    await calm(S);
    await p.locator('button:text-is("4x")').dispatchEvent('click'); await sleep(200);
    assertEq((await readState(p)).speed, '4x', 'could not set 4x');
    await clickTool(p.locator('button:has-text("NPS Auto Tour")'));
    await waitFor(async () => /Stop 1 of \d+/i.test(await bodyText(p)), { timeout: 6000, label: 'tour panel' }); await sleep(800);
    const g = await p.evaluate(() => {
      const R = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
      const stop = [...document.querySelectorAll('div')].find((d) => /^Stop \d+ of \d+$/i.test(d.textContent.trim()));
      const panel = (() => { let e = stop; while (e && !(getComputedStyle(e).zIndex === '300' && getComputedStyle(e).position === 'absolute')) e = e.parentElement; return e; })();
      const dotEls = [...document.querySelectorAll('div')].filter((d) => d.children.length === 0 && d.textContent === '' && d.style.cursor === 'pointer' && d.style.borderRadius === '50%' && !d.hasAttribute('title'));
      const dots = dotEls.filter((d) => panel && panel.contains(d)).map(R), outside = dotEls.filter((d) => !(panel && panel.contains(d))).length;
      const paras = panel ? [...new Set([...panel.querySelectorAll('p')].map((q) => q.parentElement))].map(R) : [];
      const tabs = ['July 1', 'July 2', 'July 3'].map((x) => { const b = [...document.querySelectorAll('button')].filter((q) => q.textContent.trim() === x).pop(); if (!b) return { x, hit: 'missing' }; const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x, hit: top === b || b.contains(top) }; });
      const attrib = document.querySelector('.mapboxgl-ctrl-attrib'), logo = document.querySelector('.mapboxgl-ctrl-logo');
      const cover = (e) => { if (!e) return 'missing'; const r = e.getBoundingClientRect(); if (!r.width) return true; const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return top === e || e.contains(top); };
      return { panel: panel && R(panel), dots, outside, paras, tabs, attribHit: cover(attrib && attrib.querySelector('a')), logoHit: cover(logo), dock: R(document.getElementById('gt-timeline')) };
    });
    t.note(`tour via ${via}`, { panel: g.panel, dotCount: g.dots.length, dotsOutsidePanel: g.outside, tabs: g.tabs.map((x) => `${x.x}:${x.hit}`), attribHit: g.attribHit, logoHit: g.logoHit });
    assert(g.panel, 'tour panel not found');
    assertEq(g.outside, 0, 'progress dots are drawn outside the tour panel (over the map text)');
    assert(g.dots.length >= 16, `expected 16 progress dots inside the panel, found ${g.dots.length}`);
    for (const d of g.dots) for (const q of g.paras) assert(!intersects(d, q), `a progress dot (${JSON.stringify(d)}) is drawn over the story text (${JSON.stringify(q)})`);
    assert(g.panel.y + g.panel.h <= g.dock.y + 1, `the tour panel (bottom ${g.panel.y + g.panel.h}) reaches into the dock (top ${g.dock.y})`);
    assertEq(g.tabs.map((x) => x.hit), [true, true, true], 'day tabs covered by the tour panel');
    assertEq([g.attribHit, g.logoHit], [true, true], 'attribution / wordmark covered by the tour panel');
    assertEq((await readState(p)).speed, '2x', 'the tour does not run at 2x');
    if (via === 'X') await p.evaluate(() => { const n = [...document.querySelectorAll('div')].find((d) => /^Stop \d+ of \d+$/i.test(d.textContent.trim())); n.parentElement.querySelector('button').click(); });
    else { await blurActive(p); await p.keyboard.press('Escape'); }
    await waitFor(async () => !/Stop 1 of \d+/i.test(await bodyText(p)), { timeout: 3000, label: `tour closed by ${via}` });
    await sleep(300);
    assertEq((await readState(p)).speed, '4x', `closing the tour with ${via} did not give the speed back`);
    await p.locator('button:text-is("1x")').dispatchEvent('click');
  }
  await calm(S);
  assertEq(S.collector.firstParty.slice(e0), [], 'errors during DF-08');
});

// ================================================================== static
suite.test('T0-DF-09', 'static: the A2 helpers are in the built entry exactly once, and the key guard still leaves the arrows to Mapbox only while its canvas holds focus', async (t) => {
  needA2();
  const src = fs.readFileSync(path.join(DIST, 'assets', VERSION.entry), 'utf8');
  const count = (s) => src.split(s).length - 1;
  assertEq([count('function GtbgMapSetup('), count('function GtbgEsc('), count('function GtbgRepaint(')], [1, 1, 1], 'A2 helper definitions');
  assertEq(count('GtbgMapSetup(Xe,x)'), 1, 'one call of GtbgMapSetup (the desktop map)');
  assert(count('t.classList.contains("mapboxgl-canvas")&&/^(Arrow|\\+|=|-|_)/.test(Ur.key))return') === 1, 'the group-A key guard changed: arrows / + / - are left to Mapbox only when the canvas has focus');
  assert(count('attributionControl:!1') >= 1, 'sanity: the phone map still builds its own attribution');
  t.note('entry', VERSION.entry);
});

suite.test('T0-DF-X', 'every desktop-fix test of this run: 0 uncaught exceptions and 0 first-party console.error in the shared session', async (t) => {
  const S = F.S; if (!S) throw new Skip('no shared session in this run');
  t.note('tile requests in the shared session', S.tileStats.seen); t.note('ignored tile noise', S.collector.ignored);
  assertEq(S.collector.firstParty, [], 'first-party errors in the shared desktop session');
});

// ------------------------------------------------------------------ run
const outFile = path.join(resultsDir, IS_LEGACY ? 'test-desktop-fixes-legacy.json' : 'test-desktop-fixes.json');
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST), groups: GROUPS, mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
const ran = summary.results.filter((r) => r.status !== 'skip');
const allRed = ran.length > 0 && ran.every((r) => r.status === 'fail');
if (EXPECT_RED) { console.log(allRed ? 'expected-red: every selected test failed on this tree (red-first proven)' : `expected-red VIOLATED: passed on this tree: ${ran.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`); process.exit(allRed ? 0 : 1); }
process.exit(summary.failed ? 1 : 0);
