// Monuments (optional patch group MON, tools/t0/MON-README.md): the 512 battlefield monuments as dots and the 20 story markers as stars, drawn INSIDE the Mapbox map as
// event-driven GeoJSON layers.  Real system Chrome (headless), real CDP mouse / wheel / keyboard / touch input, Mapbox tiles only through the Referer-injecting harness
// (tests/t0/lib.mjs, <= 300 requests per run), a Netlify-like static server on 127.0.0.1.
//
//   node tests/t0/monuments.spec.mjs --dist tmp/monuments-restore/mon-R1c/dist          a scratch build:  python tools/t0/mon/mon_build.py --train R1c --out tmp/monuments-restore/mon-R1c
//   node tests/t0/monuments.spec.mjs --dist <tree> --filter 'MONL-0[1-3]'                 subset by id regex (each invocation has its own tile budget)
//   node tests/t0/monuments.spec.mjs --dist baseline/dist --expect-red                   red-first proof: every feature test must FAIL on a tree that lacks the group
//   node tests/t0/monuments.spec.mjs --dist <tree> --control <dist of the same train without MON>      (MONL-12 builds one into tmp/ when none is given)
//
// Mapbox budget: a whole run needs more than the 300 requests each invocation may use, so run it in slices (requests measured on R1c; boot of a desktop session = 52):
//   --filter 'MONL-0[123]' 146   --filter 'MONL-04' 237   --filter 'MONL-05' 162   --filter 'MONL-06' 87   --filter 'MONL-0[78]' 80   --filter 'MONL-09' 117
//   --filter 'MONL-1[01]' 106    --filter 'MONL-12|MONL-13|MONL-X' 137            --filter 'MONL-14' 72
//
// Ids (F = feature test, red on a tree without the group; G = guard of what must not break: exempt from the red-first accounting, needs the group for its "layer on" half):
//   T0-MONL-01 F  toggle: off at load with nothing in the map (no source, layer, style tag, listener, store subscription: zero cost while off); the toolbar button's aria-pressed follows the
//                layer; on shows the 4 layers + the list control; off hides them, removes every listener, subscription and popup; on again works
//   T0-MONL-02 F  data: 512 dots (457 Union, 40 Confederate, 15 Other) at the coordinates of the bundle's own monument array, 20 stars at its story markers (read with acorn from the shipped entry)
//   T0-MONL-03 F  tracking: a monument keeps its geographic position through a real mouse drag, a wheel zoom, rotation and tilt, a window resize, a day change and a style reload - checked three ways
//                (map.project before/after, queryRenderedFeatures at the projected point, and the PIXEL of the drawn dot in a real screenshot)
//   T0-MONL-04 F  click / Esc: a click on a dot opens the card of THAT monument (name, side, group, honors, location, Google Maps link with its coordinates), a second click replaces it, the unit
//                picker does not also react, a click on bare map closes it, Esc closes it, the app's keys (arrows) still step time with the card open; the hit radius is 12 px for a mouse
//   T0-MONL-05 F  story marker: its card quotes the narrative, "Jump to this moment" sets the tick whose app clock reads the time the narrative names, pauses, flies there and closes the card
//   T0-MONL-06 F  glow: a story marker glows gold exactly while its linked unit is on the field (expected set computed from the shipped placement data at ticks 1, 268 and 551)
//   T0-MONL-07 F  phone 375x812, real CDP touch: Tools tile (aria-pressed), tap on a marker opens the card as a sheet above the dock, 44 px targets (22 px tap radius, card buttons), Jump works
//   T0-MONL-08 F  reload with the layer on: the page boots clean, the layer is off again (not persisted, like every other tool toggle), no stale DOM, and it toggles on again
//   T0-MONL-09 F  keyboard: Tab reaches the list control, Enter opens it, typing filters, Arrow keys move, Enter opens the card of the chosen monument with focus inside, Esc closes the card and
//                the list; axe-core finds no serious/critical violation in the card or the list
//   T0-MONL-10 F  hover: a real mouse move over a marker rings it, sets the pointer cursor and shows a tooltip; leaving clears all three
//   T0-MONL-11 F  leaks: 6 on/off cycles leave the map container with exactly the listeners it had, no popup, no control, no store subscription; idle script time with the layer on is not above off
//   T0-MONL-14 F  layout switch: layer on in the phone layout, "Desktop View" from the Tools sheet: the phone map instance is dropped, the desktop layout starts with the layer off and its own toggle works
//   T0-MONL-15 F  static (the shipped runtime in a vm): the jump tick of a story is the tick whose legacy clock reads the time its narrative names (9 of 20), else the marker's own tick, and the marker's own tick
//                whenever the store's clock is not the legacy formula (a corrected D-TIME clock, no getTickTime, a clock that throws)
//   T0-MONL-16 F  toolbar (group AX trains): no two buttons overlap at any window width from 640 to 1440 px, the Monuments and Virtual Walkthrough buttons are hit by their own centre
//   T0-MONL-12 G  the Walkthrough is untouched: the Walkthrough code and data of the entry are byte-identical to the same train without MON, and with the layer on it still opens, shows its own
//                512 dots on its own map (no gtmon layer in it), lists 100 of 512, searches; "Open in Walkthrough list" opens its Monuments tab with the name typed in; Back returns
//   T0-MONL-13 G  static: the group's 18 anchors (9 story-data, 8 bundle, 1 stylesheet) matched exactly once, the entry carries the runtime once, no screen-fixed star overlay script, KF no longer runs its per-frame loop
//   T0-MONL-X  G  every browser test of this run: 0 uncaught exceptions and 0 first-party console.error
process.env.T0_AGENT ??= 'monuments-restore';
process.env.T0_PORT_BASE ??= '8900';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import * as acorn from 'acorn';
const {
  REPO, PORT_BASE, openSession, createStaticServer, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, mapView,
  mouseDrag, wheel, emulateViewport, touchTap, tileBudget, Skip,
} = await import('./lib.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'release/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
let CONTROL = opt('control', null);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/mon/mon_build.py --train R1c --out tmp/monuments-restore/mon-R1c`); process.exit(2); }
const IS_LEGACY = DIST === path.resolve(REPO, 'legacy/dist');
const IS_BASELINE = DIST === path.resolve(REPO, 'baseline/dist');
const VERSION = fs.existsSync(path.join(DIST, 'version.json')) ? JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')) : { groups: [], train: IS_LEGACY ? 'legacy' : IS_BASELINE ? 'baseline' : 'unknown', entry: 'index-Cg8FAMXN.js' };
const GROUPS = VERSION.groups || [];
const ENTRY = path.join(DIST, 'assets', VERSION.entry || 'index-Cg8FAMXN.js');
const ENTRY_TEXT = fs.readFileSync(ENTRY, 'utf8');
const HAS_MON = ENTRY_TEXT.includes('gtmon-dots');
const HAS_AX = GROUPS.includes('AX');
const HAS_C = GROUPS.includes('C');
const HAS_DL = GROUPS.includes('DL');
const HAS_B = GROUPS.includes('B');
const needMon = () => { if (!HAS_MON && !EXPECT_RED) throw new Skip(`the Monuments group (MON) is not in this tree (${GROUPS.join(', ') || 'no groups'})`); };
const resultsDir = (IS_LEGACY || IS_BASELINE) ? path.join(REPO, 'tmp', process.env.T0_AGENT) : path.dirname(DIST);

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

// ------------------------------------------------------------------ ground truth read from the shipped entry (not from a copy of the data)
let TRUTH = null;
function truth() {
  if (TRUTH) return TRUTH;
  const ast = acorn.parse(ENTRY_TEXT, { ecmaVersion: 'latest', sourceType: 'module' });
  const want = { _A: null, mA: null };
  for (const n of ast.body) if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier' && d.id.name in want && d.init) want[d.id.name] = vm.runInNewContext('(' + ENTRY_TEXT.slice(d.init.start, d.init.end) + ')');
  assert(want._A && want._A.length === 512, `the monument array _A of the entry has ${want._A && want._A.length} entries, expected 512`);
  assert(want.mA && want.mA.length === 20, `the story marker array mA of the entry has ${want.mA && want.mA.length} entries, expected 20`);
  const sideOf = (m) => (m.side === 'Union' || m.side === 'Confederate' ? m.side : 'Other');
  // first tick of every unit in the placement data the app loads (placements_day*.json and the density_*.json formation files; a story marker glows once its unit is on the field:
  // the unit layer carries the latest placement forward)
  const minTick = {};
  for (const f of fs.readdirSync(path.join(DIST, 'data')).filter((x) => /^(placements_day\d_|density_).*\.json$/.test(x))) {
    const j = JSON.parse(fs.readFileSync(path.join(DIST, 'data', f), 'utf8'));
    for (const r of (Array.isArray(j) ? j : j.placements || [])) if (r.unit_id && Number.isFinite(r.tick) && (!(r.unit_id in minTick) || r.tick < minTick[r.unit_id])) minTick[r.unit_id] = r.tick;
  }
  // the brigade of every regiment of the order of battle (a regiment with no keyframe yet counts as on the field once its own brigade is)
  const parent = {};
  for (const f of fs.readdirSync(path.join(DIST, 'data', 'oob'))) {
    const j = JSON.parse(fs.readFileSync(path.join(DIST, 'data', 'oob', f), 'utf8'));
    for (const arr of Object.values(j)) if (Array.isArray(arr)) for (const r of arr) if (r && r.regiment_id && r.parent_brigade_id) parent[r.regiment_id] = r.parent_brigade_id;
  }
  const onField = (u, t) => { let m = minTick[u]; if (!(m <= t) && parent[u]) m = minTick[parent[u]]; return m <= t; };
  // the clock of the store (legacy formula: day 1 from 06:00, days 2 and 3 from 04:00, 5 minutes a tick) read the other way round: the tick whose clock shows the time a story text names, or the marker's own tick
  const jumpTick = (s) => {
    const m = /\b(\d{1,2}):(\d{2})\s?([AP])\.?M\b/i.exec(s.label); if (!m) return s.tick;
    const dm = /\bJuly (\d)\b/.exec(s.label), d = dm ? +dm[1] : s.day, base = d === 1 ? 360 : 240, off = d === 1 ? 0 : d === 2 ? 225 : 450;
    return off + 1 + Math.round(((+m[1] % 12) * 60 + +m[2] + (/p/i.test(m[3]) ? 720 : 0) - base) / 5);
  };
  return (TRUTH = { A: want._A, mA: want.mA, sideOf, minTick, parent, jumpTick, activeAt: (t) => want.mA.map((s, i) => (onField(s.unit_id, t) ? i : -1)).filter((i) => i >= 0) });
}
const idxOfName = (name) => truth().A.findIndex((m) => m.name === name);

// ------------------------------------------------------------------ PNG: just enough to read a pixel of a real screenshot (8-bit RGB / RGBA, not interlaced)
function decodePng(buf) {
  let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error('unsupported PNG (need 8-bit, not interlaced)'); }
    else if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error(`unsupported PNG colour type ${ct}`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), prev = y ? out.subarray((y - 1) * stride, y * stride) : null, cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev ? prev[x] : 0, c = prev && x >= bpp ? prev[x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
  }
  return { w, h, px: (x, y) => [out[y * stride + x * bpp], out[y * stride + x * bpp + 1], out[y * stride + x * bpp + 2]] };
}
const COL = { Union: [0x3a, 0x6b, 0xc4], Confederate: [0xc4, 0x3a, 0x3a], Other: [0x9a, 0xa0, 0xaa] };
const near = (a, b, tol = 34) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
/** is the drawn dot of a side at a page point?  Looks at a 3x3 block around the centre in a real screenshot (device scale 1) */
async function dotPixelAt(p, x, y, side) {
  const cx = Math.round(x), cy = Math.round(y), vp = await p.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  if (cx < 8 || cy < 8 || cx > vp.width - 8 || cy > vp.height - 8) return { ok: false, why: 'outside the viewport', rgb: null };
  const png = decodePng(await p.screenshot({ clip: { x: cx - 8, y: cy - 8, width: 16, height: 16 } }));
  const seen = []; let ok = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rgb = png.px(8 + dx, 8 + dy); seen.push(rgb.join(',')); if (near(rgb, COL[side])) ok = true; }
  return { ok, rgb: seen[4] };
}

// ------------------------------------------------------------------ page helpers
const bodyText = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const readTick = async (p) => { const m = /Tick (\d+)\/675/.exec(await bodyText(p)); return m ? +m[1] : null; };
const monInfo = (p) => p.evaluate(() => { if (!window.__gtmon) throw new Error('window.__gtmon is missing: the Monuments runtime (group MON) is not in this tree'); return window.__gtmon.info(); });
/** third-party noise of the Walkthrough's Google Street View embed (Permissions-Policy accelerometer message, Google scripts): not first-party errors */
const isGoogleNoise = (e) => /Permissions policy violation|google|gstatic|streetview/i.test(`${e.text} ${e.url || ''}`);
const monBtn = (p) => p.locator('button[title="Monuments"]').first();
const pressed = (p) => monBtn(p).getAttribute('aria-pressed');
const HOME = { center: [-77.235, 39.812], zoom: 13.5, bearing: 0, pitch: 0 };
const mapReady = (p) => waitFor(async () => (await mapView(p)), { timeout: 30000, label: 'map instance (style loaded)' });
const setCamera = (p, cam) => p.evaluate((c) => { window.__t0map.jumpTo(c); }, cam);
/** put a lng/lat at a page position: jumpTo the point, then pan the map so that the point projects to (x, y) */
const placeAt = async (p, lng, lat, x, y, zoom = 16.5) => {
  await setCamera(p, { center: [lng, lat], zoom, bearing: 0, pitch: 0 });
  await p.evaluate(([cx, cy]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const q = m.project(m.getCenter().toArray()); m.panBy([-(cx - c.left - q.x), -(cy - c.top - q.y)], { duration: 0 }); }, [x, y]);
  await sleep(500);
  const at = await pagePoint(p, lng, lat); assert(Math.abs(at.x - x) < 4 && Math.abs(at.y - y) < 4, `could not place the point at ${x},${y}: ${JSON.stringify(at)}`); return at;
};
/** the free map spot nearest to (x, y): where the Mapbox canvas itself (not a panel, pill, card or control) is under the point and 14 px around it */
const freeSpot = (p, x, y) => p.evaluate(([tx, ty]) => {
  const ok = (a, b) => [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14]].every(([dx, dy]) => { const e = document.elementFromPoint(a + dx, b + dy); return e && e.classList.contains('mapboxgl-canvas'); });
  for (let r = 0; r <= 240; r += 20) for (let k = 0; k < (r ? 12 : 1); k++) { const a = Math.round(tx + r * Math.cos((k * Math.PI) / 6)), b = Math.round(ty + r * Math.sin((k * Math.PI) / 6)); if (a > 30 && b > 60 && a < innerWidth - 30 && b < innerHeight - 40 && ok(a, b)) return { x: a, y: b }; }
  return null;
}, [x, y]);
const clickTool = async (loc) => { try { await loc.click({ timeout: 2500 }); } catch { await loc.dispatchEvent('click'); } };
const blurActive = (p) => p.evaluate(() => { const a = document.activeElement; a && a !== document.body && a.blur && a.blur(); });
/** page coordinates of a lng/lat in the main map */
const pagePoint = (p, lng, lat) => p.evaluate(([lo, la]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); const q = m.project([lo, la]); return { x: q.x + c.left, y: q.y + c.top }; }, [lng, lat]);
const gtLayers = (p) => p.evaluate(() => { const m = window.__t0map; const st = m.getStyle(); return { layers: st.layers.filter((l) => l.id.startsWith('gtmon')).map((l) => [l.id, (l.layout && l.layout.visibility) || 'visible']), sources: Object.keys(st.sources).filter((k) => k.startsWith('gtmon')) }; });
const allVisible = (g) => g.layers.length === 4 && g.layers.every(([, v]) => v === 'visible');
const allHidden = (g) => g.layers.length === 4 && g.layers.every(([, v]) => v === 'none');
const cardNow = (p) => p.evaluate(() => { const c = document.querySelector('[data-gtmon-card]'); if (!c) return null; const r = c.getBoundingClientRect(); return { id: c.getAttribute('data-gtmon-card'), name: (c.querySelector('.gtmon-name') || {}).textContent, text: c.innerText, side: c.getAttribute('data-gtmon-side'), role: c.getAttribute('role'), label: c.getAttribute('aria-labelledby'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, count: document.querySelectorAll('[data-gtmon-card]').length, links: [...c.querySelectorAll('a')].map((a) => a.href), linkBoxes: [...c.querySelectorAll('a')].map((a) => { const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }), buttons: [...c.querySelectorAll('button')].map((b) => ({ t: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), label: b.getAttribute('aria-label') })), focusInside: c.contains(document.activeElement), active: c.getAttribute('data-gtmon-active') }; });
const waitCard = (p, id, timeout = 4000) => waitFor(async () => { const c = await cardNow(p); return c && (!id || c.id === id) ? c : null; }, { timeout, interval: 80, label: `monument card ${id || ''}` });
const waitNoCard = (p, timeout = 3000) => waitFor(async () => ((await cardNow(p)) ? null : true), { timeout, interval: 80, label: 'card closed' });
const errsSince = (S, n) => S.collector.firstParty.slice(n);

const F = {};
async function boot(S, layout) {
  const p = S.page;
  await p.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await waitForApp(p, 45000);
  await chooseLayout(p, layout);
  await mapReady(p);
  await waitFor(async () => (await readTick(p)) != null || layout === 'mobile', { timeout: 30000, label: 'clock text (data loaded)' }).catch(() => {});
  await sleep(1200);
}
/** the listener bookkeeping used by MONL-11: counts the live listeners registered on Mapbox map containers, by type and phase */
const COUNT_INIT = () => {
  const reg = new Map(); window.__lc = reg;
  const add = EventTarget.prototype.addEventListener, rm = EventTarget.prototype.removeEventListener;
  const isMap = (t) => t && t.classList && t.classList.contains && t.classList.contains('mapboxgl-map');
  const key = (type, opt) => `${type}|${(typeof opt === 'boolean' ? opt : opt && opt.capture) ? 'capture' : 'bubble'}`;
  EventTarget.prototype.addEventListener = function (type, fn, opt) { if (isMap(this)) { const k = key(type, opt); const s = reg.get(k) || new Set(); s.add(fn); reg.set(k, s); } return add.call(this, type, fn, opt); };
  EventTarget.prototype.removeEventListener = function (type, fn, opt) { if (isMap(this)) { const s = reg.get(key(type, opt)); if (s) s.delete(fn); } return rm.call(this, type, fn, opt); };
  window.__lcSnapshot = () => Object.fromEntries([...reg].map(([k, s]) => [k, s.size]).filter(([, n]) => n > 0).sort());
};
async function desktop() {
  if (F.D) { await calmDesktop(F.D); return F.D; }
  const S = await open({ profile: 'desktop', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, initScripts: [COUNT_INIT] });
  F.D = S; await boot(S, 'desktop');
  return S;
}
/** a quiet UI: nothing open, layer OFF, units visible, tick 1, 1x, paused, home camera */
async function calmDesktop(S) {
  const p = S.page;
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await sleep(80); }
  await blurActive(p);
  if (HAS_MON && (await monInfo(p)).on) { await clickTool(monBtn(p)); await sleep(300); }
  await p.locator('button:text-is("July 1")').last().dispatchEvent('click').catch(() => {});
  await sleep(300); await blurActive(p); await setCamera(p, HOME); await sleep(300);
}
async function monOn(p) {
  if (!(await monInfo(p)).on) await clickTool(monBtn(p));
  const g = await waitFor(async () => { const x = await gtLayers(p); return allVisible(x) ? x : null; }, { timeout: 6000, interval: 100, label: 'the four gtmon layers visible' });
  await sleep(250); return g;
}
async function monOff(p) {
  if ((await monInfo(p)).on) await clickTool(monBtn(p));
  await waitFor(async () => { const x = await gtLayers(p); return allHidden(x) ? x : null; }, { timeout: 4000, interval: 100, label: 'the four gtmon layers hidden' });
}
/** the tick of the clock on the desktop, set with the documented keys (Shift+ArrowRight = +12 ticks) */
async function tickBy12(p, n) { for (let i = 0; i < n; i++) { await p.keyboard.press('Shift+ArrowRight'); await sleep(60); } await sleep(300); }
/** Toggle Units: hides the unit canvas so that nothing but the map and the monument layers is under a pixel test */
async function unitsHidden(p, hidden) {
  const shown = await p.evaluate(() => { const cs = [...document.querySelectorAll('canvas')].filter((c) => getComputedStyle(c).zIndex === '10'); return cs.length ? getComputedStyle(cs[0]).display !== 'none' : null; });
  if (shown === null) return; if (shown === hidden) { await clickTool(p.locator('button:text-is("Toggle Units")').first()); await sleep(300); }
}

const suite = createSuite('monuments');
{ const add = suite.test.bind(suite);
  suite.test = (id, title, fn) => add(id, title, async (t) => { const u0 = tileBudget.used; try { return await fn(t); } finally { if (tileBudget.used > u0) t.note('mapbox requests', tileBudget.used - u0); } }); }

// ================================================================== 01 toggle, state, zero cost while off
suite.test('T0-MONL-01', 'toggle: off at load with nothing in the map (zero cost while off); aria-pressed follows the layer; on = 4 layers + list control; off = hidden, no listener, no subscription; on again', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const pre = await p.evaluate(() => { const m = window.__t0map; const st = m.getStyle(); return { info: window.__gtmon ? window.__gtmon.info() : null, css: !!document.getElementById('gtmon-css'), dom: document.querySelectorAll('.gtmon-ctl,.gtmon-pop,[data-gtmon-card]').length, layers: st.layers.filter((l) => l.id.startsWith('gtmon')).length, sources: Object.keys(st.sources).filter((k) => k.startsWith('gtmon')).length, lc: window.__lcSnapshot() }; });
  assert(pre.info, 'window.__gtmon is missing: the runtime is not in this tree');
  t.note('before the first toggle', { info: pre.info, css: pre.css, dom: pre.dom, layers: pre.layers, sources: pre.sources, mapListeners: pre.lc });
  assertEq([pre.layers, pre.sources, pre.css, pre.dom], [0, 0, false, 0], 'nothing of the feature may exist in the page before the first toggle');
  assertEq([pre.info.on, pre.info.listeners, pre.info.store, pre.info.enabled], [false, 0, false, 0], 'runtime state at load');
  const attr0 = await pressed(p);
  if (HAS_AX) assertEq(attr0, 'false', 'aria-pressed of the toolbar button at load (group AX)');
  await clickTool(monBtn(p));
  const g1 = await waitFor(async () => { const x = await gtLayers(p); return allVisible(x) ? x : null; }, { timeout: 6000, label: 'layers visible after the first click' });
  const on = await monInfo(p);
  assertEq(g1.sources.sort(), ['gtmon-dots', 'gtmon-stories'], 'sources');
  assertEq(g1.layers.map((l) => l[0]), ['gtmon-dots', 'gtmon-glow', 'gtmon-ring', 'gtmon-stars'], 'layer order (dots under glow under ring under stars)');
  assert(on.on && on.enabled === 1 && on.listeners >= 4 && on.store, `runtime state when on: ${JSON.stringify(on)}`);
  assertEq(on.errors, [], 'runtime errors while adding the layers');
  assertEq(await p.evaluate(() => document.querySelectorAll('.gtmon-ctl button[aria-label="Browse monuments"]').length), 1, 'the list control is in the map when on');
  if (HAS_AX) assertEq(await pressed(p), 'true', 'aria-pressed after the first click');
  await sleep(300);
  await clickTool(monBtn(p));
  await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 4000, label: 'layers hidden after the second click' });
  const off = await monInfo(p);
  assertEq([off.on, off.listeners, off.store, off.enabled], [false, 0, false, 0], 'runtime state after off (no listener, no store subscription)');
  assertEq(await p.evaluate(() => document.querySelectorAll('.gtmon-ctl,.gtmon-pop,[data-gtmon-card]').length), 0, 'control / popup left behind after off');
  if (HAS_AX) assertEq(await pressed(p), 'false', 'aria-pressed after off');
  await clickTool(monBtn(p)); await waitFor(async () => allVisible(await gtLayers(p)), { timeout: 4000, label: 'layers visible again' });
  assertEq((await monInfo(p)).errors, [], 'errors after the third click');
  await clickTool(monBtn(p)); await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 4000, label: 'hidden again' });
  assertEq(errsSince(S, e0), [], 'errors during MONL-01');
});

// ================================================================== 02 data
suite.test('T0-MONL-02', 'data: 512 dots (457 Union / 40 Confederate / 15 Other) at the coordinates of the bundle\'s own monument array, 20 stars at its story markers', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); await monOn(p);
  const d = await p.evaluate(() => { const st = window.__t0map.getStyle(); const f = (id) => st.sources[id] && st.sources[id].data && st.sources[id].data.features.map((x) => ({ id: x.id, c: x.geometry.coordinates, side: x.properties.side, i: x.properties.i })); return { dots: f('gtmon-dots'), stars: f('gtmon-stories') }; });
  const withCoords = T.A.map((m, i) => ({ m, i })).filter(({ m }) => m.lat && m.lon);
  assertEq(d.dots.length, withCoords.length, 'dot features in the source');
  assertEq(d.dots.length, 512, 'the documented count: every one of the 512 monuments has coordinates');
  const bySide = {}; for (const f of d.dots) bySide[f.side] = (bySide[f.side] || 0) + 1;
  assertEq({ Union: bySide.Union, Confederate: bySide.Confederate, Other: bySide.Other }, { Union: 457, Confederate: 40, Other: 15 }, 'dots per side (the app legend: Union blue, Confederate red, the rest grey)');
  for (const f of d.dots) { const m = T.A[f.id]; assert(m, `dot ${f.id} has no monument`); assertEq([f.c, f.side], [[m.lon, m.lat], T.sideOf(m)], `dot ${f.id} (${m.name})`); }
  assertEq(d.stars.length, 20, 'star features in the source');
  for (const f of d.stars) { const s = T.mA[f.id]; assertEq([f.c, f.side], [[s.lng, s.lat], s.unit_id.startsWith('C-') ? 'Confederate' : 'Union'], `star ${f.id} (${s.name})`); }
  const paint = await p.evaluate(() => { const m = window.__t0map; return { dotColor: m.getPaintProperty('gtmon-dots', 'circle-color'), glow: m.getPaintProperty('gtmon-glow', 'circle-color'), glowOpacity: JSON.stringify(m.getPaintProperty('gtmon-glow', 'circle-opacity')), size: JSON.stringify(m.getPaintProperty('gtmon-dots', 'circle-radius')) }; });
  assertEq(paint.dotColor, ['match', ['get', 'side'], 'Union', '#3a6bc4', 'Confederate', '#c43a3a', '#9aa0aa'], 'dot colours = the app legend (unit colours sA/aA) and grey');
  assertEq(paint.glow, '#c8a84a', 'glow colour (gold)');
  assert(/zoom/.test(paint.size), 'dot radius is zoom dependent');
  const rendered = await waitFor(async () => { const r = await p.evaluate(() => { const m = window.__t0map; return { dots: m.queryRenderedFeatures({ layers: ['gtmon-dots'] }).length, stars: m.queryRenderedFeatures({ layers: ['gtmon-stars'] }).length }; }); return r.stars >= 5 ? r : null; }, { timeout: 8000, interval: 250, label: 'stars rendered' }).catch(() => ({ dots: -1, stars: -1 }));
  t.note('rendered at the home view', rendered);
  assert(rendered.dots > 100 && rendered.stars >= 5, `too few features rendered at the home view: ${JSON.stringify(rendered)}`);
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-02');
});

// ================================================================== 03 tracking
suite.test('T0-MONL-03', 'tracking: a monument keeps its position through a real drag, a wheel zoom, rotation and tilt, a resize, a day change and a style reload (project, queryRenderedFeatures and the pixel of the drawn dot agree)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); const rows = [];
  // the closest pair of one Union and one Confederate dot that are each at least 44 m (34 px at zoom 15.5) from every other marker: one camera shows both, so the whole test
  // stays inside one neighbourhood of tiles (the Mapbox budget is 300 requests per run)
  const M2 = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lon - b.lon) * 85000);
  const all = T.A.map((m, i) => ({ ...m, i })).concat(T.mA.map((s) => ({ lat: s.lat, lon: s.lng, i: -1, side: 'star' })));
  const lonely = T.A.map((m, i) => ({ ...m, i })).filter((m) => all.every((o) => o.i === m.i && o.side !== 'star' || M2(o, m) > 44));
  let best = null; for (const u of lonely.filter((m) => m.side === 'Union')) for (const c of lonely.filter((m) => m.side === 'Confederate')) { const dm = M2(u, c); if (Math.abs(u.lon - c.lon) * 85000 < 520 && Math.abs(u.lat - c.lat) * 111000 < 300 && (!best || dm < best.dm)) best = { u, c, dm }; }
  assert(best, 'no isolated Union/Confederate pair found'); await monOn(p); await unitsHidden(p, true);
  await tickBy12(p, 5);                                                       // tick 61: no day/night tint over the map (alpha 0 between 08:00 and 16:00), nothing to colour the pixel check
  const tg = { Union: { i: best.u.i, lng: best.u.lon, lat: best.u.lat }, Confederate: { i: best.c.i, lng: best.c.lon, lat: best.c.lat } };
  const centre = [(tg.Union.lng + tg.Confederate.lng) / 2, (tg.Union.lat + tg.Confederate.lat) / 2];
  t.note('targets', { Union: T.A[tg.Union.i].name, Confederate: T.A[tg.Confederate.i].name, metres: Math.round(best.dm) });
  const at = async (extra = {}) => { await setCamera(p, { center: centre, zoom: 15.5, bearing: 0, pitch: 0, ...extra }); await sleep(900); };
  const check = async (label, side) => {
    const g = tg[side]; const q = await pagePoint(p, g.lng, g.lat);
    const hit = await p.evaluate(([i, x, y]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); return m.queryRenderedFeatures([[x - c.left - 6, y - c.top - 6], [x - c.left + 6, y - c.top + 6]], { layers: ['gtmon-dots'] }).map((f) => f.properties.i).includes(i); }, [g.i, q.x, q.y]);
    const px = await dotPixelAt(p, q.x, q.y, side);
    rows.push(`${label} ${side}: project=(${q.x.toFixed(1)},${q.y.toFixed(1)}) rendered=${hit} pixel=${px.ok ? 'dot' : 'NO DOT'} ${px.rgb || px.why}`);
    assert(hit, `${label}: queryRenderedFeatures finds no ${T.A[g.i].name} dot at its projected point`);
    assert(px.ok, `${label}: no ${side} dot pixel at the projected point of ${T.A[g.i].name} (centre pixel ${px.rgb || px.why})`);
    return q;
  };
  const both = async (label) => { await check(label, 'Union'); await check(label, 'Confederate'); };
  await at(); await both('home view');
  const before = await pagePoint(p, tg.Union.lng, tg.Union.lat);
  await mouseDrag(p, [720, 450], [600, 390], { steps: 14 }); await sleep(1500);                     // a real drag: 120 px left and 60 px up, then the inertia settles
  const afterDrag = await pagePoint(p, tg.Union.lng, tg.Union.lat);
  t.note('the drag moved the monument on screen by', [Math.round(afterDrag.x - before.x), Math.round(afterDrag.y - before.y)]);
  assert(Math.abs(afterDrag.x - before.x) > 80 && Math.abs(afterDrag.y - before.y) > 30, 'the real drag did not move the map');
  await both('after a drag');
  await at(); const z0 = await p.evaluate(() => window.__t0map.getZoom());
  await wheel(p, 720, 450, -480); await sleep(1800);
  const z1 = await p.evaluate(() => window.__t0map.getZoom()); t.note('wheel zoom', [z0, z1]);
  assert(z1 > z0 + 0.15, 'the wheel did not zoom the map');
  await both('after a wheel zoom');
  await at({ bearing: 47 }); await both('rotated 47 deg');
  await at({ bearing: 47, pitch: 38 }); await both('rotated 47 deg and tilted 38 deg');
  await at();
  await emulateViewport(p, { width: 1180, height: 760, dpr: 1, mobile: false }); await sleep(1300); await both('after a resize to 1180x760');
  await emulateViewport(p, { width: 1440, height: 900, dpr: 1, mobile: false }); await sleep(1300); await both('after the resize back');
  for (const day of [2, 3, 1]) { await p.locator(`button:text-is("July ${day}")`).last().dispatchEvent('click'); await sleep(900); await tickBy12(p, 5); await at(); await both(`after the July ${day} tab (+60 ticks: no night tint)`); }
  // style reloads.  (1) a full reload (diff:false) fires style.load and the new style has none of our sources, layers or images; (2) setStyle with the default diff never fires style.load:
  // the diff removes what it does not know (our layers included), the runtime notices through styledata.  Both must bring the markers back where they were.
  const restored = async (label) => {
    const g = await waitFor(async () => { const x = await gtLayers(p); const img = await p.evaluate(() => ['gtmon-star-u', 'gtmon-star-c'].every((i) => window.__t0map.hasImage(i))); return allVisible(x) && x.sources.length === 2 && img ? x : null; }, { timeout: 15000, interval: 200, label: `gtmon layers, sources and star images restored (${label})` });
    await sleep(2800); await both(label); return g;
  };
  await at();
  await p.evaluate(() => { window.__sl = 0; window.__t0map.on('style.load', () => { window.__sl++; }); window.__t0map.setStyle('mapbox://styles/mapbox/satellite-v9', { diff: false }); });
  await waitFor(async () => (await p.evaluate(() => window.__sl)) >= 1, { timeout: 20000, label: 'style.load after setStyle({diff:false})' });
  const g = await restored('after a full style reload (diff:false)');
  await at();
  const sl0 = await p.evaluate(() => window.__sl);
  await p.evaluate(() => { window.__t0map.setStyle('mapbox://styles/mapbox/satellite-v9'); });
  await sleep(3500);
  t.note('style.load events during the diff-mode setStyle', (await p.evaluate(() => window.__sl)) - sl0);
  await restored('after setStyle with a diff');
  t.note('rows', rows); t.note('layers after the reload', g.layers.map((l) => l.join(':')));
  await unitsHidden(p, false); await monOff(p);
  assertEq((await monInfo(p)).errors, [], 'runtime errors');
  assertEq(errsSince(S, e0), [], 'errors during MONL-03');
});

// ================================================================== 04 click, card, Esc
suite.test('T0-MONL-04', 'click: a dot opens the card of THAT monument (name, side, group, honors, location, Google Maps link), a second click replaces it, the unit picker stays out of it, bare map and Esc close it, the keys still step time', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); const rows4 = []; await monOn(p);
  const names = ['Pennsylvania State Memorial', '15th & 50th New York Engineers Monument'];
  await setCamera(p, { center: [-77.2345, 39.8117], zoom: 16 }); await sleep(900);
  for (const name of names) {
    const i = idxOfName(name), m = T.A[i];
    await setCamera(p, { center: [m.lon, m.lat], zoom: 16.5 }); await sleep(700);
    const q = await pagePoint(p, m.lon, m.lat);
    await p.mouse.move(q.x - 3, q.y + 2); await sleep(150); await p.mouse.click(q.x, q.y);
    const c = await waitCard(p, `m${i}`);
    t.note(`card ${name}`, { rect: c.rect, buttons: c.buttons.map((b) => b.t), links: c.links });
    assertEq(c.count, 1, 'one card at a time');
    assertEq(c.name, m.name, 'card heading');
    assertEq(c.role, 'dialog', 'card role'); assert(c.label, 'card is named by its heading (aria-labelledby)');
    assert(c.text.includes(T.sideOf(m)) && c.text.includes(m.group), `card shows side and group: ${c.text.slice(0, 120)}`);
    if (m.honors) assert(c.text.includes(m.honors.slice(0, 30)), 'card shows the honors line');
    assert(c.text.includes(m.loc.slice(0, 20)), 'card shows the location text');
    assert(c.links.some((h) => h === `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`), `Google Maps link with the monument's coordinates: ${c.links}`);
    assert(c.buttons.some((b) => /Close monument card/.test(b.label || '')), 'close button is named');
    assert(c.focusInside, 'keyboard focus moved into the card');
    const vp = { w: 1440, h: 900 }; assert(c.rect.x >= 0 && c.rect.y >= 48 && c.rect.x + c.rect.w <= vp.w && c.rect.y + c.rect.h <= vp.h, `card inside the window: ${JSON.stringify(c.rect)}`);
    const dockTop = await p.evaluate(() => document.getElementById('gt-timeline').getBoundingClientRect().top); assert(c.rect.y + c.rect.h <= dockTop + 1, `card above the dock (${c.rect.y + c.rect.h} vs ${dockTop})`);
    assert(!/Commander/.test(await bodyText(p)), 'the unit panel opened too: the app\'s unit picker reacted to the monument click');
  }
  // the app's documented keys still work with the card open
  const t0 = await readTick(p); await p.keyboard.press('ArrowRight'); await sleep(300); assertEq(await readTick(p), t0 + 1, 'ArrowRight steps the clock with the card open');
  await p.keyboard.press('ArrowLeft'); await sleep(200);
  // another monument replaces the card: one that is on screen, isolated and not under the open card
  const rect0 = (await cardNow(p)).rect;
  const nxt = await p.evaluate(([A, r]) => {
    const m = window.__t0map, c = m.getCanvas().getBoundingClientRect(); const pts = A.map((x, i) => ({ i, q: m.project([x.lon, x.lat]) }));
    const ok = pts.filter((a) => { const X = a.q.x + c.left, Y = a.q.y + c.top; return X > 60 && X < 1300 && Y > 120 && Y < 700 && !(X > r.x - 16 && X < r.x + r.w + 16 && Y > r.y - 16 && Y < r.y + r.h + 16) && pts.every((b) => b === a || Math.hypot(a.q.x - b.q.x, a.q.y - b.q.y) > 40); });
    return ok.length ? { i: ok[0].i, x: ok[0].q.x + c.left, y: ok[0].q.y + c.top } : null;
  }, [T.A, rect0]);
  assert(nxt, 'no other isolated monument on screen outside the card'); t.note('second monument', T.A[nxt.i].name);
  await p.mouse.click(nxt.x, nxt.y); const cj = await waitCard(p, `m${nxt.i}`); assertEq(cj.count, 1, 'the second click replaced the card (one card)');
  // reach: a click 30 px away is bare map (it closes the card), 8 px away opens the card (mouse radius 12 px)
  await p.mouse.click(nxt.x + 30, nxt.y); await waitNoCard(p);
  await p.mouse.click(nxt.x + 8, nxt.y); await waitCard(p, `m${nxt.i}`);
  await p.mouse.click(nxt.x + 30, nxt.y); await waitNoCard(p);
  // co-located monuments (28 pairs share a spot to within 4 m): the card names the others and lets the visitor switch
  const M2 = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lon - b.lon) * 85000);
  const pair = (() => {
    let best = null;
    for (let a = 0; a < T.A.length; a++) for (let b = a + 1; b < T.A.length; b++) {
      const d = M2(T.A[a], T.A[b]); if (d >= 3) continue;
      if (T.mA.some((st) => M2({ lat: st.lat, lon: st.lng }, T.A[a]) < 40)) continue;                      // keep stars out of this check
      if (T.A.some((o, k) => k !== a && k !== b && M2(o, T.A[a]) < 25)) continue;                         // exactly the two share the spot
      if (!best || d < best.d) best = { d, ab: [a, b] };
    }
    return best && best.ab;
  })();
  assert(pair, 'no isolated co-located pair of monuments in the data (expected 28 pairs within 4 m)'); t.note('co-located pair', pair.map((n) => T.A[n].name));
  const pm = T.A[pair[0]];
  await setCamera(p, { center: [pm.lon, pm.lat], zoom: 17 }); await sleep(900); const qp = await pagePoint(p, pm.lon, pm.lat); await p.mouse.click(qp.x, qp.y);
  const cp = await waitCard(p); assert(pair.map((n) => `m${n}`).includes(cp.id), `the card of a co-located pair is one of the two (${cp.id})`);
  const other = pair.find((n) => `m${n}` !== cp.id);
  assert(/Also here \(\d+\)/.test(cp.text) && cp.text.includes(T.A[other].name), `the card lists the other monument at the spot: ${cp.text.slice(-200)}`);
  await p.locator('[data-gtmon-card] .gtmon-also-btn', { hasText: T.A[other].name }).first().click(); await waitCard(p, `m${other}`);
  // edges: a marker near each edge of the map box still gets a card that is fully on screen, clear of the toolbar and above the dock (the map box runs under the dock)
  await p.keyboard.press('Escape'); await waitNoCard(p);
  const pa = T.A[idxOfName('Pennsylvania State Memorial')];
  const edges = [['left edge', 70, 220], ['right edge', 1370, 300], ['near the toolbar', 720, 130], ['near the dock', 720, 700], ['top-left corner', 70, 125], ['bottom-right of the map, clear of the minimap', 1180, 705]];
  for (const [label, tx, ty] of edges) {
    const spot = await freeSpot(p, tx, ty); assert(spot, `no free map spot near ${label}`); const at = await placeAt(p, pa.lon, pa.lat, spot.x, spot.y);
    const under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${String(e.className).slice(0, 40)}` : null; }, [at.x, at.y]);
    await p.mouse.click(at.x, at.y);
    const ce = await waitCard(p, `m${idxOfName('Pennsylvania State Memorial')}`).catch(async (e) => { throw new Error(`${label}: no card after a click at ${Math.round(at.x)},${Math.round(at.y)} (element there: ${under}; runtime: ${JSON.stringify(await monInfo(p))}): ${e.message}`); }); await sleep(900);
    const r = (await cardNow(p)).rect, dock = await p.evaluate(() => document.getElementById('gt-timeline').getBoundingClientRect().top), mk = await pagePoint(p, pa.lon, pa.lat);
    rows4.push(`${label}: card ${r.x},${r.y} ${r.w}x${r.h}, marker now ${Math.round(mk.x)},${Math.round(mk.y)}`);
    assert(r.x >= 0 && r.x + r.w <= 1440 && r.y >= 48 && r.y + r.h <= dock + 1, `${label}: the card is not fully inside the window above the dock: ${JSON.stringify(r)} (dock top ${dock})`);
    assert(mk.x > 0 && mk.x < 1440 && mk.y > 48 && mk.y < dock, `${label}: the marker was pushed off the map: ${JSON.stringify(mk)}`);
    await p.keyboard.press('Escape'); await waitNoCard(p);
  }
  t.note('edge placements', rows4);
  // bare map closes it; Esc closes it
  const qe = await placeAt(p, pm.lon, pm.lat, 720, 450, 17);
  await p.mouse.click(qe.x, qe.y); await waitCard(p); await p.mouse.click(qe.x + 120, qe.y + 160); await waitNoCard(p);
  await p.mouse.click(qe.x, qe.y); await waitCard(p); await p.keyboard.press('Escape'); await waitNoCard(p);
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-04');
});

// ================================================================== 05 story marker, jump
suite.test('T0-MONL-05', 'story marker: the card quotes the narrative and offers "Jump to this moment": the tick becomes the one whose app clock reads the time the narrative names (the marker\'s own tick when it names none), playback pauses, the map flies there, the card closes', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); await monOn(p);
  const i = T.mA.findIndex((s) => s.id === 'mon_armistead'), s = T.mA[i], jt = T.jumpTick(s);              // "July 3, 3:15 PM": tick 551 is where the animation has the event, tick 586 is where the legacy clock reads 3:15 PM
  assert(jt !== s.tick, `precondition: the Armistead narrative names a time, so the jump tick (${jt}) is not the marker tick (${s.tick})`);
  await setCamera(p, { center: [s.lng + 0.003, s.lat + 0.002], zoom: 15.5 }); await sleep(700);
  const q = await pagePoint(p, s.lng, s.lat);
  await p.mouse.click(q.x, q.y);
  const c = await waitCard(p, `s${i}`);
  t.note('story card', { text: c.text.slice(0, 260), buttons: c.buttons.map((b) => b.t) });
  assertEq(c.name, s.name, 'card heading');
  assert(c.text.includes(s.label.slice(0, 40)), 'the card quotes the story marker\'s narrative');
  assert(c.text.includes(`tick ${jt} of 675`) && c.text.includes('July 3'), `the card names the moment Jump goes to (day and tick ${jt}, no clock time of its own): ${c.text.slice(-260)}`);
  assert(!/\d+:\d\d (AM|PM)/.test(c.text.replace(s.label, '')), 'the card prints no clock time of its own (D-TIME: the clock labels are the clock module\'s business)');
  assert(c.buttons.some((b) => /^Jump to this moment/.test(b.t)), 'Jump to this moment');
  assert(await readTick(p) !== jt, 'precondition: the clock is not already at the jump tick');
  await p.locator('[data-gtmon-card] button.gtmon-jump').click();
  await waitFor(async () => (await readTick(p)) === jt, { timeout: 4000, label: `tick ${jt}` });
  await waitNoCard(p);
  assert(/July 3, 3:15 PM/.test(await bodyText(p)), 'the app clock (toolbar, time bar) reads the time the narrative names: July 3, 3:15 PM');
  await sleep(1200);
  const st = await p.evaluate(() => { const m = window.__t0map; const c = m.getCenter(); return { zoom: m.getZoom(), c: [c.lng, c.lat] }; });
  assert(st.zoom >= 14.9, `the map did not zoom to the marker (zoom ${st.zoom})`);
  assert(Math.hypot((st.c[0] - s.lng) * 85000, (st.c[1] - s.lat) * 111000) < 80, `the map did not centre on the marker: ${st.c}`);
  const txt = await bodyText(p); assert(/July 3/.test(txt), 'the clock shows day 3');
  assert(await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Play' || x.textContent.trim() === '▶'); return !!b; }), 'playback is paused (the Play button is shown)');
  // prefers-reduced-motion: the jump is a cut, not a 0.8 s flight
  await p.emulateMedia({ reducedMotion: 'reduce' });
  try {
    const j = T.mA.findIndex((x) => x.id === 'mon_hancock'), sj = T.mA[j];
    const spot = await freeSpot(p, 900, 230); const qj = await placeAt(p, sj.lng, sj.lat, spot.x, spot.y, 14.5); await p.mouse.click(qj.x, qj.y); await waitCard(p, `s${j}`);
    await p.locator('[data-gtmon-card] button.gtmon-jump').click(); await waitFor(async () => (await readTick(p)) === T.jumpTick(sj), { timeout: 3000, label: 'tick of the second jump' });
    await sleep(150);
    const c2 = await p.evaluate(() => { const m = window.__t0map; const c = m.getCenter(); return { zoom: m.getZoom(), c: [c.lng, c.lat], moving: m.isMoving() }; });
    assert(!c2.moving && c2.zoom >= 14.9 && Math.hypot((c2.c[0] - sj.lng) * 85000, (c2.c[1] - sj.lat) * 111000) < 80, `with reduced motion the jump is immediate: ${JSON.stringify(c2)}`);
  } finally { await p.emulateMedia({ reducedMotion: 'no-preference' }); }
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-05');
});

// ================================================================== 06 glow
suite.test('T0-MONL-06', 'glow: a story marker glows gold exactly while its linked unit is on the field (set computed from the shipped placement data at ticks 1, 268 and 551)', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); await monOn(p);
  const fsStates = () => p.evaluate(() => { const m = window.__t0map; const out = []; for (let i = 0; i < 20; i++) out.push(!!(m.getFeatureState({ source: 'gtmon-stories', id: i }) || {}).active); return out.map((v, i) => (v ? i : -1)).filter((i) => i >= 0); });
  const gotoTick = async (tick) => { const day = tick <= 225 ? 1 : tick <= 450 ? 2 : 3; await p.locator(`button:text-is("July ${day}")`).last().dispatchEvent('click'); await sleep(800); const first = day === 1 ? 1 : day === 2 ? 226 : 451; const steps = tick - first; for (let k = 0; k < Math.floor(steps / 12); k++) await p.keyboard.press('Shift+ArrowRight'); for (let k = 0; k < steps % 12; k++) await p.keyboard.press('ArrowRight'); await sleep(500); return readTick(p); };
  const rows = [];
  for (const tick of [1, 268, 551, 1]) {
    const got = await gotoTick(tick); assertEq(got, tick, `could not reach tick ${tick}`);
    await waitFor(async () => JSON.stringify((await monInfo(p)).active) === JSON.stringify(T.activeAt(tick)), { timeout: 4000, interval: 100, label: `active set at tick ${tick}` }).catch(() => {});
    const want = T.activeAt(tick), info = (await monInfo(p)).active, fs = await fsStates();
    rows.push({ tick, want, info, featureState: fs });
    assertEq(fs, info, `map feature-state active equals the runtime's at tick ${tick}`);
    if (HAS_B) assertEq(info, want, `runtime active set at tick ${tick}`);
    else assert(info.every((i) => want.includes(i)), `runtime active set at tick ${tick} has a marker whose unit is not in the data: ${info} vs ${want}`);   // before group B's merge fix the app itself drops some units when a day's files are merged
  }
  t.note('rows', rows);
  // marker 0 (20th Maine, unit U-20ME) starts at tick 225: dark at tick 1, glowing at 268
  assert(!rows[0].featureState.includes(0) && rows[1].featureState.includes(0), '20th Maine marker: dark at tick 1, glowing at tick 268');
  if (!HAS_B) t.note('data model', 'no group B (merge fix) in this tree: the app drops units when it merges the files of a day, so the glow set is checked as a subset of the data');
  const glowExpr = JSON.stringify(await p.evaluate(() => window.__t0map.getPaintProperty('gtmon-glow', 'circle-opacity')));
  assert(/feature-state","active"/.test(glowExpr.replace(/\s/g, '')) || /feature-state.*active/.test(glowExpr), `the glow layer is driven by feature-state active: ${glowExpr}`);
  // the card of a glowing marker says so
  const k = T.mA.findIndex((x) => x.id === 'mon_20me_lrt'); await gotoTick(268);
  await setCamera(p, { center: [T.mA[k].lng, T.mA[k].lat], zoom: 16 }); await sleep(700);
  const q = await pagePoint(p, T.mA[k].lng, T.mA[k].lat); await p.mouse.click(q.x, q.y); const c = await waitCard(p, `s${k}`);
  assertEq(c.active, '1', 'card of an active marker'); assert(/on the field at this moment/.test(c.text) && !/not on the field/.test(c.text), c.text.slice(0, 200));
  await p.keyboard.press('Escape'); await waitNoCard(p);
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-06');
});

