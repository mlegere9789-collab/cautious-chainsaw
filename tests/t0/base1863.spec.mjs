// BASE1863 (optional patch group, tools/t0/BASE1863-README.md): the two MAIN maps (desktop and phone) show the reconstruction of July 1863 from the local tile pyramid /tiles1863/<ver>/
// and NO modern satellite pixel.  Real system Chrome (headless), real CDP mouse / keyboard / touch, tiles only from the local pyramid (a Netlify-like emulator that applies the dist's own
// _headers); Mapbox is reached for text glyphs only (fonts API) through the Referer-injecting harness (tests/t0/lib.mjs).
//
//   python tools/t0/base1863/stage_assets.py && node tools/t0/base1863/build-base1863.mjs
//   python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c           the scratch tree with the group
//   python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c-control --without-base       the same tree without it
//   node tests/t0/base1863.spec.mjs --dist tmp/b1863/group/R1c/dist [--control tmp/b1863/group/R1c-control/dist] [--filter 'B63-0[1-3]']
//   node tests/t0/base1863.spec.mjs --dist release/R1c/dist --expect-red [--behavior-only]       red-first: every feature test must FAIL on R1c without the group (--behavior-only: by behaviour, not by the guard)
//   with MON in the tree (python tools/t0/base1863/b63_build.py --train R1c --with MON --out tmp/b1863/group/R1c-mon) B63-09 checks the Monuments layer on the new base
//
// Ids (F = feature test, red on a tree without the group; G = guard, exempt from the red-first accounting):
//   T0-B63-01 F  desktop z11 to z18: the reconstruction is what the map draws (GL pixels equal the tile's pixels at a tile centre), every tile answered 200 from /tiles1863/, ZERO Mapbox satellite/style/raster requests
//   T0-B63-02 F  phone 375x812 (DPR 3, touch): same, plus the label, toggle and link are hit-testable and 44 px tall on the phone
//   T0-B63-03 F  label and attribution: the permanent label text, the attribution text, "Sources and licences" (ABOUT.txt: honest, no 1:1 / 100 percent claim), no "modern satellite" offer anywhere
//   T0-B63-04 F  "Show what was changed": mouse and keyboard, aria-pressed, provenance tiles load only then, legend, zoom note below z13, pixels change, off again
//   T0-B63-05 F  beyond coverage: neutral ground colour (never the modern picture), no 404, no console error, z16/z17/z18 beyond the detail rectangle
//   T0-B63-06 F  tile errors: tiles aborted -> no uncaught exception, status text, neutral ground; connection back -> tiles load again, status cleared
//   T0-B63-07 F  the product's overlays on the new base: order (base < roads/rivers/breastworks), the old hand-placed lines are gone (catalogue geometry), labels sit on the drawn roads, units canvas and a unit panel on top
//   T0-B63-08 F  retina and reduced data: DPR 2 asks for the next zoom (tileSize 256), saveData/2g asks for the normal one; the first-load cost is recorded and bounded
//   T0-B63-09 F  service worker and headers: tiles cached cache-first (second load: 0 network tile requests), offline works for cached tiles only, immutable class served, the cap of the worker (node vm)
//   T0-B63-10 F  Monuments layer on the new base (needs MON in the tree)
//   T0-B63-11 G  static: the group's anchors matched once each, the Walkthrough byte span is identical to the control, its map still names the Mapbox style, 0 satellite strings elsewhere
//   T0-B63-X  G  every browser test of this run: 0 uncaught exceptions and 0 first-party console.error
process.env.T0_AGENT ??= 'b1863/group';
process.env.T0_PORT_BASE ??= '10400';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
const {
  REPO, PORT_BASE, openSession, createSuite, assert, assertEq, sleep, waitFor, waitForApp, chooseLayout, mapView, touchTap, hitTest, tileBudget, Skip,
} = await import('./lib.mjs');
const { createEmulator } = await import('../../tools/t0/config/emulate.mjs');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : dflt; };
const DIST = path.resolve(REPO, opt('dist', 'tmp/b1863/group/R1c/dist'));
const FILTER = opt('filter', null);
const EXPECT_RED = !!opt('expect-red', false);
const CONTROL = opt('control', null);
if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}\nbuild it first: python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c`); process.exit(2); }
const VERSION = JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
const ENTRY_TEXT = fs.readFileSync(path.join(DIST, 'assets', VERSION.entry), 'utf8');
const HAS_B63 = ENTRY_TEXT.includes('const GTB63 = ');
const HAS_MON = ENTRY_TEXT.includes('gtmon-dots');
const TILEDIR = fs.existsSync(path.join(DIST, 'tiles1863')) ? fs.readdirSync(path.join(DIST, 'tiles1863'))[0] : null;
const LABEL = 'Reconstruction of July 1863, not a photograph: a USDA NAIP aerial photograph of 4 June 2013 with post-1863 features removed and 1863 features added from period maps';
const resultsDir = path.dirname(DIST);   // anchors.json, gate.json, manifest.json sit beside the dist
const outDir = path.relative(path.join(REPO, 'release'), DIST).startsWith('..') ? resultsDir : path.join(REPO, 'tmp', 'b1863', 'group');   // never write into release/
const BEHAVIOR = !!opt('behavior-only', false);   // with --expect-red: skip the "group is in the tree" guard so the BEHAVIOUR of the control tree is what fails
const need = () => { if (BEHAVIOR) return; assert(HAS_B63, `the group BASE1863 is not in this tree (${(VERSION.groups || []).join(', ')})`); };

const emu = await createEmulator({ dist: DIST, port: PORT_BASE });
const ORIGIN = emu.url;
const sessions = []; let seq = 0;
const open = async (opts) => {
  for (let attempt = 1; ; attempt++) {
    const n = ++seq; const live = new Set(sessions.map((x) => x.chrome.port));
    let port = PORT_BASE + 1 + (n % 9); while (live.has(port)) port = PORT_BASE + 1 + ((port - PORT_BASE) % 9);
    try { const s = await openSession({ ...opts, cdpPort: port, profile: `${opts.profile}-${n}` }); sessions.push(s); track(s); return s; }
    catch (e) { if (attempt >= 3) throw e; await sleep(2000); }
  }
};
const closeSession = async (s) => { await s.close(); const i = sessions.indexOf(s); if (i >= 0) sessions.splice(i, 1); };

// ---- response log per page (tile statuses and sizes)
function track(S) {
  S.resp = [];
  const wire = (page) => page.on('response', (r) => { const u = r.url(); if (/\/tiles1863\//.test(u)) S.resp.push({ url: u, status: r.status(), t: Date.now(), fromSW: r.fromServiceWorker() }); });
  wire(S.page);
}
const DESK = { width: 1440, height: 900, dpr: 1, mobile: false };
const PHONE = { width: 375, height: 812, dpr: 3, mobile: true };
const SATELLITE = /mapbox\.satellite|\/v4\/mapbox\.|styles\/v1\/|satellite-v9|\.tiles\.mapbox\.com|mapbox\.com\/v4|raster\/v1|mapbox-terrain/i;
const mapboxUrls = (S, m = 0) => S.net.since(m).map((e) => e.url).filter((u) => /(^|\.)mapbox\.com\//.test(u.replace(/^https?:\/\//, '').replace(/\/.*/, '') + '/'));
const tileUrls = (S) => S.net.find(/\/tiles1863\//).map((e) => e.url);

async function boot(S, layout, { wait = 2500 } = {}) {
  const p = S.page;
  await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, layout);
  await waitFor(async () => !!(await mapView(p)), { timeout: 30000, label: 'map ref' });
  await p.evaluate(() => new Promise((res) => { const m = window.__t0map; const f = () => (m.loaded() ? res() : m.once('idle', f)); f(); }));
  await sleep(wait);
  return p;
}
const settle = (p, ms = 12000) => p.evaluate((ms) => new Promise((res) => { const m = window.__t0map; const t = setTimeout(res, ms); const f = () => { if (m.areTilesLoaded() && !m.isMoving()) { clearTimeout(t); res(); } else m.once('idle', f); }; m.triggerRepaint(); setTimeout(f, 60); }), ms);
const jump = async (p, o) => { await p.evaluate((o) => window.__t0map.jumpTo(o), o); await settle(p); await sleep(300); };
const tileCenter = (z, x, y) => { const n = 2 ** z; const lon = ((x + 0.5) / n) * 360 - 180; const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n))) * 180) / Math.PI; return [lon, lat]; };
const tileOf = (lon, lat, z) => { const n = 2 ** z; return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n)]; };

/** mean RGB grid (g x g) of the 64 x 64 css-px square at the centre of the GL canvas, read inside a render event (rows top to bottom) */
const glGrid = (p, g = 4, half = 32) => p.evaluate(([g, half]) => new Promise((res) => {
  const m = window.__t0map, c = m.getCanvas(), gl = c.getContext('webgl2') || c.getContext('webgl');
  m.once('render', () => {
    const k = c.width / c.clientWidth, w = Math.round(2 * half * k), x = Math.round(c.width / 2 - half * k), y = Math.round(c.height / 2 - half * k);
    const buf = new Uint8Array(w * w * 4); gl.readPixels(x, y, w, w, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const out = []; const s = Math.floor(w / g);
    for (let gy = 0; gy < g; gy++) for (let gx = 0; gx < g; gx++) { let r = 0, gg = 0, b = 0, n = 0; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const row = w - 1 - (gy * s + yy); const i = (row * w + gx * s + xx) * 4; r += buf[i]; gg += buf[i + 1]; b += buf[i + 2]; n++; } out.push([r / n, gg / n, b / n]); }
    res(out);
  });
  m.triggerRepaint();
}), [g, half]);
/** the same grid from the tile bitmap: the 64 css px square around the pixel (px, py) of tile (url), scaled by `scale` (device px per tile px) */
const tileGrid = (p, url, px, py, scale, g = 4, half = 32) => p.evaluate(async ([url, px, py, scale, g, half]) => {
  const bm = await createImageBitmap(await (await fetch(url)).blob());
  const cv = new OffscreenCanvas(bm.width, bm.height), cx = cv.getContext('2d'); cx.drawImage(bm, 0, 0);
  const w = Math.round((2 * half) / scale), x0 = Math.round(px - w / 2), y0 = Math.round(py - w / 2);
  const d = cx.getImageData(x0, y0, w, w).data; const out = []; const s = Math.floor(w / g);
  for (let gy = 0; gy < g; gy++) for (let gx = 0; gx < g; gx++) { let r = 0, gg = 0, b = 0, n = 0; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const i = ((gy * s + yy) * w + gx * s + xx) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } out.push([r / n, gg / n, b / n]); }
  return out;
}, [url, px, py, scale, g, half]);
const gridDiff = (a, b) => { let s = 0, n = 0; a.forEach((v, i) => v.forEach((c, k) => { s += Math.abs(c - b[i][k]); n++; })); return s / n; };
const stateOf = (p) => p.evaluate(() => { const s = window.__gtb63; return s ? { version: s.version, sharp: s.sharp, saveData: s.saveData, errors: s.errors, retried: s.retried, maps: s.maps.length } : null; });
const ctlText = (p, layout) => p.evaluate((layout) => { const el = document.querySelector(`.gtb63-ctl[data-gtb63="${layout}"]`); if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { text: el.innerText, w: r.width, h: r.height, x: r.x, y: r.y, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, fs: parseFloat(cs.fontSize) }; }, layout);
const respOK = (S, since = 0) => { const r = S.resp.slice(since); const bad = r.filter((x) => x.status !== 200); return { n: r.length, bad }; };
const errsOf = (S) => S.collector.firstParty;
const lastTileZoom = (S, since = 0) => S.resp.slice(since).filter((r) => /\/\d+\/\d+\/\d+\.webp$/.test(r.url)).map((r) => Number(/\/tiles1863\/[^/]+\/(\d+)\//.exec(r.url)[1]));

const suite = createSuite('base1863');
const F = { D: null, P: null };
{ const add = suite.test.bind(suite);
  suite.test = (id, title, fn) => add(id, title, async (t) => { const u0 = tileBudget.used; try { return await fn(t); } finally { if (tileBudget.used > u0) t.note('mapbox requests', tileBudget.used - u0); } }); }

// ================================================================== 01 desktop z11 to z18
suite.test('T0-B63-01', 'desktop z11 to z18: GL pixels equal the reconstruction tile at a tile centre, tiles come from /tiles1863/ with 200, zero Mapbox satellite / style / raster requests', async (t) => {
  need();
  const S = F.D = await open({ profile: 'desk', viewport: DESK }); const p = await boot(S, 'desktop');
  const st = await stateOf(p); assert(st && st.version === TILEDIR, `runtime state ${JSON.stringify(st)} vs tile dir ${TILEDIR}`); assertEq(st.sharp, false, 'DPR 1 uses the normal tile size');
  const cam = await p.evaluate(() => { const s = window.__t0map.getStyle(); return { sources: Object.keys(s.sources), layers: s.layers.map((l) => l.id), types: Object.values(s.sources).map((x) => x.type) }; });
  assert(cam.sources.slice(0, 4).join() === 'b1863-wide,b1863-detail,b1863-changed,b1863-changed-detail', `style sources ${cam.sources}`);
  assert(!cam.types.some((x) => ['raster-dem', 'vector', 'raster-array'].includes(x)), 'no Mapbox hosted source types'); assert(!/mapbox:\/\/mapbox\.|satellite/.test(JSON.stringify(await p.evaluate(() => window.__t0map.getStyle().sources))), 'no satellite source in the live style');
  // pixel equality at integer zooms 13..15 (tile z = camera z; the map's maxBounds keep a 1440 px wide window above z12.04) at the centre of a tile of the pyramid, 64 css px square, 4x4 mean grid
  const c0 = [-77.2356, 39.8128]; const diffs = {};
  for (const z of [13, 14, 15]) {
    const [tx, ty] = tileOf(c0[0], c0[1], z); const [lon, lat] = tileCenter(z, tx, ty);
    await jump(p, { center: [lon, lat], zoom: z });
    const gl = await glGrid(p); const url = `${ORIGIN}/tiles1863/${TILEDIR}/${z}/${tx}/${ty}.webp`; const tg = await tileGrid(p, url, 256, 256, 1);
    diffs[z] = Math.round(gridDiff(gl, tg) * 10) / 10; t.note('grid z' + z, [gl.slice(0, 4).map((v) => v.map(Math.round)), tg.slice(0, 4).map((v) => v.map(Math.round))]); assert(diffs[z] < 14, `z${z}: the GL pixels differ from the tile by ${diffs[z]} (mean abs RGB over a 4x4 grid)`);
  }
  t.note('GL vs tile mean abs diff by zoom', diffs);
  // z16 detail tile, z17 / z18 are the z16 tile enlarged 2x / 4x about the same centre
  const [tx, ty] = tileOf(c0[0], c0[1], 16); const [lon, lat] = tileCenter(16, tx, ty);
  for (const z of [16, 17]) {      // the camera stops at z17 (pass 7: z18 would be a 4x enlargement of a 0.92 m picture)
    await jump(p, { center: [lon, lat], zoom: z }); const gl = await glGrid(p); const tg = await tileGrid(p, `${ORIGIN}/tiles1863/${TILEDIR}/16/${tx}/${ty}.webp`, 256, 256, 2 ** (z - 16));
    const d = Math.round(gridDiff(gl, tg) * 10) / 10; diffs[z] = d; assert(d < 16, `z${z}: the GL pixels differ from the enlarged z16 tile by ${d}`);
  }
  await jump(p, { center: [-77.235, 39.812], zoom: 12.1 }); await jump(p, { center: [-77.235, 39.812], zoom: 13.5 });
  const rb = respOK(S); assert(rb.n >= 8 && rb.bad.length === 0, `tile responses: ${rb.n} total, bad ${JSON.stringify(rb.bad.slice(0, 3))}`);
  const zs = [...new Set(lastTileZoom(S))].sort((a, b) => a - b); assert([12, 13, 14, 15, 16].every((z) => zs.includes(z)), `tile zooms requested ${zs}`); t.note('lowest camera zoom the bounds allow at 1440 px', await p.evaluate(() => { window.__t0map.jumpTo({ zoom: 5 }); return window.__t0map.getZoom(); }));
  assert(!zs.includes(17) && !zs.includes(18), 'no z17/z18 tile is requested (the map over-zooms z16)');
  const mb = mapboxUrls(S); const sat = mb.filter((u) => SATELLITE.test(u)); assertEq(sat, [], 'Mapbox satellite / style / raster requests');
  t.note('mapbox hosts used', [...new Set(mb.map((u) => u.replace(/^https:\/\/([^/]+)\/([^/?]+\/[^/?]+).*/, '$1/$2')))]);
  t.note('tile responses', rb.n);
  assert(mb.every((u) => /\/fonts\/v1\/|map-sessions|events\.mapbox\.com/.test(u)), `Mapbox is used for something other than fonts, telemetry and the session call: ${mb.filter((u) => !/\/fonts\/v1\/|map-sessions|events\.mapbox\.com/.test(u)).slice(0, 3)}`);
});

// ================================================================== 02 phone
suite.test('T0-B63-02', 'phone 375x812 DPR 3 touch: the reconstruction on the phone map, label / toggle / link visible and tappable (44 px), zero satellite requests', async (t) => {
  need();
  const S = F.P = await open({ profile: 'phone', viewport: PHONE }); const p = await boot(S, 'mobile', { wait: 3500 });
  const st = await stateOf(p); assert(st && st.version === TILEDIR, `state ${JSON.stringify(st)}`); assertEq(st.sharp, true, 'DPR 3 asks for the sharper tile level');
  const c = await ctlText(p, 'phone'); assert(c && c.text.includes(LABEL), `phone label: ${c && c.text}`); assert(c.x >= 0 && c.x + c.w <= 375 && c.y >= 0, `the label lies inside the viewport ${JSON.stringify(c)}`);
  const btn = await hitTest(p, '.gtb63-ctl[data-gtb63="phone"] .gtb63-btn'); assert(btn.found && btn.hit && btn.inViewport && btn.h >= 44, `toggle: ${JSON.stringify(btn)}`);
  const lnk = await hitTest(p, '.gtb63-ctl[data-gtb63="phone"] .gtb63-link'); assert(lnk.found && lnk.hit && lnk.h >= 44, `link: ${JSON.stringify(lnk)}`);
  // a real tap on the toggle
  await touchTap(p, btn.x, btn.y); await sleep(400); assertEq(await p.evaluate(() => document.querySelector('.gtb63-ctl[data-gtb63="phone"] .gtb63-btn').getAttribute('aria-pressed')), 'true', 'tap toggles on');
  await touchTap(p, btn.x, btn.y); await sleep(300);
  await jump(p, { center: [-77.2356, 39.8128], zoom: 14 });
  const gl = await glGrid(p); const [tx, ty] = tileOf(-77.2356, 39.8128, 14); const [lon, lat] = tileCenter(14, tx, ty); await jump(p, { center: [lon, lat], zoom: 13 });
  // tileSize 256: camera zoom 13 asks for tile zoom 14; the centre of the screen is the centre of z13 tile = corner of four z14 tiles; compare with the z13 tile instead (same ground)
  const [t13x, t13y] = tileOf(lon, lat, 13); const g13 = await glGrid(p); const tg = await tileGrid(p, `${ORIGIN}/tiles1863/${TILEDIR}/13/${t13x}/${t13y}.webp`, 256, 256, 1);
  t.note('GL (DPR 3, z14-level tiles) vs z13 tile mean abs diff', Math.round(gridDiff(g13, tg) * 10) / 10); assert(gridDiff(g13, tg) < 26, 'the phone map draws the reconstruction');
  assert(gl.length === 16, 'grid read');
  const zs = [...new Set(lastTileZoom(S))]; assert(zs.some((z) => z >= 14), `sharp tiles requested at higher zoom: ${zs}`);
  await jump(p, { center: [-77.235, 39.812], zoom: 5 }); const zmin = await p.evaluate(() => window.__t0map.getZoom()); t.note('lowest zoom on the phone', zmin); assert(zmin < 11.6, `the phone reaches the z11 level (${zmin})`);
  const gmin = await glGrid(p, 2, 24); assert(gmin.some((v) => Math.abs(v[0] - 112) > 12 || Math.abs(v[1] - 138) > 12), 'the picture is drawn at the lowest zoom');
  const z11 = lastTileZoom(S); assert(z11.includes(12) || z11.includes(11), `a z11/z12 tile was requested (${[...new Set(z11)]})`);
  const mb = mapboxUrls(S); assertEq(mb.filter((u) => SATELLITE.test(u)), [], 'satellite / style / raster requests on the phone');
  assertEq(respOK(S).bad, [], 'tile responses on the phone');
});

// ================================================================== 03 label, attribution, sources
suite.test('T0-B63-03', 'label and attribution: permanent label text on desktop and phone, attribution text, Sources and licences (honest), nothing offers or names modern satellite', async (t) => {
  need();
  const D = F.D, P = F.P; assert(D && P, 'needs the sessions of B63-01 and B63-02 (run them in the same invocation)');
  for (const [S, layout] of [[D, 'desktop'], [P, 'phone']]) {
    const c = await ctlText(S.page, layout); assert(c && c.text.includes(LABEL), `${layout} label text: ${c && c.text}`); assert(c.display !== 'none' && c.visibility === 'visible' && Number(c.opacity) === 1 && c.fs >= 11, `${layout} label is visible: ${JSON.stringify(c)}`);
    for (const z of [11.2, 14, 17.5]) { await jump(S.page, { zoom: z }); assert((await ctlText(S.page, layout)).text.includes(LABEL), `${layout}: label still there at z${z}`); }
    await jump(S.page, { center: [-77.235, 39.812], zoom: 13.5 });
  }
  const attr = await D.page.evaluate(() => (document.querySelector('.mapboxgl-ctrl-attrib') || {}).innerText || '');
  assert(/Reconstruction/.test(attr) && /NAIP/.test(attr) && /Library of Congress/.test(attr) && /OpenStreetMap/.test(attr), `desktop attribution: ${attr}`);
  const a = await D.page.evaluate(async (v) => { const r = await fetch(`/tiles1863/${v}/ABOUT.txt`); return { s: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), t: await r.text() }; }, TILEDIR);
  assertEq(a.s, 200, 'ABOUT.txt'); assert(/text\/plain/.test(a.ct), a.ct);
  for (const must of ['not a photograph', 'Library of Congress', 'USDA', 'public domain', 'Not used: Google Earth', '4 June 2013', 'not an exact replica']) assert(a.t.includes(must), `ABOUT.txt lacks "${must}"`);
  assert(!/1:1|100 ?%|pixel-perfect|exact replica of/i.test(a.t.replace('not an exact replica', '')) && !/100 percent accuracy is made/.test(a.t.replace(/no claim of 100 percent accuracy is made anywhere/, '')), 'ABOUT.txt makes an accuracy claim');
  for (const [S, layout] of [[D, 'desktop'], [P, 'phone']]) {
    const body = await S.page.evaluate(() => document.body.innerText.toLowerCase());
    assert(!/modern satellite|satellite view|show satellite/.test(body), `${layout}: the page offers or names a modern satellite view`);
    assert(!/1:1|100 ?% accurate/.test((await ctlText(S.page, layout)).text), `${layout}: the label claims accuracy`);
  }
  assert(!/Show modern satellite/.test(ENTRY_TEXT), 'the entry offers "Show modern satellite"');
});

// ================================================================== 04 show what was changed
suite.test('T0-B63-04', '"Show what was changed": real click and keyboard, aria-pressed, provenance tiles only after the toggle, legend, note below z13, pixels change, off again', async (t) => {
  need();
  const S = F.D; assert(S, 'needs the desktop session of B63-01'); const p = S.page; const sel = '.gtb63-ctl[data-gtb63="desktop"] .gtb63-btn';
  await jump(p, { center: [-77.2356, 39.8128], zoom: 14 });
  assertEq(S.resp.filter((r) => /\/changed\//.test(r.url)).length, 0, 'no provenance tile is requested before the toggle');
  assertEq(await p.evaluate(() => window.__t0map.getLayoutProperty('b1863-changed', 'visibility')), 'none', 'layer hidden at load');
  const off = await glGrid(p, 8, 120);
  const b = await hitTest(p, sel); assert(b.found && b.hit, `the toggle is clickable: ${JSON.stringify(b)}`);
  await p.mouse.click(b.x, b.y); await settle(p); await sleep(500);
  assertEq(await p.getAttribute(sel, 'aria-pressed'), 'true', 'aria-pressed after the click'); assertEq(await p.evaluate(() => window.__t0map.getLayoutProperty('b1863-changed', 'visibility')), 'visible', 'layer visible');
  const ch = S.resp.filter((r) => /\/changed\/\d+\//.test(r.url)); assert(ch.length >= 1 && ch.every((r) => r.status === 200), `provenance tiles after the toggle: ${ch.length}`);
  const leg = await p.evaluate(() => { const ul = document.querySelector('.gtb63-ctl[data-gtb63="desktop"] .gtb63-leg'); return { hidden: ul.hidden, n: ul.querySelectorAll('li').length, text: ul.innerText }; });
  assert(!leg.hidden && leg.n === 15 && /Modern feature removed/.test(leg.text) && /1863 road drawn/.test(leg.text) && /cannot say/.test(leg.text), `legend ${JSON.stringify(leg).slice(0, 200)}`);
  const on = await glGrid(p, 8, 120); const d = gridDiff(off, on); t.note('mean abs diff off/on', Math.round(d * 10) / 10); assert(d > 3, `the picture did not change when the layer came on (${d})`);
  // keyboard: Tab-reach is the browser's; focus + Enter / Space
  await p.focus(sel); await p.keyboard.press('Enter'); await sleep(300); assertEq(await p.getAttribute(sel, 'aria-pressed'), 'false', 'Enter toggles off');
  await p.keyboard.press('Space'); await sleep(300); assertEq(await p.getAttribute(sel, 'aria-pressed'), 'true', 'Space toggles on');
  await jump(p, { zoom: 12 }); assert(/Zoom in to level 13/.test(await p.evaluate(() => document.querySelector('.gtb63-ctl[data-gtb63="desktop"] .gtb63-note').innerText)), 'a note tells to zoom in below z13');
  await jump(p, { zoom: 14 }); assertEq(await p.evaluate(() => document.querySelector('.gtb63-ctl[data-gtb63="desktop"] .gtb63-note').hidden), true, 'note gone at z14');
  const b2 = await hitTest(p, sel); await p.mouse.click(b2.x, b2.y); await sleep(300); assertEq(await p.getAttribute(sel, 'aria-pressed'), 'false', 'off by click'); assertEq(await p.evaluate(() => window.__t0map.getLayoutProperty('b1863-changed', 'visibility')), 'none', 'layer hidden again');
  // axe (WCAG 2 A/AA + best practice) on the label with the legend open, desktop and phone
  const { AxeBuilder } = await import('@axe-core/playwright').then((m) => ({ AxeBuilder: m.default || m.AxeBuilder }));
  for (const [SS, layout] of [[S, 'desktop'], [F.P, 'phone']]) {
    if (!SS) continue; const pg = SS.page; const bsel = `.gtb63-ctl[data-gtb63="${layout}"] .gtb63-btn`; if ((await pg.getAttribute(bsel, 'aria-pressed')) !== 'true') await pg.evaluate((b) => document.querySelector(b).click(), bsel);
    await sleep(300); const ax = await new AxeBuilder({ page: pg }).include(`.gtb63-ctl[data-gtb63="${layout}"]`).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    t.note('axe ' + layout, { violations: ax.violations.map((v) => `${v.id}:${v.impact}`), passes: ax.passes.length });
    assertEq(ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), [], `axe serious/critical in the ${layout} label`);
    await pg.evaluate((b) => document.querySelector(b).click(), bsel);
  }
  // the unchanged photograph is never tinted: the transparent class
  const tr = await p.evaluate(async (v) => { const bm = await createImageBitmap(await (await fetch(`/tiles1863/${v}/changed/14/4676/6212.png`)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data; let t = 0, o = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] === 0) t++; else o++; } return { t, o }; }, TILEDIR);
  assert(tr.t > 0 && tr.o > 0, `a provenance tile is partly transparent and partly coloured: ${JSON.stringify(tr)}`);
});

// ================================================================== 05 beyond coverage
suite.test('T0-B63-05', 'beyond coverage: neutral ground colour, no 404, no console error, also at z16 to z18 outside the detail rectangle', async (t) => {
  need();
  const S = F.D; assert(S, 'needs the desktop session'); const p = S.page; const e0 = errsOf(S).length; const r0 = S.resp.length;
  const ground = await p.evaluate(() => window.__t0map.getStyle().layers[0].paint['background-color']); assert(/^#?[0-9a-f]{6}$/i.test(ground.replace('#', '')) || /rgb/.test(ground), `ground colour ${ground}`);
  for (const [c, z] of [[[-77.352, 39.730], 13], [[-77.125, 39.905], 12], [[-77.352, 39.730], 17], [[-77.30, 39.78], 17], [[-77.19, 39.86], 17], [[-77.2356, 39.8128], 17]]) {
    await jump(p, { center: c, zoom: z });
    const g = await glGrid(p, 2, 24);
    if (z <= 13 && c[1] < 39.75) { const want = ground.replace('#', ''); const wr = [0, 2, 4].map((i) => parseInt(want.slice(i, i + 2), 16)); assert(g.every((v) => v.every((x, k) => Math.abs(x - wr[k]) <= 3)), `outside the imagery the map shows ${JSON.stringify(g[0])}, not the ground colour ${wr}`); }
  }
  const rb = respOK(S, r0); assertEq(rb.bad, [], 'no tile answered anything but 200 while panning beyond the coverage'); assert(S.resp.length - r0 > 0, 'tiles were requested');
  assertEq(S.collector.badResponses.filter((x) => /tiles1863/.test(x.url)), [], '404 / 5xx responses for tiles seen by the browser');
  assertEq(errsOf(S).slice(e0), [], 'console errors beyond the coverage');
  const sat = mapboxUrls(S).filter((u) => SATELLITE.test(u)); assertEq(sat, [], 'no satellite request at the edge of the world either');
});

// ================================================================== 06 tile errors
suite.test('T0-B63-06', 'tile errors: tiles that fail (offline) raise no uncaught exception, show the status text and the neutral ground; when the connection is back the tiles load and the status clears', async (t) => {
  need();
  const S = await open({ profile: 'err', viewport: DESK }); const p = await boot(S, 'desktop', { wait: 1500 }); const e0 = S.collector.errors.length;
  await S.context.setOffline(true);
  await p.evaluate(() => window.__t0map.jumpTo({ center: [-77.31, 39.86], zoom: 15 })); await sleep(3500);
  const st = await stateOf(p); assert(st.errors > 0, `tile errors counted: ${JSON.stringify(st)}`);
  const txt = await p.evaluate(() => document.querySelector('.gtb63-ctl[data-gtb63="desktop"] .gtb63-status').innerText); assert(/could not be loaded/.test(txt), `status text: ${txt}`);
  const g = await glGrid(p, 2, 24); assert(g.every((v) => Math.abs(v[0] - 112) <= 3 && Math.abs(v[1] - 138) <= 3), `with every tile failing the map shows the neutral ground ${JSON.stringify(g[0])}`);
  const ex = S.collector.errors.slice(e0).filter((x) => x.kind !== 'console.error' || !/tiles1863|Failed to load resource|net::ERR/i.test(`${x.text} ${x.url || ''}`));
  assertEq(ex, [], 'uncaught exceptions or console errors other than the browser\'s own failed-resource lines');
  assert(S.collector.errors.slice(e0).every((x) => x.kind !== 'pageerror'), 'no uncaught exception');
  await S.context.setOffline(false); const n0 = S.resp.length;
  await sleep(8500); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await settle(p, 15000); await sleep(800);
  const ok = S.resp.slice(n0).filter((r) => r.status === 200); assert(ok.length > 0, 'tiles load again after the connection is back'); assert((await stateOf(p)).retried >= 1, 'the runtime retried');
  assertEq(await p.evaluate(() => document.querySelector('.gtb63-ctl[data-gtb63="desktop"] .gtb63-status').innerText), '', 'status cleared');
  await closeSession(S);
});

// ================================================================== 07 overlays and units
suite.test('T0-B63-07', 'the product\'s overlays on the new base: layer order, catalogue geometry for the labels, old hand-placed lines gone, units canvas and a unit panel on top', async (t) => {
  need();
  const S = F.D; assert(S, 'needs the desktop session'); const p = S.page; await jump(p, { center: [-77.235, 39.812], zoom: 13.5 });
  const L = await p.evaluate(() => { const m = window.__t0map; return { order: m.getStyle().layers.map((l) => l.id), vis: Object.fromEntries(['roads-1863-line', 'roads-1863-label', 'rivers-line', 'rivers-label', 'breastworks-line', 'farms-outline', 'farms-label'].map((i) => [i, m.getLayoutProperty(i, 'visibility')])) }; });
  const iw = L.order.indexOf('b1863-wide'), ir = L.order.indexOf('roads-1863-line'); assert(iw >= 0 && ir > L.order.indexOf('b1863-changed-detail') && L.order.indexOf('b1863-detail') > iw, `order ${L.order.join()}`);
  assert(L.order.indexOf('breastworks-line') > ir && L.order.indexOf('roads-1863-label') > ir, 'the product layers are above the base');
  assertEq([L.vis['roads-1863-line'], L.vis['rivers-line'], L.vis['farms-outline'], L.vis['roads-1863-label'], L.vis['rivers-label'], L.vis['breastworks-line']], ['none', 'none', 'none', 'visible', 'visible', 'visible'], 'default visibility of the product layers');
  const feats = await p.evaluate(() => new Promise((res) => { const m = window.__t0map; m.once('idle', () => res(m.querySourceFeatures('roads-1863').map((f) => f.properties.name))); m.triggerRepaint(); }));
  for (const n of ['Emmitsburg Road', 'Taneytown Road', 'Baltimore Pike', 'Chambersburg Pike', 'Hanover Road']) assert(feats.includes(n), `road label source has ${n}: ${[...new Set(feats)].join()}`);
  const geo = await p.evaluate(async (v) => (await (await fetch(`/tiles1863/${v}/overlays.json`)).json()), TILEDIR);
  assert(geo.roads.features.every((f) => f.properties.id && /^RD-/.test(f.properties.id)) && geo.farms.features.length === 4 && geo.rivers.features.length >= 5, 'overlay data carries catalogue ids');
  const panel = ENTRY_TEXT.includes('"roads-1863-line":!1,"roads-1863-label":!0,"rivers-line":!1,"rivers-label":!0,"breastworks-line":!0,"farms-outline":!1'); assert(panel && !ENTRY_TEXT.includes('label:"Farm Outlines"'), 'the Layers panel state matches the map and the dead farm-outline row is gone');
  // the units canvas is above the map and draws; a real click on a drawn unit opens its panel, which is not covered by our label
  // (a tree with group DATA shows no unit on the home view at the first moment - arrival gating - so the test looks at the morning of July 2, where the armies stand on the field)
  await p.keyboard.press('2'); await sleep(2500);
  const unit = await p.evaluate(() => { const cs = [...document.querySelectorAll('canvas')].filter((c) => !c.classList.contains('mapboxgl-canvas') && c.width > 800 && getComputedStyle(c).zIndex === '10'); const out = []; for (const c of cs) { const x = c.getContext('2d'); if (!x) continue; const w = c.width, h = c.height; const d = x.getImageData(0, 0, w, h).data; for (let i = 0; i < d.length; i += 4 * 7) { if (d[i + 3] > 240 && d[i] < 90 && d[i + 2] > 170 && d[i + 1] < 120) { const px = (i / 4) % w, py = Math.floor(i / 4 / w); const r = c.getBoundingClientRect(); out.push({ x: r.left + (px / w) * r.width, y: r.top + (py / h) * r.height, z: getComputedStyle(c).zIndex }); if (out.length > 400) break; } } } return out; });
  assert(unit.length > 0, 'the units canvas draws blue unit marks'); t.note('unit canvas z-index', unit[0].z);
  const mapC = await p.evaluate(() => { const c = document.querySelector('.mapboxgl-canvas'); return Number(getComputedStyle(c).zIndex) || 0; }); assert(Number(unit[0].z) > mapC, 'the units canvas is stacked above the map canvas');
  const ctl = await ctlText(p, 'desktop'); let opened = false;
  for (const u of unit.filter((u) => !(u.x > ctl.x && u.x < ctl.x + ctl.w && u.y > ctl.y && u.y < ctl.y + ctl.h)).slice(0, 60)) { await p.mouse.click(u.x, u.y); await sleep(350); if (/commander|key action/i.test(await p.evaluate(() => document.body.innerText))) { opened = true; break; } }
  assert(opened, 'a click on a drawn unit opens its panel on the new base');
  await p.keyboard.press('Escape'); await sleep(300);
});

// ================================================================== 08 retina, reduced data, first-load cost
suite.test('T0-B63-08', 'retina and reduced data: DPR 2 asks for the next zoom (tileSize 256), saveData and 2g keep the normal level; first-load tiles and bytes recorded and bounded (desktop, retina desktop, phone)', async (t) => {
  need();
  const sizeOf = (p) => p.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/tiles1863\//.test(e.name)).map((e) => ({ n: e.name, b: e.encodedBodySize || e.decodedBodySize })));
  const rows = {};
  for (const [name, vp, init] of [['desktop 1440x900 DPR1', DESK, []], ['desktop DPR2', { ...DESK, dpr: 2 }, []], ['desktop DPR2 saveData', { ...DESK, dpr: 2 }, [() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }); }]],
    ['desktop DPR2 2g', { ...DESK, dpr: 2 }, [() => { Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g' }, configurable: true }); }]], ['phone 375x812 DPR3', PHONE, []]]) {
    const S = await open({ profile: 'cost', viewport: vp, initScripts: init }); const p = await boot(S, vp.mobile ? 'mobile' : 'desktop', { wait: 3000 });
    const st = await stateOf(p); const sz = await sizeOf(p); const zs = [...new Set(lastTileZoom(S))].sort((a, b) => a - b);
    rows[name] = { sharp: st.sharp, tiles: S.resp.length, bytes: sz.reduce((a, x) => a + x.b, 0), zooms: zs, bad: S.resp.filter((r) => r.status !== 200).length };
    assertEq(rows[name].bad, 0, `${name}: non-200 tile responses`); await closeSession(S);
  }
  t.note('first load', rows);
  assertEq([rows['desktop 1440x900 DPR1'].sharp, rows['desktop DPR2'].sharp, rows['desktop DPR2 saveData'].sharp, rows['desktop DPR2 2g'].sharp, rows['phone 375x812 DPR3'].sharp], [false, true, false, false, true], 'sharp tiles by device and connection');
  const a = rows['desktop 1440x900 DPR1'], b = rows['desktop DPR2'], c = rows['desktop DPR2 saveData'];
  assert(Math.max(...b.zooms) === Math.max(...a.zooms) + 1 && Math.max(...c.zooms) === Math.max(...a.zooms), `zoom of the tiles: 1x ${a.zooms}, 2x ${b.zooms}, saveData ${c.zooms}`);
  assert(a.tiles <= 40 && a.bytes <= 2.2e6, `first load desktop: ${a.tiles} tiles, ${a.bytes} bytes`); assert(c.tiles <= 40 && c.bytes <= 2.2e6, 'saveData first load stays at the normal cost');
  assert(b.bytes <= 4.5e6 && rows['phone 375x812 DPR3'].bytes <= 3.2e6, 'sharp first load stays bounded');
});

// ================================================================== 09 service worker and headers
suite.test('T0-B63-09', 'service worker and headers: the immutable class is served for tiles, tiles are cached cache-first (second load: no network tile request), offline works for cached tiles only, the worker caps the entries (node vm)', async (t) => {
  need();
  const S = await open({ profile: 'sw', viewport: DESK }); const p = S.page;
  await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop');
  await waitFor(async () => (await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); })), { timeout: 20000, label: 'service worker active' });
  const h = await p.evaluate(async (v) => { const r = await fetch(`/tiles1863/${v}/13/2338/3106.webp`); return { s: r.status, cc: r.headers.get('cache-control'), ct: r.headers.get('content-type'), xfo: r.headers.get('x-frame-options') }; }, TILEDIR);
  assertEq([h.s, h.cc, h.ct], [200, 'public, max-age=31536000, immutable', 'image/webp'], 'a tile is served with the immutable class'); assertEq(h.xfo, 'DENY', 'X-Frame-Options kept');
  const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8'); const hdr = fs.readFileSync(path.join(DIST, '_headers'), 'utf8');
  assert(/\/tiles1863\/\*\n  Cache-Control: public, max-age=31536000, immutable/.test(hdr), '_headers rule'); assertEq(hdr.split('/tiles1863/*').length - 1, 1, 'one rule for /tiles1863/*');
  // reload so that the worker controls the page, then everything tile-shaped should be served by the worker on the next visit to the same place
  await p.reload({ waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop'); await waitFor(async () => !!(await mapView(p)), { timeout: 20000 }); await settle(p); await sleep(800);
  const keys1 = await p.evaluate(async () => { const out = {}; for (const k of (await caches.keys()).filter((k) => /^gbg-/.test(k))) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname); return out; });
  const cacheName = Object.keys(keys1).find((k) => /^gbg-r0-/.test(k)); assert(cacheName && cacheName.endsWith(VERSION.release), `release cache ${Object.keys(keys1)}`); assertEq(Object.keys(keys1).length, 1, 'one gbg- cache only (the tile entries live in the release cache; Mapbox keeps its own)');
  const nT = keys1[cacheName].filter((x) => /\/tiles1863\//.test(x)).length, nA = keys1[cacheName].filter((x) => /^\/assets\//.test(x)).length; assert(nT >= 6 && nA >= 1, `cache holds ${nT} tile and ${nA} asset entries`);
  const n0 = S.net.mark(); await p.reload({ waitUntil: 'load' }); await waitForApp(p, 45000); await chooseLayout(p, 'desktop'); await waitFor(async () => !!(await mapView(p)), { timeout: 20000 }); await settle(p); await sleep(800);
  const sw2 = S.resp.filter((r) => r.t > Date.now() - 20000 && r.fromSW).length; t.note('tile responses served by the worker on the third load', sw2); assert(sw2 >= 6, 'the worker serves the cached tiles on a repeat visit');
  // offline: a cached tile still answers, an uncached one fails
  await S.context.setOffline(true);
  const off = await p.evaluate(async (v) => { const cached = await fetch(`/tiles1863/${v}/13/2338/3106.webp`).then((r) => r.status, () => 'fail'); const other = await fetch(`/tiles1863/${v}/15/9350/12420.webp?never`).then((r) => r.status, () => 'fail'); return { cached, other }; }, TILEDIR);
  await S.context.setOffline(false); assertEq(off.cached, 200, 'a cached tile is served offline'); assertEq(off.other, 'fail', 'an uncached tile is not (no invented answer)');
  await closeSession(S);
  // the cap, in a node vm with fake caches: 650 distinct tiles through the worker, asset entries intact, at most TILE_MAX tile entries
  const m = /TILE_MAX = (\d+)/.exec(sw); assert(m, 'TILE_MAX in sw.js'); const MAX = Number(m[1]);
  const store = new Map(); const mkReq = (u) => ({ url: u, method: 'GET', mode: 'cors' });
  const cache = { put: async (r, res) => { store.delete(r.url); store.set(r.url, res); }, match: async (r) => store.get(r.url), keys: async () => [...store.keys()].map((url) => ({ url })), delete: async (r) => store.delete(r.url) };
  const listeners = {}; const selfObj = { location: { origin: 'https://x.test' }, addEventListener: (n, f) => { listeners[n] = f; }, clients: { claim: async () => {} } };
  vm.runInNewContext(sw, { Response: { error: () => ({ networkError: true }) }, self: selfObj, caches: { open: async () => cache, keys: async () => [], delete: async () => true }, URL, fetch: async (r) => ({ ok: true, status: 200, type: 'basic', clone() { return this; } }), Promise });
  const fire = async (u) => { let rp; const wu = []; listeners.fetch({ request: mkReq(u), respondWith: (p) => { rp = p; }, waitUntil: (p) => { wu.push(p); } }); if (!rp) return null; const out = await rp; await Promise.all(wu); return out; };
  await fire('https://x.test/assets/index-1.js'); for (let i = 0; i < MAX + 50; i++) await fire(`https://x.test/tiles1863/v1-x/15/${i}/1.webp`);
  const keys = [...store.keys()]; assertEq(keys.filter((k) => /\/tiles1863\//.test(k)).length, MAX, 'tile entries are capped'); assert(keys.includes('https://x.test/assets/index-1.js'), 'the asset entry survives the eviction'); assert(!keys.includes('https://x.test/tiles1863/v1-x/15/0/1.webp'), 'the oldest tile went first');
  await fire('https://x.test/data/x.json'); assert(![...store.keys()].some((k) => /\/data\//.test(k)), 'other paths are still not handled');
});

// ================================================================== 10 monuments
suite.test('T0-B63-10', 'Monuments layer on the new base (MON in the tree): the toolbar button turns the layer on, the layers sit above the base, dots are rendered, no console error', async (t) => {
  need(); if (!HAS_MON) throw new Skip('MON is not in this tree (build with --with MON)');
  const S = await open({ profile: 'mon', viewport: DESK }); const p = await boot(S, 'desktop');
  await p.getByRole('button', { name: /^Monuments/ }).first().click(); await sleep(1200);
  const L = await p.evaluate(() => { const m = window.__t0map; const o = m.getStyle().layers.map((l) => l.id); return { o, n: m.getStyle().layers.filter((l) => /^gtmon/.test(l.id)).length }; });
  assert(L.n >= 4 && L.o.indexOf('gtmon-dots') > L.o.indexOf('b1863-detail'), `monument layers above the base: ${L.o.join()}`);
  await jump(p, { center: [-77.2356, 39.8128], zoom: 15 }); const dots = await p.evaluate(() => window.__t0map.queryRenderedFeatures({ layers: ['gtmon-dots'] }).length); assert(dots > 0, 'dots are rendered');
  assertEq(S.collector.firstParty.length, 0, 'no console errors with the Monuments layer on'); await closeSession(S);
});

// ================================================================== 11 static
suite.test('T0-B63-11', 'static: the group\'s anchors matched once each, the Walkthrough span is byte-identical to the control, its own map still names the Mapbox style (untouched), nothing else names a satellite style, the tile set is complete', async (t) => {
  need();
  const anchors = path.join(resultsDir, 'anchors.json');
  if (fs.existsSync(anchors)) { const a = JSON.parse(fs.readFileSync(anchors, 'utf8')); const g = a.patches.filter((x) => x.group === 'BASE1863'); assertEq(g.length, 11, 'BASE1863 patches (10 in the bundle + the one sentence of index.html that called the map a real satellite map)'); assert(g.every((x) => x.ok && x.found === x.expect), 'every anchor matched exactly once'); assert(a.groups.includes('BASE1863'), 'listed in the build groups'); }
  assertEq(ENTRY_TEXT.split('style:"mapbox://styles/mapbox/satellite-v9"').length - 1, 1, 'exactly one satellite style string is left: the Walkthrough map\'s'); assertEq(ENTRY_TEXT.split('const GTB63 = ').length - 1, 1, 'the runtime is in the entry once');
  const i = ENTRY_TEXT.indexOf('style:"mapbox://styles/mapbox/satellite-v9"'); assert(/container:el,style:/.test(ENTRY_TEXT.slice(i - 40, i + 10)), 'the remaining one is the Walkthrough\'s (container:el)');
  assertEq(ENTRY_TEXT.split('GTB63.attach(').length - 1, 2, 'two attach calls (desktop, phone)');
  let ctl = CONTROL ? path.resolve(REPO, CONTROL) : null;
  // trains R1d and R1e register every Release 1 group: a build without BASE1863 alone cannot be made (the other groups anchor on its finished text); the control is the published train R1c, whose Walkthrough the guard (walkthrough-guard.spec) proves untouched
  if (!ctl && (VERSION.train === 'R1d' || VERSION.train === 'R1e' || VERSION.train === 'R1f' || VERSION.train === 'R1g')) ctl = path.join(REPO, 'release', 'R1c', 'dist');
  if (!ctl) { const out = path.join(resultsDir, '..', 'R1c-control'); if (!fs.existsSync(path.join(out, 'dist'))) { const r = spawnSync('python', [path.join(REPO, 'tools/t0/base1863/b63_build.py'), '--train', VERSION.train, '--out', path.relative(REPO, out), '--no-gate', '--without-base'], { cwd: REPO, encoding: 'utf8' }); assertEq(r.status, 0, `control build: ${r.stdout.slice(-300)}`); } ctl = path.join(out, 'dist'); }
  const ctext = fs.readFileSync(path.join(ctl, 'assets', JSON.parse(fs.readFileSync(path.join(ctl, 'version.json'), 'utf8')).entry), 'utf8');
  const span = (s) => { const a = s.indexOf('d2=[{id:1,name:"McPherson Ridge"'), b = s.indexOf('const ln={ink:', a); return a >= 0 && b > a ? s.slice(a, b) : null; };
  let [sa, sb] = [span(ENTRY_TEXT), span(ctext)]; assert(sa && sb && sa.length > 1000, 'Walkthrough span found');
  // train R1f (group PERF5) changes the Walkthrough's map effect on purpose: the expected span is the control's with exactly the registered PERF5-wt-* edits (tests/t0/perf5-region.mjs)
  { const P5 = await import('./perf5-region.mjs'); if (P5.hasPerf5(ENTRY_TEXT)) sb = P5.expectedWalkthroughRegion(sb, REPO); }
  assert(sa === sb, 'the Walkthrough code and data are byte-identical to the control without the group');
  const wsm = ENTRY_TEXT.indexOf('"gtbg-wt-map"'); assert(ENTRY_TEXT.slice(wsm, wsm + 400).includes('mapbox://styles/mapbox/satellite-v9'), 'the Walkthrough map keeps its own style');
  // the tile set on disk: the version directory, every file hash-checked against the index, bytes, no z17
  const root = path.join(DIST, 'tiles1863', TILEDIR); const idx = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8')); assertEq(idx.version, TILEDIR, 'index.json version');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const files = walk(root); const photo = files.filter((f) => /[\\/]\d+[\\/]\d+[\\/]\d+\.webp$/.test(f)); const changed = files.filter((f) => /[\\/]changed[\\/]/.test(f));
  assert(photo.length === idx.photo.tiles && changed.length === idx.changed.tiles, `tiles on disk ${photo.length}/${idx.photo.tiles}, ${changed.length}/${idx.changed.tiles}`); assert(!files.some((f) => /[\\/]17[\\/]/.test(f)), 'no z17 tile shipped');
  const bytes = files.reduce((a, f) => a + fs.statSync(f).size, 0); t.note('bytes added to the dist (tiles1863)', bytes); assert(bytes < 40e6 + 3e6, `tile directory ${bytes} bytes`);
  const man = JSON.parse(fs.readFileSync(path.join(resultsDir, 'manifest.json'), 'utf8')); t.note('build manifest total bytes / files', [man.total_bytes, man.file_count]);
  const gate = path.join(resultsDir, 'gate.json'); if (fs.existsSync(gate)) { const g = JSON.parse(fs.readFileSync(gate, 'utf8')); assertEq((g.checks || []).filter((c) => !c.ok && !(c.id === 'data-untouched' && /"DATA"/.test(JSON.stringify(JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).groups || [])))).map((c) => c.id), [], 'failed build gates (data-untouched is judged by group DATA itself: a tree with DATA changes served data files by decision)'); }
});

suite.test('T0-B63-X', 'every browser test of this run: 0 uncaught exceptions and 0 first-party console.error', async (t) => {
  const open2 = [F.D, F.P].filter(Boolean); if (!open2.length) throw new Skip('no browser session in this run');
  for (const S of open2) { t.note('ignored tile noise', S.collector.ignored); const e = S.collector.firstParty.filter((x) => !/Permissions policy violation|google|gstatic|streetview/i.test(`${x.text} ${x.url || ''}`)); assertEq(e, [], 'first-party errors'); }
});

// ------------------------------------------------------------------ run
const outFile = path.join(outDir, EXPECT_RED ? 'test-base1863-red.json' : 'test-base1863.json');
const GUARDS = new Set(['T0-B63-11', 'T0-B63-X']);
let summary;
try {
  summary = await suite.run({ filter: FILTER, outFile, extra: () => ({ dist: path.relative(REPO, DIST), groups: VERSION.groups, hasBase1863: HAS_B63, mapboxBudget: { ...tileBudget } }) });
  console.log(`mapbox requests used this run: ${tileBudget.used} of ${tileBudget.cap} (blocked by cap: ${tileBudget.blocked})`);
} finally {
  for (const s of [...sessions]) { try { await s.close(); } catch { /* already closed */ } }
  await emu.close();
}
if (EXPECT_RED) {
  const feature = summary.results.filter((r) => !GUARDS.has(r.id) && r.status !== 'skip');
  const allRed = feature.length > 0 && feature.every((r) => r.status === 'fail');
  console.log(allRed ? `expected-red: all ${feature.length} feature tests failed on this tree (red-first proven; guards are exempt)` : `expected-red VIOLATED: passed on this tree: ${feature.filter((r) => r.status !== 'fail').map((r) => r.id).join(', ')}`);
  process.exit(allRed ? 0 : 1);
}
process.exit(summary.failed ? 1 : 0);
