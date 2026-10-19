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
import { STANDARDS } from '../engine/skins/standards.mjs';
import { skinKit } from '../engine/skins/kit.mjs';
import { measureTable, FONT_SPECS } from '../engine/layout/text.mjs';
import { buildDataset } from './dataset.mjs';
import { createClock } from './clock.mjs';
import { createRenderer } from './render.mjs';
import { createTrails } from './trails.mjs';
import { TOKENS_DOC } from './tokens-data.mjs';
import { FONT_FACES } from './fonts-data.mjs';
import { createStudio } from './studio.mjs';
import { createPopups } from './popups.mjs';

export const VERSION = '1.0.0';
const S = { state: 0, host: null, strict: false, sw: null, oob: {}, oobGen: 0, dsGen: -1, pbt: null, core: null, clock: null, renderer: null, trails: null, canvas: null, map: null, last: 0, idle: true, frames: 0, errors: 0, studio: null, popups: null, extraSkins: [], hoverKey: null, fontsReady: false, store: null, unsub: null, prefetched: false, cam: { lng: 0, lat: 0, zoom: 13.5, w: 0, h: 0 }, bias: [0, 0], ever: false };
const MAX_DT = 100;

function readSwitches() {
  const sw = { legacy: false, strict: false, tune: false, skin: null, set: null };
  try {
    const q = new window.URLSearchParams(window.location.search); const a = q.get('anim') || '';
    for (const p of a.split(',')) { if (p === 'legacy') sw.legacy = true; else if (p === 'strict') sw.strict = true; else if (p.startsWith('skin:')) sw.skin = p.slice(5); }
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
  S.state = 0; try { window.console.warn('[gtanim] engine switched off for this session:', e && e.message); } catch { /* console */ }
  try { if (S.canvas) { const c = S.canvas.getContext('2d'); c && c.clearRect(0, 0, S.canvas.width, S.canvas.height); } } catch { /* canvas */ }
}
function guard(fn, bad) { try { return fn(); } catch (e) { fail(e); return bad; } }
const reducedNow = () => { try { return !!(S.host && S.host.reduced && S.host.reduced()) || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; } };

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
  const skins = [...STANDARDS, ...S.extraSkins];
  const settings = { 'skin.id': (S.sw.skin && skins.some((k) => k.id === S.sw.skin)) ? S.sw.skin : 'standards', ...(S.sw.set || {}) };
  S.t0 = window.performance.now(); S.core = createCore({ dataset: ds, tokens: TOKENS_DOC, textTable: measure(), storage: S.sw.tune ? storage : null, skins, settings, autoQuality: true, systemReduced: reducedNow });
  S.core.tuning.on('*', () => { wake(); });
  skinKit.onInvalidate(() => wake());
  S.clock = createClock(S.core.tok);
  S.trails = createTrails(S.core);
  loadFonts();
}
function measure() {
  const cv = window.document.createElement('canvas'); return measureTable(cv.getContext('2d'), FONT_SPECS);
}
function loadFonts() {
  try {
    const FF = window.FontFace; if (!FF || !window.document.fonts) { S.fontsReady = true; return; }
    Promise.all(FONT_FACES.map((f) => { const face = new FF(f.family, `url(data:${f.mime};base64,${f.data}) format("${f.fmt}")`, { weight: String(f.weight), style: f.style }); window.document.fonts.add(face); return face.load(); }))
      .then(() => window.document.fonts.load('600 12px "QC Sans"', 'AaBb0123')).then(() => { if (S.core) { S.core.setTextTable(measure(), 'measured in this browser'); } S.fontsReady = true; wake(); })
      .catch(() => { S.fontsReady = true; });
  } catch { S.fontsReady = true; }
}

// ---- attach ---------------------------------------------------------------------------------------------------------------------------------------------
function attach(canvas, map) {
  if (S.canvas === canvas && S.map === map) return;
  if (S.map && S.map !== map && S.mapOff) { try { S.mapOff(); } catch { /* old map gone */ } }
  S.canvas = canvas; S.map = map; S.renderer = null;
  const onRender = () => { if (S.state === 1 && S.map === map) guard(() => frame(), null); };
  const onMove = (e) => { if (S.state !== 1) return; const h = S.core && S.core.frame ? S.core.pickAt(e.point.x, e.point.y, 4) : null; const k = h && h.kind === 'unit' ? h.tile.key : (h ? h.tile.key : null); if (k !== S.hoverKey) { S.hoverKey = k; skinKit.setHover(k); wake(); try { map.getCanvas().style.cursor = k ? 'pointer' : ''; } catch { /* cursor */ } } };
  const onOut = () => { if (S.hoverKey !== null) { S.hoverKey = null; skinKit.setHover(null); wake(); } };
  map.on('render', onRender); map.on('mousemove', onMove); map.getCanvas().addEventListener('mouseleave', onOut);
  S.mapOff = () => { map.off('render', onRender); map.off('mousemove', onMove); map.getCanvas().removeEventListener('mouseleave', onOut); };
  try { map.dragRotate.disable(); map.touchZoomRotate.disableRotation(); if (map.touchPitch && map.touchPitch.disable) map.touchPitch.disable(); if (map.keyboard && map.keyboard.disableRotation) map.keyboard.disableRotation(); if (map.getBearing() !== 0) map.setBearing(0); if (map.getPitch() !== 0) map.setPitch(0); } catch { /* controls missing: the unit layer needs a north-up flat map, rotation stays as the map has it */ }
  if (S.store && !S.unsub) S.unsub = S.store.subscribe(() => wake());
  if (!S.prefetched) { S.prefetched = true; window.setTimeout(() => { try { S.host && S.host.prefetch && S.host.prefetch(); } catch { /* the app loads days itself too */ } }, 1500); }
  if (S.sw.tune && !S.studio) S.studio = createStudio(S);
  if (!S.popups) S.popups = createPopups(S);
  wake();
}
function wake() { try { if (S.map && S.state === 1) S.map.triggerRepaint(); } catch { /* map gone */ } }