// ================================================================== 07 phone
suite.test('T0-MONL-07', 'phone 375x812, real touch: the Tools tile toggles the layer (aria-pressed), a tap on a marker opens the card as a sheet above the dock (22 px tap radius, 44 px targets), Jump works', async (t) => {
  needMon();
  const S = await open({ profile: 'phone', viewport: { width: 375, height: 812, dpr: 2, mobile: true } }); const p = S.page; const e0 = S.collector.firstParty.length;
  F.P = S;
  try {
    await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'mobile'); await mapReady(p); await sleep(1500);
    const T = truth();
    const tapEl = async (loc) => { const b = await loc.boundingBox(); assert(b, 'element has no box'); await touchTap(p, b.x + b.width / 2, b.y + b.height / 2); };
    const openTools = async () => { await tapEl(p.locator('button:has-text("Tools")').first()); await sleep(500); };
    const tile = () => p.locator('button:has(span:text-is("Monuments"))').first();
    await openTools();
    const tileBox = await tile().boundingBox(); assert(tileBox, 'the phone Tools sheet has no Monuments tile');
    t.note('tile', { w: Math.round(tileBox.width), h: Math.round(tileBox.height), pressed: await tile().getAttribute('aria-pressed') });
    assert(tileBox.width >= 44 && tileBox.height >= 44, 'tile is at least 44x44');
    assertEq(await tile().getAttribute('aria-pressed'), 'false', 'tile aria-pressed at load');
    assertEq((await monInfo(p)).on, false, 'off at load');
    await tapEl(tile()); await sleep(900);
    const g = await waitFor(async () => { const x = await gtLayers(p); return allVisible(x) ? x : null; }, { timeout: 6000, label: 'layers visible after the tile tap' });
    assertEq((await monInfo(p)).on, true, 'on after the tile tap');
    assertEq(await p.evaluate(() => !!document.querySelector('[aria-label="Tools"][role="dialog"], .gtbg-m-toolspanel')), false, 'the Tools sheet closes after the tile (like every other tile)');
    await openTools(); assertEq(await tile().getAttribute('aria-pressed'), 'true', 'tile aria-pressed after on'); await p.keyboard.press('Escape').catch(() => {});
    await p.evaluate(() => { const b = document.querySelector('[aria-label="Close tools"]'); b && b.click(); }); await sleep(400);
    if (!HAS_C) {                                                                                    // R1a: the legacy phone shell; its unit canvas swallows every tap (preventDefault on touchend), group C fixes that
      await tapEl(tile()); await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 5000, label: 'layers hidden after the second tile tap' }); assertEq((await monInfo(p)).listeners, 0, 'listeners after off');
      t.note('marker taps', 'not tested on this train: the legacy phone shell (no group C) swallows taps on the map, so no click reaches the map; the Tools tile toggle was tested');
      return;
    }
    // marker taps
    const k = T.mA.findIndex((x) => x.id === 'mon_armistead'), st = T.mA[k];
    await setCamera(p, { center: [st.lng + 0.0004, st.lat + 0.0006], zoom: 16.2 }); await sleep(1500);
    const q = await pagePoint(p, st.lng, st.lat);
    const iso = await p.evaluate(([x, y]) => { const m = window.__t0map; const c = m.getCanvas().getBoundingClientRect(); return { cw: c.width, ch: c.height, top: c.top }; }, [q.x, q.y]);
    await touchTap(p, q.x, q.y + 17); await sleep(500);                                           // 17 px below the star: inside the 22 px tap radius
    const c = await waitCard(p, `s${k}`);
    t.note('phone card', { rect: c.rect, buttons: c.buttons.map((b) => `${b.t} ${b.w}x${b.h}`), map: iso });
    const dock = await p.evaluate(() => { const d = document.getElementById('gt-timeline'); const r = d.getBoundingClientRect(); return { top: r.top }; });
    assertEq(await p.evaluate(() => !!document.querySelector('.gtmon-sheet [data-gtmon-card]')), true, 'the phone card is a sheet');
    assert(c.rect.y + c.rect.h <= dock.top + 1, `sheet above the dock (${c.rect.y + c.rect.h} vs ${dock.top})`);
    assert(c.rect.x >= 0 && c.rect.x + c.rect.w <= 375, 'sheet inside the phone width');
    for (const b of c.buttons) assert(b.w >= 44 && b.h >= 44, `card button "${b.t}" is ${b.w}x${b.h}, under 44x44`);
    for (const b of c.linkBoxes) assert(b.h >= 44, `card link is ${b.w}x${b.h}, under 44 px high`);
    const marker = await pagePoint(p, st.lng, st.lat); const sheetTop = c.rect.y; t.note('marker after the sheet opened (page y) / sheet top', [Math.round(marker.y), sheetTop]);
    assert(marker.y < sheetTop - 8 && marker.y > 90, `the marker is hidden behind the sheet or off the map (y ${Math.round(marker.y)}, sheet top ${sheetTop})`);
    assert(!(await p.evaluate(() => /Commander|Cmd:/.test(document.body.innerText))), 'a unit popup opened too');
    // tap radius: 30 px from the nearest marker does nothing
    await touchTap(p, 330, 150); await sleep(500); assertEq(await cardNow(p), null, 'a tap on bare map closes the sheet');
    // tap radius (44 px target): an isolated dot opens its card from 20 px away and not from 34 px away
    await touchTap(p, 330, 150); await sleep(300);
    const fl = idxOfName('Florida State Monument'), fm = T.A[fl];                                    // 340 m from any other marker
    await setCamera(p, { center: [fm.lon, fm.lat], zoom: 16 }); await sleep(1800);
    const lone = await pagePoint(p, fm.lon, fm.lat);
    await touchTap(p, lone.x + 34, lone.y); await sleep(500); assertEq(await cardNow(p), null, 'a tap 34 px from a dot opened a card (tap radius is 22 px)');
    await touchTap(p, lone.x + 20, lone.y); const lc = await waitCard(p, `m${fl}`); t.note('a tap 20 px from the dot opened', lc.name);
    await touchTap(p, 330, 150); await waitNoCard(p);
    await setCamera(p, { center: [st.lng + 0.0004, st.lat + 0.0006], zoom: 16.2 }); await sleep(1800);
    // Jump
    const mk = await pagePoint(p, st.lng, st.lat); await touchTap(p, mk.x, mk.y); await waitCard(p, `s${k}`);
    await tapEl(p.locator('[data-gtmon-card] button.gtmon-jump'));
    await waitFor(async () => (await readTick(p)) === T.jumpTick(st), { timeout: 5000, label: `phone tick ${T.jumpTick(st)}` });
    await waitNoCard(p);
    // "Open in Walkthrough list" on the phone: the phone Walkthrough opens on its Monuments tab with the name typed in
    const wm = T.A[idxOfName('Pennsylvania State Memorial')]; await setCamera(p, { center: [wm.lon, wm.lat], zoom: 16.5 }); await sleep(1500);
    const wq = await pagePoint(p, wm.lon, wm.lat); await touchTap(p, wq.x, wq.y); await waitCard(p, `m${idxOfName('Pennsylvania State Memorial')}`);
    await tapEl(p.locator('[data-gtmon-card] button.gtmon-wt'));
    await waitFor(async () => (await p.locator('input[placeholder^="Search"]').count()) > 0 && (await p.locator('input[placeholder^="Search"]').first().inputValue()) === wm.name, { timeout: 8000, label: 'phone Walkthrough Monuments tab with the name typed in' });
    t.note('phone Walkthrough', (await bodyText(p)).slice(0, 160));
    await p.locator('input[placeholder^="Search"]').first().fill('');
    await tapEl(p.locator('button:has-text("Animated Map"), button:has-text("Back to the map")').first()); await sleep(800);
    // off again by the tile
    await openTools(); await tapEl(tile()); await sleep(600);
    await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 5000, label: 'layers hidden after the second tile tap' });
    assertEq((await monInfo(p)).listeners, 0, 'listeners after off');
    assertEq(errsSince(S, e0), [], 'errors during MONL-07');
  } finally { await closeSession(S); F.P = null; }
});

