// host/app.mjs - the ANIM glue: the only module that knows the app (its zustand store, its Mapbox map, its unit canvas).  The engine core is DOM-free; this file reads the store and the map, hands them to the
// core, draws the answer on the app's own unit canvas inside the map's render event (one frame, one camera: the overlay can never lag the map), and serves the few functions the patches of the entry bundle call:
//
//   GTANIM.bind(host)                    once, with the store (yn), the prefetch of the later days and the app's reduced-motion flag
//   GTANIM.oobFiles(names, files)        the order-of-battle files the app's loader fetched (the hierarchy, designations and battalions are the order of battle's own)
//   GTANIM.on()                          is the engine drawing?  (false: ?anim=legacy, localStorage.gtanim_off, an unsupported browser, or after an internal error: the shipped renderer takes over)
//   GTANIM.paused(c, map, ...)           the app's repaint entry while paused (tick, selection, filter, resize); the engine reads the store itself
//   GTANIM.heartbeat(c, map)             the app's playing loop: the engine owns the clock; the shipped loop only keeps it awake
//   GTANIM.units(pbt, tick, frac)        the units at a tick as records (minimap, picker index, fly-to), positions as the engine draws them
//   GTANIM.pick(x, y, touch)             the mark under a client point, or null; GTANIM.drawn() the units as the last frame drew them (Monuments click arbitration)
//
// Every entry point is guarded: an exception switches the engine off for the session (the shipped renderer takes over on the next call), unless strict mode is on (?anim=strict or window.__gtanimStrict: the
// tests), which rethrows.  Kill switches: ?anim=legacy, localStorage.gtanim_off=1, tuning enabled=false.
import { createCore } from '../engine/core.mjs';
import { SKINS } from './skins.mjs';
import { skinKit } from '../engine/skins/kit.mjs';
import { setViewportWidth } from '../engine/skins/common.mjs';
import { measureTable, measureFont, FONT_SPECS } from '../engine/layout/text.mjs';
import { buildDataset } from './dataset.mjs';
import { createClock } from './clock.mjs';
import { createRenderer } from './render.mjs';
import { createTrails } from './trails.mjs';
import { TOKENS_DOC } from './tokens-data.mjs';
import { FONT_FACES } from './fonts-data.mjs';
import { createStudio } from './studio.mjs';
import { createPopups } from './popups.mjs';

export const VERSION = '1.0.0';
const S = { reducedNow: () => reducedNow(), state: 0, host: null, strict: false, sw: null, oob: {}, oobGen: 0, dsGen: -1, pbt: null, core: null, clock: null, renderer: null, trails: null, canvas: null, map: null, last: 0, idle: true, frames: 0, errors: 0, studio: null, popups: null, extraSkins: [], hoverKey: null, fontsReady: false, store: null, unsub: null, prefetched: false, cam: { lng: 0, lat: 0, zoom: 13.5, w: 0, h: 0 }, bias: [0, 0], ever: false };
const MAX_DT = 100;
const WARM_FRAMES = 12;        // PERF4: the first frames after the page loads (the engine is built in the first, then the cold layout, the fonts, the first pictures) are tasks of their own (a timer turn each), not part of the map's render task or the shared animation-frame task: the map's own first renders are 50-130 ms of a 4x phone's main thread, and every millisecond of ours added to them is counted as blocking time
const SLICE_MS = 4;            // PERF3: the cold layout of a cut and the probes of the rest canon run in slices of this many milliseconds, one per frame (engine/core.mjs); ?anim=sync restores one-call solves (the tests of the engine's own timing)

