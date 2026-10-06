// scene/engine.mjs - the ENGINE: composes the named modules into one frame pipeline and owns nothing else.
//
//   transport.advance(dt)  ->  tau (continuous tick)          time/transport.mjs     fixed timestep + interpolation, eased play/pause/speed, glided seeks
//   camera glide           ->  zoom, centre                    (here)                 wheel zoom keeps the point under the pointer; scene jumps glide
//   battle.visibleAt(tau)  ->  units + interpolated positions  data/model.mjs, interp/*  the ONE resolver of "what is on the field"
//   layout.solve(...)      ->  certified targets               layout/*               zero overlap by construction, temporal coherence
//   motion.step(...)       ->  display frame                   scene/display.mjs      glide + pushing + sequenced fades + the safety net
//   metrics.record(frame)  ->  numbers                         metrics/metrics.mjs
//
// The pipeline is one straight line executed every frame; there is no second code path (a worker, a pre-computed layout) to drift out of step with it.
// engine.step(dtMs) is headless: node tests and the browser call exactly the same function, the browser only adds drawing and input.
import { createKernel } from '../kernel/registry.mjs';
import { registerBuiltins } from '../builtins.mjs';
import { createTuning } from '../tuning/tuning.mjs';
import { createBattle } from '../data/model.mjs';
import { createClock } from '../time/clock.mjs';
import { createTransport } from '../time/transport.mjs';
import { Camera, project, unproject } from '../geo/project.mjs';
import { dampStep } from '../interp/damp.mjs';
import { makeSpec } from '../layout/spec.mjs';
import { createTextModel } from '../layout/text.mjs';
import { worldOrigin } from '../layout/tiles.mjs';
import { createMetrics } from '../metrics/metrics.mjs';

/** The solve-cadence governor: judge the last 45 frames; slow frames (mean interval over 21 ms) raise the cadence at once (1 -> 2 -> 3), and only a sustained calm (4.5 s of frames
 *  under 17.5 ms with the engine using less than 11 ms) lowers it again, so it does not flap.  Pure: the engine passes real timings, the tests pass synthetic ones. */
export function governorStep(g, every, rawDtMs, engineMs) {
  g.n++; g.sum += rawDtMs; g.eng += engineMs;
  if (g.n < 45) return every;
  const avg = g.sum / g.n; const eng = g.eng / g.n; let next = every;
  if (avg > 21 && every < 3) { next = every + 1; g.calm = 0; }
  else if (avg < 17.5 && eng < 11 && every > 1) { g.calm += g.n; if (g.calm >= 270) { next = every - 1; g.calm = 0; } }
  else g.calm = 0;
  g.n = 0; g.sum = 0; g.eng = 0; return next;
}

/**
 * @param {{autoQuality?:boolean, dataset:object, tokens:object, textTable?:object, storage?:Storage|null, kernel?:object, systemReduced?:()=>boolean, viewport?:{w:number,h:number}, start?:{tick?:number,lat?:number,lng?:number,zoom?:number}}} o
 */