// ================================================================== 08 reload with the layer on
suite.test('T0-MONL-08', 'reload with the layer on: boots clean, off again (not persisted), nothing stale in the DOM, toggles on again', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  await monOn(p);
  assertEq((await monInfo(p)).on, true, 'precondition: on');
  await p.reload({ waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop'); await mapReady(p); await sleep(1500);
  const a = await p.evaluate(() => ({ info: window.__gtmon.info(), css: !!document.getElementById('gtmon-css'), dom: document.querySelectorAll('.gtmon-ctl,.gtmon-pop,[data-gtmon-card],.gtmon-sheet').length, layers: window.__t0map.getStyle().layers.filter((l) => l.id.startsWith('gtmon')).length }));
  t.note('after the reload', a);
  assertEq([a.info.on, a.info.enabled, a.info.listeners, a.info.store, a.css, a.dom, a.layers], [false, 0, 0, false, false, 0, 0], 'a clean, off state after the reload');
  if (HAS_AX) assertEq(await pressed(p), 'false', 'aria-pressed after the reload');
  await monOn(p);
  const d = await p.evaluate(() => window.__t0map.getStyle().sources['gtmon-dots'].data.features.length); assertEq(d, 512, 'dots after the reload');
  assertEq((await monInfo(p)).errors, [], 'runtime errors');
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-08 (including the boot after the reload)');
});

// ================================================================== 09 keyboard + axe
suite.test('T0-MONL-09', 'keyboard: Tab reaches the list control, Enter opens it, typing filters, arrows move, Enter opens the card with focus inside, Esc closes card and list; axe: no serious/critical violation', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); await monOn(p);
  const ctl = p.locator('.gtmon-ctl button[aria-label="Browse monuments"]');
  assertEq(await ctl.count(), 1, 'list control');
  const box = await ctl.boundingBox(); t.note('control box', box); assert(box.width >= 24 && box.height >= 24, 'control is at least 24x24');
  // reach it with Tab from the toolbar button (real keyboard)
  await monBtn(p).focus();
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) { await p.keyboard.press('Tab'); reached = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label') === 'Browse monuments'); }
  assert(reached, 'Tab never reached the list control within 60 stops');
  await p.keyboard.press('Enter');
  const dlg = p.locator('.gtmon-panel');
  await waitFor(async () => (await dlg.isVisible()) ? true : null, { timeout: 2000, label: 'list panel visible' });
  assertEq(await ctl.getAttribute('aria-expanded'), 'true', 'aria-expanded');
  assertEq(await p.evaluate(() => document.activeElement && document.activeElement.className), 'gtmon-search', 'focus is in the search field');
  assertEq(await dlg.getAttribute('role'), 'dialog', 'panel role'); assert(await dlg.getAttribute('aria-label'), 'panel is named');
  const rows0 = await p.locator('.gtmon-row').count(); assertEq(rows0, 40, 'at most 40 rows are listed before a search');
  assert(/Showing 40 of 53\d monuments/.test(await p.locator('.gtmon-status').innerText()), `status line: ${await p.locator('.gtmon-status').innerText()}`);
  await p.keyboard.type('armistead', { delay: 20 }); await sleep(200);
  const names = await p.locator('.gtmon-row').evaluateAll((r) => r.map((x) => x.firstChild.textContent));
  assert(names.length >= 2 && names[0] === 'Armistead Monument' && names.slice(0, 2).every((n) => /armistead/i.test(n)), `search results (name matches first, story markers first): ${names}`);
  await p.keyboard.press('ArrowDown'); await sleep(100);
  assertEq(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('gtmon-row')), true, 'ArrowDown moves into the results');
  const wantName = await p.evaluate(() => document.activeElement.firstChild.textContent);
  // axe on the open list (WCAG 2 A/AA + best practice, scoped to the new UI)
  const { AxeBuilder } = await import('@axe-core/playwright').then((m) => ({ AxeBuilder: m.default || m.AxeBuilder }));
  const axe1 = await new AxeBuilder({ page: p }).include('.gtmon-ctl').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  const bad1 = axe1.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  t.note('axe list', { violations: axe1.violations.map((v) => `${v.id}:${v.impact}`), passes: axe1.passes.length });
  assertEq(bad1.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), [], 'axe serious/critical in the list control');
  await p.keyboard.press('Enter');
  const c = await waitCard(p); assertEq(c.name, wantName, 'the card is the one chosen in the list'); assert(c.focusInside, 'focus moved into the card');
  assertEq(await p.locator('.gtmon-panel').isVisible(), false, 'the list closed after the choice');
  const axe2 = await new AxeBuilder({ page: p }).include('.gtmon-pop').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  const bad2 = axe2.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  t.note('axe card', { violations: axe2.violations.map((v) => `${v.id}:${v.impact}`), passes: axe2.passes.length });
  assertEq(bad2.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), [], 'axe serious/critical in the card');
  // Tab order inside the card, then Esc
  const order = [], rings = [];
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press('Tab');
    const f = await p.evaluate(() => { const a = document.activeElement; const inside = !!(a && a.closest('[data-gtmon-card]')); const c = a ? getComputedStyle(a) : null; return { name: inside ? (a.getAttribute('aria-label') || a.textContent.trim().slice(0, 28)) : 'outside', ring: inside && c ? `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor}` : null }; });
    order.push(f.name); if (f.ring) rings.push(f.ring);
  }
  t.note('tab order in the card', order); t.note('focus rings of the card controls (keyboard focus)', rings);
  // 2 px solid ring on keyboard focus: the gold ring of the card (R1a) or, with group AX, the app's global white ring with its black halo (`:focus-visible{outline:2px solid #fff!important}`)
  assert(rings.length >= 3 && rings.every((r) => r === '2px solid rgb(200, 168, 74)' || r === '2px solid rgb(255, 255, 255)'), `every card control shows a 2 px focus ring on keyboard focus: ${rings}`);
  assert(order.slice(0, 3).every((x) => x !== 'outside'), `Tab does not walk through the card: ${order}`);
  await p.locator('[data-gtmon-card]').focus().catch(() => {});
  await p.keyboard.press('Escape'); await waitNoCard(p);
  // Esc in the list closes it and gives the focus back to the control
  await ctl.focus(); await p.keyboard.press('Enter'); await sleep(200); await p.keyboard.press('Escape'); await sleep(200);
  assertEq(await p.locator('.gtmon-panel').isVisible(), false, 'Esc closes the list');
  assertEq(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label')), 'Browse monuments', 'focus returns to the control');
  await monOff(p);
  assertEq(errsSince(S, e0), [], 'errors during MONL-09');
});