function readSwitches() {
  const sw = { legacy: false, strict: false, tune: false, skin: null, set: null, sync: false };
  try {
    const q = new window.URLSearchParams(window.location.search); const a = q.get('anim') || '';
    for (const p of a.split(',')) { if (p === 'legacy') sw.legacy = true; else if (p === 'strict') sw.strict = true; else if (p.startsWith('skin:')) sw.skin = p.slice(5); else if (p === 'sync') sw.sync = true; }
    if (q.get('tune') === '1') sw.tune = true;
    if (q.get('animset')) { try { sw.set = JSON.parse(q.get('animset')); } catch { /* ignored: a bad ?animset leaves the defaults */ } }
  } catch { /* no location */ }
  try { if (window.localStorage.getItem('gtanim_off') === '1') sw.legacy = true; } catch { /* storage blocked */ }
  if (window.__gtanimStrict) sw.strict = true;
  return sw;
}
function supported() { try { const C2 = window.CanvasRenderingContext2D; return !!(C2 && C2.prototype.roundRect && window.Float64Array && window.Map); } catch { return false; } }
function fail(e) {
  S.errors++; S.lastError = String((e && e.stack) || e).slice(0, 600);
  if (S.strict) throw e;
  S.state = 0; releaseLegend(); try { window.console.warn('[gtanim] engine switched off for this session:', e && e.message); } catch { /* console */ }
  try { if (S.canvas) { const c = S.canvas.getContext('2d'); c && c.clearRect(0, 0, S.canvas.width, S.canvas.height); } } catch { /* canvas */ }
  try { if (S.map) S.map.fire('move'); } catch { /* the app's own repaint hangs on the map's move event: the shipped routine draws the picture now (while playing its own loop already does) */ }
}
function guard(fn, bad) { try { return fn(); } catch (e) { fail(e); return bad; } }
let MQL = null;
const reducedNow = () => { try { if (!MQL && window.matchMedia) MQL = window.matchMedia('(prefers-reduced-motion: reduce)'); return !!(S.host && S.host.reduced && S.host.reduced()) || !!(MQL && MQL.matches); } catch { return false; } };

// ---- data -----------------------------------------------------------------------------------------------------------------------------------------------
function readJson(rel) { return S.oob[rel]; }
function ensureData(pbt) {
  if (!pbt) return false;
  if (S.pbt === pbt && S.dsGen === S.oobGen && S.core) return true;
  const ds = buildDataset(readJson, pbt); S.pbt = pbt; S.dsGen = S.oobGen; S.counts = ds.counts;
  if (!S.core) createEngine(ds); else S.core.setDataset(ds);
  return true;
}
function createEngine(ds) {
  let storage = null; try { storage = window.localStorage; storage.getItem('gtanim_probe'); } catch { storage = null; }
  const skins = [...SKINS, ...S.extraSkins];
  const settings = { 'skin.id': (S.sw.skin && skins.some((k) => k.id === S.sw.skin)) ? S.sw.skin : 'standards', ...(S.sw.set || {}) };
  S.t0 = window.performance.now(); S.core = createCore({ dataset: ds, tokens: TOKENS_DOC, textTable: lazyTable(), storage: S.sw.tune ? storage : null, skins, settings, autoQuality: true, systemReduced: reducedNow, sliceMs: S.sw.sync ? 0 : SLICE_MS, presolve: !S.sw.sync });
  S.core.tuning.on('*', () => { wake(); });
  skinKit.onInvalidate(() => wake()); skinKit.onReduced(reducedNow);
  S.clock = createClock(S.core.tok);
  S.trails = createTrails(S.core); if (S.host && S.host.trails) S.trails.setFlag(S.host.trails);
  loadFonts();
}
function measure() {
  const cv = window.document.createElement('canvas'); return measureTable(cv.getContext('2d'), FONT_SPECS);
}
/** PERF3: the table the engine is made with is measured only if something reads it before the page's own face is ready.  It used to be measured at once, with a face that was still loading (so with the fallback's widths,
 *  183 ms of a 4x phone's first render), and replaced a moment later by the real one; no picture is drawn before that (frame() waits for the face), so nothing ever read the first. */
