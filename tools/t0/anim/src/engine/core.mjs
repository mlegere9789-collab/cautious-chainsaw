// core.mjs - the ENGINE CORE of the release: composes the named modules into one frame pipeline and owns nothing else.  DOM-free (loads in node), so every smoothness and overlap claim is tested headless
// and again in real Chrome on the same code.
//
//   battle.visibleAt(tau)  ->  units + interpolated positions       model.mjs, interp/*   the ONE resolver of "what is on the field": exact at every keyframe, monotone cubic between them
//   layout.solve(...)      ->  certified targets                     layout/*              zero overlap by construction, aggregation into formation marks, hysteresis
//   display.step(...)      ->  display frame                         scene/display.mjs     entry/exit by fade and scale, one-frame swaps for crowds, no ghost tiles, the net
//
// The CAMERA and the TIME are inputs of step(), not state of the core: the host reads the Mapbox camera and the app's clock and hands them in, so the same function serves the browser, the tests and
// the frame strips.  Nothing here knows about React, Mapbox or the store.
import { createKernel } from './kernel/registry.mjs';
import { createTuning } from './tuning/tuning.mjs';
import { createBattle } from './model.mjs';
import { Camera } from './geo/project.mjs';
import { makeSpec } from './layout/spec.mjs';
import { createTextModel } from './layout/text.mjs';
import { worldOrigin } from './layout/tiles.mjs';
import { LAYOUTS } from './layout/strategies.mjs';
import { PchipTrack, ChordTrack, LinearTrack } from './interp/paths.mjs';
import { Display } from './scene/display.mjs';
import { createMetrics } from './metrics.mjs';

export const INTERP_MODELS = [
  { id: 'pchip', label: 'Monotone cubic (PCHIP)', doc: 'Exact at keyframes, no overshoot, C1: a unit does not stop at every keyframe.', build: (kfs, o = {}) => new PchipTrack(kfs, o.endSlopes) },
  { id: 'chord-smooth', label: 'Straight chords, smooth speed', doc: 'The path is the polyline through the keyframes; only the speed along it is smoothed.', build: (kfs, o = {}) => new ChordTrack(kfs, o.endSlopes) },
  { id: 'linear', label: 'Straight chords, constant speed', doc: 'Comparison baseline: velocity jumps at every keyframe.', build: (kfs) => new LinearTrack(kfs) },
];

/** the solve-cadence governor: judge the last 45 frames (or the last 0.8 s of slow ones); slow frames (mean interval over 21 ms) raise the cadence at once (1 -> 2 -> 3), and only a sustained calm (4.5 s of frames
 *  under 17.5 ms with the engine using less than 11 ms) lowers it again, so it does not flap.  Pure: the host passes real timings, the tests pass synthetic ones. */
export function governorStep(g, every, rawDtMs, engineMs) {
  g.n++; g.sum += rawDtMs; g.eng += engineMs;
  if (g.n < 45 && !(g.n >= 12 && g.sum >= 800)) return every;
  const avg = g.sum / g.n; const eng = g.eng / g.n; let next = every;
  if (avg > 21 && every < 3) { next = every + 1; g.calm = 0; }
  else if (avg < 17.5 && eng < 11 && every > 1) { g.calm += g.n; if (g.calm >= 270) { next = every - 1; g.calm = 0; } }
  else g.calm = 0;
  g.n = 0; g.sum = 0; g.eng = 0; return next;
}

/**
 * @param {{dataset:object, tokens:object, textTable?:object, storage?:Storage|null, kernel?:object, systemReduced?:()=>boolean, autoQuality?:boolean, skins?:object[], settings?:object}} o
 */