// ================================================================== 10 hover
suite.test('T0-MONL-10', 'hover: a real mouse move over a marker rings it, sets the pointer cursor and shows a tooltip with its name; leaving clears all three', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const T = truth(); await monOn(p);
  const i = idxOfName('Pennsylvania State Memorial'), m = T.A[i];
  await setCamera(p, { center: [m.lon, m.lat], zoom: 16.5 }); await sleep(900);
  const q = await pagePoint(p, m.lon, m.lat);
  const read = () => p.evaluate((idx) => ({ hover: !!(window.__t0map.getFeatureState({ source: 'gtmon-dots', id: idx }) || {}).hover, cursor: window.__t0map.getCanvas().style.cursor, tip: [...document.querySelectorAll('.gtmon-tip')].map((e) => e.innerText.replace(/\s+/g, ' ')) }), i);
  await p.mouse.move(q.x - 150, q.y - 150); await sleep(300);
  const away = await read(); assertEq([away.hover, away.cursor, away.tip], [false, '', []], 'nothing hovered before');
  await p.mouse.move(q.x + 3, q.y - 2, { steps: 6 }); await sleep(500);
  const over = await read(); t.note('hovered', over);
  assertEq(over.hover, true, 'the dot is ringed (feature-state hover)'); assertEq(over.cursor, 'pointer', 'pointer cursor'); assert(over.tip.length === 1 && over.tip[0].includes(m.name), `tooltip with the name: ${over.tip}`);
  await p.mouse.move(q.x + 140, q.y + 120, { steps: 6 }); await sleep(500);
  const left = await read(); assertEq([left.hover, left.cursor, left.tip], [false, '', []], 'cleared when the mouse leaves');
  await p.mouse.move(q.x, q.y, { steps: 4 }); await sleep(400); await monOff(p); await sleep(200);
  const off = await p.evaluate(() => ({ tip: document.querySelectorAll('.gtmon-tip').length, cursor: window.__t0map.getCanvas().style.cursor }));
  assertEq([off.tip, off.cursor], [0, ''], 'switching the layer off while hovering clears the tooltip and the cursor');
  assertEq(errsSince(S, e0), [], 'errors during MONL-10');
});