function lazyTable() { let t = null; return { get fonts() { return (t || (t = measure())).fonts; }, get browser() { return (t || (t = measure())).browser; } }; }
/** the real table, one font per task (a font is about 7 ms; the 4x phone saw 67 ms in one task) */
async function measureSliced() {
  const ctx = window.document.createElement('canvas').getContext('2d'); const out = { browser: window.navigator.userAgent, fonts: {} };
  for (const [k, css] of Object.entries(FONT_SPECS)) { out.fonts[k] = measureFont(ctx, css); await new Promise((r) => window.setTimeout(r, 0)); }
  return out;
}
/** the face as bytes, not as a data: URL: a FontFace made from a buffer fetches nothing, so the page's font-src 'self' policy has no request to judge (a data: URL is one) */
function fontBytes(b64) { const bin = window.atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function loadFonts() {
  try {
    const FF = window.FontFace; if (!FF || !window.document.fonts) { S.fontsReady = true; return; }
    Promise.all(FONT_FACES.map((f) => { const face = new FF(f.family, fontBytes(f.data), { weight: String(f.weight), style: f.style }); window.document.fonts.add(face); return face.load(); }))
      .then(() => window.document.fonts.load('600 12px "QC Sans"', 'AaBb0123')).then(() => measureSliced()).then((table) => { if (S.core) { S.core.setTextTable(table, 'measured in this browser'); } S.fontsReady = true; wake(); })
      .catch(() => { S.fontsReady = true; });
  } catch { S.fontsReady = true; }
}

// ---- attach ---------------------------------------------------------------------------------------------------------------------------------------------
function attach(canvas, map) {
  if (S.canvas === canvas && S.map === map) return;
  if (S.map && S.map !== map && S.mapOff) { try { S.mapOff(); } catch { /* old map gone */ } }
  S.canvas = canvas; S.map = map; S.renderer = null;
  const onRender = () => { if (S.state !== 1 || S.map !== map) return; if (warming() && !map.isMoving()) { later(); return; } if (!mapBusy(map) && S.last && !S.idle && window.performance.now() - S.last < 10) return; guard(() => frame(), null); };      // (a render the map made for its own reasons, a tile that arrived, right after the engine drew this frame: nothing new to draw)
  const onMove = (e) => { if (S.state !== 1) return; const h = S.core && S.core.frame && unitsShown() ? S.core.pickAt(e.point.x, e.point.y, 4) : null; const k = h && h.kind === 'unit' ? h.tile.key : (h ? h.tile.key : null); if (k !== S.hoverKey) { S.hoverKey = k; skinKit.setHover(k); wake(); try { map.getCanvas().style.cursor = k ? 'pointer' : ''; } catch { /* cursor */ } } };
  const onOut = () => { if (S.hoverKey !== null) { S.hoverKey = null; skinKit.setHover(null); wake(); } };
  map.on('render', onRender); map.on('mousemove', onMove); map.getCanvas().addEventListener('mouseleave', onOut);
  S.mapOff = () => { map.off('render', onRender); map.off('mousemove', onMove); map.getCanvas().removeEventListener('mouseleave', onOut); };
  /* the map may rotate and tilt: the layout is done in screen pixels through the map's own projection, and the marks stay upright (a flag always flies right or left of the screen) */
  if (S.store && !S.unsub) S.unsub = S.store.subscribe(() => wake());
  if (!S.prefetched) { S.prefetched = true; window.setTimeout(() => { try { S.host && S.host.prefetch && S.host.prefetch(); } catch { /* the app loads days itself too */ } }, 1500); }
  if (S.sw.tune && !S.studio) S.studio = createStudio(S);
  S.wake = wake;
  if (!S.popups) S.popups = createPopups(S);
  wake();
}
/** are the marks on screen?  (the app's Toggle Units hides the canvas; a hidden mark can be neither hovered nor picked) */
function unitsShown() { try { const st = S.store.getState(); return st.showUnits !== false && !(S.canvas && S.canvas.style.display === 'none'); } catch { return true; } }
const warming = () => S.frames < WARM_FRAMES;
function later() { if (S.tm) return; S.tm = window.setTimeout(() => { S.tm = 0; if (S.state !== 1 || !S.map) return; guard(() => frame(), null); }, 0); }
function wake() { try { if (S.map && S.state === 1) { if (mapBusy(S.map)) S.map.triggerRepaint(); else armRaf(); } } catch { /* map gone */ } }

// ---- the frame ------------------------------------------------------------------------------------------------------------------------------------------
/** R1E: the size of the map in css px WITHOUT asking the document.  clientWidth / clientHeight / innerWidth are layout reads: after the app's React commit or any style write of the same frame each one made the browser lay the
 *  page out inside this animation-frame callback (7 to 22 ms of a 4x phone's frame, measured as the callback's forced style-and-layout time), work that the frame's rendering step then had to repeat when the next script wrote again.
 *  The map's own transform holds the size Mapbox projects with (the container's client size at its last resize), which is the size the marks must be drawn in; the window width is cached by a resize listener. */
function mapSize(map) { const z = S.sz || (S.sz = [0, 0]); const t = map.transform; if (t && t.width > 0 && t.height > 0) { z[0] = t.width; z[1] = t.height; return z; } const c = map.getContainer(); z[0] = c.clientWidth; z[1] = c.clientHeight; return z; }
function viewWidth() {
  if (!S.vwOn) { S.vwOn = true; S.vw = window.innerWidth; try { window.addEventListener('resize', () => { S.vw = window.innerWidth; if (S.state === 1) wake(); }, { passive: true }); } catch { /* no window events */ } }
  return S.vw;
}

const filterOf = (f) => {
  if (!f) return null; const sides = f.sides || ['Union', 'Confederate']; const disp = f.dispositions || null; const minS = f.minStrength || 0;
  if (sides.length >= 2 && !disp && !minS) return null;
  return (u, st) => sides.includes(u.id.startsWith('U-') ? 'Union' : 'Confederate') && !(disp && !disp.includes(st.disposition)) && !(st.strength != null && st.strength < minS);
};
/** R1F: the map's own projection of one point, without the five objects map.project makes for it (an array for the pair, a LngLat, a MercatorCoordinate, a vector and a Point: some 1,900 objects and 90 KB a frame for the 360 marks near the screen,
 *  which is what the page's garbage collector then spends 3 to 6 ms of a throttled phone's frame on, twice or three times a second, inside the engine's frame).  The same arithmetic in the same order as Mapbox's mercator
 *  locationPoint (the Web-Mercator coordinate of the point times the world size, through the transform's pixel matrix, divided by w), read from the transform itself, so a rotated or tilted map is the map's own answer.
 *  Used only while the map's current projection is the mercator one without terrain; every 200th answer is compared with map.project's and a difference of more than 1e-6 px switches the fast path off for good. */
function makeProj() {
  let n = 0; let fast = true;
  const slow = (lng, lat, out) => { const q = S.map.project([lng, lat]); if (out) { out[0] = q.x; out[1] = q.y; return out; } return [q.x, q.y]; };
  return (lng, lat, out) => {
    if (fast) {
      const t = S.map.transform; const m = t && t.pixelMatrix; const ws = t && t.worldSize; const pj = t && t.projection;
      if (m && m.length === 16 && ws > 0 && pj && pj.name === 'mercator' && !t.elevation && typeof t._centerAltitude === 'number') {
        const px = (180 + lng) / 360 * ws; const py = (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360 * ws; const pz = t._centerAltitude;
        const w = m[3] * px + m[7] * py + m[11] * pz + m[15] * 1;
        const r = out || [0, 0]; if (w > 0) { r[0] = (m[0] * px + m[4] * py + m[8] * pz + m[12] * 1) / w; r[1] = (m[1] * px + m[5] * py + m[9] * pz + m[13] * 1) / w; } else { r[0] = Number.MAX_VALUE; r[1] = Number.MAX_VALUE; }
        if (n++ % 200 === 0) { const q = slow(lng, lat); if (!(Math.abs(q[0] - r[0]) <= 1e-6 && Math.abs(q[1] - r[1]) <= 1e-6) && !(q[0] === r[0] && q[1] === r[1])) { fast = false; r[0] = q[0]; r[1] = q[1]; return r; } }
        return r;
      }
    }
    return slow(lng, lat, out);
  };
}
function frame() {
  const map = S.map; const canvas = S.canvas; if (!map || !canvas) return;
  if (window.__gtanimFault) throw new Error('gtanim: injected fault (window.__gtanimFault)');      // the tests prove the fallback with it
  const st = S.store.getState();
  const had = !!S.core;
  if (!ensureData(st.placementsByTick) || !S.core) return;
  if (!had && warming()) { later(); return; }      // the engine was just built: the first picture is the next task's
  const E = S.core; const now = window.performance.now();
  if (!S.fontsReady && now - S.t0 < 2500) { map.triggerRepaint(); return; }      // the layout is measured with the page's own face: the first picture waits for it (it is embedded, a few milliseconds)
  if (S.last && now - S.last < 2 && !S.idle) return;
  const gap = S.last ? now - S.last : 16.667; S.last = now; const raw = S.idle ? 16.667 : gap; S.idle = false; const dt = Math.min(raw, MAX_DT);
  const reduced = reducedNow();
  if (!S.ever) { S.ever = true; S.clock.init(st.currentTick); }
  const ck = S.clock.step(dt, { tick: st.currentTick, playing: !!st.isPlaying, speed: st.playbackSpeed || 1, reduced });
  if (ck.write !== null) S.store.setState({ currentTick: ck.write });
  if (ck.stop) S.store.setState({ isPlaying: false });
  const tau = reduced ? Math.floor(ck.tau + 1e-9) : ck.tau;
  const sz = mapSize(map); const w = sz[0]; const h = sz[1]; if (!w || !h) return; setViewportWidth(viewWidth());
  const c = map.getCenter(); const cam = S.cam; cam.lng = c.lng; cam.lat = c.lat; cam.zoom = map.getZoom(); cam.w = w; cam.h = h;
  if (!S.renderer) S.renderer = createRenderer({ canvas, engine: E });
  S.renderer.fit(w, h);
  const proj = S.proj || (S.proj = makeProj());
  const shown = st.showUnits !== false && canvas.style.display !== 'none';
  if (!shown && S.hoverKey !== null) { S.hoverKey = null; skinKit.setHover(null); }                      // hidden units have no hover
  const F = E.step({ dtMs: dt, rawDtMs: raw, tau, cam, selectedId: st.selectedUnitId || st.pinnedUnitId || null, pass: filterOf(st.filters), cut: ck.cut, project: proj });
  F.dtMs = dt; const pu = S.popups; const stage = pu ? pu.stage() : null; const extraRects = pu ? pu.rects() : null;
  if (shown) S.renderer.draw(F, { stage, extraRects, trails: (g, env) => { if (pu) pu.drawSubjects(g, env, F); } });
  drawTrails(F, w, h);
  S.frames++; if (S.onFrame) S.onFrame(F, S);
  if (S.popups) S.popups.update(F, st);
  const more = !!st.isPlaying || S.clock.moving || E.busy() || S.trails.busy() || (S.renderer && S.renderer.stageEasing());
  if (!more) { S.idle = true; return; }
  // while the camera stands still the engine runs on its own animation-frame loop and the map is NOT asked to redraw its (unchanged) tiles sixty times a second; while the camera moves (a drag, a wheel, a flight)
  // the map's own render event drives the frame, so the overlay and the map are always one frame
  if (mapBusy(map)) { map.triggerRepaint(); return; }
  S.tauNext = (st.isPlaying && !S.clock.gliding && S.clock.speedEff > 0 && !reduced) ? tau + S.clock.speedEff * Math.min(raw, 34) / 1000 : undefined;      // where the clock will be one frame on, if it goes on as it does
  if (E.wantsPre(S.tauNext)) schedulePre();      // R1F: the solve the next frame will need is made in a task of its own, not in the next frame's (engine/core.mjs PRESOLVE); not while the camera moves (the frames then follow the map's own render event) nor when the picture is at rest
  armRaf();
}
/** R1F: the pre-solve task.  A message to ourselves runs as the next task after the current animation-frame task (its rendering step included), before the next frame's callbacks: the solve is its own task of a few to a few tens of milliseconds, where it
 *  used to share the frame's task with the map's render, the page's style and layout and a React commit. */
let preCh = null;
function runPre() { S.preQ = false; if (S.state !== 1 || !S.core || !S.map) return; guard(() => S.core.presolve(S.tauNext), null); }
function schedulePre() {
  if (S.preQ) return; S.preQ = true;
  try { if (!preCh) { preCh = new window.MessageChannel(); preCh.port1.onmessage = runPre; } preCh.port2.postMessage(0); } catch { window.setTimeout(runPre, 0); }
}
const mapBusy = (map) => { try { return map.isMoving() || map.isZooming() || map.isRotating() || !map.loaded(); } catch { return true; } };
function armRaf() {
  if (S.raf) return;
  if (warming() && !(S.map && S.map.isMoving && S.map.isMoving())) { later(); return; }
  S.raf = window.requestAnimationFrame(() => { S.raf = 0; if (S.state !== 1 || !S.map) return; if (mapBusy(S.map)) { S.map.triggerRepaint(); return; } guard(() => frame(), null); });
}

/** the trails of the app's "Trails ON" button, drawn on the app's own trail canvas (z-index 8, beneath the unit canvas): the path each moving unit has just walked, while the clock moves; when it stops they stay as they were until the camera or the tick changes (the shipped behaviour), so nothing stale is ever left */
function trailSig(F) { const m = S.map; const c = m.getCenter(); return Math.floor(F.tau) + '|' + c.lng.toFixed(6) + '|' + c.lat.toFixed(6) + '|' + m.getZoom().toFixed(4) + '|' + m.getBearing().toFixed(2) + '|' + m.getPitch().toFixed(2) + '|' + F.view.w + 'x' + F.view.h; }
function drawTrails(F, w, h) {
  let cv = S.trailCv;
  if (!cv || !cv.isConnected) {       // R1F: the app's trail canvas (z-index 8) is looked for in the map's container; a page without one (the phone's shell) asked the document for every canvas in it on every frame: a miss is remembered for a second unless the trails are on
    const now = window.performance.now(); if (!cv && S.trailMissAt && now - S.trailMissAt < 1000 && !S.trails.enabled()) return;
    cv = S.trailCv = [...S.map.getContainer().querySelectorAll('canvas')].find((c) => c.style.zIndex === '8') || null; S.trailMissAt = cv ? 0 : now; if (!cv) return;
  }
  const dpr = S.renderer.dpr; const pw = Math.round(w * dpr); const ph = Math.round(h * dpr);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; cv.style.width = w + 'px'; cv.style.height = h + 'px'; S.trailInk = true; }
  const g = cv.getContext('2d'); const on = S.trails.enabled() && S.clock.moving;
  if (on) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph); g.setTransform(dpr, 0, 0, dpr, 0, 0); S.trails.draw(g, null, F); S.trailInk = true; S.trailWasOn = true; }
  else if (S.trailInk && !S.trails.enabled()) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph); S.trailInk = false; S.trailWasOn = false; S.trailSig = null; }
  else if (S.trailInk && S.trailWasOn) { S.trailWasOn = false; S.trailSig = trailSig(F); }                                                          // the first frame at rest: the picture the trails belong to
  else if (S.trailInk && S.trailSig !== trailSig(F)) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph); S.trailInk = false; S.trailSig = null; }       // paused: the trails stay as they were (the shipped behaviour) until the picture changes under them
}