export function createEngine(o) {
  const kernel = o.kernel || registerBuiltins(createKernel());
  const tuning = createTuning(o.tokens, { storage: o.storage || null });
  if (o.storage) tuning.load();
  const tok = (id) => tuning.get(id);
  const battle = createBattle(o.dataset, kernel, tok);
  const clock = createClock(o.dataset.clock);
  const systemReduced = o.systemReduced || (() => false);
  const reduced = () => { const m = tok('motion.reduced'); return m === 'on' || (m === 'auto' && systemReduced()); };
  const start = o.start || {};
  const transport = createTransport(tok, { tickMax: o.dataset.clock.tickMax, tick0: start.tick ?? 1, reduced });
  const vp = o.viewport || { w: 1280, h: 800 };
  const camera = new Camera({ lng: start.lng ?? o.dataset.terrain.townCenter.lng, lat: start.lat ?? o.dataset.terrain.townCenter.lat, zoom: start.zoom ?? tok('camera.zoom'), w: vp.w, h: vp.h });
  if (start.zoom != null) tuning.set('camera.zoom', Math.max(tok('camera.minZoom'), Math.min(tok('camera.maxZoom'), start.zoom)), { silent: true });
  const metrics = createMetrics(tok);
  let textModel = createTextModel(o.textTable || { fonts: {} }, 1.04, o.textTable ? 'table' : 'none');

  const E = {
    kernel, tuning, tok, battle, clock, transport, camera, metrics, frame: null, selectedId: null, frames: 0, dirty: true,
    get text() { return textModel; },
    setTextTable(table, source = 'measured') { textModel = createTextModel(table, 1.04, source); specCache = null; E.dirty = true; },
  };
  let layoutMod = null; let motionMod = null; let specCache = null; let skinCache = null;
  let lastL = null; let lastSelected = null; let sinceSolve = 0; let accDtMs = 0; let autoEvery = 1; const gov = { n: 0, sum: 0, eng: 0, calm: 0 };
  const camT = { zoom: camera.zoom, lng: camera.lng, lat: camera.lat, vz: 0, vx: 0, vy: 0, anchor: null };
  let prevTau = transport.simTau; let prevZoom = camera.zoom; let forceCut = false;

  const buildLayout = () => { layoutMod = kernel.layout.get(tok('layout.strategy')).create({ all: battle, tok }); };
  const buildMotion = () => { motionMod = kernel.motion.get(tok('motion.mode')).create({ tok, kernel }); };
  buildLayout(); buildMotion();

  const currentSkin = () => { const id = tok('skin.id'); return kernel.skins.has(id) ? kernel.skins.get(id) : null; };
  /** the tile spec of the moment: the skin's footprint + the layout tokens + the text model (cached until one of them changes) */
  E.spec = () => {
    const skin = currentSkin();
    if (!specCache || skinCache !== skin) { specCache = makeSpec(skin && skin.footprint ? skin.footprint : {}, tok, textModel); skinCache = skin; }
    return specCache;
  };
  const invalidateSpec = () => { specCache = null; lastL = null; E.dirty = true; };
  tuning.on('layout.*', (v, id) => {
    if (id === 'layout.strategy') { buildLayout(); motionMod.reset(); forceCut = true; }
    if (id === 'layout.visibility' || id === 'layout.windowTicks') forceCut = true;
    invalidateSpec();
  });
  tuning.on('motion.mode', () => { buildMotion(); forceCut = true; E.dirty = true; });
  tuning.on('interp.*', (v, id) => { if (id !== 'interp.strengthTweenMs') { battle.buildTracks(); layoutMod.reset(); forceCut = true; } E.dirty = true; });
  tuning.on('skin.id', () => { invalidateSpec(); layoutMod.reset(); forceCut = true; });
  tuning.on('camera.*', (v, id) => { if (id === 'camera.zoom' && Math.abs(v - camT.zoom) > 1e-9) { camT.zoom = v; E.dirty = true; } });
  kernel.skins.subscribe(() => { invalidateSpec(); });

  // ---- camera -------------------------------------------------------------------------------------------------------------------------------------
  const clampZoom = (z) => Math.max(tok('camera.minZoom'), Math.min(tok('camera.maxZoom'), z));
  /** target zoom; at = [sx, sy] screen point that stays fixed under the pointer while the zoom glides */
  E.zoomTo = (z, { at = null, glide = true } = {}) => {
    const nz = clampZoom(z);
    if (at) { const g = camera.fromScreen(at[0], at[1]); camT.anchor = { lng: g[0], lat: g[1], sx: at[0], sy: at[1] }; } else if (!glide) camT.anchor = null;
    camT.zoom = nz; tuning.set('camera.zoom', nz, { silent: true });
    if (!glide) { camera.zoom = nz; camT.vz = 0; applyAnchor(); }
    E.dirty = true;
  };
  /** move the camera: pan by screen pixels (direct manipulation, no glide) */
  E.panBy = (dx, dy) => {
    const c = project(camera.lng, camera.lat, camera.zoom); const g = unproject(c[0] - dx, c[1] - dy, camera.zoom);
    camera.lng = g[0]; camera.lat = g[1]; camT.lng = g[0]; camT.lat = g[1]; camT.anchor = null; E.dirty = true;
  };
  /** shift the view by screen pixels WITHOUT cancelling a glide in flight (the popup rail uses it to keep the ground still while the viewport narrows) */
  E.shiftView = (dx, dy) => { const c = project(camera.lng, camera.lat, camera.zoom); const g = unproject(c[0] - dx, c[1] - dy, camera.zoom); const dlng = g[0] - camera.lng; const dlat = g[1] - camera.lat; camera.lng += dlng; camera.lat += dlat; camT.lng += dlng; camT.lat += dlat; E.dirty = true; };
  /** the part of the screen the interface covers (CSS px); scene jumps centre the scene in what is left, so it does not land under the dock or the panel */
  E.safe = { top: 0, right: 0, bottom: 0, left: 0 };
  /** go to a place: lat, lng, zoom; glides by default.  safe: true centres the place in the free part of the screen */
  E.moveTo = ({ lat, lng, zoom }, { glide = true, safe = false } = {}) => {
    camT.anchor = null;
    if (lat != null) {
      let la = lat; let ln = lng;
      if (safe) { const z = zoom ?? camT.zoom; const cx = (E.safe.left + camera.w - E.safe.right) / 2; const cy = (E.safe.top + camera.h - E.safe.bottom) / 2; const pt = project(lng, lat, z); const g = unproject(pt[0] - (cx - camera.w / 2), pt[1] - (cy - camera.h / 2), z); ln = g[0]; la = g[1]; }
      camT.lat = la; camT.lng = ln;
    }
    if (zoom != null) { camT.zoom = clampZoom(zoom); tuning.set('camera.zoom', camT.zoom, { silent: true }); }
    if (!glide) { camera.lat = camT.lat; camera.lng = camT.lng; camera.zoom = camT.zoom; camT.vx = camT.vy = camT.vz = 0; }
    E.dirty = true;
  };
  E.setViewport = (w, h) => { camera.w = w; camera.h = h; E.dirty = true; };
  function applyAnchor() {
    const a = camT.anchor; if (!a) return;
    const p = project(a.lng, a.lat, camera.zoom); const g = unproject(p[0] - (a.sx - camera.w / 2), p[1] - (a.sy - camera.h / 2), camera.zoom);
    camera.lng = g[0]; camera.lat = g[1]; camT.lng = g[0]; camT.lat = g[1];
  }
  let camMoving = false;
  function camStep(dt) {
    const rm = reduced(); let moved = false;
    const zg = rm ? 0 : tok('camera.zoomGlideMs') / 1000; const pg = rm ? 0 : tok('camera.panGlideMs') / 1000;
    if (Math.abs(camera.zoom - camT.zoom) > 1e-6 || camT.vz) {
      const r = dampStep(camera.zoom, camT.vz, camT.zoom, zg, dt); camera.zoom = Math.abs(r[0] - camT.zoom) < 1e-5 ? camT.zoom : r[0]; camT.vz = camera.zoom === camT.zoom ? 0 : r[1]; moved = true;
    }
    if (camT.anchor) { applyAnchor(); if (camera.zoom === camT.zoom) camT.anchor = null; }
    else if (Math.abs(camera.lng - camT.lng) > 1e-9 || Math.abs(camera.lat - camT.lat) > 1e-9) {
      const a = dampStep(camera.lng, camT.vx, camT.lng, pg, dt); const b = dampStep(camera.lat, camT.vy, camT.lat, pg, dt);
      camera.lng = a[0]; camT.vx = a[1]; camera.lat = b[0]; camT.vy = b[1];
      if (Math.abs(camera.lng - camT.lng) < 1e-8 && Math.abs(camera.lat - camT.lat) < 1e-8) { camera.lng = camT.lng; camera.lat = camT.lat; camT.vx = camT.vy = 0; }
      moved = true;
    }
    camMoving = moved; return moved;
  }

  // ---- selection / hit testing -----------------------------------------------------------------------------------------------------------------------
  E.select = (id) => { E.selectedId = id || null; E.dirty = true; };
  /** the top-most solid tile at a screen point (CSS px), or null */
  E.hit = (sx, sy) => {
    const f = E.frame; if (!f) return null; const slop = tok('scene.hitSlopPx');
    for (let i = f.tiles.length - 1; i >= 0; i--) {
      const t = f.tiles[i]; if (!t.solid) continue;
      const x = t.x + f.view.dx; const y = t.y + f.view.dy; const hw = t.w * t.scale / 2 + slop; const hh = t.h * t.scale / 2 + slop;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return t;
    }
    return null;
  };

  // ---- the frame -------------------------------------------------------------------------------------------------------------------------------------------
  /** advance everything by dtMs and return the display frame.  rawDtMs = the real interval (metrics), dtMs = what the simulation should use */
  E.step = (dtMs, { rawDtMs = dtMs } = {}) => {
    const t0 = performance.now(); const dtSec = Math.max(0, dtMs) / 1000;
    const tau = transport.advance(dtSec);
    camStep(dtSec);
    const zoom = camera.zoom;
    const first = E.frames === 0;
    const cut = forceCut || (!first && ((Math.abs(transport.simTau - prevTau) > tok('motion.cutTickJump') && !transport.gliding) || Math.abs(zoom - prevZoom) > tok('motion.cutZoomJump')));
    forceCut = false; prevTau = transport.simTau; prevZoom = zoom;
    if (cut) { layoutMod.reset(); lastL = null; }
    const vis = battle.visibleAt(tau);
    const spec = E.spec(); const origin = worldOrigin(zoom);
    // solve cadence: every frame, or (slow devices) every 2nd / 3rd with the solved tiles carried along by their units in between; a zoom change, a new selection or a change of the
    // set of units always solves at once
    const setting = tok('layout.solveEvery'); const every = setting === 'auto' ? (o.autoQuality ? autoEvery : 1) : +setting;
    const frameDt = Math.min(dtMs || 16.667, 50); accDtMs += frameDt;
    let L = null; let solved = true;
    if (lastL && every > 1 && sinceSolve + 1 < every && zoom === lastL._z && E.selectedId === lastSelected && layoutMod.refresh) { if (layoutMod.refresh(lastL, { vis, z: zoom, spec, selectedId: E.selectedId })) { L = lastL; solved = false; sinceSolve++; } }
    if (!L) { L = layoutMod.solve({ vis, z: zoom, dtMs: accDtMs, selectedId: E.selectedId, spec, cold: first || cut }); L._z = zoom; lastL = L; lastSelected = E.selectedId; sinceSolve = 0; accDtMs = 0; }
    const t1 = performance.now();
    const F = motionMod.step(L, { dtMs: dtMs || 16.667, z: zoom, origin, spec, cut: cut && !first, selectedId: E.selectedId, reduced: reduced() });
    layoutMod.feedback(F.offsets);
    const t2 = performance.now();
    const camO = camera.origin();
    F.tau = tau; F.tick = Math.round(tau); F.zoom = zoom; F.spec = spec; F.clock = clock.describe(tau); F.view = { dx: origin[0] - camO[0], dy: origin[1] - camO[1], w: camera.w, h: camera.h };
    F.solved = solved; F.solveEvery = every;
    F.camera = { lng: camera.lng, lat: camera.lat, zoom }; F.visible = vis.length; F.playing = transport.playing; F.speed = transport.speed; F.rule = tok('layout.visibility');
    E.frame = F; E.frames++; E.dirty = false;
    metrics.record(F, { rawDtMs, engineMs: t2 - t0, displayMs: t2 - t1 });
    if (o.autoQuality && tok('layout.solveEvery') === 'auto' && !first) autoEvery = governorStep(gov, autoEvery, rawDtMs, t2 - t0);
    return F;
  };

  /** facts about one unit at tau, each with the site's evidence label (for the inspector; nothing here is invented) */
  E.describeUnit = (id, tau = transport.simTau) => {
    const u = battle.units.get(id); if (!u) return null; const st = battle.stateOf(u, tau);
    const chain = u.chain.filter((c) => c !== 'ROOT').map((c) => { const n = battle.nodes.get(c); return { id: c, kind: n?.kind || '?', designation: n?.designation || null }; });
    const sideNote = u.sideFlag ? `Contested: the id prefix says ${u.prefixSide}, the state code in the id matches ${u.sideGuess} units in the order of battle. Unknown until a historian decides (03-data-fuel.md, T7).` : null;
    return {
      id: u.id, short: u.short, label: u.label, designation: u.designation, side: u.side, sideNote, arm: u.arm, kind: u.kind, inOob: u.inOob, parentSource: u.parentSource, chain,
      keyframes: u.kf.length, firstTick: u.kf[0].tick, lastTick: u.kf[u.kf.length - 1].tick,
      now: st && { lat: st.lat, lng: st.lng, strength: st.strength, strengthRef: u.strengthRef, disposition: st.disposition, note: st.note, kfTick: st.kfTick, ageTicks: st.ageTicks, untilNext: st.untilNext, moving: st.moving, bearing: st.bearing },
      evidence: { position: 'Modelled (hand-authored keyframes, no basis field; between keyframes an interpolation)', strength: 'Modelled (a placement strength, not a casualty record)', side: u.sideFlag ? 'Contested' : 'Documented (order of battle / id prefix)', identity: u.inOob ? 'Documented (order of battle)' : 'Unknown (no complete order-of-battle parent)' },
    };
  };
  E.autoEvery = () => autoEvery;
  /** does the picture need another frame?  false when paused, camera still, nothing fading or settling */
  E.busy = () => E.dirty || transport.playing || transport.gliding || transport.speedEff !== 0 || camMoving || !!(motionMod.display && motionMod.display.busy());
  /** the live layout and motion module instances (diagnostics and tests) */
  E.modules = () => ({ layout: layoutMod, motion: motionMod });
  E.sceneJump = (s, { glide = true } = {}) => {
    transport.seek(s.tick, { glide }); E.moveTo({ lat: s.lat, lng: s.lng, zoom: s.zoom }, { glide, safe: true });
  };
  return E;
}