// ================================================================== 11 leaks / idle cost
suite.test('T0-MONL-11', 'leaks: 6 on/off cycles leave the map with exactly the listeners it had and no popup, control or subscription; idle script time with the layer on is not above off', async (t) => {
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const lc = () => p.evaluate(() => window.__lcSnapshot());
  const off0 = await lc(); const info0 = await monInfo(p);
  assertEq([info0.listeners, info0.store], [0, false], 'precondition: off');
  const seen = [];
  for (let c = 0; c < 6; c++) {
    await clickTool(monBtn(p)); await waitFor(async () => allVisible(await gtLayers(p)), { timeout: 5000, label: `on #${c + 1}` });
    const on = await lc(); const inf = await monInfo(p); seen.push({ on: Object.keys(on).filter((k) => on[k] !== (off0[k] || 0)).map((k) => `${k}:${on[k] - (off0[k] || 0)}`), listeners: inf.listeners });
    await p.mouse.move(700 + c * 5, 400); await sleep(150);
    await clickTool(monBtn(p)); await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 5000, label: `off #${c + 1}` });
  }
  t.note('listeners added while on (relative to off)', seen[0]);
  const off1 = await lc(); const info1 = await monInfo(p);
  assertEq(off1, off0, 'listeners registered on the map container after 6 cycles equal those before the first');
  assertEq([info1.listeners, info1.store, info1.enabled], [0, false, 0], 'runtime state after the cycles');
  assert(seen.every((s) => s.on.length >= 3), `while on the layer registers listeners on the map container (${JSON.stringify(seen[0])})`);
  assertEq(await p.evaluate(() => document.querySelectorAll('.gtmon-ctl,.gtmon-pop,[data-gtmon-card],.gtmon-sheet').length), 0, 'DOM left behind');
  // idle script time (CDP Performance.ScriptDuration over 4 s, paused, nothing moving): on must not cost more than off + 25 ms
  const cdp = await S.context.newCDPSession(p); await cdp.send('Performance.enable');
  const script = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics.find((x) => x.name === 'ScriptDuration').value; return m; };
  const idle = async () => { await sleep(600); const a = await script(); await sleep(4000); return Math.round((await script() - a) * 1000); };
  const msOff = await idle();
  await clickTool(monBtn(p)); await waitFor(async () => allVisible(await gtLayers(p)), { timeout: 5000, label: 'on for the idle measurement' }); await sleep(1500);
  const msOn = await idle();
  await clickTool(monBtn(p)); await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 5000, label: 'off again' });
  await cdp.detach();
  t.note('idle script ms per 4 s (off / on)', [msOff, msOn]);
  assert(msOn <= msOff + 25, `idle script time with the layer on (${msOn} ms) is more than 25 ms above off (${msOff} ms)`);
  assertEq(errsSince(S, e0), [], 'errors during MONL-11');
});