export function createCore(o) {
  const kernel = o.kernel || createKernel();
  for (const m of INTERP_MODELS) if (!kernel.interp.has(m.id)) kernel.interp.register(m.id, m);
  for (const l of LAYOUTS) if (!kernel.layout.has(l.id)) kernel.layout.register(l.id, l);
  for (const s of o.skins || []) if (!kernel.skins.has(s.id)) kernel.skins.register(s.id, s);
  const tuning = createTuning(o.tokens, { storage: o.storage || null });
  if (o.storage) tuning.load();
  if (o.settings) tuning.import({ format: 'gtanim-settings/1', tokens: o.settings });
  const tok = (id) => tuning.get(id);
  let battle = createBattle(o.dataset, kernel, tok);
  const systemReduced = o.systemReduced || (() => false);
  const reduced = () => { const m = tok('motion.reduced'); return m === 'on' || (m === 'auto' && systemReduced()); };
  const camera = new Camera({ lng: -77.2377, lat: 39.8206, zoom: 13.5, w: 1280, h: 800 });
  const metrics = createMetrics(tok);
  let textModel = createTextModel(o.textTable || { fonts: {} }, 1.04, o.textTable ? 'table' : 'none');

  const E = { kernel, tuning, tok, camera, frame: null, frames: 0, forcedSolves: 0, dirty: true, selectedId: null, metrics, get battle() { return battle; }, get text() { return textModel; }, reduced };
  let layoutMod = null; let display = null; let specCache = null; let skinCache = null;
  let lastL = null; let lastSelected = null; let sinceSolve = 0; let accDtMs = 0; let autoEvery = 1; const gov = { n: 0, sum: 0, eng: 0, calm: 0 };
  let prevIds = new Set(); let prevZoom = null; let forceCut = false; let lastStamp = -1; let stampFrame = 0; let solves = 0; let restSig = ''; let restSince = 0; let canonDone = false; E.canons = 0;

  const buildLayout = () => { layoutMod = kernel.layout.get(tok('layout.strategy')).create({ all: battle, tok }); };
  const buildDisplay = () => { display = new Display({ glide: tok('motion.mode') !== 'snap' }, tok); };
  buildLayout(); buildDisplay();

  const currentSkin = () => { const id = tok('skin.id'); return kernel.skins.has(id) ? kernel.skins.get(id) : null; };
  E.skin = currentSkin;
  /** the tile spec of the moment: the skin's footprint + the layout tokens + the text model (cached until one of them changes) */
  E.spec = () => {
    const skin = currentSkin();
    if (!specCache || skinCache !== skin) { specCache = makeSpec(skin && skin.footprint ? skin.footprint : {}, tok, textModel, skin && skin.sizer ? skin.sizer : null); skinCache = skin; }
    return specCache;
  };
  const invalidateSpec = () => { specCache = null; lastL = null; E.dirty = true; };
  tuning.on('layout.*', (v, id) => { if (id === 'layout.strategy') { buildLayout(); forceCut = true; } invalidateSpec(); });
  tuning.on('motion.mode', () => { buildDisplay(); forceCut = true; E.dirty = true; });
  tuning.on('interp.*', (v, id) => { if (id !== 'interp.strengthTweenMs') { battle.buildTracks(); layoutMod.reset(); forceCut = true; } E.dirty = true; });
  tuning.on('skin.id', () => { invalidateSpec(); layoutMod.reset(); forceCut = true; });
  kernel.skins.subscribe(() => { invalidateSpec(); });

  E.setTextTable = (table, source = 'measured') => { textModel = createTextModel(table, 1.04, source); specCache = null; lastL = null; layoutMod.reset(); E.dirty = true; };      // the solver's remembered crowds carry boxes sized with the old widths: start them again
  /** a new dataset (a day of placements arrived): the battle is rebuilt, the layout starts from the picture the viewer sees (the display layer keeps its tiles by identity, so nothing blinks) */
  E.setDataset = (ds) => { battle = createBattle(ds, kernel, tok); buildLayout(); lastL = null; specCache = null; E.dirty = true; };
  E.select = (id) => { E.selectedId = id || null; E.dirty = true; };
  E.cut = () => { forceCut = true; E.dirty = true; };

  /** the top-most solid tile at a screen point (CSS px), or null.  reach = extra pixels around the mark (a mouse 4, a finger 14) */
  E.hit = (sx, sy, reach = 4) => {
    const f = E.frame; if (!f) return null;
    for (let i = f.tiles.length - 1; i >= 0; i--) {
      const t = f.tiles[i]; if (!t.solid || t.life !== 'live') continue;
      const x = t.x + f.view.dx; const y = t.y + f.view.dy; const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return t;
    }
    return null;
  };

  /** what a pointer at (sx, sy) means: a unit (its own mark, or its true place: the foot of its pole, or its dot inside a crowd), a crowd (its mark), or nothing.  Order: a mark's box, a crowd member's dot, a crowd's
   *  box, the foot of a pole.  { kind: 'unit'|'crowd', id?, tile } or null.  reach = extra pixels (a mouse 4, a finger 14). */
  E.pickAt = (sx, sy, reach = 4) => {
    const f = E.frame; if (!f) return null; const dx = f.view.dx; const dy = f.view.dy; const tiles = f.tiles;
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'leaf') continue;
      const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach; const x = t.x + dx; const y = t.y + dy;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return { kind: 'unit', id: t.ids[0], tile: t };
    }
    let best = null; let bd = (reach + 5) * (reach + 5);
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'agg' || !t.members) continue;
      for (const m of t.members) { const d = (m.ax + dx - sx) ** 2 + (m.ay + dy - sy) ** 2; if (d < bd) { bd = d; best = { kind: 'unit', id: m.id, tile: t }; } }
    }
    if (best) return best;
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'agg') continue;
      const hw = t.w * t.scale / 2 + reach; const hh = t.h * t.scale / 2 + reach; const x = t.x + dx; const y = t.y + dy;
      if (sx >= x - hw && sx <= x + hw && sy >= y - hh && sy <= y + hh) return { kind: 'crowd', tile: t };
    }
    bd = (reach + 8) * (reach + 8);
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i]; if (!t.solid || t.life !== 'live' || t.kind !== 'leaf') continue;
      const d = (t.ax + dx - sx) ** 2 + (t.ay + dy - sy) ** 2; if (d < bd) { bd = d; best = { kind: 'unit', id: t.ids[0], tile: t }; }
    }
    return best;
  };

  /**
   * advance by dtMs and return the display frame.
   * @param {{dtMs:number, rawDtMs?:number, tau:number, cam:{lng:number,lat:number,zoom:number,w:number,h:number}, selectedId?:string|null, pass?:(u:object,st:object)=>boolean, cut?:boolean, bias?:[number,number]}} inp
   */
  E.step = (inp) => {
    const t0 = performance.now(); const dtMs = inp.dtMs; const rawDtMs = inp.rawDtMs ?? dtMs;
    camera.lng = inp.cam.lng; camera.lat = inp.cam.lat; camera.zoom = inp.cam.zoom; camera.w = inp.cam.w; camera.h = inp.cam.h;
    const zoom = camera.zoom; const first = E.frames === 0;
    if (inp.selectedId !== undefined) E.selectedId = inp.selectedId;
    const cut = forceCut || !!inp.cut || (!first && prevZoom !== null && Math.abs(zoom - prevZoom) > 0.6 && !inp.zoomGlide);
    forceCut = false; prevZoom = zoom;
    if (cut) { layoutMod.reset(); lastL = null; }
    // the units on the field (every unit with a keyframe up to tau, filtered by the app's filters) ...
    // (entries and exits are a matter of TIME: a unit that comes onto the field or leaves it.  A filter the viewer switches is not one: its marks are there or gone in that frame.)
    let vis = battle.visibleAt(inp.tau); const onField = new Set(vis.map((v) => v.u.id)); if (inp.pass) vis = vis.filter((v) => inp.pass(v.u, v.st));
    const newIds = new Set(); for (const id of onField) if (!prevIds.has(id)) newIds.add(id);
    const goneIds = new Set(); for (const id of prevIds) if (!onField.has(id)) goneIds.add(id);
    prevIds = onField;
    // ... of which the ones near the screen are laid out (the others cannot be seen: a layout of 478 units for a phone showing 60 is wasted work).  The margin is wide, so a crowd near the edge is still whole.
    const proj = inp.project || null; const spec = E.spec(); spec.proj = proj; E.proj = proj; spec.zoom = zoom; spec.dMax = zoom >= tok('layout.fullZoom') ? tok('layout.dMaxFullPx') : tok('layout.dMaxPx'); const origin = worldOrigin(zoom); const camO = camera.origin(); const bias = inp.bias || [0, 0];
    const view = proj ? { dx: 0, dy: 0, w: camera.w, h: camera.h } : { dx: origin[0] - camO[0] + bias[0], dy: origin[1] - camO[1] + bias[1], w: camera.w, h: camera.h };
    const cullPx = Math.min(tok('layout.cullPx'), Math.max(100, 0.3 * Math.min(camera.w, camera.h))); let laid = vis;      // a phone's margin is smaller (a quarter of the screen's short side, 100 px at least): fewer marks to lay out where there is least room for them
    if (cullPx > 0) {
      const sc = 512 * 2 ** zoom; const D2R = Math.PI / 180; const wx = (v) => (proj ? (v.p = proj(v.st.lng, v.st.lat))[0] : (v.st.lng + 180) / 360 * sc - origin[0] + view.dx); const wy = (v) => { if (proj) return v.p[1]; const s = Math.sin(v.st.lat * D2R); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * sc - origin[1] + view.dy; };
      const x0 = -cullPx; const x1 = view.w + cullPx; const y0 = -cullPx; const y1 = view.h + cullPx; laid = [];
      for (const v of vis) { const x = wx(v); const y = wy(v); if ((x > x0 && x < x1 && y > y0 && y < y1) || v.u.id === E.selectedId) { v.sx = x; v.sy = y; laid.push(v); } }
    }
    const setting = tok('layout.solveEvery'); const every = setting === 'auto' ? (o.autoQuality ? autoEvery : 1) : +setting;
    const frameDt = Math.min(dtMs || 16.667, 50); accDtMs += frameDt;
    // THE REST CANON.  The sticky layout is history-dependent by design (merge now, split later), so after a long journey a still picture can sit in a coarser partition than the same picture reached fresh (measured: 7 marks against 24 for the same 29 units).
    // Once the picture has been still for 6 frames and nothing on screen is fading, the layout is solved ONCE from clean state; it is adopted only if it shows MORE marks (never fewer: no flicker, no cycle), and not while a unit is selected.  Any change re-arms it.
    let sig = zoom.toFixed(3) + '|' + (E.selectedId || '') + '|' + inp.tau.toFixed(3) + '|' + laid.length; let hs = 0; for (const v of laid) hs = (Math.imul(hs ^ (((v.sx || 0) * 4) | 0), 16777619) ^ (((v.sy || 0) * 4) | 0)) | 0; sig += '|' + hs;
    if (sig !== restSig) { restSig = sig; restSince = E.frames; canonDone = false; if (layoutMod.canonCancel) layoutMod.canonCancel(); }
    let canonNow = !first && !cut && !E.selectedId && !!layoutMod.canon && !!lastL && (layoutMod.canonProbing() || (!canonDone && E.frames - restSince >= 6 && !display.busy()));
    const run = (force, dt) => {
      let L = null; let solved = true;
      // solve cadence: every frame, or (slow devices) every 2nd / 3rd with the solved tiles carried along by their units in between; a zoom change, a new selection or a change of the set of units always solves at once
      if (!force && lastL && every > 1 && sinceSolve + 1 < every && zoom === lastL._z && E.selectedId === lastSelected && newIds.size === 0 && goneIds.size === 0 && layoutMod.refresh) { if (layoutMod.refresh(lastL, { vis: laid, z: zoom, spec, selectedId: E.selectedId })) { L = lastL; solved = false; sinceSolve++; } }
      if (!L && canonNow) { canonNow = false; const C = layoutMod.canon({ vis: laid, z: zoom, tau: inp.tau, view, selectedId: E.selectedId, spec, against: lastL }); if (C) { L = C; L._z = zoom; lastL = L; lastSelected = E.selectedId; E.canons++; sinceSolve = 0; accDtMs = 0; solves++; } if (!layoutMod.canonProbing()) canonDone = true; }
      if (!L) { const sin = { vis: laid, z: zoom, tau: inp.tau, view, dtMs: accDtMs, selectedId: E.selectedId, spec, cold: first || cut }; L = layoutMod.solve(sin); if ((first || cut) && layoutMod.settle && !E.selectedId) L = layoutMod.settle(sin, L); L._z = zoom; lastL = L; lastSelected = E.selectedId; sinceSolve = 0; accDtMs = 0; solves++; }
      const t1 = performance.now();
      const F = display.step(L, { dtMs: dt, z: zoom, origin, spec, cut: cut && !first, selectedId: E.selectedId, reduced: reduced(), newIds: first ? null : newIds, goneIds: first ? null : goneIds });
      F.solved = solved; F.t1 = t1; return F;
    };
    let F = run(false, dtMs || 16.667);
    if (F.overlaps > 0 && !F.solved) { F = run(true, 0); E.forcedSolves++; }      // a frame carried on from the last solve touched a neighbour: solve it exactly now (the guarantee is per DISPLAYED frame)
    layoutMod.feedback(F.offsets);
    const t2 = performance.now();
    F.tau = inp.tau; F.tick = Math.round(inp.tau); F.zoom = zoom; F.spec = spec; F.view = view; F.solveEvery = every; F.visible = vis.length; F.vis = vis; F.project = proj; F.camera = { lng: camera.lng, lat: camera.lat, zoom }; F.laid = laid.length;
    if (layoutMod.stamp !== undefined && layoutMod.stamp !== lastStamp) { lastStamp = layoutMod.stamp; stampFrame = E.frames; }
    E.frame = F; E.frames++; E.dirty = false;
    metrics.record(F, { rawDtMs, engineMs: t2 - t0, displayMs: t2 - F.t1 });
    if (o.autoQuality && tok('layout.solveEvery') === 'auto' && !first) autoEvery = governorStep(gov, autoEvery, rawDtMs, t2 - t0);
    return F;
  };

  const SETTLE_FRAMES = 100;                       // after the set of crowds last changed: longer than the longest wait before a split trial (the dwell plus its jitter)
  /** does the picture need another frame?  false when nothing moves, fades or settles */
  E.busy = () => E.dirty || display.busy() || (layoutMod.canonProbing && layoutMod.canonProbing()) || (layoutMod.stamp !== undefined && E.frames - stampFrame < SETTLE_FRAMES);
  E.autoEvery = () => autoEvery;
  E.solves = () => solves;
  E.modules = () => ({ layout: layoutMod, display });
  /** facts about one unit at tau, each with the site's evidence label (nothing here is invented) */
  E.describeUnit = (id, tau) => {
    const u = battle.units.get(id); if (!u) return null; const st = battle.stateOf(u, tau);
    return { id: u.id, short: u.short, label: u.label, designation: u.designation, side: u.side, arm: u.arm, kind: u.kind, inOob: u.inOob, parentSource: u.parentSource, chain: u.chain, keyframes: u.kf.length, firstTick: u.kf[0].tick, lastTick: u.kf[u.kf.length - 1].tick,
      now: st && { lat: st.lat, lng: st.lng, strength: st.strength, strengthRef: u.strengthRef, disposition: st.disposition, note: st.note, kfTick: st.kfTick, moving: st.moving, bearing: st.bearing } };
  };
  return E;
}