// ---- the frame ------------------------------------------------------------------------------------------------------------------------------------------
const filterOf = (f) => {
  if (!f) return null; const sides = f.sides || ['Union', 'Confederate']; const disp = f.dispositions || null; const minS = f.minStrength || 0;
  if (sides.length >= 2 && !disp && !minS) return null;
  return (u, st) => sides.includes(u.id.startsWith('U-') ? 'Union' : 'Confederate') && !(disp && !disp.includes(st.disposition)) && !(st.strength != null && st.strength < minS);
};
function frame() {
  const map = S.map; const canvas = S.canvas; if (!map || !canvas) return;
  const st = S.store.getState();
  if (!ensureData(st.placementsByTick) || !S.core) return;
  const E = S.core; const now = window.performance.now();
  if (!S.fontsReady && now - S.t0 < 2500) { map.triggerRepaint(); return; }      // the layout is measured with the page's own face: the first picture waits for it (it is embedded, a few milliseconds)
  const gap = S.last ? now - S.last : 16.667; S.last = now; const raw = S.idle ? 16.667 : gap; S.idle = false; const dt = Math.min(raw, MAX_DT);
  const reduced = reducedNow();
  if (!S.ever) { S.ever = true; S.clock.init(st.currentTick); }
  const ck = S.clock.step(dt, { tick: st.currentTick, playing: !!st.isPlaying, speed: st.playbackSpeed || 1, reduced });
  if (ck.write !== null) S.store.setState({ currentTick: ck.write });
  if (ck.stop) S.store.setState({ isPlaying: false });
  const tau = reduced ? Math.floor(ck.tau + 1e-9) : ck.tau;
  const cont = map.getContainer(); const w = cont.clientWidth; const h = cont.clientHeight; if (!w || !h) return;
  const c = map.getCenter(); const cam = S.cam; cam.lng = c.lng; cam.lat = c.lat; cam.zoom = map.getZoom(); cam.w = w; cam.h = h;
  if (!S.renderer) S.renderer = createRenderer({ canvas, engine: E });
  S.renderer.fit(w, h);
  const p0 = map.project([c.lng, c.lat]); S.bias[0] = p0.x - w / 2; S.bias[1] = p0.y - h / 2;
  const shown = st.showUnits !== false && canvas.style.display !== 'none';
  const F = E.step({ dtMs: dt, rawDtMs: raw, tau, cam, selectedId: st.selectedUnitId || st.pinnedUnitId || null, pass: filterOf(st.filters), cut: ck.cut, bias: S.bias });
  if (shown) S.renderer.draw(F, { trails: S.trails.enabled() ? (g, env) => S.trails.draw(g, env, F) : null });
  S.frames++; if (S.onFrame) S.onFrame(F, S);
  if (S.popups) S.popups.update(F, st);
  const more = !!st.isPlaying || S.clock.moving || E.busy() || S.trails.busy();
  if (more) map.triggerRepaint(); else S.idle = true;
}

// ---- entry points ----------------------------------------------------------------------------------------------------------------------------------------
export const G = {
  version: VERSION,
  bind(h) {
    S.host = h; S.store = h.store; S.sw = readSwitches(); S.strict = S.sw.strict;
    S.state = (S.sw.legacy || !supported()) ? 0 : 1;
    window.__gtanim = { version: VERSION, state: () => S.state, info: () => info(), G, S, fail };
  },
  on() { return S.state === 1; },
  oobFiles(names, files) { try { names.forEach((n, i) => { if (files[i]) S.oob[n] = files[i]; }); S.oobGen++; } catch { /* the engine falls back to id-derived names */ } },
  registerSkin(skin) { S.extraSkins.push(skin); if (S.core) S.core.kernel.skins.register(skin.id, skin, { replace: true }); },
  paused(c, map) { return guard(() => { attach(c, map); wake(); return true; }, false); },
  heartbeat(c, map) { return guard(() => { attach(c, map); wake(); return true; }, false); },
  units(pbt, f, x) {
    return guard(() => {
      if (!S.core || S.pbt !== pbt) return null; const t = f + (x || 0); const out = [];
      for (const { u, st } of S.core.battle.visibleAt(t)) { const raw = u.raw && u.raw[st.seg]; if (!raw) continue; out.push({ ...raw, lng: st.lng, lat: st.lat }); }
      return out;
    }, null);
  },
  pick(clientX, clientY, touch) {
    return guard(() => {
      if (!S.core || !S.canvas || !S.core.frame) return false;
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