// ================================================================== 14 layout switch
suite.test('T0-MONL-14', 'layout switch: layer on in the phone layout, "Desktop View" in the Tools sheet: the phone map instance is dropped (no leak), the desktop layout starts with the layer off, its own toggle works, no errors', async (t) => {
  needMon(); if (!HAS_C && !EXPECT_RED) throw new Skip('the way back to the desktop layout from the phone Tools sheet is group C');
  const S = await open({ profile: 'switch', viewport: { width: 768, height: 1024, dpr: 1, mobile: true } }); const p = S.page; const e0 = S.collector.firstParty.length;
  try {
    await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'mobile'); await mapReady(p); await sleep(1500);
    const tapEl = async (loc) => { const b = await loc.boundingBox(); assert(b, 'element has no box'); await touchTap(p, b.x + b.width / 2, b.y + b.height / 2); };
    await tapEl(p.locator('button:has-text("Tools")').first()); await sleep(500);
    await tapEl(p.locator('button:has(span:text-is("Monuments"))').first()); await waitFor(async () => allVisible(await gtLayers(p)), { timeout: 6000, label: 'layers visible on the phone map' });
    const a = await monInfo(p); assert(a.on && a.enabled === 1 && a.maps === 1, `phone: ${JSON.stringify(a)}`);
    await tapEl(p.locator('button:has-text("Tools")').first()); await sleep(500);
    await tapEl(p.locator('button:has(span:text-is("Desktop View"))').first());
    await p.evaluate(() => { window.__t0map = null; });
    await waitFor(async () => (await p.locator('button[title="Monuments"]').count()) > 0, { timeout: 10000, label: 'desktop toolbar' });
    await mapReady(p); await sleep(1500);
    const b = await monInfo(p); t.note('after the switch', b);
    assertEq([b.maps, b.enabled, b.on, b.listeners, b.store], [1, 0, false, 0, false], 'the phone map was dropped and the desktop layout starts with the layer off');
    assertEq(await p.evaluate(() => document.querySelectorAll('.gtmon-ctl,.gtmon-pop,.gtmon-sheet,[data-gtmon-card]').length), 0, 'DOM left behind by the phone layout');
    await p.locator('button[title="Monuments"]').first().dispatchEvent('click');
    await waitFor(async () => allVisible(await gtLayers(p)), { timeout: 6000, label: 'layers visible on the desktop map' });
    assertEq((await monInfo(p)).errors, [], 'runtime errors'); assertEq(await p.locator('button[title="Monuments"]').first().getAttribute('aria-pressed'), 'true', 'aria-pressed on the desktop button');
    await p.locator('button[title="Monuments"]').first().dispatchEvent('click'); await waitFor(async () => allHidden(await gtLayers(p)), { timeout: 4000, label: 'hidden again' });
    assertEq(errsSince(S, e0), [], 'errors during MONL-14');
  } finally { await closeSession(S); }
});