/** CLS: the shipped legend card (240 x 363, with its tab strip) is on screen at the first paint and the skin's own legend (352 wide) replaces it when the first frame is drawn, a visible jump.  Until the skin's box is in the
 *  card the shipped legend is not painted (visibility: hidden takes it out of layout-shift accounting and out of sight); the class is released when the box is built (host/popups.mjs), when the engine switches off, or
 *  after 4 s, so a page whose engine never draws still shows the shipped legend. */
function hideLegendUntilReady() {
  try {
    const d = window.document; const st = d.createElement('style'); st.id = 'gtanim-early';
    st.textContent = '.gta-wait [role="group"][aria-label="Legend"]:not(:has(> [data-gta-legend])) { visibility: hidden !important; }';
    d.head.appendChild(st); d.documentElement.classList.add('gta-wait'); window.setTimeout(releaseLegend, 4000);
  } catch { /* no document: nothing to hold back */ }
}
function releaseLegend() { try { window.document.documentElement.classList.remove('gta-wait'); const e = window.document.getElementById('gtanim-early'); if (e) e.remove(); } catch { /* gone */ } }      // (R1E: the hold-back rule goes with the class: a :has() rule that can never match again still costs the browser an invalidation check on every change of the page's DOM)

// ---- entry points ----------------------------------------------------------------------------------------------------------------------------------------
export const G = {
  version: VERSION,
  bind(h) {
    S.host = h; S.store = h.store; S.sw = readSwitches(); S.strict = S.sw.strict;
    S.state = (S.sw.legacy || !supported()) ? 0 : 1;
    if (S.state === 1) hideLegendUntilReady();
    window.__gtanim = { version: VERSION, state: () => S.state, info: () => info(), G, S, fail };
  },
  on() { return S.state === 1; },
  oobFiles(names, files) { try { names.forEach((n, i) => { if (files[i]) S.oob[n] = files[i]; }); S.oobGen++; } catch { /* the engine falls back to id-derived names */ } },
  registerSkin(skin) { S.extraSkins.push(skin); if (S.core) S.core.kernel.skins.register(skin.id, skin, { replace: true }); },
  paused(c, map) { return guard(() => { attach(c, map); wake(); return true; }, false); },
  heartbeat(c, map) { return guard(() => { attach(c, map); wake(); return true; }, false); },
  units(pbt, f, x) {
    return guard(() => {
      if (!S.core || S.pbt !== pbt) return null; const t = f + (x || 0);
      // the SAME array (and the same records) for the same time: the shipped phone shell compares what it gets by identity, and a fresh object on every call made its popup effect set state on every pass, forever
      const bt = S.core.battle; let C = S.unitsCache; if (!C || C.battle !== bt) C = S.unitsCache = { battle: bt, m: new Map() };
      let out = C.m.get(t); if (out) return out; out = [];
      for (const { u, st } of bt.visibleAt(t)) { const raw = u.raw && u.raw[st.seg]; if (!raw) continue; out.push({ ...raw, lng: st.lng, lat: st.lat }); }
      if (C.m.size >= 48) C.m.delete(C.m.keys().next().value); C.m.set(t, out); return out;
    }, null);
  },
  pick(clientX, clientY, touch) {
    return guard(() => {
      if (!S.core || !S.canvas || !S.core.frame || !unitsShown()) return false;
      const r = S.canvas.getBoundingClientRect(); const h = S.core.pickAt(clientX - r.left, clientY - r.top, touch ? 14 : 4);
      if (!h) return { id: null, rec: null };
      if (h.kind === 'unit') { const t = h.tile; const u = S.core.battle.units.get(h.id); const st = S.core.battle.stateOf(u, S.core.frame.tau); const rec = u && u.raw && st ? u.raw[st.seg] || null : null; void t; return { id: h.id, rec }; }
      // a crowd of several units: the map moves in until the crowd splits (a mark never hides what it stands for)
      try { const f = S.core.frame; const to = S.map.unproject([h.tile.ax + f.view.dx, h.tile.ay + f.view.dy]); S.map.easeTo({ center: to, zoom: Math.min(18, S.map.getZoom() + 1.6), duration: window.__gtbgReduceMotion ? 0 : 520 }); } catch { /* map gone */ }
      return { id: undefined, rec: null, crowd: true };
    }, false);
  },
  drawn() {
    return guard(() => {
      const E = S.core; if (!E || !E.frame || !E.frame.vis) return null; const out = [];
      for (const { u, st } of E.frame.vis) out.push({ unit_id: u.id, lng: st.lng, lat: st.lat });
      return out;
    }, null);
  },
};
function info() {
  const E = S.core; return { version: VERSION, on: S.state === 1, skin: E ? E.tok('skin.id') : null, frames: S.frames, errors: S.errors, lastError: S.lastError || null, tiles: E && E.frame ? E.frame.tiles.length : 0, tau: S.clock ? S.clock.tau : null, counts: S.counts || null, fontsReady: S.fontsReady, dpr: S.renderer ? S.renderer.dpr : null, autoEvery: E ? E.autoEvery() : null };
}