// ================================================================== 15 jump tick by the clock (static: the shipped runtime runs in a vm with stubs, nothing else of the page)
suite.test('T0-MONL-15', 'static: "Jump to this moment" goes to the tick where the app clock reads the time the narrative names (9 of the 20 narratives) and to the marker\'s own tick otherwise, and whenever the shipped clock is not the legacy formula', async (t) => {
  needMon();
  const T = truth(); const a = ENTRY_TEXT.indexOf('const GTMON='), b = ENTRY_TEXT.indexOf('function KF({mapRef:c,showMonuments:f,onWalkthrough');
  assert(a > 0 && b > a, 'the runtime markers were not found in the entry');
  const legacy = (x) => { const d = x <= 225 ? 1 : x <= 450 ? 2 : 3, m = (d === 1 ? 360 : 240) + (x - 1) * 5 - (d === 1 ? 0 : d === 2 ? 1125 : 2250), h = Math.floor(m / 60) % 24, mm = m % 60; return `July ${d}, ${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const run = (getTickTime, currentTick) => {
    const st = { currentTick, getTickTime, oobData: {}, placementsByTick: {} };
    const ctx = vm.createContext({ yn: { getState: () => st, subscribe: () => () => {} }, pt: {}, z_: {}, _A: [], mA: T.mA, window: {}, document: {}, matchMedia: () => ({ matches: false }) });
    return vm.runInContext(`${ENTRY_TEXT.slice(a, b)}\n;GTMON`, ctx);
  };
  const TIME = /\b(\d{1,2}):(\d{2})\s?([AP])\.?M/i, rows = [];
  const api = run(() => legacy(100), 100);                                      // the store's clock is the legacy formula
  for (const s of T.mA) {
    const got = api.jumpTick(s), want = T.jumpTick(s), m = TIME.exec(s.label);
    assertEq(got, want, `jump tick of ${s.id}`);
    if (m) { const dm = /\bJuly (\d)\b/.exec(s.label); assertEq(legacy(got), `July ${dm ? dm[1] : s.day}, ${m[1]}:${m[2]} ${m[3].toUpperCase()}M`, `the clock at the jump tick of ${s.id} reads the time of its narrative`); rows.push(`${s.id}: ${s.tick} -> ${got} (${legacy(got)})`); }
    else assertEq(got, s.tick, `${s.id} names no time: its own tick`);
  }
  t.note('stories whose narrative names a time: marker tick -> jump tick', rows); assertEq(rows.length, 9, 'narratives that name a clock time');
  const shifted = run(() => legacy(112), 100), none = run(void 0, 100), thrower = run(() => { throw new Error('no clock'); }, 100);
  for (const [label, g] of [['a clock that is not the legacy formula', shifted], ['a store without getTickTime', none], ['a clock that throws', thrower]]) assertEq(T.mA.map((s) => g.jumpTick(s)), T.mA.map((s) => s.tick), `${label}: every jump goes to the marker's own tick`);
});

// ================================================================== 16 toolbar: nothing lies on top of anything else in a narrow desktop window
suite.test('T0-MONL-16', 'toolbar: no two buttons of the desktop toolbar overlap at any window width from 640 to 1440 px, and the Monuments and Virtual Walkthrough buttons are hit by their own centre (real hit test)', async (t) => {
  needMon(); if (!HAS_AX && !EXPECT_RED) throw new Skip('the toolbar class hooks (gtbg-tb-center, gtbg-tb-right) are group AX; R1a has none');
  const S = await open({ profile: 'toolbar', viewport: { width: 1440, height: 900, dpr: 1, mobile: false }, tiles: 'block' }); const p = S.page; const rows = [];
  try {
    await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop'); await sleep(1500);
    for (const w of [1440, 1100, 1000, 999, 960, 920, 919, 860, 820, 819, 800, 740, 739, 700, 640]) {
      await emulateViewport(p, { width: w, height: 800, dpr: 1, mobile: false }); await sleep(450);
      rows.push({ w, ...(await p.evaluate(() => {
        const rects = [...document.querySelectorAll('.gtbg-tb-center button, .gtbg-tb-center a, .gtbg-tb-right button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ e, r: e.getBoundingClientRect() }));
        const nm = (e) => (e.title || e.textContent || '').trim().slice(0, 14), overlaps = [];
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const x = rects[i].r, y = rects[j].r; if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 0.5 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 0.5) overlaps.push([nm(rects[i].e), nm(rects[j].e)]); }
        const hit = (e) => { if (!e) return false; const q = e.getBoundingClientRect(), top = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return top === e || e.contains(top); };
        const mon = document.querySelector('button[title="Monuments"]'), wt = [...document.querySelectorAll('button')].find((b) => /Virtual Walkthrough/.test(b.textContent));
        return { buttons: rects.length, overlaps, mon: hit(mon), wt: hit(wt), inside: rects.every(({ r }) => r.right <= innerWidth + 0.5 && r.left >= -0.5) };
      })) });
    }
    t.note('rows', rows.map((r) => `${r.w}px: ${r.buttons} buttons, overlaps ${JSON.stringify(r.overlaps)}, Monuments hit ${r.mon}, Walkthrough hit ${r.wt}, inside ${r.inside}`));
    const bad = rows.filter((r) => r.buttons < 14 || r.overlaps.length || !r.mon || !r.wt || !r.inside);
    assert(bad.length === 0, `toolbar problems at ${bad.map((r) => r.w).join(', ')} px: ${JSON.stringify(bad)}`);
  } finally { await closeSession(S); }
});

// ================================================================== 12 the Walkthrough is untouched (guard)
suite.test('T0-MONL-12', 'the Walkthrough is untouched: its code and data are byte-identical to the same train without MON; with the layer on it opens, keeps its own 512 dots (no gtmon layer), lists 100 of 512, searches; "Open in Walkthrough list" opens the Monuments tab with the name typed in; Back returns', async (t) => {
  // -- static: the Walkthrough region of the entry (tour stops d2 .. the Walkthrough components .. before their style object ln) equals the control tree's
  const region = (txt) => { const a = txt.indexOf('d2=[{id:1,name:"McPherson Ridge"'), b = txt.indexOf('const ln={ink:'); assert(a > 0 && b > a, 'Walkthrough region markers not found in the entry'); return txt.slice(a, b); };
  if (HAS_MON) {
    if (!CONTROL) {
      const out = path.join(REPO, 'tmp', 'monuments-restore', `control-${VERSION.train}`);
      if (!fs.existsSync(path.join(out, 'dist', 'version.json'))) {
        const r = spawnSync('python', [path.join(REPO, 'tools', 't0', 'mon', 'mon_build.py'), '--train', VERSION.train, '--out', path.relative(REPO, out), '--no-gate', '--without-mon'], { cwd: REPO, encoding: 'utf8' });
        assert(r.status === 0, `could not build the control tree: ${(r.stdout + r.stderr).slice(-400)}`);
      }
      CONTROL = path.join(out, 'dist');
    }
    const cv = JSON.parse(fs.readFileSync(path.join(path.resolve(REPO, CONTROL), 'version.json'), 'utf8'));
    assert(!cv.groups.includes('MON') && cv.train === VERSION.train, `the control tree must be the same train without MON (it is ${cv.train} ${cv.groups})`);
    const ctl = fs.readFileSync(path.join(path.resolve(REPO, CONTROL), 'assets', cv.entry), 'utf8');
    const a = region(ENTRY_TEXT), b = region(ctl);
    assertEq([a.length, a === b], [b.length, true], 'the Walkthrough code + tour data + the 512-monument array of the entry are byte-identical to the control tree');
    t.note('walkthrough region bytes', a.length); t.note('control', path.relative(REPO, path.resolve(REPO, CONTROL)));
  } else t.note('static', 'no MON in this tree: the region is trivially untouched');
  // -- live
  const S = await desktop(); const p = S.page; const e0 = S.collector.firstParty.length;
  const WT = () => p.locator('#gtbg-wt-map').first();
  const mapsInfo = () => p.evaluate(() => {
    const maps = []; const root = document.getElementById('root'); const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$')); let top = root[key]; if (top && top.stateNode && top.stateNode.current) top = top.stateNode.current; const stack = [top]; let n = 0;      // the CURRENT tree: the container key can point at the stale alternate
    
    while (stack.length && n++ < 200000) { const f = stack.pop(); if (!f) continue; for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) { const v = h.memoizedState; if (v && typeof v === 'object' && v.current && typeof v.current.getCenter === 'function' && !maps.includes(v.current)) maps.push(v.current); } if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child); }
    return maps.map((m) => { const st = m.getStyle(); return { layers: st.layers.map((l) => l.id).filter((i) => /^(wt-|gtmon)/.test(i)), mons: st.sources['wt-mons'] ? st.sources['wt-mons'].data.features.length : null, gt: Object.keys(st.sources).filter((k) => k.startsWith('gtmon')) }; });
  });
  const wtText = async () => (await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Animated Map|Back to the map/.test(x.textContent)); let r = b; for (let i = 0; i < 4 && r && r.parentElement; i++) r = r.parentElement; return r ? r.innerText.replace(/\s+/g, ' ').slice(0, 1500) : ''; }));
  const openWt = async () => { await clickTool(p.locator('button:has-text("Virtual Walkthrough")').first()); await waitFor(async () => (await p.locator('button:text-is("Monuments")').count()) > 0, { timeout: 8000, label: 'Walkthrough tabs' }); await sleep(1500); };
  const closeWt = async () => { await clickTool(p.locator('button:has-text("Animated Map"), button:has-text("Back to the map")').first()); await sleep(800); };
  // Walkthrough with the layer OFF: reference
  const wtMapsUp = (extra) => waitFor(async () => { const m = await mapsInfo(); return m.some((x) => x.layers.some((l) => l.startsWith('wt-')) && x.mons === 512) && (!extra || m.some((x) => x.gt.length === 2)) ? m : null; }, { timeout: 25000, interval: 300, label: 'the Walkthrough map with its layers' + (extra ? ' and the main map with the gtmon layers' : '') });
  await openWt(); const refMaps = await wtMapsUp(false); const refText = await wtText();
  await p.locator('button:text-is("Monuments")').first().click(); await sleep(500);
  const refMons = await p.locator('text=/Showing \\d+ of \\d+ monuments/').first().innerText().catch(() => null);
  await closeWt();
  // layer ON
  needMon(); await monOn(p);
  await openWt();
  const maps = await wtMapsUp(true); const wtTxt = await wtText();
  t.note('maps with the Walkthrough open', maps);
  const wtMap = maps.find((m) => m.layers.some((l) => l.startsWith('wt-'))), mainMap = maps.find((m) => m.gt.length === 2);
  assert(wtMap && mainMap, 'expected the Walkthrough map and the main map');
  assertEq(wtMap.gt, [], 'no gtmon source in the Walkthrough map'); assertEq(wtMap.layers.filter((l) => l.startsWith('gtmon')), [], 'no gtmon layer in the Walkthrough map');
  assertEq([wtMap.mons, wtMap.layers.join(',')], [512, refMaps.find((m) => m.mons).layers.join(',')], 'the Walkthrough map keeps its own 512 dots and layers');
  assertEq(wtTxt, refText, 'the Walkthrough text is the same with the layer on');
  await p.locator('button:text-is("Monuments")').first().click(); await sleep(500);
  const mons = await p.locator('text=/Showing \\d+ of \\d+ monuments/').first().innerText().catch(() => null);
  assertEq([mons, refMons].map((x) => String(x).toLowerCase()), ['showing 100 of 512 monuments', 'showing 100 of 512 monuments'], 'Monuments tab status line (the page upper-cases it)');
  await p.locator('input[placeholder^="Search"]').first().fill('Alabama'); await sleep(400);
  assert(/Alabama State Monument/.test(await bodyText(p)), 'Walkthrough search finds Alabama State Monument');
  await p.locator('input[placeholder^="Search"]').first().fill(''); await closeWt();
  assertEq((await gtLayers(p)).layers.map((l) => l[1]).join(), 'visible,visible,visible,visible', 'the main map still has the layer on after Back');
  // the card action: opens the Walkthrough on its Monuments tab with the name typed in
  const T = truth(); const i = idxOfName('Alabama State Monument'), m = T.A[i];
  await setCamera(p, { center: [m.lon, m.lat], zoom: 16.5 }); await sleep(900); const q = await pagePoint(p, m.lon, m.lat); await p.mouse.click(q.x, q.y); await waitCard(p, `m${i}`);
  await p.locator('[data-gtmon-card] button.gtmon-wt').click();
  await waitFor(async () => (await p.locator('input[placeholder^="Search"]').count()) > 0 && (await p.locator('input[placeholder^="Search"]').first().inputValue()) === m.name, { timeout: 8000, label: 'Walkthrough Monuments tab with the monument name typed in' });
  assert(/Alabama State Monument/.test(await bodyText(p)) && /showing \d+ of \d+ monuments/i.test(await bodyText(p)), 'the list shows the monument');
  await p.locator('input[placeholder^="Search"]').first().fill(''); await closeWt();
  await monOff(p);
  assertEq(errsSince(S, e0).filter((e) => !isGoogleNoise(e)), [], 'first-party errors while the Walkthrough was used with the layer on');
});

// ================================================================== 13 static
suite.test('T0-MONL-13', 'static: the 18 anchors of the group matched once each, the entry carries the runtime once, KF is a thin hook (the legacy per-frame loop cannot run), no screen-fixed star overlay script', async (t) => {
  needMon();
  const count = (s, src = ENTRY_TEXT) => src.split(s).length - 1;
  assertEq([count('const GTMON='), count('function GtMonLegacyKF('), count('GTMON.useDesktop(')], [1, 1, 1], 'runtime, renamed legacy KF, desktop hook');
  assertEq(count('function KF({mapRef:c,showMonuments:f,onWalkthrough:w,onShow:s}){return GTMON.useDesktop(c,f,w,s)}'), 1, 'the live KF is the one-line hook (no requestAnimationFrame loop, no per-frame setState)');
  assertEq([count('GTMON.attach($t,{layout:"phone"'), count('GTMON.toggle()'), count('gtMon:!0')], [1, 1, 1], 'phone attach, tile action, tile flag');
  const anchors = path.join(path.dirname(DIST), 'anchors.json');
  if (fs.existsSync(anchors)) {
    const a = JSON.parse(fs.readFileSync(anchors, 'utf8')); const mon = a.patches.filter((x) => x.group === 'MON');
    t.note('MON anchors', mon.map((x) => `${x.id}: ${x.found}/${x.expect}`));
    assertEq(mon.length, 18, 'MON patches in anchors.json'); assert(mon.every((x) => x.ok && x.found === x.expect), 'every MON anchor matched exactly the expected number of times');
    assert(a.groups.includes('MON'), 'MON is listed in the build groups');
  } else t.note('anchors.json', 'not found next to the dist: anchor counts not re-checked');
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  assert(!/gtbg-monuments-overlay/.test(html), 'the screen-fixed star overlay script is back in index.html: two systems would draw monuments');
  const gate = path.join(path.dirname(DIST), 'gate.json');
  if (fs.existsSync(gate)) { const g = JSON.parse(fs.readFileSync(gate, 'utf8')); t.note('gate.json', { ok: g.ok, failed: (g.checks || []).filter((c) => !c.ok).map((c) => c.id) }); assert(g.ok !== false && !(g.checks || []).some((c) => !c.ok), 'the build gates of this tree did not all pass'); }
  t.note('runtime bytes in the entry', ENTRY_TEXT.slice(ENTRY_TEXT.indexOf('const GTMON='), ENTRY_TEXT.indexOf('function KF({mapRef:c,showMonuments:f,onWalkthrough')).length);
});

suite.test('T0-MONL-X', 'every browser test of this run: 0 uncaught exceptions and 0 first-party console.error', async (t) => {
  const open2 = [F.D].filter(Boolean); if (!open2.length) throw new Skip('no browser session in this run');
  for (const S of open2) { t.note('tile requests in the desktop session', S.tileStats.seen); t.note('ignored tile noise', S.collector.ignored); const e = S.collector.firstParty.filter((x) => !isGoogleNoise(x)); assertEq(e.map((x) => `${x.kind}: ${x.text}`), [], 'first-party errors in the desktop session'); }
});

// ------------------------------------------------------------------ run
const outFile = path.join(resultsDir, (IS_LEGACY ? 'test-monuments-legacy.json' : IS_BASELINE ? 'test-monuments-baseline.json' : 'test-monuments.json'));
const GUARDS = new Set(['T0-MONL-12', 'T0-MONL-13', 'T0-MONL-X']);
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST), groups: GROUPS, hasMon: HAS_MON, mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await srv.close();
}
if (EXPECT_RED) {
  const feature = summary.results.filter((r) => !GUARDS.has(r.id) && r.status !== 'skip');
  const allRed = feature.length > 0 && feature.every((r) => r.status === 'fail');
  console.log(allRed ? `expected-red: all ${feature.length} feature tests failed on this tree (red-first proven; guards are exempt)` : `expected-red VIOLATED: passed on this tree: ${feature.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);
